/**
 * ============================================================================
 * 高雄市中正國小 總務處智慧業務推播與追蹤管理系統 — Code.gs (v3.3.1 正式版)
 * ============================================================================
 * 依據計畫書《中正國小總務處_智慧業務追蹤與多通道推播系統_系統設計與GAS部署開發計畫書_v3.3.1.md》
 * 包含完整後端 API 指引、試算表資料庫自動遷移 (Schema Migration)、多通道推播與 RWD Web App 控制器
 *
 * 【主要導出方法 (GAS API Specifications)】
 * 1. getDashboardData()        : 取得完整專案、常規範本與各組推播配置 JSON
 * 2. updateSubtaskStatus(...)  : 更新個別子任務狀態、進度回報說明與時間戳
 * 3. createDirectorSubtask(...)  : 主任交辦/新增個別組別子任務
 * 4. savePushConfiguration(...)  : 儲存各組推播管道勾選設定 (LINE/Chat/Email)
 * 5. redeployPeriodicProject(...) : 一鍵將週期常規範本轉入當年度名冊執行
 * 6. runDailyPushEngine()       : 每日 08:00 自動推播排程引擎
 * 7. triggerManualPushNotify()  : 立即執行測試與手動推播匯報
 * 8. initSpreadsheetSchema()    : 初始建立/重置 3 大關聯資料表與範本庫
 */

const SHEET_PROJECTS    = "Projects";
const SHEET_SUBTASKS    = "SubTasks";
const SHEET_PUSH_CONFIG = "PushConfig";
const PARENT_DRIVE_FOLDER_ID = ""; // 若留空，預設於 Google Drive 根目錄建立

/**
 * Google Sheets 開啟時建立自訂選單
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏢 總務處智慧追蹤與推播 (v3.3.1)")
    .addItem("🖥️ 1. 在此試算表直接開啟「決策戰情室」視窗", "openDashboardModal")
    .addItem("🌐 2. 顯示獨立 Web App 專屬線上網址", "showWebAppUrlDialog")
    .addSeparator()
    .addItem("🚀 3. 初始化/重置資料表綱要與內建範本 (initSpreadsheetSchema)", "initSpreadsheetSchema")
    .addSeparator()
    .addItem("📲 4. 立即執行多通道到期推播 (runDailyPushEngine)", "runDailyPushEngine")
    .addItem("🔄 5. 手動觸發推播總匯報測試", "triggerManualPushNotify")
    .addSeparator()
    .addItem("📁 6. 為目前選定任務建立專屬 Drive 卷宗", "createTaskDriveFolder")
    .addToUi();
}

/**
 * 在 Google Sheets 中以對話框直接開啟完整 RWD 決策戰情室 (免跳轉、無多帳號衝突)
 */
function openDashboardModal() {
  const template = HtmlService.createTemplateFromFile("DirectorDashboard");
  const html = template.evaluate()
    .setTitle("中正國小總務處 — 決策戰情室 [系統版本: v3.3.1]")
    .setWidth(1300)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, "🏢 中正國小總務處 — 智慧決策戰情室 [v3.3.1]");
}

/**
 * 顯示專屬 Web App 網址與多帳號登入故障排除指南
 */
