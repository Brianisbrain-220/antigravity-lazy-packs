import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "cjps-admin-hub.firebaseapp.com",
  projectId: "cjps-admin-hub",
  storageBucket: "cjps-admin-hub.firebasestorage.app",
  messagingSenderId: "845982966842",
  appId: "1:845982966842:web:d619f9ca40f388a3ff8103"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
