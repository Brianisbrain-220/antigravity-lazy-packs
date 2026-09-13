import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { INITIAL_PERMITS, INITIAL_VIOLATIONS, INITIAL_RULES_TEXT } from './mockData';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '00000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:00000000000:web:00000000000000'
};

export const isDemoMode = firebaseConfig.apiKey === 'demo-key' || !firebaseConfig.apiKey;

// ⚠️ 安全性:示範模式「不得」自動授予管理員權限。
// 「設定檔沒填」(isDemoMode) 與「我要展示後台」是兩件不同的事,綁在同一個布林值上,
// 會讓一次漏帶環境變數的部署,直接變成任何人免登入即為管理員的公開網站(2026-08-04 實際發生)。
// 要在本機展示後台,請在自己的 .env 明確加上 VITE_DEMO_ALLOW_ADMIN=true;
// 正式部署一律不得設定此變數。
export const demoAdminEnabled =
  isDemoMode && import.meta.env.VITE_DEMO_ALLOW_ADMIN === 'true';

let app, auth, db, googleProvider;

if (!isDemoMode) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn('Firebase init failed, switching to Local Demo mode:', e);
  }
}

// Local storage helpers for demo mode
function getLocal(key, fallback) {
  const data = localStorage.getItem(`ccps_parking_${key}`);
  return data ? JSON.parse(data) : fallback;
}
function setLocal(key, val) {
  localStorage.setItem(`ccps_parking_${key}`, JSON.stringify(val));
}

// Ensure initial local state exists
if (isDemoMode) {
  if (!localStorage.getItem('ccps_parking_permits')) {
    setLocal('permits', INITIAL_PERMITS);
  }
  if (!localStorage.getItem('ccps_parking_violations')) {
    setLocal('violations', INITIAL_VIOLATIONS);
  }
  if (!localStorage.getItem('ccps_parking_rules')) {
    setLocal('rules', INITIAL_RULES_TEXT);
  }
}

import { getHubAuthPermission } from './hubAuth';

// Whitelist checks (Central Authority Hub Pilot: hub_grants / park_admins)
export async function checkAdminPermission(email) {
  return await getHubAuthPermission(email);
}

export { auth, db, googleProvider };
