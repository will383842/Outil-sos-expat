import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(cfg)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(
    "[Firebase] Variables d'environnement manquantes:",
    missing,
    "\n→ Crée un fichier .env.local avec les clés VITE_FIREBASE_* (ou configure Hosting)."
  );
  // On ne throw pas tout de suite pour garder une erreur lisible si un module essaye d'utiliser Firebase
}

let app;
try {
  app = initializeApp(cfg as any);
  console.debug("[Firebase] App initialisée:", cfg.projectId);
} catch (e) {
  console.error("[Firebase] Échec d'initialisation:", e);
  throw e; // mieux vaut échouer bruyamment qu'une page blanche silencieuse
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
