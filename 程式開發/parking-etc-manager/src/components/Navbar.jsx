import React from 'react';
import { useAuth } from '../context/AuthContext';
import { VERSION_INFO } from '../config/version';
import { ShieldAlert, UserCheck, LogOut, LogIn, RefreshCw, Car, Wrench } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, loginWithGoogle, logout, toggleDemoRole, isDemoMode } = useAuth();

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <div className="navbar-brand" onClick={() => setActiveTab('PORTAL')}>
          <div className="logo-icon">
            <Car className="icon-car" />
          </div>
          <div>
            <h1 className="brand-title">中正國小 停車與 ETC 智慧管理系統</h1>
            <span className="brand-version">v{VERSION_INFO.version}</span>
          </div>
        </div>

        <nav className="navbar-menu">
          <button
            onClick={() => setActiveTab('PORTAL')}
            className={`nav-btn ${activeTab === 'PORTAL' ? 'nav-btn-active' : ''}`}
          >
            <Car size={18} />
            <span>車證與 ETC 申請</span>
          </button>

          {user?.isAdmin && (
            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`nav-btn ${activeTab === 'ADMIN' ? 'nav-btn-active' : ''}`}
            >
              <Wrench size={18} />
              <span>事務組管理後台</span>
            </button>
          )}

          {isDemoMode && user && (
            <button
              onClick={toggleDemoRole}
              className="demo-toggle-btn"
              title="點擊切換為管理員或一般申請者測試"
            >
              <RefreshCw size={15} />
              <span>視角：{user.isAdmin ? '👑 事務組管理員' : '👤 一般教師'}</span>
            </button>
          )}

          {user ? (
            <div className="user-profile">
              <img
                src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={user.displayName}
                className="user-avatar"
              />
              <span className="user-name">{user.displayName}</span>
              <button onClick={logout} className="logout-btn" title="登出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="login-btn">
              <LogIn size={18} />
              <span>Google 登入申請</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
