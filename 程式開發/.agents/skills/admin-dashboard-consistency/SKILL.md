---
name: admin-dashboard-consistency
description: 當開發過程中提到「管理後台」、「後台管理」、「後台設定」、「權限交接」、「管理端」或「系統管理」等關鍵字時自動載入，提供標準化、安全性與無痛交接的後台初始化模板與腳本。
---

# admin-dashboard-consistency Skill

提供 `c:\2026Antigravity2\程式開發` 工作區專案一個一致、安全且具備交接機制的管理後台腳本與模板。

## 使用方法

```sh
antigravity admin-dashboard init
```

執行此指令會啟動 Python 腳本，在當前專案中自動生成：
- `src/pages/AdminDashboard.jsx` – 完整後台 UI (CSV 匯入、類別管理、白名單、發信設定、交接模組)
- `src/components/AdminLayout.jsx` – 包含主題支援的標準排版
- `src/utils/adminAuth.js` – Firebase 登入與白名單權限檢查
- `firestore_rules.rules` – 限制僅允許白名單管理員存取的安全規則範本
- 雲端函式 (Cloud Functions) 用於自動同步交接與提醒

同時會自動更新 `package.json` 加入 `admin:*` 的相關 npm 指令。

## 可用參數
- `--framework vite|next` – 選擇前端框架 (預設為 vite)
- `--typescript` – 生成 TypeScript 檔案而非 JavaScript
- `--i18n` – 啟用中英文雙語 UI
- `--no-audit` – 跳過建立選填的審計日誌 (audit‑log)

輸入 `antigravity admin-dashboard init --help` 查看更多細節。

## 常見問題 (FAQ)
- **如何轉移管理員權限？** 可使用後台「交接管理」頁面或執行 Cloud Function `handoverSync` 進行安全對接。
- **如何調整主題顏色？** 編輯 Firestore 中的 `admin_settings.theme` 即可即時同步至前端。
