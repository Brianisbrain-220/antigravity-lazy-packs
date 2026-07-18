// © 2026 行政自動化系統 | Refactored to safer V1.9.2
const CFG_HUB = {
  SHEET_USERS: 'Users',
  SHEET_SETTINGS: 'System_Settings',
  SHEET_DYNAMIC: 'Dynamic_Menu',
  SHEET_FLEX: 'Flex_Menu',
  SHEET_ADMINS: 'Admins',
  SHEET_LOGS: 'Login_Logs',
  KEY_PREFIX: 'HUB_SECURE_'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠️ LINE Hub 中央樞紐設定')
    .addItem('1️⃣ 智慧建置/修復資料庫 (初始化)', 'SYS_SetupDatabase')
    .addSeparator()
    .addItem('🔒 2️⃣ 安全隱藏 Token 與密碼', 'SYS_SecureKeys')
    .addToUi();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('事務小幫手 - 系統中台')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  if (e && e.parameter && (e.parameter.action === 'push' || e.parameter.action === 'verify')) {
    return SYS_ApiRouter(e);
  }
  try {
    if (!e || !e.postData || !e.postData.contents) return ContentService.createTextOutput('Bad Request');
    const json = JSON.parse(e.postData.contents);
    const events = Array.isArray(json.events) ? json.events : [];
    if (!events.length) return ContentService.createTextOutput('OK');
    events.forEach(event => {
      const replyToken = event && event.replyToken;
      if (!replyToken) return;
      if (event.type === 'follow') {
        const welcomeMsg = SYS_GetConfig('Msg_Welcome') || '歡迎加入！請輸入您的「手機號碼」或「Email」進行身分綁定。';
        SYS_ReplyLine(replyToken, [{ type: 'text', text: welcomeMsg }]);
        return;
      }
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        const userId = event.source && event.source.userId ? String(event.source.userId).trim() : '';
        const userMessage = String(event.message.text || '').trim();
        if (userId && userMessage) SYS_LineBotRouter(replyToken, userId, userMessage);
      }
    });
    return ContentService.createTextOutput('Success');
  } catch (error) {
    SYS_LogError('doPost_LINE', error);
    return ContentService.createTextOutput('Error');
  }
}

function SYS_RegisterUser(formData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    const name = String(formData.name || '').trim();
    const unit = String(formData.unit || '').trim() || '無';
    const email = SYS_NormalizeEmail(formData.email);
    const phone = SYS_NormalizePhone(formData.phone);
    if (!name || !email || !phone) return { success: false, message: '請完整填寫姓名、手機與 Email。' };
    for (let i = 1; i < data.length; i++) {
      const dPhone = SYS_NormalizePhone(data[i][2]);
      const dEmail = SYS_NormalizeEmail(data[i][3]);
      if (dEmail === email || dPhone === phone) {
        return { success: false, message: '⚠️ 此信箱或手機號碼已經在系統建檔囉！\n請直接加入官方 LINE，並在聊天室輸入您的 Email 或手機號碼完成綁定。' };
      }
    }
    sheet.appendRow([name, unit, "'" + phone, email, '', '是']);
    return { success: true, message: '資料建檔成功！' };
  } catch (error) {
    SYS_LogError('SYS_RegisterUser', error);
    return { success: false, message: '系統異常：' + error.toString() };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_AdminLogin(pwd) {
  const auth = SYS_ValidateAdmin(pwd);
  SYS_WriteLoginLog(auth.success ? auth.admin.name : '不明訪客', auth.success ? 'HIDDEN' : "'" + String(pwd || ''), auth.success ? '✅ 登入成功' : '❌ 密碼錯誤');
  return auth.success ? { success: true, admin: auth.admin } : { success: false, message: '密碼錯誤，請重新輸入。' };
}

function SYS_ValidateAdmin(pwd) {
  const adminSheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_ADMINS);
  const data = adminSheet.getDataRange().getValues();
  const targetPwd = String(pwd || '').trim();
  if (!targetPwd) return { success: false };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || '').trim() === targetPwd) {
      return { success: true, admin: { name: data[i][0], role: data[i][2] } };
    }
  }
  return { success: false };
}

