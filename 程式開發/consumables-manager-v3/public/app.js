// --- Utility Functions ---
function showLoader() { document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }
function showAlert(msg) { document.getElementById('alertMessage').innerText = msg; document.getElementById('customAlert').classList.remove('hidden'); }

const safeFormatDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).split(' ')[0];
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// --- Global State ---
let SETTINGS = {};
// db and auth are already initialized in firebase-config.js

/**
 * @version v3.1.3
 * @date 2026-07-23
 * @description 升級為 GmailApp 寄信引擎，突破 Google Workspace 安全限制
 */
console.log('%c Consumables Manager %c v3.1.3 ', 'background:#2563eb;color:#fff;border-radius:3px 0 0 3px;padding:2px;', 'background:#10b981;color:#fff;border-radius:0 3px 3px 0;padding:2px;');

// --- Firebase Auth & Routing ---
auth.onAuthStateChanged(user => {
    if (user) {
        // Logged in as Admin
        IS_ADMIN = true;
        checkAdminRole(user);
    } else {
        // Kiosk Mode
        IS_ADMIN = false;
        setupKioskMode();
    }
});

function setupKioskMode() {
    document.title = "中正國小 - 消耗品申請系統 (Kiosk)";
    const navTitle = document.getElementById('nav-title');
    if (navTitle) navTitle.innerText = "中正國小 - 消耗品申請系統";
    
    // Show Navigation
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');
    if (nav) nav.classList.remove('hidden');
    if (main) main.classList.remove('hidden');
    
    setupNavigation();
    switchTab('apply');

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const cancelGroupId = urlParams.get('cancel');
    const queryEmail = urlParams.get('query');
    const userEmail = urlParams.get('email');

    if (cancelGroupId && userEmail) {
        setTimeout(() => handleCancelRequest(cancelGroupId, userEmail), 500);
    } else if (queryEmail) {
        setTimeout(() => handleQueryRequest(queryEmail), 500);
    }
}

async function handleCancelRequest(groupId, email) {
    if(!confirm(`您確定要取消單號 ${groupId} 的所有未領取品項嗎？\n(已領取的項目不受影響)`)) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    showLoader();
    try {
        const snap = await db.collection('consumables_applications')
                             .where('groupId', '==', groupId)
                             .where('applicantEmail', '==', email)
                             .get();
        if (snap.empty) {
            showAlert("找不到相符的單據或您沒有權限。");
            window.history.replaceState({}, document.title, window.location.pathname);
            hideLoader();
            return;
        }

        const batch = db.batch();
        let cancelledCount = 0;

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (data.status === 'pending') {
                batch.update(docSnap.ref, { status: 'cancelled' });
                // Return stock
                const invRef = db.collection('consumables_inventory').doc(data.itemId);
                batch.update(invRef, { stock: firebase.firestore.FieldValue.increment(data.qty) });
                cancelledCount++;
            }
        }
        
        if (cancelledCount > 0) {
            await batch.commit();
            showAlert(`已成功取消 ${cancelledCount} 筆項目，並歸還庫存！`);
        } else {
            showAlert("該申請單中沒有可以取消的品項（可能已全部領取或作廢）。");
        }
    } catch(e) {
        showAlert("取消失敗: " + e.message);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    hideLoader();
}

async function handleQueryRequest(email) {
    showLoader();
    try {
        const snap = await db.collection('consumables_applications')
                             .where('applicantEmail', '==', email)
                             .orderBy('timestamp', 'desc')
                             .get();
        
        if (snap.empty) {
            showAlert("目前沒有查到任何申請紀錄。");
            window.history.replaceState({}, document.title, window.location.pathname);
            hideLoader();
            return;
        }

        let groups = {};
        snap.docs.forEach(doc => {
            const d = doc.data();
            if(!groups[d.groupId]) {
                groups[d.groupId] = {
                    groupId: d.groupId,
                    timestamp: d.timestamp ? d.timestamp.toDate() : new Date(),
                    items: []
                };
            }
            groups[d.groupId].items.push(d);
        });

        const sortedGroups = Object.values(groups).sort((a,b) => b.timestamp - a.timestamp);
        
        let html = `<div class="max-h-[50vh] overflow-y-auto pr-2 space-y-4">`;
        sortedGroups.forEach(g => {
            html += `
                <div class="border rounded-lg p-3 bg-gray-50 shadow-sm">
                    <div class="font-bold text-blue-700 mb-2 border-b border-blue-100 pb-2 flex justify-between items-center">
                        <span><i class="fa-solid fa-hashtag mr-1 text-blue-400"></i>${g.groupId}</span>
                        <span class="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded-full border">${safeFormatDate(g.timestamp)}</span>
                    </div>
            `;
            g.items.forEach(i => {
                let statusText = '';
                if(i.status === 'pending') statusText = '<span class="text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-[10px] font-bold">準備中</span>';
                else if (i.status === 'picked_up') statusText = '<span class="text-green-600 bg-green-100 px-2 py-0.5 rounded text-[10px] font-bold">已領取</span>';
                else statusText = '<span class="text-gray-500 bg-gray-200 px-2 py-0.5 rounded text-[10px] font-bold line-through">已取消</span>';

                html += `<div class="flex justify-between items-center text-sm py-1.5 border-b border-gray-100 last:border-0">
                            <div class="font-bold text-gray-700">${i.itemName} <span class="text-gray-400 text-xs ml-1">x${i.qty}</span></div>
                            <div>${statusText}</div>
                         </div>`;
            });
            html += `</div>`;
        });
        html += `</div>`;

        document.getElementById('history-content').innerHTML = html;
        document.getElementById('history-modal').classList.remove('hidden');

    } catch(e) {
        showAlert("查詢失敗: " + e.message);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    hideLoader();
}

async function checkAdminRole(user) {
    try {
        let role = null;
        
        // 1. Check by UID first
        let doc = await db.collection('consumables_admins').doc(user.uid).get();
        if (doc.exists) {
            role = doc.data().role;
        } else if (user.email) {
            // 2. Check by Email
            const emailLower = user.email.toLowerCase().trim();
            let emailDoc = await db.collection('consumables_admins').doc(emailLower).get();
            if (emailDoc.exists) {
                role = emailDoc.data().role;
            } else {
                const snap = await db.collection('consumables_admins').where('email', '==', emailLower).get();
                if (!snap.empty) {
                    role = snap.docs[0].data().role;
                }
            }
        }

        if (role) {
            window.adminRole = role; // 'manager' or 'sysadmin'
            const nav = document.querySelector('nav');
            const main = document.querySelector('main');
            if (nav) nav.classList.remove('hidden');
            if (main) main.classList.remove('hidden');
            
            applyAdminTheme();
            setupNavigation();
            switchTab('manage');
        } else {
            auth.signOut();
            hideLoader();
            showAlert(`帳號 ${user.email || user.uid} 尚未獲得後台管理授權！\n請先由系統管理員於「設定」頁面輸入您的 Email 完成授權。`);
        }
    } catch (e) {
        console.error(e);
        auth.signOut();
        hideLoader();
    }
}

function applyAdminTheme() {
    document.title = "⚙️ 消耗品系統 - 管理後台";
    const navTitle = document.getElementById('nav-title');
    if (navTitle) navTitle.innerText = "⚙️ 消耗品系統 - 管理後台";
    const nav = document.querySelector('nav');
    if (nav) nav.className = "bg-indigo-900 shadow-md text-white sticky top-0 z-40 border-b border-indigo-950";
    const iconBg = document.querySelector('nav .bg-blue-600');
    if (iconBg) iconBg.className = "bg-indigo-700 text-white p-2 rounded-lg shadow-sm";
    document.body.style.backgroundColor = '#f1f1f9';
}

function submitOverlayPassword() {
    const emailInput = document.getElementById('admin-overlay-email');
    const pwdInput = document.getElementById('admin-overlay-password');
    const email = emailInput ? emailInput.value.trim() : '';
    const pw = pwdInput ? pwdInput.value : '';

    if (!email || !pw) {
        showAlert("請輸入管理員 Email 與密碼！");
        return;
    }

    showLoader();
    auth.signInWithEmailAndPassword(email, pw)
        .then(() => {
            hideLoader();
            document.getElementById('admin-login-overlay').classList.add('hidden');
        })
        .catch(err => {
            hideLoader();
            showAlert("登入失敗：" + err.message);
        });
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    showLoader();
    auth.signInWithPopup(provider)
        .then(result => {
            hideLoader();
            document.getElementById('admin-login-overlay').classList.add('hidden');
        })
        .catch(err => {
            hideLoader();
            showAlert("Google 登入失敗：" + err.message);
        });
}

function exitAdminMode() {
    auth.signOut().then(() => {
        window.location.reload();
    });
}

function redirectToAdmin() {
    document.getElementById('admin-login-overlay').classList.remove('hidden');
}

function setupNavigation() {
    const menu = document.getElementById('nav-menu');
    if (IS_ADMIN) {
        let settingsTab = '';
        if (window.adminRole === 'sysadmin') {
            settingsTab = `<button onclick="switchTab('settings')" id="tab-settings" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-gear"></i> 設定</button>`;
        }
        menu.innerHTML = `
            <button onclick="switchTab('inventory')" id="tab-inventory" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-chart-pie"></i> 庫存</button>
            <button onclick="switchTab('manage')" id="tab-manage" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-clipboard-user"></i> 核發</button>
            <button onclick="switchTab('restock')" id="tab-restock" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-boxes-packing"></i> 補貨</button>
            ${settingsTab}
            <button onclick="exitAdminMode()" class="px-4 py-2 font-bold rounded-lg transition-colors text-red-400 whitespace-nowrap shrink-0"><i class="fa-solid fa-sign-out"></i> 登出</button>
        `;
    } else {
        menu.innerHTML = `
            <button onclick="switchTab('apply')" id="tab-apply" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-pen-to-square"></i> 申請</button>
            <button onclick="switchTab('inventory')" id="tab-inventory" class="px-4 py-2 font-bold rounded-lg transition-colors text-gray-500 whitespace-nowrap shrink-0"><i class="fa-solid fa-chart-pie"></i> 庫存</button>
            <button onclick="redirectToAdmin()" class="p-2 text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0" title="管理登入"><i class="fa-solid fa-gear text-lg"></i></button>
        `;
    }
}

function switchTab(tab) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const activeBg = IS_ADMIN ? 'bg-indigo-700' : 'bg-gray-800';
    
    document.querySelectorAll('#nav-menu button').forEach(el => {
        el.classList.remove('bg-gray-800', 'bg-indigo-700', 'text-white', 'shadow-sm');
        el.classList.add('text-gray-500');
    });
    
    const viewEl = document.getElementById(`view-${tab}`);
    if (viewEl) viewEl.classList.remove('hidden');
    
    const btn = document.getElementById(`tab-${tab}`);
    if(btn) {
        btn.classList.remove('text-gray-500');
        btn.classList.add(activeBg, 'text-white', 'shadow-sm');
    }

    if (tab === 'inventory') loadInventory();
    if (tab === 'apply') { loadInventoryForSelect(); updateCartUI(); loadSettingsAndCheck(); }
    if (tab === 'manage') {
        loadManageList();
        setTimeout(() => {
            const searchBox = document.getElementById('search-applicant');
            if(searchBox) searchBox.focus();
        }, 300);
    }
    if (tab === 'restock') loadRestockTable();
    if (tab === 'settings') { loadSettings(); loadAdminList(); }
}

