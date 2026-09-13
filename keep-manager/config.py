import os
from pathlib import Path
import logging
import json

def write_json_atomic(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

KEEP_EMAIL = os.getenv("KEEP_EMAIL")
ANDROID_ID = os.getenv("ANDROID_ID")

BACKUPS_DIR = BASE_DIR / "backups"
CHANGES_DIR = BASE_DIR / "changes"
LOGS_DIR = BASE_DIR / "logs"
STATE_DIR = BASE_DIR / "state"

for d in (BACKUPS_DIR, CHANGES_DIR, LOGS_DIR, STATE_DIR):
    d.mkdir(parents=True, exist_ok=True)

def setup_logger(name, log_file="app.log"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        fh = logging.FileHandler(LOGS_DIR / log_file, encoding='utf-8')
        fh.setFormatter(formatter)
        logger.addHandler(fh)
        sh = logging.StreamHandler()
        sh.setFormatter(formatter)
        logger.addHandler(sh)
    return logger

import gkeepapi
from gkeepapi.node import ColorValue

# Taxonomy (colors and labels based on rules)
TAXONOMY_RULES = [
    {
        "keywords": ["緊急", "deadline", "截止", "繳費", "立刻", "待辦", "今日", "必辦", "警告"],
        "color": ColorValue.Red,
        "labels": ["待辦-今日"]
    },
    {
        "keywords": ["備課", "教材", "教案", "共備", "進度", "教學"],
        "color": ColorValue.Orange,
        "labels": ["教學-教案"]
    },
    {
        "keywords": ["公文", "標案", "核銷", "請購", "會議", "處室", "簽辦", "行政"],
        "color": ColorValue.Orange,
        "labels": ["行政-公文標案"]
    },
    {
        "keywords": ["學生", "家長", "成績", "段考", "班級"],
        "color": ColorValue.Orange,
        "labels": ["班級-學生事務"]
    },
    {
        "keywords": ["AntiGravity", "antigravity"],
        "color": ColorValue.Teal,
        "labels": ["專案-AntiGravity"]
    },
    {
        "keywords": [r"\b(claude|gemini|groq|perplexity|chatgpt|ai)\b", "Notebook", "模型", "提示詞", "prompt"],
        "color": ColorValue.Teal,
        "labels": ["專案-AI模型"]
    },
    {
        "keywords": [r"\b(api|python|bug)\b", "程式", "開發", "專案", "系統"],
        "color": ColorValue.Teal,
        "labels": ["專案-程式開發"]
    },
    {
        "keywords": ["攻略", "開箱", "筆記", "心得", "SOP", "流程", "手冊", "知識庫", "反思", "閱讀"],
        "color": ColorValue.Purple,
        "labels": ["筆記-知識庫"]
    },
    {
        "keywords": ["理財", "投資", "股票", "ETF", "存款", "記帳", "信用卡", "報稅", "匯率", "利息"],
        "color": ColorValue.Blue,
        "labels": ["理財-資訊"]
    },
    {
        "keywords": ["國內旅遊", "高鐵", "台鐵", "民宿", "國旅", "環島", "租車"],
        "color": ColorValue.Pink,
        "labels": ["旅遊-國內"]
    },
    {
        "keywords": ["出國", "機票", "護照", "自由行", "免稅", "海關", "行李"],
        "color": ColorValue.Pink,
        "labels": ["旅遊-國外"]
    },
    {
        "keywords": ["美食", "餐廳", "聚餐", "訂位", "菜單", "好吃", "餐酒館", "咖啡廳"],
        "color": ColorValue.Yellow,
        "labels": ["生活-美食餐廳"]
    },
    {
        "keywords": ["買", "購物", "採買", "清單", "網購", "帳單", "點子", "靈感", "待確認"],
        "color": ColorValue.Yellow,
        "labels": ["生活-購物採買"]
    },
    {
        "keywords": ["運動", "課表", "作息", "健康", "例行"],
        "color": ColorValue.Green,
        "labels": ["生活-日常"]
    }
]
