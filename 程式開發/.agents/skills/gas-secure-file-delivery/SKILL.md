---
name: gas-secure-file-delivery
description: 處理 GAS 網頁中產生並派發 PDF / Word 檔案時遇到的 403 錯誤、跨網域權限不足、Iframe 第三方 Cookie 阻擋與沙盒外掛限制。提供精準授權、安全 Blob 下載與 Canvas 離線預覽模組。
---

# GAS 跨網域安全檔案派發與預覽技能 (gas-secure-file-delivery)

## Overview
當使用者在 Google Apps Script (GAS) Web App 開發中遇到以下情況時，請嚴格套用此技能的標準解法：
- 「產生檔案後點開出現 403 / 需要存取權」
- 「不同網域的同仁無法下載產生的 PDF/Word」
- 「預覽檔案的 Iframe 顯示悲傷的文件圖示或 403」
- 「點擊下載按鈕被 Chrome 擋下並導向空白頁或發生錯誤」

此技能提供三大核心模組，用以突破 Google Workspace 的安全限制、Chrome 第三方 Cookie 防護以及 GAS Sandbox 限制。

## Core Modules

### 1. 精準授權模組 (突破跨網域 403)
在教育版或企業版 Workspace，`ANYONE_WITH_LINK` 常常失效。必須強制抓取操作者的 Email 並精準賦予 `Viewer` 權限。
**實作方式** (於 `Code.gs` 中)：
```javascript
try {
  var activeUserEmail = Session.getActiveUser().getEmail();
  if (activeUserEmail) {
    pdfFile.addViewer(activeUserEmail);
    // 如果有其他檔案如 docxFile 也一併加入
  }
} catch(e) {
  console.error("無法加入檢視權限:", e);
}
```

### 2. 安全 Blob 下載模組 (突破 _top 沙盒限制)
將後端檔案轉為 `Base64` 送往前端，轉為 Blob URL 下載時，必須強制覆蓋 GAS 預設的 `<base target="_top">`，否則會觸發沙盒 Clickjacking 攔截。
**實作方式** (於 `Index.html` 中)：
```javascript
// result 需包含後端傳來的 base64 字串
const byteCharacters = atob(result.fileBase64);
const byteNumbers = new Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
}
const byteArray = new Uint8Array(byteNumbers);
const blob = new Blob([byteArray], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}); // 依據檔案類型調整
const downloadUrl = window.URL.createObjectURL(blob);

const a = document.createElement('a');
a.style.display = 'none';
a.href = downloadUrl;
a.download = "檔案名稱.docx";
a.target = "_blank"; // 【關鍵】必須設定 _blank 覆蓋沙盒的 _top
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(downloadUrl);
```

### 3. Canvas 離線預覽模組 (突破 Iframe Cookie 與外掛限制)
GAS 的 Iframe Sandbox 禁止載入 Chrome 內建 PDF 閱讀外掛，且嵌入 Google Drive URL 會被阻擋第三方 Cookie。必須透過 `pdf.js` 在 Canvas 自行繪製。
**實作方式** (於 `Index.html` 中)：
```html
<!-- HTML 結構：隱藏原來的 iframe，改用 Canvas 容器 -->
<div id="pdfCanvasContainer" style="width:100%; height:600px; overflow:auto; text-align:center;">
  <canvas id="pdfCanvas" style="max-width: 95%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); background: white;"></canvas>
</div>
```

```javascript
// JS 邏輯：動態載入 pdf.js 並渲染
function renderPdfCanvas(base64Data) {
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = function() { drawCanvas(base64Data); };
    document.head.appendChild(script);
  } else {
    drawCanvas(base64Data);
  }
}

function drawCanvas(base64) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
  const pdfData = atob(base64);
  const loadingTask = window.pdfjsLib.getDocument({data: pdfData});
  loadingTask.promise.then(function(pdf) {
    pdf.getPage(1).then(function(page) {
      const scale = 1.5;
      const viewport = page.getViewport({scale: scale});
      const canvas = document.getElementById('pdfCanvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      page.render({canvasContext: context, viewport: viewport});
    });
  }).catch(function(err) {
    console.error("PDF.js render error:", err);
  });
}
```

## 注意事項
套用上述方法後，絕對不要再請使用者手動去瀏覽器開啟第三方 Cookie，因為 Canvas 渲染與 Blob 下載完全不需要第三方 Cookie 即可運作，是真正的跨平台/跨網域終極解法。
