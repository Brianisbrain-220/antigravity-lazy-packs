# 🚀 Anti-Gravity 懶人包一鍵整合包 (antigravity-lazy-packs)

本專案整理並提供了 AI 編碼助理 **Anti-Gravity** 的 9 大核心技能 (Skills) 與一鍵安裝配置。

> 💡 **致敬與來源說明**：本懶人包的原始設計、踩坑筆記與規格引導，均改進自 **三師爸** (mathruffian-dot) 無私分享的教學、原始儲存庫與實戰經驗，特別感謝三師爸對於 AI 輔助軟體開發與創作者社群的貢獻！

---

## 📦 9 大技能 (Skills) 一覽

本懶人包收錄於專案的 [.agents/skills/](file:///.agents/skills/) 目錄下，包含以下功能：

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

## 🛠️ 使用與安裝方式

### ⚡ 方式一：請 AI 自動安裝（最推薦）
您可以直接將此儲存庫網址提供給 Anti-Gravity，並貼上以下指令：
```text
這是我的 Anti-Gravity 懶人包：https://github.com/Brianisbrain-220/antigravity-lazy-packs
請讀取這個 repo，並依據根目錄 SKILL.md 指引，列出所有可用技能，並幫我一次安裝全部。
```
AI 會讀取根目錄的 `SKILL.md`，列出可用技能，並依序將它們下載、註冊到您本地的工作區目錄下（`.agents/skills/`）。

### 📝 方式二：手動閱讀設定
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
