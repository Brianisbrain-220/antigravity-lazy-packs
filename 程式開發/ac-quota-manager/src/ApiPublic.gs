/**
 * @version v1.0.0
 * Public APIs (No authentication required).
 */

function getPublicBootstrap() {
  const units = readTable_('使用單位')
    .filter(u => u['啟用狀態'] === '啟用')
    .sort((a, b) => Number(a['排序'] || 999) - Number(b['排序'] || 999))
    .map(u => ({ unitId: u['單位ID'], unitName: u['單位名稱'] }));
    
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  
  return {
    ok: true,
    data: { units, today },
    _version: 'v1.0.0'
  };
}

function getPublicOverview() {
  const units = readTable_('使用單位').filter(u => u['啟用狀態'] === '啟用');
  const periods = readTable_('單位賽期');
  const topups = readTable_('加值紀錄');
  const usages = readTable_('使用紀錄');
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  
  const result = [];
  for (const u of units) {
    const summary = computeUnitSummary_(u['單位ID'], periods, topups, usages, today);
    let currentPeriodName = '無進行中賽期';
    if (summary.currentPeriodId) {
      const p = summary.periods.find(x => x.periodId === summary.currentPeriodId);
      if (p) currentPeriodName = p.periodName;
    }
    
    result.push({
      unitId: summary.unitId,
      unitName: u['單位名稱'],
      currentPeriodName: currentPeriodName,
      currentBaseRemaining: summary.currentBaseRemaining,
      walletAvailable: summary.walletAvailable,
      owedHours: summary.owedHours,
      availableNow: summary.availableNow
    });
  }
  
  // Sort by name or original order?
  // Let's sort by ID to be stable, or assume caller will sort.
  return {
    ok: true,
    data: result,
    _version: 'v1.0.0'
  };
}

function getPublicUnitDetail(unitId) {
  const periods = readTable_('單位賽期');
  const topups = readTable_('加值紀錄');
  const usages = readTable_('使用紀錄');
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  
  const summary = computeUnitSummary_(unitId, periods, topups, usages, today);
  
  const usageDetail = usages
    .filter(u => u['單位ID'] === unitId && u['紀錄狀態'] === '正常')
    .map(u => {
      // Find period for this usage just to display its name
      const p = findPeriodForDate_(periods, unitId, u['使用日期']);
      return {
        date: u['使用日期'],
        venue: u['使用場地'],
        start: u['開始時間'],
        end: u['結束時間'],
        hours: Number(u['扣抵時數']),
        note: u['備註說明'] || '',
        periodName: p ? p['賽期名稱'] : '無賽期(自費)'
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
    
  const topupDetail = topups
    .filter(t => t['單位ID'] === unitId && t['紀錄狀態'] === '正常')
    .map(t => ({
      date: t['加值日期'],
      hours: Number(t['加值時數']),
      receiptNo: t['收據或單據號'] || '',
      note: t['備註'] || ''
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
    
  return {
    ok: true,
    data: {
      summary: summary,
      usages: usageDetail,
      topups: topupDetail
    },
    _version: 'v1.0.0'
  };
}
