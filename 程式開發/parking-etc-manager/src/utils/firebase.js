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

// Whitelist checks (admin-dashboard-master rule: require role and isOwner)
export async function checkAdminPermission(email) {
  if (isDemoMode) {
    return {
      isAdmin: true,
      role: 'ADMIN',
      isOwner: true,
      email: email || 'admin@ccps.kh.edu.tw',
      name: '事務組管理員'
    };
  }
  try {
    const adminRef = doc(db, 'admins', email);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        isAdmin: true,
        role: data.role || 'ADMIN',
        isOwner: !!data.isOwner,
        email,
        name: data.name || email
      };
    }
  } catch (err) {
    console.error('checkAdminPermission error:', err);
  }
  return { isAdmin: false, role: 'USER', isOwner: false, email };
}

export { auth, db, googleProvider };
