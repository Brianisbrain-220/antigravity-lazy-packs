import React, { useState, useEffect } from 'react';
import { getCards, getCardById, topUpCard, replaceCard } from '../db';
import { useToast } from '../ToastContext';

export default function CardManagePage() {
  const toast = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [newCardId, setNewCardId] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCards(await getCards());
    } catch (e) {
      console.error(e);
      toast('載入卡片失敗：' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = cards.filter(c =>
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.status.includes(search)
  );

  const statusLabel = { available: '在庫', borrowed: '借出中', damaged: '故障' };
  const statusBadge = { available: 'badge-green', borrowed: 'badge-blue', damaged: 'badge-red' };

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) { toast('請輸入有效金額', 'error'); return; }
    setProcessing(true);
    try {
      await topUpCard(selectedCard.id, Number(topUpAmount));
      toast(`✅ 卡片 ${selectedCard.id} 成功加值 $${topUpAmount}`, 'success');
      setShowTopUpModal(false);
      setTopUpAmount('');
      load();
    } catch (e) { toast('加值失敗：' + e.message, 'error'); }
    finally { setProcessing(false); }
  };

  const handleReplace = async () => {
    if (!newCardId.trim()) { toast('請輸入新卡號', 'error'); return; }
    setProcessing(true);
    try {
      await replaceCard(selectedCard.id, newCardId.trim());
      toast(`✅ 卡片已從 ${selectedCard.id} 換為 ${newCardId}`, 'success');
      setShowReplaceModal(false);
      setNewCardId('');
      load();
    } catch (e) { toast('換卡失敗：' + e.message, 'error'); }
    finally { setProcessing(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>載入中...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h2>🎴 卡片管理</h2>
        <p>管理冷氣卡儲值、故障換卡與卡片狀態</p>
      </div>

      <div className="toolbar">
        <div className="search-bar" style={{ flex: 1, maxWidth: '320px' }}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="搜尋卡號或狀態..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-gray">共 {filtered.length} 張卡片</span>
      </div>

      <div className="table-wrapper">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎴</div><p>沒有符合條件的卡片</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>卡號</th>
                <th>狀態</th>
                <th>累計加值</th>
                <th>最近餘額</th>
                <th>實際消耗</th>
                <th>備註</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(card => (
                <tr key={card.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-blue)' }}>{card.id}</td>
                  <td><span className={`badge ${statusBadge[card.status] || 'badge-gray'}`}>{statusLabel[card.status] || card.status}</span></td>
                  <td style={{ color: 'var(--accent-teal)', fontWeight: '600' }}>${(card.accumulatedTopUp || 0).toLocaleString()}</td>
                  <td>${(card.lastBalance || 0).toLocaleString()}</td>
                  <td style={{ color: 'var(--accent-orange)' }}>
                    ${((card.accumulatedTopUp || 0) - (card.lastBalance || 0)).toLocaleString()}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{card.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {card.status !== 'damaged' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => { setSelectedCard(card); setShowTopUpModal(true); }}
                        >💰 儲值</button>
                      )}
                      {card.status !== 'damaged' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setSelectedCard(card); setShowReplaceModal(true); }}
                        >🔄 換卡</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && selectedCard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTopUpModal(false)}>
          <div className="modal-box">
            <h3>💰 儲值登記</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              卡片：<strong style={{ color: 'var(--accent-blue)' }}>{selectedCard.id}</strong>
              　累計加值：${(selectedCard.accumulatedTopUp || 0).toLocaleString()}
            </p>
            <div className="form-group">
              <label className="form-label">加值金額（元）</label>
              <input
                type="number"
                className="form-input"
                placeholder="例如：2000"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleTopUp()}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowTopUpModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleTopUp} disabled={processing}>
                {processing ? '處理中...' : '✅ 確認加值'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Card Modal */}
      {showReplaceModal && selectedCard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReplaceModal(false)}>
          <div className="modal-box">
            <h3>🔄 故障換卡</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
              舊卡 <strong style={{ color: 'var(--accent-red)' }}>{selectedCard.id}</strong> 將被標記為故障失效。
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
              所有餘額、加值紀錄與持有人資料將自動轉移到新卡。
            </p>
            <div className="form-group">
              <label className="form-label">新卡號（掃描或手動輸入）</label>
              <input
                className="form-input"
                placeholder="掃描新卡條碼或輸入卡號..."
                value={newCardId}
                onChange={e => setNewCardId(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleReplace()}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReplaceModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleReplace} disabled={processing}>
                {processing ? '處理中...' : '✅ 確認換卡'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
