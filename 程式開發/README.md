# 中正國小程式開發儲存庫

本儲存庫用於管理中正國小的 Google Apps Script (GAS) 專案與相關自動化工具。

---

## 🛠️ 本地開發技能指引：`antigravity-gas-project-core`

為了在進行跨專案開發、API 數據通訊與 Web App 界面建置時，避免常見的 Google Apps Script 技術漏洞並大幅節省開發時的 AI Token 消耗，我們在專案中設計了本地自訂技能（Skill）。

### 技能檔案路徑
*   [SKILL.md](file:///.agents/skills/antigravity-gas-project-core/SKILL.md)

---

## 💡 核心功能與開發規範說明

本技能封裝了三大 GAS 核心除錯與相容性開發指南，任何開發者（包括 AI 助教）在擴充功能時必須遵循：

### A. 試算表資料庫 Schema 自動遷移 (Schema Auto-Migration)
*   **用途**：當系統需求變更需要新增/修改工作表欄位時，自動進行無痛升級，避免資料損毀。
*   **作法**：在 `Code.js` 中維護 `DB_SCHEMA` 配色與欄位字典，由檢測函式自動與線上 Sheets 比對，缺漏時自動補齊欄位並套用樣式。

### C. 跨專案 API 路由器與安全通訊模組 (Cross-Project API Routing & Client)
*   **用途**：標準化與安全地處理多個 Apps Script 專案間的 JSON API 通訊，避免通訊中斷造成整個伺服器崩潰。
*   **作法**：
    1.  客戶端一律封裝帶有 `try-catch` 容錯與例外阻斷的呼叫函式。
    2.  服務端 `doPost` 一律採用結構化的 `action` 分流路由器，便於跨系統新增接口與身分驗證。

### D. Web App 沙盒相容性與父視窗跳轉 (Sandbox & Top Redirection)
*   **用途**：防止 GAS 網頁在 iframe 內部跳轉造成白畫面，以及在無痕模式/部分瀏覽器下直接存取 `sessionStorage` 拋出 `SecurityError` 導致網頁崩潰。
*   **作法**：
    1.  存取儲存體時，套用內建的 Try-Catch 降級機制，失敗時自動轉為全域 JavaScript 記憶體變數儲存。
    2.  跳轉頁面時，前端一律讀取後端傳入的公用 URL 常數，並使用 `window.top.location.href` 重新導向父視窗。

---

## 🚀 技能使用方式
當 AI 程式助教（如 Antigravity）載入此專案時，會自動讀取並遵循 `.agents/skills/antigravity-gas-project-core/SKILL.md` 的規範。

當您需要對系統進行調整時，可以在對話中直接下達以下類似指令，AI 就會自動套用該技能範本：
*   *「我要在此專案新增一個跨專案 API，用來傳遞身分。」*
*   *「我要在庫存表新增一個『備註』欄位，請更新 Schema。」*
*   *「請新增一個 API 接口，用來讓前台向中央系統查詢行政人員資料。」*
*   *「後台需要新增跳轉回前台的功能，請注意 iframe 安全跳轉防白屏。」*
