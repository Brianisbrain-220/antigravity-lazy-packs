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
    var templateId = formData.templateId;
    var folderId = formData.folderId;
    var date = formData.date;
    var fundingSource = formData.fundingSource;
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

    // 2. Open Target Folder
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch(e) {
      throw new Error("無法存取指定的雲端硬碟資料夾，請檢查資料夾 ID 是否正確且具備權限。");
    }

    // 3. Copy Template Doc
    var newFileName = "請購單_" + fundingSource + "_" + date.replace(/[\/\-]/g, "") + "_" + Math.floor(Math.random() * 1000);
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
    body.replaceText("\\{\\{填單日期\\}\\}", date);
    body.replaceText("\\{\\{經費來源\\}\\}", fundingSource);
    body.replaceText("\\{\\{用途說明\\}\\}", purpose);
    body.replaceText("\\{\\{總計\\}\\}", grandTotal.toLocaleString());
    body.replaceText("\\{\\{國字總計\\}\\}", chineseTotal);

    // 5. Populate Items Table
    populateRequisitionTable(body, items);

    // Save and close doc
    doc.saveAndClose();

    // 6. Generate PDF
    var pdfBlob = copiedFile.getAs('application/pdf');
    var pdfFile = folder.createFile(pdfBlob).setName(newFileName + ".pdf");

    // Set sharing settings so anyone with link can view/print
    try {
      copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {
      // Ignore if sharing settings cannot be changed (e.g. workspace restriction)
      console.log("Could not set sharing settings: " + e.message);
    }

    // 7. Write to Google Sheet (Log)
    logToSheet(date, fundingSource, purpose, items, grandTotal, copiedFile.getUrl(), pdfFile.getUrl());

    return {
      success: true,
      docUrl: copiedFile.getUrl(),
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
    for (var r = 0; r < table.getNumberOfRows(); r++) {
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
      if (targetTable.getNumberOfRows() > 1) {
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
    for (var c = 0; c < newRow.getNumberOfCells(); c++) {
      var cell = newRow.getCell(c);
      cell.replaceText("\\{\\{項次\\}\\}", (i + 1).toString());
      cell.replaceText("\\{\\{品名\\}\\}", item.name || "");
      cell.replaceText("\\{\\{規格\\}\\}", item.spec || "");
      cell.replaceText("\\{\\{單位\\}\\}", item.unit || "");
      cell.replaceText("\\{\\{數量\\}\\}", item.qty ? parseFloat(item.qty).toString() : "0");
      cell.replaceText("\\{\\{單價\\}\\}", item.price ? parseFloat(item.price).toLocaleString() : "0");
      cell.replaceText("\\{\\{總價\\}\\}", item.total ? parseFloat(item.total).toLocaleString() : "0");
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
function logToSheet(date, fundingSource, purpose, items, grandTotal, docUrl, pdfUrl) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Set up header if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "時間戳記", 
      "填單日期", 
      "經費來源", 
      "用途說明", 
      "請購品項細節", 
      "總金額", 
      "請購單文件連結", 
      "PDF下載列印連結"
    ]);
    // Format header
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e6f2ff");
  }

  // Format items array into readable text for the spreadsheet row
  var itemsSummary = items.map(function(item, idx) {
    return (idx + 1) + ". " + item.name + " (" + item.spec + ") - " + item.qty + " " + item.unit + " x $" + item.price;
  }).join("\n");

  sheet.appendRow([
    new Date(),
    date,
    fundingSource,
    purpose,
    itemsSummary,
    grandTotal,
    docUrl,
    pdfUrl
  ]);
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
