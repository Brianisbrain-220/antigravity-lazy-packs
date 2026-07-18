# Reveal.js HTML 基礎模板與樣式庫

## 完整 HTML 骨架

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>簡報標題</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reset.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/night.css" />
  
  <style>
    /* === 全域變數與主題自訂 === */
    :root {
      --accent:  #e8643a;   /* 橘紅 */
      --accent2: #4fc3f7;   /* 青色 */
      --success: #81c784;   /* 綠色 */
      --warn:    #ffb74d;   /* 琥珀 */
    }

    .reveal {
      font-family: 'Segoe UI', 'Noto Sans TC', system-ui, sans-serif;
      background-color: #0d1117;
      color: #e6edf3;
    }
    .reveal h1, .reveal h2, .reveal h3 {
      font-family: 'Segoe UI', 'Noto Sans TC', system-ui, sans-serif;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .reveal h1 { font-size: 2.2em; text-shadow: 0 0 10px rgba(232,100,58,0.3); }
    .reveal h2 { font-size: 1.5em; color: var(--accent2); margin-bottom: 0.6em; }
    .reveal h3 { font-size: 1.1em; color: #fff; }
    
    .reveal .progress { color: var(--accent); }
    .reveal .controls { color: var(--accent2); }

    /* === 封面樣式 === */
    .title-slide { text-align: center; }
    .title-slide .tag {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.55em;
      letter-spacing: 0.08em;
      margin-bottom: 0.8em;
      font-weight: 600;
    }
    .title-slide .subtitle { font-size: 0.75em; color: #8b949e; margin-top: 0.5em; }
    .title-slide .author { margin-top: 2em; font-size: 0.5em; color: #58a6ff; }

    /* === 統計數字卡 === */
    .stat-row { display: flex; gap: 20px; justify-content: center; margin-top: 1em; }
    .stat-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      flex: 1;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.06); }
    .stat-card .num { font-size: 1.8em; font-weight: 800; color: var(--accent); line-height: 1; }
    .stat-card .label { font-size: 0.42em; color: #8b949e; margin-top: 6px; }

    /* === 優勢項目卡 (Grid) === */
    .adv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 0.6em; }
    .adv-card {
      background: rgba(255,255,255,0.03);
      border-left: 4px solid var(--accent2);
      border-radius: 8px;
      padding: 16px;
      text-align: left;
    }
    .adv-card .adv-icon { float: left; margin-right: 12px; }
    .adv-card .adv-icon img {
      width: 48px; height: 48px; object-fit: contain;
      filter: drop-shadow(0 0 8px rgba(79,195,247,0.3));
    }
    .adv-card .adv-title { font-size: 0.65em; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .adv-card .adv-desc { font-size: 0.45em; color: #8b949e; line-height: 1.4; }

    /* === 前後對比滑桿 (Comparison Slider) === */
    .slider-container {
      position: relative;
      width: 100%;
      height: 400px;
      margin: 20px auto 0;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .slider-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    }
    /* Before 狀態 */
    .slider-before {
      background-color: #1e1e1e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8em;
      color: #888;
    }
    /* After 狀態 */
    .slider-after {
      background-color: #0d1117;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8em;
      color: var(--accent2);
      clip-path: inset(0 0 0 50%); /* 初始遮罩一半 */
    }
    .slider-input {
      position: absolute;
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 100%;
      background: transparent;
      outline: none;
      margin: 0;
      top: 0;
      left: 0;
      z-index: 10;
      cursor: ew-resize;
    }
    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 4px;
      height: 400px;
      background: #fff;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    .slider-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 4px;
      background: #fff;
      pointer-events: none;
      z-index: 5;
      transform: translateX(-50%);
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      
      <!-- 投影片內容將放置於此 -->
      
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script>
    // 初始化 Reveal.js
    Reveal.initialize({
      hash: true,
      slideNumber: 'c/t',
      transition: 'slide', // fade/slide/convex/concave/zoom
      center: true,
      width: 960,
      height: 700,
      margin: 0.04
    });

    // 處理滑桿對比元件的動態效果
    document.querySelectorAll('.slider-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const container = e.target.parentElement;
        const position = e.target.value;
        const afterDiv = container.querySelector('.slider-after');
        const line = container.querySelector('.slider-line');
        
        afterDiv.style.clipPath = `inset(0 0 0 ${position}%)`;
        line.style.left = `${position}%`;
      });
    });
  </script>
</body>
</html>
```
