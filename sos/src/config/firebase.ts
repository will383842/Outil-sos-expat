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
  persistentLocalCache,
  persistentMultipleTabManager,
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
const CACHE_CORRUPTION_DETECTED_KEY = 'firestore_cache_corruption_detected';

// 🔧 Vérifier si le cache doit être désactivé (flag set par resetFirestoreCache ou détection auto)
const isCacheDisabled = typeof window !== 'undefined' && (
  localStorage.getItem(CACHE_DISABLED_KEY) === 'true' ||
  localStorage.getItem(CACHE_CORRUPTION_DETECTED_KEY) === 'true'
);

if (isCacheDisabled && typeof window !== 'undefined') {
  console.warn("⚠️ [Firebase] Cache IndexedDB DÉSACTIVÉ (corruption détectée ou reset manuel)");
}

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
//
// ✅ OPTIMISATION COÛTS GCP: Cache persistant IndexedDB pour réduire les lectures réseau
// - Le cache persiste entre les sessions (offline-first)
// - Les listeners onSnapshot reçoivent toujours les mises à jour temps réel
// - Réduit les lectures initiales de ~30-50%
//
// 🔧 FIX: Si le cache est corrompu, on initialise SANS cache persistant
// Voir GitHub issues: firebase/firebase-js-sdk#8593, #9056
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Force HTTP au lieu de WebSocket
  experimentalAutoDetectLongPolling: false, // Désactiver l'auto-détection
  // ⚠️ CRITICAL: Désactive les Fetch Streams qui peuvent être bloqués par extensions/antivirus
  // @ts-expect-error - Option non documentée mais critique pour la stabilité
  useFetchStreams: false,
  // ✅ Cache persistant IndexedDB - économie ~15-20% de lectures
  // ⚠️ DÉSACTIVÉ si corruption détectée (fallback mode)
  ...(isCacheDisabled ? {} : {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(), // Support multi-onglets
      cacheSizeBytes: 50 * 1024 * 1024, // 50 MB max
    }),
  }),
});
console.log(isCacheDisabled
  ? "🔧 [Firebase] Firestore initialisé SANS CACHE (mode fallback après corruption)"
  : "🔧 [Firebase] Firestore initialisé avec LONG POLLING + CACHE PERSISTANT IndexedDB (50MB)"
);

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
    localStorage.removeItem(CACHE_CORRUPTION_DETECTED_KEY);
    console.log("✅ [Firebase] Cache réactivé pour le prochain chargement. Rechargez la page.");
    setTimeout(() => location.reload(), 500);
  };

  console.log("💡 [Firebase] Si Firestore est bloqué, exécutez: window.resetFirestoreCache()");

  // 🔍 Charger les diagnostics d'authentification
  import('../utils/authDiagnostics').then(() => {
    console.log("💡 [Firebase] Pour diagnostiquer l'authentification Google: window.diagnoseFirebaseAuth()");
  }).catch(() => { /* ignore */ });

  // 🔧 AUTO-DETECTION: Détecter les erreurs de corruption IndexedDB et reset automatique
  // Patterns d'erreurs connus: "INTERNAL ASSERTION FAILED", "Cannot read properties of null"
  // Voir: github.com/firebase/firebase-js-sdk/issues/8593, #9056, #8250
  const firestoreCorruptionPatterns = [
    'INTERNAL ASSERTION FAILED',
    'Cannot read properties of null',
    'Unexpected state',
    'refusing to open IndexedDB',
    'IndexedDB transaction',
  ];

  const handleFirestoreCorruption = (errorMessage: string) => {
    // Éviter les boucles infinies - ne pas réagir si déjà en mode fallback
    if (localStorage.getItem(CACHE_CORRUPTION_DETECTED_KEY) === 'true') {
      return;
    }

    const isCorruptionError = firestoreCorruptionPatterns.some(pattern =>
      errorMessage.includes(pattern)
    );

    if (isCorruptionError && errorMessage.toLowerCase().includes('firestore')) {
      console.error("🚨 [Firebase] CORRUPTION INDEXEDDB DÉTECTÉE - Reset automatique...");
      console.error("🚨 [Firebase] Message d'erreur:", errorMessage);

      // Marquer la corruption pour le prochain reload
      localStorage.setItem(CACHE_CORRUPTION_DETECTED_KEY, 'true');

      // Supprimer les bases IndexedDB de manière synchrone si possible
      if ('databases' in indexedDB) {
        indexedDB.databases().then(databases => {
          databases.forEach(dbInfo => {
            if (dbInfo.name && (
              dbInfo.name.includes('firestore') ||
              dbInfo.name.includes('firebase')
            )) {
              indexedDB.deleteDatabase(dbInfo.name);
              console.log(`🗑️ [Firebase] Auto-suppression: ${dbInfo.name}`);
            }
          });
        }).catch(() => { /* ignore */ });
      }

      // Afficher un message à l'utilisateur et recharger
      console.warn("⚠️ [Firebase] La page va se recharger automatiquement pour corriger le problème...");
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  };

  // Intercepter les erreurs globales (uncaught exceptions)
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = String(message) + (error?.stack || '');
    handleFirestoreCorruption(errorMsg);

    // Appeler le handler original s'il existe
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Intercepter les rejections de promesses non gérées
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event: PromiseRejectionEvent) {
    const errorMsg = String(event.reason) + (event.reason?.stack || '') + (event.reason?.message || '');
    handleFirestoreCorruption(errorMsg);

    // Appeler le handler original s'il existe
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(window, event);
    }
  };
}
console.log("🔧 [Firebase] Firestore type:", db.type);
console.log("🔧 [Firebase] App name:", db.app.name);