// --- Data Loaders (Firestore) ---
let inventoryUnsubscribe = null;

function loadInventory() {
    showLoader();
    db.collection('consumables_inventory').get().then(snap => {
        let data = [];
        snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
        renderInventory(data);
        hideLoader();
    }).catch(err => {
        hideLoader();
        showAlert(err.message);
    });
}

function renderInventory(data) {
    // Sort by order ascending (default 99)
    data.sort((a, b) => (parseInt(a.order) || 99) - (parseInt(b.order) || 99));
    inventoryData = data;

    const addBtn = document.getElementById('btn-add-item');
    if (addBtn) {
        if (IS_ADMIN) addBtn.classList.remove('hidden');
        else addBtn.classList.add('hidden');
    }

    const grid = document.getElementById('inventory-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    data.forEach((item, index) => {
        const stock = parseInt(item.stock || 0);
        const total = parseInt(item.totalStock || stock);
        const alertLvl = parseInt(item.alertLevel || 3);
        let barColor = 'bg-blue-500', tagColor = 'text-green-600', percent = total > 0 ? (stock / total) * 100 : 0;
        
        if (stock < alertLvl) { barColor = 'bg-red-500'; tagColor = 'text-red-600'; }
        else if (percent < 50) { barColor = 'bg-yellow-500'; }
        
        let adminActionHtml = '';
        if (IS_ADMIN) {
            adminActionHtml = `
                <div class="border-t pt-3 mt-3 flex justify-between items-center text-xs">
                    <div class="flex items-center gap-1 text-gray-400 font-bold">
                        <span>#${item.order || (index + 1)}</span>
                        <button onclick="moveItemOrder('${item.id}', -1)" class="px-1.5 py-0.5 hover:bg-gray-100 rounded text-gray-600" title="向上移"><i class="fa-solid fa-arrow-up"></i></button>
                        <button onclick="moveItemOrder('${item.id}', 1)" class="px-1.5 py-0.5 hover:bg-gray-100 rounded text-gray-600" title="向下移"><i class="fa-solid fa-arrow-down"></i></button>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="openItemModal('${item.id}')" class="text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-1 rounded"><i class="fa-solid fa-pen mr-1"></i>編輯</button>
                        <button onclick="deleteItem('${item.id}', '${item.name}')" class="text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded"><i class="fa-solid fa-trash mr-1"></i>刪除</button>
                    </div>
                </div>`;
        }

        grid.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between mb-3">
                        <div>
                            <h3 class="font-bold text-gray-800 text-base">${item.name}</h3>
                            <span class="text-[10px] text-gray-400 uppercase">${item.category || '未分類'}</span>
                            ${item.isAdminOnly ? '<span class="text-[10px] text-red-500 uppercase ml-1 font-bold">行政專用</span>' : ''}
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-black ${tagColor}">${stock}</div>
                            <div class="text-[10px] text-gray-400">${item.unit || '個'} ($${item.price || 0}/個)</div>
                        </div>
                    </div>
                    <div class="bg-gray-100 rounded-full h-1.5 overflow-hidden mb-2">
                        <div class="${barColor} h-full" style="width: ${Math.max(0, Math.min(100, percent))}%"></div>
                    </div>
                </div>
                ${adminActionHtml}
            </div>`;
    });
}

// --- Application Flow ---
function loadInventoryForSelect() {
    db.collection('consumables_inventory').get().then(snap => {
        inventoryData = [];
        const sel = document.getElementById('apply-item');
        sel.innerHTML = '<option value="">-- 選擇申請物品 --</option>';
        
        snap.forEach(doc => {
            const item = {id: doc.id, ...doc.data()};
            inventoryData.push(item);
            
            // Hide Admin-Only items from non-admins
            if (!IS_ADMIN && item.isAdminOnly) return;

            const priceVal = parseFloat(item.price) || 0;
            sel.innerHTML += `<option value="${item.id}" data-name="${item.name}" data-price="${priceVal}" data-stock="${item.stock}">${item.name} - $${priceVal}元 (庫存: ${item.stock})</option>`;
        });
        updatePriceHint();
        hideLoader();
    }).catch(err => {
        console.error(err);
        hideLoader();
    });
}

let userVerified = false;

async function verifyUser() {
    const email = document.getElementById('apply-email').value.trim();
    if(!email) { showAlert("請先輸入 Email！"); return; }
    
    // Admin bypass: If they are admin, they don't strictly need this, but checking won't hurt.
    const hubUrl = SETTINGS.HUB_API_URL;
    if (!hubUrl) {
        userVerified = true;
        document.getElementById('btn-verify-user').innerText = "已驗證(免設)";
        document.getElementById('btn-verify-user').classList.replace('bg-blue-600', 'bg-gray-400');
        return;
    }

    const btn = document.getElementById('btn-verify-user');
    const err = document.getElementById('verify-error-msg');
    btn.innerText = "驗證中...";
    btn.disabled = true;
    err.classList.add('hidden');

    try {
        const response = await fetch(hubUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'checkUser',
                email: email,
                secret: SETTINGS.API_SECRET_KEY
            })
        });
        const res = await response.json();
        
        if (res.success) {
            userVerified = true;
            btn.innerText = "驗證成功";
            btn.classList.replace('bg-blue-600', 'bg-green-600');
        } else {
            userVerified = false;
            btn.innerText = "驗證身分";
            btn.disabled = false;
            err.innerHTML = `此 Email 尚未綁定 LINE Hub。<br><a href="https://script.google.com/a/macros/gm.ccps.kh.edu.tw/s/AKfycbywbCaJEtPRRQNR21i25ppVcgEjBYDS3Q49V6Pr6tbrBbcb323fWk8R5lwfrpgHoVVZww/exec" target="_blank" class="text-blue-600 underline font-bold mt-1 inline-block">👉 點此前往綁定 LINE Hub</a>`;
            err.classList.remove('hidden');
        }
    } catch (e) {
        btn.innerText = "驗證身分";
        btn.disabled = false;
        showAlert("連線驗證伺服器失敗：" + e.message);
    }
}

function changeQty(d) {
    const inp = document.getElementById('apply-qty');
    inp.value = Math.max(1, parseInt(inp.value) + d);
    updatePriceHint();
}

function updatePriceHint() {
    const sel = document.getElementById('apply-item');
    const qtyInp = document.getElementById('apply-qty');
    const hint = document.getElementById('item-price-hint');
    const specialInput = document.getElementById('apply-special-purpose');
    
    if (!sel || !sel.value) {
        hint.innerHTML = '';
        specialInput.classList.add('hidden');
        return;
    }
    
    const opt = sel.options[sel.selectedIndex];
    const price = parseFloat(opt.dataset.price) || 0;
    const stock = parseInt(opt.dataset.stock) || 0;
    const qty = parseInt(qtyInp.value) || 1;
    
    hint.innerHTML = `<span class="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md font-bold"><i class="fa-solid fa-coins"></i> 單價: $${price} 元 | 庫存: ${stock} | 小計: $${price * qty} 元</span>`;

    // Admin quantity > 2 check for Option A
    if (IS_ADMIN && qty > 2) {
        specialInput.classList.remove('hidden');
    } else {
        specialInput.classList.add('hidden');
        specialInput.value = '';
    }
}

function addToCart() {
    const sel = document.getElementById('apply-item');
    const qty = parseInt(document.getElementById('apply-qty').value);
    const specialReason = document.getElementById('apply-special-purpose').value.trim();

    if (!sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    const id = sel.value;
    const name = opt.dataset.name;
    const price = parseInt(opt.dataset.price);
    const stock = parseInt(opt.dataset.stock);

    // 根據使用者需求，庫存為負數時依然可以提出申請，因此不阻擋
    // 移除 qty > stock 的阻擋判斷

    if (IS_ADMIN && qty > 2 && !specialReason) {
        showAlert("申請數量超過 2 份，請填寫特殊用途說明！");
        return;
    }

    const idx = cart.findIndex(c => c.id === id);
    if (idx > -1) {
        cart[idx].qty += qty;
        if(specialReason) cart[idx].specialReason = specialReason;
    } else {
        cart.push({ id, name, qty, price, specialReason });
    }
    
    sel.value = ""; 
    document.getElementById('apply-qty').value = 1;
    document.getElementById('apply-special-purpose').value = '';
    updateCartUI();
    updatePriceHint();
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const countSpan = document.getElementById('cart-count');
    const btn = document.getElementById('btn-submit-cart');
    let total = 0; container.innerHTML = '';
    
    cart.forEach((item, i) => {
        total += item.qty * item.price;
        let specialHtml = item.specialReason ? `<div class="text-[10px] text-orange-500 mt-1"><i class="fa-solid fa-circle-info"></i> ${item.specialReason}</div>` : '';
        container.innerHTML += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between border border-gray-100">
                <div>
                    <div class="text-sm font-bold">${item.name}</div>
                    <div class="text-[10px] text-gray-400 mt-1">單價: $${item.price}</div>
                    ${specialHtml}
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-base">x${item.qty}</span>
                    <button type="button" onclick="cart.splice(${i},1);updateCartUI();" class="text-red-400 hover:text-red-600 bg-white shadow-sm rounded px-2 py-1"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>`;
    });
    
    totalSpan.innerText = total; countSpan.innerText = cart.length;
    
    if(cart.length > 0) { 
        btn.disabled = false; btn.innerText = "確認送出申請"; btn.className = "w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white shadow-lg"; 
    } else { 
        btn.disabled = true; btn.innerText = "請先加入物品"; btn.className = "w-full py-3.5 rounded-xl font-bold bg-gray-200 text-gray-400"; 
    }
}

