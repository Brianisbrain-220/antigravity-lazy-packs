/**
 * 🤖 【保全加班申請系統 - 企業微服務旗艦版】
 * 版本：V4.3.1 (修正方案 A：GAS Web App URL 參數解析問題)
 * 特色：校外單位單日進位計費、完全選填金流模組、0.5小時級距、JSON溯源、防彈日期解析、通訊頻段校準
 */

// 🟩🟩🟩 【模組一：控制中心 / CONFIG】
const CONFIG = {
  SHEET_REQUESTS: 'Requests',
  SHEET_SETTINGS: 'Settings',
  PROP_HUB_URL: 'HUB_API_URL',
  PROP_HUB_SEC: 'HUB_SECRET',
  PROP_ADMIN_PWD: 'ADMIN_PWD'
};

// 🟦🟦🟦 【模組二：設定與資安 / SETUP & SECURITY】
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠️ 系統管理')
    .addItem('1. 一鍵建置資料庫 (初始化與升級)', 'setupDatabase')
    .addItem('2. 🔒 安全隱藏金鑰與密碼', 'hideAndSaveSecrets')
    .addToUi();
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
  
  if (!settings) settings = ss.insertSheet(CONFIG.SHEET_SETTINGS);
  
  var headers = [
    '費率 (每小時)', '承辦人 Email', '保全人員 Email', '保全人員手機', 
    '保全公司 Email', '保全公司手機', '平日值勤時間 (如 07:00-21:00)', 
    '假日值勤時間 (如 08:00-20:00)', '國定假日清單 (YYYY-MM-DD逗號分隔)', 
    '所屬單位選項 (逗號分隔)', 'LINE Hub API 網址', 'LINE Hub 介接密碼', '戰情室登入密碼', '指定共用行事曆 ID'
  ];
  
  var defaults = [
    200, 'admin@example.com', 'guard@example.com', '0912345678', 
    'company@example.com', '0987654321', '07:00-21:00', 
    '08:00-20:00', '2026-04-03,2026-04-04', 
    '教務處,學務處,總務處,輔導室,幼兒園', 
    '(貼上 Hub 的 /exec 網址)', '(貼上 Hub 的 API_SECRET)', '(設定後台密碼)', 'gm.ccps.kh.edu.tw_4v52pn9fno0s4pk5b1diagf52c@group.calendar.google.com'
  ];
  
  var existingData = settings.getDataRange().getValues();
  var oldHeaders = existingData.length > 0 ? existingData[0] : [];
  var oldValues = existingData.length > 1 ? existingData[1] : [];
  
  var oldMap = {};
  for(var j = 0; j < oldHeaders.length; j++) {
    oldMap[oldHeaders[j]] = oldValues[j];
  }

  settings.getRange(1, 1, 1, headers.length).setValues([headers]);
  settings.getRange('A1:N1').setFontWeight('bold').setBackground('#d9ead3');
  
  var finalData = [];
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var val = defaults[i];

    if (h === '費率 (每小時)' && oldMap['費率 (每小時)']) val = oldMap['費率 (每小時)'];
    else if (h === '承辦人 Email' && oldMap['承辦人 Email']) val = oldMap['承辦人 Email'];
    else if (h === '保全人員 Email' && oldMap['保全人員 Email']) val = oldMap['保全人員 Email'];
    else if (h === '保全人員 Email' && !oldMap['保全人員 Email'] && oldMap['保全公司 Email']) val = oldMap['保全公司 Email']; 
    else if (h === '平日值勤時間 (如 07:00-21:00)' && oldMap['平日值勤時間 (例如 07:00-21:00)']) val = oldMap['平日值勤時間 (例如 07:00-21:00)'];
    else if (h === '平日值勤時間 (如 07:00-21:00)' && oldMap['平日值勤時間 (如 07:00-21:00)']) val = oldMap['平日值勤時間 (如 07:00-21:00)'];
    else if (h === '假日值勤時間 (如 08:00-20:00)' && oldMap['假日值勤時間 (例如 08:00-20:00)']) val = oldMap['假日值勤時間 (例如 08:00-20:00)'];
    else if (h === '假日值勤時間 (如 08:00-20:00)' && oldMap['假日值勤時間 (如 08:00-20:00)']) val = oldMap['假日值勤時間 (如 08:00-20:00)'];
    else if (h === '國定假日清單 (YYYY-MM-DD逗號分隔)' && oldMap['國定假日清單 (YYYY-MM-DD逗號分隔)']) val = oldMap['國定假日清單 (YYYY-MM-DD逗號分隔)'];
    else if (h === '所屬單位選項 (逗號分隔)' && oldMap['所屬單位選項 (請以逗號分隔填寫)']) val = oldMap['所屬單位選項 (請以逗號分隔填寫)'];
    else if (h === '所屬單位選項 (逗號分隔)' && oldMap['所屬單位選項 (逗號分隔)']) val = oldMap['所屬單位選項 (逗號分隔)'];
    else if (oldMap[h] !== undefined && oldMap[h] !== '') val = oldMap[h];

    finalData.push(val);
  }
  
  settings.getRange(2, 1, 1, finalData.length).setValues([finalData]);
  
  var requests = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
  if (!requests) {
    requests = ss.insertSheet(CONFIG.SHEET_REQUESTS);
    requests.appendRow(['申請時間', 'RequestID', '姓名', 'Email', '單位/地點', '電話', '原因', '加班明細', '總時數', '總金額', '狀態', '完整資料包(JSON)']);
    requests.getRange('A1:L1').setFontWeight('bold').setBackground('#fff2cc');
  } else {
    requests.getRange('L1').setValue('完整資料包(JSON)').setFontWeight('bold').setBackground('#fff2cc');
  }
  
  SpreadsheetApp.getUi().alert('✅ 系統資料庫已成功升級！(支援校外單位進位與金流選填模組)');
}

