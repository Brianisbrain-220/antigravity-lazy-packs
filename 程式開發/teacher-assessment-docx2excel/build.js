const fs = require('fs');
const path = require('path');

const cssCode = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const jszipCode = fs.readFileSync(path.join(__dirname, 'jszip.min.js'), 'utf8');
const xlsxCode = fs.readFileSync(path.join(__dirname, 'xlsx.full.min.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>教師成績考核通知書 Word 轉 Excel 工具 (100% 本機離線版)</title>
  <style>
${cssCode}
  </style>
</head>
<body>

<div class="container">
  <header>
    <div class="title-row">
      <h1>🏫 教師成績考核通知書 Word 轉 Excel 工具</h1>
      <div class="badge-secure">
        <span>🔒 100% 本機離線執行・個資絕不上傳</span>
      </div>
    </div>
    <p class="subtitle">專為學校人事與教務同仁設計・單檔批次自動萃取 15 項完整欄位・保留前導零不失真</p>
  </header>

  <!-- Error Banner -->
  <div id="errorBanner" class="banner banner-danger">
    <strong id="errorTitle">⚠️ 檔案格式錯誤</strong>
    <p id="errorMsg"></p>
  </div>

  <!-- Upload Card -->
  <div id="uploadCard" class="card">
    <div id="dropZone" class="drop-zone">
      <span class="drop-icon">📂</span>
      <div class="drop-title">將 Word 檔案 (.docx) 拖曳至此處，或點擊選擇檔案</div>
      <div class="drop-desc">支援全校多人合併之大型通知書 Word 檔，自動精準辨識多張通知書</div>
      <input type="file" id="fileInput" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
    </div>

    <!-- Loading -->
    <div id="loadingOverlay" class="loading-overlay">
      <div class="spinner"></div>
      <h3 style="font-size: 16px; margin-bottom: 6px;">正在讀取並解析 Word 檔案內容...</h3>
      <p style="color: var(--text-muted); font-size: 13px;">採用列流狀態機精準切分，請稍候片刻</p>
    </div>
  </div>

  <!-- Preview Card -->
  <div id="previewCard" class="card preview-section">
    <div class="action-bar">
      <div class="stat-group">
        <div id="statTotal" class="stat-badge stat-success">🎯 成功解析：0 位教師</div>
        <div id="statIssue" class="stat-badge stat-warning" style="display: none;">⚠️ 0 筆有缺漏或重複</div>
      </div>
      <div class="btn-group">
        <button id="btnDownload" class="btn btn-download">📥 下載 Excel 總表 (.xlsx)</button>
        <button id="btnReset" class="btn btn-secondary">🔄 重新選擇檔案</button>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 快速搜尋姓名、身分證或現職...">
      <label class="toggle-label">
        <input type="checkbox" id="toggleMask" checked>
        <span>遮罩身分證字號 (預設隱藏後 4 碼)</span>
      </label>
    </div>

    <div class="table-container">
      <table id="dataTable">
        <thead>
          <tr>
            <th>項次</th>
            <th>受文者</th>
            <th>發文日期</th>
            <th>發文字號</th>
            <th>核定學年度</th>
            <th>核定文號</th>
            <th>姓名</th>
            <th>身分證字號</th>
            <th>現職</th>
            <th>現支本薪</th>
            <th>現支年功薪</th>
            <th>現支薪額合計</th>
            <th>符合條款</th>
            <th>核定薪額</th>
            <th>核定獎懲</th>
            <th>說明</th>
            <th>解析備註</th>
          </tr>
        </thead>
        <tbody id="tableBody">
        </tbody>
      </table>
    </div>
  </div>

  <footer>
    <p>教師成績考核通知書 Word 轉 Excel 離線工具 v1.0.0 | 純本機瀏覽器沙盒執行・無外部網路請求</p>
  </footer>
</div>

<!-- Bundled Libraries -->
<script>
// --- JSZip v3.10.1 ---
${jszipCode}
</script>

<script>
// --- SheetJS v0.20.3 ---
${xlsxCode}
</script>

<!-- Application Core Logic -->
<script>
${appCode}
</script>

</body>
</html>
`;

const outputPath = path.join(__dirname, 'index.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log('✅ Generated standalone index.html at:', outputPath);
const stat = fs.statSync(outputPath);
console.log('File size:', (stat.size / 1024 / 1024).toFixed(2), 'MB (' + stat.size + ' bytes)');
