import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const setProviderOffline = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = context.auth.uid;
  const now = admin.firestore.Timestamp.now();

  try {
    // Vérifier que l'utilisateur est un prestataire
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const isProvider = 
      userData.type === 'lawyer' || 
      userData.type === 'expat' || 
      userData.role === 'lawyer' || 
      userData.role === 'expat';

    if (!isProvider) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only providers can set offline status'
      );
    }

    // Mettre à jour les deux collections en batch
    const batch = db.batch();

    // Mettre à jour sos_profiles
    const profileRef = db.collection('sos_profiles').doc(userId);
    batch.update(profileRef, {
      isOnline: false,
      availability: 'offline',
      lastStatusChange: now,
      lastActivityCheck: now,
    });

    // Mettre à jour users
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      isOnline: false,
      availability: 'offline',
      lastStatusChange: now,
      lastActivityCheck: now,
    });

    await batch.commit();

    console.log(`Provider ${userId} set offline via popup/reminder`);

    return {
      success: true,
      timestamp: now.toMillis(),
    };
  } catch (error) {
    console.error('Error setting provider offline:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to set offline status'
    );
  }
});
