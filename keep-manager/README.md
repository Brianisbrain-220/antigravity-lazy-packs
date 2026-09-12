# Google Keep Auto Organizer (GTD 分類精靈)

## 📌 設計理念與功能
本專案為了解決 Google Keep 便箋數量龐大、難以管理的問題，採用 **GTD (Getting Things Done)** 哲學與**固定收納箱 (Rule-based)** 的概念，打造出能全自動、全天候在背景運行的智慧分類引擎。

### 核心功能
1. **自動上色與上標籤**：依據便箋內容的關鍵字，自動套用 7 大分類的專屬顏色與標籤。
2. **防覆蓋安全網 (Deep Content Assertion)**：嚴格的字元級防護網，推播前會比對節點差異，防堵因 API 或不可抗力造成的心血內容被竄改。
3. **無縫接軌原生體驗**：我們鼓勵使用者運用 Google Keep 原生的 `#` (Hashtag) 來動態創建特定小標籤（例如 `#2026科展`），而將大架構的「上色、主分類歸檔」交給本系統在背景默默完成。
4. **一鍵時光機 (Rollback)**：每次執行前皆會產生 Snapshot 備份，搭配 `restore.py` 即可指定 `RUN_ID` 秒速還原。且還原過程能聰明避開使用者後續修改過的便箋。
5. **增量更新 (Incremental Sync)**：搭配 Windows 任務排程器，每小時背景增量比對，極度節省網路流量與記憶體。

### 七大分類 (可自訂)
- 🚨 **緊急與待辦** (紅)
- 🏫 **教學與班級經營** (綠)
- 💼 **學校行政與公文** (橘)
- 💻 **專案與程式開發** (藍綠)
- 🧠 **知識庫與學習筆記** (藍)
- 🛒 **生活與採買** (黃)
- 📥 **未分類收件匣** (白 / Default)

---

## 🛠️ 安裝與部署流程

### 1. 環境需求
- Windows 系統 (支援工作排程器)
- Python 3.12+ (建議使用全局環境安裝)

### 2. 安裝套件
請打開終端機 (PowerShell) 並執行：
```powershell
pip install gkeepapi keyring gpsoauth filelock python-dotenv
```

### 3. 設定參數
複製 `.env.template` 為 `.env`，並填入您準備登入的 Google 帳號 Email，以及生成一組隨機的 16 位 16 進位字串作為 Android ID：
```env
KEEP_EMAIL=your_email@gmail.com
ANDROID_ID=8dc0fa4b25e13976
```

### 4. 首次授權登入 (Master Token)
請執行以下指令，並依照中文提示點擊網址、登入並取得 `oauth_token` 貼回終端機：
```powershell
python bootstrap_token.py
```
> 💡 系統會瞬間將金鑰加密並鎖進您的 Windows 憑證管理員 (Credential Manager)，硬碟絕不存儲明碼密碼。

### 5. Windows 背景排程設定 (自動化運行)
系統內附 `run_sync.bat` 與 `silent_run.vbs` 以隱藏黑畫面。
只需在 PowerShell 執行以下指令，即可掛載每天 08:00 到 23:00、每小時執行一次的完全隱形排程：
```powershell
schtasks /create /tn "GoogleKeepAutoOrganizer" /tr "wscript.exe %CD%\silent_run.vbs" /sc daily /st 08:00 /du 15:00 /ri 60
```
> 未來可隨時在「工作排程器」中修改或停用此任務。

---

## 👨‍💻 開發與自訂
如果您想調整七大分類的關鍵字、顏色與標籤，請直接修改 `config.py` 中的 `TAXONOMY_RULES` 陣列。
修改存檔後，下一次的整點排程就會自動套用新規則！
