# 🚀 AntiGravity 程式開發專案技能庫 (Dev Skills Library)

本技能庫收錄了在 **`程式開發 (antigravity-lazy-packs)`** 專案中，經過實戰採坑與除錯驗證提煉出的 **9 大核心 Skill**。
包含：**後台架構**、**GAS 擴充**、**Firebase 防禦**、**硬體周邊整合** 與 **全域版本號標記**。

---

## 📚 技能清單與總覽

| Skill 名稱 | 領域與主題 | 核心用途 |
| :--- | :--- | :--- |
| **[admin-dashboard-master](./admin-dashboard-master/SKILL.md)** | 全能管理後台 | 整合 Obsidian 經驗調閱、GAS+Firebase 雙軌驗證、防死鎖加載、全域版本號標記與 RWD 版型。 |
| **[barcode-input-listener-spec](./barcode-input-listener-spec/SKILL.md)** | 硬體與周邊 | 實體 USB 條碼槍防抖、焦點自動切換與 Html5Qrcode 相機鏡頭雙軌備援。 |
| **[firebase-nosql-boilerplate](./firebase-nosql-boilerplate/SKILL.md)** | Firebase & NoSQL | 避免複合索引崩潰、提供標準 AuthContext 與 try-finally loading 防禦機制。 |
| **[gas-secure-file-delivery](./gas-secure-file-delivery/SKILL.md)** | GAS 檔案傳輸 | 解決 GAS 產出 PDF/Word 時的 403 錯誤、跨網域權限與 Iframe 阻擋，提供安全 Blob 下載。 |
| **[gas-email-bridge-helper](./gas-email-bridge-helper/SKILL.md)** | GAS 自動化發信 | 免費 GAS Web App 發信 API 橋接器，支援 HTML 模板與承辦人無痛轉移指南。 |
| **[antigravity-gas-project-core](./antigravity-gas-project-core/SKILL.md)** | GAS 本地核心 | 資料庫自動 Migration、跨專案 API 路由器與 iframe 沙盒跳轉重定向。 |
| **[firebase-deploy-safety-checker](./firebase-deploy-safety-checker/SKILL.md)** | 部署資安防禦 | 發布 Hosting 或 API Key 前自動檢查環境變數，防止 publish 後前端黑屏崩潰。 |
| **[react-responsive-admin-layout](./react-responsive-admin-layout/SKILL.md)** | UI / RWD 版型 | React 標準響應式後台版型（Sidebar + Drawer + BottomNav），手機桌機無縫切換。 |
| **[admin-dashboard-consistency](./admin-dashboard-consistency/SKILL.md)** | 後台交接模板 | 提供標準化、安全性與無痛交接的管理後台初始化模板與自動化腳本。 |

---

## 🛠️ 各技能詳解：功能、避坑點與安裝使用

---

### 1. `admin-dashboard-master` (全能管理後台 Master Skill)
- 🎯 **功能與用途**：
  - 管理後台開發的集大成者。整合 Obsidian 開發經驗庫調閱、GAS+Firebase 雙軌驗證 (`adminAuth.js`)、防死鎖 UI 加載與 RWD 版型。
  - **強版號標記**：貫徹「三層版本號標記」，任何修改（含同日多次修正）均強制遞增 Patch/Revision 版號。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **Firestore 監聽死鎖**：`onSnapshot` Callback 內發生 ReferenceError 會導致 `setLoading(false)` 未執行而全頁轉圈。**必須使用 `try-finally` 包覆**。
  - **同日修訂版號快取問題**：修改程式後若未更新版號，瀏覽器會載入舊版快取。**必須每次修改更新 `version.js`**。
- ⚙️ **安裝與使用**：
  - 對話中提及「後台」、「Admin」、「請購單」、「庫存管理」時自動觸發。
  - 一鍵生成樣板：複製 `templates/adminAuth.js` 與 `templates/AdminLayout.jsx` 至專案中使用。

---

### 2. `barcode-input-listener-spec` (條碼槍與相機雙軌掃碼)
- 🎯 **功能與用途**：
  - 網頁接收實體 USB 條碼槍連續輸入的防抖處理 (50ms Buffer Debounce)、焦點維護，以及相機鏡頭 QR Code / 條碼雙軌備援。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **物理限制**：一維雷射/紅光條碼槍依賴紙張反光，**無法讀取手機或平板發光螢幕**。
  - **相機死機**：`Html5QrcodeScanner` 的 `onScanFailure` 回調**絕對不可省略**（即使空函數也必須傳入），否則觸發 `ReferenceError` 死機。
- ⚙️ **安裝與使用**：
  - 在前端監聽 `keydown` 事件並帶入防抖緩衝邏輯；相機模組依規範傳入成功與失敗 Callback。

---