function SYS_GetDashboardData(clientPwd) {
  const loginRes = SYS_ValidateAdmin(clientPwd);
  if (!loginRes.success) throw new Error('401 Unauthorized');
  const users = [];
  const settings = [];
  const dynamicMenu = [];
  const uData = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS).getDataRange().getValues();
  for (let i = 1; i < uData.length; i++) {
    if (uData[i][0]) {
      users.push({ rowIndex: i + 1, name: String(uData[i][0] || ''), unit: String(uData[i][1] || ''), phone: SYS_NormalizePhone(uData[i][2]), email: SYS_NormalizeEmail(uData[i][3]), isBound: !!uData[i][4], allowPush: String(uData[i][5] || '否') === '是' ? '是' : '否' });
    }
  }
  const sData = SYS_GetSheetOrThrow(CFG_HUB.SHEET_SETTINGS).getDataRange().getValues();
  for (let i = 1; i < sData.length; i++) {
    if (sData[i][0]) settings.push({ key: String(sData[i][0] || ''), value: sData[i][1], desc: String(sData[i][2] || '') });
  }
  const dData = SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC).getDataRange().getValues();
  for (let i = 1; i < dData.length; i++) {
    if (dData[i][0]) {
      dynamicMenu.push({ rowIdx: i + 1, keyword: String(dData[i][0] || ''), type: String(dData[i][1] || ''), content: String(dData[i][2] || ''), status: String(dData[i][3] || '') || '停用' });
    }
  }
  return { success: true, users: users.reverse(), settings, dynamicMenu, admin: loginRes.admin };
}