// 🔧 AUTO-RÉACTIVATION: Après 24h sans erreur, tenter de réactiver le cache
if (typeof window !== 'undefined' && isCacheDisabled) {
  const CACHE_DISABLED_TIMESTAMP_KEY = 'firestore_cache_disabled_at';
  const CACHE_RECOVERY_DELAY_MS = 24 * 60 * 60 * 1000; // 24 heures

  const disabledAt = localStorage.getItem(CACHE_DISABLED_TIMESTAMP_KEY);
  const now = Date.now();

  if (!disabledAt) {
    // Première fois qu'on détecte que le cache est désactivé - enregistrer le timestamp
    localStorage.setItem(CACHE_DISABLED_TIMESTAMP_KEY, String(now));
  } else {
    const disabledTimestamp = parseInt(disabledAt, 10);
    if (now - disabledTimestamp > CACHE_RECOVERY_DELAY_MS) {
      // 24h écoulées - tenter de réactiver le cache au prochain reload
      console.log("🔄 [Firebase] 24h écoulées - Tentative de réactivation du cache au prochain reload");
      localStorage.removeItem(CACHE_DISABLED_KEY);
      localStorage.removeItem(CACHE_CORRUPTION_DETECTED_KEY);
      localStorage.removeItem(CACHE_DISABLED_TIMESTAMP_KEY);
      // Note: Le cache sera réactivé au prochain reload, pas maintenant
    } else {
      const remainingHours = Math.ceil((CACHE_RECOVERY_DELAY_MS - (now - disabledTimestamp)) / (60 * 60 * 1000));
      console.log(`⏳ [Firebase] Cache désactivé - réactivation auto dans ~${remainingHours}h`);
    }
  }
}

