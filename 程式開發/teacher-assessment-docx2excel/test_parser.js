const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const XLSX = require('./xlsx.full.min.js');
const { parseDocxXml } = require('./parser.js');

console.log('--- Running Teacher Assessment Parser Tests (v0.2.1) ---');

// Test 1: Single Teacher Sample
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

const res1 = parseDocxXml(sampleXml1, DOMParser);
console.log('Test 1 (Single teacher): count =', res1.length);
if (res1.length === 1 && res1[0]['姓名'] === '王○○' && res1[0]['核定薪額'] === '0650' && res1[0]['解析備註'] === '') {
  console.log('✅ Test 1 PASS (15 fields extracted, 0 notes)');
} else {
  console.error('❌ Test 1 FAIL');
  process.exit(1);
}

// Test 2: Merged Table with 2 Teachers
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
    
    <!-- Teacher 2 -->
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

const res2 = parseDocxXml(sampleXml2, DOMParser);
console.log('Test 2 (Merged table, 2 teachers): count =', res2.length);
if (res2.length === 2 && res2[0]['姓名'] === '王○○' && res2[1]['姓名'] === '李○○' && res2[1]['發文字號'] === '高市中正人字第1157064099號') {
  console.log('✅ Test 2 PASS (2 records properly split in merged table)');
} else {
  console.error('❌ Test 2 FAIL');
  process.exit(1);
}

// Test 3: Synthetic C (P2-A verification: w:br in notice number and date)
const sampleXml3 = `
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
  <w:tbl>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>高雄市苓雅區中正國民小學</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr>
      <w:tc/>
      <w:tc>
        <w:p><w:r><w:t>中華民國115年</w:t><w:br/><w:t>9月18日</w:t></w:r></w:p>
        <w:p><w:r><w:t>高市中正</w:t><w:br/><w:t>人字第1157064080號</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
    <w:tr>
      <w:tc>
        <w:p><w:r><w:t>受文者：陳○○先生</w:t></w:r></w:p>
        <w:p><w:r><w:t>一、臺端114學年度成績考核業經高雄市政府115年9月14日高市府教</w:t><w:br/><w:t>人字第11538047800號函核定如下。</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>陳○○</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>身分證字號</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>C123456789</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現職</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>教師</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>現支薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>本薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>500</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>年功薪</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>50</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc/><w:tc><w:p><w:r><w:t>合計</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0550</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>符合條款</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>第4條第1項第1款</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定薪額</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>0575</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>核定獎懲</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>獎金</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>說明</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>晉本薪一級並給與一個月薪給一次獎金</w:t></w:r></w:p></w:tc></w:tr>
  </w:tbl>
</w:body>
</w:document>
`;

const res3 = parseDocxXml(sampleXml3, DOMParser);
console.log('Test 3 (Synthetic C: w:br in notice/date): count =', res3.length);
console.log('Record 3:', JSON.stringify(res3[0], null, 2));

if (res3.length === 1 &&
    res3[0]['發文字號'] === '高市中正人字第1157064080號' &&
    res3[0]['核定文號'] === '115年9月14日高市府教人字第11538047800號' &&
    res3[0]['發文日期'] === '中華民國115年9月18日' &&
    res3[0]['解析備註'] === '') {
  console.log('✅ Test 3 PASS (P2-A verified: w:br does not break notice regex)');
} else {
  console.error('❌ Test 3 FAIL (P2-A w:br check failed)');
  process.exit(1);
}

// Test 4: parsererror detection (P3-D)
let errorCaught = false;
try {
  parseDocxXml('<unclosed-tag><w:body>', DOMParser);
} catch (e) {
  errorCaught = true;
  console.log('✅ Test 4 PASS (P3-D verified: caught parsererror ->', e.message, ')');
}
if (!errorCaught) {
  console.error('❌ Test 4 FAIL: parsererror was not caught');
  process.exit(1);
}

console.log('🎉 ALL UNIT TESTS PASSED!');
