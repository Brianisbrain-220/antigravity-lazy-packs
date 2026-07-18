/**
 * ============================================================================
 * 📦 【消耗品管理子系統 V2.3】純淨微服務 Spoke 節點 (三段式摺疊管理 UI 版)
 * ============================================================================
 * 💡 系統用途：
 * 處理消耗品申請、無阻擋庫存扣除(支援負數)、每月定時預警、0元覆蓋防呆、並支援跨系統 API 查詢。
 * [V2.3 更新] 新增核發管理清單的三段式分類邏輯 (All Pending / Partial / Fully Done)。
 * ============================================================================
 */

// 🟩🟩🟩 【模組一：控制中心 / CONFIG】
const CONFIG = {
  SHEET_REQUESTS: "申請紀錄",
  SHEET_INVENTORY: "庫存",
  SHEET_SETTINGS: "系統設定",
  KEY_PREFIX: "CSM_SECURE_"
};

const dbSchema = [
  { name: CONFIG.SHEET_REQUESTS, headers: ["單號", "時間戳記", "申請人", "申請人Email", "品項", "數量", "總價", "狀態", "領取時間"], color: "#c9daf8" },
  { name: CONFIG.SHEET_INVENTORY, headers: ["ID", "品名", "類別", "目前庫存", "總庫存量", "單位", "低庫存警示", "單價", "隱藏列號"], color: "#d9ead3" },
  { name: CONFIG.SHEET_SETTINGS, headers: ["設定項目", "設定值", "說明(請勿修改第一欄)"], color: "#f4cccc" }
];

// 🟦🟦🟦 【模組二：分流中心 / GATEWAY】

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠️ 消耗品系統專屬設定')
    .addItem('1️⃣ 一鍵建置資料庫與排程 (初始化)', 'AUTOMATION_SetupDatabase')
    .addSeparator()
    .addItem('🔒 2️⃣ 安全隱藏通關密語', 'AUTOMATION_SecureKeys')
    .addToUi();
}

/**
 * 處理前端網頁與 Email 取消連結的路由
 */
function doGet(e) {
  if (e.parameter.action === "cancel" && e.parameter.id) {
    return SERVICES_HandleCancel(e.parameter.id);
  }
  
  var template = HtmlService.createTemplateFromFile('Index');
  template.mode = e.parameter.mode || 'user';
  template.webAppUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
      .setTitle('消耗品管理系統')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 接收來自 LINE Hub 的跨系統 API 請求 (查詢未領取紀錄)
 */
function doPost(e) {
  try {
    if (!e.parameter || e.parameter.action !== "query") {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid Action" })).setMimeType(ContentService.MimeType.JSON);
    }

    const receivedSecret = e.parameter.secret;
    const targetEmail = e.parameter.email;
    const validSecret = TOOLBOX_GetConfig("API_SECRET_KEY");

    if (!validSecret || receivedSecret !== validSecret) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REQUESTS);
    const data = sheet.getDataRange().getValues();
    let latestRecord = null;
    let latestTime = 0;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][3]).trim() === targetEmail.trim() && data[i][7] === "pending") {
        let recordTime = new Date(data[i][1]).getTime();
        if (recordTime > latestTime) {
          latestTime = recordTime;
          latestRecord = data[i];
        }
      }
    }

    let replyText = "";
    if (latestRecord) {
      const orderId = latestRecord[0];
      const dateStr = Utilities.formatDate(new Date(latestRecord[1]), "Asia/Taipei", "yyyy/MM/dd");
      const items = latestRecord[4] + " x " + latestRecord[5];
      replyText = `📦【最新消耗品申請狀態】\n單號：${orderId}\n申請日期：${dateStr}\n品項數量：${items}\n處理狀態：準備中 (未領取)`;
    } else {
      replyText = TOOLBOX_GetConfig("Msg_NoRecord") || "您目前沒有消耗品申請紀錄喔！";
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: replyText })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🟨🟨🟨 【模組三：業務邏輯 / SERVICES】

/**
 * 處理表單送出：包含身分驗證、0元覆蓋機制、扣除庫存(支援負數)與寄信
 */