async function submitCart() {
    const name = document.getElementById('apply-name').value.trim();
    const email = document.getElementById('apply-email').value.trim();
    if (!name || !email || cart.length === 0) return;

    if (!IS_ADMIN && !userVerified && SETTINGS.HUB_API_URL) {
        showAlert("請先點擊「驗證身分」確認 Email 已綁定 LINE Hub！");
        return;
    }
    if (!IS_ADMIN) {
        // Budget check: $100 limit unless all items are $0
        let total = 0;
        let allZero = true;
        cart.forEach(c => {
            total += (c.price * c.qty);
            if (c.price > 0) allZero = false;
        });

        if (!allZero && total > 100) {
            showAlert("非行政人員單次申請金額上限為 100 元！\n(若整單皆為 0 元品項則不在此限)");
            return;
        }
    }

    showLoader();
    try {
        const groupId = "G" + Date.now().toString().slice(-6);
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Use a batch to create application items and deduct stock
        const batch = db.batch();
        
        for (let item of cart) {
            const appRef = db.collection('consumables_applications').doc();
            batch.set(appRef, {
                groupId: groupId,
                applicantName: name,
                applicantEmail: email,
                itemId: item.id,
                itemName: item.name,
                qty: item.qty,
                price: item.price,
                status: 'pending',
                specialReason: item.specialReason || '',
                timestamp: timestamp
            });

            // Deduct stock (Requires proper Firestore rules or a Cloud Function in production, but for V3 client side we do this)
            const invRef = db.collection('consumables_inventory').doc(item.id);
            batch.update(invRef, {
                stock: firebase.firestore.FieldValue.increment(-item.qty)
            });
        }

        await batch.commit();
        hideLoader();
        
        // Prepare submitted cart details
        const submittedDetails = {
            groupId: groupId,
            applicant: name,
            date: safeFormatDate(new Date()),
            items: cart.map(c => `${c.name} x ${c.qty}`)
        };

        // Send Email via API before clearing cart
        if (SETTINGS.HUB_API_URL) {
            let itemsHtml = cart.map(c => `<li>${c.name} x ${c.qty}</li>`).join('');
            let htmlBody = `
                <h2 style="color:#2563eb;">消耗品申請單成立</h2>
                <p><strong>申請人：</strong> ${name}</p>
                <p><strong>取件單號：</strong> ${groupId}</p>
                <p><strong>申請明細：</strong></p>
                <ul>${itemsHtml}</ul>
                <div style="margin: 20px 0;">
                    <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${groupId}&scale=2&includetext" alt="Barcode" style="max-width: 100%;">
                </div>
                <p style="color:#666;font-size:12px;margin-top:20px;">請憑此 Email 或網頁 QR Code/條碼前往領取。</p>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <a href="${window.location.origin}/?cancel=${groupId}&email=${encodeURIComponent(email)}" style="display:inline-block;padding:10px 15px;background-color:#ef4444;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">❌ 取消此單據</a>
                </div>
            `;
            fetch(SETTINGS.HUB_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendEmail',
                    to: email,
                    subject: '中正國小消耗品申請通知 - ' + groupId,
                    htmlBody: htmlBody,
                    secret: SETTINGS.API_SECRET_KEY
                })
            })
            .then(res => res.json())
            .then(res => console.log("Email API response:", res))
            .catch(e => console.error("信件錯誤", e));
        }

        // Reset form & cart
        cart = [];
        updateCartUI();
        document.getElementById('applyForm').reset();
        
        // Pop up the QR voucher modal!
        showVoucherModal(groupId, submittedDetails);

        // Reset verify button state
        userVerified = false;
        const btnVerify = document.getElementById('btn-verify-user');
        if (btnVerify) {
            btnVerify.innerText = "驗證身分";
            btnVerify.classList.replace('bg-green-600', 'bg-blue-600');
            btnVerify.classList.replace('bg-gray-400', 'bg-blue-600');
            btnVerify.disabled = false;
        }
    } catch (e) {
        hideLoader();
        showAlert("送出失敗: " + e.message);
    }
}

