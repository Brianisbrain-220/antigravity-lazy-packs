/**
 * Serving the HTML Web Application
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('請購單快速生成系統')
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
    var templateId = formData.templateId;
    var folderId = formData.folderId;
    var date = formData.date;
    var businessPlan = formData.businessPlan || "";
    var workPlan = formData.workPlan || "";
    var purposeCategory = formData.purposeCategory || "";
    var fundingSource = formData.fundingSource || "";
    var purpose = formData.purpose;
    var items = formData.items; // Array of { name, spec, unit, qty, price, total }

    if (!templateId || !folderId) {
      throw new Error("請提供正確的範本文件 ID 與存檔資料夾 ID。");
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

    var chineseTotal = numberToChinese(grandTotal);

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

    // 2. Open Target Folder
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch(e) {
      throw new Error("無法存取指定的雲端硬碟資料夾，請檢查資料夾 ID 是否正確且具備權限。");
    }

    // 3. Copy Template Doc
    var docNameBase = summarizePurpose(purpose);
    var rocDateStr = formatToROCFNSDate(date);
    var newFileName = rocDateStr + "請購單_" + docNameBase;
    var templateFile;
    try {
      templateFile = DriveApp.getFileById(templateId);
    } catch(e) {
      throw new Error("無法讀取請購單範本文件，請確認範本 ID 是否正確。");
    }
    
    var copiedFile = templateFile.makeCopy(newFileName, folder);
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
    replaceAmountGrid(body, grandTotal);

    // 5. Populate Items Table
    populateRequisitionTable(body, items);

    // Replace purpose globally (run after table population so duplicates are cleared of placeholders)
    body.replaceText("\\{\\{用途說明\\}\\}", purpose);

    // Apply procurement card stamp if checked
    if (isProcurementCard) {
      applyProcurementCardStamp(body);
    }

    // Save and close doc
    doc.saveAndClose();

    // 6. Generate PDF
    var pdfBlob = copiedFile.getAs('application/pdf');
    var pdfFile = folder.createFile(pdfBlob).setName(newFileName + ".pdf");

    // 6b. Generate DOCX (Word File)
    var docxUrl = "https://docs.google.com/feeds/download/documents/export/Export?id=" + docId + "&exportFormat=docx";
    var docxResponse = UrlFetchApp.fetch(docxUrl, {
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
    var docxFile;
    if (docxResponse.getResponseCode() === 200) {
      var docxBlob = docxResponse.getBlob().setName(newFileName + ".docx");
      docxFile = folder.createFile(docxBlob);
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

    // 7. Write to Google Sheet (Log)
    var logFundingSource = fundingSource;
    if (isProcurementCard) {
      logFundingSource += " (採購卡支付)";
    }
    logToSheet(date, businessPlan, workPlan, purposeCategory, logFundingSource, purpose, items, grandTotal, copiedFile.getUrl(), docxFile ? docxFile.getUrl() : "", pdfFile.getUrl());

    return {
      success: true,
      docUrl: copiedFile.getUrl(),
      docxUrl: docxFile ? docxFile.getUrl() : "",
      pdfUrl: pdfFile.getUrl()
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
function logToSheet(date, businessPlan, workPlan, purposeCategory, fundingSource, purpose, items, grandTotal, docUrl, docxUrl, pdfUrl) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
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
      "請購品項細節", 
      "總金額", 
      "請購單文件連結", 
      "Word下載連結",
      "PDF下載列印連結"
    ]);
    // Format header
    sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#e6f2ff");
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
    itemsSummary,
    grandTotal,
    docUrl,
    docxUrl,
    pdfUrl
  ]);
}

/**
 * Splits the grand total into individual digits and replaces the placeholders
 * in the amount grid (億, 千萬, 百萬, 十萬, 萬, 千, 百, 十, 元)
 * and places a "$" right before the highest digit.
 */
function replaceAmountGrid(body, grandTotal) {
  var digits = ["元", "十", "百", "千", "萬", "十萬", "百萬", "千萬", "億"];
  var amountStr = Math.round(grandTotal).toString();
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
 * Dynamically stamps "採購卡支付" vertically inside the cell that contains "憑證編號".
 */
function applyProcurementCardStamp(body) {
  var tables = body.getTables();
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    for (var r = 0; r < table.getNumRows(); r++) {
      var row = table.getRow(r);
      for (var c = 0; c < row.getNumCells(); c++) {
        var cell = row.getCell(c);
        var text = cell.getText().replace(/\s+/g, ""); // strip all spaces
        if (text.indexOf("憑證編號") !== -1) {
          cell.clear();
          
          var stampItems = [
            { text: "採", size: 22, bold: true },
            { text: "購", size: 22, bold: true },
            { text: "卡", size: 22, bold: true },
            { text: "憑證編號", size: 10, bold: false },
            { text: "支", size: 22, bold: true },
            { text: "第    號", size: 10, bold: false },
            { text: "付", size: 22, bold: true }
          ];
          
          for (var i = 0; i < stampItems.length; i++) {
            var p;
            if (i === 0) {
              p = cell.getChild(0).asParagraph();
              p.setText(stampItems[i].text);
            } else {
              p = cell.appendParagraph(stampItems[i].text);
            }
            p.setFontSize(stampItems[i].size);
            p.setBold(stampItems[i].bold);
            p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            p.setSpacingAfter(0);
            p.setSpacingBefore(0);
            p.setLineSpacing(1.0);
          }
          return; // Done
        }
      }
    }
  }
}
