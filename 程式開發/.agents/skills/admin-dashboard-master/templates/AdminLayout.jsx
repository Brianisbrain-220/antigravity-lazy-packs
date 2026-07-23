import React, { useState, useEffect } from 'react';

/**
 * @file AdminLayout.jsx
 * @version v1.0.0 (2026-07-23)
 * @description 標準自適應後台版型 (Sidebar + Drawer + BottomNav + Header + Version Tag)
 */
export default function AdminLayout({ 
  title = "管理系統", 
  appVersion = "v1.0.0",
  buildDate = "2026-07-23",
  userEmail = "", 
  menuItems = [], 
  activeMenu = "", 
  onMenuSelect = () => {}, 
  children 
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  // 初始化版本號控制台日誌
  useEffect(() => {
    console.log(
      `%c[System Init] %c${title} Version: ${appVersion} (${buildDate})`,
      'color: #3b82f6; font-weight: bold;',
      'color: #10b981;'
    );
  }, [title, appVersion, buildDate]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <div className={`admin-layout-wrapper theme-${theme}`} data-theme={theme}>
      {/* 1. 桌機側邊欄 (Sidebar) */}
      <aside className="admin-sidebar desktop-only">
        <div className="sidebar-header">
          <h2>{title}</h2>
          <span className="sidebar-version-badge">{appVersion}</span>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => onMenuSelect(item.id)}
            >
              {item.icon && <span className="nav-icon">{item.icon}</span>}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>Build: {buildDate}</small>
        </div>
      </aside>

      {/* 2. 手機版抽屜選單 (Drawer) */}
      {drawerOpen && (
        <div className="admin-drawer-overlay mobile-only" onClick={() => setDrawerOpen(false)}>
          <aside className="admin-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>{title} <small>({appVersion})</small></h3>
              <button className="close-btn" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <nav className="drawer-nav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                  onClick={() => {
                    onMenuSelect(item.id);
                    setDrawerOpen(false);
                  }}
                >
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* 3. 主內容區域 (Main Content Area) */}
      <div className="admin-main-container">
        {/* 頂部導覽列 (Header) */}
        <header className="admin-header">
          <button className="hamburger-btn mobile-only" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
          <div className="header-breadcrumbs">
            <span className="current-page">{menuItems.find(m => m.id === activeMenu)?.label || title}</span>
          </div>
          <div className="header-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="切換主題">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {userEmail && <span className="user-email-tag">{userEmail}</span>}
          </div>
        </header>

        {/* 內容視窗 */}
        <main className="admin-page-body">
          {children}
        </main>

        {/* 頁尾版本別與內容一致性標記 (Footer Version Tag) */}
        <footer className="admin-footer">
          <div className="footer-content">
            <span>© {new Date().getFullYear()} {title}</span>
            <span className="version-info">系統版本：<code>{appVersion}</code> ({buildDate})</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
