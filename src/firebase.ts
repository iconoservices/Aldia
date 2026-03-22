import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXWH6gFsP0VaEc9QJJtbZA9B7QELv5TwU",
  authDomain: "aldia-57d51.firebaseapp.com",
  projectId: "aldia-57d51",
  storageBucket: "aldia-57d51.firebasestorage.app",
  messagingSenderId: "114123190482",
  appId: "1:114123190482:web:9c51c02b482292cdcdfd0b",
  measurementId: "G-RN417D3ZXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, db, auth, googleProvider };
