/**
 * Firebase Configuration for Dashboard Multiprestataire
 * Uses the same Firebase project as SOS Global (sos-urgently-ac307)
 */
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration missing. Check your .env file.');
  throw new Error('Firebase configuration incomplete');
}

// Initialize app (HMR-safe)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth instance
export const auth: Auth = getAuth(app);

// Firestore with persistent cache for offline support
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: 50 * 1024 * 1024, // 50 MB
  }),
});

// Reduce Firestore log noise
setLogLevel('error');

// Cloud Functions - Europe region
const REGION = (import.meta.env.VITE_FUNCTIONS_REGION ?? 'europe-west1').toString();
export const functions = getFunctions(app, REGION);

/**
 * Typed callable function helper
 */
export function call<TPayload, TReturn = unknown>(name: string) {
  return httpsCallable<TPayload, TReturn>(functions, name);
}

console.log('Firebase initialized:', {
  projectId: app.options.projectId,
  region: REGION,
});

export default app;
