/**
 * 🟩 Brian 智慧助手 v1.8.0 - 行事曆分流修復版
 * 更新重點：
 * 1. 從試算表動態讀取設定值（含四組行事曆 ID：家庭/活動/研習/金融）
 * 2. AI Prompt 全面升級：CALENDAR 為最高優先，支援長文本與多日期批次拆分
 * 3. handleCalendarAction_：依 calendarType 路由至正確行事曆
 * 4. 行事曆說明欄位自動填入完整活動資訊（摘要、地點、連結、備註）
 */

// 🟩🟩🟩 【模組一：系統設定區（從試算表第一工作表動態讀取）】 🟩🟩🟩
let _cfg = null;

function getConfig_() {
  if (_cfg) return _cfg;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; // 設定值位於第一個工作表
    const rows = sheet.getDataRange().getValues();
    const map = {};
    // 從第 2 列開始（跳過標題行 項目/設定值/說明）
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) map[String(rows[i][0]).trim()] = String(rows[i][1]).trim();
    }
    _cfg = {
      MY_USER_ID:     map['MY_USER_ID']   || '',
      GEMINI_API_KEY: map['AI_API_KEY']   || '',
      LINE_TOKEN:     map['LINE_TOKEN']   || '',
      CAL_REMINDERS:  [1440, 720],
      SHEETS:         { KNOWLEDGE: '知識倉庫', TASK: '待辦清單' },
      CALENDAR_IDS:   {
        FAMILY:   map['CALENDAR_ID_FAMILY']   || null,
        ACTIVITY: map['CALENDAR_ID_ACTIVITY'] || null,
        SEMINAR:  map['CALENDAR_ID_SEMINAR']  || null,
        FINANCE:  map['CALENDAR_ID_FINANCE']  || null
      }
    };
  } catch (e) {
    // 若試算表讀取失敗，退回硬編碼備用值
    console.error('getConfig_ fallback: ' + e.message);
    _cfg = {
      MY_USER_ID:     'U5054e83dc7ef76e9513c82088acde5be',
      GEMINI_API_KEY: '',
      LINE_TOKEN:     '',
      CAL_REMINDERS:  [1440, 720],
      SHEETS:         { KNOWLEDGE: '知識倉庫', TASK: '待辦清單' },
      CALENDAR_IDS:   { FAMILY: null, ACTIVITY: null, SEMINAR: null, FINANCE: null }
    };
  }
  return _cfg;
}

/**
 * 依 calendarType 字串取得對應的 Google 日曆物件。
 * 若找不到對應的日曆 ID 或 ID 無效，退回預設日曆。
 */
function getCalendarByType_(calendarType) {
  const ids = getConfig_().CALENDAR_IDS;
  let calId = null;
  switch ((calendarType || 'DEFAULT').toUpperCase()) {
    case 'SEMINAR':  calId = ids.SEMINAR;  break;
    case 'ACTIVITY': calId = ids.ACTIVITY; break;
    case 'FINANCE':  calId = ids.FINANCE;  break;
    case 'FAMILY':   calId = ids.FAMILY;   break;
  }
  if (calId) {
    try {
      const cal = CalendarApp.getCalendarById(calId);
      if (cal) return cal;
    } catch (e) {
      console.error('getCalendarByType_ failed for ' + calendarType + ': ' + e.message);
    }
  }
  return CalendarApp.getDefaultCalendar();
}

// 🟦🟦🟦 【模組二：分流路由器 / GATEWAY】 🟦🟦🟦
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Brian 數位大腦')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const cfg = getConfig_();
    const postData = JSON.parse(e.postData.contents);
    const event = postData.events[0];
    const replyToken = event.replyToken;

    if (event.source.userId !== cfg.MY_USER_ID) return;

    let userMessage = (event.message.type === 'text') ? event.message.text : '請分析圖片內容。';
    let imageBlob   = (event.message.type === 'image') ? fetchImageBlob_(event.message.id) : null;

    const aiResults = callGeminiBatch_(userMessage, imageBlob);
    if (!aiResults || aiResults.length === 0) {
      replyToLine_(replyToken, '❌ 抱歉老師，此訊息無法解析。');
      return;
    }

    let reportBody = '';
    aiResults.forEach((item, index) => {
      let resultStr = '';
      try {
        switch (item.intent) {
          case 'CALENDAR':       resultStr = handleCalendarAction_(item); break;
          case 'KNOWLEDGE_SAVE': resultStr = handleKnowledgeSave_(item); break;
          case 'TASK':           resultStr = handleTaskAction_(item);     break;
          default:               resultStr = `❓ 項目 ${index + 1} 類別不明。`;
        }
      } catch (err) { resultStr = `🚨 失敗：${err.message}`; }
      reportBody += `${index + 1}. ${resultStr}\n`;
    });

    replyToLine_(replyToken, `🛰️ Brian 秘書 報告：\n\n${reportBody.trim()}`);
  } catch (err) { console.error('Gateway Error: ' + err.message); }
}