// --- Management Interface (Admin) ---
let manageUnsubscribe = null;

function loadManageList() {
    showLoader();
    if (manageUnsubscribe) manageUnsubscribe();
    
    // Subscribe to applications in real-time
    manageUnsubscribe = db.collection('consumables_applications')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
            let groups = {};
            snap.forEach(doc => {
                const data = doc.data();
                if (!groups[data.groupId]) {
                    groups[data.groupId] = {
                        groupId: data.groupId,
                        applicant: data.applicantName,
                        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
                        items: [],
                        hasSpecialReason: false
                    };
                }
                groups[data.groupId].items.push({ id: doc.id, ...data });
                if (data.specialReason) groups[data.groupId].hasSpecialReason = true;
            });

            // Process grouping logic (all_pending, partial, fully_done)
            manageData = Object.values(groups).map(g => {
                const pendingCount = g.items.filter(i => i.status === 'pending').length;
                const doneCount = g.items.filter(i => i.status === 'picked_up').length;
                const totalCount = g.items.length;
                
                if (pendingCount === totalCount) g.category = 'all_pending';
                else if (doneCount + g.items.filter(i=>i.status === 'cancelled').length === totalCount) g.category = 'fully_done';
                else g.category = 'partial';
                
                g.doneCount = doneCount;
                return g;
            });

            filterManageList();
            hideLoader();
        }, err => {
            hideLoader();
            showAlert("載入管理清單失敗：" + err.message);
        });
}

function filterManageList() {
    const keyword = document.getElementById('search-applicant').value.toLowerCase();
    
    const gridPending = document.getElementById('manage-grid-pending');
    const gridPartial = document.getElementById('manage-grid-partial');
    const gridDone = document.getElementById('manage-grid-done');
    if(!gridPending) return;
    
    gridPending.innerHTML = ''; gridPartial.innerHTML = ''; gridDone.innerHTML = '';
    let countPending = 0, countPartial = 0, countDone = 0;

    manageData.forEach(group => {
        if (keyword && !group.applicant.toLowerCase().includes(keyword) && !group.groupId.toLowerCase().includes(keyword)) return;

        let config = { bg: 'bg-white', border: 'border-blue-500', header: 'bg-blue-50', icon: 'fa-box', opacity: 'opacity-100', defaultDisplay: 'block', arrow: 'rotate-180' };
        let targetGrid = gridPending;

        if (group.category === 'all_pending') {
            config = { bg: 'bg-white', border: 'border-red-500', header: 'bg-red-50', icon: 'fa-box', opacity: 'opacity-100', defaultDisplay: 'block', arrow: 'rotate-180' };
            targetGrid = gridPending;
            countPending++;
        } else if (group.category === 'partial') {
            config = { bg: 'bg-white', border: 'border-orange-400', header: 'bg-orange-50', icon: 'fa-hourglass-half', opacity: 'opacity-100', defaultDisplay: 'none', arrow: '' };
            targetGrid = gridPartial;
            countPartial++;
        } else if (group.category === 'fully_done') {
            config = { bg: 'bg-gray-50', border: 'border-gray-300', header: 'bg-gray-100', icon: 'fa-check-circle', opacity: 'opacity-70', defaultDisplay: 'none', arrow: '' };
            targetGrid = gridDone;
            countDone++;
        }

        let itemsHtml = group.items.map(item => {
            let statusHtml = '', actionHtml = '';
            
            if (item.status === 'picked_up') {
                statusHtml = `<div class="text-[10px] text-gray-400">已領取</div>`;
                actionHtml = `<i class="fa-solid fa-circle-check text-green-500 text-lg" title="已領取"></i>`;
            } else if (item.status === 'pending') {
                statusHtml = `<div class="text-[10px] text-gray-400">狀態: 準備中</div>`;
                actionHtml = `
                    <div class="flex items-center gap-1.5">
                        <button onclick="event.stopPropagation(); pickupSingle('${item.id}')" class="text-green-500 hover:text-green-700 bg-green-50 hover:bg-green-100 transition-colors w-7 h-7 rounded shadow-sm flex items-center justify-center"><i class="fa-solid fa-check"></i></button>
                        <button onclick="event.stopPropagation(); deleteSingle('${item.id}', '${item.itemId}', ${item.qty})" class="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 transition-colors w-7 h-7 rounded shadow-sm flex items-center justify-center"><i class="fa-solid fa-trash-can"></i></button>
                    </div>`;
            } else {
                statusHtml = `<div class="text-[10px] text-red-400">狀態: 已作廢</div>`;
                actionHtml = `<span class="text-xs text-red-500 font-bold whitespace-nowrap"><i class="fa-solid fa-ban mr-1"></i>已作廢</span>`;
            }

            const isStrikethrough = item.status !== 'pending';
            const specialReasonHtml = item.specialReason ? `<div class="text-[10px] text-orange-600 font-bold mt-1 bg-orange-50 inline-block px-1 rounded"><i class="fa-solid fa-triangle-exclamation"></i> 特殊用途: ${item.specialReason}</div>` : '';

            return `
                <div class="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                        <div class="text-sm font-bold ${isStrikethrough ? 'line-through text-gray-400' : 'text-gray-700'}">${item.itemName}</div>
                        ${statusHtml}
                        ${specialReasonHtml}
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm font-black text-gray-500">x${item.qty}</span>
                        ${actionHtml}
                    </div>
                </div>`;
        }).join('');

        let actionBtn = '';
        if (group.category !== 'fully_done') {
            actionBtn = `
                <div class="flex items-center gap-2">
                    <button onclick="event.stopPropagation(); pickupAll('${group.groupId}')" class="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full shadow hover:bg-indigo-700 transition-colors font-bold whitespace-nowrap shrink-0"><i class="fa-solid fa-check-double mr-1"></i>一鍵全領</button>
                </div>
            `;
        }

        const qrBtn = `<button onclick="event.stopPropagation(); showVoucherModal('${group.groupId}')" class="text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 shrink-0" title="檢視 QR Code 憑證"><i class="fa-solid fa-qrcode"></i> 憑證</button>`;
        const warningBadge = group.hasSpecialReason ? '<i class="fa-solid fa-circle-exclamation text-orange-500" title="含有特殊需求說明"></i>' : '';

        targetGrid.innerHTML += `
            <div class="rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md ${config.opacity} ${config.bg} border-l-4 ${config.border} h-fit">
                <div class="px-4 py-4 cursor-pointer flex justify-between items-center ${config.header} select-none" onclick="toggleAccordion('${group.groupId}')">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-inner">
                            <i class="fa-solid ${config.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-black text-gray-800 leading-tight truncate flex items-center gap-2">${group.applicant || '未知'} ${warningBadge}</div>
                            <div class="text-[10px] text-gray-500 truncate mt-0.5">${group.groupId} • ${safeFormatDate(group.timestamp)}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 ml-2">
                        ${qrBtn}
                        ${actionBtn}
                        <i id="arrow-${group.groupId}" class="fa-solid fa-chevron-down text-gray-400 chevron-rotate ${config.arrow}"></i>
                    </div>
                </div>
                <div id="content-${group.groupId}" class="accordion-content px-4" style="max-height: ${config.defaultDisplay === 'block' ? '1000px' : '0px'}; padding-bottom: ${config.defaultDisplay === 'block' ? '12px' : '0px'}; padding-top: ${config.defaultDisplay === 'block' ? '12px' : '0px'};">
                    ${itemsHtml}
                </div>
            </div>`;
    });

    document.getElementById('count-all-pending').innerText = countPending;
    document.getElementById('count-partial').innerText = countPartial;
    document.getElementById('count-fully-done').innerText = countDone;
}

