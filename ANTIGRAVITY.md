# 2026Antigravity2 - ANTIGRAVITY.md

## 專案入口

專案名稱：2026Antigravity2
專案用途：Anti-Gravity 懶人包設定與開發
主要工作目錄：c:\2026Antigravity2
GitHub repo：https://github.com/Brianisbrain-220/antigravity-lazy-packs
預設 branch：main

## Obsidian 對應筆記

Obsidian vault：C:\Users\hpand\SynologyDrive\Secondbrain
專案駕駛艙：2026Antigravity2駕駛艙

### 共用知識庫（與 Claude Code 共用，兩邊都要遵守）

- **踩坑知識庫索引**：`💻 程式開發經驗庫/_INDEX.md`
  一坑一篇原子筆記，依 emoji 數字分類。**這是查解法的唯一入口** —— 動手前先讀索引、依 tags 篩出候選筆記再打開，不要一開始就掃整個資料夾或憑印象重新推導。
- **專案活文件**：vault 根目錄的 `Bound_Project_<專案名>.md`
  每個 GAS/Firebase 專案一篇，記錄架構、開發歷程、踩坑與待辦。程式碼 repo 的 README 只描述「目前架構與動手前必須知道的操作紀律」，歷史敘事一律放這裡，不要兩邊各自維護。

## 工作規則

- 🚨 **鐵律 (IRON RULE)：「動手寫扣或搜尋專案之前，先查 Obsidian」**。
  在開始分析程式碼或進行任何修改前，**絕對必須**先透過 `search_notes` 搜尋 Obsidian Vault，優先閱讀該專案的 `Bound_Project_*.md` 活文件與 `_INDEX.md`。嚴禁僅憑本地資料夾名稱吻合，就先入為主開始改 code，以防改到廢棄的舊架構或踩到已知的地雷。
- 回應使用繁體中文。
- 涉及檔案操作時回報完整產出位置。
- 使用 PowerShell 語法。
- **核心準則：完成任何設計或修改後，一定都會嚴格遵守「自行測試與驗證過關後再向使用者回報」的準則，除非是只有使用者才能測試的部分以外，以節省來回通訊與測試的時間。**
- 開工時讀本檔、讀 Obsidian 駕駛艙、**讀 `💻 程式開發經驗庫/_INDEX.md`**、檢查 Git 狀態。
- 收工時更新 Obsidian，必要時更新本檔，檢查 diff 後只提交相關檔案。
- 不把每日流水帳寫進本檔。

## 與 Claude Code 的協作（跨工具規範）

這批專案由 Antigravity 與 Claude Code 共同維護，但**兩個工具之間沒有通道**，所有交換都靠使用者轉貼。

> 🚦 LINE Hub 專案採「規劃書先行」：任何程式碼改動都必須先寫規劃書、經 Brian 確認後才執行。權威規範見 vault 的 Bound_Project_LINE_Hub.md →「跨工具決議區塊」→ 2026-09-05 決議。規劃書一律放 vault。

**跨工具的規範與決議一律寫在 vault，不要寫在本檔：**

> `💻 程式開發經驗庫/🤝 5-跨工具協作/ai-tool-handoff-protocol.md`

本檔只放 Antigravity 專屬的設定；那一篇放兩邊共用的規則（決議該寫在哪、如何記錄分歧、寫入前重讀、動對方領地前看 git 狀態、對方回報完成時要覆驗）與**累積的跨工具決議清單（含尚未達成共識的項目）**。

動到共用資源（Firestore 規則、vault 筆記、對方 repo 的檔案）之前，請先讀那一篇。

## 不要做

- 不要 commit API key、token、密碼、Firebase Admin 憑證。
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單。
- 不要自動納入無關 git 變更。
- 不要儲存學生真名；正式資料只用班級代號與座號。
