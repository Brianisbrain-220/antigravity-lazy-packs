---
name: gas-cross-project-url-router
description: GAS 跨專案網址參數傳遞與自動填寫模組 (防 Iframe 陷阱)。當使用者提到「跳轉網址並自動填單」、「讀取網址參數」、「A系統帶資料到B系統」時自動載入。
---

# GAS Cross-Project URL Router (GAS 跨專案網址參數傳遞與自動填寫模組)

## 📌 適用情境 (When to use)
當開發 Google Apps Script (GAS) Web App 且遇到以下需求時：
1. **跨系統跳轉**：從 A 系統跳轉到 B 系統，並希望自動帶入資料。
2. **自動填單**：B 系統需讀取 URL 參數 (Query Parameters) 以自動完成表單預填 (Auto-fill)。
3. **遇到 Iframe 陷阱**：由於 GAS Web App 運行在 `iframe` 中，傳統的 `window.location.search` **會失效**，無法取得外層網址的參數。

## ⚠️ 絕對禁忌 (The Trap)
在 GAS `Index.html` (前端) 中，**絕對禁止**使用以下標準前端語法來解析網址參數：
❌ `const params = new URLSearchParams(window.location.search);`
這會永遠抓不到 `https://script.google.com/macros/s/.../exec?name=xxx` 後面的參數！

## ✅ 標準解決方案 (The Standard Solution)

### 1. 發送端 (A 系統) 網址組合範例
確保使用 `URLSearchParams` 來安全編碼參數：
```javascript
const targetBaseUrl = "https://script.google.com/macros/s/你的_B系統_ID/exec";
const queryParams = new URLSearchParams({
    name: "王小明",
    email: "test@example.com",
    unit: "教務處",
    reason: "系統跳轉帶入"
}).toString();

const fullUrl = targetBaseUrl + "?" + queryParams;
window.open(fullUrl, "_blank"); // 或將 fullUrl 綁定至按鈕 href
```

### 2. 接收端 (B 系統) 解析與自動填寫範例
必須使用 GAS 專屬的 `google.script.url.getLocation()` 非同步 API，才能穿透 iframe 取得參數。

在 B 系統的 `Index.html` (或對應的前端 JS) 這樣寫：
```javascript
// 在頁面載入完成 (如 window.onload 或 DOMContentLoaded) 時呼叫
function autoFillFromUrlParams() {
    // 確保 google script API 存在 (避免在本地測試環境報錯)
    if (typeof google !== 'undefined' && google.script && google.script.url) {
        google.script.url.getLocation(function(location) {
            // location.parameter 是一個 Object，包含所有 GET 參數 (String)
            const params = location.parameter;
            
            // 基礎文字欄位預填 (若網址有提供)
            if (params.name) document.getElementById('name').value = params.name;
            if (params.email) document.getElementById('email').value = params.email;
            if (params.phone) document.getElementById('phone').value = params.phone;
            if (params.reason) document.getElementById('reason').value = params.reason;
            
            // 下拉選單或 Checkbox 邏輯處理範例
            if (params.unit) {
                // 這裡可自訂邏輯，例如迴圈比對 checkbox value
                const deptStr = params.unit;
                let matched = false;
                document.querySelectorAll('.unit-cb').forEach(cb => {
                    if (deptStr.includes(cb.value) && cb.value !== '其他') {
                        cb.checked = true;
                        matched = true;
                    }
                });
                
                // 如果是自訂欄位 (勾選"其他"並填寫文字)
                if (!matched && deptStr) {
                    const otherCb = document.getElementById('unitOtherCb');
                    if(otherCb) {
                        otherCb.checked = true;
                        document.getElementById('unitOtherText').value = deptStr;
                        // 觸發 UI 變更函數
                        // toggleOtherUnit();
                    }
                }
            }
        });
    } else {
        console.warn("GAS API 不存在，無法解析 URL 參數 (僅適用於 GAS 發布環境)");
    }
}
```

## 🛠️ 開發與除錯指南 (Debugging Tips)
1. **非同步延遲**：`getLocation()` 是非同步函數。如果你的表單有其他初始化動作（例如抓取試算表設定檔、繪製選項），請確保初始化完成後，或是與初始化並行處理自動填寫，以免找不到對應的 DOM 元素 (例如找不到動態生成的 Checkbox)。
2. **測試方式**：這個功能必須將 GAS **部署為 Web App (發布新版本或測試部署)** 才能實際驗證。在本地的 VSCode / Live Server 是無法測試 `google.script.url` 的。
3. **資料型態**：`location.parameter` 的所有值都是 `String` 型態。如果傳遞陣列參數，會被轉換為逗號分隔字串，請自行 `split(',')` 處理。若有同名參數，只能拿到第一個值 (若要多值，請改用 `location.parameters` 取得 Array)。
