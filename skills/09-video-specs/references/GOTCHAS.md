# GOTCHAS — 踩坑筆記

> 實戰中累積的坑，**開工前先讀一遍**。多數是跨 agent 通則，少數標注特定環境。
> 來源：在 OpenCode / Claude Code / **Antigravity** / Windows 上實際跑這套流程踩到的。
> 每條格式：**現象 → 原因 → 教訓**。

圖例：🌍 所有 agent 通則 ｜ 🪟 Windows 專屬 ｜ 🔧 特定工具

---

## A. 流程（最重要，先看）

### A-1 🌍 未先寫腳本對齊就直接開工
- **現象**：照片還沒拷到 assets，agent 已經悶頭開始錄；做到一半才發現素材沒到位、結構不對，整支重做。
- **原因**：agent 預設「使用者已同意」，沒先確認素材到位、沒寫 SCRIPT.md 對齊就跳進執行階段。
- **教訓**：做任何影片，**第一步一定是寫 `SCRIPT.md`（旁白 + 字卡 + 分鏡）+ 素材清單給使用者確認**。確認後才動工。

### A-2 🌍 未先展示視覺規範就開始實作
- **現象**：做到一半，使用者才問「視覺規範是什麼？我要先看過」。
- **原因**：agent 跳過 DESIGN.md 的展示與確認，直接從腳本跳到 code。
- **教訓**：腳本確認後、實作之前，**必須先產出 `DESIGN.md`（字體 / 配色 / 字級 / 版面 / 動畫節奏）給使用者看過**，確認才寫 code。

### A-3 🌍 預設直接開工，未主動前置對齊（最高安全防線）
- **現象**：收到影片指令就直接寫播放器 + 渲染代碼，事後大規模返工。
- **原因**：缺乏「腳本與視覺規範為前置條件」的鐵律意識，沒有主動煞車對齊。
- **教訓**：任何 code / TTS / 渲染之前，**第一步必須產出 `SCRIPT.md` 與 `DESIGN.md` 並在對話中展示給使用者審查**；等使用者明確說「go」才動工。**這是無可妥協的最高防線。**

---

## B. 字幕（通則）

### B-1 🌍 字幕換行 / 過長
- **現象**：字幕折成兩三行、或一行塞太多字，閱讀節奏被打斷。
- **原因**：文案沒壓縮、強迫換行。
- **教訓**：**字幕壓成單行，每段 ≤ 25 字，以不換行為最大原則**。寧可縮短文案，也不要兩行字幕。太長就拆成兩個 beat。

---

## C. HyperFrames / GSAP 動畫

> 使用真正的 HyperFrames CLI（GSAP 引擎）才會遇到 C-1~C-6。
> 本 repo 範例用純 CSS/JS 不受影響，但用 HF CLI 的 agent 必看。
> HF 框架核心規則：每個 timed 元素需 `data-start` / `data-duration` / `data-track-index`；
> 可見 timed 元素**必須** `class="clip"`；GSAP timeline 須 `paused` 並註冊到 `window.__timelines`；
> 只能用確定性邏輯（**禁** `Date.now()` / `Math.random()` / 網路請求）。

### C-1 🔧 `class="clip"` + `data-duration` 會提前隱藏元素
- **現象**：只有最後一幕出現，前面場景空白。
- **原因**：`class="clip"` 元素在 `data-start + data-duration` 時間到後被框架設為 `display:none`。
- **教訓**：`data-duration` 必須覆蓋到該元素**退場動畫完全結束**的時間。
- **範例**：GSAP `tl.to()` 退場在 3.6s 開始（0.4s 長）→ 元素需 `data-duration="4"`（到 4.0s）。

### C-2 🔧 `data-start` 必須對齊 GSAP 動畫開始時間
- **現象**：元素出現後沒動畫，直接靜態顯示或位置錯誤。
- **原因**：GSAP `tl.from()` 在指定時間設初始狀態，但 clip 更晚才顯示，初始狀態已過。
- **教訓**：每個 clip 的 `data-start` 必須**完全等於** GSAP 對應 tween 的開始時間。
- **檢查**：lint 會報 `gsap_exit_missing_hard_kill` 等警告。

