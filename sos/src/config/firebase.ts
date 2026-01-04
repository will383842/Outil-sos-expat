// src/config/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { installNetworkResilience, suppressExtensionErrors } from "../utils/networkResilience";

// 🛡️ Installer la protection réseau AVANT tout le reste
if (typeof window !== 'undefined') {
  installNetworkResilience();
  suppressExtensionErrors();
}
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  serverTimestamp,
  setLogLevel,
  type Firestore,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
  // ⚠️ ne pas importer 'Functions' ici (pas exporté selon les versions)
  // type HttpsCallable est exporté sur la plupart des versions, mais on n'en a pas besoin
} from "firebase/functions";

/** ----------------------------------------
 *  Configuration Firebase (variables .env)
 * ---------------------------------------- */
const CACHE_DISABLED_KEY = 'firestore_cache_disabled';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Vérifications basiques d'env
console.log("🔧 [Firebase] Configuration chargée:", {
  apiKey: firebaseConfig.apiKey ? "✅ présent" : "❌ MANQUANT",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId ? "✅ présent" : "❌ MANQUANT",
  appId: firebaseConfig.appId ? "✅ présent" : "❌ MANQUANT",
});

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Variables d'environnement Firebase manquantes");
  throw new Error("Configuration Firebase incomplète");
}
if (!firebaseConfig.storageBucket) {
  console.error("❌ VITE_FIREBASE_STORAGE_BUCKET manquant");
  throw new Error("Storage bucket non configuré");
}

/** ----------------------------------------------------
 *  Initialisation app (HMR-safe) + services Firebase
 * ---------------------------------------------------- */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth / Storage / Firestore
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Firestore - Configuration avec Long Polling forcé (contourne les problèmes WebSocket)
// ⚠️ CRITICAL: Ces options sont ESSENTIELLES pour la stabilité de Firestore
// NE PAS SUPPRIMER sans comprendre les conséquences (voir commit c40b8f9)
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Force HTTP au lieu de WebSocket
  experimentalAutoDetectLongPolling: false, // Désactiver l'auto-détection
  // ⚠️ CRITICAL: Désactive les Fetch Streams qui peuvent être bloqués par extensions/antivirus
  // @ts-expect-error - Option non documentée mais critique pour la stabilité
  useFetchStreams: false,
  // P1 FIX: Limiter le cache local pour éviter les problèmes de mémoire
  cacheSizeBytes: 40 * 1024 * 1024, // 40 MB max (défaut illimité)
});
console.log("🔧 [Firebase] Firestore initialisé avec LONG POLLING FORCÉ + useFetchStreams=false + cache 40MB");

// 🔧 Fonction pour reset le cache Firestore (appeler depuis la console: window.resetFirestoreCache())
if (typeof window !== 'undefined') {
  (window as any).resetFirestoreCache = async () => {
    console.log("🗑️ [Firebase] Suppression du cache Firestore...");
    try {
      // Supprimer toutes les bases IndexedDB liées à Firestore
      const databases = await indexedDB.databases();
      const firestoreDbs = databases.filter(db =>
        db.name?.includes('firestore') ||
        db.name?.includes('firebase') ||
        db.name?.includes('__sak')
      );

      for (const dbInfo of firestoreDbs) {
        if (dbInfo.name) {
          console.log(`🗑️ Suppression de ${dbInfo.name}...`);
          indexedDB.deleteDatabase(dbInfo.name);
        }
      }

      // Désactiver le cache pour le prochain reload
      localStorage.setItem(CACHE_DISABLED_KEY, 'true');

      console.log("✅ [Firebase] Cache supprimé! Rechargez la page.");
      console.log("💡 [Firebase] Le cache sera désactivé au prochain chargement.");
      console.log("💡 [Firebase] Pour réactiver: localStorage.removeItem('firestore_cache_disabled')");

      // Forcer un reload
      setTimeout(() => location.reload(), 1000);
    } catch (e) {
      console.error("❌ [Firebase] Erreur lors de la suppression du cache:", e);
    }
  };

  // Fonction pour réactiver le cache
  (window as any).enableFirestoreCache = () => {
    localStorage.removeItem(CACHE_DISABLED_KEY);
    console.log("✅ [Firebase] Cache réactivé pour le prochain chargement. Rechargez la page.");
    setTimeout(() => location.reload(), 500);
  };

  console.log("💡 [Firebase] Si Firestore est bloqué, exécutez: window.resetFirestoreCache()");
}
console.log("🔧 [Firebase] Firestore type:", db.type);
console.log("🔧 [Firebase] App name:", db.app.name);

