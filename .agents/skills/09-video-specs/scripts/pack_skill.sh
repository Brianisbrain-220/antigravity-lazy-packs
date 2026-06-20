#!/usr/bin/env bash
# 把影片製作流程打包成目標 agent 的 skill
# 用法：bash install/pack_skill.sh <skill-name> <video-type 01|02|03> [--target claude|codex|opencode|antigravity]
set -e

NAME="${1:-video-maker}"
TYPE="${2:-02}"
TARGET="claude"
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#--target=}" ;;
  esac
done

case "$TYPE" in
  01) TITLE="活動紀錄影片"; TRIGGER="做一支活動紀錄/婚禮/研習/比賽影片" ;;
  02) TITLE="教學影片";     TRIGGER="做一支教學影片/學科解釋影片" ;;
  03) TITLE="社群科普影片"; TRIGGER="做一支社群科普/IG/YouTube Shorts 短片" ;;
  *)  echo "Type 必須是 01 / 02 / 03"; exit 1 ;;
esac

REPO_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

# 各 agent 的安裝路徑
case "$TARGET" in
  claude)
    SKILL_DIR="$HOME/.claude/skills/$NAME"
    META_FILE="$SKILL_DIR/SKILL.md"
    ;;
  codex)
    SKILL_DIR="$HOME/.agents/skills/$NAME"
    META_FILE="$SKILL_DIR/SKILL.md"
    ;;
  opencode)
    SKILL_DIR="$HOME/.config/opencode/skills/$NAME"
    META_FILE="$SKILL_DIR/SKILL.md"
    ;;
  antigravity)
    SKILL_DIR="$HOME/.gemini/antigravity/skills/$NAME"
    META_FILE="$SKILL_DIR/SKILL.md"
    ;;
  *)
    echo "Target 必須是 claude / codex / opencode / antigravity"; exit 1 ;;
esac

mkdir -p "$SKILL_DIR"

cat > "$META_FILE" <<EOF
---
name: $NAME
description: 依 claude-video-specs 第 $TYPE 類規範製作 $TITLE
target: $TARGET
---

# $TITLE 生成技能（$NAME）

## 用途
依照 claude-video-specs 第 $TYPE 類規範製作 $TITLE。

## 觸發情境
使用者說：
- 「$TRIGGER」
- 「按照規範做一支 $TITLE」
- 「跑 $NAME 工作流」

## 工作流
1. 確認主題、片長、素材狀況
2. 讀規範：\`$REPO_ROOT/specs/$TYPE-*.md\`
3. fork 範本：複製 \`$REPO_ROOT/examples/$TYPE-*/\` 到工作目錄
4. 跑該 spec 第 9 / 11 章 checklist
5. Edge-TTS 序列生成旁白
6. Playwright（裝在 %TEMP%/cvs-render/）錄製 webm
7. ffmpeg mux master_audio → mp4
8. 給使用者預覽 → 確認後存檔

## 規範路徑
\`$REPO_ROOT/specs/$TYPE-*.md\`

## 範本路徑
\`$REPO_ROOT/examples/$TYPE-*/\`

## 主要工具
- Edge-TTS（zh-TW-YunJheNeural）
- KaTeX（數學）
- Playwright + ffmpeg（渲染）
- 源石黑體（執行 \`bash $REPO_ROOT/install/install_fonts.sh\` 安裝）

## 注意事項
- Playwright node_modules 必須在 %TEMP%，不能放 GDrive
- Edge-TTS 並行會被斷線，序列 + retry 3 次
- 字體引用相對路徑為 \`../../assets/fonts/\`（fork 後路徑依位置調整）
EOF

echo "✓ Skill 已建立"
echo "  目標 agent : $TARGET"
echo "  路徑      : $SKILL_DIR"
echo "  觸發詞    : 「$TRIGGER」"
echo ""

# 對 OpenCode / Antigravity 補充提示
case "$TARGET" in
  opencode)
    echo "  ℹ️  OpenCode 額外需要：在你的 opencode.json 或 .opencode/config.json 內"
    echo "      確認 \"skills\" 路徑包含 ~/.config/opencode/skills/"
    ;;
  antigravity)
    echo "  ℹ️  Antigravity 可能需要透過 IDE 內的 Plugin / Agent 設定匯入"
    echo "      若無自動偵測，請手動將 $META_FILE 內容貼入 Antigravity 的 Custom Agent 設定"
    ;;
esac
