import * as admin from "firebase-admin";

// CRITICAL: Skip initialization during Firebase CLI deployment analysis
// Firebase CLI runs the code to detect function exports, but network calls cause 10s timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

// Lazy initialization to avoid deployment timeout
let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Lazy getters for Firebase services
let _db: admin.firestore.Firestore;
let _messaging: admin.messaging.Messaging;
let _storage: admin.storage.Storage;

export function getDb(): admin.firestore.Firestore {
  ensureInitialized();
  if (!_db) _db = admin.firestore();
  return _db;
}

export function getMessaging(): admin.messaging.Messaging {
  ensureInitialized();
  if (!_messaging) _messaging = admin.messaging();
  return _messaging;
}

export function getStorage(): admin.storage.Storage {
  ensureInitialized();
  if (!_storage) _storage = admin.storage();
  return _storage;
}

// DEPRECATED: Keep for backward compatibility but use lazy getters above
// These will fail during deployment analysis but work at runtime
export const db = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

export const messaging = new Proxy({} as admin.messaging.Messaging, {
  get(_target, prop) {
    return (getMessaging() as any)[prop];
  }
});

export const storage = new Proxy({} as admin.storage.Storage, {
  get(_target, prop) {
    return (getStorage() as any)[prop];
  }
});

/** Compat: plusieurs utilitaires importent FieldValue */
export const FieldValue = admin.firestore.FieldValue;
