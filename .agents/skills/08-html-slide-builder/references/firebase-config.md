# Firebase 互動元件程式碼庫

## 共用 Firebase 設定

```js
const firebaseConfig = {
  apiKey: "AIzaSyAYQhNavPSce17XtvDC5xnXyl9iUhW9KjA",
  authDomain: "teacherstudy-109ef.firebaseapp.com",
  projectId: "teacherstudy-109ef",
  storageBucket: "teacherstudy-109ef.firebasestorage.app",
  messagingSenderId: "196599230156",
  appId: "1:196599230156:web:cfe55d364df3ae1b9d5c69"
};
```

Firebase 專案：`teacherstudy-109ef`
SDK 版本：`11.0.2`（CDN：`https://www.gstatic.com/firebasejs/11.0.2/`）

**Firestore 集合命名規則：**
- 文字雲：`<簡報slug>_wordcloud`（例：`ai_course_wordcloud`）
- 投票：`<簡報slug>_poll_<頁碼>`
- 每份新簡報用不同集合，避免跨場次資料污染

---

## 元件一：即時文字雲

需要的 CDN（加在 `<head>` 裡）：
```html
<script src="https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.min.js"></script>
```

### Section HTML

```html
<!-- 互動文字雲 -->
<section id="slide-wordcloud">
  <h2 style="font-size:1.1em; margin-bottom:0.4em;">你對這堂課有什麼期待？</h2>
  <div style="display:grid; grid-template-columns:250px 1fr; gap:14px; height:460px;">

    <!-- 左欄：輸入 + 排行 -->
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="background:rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
        <div style="font-size:0.38em; color:var(--accent2); font-weight:700; margin-bottom:8px;">輸入你的答案</div>
        <input id="wc-input" type="text" placeholder="輸入關鍵詞…" maxlength="20"
          style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid rgba(79,195,247,0.3);
                 background:rgba(255,255,255,0.08); color:#fff; font-size:13px;
                 box-sizing:border-box; font-family:inherit; outline:none;" />
        <button id="wc-btn"
          style="width:100%; margin-top:8px; padding:9px; background:var(--accent2); color:#0d1117;
                 border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer;">
          送出 ↵
        </button>
      </div>
      <div style="background:rgba(255,255,255,0.06); border-radius:10px; padding:14px; flex:1; overflow:hidden; display:flex; flex-direction:column;">
        <div style="font-size:0.38em; color:var(--accent2); font-weight:700; margin-bottom:8px;">
          熱門答案
          <span style="display:inline-block; background:#ff4757; color:#fff; padding:2px 7px;
                       border-radius:10px; font-size:0.85em; animation:pulse 1.5s infinite;">LIVE</span>
        </div>
        <div id="wc-list" style="font-size:0.34em; overflow-y:auto; flex:1; color:#ccc;"></div>
        <div style="margin-top:8px; font-size:0.32em; color:#666; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
          總提交：<span id="wc-total" style="color:var(--accent); font-weight:700;">0</span>　
          不同答案：<span id="wc-unique" style="color:var(--accent2); font-weight:700;">0</span>
        </div>
      </div>
    </div>

    <!-- 右欄：文字雲 -->
    <div style="background:rgba(255,255,255,0.04); border-radius:12px; overflow:hidden;
                position:relative; border:1px solid rgba(255,255,255,0.07);">
      <canvas id="wc-canvas" style="width:100%; height:100%; display:block;"></canvas>
      <div id="wc-empty" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
                                 color:#444; font-size:0.42em; text-align:center;
                                 pointer-events:none; line-height:2;">
        輸入第一個答案<br>文字雲就會出現 ✨
      </div>
    </div>
  </div>
</section>
```

### Firebase Module Script（放在 `</body>` 前）

