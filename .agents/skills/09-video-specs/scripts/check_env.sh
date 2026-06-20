#!/usr/bin/env bash
# 環境檢查腳本：給 agent 第 1 階段呼叫
# 輸出每個元件的狀態，agent 依此決定要不要安裝
set -u

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "OK  $name"
  else
    echo "MISS $name"
  fi
}

echo "=== claude-video-specs 環境檢查 ==="
check "python"     "python --version || python3 --version"
check "pip"        "pip --version || pip3 --version"
check "edge-tts"   "pip show edge-tts || pip3 show edge-tts"
check "node"       "node --version"
check "npm"        "npm --version"
check "ffmpeg"     "ffmpeg -version"
check "ffprobe"    "ffprobe -version"

# 字體（多平台）
FONT_OK=0
for p in \
  "$HOME/AppData/Local/Microsoft/Windows/Fonts/GenSekiGothic2TW-H.otf" \
  "/c/Users/$USER/AppData/Local/Microsoft/Windows/Fonts/GenSekiGothic2TW-H.otf" \
  "$HOME/Library/Fonts/GenSekiGothic2TW-H.otf" \
  "$HOME/.fonts/GenSekiGothic2TW-H.otf" \
  "$HOME/.local/share/fonts/GenSekiGothic2TW-H.otf"; do
  if [ -f "$p" ]; then FONT_OK=1; break; fi
done
if [ "$FONT_OK" = "1" ]; then echo "OK  fonts (GenSekiGothic2TW-H)"; else echo "MISS fonts (GenSekiGothic2TW)"; fi

# Playwright（在 temp）
TMPDIR="${TEMP:-${TMPDIR:-/tmp}}"
if [ -d "$TMPDIR/cvs-render/node_modules/playwright" ]; then
  echo "OK  playwright"
else
  echo "MISS playwright"
fi
