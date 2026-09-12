import { initializeApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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
// Analytics solo mide uso, no bloquea nada visible — se carga después del
// primer render en vez de sumar peso al bundle inicial.
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import('firebase/analytics').then(({ getAnalytics }) => { analytics = getAnalytics(app); });
  });
}
// Caché local persistente: al abrir, Firestore responde al instante desde
// IndexedDB (sin esperar la red) y sincroniza en segundo plano. Multi-pestaña
// para que varias pestañas/dispositivos compartan la misma caché sin pelearse.
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, db, auth, googleProvider };