function SYS_SaveSettings(clientPwd, updates) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_SETTINGS);
    const data = sheet.getDataRange().getValues();
    const props = PropertiesService.getScriptProperties();
    let updatedCount = 0;
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0] || '').trim();
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      const rawVal = String(updates[key] == null ? '' : updates[key]).trim();
      if (!rawVal) continue;
      if (SYS_IsSensitiveKey(key)) {
        props.setProperty(CFG_HUB.KEY_PREFIX + key, rawVal);
        sheet.getRange(i + 1, 2).setValue(SYS_MaskSecret(rawVal)).setFontColor('#059669').setFontWeight('bold');
      } else {
        sheet.getRange(i + 1, 2).setValue(rawVal).setFontColor('black').setFontWeight('normal');
      }
      updatedCount++;
    }
    return { success: true, message: `已儲存 ${updatedCount} 筆設定。敏感欄位已自動安全隱藏。` };
  } catch (e) {
    SYS_LogError('SYS_SaveSettings', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_SaveDynamicMenu(clientPwd, payload) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const keyword = String(payload.keyword || '').trim();
    const type = String(payload.type || '').trim();
    const content = String(payload.content || '').trim();
    const status = String(payload.status || '啟用').trim();
    if (!keyword || !type || !content) return { success: false, message: '請完整填寫動態選單資料。' };
    SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC).appendRow([keyword, type, content, status]);
    return { success: true };
  } catch (e) {
    SYS_LogError('SYS_SaveDynamicMenu', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_UpdateDynamicMenu(clientPwd, rowIdx, payload) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const row = Number(rowIdx);
    if (!row || row < 2) return { success: false, message: '資料列編號錯誤。' };
    const keyword = String(payload.keyword || '').trim();
    const type = String(payload.type || '').trim();
    const content = String(payload.content || '').trim();
    const status = String(payload.status || '停用').trim();
    if (!keyword || !type || !content) return { success: false, message: '請完整填寫關鍵字、類型與內容。' };
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC);
    sheet.getRange(row, 1, 1, 4).setValues([[keyword, type, content, status]]);
    return { success: true, message: '動態關鍵字已更新。' };
  } catch (e) {
    SYS_LogError('SYS_UpdateDynamicMenu', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_DeleteDynamicMenu(clientPwd, rowIdx) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const row = Number(rowIdx);
    if (!row || row < 2) return { success: false, message: '資料列編號錯誤。' };
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC);
    if (row > sheet.getLastRow()) return { success: false, message: '找不到要刪除的資料列。' };
    sheet.deleteRow(row);
    return { success: true, message: '動態關鍵字已刪除。' };
  } catch (e) {
    SYS_LogError('SYS_DeleteDynamicMenu', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_ToggleDynamicMenuStatus(clientPwd, rowIdx) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const row = Number(rowIdx);
    if (!row || row < 2) return { success: false, message: '資料列編號錯誤。' };
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC);
    const cell = sheet.getRange(row, 4);
    const current = String(cell.getValue() || '停用').trim() === '啟用' ? '啟用' : '停用';
    const next = current === '啟用' ? '停用' : '啟用';
    cell.setValue(next);
    return { success: true, newStatus: next, message: `狀態已切換為${next}` };
  } catch (e) {
    SYS_LogError('SYS_ToggleDynamicMenuStatus', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_TogglePush(clientPwd, userEmail) {
  if (!SYS_ValidateAdmin(clientPwd).success) throw new Error('401 Unauthorized');
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    const targetEmail = SYS_NormalizeEmail(userEmail);
    for (let i = 1; i < data.length; i++) {
      if (SYS_NormalizeEmail(data[i][3]) === targetEmail) {
        const currentStatus = String(data[i][5] || '').trim() === '是' ? '是' : '否';
        const newStatus = currentStatus === '是' ? '否' : '是';
        sheet.getRange(i + 1, 6).setValue(newStatus);
        return { success: true, newStatus };
      }
    }
    return { success: false, message: '找不到該使用者的資料' };
  } catch (e) {
    SYS_LogError('SYS_TogglePush', e);
    return { success: false, message: e.message };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_ApiRouter(e) {
  try {
    const action = String((e.parameter && e.parameter.action) || '').trim();
    const receivedSecret = String((e.parameter && e.parameter.secret) || '').trim();
    const targetEmail = SYS_NormalizeEmail(e.parameter && e.parameter.email);
    const validSecret = String(SYS_GetConfig('API_SECRET_KEY') || '').trim();
    if (!validSecret || receivedSecret !== validSecret) return SYS_JsonOutput({ success: false, error: 'Unauthorized: 無效的金鑰' });
    if (action === 'verify') {
      const userResult = SYS_FindUserByEmail(targetEmail);
      return SYS_JsonOutput(userResult.found && userResult.userId ? { success: true, bound: true, name: userResult.name, isAdmin: userResult.isAdmin } : { success: true, bound: false });
    }
    if (action === 'push') {
      const pushMessage = String((e.parameter && e.parameter.message) || '').trim();
      if (!pushMessage) return SYS_JsonOutput({ success: false, error: 'Message required' });
      const userResult = SYS_FindUserByEmail(targetEmail);
      if (!userResult.found || !userResult.userId) return SYS_JsonOutput({ success: false, error: 'User not bound' });
      if (userResult.allowPush !== '是') return SYS_JsonOutput({ success: false, error: 'User muted' });
      const pushRes = SYS_PushLine(userResult.userId, pushMessage);
      return SYS_JsonOutput(pushRes.success ? { success: true, message: 'Push sent successfully' } : { success: false, error: pushRes.error || 'Push failed' });
    }
    return SYS_JsonOutput({ success: false, error: 'Unsupported action' });
  } catch (error) {
    SYS_LogError('SYS_ApiRouter', error);
    return SYS_JsonOutput({ success: false, error: error.toString() });
  }
}

function SYS_LineBotRouter(replyToken, userId, msg) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg);
  const isPhone = /^09\d{8}$/.test(msg);
  if (isEmail || isPhone) return SYS_HandleBinding(replyToken, userId, msg, isEmail ? 'email' : 'phone');
  const bindKeywords = ['綁定', '身分綁定', '註冊', '登入'];
  if (bindKeywords.includes(msg.toLowerCase())) {
    const userStatus = SYS_CheckIfBound(userId);
    if (userStatus.bound) {
      const reply = `💡 您已經完成綁定囉！\n\n目前的系統身分為：\n👤 ${userStatus.name} (${userStatus.unit})\n\n您可以直接輸入「?」或「選單」來使用各項服務。`;
      return SYS_ReplyLine(replyToken, [{ type: 'text', text: reply }]);
    }
    const guideMsg = SYS_GetConfig('Msg_Welcome') || '請點擊網址填寫註冊表單，或直接輸入手機號碼 / Email 進行綁定。';
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: `💡 ${guideMsg}` }]);
  }
  const consumableKeywords = ['查詢消耗品', '我的文具', '消耗品'];
  if (consumableKeywords.includes(msg.trim())) {
    const userStatus = SYS_CheckIfBound(userId);
    if (!userStatus.bound) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 您尚未完成身分綁定，無法查詢個人紀錄。\n請輸入您註冊時填寫的信箱或手機號碼進行綁定。' }]);
    const apiUrl = SYS_GetConfig('CONSUMABLE_API_URL');
    const secret = SYS_GetConfig('CONSUMABLE_SECRET_KEY');
    if (!apiUrl || !secret) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 系統尚未完成與消耗品系統的串接設定，請通知管理員。' }]);
    const fetchResult = SYS_FetchFromSpoke(apiUrl, 'query', userStatus.email, secret);
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: fetchResult.success ? String(fetchResult.message || '查詢完成') : '❌ 查詢失敗，無法連線至消耗品系統：' + String(fetchResult.error || '未知錯誤') }]);
  }
  const isMenuTrigger = ['選單', '主選單', '?', '？', '幫助'].includes(msg.toLowerCase());
  if (isMenuTrigger) return SYS_BuildFlexMenu(replyToken);
  return SYS_HandleDynamicMenu(replyToken, msg);
}

