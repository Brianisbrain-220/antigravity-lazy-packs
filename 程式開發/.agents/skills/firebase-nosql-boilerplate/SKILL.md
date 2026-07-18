---
name: firebase-nosql-boilerplate
description: 在 Firebase Firestore / Hosting 開發 Web App 時，避免複合索引崩潰、提供標準 AuthContext 與 try-catch loading 防禦的免索引架構最佳實踐。
---

# Firebase 快速開發與無索引部置技能 (firebase-nosql-boilerplate)

本技能旨在指導如何在 Firebase Web App 開發中避免因 Firestore 進階查詢（複合索引）未配置而導致的載入卡死（無限轉圈圈）問題，並提供標準的安全認證防禦與載入防崩潰處理範本。

## 💡 免複合索引 (Zero-Index) 的設計規範

### 1. 痛點分析
Firestore 只要在同一個查詢中使用多個 `orderBy`，或者將 `where` 與 `orderBy` 組合在不同欄位上，就必須在 Google Cloud 控制台手動為該查詢建立「複合索引（Composite Index）」。在新建專案或未配置索引的專案中，會直接拋出 `FirebaseError`。

### 2. 解決方案：前端內存排序與過濾 (In-Memory Sorting)
當單一集合（Collection）的資料量在萬筆以內時（如學校的班級名單、卡片名單、少量歷史紀錄），**嚴禁使用複合 Firestore 查詢**。一律拉取整張資料表，並在前端 (JavaScript) 記憶體中排序或過濾。

#### 範例：替代多重排序的查詢
❌ 錯誤做法（會卡死轉圈圈且需要手動建立複合索引）：
```javascript
const q = query(collection(db, 'users'), orderBy('category'), orderBy('name'));
const snap = await getDocs(q);
```

✅ 正確做法（100% 隨插即用且完全不需要索引）：
```javascript
const snap = await getDocs(collection(db, 'users'));
const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
return list.sort((a, b) => {
  const catComp = (a.category || '').localeCompare(b.category || '', 'zh-Hant');
  if (catComp !== 0) return catComp;
  return (a.name || '').localeCompare(b.name || '', 'zh-Hant');
});
```

---

## 🔒 標準的 Google 登入白名單與 AuthContext

前端的登入與安全性防禦應以 `AuthContext.jsx` 為核心進行，確保非白名單帳號即使通過 Google 認證，也會被拒之門外。

### AuthContext 核心實現
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 白名單檢驗
        const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.email.toLowerCase()));
        setAdminVerified(adminDoc.exists());
      } else {
        setAdminVerified(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, adminVerified, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
```

---

## 🛡️ 健全的 Try-Catch-Finally 載入控制

在任何進行非同步讀取的網頁元件中，**禁止在沒有 `finally` 的情況下修改載入狀態**。否則一旦網路斷線或權限不足，頁面將會永久卡在「轉圈圈」或「載入中」狀態。

### 元件載入規範模板
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

const loadData = async () => {
  setLoading(true);
  try {
    const result = await fetchMyData();
    setData(result);
  } catch (e) {
    console.error("載入失敗：", e);
    showToastNotification(e.message, 'error'); // 透過 Toast 友好顯示錯誤
  } finally {
    setLoading(false); // 確保不論成功或失敗都會停止轉圈圈
  }
};
```
