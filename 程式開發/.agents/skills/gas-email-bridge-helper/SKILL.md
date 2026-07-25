---
name: gas-email-bridge-helper
description: 透過 Google Apps Script (GAS) 部署免費 Web App 發信 API 橋接器，支援 HTML 信件模板與批次發信，並包含承辦人輪調時的擁有權無痛轉移指南。
---

# GAS 免費發信橋接器設計與部署技能 (gas-email-bridge-helper)

本技能指導如何在 Web App 中利用 Google Apps Script (GAS) 建立完全免費且送達率高的信件發送服務，特別適用於學校等擁有 Google Workspace 帳號的組織環境。

## 📨 GAS 發信端 Web App 腳本模板

建立一個獨立的 Google Apps Script 專案，將其部署為「網路應用程式」，執行身分設為「我」，存取權限設為「所有人」。

```javascript
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;
    let result = { success: false, message: '未知的 Action' };

    if (action === 'sendEmail') {
      result = sendEmail(req);
    } else if (action === 'ping') {
      result = { success: true, message: '連線成功', timestamp: new Date().toISOString() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: 'Error: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendEmail(req) {
  const { to, subject, htmlBody, plainBody } = req;
  if (!to || !to.includes('@')) return { success: false, message: '無效的收件信箱' };
  
  try {
    GmailApp.sendEmail(to, subject, plainBody || '請使用支援 HTML 的郵件客戶端讀取此信件。', {
      htmlBody: htmlBody,
      name: "系統通知"
    });
    return { success: true, message: '發信成功' };
  } catch (e) {
    return { success: false, message: '發信失敗：' + e.toString() };
  }
}
```

---

## ⚠️ 踩坑與防禦指南：Google Workspace 權限快取黑洞

在開發與更新 GAS 發信橋接器時，極易遇到以下兩個致命權限問題：

### 1. MailApp 被 Google Workspace 默默封鎖
**症狀**：Web App 執行身分設為 `我 (USER_DEPLOYING)` 時，呼叫 `MailApp.sendEmail` 拋出 `Exception: 你沒有呼叫「MailApp.sendEmail」的權限`。
**原因**：Google 教育版/企業版針對匿名 Web App 防止垃圾信件濫用。
**解法**：強制將寄信引擎升級為 `GmailApp.sendEmail`，並在 `appsscript.json` 中宣告最高權限 `https://mail.google.com/`。

### 2. GAS 網頁編輯器「授權快取黑洞」 (The Authorization Cache Bug)
**症狀**：透過 `clasp` 推送更新了 `GmailApp` 程式碼與 `appsscript.json` 後，點擊「新增部署作業」卻沒有跳出 OAuth 授權視窗，導致新版 Web App 依舊因為缺乏權限而崩潰。
**解法 (強制喚醒授權)**：
只要您有更新 GAS 的權限範圍（例如剛換上 GmailApp），在部署前 **絕對必須** 執行以下動作：
1. 開啟 GAS 網頁編輯器，進入 `Code.js`。
2. **手動敲擊一個空白鍵 (破壞 AST 快取)**。
3. **點擊儲存 💾** (強制系統重新解析程式碼)。
4. 選擇上方任何一個包含 `GmailApp` 的函式（例如可寫一個空的 `SYS_AuthMailApp`）並點擊 **「執行」**。
5. 此時才會真正跳出「需要審查權限」的藍色視窗！完成授權（進階 -> 前往不安全 -> 允許）後。
6. 最後再進行「新增部署作業」，產生的網址才真正帶有發信權限。

---

## 🔗 前端 Web App 串接與發信鎖

在網頁端呼叫 GAS Web App 時，應實作發信鎖（例如變更按鈕狀態為「發送中...」），防止使用者連續點擊發送重複郵件。

```javascript
import React, { useState } from 'react';

export function SendEmailButton({ targetEmail, emailData, gasWebhookUrl, toast }) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!gasWebhookUrl) {
      toast('請先在設定中配置 GAS 發信 Webhook URL', 'error');
      return;
    }
    setSending(true);
    try {
      const response = await fetch(gasWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendEmail',
          to: targetEmail,
          subject: emailData.subject,
          htmlBody: emailData.htmlBody
        })
      });
      const res = await response.json();
      if (res.success) {
        toast('✅ 信件發送成功！', 'success');
      } else {
        toast('❌ 發送失敗：' + res.message, 'error');
      }
    } catch (e) {
      toast('❌ 連線至發信橋接器失敗：' + e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <button className="btn btn-sm btn-primary" onClick={handleSend} disabled={sending}>
      {sending ? '發送中...' : '📧 發送通知'}
    </button>
  );
}
```

---

## 📦 承辦人輪調時的系統交接程序

為確保發信功能在學校行政人員輪調（如組長或承辦人更換）時能順利運作，必須在交接手冊中載明以下標準交接步驟：

### 情況 A：使用公用/處室公務信箱（最推薦）
- 如果 GAS 專案是在學校的公務信箱（如 `device@school.edu.tw`）下建立與部署。
- **交接作法**：新承辦人直接接管該公務信箱，**完全不需要重新部署或修改系統程式碼**。

### 情況 B：使用承辦人個人信箱
- 如果 GAS 專案部署在現任承辦人的個人信箱下，當此人離職時：
  1. **共用專案**：在 Google 雲端硬碟中，將該 GAS 專案檔案「共用」給新承辦人的 Google 帳號。
  2. **移轉擁有權**：將擁有者權限（Owner）完全移交給新承辦人。
  3. **重新授權與部署**：
     - 新承辦人登入自己的帳號開啟該 GAS 專案。
     - 點選「部署」→「管理部署作業」→ 選擇編輯圖示 → 點選「部署（新版本）」。
     - 系統會提示需要新承辦人的 Google 授權，完成後即改由新承辦人的個人信箱發信。
     - **注意**：如果部署 URL 發生改變，需複製新 URL 前往系統「系統設定 > GAS 發信設定」更新該網址。
