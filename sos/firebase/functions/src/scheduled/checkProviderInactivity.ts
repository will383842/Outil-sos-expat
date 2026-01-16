import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const checkProviderInactivity = scheduler.onSchedule(
  {
    // 2025-01-16: Réduit à 1×/jour à 8h pour économies maximales (low traffic)
    schedule: '0 8 * * *', // 8h Paris tous les jours
    timeZone: 'Europe/Paris',
  },
  async () => {
    console.log('🔍 Vérification inactivité prestataires...');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      const twoHoursAgo = Date.now() - 120 * 60 * 1000; // 2h = 120 minutes

      // ✅ FIX: Récupérer tous les profils en ligne, puis filtrer en mémoire (plus sûr, pas de dépendance index)
      const onlineProvidersSnapshot = await db
        .collection('sos_profiles')
        .where('isOnline', '==', true)
        .get();

      // Filtrer uniquement les prestataires (lawyers et expats) en mémoire
      const providerDocs = onlineProvidersSnapshot.docs.filter(doc => {
        const type = doc.data().type;
        return type === 'lawyer' || type === 'expat';
      });

      console.log(`📊 ${providerDocs.length} prestataires en ligne à vérifier (sur ${onlineProvidersSnapshot.size} profils)`);

      const batch = db.batch();
      let count = 0;

      for (const doc of providerDocs) {
        const data = doc.data();
        const lastActivity = data.lastActivity?.toMillis?.() || 0;

        if (lastActivity < twoHoursAgo) {
          const inactiveMinutes = Math.round((Date.now() - lastActivity) / 60000);
          console.log(`⏰ Mise hors ligne : ${doc.id} (inactif depuis ${inactiveMinutes} minutes)`);

          // ✅ FIX: Restaurer lastActivityCheck + lastStatusChange pour compatibilité
          batch.update(doc.ref, {
            isOnline: false,
            availability: 'offline',
            lastStatusChange: now,
            lastActivityCheck: now,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const userRef = db.collection('users').doc(doc.id);
          batch.update(userRef, {
            isOnline: false,
            availability: 'offline',
            lastStatusChange: now,
            lastActivityCheck: now,
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
    } catch (error) {
      console.error('❌ Erreur checkProviderInactivity:', error);
      // Re-throw pour que Firebase enregistre l'échec de la fonction
      throw error;
    }
  }
);