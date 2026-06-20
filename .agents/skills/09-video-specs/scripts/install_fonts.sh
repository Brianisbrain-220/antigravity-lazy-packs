#!/usr/bin/env bash
# 從 ButTaiwan/genseki-font 下載源石黑體 H/B/M 三個字重
# 用法：bash install/install_fonts.sh
set -e

UPSTREAM="https://github.com/ButTaiwan/genseki-font/raw/master/TW"
WANT=("GenSekiGothic2TW-H.otf" "GenSekiGothic2TW-B.otf" "GenSekiGothic2TW-M.otf")

# 決定安裝目標
case "$(uname -s)" in
  MINGW*|CYGWIN*|MSYS*)  TARGET="$HOME/AppData/Local/Microsoft/Windows/Fonts" ;;
  Darwin*)               TARGET="$HOME/Library/Fonts" ;;
  Linux*)                TARGET="$HOME/.local/share/fonts" ;;
  *)                     TARGET="$HOME/.fonts" ;;
esac
mkdir -p "$TARGET"

echo "→ 安裝目標：$TARGET"
for f in "${WANT[@]}"; do
  if [ -f "$TARGET/$f" ]; then
    echo "✓ 已存在 $f"
  else
    echo "↓ 下載 $f"
    curl -sL -o "$TARGET/$f" "$UPSTREAM/$f"
  fi
done

# 同步一份到 repo 本地 assets/fonts/（讓範例 HTML 引用）
REPO_FONTS="$(dirname "$(dirname "$(realpath "$0")")")/assets/fonts"
mkdir -p "$REPO_FONTS"
for f in "${WANT[@]}"; do
  cp -n "$TARGET/$f" "$REPO_FONTS/" 2>/dev/null || true
done

echo "✓ 完成。系統字體：$TARGET、Repo 副本：$REPO_FONTS"
echo "  Linux 用戶請執行 fc-cache -fv 重新整理"
