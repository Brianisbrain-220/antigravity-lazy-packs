import asyncio, edge_tts
from pathlib import Path

OUT = Path(__file__).parent / "assets" / "narration"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "zh-TW-YunJheNeural"
RATE = "-8%"
PITCH = "-2Hz"

SCRIPT = [
    (1,  "為什麼 AI 用一用，會突然忘了你剛剛說過什麼？"),
    (2,  "AI 沒有真正的記憶。它有的，是一張短期便利貼。這張便利貼，叫做「上下文」。"),
    (3,  "你說的每句話、AI 回的每句話，都會被一起貼在這張便利貼上。AI 才有辦法接話。"),
    (4,  "便利貼的單位叫做 token，大約一個中文字就是一個 token。GPT-4 約十二萬八千 token，Claude 約二十萬。聽起來很多——"),
    (5,  "但對話越長，越早的內容會被擠出視窗。AI 就「忘了」前面講過什麼。"),
    (6,  "所以，不是 AI 變笨。是它的便利貼被塞爆了。"),
    (7,  "怎麼辦？這裡有三個破解的招式。"),
    (8,  "第一招：摘要。把舊對話濃縮成重點，省下空間。Claude Code 裡的 compact 指令，就是這個。"),
    (9,  "第二招：外部記憶。把資訊存到檔案或資料庫，要用時再撈回來。這叫做 RAG。"),
    (10, "第三招：分工。讓子代理處理細節，主代理只接收結果摘要。避免每個 agent 都拿到全部 context。"),
    (11, "三個馬上能用的小建議：開新對話、適時 compact、長文件交給 agent 從檔案讀。"),
    (12, "AI 的智力，受限於它能記得多少。學會管理上下文，就是學會放大它的腦容量。"),
]

async def synth(i, text):
    out = OUT / f"page-{i:02d}.mp3"
    c = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await c.save(str(out))
    print(f"OK page-{i:02d}.mp3")

async def main():
    for i, t in SCRIPT:
        for r in range(3):
            try:
                await synth(i, t); break
            except Exception as e:
                print(f"retry {i} ({r+1}): {e}")
                await asyncio.sleep(2)
    print("All done.")

if __name__ == "__main__":
    asyncio.run(main())