function showWebAppUrlDialog() {
  const webAppUrl = "https://script.google.com/macros/s/AKfycbz0oHwAARVJ4JmMT53sepSOF_nxEktVxeDhqzcswdom8KbvKDG7BSHG0aZ1JVZSrzs-/exec";
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 15px; color: #1f2937;">
      <h3 style="margin-top: 0; color: #1d4ed8;">🌐 決策戰情室獨立網址</h3>
      <p>請複製下方乾淨網址（不含 <code>/u/1/</code>），或於瀏覽器以預設帳號開啟：</p>
      <input type="text" value="${webAppUrl}" readonly style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 12px;" onclick="this.select();" />
      <p style="font-size: 12px; color: #b91c1c; background: #fef2f2; padding: 10px; border-radius: 6px; border-left: 4px solid #ef4444;">
        <b>⚠️ 顯示「目前無法開啟這個檔案」的兩大原因與解法：</b><br/>
        1. <b>多帳號衝突</b>：Google 瀏覽器若同時登入多個帳號，網址會被改寫成 <code>/u/1/</code> 導致 Google 巨集拒絕。建議用<b>右鍵 > 無痕視窗</b>開啟，或直接於此試算表選單點擊<b>【1. 在此試算表直接開啟「決策戰情室」視窗】</b>！<br/>
        2. <b>首次授權</b>：請先在上方選單點擊一次<b>【3. 初始化/重置資料表綱要】</b>，彈出授權視窗時完成授權（選擇帳號 > 進階 > 允許 access），完成授權後 Web App 即恢復正常！
      </p>
      <div style="text-align: right; margin-top: 15px;">
        <a href="${webAppUrl}" target="_blank" style="background: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold;">立即在瀏覽器開啟 ↗</a>
      </div>
    </div>
  `;
  const html = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(540)
    .setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, "🌐 系統獨立網址與說明");
}

/**
 * Web App GET 端點 — 渲染純淨全平台 RWD 響應式決策戰情室
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile("DirectorDashboard");
  const output = template.evaluate();
  output.setTitle("中正國小總務處 — 智慧主副欄決策戰情室 [系統版本: v3.3.1]");
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  output.addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
  return output;
}

/**
 * Web App POST 端點 — 供外部或極簡行動表單非同步 JSON 呼叫
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "updateSubtask") {
      const res = updateSubtaskStatus(data.projId, data.taskId, data.done, data.report, data.note, data.dueDate);
      return createJsonResponse_({ success: true, result: res });
    } else if (action === "createSubtask") {
      const res = createDirectorSubtask(data);
      return createJsonResponse_({ success: true, result: res });
    }
    return createJsonResponse_({ success: false, error: "未知的指令動作: " + action });
  } catch (err) {
    return createJsonResponse_({ success: false, error: err.toString() });
  }
}

function createJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================================
 * 核心 API 1: 取得完整專案與子任務關聯資料樹 (給前端 HTML 初始化與重載使用)
 * ============================================================================
 * @returns {Object} { projects: [...], periodicTemplates: [...], pushConfig: {...} }
 */
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetProjects = ss.getSheetByName(SHEET_PROJECTS);
  let sheetSubtasks = ss.getSheetByName(SHEET_SUBTASKS);
  let sheetPushConfig = ss.getSheetByName(SHEET_PUSH_CONFIG);

  // 若試算表尚未建立資料庫，則自動執行初始化
  if (!sheetProjects || !sheetSubtasks || !sheetPushConfig) {
    initSpreadsheetSchema();
    sheetProjects = ss.getSheetByName(SHEET_PROJECTS);
    sheetSubtasks = ss.getSheetByName(SHEET_SUBTASKS);
    sheetPushConfig = ss.getSheetByName(SHEET_PUSH_CONFIG);
  }

  // 1. 讀取 SubTasks
  const subtasksData = sheetSubtasks.getDataRange().getValues();
  const subtaskMap = {}; // projId -> { section -> [tasks...] }

  for (let i = 1; i < subtasksData.length; i++) {
    const row = subtasksData[i];
    const taskId = String(row[0] || "").trim();
    const projId = String(row[1] || "").trim();
    if (!taskId || !projId) continue;

    const section = String(row[2] || "事務組").trim();
    const taskText = String(row[3] || "").trim();
    const dueDate = formatDateVal_(row[4]);
    const done = isTrueVal_(row[5]);
    const note = String(row[6] || "").trim();
    const report = String(row[7] || "").trim();
    const reportTime = String(row[8] || "").trim();

    if (!subtaskMap[projId]) subtaskMap[projId] = {};
    if (!subtaskMap[projId][section]) subtaskMap[projId][section] = [];

    subtaskMap[projId][section].push({
      id: taskId,
      task: taskText,
      dueDate: dueDate,
      done: done,
      note: note,
      report: report,
      reportTime: reportTime
    });
  }

  // 2. 讀取 Projects 與週期常規範本
  const projectsData = sheetProjects.getDataRange().getValues();
  const projects = [];
  const periodicTemplates = [];

  for (let i = 1; i < projectsData.length; i++) {
    const row = projectsData[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    const title = String(row[1] || "").trim();
    const category = String(row[2] || "大額工程").trim();
    const priority = parseInt(row[3], 10) || 2;
    const deadline = formatDateVal_(row[4]);
    const isFocus = isTrueVal_(row[5]);
    const sectionsRaw = String(row[6] || "[]").trim();
    let sections = [];
    try {
      sections = JSON.parse(sectionsRaw);
    } catch(e) {
      sections = sectionsRaw.split(",").map(s => s.trim()).filter(Boolean);
    }
    const folderUrl = String(row[7] || "").trim() || "file:///H:/我的雲端硬碟/++++總務主任";

    const item = {
      id: id,
      title: title,
      category: category,
      priority: priority,
      deadline: deadline,
      daysLeft: calculateDaysLeft_(deadline),
      isFocus: isFocus,
      collapsed: false,
      sections: sections,
      sectionTasks: subtaskMap[id] || {},
      folderUrl: folderUrl
    };

    // 判斷為週期常規或年度專案
    if (id.startsWith("PER-") || category.indexOf("週期常規") >= 0) {
      item.cycle = "每年固定期程檢核";
      periodicTemplates.push(item);
    } else {
      projects.push(item);
    }
  }

  // 3. 讀取 PushConfig
  const configData = sheetPushConfig.getDataRange().getValues();
  const pushConfig = {};

  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const section = String(row[0] || "").trim();
    if (!section) continue;

    pushConfig[section] = {
      line: isTrueVal_(row[1]),
      lineToken: String(row[2] || "").trim(),
      chat: isTrueVal_(row[3]),
      chatWebhook: String(row[4] || "").trim(),
      email: isTrueVal_(row[5]),
      emailAddr: String(row[6] || "").trim(),
      thresholdDays: parseInt(row[7], 10) || 5
    };
  }

  // 確保 5 大責任組別配置皆存在
  const defaultSections = ["事務組", "出納組", "文書組", "事務幹事", "總務主任"];
  defaultSections.forEach(sec => {
    if (!pushConfig[sec]) {
      pushConfig[sec] = {
        line: true,
        lineToken: "",
        chat: false,
        chatWebhook: "",
        email: true,
        emailAddr: "",
        thresholdDays: 5
      };
    }
  });

  return {
    projects: projects,
    periodicTemplates: periodicTemplates,
    pushConfig: pushConfig
  };
}

/**
 * ============================================================================
 * 核心 API 2: 更新子任務狀態、報告與期限 (同步寫回 Google Sheets)
 * ============================================================================
 */
function updateSubtaskStatus(projId, taskId, isDone, report, note, dueDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_SUBTASKS);
  if (!ws) return { success: false, error: "找不到 SubTasks 工作表" };

  const values = ws.getDataRange().getValues();
  const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(taskId).trim() &&
        String(values[i][1]).trim() === String(projId).trim()) {
      
      const rowIdx = i + 1;
      ws.getRange(rowIdx, 6).setValue(isDone ? "TRUE" : "FALSE"); // Column F: done

      if (report !== undefined && report !== null) {
        ws.getRange(rowIdx, 8).setValue(String(report).trim());   // Column H: report
        ws.getRange(rowIdx, 9).setValue(nowStr);                  // Column I: reportTime
      }
      if (note !== undefined && note !== null) {
        ws.getRange(rowIdx, 7).setValue(String(note).trim());     // Column G: note
      }
      if (dueDate !== undefined && dueDate !== null && String(dueDate).trim() !== "") {
        ws.getRange(rowIdx, 5).setValue(String(dueDate).trim());  // Column E: dueDate
      }

      return { success: true, taskId: taskId, updatedTime: nowStr };
    }
  }

  return { success: false, error: `未在資料庫找到 taskID = ${taskId}` };
}

/**
 * ============================================================================
 * 核心 API 3: 主任交辦 / 派發新增子任務 (新增至 SubTasks 並同步 Projects)
 * ============================================================================
 */
function createDirectorSubtask(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wsSub = ss.getSheetByName(SHEET_SUBTASKS);
  const wsProj = ss.getSheetByName(SHEET_PROJECTS);
  if (!wsSub || !wsProj) return { success: false, error: "找不到資料表" };

  const projId = String(payload.projId || "").trim();
  const section = String(payload.section || "事務組").trim();
  const taskText = String(payload.taskText || "").trim();
  const dueDate = String(payload.dueDate || formatDateVal_(new Date())).trim();
  const note = String(payload.note || "").trim();

  // 產生子任務編號 (例如 t1-7)
  const subValues = wsSub.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < subValues.length; i++) {
    if (String(subValues[i][1]).trim() === projId) count++;
  }
  const projNum = projId.replace(/\D/g, "") || "99";
  const newTaskId = `t${projNum}-${count + 1}`;

  // 寫入 SubTasks 新列
  wsSub.appendRow([
    newTaskId,
    projId,
    section,
    taskText,
    dueDate,
    "FALSE",
    note,
    "",
    ""
  ]);

  // 確認專案 sections 中是否有該組別，若無則增加
  const projValues = wsProj.getDataRange().getValues();
  for (let i = 1; i < projValues.length; i++) {
    if (String(projValues[i][0]).trim() === projId) {
      let sections = [];
      try {
        sections = JSON.parse(projValues[i][6]);
      } catch (e) {
        sections = String(projValues[i][6]).split(",").map(s => s.trim()).filter(Boolean);
      }
      if (sections.indexOf(section) === -1) {
        sections.push(section);
        wsProj.getRange(i + 1, 7).setValue(JSON.stringify(sections));
      }
      break;
    }
  }

  // 立即發送即時推播通知組長
  sendSingleTaskNotify_(projId, newTaskId, section, taskText, dueDate, note);

  return { success: true, taskId: newTaskId, projId: projId };
}

/**
 * ============================================================================
 * 核心 API 4: 儲存各組推播管道配置 (同步更新 PushConfig 表)
 * ============================================================================
 */
function savePushConfiguration(configPayload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_PUSH_CONFIG);
  if (!ws) return { success: false, error: "找不到 PushConfig 表" };

  const values = ws.getDataRange().getValues();
  const rowMap = {};
  for (let i = 1; i < values.length; i++) {
    rowMap[String(values[i][0]).trim()] = i + 1;
  }

  const sections = Object.keys(configPayload);
  sections.forEach(sec => {
    const c = configPayload[sec];
    if (rowMap[sec]) {
      const rowIdx = rowMap[sec];
      ws.getRange(rowIdx, 2).setValue(c.line ? "TRUE" : "FALSE");
      ws.getRange(rowIdx, 4).setValue(c.chat ? "TRUE" : "FALSE");
      ws.getRange(rowIdx, 6).setValue(c.email ? "TRUE" : "FALSE");
      if (c.thresholdDays !== undefined) {
        ws.getRange(rowIdx, 8).setValue(parseInt(c.thresholdDays, 10) || 5);
      }
    } else {
      ws.appendRow([
        sec,
        c.line ? "TRUE" : "FALSE",
        c.lineToken || "",
        c.chat ? "TRUE" : "FALSE",
        c.chatWebhook || "",
        c.email ? "TRUE" : "FALSE",
        c.emailAddr || "",
        parseInt(c.thresholdDays, 10) || 5
      ]);
    }
  });

  return { success: true };
}

/**
 * ============================================================================
 * 核心 API 5: 一鍵重新部署學期週期常規專案 (將 PER-xx 複製至年度專案清單)
 * ============================================================================
 */
function redeployPeriodicProject(tempId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wsProj = ss.getSheetByName(SHEET_PROJECTS);
  const wsSub = ss.getSheetByName(SHEET_SUBTASKS);
  if (!wsProj || !wsSub) return { success: false, error: "資料表不存在" };

  const data = getDashboardData();
  const temp = data.periodicTemplates.find(p => p.id === tempId);
  if (!temp) return { success: false, error: `找不到代號為 ${tempId} 的常規範本` };

  // 計算新專案編號 (例如 PRJ-10)
  const existingNums = data.projects
    .map(p => parseInt(p.id.replace(/\D/g, ""), 10))
    .filter(n => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max.apply(null, existingNums) + 1 : 10;
  const newProjId = `PRJ-${nextNum < 10 ? "0" + nextNum : nextNum}`;

  // 新到期日為今日起算 30 天後
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const newDeadline = formatDateVal_(futureDate);

  // 寫入 Projects
  wsProj.appendRow([
    newProjId,
    `[115學年度] ${temp.title}`,
    "年度重點專案",
    temp.priority || 1,
    newDeadline,
    "TRUE",
    JSON.stringify(temp.sections || []),
    "file:///H:/我的雲端硬碟/++++總務主任/年度專案"
  ]);

  // 寫入對應 SubTasks
  let taskCounter = 1;
  const sections = temp.sections || [];
  sections.forEach(sec => {
    const taskList = temp.sectionTasks[sec] || [];
    taskList.forEach(t => {
      const newTaskId = `t${nextNum}-${taskCounter++}`;
      wsSub.appendRow([
        newTaskId,
        newProjId,
        sec,
        t.task,
        t.dueDate || newDeadline,
        "FALSE",
        t.note || "",
        "",
        ""
      ]);
    });
  });

  return {
    success: true,
    newProjId: newProjId,
    title: `[115學年度] ${temp.title}`,
    deadline: newDeadline
  };
}

/**
 * ============================================================================
 * 核心 API 6: 每日 08:00 晨間自動推播排程引擎
 * ============================================================================
 * 建議於 GAS Triggers 綁定為每日上午 08:00~09:00 執行
 */
function runDailyPushEngine() {
  const data = getDashboardData();
  const pushConfig = data.pushConfig || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let notifyCount = 0;
  const summaryBySection = {};

  data.projects.forEach(proj => {
    const sections = proj.sections || [];
    sections.forEach(sec => {
      const taskList = proj.sectionTasks[sec] || [];
      taskList.forEach(t => {
        if (t.done) return;

        const dlDays = calculateDaysLeft_(t.dueDate);
        const threshold = (pushConfig[sec] && pushConfig[sec].thresholdDays) ? pushConfig[sec].thresholdDays : 5;

        // 若距期限小於或等於門檻日，或是 P1 焦點案件，列入通報
        if (dlDays <= threshold || proj.priority === 1) {
          if (!summaryBySection[sec]) summaryBySection[sec] = [];
          summaryBySection[sec].push({
            projTitle: proj.title,
            taskId: t.id,
            taskText: t.task,
            dueDate: t.dueDate,
            daysLeft: dlDays,
            note: t.note
          });
          notifyCount++;
        }
      });
    });
  });

  // 依組別分送通知
  Object.keys(summaryBySection).forEach(sec => {
    const items = summaryBySection[sec];
    if (items.length === 0) return;

    const cfg = pushConfig[sec] || {};
    const textMsg = buildSectionNotifyText_(sec, items);

    // 1. LINE Notify
    if (cfg.line && cfg.lineToken) {
      sendLineNotify_(cfg.lineToken, textMsg);
    }
    // 2. Google Chat Webhook
    if (cfg.chat && cfg.chatWebhook) {
      sendGoogleChatWebhook_(cfg.chatWebhook, textMsg);
    }
    // 3. Email
    if (cfg.email && cfg.emailAddr) {
      sendEmailNotify_(cfg.emailAddr, `【總務處期程警示】${sec} 共有 ${items.length} 項待辦業務即將到期`, textMsg);
    }
  });

  Logger.log(`每日晨間多通道自動推播執行完畢，發報共 ${notifyCount} 項任務。`);
  return { success: true, count: notifyCount, summary: summaryBySection };
}

/**
 * 立即測試多通道推播總匯報
 */
function triggerManualPushNotify() {
  const res = runDailyPushEngine();
  return {
    success: true,
    message: `📲 已成功發射多通道推播總匯報！共發布 ${res.count} 項待辦警示至各組通知頻道。`
  };
}

/**
 * ============================================================================
 * 自動化試算表初始化與 Schema 建立 (initSpreadsheetSchema)
 * ============================================================================
 */
function initSpreadsheetSchema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 建立 / 格式化 Projects 工作表
  let wsProj = ss.getSheetByName(SHEET_PROJECTS);
  if (!wsProj) {
    wsProj = ss.insertSheet(SHEET_PROJECTS);
  } else {
    wsProj.clear();
  }
  const projHeaders = ["id", "title", "category", "priority", "deadline", "isFocus", "sections", "folderUrl"];
  wsProj.appendRow(projHeaders);
  formatHeaderRow_(wsProj, projHeaders.length);

  const sampleProjects = [
    ["PRJ-01", "仁愛樓東棟老舊廁所整修工程發包", "大額工程", 1, "2026-07-14", "TRUE", '["事務組","事務幹事","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/採購業務"],
    ["PRJ-02", "四維樓無障礙坡道及扶手新建工程", "大額工程", 1, "2026-07-13", "TRUE", '["事務組","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/修繕工程"],
    ["PRJ-03", "全校高低壓電力系統及消防設備檢修", "安全消防", 1, "2026-07-20", "TRUE", '["事務組","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/消防安全"],
    ["PRJ-04", "115學年度中央廚房午餐食材供應採購", "年度招標", 2, "2026-07-25", "FALSE", '["事務組","出納組"]', "file:///H:/我的雲端硬碟/++++總務主任/午餐專案"],
    ["PRJ-05", "全校冷氣電費雲端監控與分卡結算系統", "財務經費", 2, "2026-07-18", "FALSE", '["出納組","事務幹事"]', "file:///H:/我的雲端硬碟/++++總務主任/經費核銷"],
    ["PRJ-06", "115學年度第1學期教科書進貨點收與配發", "行政事務", 3, "2026-08-15", "FALSE", '["文書組","事務幹事"]', "file:///H:/我的雲端硬碟/++++總務主任/文書檔案"],
    ["PER-01", "新學期開學前校園安全檢查與環境整備", "週期常規 (學期)", 1, "2026-08-25", "TRUE", '["事務組","出納組","文書組","事務幹事"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"],
    ["PER-02", "年度校園通學步道與大型樹木修剪防颱專案", "週期常規 (年度)", 1, "2026-08-01", "TRUE", '["事務組","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"],
    ["PER-03", "全校不動產、土地與校有財產年度大盤點", "週期常規 (年度)", 2, "2026-07-15", "TRUE", '["事務組","出納組","事務幹事"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"],
    ["PER-04", "國家防災日複合式地震與消防避難疏散演練", "週期常規 (學期)", 1, "2026-09-21", "TRUE", '["事務組","文書組","事務幹事"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"],
    ["PER-05", "寒暑假校園高低壓電力檢測與消防安全申報", "週期常規 (半年)", 1, "2026-05-30", "TRUE", '["事務組","事務幹事","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"],
    ["PER-06", "學期末教職員學雜費鐘點費與各項補助核銷結案", "週期常規 (每學期)", 2, "2026-07-15", "TRUE", '["出納組","文書組","總務主任"]', "file:///H:/我的雲端硬碟/++++總務主任/常規專案"]
  ];
  sampleProjects.forEach(r => wsProj.appendRow(r));

  // 2. 建立 / 格式化 SubTasks 工作表
  let wsSub = ss.getSheetByName(SHEET_SUBTASKS);
  if (!wsSub) {
    wsSub = ss.insertSheet(SHEET_SUBTASKS);
  } else {
    wsSub.clear();
  }
  const subHeaders = ["taskId", "projId", "section", "taskText", "dueDate", "done", "note", "report", "reportTime"];
  wsSub.appendRow(subHeaders);
  formatHeaderRow_(wsSub, subHeaders.length);

  const sampleSubtasks = [
    ["t1-1", "PRJ-01", "事務組", "辦理第3次減項招標公告", "2026-07-01", "TRUE", "本次招標含教育部核定專款，公告日數不得縮短", "已正式公告於政府電子採購網，標案編號 1150701-A，等標期 12 天", "115/07/01 14:30"],
    ["t1-2", "PRJ-01", "事務組", "辦理開標作業與投標廠商資格審查", "2026-07-14", "FALSE", "⚠️ 需會同主計與政風室主任共同監辦，嚴格審查三用文件與押標金", "目前已領標 5 家廠商，預定於 07/14 上午 10:00 準時開標", "115/07/11 16:00"],
    ["t1-3", "PRJ-01", "事務組", "若不幸再次流標，協調建築師重新計算工資與工法", "2026-07-18", "FALSE", "", "", ""],
    ["t1-4", "PRJ-01", "事務幹事", "準備開標場地、投標清冊與審標表格", "2026-07-13", "TRUE", "", "開標室廣播與投影錄影設備已確認測試完畢", "115/07/13 11:20"],
    ["t1-5", "PRJ-01", "事務幹事", "將招標紀錄及公文函件歸檔至採購業務卷宗", "2026-07-15", "FALSE", "", "", ""],
    ["t1-6", "PRJ-01", "總務主任", "主持開標會議並確認決標或流標應變計畫", "2026-07-14", "FALSE", "請掌握工程發包進度，開標後立即向校長口頭回報結果", "將會同政風室主任與主計人員共同監辦", "115/07/12 09:15"],
    ["t2-1", "PRJ-02", "事務組", "檢視坡道面層止滑係數與扶手連續性", "2026-07-10", "TRUE", "", "現場檢測止滑係數符合建築技術規則 BSR 等級", "115/07/10 15:00"],
    ["t2-2", "PRJ-02", "事務組", "辦理竣工結算與正式初驗作業", "2026-07-13", "FALSE", "請務必量測無障礙斜率比例是否符合 1:12", "已聯絡監造技師及營造廠於 7/13 下午現場勘查", "115/07/11 09:00"],
    ["t2-3", "PRJ-02", "總務主任", "確認特教老師與輪椅學生實際試行反饋", "2026-07-13", "FALSE", "", "已與輔導處特教組約定試行時間", "115/07/09 11:00"],
    ["p1-1", "PER-01", "事務組", "各班級課桌椅檢查修繕與調撥", "2026-08-22", "FALSE", "務必檢查椅腳橡膠墊", "", ""],
    ["p1-2", "PER-01", "事務組", "全校飲水機水質送驗及濾心更換維護", "2026-08-25", "FALSE", "水質報告須公佈於飲水機前", "", ""],
    ["p1-3", "PER-01", "事務組", "校園周邊通學步道及無障礙設施檢視", "2026-08-26", "FALSE", "", "", ""],
    ["p1-4", "PER-01", "出納組", "設定新學期註冊繳費模組與四合一單據", "2026-08-20", "FALSE", "", "", ""],
    ["p1-5", "PER-01", "文書組", "完成校務會議及總務通知公文派送", "2026-08-27", "FALSE", "", "", ""],
    ["p1-6", "PER-01", "事務幹事", "檢查綠色採購年度執行百分比與申報", "2026-08-28", "FALSE", "", "", ""],
    ["p2-1", "PER-02", "事務組", "會勘全校高大枯死危木與外圍喬木", "2026-07-20", "FALSE", "需拍攝施工前照片", "", ""],
    ["p2-2", "PER-02", "事務組", "完成採購修剪招標及高空車作業安全警示", "2026-07-30", "FALSE", "", "", ""],
    ["p2-3", "PER-02", "總務主任", "現場勘查修剪品質與確認交通維持計畫", "2026-08-01", "FALSE", "", "", ""],
    ["p3-1", "PER-03", "事務組", "編印全校各班級及專科教室財產盤點表", "2026-06-25", "FALSE", "", "", ""],
    ["p3-2", "PER-03", "事務組", "實地現場抽查電腦及視聽設備與報廢審認", "2026-07-05", "FALSE", "逾齡毀損已無利用價值者列報廢", "", ""],
    ["p3-3", "PER-03", "出納組", "核扣相關設備保固金帳務清算", "2026-07-10", "FALSE", "", "", ""],
    ["p3-4", "PER-03", "事務幹事", "登錄高雄市財產管理系統報表與標籤補貼", "2026-07-15", "FALSE", "", "", ""],
    ["p4-1", "PER-04", "事務組", "警報廣播與不斷電系統及備用發電機測試", "2026-09-15", "FALSE", "", "", ""],
    ["p4-2", "PER-04", "事務組", "校園疏散動線障礙物清除與大門引導協調", "2026-09-18", "FALSE", "", "", ""],
    ["p4-3", "PER-04", "文書組", "協調教務處學務處發布相關演練公文通知", "2026-09-10", "FALSE", "", "", ""],
    ["p4-4", "PER-04", "事務幹事", "製作各分流集結點避難路線看板及簽到表", "2026-09-19", "FALSE", "", "", ""],
    ["p5-1", "PER-05", "事務組", "委託合格機電技師檢驗全校高低壓變壓設備", "2026-05-15", "FALSE", "檢驗報告需申報台電與上傳局網", "", ""],
    ["p5-2", "PER-05", "事務組", "消防檢修申報及消防局安檢複驗複查", "2026-05-25", "FALSE", "", "", ""],
    ["p5-3", "PER-05", "事務幹事", "整理歷次電力與消防檢驗簽呈歸檔", "2026-05-28", "FALSE", "", "", ""],
    ["p5-4", "PER-05", "總務主任", "督導修繕不合格項目並確認法規零裁罰", "2026-05-30", "FALSE", "", "", ""],
    ["p6-1", "PER-06", "出納組", "發放學期終導師費、課後照顧與活動社團鐘點費", "2026-07-05", "FALSE", "需確認各組上傳時數扣繳無誤", "", ""],
    ["p6-2", "PER-06", "出納組", "辦理各項就學補助及代辦費結餘款退款轉帳", "2026-07-10", "FALSE", "", "", ""],
    ["p6-3", "PER-06", "文書組", "學期檔案卷宗年度大編目與移送檔案室裝訂", "2026-07-15", "FALSE", "", "", ""],
    ["p6-4", "PER-06", "總務主任", "期末經費執行率檢討與新學期預算調配會議", "2026-07-20", "FALSE", "", "", ""]
  ];
  sampleSubtasks.forEach(r => wsSub.appendRow(r));

  // 3. 建立 / 格式化 PushConfig 工作表
  let wsPush = ss.getSheetByName(SHEET_PUSH_CONFIG);
  if (!wsPush) {
    wsPush = ss.insertSheet(SHEET_PUSH_CONFIG);
  } else {
    wsPush.clear();
  }
  const pushHeaders = ["section", "enableLine", "lineToken", "enableChat", "chatWebhook", "enableEmail", "emailAddr", "thresholdDays"];
  wsPush.appendRow(pushHeaders);
  formatHeaderRow_(wsPush, pushHeaders.length);

  const samplePushConfig = [
    ["事務組", "TRUE", "", "TRUE", "", "FALSE", "affairs@ccps.kh.edu.tw", 5],
    ["出納組", "TRUE", "", "FALSE", "", "TRUE", "cashier@ccps.kh.edu.tw", 5],
    ["文書組", "TRUE", "", "TRUE", "", "TRUE", "doc@ccps.kh.edu.tw", 5],
    ["事務幹事", "TRUE", "", "TRUE", "", "FALSE", "clerk@ccps.kh.edu.tw", 5],
    ["總務主任", "TRUE", "", "TRUE", "", "TRUE", "director@ccps.kh.edu.tw", 5]
  ];
  samplePushConfig.forEach(r => wsPush.appendRow(r));

  return "✅ 資料庫 initialization 成功！已建立 Projects, SubTasks, PushConfig 三大核心表格與範本資料。";
}

/**
 * 試算表選單輔助方法：自動為選取的專案建立 Drive 目錄
 */
function createTaskDriveFolder() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getActiveSheet();
  if (ws.getName() !== SHEET_PROJECTS) {
    SpreadsheetApp.getUi().alert("請在「Projects」工作表選擇專案列執行此功能。");
    return;
  }
  const rowIdx = ws.getActiveCell().getRow();
  if (rowIdx < 2) return;

  const projId = ws.getRange(rowIdx, 1).getValue();
  const projTitle = ws.getRange(rowIdx, 2).getValue();
  const folderName = `[${projId}] ${projTitle}`;

  let folder;
  try {
    if (PARENT_DRIVE_FOLDER_ID) {
      folder = DriveApp.getFolderById(PARENT_DRIVE_FOLDER_ID).createFolder(folderName);
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    const url = folder.getUrl();
    ws.getRange(rowIdx, 8).setValue(url);
    SpreadsheetApp.getUi().alert(`✅ 成功建立 Drive 公文卷宗資料夾：\n${folderName}\n\n連結已同步回填至第 ${rowIdx} 列。`);
  } catch(err) {
    SpreadsheetApp.getUi().alert(`❌ 建立資料夾失敗：${err.toString()}`);
  }
}

// ----------------------------------------------------------------------------
// 私有輔助函數區 (Private Helper Methods)
// ----------------------------------------------------------------------------
function formatHeaderRow_(ws, colNum) {
  const range = ws.getRange(1, 1, 1, colNum);
  range.setBackground("#0F172A");
  range.setFontColor("#E2E8F0");
  range.setFontWeight("bold");
  ws.setFrozenRows(1);
}

function formatDateVal_(val) {
  if (!val) return "2026-07-15";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Taipei", "yyyy-MM-dd");
  }
  return String(val).trim();
}

function isTrueVal_(val) {
  if (val === true || val === 1) return true;
  const s = String(val || "").toUpperCase().trim();
  return (s === "TRUE" || s === "1" || s === "是" || s === "YES" || s === "Y");
}

function calculateDaysLeft_(dateVal) {
  if (!dateVal) return 99;
  const t = new Date(dateVal).getTime();
  const today = new Date().getTime();
  return Math.round((t - today) / (1000 * 3600 * 24));
}

function buildSectionNotifyText_(sec, items) {
  let txt = `【🚨 中正國小總務處 — 業務期程警示推播】\n`;
  txt += `承辦長官組別：${sec}\n`;
  txt += `即將到期/需重點關注項目共 ${items.length} 筆：\n`;
  txt += `--------------------------------------\n`;

  items.forEach((item, idx) => {
    txt += `${idx + 1}. [${item.projTitle}]\n`;
    txt += `   📌 事項：${item.taskText}\n`;
    txt += `   ⏰ 期限：${item.dueDate} (剩餘 ${item.daysLeft} 天)\n`;
    if (item.note) {
      txt += `   ⚠️ 主任提醒：${item.note}\n`;
    }
    txt += `--------------------------------------\n`;
  });
  txt += `👉 請立即登入決策戰情室系統回報進度或線上備查。`;
  return txt;
}

function sendLineNotify_(token, msg) {
  try {
    const url = "https://notify-api.line.me/api/notify";
    const payload = { "message": msg };
    const options = {
      "method": "post",
      "headers": { "Authorization": "Bearer " + token },
      "payload": payload,
      "muteHttpExceptions": true
    };
    UrlFetchApp.fetch(url, options);
  } catch(err) {
    Logger.log("LINE Notify 傳送失敗: " + err.toString());
  }
}

function sendGoogleChatWebhook_(webhookUrl, msg) {
  try {
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify({ "text": msg }),
      "muteHttpExceptions": true
    };
    UrlFetchApp.fetch(webhookUrl, options);
  } catch(err) {
    Logger.log("Google Chat 傳送失敗: " + err.toString());
  }
}

function sendEmailNotify_(emailAddr, subject, msg) {
  try {
    MailApp.sendEmail({
      to: emailAddr,
      subject: subject,
      body: msg
    });
  } catch(err) {
    Logger.log("Email 傳送失敗: " + err.toString());
  }
}

function sendSingleTaskNotify_(projId, taskId, sec, taskText, dueDate, note) {
  const data = getDashboardData();
  const pushConfig = data.pushConfig || {};
  const cfg = pushConfig[sec] || {};
  const msg = `【🚀 總務主任最新交辦業務派發】\n` +
              `受辦組別：${sec}\n` +
              `任務編號：${taskId}\n` +
              `交辦內容：${taskText}\n` +
              `限期完成：${dueDate}\n` +
              `${note ? '⚠️ 提醒說明：' + note + '\n' : ''}` +
              `請前往系統確認受理！`;

  if (cfg.line && cfg.lineToken) sendLineNotify_(cfg.lineToken, msg);
  if (cfg.chat && cfg.chatWebhook) sendGoogleChatWebhook_(cfg.chatWebhook, msg);
  if (cfg.email && cfg.emailAddr) sendEmailNotify_(cfg.emailAddr, `[總務主任新交辦] ${sec} - ${taskText}`, msg);
}