function SYS_HandleBinding(replyToken, userId, credential, type) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    const currentBinding = SYS_CheckIfBound(userId);
    if (currentBinding.bound) return SYS_ReplyLine(replyToken, [{ type: 'text', text: `⚠️ 此 LINE 已綁定 ${currentBinding.name}（${currentBinding.unit}），如需更換綁定請聯絡管理員。` }]);
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      const phone = SYS_NormalizePhone(data[i][2]);
      const email = SYS_NormalizeEmail(data[i][3]);
      const lineUserId = String(data[i][4] || '').trim();
      const matched = (type === 'email' && email === SYS_NormalizeEmail(credential)) || (type === 'phone' && phone === SYS_NormalizePhone(credential));
      if (!matched) continue;
      if (lineUserId && lineUserId !== userId) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 此帳號已綁定其他 LINE 帳號，如需重設請聯絡管理員。' }]);
      foundRow = i + 1;
      break;
    }
    if (foundRow === -1) {
      const failMsg = SYS_GetConfig('Msg_BindFail') || '❌ 找不到符合的資料。請確認您是否已填寫註冊表單，或輸入的資料是否正確。';
      return SYS_ReplyLine(replyToken, [{ type: 'text', text: failMsg }]);
    }
    sheet.getRange(foundRow, 5).setValue(userId);
    const welcomeName = String(sheet.getRange(foundRow, 1).getValue() || '');
    let successMsg = SYS_GetConfig('Msg_BindSuccess') || '✅ 綁定成功！未來系統通知將會發送到這裡。';
    successMsg = String(successMsg).replace('{{name}}', welcomeName);
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: successMsg }]);
  } catch (error) {
    SYS_LogError('SYS_HandleBinding', error);
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: '❌ 綁定過程發生異常，請稍後再試。' }]);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function SYS_BuildFlexMenu(replyToken) {
  try {
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_FLEX);
    const data = sheet.getDataRange().getValues();
    const validBtns = [];
    for (let i = 1; i < data.length; i++) {
      const [label, actionType, payload, emoji, bgColor] = data[i];
      if (label && actionType && payload) validBtns.push({ label: String(label), actionType: String(actionType), payload: String(payload), emoji: String(emoji || ''), bgColor: String(bgColor || '#334155') });
    }
    if (!validBtns.length) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '目前尚未設定主選單。' }]);
    const boxContents = [];
    for (let i = 0; i < validBtns.length; i += 2) {
      const rowContent = [];
      for (let j = 0; j < 2; j++) {
        if (!validBtns[i + j]) continue;
        const btn = validBtns[i + j];
        const action = btn.actionType === '連結' ? { type: 'uri', label: btn.label.substring(0, 20), uri: SYS_NormalizeUrl(btn.payload) } : { type: 'message', label: btn.label.substring(0, 20), text: btn.payload.substring(0, 300) };
        rowContent.push({ type: 'button', style: 'primary', color: btn.bgColor, height: 'sm', margin: 'sm', action });
      }
      boxContents.push({ type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'md', contents: rowContent });
    }
    return SYS_ReplyLine(replyToken, [{ type: 'flex', altText: '開啟服務主選單', contents: { type: 'bubble', size: 'mega', header: { type: 'box', layout: 'vertical', backgroundColor: '#0f172a', contents: [{ type: 'text', text: '中正國小 服務選單', color: '#ffffff', weight: 'bold', size: 'xl', align: 'center' }] }, body: { type: 'box', layout: 'vertical', backgroundColor: '#f8fafc', paddingAll: '15px', contents: boxContents } } }]);
  } catch (e) {
    SYS_LogError('SYS_BuildFlexMenu', e);
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: '❌ 主選單載入失敗。' }]);
  }
}