function hideAndSaveSecrets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
  if (!settings) return SpreadsheetApp.getUi().alert('找不到 Settings 分頁。');
  
  var urlCell = settings.getRange('K2');
  var secCell = settings.getRange('L2');
  var pwdCell = settings.getRange('M2');
  
  var urlVal = urlCell.getValue().toString().trim();
  var secVal = secCell.getValue().toString().trim();
  var pwdVal = pwdCell.getValue().toString().trim();
  
  var props = PropertiesService.getScriptProperties();
  var updated = false;
  
  if (urlVal && urlVal !== '***' && !urlVal.includes('貼上')) { props.setProperty(CONFIG.PROP_HUB_URL, urlVal); urlCell.setValue('***'); updated = true; }
  if (secVal && secVal !== '***' && !secVal.includes('貼上')) { props.setProperty(CONFIG.PROP_HUB_SEC, secVal); secCell.setValue('***'); updated = true; }
  if (pwdVal && pwdVal !== '***' && !pwdVal.includes('設定')) { props.setProperty(CONFIG.PROP_ADMIN_PWD, pwdVal); pwdCell.setValue('***'); updated = true; }
  
  if (updated) {
    SpreadsheetApp.getUi().alert('🔒 安全鎖定完成！\n金鑰與密碼已寫入底層環境變數，並將試算表內容遮蔽為 ***。');
  } else {
    SpreadsheetApp.getUi().alert('⚠️ 偵測不到新的有效金鑰，或金鑰已被隱藏。');
  }
}

// 🟨🟨🟨 【模組三：Web 路由與公開 API / ROUTER & PUBLIC】
function doGet(e) {
  e = e || { parameter: {} };
  
  if (e.parameter.action && e.parameter.id) {
    if (e.parameter.action === 'cancel') return cancelRequest(e.parameter.id);
    return processAction(e.parameter.id, e.parameter.action);
  }
  
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('保全加班申請系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  var data = sheet.getRange(2, 1, 1, 14).getValues()[0]; 
  return {
    rate: data[0] || 200,
    weekdayHours: (data[6] && data[6].toString().trim() !== '') ? data[6].toString().trim() : '07:00-21:00',
    holidayHours: (data[7] && data[7].toString().trim() !== '') ? data[7].toString().trim() : '08:00-20:00',
    departments: (data[9] && data[9].toString().trim() !== '') ? data[9].toString().split(',').map(function(s){return s.trim();}) : ['教務處']
  };
}

function processForm(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
    var timestamp = new Date();
    var requestId = 'REQ-' + timestamp.getTime() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    var safePhone = "'" + data.phone;
    var fullJsonData = JSON.stringify(data);

    sheet.appendRow([
      timestamp, requestId, data.name, data.email, data.dept, safePhone, data.reason,
      JSON.stringify(data.periods), data.totalHours, data.totalCost, '待審核', fullJsonData
    ]);

    sendInitialEmails(data, requestId);
    return true;
  } catch (error) {
    throw new Error('儲存發生錯誤：' + error.message);
  }
}

