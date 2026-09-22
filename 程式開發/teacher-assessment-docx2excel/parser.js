(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DocxAssessmentParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

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

  function checkZipMagic(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 4) return false;
    const view = new Uint8Array(arrayBuffer);
    return view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
  }

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
      if (name === 'tab') {
        parts.push(' ');
        return;
      }
      if (name === 'br') {
        // P2-A 修復：w:br 為手動換行 (Shift+Enter)，不得轉成空白。
        // 中文公文排版不需要空白，且標頭正則字元類均排除 \s。
        // 分頁用的 <w:br w:type="page"/> 落在空段落，不受影響。
        return;
      }
      for (let c = n.firstElementChild || n.firstChild; c; c = c.nextElementSibling || c.nextSibling) {
        if (c.nodeType === 1) walk(c);
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
    for (let c = tbl.firstElementChild || tbl.firstChild; c; c = c.nextElementSibling || c.nextSibling) {
      if (c.nodeType === 1) {
        const name = c.localName || c.nodeName.split(':').pop();
        if (name === 'tr') rows.push(c);
      }
    }
    return rows;
  }

  function getCells(tr) {
    const cells = [];
    for (let c = tr.firstElementChild || tr.firstChild; c; c = c.nextElementSibling || c.nextSibling) {
      if (c.nodeType === 1) {
        const name = c.localName || c.nodeName.split(':').pop();
        if (name === 'tc') cells.push(c);
      }
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
      for (let c = n.firstElementChild || n.firstChild; c; c = c.nextElementSibling || c.nextSibling) {
        if (c.nodeType === 1) findP(c);
      }
    }
    findP(cell);
    return paras;
  }

  function hasNestedTable(tbl) {
    let found = false;
    function search(n) {
      if (found || !n) return;
      for (let c = n.firstElementChild || n.firstChild; c; c = c.nextElementSibling || c.nextSibling) {
        if (c.nodeType === 1) {
          const name = c.localName || c.nodeName.split(':').pop();
          if (name === 'tbl') {
            found = true;
            return;
          }
          search(c);
        }
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

  function parseDocxXml(xmlString, customDOMParser) {
    const ParserClass = customDOMParser || (typeof DOMParser !== 'undefined' ? DOMParser : null);
    if (!ParserClass) {
      throw new Error('環境中無可用的 DOMParser');
    }

    const parser = new ParserClass({
      errorHandler: {
        warning: function() {},
        error: function(msg) {
          throw new Error('Word 檔案內容損壞（XML 解析失敗: ' + msg + '）。');
        },
        fatalError: function(msg) {
          throw new Error('Word 檔案內容損壞（XML 嚴重解析失敗: ' + msg + '）。');
        }
      }
    });
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // P3-D 檢查瀏覽器原生 parsererror
    const parsererrors = (xmlDoc.getElementsByTagName && xmlDoc.getElementsByTagName('parsererror')) || [];
    const isParserError = (parsererrors && parsererrors.length > 0) ||
                          (xmlDoc.documentElement && xmlDoc.documentElement.nodeName === 'parsererror');
    if (isParserError) {
      throw new Error('Word 檔案內容損壞（XML 解析失敗，偵測到 parsererror）。');
    }

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
      for (let child = node.firstElementChild || node.firstChild; child; child = child.nextElementSibling || child.nextSibling) {
        if (child.nodeType !== 1) continue;
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

    return state.records;
  }

  return {
    parseDocxXml,
    parseHeaderFields,
    checkZipMagic,
    extractText
  };
});
