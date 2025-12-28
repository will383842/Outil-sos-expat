import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const checkProviderInactivity = scheduler.onSchedule(
  {
    schedule: 'every 30 minutes', // ✅ Changé : 30 min au lieu de 15
    timeZone: 'Europe/Paris',
  },
  async () => {
    console.log('🔍 Vérification inactivité prestataires...');

    const db = admin.firestore();
    const twoHoursAgo = Date.now() - 120 * 60 * 1000; // ✅ Changé : 2h = 120 minutes

    const onlineProvidersSnapshot = await db
      .collection('sos_profiles')
      .where('isOnline', '==', true)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of onlineProvidersSnapshot.docs) {
      const data = doc.data();
      const lastActivity = data.lastActivity?.toMillis?.() || 0;

      if (lastActivity < twoHoursAgo) { // ✅ Vérification sur 2h
        console.log(`⏰ Mise hors ligne : ${doc.id} (inactif depuis ${Math.round((Date.now() - lastActivity) / 60000)} minutes)`);
        batch.update(doc.ref, {
          isOnline: false,
          availability: 'offline',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, {
          isOnline: false,
          availability: 'offline',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} prestataires mis hors ligne pour inactivité >2h`);
    } else {
      console.log('✅ Aucun prestataire inactif depuis 2h');
    }
  }
);