// 🟧🟧🟧 【模組四：戰情室後台 API / ADMIN DASHBOARD】
function verifyAdmin(pwd) {
  var savedPwd = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_ADMIN_PWD);
  if (!savedPwd) return true; 
  if (savedPwd !== pwd) throw new Error('401');
  return true;
}

function getDashboardData(pwd) {
  verifyAdmin(pwd);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reqData = ss.getSheetByName(CONFIG.SHEET_REQUESTS).getDataRange().getValues();
  var setSheet = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
  var currentRate = setSheet.getRange('A2').getValue() || 0;
  
  var requests = [];
  for (var i = reqData.length - 1; i >= 1; i--) {
    var displayPhone = reqData[i][5].toString();
    if (displayPhone.startsWith("'")) displayPhone = displayPhone.substring(1);
    
    var fullData = {};
    try { fullData = JSON.parse(reqData[i][11]); } catch(e) {}
    var isExt = fullData.isExternal || false;
    var billableH = fullData.totalBillableHours || reqData[i][8];

    requests.push({
      date: Utilities.formatDate(new Date(reqData[i][0]), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm'),
      id: reqData[i][1],
      name: reqData[i][2],
      dept: reqData[i][4],
      phone: displayPhone,
      hours: reqData[i][8],
      billableHours: billableH,
      isExternal: isExt,
      cost: reqData[i][9],
      status: reqData[i][10],
      periods: JSON.parse(reqData[i][7] || '[]')
    });
  }
  return { rate: currentRate, requests: requests };
}

function updateRateAndRecalculate(pwd, newRate) {
  verifyAdmin(pwd);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setSheet = ss.getSheetByName(CONFIG.SHEET_SETTINGS);
  var reqSheet = ss.getSheetByName(CONFIG.SHEET_REQUESTS);
  
  setSheet.getRange('A2').setValue(newRate);
  
  var data = reqSheet.getDataRange().getValues();
  var updatedCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][10] === '待審核') {
      var fullData = {};
      try { fullData = JSON.parse(data[i][11]); } catch(e) {}
      var billableH = parseFloat(fullData.totalBillableHours) || parseFloat(data[i][8]) || 0;
      var newCost = Math.round(billableH * newRate);
      reqSheet.getRange(i + 1, 10).setValue(newCost);
      updatedCount++;
    }
  }
  return updatedCount;
}

function adminProcessRequest(pwd, id, action) {
  verifyAdmin(pwd);
  var resultOutput = processAction(id, action);
  var resultHtml = resultOutput.getContent();
  
  if (resultHtml.includes('成功') || resultHtml.includes('同意') || resultHtml.includes('已結案')) {
    var match = resultHtml.match(/<strong>LINE 推播報告：<\/strong>([\s\S]*?)<\/div>/);
    if (match) {
      var plainReport = match[1].replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, "");
      return '✅ 處理成功！\n\n[LINE 執行結果]\n' + plainReport;
    }
    return '✅ 處理成功！';
  } else {
    throw new Error('處理失敗或單據狀態不符');
  }
}

