import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, isDemoMode, checkAdminPermission } from '../utils/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (isDemoMode) {
      return {
        uid: 'demo-admin-001',
        displayName: '王小明 (示範管理員)',
        email: 'wang@ccps.kh.edu.tw',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        isAdmin: true,
        isOwner: true,
        role: 'ADMIN'
      };
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
      const demoUser = {
        uid: 'demo-admin-001',
        displayName: '王小明 (示範管理員)',
        email: 'wang@ccps.kh.edu.tw',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        isAdmin: true,
        isOwner: true,
        role: 'ADMIN'
      };
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

  // 讓使用者於示範模式一鍵切換「管理員」與「一般教師」身份試玩
  const toggleDemoRole = () => {
    if (!user) return;
    if (user.isAdmin) {
      setUser({
        ...user,
        displayName: '李美華 (代理教師)',
        email: 'lee@ccps.kh.edu.tw',
        isAdmin: false,
        isOwner: false,
        role: 'USER'
      });
    } else {
      setUser({
        ...user,
        displayName: '王小明 (示範管理員)',
        email: 'wang@ccps.kh.edu.tw',
        isAdmin: true,
        isOwner: true,
        role: 'ADMIN'
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, toggleDemoRole, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
