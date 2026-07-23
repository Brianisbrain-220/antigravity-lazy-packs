// Initialize Firebase
const firebaseConfig = {
  projectId: "cjps-admin-hub",
  appId: "1:845982966842:web:d619f9ca40f388a3ff8103",
  storageBucket: "cjps-admin-hub.firebasestorage.app",
  apiKey: "AIzaSyBpQHH0IfEfhGko1hI5r9Jz5QXOkmbwBrQ",
  authDomain: "cjps-admin-hub.firebaseapp.com",
  messagingSenderId: "845982966842"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();
const auth = firebase.auth();
