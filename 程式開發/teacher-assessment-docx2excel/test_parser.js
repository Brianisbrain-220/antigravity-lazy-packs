const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const JSZip = require('./jszip.min.js');
const XLSX = require('./xlsx.full.min.js');

// Text extraction helper
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
      record.notes.push(`${f}缺`);
    }
  }

  record['解析備註'] = record.notes.join('；');
}

function parseDocxXml(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

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
        state.currentRecord.notes.push(`欄位[${matchedField}]重複`);
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

// Run test cases
console.log('--- Testing DOCX XML Parser ---');

const sampleXml1 = `
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
  <w:p/>
  <w:tbl>
    <w:tr>
      <w:tc><w:p/></w:tc>
      <w:tc><w:p><w:r><w:t>高雄市苓雅區中正國民小學</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>教師成績考核通知書</w:t></w:r></w:p></w:tc>
      <w:tc>
        <w:p><w:r><w:t>中華民國115年9月18日</w:t></w:r></w:p>
        <w:p><w:r><w:t>高市中正人字第1157064080號</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
    <w:tr>
      <w:tc>
        <w:p><w:r><w:t>受文者：王○○先生</w:t></w:r></w:p>
        <w:p><w:r><w:t>一、臺端114學年度成績考核業經高雄市政府115年9月14日高市府教人字第11538047800號函核定如下。</w:t></w:r></w:p>
        <w:p><w:r><w:t>二、請查照。</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>王○○</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>身分證字號</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>A123456789</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>現職</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>教師兼組長</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc>
        <w:p><w:r><w:t>現</w:t></w:r></w:p>
        <w:p><w:r><w:t>支</w:t></w:r></w:p>
        <w:p><w:r><w:t>薪</w:t></w:r></w:p>
        <w:p><w:r><w:t>額</w:t></w:r></w:p>
      </w:tc>
      <w:tc><w:p><w:r><w:t>本薪</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>525</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p/></w:tc>
      <w:tc><w:p><w:r><w:t>年功薪</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>125</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p/></w:tc>
      <w:tc><w:p><w:r><w:t>合計</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>0650</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>符合條款</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>第4條第1項第1款</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>核定薪額</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>0650</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>核定獎懲</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>獎金</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>說明</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>給與兩個月薪給總額之一次獎金</w:t></w:r></w:p></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p/></w:tc>
    </w:tr>
    <w:tr>
      <w:tc><w:p><w:r><w:t>備註：受考人員對於考核考列結果如有異議…</w:t></w:r></w:p></w:tc>
    </w:tr>
  </w:tbl>
</w:body>
</w:document>
`;

const res1 = parseDocxXml(sampleXml1);
console.log('Sample 1 (Single teacher): count =', res1.length);
console.log('Record 1:', JSON.stringify(res1[0], null, 2));

if (res1.length === 1 && res1[0]['姓名'] === '王○○' && res1[0]['核定薪額'] === '0650' && res1[0]['解析備註'] === '') {
  console.log('✅ Sample 1 PASS (15 fields extracted, 0 notes)');
} else {
  console.error('❌ Sample 1 FAIL');
  process.exit(1);
}

// Sample 2: Merged table with 2 teachers
const sampleXml2 = `
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
  <w:tbl>
    <!-- Teacher 1 -->
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>高雄市苓雅區中正國民小學</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>中華民國115年9月18日</w:t></w:r></w:p><w:p><w:r><w:t>高市中正人字第1157064080號</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>受文者：王○○先生</w:t></w:r></w:p><w:p><w:r><w:t>一、臺端114學年度成績考核業經高雄市政府115年9月14日高市府教人字第11538047800號函核定如下。</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>王○○</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>身分證字號</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>A123456789</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現職</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>教師兼組長</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現支薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>本薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>525</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>年功薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>125</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>合計</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0650</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>符合條款</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>第4條第1項第1款</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0650</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定獎懲</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>獎金</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>說明</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>給與兩個月薪給總額之一次獎金</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>備註：異議申訴說明…</w:t></w:r></w:p></w:tc></w:tr>
    
    <!-- Teacher 2 (merged into same table) -->
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>高雄市苓雅區中正國民小學</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>中華民國115年9月19日</w:t></w:r></w:p><w:p><w:r><w:t>高市中正人字第1157064099號</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>受文者：李○○女士</w:t></w:r></w:p><w:p><w:r><w:t>一、臺端114學年度成績考核業經高雄市政府115年9月14日高市府教人字第11538047800號函核定如下。</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>李○○</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>身分證字號</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>B234567890</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現職</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>教師</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現支薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>本薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>450</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>年功薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>合計</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0450</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>符合條款</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>第4條第1項第2款</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0475</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定獎懲</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>晉本薪</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>說明</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>晉本薪一級</w:t></w:r></w:p></w:tc></w:tr>
  </w:tbl>
</w:body>
</w:document>
`;

const res2 = parseDocxXml(sampleXml2);
console.log('Sample 2 (Merged table, 2 teachers): count =', res2.length);
if (res2.length === 2 && res2[0]['姓名'] === '王○○' && res2[1]['姓名'] === '李○○' && res2[1]['發文字號'] === '高市中正人字第1157064099號') {
  console.log('✅ Sample 2 PASS (2 records properly split in merged table)');
} else {
  console.error('❌ Sample 2 FAIL');
  process.exit(1);
}

// Test Excel generation
const headers = [
  '受文者', '發文日期', '發文字號', '核定學年度', '核定文號',
  '姓名', '身分證字號', '現職', '現支本薪', '現支年功薪',
  '現支薪額合計', '符合條款', '核定薪額', '核定獎懲', '說明',
  '解析備註'
];
const aoa = [headers];
for (const r of res2) {
  aoa.push(headers.map(h => r[h] || ''));
}
const ws = XLSX.utils.aoa_to_sheet(aoa);
const range = XLSX.utils.decode_range(ws['!ref']);
const specialFormatCols = ['身分證字號', '現支薪額合計', '核定薪額'];
const specialColIndices = specialFormatCols.map(name => headers.indexOf(name));

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
const testOut = './test_output.xlsx';
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(testOut, buf);
console.log('✅ Excel output created at:', testOut);

const readBackWb = XLSX.read(fs.readFileSync(testOut));
const readSheet = readBackWb.Sheets['成績考核清單'];
const readBack0650 = readSheet[XLSX.utils.encode_cell({ r: 1, c: headers.indexOf('現支薪額合計') })];
console.log('Read back 0650 cell:', readBack0650);

if (readBack0650 && readBack0650.v === '0650' && readBack0650.t === 's') {
  console.log('✅ Leading zero 0650 preserved and read back as string!');
} else {
  console.error('❌ Leading zero check failed!');
  process.exit(1);
}

console.log('ALL UNIT TESTS PASSED!');
