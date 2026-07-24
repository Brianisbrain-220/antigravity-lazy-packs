import React from 'react';

// 計算台灣學年度（8月1日為分界）
function getAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) {
    return year - 1911;
  } else {
    return year - 1912;
  }
}

export default function PrintRegistrationForm({ users, categories, onClose }) {
  const academicYear = getAcademicYear();

  // 將 users 依照類別分群，並過濾掉沒有單位的類別
  const groupedUsers = categories.map(cat => {
    return {
      category: cat.name,
      users: users.filter(u => u.category === cat.name)
    };
  }).filter(group => group.users.length > 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-overlay">
      <div className="print-toolbar no-print">
        <button className="btn btn-secondary" onClick={onClose}>← 返回系統</button>
        <button className="btn btn-primary" onClick={handlePrint} style={{ marginLeft: '16px' }}>🖨️ 列印此頁面</button>
      </div>

      <div className="print-content">
        {groupedUsers.map((group, index) => (
          <div key={group.category} className="print-page">
            <h2 className="print-title">
              {academicYear}學年度苓雅區中正國小冷氣卡領用登記表－ {group.category}卡
            </h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>班級</th>
                  <th style={{ width: '10%' }}>卡號</th>
                  <th style={{ width: '15%' }}>領用人簽名</th>
                  <th colSpan={3} style={{ width: '35%' }}>累計加值金額紀錄(起始金額2000)</th>
                  <th style={{ width: '15%' }}>繳回時餘額</th>
                  <th style={{ width: '15%' }}>備註</th>
                </tr>
              </thead>
              <tbody>
                {group.users.map((user, i) => (
                  <tr key={user.id}>
                    <td className="center-text">{user.name}</td>
                    <td className="center-text">{user.currentCardId || ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
