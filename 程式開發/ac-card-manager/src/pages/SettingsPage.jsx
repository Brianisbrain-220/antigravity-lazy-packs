import React, { useState, useEffect } from 'react';
import { getAdmins, addAdmin, removeAdmin } from '../db';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('gasWebhookUrl') || '');

  useEffect(() => { loadAdmins(); }, []);

  const loadAdmins = async () => {
    setAdmins(await getAdmins());
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast('請輸入有效信箱', 'error'); return; }
    setProcessing(true);
    try {
      await addAdmin(newEmail.trim().toLowerCase());
      toast(`✅ 已新增管理員：${newEmail}`, 'success');
      setNewEmail('');
      loadAdmins();
    } catch (e) { toast('新增失敗：' + e.message, 'error'); }
    finally { setProcessing(false); }
  };

  const handleRemoveAdmin = async (email) => {
    if (email === user.email) { toast('不能移除目前登入的管理員', 'error'); return; }
    if (!confirm(`確定要移除管理員 ${email} 嗎？`)) return;
    await removeAdmin(email);
    toast('已移除管理員', 'info');
    loadAdmins();
  };

  const handleSaveGasUrl = () => {
    localStorage.setItem('gasWebhookUrl', gasUrl);
    toast('✅ GAS 發信 URL 已儲存', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ 系統設定</h2>
        <p>管理管理員帳號白名單與 GAS 發信設定</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>
        {/* Admin Whitelist */}
        <div className="glass-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>👮 管理員白名單</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            只有此清單中的 Google 帳號才能登入管理後台
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="email"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="輸入 Google 信箱..."
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddAdmin()}
            />
            <button className="btn btn-primary" onClick={handleAddAdmin} disabled={processing}>
              ＋ 新增
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {admins.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '16px', textAlign: 'center' }}>
                ⚠️ 白名單為空，任何 Google 帳號均可登入，請立即新增管理員信箱！
              </p>
            )}
            {admins.map(a => (
              <div key={a.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <span style={{ flex: 1, fontSize: '13.5px' }}>{a.email}</span>
                {a.email === user?.email && <span className="badge badge-blue">目前登入</span>}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRemoveAdmin(a.email)}
                  disabled={a.email === user?.email}
                >🗑️ 移除</button>
              </div>
            ))}
          </div>
        </div>

        {/* GAS Settings */}
        <div className="glass-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>📧 GAS 逾期發信設定</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            填入 Google Apps Script Web App 部署 URL，系統將透過 GAS 自動發送逾期通知信
          </p>
          <div className="form-group">
            <label className="form-label">GAS Web App URL</label>
            <input
              className="form-input"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasUrl}
              onChange={e => setGasUrl(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSaveGasUrl}>💾 儲存設定</button>

          <div style={{
            marginTop: '18px',
            padding: '14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: '1.8'
          }}>
            <strong style={{ color: 'var(--accent-blue)' }}>📖 設定說明</strong><br />
            1. 開啟 Google Apps Script 並貼上逾期通知 GAS 腳本<br />
            2. 點擊「部署 → 新增部署作業」<br />
            3. 類型選「網路應用程式」，執行者「我」，存取「所有人」<br />
            4. 複製部署 URL 並貼到上方欄位儲存
          </div>
        </div>

        {/* System Info */}
        <div className="glass-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>ℹ️ 系統資訊</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', width: '120px' }}>Firebase 專案</span>
              <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>cjps-admin-hub</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', width: '120px' }}>目前登入</span>
              <span>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', width: '120px' }}>系統版本</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
