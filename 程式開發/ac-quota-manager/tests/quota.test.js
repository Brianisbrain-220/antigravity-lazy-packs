const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('src/Quota.gs', 'utf8');
const script = new vm.Script(code);
const context = { module: { exports: {} } };
vm.createContext(context);
script.runInContext(context);

const {
  calcChargeHours_,
  findPeriodForDate_,
  checkPeriodOverlap_,
  periodStatus_,
  computeUnitSummary_
} = context.module.exports;

// Shared setup
const periods = [
  { '賽期ID': 'P1', '單位ID': 'U001', '起始日期': '2026-10-01', '結束日期': '2026-10-25', '基本配額時數': 16, '紀錄狀態': '正常' }
];

test('T1: R1 進位', (t) => {
  assert.strictEqual(calcChargeHours_('13:30', '14:10').hours, 1);
  assert.strictEqual(calcChargeHours_('08:00', '09:00').hours, 1);
  assert.strictEqual(calcChargeHours_('08:00', '09:01').hours, 2);
  assert.strictEqual(calcChargeHours_('13:00', '16:30').hours, 4);
});

test('T2: B6', (t) => {
  assert.throws(() => calcChargeHours_('10:00', '10:00'), /VALIDATION/);
  assert.throws(() => calcChargeHours_('11:00', '10:00'), /VALIDATION/);
  assert.throws(() => calcChargeHours_('8:00', '9:00'), /VALIDATION/);
  assert.throws(() => calcChargeHours_('24:00', '25:00'), /VALIDATION/);
});

test('T3: B5 邊界', (t) => {
  assert.strictEqual(findPeriodForDate_(periods, 'U001', '2026-10-01')['賽期ID'], 'P1');
  assert.strictEqual(findPeriodForDate_(periods, 'U001', '2026-10-25')['賽期ID'], 'P1');
  assert.strictEqual(findPeriodForDate_(periods, 'U001', '2026-09-30'), null);
  assert.strictEqual(findPeriodForDate_(periods, 'U001', '2026-10-26'), null);
});

test('T4: 歸屬', (t) => {
  const pVoid = [{ ...periods[0], '紀錄狀態': '已作廢' }];
  assert.strictEqual(findPeriodForDate_(pVoid, 'U001', '2026-10-10'), null);
  assert.strictEqual(findPeriodForDate_(periods, 'U002', '2026-10-10'), null);
});

test('T5: 重疊', (t) => {
  // U001 overlap
  const c1 = { '賽期ID': 'P_NEW', '單位ID': 'U001', '起始日期': '2026-10-25', '結束日期': '2026-11-10' };
  assert.ok(checkPeriodOverlap_(periods, c1));
  
  // U001 non-overlap
  const c2 = { '賽期ID': 'P_NEW', '單位ID': 'U001', '起始日期': '2026-10-26', '結束日期': '2026-11-10' };
  assert.strictEqual(checkPeriodOverlap_(periods, c2), null);
  
  // U002 overlap (allowed because different unit)
  const c3 = { '賽期ID': 'P_NEW', '單位ID': 'U002', '起始日期': '2026-10-01', '結束日期': '2026-10-25' };
  assert.strictEqual(checkPeriodOverlap_(periods, c3), null);

  // Modify self
  const c4 = { '賽期ID': 'P1', '單位ID': 'U001', '起始日期': '2026-10-01', '結束日期': '2026-10-30' };
  assert.strictEqual(checkPeriodOverlap_(periods, c4), null);
  
  // Overlap with voided period
  const pVoid = [{ ...periods[0], '紀錄狀態': '已作廢' }];
  assert.strictEqual(checkPeriodOverlap_(pVoid, c1), null);
});

test('T6: B3 狀態', (t) => {
  const p = periods[0];
  assert.strictEqual(periodStatus_(p, '2026-09-30'), '籌備中');
  assert.strictEqual(periodStatus_(p, '2026-10-01'), '進行中');
  assert.strictEqual(periodStatus_(p, '2026-10-25'), '進行中');
  assert.strictEqual(periodStatus_(p, '2026-10-26'), '已結束');
});

test('T7: B1 回歸', (t) => {
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 12, '紀錄狀態': '正常' }];
  
  const r1 = computeUnitSummary_('U001', periods, [], usages, '2026-10-20');
  assert.strictEqual(r1.currentBaseRemaining, 4);
  assert.strictEqual(r1.availableNow, 4);
  
  const r2 = computeUnitSummary_('U001', periods, [], usages, '2026-10-26');
  assert.strictEqual(r2.currentBaseRemaining, 0);
  assert.strictEqual(r2.periods[0].expiredHours, 4);
  assert.strictEqual(r2.walletBalance, 0);
  assert.strictEqual(r2.owedHours, 0);
  assert.strictEqual(r2.availableNow, 0);
});

