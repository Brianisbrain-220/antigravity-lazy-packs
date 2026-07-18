---
name: antigravity-video-specs
description: 依 claude-video-specs 規範製作三類影片 (活動紀錄、教學影片、社群科普)。說「啟動 claude-video-specs」「我要做影片」「按照三類影片規範做」時載入。
---

# 🎬 影片製作規範與自動渲染技能 (09-video-specs)

## 用途
依照 `claude-video-specs` 規範，引導並協助使用者完成影片腳本設計、視覺規劃、Edge-TTS 旁白生成、Playwright webm 錄製及 FFmpeg 影音合成。

## 觸發詞
- 「啟動 claude-video-specs」
- 「我要做影片」
- 「按照三類影片規範做」
- 「做影片」

---

## 核心工作流程（5 階段流程）

依據規範，**每完成一個重要里程碑都需主動告知使用者，且每階段都要等使用者確認再進下一步**。

### 階段 1｜環境檢查
依序檢查下列元件，將結果以表格回報給使用者。
- Python 3.8+ (`python --version`)
- pip (`pip --version`)
- edge-tts (`pip show edge-tts`)
- Node.js 18+ (`node --version`)
- ffmpeg (`ffmpeg -version`)
- Playwright (檢查 `%TEMP%/cvs-render/node_modules/playwright` 是否存在)
- 源石黑體 (檢查 `~/AppData/Local/Microsoft/Windows/Fonts/GenSekiGothic2TW-H.otf` 或 `~/.agents/skills/09-video-specs/assets/fonts/GenSekiGothic2TW-H.otf` 是否存在)

> 💡 **若缺少元件**：主動詢問使用者是否自動安裝（除了 Python/Node.js 需手動外，其餘均可引導自動執行 scripts/install_all.ps1 或 setup.py 完成安裝）。

### 階段 2｜介紹三類影片
簡短呈現以下三類影片的定位表格，詢問使用者想試做或動工哪一類：
1. **01 活動紀錄影片** (60–180s)：婚禮、研習、運動會。重點在重現當下情緒。
2. **02 教學影片** (4–8 min)：SOIL 教學脈絡（以學生能複述、應用為重點）。
3. **03 社群科普** (2–3 min)：強 Hook + 多版面 + 照片佐證（FB/IG/Shorts 知識短片）。

### 階段 3｜試作 / 動工（最高安全防線）
⚠️ **在開始任何 code、TTS 或渲染前，必須依序產出並對齊以下兩份文件，經使用者明確核准 (go) 後才可動工**：
1. **`SCRIPT.md`（腳本與分鏡）**：包含旁白、字幕文案（單行 ≤ 25 字、不換行）、素材清單及對應音頻長度規劃。
2. **`DESIGN.md`（視覺規範）**：定義字體（GenSekiGothic2TW）、配色、字級、版面與動畫節奏。

**動工步驟**：
1. **複製範本**：複製對應 `examples/0X-XXX/` 到工作目錄下。
2. **產生旁白**：使用 Python 執行 edge-tts 序列生成旁白音軌，避免並行被中斷。
3. **錄製畫面**：使用 Playwright 啟動錄製（錄製時 URL 帶 `?render=true` 徹底隱藏遮罩，且 `node_modules` 必定放在 `%TEMP%\cvs-render`）。
4. **合成影片**：使用 FFmpeg 進行影音 mux（必加 `-map 0:v:0 -map 1:a:0` 參數，淡出必用 `st`）。

### 階段 4｜調整
渲染完成後提供路徑，主動詢問使用者是否需要調整：
- 字幕文案 / 旁白內容
- 視覺風格（修改 HTML/CSS 中的 `<style>` 區）
- 動画節奏（CSS transition / delay）
- 素材替換

每次調整後重新執行渲染，並再次詢問。

### 階段 5｜打包成技能
詢問使用者是否需要將這次影片的客製化邏輯打包成新的專用子技能。

---

## 踩坑快速自檢
- [ ] **是否已先寫 `SCRIPT.md` 給使用者確認？（最重要防線）**
- [ ] 字幕單行是否 ≤ 25 字且不折行？
- [ ] Playwright 是否裝在 `%TEMP%` 而非 GDrive？
- [ ] 錄影是否用 `?render=true` 自動播放並隱藏遮罩？
- [ ] ffmpeg 合併（mux）時是否帶有 `-map 0:v:0 -map 1:a:0`？
- [ ] ffmpeg 淡出是否使用 `st`（秒）而非 `ss`（開始採樣點）？
- [ ] Windows 下 Python 執行是否設定環境變數 `PYTHONUTF8=1`？
- [ ] HTML 中是否有 `@font-face` 指向源石黑體字型檔？
