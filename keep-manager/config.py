import os
from pathlib import Path
import logging
from dotenv import load_dotenv

# R4: Use absolute paths resolved from __file__
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
    
    # Check if handlers exist to prevent duplication
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # File handler (UTF-8)
        fh = logging.FileHandler(LOGS_DIR / log_file, encoding='utf-8')
        fh.setFormatter(formatter)
        logger.addHandler(fh)
        
        # Stream handler
        sh = logging.StreamHandler()
        sh.setFormatter(formatter)
        logger.addHandler(sh)
        
    return logger

import gkeepapi
from gkeepapi.node import ColorValue

# Taxonomy (colors and labels based on rules)
# Using label strings WITHOUT '#' per R6.
TAXONOMY_RULES = [
    {
        "keywords": ["待辦", "緊急", "提醒", "deadline", "截止", "記得", "繳費", "期限"],
        "color": ColorValue.Red,
        "labels": ["待辦-緊急", "待辦-日常"]
    },
    {
        "keywords": ["備課", "教案", "學生", "家長", "班級", "成績", "段考", "石蕊試紙", "自然科", "實驗", "常態任務"],
        "color": ColorValue.Green,
        "labels": ["教學-備課", "班級-事務"]
    },
    {
        "keywords": ["公文", "標案", "核銷", "請購", "研習", "開會", "會議紀錄", "處室", "簽辦"],
        "color": ColorValue.Orange,
        "labels": ["行政-公文", "行政-會議"]
    },
    {
        "keywords": ["AntiGravity", "Linebot", "Python", "程式", "開發", "API", "專案", "系統", "bug", "AI"],
        "color": ColorValue.Teal,
        "labels": ["專案-開發", "專案-AI"]
    },
    {
        "keywords": ["筆記", "語錄", "心得", "想法", "SOP", "知識", "紀錄片", "好文", "工具"],
        "color": ColorValue.Blue,
        "labels": ["筆記-知識庫", "筆記-靈感"]
    },
    {
        "keywords": ["買", "購物", "採買", "訂", "清單", "晚餐", "網購", "帳單"],
        "color": ColorValue.Yellow,
        "labels": ["生活-採買", "生活-日常"]
    }
]
