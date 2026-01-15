import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Configuration CORS pour autoriser les appels depuis les domaines de production
const FUNCTION_OPTIONS = {
  region: 'europe-west1' as const,
  cors: [
    'https://sos-expat.com',
    'https://www.sos-expat.com',
    'https://ia.sos-expat.com',
    'https://outil-sos-expat.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
};

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

export const setProviderOffline = onCall(FUNCTION_OPTIONS, async (request) => {
  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = request.auth.uid;
  const now = admin.firestore.Timestamp.now();

  try {
    // Vérifier que l'utilisateur est un prestataire
    const userDoc = await getDb().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new HttpsError('not-found', 'User not found');
    }

    const isProvider = 
      userData.type === 'lawyer' || 
      userData.type === 'expat' || 
      userData.role === 'lawyer' || 
      userData.role === 'expat';

    if (!isProvider) {
      throw new HttpsError(
        'permission-denied',
        'Only providers can set offline status'
      );
    }

    // Mettre à jour les deux collections en batch
    const batch = getDb().batch();

    // ✅ P1 FIX: Nettoyer tous les champs de statut d'appel pour éviter les états incohérents
    const offlineUpdate = {
      isOnline: false,
      availability: 'offline',
      lastStatusChange: now,
      lastActivityCheck: now,
      // Nettoyer les champs d'état d'appel
      currentCallSessionId: admin.firestore.FieldValue.delete(),
      busySince: admin.firestore.FieldValue.delete(),
      busyReason: admin.firestore.FieldValue.delete(),
      busyWith: admin.firestore.FieldValue.delete(),
    };

    // Mettre à jour sos_profiles
    const profileRef = getDb().collection('sos_profiles').doc(userId);
    batch.update(profileRef, offlineUpdate);

    // Mettre à jour users
    const userRef = getDb().collection('users').doc(userId);
    batch.update(userRef, offlineUpdate);

    await batch.commit();

    console.log(`Provider ${userId} set offline via popup/reminder`);

    return {
      success: true,
      timestamp: now.toMillis(),
    };
  } catch (error) {
    console.error('Error setting provider offline:', error);
    throw new HttpsError(
      'internal',
      'Failed to set offline status'
    );
  }
});