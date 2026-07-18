import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUsers, batchBorrow, getCategories } from '../db';
import { useToast } from '../ToastContext';

export default function BatchScanPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [assignments, setAssignments] = useState([]); // [{userId, userName, cardId}]
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState('setup'); // setup | scanning | done
  const [scanBuffer, setScanBuffer] = useState('');
  const [processing, setProcessing] = useState(false);
  const [flashIndex, setFlashIndex] = useState(null);
  const activeRowRef = useRef(null);
  const beepRef = useRef(null);

  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(28);
    setDueDate(d.toISOString().split('T')[0]);
    
    Promise.all([getUsers(), getCategories()]).then(([u, cats]) => {
      setUsers(u);
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0].name);
      }
    });
  }, []);

  // 掃描槍鍵盤監聽（只在 scanning 階段啟用）
  useEffect(() => {
    if (phase !== 'scanning') return;
    const handler = (e) => {
      if (e.key === 'Enter') {
        if (scanBuffer.trim()) processScan(scanBuffer.trim());
        setScanBuffer('');
      } else if (e.key.length === 1 && /[\w\d]/.test(e.key)) {
        setScanBuffer(prev => prev + e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, scanBuffer, activeIndex, assignments]);

  const processScan = useCallback((cardId) => {
    if (activeIndex >= assignments.length) return;
    
    // 音效模擬（用 AudioContext 產生 beep）
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}

    const next = [...assignments];
    next[activeIndex] = { ...next[activeIndex], cardId };
    setAssignments(next);
    setFlashIndex(activeIndex);
    setTimeout(() => setFlashIndex(null), 600);

    const nextIdx = activeIndex + 1;
    setActiveIndex(nextIdx);

    if (nextIdx >= assignments.length) {
      setTimeout(() => setPhase('done'), 300);
    }

    // 自動捲動到下一列
    setTimeout(() => {
      activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [activeIndex, assignments]);

  const filteredUsers = users.filter(u => u.category === selectedCategory && u.status !== 'borrowing');

  const handleToggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredUsers.map(u => u.id);
    setSelectedUsers(prev =>
      prev.length === allIds.length ? [] : allIds
    );
  };

  const handleStartScanning = () => {
    if (selectedUsers.length === 0) { toast('請至少選擇一個借用單位', 'error'); return; }
    const ordered = users
      .filter(u => selectedUsers.includes(u.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    setAssignments(ordered.map(u => ({ userId: u.id, userName: u.name, cardId: null })));
    setActiveIndex(0);
    setPhase('scanning');
  };

  const handleConfirmAll = async () => {
    const valid = assignments.filter(a => a.cardId);
    if (valid.length === 0) { toast('沒有可提交的配對', 'error'); return; }
    setProcessing(true);
    try {
      await batchBorrow(valid.map(a => ({ cardId: a.cardId, userId: a.userId })), dueDate);
      toast(`✅ 成功完成 ${valid.length} 筆批次借出！`, 'success');
      setPhase('setup');
      setSelectedUsers([]);
      setAssignments([]);
      setActiveIndex(0);
      const updated = await getUsers().then(u => u);
      setUsers(updated);
    } catch (e) {
      toast('批次寫入失敗：' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualInput = (idx, val) => {
    const next = [...assignments];
    next[idx] = { ...next[idx], cardId: val };
    setAssignments(next);
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚡ 批次借用</h2>
        <p>選擇借用單位後，連續掃描卡片即可完成所有班級的借用登記</p>
      </div>

      {phase === 'setup' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: '20px' }}>
          {/* 類別與單位選取 */}
          <div className="glass-card">
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📋 選擇借用類別</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`btn btn-sm ${selectedCategory === cat.name ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setSelectedCategory(cat.name); setSelectedUsers([]); }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {selectedCategory} — 共 {filteredUsers.length} 個單位
              </span>
              <button className="btn btn-sm btn-secondary" onClick={handleSelectAll}>
                {selectedUsers.length === filteredUsers.length ? '取消全選' : '全選'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div className="empty-state"><p>此類別沒有可借用的單位</p></div>
              ) : filteredUsers.map(u => (
                <label key={u.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: selectedUsers.includes(u.id) ? 'rgba(99,179,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedUsers.includes(u.id) ? 'rgba(99,179,255,0.25)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => handleToggleUser(u.id)}
                    style={{ accentColor: 'var(--accent-blue)', width: '16px', height: '16px' }}
                  />
                  <span style={{ flex: 1, fontSize: '13.5px', fontWeight: '500' }}>{u.name}</span>
                  {u.contactName && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.contactName}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* 設定與開始 */}
          <div>
            <div className="glass-card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>⚙️ 批次設定</h3>
              <div className="form-group">
                <label className="form-label">應歸還日期（套用全部）</label>
                <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7'
              }}>
                <strong style={{ color: 'var(--accent-blue)' }}>📖 操作說明</strong><br />
                1. 在左側勾選要借卡的班級<br />
                2. 點擊「開始掃描」進入連續掃描模式<br />
                3. 依序用掃描槍掃各班的卡片即可<br />
                4. 掃完後一次確認送出所有紀錄
              </div>
            </div>

            <div style={{
              background: 'rgba(99,179,255,0.06)',
              border: '1px solid rgba(99,179,255,0.2)',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-blue)' }}>{selectedUsers.length}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>已選擇借用單位</div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleStartScanning}
              disabled={selectedUsers.length === 0}
            >
              ⚡ 開始批次掃描
            </button>
          </div>
        </div>
      )}

      {(phase === 'scanning' || phase === 'done') && (
        <div>
          {/* Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                掃描進度：{assignments.filter(a => a.cardId).length} / {assignments.length}
              </span>
              {phase === 'done' && <span className="badge badge-green">✅ 掃描完成</span>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '99px',
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-teal))',
                width: `${(assignments.filter(a => a.cardId).length / assignments.length) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Scanning Table */}
          <div className="table-wrapper" style={{ marginBottom: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>借用單位</th>
                  <th>卡號</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => {
                  const isActive = idx === activeIndex && phase === 'scanning';
                  const isDone = !!a.cardId;
                  const isFlashing = idx === flashIndex;
                  return (
                    <tr
                      key={a.userId}
                      ref={isActive ? activeRowRef : null}
                      style={{
                        background: isFlashing ? 'rgba(77,217,172,0.15)' :
                                    isActive ? 'rgba(99,179,255,0.1)' :
                                    isDone ? 'rgba(77,217,172,0.05)' : undefined,
                        border: isActive ? '1px solid rgba(99,179,255,0.3)' : '1px solid transparent',
                        transition: 'all 0.2s',
                        animation: isActive ? 'scanPulse 1.4s infinite' : 'none'
                      }}
                    >
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', width: '40px' }}>{idx + 1}</td>
                      <td style={{ fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                        {isActive && <span style={{ marginRight: '6px', animation: 'pulse 1s infinite' }}>👉</span>}
                        {a.userName}
                      </td>
                      <td>
                        {isDone ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-teal)' }}>{a.cardId}</span>
                        ) : isActive ? (
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '13px', width: '140px' }}
                            placeholder="等待掃描..."
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.target.value) {
                                processScan(e.target.value);
                                e.target.value = '';
                              }
                            }}
                          />
                        ) : (
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '13px', width: '140px', opacity: 0.4 }}
                            placeholder="—"
                            value={a.cardId || ''}
                            onChange={e => handleManualInput(idx, e.target.value)}
                          />
                        )}
                      </td>
                      <td>
                        {isDone
                          ? <span className="badge badge-green">✅ 已配對</span>
                          : isActive
                          ? <span className="badge badge-blue" style={{ animation: 'pulse 1s infinite' }}>🔍 等待掃描</span>
                          : <span className="badge badge-gray">等待中</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setPhase('setup'); setAssignments([]); setActiveIndex(0); }}
            >
              ↩️ 重新設定
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleConfirmAll}
              disabled={processing || assignments.filter(a => a.cardId).length === 0}
            >
              {processing ? '寫入中...' : `✅ 確認送出 ${assignments.filter(a => a.cardId).length} 筆借出`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