function SYS_HandleDynamicMenu(replyToken, msg) {
  try {
    const data = SYS_GetSheetOrThrow(CFG_HUB.SHEET_DYNAMIC).getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let [keyword, type, content, status] = data[i];
      keyword = String(keyword || '').trim();
      type = String(type || '').trim();
      content = String(content || '');
      status = String(status || '').trim();
      if (status !== '啟用' || keyword !== msg) continue;
      if (type === '文字') return SYS_ReplyLine(replyToken, [{ type: 'text', text: content.substring(0, 5000) }]);
      if (type === '圖片') {
        const match = String(content).match(/[-\w]{25,}/);
        const fileId = match ? match[0] : '';
        if (!fileId) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 圖片連結解析失敗，請通知管理員檢查設定。' }]);
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        return SYS_ReplyLine(replyToken, [{ type: 'image', originalContentUrl: directUrl, previewImageUrl: directUrl }]);
      }
      if (type === '子選單') {
        if (!String(content).includes('|')) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 子選單設定錯誤：缺少「|」分隔符號。' }]);
        const parts = String(content).split('|');
        const altText = (parts[0] || '').trim() || '請選擇：';
        const btnString = parts.slice(1).join('|').trim();
        if (!btnString) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 子選單設定錯誤：未設定任何按鈕選項。' }]);
        const rawBtns = btnString.replace(/，/g, ',').split(',');
        const quickReplyItems = rawBtns.map(b => b.trim()).filter(Boolean).slice(0, 13).map(b => {
          const eqIdx = b.indexOf('=');
          if (eqIdx !== -1) {
            const label = b.substring(0, eqIdx).trim().substring(0, 20) || '開啟網頁';
            const url = SYS_NormalizeUrl(b.substring(eqIdx + 1).trim());
            if (/^https?:\/\//i.test(url)) return { type: 'action', action: { type: 'uri', label, uri: url } };
          }
          const safeText = b.substring(0, 20);
          return { type: 'action', action: { type: 'message', label: safeText, text: safeText } };
        });
        if (!quickReplyItems.length) return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 子選單解析後無有效按鈕。' }]);
        return SYS_ReplyLine(replyToken, [{ type: 'text', text: altText, quickReply: { items: quickReplyItems } }]);
      }
      return SYS_ReplyLine(replyToken, [{ type: 'text', text: '⚠️ 此關鍵字類型尚未支援。' }]);
    }
    return;
  } catch (e) {
    SYS_LogError('SYS_HandleDynamicMenu', e);
    return SYS_ReplyLine(replyToken, [{ type: 'text', text: '❌ 動態選單處理失敗。' }]);
  }
}

