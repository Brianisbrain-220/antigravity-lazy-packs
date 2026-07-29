/**
 * Serving the HTML Web Application
 */
var VERSION = "v3.2.0";

/**
 * Serving the HTML Web Application
 */
function doGet(e) {
  var page = e && e.parameter && e.parameter.page;
  var templateName = 'Index';
  var title = '請購單快速生成系統 ' + VERSION;
  
  if (page === 'admin') {
    // Admin page uses password authentication (handled client-side in Admin.html)
    templateName = 'Admin';
    title = '系統管理後台 ' + VERSION;
  }
  
  // Get the real /exec URL from server side (immune to iframe sandbox URL confusion)
  var template = HtmlService.createTemplateFromFile(templateName);
  try {
    template.webAppUrl = ScriptApp.getService().getUrl();
  } catch(err) {
    template.webAppUrl = '';
  }
  
  return template.evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper to include other HTML/CSS/JS files if needed
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Main function to process form submission
 * @param {Object} formData The submitted form details
 * @return {Object} Response object with generated file URLs
 */
function createRequisition(formData) {
  try {
    var isProcurementCard = formData.isProcurementCard === true || formData.isProcurementCard === "true";
    var settings = getSystemSettings();
    var templateId = settings.templateId;
    var folderId = settings.folderId;
    var date = formData.date;
    var businessPlan = formData.businessPlan || "";
    var workPlan = formData.workPlan || "";
    var purposeCategory = formData.purposeCategory || "";
    var fundingSource = formData.fundingSource || "";
    var purpose = formData.purpose;
    var vendor = formData.vendor || "";
    var department = formData.department || "總務處";

    var items = formData.items; // Array of { name, spec, unit, qty, price, total }

    if (!templateId || !folderId) {
      throw new Error("系統未進行初始化設定！請聯絡管理員至後台（網址後方加上 ?page=admin）設定「文件範本 ID」與「存檔資料夾 ID」。");
    }

    // 1. Calculate totals
    var grandTotal = 0;
    for (var i = 0; i < items.length; i++) {
      var qty = parseFloat(items[i].qty) || 0;
      var price = parseFloat(items[i].price) || 0;
      var total = qty * price;
      items[i].total = total; // Double check calculation
      grandTotal += total;
    }

    var actualPayment = parseFloat(formData.actualPayment);
    var hasActualPayment = !isNaN(actualPayment) && actualPayment > 0;
    var voucherAmount = hasActualPayment ? actualPayment : grandTotal;
    var chineseTotal = numberToChinese(voucherAmount);

    // [DEBUG LOGGING]
    try {
      var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var debugSheet = activeSpreadsheet.getSheetByName("DebugLogs") || activeSpreadsheet.insertSheet("DebugLogs");
      debugSheet.clear();
      debugSheet.appendRow(["偵錯時間", new Date()]);
      debugSheet.appendRow(["範本文件 ID (templateId)", templateId]);
      debugSheet.appendRow(["存檔資料夾 ID (folderId)", folderId]);
      
      var tempDoc = DocumentApp.openById(templateId);
      var tempBody = tempDoc.getBody();
      debugSheet.appendRow(["範本文字總字數", tempBody.getText().length]);
      debugSheet.appendRow(["範本文字前 1000 字", tempBody.getText().substring(0, 1000)]);
      
      var tempTables = tempBody.getTables();
      debugSheet.appendRow(["範本表格數量", tempTables.length]);
      for (var t = 0; t < tempTables.length; t++) {
        debugSheet.appendRow(["表格 " + t + " 總行數", tempTables[t].getNumRows()]);
        for (var r = 0; r < tempTables[t].getNumRows(); r++) {
          debugSheet.appendRow(["表格 " + t + " 第 " + r + " 行文字", tempTables[t].getRow(r).getText()]);
        }
      }
    } catch(debugErr) {
      console.log("偵錯日誌寫入失敗: " + debugErr.toString());
    }

    // 2. Open Target Folder and Find/Create Department Subfolder
    var parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(folderId);
    } catch(e) {
      throw new Error("無法存取指定的雲端硬碟主資料夾，請檢查資料夾 ID 是否正確。");
    }

    var targetFolder = parentFolder;
    if (department) {
      var subfolders = parentFolder.getFoldersByName(department);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = parentFolder.createFolder(department);
      }
    }

    // 3. Copy Template Doc (naming rule: 請購年月日 + 用途說明前10個字)
    var cleanPurpose = purpose.replace(/[\s\/\*:\?"<>\|\\-]/g, "");
    var purposeSnippet = cleanPurpose.substring(0, 10) || "請購項目";
    var rocDateStr = formatToROCFNSDate(date);
    var newFileName = rocDateStr + purposeSnippet;
    
    var templateFile;
    try {
      templateFile = DriveApp.getFileById(templateId);
    } catch(e) {
      throw new Error("無法讀取請購單範本文件，請確認範本 ID 是否正確。");
    }
    
    var copiedFile = templateFile.makeCopy(newFileName, targetFolder);
    var docId = copiedFile.getId();

    // 4. Open copied document and replace fields
    var doc = DocumentApp.openById(docId);
    var body = doc.getBody();

    // Replace header details
    body.replaceText("\\{\\{填單日期\\}\\}", formatToROCDate(date));
    body.replaceText("\\{\\{經費來源\\}\\}", fundingSource);
    body.replaceText("\\{\\{業務計畫\\}\\}", businessPlan);
    body.replaceText("\\{\\{工作計畫\\}\\}", workPlan);
    body.replaceText("\\{\\{用途別\\}\\}", purposeCategory);
    body.replaceText("\\{\\{總計\\}\\}", grandTotal.toLocaleString());
    body.replaceText("\\{\\{國字總計\\}\\}", chineseTotal);


    // Replace digits grid (億, 千萬, 百萬, 十萬, 萬, 千, 百, 十, 元)
    replaceAmountGrid(body, voucherAmount, hasActualPayment);

    // 5. Populate Items Table
    populateRequisitionTable(body, items);

    // Replace purpose globally (run after table population so duplicates are cleared of placeholders)
    body.replaceText("\\{\\{用途說明\\}\\}", purpose);

    // Apply procurement card stamp if checked
    if (isProcurementCard) {
      applyProcurementCardStamp(body);
    } else {
      body.replaceText("\\{\\{採購卡\\}\\}", "");
    }

    // Save and close doc
    doc.saveAndClose();

    // 6a. Generate PDF
    var pdfBlob = copiedFile.getAs(MimeType.PDF).setName(newFileName + ".pdf");
    var pdfFile = targetFolder.createFile(pdfBlob);
    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

    // 6b. Generate DOCX (Word File)
    var docxUrl = "https://docs.google.com/feeds/download/documents/export/Export?id=" + docId + "&exportFormat=docx";
    var docxResponse = UrlFetchApp.fetch(docxUrl, {
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
    var docxFile;
    var docxBase64 = "";
    var docxName = "";
    if (docxResponse.getResponseCode() === 200) {
      var docxBlob = docxResponse.getBlob().setName(newFileName + ".docx");
      docxFile = targetFolder.createFile(docxBlob);
      docxBase64 = Utilities.base64Encode(docxBlob.getBytes());
      docxName = newFileName + ".docx";
    } else {
      console.log("Could not export DOCX. Status: " + docxResponse.getResponseCode());
    }

    // Set sharing settings so anyone with link can view/print
    try {
      copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      if (docxFile) {
        docxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch(e) {
      // Ignore if sharing settings cannot be changed (e.g. workspace restriction)
      console.log("Could not set sharing settings: " + e.message);
    }

    // Explicitly share with the active user to bypass workspace domain restrictions
    try {
      var activeUserEmail = Session.getActiveUser().getEmail();
      if (activeUserEmail) {
        copiedFile.addViewer(activeUserEmail);
        pdfFile.addViewer(activeUserEmail);
        if (docxFile) docxFile.addViewer(activeUserEmail);
      }
    } catch(e) {
      console.log("Could not add explicit viewer: " + e.message);
    }

    // 7. Write to Google Sheet (Log)
    var logFundingSource = fundingSource;
    if (isProcurementCard) {
      logFundingSource += " (採購卡支付)";
    }
    logToSheet(department, date, businessPlan, workPlan, purposeCategory, logFundingSource, purpose, vendor, items, grandTotal, copiedFile.getUrl(), docxFile ? docxFile.getUrl() : "", pdfFile.getUrl());

    return {
      success: true,
      docUrl: copiedFile.getUrl(),
      docxUrl: docxFile ? "https://drive.google.com/uc?export=download&id=" + docxFile.getId() : "",
      docxBase64: docxBase64,
      docxName: docxName,
      pdfUrl: pdfFile.getUrl(),
      pdfBase64: pdfBase64
    };

  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Searches the Document for the table containing items and populates it.
 * Preserves the format of the template row.
 */
function populateRequisitionTable(body, items) {
  var tables = body.getTables();
  if (tables.length === 0) {
    return; // No tables found
  }

  // Find the table that contains "{{品名}}" or "{{項目}}"
  var targetTable = null;
  var templateRowIndex = -1;
  var templateRow = null;

  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    for (var r = 0; r < table.getNumRows(); r++) {
      var row = table.getRow(r);
      var text = row.getText();
      if (text.indexOf("{{品名}}") !== -1 || text.indexOf("{{項目}}") !== -1) {
        targetTable = table;
        templateRowIndex = r;
        templateRow = row;
        break;
      }
    }
    if (targetTable) break;
  }

  if (!targetTable || templateRowIndex === -1) {
    // Fallback: If not found, try to look for any row with item placeholders in the first table
    if (tables.length > 0) {
      targetTable = tables[0];
      // Let's assume the template row is the second row (index 1) or third row
      if (targetTable.getNumRows() > 1) {
        templateRowIndex = 1;
        templateRow = targetTable.getRow(1);
      }
    }
  }

  if (!targetTable || !templateRow) {
    return; // Cannot find a suitable table row to copy
  }

  // Append new rows based on the template row
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var newRow = templateRow.copy();

    // Replace placeholders in each cell of the copied row
    for (var c = 0; c < newRow.getNumCells(); c++) {
      var cell = newRow.getCell(c);
      cell.replaceText("\\{\\{項次\\}\\}", (i + 1).toString());
      cell.replaceText("\\{\\{品名\\}\\}", item.name || "");
      cell.replaceText("\\{\\{規格\\}\\}", item.spec || "");
      cell.replaceText("\\{\\{單位\\}\\}", item.unit || "");
      cell.replaceText("\\{\\{數量\\}\\}", item.qty ? parseFloat(item.qty).toString() : "0");
      cell.replaceText("\\{\\{單價\\}\\}", item.price ? parseFloat(item.price).toLocaleString() : "0");
      cell.replaceText("\\{\\{總價\\}\\}", item.total ? parseFloat(item.total).toLocaleString() : "0");
      if (i > 0) {
        cell.replaceText("\\{\\{用途說明\\}\\}", "");
      }
    }

    // Insert new row before the template row
    targetTable.insertTableRow(templateRowIndex + i, newRow);
  }

  // Delete the original template row (which has been pushed down by the insertions)
  targetTable.removeRow(templateRowIndex + items.length);
}

/**
 * Log form submission details to the active sheet
 */
/**
 * Log form submission details to the active sheet for the specific department
 */
function logToSheet(department, date, businessPlan, workPlan, purposeCategory, fundingSource, purpose, vendor, items, grandTotal, docUrl, docxUrl, pdfUrl) {
  var settings = getSystemSettings();
  var ss;
  try {
    ss = SpreadsheetApp.openById(settings.spreadsheetId);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  var sheetName = department + "_Log";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Set up header if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "時間戳記", 
      "填單日期", 
      "業務計畫",
      "工作計畫",
      "用途別",
      "經費來源", 
      "用途說明", 
      "廠商名稱", 
      "請購品項細節", 
      "總金額", 
      "請購單文件連結", 
      "Word下載連結",
      "PDF下載列印連結",
      "請購品項JSON"
    ]);
    // Format header
    sheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#e6f2ff");
  }

  // Format items array into readable text for the spreadsheet row
  var itemsSummary = items.map(function(item, idx) {
    return (idx + 1) + ". " + item.name + " (" + item.spec + ") - " + item.qty + " " + item.unit + " x $" + item.price;
  }).join("\n");

  sheet.appendRow([
    new Date(),
    date,
    businessPlan,
    workPlan,
    purposeCategory,
    fundingSource,
    purpose,
    vendor,
    itemsSummary,
    grandTotal,
    docUrl,
    docxUrl,
    pdfUrl,
    JSON.stringify(items)
  ]);
}

/**
 * Splits the grand total into individual digits and replaces the placeholders
 * in the amount grid (億, 千萬, 百萬, 十萬, 萬, 千, 百, 十, 元)
 * and places a "$" right before the highest digit.
 * If isActualPayment is true, also places "實\n支" right before the "$".
 */
function replaceAmountGrid(body, amount, isActualPayment) {
  var digits = ["元", "十", "百", "千", "萬", "十萬", "百萬", "千萬", "億"];
  var amountStr = Math.round(amount).toString();
  var len = amountStr.length;
  
  for (var i = 0; i < digits.length; i++) {
    var placeholder = "\\{\\{" + digits[i] + "\\}\\}";
    var replacement = "";
    
    if (i < len) {
      // It is a digit (reading from right to left)
      replacement = amountStr.charAt(len - 1 - i);
    } else if (i === len) {
      // This is the position immediately to the left of the highest digit -> put "$"
      replacement = "$";
    } else if (isActualPayment && i === len + 1) {
      // If actual payment, put "實\n支" before "$"
      replacement = "實\n支";
    } else {
      // Remaining higher positions -> empty
      replacement = "";
    }
    
    body.replaceText(placeholder, replacement);
  }
}

/**
 * Convert integer to Traditional Chinese Financial Characters (Taiwan)
 */
function numberToChinese(num) {
  if (num === 0) return "零元整";
  var digits = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
  var units = ["", "拾", "佰", "仟"];
  var bigUnits = ["元", "萬", "億", "兆"];
  
  var str = "";
  var numStr = Math.round(num).toString();
  var len = numStr.length;
  
  var parts = [];
  for (var i = len; i > 0; i -= 4) {
    parts.push(numStr.slice(Math.max(0, i - 4), i));
  }
  
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var partStr = "";
    var zero = false;
    for (var j = 0; j < part.length; j++) {
      var d = parseInt(part[j], 10);
      var pos = part.length - 1 - j;
      if (d === 0) {
        zero = true;
      } else {
        if (zero) {
          partStr += "零";
          zero = false;
        }
        partStr += digits[d] + units[pos];
      }
    }
    if (partStr !== "") {
      str = partStr + bigUnits[i] + str;
    } else if (i === 0) {
      str = "元";
    }
  }
  
  str = str.replace(/^零+/, "");
  if (!str.endsWith("元")) {
    str += "元";
  }
  return str + "整";
}

/**
 * Formats Gregorian date (YYYY-MM-DD) to Taiwan ROC Minguo date format (YYY 年 MM 月 DD 日)
 */
function formatToROCDate(dateStr) {
  if (!dateStr) return "";
  var cleanDate = dateStr.replace(/\//g, "-");
  var parts = cleanDate.split("-");
  if (parts.length !== 3) return dateStr;
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  
  var rocYear = year - 1911;
  var monthStr = month < 10 ? "0" + month : month.toString();
  var dayStr = day < 10 ? "0" + day : day.toString();
  
  return rocYear + " 年 " + monthStr + " 月 " + dayStr + " 日";
}

/**
 * Summarizes the purpose text into a 4-6 character clean string for filename
 */
function summarizePurpose(purpose) {
  if (!purpose) return "請購項目";
  // Remove special filename characters like \ / : * ? " < > | and spaces
  var clean = purpose.replace(/[\s\/\*:\?"<>\|\\-]/g, "");
  if (clean.length > 6) {
    return clean.substring(0, 6);
  }
  return clean || "請購項目";
}

/**
 * Replaces the {{採購卡}} placeholder with "採購卡支付" if checked.
 * Also clears it if not checked (handled in the main process function).
 */
function applyProcurementCardStamp(body) {
  // We no longer modify the table cell directly to avoid layout issues.
  // Instead, we rely on the {{採購卡}} placeholder in the document template.
  body.replaceText("\\{\\{採購卡\\}\\}", "採購卡支付");
}

/**
 * Formats Gregorian date (YYYY-MM-DD) to Minguo date string without separators (e.g. YYYMMDD)
 */
function formatToROCFNSDate(dateStr) {
  if (!dateStr) return "";
  var cleanDate = dateStr.replace(/\//g, "-");
  var parts = cleanDate.split("-");
  if (parts.length !== 3) return "";
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  var rocYear = year - 1911;
  var monthStr = month < 10 ? "0" + month : month.toString();
  var dayStr = day < 10 ? "0" + day : day.toString();
  return rocYear + monthStr + dayStr;
}



/**
 * 專門用來強制觸發 UrlFetchApp 授權的測試函數
 */
function triggerAuth() {
  var response = UrlFetchApp.fetch("https://www.google.com");
  Logger.log("連線測試成功，狀態碼：" + response.getResponseCode());
}

/**
 * Get system settings from Script Properties
 */
function getSystemSettings() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var defaultSpreadsheetId = "";
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      defaultSpreadsheetId = activeSs.getId();
    }
  } catch (e) {
    console.log("無法獲取活動試算表 ID: " + e.toString());
  }
  
  return {
    templateId: props.templateId || "",
    folderId: props.folderId || "",
    spreadsheetId: props.spreadsheetId || defaultSpreadsheetId,
    geminiKey: props.geminiKey || "",
    geminiModel: props.geminiModel || "gemini-1.5-flash",
    departments: props.departments || "總務處,教務處,學務處,輔導處,幼兒園,校長室,人事室,會計室",
    adminEmails: props.adminEmails || "brianhung@gm.ccps.kh.edu.tw",
    businessPlans: props.businessPlans || "",
    workPlans: props.workPlans || "",
    purposeCategories: props.purposeCategories || "",
    fundingSources: props.fundingSources || "",
    itemUnits: props.itemUnits || "式,個,組,支,盒,條,箱,張,份"
  };
}

/**
 * Save system settings to Script Properties
 */
function saveSystemSettings(settings) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("templateId", settings.templateId || "");
  props.setProperty("folderId", settings.folderId || "");
  props.setProperty("spreadsheetId", settings.spreadsheetId || "");
  props.setProperty("geminiKey", settings.geminiKey || "");
  props.setProperty("geminiModel", settings.geminiModel || "gemini-1.5-flash");
  props.setProperty("departments", settings.departments || "");
  props.setProperty("adminEmails", settings.adminEmails || "brianhung@gm.ccps.kh.edu.tw");
  props.setProperty("businessPlans", settings.businessPlans || "");
  props.setProperty("workPlans", settings.workPlans || "");
  props.setProperty("purposeCategories", settings.purposeCategories || "");
  props.setProperty("fundingSources", settings.fundingSources || "");
  props.setProperty("itemUnits", settings.itemUnits || "式,個,組,支,盒,條,箱,張,份");
  return { success: true };
}

/**
 * Check if the script has all required authorization permissions
 */
function checkAuthStatus() {
  try {
    DriveApp.getRootFolder();
    SpreadsheetApp.getActiveSpreadsheet();
    return { success: true, authorized: true };
  } catch (e) {
    return { success: false, authorized: false, message: e.toString() };
  }
}

/**
 * Search historical records only for the user's specific department
 * @param {string} query The query string
 * @param {string} department The department to search in
 * @return {Array} List of matching records
 */
function searchHistory(query, department) {
  try {
    if (!department) return [];
    var settings = getSystemSettings();
    var ss;
    try {
      ss = SpreadsheetApp.openById(settings.spreadsheetId);
    } catch (e) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    var sheetName = department + "_Log";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var numCols = Math.max(13, lastCol);
    var data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    var results = [];
    var queryClean = (query || "").toLowerCase().trim();
    
    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      var dateStr = row[1] ? row[1].toString() : "";
      var businessPlan = row[2] ? row[2].toString() : "";
      var workPlan = row[3] ? row[3].toString() : "";
      var purposeCategory = row[4] ? row[4].toString() : "";
      var fundingSource = row[5] ? row[5].toString() : "";
      var purpose = row[6] ? row[6].toString() : "";
      var vendor = row[7] ? row[7].toString() : "";
      var itemsText = row[8] ? row[8].toString() : "";
      var total = row[9] ? row[9].toString() : "";
      var docUrl = row[10] ? row[10].toString() : "";
      var docxUrl = row[11] ? row[11].toString() : "";
      var pdfUrl = row[12] ? row[12].toString() : "";
      var itemsJson = (numCols >= 14 && row[13]) ? row[13].toString() : "";
      
      var match = false;
      if (queryClean === "") {
        match = true;
      } else {
        if (purpose.toLowerCase().indexOf(queryClean) !== -1 ||
            vendor.toLowerCase().indexOf(queryClean) !== -1 ||
            itemsText.toLowerCase().indexOf(queryClean) !== -1 ||
            fundingSource.toLowerCase().indexOf(queryClean) !== -1) {
          match = true;
        }
      }
      
      if (match) {
        results.push({
          date: dateStr,
          businessPlan: businessPlan,
          workPlan: workPlan,
          purposeCategory: purposeCategory,
          fundingSource: fundingSource,
          purpose: purpose,
          vendor: vendor,
          total: total,
          itemsJson: itemsJson,
          itemsText: itemsText
        });
        
        if (results.length >= 15) {
          break;
        }
      }
    }
    return results;
  } catch (e) {
    console.log("搜尋歷史出錯: " + e.toString());
    return [];
  }
}

/**
 * Analyze quotation image or PDF using Gemini API
 * @param {string} base64Data Base64 representation of the file
 * @param {string} mimeType File MIME type
 * @return {Object} Response object with items or error message
 */
function analyzeQuotation(base64Data, mimeType) {
  try {
    var settings = getSystemSettings();
    var apiKey = settings.geminiKey;
    var model = (settings.geminiModel || "gemini-3.5-flash").trim().replace(/^models\//, "").replace(/\s+/g, "-");
    
    if (!apiKey) {
      return { success: false, message: "請先由管理員進入後台設定 Gemini API Key 才能使用 AI 辨識功能。", errorCode: "MISSING_API_KEY" };
    }
    
    var prompt = "你是一個學校會計助理。請精準讀取此估價單/報價單。請分析並擷取出其中的所有購買品項清單，必須回傳一個 JSON 陣列。每個品項物件需有以下屬性：\n" +
                 "- name: 品名\n" +
                 "- spec: 規格、型號或尺寸（若無請留空，不要寫無）\n" +
                 "- unit: 單位（如個、張、式、組、顆、台、包等）\n" +
                 "- qty: 數量（請轉換為數值）\n" +
                 "- price: 單價（請轉換為數值）\n" +
                 "請精準讀取每一行。若品名包含規格，請將規格拆出至 spec。";
                 
    var payload = {
      "contents": [
        {
          "parts": [
            { "text": prompt },
            {
              "inlineData": {
                "mimeType": mimeType,
                "data": base64Data
              }
            }
          ]
        }
      ],
      "generationConfig": {
        "responseMimeType": "application/json"
      }
    };
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    // Auto-fallback: try user's model first, then fallback models if 404
    var modelsToTry = [model];
    if (model !== "gemini-3.5-flash") modelsToTry.push("gemini-3.5-flash");
    if (model !== "gemini-3.1-flash-lite") modelsToTry.push("gemini-3.1-flash-lite");
    
    var apiVersions = ["v1beta", "v1"];
    var response;
    var resCode;
    var resText;
    var lastError = "";
    var succeeded = false;

    // Nested loop: try each model × each API version
    for (var m = 0; m < modelsToTry.length && !succeeded; m++) {
      var tryModel = modelsToTry[m];
      for (var i = 0; i < apiVersions.length && !succeeded; i++) {
        var apiVer = apiVersions[i];
        var url = "https://generativelanguage.googleapis.com/" + apiVer + "/models/" + tryModel + ":generateContent?key=" + apiKey;
        
        try {
          response = UrlFetchApp.fetch(url, options);
          resCode = response.getResponseCode();
          resText = response.getContentText();
          
          if (resCode === 200) {
            succeeded = true;
            lastError = "";
            break;
          }
          
          // Parse error code from JSON to help diagnostic panel
          var errCode = "UNKNOWN";
          try {
            var errJson = JSON.parse(resText);
            if (errJson.error && errJson.error.status) {
              errCode = errJson.error.status;
            }
          } catch(e) {}
          
          lastError = "Gemini API 呼叫失敗 (模型: " + tryModel + ", 版本: " + apiVer + ", " + resCode + "): " + resText;
          
          // If it's a 403 (Quota) or 401 (Auth), no point trying other models/versions
          if (resCode === 403 || resCode === 401) {
            return { success: false, message: lastError, errorCode: errCode };
          }
          
          // If 404, try next combination
        } catch(fetchErr) {
          lastError = "Fetch 發生異常: " + fetchErr.toString();
        }
      }
    }
    
    if (!succeeded) {
      var finalCode = "MODEL_NOT_FOUND";
      if (lastError.includes("RESOURCE_EXHAUSTED")) finalCode = "RESOURCE_EXHAUSTED";
      if (lastError.includes("API_KEY_INVALID")) finalCode = "API_KEY_INVALID";
      return { success: false, message: "所有模型皆無法使用。最後嘗試的錯誤: " + lastError, errorCode: finalCode };
    }
        
        var resJson = JSON.parse(resText);
        var contentText = resJson.candidates[0].content.parts[0].text;
        
        var items = JSON.parse(contentText);
        // Note: the loop ensures that 'tryModel' holds the name of the model that succeeded.
        // Wait, 'tryModel' is scoped to the loop but in Javascript var is function-scoped.
        // Let's explicitly save the successful model in a variable just in case.
        return { success: true, items: items, usedModel: tryModel };
        
      } catch (e) {
        return { success: false, message: "AI 辨識發生錯誤: " + e.toString() };
      }
    }

/**
 * 驗證後台管理密碼
 * @param {string} inputPassword 使用者輸入的密碼
 * @returns {boolean} 密碼正確回傳 true
 */
function verifyAdminPassword(inputPassword) {
  try {
    if (!inputPassword || inputPassword.trim() === '') return false;
    var props = PropertiesService.getScriptProperties();
    // 預設密碼為 admin1234，管理員可在後台修改
    var storedPassword = props.getProperty('adminPassword') || 'admin1234';
    return inputPassword.trim() === storedPassword;
  } catch (e) {
    return false;
  }
}

/**
 * 變更後台管理密碼（需先通過舊密碼驗證）
 */
function changeAdminPassword(oldPassword, newPassword) {
  try {
    if (!verifyAdminPassword(oldPassword)) {
      return { success: false, message: '舊密碼錯誤，無法變更。' };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: '新密碼長度至少需要 6 個字元。' };
    }
    PropertiesService.getScriptProperties().setProperty('adminPassword', newPassword.trim());
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
