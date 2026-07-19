---
name: firebase-deploy-safety-checker
description: "在發布 Firebase Hosting 或處理 API Key 時，自動檢查本地環境變數是否遺失，防止發布後應用程式在前端崩潰黑屏。"
---

# Firebase Deploy Safety Checker Skill

當使用者要求「發布 Firebase」、「部署 Hosting」，或是啟用了 `antigravity-secret-shield` 移除原始碼內的 API Key 時，必須自動載入此技能。

## 1. 核心問題背景
在 React / Vite 開發中，若將 Firebase API Key 等敏感資訊移至 `.env` 檔案中 (透過 `import.meta.env.VITE_FIREBASE_API_KEY` 讀取)，Vite 在 `npm run build` 打包時會將變數靜態替換。
**若本地端缺乏 `.env` 檔案，編譯器不會報錯，但會將該變數替換為 `undefined`。**
這將導致 Firebase 初始化時拋出同步錯誤 (`auth/invalid-api-key`)，使 React 應用程式無法掛載 (`#root` 為空)，最終導致線上版本呈現**「完全黑屏」**。

## 2. 部署前強制檢查清單
在執行 `npm run build && firebase deploy` 之前，代理 Agent 必須：
1. **檢查 `.env` 是否存在**：
   確認專案根目錄下有 `.env` 或是 `.env.local` 檔案。
2. **驗證金鑰完整性**：
   讀取 `.env` 檔案，確保 `VITE_FIREBASE_API_KEY` 與其他必要的變數有設定正確的值，絕不可為空白。
3. **雲端取回策略**：
   如果發現 `.env` 遺失，應立刻使用 Firebase MCP 工具 (`firebase_get_sdk_config`) 或從開發紀錄中取回 API Key 並重建 `.env` 檔案。
4. **環境分離確認**：
   確認 `.gitignore` 中有排除 `.env`，確保金鑰不會外洩至 GitHub。

## 3. 防禦性程式碼建議 (firebase.js)
在初始化 Firebase 時，建議加入防禦性檢查，若無 API Key 則在 Console 明確報錯，而非直接拋出例外導致全站崩潰：

```javascript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  console.error("CRITICAL ERROR: Firebase API Key is missing! Check your .env file.");
}
```

遵循此技能將可徹底消滅因為金鑰抽離與打包機制導致的線上「黑屏」災難。