function SYS_SetupDatabase() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fullSchema = [
    { name: CFG_HUB.SHEET_USERS, headers: ['姓名', '單位', '電話', 'Email', 'LINE_User_ID', '允許推播(是/否)', '是否為行政人員(是/否)'], color: '#d9ead3', defaults: [] },
    { name: CFG_HUB.SHEET_SETTINGS, headers: ['設定項目', '設定值', '說明(請勿修改)'], color: '#f4cccc', defaults: [] },
    { name: CFG_HUB.SHEET_DYNAMIC, headers: ['觸發關鍵字', '回覆類型(文字/圖片/子選單)', '回覆內容/網址', '狀態(啟用/停用)'], color: '#fce5cd', defaults: [] },
    { name: CFG_HUB.SHEET_FLEX, headers: ['標題', '動作類型(文字/連結)', '回覆內容/網址', '表情符號', '背景顏色(如#ef4444)'], color: '#fff2cc', defaults: [] },
    { name: CFG_HUB.SHEET_ADMINS, headers: ['姓名', '登入密碼', '權限等級'], color: '#b4a7d6', defaults: [['系統管理員', '1234', '最高權限']] },
    { name: CFG_HUB.SHEET_LOGS, headers: ['時間戳記', '登入者姓名', '使用密碼', '狀態'], color: '#d0e0e3', defaults: [] }
  ];
  fullSchema.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
      sheet.appendRow(schema.headers);
      sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight('bold').setBackground(schema.color);
      sheet.setFrozenRows(1);
      schema.defaults.forEach(d => sheet.appendRow(d));
      if (schema.name === CFG_HUB.SHEET_SETTINGS) {
        sheet.insertRowBefore(1);
        sheet.getRange('A1:C1').merge().setValue('⚠️ 資安警告：請勿將此試算表共用權限設為「知道連結的任何人均可檢視」，以免金鑰外洩！').setBackground('#ef4444').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');
        sheet.setFrozenRows(2);
        sheet.setColumnWidth(1, 300);
        sheet.setColumnWidth(2, 450);
        sheet.setColumnWidth(3, 300);
      }
    } else {
      // 若工作表已存在，但欄位數量少於新版規格，自動在首行後面補齊缺失的標題
      if (schema.name !== CFG_HUB.SHEET_SETTINGS) {
        const lastCol = sheet.getLastColumn();
        if (lastCol > 0 && lastCol < schema.headers.length) {
          const missingHeaders = schema.headers.slice(lastCol);
          const range = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
          range.setValues([missingHeaders]);
          range.setFontWeight('bold').setBackground(schema.color);
        }
      }
    }
    if (schema.name === CFG_HUB.SHEET_SETTINGS) {
      const existingKeys = sheet.getDataRange().getValues().map(r => r[0]);
      const requiredSettings = [
        ['LINE_CHANNEL_ACCESS_TOKEN', '請在此貼上 LINE Token', '填完後系統可自動安全隱藏'],
        ['API_SECRET_KEY', 'ChungCheng_Secure_123', '子系統對接密碼 (建議修改)'],
        ['CONSUMABLE_API_URL', '', '消耗品系統網址 (若無可留空)'],
        ['CONSUMABLE_SECRET_KEY', 'ChungCheng_Secure_123', '與消耗品系統對接的通關密語'],
        ['Msg_Welcome', '歡迎使用！請點擊下方連結填寫註冊表單，或直接輸入手機號碼 / Email 進行綁定。', '加入好友時的回應'],
        ['Msg_BindSuccess', '✅ 綁定成功！未來系統通知將會發送到這裡。(歡迎您，{{name}})', '綁定成功的回應'],
        ['Msg_BindFail', '❌ 找不到符合的資料。請確認您是否已填寫註冊表單，或輸入的資料是否正確。', '綁定失敗的回應']
      ];
      requiredSettings.forEach(set => { if (!existingKeys.includes(set[0])) sheet.appendRow(set); });
    }
  });
  ui.alert('✅ 系統資料庫智慧修復完成！\n缺失的表格或設定值已自動補齊，原有資料無損保留。');
}

function SYS_SecureKeys() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('🛡️ 隱形保險箱', '即將把金鑰存入系統底層並打上馬賽克。\n確定執行嗎？', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  try {
    const sheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_SETTINGS);
    const data = sheet.getDataRange().getValues();
    const props = PropertiesService.getScriptProperties();
    let count = 0;
    data.forEach((row, idx) => {
      const key = String(row[0] || '').trim();
      const val = String(row[1] || '').trim();
      if (SYS_IsSensitiveKey(key) && val && !val.includes('***')) {
        props.setProperty(CFG_HUB.KEY_PREFIX + key, val);
        sheet.getRange(idx + 1, 2).setValue(SYS_MaskSecret(val)).setFontColor('#059669').setFontWeight('bold');
        count++;
      }
    });
    ui.alert(`🛡️ 防護完成！共安全隱藏了 ${count} 組金鑰。`);
  } catch (e) {
    SYS_LogError('SYS_SecureKeys', e);
    ui.alert('❌ 處理失敗：' + e.message);
  }
}

