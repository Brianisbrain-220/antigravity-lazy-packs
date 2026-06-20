# 01 — marathon-light（活動紀錄影片範本）

**規範**：[../../specs/01-活動紀錄影片.md](../../specs/01-活動紀錄影片.md)

**這是範本，不含 binary**。Fork 後依規範自行準備：
- 10 張劇情圖（Unsplash / draw 技能 / 自己拍）
- BGM mp3
- 各場景字卡與旁白文案

## 檔案

- `index.html` — 10 場景 HTML 動畫骨架（SOIL 字卡、Ken Burns、進度條、淡出）
- `DESIGN.md` — 設計規範（配色、字體、鏡頭）
- `SCRIPT.md` — 旁白與字卡逐 beat 規劃範本
- `record.cjs` — Playwright 錄製腳本

## Fork 後動工

1. 編輯 `SCRIPT.md` 替換成你的故事
2. 編輯 `index.html` 內的 PAGES 與 `assets/images/` 對應檔名
3. 準備音檔放 `assets/audio/`
4. Playwright 錄製 + ffmpeg mux（指令見 [規範第 8 章](../../specs/01-活動紀錄影片.md)）

完整流程參見根目錄 [AGENTS.md](../../AGENTS.md) 階段 3。
