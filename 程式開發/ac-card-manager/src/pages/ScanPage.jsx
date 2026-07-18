import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUsers, getCardById, createCard, borrowCard, returnCard } from '../db';
import { useToast } from '../ToastContext';

const MODES = { BORROW: 'borrow', RETURN: 'return' };

export default function ScanPage() {
  const toast = useToast();
  const [mode, setMode] = useState(MODES.BORROW);
  const [scanBuffer, setScanBuffer] = useState('');
  const [cardInfo, setCardInfo] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lastBalance, setLastBalance] = useState('');
  const [users, setUsers] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const scanRef = useRef(null);

  // 預設歸還日期：下個月底
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(28);
    setDueDate(d.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  // 鍵盤掃描槍監聽
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Enter') {
        if (scanBuffer.trim()) handleScan(scanBuffer.trim());
        setScanBuffer('');
      } else if (e.key.length === 1) {
        setScanBuffer(prev => prev + e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scanBuffer]);

  const handleScan = useCallback(async (cardId) => {
    if (!cardId) return;
    const card = await getCardById(cardId);
    if (!card && mode === MODES.BORROW) {
      // 自動建立新卡片
      await createCard(cardId);
      setCardInfo({ id: cardId, status: 'available', accumulatedTopUp: 0 });
      toast('✨ 新卡片已自動建立：' + cardId, 'info');
    } else if (!card) {
      toast('找不到卡片：' + cardId, 'error');
      return;
    } else {
      setCardInfo(card);
    }
  }, [mode, toast]);

  const handleConfirm = async () => {
    if (!cardInfo) return;
    setProcessing(true);
    try {
      if (mode === MODES.BORROW) {
        if (!selectedUser) { toast('請選擇借用單位', 'error'); setProcessing(false); return; }
        await borrowCard(cardInfo.id, selectedUser, dueDate);
        const user = users.find(u => u.id === selectedUser);
        setLastResult({ type: 'success', msg: `✅ ${cardInfo.id} 已借出給 ${user?.name || selectedUser}` });
        toast(`卡片 ${cardInfo.id} 成功借出！`, 'success');
      } else {
        await returnCard(cardInfo.id, Number(lastBalance) || 0);
        setLastResult({ type: 'success', msg: `✅ ${cardInfo.id} 已成功歸還` });
        toast(`卡片 ${cardInfo.id} 成功歸還！`, 'success');
      }
      // 重置
      setCardInfo(null);
      setSelectedUser('');
      setLastBalance('');
      setTimeout(() => scanRef.current?.focus(), 100);
    } catch (e) {
      toast('操作失敗：' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = {
    available: <span className="badge badge-green">在庫</span>,
    borrowed: <span className="badge badge-blue">借出中</span>,
    damaged: <span className="badge badge-red">故障</span>
  };

  const categories = [...new Set(users.map(u => u.category))];

  return (
    <div>
      <div className="page-header">
        <h2>{mode === MODES.BORROW ? '📤 借出登記' : '📥 歸還登記'}</h2>
        <p>掃描條碼或輸入卡號，完成{mode === MODES.BORROW ? '借出' : '歸還'}作業</p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {Object.values(MODES).map(m => (
          <button
            key={m}
            className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setMode(m); setCardInfo(null); setLastResult(null); }}
          >
            {m === MODES.BORROW ? '📤 借出' : '📥 歸還'}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: '20px' }}>
        {/* Scan Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>掃描卡片</h3>

          {/* Hidden scan input */}
          <input ref={scanRef} className="scan-input-ghost" autoFocus readOnly />

          {/* Manual input */}
          <div className="form-group">
            <label className="form-label">卡號（掃描或手動輸入）</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                placeholder="掃描條碼或輸入卡號..."
                value={cardInfo?.id || ''}
                onChange={e => setCardInfo(prev => prev ? { ...prev, id: e.target.value } : { id: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleScan(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={() => handleScan(cardInfo?.id || '')}>查詢</button>
            </div>
          </div>

          {/* Card Info Display */}
          {cardInfo && (
            <div style={{
              background: 'rgba(99,179,255,0.06)',
              border: '1px solid rgba(99,179,255,0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                  {cardInfo.id}
                </span>
                {statusBadge[cardInfo.status] || <span className="badge badge-gray">{cardInfo.status}</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                <span>累計加值：${(cardInfo.accumulatedTopUp || 0).toLocaleString()}</span>
                <span>最近餘額：${(cardInfo.lastBalance || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Borrow Options */}
          {mode === MODES.BORROW && cardInfo && (
            <>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">借用單位</label>
                <select className="form-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                  <option value="">請選擇借用單位...</option>
                  {categories.map(cat => (
                    <optgroup key={cat} label={cat}>
                      {users.filter(u => u.category === cat).map(u => (
                        <option key={u.id} value={u.id} disabled={u.status === 'borrowing'}>
                          {u.name} {u.contactName ? `（${u.contactName}）` : ''} {u.status === 'borrowing' ? '⚠️ 持有中' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">應歸還日期</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Return Options */}
          {mode === MODES.RETURN && cardInfo && cardInfo.status === 'borrowed' && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">歸還時卡片餘額（選填）</label>
              <input
                type="number"
                className="form-input"
                placeholder="輸入卡片剩餘金額..."
                value={lastBalance}
                onChange={e => setLastBalance(e.target.value)}
              />
            </div>
          )}

          {/* Submit */}
          {cardInfo && (
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={handleConfirm}
              disabled={processing || (mode === MODES.RETURN && cardInfo.status !== 'borrowed')}
            >
              {processing ? '處理中...' : (mode === MODES.BORROW ? '✅ 確認借出' : '✅ 確認歸還')}
            </button>
          )}

          {mode === MODES.RETURN && cardInfo && cardInfo.status !== 'borrowed' && (
            <p style={{ color: 'var(--accent-orange)', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
              ⚠️ 此卡片目前並非借出狀態，無法歸還
            </p>
          )}
        </div>

        {/* Result Panel */}
        <div>
          <div className="glass-card" style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>
              {mode === MODES.BORROW ? '📤' : '📥'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {mode === MODES.BORROW
                ? '請掃描欲借出的冷氣卡，\n再選擇借用單位後確認'
                : '請掃描欲歸還的冷氣卡，\n確認後完成歸還'}
            </p>
          </div>

          {lastResult && (
            <div style={{
              background: 'rgba(77,217,172,0.08)',
              border: '1px solid rgba(77,217,172,0.25)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              color: 'var(--accent-teal)',
              fontWeight: '600',
              fontSize: '14px',
              animation: 'slideUp 0.25s ease'
            }}>
              {lastResult.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
