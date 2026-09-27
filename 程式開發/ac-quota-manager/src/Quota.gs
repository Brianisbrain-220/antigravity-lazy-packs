/**
 * @version v1.0.0
 * Pure functions for calculating AC quota.
 * Does NOT depend on any GAS global objects (e.g. SpreadsheetApp, Utilities).
 */

/**
 * @param {string} start "HH:mm"
 * @param {string} end "HH:mm"
 * @returns {{minutes: number, hours: number}}
 */
function calcChargeHours_(start, end) {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
    throw new Error('VALIDATION: Invalid time format');
  }
  
  const startParts = start.split(':');
  const endParts = end.split(':');
  if (startParts.length !== 2 || endParts.length !== 2) {
    throw new Error('VALIDATION: Invalid time format');
  }
  if (startParts[0].length !== 2 || startParts[1].length !== 2 || endParts[0].length !== 2 || endParts[1].length !== 2) {
    throw new Error('VALIDATION: Invalid time format');
  }

  const startH = parseInt(startParts[0], 10);
  const startM = parseInt(startParts[1], 10);
  const endH = parseInt(endParts[0], 10);
  const endM = parseInt(endParts[1], 10);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    throw new Error('VALIDATION: Invalid time format');
  }
  
  if (startH < 0 || startH > 23 || startM < 0 || startM > 59 || endH < 0 || endH > 23 || endM < 0 || endM > 59) {
    throw new Error('VALIDATION: Invalid time format');
  }

  const startTotalM = startH * 60 + startM;
  const endTotalM = endH * 60 + endM;

  if (endTotalM <= startTotalM) {
    throw new Error('VALIDATION: End time must be greater than start time (no midnight crossing)');
  }

  const minutes = endTotalM - startTotalM;
  const hours = Math.ceil(minutes / 60);

  return { minutes, hours };
}

function findPeriodForDate_(periods, unitId, date) {
  for (const p of periods) {
    if (p['紀錄狀態'] === '正常' && p['單位ID'] === unitId) {
      if (date >= p['起始日期'] && date <= p['結束日期']) {
        return p;
      }
    }
  }
  return null;
}

function checkPeriodOverlap_(periods, candidate) {
  const cStart = candidate['起始日期'];
  const cEnd = candidate['結束日期'];
  const cUnitId = candidate['單位ID'];
  const cId = candidate['賽期ID'];

  for (const p of periods) {
    if (p['紀錄狀態'] === '正常' && p['單位ID'] === cUnitId && p['賽期ID'] !== cId) {
      const pStart = p['起始日期'];
      const pEnd = p['結束日期'];
      if (cStart <= pEnd && pStart <= cEnd) {
        return p;
      }
    }
  }
  return null;
}

function periodStatus_(period, today) {
  if (today < period['起始日期']) return '籌備中';
  if (today > period['結束日期']) return '已結束';
  return '進行中';
}

function computeUnitSummary_(unitId, periods, topups, usages, today) {
  let outsideHours = 0;
  let topupTotal = 0;
  let usedByVenue = { '禮堂': 0, '韻律體操教室': 0 };
  let periodSummaries = {}; // keyed by periodId

  // Init period summaries
  for (const p of periods) {
    if (p['紀錄狀態'] === '正常' && p['單位ID'] === unitId) {
      const status = periodStatus_(p, today);
      const baseQuota = p['基本配額時數'] != null ? Number(p['基本配額時數']) : 16;
      periodSummaries[p['賽期ID']] = {
        periodId: p['賽期ID'],
        periodName: p['賽期名稱'],
        start: p['起始日期'],
        end: p['結束日期'],
        status: status,
        baseQuota: baseQuota,
        usedHours: 0,
        baseUsed: 0,
        overflow: 0,
        baseRemaining: status !== '已結束' ? baseQuota : 0,
        expiredHours: status === '已結束' ? baseQuota : 0,
      };
    }
  }

  // Calculate usages
  for (const u of usages) {
    if (u['紀錄狀態'] === '正常' && u['單位ID'] === unitId) {
      const h = Number(u['扣抵時數']);
      const venue = u['使用場地'];
      if (usedByVenue[venue] !== undefined) {
        usedByVenue[venue] += h;
      } else {
        usedByVenue[venue] = h;
      }

      const matchedPeriod = findPeriodForDate_(periods, unitId, u['使用日期']);
      if (matchedPeriod) {
        const pid = matchedPeriod['賽期ID'];
        const pSum = periodSummaries[pid];
        pSum.usedHours += h;
      } else {
        outsideHours += h;
      }
    }
  }

  // Finalize period summaries
  let totalOverflow = 0;
  let currentPeriodId = null;
  let currentBaseRemaining = 0;
  let periodsArr = [];

  for (const pid in periodSummaries) {
    const pSum = periodSummaries[pid];
    pSum.baseUsed = Math.min(pSum.usedHours, pSum.baseQuota);
    pSum.overflow = pSum.usedHours - pSum.baseUsed;
    
    if (pSum.status !== '已結束') {
      pSum.baseRemaining = pSum.baseQuota - pSum.baseUsed;
    } else {
      pSum.baseRemaining = 0;
      pSum.expiredHours = pSum.baseQuota - pSum.baseUsed;
    }

    totalOverflow += pSum.overflow;

    if (pSum.status === '進行中') {
      currentPeriodId = pSum.periodId;
      currentBaseRemaining = pSum.baseRemaining;
    }
    periodsArr.push(pSum);
  }

  // Calculate topups
  for (const t of topups) {
    if (t['紀錄狀態'] === '正常' && t['單位ID'] === unitId) {
      topupTotal += Number(t['加值時數']);
    }
  }

  const walletBalance = topupTotal - totalOverflow - outsideHours;
  const walletAvailable = Math.max(walletBalance, 0);
  const owedHours = Math.max(-walletBalance, 0);
  const availableNow = currentBaseRemaining + walletAvailable;

  return {
    unitId,
    periods: periodsArr,
    currentPeriodId,
    currentBaseRemaining,
    outsideHours,
    topupTotal,
    walletBalance,
    walletAvailable,
    owedHours,
    availableNow,
    usedByVenue
  };
}

// Support CommonJS require for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcChargeHours_,
    findPeriodForDate_,
    checkPeriodOverlap_,
    periodStatus_,
    computeUnitSummary_
  };
}
