import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './firebase';
import { isAdmin } from './db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const ok = await Promise.race([
            isAdmin(firebaseUser.email),
            new Promise((_, reject) => setTimeout(() => reject(new Error('驗證逾時，可能是網路連線異常或資料庫限制。')), 10000))
          ]);
          setAdminVerified(ok);
        } catch (e) {
          console.error("Auth Error:", e);
          setAuthError(e.message || "發生未知驗證錯誤");
          setAdminVerified(false);
        }
      } else {
        setAdminVerified(false);
        setAuthError(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, adminVerified, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