test('T8: 超用扣錢包', (t) => {
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 20, '紀錄狀態': '正常' }];
  const topups = [{ '單位ID': 'U001', '加值時數': 10, '紀錄狀態': '正常' }];
  
  const r = computeUnitSummary_('U001', periods, topups, usages, '2026-10-20');
  assert.strictEqual(r.periods[0].overflow, 4);
  assert.strictEqual(r.walletBalance, 6);
  assert.strictEqual(r.currentBaseRemaining, 0);
  assert.strictEqual(r.availableNow, 6);
});

test('T9: 欠時', (t) => {
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 20, '紀錄狀態': '正常' }];
  const r = computeUnitSummary_('U001', periods, [], usages, '2026-10-20');
  assert.strictEqual(r.walletBalance, -4);
  assert.strictEqual(r.owedHours, 4);
  assert.strictEqual(r.availableNow, 0);
});

test('T10: 新賽期不抵舊欠', (t) => {
  const periods2 = [
    ...periods,
    { '賽期ID': 'P2', '單位ID': 'U001', '起始日期': '2026-11-01', '結束日期': '2026-11-30', '基本配額時數': 16, '紀錄狀態': '正常' }
  ];
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 20, '紀錄狀態': '正常' }];
  
  let r = computeUnitSummary_('U001', periods2, [], usages, '2026-11-05');
  assert.strictEqual(r.currentBaseRemaining, 16);
  assert.strictEqual(r.owedHours, 4);
  assert.strictEqual(r.availableNow, 16);
  
  const topups = [{ '單位ID': 'U001', '加值時數': 10, '紀錄狀態': '正常' }];
  r = computeUnitSummary_('U001', periods2, topups, usages, '2026-11-05');
  assert.strictEqual(r.walletBalance, 6);
  assert.strictEqual(r.owedHours, 0);
  assert.strictEqual(r.availableNow, 22);
});

test('T11: R2 賽期外', (t) => {
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-09-15', '扣抵時數': 3, '紀錄狀態': '正常' }];
  const r = computeUnitSummary_('U001', periods, [], usages, '2026-10-20');
  assert.strictEqual(r.outsideHours, 3);
  assert.strictEqual(r.owedHours, 3);
});

test('T12: R3 無期限結轉', (t) => {
  const periods2 = [
    ...periods,
    { '賽期ID': 'P2', '單位ID': 'U001', '起始日期': '2026-11-01', '結束日期': '2026-11-30', '基本配額時數': 16, '紀錄狀態': '正常' }
  ];
  const topups = [{ '單位ID': 'U001', '加值日期': '2026-01-05', '加值時數': 10, '紀錄狀態': '正常' }];
  const usages = [
    { '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 18, '紀錄狀態': '正常' }, // P1 18, overflow 2
    { '單位ID': 'U001', '使用日期': '2026-11-02', '扣抵時數': 20, '紀錄狀態': '正常' }  // P2 20, overflow 4
  ];
  const r = computeUnitSummary_('U001', periods2, topups, usages, '2026-11-05');
  assert.strictEqual(r.walletBalance, 4);
});

test('T13: 作廢排除', (t) => {
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 20, '紀錄狀態': '已作廢' }];
  const topups = [{ '單位ID': 'U001', '加值時數': 10, '紀錄狀態': '已作廢' }];
  const r = computeUnitSummary_('U001', periods, topups, usages, '2026-10-20');
  assert.strictEqual(r.periods[0].usedHours, 0);
  assert.strictEqual(r.walletBalance, 0);
});

test('T14: 賽期作廢', (t) => {
  const pVoid = [{ ...periods[0], '紀錄狀態': '已作廢' }];
  const usages = [{ '單位ID': 'U001', '使用日期': '2026-10-10', '扣抵時數': 5, '紀錄狀態': '正常' }];
  const r = computeUnitSummary_('U001', pVoid, [], usages, '2026-10-20');
  assert.strictEqual(r.outsideHours, 5);
});

test('T15: 分場地', (t) => {
  const usages = [
    { '單位ID': 'U001', '使用場地': '禮堂', '使用日期': '2026-10-10', '扣抵時數': 5, '紀錄狀態': '正常' },
    { '單位ID': 'U001', '使用場地': '韻律體操教室', '使用日期': '2026-10-11', '扣抵時數': 3, '紀錄狀態': '正常' }
  ];
  const r = computeUnitSummary_('U001', periods, [], usages, '2026-10-20');
  assert.strictEqual(r.usedByVenue['禮堂'], 5);
  assert.strictEqual(r.usedByVenue['韻律體操教室'], 3);
  assert.strictEqual(r.periods[0].usedHours, 8);
});

test('T16: 未使用而結束', (t) => {
  const r = computeUnitSummary_('U001', periods, [], [], '2026-10-26');
  assert.strictEqual(r.periods[0].expiredHours, 16);
  assert.strictEqual(r.periods[0].baseRemaining, 0);
});