// 🛠️🛠️🛠️ 【模組五：核心審核與推播引擎 / CORE SERVICES】
function processAction(id, action) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REQUESTS);
  var data = sheet.getDataRange().getValues();
  var req = null, rowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === id) {
      var displayPhone = data[i][5].toString();
      if (displayPhone.startsWith("'")) displayPhone = displayPhone.substring(1);
      
      var fullData = {};
      try { fullData = JSON.parse(data[i][11]); } catch(e) {}

      req = {
        rowIndex: i + 1, requestId: data[i][1], name: data[i][2], email: data[i][3],
        dept: data[i][4], phone: displayPhone, reason: data[i][6],
        periods: JSON.parse(data[i][7] || '[]'), 
        totalHours: data[i][8], 
        totalCost: data[i][9], 
        status: data[i][10],
        paymentMethod: fullData.paymentMethod || "未填寫",
        invoiceTitle: fullData.invoiceTitle || "",
        isExternal: fullData.isExternal || false,
        totalBillableHours: fullData.totalBillableHours || data[i][8]
      };
      rowIndex = i + 1;
      break;
    }
  }
  
  if (!req) return HtmlService.createHtmlOutput('<div style="text-align:center; padding: 50px;"><h2>找不到該筆申請紀錄！</h2></div>');
  
  if (action === 'close') {
    if (req.status !== '已同意') return HtmlService.createHtmlOutput('<div style="text-align:center; padding: 50px;"><h2>無法結案，此單狀態並非「已同意」！</h2></div>');
    sheet.getRange(rowIndex, 11).setValue('已結案');
    return HtmlService.createHtmlOutput('<div style="text-align:center; padding: 50px; color:#15803d;"><h2>📦 成功結案歸檔！</h2></div>');
  }

  if (req.status !== '待審核') return HtmlService.createHtmlOutput('<div style="text-align:center; padding: 50px;"><h2>此單已處理過 (目前狀態：' + req.status + ')</h2></div>');

  if (action === 'reject') {
    sheet.getRange(rowIndex, 11).setValue('已退回');
    var content = `<p style="color: #dc2626; font-size: 16px; font-weight: bold;">❌ 很抱歉，您的加班申請已被承辦人退回，未獲同意。</p>`;
    if (req.email) MailApp.sendEmail({ to: req.email, subject: "【退回通知】保全加班申請 (" + id + ")", htmlBody: generateHtmlBody(req, id, "保全加班申請已退回", content) });
    return HtmlService.createHtmlOutput('<div style="font-family: sans-serif; text-align: center; padding: 50px; color: #dc2626;"><h2>申請已成功退回！</h2></div>');
  }

  // ================= 進入同意流程 =================
  sheet.getRange(rowIndex, 11).setValue('已同意');
  
  var setSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  var sData = setSheet.getRange(2, 1, 1, 14).getValues()[0];
  var settings = {
    undertakerEmail: sData[1], guardEmail: sData[2], guardPhone: sData[3],
    companyEmail: sData[4], companyPhone: sData[5],
    weekdayHours: sData[6], holidayHours: sData[7],
    holidays: parseHolidays(sData[8]),
    calendarId: sData[13] ? sData[13].toString().trim() : ''
  };

  var calendarMsg = "";
  var lineDetailsMsg = ""; 
  
  try {
    var calendar = null;
    if (settings.calendarId) {
      try { calendar = CalendarApp.getCalendarById(settings.calendarId); } 
      catch(ce) { console.error("指定日曆讀取失敗", ce); }
    }
    if (!calendar) calendar = CalendarApp.getDefaultCalendar(); 

    var eventTitle = "[保全加班] " + req.name + " (" + req.dept + ")";
    var eventDesc = "單號: " + id + "\n電話: " + req.phone + "\n原因: " + req.reason;

    req.periods.forEach(function(p) {
      var datesArray = Array.isArray(p.dates) ? p.dates : [p.dates];
      datesArray.forEach(function(dStr) {
        if (!dStr) return;
        var cleanDate = dStr.split(' (')[0];
        var dObj = new Date(cleanDate.replace(/-/g, '/'));
        var day = dObj.getDay();
        
        var isHoliday = (day === 0 || day === 6 || settings.holidays.indexOf(cleanDate) !== -1);
        var dutyMins = (isHoliday ? settings.holidayHours : settings.weekdayHours).split('-');
        var startMins = parseDutyTime(dutyMins[0]), endMins = parseDutyTime(dutyMins[1]);
        
        lineDetailsMsg += "\n📅 " + cleanDate + (isHoliday ? " (假日)" : " (平日)");

        // 💡 行事曆一律寫入「真實值勤時數」
        if (p.earlyHours > 0) {
          var eStartMins = startMins - (p.earlyHours * 60);
          var sTime = new Date(dObj); sTime.setHours(0, 0, 0, 0); sTime.setMinutes(eStartMins);
          var eTime = new Date(dObj); eTime.setHours(0, 0, 0, 0); eTime.setMinutes(startMins);
          calendar.createEvent(eventTitle + " [提前]", sTime, eTime, {description: eventDesc});
          lineDetailsMsg += "\n  提前 " + p.earlyHours + "H (" + formatMins(eStartMins).timeStr + "~" + dutyMins[0] + ")";
        }
        
        if (p.extendedHours > 0) {
          var eEndMins = endMins + (p.extendedHours * 60);
          var sTime2 = new Date(dObj); sTime2.setHours(0, 0, 0, 0); sTime2.setMinutes(endMins);
          var eTime2 = new Date(dObj); eTime2.setHours(0, 0, 0, 0); eTime2.setMinutes(eEndMins);
          calendar.createEvent(eventTitle + " [值勤延長]", sTime2, eTime2, {description: eventDesc});
          lineDetailsMsg += "\n  延長 " + p.extendedHours + "H (" + dutyMins[1] + "~" + formatMins(eEndMins).timeStr + ")";
        }
      });
    });
    calendarMsg = "<p style='color: #059669; font-size: 14px;'>📅 系統已成功排入 Google 行事曆。(以實際值勤時間建檔)</p>";
  } catch (err) { calendarMsg = "<p style='color: #d97706; font-size: 14px;'>⚠️ 行事曆排程失敗：請確認權限。</p>"; }

  // 組合 LINE 訊息
  var paymentStr = req.paymentMethod;
  if (req.invoiceTitle) paymentStr += ` (抬頭：${req.invoiceTitle})`;
  
  var lineMsg = "【✅ 保全加班申請已核准】\n單號：" + id + "\n申請人：" + req.name + "\n單位：" + req.dept + "\n電話：" + req.phone + "\n付款方式：" + paymentStr + "\n總值勤：" + req.totalHours + " 小時";
  if (req.isExternal && req.totalHours !== req.totalBillableHours) {
    lineMsg += `\n核算計費：${req.totalBillableHours} 小時 (校外單位進位)`;
  }
  lineMsg += "\n----------------------\n[排程明細]" + lineDetailsMsg + "\n\n⚠️備註：實際金額依上述計費時數核算。\n⚠️提醒：請保全人員務必回報保全公司確認此案件！";

  var pushReport = "";
  if (action === 'approve_push_guard' || action === 'approve_push_all') {
    pushReport += "<br>🔹 <strong>保全人員：</strong><br>" + sendToHub(settings.guardEmail, settings.guardPhone, lineMsg);
  }
  if (action === 'approve_push_all') {
    pushReport += "<br><br>🔹 <strong>保全公司：</strong><br>" + sendToHub(settings.companyEmail, settings.companyPhone, lineMsg);
  }

  var regularContent = `<p style="color:#059669;font-weight:bold;">✅ 加班申請已生效。</p>` + calendarMsg;
  var guardContent = `<p style="color:#059669;font-weight:bold;">✅ 加班申請已生效。</p>
                      <div style="background-color:#fffbeb; border:1px solid #f59e0b; padding:15px; border-radius:6px; margin: 15px 0;">
                        <p style="color:#b45309; font-weight:bold; margin:0; font-size:16px;">⚠️ 【保全人員請注意】：<br>請務必回報保全公司確認此加班案件！</p>
                      </div>` + calendarMsg;

  var applicantEmails = [req.email, settings.undertakerEmail].filter(String).join(',');
  var guardCompanyEmails = [settings.guardEmail, settings.companyEmail].filter(String).join(',');

  if (applicantEmails) MailApp.sendEmail({ to: applicantEmails, subject: "【核准通知】保全加班申請 (" + id + ")", htmlBody: generateHtmlBody(req, id, "保全加班申請已核准", regularContent) });
  if (guardCompanyEmails) MailApp.sendEmail({ to: guardCompanyEmails, subject: "【勤務通知】保全加班任務指派 (" + id + ")", htmlBody: generateHtmlBody(req, id, "保全加班任務指派", guardContent) });

  var finalHtml = '<div style="font-family: sans-serif; text-align: center; padding: 50px; color: #059669;"><h2>✅ 申請已同意！</h2><p>系統已更新狀態並寄出信件。</p>';
  if (pushReport !== "") {
     finalHtml += '<div style="margin-top:20px; padding:15px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; text-align:left; color:#334155; font-size:14px; max-width:400px; margin-left:auto; margin-right:auto;"><strong>LINE 推播報告：</strong>' + pushReport + '</div>';
  }
  finalHtml += '</div>';

  return HtmlService.createHtmlOutput(finalHtml);
}