function processForm(formData) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(15000); 
  } catch (e) { 
    return { success: false, message: "系統目前忙碌中，請稍後再試。" };
  }

  try {
    const applicant = formData.name;
    const email = formData.email.trim();
    const cart = formData.cart;
    const isForceOverwrite = formData.forceOverwrite || false;

    const verifyRes = TOOLBOX_CallHubApi("verify", email);
    
    if (!verifyRes || !verifyRes.success || !verifyRes.bound) {
      return { success: false, requireBind: true, message: "⚠️ 驗證失敗：您尚未完成本校 LINE 官方帳號綁定。\n\n請先至官方 LINE 進行身分綁定，方可送出申請單！" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reqSheet = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
    const invSheet = ss.getSheetByName(CONFIG.SHEET_INVENTORY);
    
    const timestamp = new Date();
    const formattedTime = Utilities.formatDate(timestamp, "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
    const orderId = `CSM-${Utilities.formatDate(timestamp, "Asia/Taipei", "yyyyMMdd")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const startTimeStr = TOOLBOX_GetConfig("開放開始時間");
    const endTimeStr = TOOLBOX_GetConfig("開放結束時間");
    
    const startTime = startTimeStr ? new Date(startTimeStr) : null;
    const endTime = endTimeStr ? new Date(endTimeStr) : null;
    
    if (startTime && timestamp < startTime) {
      return { success: false, message: '尚未到達開放申請時間！' };
    }
    if (endTime && timestamp > endTime) {
      return { success: false, message: '已經超過開放申請時間！' };
    }

    let newOrderTotal = 0;
    cart.forEach(item => {
      newOrderTotal += (item.qty * item.price);
    });

    // 讀取行政名單與額度限制設定
    const adminEmailsConfig = TOOLBOX_GetConfig("行政人員名單") || "";
    const adminEmails = adminEmailsConfig.split(",").map(e => e.trim().toLowerCase());
    const isAdminUser = (verifyRes && verifyRes.isAdmin === true) || adminEmails.includes(email.toLowerCase());

    const maxLimitConfig = TOOLBOX_GetConfig("一般人員額度限制") || "100";
    const maxLimit = parseFloat(maxLimitConfig) || 100;

    const reqData = reqSheet.getDataRange().getValues();
    let pendingOldRows = [];
    let hasPickedUpPaid = false;
    let totalPickedUpPaidSpend = 0;
    
    for (let r = 1; r < reqData.length; r++) {
      if (String(reqData[r][3]).trim().toLowerCase() === email.toLowerCase()) {
        let reqTime = new Date(reqData[r][1]);
        let isWithinPeriod = true;
        
        if (startTime && reqTime < startTime) {
          isWithinPeriod = false;
        }
        if (endTime && reqTime > endTime) {
          isWithinPeriod = false;
        }

        if (isWithinPeriod) {
          let oldStatus = reqData[r][7];
          let oldTotal = parseInt(reqData[r][6]) || 0;

          if (oldStatus === "pending") {
            pendingOldRows.push({ rowIndex: r + 1, orderId: reqData[r][0], items: reqData[r][4], qty: reqData[r][5] });
          } else if (oldStatus === "picked_up") {
            if (oldTotal > 0) {
              hasPickedUpPaid = true;
              totalPickedUpPaidSpend += oldTotal;
            }
          }
        }
      }
    }

    // 針對「非行政身分」套用一般限制
    if (!isAdminUser) {
      if (hasPickedUpPaid && newOrderTotal > 0) {
        return { success: false, message: "⚠️ 您於本次開放期間內已有計費物品的領取紀錄，無法再次申請計費物品。\n(若需 0 元公共耗材則不受此限)" };
      }
      if (totalPickedUpPaidSpend + newOrderTotal > maxLimit) {
        return { success: false, message: `⚠️ 申請失敗：本次開放期間內，您的計費物品累計限額為 $${maxLimit} 元。\n您先前已領取 $${totalPickedUpPaidSpend} 元，本次申請額度 $${newOrderTotal} 元，已超出限制！` };
      }
    }

    if (pendingOldRows.length > 0 && !isForceOverwrite) {
      return { success: false, requireConfirm: true, message: "⚠️ 系統偵測到您在本次開放期間已有「未領取」的申請紀錄。\n若繼續送出，舊的申請單將被作廢，僅保留最新一筆。\n\n是否確認覆蓋舊單？" };
    }

    const invData = invSheet.getDataRange().getValues();
    if (isForceOverwrite && pendingOldRows.length > 0) {
      pendingOldRows.forEach(old => {
        reqSheet.getRange(old.rowIndex, 8).setValue("已作廢");
        for (let k = 1; k < invData.length; k++) {
          if (invData[k][1] === old.items) {
            invData[k][3] = parseInt(invData[k][3] || 0) + parseInt(old.qty);
            break;
          }
        }
      });
    }

    for (let i = 0; i < cart.length; i++) {
      let cartItem = cart[i];
      let found = false;
      for (let j = 1; j < invData.length; j++) {
        if (invData[j][1] === cartItem.name) { 
          let currentStock = parseInt(invData[j][3] || 0);
          invData[j][3] = currentStock - cartItem.qty; 
          found = true;
          break;
        }
      }
      if (!found) {
        return { success: false, message: '找不到品項：' + cartItem.name };
      }
    }
    
    invSheet.getRange(1, 1, invData.length, invData[0].length).setValues(invData);

    let rowsToInsert = [];
    let itemListForEmail = [];
    
    for (let i = 0; i < cart.length; i++) {
      let item = cart[i];
      rowsToInsert.push([orderId, formattedTime, applicant, email, item.name, item.qty, item.qty * item.price, 'pending', '']);
      itemListForEmail.push(item.name + " x " + item.qty);
    }
    
    reqSheet.getRange(reqSheet.getLastRow() + 1, 1, rowsToInsert.length, 9).setValues(rowsToInsert);

    const scriptUrl = ScriptApp.getService().getUrl();
    const subject = `[消耗品申請成功] 單號 ${orderId}`;
    const bodyHtml = `
      <h3>${applicant} 您好，</h3>
      <p>您已成功送出消耗品申請，以下為您的明細：</p>
      <ul><li>${itemListForEmail.join("</li><li>")}</li></ul>
      <p><b>處理狀態：</b>準備中</p>
      <p>請等待總務處通知領取。此為系統自動發信，請勿回覆。</p>
      <br>
      <a href="${scriptUrl}?action=cancel&id=${orderId}" style="display:inline-block;background-color:#ef4444;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;font-weight:bold;">❌ 取消申請</a>
    `;
    
    // 【修改重點】展開寄信邏輯並加上 try-catch 防護
    if (email && email !== '') {
      try {
        MailApp.sendEmail({ 
          to: email, 
          subject: subject, 
          htmlBody: bodyHtml 
        });
      } catch (mailError) {
        console.error("申請人寄信失敗: " + mailError.toString());
      }
    }

    return { success: true, message: '✅ 申請已成功送出！您的申請明細與取消連結已發送至信箱。請等待總務處通知領取。' };
    
  } catch (error) { 
    return { success: false, message: "錯誤：" + error.toString() };
  } finally { 
    lock.releaseLock(); 
  }
}

/**
 * 處理 Email 內的取消申請請求 (支援負數自動歸還)
 */
function SERVICES_HandleCancel(orderId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reqSheet = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
    const invSheet = ss.getSheetByName(CONFIG.SHEET_INVENTORY);
    
    const reqData = reqSheet.getDataRange().getValues();
    const invData = invSheet.getDataRange().getValues();
    let foundRows = [];
    let isPickedUp = false;

    for (let i = 1; i < reqData.length; i++) {
      if (reqData[i][0] === orderId) {
        if (reqData[i][7] === "picked_up") isPickedUp = true;
        foundRows.push({ rowIndex: i + 1, itemName: reqData[i][4], qty: reqData[i][5], status: reqData[i][7] });
      }
    }

    if (foundRows.length === 0) return HtmlService.createHtmlOutput(`<h2 style="padding:40px;text-align:center;">找不到單號 ${orderId}。</h2>`);
    if (isPickedUp) return HtmlService.createHtmlOutput(`<h2 style="padding:40px;text-align:center;color:#ef4444;">❌ 抱歉，此單據已由管理員確認領取，無法取消。</h2>`);
    if (foundRows[0].status === "已取消") return HtmlService.createHtmlOutput(`<h2 style="padding:40px;text-align:center;">此單據已取消，無需重複操作。</h2>`);

    foundRows.forEach(row => {
      reqSheet.getRange(row.rowIndex, 8).setValue("已取消");
      for (let k = 1; k < invData.length; k++) {
        if (invData[k][1] === row.itemName) {
          invData[k][3] = parseInt(invData[k][3] || 0) + parseInt(row.qty);
          break;
        }
      }
    });
    invSheet.getRange(1, 1, invData.length, invData[0].length).setValues(invData);

    return HtmlService.createHtmlOutput(`<h2 style="padding:40px;text-align:center;color:#059669;">✅ 申請已成功取消，庫存已歸還。</h2>`);
  } catch (e) {
    return HtmlService.createHtmlOutput(`<h2 style="padding:40px;text-align:center;color:#ef4444;">錯誤：${e.toString()}</h2>`);
  } finally {
    lock.releaseLock();
  }
}

// ----------------- (以下為管理員後台 API) -----------------

function getSystemSettings() {
  const startStr = TOOLBOX_GetConfig("開放開始時間");
  const endStr = TOOLBOX_GetConfig("開放結束時間");
  const tz = Session.getScriptTimeZone();
  
  const formatToLocal = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm");
  };

  return { start: formatToLocal(startStr), end: formatToLocal(endStr) };
}

function saveSystemSettings(startStr, endStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  for(let i=0; i<data.length; i++) {
    if(data[i][0] === "開放開始時間") sheet.getRange(i+1, 2).setValue(startStr);
    if(data[i][0] === "開放結束時間") sheet.getRange(i+1, 2).setValue(endStr);
  }
  return {success: true};
}

function getInventory() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY).getDataRange().getValues();
  const headers = data[0];
  let inventory = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === '') continue; 
    let item = {};
    for (let j = 0; j < headers.length; j++) item[headers[j]] = data[i][j];
    item.rowIndex = i + 1; 
    inventory.push(item);
  }
  return inventory;
}

function restockItemsBatch(updates) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY);
    const data = sheet.getDataRange().getValues();
    
    updates.forEach(u => {
      let rowIdx = parseInt(u.rowIndex) - 1;
      let addAmount = parseInt(u.qty);
      if (addAmount > 0 && rowIdx > 0 && rowIdx < data.length) {
        data[rowIdx][3] = parseInt(data[rowIdx][3] || 0) + addAmount;
        data[rowIdx][4] = parseInt(data[rowIdx][4] || 0) + addAmount;
      }
    });
    
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    return { success: true, message: '批次補貨成功' };
  } catch(e) { return { success: false, message: e.toString() }; } finally { lock.releaseLock(); }
}

/**
 * 取得核發管理清單 (V2.3 更新：導入三段式分類標籤與排序權重)
 */
function getManageList() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REQUESTS).getDataRange().getValues();
  if (data.length <= 1) return [];
  let groups = {};
  const tz = Session.getScriptTimeZone();
  
  for (let i = 1; i < data.length; i++) {
    let orderId = data[i][0], timestamp = data[i][1], applicant = data[i][2], email = data[i][3];
    let itemName = data[i][4], qty = data[i][5], status = data[i][7], pickupTime = data[i][8];
    
    if (!orderId) continue; 

    let strTimestamp = (timestamp instanceof Date) ? Utilities.formatDate(timestamp, tz, "yyyy/MM/dd HH:mm:ss") : String(timestamp || "");
    let strPickupTime = (pickupTime instanceof Date) ? Utilities.formatDate(pickupTime, tz, "yyyy/MM/dd HH:mm:ss") : String(pickupTime || "");

    if (!groups[orderId]) {
      groups[orderId] = { 
        groupId: orderId, 
        timestamp: strTimestamp,
        applicant: applicant, 
        email: email, 
        items: [],
        pendingCount: 0,
        doneCount: 0
      };
    }
    
    if (status === 'pending') groups[orderId].pendingCount++;
    else if (status === 'picked_up') groups[orderId].doneCount++;
    
    groups[orderId].items.push({ 
      rowIndex: i + 1, 
      itemName: itemName, 
      qty: qty, 
      status: status, 
      pickupTime: strPickupTime
    });
  }
  
  let resultArray = Object.keys(groups).map(k => {
    let g = groups[k];
    // 先判定是否無待領取項目（包括全領與全部作廢） -> 歸類為已結案
    if (g.pendingCount === 0) {
      g.category = 'fully_done';
      g.weight = 3;
    } else if (g.doneCount === 0) {
      g.category = 'all_pending';
      g.weight = 1;
    } else {
      g.category = 'partial';
      g.weight = 2;
    }
    return g;
  });
  
  // V2.3 排序引擎：第一層看類別權重，第二層看時間
  resultArray.sort((a, b) => {
    if (a.weight !== b.weight) return a.weight - b.weight;
    let timeA = new Date(a.timestamp).getTime() || 0;
    let timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });
  
  return resultArray;
}

// ==========================================
// 替換區塊 2：完整展開的 updateStatus 函式
// ==========================================
function updateStatus(updates) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REQUESTS);
  var timestamp = new Date();
  var formattedTime = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
  
  var emailsToSend = {};
  
  for (var i = 0; i < updates.length; i++) {
    var rowIdx = updates[i].rowIndex;
    // Column 8 is "狀態", Column 9 is "領取時間" (1-based)
    sheet.getRange(rowIdx, 8).setValue('picked_up');
    sheet.getRange(rowIdx, 9).setValue(formattedTime);
    
    // Get columns 1 to 9 (A to I) to get all fields
    var rowData = sheet.getRange(rowIdx, 1, 1, 9).getValues()[0];
    var orderId = rowData[0];
    var reqTimestamp = (rowData[1] instanceof Date) 
      ? Utilities.formatDate(rowData[1], Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss") 
      : String(rowData[1] || "");
    var reqApplicant = rowData[2];
    var reqEmail = rowData[3];
    
    // We group by orderId (單號)
    var groupId = orderId;
    
    emailsToSend[groupId] = { 
      email: reqEmail, 
      applicant: reqApplicant, 
      timestamp: reqTimestamp 
    };
  }
  
  var allData = sheet.getDataRange().getValues();
  
  for (var groupId in emailsToSend) {
    var isCompletelyDone = true;
    
    for (var j = 1; j < allData.length; j++) {
      var rData = allData[j];
      var currentGroupId = rData[0]; // group by orderId (單號)
      
      // index 7 is column 8 ("狀態")
      if (currentGroupId === groupId && rData[7] === 'pending') {
        isCompletelyDone = false;
        break;
      }
    }
    
    // Send email notifications
    if (isCompletelyDone && emailsToSend[groupId].email && emailsToSend[groupId].email !== '') {
      var subject = "【消耗品管理系統】物品全數領取完畢通知";
      var body = "您好 " + emailsToSend[groupId].applicant + "，\n\n您於 " + emailsToSend[groupId].timestamp + " 申請的消耗品已經為您準備完畢/全數領取完畢。\n感謝您的配合！";
      
      try { 
        MailApp.sendEmail(emailsToSend[groupId].email, subject, body);
      } catch (error) { 
        console.error("領取完畢寄送信件失敗: " + error.message);
      }
    }
  }
  
  return { success: true };
}

/**
 * 處理作廢/刪除申請：標記狀態為已作廢，並歸還數量至庫存
 */
function deleteApplications(rows) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reqSheet = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
    const invSheet = ss.getSheetByName(CONFIG.SHEET_INVENTORY);
    
    const reqData = reqSheet.getDataRange().getValues();
    const invData = invSheet.getDataRange().getValues();
    
    rows.forEach(rowIdx => {
      let r = rowIdx - 1; // 0-based index in reqData
      if (r > 0 && r < reqData.length) {
        let oldStatus = reqData[r][7];
        if (oldStatus !== "已作廢" && oldStatus !== "已取消") {
          reqSheet.getRange(rowIdx, 8).setValue("已作廢");
          
          let itemName = reqData[r][4];
          let qty = parseInt(reqData[r][5]) || 0;
          
          // Return inventory
          for (let k = 1; k < invData.length; k++) {
            if (invData[k][1] === itemName) {
              invData[k][3] = parseInt(invData[k][3] || 0) + qty;
              break;
            }
          }
        }
      }
    });
    
    invSheet.getRange(1, 1, invData.length, invData[0].length).setValues(invData);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 驗證管理員密碼並回傳管理後台網址
 */
function verifyAdminPassword(password) {
  const correctPassword = TOOLBOX_GetConfig("後台登入密碼") || "admin123";
  if (password === correctPassword) {
    const url = ScriptApp.getService().getUrl();
    return { success: true, url: url + "?mode=admin" };
  } else {
    return { success: false, message: "❌ 密碼錯誤，拒絕存取！" };
  }
}

/**
 * 取得含遮蔽機制的系統設定值
 */
function getSystemSettingsWithMasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  let settings = {};
  const tz = Session.getScriptTimeZone();
  
  const formatToLocal = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm");
  };

  // Row 1 為警告字眼，Row 2 為標題
  for (let i = 2; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    if (key === '') continue;
    let val = data[i][1];
    if (key.includes("時間")) {
      val = formatToLocal(val);
    }
    settings[key] = maskSensitiveValue(key, val);
  }
  return settings;
}

/**
 * 遮蔽敏感性欄位設定值
 */
function maskSensitiveValue(key, value) {
  if (!value) return "";
  const sensitiveKeys = ["SECRET", "KEY", "URL", "API", "密碼"];
  const isSensitive = sensitiveKeys.some(k => key.toUpperCase().includes(k));
  if (isSensitive) {
    const valStr = String(value);
    if (valStr.startsWith("******") || valStr.includes("...")) {
      return valStr; // 已經是遮蔽格式
    }
    if (valStr.length <= 10) {
      return "******";
    }
    return valStr.substring(0, 5) + "..." + valStr.substring(valStr.length - 5);
  }
  return value;
}

/**
 * 儲存所有已修改的系統設定 (防金鑰覆蓋機制)
 */
function saveAllSystemSettings(updates) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  const props = PropertiesService.getScriptProperties();
  
  for (let i = 2; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    if (key === '' || !(key in updates)) continue;
    
    const newVal = String(updates[key]);
    const oldVal = data[i][1];
    
    // 比對前端傳回值是否為舊值的遮蔽結果
    const maskedOldVal = maskSensitiveValue(key, oldVal);
    if (newVal === maskedOldVal) {
      // 沒有更動，跳過
      continue;
    }
    
    // 更新試算表設定值
    sheet.getRange(i + 1, 2).setValue(updates[key]);
    
    // 若為金鑰相關，同步儲存至指令碼屬性中
    if ((key.includes("SECRET") || key.includes("KEY")) && !updates[key].includes("...")) {
      props.setProperty(CONFIG.KEY_PREFIX + key, updates[key]);
      sheet.getRange(i + 1, 2).setValue("****** (已安全儲存)");
    }
  }
  return { success: true };
}

// 🟧🟧🟧 【模組四：排程與觸發 / AUTOMATION】

function AUTOMATION_SetupDatabase() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  dbSchema.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      sheet.appendRow(schema.headers);
      sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight("bold").setBackground(schema.color);
      sheet.setFrozenRows(1);
      
      if (schema.name === CONFIG.SHEET_SETTINGS) {
        sheet.insertRowBefore(1);
        sheet.getRange("A1:C1").merge().setValue("⚠️ 資安警告：請勿將此試算表共用權限設為「知道連結的任何人均可檢視」，以免金鑰外洩！")
             .setBackground("#ef4444").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
        sheet.setFrozenRows(2);
      }
    }
    
    // 確保所有預設的設定項目均存在，若不存在則動態追加
    if (schema.name === CONFIG.SHEET_SETTINGS) {
      sheet = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
      const data = sheet.getDataRange().getValues();
      const existingKeys = data.map(r => String(r[0]).trim());
      
      const defaultSettings = [
        ["HUB_API_URL", "請貼上 LINE Hub 的網頁應用程式網址", "與大腦對接的 API 端點"],
        ["API_SECRET_KEY", "ChungCheng_Secure_123", "必須與 Hub 設定的密語完全一致"],
        ["Admin_Email", Session.getActiveUser().getEmail(), "接收低庫存警示通知信箱"],
        ["開放開始時間", "", "限制表單區間(如 2026-04-01T08:00)"],
        ["開放結束時間", "", "限制表單區間(如 2026-04-05T22:00)"],
        ["Msg_NoRecord", "您目前沒有消耗品申請紀錄喔！", "LINE 查無資料時的回覆"],
        ["後台登入密碼", "admin123", "點擊齒輪進入後台的密碼"],
        ["行政人員名單", "brianhung@gm.ccps.kh.edu.tw", "行政人員 Email 清單 (以逗號分隔)"],
        ["一般人員額度限制", "100", "一般人員每次開放期間的計費物品總額度"]
      ];
      
      defaultSettings.forEach(s => {
        if (!existingKeys.includes(s[0])) {
          sheet.appendRow(s);
        }
      });
      sheet.setColumnWidth(1, 200); sheet.setColumnWidth(2, 450); sheet.setColumnWidth(3, 300);
    }
  });

  const triggers = ScriptApp.getProjectTriggers();
  let hasTrigger = false;
  triggers.forEach(t => { if(t.getHandlerFunction() === 'TOOLBOX_MonthlyStockReport') hasTrigger = true; });
  
  if(!hasTrigger) {
    ScriptApp.newTrigger('TOOLBOX_MonthlyStockReport')
      .timeBased()
      .onMonthDay(1)
      .atHour(8)
      .create();
  }

  ui.alert("✅ 消耗品系統初始化完成！");
}

function AUTOMATION_SecureKeys() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert("🛡️ 隱形保險箱", "確定隱藏密語嗎？", ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
    const data = sheet.getDataRange().getValues();
    const props = PropertiesService.getScriptProperties();
    let count = 0;

    data.forEach((row, idx) => {
      const key = String(row[0]).trim();
      const val = String(row[1]).trim();
      if ((key.includes("SECRET") || key.includes("KEY")) && val && !val.includes("***")) {
        props.setProperty(CONFIG.KEY_PREFIX + key, val);
        sheet.getRange(idx + 1, 2).setValue("****** (已安全儲存)").setFontColor("#059669").setFontWeight("bold");
        count++;
      }
    });
    ui.alert(`🛡️ 防護完成！共處理 ${count} 組金鑰。`);
  } catch (e) { console.error("SecureKeys Error", e); }
}

// 🛠️🛠️🛠️ 【模組五：核心工具箱 / TOOLBOX】

function TOOLBOX_CallHubApi(action, targetEmail, message = "") {
  const hubUrl = TOOLBOX_GetConfig("HUB_API_URL");
  const secret = TOOLBOX_GetConfig("API_SECRET_KEY");
  if (!hubUrl || !hubUrl.startsWith("http")) return { success: false, error: "Hub URL 未設定" };

  try {
    const options = {
      method: "post",
      payload: { action: action, secret: secret, email: targetEmail, message: message },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(hubUrl, options);
    return JSON.parse(res.getContentText());
  } catch (e) { return { success: false, error: e.toString() }; }
}

function TOOLBOX_GetConfig(key) {
  const secure = PropertiesService.getScriptProperties().getProperty(CONFIG.KEY_PREFIX + key);
  if (secure) return secure;
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS).getDataRange().getValues();
  for (let r of data) { if (r[0] === key) return r[1]; }
  return "";
}

function TOOLBOX_MonthlyStockReport() {
  try {
    const invData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY).getDataRange().getValues();
    let lowStockItems = [];

    for (let i = 1; i < invData.length; i++) {
      let itemName = invData[i][1];
      let currentStock = parseInt(invData[i][3]) || 0;
      let alertThreshold = parseInt(invData[i][6]) || 3;

      if (itemName && currentStock < alertThreshold) {
        let statusText = currentStock < 0 ? `<strong style="color:#ef4444">欠貨 ${Math.abs(currentStock)}</strong>` : `剩餘 ${currentStock}`;
        lowStockItems.push(`- ${itemName} (目前狀態: ${statusText})`);
      }
    }

    if (lowStockItems.length > 0) {
      const adminEmail = TOOLBOX_GetConfig("Admin_Email");
      if (adminEmail && adminEmail.includes("@")) {
        const subject = `📊 【消耗品系統】本月報表 (${Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM")})`;
        const body = `<h3>📅 本月度盤點</h3><p>短缺清單：</p><ul>${lowStockItems.join("<br>")}</ul>`;
        MailApp.sendEmail({ to: adminEmail, subject: subject, htmlBody: body });
      }
    }
  } catch (error) { console.error("MonthlyStockReport Error", error); }
}