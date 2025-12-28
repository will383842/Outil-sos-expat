import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// S'exécute toutes les 10 minutes
export const checkProviderInactivity = functions.pubsub
  .schedule('*/10 * * * *')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const sixtyMinutesAgo = new Date(now.toMillis() - 60 * 60 * 1000);

    try {
      // Récupérer tous les prestataires en ligne
      const providersSnapshot = await db
        .collection('sos_profiles')
        .where('isOnline', '==', true)
        .where('type', 'in', ['lawyer', 'expat'])
        .get();

      console.log(`Checking ${providersSnapshot.size} online providers`);

      const batch = db.batch();
      let offlineCount = 0;

      for (const doc of providersSnapshot.docs) {
        const provider = doc.data();
        const lastActivity = provider.lastActivity;

        // Si pas de lastActivity ou inactif depuis plus de 60 minutes
        if (!lastActivity || lastActivity.toDate() < sixtyMinutesAgo) {
          console.log(`Setting provider ${doc.id} offline due to inactivity`);

          // Mettre à jour sos_profiles
          batch.update(doc.ref, {
            isOnline: false,
            availability: 'offline',
            lastStatusChange: now,
            lastActivityCheck: now,
          });

          // Mettre à jour users
          const userRef = db.collection('users').doc(doc.id);
          batch.update(userRef, {
            isOnline: false,
            availability: 'offline',
            lastStatusChange: now,
            lastActivityCheck: now,
          });

          offlineCount++;

          // TODO: Envoyer un email de notification au prestataire
          // await sendInactivityEmail(provider.email, provider.fullName);
        }
      }

      if (offlineCount > 0) {
        await batch.commit();
        console.log(`Set ${offlineCount} providers offline due to inactivity`);
      } else {
        console.log('No inactive providers found');
      }

      return null;
    } catch (error) {
      console.error('Error checking provider inactivity:', error);
      throw error;
    }
  });