function sendToHub(emailStr, phoneStr, message) {
  var props = PropertiesService.getScriptProperties();
  var apiUrl = props.getProperty(CONFIG.PROP_HUB_URL);
  var secret = props.getProperty(CONFIG.PROP_HUB_SEC);
  if (!apiUrl || !secret) return "⚠️ 尚未設定 Hub API 或密碼";

  var emails = emailStr ? String(emailStr).split(',').map(function(s){return s.trim();}).filter(String) : [];
  var phones = phoneStr ? String(phoneStr).split(',').map(function(s){return s.trim();}).filter(String) : [];
  var maxLength = Math.max(emails.length, phones.length);

  var results = [];
  for(var i=0; i<maxLength; i++) {
    var targetEmail = emails[i] || "";
    var targetPhone = phones[i] || "";
    var displayTarget = targetEmail || targetPhone;
    
    var payload = { action: "push", secret: secret, email: targetEmail, phone: targetPhone, message: message };
    
    try {
      var res = UrlFetchApp.fetch(apiUrl, { method: "post", payload: payload, muteHttpExceptions: true });
      var resCode = res.getResponseCode();
      var resText = res.getContentText();

      if (resCode === 200 || resCode === 302) { 
         try {
           var json = JSON.parse(resText);
           if (json.success) {
             results.push("✔️ " + displayTarget + " (發送成功)");
           } else {
             results.push("❌ " + displayTarget + " (失敗: " + json.error + ")");
           }
         } catch(parseErr) {
           results.push("❌ " + displayTarget + " (Hub回應格式異常)");
         }
      } else {
        results.push("❌ " + displayTarget + " (HTTP " + resCode + ")");
      }
    } catch(e) {
      results.push("❌ " + displayTarget + " (連線崩潰: " + e.message + ")");
    }
  }
  return results.length > 0 ? results.join("<br>") : "⚠️ 無有效聯絡資訊";
}

