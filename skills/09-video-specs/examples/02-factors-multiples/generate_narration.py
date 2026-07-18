# 用 Edge-TTS 生成 14 段旁白
# 執行：python generate_narration.py
import asyncio
import edge_tts
from pathlib import Path

OUT = Path(__file__).parent / "assets" / "narration"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "zh-TW-YunJheNeural"
RATE = "-10%"
PITCH = "-2Hz"

SCRIPT = [
    (1,  "因數與倍數。國中數學最基礎、也最常被誤會的單元。今天我們用六分鐘，把它徹底搞懂。"),
    (2,  "二十四個人，要分組。可以分成兩組，每組十二人；三組，每組八人；四組，每組六人。為什麼是這幾種？因為這些數字，剛好能把二十四整除。能整除的數字，就是二十四的——因數。"),
    (3,  "整除是什麼？一個數除以另一個數，餘數是零，就叫整除。二十四除以六等於四，餘零。所以我們說：六整除二十四。"),
    (4,  "因數的定義：如果 a 乘上某個整數等於 b，那 a 就是 b 的因數。二十四等於六乘四，所以六和四，都是二十四的因數。"),
    (5,  "怎麼找十二的所有因數？用配對法。一乘十二、二乘六、三乘四。三組配對，六個因數：一、二、三、四、六、十二。"),
    (6,  "注意，因數的個數是有限的。十二的因數，永遠只有這六個，不會再多。這是因數的第一個重要特性：有限。"),
    (7,  "倍數呢？反過來。五的倍數，就是五乘一、五乘二、五乘三⋯⋯ 五、十、十五、二十⋯⋯ 無止盡地往下延伸。"),
    (8,  "倍數的個數，是無限的。一條數線往右拉，永遠拉不到底。因數有限，倍數無限——這是因數與倍數最大的不同。"),
    (9,  "在所有正整數裡，有一種特別的數，它的因數只有兩個：一、和它自己。這種數，叫做質數。二、三、五、七、十一⋯⋯ 都是質數。"),
    (10, "除了一和質數以外，剩下的正整數都叫合數。合數的特色是——可以被拆解。十二可以拆成二乘六，六又可以拆成二乘三。一直拆到不能再拆，全部都是質數。"),
    (11, "這就是因數樹。從六十開始：六十等於二乘三十。三十等於二乘十五。十五等於三乘五。樹的末端，全部都是質數：二、二、三、五。把它們乘回去，就還原成六十。這個過程，叫做質因數分解。"),
    (12, "今天學了四件事：整除性、因數、倍數、以及質數合數。它們其實是同一件事的不同看法。"),
    (13, "拆到底，是質數。擴出去，是倍數。"),
    (14, "下次遇到一個數字，試著問自己：它能被誰整除？又能被誰拆解？這就是因數與倍數的全部。"),
]

async def synth(i, text):
    out = OUT / f"page-{i:02d}.mp3"
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(str(out))
    print(f"OK page-{i:02d}.mp3")

async def main():
    for i, t in SCRIPT:
        for attempt in range(3):
            try:
                await synth(i, t)
                break
            except Exception as e:
                print(f"retry {i} ({attempt+1}): {e}")
                await asyncio.sleep(2)
    print("All done.")

if __name__ == "__main__":
    asyncio.run(main())
