/**
 * @version v1.0.0
 * Database layer using SpreadsheetApp.
 */

const SCHEMA_ = {
  '使用單位': ['單位ID', '單位名稱', '負責人姓名', '聯絡電話', '啟用狀態', '排序', '建立時間', '更新時間'],
  '單位賽期': ['賽期ID', '單位ID', '賽期名稱', '起始日期', '結束日期', '基本配額時數', '備註', '紀錄狀態', '建立人', '建立時間', '更新人', '更新時間'],
  '加值紀錄': ['加值單號', '單位ID', '單位名稱', '加值時數', '加值金額', '加值日期', '收據或單據號', '經手人', '備註', '紀錄狀態', '作廢原因', '作廢人', '作廢時間', '建立時間'],
  '使用紀錄': ['使用單號', '單位ID', '單位名稱', '使用場地', '使用日期', '開始時間', '結束時間', '實際分鐘', '扣抵時數', '登記人', '備註說明', '紀錄狀態', '作廢原因', '作廢人', '作廢時間', '取代單號', '建立時間'],
  '系統設定': ['鍵', '值', '說明', '更新時間'],
  '異動紀錄': ['時間', '操作人', '動作', '工作表', '目標單號', '變更前(JSON)', '變更後(JSON)']
};

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID not set');
  return SpreadsheetApp.openById(id);
}

function checkAndMigrateDb_() {
  const ss = getSpreadsheet_();
  
  for (const sheetName in SCHEMA_) {
    const headers = SCHEMA_[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    } else {
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
      for (const h of headers) {
        if (existingHeaders.indexOf(h) === -1) {
          const newColIndex = existingHeaders.length + 1;
          sheet.getRange(1, newColIndex).setValue(h);
          existingHeaders.push(h);
        }
      }
    }
    
    // Set format for specific columns to text
    const finalHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    for (let i = 0; i < finalHeaders.length; i++) {
      const h = finalHeaders[i];
      if (h.endsWith('ID') || h.endsWith('單號') || h.endsWith('日期') || h === '開始時間' || h === '結束時間' || h.endsWith('時間')) {
        sheet.getRange(2, i + 1, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat('@');
      }
    }
  }
}

function sanitizeCell_(val) {
  if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
    return "'" + val;
  }
  return val;
}

function readTable_(sheetName) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        // Simple heuristic to distinguish date vs time based on column name if possible, 
        // but typically Apps Script formats datetime
        if (headers[j] === '開始時間' || headers[j] === '結束時間') {
          val = Utilities.formatDate(val, 'Asia/Taipei', 'HH:mm');
        } else if (headers[j].endsWith('時間')) {
          val = Utilities.formatDate(val, 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ssXXX");
        } else {
          val = Utilities.formatDate(val, 'Asia/Taipei', 'yyyy-MM-dd');
        }
      }
      obj[headers[j]] = val;
    }
    obj['_rowIndex'] = i + 1; // for update
    rows.push(obj);
  }
  return rows;
}

function appendRecord_(sheetName, obj) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    row.push(obj[h] !== undefined ? sanitizeCell_(obj[h]) : '');
  }
  sheet.appendRow(row);
}

function updateRecordById_(sheetName, idField, id, patch) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  const headers = data[0];
  const idColIndex = headers.indexOf(idField);
  if (idColIndex === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] == id) {
      for (const key in patch) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(sanitizeCell_(patch[key]));
        }
      }
      return true;
    }
  }
  return false;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function nextId_(kind) {
  const now = new Date();
  const yyyyMMdd = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  
  // Use ScriptProperties to keep a simple counter for the day
  const props = PropertiesService.getScriptProperties();
  const propKey = 'SEQ_' + kind + '_' + yyyyMMdd;
  let count = parseInt(props.getProperty(propKey) || '0', 10) + 1;
  props.setProperty(propKey, count.toString());
  
  const NNN = ('000' + count).slice(-3);
  
  if (kind === '單位') {
    return 'U' + ('000' + count).slice(-3);
  }
  
  const prefix = {
    '賽期': 'PER-',
    '加值': 'TOP-',
    '使用': 'USE-'
  }[kind] || 'ID-';
  
  return prefix + yyyyMMdd + '-' + NNN;
}

function writeAudit_(operator, action, sheetName, targetId, before, after) {
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ssXXX");
  appendRecord_('異動紀錄', {
    '時間': nowStr,
    '操作人': operator,
    '動作': action,
    '工作表': sheetName,
    '目標單號': targetId,
    '變更前(JSON)': before ? JSON.stringify(before) : '',
    '變更後(JSON)': after ? JSON.stringify(after) : ''
  });
}
