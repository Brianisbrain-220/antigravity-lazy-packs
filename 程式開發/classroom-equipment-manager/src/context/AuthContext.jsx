import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getHubAuthPermission } from '../utils/hubAuth';

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
          const hubResult = await getHubAuthPermission(firebaseUser.email);
          setIsAdmin(hubResult.isAdmin);
          setIsSuperAdmin(hubResult.isOwner);
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

