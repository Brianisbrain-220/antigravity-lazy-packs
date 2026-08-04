# 停車管理與 ETC 登記系統 - 四大強化功能實作進度清單

## 狀態圖例
- `[ ]` 未開始
- `[/]` 進行中
- `[x]` 已完成

---

## 階段一：資料庫與初始狀態擴充 (State & Mock Data)
- `[x]` 1.1 更新 `src/utils/mockData.js`，加入 `INITIAL_VIOLATION_TYPES` (預設 5 項違規事項) 與 `INITIAL_UNREGISTERED_VEHICLES` (預設外車示範紀錄)
- `[x]` 1.2 更新 `src/App.jsx`，新增 `violationTypes` 與 `unregisteredVehicles` 狀態並持久化儲存於 LocalStorage

## 階段二：規範閱讀強制捲動與表單鎖定 (Scroll-to-Bottom Reading & Step Lock)
- `[x]` 2.1 修改 `src/components/RulesAgreement.jsx`，增加條文 `onScroll` 監聽至底部後解鎖 Checkbox，與閱讀進度提示
- `[x]` 2.2 修改 `src/pages/ApplicationPortal.jsx`，未完成閱讀勾選同意前顯示鎖定提示，勾選後展開表單

## 階段三：違規事項多選、未登錄車牌建檔與累犯警示 (Scanner & Unregistered Tracking)
- `[x]` 3.1 修改 `src/components/admin/LicensePlateScanner.jsx`，支援違規事項 Checkboxes 多選或單選填報
- `[x]` 3.2 於 `LicensePlateScanner.jsx` 新增未登錄車牌建檔 (車輛外觀/備註欄) 及歷史多次出現 (累犯) 警示卡片與軌跡顯示

## 階段四：違規事項類別後台設定模組 (Violation Types Manager)
- `[x]` 4.1 建立 `src/components/admin/ViolationTypesEditor.jsx`，供管理員自訂新增、刪除或還原違規類別
- `[x]` 4.2 更新 `src/pages/AdminDashboard.jsx`，在 `SETTINGS` 頁籤中加入違規類別編輯器


## 階段五：停車證套印單人/多選名單勾選 (Selective Printing Checklist)
- `[x]` 5.1 修改 `src/components/admin/PermitPrinter.jsx`，增加待列印人員名單 Checkbox 列表與快速搜尋過濾
- `[x]` 5.2 驗證 2 列 4 欄 A4 橫式排版於勾選不同人數時的空卡片補齊效果

## 階段六：系統驗證與報告更新 (Build & Delivery)
- `[x]` 6.1 執行 `npm run build` 確認全部新元件與邏輯順利編譯通關
- `[x]` 6.2 更新 `walkthrough.md` 與 `2026Antigravity2駕駛艙.md` 紀錄
