import React, { useState, useEffect } from 'react';
import { getRecords, getUsers, getCards, getOverdueRecords } from '../db';
import { useToast } from '../ToastContext';
import * as XLSX from 'xlsx';
import { sendEmail } from '../utils/email';

export default function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('borrowed'); // borrowed | overdue | amounts | history
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [overdueRecords, setOverdueRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [r, u, c, od] = await Promise.all([getRecords(), getUsers(), getCards(), getOverdueRecords()]);
        setRecords(r);
        setUsers(u);
        setCards(c);
        setOverdueRecords(od);
      } catch (e) {
        console.error(e);
        toast('載入報表失敗：' + e.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getUserById = (id) => users.find(u => u.id === id);
  const getCardById = (id) => cards.find(c => c.id === id);

  // 目前借出中的清單
  const borrowedCards = cards.filter(c => c.status === 'borrowed');

  // 逾期清單（借出紀錄中 dueDate < 今天，且目前狀態仍是 borrowing）
  const now = new Date();
  const overdueList = overdueRecords.map(r => {
    const due = r.dueDate?.toDate ? r.dueDate.toDate() : new Date(r.dueDate);
    const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return { ...r, dueObj: due, overdueDays: days };
  });

  // 金額統計
  const amountStats = users.map(u => {
    const card = cards.find(c => c.currentUserId === u.id) ||
                 cards.find(c => c.id === u.currentCardId);
    const accTop = card?.accumulatedTopUp || 0;
    const lastBal = card?.lastBalance || 0;
    return {
      ...u,
      cardId: u.currentCardId,
      accumulatedTopUp: accTop,
      lastBalance: lastBal,
      consumed: accTop - lastBal
    };
  }).filter(u => u.accumulatedTopUp > 0);

  const totalTopUp = amountStats.reduce((s, u) => s + u.accumulatedTopUp, 0);
  const totalConsumed = amountStats.reduce((s, u) => s + u.consumed, 0);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('zh-TW');
  };

  // 發送逾期通知
  const handleSendNotice = async (record) => {
    const user = getUserById(record.userId);
    if (!user?.email) { toast('此借用單位沒有填寫信箱', 'error'); return; }
    
    setSendingId(record.id);
    setSending(true);
    try {
      const dueDateStr = record.dueDate?.toDate ? record.dueDate.toDate().toLocaleDateString('zh-TW') : '—';
      await sendEmail(
        user.email,
        '🚨 [中正國小冷氣卡] 逾期歸還通知',
        `<p>${user.contactName || user.name} 您好，</p>
         <p>貴單位借用的冷氣卡 (卡號: <strong>${record.cardId}</strong>) 原訂應於 <strong>${dueDateStr}</strong> 歸還。</p>
         <p style="color: red;">目前已逾期 <strong>${record.overdueDays}</strong> 天。</p>
         <p>麻煩您盡速將冷氣卡歸還至管理單位，感謝您的配合！</p>`
      );
      toast(`✅ 已發送逾期通知至 ${user.email}`, 'success');
    } catch (e) {
      toast('發信失敗：' + e.message, 'error');
    } finally {
      setSending(false);
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    const withEmail = overdueList.filter(r => getUserById(r.userId)?.email);
    if (withEmail.length === 0) { toast('逾期名單中無可通知的信箱', 'error'); return; }
    for (const r of withEmail) await handleSendNotice(r);
    toast(`✅ 已對 ${withEmail.length} 筆逾期送出通知`, 'success');
  };

  // 匯出 Excel
  const handleExport = () => {
    let data, sheetName;
    if (tab === 'borrowed') {
      data = borrowedCards.map(c => ({
        卡號: c.id, 借用單位: getUserById(c.currentUserId)?.name || '—',
        聯絡人: getUserById(c.currentUserId)?.contactName || '—',
        信箱: getUserById(c.currentUserId)?.email || '—'
      }));
      sheetName = '借出名單';
    } else if (tab === 'overdue') {
      data = overdueList.map(r => ({
        卡號: r.cardId, 借用單位: getUserById(r.userId)?.name || '—',
        信箱: getUserById(r.userId)?.email || '—',
        應還日: formatDate(r.dueDate),
        逾期天數: r.overdueDays
      }));
      sheetName = '逾期名單';
    } else {
      data = amountStats.map(u => ({
        類別: u.category, 單位: u.name, 聯絡人: u.contactName,
        卡號: u.currentCardId, 累計加值: u.accumulatedTopUp,
        最近餘額: u.lastBalance, 實際消耗: u.consumed
      }));
      sheetName = '金額統計';
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `冷氣卡_${sheetName}_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.xlsx`);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>載入中...</p></div>;

  const tabs = [
    { key: 'borrowed', label: '📤 借出名單', count: borrowedCards.length },
    { key: 'overdue', label: '🚨 逾期名單', count: overdueList.length },
    { key: 'amounts', label: '💰 金額統計', count: amountStats.length },
    { key: 'history', label: '📋 借還歷程', count: records.length }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📊 報表管理</h2>
        <p>查看借出名單、逾期警示、使用金額統計與完整借還歷程</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '99px',
              padding: '1px 7px',
              fontSize: '11px',
              fontWeight: '700'
            }}>{t.count}</span>
          </button>
        ))}
        <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={handleExport}>
          📥 匯出 Excel
        </button>
      </div>

      {/* Borrowed Tab */}
      {tab === 'borrowed' && (
        <div className="table-wrapper">
          {borrowedCards.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><p>目前所有卡片均已在庫</p></div>
          ) : (
            <table>
              <thead><tr><th>卡號</th><th>借用單位</th><th>聯絡人</th><th>信箱</th><th>累計加值</th></tr></thead>
              <tbody>
                {borrowedCards.map(c => {
                  const u = getUserById(c.currentUserId);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-blue)' }}>{c.id}</td>
                      <td style={{ fontWeight: '600' }}>{u?.name || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{u?.contactName || '—'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u?.email || '—'}</td>
                      <td style={{ color: 'var(--accent-teal)', fontWeight: '600' }}>${(c.accumulatedTopUp || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Overdue Tab */}
      {tab === 'overdue' && (
        <div>
          {overdueList.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-danger" onClick={handleSendAll} disabled={sending}>
                📧 一鍵通知全部逾期者
              </button>
            </div>
          )}
          <div className="table-wrapper">
            {overdueList.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✅</div><p>目前沒有逾期卡片</p></div>
            ) : (
              <table>
                <thead><tr><th>卡號</th><th>借用單位</th><th>信箱</th><th>應還日</th><th>逾期</th><th>操作</th></tr></thead>
                <tbody>
                  {overdueList.map(r => {
                    const u = getUserById(r.userId);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-red)' }}>{r.cardId}</td>
                        <td style={{ fontWeight: '600' }}>{u?.name || '—'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u?.email || '—'}</td>
                        <td style={{ fontSize: '12px' }}>{formatDate(r.dueDate)}</td>
                        <td><span className="badge badge-red">⚠️ 逾期 {r.overdueDays} 天</span></td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleSendNotice(r)}
                            disabled={sending && sendingId === r.id}
                          >
                            {sending && sendingId === r.id ? '發送中...' : '📧 發通知'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Amounts Tab */}
      {tab === 'amounts' && (
        <div>
          <div className="stat-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card" style={{ '--stat-accent': 'var(--accent-teal)' }}>
              <div className="stat-icon">💰</div>
              <div className="stat-value">${totalTopUp.toLocaleString()}</div>
              <div className="stat-label">累計加值總額</div>
            </div>
            <div className="stat-card" style={{ '--stat-accent': 'var(--accent-orange)' }}>
              <div className="stat-icon">🔥</div>
              <div className="stat-value">${totalConsumed.toLocaleString()}</div>
              <div className="stat-label">累計消耗總額</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>類別</th><th>單位</th><th>卡號</th><th>累計加值</th><th>最近餘額</th><th>實際消耗</th></tr></thead>
              <tbody>
                {amountStats.sort((a, b) => b.consumed - a.consumed).map(u => (
                  <tr key={u.id}>
                    <td><span className="badge badge-gray">{u.category}</span></td>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{u.currentCardId || '—'}</td>
                    <td style={{ color: 'var(--accent-teal)', fontWeight: '600' }}>${u.accumulatedTopUp.toLocaleString()}</td>
                    <td>${u.lastBalance.toLocaleString()}</td>
                    <td style={{ color: 'var(--accent-orange)', fontWeight: '700' }}>${u.consumed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><p>暫無紀錄</p></div>
          ) : (
            <table>
              <thead><tr><th>類型</th><th>卡號</th><th>借用單位</th><th>金額</th><th>操作者</th><th>時間</th></tr></thead>
              <tbody>
                {records.slice(0, 100).map(r => {
                  const u = getUserById(r.userId);
                  const typeLabel = { borrow: '借出', return: '歸還', topup: '儲值', replace: '換卡' };
                  const typeBadge = { borrow: 'badge-blue', return: 'badge-green', topup: 'badge-orange', replace: 'badge-purple' };
                  const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
                  return (
                    <tr key={r.id}>
                      <td><span className={`badge ${typeBadge[r.type] || 'badge-gray'}`}>{typeLabel[r.type] || r.type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--accent-blue)' }}>{r.cardId}</td>
                      <td style={{ fontSize: '12px' }}>{u?.name || r.userId || '—'}</td>
                      <td style={{ color: r.amount > 0 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                        {r.amount > 0 ? `$${r.amount.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.operator || '—'}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {ts.toLocaleDateString('zh-TW')} {ts.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
