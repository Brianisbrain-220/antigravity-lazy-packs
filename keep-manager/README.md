# Google Keep Auto Organizer (GTD 系統精華)

## 📌 設計理念與功能
本專案為了解決 Google Keep 便箋數量龐大、難以管理的問題，採用 **GTD (Getting Things Done)** 哲學與 **規則導向 (Rule-based)** 理念，打造出安全、全天候在背景運作的智慧分類小助手。

### 核心功能
1. **自動上色與標籤**：依據便箋內容的關鍵字，自動套用 7 大分類的專屬顏色與標籤。
2. **文字級防護網 (Deep Content Assertion)**：嚴格的字元級防護網，推播前絕對比對節點差異，防堵非官方 API 任何可能造成的心血內容被竄改。
3. **無縫共生體驗**：允許使用者自由在 Google Keep 內打上 `#` (Hashtag) 來動態創建特定的標籤（例如 `#2026科展`），將大架構的顏色、主軸歸類交給本系統在背後默默完成。
4. **一鍵還原 (Rollback)**：每次執行皆會記錄 Snapshot 備份，搭配 `restore.py` 即可依 `RUN_ID` 秒速還原。且還原機制會聰明避開使用者後續修改過的便箋。
5. **增量更新 (Incremental Sync)**：搭配 Windows 任務排程器每日定期巡檢，極度節省網路流量與記憶體。

### 七大分類 (Taxonomy Specification)
本系統遵循嚴謹的色彩心理學，自動套用以下 7 大情境分類：
- 🔴 `ColorValue.Red` (珊瑚紅)：**今日必辦 / 截標截止 / 關鍵警告** (例如：待辦-緊急)
- 🟠 `ColorValue.Orange` (蜜桃橙)：**本週進行中專案 / 教學準備** (例如：教學-備課)
- 🟡 `ColorValue.Yellow` (鵝蛋黃)：**待確認事項 / 待採買 / 靈感隨手記** (例如：待辦-日常)
- 🟢 `ColorValue.Green` (草木綠)：**常態例行 / 健康生活 / 週期任務** (例如：生活-日常)
- 🔵 `ColorValue.Blue` (海洋藍)：**標準流程 SOP / 資源 / 聯絡手冊** (例如：行政-公務)
- 🌊 `ColorValue.Teal` (湖水綠)：**中長期專案 / 系統架構參考** (例如：專案-AI)
- 🟣 `ColorValue.Purple` (迷濛紫)：**教學反思 / 讀書心得 / 個人成長** (例如：筆記-知識庫)
- ⚪ `ColorValue.White` (預設白)：**未分類 / 待整理 (Inbox)** 

---

## 🚀 安裝與部署流程
### 1. 系統需求
- Windows 作業系統
- Python 3.12 (強制使用虛擬環境)
- [uv](https://github.com/astral-sh/uv) (推薦) 或標準 python venv

### 2. 環境初始化
嚴禁全域安裝。請在專案根目錄開啟終端機 (PowerShell) 並執行：
```powershell
uv venv --python 3.12
.venv\Scripts\activate
uv pip install gkeepapi keyring gpsoauth filelock python-dotenv
```

### 3. 設定參數
複製 `.env.template` 為 `.env`，並填入您的 Google 帳戶 Email，以及一組隨機的 16 位 16 進位字串作為 Android ID。
```env
KEEP_EMAIL=your_email@gmail.com
ANDROID_ID=8dc0fa4b25e13976
```

### 4. 首次認證登入 (Master Token)
請執行以下指令，並依其中提示的網址去登入並把 `oauth_token` 貼回終端機。
```powershell
python bootstrap_token.py
```
> ⚠️ 系統會瞬間取回金鑰，並存入您的 Windows 憑證管理員 (Credential Manager)，硬碟中不留密碼明碼。此 Master Token 等同您的 Google 帳戶密碼，嚴禁外洩。

### 5. Windows 背景排程設定
排程系統將依據增量模式每天自動執行。
使用 PowerShell 執行以下指令以建立排程：
```powershell
$dir = 'C:\2026Antigravity2\keep-manager'
$action   = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$dir\silent_run.vbs`"" -WorkingDirectory $dir
$trigger  = New-ScheduledTaskTrigger -Daily -At 23:00
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'GoogleKeepAutoOrganizer' -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force
```
> 💡 若需取消，可執行 `Disable-ScheduledTask -TaskName 'GoogleKeepAutoOrganizer'`。

---

## 🛠️ 開發與自訂
若您想調整七大分類的關鍵字與標籤，請直接修改 `config.py` 中的 `TAXONOMY_RULES` 陣列。修改存檔後，下一次的排程巡檢就會自動套用新規則。
建議設定每條規則只有 1 個對應標籤，且關鍵字採用 `\b` 邊界（例如 `r"\b(ai|python)\b"`）以避免誤判。
