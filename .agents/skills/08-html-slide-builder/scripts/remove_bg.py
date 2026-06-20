#!/usr/bin/env python3
"""
remove_bg.py — PIL 亮度閾值去背腳本
用法：python remove_bg.py [--dir <目錄>] [<檔案> ...]

預設：處理當前目錄下所有 images/icon_*.png
指定 --dir：處理該目錄下所有 icon_*.png
指定檔案：直接處理指定的 PNG 檔
"""
import sys
import argparse
from pathlib import Path
from PIL import Image

DARK_THRESHOLD = 45   # 亮度 < 此值 → 完全透明
FADE_THRESHOLD = 80   # 亮度介於 DARK~FADE → 漸變透明


def remove_bg(path: Path) -> None:
    try:
        img = Image.open(path).convert("RGBA")
        data = img.load()
        w, h = img.size

        for y in range(h):
            for x in range(w):
                r, g, b, a = data[x, y]
                # 依據 Rec. 601 計算亮度
                lum = r * 0.299 + g * 0.587 + b * 0.114
                if lum < DARK_THRESHOLD:
                    data[x, y] = (r, g, b, 0)
                elif lum < FADE_THRESHOLD:
                    ratio = (lum - DARK_THRESHOLD) / (FADE_THRESHOLD - DARK_THRESHOLD)
                    data[x, y] = (r, g, b, int(255 * ratio))
        img.save(path)
    except Exception as e:
        print(f"Error processing {path}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Pillow 亮度去背工具")
    parser.add_argument("--dir", type=str, help="指定要處理的圖標目錄")
    parser.add_argument("files", nargs="*", help="指定要處理的單個 PNG 檔案")
    args = parser.parse_args()

    paths = []
    
    # 1. 處理指定的檔案
    if args.files:
        for f in args.files:
            paths.append(Path(f))
            
    # 2. 處理指定目錄中的 icon_*.png
    elif args.dir:
        dir_path = Path(args.dir)
        paths.extend(dir_path.glob("icon_*.png"))
        
    # 3. 預設處理當前目錄 images/icon_*.png
    else:
        paths.extend(Path("images").glob("icon_*.png"))

    # 執行去背
    processed_count = 0
    for p in paths:
        if p.exists() and p.is_file():
            print(f"去背中：{p}")
            remove_bg(p)
            processed_count += 1
            
    print(f"處理完成！共處理了 {processed_count} 個圖標。")


if __name__ == "__main__":
    main()
