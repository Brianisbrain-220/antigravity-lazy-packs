(function() {
  'use strict';

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

  // Check Magic Bytes: 50 4B 03 04 (PK\x03\x04)
  function checkZipMagic(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
    const view = new Uint8Array(arrayBuffer);
    return view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
  }

  function processFile(file) {
    hideError();
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
      if (!checkZipMagic(buffer)) {
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

  // --- DOCX XML Parsing Core (Row-stream State Machine) ---
  const KEYWORDS = [
    { key: '核定薪額', field: '核定薪額' },
    { key: '核定獎懲', field: '核定獎懲' },
    { key: '身分證',   field: '身分證字號' },
    { key: '姓名',     field: '姓名' },
    { key: '現職',     field: '現職' },
    { key: '年功薪',   field: '現支年功薪' },
    { key: '本薪',     field: '現支本薪' },
    { key: '合計',     field: '現支薪額合計' },
    { key: '符合條款', field: '符合條款' },
    { key: '說明',     field: '說明' }
  ];

  function extractText(node) {
    const parts = [];
    function walk(n) {
      if (!n) return;
      const name = n.localName || n.nodeName.split(':').pop();
      if (name === 'del' || name === 'instrText' || name === 'Fallback') {
        return;
      }
      if (name === 't') {
        parts.push(n.textContent || '');
        return;
      }
      if (name === 'tab' || name === 'br') {
        parts.push(' ');
        return;
      }
      for (let c = n.firstElementChild; c; c = c.nextElementSibling) {
        walk(c);
      }
    }
    walk(node);
    return parts.join('').normalize('NFKC');
  }

  function extractCellText(cell) {
    return extractText(cell);
  }

  function getRows(tbl) {
    const rows = [];
    for (let c = tbl.firstElementChild; c; c = c.nextElementSibling) {
      const name = c.localName || c.nodeName.split(':').pop();
      if (name === 'tr') rows.push(c);
    }
    return rows;
  }

  function getCells(tr) {
    const cells = [];
    for (let c = tr.firstElementChild; c; c = c.nextElementSibling) {
      const name = c.localName || c.nodeName.split(':').pop();
      if (name === 'tc') cells.push(c);
    }
    return cells;
  }

  function getParagraphs(cell) {
    const paras = [];
    function findP(n) {
      if (!n) return;
      const name = n.localName || n.nodeName.split(':').pop();
      if (name === 'p') {
        paras.push(n);
        return;
      }
      for (let c = n.firstElementChild; c; c = c.nextElementSibling) {
        findP(c);
      }
    }
    findP(cell);
    return paras;
  }

  function hasNestedTable(tbl) {
    let found = false;
    function search(n) {
      if (found || !n) return;
      for (let c = n.firstElementChild; c; c = c.nextElementSibling) {
        const name = c.localName || c.nodeName.split(':').pop();
        if (name === 'tbl') {
          found = true;
          return;
        }
        search(c);
      }
    }
    search(tbl);
    return found;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function parseHeaderFields(headerBuf) {
    const fullText = headerBuf.join('\n');
    const normalized = fullText.normalize('NFKC');

    const lastRecipientIdx = normalized.lastIndexOf('受文者');
    let headText = '';
    let bodyText = '';

    if (lastRecipientIdx !== -1) {
      headText = normalized.substring(0, lastRecipientIdx);
      bodyText = normalized.substring(lastRecipientIdx);
    } else {
      headText = normalized;
      bodyText = normalized;
    }

    // 發文日期: last 中華民國\s*\d+\s*年\s*\d+\s*月\s*\d+\s*日
    const dateRegex = /中華民國\s*\d+\s*年\s*\d+\s*月\s*\d+\s*日/g;
    let dateMatches = [...headText.matchAll(dateRegex)];
    let issueDate = '';
    if (dateMatches.length > 0) {
      issueDate = dateMatches[dateMatches.length - 1][0].trim();
    }

    // Replace date with \n, then find last notice number:
    const headWithoutDate = issueDate ? headText.replace(new RegExp(escapeRegExp(issueDate), 'g'), '\n') : headText;
    const issueNoRegex = /[^\n\s，。：:]+?字第\s*\d+\s*號/g;
    let issueNoMatches = [...headWithoutDate.matchAll(issueNoRegex)];
    let issueNo = '';
    if (issueNoMatches.length > 0) {
      issueNo = issueNoMatches[issueNoMatches.length - 1][0].trim();
    }

    // 受文者: 受文者\s*[:：]\s*([^\n]+)
    let recipient = '';
    const recipientMatch = bodyText.match(/受文者\s*[:：]\s*([^\n]+)/);
    if (recipientMatch) {
      recipient = recipientMatch[1].trim();
    }

    // 核定學年度: (\d+)\s*學年度
    let academicYear = '';
    const yearMatch = bodyText.match(/(\d+)\s*學年度/);
    if (yearMatch) {
      academicYear = yearMatch[1] + '學年度';
    }

    // 核定文號: \d+\s*年\s*\d+\s*月\s*\d+\s*日[^\n\s，。]*?字第\s*\d+\s*號
    let approvalNo = '';
    const approvalNoMatch = bodyText.match(/\d+\s*年\s*\d+\s*月\s*\d+\s*日[^\n\s，。]*?字第\s*\d+\s*號/);
    if (approvalNoMatch) {
      approvalNo = approvalNoMatch[0].trim();
    }

    return {
      受文者: recipient,
      發文日期: issueDate,
      發文字號: issueNo,
      核定學年度: academicYear,
      核定文號: approvalNo
    };
  }

  function createEmptyRecord() {
    return {
      受文者: '',
      發文日期: '',
      發文字號: '',
      核定學年度: '',
      核定文號: '',
      姓名: '',
      身分證字號: '',
      現職: '',
      現支本薪: '',
      現支年功薪: '',
      現支薪額合計: '',
      符合條款: '',
      核定薪額: '',
      核定獎懲: '',
      說明: '',
      解析備註: '',
      notes: [],
      headerBuf: []
    };
  }

  function finalizeRecord(record) {
    const headerData = parseHeaderFields(record.headerBuf || []);
    record['受文者'] = headerData.受文者 || '';
    record['發文日期'] = headerData.發文日期 || '';
    record['發文字號'] = headerData.發文字號 || '';
    record['核定學年度'] = headerData.核定學年度 || '';
    record['核定文號'] = headerData.核定文號 || '';

    const requiredFields = [
      '受文者', '發文日期', '發文字號', '核定學年度', '核定文號',
      '姓名', '身分證字號', '現職', '現支本薪', '現支年功薪',
      '現支薪額合計', '符合條款', '核定薪額', '核定獎懲', '說明'
    ];
    for (const f of requiredFields) {
      if (!record[f] || String(record[f]).trim() === '') {
        record.notes.push(f + '缺');
      }
    }

    record['解析備註'] = record.notes.join('；');
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
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      let body = null;
      const bodies = xmlDoc.getElementsByTagNameNS ? xmlDoc.getElementsByTagNameNS('*', 'body') : xmlDoc.getElementsByTagName('w:body');
      if (bodies && bodies.length > 0) {
        body = bodies[0];
      } else {
        body = xmlDoc.documentElement;
      }

      const state = {
        headerBuf: [],
        currentRecord: null,
        records: []
      };

      function processRow(tr) {
        const cells = getCells(tr);
        if (cells.length === 0) return;

        const lastCell = cells[cells.length - 1];
        const value = extractCellText(lastCell).trim();

        const otherCells = cells.slice(0, cells.length - 1);
        const labelText = otherCells.map(c => extractCellText(c)).join('').replace(/\s+/g, '');

        let matchedField = null;
        for (const item of KEYWORDS) {
          if (labelText.includes(item.key)) {
            matchedField = item.field;
            break;
          }
        }

        if (matchedField === '姓名') {
          if (state.currentRecord) {
            finalizeRecord(state.currentRecord);
            state.records.push(state.currentRecord);
          }
          state.currentRecord = createEmptyRecord();
          state.currentRecord['姓名'] = value;
          state.currentRecord.headerBuf = [...state.headerBuf];
          state.headerBuf = [];
        } else if (matchedField && state.currentRecord) {
          if (state.currentRecord[matchedField]) {
            state.currentRecord.notes.push('欄位[' + matchedField + ']重複');
          } else {
            state.currentRecord[matchedField] = value;
          }
        } else {
          for (const cell of cells) {
            const paras = getParagraphs(cell);
            for (const p of paras) {
              const pText = extractText(p).trim();
              if (pText) {
                state.headerBuf.push(pText);
              }
            }
          }
        }
      }

      function processTable(tbl) {
        const rows = getRows(tbl);
        for (const r of rows) {
          processRow(r);
        }
      }

      function traverse(node) {
        for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
          const name = child.localName || child.nodeName.split(':').pop();
          if (name === 'tbl') {
            if (hasNestedTable(child)) {
              traverse(child);
            } else {
              processTable(child);
            }
          } else if (name === 'p') {
            const text = extractText(child).trim();
            if (text) {
              state.headerBuf.push(text);
            }
          } else {
            traverse(child);
          }
        }
      }

      traverse(body);

      if (state.currentRecord) {
        finalizeRecord(state.currentRecord);
        state.records.push(state.currentRecord);
        state.currentRecord = null;
      }

      parsedRecords = state.records;

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
      showError('⚠️ 解析過程發生錯誤', '錯誤詳情：' + (err.message || err));
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
