---
name: antigravity-secret-shield
description: 密鑰防護盾技能。自動檢查專案中是否含有硬編碼金鑰，安全寫入/配置 API Key 於本地環境，防堵隱私憑證外洩。說「檢查密鑰」「設定 API Key」「保護環境變數」時載入。
---

# Anti-Gravity 密鑰防護盾 (Secret Shield)

本技能提供了一套安全的憑證管理機制，防止開發者與 AI 代理將敏感的 API 金鑰與個人 Token 提交至公開的 Git 儲存庫。

## 🛡️ AI 運作守則（必遵項目）

當您作為 AI 代理，在協助開發網頁或試算表腳本時，必須遵循以下安全原則：
1. **絕不寫死金鑰**：嚴禁在代碼中以字串字面量寫死 `apiKey`、`api_key`、`token` 等敏感資訊。
2. **優先配置環境變數**：在前端代碼中，應使用環境變數讀取（如 `import.meta.env.VITE_FIREBASE_API_KEY` 或 `process.env.GEMINI_API_KEY`）。
3. **主動建議寫入金鑰**：若偵測到專案需要 API Key 才能執行，請主動向使用者提議執行 `guard.ps1 SetKey` 指令來安全建立本地組態，而不要直接向使用者索取金鑰或寫入代碼中。

---

## 🛠️ 指令工具使用方式

本專案提供根目錄下的防護腳本 `skills/antigravity-secret-shield/scripts/guard.ps1`，主要功能如下：

### 1. 偵測工作區金鑰外洩
掃描目前暫存區（Staged files）或整個專案內是否包含 Google API Key、Gemini API Key、GitHub Token、LINE Token 等敏感欄位：
```powershell
powershell.exe -File .\skills\antigravity-secret-shield\scripts\guard.ps1 Check
```

### 2. 安全地將金鑰寫入本地環境
建立不受 Git 追蹤的本地環境檔案 `.env.local` 並寫入指定金鑰：
```powershell
powershell.exe -File .\skills\antigravity-secret-shield\scripts\guard.ps1 SetKey -Key "VITE_FIREBASE_API_KEY" -Value "AIzaSy..."
```

### 3. 初始化防外洩的 .gitignore 範本
自動更新專案下的 `.gitignore`，確保排除 `.env*`、私有金鑰與任何敏感專案目錄：
```powershell
powershell.exe -File .\skills\antigravity-secret-shield\scripts\guard.ps1 InitIgnore
```
