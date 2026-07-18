# 02 — factors-multiples（教學影片範本）

**規範**：[../../specs/02-教學影片.md](../../specs/02-教學影片.md)

**這是範本，不含 binary**。Fork 後依規範自行準備：
- 14 段 Edge-TTS 旁白（跑 `python generate_narration.py`）
- 字體（跑 `bash ../../install/install_fonts.sh`）

## 檔案

- `index.html` — 14 頁教學動畫骨架（KaTeX、SVG 因數樹、知識地圖）
- `generate_narration.py` — Edge-TTS 序列生成 14 段旁白

## Fork 後動工

1. 跑字體安裝：`bash ../../install/install_fonts.sh`
2. 修改 `generate_narration.py` 內的 SCRIPT 陣列為你的內容
3. 跑 `python generate_narration.py` 生成 `assets/narration/page-*.mp3`
4. 修改 `index.html` 內的 PAGES、SVG、字卡為你的科目
5. 用 ffprobe 確認旁白時長 → 對應到 PAGES.dur
6. 渲染：Playwright 錄製 + ffmpeg mux

完整流程參見根目錄 [AGENTS.md](../../AGENTS.md) 階段 3，或 [規範第 11 章 checklist](../../specs/02-教學影片.md)。
