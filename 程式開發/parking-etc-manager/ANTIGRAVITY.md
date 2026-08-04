# 停車管理與 ETC 登記系統 - ANTIGRAVITY.md

## 專案入口

專案名稱：停車管理與 ETC 登記系統 (parking-etc-manager)
專案用途：供中正國小教職員工、代理代課、外聘社團教師與志工辦理汽機車停車證與 ETC 內碼登記、1 鍵到期續辦；後台提供相機 OCR 車牌辨識、違規通知與管理、管理辦法動態發布、以及 A4 橫式 2列4欄 停車證雙軌底圖動態套印功能。
主要工作目錄：c:\2026Antigravity2\程式開發\parking-etc-manager
GitHub repo：Brianisbrain-220/antigravity-lazy-packs
預設 branch：main

## Obsidian 對應筆記

Obsidian vault：C:\Users\hpand\SynologyDrive\Secondbrain
專案駕駛艙：2026Antigravity2駕駛艙.md

## 工作規則

- 回應使用繁體中文。
- 涉及檔案操作時回報完整產出位置。
- 使用 PowerShell 語法。
- 核心準則：完成任何設計或修改後，一定都會嚴格遵守「自行測試與驗證過關後再向使用者回報」的準則，除非是只有使用者才能測試的部分以外，以節省來回通訊與測試的時間。
- 開工時讀本檔、讀 Obsidian 駕駛艙、檢查 Git 狀態。
- 收工時更新 Obsidian，必要時更新本檔，檢查 diff 後只提交相關檔案。
- 不把每日流水帳寫進本檔。

## 不要做

- 不要 commit API key、token、密碼、Firebase Admin 憑證。
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單。
- 不要自動納入無關 git 變更。
- 不要儲存學生真名；正式資料只用班級代號與座號。