function SYS_GetConfig(key) {
  const secure = PropertiesService.getScriptProperties().getProperty(CFG_HUB.KEY_PREFIX + key);
  if (secure) return secure;
  const data = SYS_GetSheetOrThrow(CFG_HUB.SHEET_SETTINGS).getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === key) return data[i][1];
  }
  return '';
}

function SYS_FindUserByEmail(emailStr) {
  try {
    const target = SYS_NormalizeEmail(emailStr);
    const data = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS).getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (SYS_NormalizeEmail(data[i][3]) === target) {
        const isAdminVal = String(data[i][6] || '否').trim() === '是';
        return { found: true, name: data[i][0], userId: String(data[i][4] || '').trim(), allowPush: String(data[i][5] || '否').trim(), isAdmin: isAdminVal };
      }
    }
    return { found: false };
  } catch (e) {
    SYS_LogError('SYS_FindUserByEmail', e);
    return { found: false };
  }
}

function SYS_CheckIfBound(userId) {
  try {
    const target = String(userId || '').trim();
    const data = SYS_GetSheetOrThrow(CFG_HUB.SHEET_USERS).getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][4] || '').trim() === target) return { bound: true, name: data[i][0], unit: data[i][1], email: SYS_NormalizeEmail(data[i][3]) };
    }
    return { bound: false };
  } catch (e) {
    SYS_LogError('SYS_CheckIfBound', e);
    return { bound: false };
  }
}

function SYS_FetchFromSpoke(apiUrl, action, email, secret) {
  try {
    const res = UrlFetchApp.fetch(apiUrl, { method: 'post', payload: { action, secret, email }, muteHttpExceptions: true });
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) return { success: false, error: `HTTP ${code}: ${text}` };
    return JSON.parse(text);
  } catch (e) {
    SYS_LogError('SYS_FetchFromSpoke', e);
    return { success: false, error: e.toString() };
  }
}

function SYS_ReplyLine(replyToken, messagesArray) {
  return SYS_CallLineApi_('https://api.line.me/v2/bot/message/reply', { replyToken, messages: messagesArray }, 'SYS_ReplyLine');
}

function SYS_PushLine(uid, messageText) {
  return SYS_CallLineApi_('https://api.line.me/v2/bot/message/push', { to: uid, messages: [{ type: 'text', text: messageText }] }, 'SYS_PushLine');
}

function SYS_CallLineApi_(url, payload, modName) {
  try {
    const token = String(SYS_GetConfig('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
    if (!token || token.indexOf('***') !== -1) return { success: false, error: 'LINE Token 尚未正確設定' };
    const res = UrlFetchApp.fetch(url, { method: 'post', headers: { Authorization: 'Bearer ' + token }, contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code < 200 || code >= 300) {
      SYS_LogError(modName, `HTTP ${code}: ${text}`);
      return { success: false, error: `LINE API HTTP ${code}` };
    }
    return { success: true, response: text };
  } catch (e) {
    SYS_LogError(modName, e);
    return { success: false, error: e.toString() };
  }
}

function SYS_WriteLoginLog(name, usedPwd, status) {
  try {
    const logSheet = SYS_GetSheetOrThrow(CFG_HUB.SHEET_LOGS);
    const timeStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss');
    logSheet.appendRow([timeStr, name, usedPwd, status]);
  } catch (e) {
    SYS_LogError('SYS_WriteLoginLog', e);
  }
}

function SYS_GetSheetOrThrow(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`找不到工作表：${name}`);
  return sheet;
}

function SYS_NormalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function SYS_NormalizePhone(phone) {
  const cleaned = String(phone || '').replace(/'/g, '').replace(/\D/g, '').trim();
  if (cleaned.length === 9 && cleaned.startsWith('9')) return '0' + cleaned;
  return cleaned;
}
function SYS_NormalizeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
}
function SYS_IsSensitiveKey(key) {
  const k = String(key || '').toUpperCase();
  return k.includes('TOKEN') || k.includes('KEY');
}
function SYS_MaskSecret(val) {
  const text = String(val || '');
  if (!text || text.length <= 8) return '****** (已安全儲存)';
  return `${text.substring(0, 4)}***${text.substring(text.length - 4)} (已安全隱藏)`;
}
function SYS_JsonOutput(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function SYS_LogError(mod, err) { console.error(`[${mod} Error]: ${err}`); }