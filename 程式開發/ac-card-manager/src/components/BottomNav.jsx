import React, { useState } from 'react';

const MAIN_NAV = [
  { key: 'dashboard', icon: '📊', label: '總覽' },
  { key: 'scan', icon: '📤', label: '掃描' },
  { key: 'cards', icon: '🎴', label: '卡片' },
  { key: 'users', icon: '👥', label: '單位' },
];

const MORE_NAV = [
  { key: 'batch', icon: '⚡', label: '批次借用' },
  { key: 'reports', icon: '📋', label: '報表管理' },
  { key: 'settings', icon: '⚙️', label: '系統設定' }
];

export default function BottomNav({ page, onNavigate }) {
  const [showMore, setShowMore] = useState(false);

  const handleNav = (key) => {
    onNavigate(key);
    setShowMore(false);
  };

  return (
    <>
      {showMore && (
        <div className="bottom-nav-overlay" onClick={() => setShowMore(false)}>
          <div className="bottom-nav-more-menu" onClick={e => e.stopPropagation()}>
            {MORE_NAV.map((item) => (
              <button
                key={item.key}
                className={`more-menu-item ${page === item.key ? 'active' : ''}`}
                onClick={() => handleNav(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {MAIN_NAV.map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => handleNav(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${MORE_NAV.some(m => m.key === page) ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <span className="nav-icon">⋯</span>
          <span className="nav-label">更多</span>
        </button>
      </nav>
    </>
  );
}
