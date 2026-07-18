import React, { useEffect, useState } from 'react';
import { getCards, getUsers, getRecords, getOverdueRecords } from '../db';

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, borrowed: 0, available: 0, overdue: 0, damaged: 0 });
  const [recentRecords, setRecentRecords] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cards, usersData, records, overdue] = await Promise.all([
          getCards(), getUsers(), getRecords(), getOverdueRecords()
        ]);
        setUsers(usersData);
        setStats({
          total: cards.length,
          borrowed: cards.filter(c => c.status === 'borrowed').length,
          available: cards.filter(c => c.status === 'available').length,
          overdue: overdue.length,
          damaged: cards.filter(c => c.status === 'damaged').length
        });
        setRecentRecords(records.slice(0, 8));
        setOverdueList(overdue.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getUserName = (userId) => users.find(u => u.id === userId)?.name || userId || '—';

  const typeLabel = { borrow: '借出', return: '歸還', topup: '儲值', replace: '換卡', batch: '批次借出' };
  const typeBadge = { borrow: 'badge-blue', return: 'badge-green', topup: 'badge-orange', replace: 'badge-purple', batch: 'badge-blue' };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const statCards = [
    { icon: '🎴', label: '卡片總數', value: stats.total, accent: '#63b3ff' },
    { icon: '📤', label: '借出中', value: stats.borrowed, accent: '#4dd9ac' },
    { icon: '🏠', label: '在庫可用', value: stats.available, accent: '#b69eff' },
    { icon: '⚠️', label: '逾期未還', value: stats.overdue, accent: '#ff6b6b' },
    { icon: '🔧', label: '故障卡片', value: stats.damaged, accent: '#ffd56b' }
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>載入中...</p>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>📊 系統總覽</h2>
        <p>即時查看冷氣卡借用狀態與最新動態</p>
      </div>

      {/* Stat Grid */}
      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ '--stat-accent': s.accent }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: '20px' }}>
        {/* Recent Records */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--text-primary)' }}>
            📋 最新紀錄
          </h3>
          <div className="table-wrapper">
            {recentRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>尚無借還紀錄</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>類型</th>
                    <th>卡號</th>
                    <th>借用單位</th>
                    <th>時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map(r => (
                    <tr key={r.id}>
                      <td><span className={`badge ${typeBadge[r.type] || 'badge-gray'}`}>{typeLabel[r.type] || r.type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--accent-blue)' }}>{r.cardId}</td>
                      <td style={{ fontSize: '12px' }}>{getUserName(r.userId)}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Overdue Alert */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--accent-red)' }}>
            🚨 逾期警示
          </h3>
          <div className="table-wrapper">
            {overdueList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <p>目前無逾期卡片</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>卡號</th>
                    <th>借用單位</th>
                    <th>應還日</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map(r => {
                    const due = r.dueDate?.toDate ? r.dueDate.toDate() : new Date(r.dueDate);
                    const days = Math.floor((new Date() - due) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--accent-red)' }}>{r.cardId}</td>
                        <td style={{ fontSize: '12px' }}>{getUserName(r.userId)}</td>
                        <td>
                          <span className="badge badge-red">逾期 {days} 天</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
