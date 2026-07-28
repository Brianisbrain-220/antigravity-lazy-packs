import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ReporterForm from './pages/ReporterForm';
import HandoverConfirm from './pages/HandoverConfirm';
import AdminDashboard from './pages/AdminDashboard';
import { LogOut } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, loading, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <header className="app-header">
          <div className="app-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            教室設備清點系統
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }} className="header-actions">
            {user ? (
              <>
                <span className="user-email-label" style={{ fontSize: '0.9rem', color: '#64748b' }}>{user.email}</span>
                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>填報端</Link>
                  {isAdmin && (
                    <Link to="/admin" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>管理後台</Link>
                  )}
                </nav>
                <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={logout} title="登出">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <nav style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>填報端</Link>
                <Link to="/admin" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>管理後台登入</Link>
              </nav>
            )}
          </div>
        </header>

        <main className="main-container">
          <Routes>
            <Route path="/" element={<ReporterForm />} />
            <Route path="/confirm/:id" element={<HandoverConfirm />} />
            <Route path="/admin" element={
              loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                  <p style={{ fontSize: '1.2rem', color: '#64748b' }}>驗證管理員身份中...</p>
                </div>
              ) : !user ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                  <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
                    <h2 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>管理後台登入</h2>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>請使用學校授權的管理員 Google 帳號登入以進入管理後台。</p>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={login}>
                      使用 Google 帳號登入
                    </button>
                  </div>
                </div>
              ) : isAdmin ? (
                <AdminDashboard />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                  <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem', borderColor: 'red' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ marginBottom: '1.5rem', color: '#ef4444' }}>存取遭拒</h2>
                    <p style={{ color: '#64748b' }}>帳號 <strong>{user?.email}</strong> 尚未被授權為管理員。請聯絡系統管理員。</p>
                    <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={logout}>
                      登出並切換帳號
                    </button>
                  </div>
                </div>
              )
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