// 🔍 DIAGNOSTIC: Test immédiat de Firestore au boot
if (typeof window !== 'undefined') {
  // Log réseau avant le test Firestore
  console.log("🌐 [Firebase] État réseau:", {
    online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  });

  import('firebase/firestore').then(({ doc, getDoc, collection, getDocs, query, limit: firestoreLimit, enableNetwork, disableNetwork }) => {
    console.log("🧪 [Firebase] Test de connectivité Firestore...");
    console.log("🧪 [Firebase] Timestamp début test:", new Date().toISOString());

    // Test 1: Lecture d'une collection publique (sos_profiles a allow read: if true)
    const testQuery = query(collection(db, 'sos_profiles'), firestoreLimit(1));
    const start = Date.now();

    // Timeout de 10s
    const timeoutId = setTimeout(() => {
      console.error("❌ [Firebase] Firestore timeout après 10s - connexion bloquée!");
      console.error("❌ [Firebase] Vérifiez:");
      console.error("   1. Votre connexion internet");
      console.error("   2. Aucun bloqueur de réseau (antivirus, extension)");
      console.error("   3. Le projet Firebase est accessible");
      console.error("💡 [Firebase] Solution: Essayez en navigation privée ou un autre navigateur");
    }, 10000);

    getDocs(testQuery)
      .then((snap) => {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        console.log(`✅ [Firebase] Firestore connecté en ${elapsed}ms (${snap.size} docs trouvés)`);
        console.log(`✅ [Firebase] Connectivité OK - les requêtes Firestore fonctionnent`);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        console.error(`❌ [Firebase] Firestore erreur en ${elapsed}ms:`, err.code, err.message);
        console.error(`❌ [Firebase] Stack:`, err.stack);
      });
  });
}

// Auto-nettoyage du cache si le stockage est presque plein
if (typeof navigator !== 'undefined' && 'storage' in navigator) {
  navigator.storage.estimate?.().then(({ usage, quota }) => {
    if (usage && quota) {
      const usagePercent = (usage / quota) * 100;
      console.log(`📊 [Storage] Utilisation: ${(usage / 1024 / 1024).toFixed(1)}MB / ${(quota / 1024 / 1024).toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);

      // Si > 80% utilisé, nettoyer les caches
      if (usagePercent > 80) {
        console.warn("⚠️ [Storage] Stockage presque plein, nettoyage des caches...");
        // Supprimer les vieux caches Service Worker
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              if (name.includes('workbox') || name.includes('firebase')) {
                caches.delete(name);
                console.log(`🗑️ [Cache] Supprimé: ${name}`);
              }
            });
          });
        }
      }
    }
  }).catch(() => { /* Storage API non disponible */ });
}

// 🔇 Réduire le bruit Firestore (logs seulement si erreur)
setLogLevel("error");

/** ----------------------------------------------------
 *  Cloud Functions — Région unifiée
 * ---------------------------------------------------- */
const RAW_REGION = (import.meta.env.VITE_FUNCTIONS_REGION ?? "europe-west1").toString();
const RAW_REGION_DEV = (import.meta.env.VITE_FUNCTIONS_REGION_DEV ?? "").toString();
const IS_DEV = Boolean(import.meta.env.DEV);
const REGION = IS_DEV && RAW_REGION_DEV ? RAW_REGION_DEV : RAW_REGION;

// ✅ Instance Functions (type inféré automatiquement)
export const functions = getFunctions(app, REGION);

/** ----------------------------------------
 *  Emulateurs (optionnels en local)
 * ---------------------------------------- */
const parseBool = (v: unknown): boolean => {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
};

const USE_EMULATORS = parseBool(import.meta.env.VITE_USE_EMULATORS ?? "");
const EMU_HOST = (import.meta.env.VITE_EMULATOR_HOST ?? "127.0.0.1").toString();
const PORT_AUTH = Number(import.meta.env.VITE_EMULATOR_PORT_AUTH ?? 9099);
const PORT_FS = Number(import.meta.env.VITE_EMULATOR_PORT_FIRESTORE ?? 8080);
const PORT_FUNC = Number(import.meta.env.VITE_EMULATOR_PORT_FUNCTIONS ?? 5001);
const PORT_STORAGE = Number(import.meta.env.VITE_EMULATOR_PORT_STORAGE ?? 9199);


if (USE_EMULATORS && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${PORT_AUTH}`, { disableWarnings: true });
  } catch { /* noop */ }
  try {
    connectFirestoreEmulator(db, EMU_HOST, PORT_FS);
  } catch { /* noop */ }
  try {
    connectFunctionsEmulator(functions, EMU_HOST, PORT_FUNC);
  } catch { /* noop */ }
  try {
    connectStorageEmulator(storage, EMU_HOST, PORT_STORAGE);
  } catch { /* noop */ }
}

/** ----------------------------------------
 *  Log unique de diagnostic (au boot)
 * ---------------------------------------- */
console.log("✅ Firebase initialisé :", {
  projectId: app.options.projectId,
  usingEmulators: USE_EMULATORS,
  functionsRegion: REGION,
});

/** ----------------------------------------
 *  Helper httpsCallable typé (sans any explicite)
 * ---------------------------------------- */
// name: nom de la callable Firebase
// TPayload: type des données envoyées
// TReturn: type des données retournées
export function call<TPayload, TReturn = unknown>(name: string) {
  // Le type de retour est inféré comme HttpsCallable<TPayload, TReturn>
  return httpsCallable<TPayload, TReturn>(functions, name);
}

// ✅ Expose aussi httpsCallable si besoin d'import direct
export { httpsCallable } from "firebase/functions";

// Exports utiles ponctuels
export { serverTimestamp };

export default app;



