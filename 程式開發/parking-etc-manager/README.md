# 停車管理與 ETC 登記系統 (Parking & ETC Management System)

本系統為高雄市中正國小量身打造之智慧化停車與 ETC 管理服務，整合前端相機 OCR 車牌辨識、雙軌底圖動態套印、違規自動推播及到期自動提醒功能。

## ✨ 核心特色功能

1. **五大身分別與雙軌底圖套印**
   - **本校正職教職員工**：發給「學年度汽車停車證」，支援管理員自訂學年度文字列印。
   - **代理代課、外聘、社團教師與志工**：發給「臨時汽車停車證」，支援自訂有效期限文字列印。
   - **A4 橫式 2列4欄**：自動排版一頁滿載 8 張停車證，直截裁切超便利。

2. **智慧續約與一鍵帶入**
   - 整合 GAS 到期檢查排程，在停車證有效期限**前 1 個月**自動寄送 Email 提醒。
   - 點擊通知信件連結即可「一鍵帶入歷史資料」，若無須改車牌即可快速確認送出。

3. **車牌相機 OCR 辨識與違規管理**
   - 後台整合 WebRTC 相機與 Tesseract.js 車牌文字辨識，並備有**手動編輯與查詢** Fallback。
   - 登錄違規紀錄即時透過 GAS 橋接通知車主 (Email/LINE/Google Chat)，並支援後台查詢篩選與批次刪除。

4. **行政管理後台與批次處理**
   - 跨裝置 RWD 設計（Sidebar + Drawer + BottomNav），手機外出查車牌也流暢。
   - 支援 CSV 資料批次匯入建檔與匯出下載。
   - 支援「停車管理辦法」動態發布，前台申請自動抓取最新版規範。

## 🌐 線上展示與發布

- **線上展示網址 (Firebase Hosting)**：[https://cjps-parking.web.app](https://cjps-parking.web.app)
- **一鍵發布指令 (Windows 工具)**：雙擊執行專案目錄下的 `一鍵打包與發布Firebase.bat`，即可自動完成編譯 (`npm run build`)、雲端發布 (`firebase deploy --only hosting`) 及 GitHub 版本同步。

## 🚀 快速啟動

```bash
# 1. 安裝套件
npm install

# 2. 啟動本機開發環境 (預設包含 Local Mock 示範資料，免設定即可試玩全站)
npm run dev
```

## 🔐 環境變數設定

參考 `.env.example`，將以下變數填入專案根目錄 `.env` 檔即可串接正式雲端 Firebase 與 GAS Webhook：

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_GAS_WEBHOOK_URL=https://script.google.com/macros/s/xxx/exec
```
