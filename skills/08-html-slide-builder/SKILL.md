---
name: html-slide-builder
description: |
  給定任何教材（文字、課程大綱、PDF、講義、口述主題），自動生成完整的 Reveal.js HTML 互動簡報並部署至 GitHub Pages。

  自動處理四大視覺/互動強化：
  1. AI 生成背景底圖（使用 generate_image 工具，霓虹暗色風格底圖）
  2. 扁平化圖標（使用 generate_image 工具 + PIL 去背，取代 emoji）
  3. Firebase 即時互動元件（文字雲、單選投票，Firestore 串接）
  4. 滑桿視覺化演示（clip-path 揭露，適合前後對比內容）

  當使用者說「幫我做 HTML 簡報」「把這份教材轉成互動簡報」「做 Reveal.js 簡報」「做成投影片」「做一份課程簡報」，或提供教材並要求轉成簡報格式時，務必使用此 Skill。即使使用者未明確說「互動」或「HTML」，只要目的是從教材產出可展示的簡報，也應觸發此 Skill。
---

# HTML 智慧簡報生成器

教材 → 分析 → 確認大綱 → 生成 Reveal.js 簡報 → 強化（底圖/圖標/互動/視覺化）→ GitHub Pages 部署

---

## 0. 讀取教材

接受任何形式的輸入：
- **文字 / Markdown**：直接分析。
- **PDF**：用 Read 工具讀取（若有多頁先讀摘要頁）。
- **口述主題**：自行根據標準教學邏輯設計（引言→概念→範例→互動→結論）。

若教材資訊不足，不要詢問，直接用教學慣例補充。

---

## 1. 分析大綱，等使用者確認

分析完畢後輸出大綱表格，**等使用者確認後才繼續**：

```
## 📋 簡報大綱草稿（共 N 頁）

| 頁碼 | 標題 | 內容摘要 | 功能標記 |
|------|------|----------|----------|
| 1    | 封面 | 課程名稱、講師 | [BG] |
| 2    | 破冰提問 | 文字雲收集學員想法 | [INTERACT:wordcloud] |
| 3    | 三大重點 | 並列說明三個核心概念 | [ICON] |
| 4    | 前後對比 | A 方案 vs B 方案演進 | [VIZ] |
...

**功能標記說明**
- [BG] 背景底圖（使用 generate_image，暗色風格）
- [ICON] 扁平化圖標（使用 generate_image + PIL 去背）
- [INTERACT:wordcloud] Firebase 即時文字雲
- [INTERACT:poll] Firebase 單選投票
- [VIZ] 滑桿視覺化演示（clip-path）

請確認大綱，或說明要調整的地方。
```

### 功能標記的決策原則

| 標記 | 觸發條件 | 每份簡報目標數量 |
|------|----------|-----------------|
| [BG] | 封面、封底、章節轉換、高衝擊結論 | 3–5 頁 |
| [ICON] | 頁面有 3–6 個並列項目（優缺點、步驟、特性） | 1–3 頁 |
| [INTERACT:wordcloud] | 開場破冰、先備知識調查、課尾反思 | 1 頁（通常第 2 頁） |
| [INTERACT:poll] | 概念確認、意見調查、前測/後測 | 0–1 頁 |
| [VIZ] | 「前後對比」「格式轉換」「A 到 B 的演進」 | 0–1 頁 |

---

## 2. 建立專案目錄與基礎 HTML

使用者確認後：
1. 建立專案目錄：`<當前工作目錄>/<簡報英文短名>/`
2. 建立 `images/` 子目錄
3. 建立 `scripts/` 子目錄，並將去背腳本 `remove_bg.py` 複製進去（參考此 Skill 的 `scripts/remove_bg.py`）
4. 讀取本 Skill 目錄下的 `references/reveal-template.md` 與 `references/firebase-config.md`
5. 生成 `index.html`（完整 Reveal.js 骨架）

**命名規則：**
- 專案目錄：kebab-case 英文（`ai-course`、`math-lesson`）
- Firestore 集合：`<slug>_wordcloud`、`<slug>_poll_<page>`（避免不同簡報資料混用）

**調色盤（所有簡報統一使用）：**
```css
:root {
  --accent:  #e8643a;   /* 橘紅（主強調） */
  --accent2: #4fc3f7;   /* 青（次強調） */
  --success: #81c784;   /* 綠（正面） */
  --warn:    #ffb74d;   /* 琥珀（提示） */
}
/* 背景： #0d1117 ~ #1a1a2e（深暗色） */
```

---

## 3. 生成背景底圖 [BG]

對每個 `[BG]` 頁面，使用 `generate_image` 工具生成底圖，並存放在 `images/` 目錄中：
- 檔名命名為 `<slide-slug>_bg_<page>.png`。
- **底圖 Prompt 設計原則**：
  - 深暗色系（deep navy、dark space、#0d1117 背景）
  - 無文字（no text, clean, minimalist）
  - 與投影片主題有關但抽象（概念視覺化，非字面圖示）
  - 霓虹/發光效果，配合主題色
  - 例：AI 課程封面 → `"deep navy background, glowing neural network nodes and light trails, cinematic wide, no text, abstract tech art"`

在 HTML section 加上：
```html
<section data-background-image="images/<filename>.png"
         data-background-opacity="0.3"
         data-background-size="cover">
```
透明度建議：封面/封底 0.3–0.4；一般頁 0.12–0.18。

---

## 4. 圖標系統 [ICON]

### 4-1 生成單個圖標
對每一頁有 `[ICON]` 的項目，使用 `generate_image` 工具逐一生成對應的 icon 圖片：
- 檔名命名為 `images/icon_<name>.png`。
- **圖標 Prompt 設計原則**：
  - `"A clean flat neon outline icon of [主題], black background, minimal style, vector illustration"`
  - 務必指定 **black background**（黑色背景），便於後續進行去背處理。

### 4-2 圖標去背與套用
1. 執行專案目錄下的 `remove_bg.py` 處理所有的 icon 圖片：
   ```bash
   python scripts/remove_bg.py --dir images
   ```
2. 去背後的圖標將自動替換背景為透明，並具有漂亮的發光邊緣。
3. 在投影片 HTML 中以 `<img>` 標籤載入：
   ```html
   <div class="adv-card">
     <div class="adv-icon"><img src="images/icon_<name>.png" alt="[說明]" /></div>
     <div class="adv-title">[標題]</div>
     <div class="adv-desc">[詳細描述]</div>
   </div>
   ```

---

## 5. Firebase 互動與視覺化元件 [INTERACT] & [VIZ]

- 根據 `references/firebase-config.md` 注入 Firebase 設定與文字雲/投票元件。
- 根據 `references/reveal-template.md` 實作 clip-path 前後對比滑桿。

---

## 6. GitHub Pages 部署

簡報製作完成並在本機測試無誤後，自動引導使用者將專案推送到 GitHub：
1. git init 專案目錄
2. git add . 並 commit
3. 使用 GitHub CLI 建立公開的 Repo：`gh repo create <slug> --public --source=. --push`
4. 開記 GitHub Pages：`gh repo edit --enable-pages --pages-branch=main --pages-path=/`（或手動於 settings 設定）
5. 回報部署成功的網址：`https://<username>.github.io/<slug>/`