```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
  import {
    getFirestore, collection, addDoc, onSnapshot,
    serverTimestamp, query, orderBy
  } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

  // 初始化 Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const colRef = collection(db, 'ai_course_wordcloud'); // 修改為你的簡報 slug

  const wcInput = document.getElementById('wc-input');
  const wcBtn = document.getElementById('wc-btn');
  const wcList = document.getElementById('wc-list');
  const wcCanvas = document.getElementById('wc-canvas');
  const wcEmpty = document.getElementById('wc-empty');
  const wcTotal = document.getElementById('wc-total');
  const wcUnique = document.getElementById('wc-unique');

  // 送出答案
  async function submitWord() {
    const text = wcInput.value.trim();
    if (!text) return;
    wcInput.value = '';
    try {
      await addDoc(colRef, {
        word: text,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  wcBtn.addEventListener('click', submitWord);
  wcInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitWord(); });

  // 監聽 Firestore 即時更新
  onSnapshot(colRef, (snapshot) => {
    const wordCounts = {};
    let totalCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.word) {
        const word = data.word.toLowerCase();
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        totalCount++;
      }
    });

    const listData = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    
    wcTotal.textContent = totalCount;
    wcUnique.textContent = listData.length;

    if (listData.length === 0) {
      wcEmpty.style.display = 'block';
      return;
    }
    wcEmpty.style.display = 'none';

    // 更新列表
    wcList.innerHTML = listData.slice(0, 10).map(([word, count]) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>${word}</span>
        <span style="color:var(--accent2);">${count}</span>
      </div>
    `).join('');

    // 繪製文字雲
    const cloudData = listData.map(([word, count]) => [word, count * 10 + 5]); // 大小權重
    
    // 設定畫布尺寸
    const rect = wcCanvas.parentElement.getBoundingClientRect();
    wcCanvas.width = rect.width;
    wcCanvas.height = rect.height;
    
    WordCloud(wcCanvas, {
      list: cloudData,
      gridSize: 8,
      weightFactor: 1,
      fontFamily: 'Segoe UI, sans-serif',
      color: () => {
        const colors = ['#e8643a', '#4fc3f7', '#81c784', '#ffb74d'];
        return colors[Math.floor(Math.random() * colors.length)];
      },
      backgroundColor: 'transparent',
      rotateRatio: 0.3
    });
  });
</script>
```

---

## 元件二：即時投票元件 (Poll)

### Section HTML

```html
<section id="slide-poll">
  <h2 style="font-size:1.1em; margin-bottom:0.4em;">以下何者是 AI 的核心特徵？</h2>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; height:400px; font-size:0.5em;">
    <!-- 左欄：選項按鈕 -->
    <div style="display:flex; flex-direction:column; gap:12px; justify-content:center;">
      <button class="poll-option-btn" data-option="A" style="padding:16px; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:10px; font-size:inherit; font-family:inherit; text-align:left; cursor:pointer; transition:all 0.2s;">
        A. 邏輯運算與推理
      </button>
      <button class="poll-option-btn" data-option="B" style="padding:16px; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:10px; font-size:inherit; font-family:inherit; text-align:left; cursor:pointer; transition:all 0.2s;">
        B. 學習與自我調整（機器學習）
      </button>
      <button class="poll-option-btn" data-option="C" style="padding:16px; background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:10px; font-size:inherit; font-family:inherit; text-align:left; cursor:pointer; transition:all 0.2s;">
        C. 完美無瑕的輸出
      </button>
    </div>

    <!-- 右欄：統計長條圖 -->
    <div style="display:flex; flex-direction:column; gap:16px; justify-content:center; background:rgba(255,255,255,0.03); border-radius:12px; padding:20px;">
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>A. 邏輯運算</span><span id="poll-count-A">0 票 (0%)</span>
        </div>
        <div style="height:14px; background:rgba(255,255,255,0.1); border-radius:7px; overflow:hidden;">
          <div id="poll-bar-A" style="height:100%; width:0%; background:var(--accent); transition:width 0.4s;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>B. 機器學習</span><span id="poll-count-B">0 票 (0%)</span>
        </div>
        <div style="height:14px; background:rgba(255,255,255,0.1); border-radius:7px; overflow:hidden;">
          <div id="poll-bar-B" style="height:100%; width:0%; background:var(--accent2); transition:width 0.4s;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>C. 完美輸出</span><span id="poll-count-C">0 票 (0%)</span>
        </div>
        <div style="height:14px; background:rgba(255,255,255,0.1); border-radius:7px; overflow:hidden;">
          <div id="poll-bar-C" style="height:100%; width:0%; background:var(--warn); transition:width 0.4s;"></div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Firebase Module Script (放在 `</body>` 前)

```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
  import {
    getFirestore, collection, addDoc, onSnapshot,
    serverTimestamp
  } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const pollColRef = collection(db, 'ai_course_poll_1'); // 修改為簡報 slug 及頁面 ID

  // 投票點擊
  document.querySelectorAll('.poll-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const option = btn.getAttribute('data-option');
      try {
        await addDoc(pollColRef, {
          vote: option,
          timestamp: serverTimestamp()
        });
        // 停用按鈕防重複投
        document.querySelectorAll('.poll-option-btn').forEach(b => b.disabled = true);
        btn.style.borderColor = 'var(--success)';
      } catch (e) {
        console.error("Error casting vote: ", e);
      }
    });
  });

  // 監聽即時票數
  onSnapshot(pollColRef, (snapshot) => {
    const votes = { A: 0, B: 0, C: 0 };
    let total = 0;
    snapshot.forEach(doc => {
      const option = doc.data().vote;
      if (votes[option] !== undefined) {
        votes[option]++;
        total++;
      }
    });

    ['A', 'B', 'C'].forEach(opt => {
      const count = votes[opt];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      document.getElementById(`poll-count-${opt}`).textContent = `${count} 票 (${percent}%)`;
      document.getElementById(`poll-bar-${opt}`).style.width = `${percent}%`;
    });
  });
</script>
```
