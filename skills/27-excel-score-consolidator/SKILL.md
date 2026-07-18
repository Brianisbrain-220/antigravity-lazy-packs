---
name: excel-score-consolidator
description: >-
  將多個班級資料夾中各個項目的 CSV 評分表，依據學生座號與姓名對齊整合，自動產出含總平均且排版美觀的 Excel 成績總表。
---

# Excel 多班級成績彙整小助手 (Excel Score Consolidator)

## 📌 概述 (Overview)
當需要將多個班級資料夾中「不同作業項目」的評分 CSV 檔，彙整成單一的 Excel 活頁簿（Workbook）時，此技能能呼叫本地 Python 輔助腳本 `consolidate_scores.py` 進行自動化處理。

本技能會：
1. 自動掃描指定目錄下符合命名規則的班級資料夾（例如 `401運算思維`）。
2. 解析每個班級資料夾內的所有 CSV 評分檔，將「座號」、「姓名」、「各項分數」依據座號與姓名自動對齊。
3. 計算每位學生的「總平均」（四捨五入至小數點第一位）。
4. 在 Excel 檔案中為每個班級建立獨立的工作表（Worksheet）。
5. 套用精美且具備閱讀性的專業格式（自訂標題顏色、字型、表格框線、背景色填充、欄寬自動調適）。

## 🛠️ 依賴項 (Dependencies)
- **Python 3.10+**
- **openpyxl** (已於系統中安裝)

## 🚀 快速開始 (Quick Start)
可以直接呼叫底層 CLI 腳本：
```bash
uv run python c:\2026Antigravity2\.agents\skills\27-excel-score-consolidator\scripts\consolidate_scores.py consolidate --base-dir "根目錄路徑" --output "輸出Excel路徑"
```

## 📖 命令行參數說明 (Utility Scripts)
底層輔助腳本包含 `consolidate` 子指令：
```bash
consolidate_scores.py consolidate [arguments]
```

### 必填參數
* `--base-dir`：包含各班級資料夾的根目錄路徑。
* `--output`：產生的 Excel 檔案完整儲存路徑（例如：`C:\path\to\成績總表.xlsx`）。

### 選填參數
* `--class-pattern`：用以篩選班級資料夾的正則表達式。預設為 `^4\d{2}`（匹配 401 至 410 等四年級班級）。
* `--log`：可選，指定輸出彙整日誌（JSON 格式）的路徑，以達 token 效率。

### 使用範例
```bash
uv run python c:\2026Antigravity2\.agents\skills\27-excel-score-consolidator\scripts\consolidate_scores.py consolidate \
  --base-dir "C:\2026Antigravity2\0620教學檔案" \
  --class-pattern "^4\d{2}" \
  --output "C:\2026Antigravity2\0620教學檔案\四年級成績總表.xlsx" \
  --log "C:\2026Antigravity2\0620教學檔案\log.json"
```

## ⚠️ 常見錯誤與注意事項 (Common Mistakes)
1. **CSV 欄位名稱不符**：CSV 檔案必須包含 `座號`、`姓名`、`評定分數` 等核心欄位，否則會跳過該列。
2. **Excel 檔案被佔用**：若輸出的 Excel 檔案目前正被 Microsoft Excel 或其他軟體開啟，執行時將會因為寫入權限衝突而報錯。執行前請先關閉該 Excel 檔案。
3. **無效的班級資料夾**：請確保正則表達式能正確匹配到班級目錄名，若完全沒有資料夾匹配成功，腳本將會中止。
