# 🚀 Anti-Gravity 懶人包一鍵整合包 (antigravity-lazy-packs)

本專案整理並提供了 AI 編碼助理 **Anti-Gravity** 的 9 大核心技能 (Skills) 與一鍵安裝配置。

> 💡 **致敬與來源說明**：本懶人包的原始設計、踩坑筆記與規格引導，均改進自 **三師爸** (mathruffian-dot) 無私分享的教學、原始儲存庫與實戰經驗，特別感謝三師爸對於 AI 輔助軟體開發與創作者社群的貢獻！

---

## 📦 9 大技能 (Skills) 一覽

本懶人包收錄於專案的 [skills/](file:///skills/) 目錄下，包含以下功能：

| 編號 | 技能名稱 | 說明 |
| :--- | :--- | :--- |
| **01** | `01-notebooklm` | 連接 NotebookLM MCP 進行智慧知識庫查詢 |
| **02** | `02-github` | 連接 GitHub CLI 進行代碼庫管理與推送 |
| **03** | `03-firebase` | 連接 Firebase MCP (含 Node.js 24 Keep-Alive 排障包裝器) |
| **04** | `04-draw` | 呼叫 AntiGravity 原生 `generate_image` 生圖指引 |
| **05** | `05-workflow` | 設定開工、收工與新專案初始化規範 |
| **06** | `06-obsidian` | 連接 Obsidian MCP (MCPVault) 實現本地專案駕駛艙同步 |
| **07** | `07-clasp-netlify` | 連接 Clasp 與 Netlify MCP 雙向網頁發佈部署系統 |
| **08** | `08-html-slide-builder` | 智慧 HTML (Reveal.js) 簡報生成器，整合 Firestore 投票互動元件 |
| **09** | `09-video-specs` | 三類影片製作規範（活動紀錄、教學影片、社群科普）與自動渲染/打包技能 |
| **00** | `00-install-all` | 一次安裝以上全部技能 |

---

## 🛠️ 自動化開發助手與安裝方式

為了解決 Windows 環境下安裝技能時容易產生巢狀嵌套資料夾的 Bug，以及解決各 CLI 連線長路徑與認證過期痛點，專案內建了三款一鍵自動化 PowerShell 腳本工具：

### 1. ⚙️ 環境變數修復工具 (`setup_env.ps1`)
- **功能**：自動偵測 `git.exe`、`gh.exe`、`nlm.exe`、`firebase.cmd` 本機安裝路徑。若未加入 PATH，會自動將其加入您的 User 環境變數中。
- **好處**：執行並重啟編輯器後，您或 AI 可以直接輸入簡短命令（如 `nlm login` / `firebase login`），無須手動尋找長路徑。
- **執行方式**：在 PowerShell 中執行：
  ```powershell
  .\setup_env.ps1
  ```

### 2. 🚀 一鍵安全技能安裝器 (`install.ps1`)
- **功能**：自動清除全域舊 Skills 資料夾，並將 `skills/` 下所有技能乾淨複製到您的全域目錄下（`$Home\.gemini\config\skills\`），**徹底解決 Windows 的巢狀重複資料夾複製 Bug**。
- **執行方式**：在 PowerShell 中執行：
  ```powershell
  .\install.ps1
  ```

### 3. 🔍 服務認證狀態診斷器 (`check_status.ps1`)
- **功能**：一鍵檢測 Git、GitHub、NotebookLM、Firebase 以及 Obsidian 的登入與時效狀態，並給出 Token 免互動登入的提示。
- **執行方式**：在 PowerShell 中執行：
  ```powershell
  .\check_status.ps1
  ```

### 4. 🛡️ 密鑰防護與環境變數安全配置工具 (`skills/antigravity-secret-shield/scripts/guard.ps1`)
- **功能**：
  1. `Check`：一鍵掃描工作區或暫存檔案中是否含有 Google API、Gemini API、GitHub Token 等硬編碼秘密特徵。
  2. `SetKey`：將 API 金鑰安全配置到 `.env.local` 檔案（並自動將該檔案寫入 `.gitignore`），避免憑證外洩。
  3. `InitIgnore`：為專案快速配置基本 `.gitignore` 排除範本。
- **執行方式**：
  ```powershell
  # 掃描秘密金鑰
  powershell.exe -File .\skills\antigravity-secret-shield\scripts\guard.ps1 Check
  
  # 配置金鑰至 .env.local
  powershell.exe -File .\skills\antigravity-secret-shield\scripts\guard.ps1 SetKey -Key "VITE_FIREBASE_API_KEY" -Value "AIzaSy..."
  ```

---

## ⚡ 請 AI 自動安裝（最推薦）
您也可以直接將此儲存庫網址提供給 Anti-Gravity，並貼上以下指令：
```text
這是我的 Anti-Gravity 懶人包：https://github.com/Brianisbrain-220/antigravity-lazy-packs
請讀取這個 repo，並依據根目錄 SKILL.md 指引，列出所有可用技能，並幫我一次安裝全部。
```
AI 會自動讀取 `SKILL.md`，並藉由內建的自動化腳本為您將技能安全安裝至全域目錄下。

### 📝 手動閱讀設定
您可以直接開啟本機的 [09-AntiGravity專屬懶人包.md](file:///09-AntiGravity專屬懶人包.md) 檔案，將文件內容交給 AI 助理，依據手冊的指示分步完成環境檢查、OAuth 授權以及 MCP 設定。

---

## ⚠️ Windows 環境踩坑 FAQ
在安裝與執行過程中，若遇到錯誤，請參考以下常見解決方案：

1. **Python 中文輸出崩潰 (`UnicodeEncodeError`)**：
   - **現象**：執行 `setup.py` 檢查環境時印出 `✓` 或特殊符號時崩潰。
   - **解法**：在終端機中設置環境變數 `$env:PYTHONUTF8 = "1"` 以強制 Python 以 UTF-8 輸出。

2. **Playwright 於 Google Drive 目錄安裝極慢**：
   - **現象**：`npm install` 或 `playwright install` 卡死或報錯。
   - **解法**：一律將 Playwright 安裝在非 GDrive 的臨時目錄（如 `%TEMP%/cvs-render/`），並在執行腳本前將 `NODE_PATH` 指向該路徑。

3. **Firebase Token 驗證無限循環失敗**：
   - **現象**：無論瀏覽器驗證多少次都顯示憑證失效。
   - **解法**：這是 Node.js `v24.17.0` 開發版的 Keep-Alive Regression Bug。請改用 `firebase-wrapper.js` 包裝腳本停用連線保持，或將本地 Node.js 降級至穩定的 LTS 版本 (`v20.x`)。

4. **FFmpeg 合併音視訊後無聲**：
   - **現象**：錄出的 WebM 在合併 master_audio 後無聲音。
   - **解法**：合併指令必加參數 `-map 0:v:0 -map 1:a:0` 映射音軌，以防 WebM 空白音軌覆蓋旁白。

---

## 🔗 三師爸相關懶人包系列
- Codex 懶人包：https://github.com/mathruffian-dot/codex-lazy-packs
- Claude Code 懶人包：https://github.com/mathruffian-dot/claude-code-lazy-packs
- OpenCode 懶人包：https://github.com/mathruffian-dot/opencode-lazy-packs
- 簡報與影片原作者 Repo：https://github.com/mathruffian-dot/claude-html-slide-builder 及 https://github.com/mathruffian-dot/claude-video-specs
