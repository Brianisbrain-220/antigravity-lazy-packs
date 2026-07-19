import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './ToastContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import BatchScanPage from './pages/BatchScanPage';
import CardManagePage from './pages/CardManagePage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import './index.css';

function AppInner() {
  const { user, adminVerified, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (key) => {
    setPage(key);
    setSidebarOpen(false);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>驗證身份中...</p>
    </div>
  );

  if (!user) return <LoginPage />;

  if (!adminVerified) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0e1a',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,107,107,0.08)',
        border: '1px solid rgba(255,107,107,0.25)',
        borderRadius: '24px',
        padding: '44px',
        textAlign: 'center',
        maxWidth: '420px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ color: '#ff6b6b', marginBottom: '10px' }}>存取遭拒</h2>
        <p style={{ color: 'rgba(240,244,255,0.6)', fontSize: '13px', marginBottom: '8px' }}>
          帳號 <strong style={{ color: '#f0f4ff' }}>{user.email}</strong> 尚未被授權登入此系統。
        </p>
        <p style={{ color: 'rgba(240,244,255,0.35)', fontSize: '12px', marginBottom: '24px' }}>
          請聯絡管理員將您的帳號加入白名單後再試。
        </p>
        <button
          className="btn btn-danger"
          onClick={() => signOut(auth)}
          style={{ width: '100%' }}
        >
          登出並切換帳號
        </button>
      </div>
    </div>
  );

  const pages = {
    dashboard: <DashboardPage />,
    scan: <ScanPage />,
    batch: <BatchScanPage />,
    cards: <CardManagePage />,
    users: <UsersPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />
  };


  return (
    <div className="app-layout">
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        {/* Mobile top bar with hamburger */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <span className="mobile-title">❄️ 冷氣卡借用管理</span>
        </div>

        <main className="main-content">
          {pages[page] || <DashboardPage />}
        </main>

        <BottomNav page={page} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