// 🟨🟨🟨 【模組三：業務邏輯區 / SERVICES】 🟨🟨🟨

function handleTaskAction_(item) {
  const cfg = getConfig_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.SHEETS.TASK);
  const taskTitle = item.title.startsWith('[處理]') ? item.title : `[處理] ${item.title}`;

  sheet.appendRow([new Date(), taskTitle, item.summary || '', '未完成']);

  try {
    const task = {
      title: taskTitle,
      notes: item.summary || '來自 LINE 的行政任務',
      due:   new Date().toISOString()
    };
    Tasks.Tasks.insert(task, '@default');
    return `📋 已同步手機 Tasks：${taskTitle}`;
  } catch (e) {
    return `📋 已列入試算表(Tasks同步失敗)：${taskTitle}`;
  }
}

function handleCalendarAction_(item) {
  const cfg = getConfig_();
  const cal  = getCalendarByType_(item.calendarType);
  const calName = cal.getName();

  const start = new Date(item.startTime);
  const end   = new Date(item.endTime);
  const title = item.title || '未命名行程';

  // 重複檢查（前後 10 分鐘緩衝）
  const existing = cal.getEvents(
    new Date(start.getTime() - 600000),
    new Date(end.getTime()   + 600000),
    { search: title }
  );
  if (existing.length > 0) return `⚠️ 行程重複：${title}（日曆：${calName}）`;

  // 組合完整說明欄位（收納所有相關資訊）
  const descParts = [];
  if (item.summary)  descParts.push(`📝 摘要：${item.summary}`);
  if (item.location) descParts.push(`📍 地點：${item.location}`);
  if (item.url)      descParts.push(`🔗 連結：${item.url}`);
  if (item.notes)    descParts.push(`🗒️ 備註：${item.notes}`);
  descParts.push(`\n🤖 由 Brian 智慧助手自動建立`);
  const description = descParts.join('\n');

  const event = cal.createEvent(title, start, end, {
    description: description,
    location:    item.location || ''
  });
  cfg.CAL_REMINDERS.forEach(min => event.addPopupReminder(min));

  // 日曆類型標籤
  const typeLabels = {
    SEMINAR:  '📚 研習', ACTIVITY: '🏃 活動',
    FINANCE:  '💰 金融', FAMILY:   '🏠 家庭', DEFAULT: '📅 行程'
  };
  const typeLabel = typeLabels[((item.calendarType || 'DEFAULT').toUpperCase())] || '📅 行程';

  return `${typeLabel} 已排入：${title}（日曆：${calName}）`;
}

function handleKnowledgeSave_(item) {
  const cfg = getConfig_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.SHEETS.KNOWLEDGE);
  let thumb = '';
  if (item.url && item.url.includes('youtube.com')) {
    const vid = item.url.match(/v=([^&]+)/);
    if (vid) thumb = `https://img.youtube.com/vi/${vid[1]}/hqdefault.jpg`;
  }
  sheet.appendRow([
    new Date(), item.title, item.url,
    item.category || '資源庫',
    item.tags ? item.tags.join(',') : '',
    item.summary, 0, thumb
  ]);
  return `📚 已存入倉庫：${item.title}`;
}

// 🌐🌐🌐 【模組四：WEB 數據接口】 🌐🌐🌐