function cancelRequest(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_REQUESTS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === id) {
      if (data[i][10] !== '待審核') return HtmlService.createHtmlOutput('<div style="text-align:center; padding:50px;"><h2>無法取消！此單狀態為：' + data[i][10] + '</h2></div>');
      sheet.getRange(i + 1, 11).setValue('已取消');
      return HtmlService.createHtmlOutput('<div style="text-align:center; padding:50px; color:#15803d;"><h2>✅ 申請已取消！</h2></div>');
    }
  }
  return HtmlService.createHtmlOutput('找不到單據');
}

function parseDutyTime(timeStr) { var p = timeStr.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
function formatMins(mins) {
  var dOffset = 0; if (mins < 0) { mins += 24 * 60; dOffset = -1; } if (mins >= 24 * 60) { mins -= 24 * 60; dOffset = 1; }
  var h = Math.floor(mins / 60), m = mins % 60;
  return { timeStr: (h < 10 ? '0'+h : h) + ':' + (m < 10 ? '0'+m : m), dOffset: dOffset };
}
function parseHolidays(rawVal) {
  if (!rawVal) return [];
  if (Object.prototype.toString.call(rawVal) === '[object Date]') { return [Utilities.formatDate(rawVal, Session.getScriptTimeZone(), 'yyyy-MM-dd')]; }
  return rawVal.toString().split(',').map(function(s) {
    var str = s.trim().replace(/\//g, '-');
    var parts = str.split('-');
    if (parts.length === 3) {
       var y = parts[0];
       var m = parts[1].length === 1 ? '0' + parts[1] : parts[1];
       var d = parts[2].length === 1 ? '0' + parts[2] : parts[2];
       return y + '-' + m + '-' + d;
    }
    return str;
  }).filter(String);
}

function generateHtmlBody(data, requestId, title, customContent) {
  var setSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  var sData = setSheet.getRange(2, 1, 1, 14).getValues()[0];
  var settings = { weekdayHours: sData[6], holidayHours: sData[7], holidays: parseHolidays(sData[8]) };
  
  var periodsHtml = '<ul style="padding-left: 20px;">';
  data.periods.forEach(function(p) {
    var datesArray = Array.isArray(p.dates) ? p.dates : [p.dates];
    datesArray.forEach(function(dStr) {
      if(!dStr) return;
      var cleanDate = dStr.split(' (')[0], dObj = new Date(cleanDate.replace(/-/g, '/')), day = dObj.getDay();
      var isHoliday = (day === 0 || day === 6 || settings.holidays.indexOf(cleanDate) !== -1);
      var dutyStr = isHoliday ? settings.holidayHours : settings.weekdayHours;
      var dutyMins = dutyStr.split('-');
      var startMins = parseDutyTime(dutyMins[0]), endMins = parseDutyTime(dutyMins[1]);
      
      var detailStr = '<strong>' + dStr + '</strong> <span style="color:#64748b; font-size:12px;">(' + (isHoliday ? '假日' : '平日') + '值勤 ' + dutyStr + ')</span><br>';
      if (p.earlyHours > 0) detailStr += '&nbsp;&nbsp;<span style="color:#059669;">✔️ 提前 ' + p.earlyHours + ' 小時</span> (' + formatMins(startMins - p.earlyHours * 60).timeStr + ' ~ ' + dutyMins[0] + ')<br>';
      if (p.extendedHours > 0) detailStr += '&nbsp;&nbsp;<span style="color:#d97706;">✔️ 延長 ' + p.extendedHours + ' 小時</span> (' + dutyMins[1] + ' ~ ' + formatMins(endMins + p.extendedHours * 60).timeStr + ')<br>';
      periodsHtml += '<li style="margin-bottom: 12px; line-height: 1.6;">' + detailStr + '</li>';
    });
  });
  periodsHtml += '</ul>';

  var paymentStr = data.paymentMethod || "未填寫";
  if (data.invoiceTitle) paymentStr += ` (抬頭：${data.invoiceTitle})`;
  
  var hoursDisplay = `${data.totalHours} 小時`;
  if (data.isExternal && data.totalHours !== data.totalBillableHours) {
    hoursDisplay += ` <span style="color:#e11d48; font-size:14px;">(校外單位單日進位，計費核算：${data.totalBillableHours} 小時)</span>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #059669; color: white; padding: 16px;"><h2 style="margin: 0;">${title}</h2></div>
      <div style="padding: 24px;">
        <p><strong>單號：</strong> ${requestId}</p>
        <p><strong>申請人：</strong> ${data.name}</p>
        <p><strong>單位：</strong> ${data.dept}</p>
        <p><strong>電話：</strong> ${data.phone}</p>
        <p><strong>付款：</strong> ${paymentStr}</p>
        <p><strong>原因：</strong> ${data.reason}</p>
        <h3 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #047857; margin-top:24px;">排程明細</h3>
        ${periodsHtml}
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 6px; margin-top: 16px; border: 1px solid #a7f3d0;">
          <p style="margin: 0;"><strong>總時數：</strong> ${hoursDisplay}</p>
          <p style="margin: 8px 0 0 0; color: #e11d48; font-size: 18px;"><strong>預估總金額： NT$ ${data.totalCost}</strong></p>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px; font-weight: bold;">⚠️ 備註：最終金額將依保全人員實際加班計費時數核算</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        ${customContent}
      </div>
    </div>`;
}

function sendInitialEmails(data, requestId) {
  var appUrl = ScriptApp.getService().getUrl();
  var setSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_SETTINGS);
  var undertakerEmail = setSheet.getRange('B2').getValue();

  if (data.email) {
    MailApp.sendEmail({
      to: data.email, subject: "【申請送出】保全加班申請 (" + requestId + ")",
      htmlBody: generateHtmlBody(data, requestId, "保全加班申請已送出", `<a href="${appUrl}?action=cancel&id=${requestId}" style="color:#ef4444;font-weight:bold;">[ 取消此申請單 ]</a>`)
    });
  }

  if (undertakerEmail) {
    var adminLinks = `
      <p style="font-weight:bold; color:#1e293b;">請選擇審核動作：</p>
      <a href="${appUrl}?action=approve_email_only&id=${requestId}" style="display:inline-block; margin:5px; padding:10px 15px; background:#10b981; color:#fff; text-decoration:none; border-radius:5px;">✔️ 同意 (純Email)</a>
      <a href="${appUrl}?action=approve_push_guard&id=${requestId}" style="display:inline-block; margin:5px; padding:10px 15px; background:#0ea5e9; color:#fff; text-decoration:none; border-radius:5px;">✔️ 同意 (+保全LINE)</a>
      <a href="${appUrl}?action=approve_push_all&id=${requestId}" style="display:inline-block; margin:5px; padding:10px 15px; background:#6366f1; color:#fff; text-decoration:none; border-radius:5px;">✔️ 同意 (+全員LINE)</a>
      <a href="${appUrl}?action=reject&id=${requestId}" style="display:inline-block; margin:5px; padding:10px 15px; background:#ef4444; color:#fff; text-decoration:none; border-radius:5px;">❌ 退回申請</a>
    `;
    MailApp.sendEmail({
      to: undertakerEmail, subject: "【待審核】" + data.name + " 的保全加班申請",
      htmlBody: generateHtmlBody(data, requestId, "【待審核】保全加班申請", adminLinks)
    });
  }
}