// 🔍 DIAGNOSTIC: Test immédiat de Firestore au boot
if (typeof window !== 'undefined') {
  // Log réseau avant le test Firestore
  console.log("🌐 [Firebase] État réseau:", {
    online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  });

  import('firebase/firestore').then(({ doc, getDoc, collection, getDocs, query, limit: firestoreLimit, where, enableNetwork, disableNetwork }) => {
    console.log("🧪 [Firebase] Test de connectivité Firestore...");
    console.log("🧪 [Firebase] Timestamp début test:", new Date().toISOString());

    // Test 1: Lecture d'une collection publique (sos_profiles nécessite isVisible == true pour les requêtes list)
    const testQuery = query(collection(db, 'sos_profiles'), where('isVisible', '==', true), firestoreLimit(1));
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

// 🔇 Filtrer les erreurs bénignes de Firestore multi-onglets
// Ces erreurs sont normales quand plusieurs onglets sont ouverts et n'affectent pas le fonctionnement
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map(a => String(a)).join(' ');

    // Filtrer les erreurs bénignes de Firestore IndexedDB multi-onglets
    if (
      message.includes('Failed to obtain primary lease') ||
      message.includes('Backfill Indexes') ||
      message.includes('Collect garbage')
    ) {
      // Ignorer silencieusement ces erreurs bénignes
      return;
    }

    originalConsoleError.apply(console, args);
  };
}

// 🔍 DIAGNOSTIC: Fonction pour tester l'accès au document users
if (typeof window !== 'undefined') {
  (window as any).diagnoseUserDocument = async () => {
    const { doc, getDoc } = await import('firebase/firestore');

    console.group('🔍 Diagnostic Document Users');

    // 1. Vérifier l'état auth
    const currentUser = auth.currentUser;
    console.log('1️⃣ Auth State:');
    console.log('  - currentUser:', currentUser ? currentUser.uid : 'null');
    console.log('  - emailVerified:', currentUser?.emailVerified);

    if (!currentUser) {
      console.error('❌ Pas d\'utilisateur connecté');
      console.groupEnd();
      return;
    }

    // 2. Tester le token
    console.log('\n2️⃣ Token ID:');
    try {
      const token = await currentUser.getIdToken(true); // Force refresh
      console.log('  - Token obtenu:', token.substring(0, 50) + '...');

      // Décoder le token pour voir les claims
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('  - Claims:', payload);
      console.log('  - Expiration:', new Date(payload.exp * 1000).toISOString());
      console.log('  - Role claim:', payload.role || '(non défini)');
    } catch (e) {
      console.error('  - Erreur token:', e);
    }

    // 3. Tester l'accès au document
    console.log('\n3️⃣ Accès Document users/' + currentUser.uid + ':');
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        console.log('  ✅ Document existe');
        console.log('  - Données:', userSnap.data());
      } else {
        console.error('  ❌ Document N\'EXISTE PAS');
        console.log('  💡 Solution: Créer le document manuellement ou réinscrire l\'utilisateur');
      }
    } catch (e: any) {
      console.error('  ❌ Erreur accès:', e.code, e.message);
      if (e.code === 'permission-denied') {
        console.log('  💡 Causes possibles:');
        console.log('     1. Les règles Firestore ne permettent pas l\'accès');
        console.log('     2. Le token n\'est pas correctement synchronisé');
        console.log('     3. Le custom claim "role" n\'est pas défini');
      }
    }

    console.groupEnd();
    console.log('\n💡 Pour créer le document manuellement, exécutez: window.createUserDocument()');
  };

  // Fonction pour créer le document users si manquant
  (window as any).createUserDocument = async () => {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }

    console.log('🔧 Création du document users/' + currentUser.uid + '...');

    try {
      const userData = {
        uid: currentUser.uid,
        id: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || null,
        emailVerified: currentUser.emailVerified,
        isVerifiedEmail: currentUser.emailVerified,
        role: 'client',
        isActive: true,
        isApproved: true,
        isBanned: false,
        isOnline: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', currentUser.uid), userData);
      console.log('✅ Document créé avec succès!');
      console.log('📝 Données:', userData);
      console.log('🔄 Rechargez la page pour appliquer les changements');
    } catch (e: any) {
      console.error('❌ Erreur création:', e.code, e.message);
    }
  };

  console.log('💡 [Firebase] Diagnostics disponibles:');
  console.log('   window.diagnoseUserDocument() - Tester l\'accès au document users');
  console.log('   window.createUserDocument() - Créer le document users si manquant');
}

/** ----------------------------------------------------
 *  Cloud Functions — Région unifiée
 * ---------------------------------------------------- */
const RAW_REGION = (import.meta.env.VITE_FUNCTIONS_REGION ?? "europe-west1").toString();
const RAW_REGION_DEV = (import.meta.env.VITE_FUNCTIONS_REGION_DEV ?? "").toString();
const IS_DEV = Boolean(import.meta.env.DEV);
const REGION = IS_DEV && RAW_REGION_DEV ? RAW_REGION_DEV : RAW_REGION;

// ✅ Instance Functions (type inféré automatiquement)
export const functions = getFunctions(app, REGION);

// ✅ Instance Functions pour les fonctions de paiement (europe-west3, séparé de west1 pour éviter quota CPU)
const PAYMENT_REGION = (import.meta.env.VITE_FUNCTIONS_PAYMENT_REGION ?? "europe-west3").toString();
export const functionsPayment = getFunctions(app, PAYMENT_REGION);

// ✅ Instance Functions pour les triggers/call/telegram (europe-west3 - Twilio, Cloud Tasks, Telegram)
const TRIGGERS_REGION = (import.meta.env.VITE_FUNCTIONS_TRIGGERS_REGION ?? "europe-west3").toString();
export const functionsWest3 = getFunctions(app, TRIGGERS_REGION);

// ✅ Instance Functions pour chatter/influencer/blogger/groupAdmin (europe-west2 - Load balancing)
const AFFILIATE_REGION = (import.meta.env.VITE_FUNCTIONS_AFFILIATE_REGION ?? "europe-west2").toString();
export const functionsWest2 = getFunctions(app, AFFILIATE_REGION);

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
    connectFunctionsEmulator(functionsPayment, EMU_HOST, PORT_FUNC);
  } catch { /* noop */ }
  try {
    connectFunctionsEmulator(functionsWest3, EMU_HOST, PORT_FUNC);
  } catch { /* noop */ }
  try {
    connectFunctionsEmulator(functionsWest2, EMU_HOST, PORT_FUNC);
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
  functionsPaymentRegion: PAYMENT_REGION,
  functionsTriggersRegion: TRIGGERS_REGION,
  functionsAffiliateRegion: AFFILIATE_REGION,
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



