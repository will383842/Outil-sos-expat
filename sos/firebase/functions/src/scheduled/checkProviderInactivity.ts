import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const checkProviderInactivity = scheduler.onSchedule(
  {
    // 2026-01-19: Augmenté à toutes les 15 minutes pour mettre hors ligne les prestataires inactifs
    // Le frontend ne peut pas gérer les cas où l'onglet est fermé/arrière-plan
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Paris',
    // ✅ BUG FIX: Ajouter configuration pour éviter les échecs silencieux
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 180, // 3 minutes max pour traiter tous les prestataires
  },
  async () => {
    console.log('🔍 Vérification inactivité prestataires...');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      // 2026-01-19: Réduit de 2h à 90min pour être cohérent avec le frontend (T+70 + marge)
      const inactivityThreshold = Date.now() - 90 * 60 * 1000; // 90 minutes = 1h30

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
        const lastStatusChange = data.lastStatusChange?.toMillis?.() || 0;

        // ✅ BUG FIX: Protection si lastActivity n'est pas défini (= 0)
        // Évite de mettre hors ligne des prestataires qui viennent de se connecter
        // et dont le champ lastActivity n'a pas encore été initialisé
        if (lastActivity === 0) {
          console.log(`⏭️ Skip ${doc.id}: lastActivity non défini (nouveau prestataire?)`);
          continue;
        }

        // ✅ BUG FIX: Protection améliorée basée sur DEUX critères
        const nowMs = Date.now();
        const recentThreshold = 15 * 60 * 1000; // 15 minutes

        // Protection 1: ne pas mettre hors ligne si le prestataire vient de se mettre en ligne (< 15 min)
        // Cela évite de mettre hors ligne quelqu'un dont lastActivity n'a pas encore été mis à jour
        const recentlyOnline = lastStatusChange > (nowMs - recentThreshold);
        if (recentlyOnline) {
          console.log(`⏭️ Skip ${doc.id}: mis en ligne récemment (${Math.round((nowMs - lastStatusChange) / 60000)} min)`);
          continue;
        }

        // Protection 2: ne pas mettre hors ligne si lastActivity est récent (< 15 min)
        // Même si le calcul principal dit qu'il est inactif, cette protection supplémentaire
        // évite les faux positifs dus à des problèmes de synchronisation de timestamps
        const recentlyActive = lastActivity > (nowMs - recentThreshold);
        if (recentlyActive) {
          console.log(`⏭️ Skip ${doc.id}: activité récente (${Math.round((nowMs - lastActivity) / 60000)} min)`);
          continue;
        }

        if (lastActivity < inactivityThreshold) {
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

          // ✅ FIX: Vérifier si le document users existe avant de le mettre à jour
          const userRef = db.collection('users').doc(doc.id);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            batch.update(userRef, {
              isOnline: false,
              availability: 'offline',
              lastStatusChange: now,
              lastActivityCheck: now,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.warn(`⚠️ Document users/${doc.id} not found, skipping user update`);
          }

          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        console.log(`✅ ${count} prestataires mis hors ligne pour inactivité >90min`);
      } else {
        console.log('✅ Aucun prestataire inactif depuis 90min');
      }
    } catch (error) {
      console.error('❌ Erreur checkProviderInactivity:', error);
      // Re-throw pour que Firebase enregistre l'échec de la fonction
      throw error;
    }
  }
);