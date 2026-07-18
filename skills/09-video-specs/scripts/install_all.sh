#!/usr/bin/env bash
# 一鍵安裝所有 optional 元件（前提：python、node、ffmpeg 已存在）
# 用法：bash install/install_all.sh
set -e

DIR="$(dirname "$(realpath "$0")")"

echo "1️⃣  安裝 Edge-TTS"
pip install --quiet edge-tts || pip3 install --quiet edge-tts

echo "2️⃣  下載源石黑體"
bash "$DIR/install_fonts.sh"

echo "3️⃣  安裝 Playwright（含 Chromium）"
bash "$DIR/setup_playwright.sh"

echo ""
echo "✅ 全部就緒。可以進入階段 2（試做影片）了"