function getKnowledgeData() {
  const cfg = getConfig_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.SHEETS.KNOWLEDGE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map((r, i) => ({
    id: i + 2,
    time:     r[0] ? Utilities.formatDate(new Date(r[0]), 'GMT+8', 'yyyy/MM/dd') : '',
    title:    r[1], url:      r[2], category: r[3],
    tags:     r[4] ? r[4].split(',') : [],
    summary:  r[5], status:   r[6], thumb:    r[7]
  }));
}

function updateStatus(rowId, newStatus) {
  const cfg = getConfig_();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.SHEETS.KNOWLEDGE).getRange(rowId, 7).setValue(newStatus);
  return true;
}

function convertToTaskFromWeb(rowId) {
  const cfg = getConfig_();
  const knSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(cfg.SHEETS.KNOWLEDGE);
  const data = knSheet.getRange(rowId, 1, 1, 6).getValues()[0];
  handleTaskAction_({ title: data[1], summary: data[5], intent: 'TASK' });
  knSheet.getRange(rowId, 7).setValue(1);
  return '任務已發射！';
}

// 🛠️🛠️🛠️ 【模組五：核心工具箱】 🛠️🛠️🛠️

function callGeminiBatch_(userMessage, imageBlob) {
  const cfg = getConfig_();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cfg.GEMINI_API_KEY}`;

  const systemInstruction = `你是 Brian 老師的行政秘書。請嚴格依照以下分流規則，將訊息內容解析為 JSON 陣列輸出。

【分流規則 - 嚴格按照優先順序判斷，不可跳躍】

▶ 規則 0（最高優先）CALENDAR：
訊息中只要含有「明確的未來日期或時間資訊」（例如：年/月/日、幾月幾日、星期X、時:分），
無論訊息多長、包含多少說明文字或售點介紹，一律判定為 CALENDAR。
✅ 多日期規則（重要）：若一段訊息含有多個不同日期時間，必須拆解為多個獨立的 CALENDAR 物件，每個日期各自一筆，不可合併。
✅ calendarType 依照活動性質選擇其一：
  - "SEMINAR"  → 含「課程、研習、工作坊、講座、研討、上課、培訓、教育、學習」等
  - "ACTIVITY" → 含「活動、登錄、登記、比賽、社團、運動、表演、集會、出席、委員會」等
  - "FINANCE"  → 含「銀行、金融、刷卡、財務、理財、繳費、投資、費用、帳款」等
  - "FAMILY"   → 含「家庭、家人、家族、親子、家長」等
  - "DEFAULT"  → 其餘所有行事曆事項
✅ 必填欄位：intent, title, startTime(ISO8601，含時區+08:00), endTime(ISO8601，無結束時間則自動+1小時), summary(詳細內容摘要，含售點/說明等原始資訊), location, calendarType
✅ 選填欄位：notes（其他補充，如費用、主講人、報名資訊等）

▶ 規則 1 KNOWLEDGE_SAVE：
訊息含有 URL，且屬於知識型教學資源，且不含明確未來日期時間。
必填欄位：intent, title, url, category, tags(陣列), summary

▶ 規則 2（最低優先）TASK：
完全不含日期時間、不含 URL，且為需要跟進處理的行政任務（如學生問題、家長詢問、物品遺失）。
必填欄位：intent, title, summary
標題格式：「[處理] + 動作 + 對象」

輸出格式：純 JSON 陣列，不含任何 markdown 標記或說明文字。`;

  let parts = [{ text: userMessage }];
  if (imageBlob) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: Utilities.base64Encode(imageBlob.getBytes()) } });
  }

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents:           [{ parts: parts }],
    generationConfig:   { response_mime_type: 'application/json' }
  };

  const res     = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
  const aiText  = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
  return JSON.parse(aiText.match(/\[[\s\S]*\]/)[0]);
}

function replyToLine_(token, msg) {
  const cfg = getConfig_();
  const options = {
    method:      'post',
    contentType: 'application/json',
    headers:     { Authorization: 'Bearer ' + cfg.LINE_TOKEN },
    payload:     JSON.stringify({ replyToken: token, messages: [{ type: 'text', text: msg }] })
  };
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', options);
}

function fetchImageBlob_(id) {
  const cfg = getConfig_();
  return UrlFetchApp.fetch(
    `https://api-data.line.me/v2/bot/message/${id}/content`,
    { headers: { Authorization: 'Bearer ' + cfg.LINE_TOKEN } }
  ).getBlob();
}