### C-3 🔧 CSS `transform: translate()` 被 GSAP 覆蓋
- **現象**：元素偏移、不置中（`translate(-50%,-50%)` 失效）。
- **原因**：GSAP 動 `x/y/scale/rotation` 時會**完全覆蓋** CSS 的 `transform`。
- **教訓**：用 GSAP 屬性 **`xPercent: -50, yPercent: -50`** 取代 CSS `transform: translate(-50%,-50%)`。

### C-4 🪟🔧 HyperFrames CLI `init` 在 Windows + Node 24 crash
- **現象**：Exit code `-1073740791`（STATUS_STACK_BUFFER_OVERRUN）。
- **原因**：CLI 的 native module 與 Node 24 / Windows 相容性問題。
- **教訓**：加 `--non-interactive --example blank --skip-skills` 可避開；或降 **Node 20 LTS**；或在非 GDrive 路徑執行。

### C-5 🌍🔧 字型需要 `@font-face` 宣告
- **現象**：影片文字用了預設字型而非指定字型。
- **原因**：HF 不會自動解析 CSS `font-family` 的系統字型名稱。
- **教訓**：HTML `<style>` 內必須有 `@font-face` 指向 `.otf`。（HF Compiler 會自動從 Google Fonts 下載 Noto Sans TC 約 945 個字檔，lint 仍會 warn，可忽略或補宣告。）

### C-6 🔧 影片音訊要分離
- **現象**：`<video>` 內嵌音軌在 HF 時間軸無法正確 seek。
- **原因**：HF 要求 video 用 `muted` + 獨立 `<audio>` 元素承載音軌。
- **教訓**：`<video muted>` + 另開 `<audio>`；子合成用 `data-composition-src="compositions/file.html"`。

---

## D. GDrive / Node / Playwright

### D-1 🌍 `npm install` 在 GDrive 內極慢、易失敗
- **現象**：卡住、大量 `TAR_ENTRY_ERROR`、timeout、`Invalid package config`。
- **原因**：Google Drive 同步引擎對大量小檔案操作效能極差。
- **教訓**：**Playwright 與所有 node_modules 一律裝在非 GDrive 路徑**（如 `%TEMP%/cvs-render/`），再把範本複製回 GDrive；或直接用 `npx`（不下載依賴）。

### D-2 🔧 Playwright 錄製需 `NODE_PATH` 指向非 GDrive 的 node_modules
- **現象**：`node record.cjs` 報 `MODULE_NOT_FOUND`（GDrive 內刻意沒裝 playwright）。
- **原因**：Playwright 裝在 `%TEMP%/cvs-render/` 而非專案內。
- **教訓**：執行前設 `$env:NODE_PATH = "$env:TEMP\cvs-render\node_modules"`，或直接在 temp 目錄跑腳本。

### D-3 🔧 開場「點擊播放」遮罩殘留在錄影開頭
- **現象**：錄出的影片開頭留有 `#startScreen` 點擊遮罩殘影 + 時間軸偏差。
- **原因**：為繞過自動播放限制需手動點擊遮罩，導致開場幾幀殘留。
- **教訓**：用 URL 參數 **`?render=true`** 偵測——網頁端在此模式下 CSS 完全隱藏遮罩並自動播放；錄影腳本徹底移除點擊動作，達成第 0.00 秒乾淨畫面。（比「click 後等 0.5s」更乾淨。）

---

## E. FFmpeg

### E-1 🌍 `afade` 的 `ss` vs `st` 時間單位地雷
- **現象**：背景音樂開頭播 5 秒就直接淡出無聲。
- **原因**：`afade` 的 `ss` 是「開始採樣點 Start Sample」，`st` 才是「開始時間（秒）」。誤用 `ss=45` ≈ 在第 0.0009 秒就開始淡出。
- **教訓**：淡入淡出開始點**必須用 `st`（秒）**：`afade=t=out:st=45:d=5`。

### E-2 🌍 Mux 時無聲的空白音訊流覆蓋（缺 `-map`）
- **現象**：`index.html` 本地播放有聲，輸出的 `final.mp4` 卻完全無聲。
- **原因**：Playwright 錄出的 `video.webm` 帶一條空白音訊流；mux 時若不指定映射，ffmpeg 預設選第一個輸入（webm）的無聲音軌，覆蓋掉 `master_audio.mp3`。
- **教訓**：合併時**必加 `-map 0:v:0 -map 1:a:0`**：
```bash
ffmpeg -y -i video.webm -i master_audio.mp3 \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest out.mp4
```

