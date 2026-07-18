/**
 * 中正國小 場地租借系統 (V8.6 UI動線與嚴格驗證版)
 * 修改內容：單位自動補齊、支援申請人/負責人雙變數、全代碼完整性守護
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚙️ 系統設定 (V8.6)')
    .addItem('1. 一鍵建立資料庫結構 (請於空白試算表執行)', 'initDatabase')
    .addSeparator()
    .addItem('2. 🔒 寫入並遮蔽系統金鑰', 'saveAndMaskKeys')
    .addToUi();
}

function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const sheetsDef = [
    {
      name: '系統金鑰管理',
      headers: ['金鑰變數', '功能說明', '設定值 (請貼上至此)', '目前狀態'],
      mock: [
        ['MAIN_SHEET_ID', '本系統試算表 ID', '', '未設定'],
        ['EXTERNAL_SHEET_ID', '場地會辦系統試算表 ID (選填)', '', '未設定'],
        ['TEMPLATE_APP_ID', '【民眾用】申請表 Google Doc 樣板 ID', '', '未設定'],
        ['TEMPLATE_SIGN_ID', '【內部用】簽呈 Google Doc 樣板 ID', '', '未設定'],
        ['TEMPLATE_REFUND_ID', '【內部用】退費單 Google Doc 樣板 ID', '', '未設定'],
        ['DRIVE_FOLDER_ID', 'PDF 存放資料夾 ID', '', '未設定'],
        ['CALENDAR_ID', '場地行事曆 ID', '', '未設定'],
        ['CHAT_WEBHOOK_URL', 'Google Chat Webhook URL (推播用)', '', '未設定'],
        ['ADMIN_PIN', '後台審核登入密碼', '', '未設定']
      ]
    },
    {
      name: '申請紀錄',
      headers: ['申請編號', '提交時間', '活動名稱', '申請單位', '負責人', '統編', '身分證', '電話', 'Email', '住址', '參加人數', '借用場地', '借用明細', '計費明細', '場地費小計', '清潔費小計', '冷氣費小計', '照明費小計', '設備費小計', '保證金小計', '總時段數', '原始總價', '減免規則', '實收總價', '狀態', '申請表PDF', '簽呈PDF', '退費單PDF'],
      mock: []
    },
    {
      name: '費率參數',
      headers: ['場地名稱', '場地費(時段)', '清潔費(平日次/假日段)', '冷氣費(時段)', '照明費(時段)', '附加設備費(每部時段)', '保證金(次)', '可供借用總數'],
      mock: [
        ['普通教室', 100, 150, 200, 40, 0, 700, 10],
        ['專科教室', 125, 210, 300, 60, 0, 3500, 3],
        ['131中型會議室', 125, 210, 300, 60, 0, 3500, 1],
        ['會議室', 300, 600, 1440, 480, 0, 2500, 1],
        ['資訊教室', 250, 210, 400, 60, 10, 4500, 2],
        ['運動場', 375, 150, 0, 150, 0, 1500, 1],
        ['停車場', 375, 335, 0, 0, 0, 5000, 15],
        ['玄關(川堂)', 200, 200, 0, 200, 0, 1000, 1]
      ]
    },
    {
      name: '特殊日期設定',
      headers: ['日期(YYYY-MM-DD)', '屬性', '說明'],
      mock: [
        ['2026-04-03', '放假日', '清明連假'],
        ['2026-04-04', '放假日', '兒童節'],
        ['2026-05-01', '放假日', '勞動節']
      ]
    },
    {
      name: '減免規則',
      headers: ['規則簡稱', '法規完整內容', '場地費乘數', '清潔費乘數', '水電設備乘數', '保證金乘數'],
      mock: [
        ['無減免(全額)', '依據高雄市苓雅區中正國民小學場所使用管理須知收費標準計費。', 1, 1, 1, 1],
        ['第八條(免保/免清)', '依據高雄市高級中等以下學校場地使用管理規則第八條規定，相關教育團體辦理非營利活動，免收保證金及清潔費。', 1, 0, 1, 0],
        ['第十一條(半價/免保/免清)', '依據高雄市高級中等以下學校場地使用管理規則第十一條規定，相關教育團體辦理教育推廣之非營利活動，場地費減半，免收保證金及清潔費。', 0.5, 0, 1, 0]
      ]
    },
    {
      name: '系統設定與文本',
      headers: ['參數名稱', '參數值'],
      mock: [
        ['管理員接收信箱', 'admin@school.edu.tw'],
        ['開放借用起始時間', '08:00'],
        ['開放借用結束時間', '22:00'],
        ['網頁大標題', '中正國小 場地借用申請'],
        ['網頁副標題', '請詳實填寫下方明細，系統將自動判斷平假日試算費用'],
        ['注意事項', '1. 收費以2小時為一時段計算...\n2. 申請獲准需於3日前繳清。'],
      ]
    }
  ];

  sheetsDef.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#d9ead3');
      sheet.setFrozenRows(1);
      if (def.name === '申請紀錄') sheet.getRange("F:K").setNumberFormat("@"); 
      if (def.name === '特殊日期設定') sheet.getRange("A:A").setNumberFormat("@");
      if (def.mock.length > 0) sheet.getRange(2, 1, def.mock.length, def.mock[0].length).setValues(def.mock);
    }
  });
  ui.alert('✅ V8.6 系統架構建置完成！');
}

function saveAndMaskKeys() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('系統金鑰管理');
  const props = PropertiesService.getScriptProperties();
  let updatedCount = 0;
  if(!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && String(data[i][2]).trim() !== '' && data[i][2] !== '*** 已遮蔽 ***') {
      props.setProperty(data[i][0], String(data[i][2]).trim());
      sheet.getRange(i + 1, 3).setValue('*** 已遮蔽 ***').setFontColor('gray');
      sheet.getRange(i + 1, 4).setValue('已設定 ✅').setFontColor('green');
      updatedCount++;
    }
  }
  SpreadsheetApp.getUi().alert(`✅ 成功寫入並遮蔽 ${updatedCount} 筆金鑰！`);
}

function doGet(e) {
  let templateName = e.parameter.action === 'admin' ? 'admin' : 'index'; 
  if (e.parameter.action === 'cancel') return handleCancel(e.parameter.token); 
  const html = HtmlService.createTemplateFromFile(templateName);
  html.scriptUrl = ScriptApp.getService().getUrl();
  return html.evaluate().setTitle('中正國小場地租借').addMetaTag('viewport', 'width=device-width, initial-scale=1.0').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// 工具
// ==========================================
function toMinguo(dateObj, hideYearIfCurrent = false) {
  if (!dateObj) return "";
  const y = dateObj.getFullYear() - 1911;
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  if (hideYearIfCurrent && dateObj.getFullYear() === new Date().getFullYear()) return `${m}/${d}`; 
  return `${y}/${m}/${d}`; 
}

function parseMinguoToISO(minguoStr) {
  let parts = minguoStr.split('/');
  let y, m, d;
  if (parts.length === 3) {
    y = parseInt(parts[0]) + 1911; m = parts[1]; d = parts[2];
  } else {
    y = new Date().getFullYear(); m = parts[0]; d = parts[1];
  }
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function isFuzzyMatch(v1, v2) {
  let s1 = String(v1).replace(/[\(\)（）\s]/g, '');
  let s2 = String(v2).replace(/[\(\)（）\s]/g, '');
  return s1.includes(s2) || s2.includes(s1);
}

function parseRichTextToHTML(richTextValue) {
  if (!richTextValue) return "";
  let htmlStr = "";
  const runs = richTextValue.getRuns();
  runs.forEach(run => {
    let text = run.getText();
    if (!text) return;
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let style = run.getTextStyle();
    let css = [];
    if (style.isBold()) css.push("font-weight: bold;");
    if (style.isItalic()) css.push("font-style: italic;");
    if (style.isUnderline()) css.push("text-decoration: underline;");
    if (style.isStrikethrough()) css.push("text-decoration: line-through;");
    let color = style.getForegroundColor();
    if (color && color !== '#000000') css.push(`color: ${color};`);
    let fontSize = style.getFontSize();
    if (fontSize) css.push(`font-size: ${fontSize}pt;`);
    if (css.length > 0) htmlStr += `<span style="${css.join(' ')}">${text}</span>`;
    else htmlStr += `<span>${text}</span>`;
  });
  return htmlStr;
}

// ==========================================
// 系統核心流程
// ==========================================
function getSystemData() {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MAIN_SHEET_ID'));
    const rateData = ss.getSheetByName('費率參數').getDataRange().getValues().slice(1);
    const venues = rateData.map(r => ({ name: String(r[0]), fee: Number(r[1])||0, clean: Number(r[2])||0, ac: Number(r[3])||0, light: Number(r[4])||0, equip: Number(r[5])||0, deposit: Number(r[6])||0, qty: Number(r[7])||1 }));
    
    let settings = {};
    const textSheet = ss.getSheetByName('系統設定與文本');
    const textRange = textSheet.getDataRange();
    const textValues = textRange.getValues();
    const textRichValues = textRange.getRichTextValues();

    for (let i = 0; i < textValues.length; i++) {
      let key = String(textValues[i][0]);
      if (key === '注意事項') {
        let rtv = textRichValues[i][1];
        settings[key] = rtv ? parseRichTextToHTML(rtv) : String(textValues[i][1]);
      } else {
        settings[key] = (textValues[i][1] instanceof Date) ? Utilities.formatDate(textValues[i][1], Session.getScriptTimeZone(), "HH:mm") : (textValues[i][1] == null ? "" : String(textValues[i][1]));
      }
    }

    const times = [];
    const startH = parseInt((settings['開放借用起始時間']||"08:00").split(':')[0]);
    const endH = parseInt((settings['開放借用結束時間']||"22:00").split(':')[0]);
    for (let h = startH; h <= endH; h++) {
      ['00', '15', '30', '45'].forEach(m => { if (!(h === endH && m !== '00')) times.push(`${h.toString().padStart(2, '0')}:${m}`); });
    }
    
    const rules = ss.getSheetByName('減免規則').getDataRange().getValues().slice(1).map(r => ({ 
      name: String(r[0]), content: String(r[1]), feeMult: Number(r[2]), cleanMult: Number(r[3]), utilMult: Number(r[4]), depMult: Number(r[5]) 
    }));
    
    const holidays = ss.getSheetByName('特殊日期設定').getDataRange().getValues().slice(1).map(r => ({ date: String(r[0]).trim(), type: String(r[1]) }));

    return { success: true, venues: venues, times: times, settings: settings, rules: rules, holidays: holidays, currentYear: new Date().getFullYear() };
  } catch (error) { return { success: false, error: error.toString() }; }
}

function submitApplication(formData) {
  try {
    const props = PropertiesService.getScriptProperties();
    const ss = SpreadsheetApp.openById(props.getProperty('MAIN_SHEET_ID'));
    const sheet = ss.getSheetByName('申請紀錄');
    
    const explodedSlots = [];
    formData.timeSlots.forEach(slot => {
      slot.dates.forEach(d => explodedSlots.push({ venue: slot.venue, qty: slot.qty, date: d, start: slot.start, end: slot.end }));
    });

    const isAvailable = checkInventory(ss, explodedSlots);
    if (!isAvailable.success) return isAvailable;

    const uuid = Utilities.getUuid();
    const timestamp = new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyyMMdd"); 
    
    const useSlotsText = formData.timeSlots.map(s => {
      let formattedDates = s.dates.map(dStr => toMinguo(new Date(dStr), true)).join(', ');
      let pcText = s.pcQty > 0 ? `, ${s.pcQty}台電腦` : '';
      return `[${s.venue}] ${formattedDates} ${s.start}-${s.end} (${s.qty}間${pcText})`;
    }).join('\n');
    
    const feeSlotsText = formData.breakdownText;
    const uniqueVenues = [...new Set(formData.timeSlots.map(s => s.venue))].join('、');

    // V8.6 邏輯：若單位為空，自動補齊為申請人姓名
    const finalUnit = (formData.unit && formData.unit.trim() !== '') ? formData.unit : formData.manager;

    let appPdfUrl = "尚未生成";
    try {
      appPdfUrl = generatePDF(props.getProperty('TEMPLATE_APP_ID'), props.getProperty('DRIVE_FOLDER_ID'), `${dateStr}_[申請表]_${finalUnit}_${formData.activityName}`, {
        '{{申請日期}}': toMinguo(timestamp, false),
        '{{活動名稱}}': formData.activityName, '{{單位}}': finalUnit, '{{負責人}}': formData.manager,
        '{{申請人}}': formData.manager, // 雙變數支援
        '{{統編}}': formData.vat || '無', '{{身分證字號}}': formData.idNum, '{{參加人數}}': formData.participants,
        '{{聯絡人住址}}': formData.address, '{{申請人住址}}': formData.address, // 雙變數支援
        '{{電話}}': formData.phone, '{{Email}}': formData.email,
        '{{借用場地}}': uniqueVenues, '{{借用明細}}': useSlotsText, '{{計費明細}}': feeSlotsText, 
        '{{總時段}}': formData.totalPeriods, '{{預估金額}}': formData.originalPrice
      });
    } catch(e) { appPdfUrl = "PDF產出失敗:" + e; }

    const safePhone = "'" + formData.phone;
    const safeIdNum = "'" + formData.idNum; // 強制加單引號防 Excel 格式錯誤
    const safeVat = formData.vat ? "'" + formData.vat : "無";

    sheet.appendRow([
      uuid, timestamp, formData.activityName, finalUnit, formData.manager, safeVat, safeIdNum,
      safePhone, formData.email, formData.address, formData.participants, uniqueVenues, useSlotsText, feeSlotsText, 
      formData.venueFeeSub, formData.cleanFeeSub, formData.acFeeSub, formData.lightFeeSub, formData.equipFeeSub, 
      formData.depositAmt, formData.totalPeriods, formData.originalPrice, '無減免(全額)', formData.originalPrice, '審核中', appPdfUrl, '', ''
    ]);

    sendAdminNotification(ss, formData, useSlotsText, uniqueVenues, appPdfUrl);
    sendChatWebhook(`🆕 新申請: ${formData.activityName} (${finalUnit})\n🏢 場地: ${uniqueVenues}\n⏳ 時段: ${formData.totalPeriods} | 人數: ${formData.participants}`);
    sendConfirmationEmail(formData.email, finalUnit, formData.activityName, feeSlotsText, uuid, appPdfUrl);

    return { success: true, pdfUrl: appPdfUrl };
  } catch (e) { return { success: false, error: '送出失敗: ' + e.toString() }; }
}

function checkInventory(ss, explodedSlots) {
  try {
    const props = PropertiesService.getScriptProperties();
    const rateData = ss.getSheetByName('費率參數').getDataRange().getValues().slice(1);
    const venueMax = {};
    rateData.forEach(r => venueMax[String(r[0])] = Number(r[7]) || 1);
    
    let internalBooked = [];
    ss.getSheetByName('申請紀錄').getDataRange().getValues().slice(1).forEach(row => {
      if (row[24] === '審核中' || row[24] === '已核准') {
        String(row[12]).split('\n').forEach(s => {
          let match = s.match(/\[(.*?)\] (.*?) (\d{2}:\d{2})-(\d{2}:\d{2}) \((\d+)/);
          if (match) {
            let venue = match[1];
            let dates = match[2].split(', ');
            dates.forEach(d => { internalBooked.push({ venue: venue, date: parseMinguoToISO(d), start: match[3], end: match[4], qty: Number(match[5]) }); });
          }
        });
      }
    });

    let externalBooked = [];
    const extId = props.getProperty('EXTERNAL_SHEET_ID');
    if (extId && extId !== '未設定' && extId.trim() !== '') {
      try {
        const extSheet = SpreadsheetApp.openById(extId).getSheetByName('Requests');
        if (extSheet) {
          extSheet.getDataRange().getValues().slice(1).forEach(row => {
            if (row[2] === '已同意') { 
              let extVenue = String(row[7]); let jsonStr = String(row[10]); 
              if (jsonStr.startsWith('[')) {
                try {
                  JSON.parse(jsonStr).forEach(slot => {
                    let dateMatch = slot.dates.match(/(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) externalBooked.push({ venue: extVenue, date: dateMatch[1], start: slot.startTime, end: slot.endTime, qty: 999 });
                  });
                } catch(e) {}
              }
            }
          });
        }
      } catch(e) {}
    }

    for (let target of explodedSlots) {
      let usedQty = 0;
      for (let b of internalBooked) {
        if (b.venue === target.venue && b.date === target.date) { if (target.start < b.end && target.end > b.start) usedQty += b.qty; }
      }
      let maxQty = venueMax[target.venue] || 1;
      if (usedQty + Number(target.qty) > maxQty) return { success: false, error: `❌ 衝突：【${target.venue}】於 ${target.date} 數量不足。` };
      for (let ext of externalBooked) {
        if (isFuzzyMatch(target.venue, ext.venue)) {
          if (target.date === ext.date && target.start < ext.end && target.end > ext.start) return { success: false, error: `❌ 外部衝突：已被公務系統預約。` };
        }
      }
    }
    return { success: true };
  } catch(e) { return { success: false, error: "防撞期計算異常" }; }
}

function verifyAdmin(pin) { return String(pin) === String(PropertiesService.getScriptProperties().getProperty('ADMIN_PIN')); }

function getPendingApplications() {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MAIN_SHEET_ID'));
    const pending = ss.getSheetByName('申請紀錄').getDataRange().getValues().slice(1).filter(r => r[24] === '審核中').map(r => ({
      uuid: String(r[0]), actName: String(r[2]), unit: String(r[3]), manager: String(r[4]), phone: String(r[7]), email: String(r[8]), 
      participants: String(r[10] || '未填寫'), venues: String(r[11]), useSlots: String(r[12]), feeSlots: String(r[13]), 
      venueFeeSub: Number(r[14]), cleanFeeSub: Number(r[15]), acFeeSub: Number(r[16]), lightFeeSub: Number(r[17]), equipFeeSub: Number(r[18]),
      depositAmt: Number(r[19]), periods: Number(r[20]), price: Number(r[21]), appPdf: String(r[25])
    }));
    return { success: true, data: pending };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function rejectApplication(uuid, reason) {
  try {
    const sheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MAIN_SHEET_ID')).getSheetByName('申請紀錄');
    const data = sheet.getDataRange().getValues();
    let targetIdx = -1; let appData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(uuid)) { targetIdx = i + 1; appData = data[i]; break; }
    }
    if (targetIdx === -1) throw new Error('找不到該筆申請');
    sheet.getRange(targetIdx, 25).setValue('已退件');
    const email = String(appData[8]);
    if (email) {
      MailApp.sendEmail({
        to: email, subject: `【中正國小】場地借用申請退件通知`,
        htmlBody: `您好，您的申請「${appData[2]}」已被管理員退件。<br><br><b>退件原因：</b><br><div style="background:#fee2e2; padding:15px; border-radius:5px; color:#991b1b; font-weight:bold;">${reason}</div>`
      });
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function approveApplication(uuid, ruleContent, finalPrice, modifiedUseSlots, modifiedFeeSlots) {
  try {
    const props = PropertiesService.getScriptProperties();
    const ss = SpreadsheetApp.openById(props.getProperty('MAIN_SHEET_ID'));
    const sheet = ss.getSheetByName('申請紀錄');
    const data = sheet.getDataRange().getValues();
    let targetIdx = -1; let appData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(uuid)) { targetIdx = i + 1; appData = data[i]; break; }
    }
    if (targetIdx === -1) throw new Error('找不到該筆申請');
    const appDateObj = new Date(appData[1]);
    const dateStr = Utilities.formatDate(appDateObj, Session.getScriptTimeZone(), "yyyyMMdd");
    let payDateStr = "請洽總務處"; let refundDateStr = "活動結束後"; let dateObjs = [];
    let dateParts = modifiedUseSlots.match(/(?:(\d{2,3})\/)?(\d{2})\/(\d{2})/g);
    if (dateParts && dateParts.length > 0) {
        dateParts.forEach(dStr => {
            let parsedIso = parseMinguoToISO(dStr);
            let parts = parsedIso.split('-');
            dateObjs.push(new Date(parts[0], parts[1]-1, parts[2]));
        });
        dateObjs.sort((a, b) => a - b);
        let earliest = new Date(dateObjs[0]); earliest.setDate(earliest.getDate() - 1);
        if (earliest.getDay() === 0) earliest.setDate(earliest.getDate() - 2);
        else if (earliest.getDay() === 6) earliest.setDate(earliest.getDate() - 1);
        payDateStr = toMinguo(earliest, false);
        let latest = new Date(dateObjs[dateObjs.length - 1]); latest.setDate(latest.getDate() + 1);
        refundDateStr = toMinguo(latest, false);
    }
    let replaceMap = {
      '{{申請日期}}': toMinguo(appDateObj, false), '{{產出文件日}}': toMinguo(new Date(), false), 
      '{{繳納費用日}}': payDateStr, '{{保證金退還日期}}': refundDateStr,
      '{{活動名稱}}': appData[2], '{{單位}}': appData[3], '{{負責人}}': appData[4], '{{申請人}}': appData[4],
      '{{統編}}': appData[5].replace(/'/g, ''), '{{身分證字號}}': appData[6].replace(/'/g, ''),
      '{{電話}}': appData[7].replace(/'/g, ''), '{{Email}}': appData[8], '{{聯絡人住址}}': appData[9], '{{申請人住址}}': appData[9],
      '{{參加人數}}': appData[10] || '未填寫', '{{借用場地}}': appData[11], '{{借用明細}}': modifiedUseSlots, 
      '{{計費明細}}': modifiedFeeSlots, '{{總時段}}': appData[20], '{{減免規則}}': ruleContent, 
      '{{實收金額}}': finalPrice, '{{保證金退還金額}}': appData[19]
    };
    let signPdfUrl = "產出失敗";
    try { signPdfUrl = generateSignPDF(props.getProperty('TEMPLATE_SIGN_ID'), props.getProperty('DRIVE_FOLDER_ID'), `${dateStr}_[簽呈]_${appData[3]}_${appData[2]}`, replaceMap, modifiedUseSlots, modifiedFeeSlots, finalPrice, ss); } catch(e) { console.log('簽呈產製失敗: ' + e.toString()); }
    sheet.getRange(targetIdx, 27).setValue(signPdfUrl); 
    let refundPdfUrl = "";
    if (Number(appData[19]) > 0) {
      try { refundPdfUrl = generatePDF(props.getProperty('TEMPLATE_REFUND_ID'), props.getProperty('DRIVE_FOLDER_ID'), `${dateStr}_[退費申請]_${appData[3]}_${appData[2]}`, replaceMap); } catch(e) {}
    }
    sheet.getRange(targetIdx, 28).setValue(refundPdfUrl); 
    sheet.getRange(targetIdx, 13).setValue(modifiedUseSlots); sheet.getRange(targetIdx, 14).setValue(modifiedFeeSlots); 
    sheet.getRange(targetIdx, 23).setValue(ruleContent.substring(0, 10) + "..."); // 存縮寫
    sheet.getRange(targetIdx, 24).setValue(finalPrice); sheet.getRange(targetIdx, 25).setValue('已核准');
    MailApp.sendEmail({ to: String(appData[8]), subject: `【中正國小】場地借用核准通知`, htmlBody: `您的申請「${appData[2]}」已核准！實收金額：${finalPrice} 元。` });
    try { addCalendarEvents(props, appData, modifiedUseSlots, finalPrice); } catch(e) { console.log('行事曆登錄失敗: ' + e.toString()); }
    return { success: true, signPdf: signPdfUrl, refundPdf: refundPdfUrl };
  } catch (e) { return { success: false, error: e.toString() }; }
}

function generatePDF(templateId, folderId, fileName, replaceMap) {
  const folder = DriveApp.getFolderById(folderId);
  const copyDoc = DriveApp.getFileById(templateId).makeCopy(fileName, folder);
  const body = DocumentApp.openById(copyDoc.getId()).getBody();
  for (const [key, value] of Object.entries(replaceMap)) body.replaceText(key, String(value));
  DocumentApp.openById(copyDoc.getId()).saveAndClose();
  const pdfBlob = copyDoc.getAs(MimeType.PDF);
  const finalPdf = folder.createFile(pdfBlob).setName(`${fileName}.pdf`);
  copyDoc.setTrashed(true);
  return finalPdf.getUrl();
}

function addCalendarEvents(props, appData, modifiedUseSlots, finalPrice) {
  const calendarId = props.getProperty('CALENDAR_ID');
  if (!calendarId || calendarId === '未設定' || calendarId.trim() === '') {
    console.log('CALENDAR_ID 未設定，跳過行事曆登錄。');
    return;
  }
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    console.log('找不到指定的行事曆，CALENDAR_ID 可能有誤。');
    return;
  }
  const actName = String(appData[2]);
  const unit = String(appData[3]);
  const phone = String(appData[7]).replace(/'/g, '');
  const email = String(appData[8]);
  // 解析每一行時段：[場地/教室編號] 日期 開始-結束
  const lineRegex = /\[(.*?)\] (.*?) (\d{2}:\d{2})-(\d{2}:\d{2})/g;
  let match;
  while ((match = lineRegex.exec(modifiedUseSlots)) !== null) {
    const venueName = match[1];
    const datesStr = match[2];
    const startTime = match[3];
    const endTime = match[4];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const dateArr = datesStr.split(', ').map(d => d.trim()).filter(d => d);
    dateArr.forEach(minguoDate => {
      try {
        const isoDate = parseMinguoToISO(minguoDate);
        const parts = isoDate.split('-').map(Number);
        const startDt = new Date(parts[0], parts[1] - 1, parts[2], startH, startM, 0);
        const endDt   = new Date(parts[0], parts[1] - 1, parts[2], endH,   endM,   0);
        const title = `🏫[​${venueName}] - ${actName} - ${unit}`;
        const description = [
          `活動名稱：${actName}`,
          `申請單位：${unit}`,
          `場地：${venueName}`,
          `時段：${startTime} - ${endTime}`,
          `聯絡電話：${phone}`,
          `Email：${email}`,
          `實收金額：${finalPrice} 元`
        ].join('\n');
        calendar.createEvent(title, startDt, endDt, { description: description, location: venueName });
      } catch(e) {
        console.log(`行事曆事件建立失敗 [​${venueName}] ${minguoDate}: ${e.toString()}`);
      }
    });
  }
}

function buildFeeTableInDoc(docId, modifiedUseSlots, modifiedFeeSlots, finalPrice, ss) {
  // 1. 載入費率資料
  const rateRows = ss.getSheetByName('費率參數').getDataRange().getValues().slice(1);
  const venueRates = {};
  rateRows.forEach(r => {
    venueRates[String(r[0]).trim()] = { fee:Number(r[1])||0, clean:Number(r[2])||0, ac:Number(r[3])||0, light:Number(r[4])||0, equip:Number(r[5])||0 };
  });

  // 2. 解析 useSlots (場地、日期、時段)
  const useSlots = [];
  const useRe = /\[(.*?)\] (.*?) (\d{2}:\d{2})-(\d{2}:\d{2})/g;
  let um;
  while ((um = useRe.exec(modifiedUseSlots)) !== null) {
    const [sh, sm] = um[3].split(':').map(Number);
    const [eh, em] = um[4].split(':').map(Number);
    useSlots.push({
      venue: um[1],
      dates: um[2].split(', ').map(d => d.trim()).filter(Boolean),
      periods: ((eh * 60 + em) - (sh * 60 + sm)) / 120
    });
  }

  // 3. 解析 feeSlots
  const feeSlotLines = [], deposits = [];
  let parkingLine = '';
  modifiedFeeSlots.split('\n').forEach(line => {
    line = line.trim(); if (!line) return;
    if (line[0] === '[') feeSlotLines.push(line);
    else if (line[0] === '\u3010') {
      const dm = line.match(/\u3010(.*?)\u3011\u4fdd\u8b49\u91d1\s*=\s*(\d+)/);
      if (dm && Number(dm[2]) > 0) deposits.push({ venue: dm[1], amt: Number(dm[2]) });
    } else if (line.includes('\ud83c\udd7f\ufe0f')) parkingLine = line;
  });

  function parseFeeAmounts(feeLine) {
    const r = { '\u5834\u5730':0, '\u6e05\u6f54':0, '\u51b7\u6c23':0, '\u7167\u660e':0, '\u8a2d\u5099':0 };
    const dm = feeLine.match(/\|(.+)\u27a1\ufe0f/); if (!dm) return r;
    ['\u5834\u5730','\u6e05\u6f54','\u51b7\u6c23','\u7167\u660e','\u8a2d\u5099'].forEach(k => {
      const m = dm[1].match(new RegExp(k + '=(\\d+)')); if (m) r[k] = Number(m[1]);
    });
    return r;
  }

  // 4. 建立表格資料
  const tableData = [['\u6708\u4efd', '\u5834\u5730', '\u8a08\u8cbb\u540d\u7a31', '\u8a08\u8cbb\u65b9\u5f0f', '\u61c9\u7e73\u8cbb\u7528']];

  useSlots.forEach((slot, idx) => {
    const feeLine = feeSlotLines[idx] || '';
    const feeAmts = parseFeeAmounts(feeLine);
    const qty = Number((feeLine.match(/\((\d+)\u9593/) || [,'1'])[1]);
    const needAC = /\u52a0\u51b7\u6c23/.test(feeLine);
    const pcQty = Number((feeLine.match(/(\d+)\u53f0\u96fb\u8166/) || [,'0'])[1]);
    const baseName = slot.venue.replace(/\s*\(.*?\)/, '').trim();
    const rates = venueRates[baseName] || {};
    const { periods } = slot;

    // 日期按月份分組
    const monthOrder = [], monthDates = {};
    slot.dates.forEach(mDate => {
      const iso = parseMinguoToISO(mDate);
      const p = iso.split('-').map(Number);
      const mKey = `${p[0]-1911}\u5e74${String(p[1]).padStart(2,'0')}\u6708`;
      if (!monthDates[mKey]) { monthDates[mKey] = []; monthOrder.push(mKey); }
      monthDates[mKey].push(iso);
    });

    const totalDates = slot.dates.length;
    const acc = { '\u5834\u5730':0, '\u6e05\u6f54':0, '\u51b7\u6c23':0, '\u7167\u660e':0, '\u8a2d\u5099':0 };
    let slotFirst = true;

    monthOrder.forEach((mKey, mIdx) => {
      const n = monthDates[mKey].length;
      const isLast = mIdx === monthOrder.length - 1;
      const mf = {};
      ['\u5834\u5730','\u6e05\u6f54','\u51b7\u6c23','\u7167\u660e','\u8a2d\u5099'].forEach(k => {
        mf[k] = isLast ? feeAmts[k] - acc[k] : Math.round(feeAmts[k] * n / totalDates);
        acc[k] += mf[k];
      });

      const items = [];
      if ((rates.fee||0) > 0 || feeAmts['\u5834\u5730'] > 0)
        items.push({ name:'\u5834\u5730\u8cbb', calc:`NT$${rates.fee||'?'}/\u6642\u6bb5 \u00d7 ${periods}\u6642\u6bb5 \u00d7 ${qty}\u9593 \u00d7 ${n}\u65e5`, amt:mf['\u5834\u5730'] });
      if ((rates.clean||0) > 0 || feeAmts['\u6e05\u6f54'] > 0)
        items.push({ name:'\u6e05\u6f54\u8cbb', calc:`NT$${rates.clean||'?'}/\u6b21(\u5e73\u65e5)\u6216\u6bb5(\u5047\u65e5) \u00d7 ${qty}\u9593 \u00d7 ${n}\u65e5`, amt:mf['\u6e05\u6f54'] });
      if (needAC && ((rates.ac||0) > 0 || feeAmts['\u51b7\u6c23'] > 0))
        items.push({ name:'\u51b7\u6c23\u8cbb', calc:`NT$${rates.ac||'?'}/\u6642\u6bb5 \u00d7 ${periods}\u6642\u6bb5 \u00d7 ${qty}\u9593 \u00d7 ${n}\u65e5`, amt:mf['\u51b7\u6c23'] });
      if ((rates.light||0) > 0 || feeAmts['\u7167\u660e'] > 0)
        items.push({ name:'\u7167\u660e\u8cbb', calc:`NT$${rates.light||'?'}/\u6642\u6bb5 \u00d7 ${periods}\u6642\u6bb5 \u00d7 ${qty}\u9593 \u00d7 ${n}\u65e5`, amt:mf['\u7167\u660e'] });
      if (pcQty > 0 && ((rates.equip||0) > 0 || feeAmts['\u8a2d\u5099'] > 0))
        items.push({ name:'\u8a2d\u5099\u8cbb', calc:`NT$${rates.equip||'?'}/\u6642\u6bb5 \u00d7 ${periods}\u6642\u6bb5 \u00d7 ${pcQty}\u53f0 \u00d7 ${n}\u65e5`, amt:mf['\u8a2d\u5099'] });

      items.forEach((item, fi) => {
        tableData.push([
          fi === 0 && slotFirst ? mKey : '',
          fi === 0 ? slot.venue : '',
          item.name,
          item.calc,
          item.amt > 0 ? `NT$${item.amt.toLocaleString()}` : '-'
        ]);
        slotFirst = false;
      });
    });
  });

  deposits.forEach(dep => tableData.push(['', dep.venue, '\u4fdd\u8b49\u91d1', '\uff08\u6d3b\u52d5\u7d50\u675f\u5f8c\u7531\u5b78\u6821\u8fd4\u9084\uff09', `NT$${dep.amt.toLocaleString()}`]));
  if (parkingLine) tableData.push(['', '', '\u505c\u8eca\u5834\uff08\u9644\u52a0\uff09', parkingLine.replace('\ud83c\udd7f\ufe0f \u9644\u52a0\u505c\u8eca\u5305\u5834\uff1a','').trim(), '']);
  tableData.push(['\u5408\u8a08', '', '', '', `NT$${Number(finalPrice).toLocaleString()}`]);

  // 5. 在 Doc 找到佔位符並插入表格
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const found = body.findText('\\{\\{\u8a08\u8cbb\u660e\u7d30\u8868\u683c\\}\\}');
  if (!found) { doc.saveAndClose(); return; }
  const ph = found.getElement().getParent();
  const tIdx = body.getChildIndex(ph);
  ph.removeFromParent();
  const table = body.insertTable(tIdx, tableData);

  // 6. 表格樣式
  const numRows = table.getNumRows();
  for (let r = 0; r < numRows; r++) {
    const row = table.getRow(r);
    const isHeader = r === 0, isTotal = r === numRows - 1;
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      cell.editAsText().setFontSize(9);
      if (isHeader) {
        cell.setBackgroundColor('#2e7d52');
        cell.editAsText().setForegroundColor('#ffffff').setBold(true);
      } else if (isTotal) {
        cell.setBackgroundColor('#e8f5e9');
        cell.editAsText().setBold(true);
      } else if (r % 2 === 0) {
        cell.setBackgroundColor('#f7f7f7');
      }
    }
  }
  try { [58, 80, 62, 188, 75].forEach((w, c) => table.setColumnWidth(c, w)); } catch(e) {}
  doc.saveAndClose();
}

function generateSignPDF(templateId, folderId, fileName, replaceMap, modifiedUseSlots, modifiedFeeSlots, finalPrice, ss) {
  const folder = DriveApp.getFolderById(folderId);
  const copyDoc = DriveApp.getFileById(templateId).makeCopy(fileName, folder);
  const docId = copyDoc.getId();
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  for (const [key, value] of Object.entries(replaceMap)) body.replaceText(key, String(value));
  doc.saveAndClose();
  try {
    buildFeeTableInDoc(docId, modifiedUseSlots, modifiedFeeSlots, finalPrice, ss);
  } catch(e) {
    console.log('\u8cbb\u7528\u8868\u683c\u5efa\u7acb\u5931\u6557\uff0c\u6539\u7528\u6587\u5b57\u683c\u5f0f: ' + e.toString());
    try {
      const d2 = DocumentApp.openById(docId);
      d2.getBody().replaceText('\\{\\{\u8a08\u8cbb\u660e\u7d30\u8868\u683c\\}\\}', modifiedFeeSlots);
      d2.saveAndClose();
    } catch(e2) {}
  }
  const pdfBlob = copyDoc.getAs(MimeType.PDF);
  const finalPdf = folder.createFile(pdfBlob).setName(`${fileName}.pdf`);
  copyDoc.setTrashed(true);
  return finalPdf.getUrl();
}

function sendAdminNotification(ss, formData, slotString, uniqueVenues, pdfUrl) {
  try {
    let adminEmails = "";
    ss.getSheetByName('系統設定與文本').getDataRange().getValues().forEach(r => { if(String(r[0]) === '管理員接收信箱') adminEmails = String(r[1]); });
    if(!adminEmails || adminEmails.includes('參數值')) return;
    const html = `<h2 style="color:#059669;">🔔 新申請: ${formData.activityName}</h2><p>單位: ${formData.unit || '個人'}</p><p><a href="${pdfUrl}">📄 申請表PDF</a></p><p><a href="${ScriptApp.getService().getUrl()}?action=admin">前往審核</a></p>`;
    MailApp.sendEmail({ to: adminEmails, subject: `新申請: ${formData.activityName}`, htmlBody: html });
  } catch(e) {}
}

function sendChatWebhook(text) {
  try {
    const url = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL');
    if (url && !url.includes('未設定')) UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ "text": String(text) }) });
  } catch(e) {}
}

function sendConfirmationEmail(email, unit, actName, feeSlotsText, uuid, pdfUrl) {
  try {
    MailApp.sendEmail({ to: String(email), subject: `【中正國小】場地申請`, htmlBody: `已收到您的申請。<br><a href="${pdfUrl}">📄 下載申請表</a>` });
  } catch(e) {}
}

function handleCancel(uuid) {
  try {
    const sheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MAIN_SHEET_ID')).getSheetByName('申請紀錄');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(uuid) && data[i][24] === '審核中') {
        sheet.getRange(i + 1, 25).setValue('申請人取消');
        return HtmlService.createHtmlOutput('<h2 style="color:green; text-align:center; margin-top:50px;">✅ 您的申請已成功取消。</h2>');
      }
    }
    return HtmlService.createHtmlOutput('<h2 style="color:red; text-align:center;">⚠️ 找不到申請。</h2>');
  } catch(e) { return HtmlService.createHtmlOutput('錯誤'); }
}