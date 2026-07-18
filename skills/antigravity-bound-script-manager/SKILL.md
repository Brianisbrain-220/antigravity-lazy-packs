---
name: antigravity-bound-script-manager
description: 用於自動化下載、設定與管理 Google Apps Script 容器繫結專案的本地開發資料夾。當您需要修改或開發試算表/文檔/表單等繫結腳本時載入。
---

# Apps Script 容器繫結專案管理 Skill (antigravity-bound-script-manager)

當使用者希望您在本地設定或開發一個特定的「容器繫結專案 (Container-bound Script)」時，請載入並依循此 Skill 工作流。

---

## ⚙️ 執行步驟與規範

### 1. 接收參數
您必須取得以下兩個基本資訊：
- **專案名稱 (project_name)**：用於本地資料夾命名（例如：`公開授課資料`）。
- **Script ID (script_id)**：該專案的 Apps Script 指令碼 ID。

### 2. 建立本地開發目錄
1. 在工作區中建立專屬目錄：`c:/2026Antigravity2/程式開發/Bound_Scripts/<project_name>`。
2. 確保目錄路徑不存在或為空。

### 3. 執行 clasp clone
1. 以 `c:/2026Antigravity2/程式開發/Bound_Scripts/<project_name>` 作為工作目錄 (`Cwd`)。
2. 執行指令：
   ```bash
   npx @google/clasp clone <script_id>
   ```
3. 檢查指令執行結果是否包含：
   - `Cloned X files.`
   - 確保目錄下產生 `.clasp.json` 與 `appsscript.json`。

### 4. 更新本地專案索引 (`projects_index.json`)
1. 讀取或建立 `c:/2026Antigravity2/程式開發/Bound_Scripts/projects_index.json`。
2. 將此新專案以 JSON 物件追加登錄：
   ```json
   {
     "name": "<project_name>",
     "scriptId": "<script_id>",
     "localPath": "Bound_Scripts/<project_name>",
     "clonedAt": "<UTC_TIMESTAMP>"
   }
   ```
3. 儲存並寫回。

### 5. 輕量化 Obsidian 專案登錄
為了節省 Token 消耗，請避免直接編輯超大型總表筆記，改採以下「分散式」登錄：
1. **建立專屬專案小筆記**：
   在 Obsidian 中建立新筆記，路徑為：`Bound_Project_<project_name>.md`。
   內容記載：
   - 專案名稱
   - Script ID
   - 試算表/文件連結 (如適用)
   - 本地開發路徑
2. **在總表中追加雙向連結**：
   讀取 `容器繫結專案的本地開發與 AI 自動化設定指南.md`，在清單末尾僅追加一行雙向超連結，格式為：
   - `[[Bound_Project_<project_name>]]` (例如：`- [[Bound_Project_公開授課資料]]`)
   確保總指南檔案體積不會因為專案過多而膨喚，從而最大程度節省未來讀取該檔的 Token。

### 6. 向使用者回報
列出已建立的本地資料夾路徑連結，並提示使用者可以直接進行後續的程式碼開發。
