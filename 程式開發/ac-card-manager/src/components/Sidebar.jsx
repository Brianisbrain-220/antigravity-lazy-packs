import React from 'react';
import { useAuth } from '../AuthContext';

const NAV = [
  { section: '主要功能' },
  { key: 'dashboard', icon: '📊', label: '系統總覽' },
  { key: 'scan', icon: '📤', label: '借出 / 歸還' },
  { key: 'batch', icon: '⚡', label: '批次借用' },
  { section: '卡片管理' },
  { key: 'cards', icon: '🎴', label: '卡片管理' },
  { key: 'users', icon: '👥', label: '借用單位' },
  { section: '報表設定' },
  { key: 'reports', icon: '📋', label: '報表管理' },
  { key: 'settings', icon: '⚙️', label: '系統設定' }
];

export default function Sidebar({ page, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <h1>❄️ 冷氣卡借用管理</h1>
        <p>苓雅區中正國小</p>
      </div>

      <div className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section-label">{item.section}</div>;
          }
          return (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="sidebar-user">
        {user?.photoURL && <img src={user.photoURL} alt="avatar" />}
        <div className="sidebar-user-info">
          <p>{user?.displayName || '管理員'}</p>
          <p>{user?.email}</p>
        </div>
        <button className="logout-btn" onClick={logout} title="登出">↩</button>
      </div>
    </nav>
  );
}