function toggleAccordion(id) {
    const content = document.getElementById(`content-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const isHidden = content.style.maxHeight === '0px' || content.style.maxHeight === '';
    
    if (isHidden) {
        content.style.maxHeight = '1000px';
        content.style.paddingTop = '12px';
        content.style.paddingBottom = '12px';
        arrow.classList.add('rotate-180');
    } else {
        content.style.maxHeight = '0px';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
        arrow.classList.remove('rotate-180');
    }
}

async function pickupSingle(docId) {
    if(!confirm('確認將此單一品項標記為「已領取」？')) return;
    showLoader();
    try {
        const docRef = db.collection('consumables_applications').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) { hideLoader(); return; }
        const data = docSnap.data();

        await docRef.update({ status: 'picked_up' });
        hideLoader();

        // Send Email via API
        if (SETTINGS.HUB_API_URL && data.applicantEmail) {
            let htmlBody = `
                <h2 style="color:#16a34a;">消耗品單項領取完成</h2>
                <p><strong>申請人：</strong> ${data.applicantName}</p>
                <p><strong>取件單號：</strong> ${data.groupId}</p>
                <p><strong>已領取明細：</strong></p>
                <ul><li>${data.itemName} x ${data.qty}</li></ul>
                <p style="color:#666;font-size:12px;margin-top:20px;">感謝您的使用！</p>
            `;
            fetch(SETTINGS.HUB_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendEmail',
                    to: data.applicantEmail,
                    subject: '【中正國小】消耗品已領取通知 - ' + data.groupId,
                    htmlBody: htmlBody,
                    secret: SETTINGS.API_SECRET_KEY
                })
            }).catch(e => console.error("寄信失敗", e));
        }
    } catch(e) { hideLoader(); showAlert(e.message); }
}

async function deleteSingle(docId, invId, qty) {
    if(!confirm('確定作廢此單一品項並歸還庫存？')) return;
    showLoader();
    try {
        const batch = db.batch();
        batch.update(db.collection('consumables_applications').doc(docId), { status: 'cancelled' });
        batch.update(db.collection('consumables_inventory').doc(invId), { stock: firebase.firestore.FieldValue.increment(qty) });
        await batch.commit();
        hideLoader();
    } catch(e) { hideLoader(); showAlert(e.message); }
}

async function pickupAll(groupId) {
    if(!confirm('確認領取該單據【所有未領取】的品項？')) return;
    showLoader();
    try {
        const snap = await db.collection('consumables_applications').where('groupId', '==', groupId).where('status', '==', 'pending').get();
        if (snap.empty) { hideLoader(); return; }
        
        // 檢查是否有品項的「目前庫存」已經為負數
        let hasNegativeStockItem = false;
        snap.forEach(doc => {
            const data = doc.data();
            const invItem = inventoryData.find(i => i.id === data.itemId);
            if (invItem && parseInt(invItem.stock) < 0) {
                hasNegativeStockItem = true;
            }
        });

        if (hasNegativeStockItem) {
            hideLoader();
            showAlert("此單據中包含「目前庫存為負數」的品項，無法一鍵全領！\n請您針對有庫存的項目進行『單項核發』。");
            return;
        }

        let applicant = snap.docs[0].data().applicantName;
        let email = snap.docs[0].data().applicantEmail;
        let itemsHtml = '';

        const batch = db.batch();
        snap.forEach(doc => {
            batch.update(doc.ref, { status: 'picked_up' });
            itemsHtml += `<li>${doc.data().itemName} x ${doc.data().qty}</li>`;
        });
        await batch.commit();
        hideLoader();

        // Send Email via API
        if (SETTINGS.HUB_API_URL && email) {
            let htmlBody = `
                <h2 style="color:#16a34a;">消耗品領取完成</h2>
                <p><strong>申請人：</strong> ${applicant}</p>
                <p><strong>取件單號：</strong> ${groupId}</p>
                <p><strong>已領取明細：</strong></p>
                <ul>${itemsHtml}</ul>
                <p style="color:#666;font-size:12px;margin-top:20px;">感謝您的使用！</p>
            `;
            fetch(SETTINGS.HUB_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendEmail',
                    to: email,
                    subject: '【中正國小】消耗品已領取通知 - ' + groupId,
                    htmlBody: htmlBody,
                    secret: SETTINGS.API_SECRET_KEY
                })
            }).catch(e => console.error("寄信失敗", e));
        }

    } catch(e) { hideLoader(); showAlert(e.message); }
}

// --- Restock, Settings, and Preset Items ---
function loadRestockTable() {
    showLoader();
    db.collection('consumables_inventory').get().then(snap => {
        let data = [];
        snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
        inventoryData = data;
        const body = document.getElementById('restock-table-body');
        if(!body) return;
        body.innerHTML = '';
        if (data.length === 0) {
            body.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400">目前尚無品項。可點擊右上角「載入預設品項」進行初始化。</td></tr>`;
        } else {
            data.forEach(item => {
                body.innerHTML += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-4 font-bold min-w-[120px]">${item.name} ${item.isAdminOnly ? '<span class="text-[10px] text-red-500 font-bold ml-1">(行政專用)</span>' : ''}</td>
                        <td class="p-4 text-center text-lg font-bold">${item.stock || 0}</td>
                        <td class="p-4 text-gray-400 text-sm whitespace-nowrap">< ${item.alertLevel || 3}</td>
                        <td class="p-4 bg-blue-50 text-center"><input type="number" id="restock-input-${item.id}" min="0" placeholder="0" class="w-full max-w-[100px] text-center border rounded-lg p-2 text-base outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"></td>
                    </tr>`;
            });
        }
        hideLoader();
    }).catch(err => { hideLoader(); showAlert(err.message); });
}

async function submitBatchRestock() {
    let ups = [];
    inventoryData.forEach(i => {
        const input = document.getElementById(`restock-input-${i.id}`);
        if(input && input.value && parseInt(input.value) > 0) {
            ups.push({ id: i.id, qty: parseInt(input.value) });
        }
    });
    if(ups.length === 0) { showAlert("請至少填寫一項大於 0 的進貨數量！"); return; }
    showLoader();
    try {
        const batch = db.batch();
        ups.forEach(u => {
            batch.update(db.collection('consumables_inventory').doc(u.id), {
                stock: firebase.firestore.FieldValue.increment(u.qty),
                totalStock: firebase.firestore.FieldValue.increment(u.qty)
            });
        });
        await batch.commit();
        hideLoader();
        showAlert("批次補貨成功！庫存已更新。");
        loadRestockTable();
    } catch(e) { hideLoader(); showAlert(e.message); }
}

const DEFAULT_SETTINGS = [
    { key: "HUB_API_URL", val: "", desc: "與 LINE Hub 對接的 Web App URL" },
    { key: "API_SECRET_KEY", val: "ChungCheng_Secure_123", desc: "與 LINE Hub 對接的金鑰" },
    { key: "Admin_Email", val: "brianhung@gm.ccps.kh.edu.tw", desc: "接收低庫存警示與通知的 Email" },
    { key: "開放開始時間", val: "", desc: "限制表單申請開始時間 (例如: 2026-04-01T08:00)" },
    { key: "開放結束時間", val: "", desc: "限制表單申請結束時間 (例如: 2026-04-30T17:00)" },
    { key: "一般人員額度限制", val: "100", desc: "一般人員每次開放期間的計費物品上限 ($)" }
];

async function loadSettings() {
    showLoader();
    try {
        const snap = await db.collection('consumables_settings').get();
        let settings = {};
        
        if (snap.empty) {
            // Seed default settings if empty
            const batch = db.batch();
            DEFAULT_SETTINGS.forEach(s => {
                const ref = db.collection('consumables_settings').doc(s.key);
                batch.set(ref, { value: s.val, description: s.desc });
                settings[s.key] = s.val;
            });
            await batch.commit();
        } else {
            snap.forEach(doc => {
                settings[doc.id] = doc.data().value || '';
            });
        }
        SETTINGS = settings; // Update global


        const container = document.getElementById('settings-form-container');
        if (container) {
            container.innerHTML = '';
            Object.keys(settings).sort().forEach(key => {
                const value = settings[key] || '';
                let inputType = key.includes("時間") ? "datetime-local" : "text";
                container.innerHTML += `
                    <div class="flex flex-col md:flex-row md:items-center gap-2 border-b border-gray-50 pb-4 last:border-0">
                        <label class="w-full md:w-56 font-bold text-gray-700 text-sm">${key}</label>
                        <input type="${inputType}" id="setting-input-${key}" value="${value}" class="flex-1 border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium">
                    </div>`;
            });
        }
        hideLoader();
    } catch(e) { hideLoader(); showAlert("載入設定失敗: " + e.message); }
}

async function saveAllSettings() {
    const container = document.getElementById('settings-form-container');
    if(!container) return;
    const inputs = container.querySelectorAll('input');
    showLoader();
    try {
        const batch = db.batch();
        inputs.forEach(inp => {
            const key = inp.id.replace('setting-input-', '');
            batch.set(db.collection('consumables_settings').doc(key), { value: inp.value }, { merge: true });
        });
        await batch.commit();
        hideLoader();
        showAlert("所有設定已成功儲存！");
        loadSettings();
    } catch(e) { hideLoader(); showAlert("儲存設定失敗: " + e.message); }
}

async function loadSettingsAndCheck() {
    try {
        const snap = await db.collection('consumables_settings').get();
        let settings = {};
        snap.forEach(doc => settings[doc.id] = doc.data().value);
        SETTINGS = settings; // Update global

        const now = new Date();
        let open = true;
        if(settings['開放開始時間'] && now < new Date(settings['開放開始時間'])) open = false;
        if(settings['開放結束時間'] && now > new Date(settings['開放結束時間'])) open = false;

        const formContainer = document.getElementById('apply-form-container');
        const closedBanner = document.getElementById('closed-banner');
        const closedText = document.getElementById('closed-banner-text');

        if(formContainer) formContainer.style.display = open ? 'flex' : 'none';
        if(closedBanner) closedBanner.style.display = open ? 'none' : 'block';
        if(closedText) closedText.innerText = "目前非開放申請期間。";
        hideLoader();
    } catch(e) { 
        console.error(e); 
        hideLoader();
    }
}

// Preset Inventory Seeding Function (Transcribed from original sheet)
const PRESET_ITEMS = [
    { id: "CH-CHK-WT", name: "粉筆-白", category: "耗材", stock: 5, totalStock: 19, unit: "盒", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "CH-CHK-RD", name: "粉筆-紅", category: "耗材", stock: 24, totalStock: 39, unit: "盒", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "CH-CHK-YL", name: "粉筆-黃", category: "耗材", stock: 70, totalStock: 89, unit: "盒", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "CH-CHK-BL", name: "粉筆-藍", category: "耗材", stock: 48, totalStock: 50, unit: "盒", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "CH-CHK-GN", name: "粉筆-綠", category: "耗材", stock: 7, totalStock: 14, unit: "盒", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "PN-BPR-RD", name: "原子筆(紅)", category: "文具", stock: 172, totalStock: 308, unit: "支", alertLevel: 3, price: 10, isAdminOnly: false },
    { id: "PN-BPR-BL", name: "原子筆(藍)", category: "文具", stock: 92, totalStock: 150, unit: "支", alertLevel: 3, price: 10, isAdminOnly: false },
    { id: "PN-BPR-BK", name: "原子筆(黑)", category: "文具", stock: 140, totalStock: 150, unit: "支", alertLevel: 3, price: 10, isAdminOnly: false },
    { id: "PN-SGP-RD", name: "白板筆(藍)", category: "文具", stock: 16, totalStock: 23, unit: "支", alertLevel: 3, price: 18, isAdminOnly: false },
    { id: "PN-SGR-RD", name: "白板筆(黑)", category: "文具", stock: 20, totalStock: 23, unit: "支", alertLevel: 3, price: 18, isAdminOnly: false },
    { id: "MK-WBP-BL", name: "白板筆(紅)", category: "文具", stock: 5, totalStock: 12, unit: "支", alertLevel: 3, price: 18, isAdminOnly: false },
    { id: "MK-WBP-BK", name: "奇異筆(黑)", category: "文具", stock: 22, totalStock: 12, unit: "支", alertLevel: 3, price: 10, isAdminOnly: false },
    { id: "MK-WBP-RD", name: "簽字筆(紅)", category: "文具", stock: 49, totalStock: 28, unit: "支", alertLevel: 3, price: 7, isAdminOnly: false },
    { id: "MK-PRM-BK", name: "簽字筆 (紅色補充液)", category: "耗材", stock: 51, totalStock: 55, unit: "瓶", alertLevel: 3, price: 25, isAdminOnly: false },
    { id: "AD-CLT-18", name: "透明膠帶(1.8cm)", category: "耗材", stock: -2, totalStock: 5, unit: "個", alertLevel: 3, price: 13, isAdminOnly: false },
    { id: "AD-DBT-18", name: "雙面膠帶(1.8cm)", category: "耗材", stock: 21, totalStock: 15, unit: "個", alertLevel: 3, price: 26, isAdminOnly: false },
    { id: "AD-GLU-00", name: "膠水", category: "耗材", stock: 22, totalStock: 10, unit: "瓶", alertLevel: 3, price: 8, isAdminOnly: false },
    { id: "ST-INP-RD", name: "打印台(紅)", category: "文具", stock: 6, totalStock: 8, unit: "個", alertLevel: 3, price: 60, isAdminOnly: false },
    { id: "ST-INP-BL", name: "打印台(藍)", category: "文具", stock: 7, totalStock: 3, unit: "個", alertLevel: 3, price: 60, isAdminOnly: false },
    { id: "ST-INP-BK", name: "打印台(黑)", category: "文具", stock: 6, totalStock: 1, unit: "個", alertLevel: 3, price: 60, isAdminOnly: false },
    { id: "ST-STP-00", name: "訂書針", category: "耗材", stock: 12, totalStock: 18, unit: "盒", alertLevel: 3, price: 7, isAdminOnly: false },
    { id: "ST-CUT-00", name: "美工刀", category: "文具", stock: 47, totalStock: 0, unit: "支", alertLevel: 3, price: 10, isAdminOnly: false },
    { id: "ST-ERO-00", name: "板擦", category: "耗材", stock: -2, totalStock: 0, unit: "個", alertLevel: 3, price: 0, isAdminOnly: false },
    { id: "ST-ENV-SM", name: "行政-信封(小)", category: "耗材", stock: 0, totalStock: 0, unit: "個", alertLevel: 3, price: 0, isAdminOnly: true },
    { id: "ST-ENV-MD", name: "行政-信封(中)", category: "耗材", stock: -2, totalStock: 0, unit: "個", alertLevel: 3, price: 0, isAdminOnly: true },
    { id: "ST-ENV-LG", name: "行政-信封(大)", category: "耗材", stock: 0, totalStock: 0, unit: "個", alertLevel: 3, price: 0, isAdminOnly: true },
    { id: "PN-INR-RD", name: "行政-連續章補充液", category: "耗材", stock: 0, totalStock: 0, unit: "瓶", alertLevel: 3, price: 0, isAdminOnly: true }
];

async function seedPresetInventory() {
    if(!confirm("確定要將試算表中的全數 27 筆原系統品項（包含庫存、價格與單位）匯入資料庫嗎？")) return;
    showLoader();
    try {
        const batch = db.batch();
        PRESET_ITEMS.forEach(item => {
            const itemData = { ...item };
            const docId = itemData.id;
            delete itemData.id;
            const ref = db.collection('consumables_inventory').doc(docId);
            batch.set(ref, itemData);
        });
        await batch.commit();
        hideLoader();
        showAlert("原系統 27 筆品項資料已成功全數匯入資料庫！");
        if(typeof loadInventory === 'function') loadInventory();
        if(typeof loadRestockTable === 'function') loadRestockTable();
    } catch(e) { hideLoader(); showAlert("匯入失敗: " + e.message); }
}

// --- Scanner and Global Listener logic ---
let html5QrcodeScanner = null;

function toggleScanner() {
    const container = document.getElementById('qr-reader-container');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        try {
            html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { 
                fps: 10, 
                qrbox: {width: 250, height: 250},
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
            }, false);
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        } catch (e) {
            console.error("相機初始化失敗", e);
            showAlert("相機初始化失敗，請確認已給予相機權限，或更換瀏覽器試試看：" + e.message);
        }
    } else {
        container.classList.add('hidden');
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        }
    }
}
function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning
    // console.warn(`Code scan error = ${error}`);
}

function onScanSuccess(decodedText, decodedResult) {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
        document.getElementById('qr-reader-container').classList.add('hidden');
    }
    
    // Auto-search and filter
    const searchInput = document.getElementById('search-applicant');
    if(searchInput) {
        searchInput.value = decodedText;
        filterManageList();
        
        setTimeout(() => {
            const group = manageData.find(g => g.groupId === decodedText && g.category !== 'fully_done');
            if (!group) {
                showAlert("找不到未領取之單據：" + decodedText);
            }
        }, 300);
    }
}

// --- Item CRUD & Order Management ---
function openItemModal(docId) {
    const modal = document.getElementById('item-modal');
    const title = document.getElementById('item-modal-title');
    if (!modal) return;

    if (docId) {
        // Edit Mode
        const item = inventoryData.find(i => i.id === docId);
        if (!item) return;
        title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> 編輯品項：${item.name}`;
        document.getElementById('modal-item-doc-id').value = item.id;
        document.getElementById('modal-item-id').value = item.id;
        document.getElementById('modal-item-id').disabled = true;
        document.getElementById('modal-item-name').value = item.name || '';
        document.getElementById('modal-item-category').value = item.category || '';
        document.getElementById('modal-item-unit').value = item.unit || '個';
        document.getElementById('modal-item-stock').value = item.stock || 0;
        document.getElementById('modal-item-totalstock').value = item.totalStock || item.stock || 0;
        document.getElementById('modal-item-price').value = item.price || 0;
        document.getElementById('modal-item-alert').value = item.alertLevel || 3;
        document.getElementById('modal-item-order').value = item.order || 10;
        document.getElementById('modal-item-adminonly').checked = !!item.isAdminOnly;
    } else {
        // Create Mode
        title.innerHTML = `<i class="fa-solid fa-plus-circle"></i> 新增品項`;
        document.getElementById('modal-item-doc-id').value = '';
        document.getElementById('modal-item-id').value = '';
        document.getElementById('modal-item-id').disabled = false;
        document.getElementById('modal-item-name').value = '';
        document.getElementById('modal-item-category').value = '文具';
        document.getElementById('modal-item-unit').value = '個';
        document.getElementById('modal-item-stock').value = 0;
        document.getElementById('modal-item-totalstock').value = 0;
        document.getElementById('modal-item-price').value = 0;
        document.getElementById('modal-item-alert').value = 3;
        document.getElementById('modal-item-order').value = (inventoryData.length + 1) * 10;
        document.getElementById('modal-item-adminonly').checked = false;
    }
    modal.classList.remove('hidden');
}

function closeItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveItemFromModal() {
    const docId = document.getElementById('modal-item-doc-id').value;
    const customId = document.getElementById('modal-item-id').value.trim();
    const name = document.getElementById('modal-item-name').value.trim();
    const category = document.getElementById('modal-item-category').value.trim() || '文具';
    const unit = document.getElementById('modal-item-unit').value.trim() || '個';
    const stock = parseInt(document.getElementById('modal-item-stock').value) || 0;
    const totalStock = parseInt(document.getElementById('modal-item-totalstock').value) || stock;
    const price = parseFloat(document.getElementById('modal-item-price').value) || 0;
    const alertLevel = parseInt(document.getElementById('modal-item-alert').value) || 3;
    const order = parseInt(document.getElementById('modal-item-order').value) || 10;
    const isAdminOnly = document.getElementById('modal-item-adminonly').checked;

    if (!name) { showAlert("請填寫品名！"); return; }

    showLoader();
    try {
        const itemData = { name, category, unit, stock, totalStock, price, alertLevel, order, isAdminOnly };
        if (docId) {
            await db.collection('consumables_inventory').doc(docId).update(itemData);
        } else {
            if (customId) {
                await db.collection('consumables_inventory').doc(customId).set(itemData);
            } else {
                await db.collection('consumables_inventory').add(itemData);
            }
        }
        hideLoader();
        closeItemModal();
        showAlert("品項已成功儲存！");
        loadInventory();
    } catch(e) { hideLoader(); showAlert("儲存品項失敗: " + e.message); }
}

async function deleteItem(docId, name) {
    if (!confirm(`確定要刪除品項「${name}」嗎？刪除後無法恢復！`)) return;
    showLoader();
    try {
        await db.collection('consumables_inventory').doc(docId).delete();
        hideLoader();
        showAlert("品項已刪除！");
        loadInventory();
    } catch(e) { hideLoader(); showAlert("刪除失敗: " + e.message); }
}

async function moveItemOrder(docId, delta) {
    const idx = inventoryData.findIndex(i => i.id === docId);
    if (idx < 0) return;
    const currentOrder = parseInt(inventoryData[idx].order) || (idx + 1) * 10;
    const newOrder = currentOrder + (delta * 15);
    
    showLoader();
    try {
        await db.collection('consumables_inventory').doc(docId).update({ order: newOrder });
        hideLoader();
        loadInventory();
    } catch(e) { hideLoader(); showAlert("調整順序失敗: " + e.message); }
}

// --- Admin Users RBAC Management ---
async function loadAdminList() {
    const container = document.getElementById('admin-list-container');
    if (!container) return;
    try {
        const snap = await db.collection('consumables_admins').get();
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = `<div class="text-xs text-gray-400 p-3 text-center">目前尚無登記管理員集合。您可點擊上方新增。</div>`;
            return;
        }
        snap.forEach(doc => {
            const data = doc.data();
            const currentRole = data.role || 'manager';
            
            container.innerHTML += `
                <div class="bg-gray-50 border p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm">
                    <div>
                        <div class="font-bold text-gray-800 flex items-center gap-2">${data.email || doc.id}</div>
                        <div class="text-[10px] text-gray-400 font-mono mt-0.5">UID: ${doc.id}</div>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <select onchange="updateAdminRoleDirectly('${doc.id}', this.value)" class="border rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-indigo-900 border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                            <option value="manager" ${currentRole === 'manager' ? 'selected' : ''}>👤 一般管理員 (manager)</option>
                            <option value="sysadmin" ${currentRole === 'sysadmin' ? 'selected' : ''}>⚙️ 系統管理員 (sysadmin)</option>
                        </select>
                        <button onclick="deleteAdminRole('${doc.id}')" class="text-red-400 hover:text-red-600 bg-white p-1.5 rounded-lg border border-red-200 shadow-sm text-xs" title="撤銷管理權限"><i class="fa-solid fa-user-xmark"></i> 撤銷</button>
                    </div>
                </div>`;
        });
    } catch(e) { container.innerHTML = `<div class="text-xs text-red-500">載入管理員失敗: ${e.message}</div>`; }
}

async function updateAdminRoleDirectly(uid, newRole) {
    showLoader();
    try {
        await db.collection('consumables_admins').doc(uid).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        hideLoader();
        showAlert(`已將權限成功切換為「${newRole === 'sysadmin' ? '系統管理員' : '一般管理員'}」！`);
    } catch(e) { hideLoader(); showAlert("更新權限失敗: " + e.message); loadAdminList(); }
}

async function saveAdminRole() {
    const emailInput = document.getElementById('admin-add-email');
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const role = document.getElementById('admin-add-role').value;

    if (!email) { showAlert("請輸入管理員 Email！"); return; }
    showLoader();
    try {
        await db.collection('consumables_admins').doc(email).set({
            email: email,
            role: role,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        hideLoader();
        showAlert(`成功將 ${email} 授權為「${role === 'sysadmin' ? '系統管理員' : '一般管理員'}」！`);
        if (emailInput) emailInput.value = '';
        loadAdminList();
    } catch(e) { hideLoader(); showAlert("授權失敗: " + e.message); }
}

async function deleteAdminRole(uid) {
    if (!confirm(`確定要撤銷 UID ${uid} 的管理權限嗎？`)) return;
    showLoader();
    try {
        await db.collection('consumables_admins').doc(uid).delete();
        hideLoader();
        showAlert("權限已撤銷！");
        loadAdminList();
    } catch(e) { hideLoader(); showAlert("撤銷失敗: " + e.message); }
}

// --- USB Scanner & Keyboard Handler Improvements ---
function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val) {
            onScanSuccess(val);
        }
    }
}

