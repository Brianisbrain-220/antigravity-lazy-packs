(function() {
  'use strict';

  // P3-B 集中版本常數
  const APP_VERSION = 'v0.2.1';

  // State
  let parsedRecords = [];
  let currentFileName = '';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorBanner = document.getElementById('errorBanner');
  const errorTitle = document.getElementById('errorTitle');
  const errorMsg = document.getElementById('errorMsg');
  const previewCard = document.getElementById('previewCard');
  const statTotal = document.getElementById('statTotal');
  const statIssue = document.getElementById('statIssue');
  const btnDownload = document.getElementById('btnDownload');
  const btnReset = document.getElementById('btnReset');
  const searchInput = document.getElementById('searchInput');
  const toggleMask = document.getElementById('toggleMask');
  const tableBody = document.getElementById('tableBody');

  // Event Listeners
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // P3-E 多檔拖曳提示
      if (e.dataTransfer.files.length > 1) {
        showError(
          'ℹ️ 提示：一次請處理一個檔案',
          '偵測到拖曳了多個檔案。本工具每次請處理一個 Word 檔，系統已自動為您載入第一個檔案。'
        );
      }
      processFile(e.dataTransfer.files[0]);
    }
  });

  btnReset.addEventListener('click', () => {
    parsedRecords = [];
    currentFileName = '';
    fileInput.value = '';
    previewCard.classList.remove('show');
    dropZone.style.display = 'block';
    hideError();
  });

  searchInput.addEventListener('input', renderTable);
  toggleMask.addEventListener('change', renderTable);
  btnDownload.addEventListener('click', () => exportToExcel(parsedRecords));

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > 1) {
        showError(
          'ℹ️ 提示：一次請處理一個檔案',
          '每次請選擇單一 Word 檔案，系統已自動為您載入第一個檔案。'
        );
      }
      processFile(e.target.files[0]);
    }
  }

  function showError(title, message) {
    errorTitle.textContent = title;
    errorMsg.textContent = message;
    errorBanner.classList.add('show');
    loadingOverlay.classList.remove('show');
    dropZone.style.display = 'block';
  }

  function hideError() {
    errorBanner.classList.remove('show');
  }

  function processFile(file) {
    currentFileName = file.name;

    // Check extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      if (file.name.toLowerCase().endsWith('.doc')) {
        showError(
          '⚠️ 檔案格式為舊版 .doc',
          '本工具僅支援現代標準 .docx 格式。請先在 Microsoft Word 中開啟該檔案，點選「檔案」➔「另存新檔」，將存檔類型選擇為「Word 文件 (*.docx)」，再重新上傳。'
        );
      } else {
        showError(
          '⚠️ 不支援的檔案格式',
          '請上傳 Word 文件檔 (.docx)。'
        );
      }
      return;
    }

    dropZone.style.display = 'none';
    loadingOverlay.classList.add('show');

    const reader = new FileReader();
    reader.onload = function(e) {
      const buffer = e.target.result;

      // Validate ZIP magic
      if (!DocxAssessmentParser.checkZipMagic(buffer)) {
        showError(
          '⚠️ 檔案非標準 DOCX 壓縮格式',
          '檔案開頭未通過 ZIP 格式驗證（可能為偽裝成 .docx 的舊版 .doc 或檔案損壞）。請用 Microsoft Word 開啟後「另存新檔」為真正的 .docx 格式後重試。'
        );
        return;
      }

      // Allow UI spinner to paint before CPU-heavy parsing
      setTimeout(() => {
        executeParse(buffer);
      }, 50);
    };

    reader.onerror = function() {
      showError('⚠️ 檔案讀取失敗', '無法讀取本機檔案，請確認檔案權限後重試。');
    };

    reader.readAsArrayBuffer(file);
  }

  async function executeParse(buffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const xmlFile = zip.file('word/document.xml');
      if (!xmlFile) {
        showError('⚠️ 無效的 DOCX 檔案', '找不到 word/document.xml 內容檔，請確認檔案未損壞。');
        return;
      }

      const xmlText = await xmlFile.async('string');
      
      // P3-D: parseDocxXml 內部已做 parsererror 檢查並丟出明確例外
      parsedRecords = DocxAssessmentParser.parseDocxXml(xmlText);

      loadingOverlay.classList.remove('show');

      if (parsedRecords.length === 0) {
        showError(
          '⚠️ 未偵測到考核通知書表格',
          '在檔案中找不到符合「姓名」、「身分證字號」、「核定薪額」特徵的考核通知書表格，請確認該 Word 檔案是否為標準考核通知書格式。'
        );
        return;
      }

      // Success
      renderResults();

    } catch (err) {
      console.error(err);
      showError('⚠️ 檔案內容解析失敗', err.message || '未知錯誤');
    }
  }

  function renderResults() {
    previewCard.classList.add('show');
    const total = parsedRecords.length;
    const issues = parsedRecords.filter(r => r['解析備註'] !== '').length;

    statTotal.textContent = '🎯 成功解析：' + total + ' 位教師';
    if (issues > 0) {
      statIssue.textContent = '⚠️ ' + issues + ' 筆有缺漏或重複 (已紅底標記)';
      statIssue.style.display = 'inline-block';
    } else {
      statIssue.style.display = 'none';
    }

    renderTable();
  }

  function renderTable() {
    const query = searchInput.value.trim().toLowerCase();
    const mask = toggleMask.checked;

    let filtered = parsedRecords;
    if (query) {
      filtered = parsedRecords.filter(r => {
        return (r['姓名'] && r['姓名'].toLowerCase().includes(query)) ||
               (r['身分證字號'] && r['身分證字號'].toLowerCase().includes(query)) ||
               (r['現職'] && r['現職'].toLowerCase().includes(query)) ||
               (r['受文者'] && r['受文者'].toLowerCase().includes(query));
      });
    }

    tableBody.innerHTML = '';

    filtered.forEach((r, idx) => {
      const tr = document.createElement('tr');
      if (r['解析備註']) {
        tr.classList.add('has-issue');
      }

      let idDisplay = r['身分證字號'] || '';
      if (mask && idDisplay.length >= 6) {
        idDisplay = idDisplay.substring(0, idDisplay.length - 4) + '****';
      }

      let noteHtml = '<span class="badge-ok">正常</span>';
      if (r['解析備註']) {
        noteHtml = '<span class="badge-error">' + escapeHtml(r['解析備註']) + '</span>';
      }

      tr.innerHTML = 
        '<td>' + (idx + 1) + '</td>' +
        '<td>' + escapeHtml(r['受文者']) + '</td>' +
        '<td>' + escapeHtml(r['發文日期']) + '</td>' +
        '<td>' + escapeHtml(r['發文字號']) + '</td>' +
        '<td>' + escapeHtml(r['核定學年度']) + '</td>' +
        '<td>' + escapeHtml(r['核定文號']) + '</td>' +
        '<td><strong>' + escapeHtml(r['姓名']) + '</strong></td>' +
        '<td><code>' + escapeHtml(idDisplay) + '</code></td>' +
        '<td>' + escapeHtml(r['現職']) + '</td>' +
        '<td>' + escapeHtml(r['現支本薪']) + '</td>' +
        '<td>' + escapeHtml(r['現支年功薪']) + '</td>' +
        '<td><code>' + escapeHtml(r['現支薪額合計']) + '</code></td>' +
        '<td>' + escapeHtml(r['符合條款']) + '</td>' +
        '<td><code>' + escapeHtml(r['核定薪額']) + '</code></td>' +
        '<td>' + escapeHtml(r['核定獎懲']) + '</td>' +
        '<td title="' + escapeHtml(r['說明']) + '">' + escapeHtml(r['說明']) + '</td>' +
        '<td>' + noteHtml + '</td>';

      tableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Excel Export with SheetJS ---
  function exportToExcel(records) {
    if (!records || records.length === 0) return;

    const headers = [
      '受文者', '發文日期', '發文字號', '核定學年度', '核定文號',
      '姓名', '身分證字號', '現職', '現支本薪', '現支年功薪',
      '現支薪額合計', '符合條款', '核定薪額', '核定獎懲', '說明',
      '解析備註'
    ];

    const aoa = [headers];
    for (const r of records) {
      const row = headers.map(h => r[h] !== undefined && r[h] !== null ? String(r[h]) : '');
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set Column Widths
    ws['!cols'] = [
      { wch: 15 }, // 受文者
      { wch: 22 }, // 發文日期
      { wch: 28 }, // 發文字號
      { wch: 12 }, // 核定學年度
      { wch: 38 }, // 核定文號
      { wch: 12 }, // 姓名
      { wch: 16 }, // 身分證字號
      { wch: 20 }, // 現職
      { wch: 10 }, // 現支本薪
      { wch: 10 }, // 現支年功薪
      { wch: 14 }, // 現支薪額合計
      { wch: 18 }, // 符合條款
      { wch: 12 }, // 核定薪額
      { wch: 16 }, // 核定獎懲
      { wch: 65 }, // 說明
      { wch: 20 }  // 解析備註
    ];

    // Format enforcement: string type (t:'s') and text format (z:'@')
    const specialFormatCols = ['身分證字號', '現支薪額合計', '核定薪額'];
    const specialColIndices = specialFormatCols.map(name => headers.indexOf(name));

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (cell) {
          cell.t = 's';
          if (specialColIndices.includes(C)) {
            cell.z = '@';
          }
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '成績考核清單');

    // Filename 帶日期不帶人名
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = '教師成績考核清單_' + yyyy + mm + dd + '.xlsx';

    XLSX.writeFile(wb, filename);
  }

})();
