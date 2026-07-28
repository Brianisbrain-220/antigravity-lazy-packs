# 教室設備清點與管理系統 - ANTIGRAVITY.md

## 專案入口

專案名稱：教室設備清點與管理系統 (classroom-equipment-manager)
專案用途：中正國小全校各班級與特殊空間設備清點、交接與報修系統
主要工作目錄：c:\2026Antigravity2\程式開發\classroom-equipment-manager
GitHub repo：https://github.com/Brianisbrain-220/antigravity-lazy-packs
預設 branch：main
線上服務網址：https://cjps-equipment.web.app/

## Obsidian 對應筆記

Obsidian vault：C:\Users\hpand\SynologyDrive\Secondbrain
專案駕駛艙：2026Antigravity2駕駛艙

## 工作規則

- 回應使用繁體中文。
- 涉及檔案操作時回報完整產出位置。
- 使用 PowerShell 語法。
- **核心準則：完成任何功能設計或修改後，一定都會嚴格遵守「自行測試與驗證無誤後（例如：執行 build、本地與線上驗證），再向使用者回報」的準則，除非是只有使用者才能測試的部分以外，以節省來回通訊與測試的時間。**
- 開工時讀本檔、讀 Obsidian 駕駛艙、檢查 Git 狀態。
- 收工時更新 Obsidian，必要時更新本檔，檢查 diff 後只提交相關檔案。
- 不把每日流水帳寫進本檔。
- 前後台版本號碼（如 `v2.7`）需同時於表單 Header、Footer、Admin Dashboard Sidebar/Footer 一致更新，以利快取與版本驗證。

## 不要做

- 不要 commit API key、token、密碼、Firebase Admin 憑證。
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單。
- 不要自動納入無關 git 變更。
- 不要儲存學生真名；正式資料只用班級代號與座號。
- 不要在行動端或 LINE WebView 簽名模組中使用 `getTrimmedCanvas()` 進行像素運算，以防 SecurityError 與記憶體崩潰。
