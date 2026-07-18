# 冷氣卡借用管理系統 — 交接指南

版本：v1.0.0 | 建立日期：2026-07-18

---

## 📋 系統概述

本系統部署於 Firebase Hosting（零費用靜態托管），資料存於 Firebase Firestore（免費方案），發信透過 Google Apps Script 橋接。**無需任何伺服器或月費**。

---

## ✅ Step 1：移交 Firebase 後台管理權限（3 分鐘）

1. 現任管理員前往 [Firebase Console](https://console.firebase.google.com/)
2. 點選專案 `cjps-admin-hub`
3. 點選左下角「⚙️ 專案設定」→「使用者與權限」
4. 點「新增成員」，輸入**新任管理員的 Google 帳號（如 @kh.edu.tw）**
5. 角色選「**擁有者 (Owner)**」→「新增」
6. 新任管理員收到邀請信後接受即可完成移交
7. 現任管理員可選擇退出（自行移除自己的 Owner 角色）

---

## ✅ Step 2：新增管理員登入白名單（在系統中操作，1 分鐘）

1. 現任管理員登入系統
2. 進入左側選單「⚙️ 系統設定」
3. 在「👮 管理員白名單」欄位輸入**新任管理員的 Google 信箱**
4. 點擊「＋ 新增」
5. 新任管理員即可使用 Google 帳號登入系統管理後台

---

## ✅ Step 3：GAS 發信橋接移交（若使用個人帳號綁定，15 分鐘）

> **如果是使用學校公務信箱綁定 GAS，則此步驟可跳過，無需移交。**

若 GAS 腳本是由個人 Google 帳號建立：

1. 現任管理員前往 [Google Drive](https://drive.google.com/)，找到 `NotificationBridge.js` 所在的 Apps Script 專案
2. 右鍵 → 「共用」→ 輸入新任管理員信箱 → 設為「編輯者」
3. 新任管理員開啟腳本
4. 點選「部署」→「管理部署作業」→「新增版本」→ 重新部署
5. 複製新的 Web App URL，前往系統「⚙️ 系統設定 > GAS 發信設定」更新 URL

---

## 🗓️ 每學年開學作業（名單更新，10 分鐘）

1. 下載名單範本（系統「👥 借用單位管理」→「📥 下載範本」）
2. 用 Excel 填入新學年的班級、導師姓名與信箱
3. 回到系統「📤 批次匯入」→ 上傳填好的 Excel 檔案
4. 系統自動新增所有新單位
5. 舊年度已離職或合班的單位，手動在列表中刪除

---

## 🔧 常見問題排除

### Q：掃描槍掃描後沒有反應？
- 確認系統頁面目前的焦點在「借出/歸還」或「批次借用」頁面
- 確認掃描槍設定在**鍵盤模式（HID 模式）**，並且結尾有換行符（Enter）
- 嘗試在空白輸入框點一下後再掃描

### Q：Google 登入後顯示「存取遭拒」？
- 該帳號尚未加入管理員白名單
- 請現任管理員進入「⚙️ 系統設定 > 管理員白名單」新增此信箱

### Q：逾期通知信發不出去？
- 確認「⚙️ 系統設定 > GAS 發信設定」的 URL 是最新的部署 URL
- 確認借用單位有填寫信箱（在「👥 借用單位管理」確認）
- 可在瀏覽器直接開啟 GAS URL（應顯示 JSON 回應）確認服務正常

### Q：系統網址是什麼？
- Firebase Hosting URL：`https://cjps-admin-hub.web.app`

---

## 📁 系統檔案位置

| 項目 | 位置 |
|------|------|
| 前端原始碼 | `c:\2026Antigravity2\程式開發\ac-card-manager\` |
| GAS 腳本 | `c:\2026Antigravity2\程式開發\ac-card-manager\gas\NotificationBridge.js` |
| Firebase 設定 | `ac-card-manager\firebase.json` + `.firebaserc` |
| Firestore 安全規則 | `ac-card-manager\firestore.rules` |

---

*如有技術問題，本系統由 Antigravity AI 協助建置，相關問題可參考系統原始碼或重新尋求 AI 協助。*
