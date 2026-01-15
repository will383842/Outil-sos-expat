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

// Lazy initialization to avoid issues during deployment analysis
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



export const updateProviderActivity = onCall(FUNCTION_OPTIONS, async (request) => {
  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = request.auth.uid;

  // Ensure Firebase Admin is initialized
  ensureInitialized();

  // Initialize Firestore inside the function context to ensure app is ready
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    // Vérifier que l'utilisateur est un prestataire
    const userDoc = await db.collection('users').doc(userId).get();
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
        'Only providers can update activity'
      );
    }

    // Mettre à jour les deux collections en batch
    const batch = db.batch();

    // Mettre à jour sos_profiles (use set with merge to create if missing)
    const profileRef = db.collection('sos_profiles').doc(userId);
    batch.set(profileRef, {
      lastActivity: now,
      lastActivityCheck: now,
    }, { merge: true });

    // Mettre à jour users (use set with merge to be safe, though user doc exists)
    const userRef = db.collection('users').doc(userId);
    batch.set(userRef, {
      lastActivity: now,
      lastActivityCheck: now,
    }, { merge: true });

    await batch.commit();

    console.log(`✅ Activity updated for provider ${userId}`);

    return {
      success: true,
      timestamp: now.toMillis(),
    };
  } catch (error: any) {
    console.error('Error updating provider activity:', error);
    // Return key error details to client for debugging
    throw new HttpsError(
      'internal',
      `Failed to update activity: ${error.message || 'Unknown error'}`
    );
  }
});