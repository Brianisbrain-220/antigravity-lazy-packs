import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        try {
          // Normalize to lowercase for compatibility, but check both to be safe
          const emailLower = firebaseUser.email.toLowerCase().trim();
          const adminDoc = await getDoc(doc(db, 'admins', emailLower));
          let docData = null;
          if (adminDoc.exists()) {
            setIsAdmin(true);
            docData = adminDoc.data();
          } else {
            const adminDocCase = await getDoc(doc(db, 'admins', firebaseUser.email.trim()));
            if (adminDocCase.exists()) {
              setIsAdmin(true);
              docData = adminDocCase.data();
            } else {
              setIsAdmin(false);
            }
          }
          if (docData) {
            // 如果資料庫中 role 為 super_admin，或是舊有帳號無 role 欄位時自動設定為超級管理員
            const isSuper = docData.role === 'super_admin' || !docData.role;
            setIsSuperAdmin(isSuper);
          } else {
            setIsSuperAdmin(false);
          }
        } catch (err) {
          console.error("Error verifying admin status:", err);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
      alert("登入失敗: " + err.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

