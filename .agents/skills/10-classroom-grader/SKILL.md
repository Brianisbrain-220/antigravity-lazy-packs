---
name: classroom-grading-assistant
description: Google Classroom 批改、歸檔與同步小助手。說「批改作業」「同步成績」「歸檔作業」時載入。
---

# Google Classroom 批改、歸檔與同步小助手

本技能封裝了 Google Classroom 批改流程中繁瑣的 API 調用、作品去重下載、學生姓名座號匹配、報表生成與成績同步邏輯，以達到最大化節省 Token 的效果。

---

## 🛠️ 輔助腳本與參數說明

技能附帶的腳本位於：
`C:/Users/hpand/.gemini/config/skills/10-classroom-grader/scripts/`

### 1. 下載附件與準備批改清單 (`fetch_submissions.py`)
用於調用 Classroom API 下載所有學生的作業附件，並自動根據優先權去重、生成子 Agent 專用的批改 Prompts JSON。
```bash
python C:/Users/hpand/.gemini/config/skills/10-classroom-grader/scripts/fetch_submissions.py \
  --course-id <COURSE_ID> \
  --coursework-id <COURSEWORK_ID> \
  --class-num <CLASS_NUM> \
  --token-path <TOKEN_PATH> \
  --output-dir <TEMP_DOWNLOAD_DIR> \
  --assignment-type <timetable|sticker>
```
* **輸出結果**：將在臨時下載資料夾下生成 `download_info.json`（下載詳情）以及 `prompt_batches.json`（分批批改的 Prompts 清單）。

### 2. 彙整、歸檔與同步到 Classroom (`collate_and_report.py`)
在子 Agent 完成批改並回傳評分結果後，呼叫此腳本整合所有資料，自動複製檔案到班級歸檔資料夾，寫入 CSV/Markdown 報告，並同步 draft grades 回 Classroom。
```bash
python C:/Users/hpand/.gemini/config/skills/10-classroom-grader/scripts/collate_and_report.py \
  --results-path <RESULTS_JSON_PATH> \
  --class-num <CLASS_NUM> \
  --course-name <COURSE_NAME> \
  --course-id <COURSE_ID> \
  --coursework-id <COURSEWORK_ID> \
  --token-path <TOKEN_PATH> \
  --submissions-dir <TEMP_DOWNLOAD_DIR> \
  --target-parent-dir <TARGET_PARENT_DIR> \
  --assignment-type <timetable|sticker>
```
* **輸出結果**：將在歸檔資料夾中生成 `[作業名稱]評分.csv` 與 `[作業名稱]評分.md`。

---

## 🔄 標準執行工作流 (Workflow)

當教師要求批改特定班級的作業時，請遵循以下步驟：

1. **第一步：獲取 Classroom Course/CourseWork 資訊**
   * 讀取或查詢對應班級的 `courseId` 與該作業的 `courseWorkId`。
2. **第二步：呼叫 `fetch_submissions.py` 進行下載與分批**
   * 執行下載指令，指定對應的參數。將附件下載至臨時資料夾中。
3. **第三步：派發給 Grader 子 Agent 批改**
   * 讀取臨時下載資料夾下產生的 `prompt_batches.json`。
   * 為其中的每一個 batch 呼叫 `invoke_subagent`，使用 `StickerGrader` 或 `Grader` 角色並傳入 prompt 文字。
4. **第四步：收集結果並寫入 results 檔案**
   * 收集所有子 Agent 回傳的 JSON 陣列，合併寫入本機臨時 `all_results.json` 檔案。
5. **第五步：呼叫 `collate_and_report.py` 整合與同步**
   * 執行整合指令。它會自動歸檔作品、更新 Classroom 成績（並優雅捕獲 403 異常）、生成帶有 UTF-8 BOM 避免亂碼的 CSV/Markdown 報告，並徹底清理臨時下載資料夾。
6. **第六步：回報結果**
   * 向教師回報批改與存檔完成狀態，並在 walkthrough.md 中記錄統計資訊。
