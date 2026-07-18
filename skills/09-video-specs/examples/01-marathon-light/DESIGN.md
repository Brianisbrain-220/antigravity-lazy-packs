# DESIGN — 最後一公里的光（Marathon Light）

## Overview
電影感寫實敘事影片，搭配 SOIL 教學簡報風格字卡：大字、留白、一頁一句。色彩走「晨光金 → 城市灰 → 雨夜冷 → 終點銀光」的情緒曲線。字卡用襯線體 + slow fade，字幕走底部半透明黑底白字。

## Colors
| HEX | 角色 |
|------|------|
| `#0A0A0A` | 主背景（黑場/字幕底） |
| `#F5EFE2` | 字卡主色（米白） |
| `#E8B14A` | 強調金（晨光、終點光） |
| `#7A8B99` | 雨景冷灰 |
| `#C0392B` | 跑道紅（號碼布 087 對比色） |
| `#FFFFFF` | 純白（最後一公里的光） |

## Typography
- **字卡標題**：`Noto Serif TC`，weight 700，48–96px，置中或靠下 1/3
- **字幕（旁白）**：`Noto Sans TC`，weight 400，28–32px，底部 1/8，半透明黑底（rgba(0,0,0,0.6)）
- **時間/章節數字**：`JetBrains Mono`，weight 300，14px，角落留白小字

## Components
- **大字字卡**：slow fade-in 1.5s，停留主體時間，slow fade-out 1.0s
- **底部字幕條**：寬度 80% 置中，圓角 6px，padding 12px 24px，旁白逐句切換
- **底部進度條**：1px 細線從左到右，與音樂總長 203.76s 同步
- **章節數字**：左上 `01/10 — DAWN` 形式

## Imagery
所有圖片來自 `slides/marathon_slides/`（10 張寫實 16:9 劇照）。
- 全螢幕鋪滿，object-fit: cover
- Ken Burns 緩推鏡頭：每張圖 scale 1.00 → 1.06，配合該 beat 持續時間
- 鏡頭情緒方向：起跑場景往右推、撞牆場景往下沉、最後一公里往光源方向推

## Do's and Don'ts
- ✅ 字卡與字幕分層，字卡靠中、字幕靠底，永遠不重疊
- ✅ 留白勝於塞滿，一頁一句
- ✅ 黑場轉場（fade to black 0.5s）作為章節分隔
- ❌ 不用 drop shadow，不用花俏轉場
- ❌ 字卡不要超過 12 個中文字
- ❌ 不要在圖片上加邊框、不要 vignette 過重