let barcodeBuffer = "";
let barcodeTimeout = null;

document.addEventListener("keydown", function(e) {
    if (!IS_ADMIN) return;
    const viewManage = document.getElementById('view-manage');
    if (!viewManage || viewManage.classList.contains('hidden')) return;

    // Allow scanning even if focus is in search input
    if (e.target.tagName === 'INPUT' && e.target.id !== 'search-applicant') return;

    if (e.key === "Enter") {
        const cleanBuffer = barcodeBuffer.trim();
        if (cleanBuffer.length >= 3) {
            onScanSuccess(cleanBuffer);
        }
        barcodeBuffer = "";
        clearTimeout(barcodeTimeout);
    } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => { barcodeBuffer = ""; }, 150);
    }
});

// --- QR Code Voucher Modal logic ---
function showVoucherModal(groupId, customDetails) {
    const modal = document.getElementById('qr-voucher-modal');
    const gidSpan = document.getElementById('voucher-group-id');
    const applicantSpan = document.getElementById('voucher-applicant');
    const dateSpan = document.getElementById('voucher-date');
    const itemsContainer = document.getElementById('voucher-items-list');

    if (!modal) return;

    // Generate 1D Barcode (CODE128)
    try {
        JsBarcode("#voucher-barcode-svg", groupId, {
            format: "CODE128",
            displayValue: false,
            width: 2.5,
            height: 80,
            margin: 5
        });
    } catch(e) {
        console.error("Barcode generation failed: ", e);
    }

    gidSpan.innerText = groupId;

    if (customDetails) {
        applicantSpan.innerText = customDetails.applicant || '--';
        dateSpan.innerText = customDetails.date || safeFormatDate(new Date());
        itemsContainer.innerHTML = (customDetails.items || []).map(i => `<div>• ${i}</div>`).join('');
    } else {
        const group = manageData.find(g => g.groupId === groupId);
        if (group) {
            applicantSpan.innerText = group.applicant;
            dateSpan.innerText = safeFormatDate(group.timestamp);
            itemsContainer.innerHTML = group.items.map(i => `<div>• ${i.itemName} x ${i.qty} ${i.status === 'picked_up' ? '(已領取)' : ''}</div>`).join('');
        } else {
            applicantSpan.innerText = '--';
            dateSpan.innerText = safeFormatDate(new Date());
            itemsContainer.innerHTML = '<div>--</div>';
        }
    }

    modal.classList.remove('hidden');
}

function closeVoucherModal() {
    const modal = document.getElementById('qr-voucher-modal');
    if (modal) modal.classList.add('hidden');
}