### 3. `firebase-nosql-boilerplate` (Firebase 免索引防禦架構)
- 🎯 **功能與用途**：
  - 提供 Firestore 免索引查詢架構、標準 AuthContext 與防禦性資料載入。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **複合索引崩潰**：Avoid 跨多欄位 `.where()` + `.orderBy()` 的複合查詢，防止 Hosting 發布後提示 Index 缺失黑屏。
  - **靜態屬性崩潰**：存取未確定屬性未加 Optional Chaining (`?.`) 導致 `Cannot read properties of undefined`。
- ⚙️ **安裝與使用**：
  - 在建立 Firestore 查詢與 Context 時作為開發防禦規範。

---

### 4. `gas-secure-file-delivery` (GAS 檔案安全下載與預覽)
- 🎯 **功能與用途**：
  - 解決在 GAS Web App iframe 中產生 PDF/Word 檔時遇到的 403 錯誤、跨網域阻擋與第三方 Cookie 限制。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **多重帳號 403 衝突**：使用者登入多個 Google 帳號 (`/u/0/` vs `/u/1/`) 導致 Drive 連結拒絕存取。
- ⚙️ **安裝與使用**：
  - 後端以 Base64/Blob 傳回前端，前端用 `URL.createObjectURL` 觸發下載；外部連結對 `window.top` 重定向。

---

### 5. `gas-email-bridge-helper` (GAS 免費發信 API 橋接器)
- 🎯 **功能與用途**：
  - 利用 GAS 免費配對部署 Web App API，提供前端系統發送 HTML 信件與批次通知。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **配額與擁有權移交**：每日發信上限 (100封/2000封) 與承辦人異動時的腳本轉移。
- ⚙️ **安裝與使用**：
  - 部署 GAS Web App 設定 `doPost(e)`，前端使用 `fetch(gasUrl, { method: 'POST', body: ... })` 調用。

---

### 6. `antigravity-gas-project-core` (GAS 本地開發核心)
- 🎯 **功能與用途**：
  - 本地 Clasp 開發 GAS 專案核心規範：包含資料庫 Migration 演算法、跨專案 API 路由器。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **欄位無痛 Migration**：新版部署時，歷史 Spreadsheet 欄位缺失導致腳本讀取失敗。
- ⚙️ **安裝與使用**：
  - 本地開發 GAS 專案時載入此規範。

---

### 7. `firebase-deploy-safety-checker` (Firebase 部署資安檢查)
- 🎯 **功能與用途**：
  - 發布 Hosting 或設定 API Key 前，自動檢查環境變數檔 (.env) 避免 publish 後黑屏。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **金鑰遺失**：未帶入 `VITE_FIREBASE_API_KEY` 導致線上環境初始化失敗。
- ⚙️ **安裝與使用**：
  - 執行 `firebase deploy` 前載入檢查。

---

### 8. `react-responsive-admin-layout` (React 響應式後台版型)
- 🎯 **功能與用途**：
  - 提供 React 後台 RWD 版型（Sidebar + Drawer + BottomNav），無第三方重型 UI 庫依賴。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **硬編碼尺寸**：避免寫死 static pixel 偏移，使用自適應 CSS 變數。
- ⚙️ **安裝與使用**：
  - 複製 `AdminLayout.jsx` 至元件庫中使用。

---

### 9. `admin-dashboard-consistency` (管理後台初始化模板)
- 🎯 **功能與用途**：
  - 一鍵生成包含白名單、交接對接與 Audit Log 的完整後台結構。
- ⚠️ **必避地雷 (Pitfalls & Defense)**：
  - **權限鎖死**：轉移管理員資格未留下系統 Owner 備援。
- ⚙️ **安裝與使用**：
  - 執行 `antigravity admin-dashboard init`。

---

## 📥 如何在專案中安裝與使用本技能庫 (Installation & Usage)

### 1. 安裝至現有專案
將本 repository 下的 `.agents/skills/` 資料夾複製或 git submodule 至目標專案的 `.agents/skills/` 中：

```bash
# 複製技能庫至目標專案
cp -r .agents/skills/* /path/to/your-project/.agents/skills/
```

### 2. 在 AI Agent 中喚起使用
當使用 AntiGravity / Gemini Agent 開發時，Agent 會根據專案 `.agents/skills/` 中的 `SKILL.md` 自動識別並載入技能：
- 說「**開工**」、「**初始化管理後台**」：自動載入 `admin-dashboard-master`
- 說「**加入條碼槍掃描**」：自動載入 `barcode-input-listener-spec`
- 說「**部署 Firebase**」：自動載入 `firebase-deploy-safety-checker`

---

## 🏷️ 版本控管規範 (Versioning Policy)

本技能庫嚴格遵循 **「全域三層版本號標記與同日多次修訂遞增規範」**：
- 每次修改程式碼或 Skill 內容，版本號必須遞增（`v1.0.0` ➔ `v1.0.1` ➔ `v1.0.2`）。
- 詳情請參閱 Obsidian 筆記：`💻 程式開發經驗庫/🛡️ 1-系統防禦與除錯/version-tagging-spec.md`。
