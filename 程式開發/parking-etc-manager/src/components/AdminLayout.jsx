import React, { useState } from 'react';
import { 
  FileText, 
  Camera, 
  AlertTriangle, 
  Printer, 
  Settings, 
  Menu, 
  X, 
  ChevronRight 
} from 'lucide-react';

export default function AdminLayout({ activeAdminTab, setActiveAdminTab, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { id: 'PERMITS', label: '車證與 ETC 審核', icon: FileText, badge: '待審核' },
    { id: 'OCR_SCANNER', label: '相機 OCR 車牌辨識', icon: Camera },
    { id: 'VIOLATIONS', label: '違規通報與紀錄', icon: AlertTriangle },
    { id: 'PRINTING', label: 'A4 雙軌停車證套印', icon: Printer },
    { id: 'SETTINGS', label: '批次匯入與規範更新', icon: Settings }
  ];

  const handleSelectTab = (id) => {
    setActiveAdminTab(id);
    setDrawerOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* 桌面版 Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>事務組工作檯</h2>
          <p>Admin Operations</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
              >
                <div className="item-left">
                  <Icon size={19} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={16} className="item-chevron" />
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 手機板上列與 Drawer 開啟按鈕 */}
      <div className="mobile-admin-header">
        <button onClick={() => setDrawerOpen(true)} className="drawer-open-btn">
          <Menu size={22} />
          <span>管理選單：{navItems.find(i => i.id === activeAdminTab)?.label}</span>
        </button>
      </div>

      {/* 手機板側滑 Drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>事務組管理導覽</h2>
              <button onClick={() => setDrawerOpen(false)} className="drawer-close-btn">
                <X size={20} />
              </button>
            </div>
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                  >
                    <div className="item-left">
                      <Icon size={19} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* 主內容區 */}
      <main className="admin-main">
        {children}
      </main>

      {/* 手機板底部 BottomNav */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeAdminTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`bottom-nav-item ${active ? 'bottom-nav-active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label.slice(0, 4)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
