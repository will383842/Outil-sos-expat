import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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

if (missing.length && import.meta.env.DEV) {
  console.error(
    "[Firebase] Variables d'environnement manquantes:",
    missing,
    "\n→ Crée un fichier .env.local avec les clés VITE_FIREBASE_* (ou configure Hosting)."
  );
  // On ne throw pas tout de suite pour garder une erreur lisible si un module essaye d'utiliser Firebase
}

let app;
try {
  app = initializeApp(cfg as Record<string, string>);
} catch (e) {
  // En production, on log silencieusement. En dev, on affiche l'erreur
  if (import.meta.env.DEV) {
    console.error("[Firebase] Échec d'initialisation:", e);
  }
  throw e; // mieux vaut échouer bruyamment qu'une page blanche silencieuse
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// =============================================================================
// PWA AUTH PERSISTENCE - Garantit que l'utilisateur reste connecté après
// installation de la PWA (pas besoin de se reconnecter)
// =============================================================================
// indexedDBLocalPersistence est plus fiable pour les PWA que localStorage
// car il persiste même quand le storage est sous pression
setPersistence(auth, indexedDBLocalPersistence).catch((error) => {
  // Fallback sur browserLocalPersistence si IndexedDB n'est pas disponible
  console.warn(
    "[Firebase Auth] IndexedDB non disponible, fallback sur localStorage:",
    error.code
  );
  return setPersistence(auth, browserLocalPersistence);
});

// Connexion aux émulateurs en mode développement
// Active avec: VITE_USE_EMULATORS=true dans .env.local
if (import.meta.env.VITE_USE_EMULATORS === "true" && import.meta.env.DEV) {
  console.log("🔧 Connexion aux émulateurs Firebase...");
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
  console.log("✅ Émulateurs Firebase connectés");
}
