import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, isDemoMode, demoAdminEnabled, checkAdminPermission } from '../utils/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

const DEMO_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

// 示範模式的假身分。
// ⚠️ 預設一律是「一般教師」。只有本機明確設定 VITE_DEMO_ALLOW_ADMIN=true 時才給管理員,
// 否則一次漏帶環境變數的部署 = 任何人免登入就是管理員(2026-08-04 線上實際發生過)。
function buildDemoUser(wantAdmin = false) {
  const admin = wantAdmin && demoAdminEnabled;
  return {
    uid: admin ? 'demo-admin-001' : 'demo-user-001',
    displayName: admin ? '王小明 (示範管理員)' : '李美華 (代理教師)',
    email: admin ? 'wang@ccps.kh.edu.tw' : 'lee@ccps.kh.edu.tw',
    photoURL: DEMO_AVATAR,
    isAdmin: admin,
    isOwner: admin,
    role: admin ? 'ADMIN' : 'USER'
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (isDemoMode) {
      return buildDemoUser(demoAdminEnabled);
    }
    return null;
  });
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const perm = await checkAdminPermission(firebaseUser.email);
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || '中正教師',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isAdmin: perm.isAdmin,
            isOwner: perm.isOwner,
            role: perm.role
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setUser(null);
      } finally {
        setLoading(false); // 嚴格遵守 firebase-loading-deadlock 規範
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      const demoUser = buildDemoUser(demoAdminEnabled);
      setUser(demoUser);
      return demoUser;
    }
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      const perm = await checkAdminPermission(res.user.email);
      const fullUser = {
        uid: res.user.uid,
        displayName: res.user.displayName,
        email: res.user.email,
        photoURL: res.user.photoURL,
        isAdmin: perm.isAdmin,
        isOwner: perm.isOwner,
        role: perm.role
      };
      setUser(fullUser);
      return fullUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      setUser(null);
      return;
    }
    await fbSignOut(auth);
    setUser(null);
  };

  // 讓使用者於示範模式一鍵切換「管理員」與「一般教師」身份試玩。
  // ⚠️ 只有 demoAdminEnabled 為真時才允許切換到管理員 —— 否則這個按鈕本身就是提權後門:
  // 未設定環境變數的線上部署,任何訪客點一下就會變成管理員。
  const toggleDemoRole = () => {
    if (!user) return;
    if (!demoAdminEnabled) {
      console.warn('[demo] 未啟用 VITE_DEMO_ALLOW_ADMIN,不提供管理員身分切換。');
      return;
    }
    setUser(buildDemoUser(!user.isAdmin));
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, toggleDemoRole, isDemoMode, demoAdminEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