### E-3 🪟 concat demuxer 無法讀中文路徑的 list.txt
- **現象**：`ffmpeg -f concat -i list.txt` 報 `No such file or directory`。
- **原因**：concat demuxer 內部檔案路徑含中文時 ffmpeg 無法解析。
- **教訓**：在 temp（純英文）目錄建所有暫存檔與 list.txt，concat 完再 `cp` 回 GDrive；或用 filter_complex concat。

---

## F. Windows / PowerShell / 編碼

### F-1 🪟 CP950 編碼導致 Python 崩潰
- **現象**：`UnicodeEncodeError` 崩潰，印不出 `✓` `❌` 等符號。
- **原因**：Windows CMD/PowerShell 預設 CP950，無法解碼 Python 輸出的 UTF-8 特殊符號。
- **教訓**：設 `PYTHONUTF8=1`（或將 `sys.stdout`/`sys.stderr` 強制重導向為 utf-8）；寫檔一律 `open(..., encoding="utf-8")`；或避免在 `print` 用非 CP950 字元。

### F-2 🪟 `Copy-Item "中文路徑\*"` 靜默失敗
- **現象**：回報 "done" 但實際 0 檔案被複製。
- **原因**：PowerShell 處理含中文的路徑 + `*` 萬用字元時，擴充異常但不拋錯。
- **教訓**：用 `Get-ChildItem -LiteralPath $src | foreach { Copy-Item -LiteralPath $_.FullName -Destination $dst }` 逐檔處理；或改用 bash `cp`。

### F-3 🪟 PowerShell 變數內嵌路徑冒號衝突
- **現象**：`"$base\page-$p.mp3"` 或 `"$drive:\path"` 報「變數參考無效」。
- **原因**：PowerShell 把 `$p`/`$drive` 後的 `:` 當 scope 修飾字。
- **教訓**：用 `${p}` 明確界定變數範圍，或改用 `Join-Path`。

---

## G. Python

### G-1 🌍 `generate_narration.py` 相對路徑依賴 cwd
- **現象**：Edge-TTS 生成的 mp3 跑到上層目錄而非 `assets/narration/`。
- **原因**：`OUTPUT = "assets/narration"` 是相對 cwd 的路徑，不是相對 `.py` 檔位置。
- **教訓**：用 `os.path.join(os.path.dirname(__file__), 'assets/narration')`（或 `Path(__file__).parent`）。範例已這樣寫，改腳本時別退化。

---

## 快速自檢（開工前 30 秒）

- [ ] 已先寫 SCRIPT.md 給使用者確認？（A-1）
- [ ] 已展示 DESIGN.md 視覺規範？（A-2 / A-3）
- [ ] 字幕單行 ≤ 25 字、不換行？（B-1）
- [ ] Playwright 裝在 `%TEMP%` 不是 GDrive？（D-1）
- [ ] 錄影用 `?render=true` 隱藏遮罩自動播放？（D-3）
- [ ] ffmpeg mux 有加 `-map 0:v:0 -map 1:a:0`？（E-2）
- [ ] ffmpeg 淡出用 `st` 不是 `ss`？（E-1）
- [ ] concat 在純英文路徑下執行？（E-3）
- [ ] Windows 設了 `PYTHONUTF8=1`？（F-1）
- [ ] HTML 有 `@font-face` 宣告？（C-5）
- [ ] （HF CLI）clip 的 data-duration 覆蓋退場、data-start 對齊 GSAP？（C-1/C-2）
- [ ] Python 輸出路徑用 `__file__` 不靠 cwd？（G-1）

---

## 貢獻來源

本筆記彙整自多個 agent 實跑經驗：
- 流程類（A）、字幕（B）：跨 agent 共通教訓
- HyperFrames/GSAP（C）：HyperFrames CLI 框架規則 + 實作踩坑
- FFmpeg / Windows / Python：**Antigravity** 在 Windows 實跑時詳細記錄（含確切錯誤碼與修法）
