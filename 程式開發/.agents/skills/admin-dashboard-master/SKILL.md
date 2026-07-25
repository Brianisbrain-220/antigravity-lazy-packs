---
name: admin-dashboard-master
description: 當開發過程中提到「管理後台」、「後台管理」、「後台設定」、「請購單系統」、「庫存管理」、「權限後台」或「系統管理」等關鍵字時自動載入。提供標準化初始化腳本 (init)、Obsidian 開發經驗庫調閱、GAS+Firebase 雙軌驗證、防死鎖加載、全域三層版本號標記與 RWD 版型標準化範本。
---

# admin-dashboard-master Skill

提供 `c:\2026Antigravity2\程式開發` 工作區專案一個一致、安全且具備交接機制的管理後台腳本與模板。

## 🚀 零步：初始化腳本 (Initialization)
對於全新專案，可直接執行以下指令自動生成完整架構：
```sh
antigravity admin-dashboard init
```
此指令會啟動 Python 腳本，在當前專案中自動生成：
- `src/pages/AdminDashboard.jsx` – 完整後台 UI (CSV 匯入、類別管理、白名單、發信設定、交接模組)
- `src/components/AdminLayout.jsx` – 包含主題支援的標準排版
- `src/utils/adminAuth.js` – Firebase 登入與白名單權限檢查
- `firestore_rules.rules` – 限制僅允許白名單管理員存取的安全規則範本
- 同時自動更新 `package.json` 加入 `admin:*` 的相關 npm 指令。

---

## 🔍 第一步：Obsidian 實戰經驗庫動態調閱 (Mandatory Step)

在開始編寫或修改後台任何模組前，**必須優先調閱 Obsidian 筆記庫**，汲取歷史實戰經驗與地雷處置方式：

### 必須檢索的經驗庫目錄：
`💻 程式開發經驗庫/`
1. **🛡️ 1-系統防禦與除錯**：
   - `version-tagging-spec.md` (全域前端、後端、程式碼三層版本別標記與同日多次修訂遞增規範)
   - `firebase-loading-deadlock.md` (Firestore onSnapshot 內部 try-finally 防鎖死)
   - `gas-403-cors-file-delivery.md` (GAS 網頁產出 PDF/Word 下載與預覽 403 解法)
2. **🔌 2-硬體與周邊整合**：
   - `barcode-scanner-dual-mode.md` (USB 條碼槍防抖與 Html5Qrcode 相機雙軌)
3. **🔐 3-權限與驗證**：
   - `gas-firebase-hybrid-auth.md` (GAS 與 Firebase 雙軌帳號驗證)
   - `GAS與Firebase混合架構開發踩坑紀錄.md` (解決 Workspace MailApp 權限封鎖、授權快取黑洞與 CORS 302 跳轉問題)
4. **📐 4-介面與版型**：
   - `responsive-admin-layout.md` (RWD 手機/桌機雙模版型)

---

## 🛠️ 第二步：雙軌混合開發模式 (Hybrid Approach)

### 模式 A：一鍵骨架生成 (Boilerplate Generator)
為新專案或全新後台頁面建立基礎檔案：
1. **複製版本設定檔**：建立 `src/config/version.js` 維護唯一真實版本號 (Single Source of Truth)。
2. **複製雙軌驗證模組**：將 `templates/adminAuth.js` 複製至專案 `src/utils/adminAuth.js`。
3. **複製響應式版型**：將 `templates/AdminLayout.jsx` 複製至專案 `src/components/AdminLayout.jsx`。

### 模式 B：動態 Snippet 指引 (Dynamic Component Guidance)
針對特化功能頁面（如：條碼掃描、請購審核、權限交接），直接採用經驗庫規範進行動態協作。

---

## 🛡️ 第三步：管理後台核心四大防禦與標記規範

### 1. 全域版本別一致性標記與同日多次修訂 (Strict Version Increment)
- **⚡ 強制遞增規則**：**任何程式碼或設定修訂（即使同一天修正多次），都必須更新版號 (Patch +1 或 Revision +1)**，嚴禁兩次修訂重複使用相同版號。
- **程式碼檔頭 (Code Level)**：檔頭註解維護最新 `@version` 與異動時間。
- **前端呈現 (UI & Console)**：頁尾 Footer 顯示最新版號（如 `v1.0.3-b2`）；Console log 輸出彩框版號。
- **後端與 API (Backend & Logs)**：所有 API 回傳 JSON（包含 GAS）結構均包含與前端一致的 `_version` 屬性。

### 2. 雙軌帳號驗證 (GAS + Firebase Auth)
- 統一呼叫 `checkAdminPermission()`，自動判定當前處於 `google.script.run` 還是 Firebase Firestore。
- 白名單中必須包含 `role` 與 `isOwner` 欄位，確保支援權限轉移。

### 3. UI 載入鎖定防死鎖 (Loading Safety Guarantee)
- 任何非同步操作（Async/Await）或 Firestore `onSnapshot` 監聽器，**內部渲染必須強制使用 try-finally 結構**。
- `finally` 區塊中必須包含 `setLoading(false)` 或 `hideLoader()`，確保 100% 釋放 UI 鎖定。
- 物件欄位存取一律加上 Optional Chaining (`?.`) 與預設值（例如：`user?.name ?? ''`）。

### 4. 硬體掃碼雙軌備援
- 當後台需要條碼或 QR Code 輸入時，預設支援 USB 掃描槍輸入（50ms Buffer Debounce）；
- 同時必須傳入 `Html5QrcodeScanner` 的 `onScanFailure` 回調（空函數即可），避免相機模組崩潰。

---

## 📝 第四步：新開發經驗自動歸檔與回流 (Obsidian Knowledge Sync)

當完成一個新功能的開發或除錯後：
1. 提煉本次開發中的「特殊地雷」、「效能優化」或「關鍵邏輯」。
2. 使用 `obsidian` 工具的 `write_note` 寫入 `💻 程式開發經驗庫` 對應的分類資料夾中。
3. 確保未來的開發輪次能自動繼承最新的實戰經驗。
