#!/usr/bin/env bash
# 在 %TEMP%/cvs-render/ 安裝 Playwright（避開 GDrive 同步問題）
# 用法：bash install/setup_playwright.sh
set -e

TMPDIR="${TEMP:-${TMPDIR:-/tmp}}"
WORKDIR="$TMPDIR/cvs-render"

mkdir -p "$WORKDIR"
cd "$WORKDIR"

if [ ! -f package.json ]; then
  echo "→ 初始化 npm 專案"
  npm init -y >/dev/null
fi

if [ ! -d node_modules/playwright ]; then
  echo "→ 安裝 playwright npm 套件"
  npm install playwright
fi

echo "→ 下載 Chromium 瀏覽器"
npx playwright install chromium

echo "✓ Playwright 已安裝於：$WORKDIR"
echo "  錄製腳本範例在 examples/0X-XXX/record.cjs，修改 HTML 路徑後執行："
echo "    cd $WORKDIR && node record.cjs"
