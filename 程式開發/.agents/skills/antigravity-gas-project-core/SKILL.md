---
name: antigravity-gas-project-core
description: >-
  Google Apps Script (GAS) 專案本地核心開發指引，提供資料庫自動遷移 (Schema Migration)、交易互斥鎖鎖定與庫存安全 (Safe Lock Transactions)、以及 iframe 沙盒相容性與父視窗跳轉重定向 (Web App Sandbox Redirection) 的範本與步驟。
---

# Google Apps Script 專案開發核心技能 (antigravity-gas-project-core)

## Overview
本技能旨在為 Google Apps Script (GAS) 本地專案開發提供三大核心流程（A. 試算表資料庫 Schema 自動遷移、B. Concurrency-Safe 庫存交易、D. iframe 沙盒安全性與父視窗跳轉）的標準開發步驟與程式碼範本，以減少重複偵錯，並大量節省 Token 消耗。

## Workflow
當需要開發或修改 Google Apps Script Web App、處理試算表欄位升級、進行多用戶併發庫存操作、或是處理網頁跳轉時，必須嚴格遵循以下步驟與範本：

### 1. 試算表資料庫 Schema 自動遷移 (Schema Auto-Migration)
當需要新增、調整試算表中的欄位時，禁止使用硬編碼（Hard-coded）指定特定欄位位置，應使用此自動遷移與修補機制：
- **Schema 定義字典**：在 `Code.js` 的設定區定義完整的 Schema 結構（資料表名稱、Header 欄位清單、標題色彩）：
  ```javascript
  const DB_SCHEMA = [
    { name: "庫存", headers: ["ID", "品名", "目前庫存", "單價"], color: "#d9ead3" }
  ];
  ```
- **自動遷移檢測函式**：在初始化資料庫或每次存取時呼叫 Schema 升級：
  ```javascript
  function checkAndMigrateDb() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    DB_SCHEMA.forEach(schema => {
      let sheet = ss.getSheetByName(schema.name);
      if (!sheet) {
        sheet = ss.insertSheet(schema.name);
      }
      const dataRange = sheet.getDataRange();
      let currentHeaders = [];
      if (dataRange.getLastRow() > 0) {
        currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
      
      // 比對並補足缺失的欄位
      schema.headers.forEach(h => {
        if (currentHeaders.indexOf(h) === -1) {
          const nextCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextCol).setValue(h);
        }
      });
      
      // 更新首列標題樣式與配色
      const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
      headerRange.setBackground(schema.color).setFontWeight("bold");
    });
  }
  ```

### 2. 互斥鎖與安全交易機制 (Lock & Safe Transactions)
凡是涉及「讀取資料 -> 運算/扣減 -> 寫回」等任何可能引發多人同時操作競爭（如前台領取、後台核發/取消）的寫入操作，必須採用排他鎖（Script Lock）：
- **交易交易互斥鎖模版**：
  ```javascript
  function deductInventorySafe(itemsToDeduct) {
    const lock = LockService.getScriptLock();
    try {
      // 嘗試等待鎖定最多 10 秒
      lock.waitLock(10000);
      
      // 執行核心交易邏輯
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("庫存");
      // 讀取 -> 運算 -> 寫回
      // ...核心扣減/更新邏輯...
      
    } catch (e) {
      throw new Error("系統繁忙中，請稍後再試。原因: " + e.message);
    } finally {
      // 務必在 finally 中釋放鎖定
      lock.releaseLock();
    }
  }
  ```

### 3. Web App 沙盒相容性與父視窗跳轉 (Sandbox & Top Redirection)
為防範瀏覽器在 Apps Script 跨網域沙盒 `<iframe>` 中存取 `sessionStorage`/`localStorage` 丟出 `SecurityError` 崩潰，以及跳轉內部網址導致白畫面，必須遵循以下規則：
- **Session 讀取與寫入容錯**：
  ```javascript
  let _localState = {};
  function getSessionAuth() {
    try {
      return sessionStorage.getItem('admin_authenticated') === 'true' || _localState.adminAuth === true;
    } catch (e) {
      return _localState.adminAuth === true;
    }
  }
  function setSessionAuth(val) {
    try {
      sessionStorage.setItem('admin_authenticated', val);
    } catch (e) {}
    _localState.adminAuth = val === 'true';
  }
  ```
- **使用外部公用 URL + window.top.location.href 進行頁面跳轉**：
  在 `doGet(e)` 中取得 Web App 對外網址並傳入前端範本：
  ```javascript
  template.webAppUrl = ScriptApp.getService().getUrl();
  ```
  在前端 JS 中定義並執行跳轉（禁止使用 `window.location.href` 或相對路徑）：
  ```javascript
  const WEB_APP_URL = "<?= webAppUrl ?>";
  
  function redirectToAdmin() {
    window.top.location.href = WEB_APP_URL + "?mode=admin";
  }
  function logoutToFront() {
    clearSessionAuth();
    window.top.location.href = WEB_APP_URL;
  }
  ```

## Common Mistakes
1. **直接修改 window.location.href**：這會讓 iframe 在內部跳轉到 userCodeAppPanel 導致白畫面。務必使用 `window.top.location.href` 配合後端傳入的 `webAppUrl`。
2. **無 Try-Catch 存取 Storage**：直接存取 `sessionStorage` 會在特定瀏覽器（如 Chrome 無痕或 Safari）中直接導致 JS 崩潰白屏。
3. **忘記在 finally 中釋放 Lock**：若發生 Exception 而沒有在 `finally` 中釋放 Lock，會導致後續所有填單請求鎖定超時失敗。
