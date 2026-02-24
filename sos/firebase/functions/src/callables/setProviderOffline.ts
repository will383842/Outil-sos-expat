import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

const FUNCTION_OPTIONS = {
  region: 'europe-west1' as const,
  cors: ALLOWED_ORIGINS,
  cpu: 0.083,
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

    // ✅ FIX: Vérifier l'existence des documents avant de les mettre à jour
    // batch.update() échoue si le document n'existe pas
    const profileRef = getDb().collection('sos_profiles').doc(userId);
    const profileDoc = await profileRef.get();

    const batch = getDb().batch();

    // Mettre à jour users (on sait qu'il existe car on vient de le lire)
    const userRef = getDb().collection('users').doc(userId);
    batch.update(userRef, offlineUpdate);

    // Mettre à jour sos_profiles SEULEMENT s'il existe
    if (profileDoc.exists) {
      batch.update(profileRef, offlineUpdate);
    } else {
      console.warn(`[setProviderOffline] sos_profiles document not found for user ${userId}, skipping profile update`);
    }

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