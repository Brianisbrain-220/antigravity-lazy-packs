---
name: expense-receipt-organizer
description: 沖繩與旅遊消費單據自動配對、重命名與 Excel 超連結整合歸檔助手。說「整理消費單據」、「單據歸檔」時觸發。
---

# 消費單據自動配對與歸檔助手 (expense-receipt-organizer)

此技能專門用於自動化整理旅遊消費過程中所產生的所有實體單據（如 PDF 證明、JPG 發票照片），並將其與記帳 Excel 檔案進行日期及時間差的匹配，實現自動重新命名、多層級資料夾歸檔，並將單據超連結自動填回 Excel 中。

## 使用方式

請在對話中呼叫此技能，或在處理旅遊單據檔案時載入此技能。
核心執行腳本位於：
- [organize_receipts.py](file:///c:/2026Antigravity2/.agents/skills/expense-receipt-organizer/scripts/organize_receipts.py)

### 執行命令：
在終端機中，切換至本 Skill 的 `scripts` 目錄，執行：
```powershell
# 模擬執行 (Dry Run)
python organize_receipts.py

# 正式執行 (會移動檔案並更新 Excel)
python organize_receipts.py run
```

## 功能規格

1. **多層級自動分類資料夾**：
   - 第一層：`YYYY-MM-DD`（消費日期）
   - 第二層：`交通`、`住宿`、`餐費`、`其他` 四種種類。

2. **智慧配對演算法**：
   - **PDF 檔案**：以檔名進行關鍵字匹配（如 `Uber` -> `交通`；`住宿` -> `住宿`）。
   - **JPG 圖片**：讀取 EXIF 中的拍攝時間（EXIF `DateTimeOriginal`），自動與 Excel 第一個 Sheet（明細總表）的消費日期時間比對。最接近且在 30 分鐘內者即配對成功。

3. **檔名標準化 (Renaming)**：
   - 匹配成功的檔案將重新命名為：`YYYY-MM-DD_[種類]_[店家名稱]_[消費金額]_[原始檔名].jpg`
   - 這能最大程度提升檔案檢索與一眼查看的便利性。

4. **Excel 憑證超連結整合**：
   - 將相對路徑超連結以 `=HYPERLINK("相對路徑", "查看憑證")` 形式自動寫入記帳 Excel 總表的「單據憑證」欄位，實現記帳與憑證的一鍵整合。
