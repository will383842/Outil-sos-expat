import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

/**
 * AAA Busy Simulation — Simule de l'activité sur la plateforme
 *
 * Cette fonction scheduled tourne toutes les 4 minutes et :
 * 1. Lit la config admin_config/aaa_busy_simulation (si enabled=false → STOP)
 * 2. Libère les profils AAA dont la simulation busy a expiré (> busyDurationMinutes)
 * 3. Met en busy de nouveaux profils AAA aléatoires pour maintenir simultaneousBusy actifs
 *
 * SÉCURITÉ :
 * - N'utilise PAS setProviderBusy() (évite Cloud Tasks, sessions fantômes)
 * - Écrit directement dans Firestore via batch write (users + sos_profiles)
 * - Champ marqueur `aaaBusySimulatedAt` pour distinguer simulation vs vrai busy
 * - Ne touche JAMAIS un AAA qui a un vrai appel en cours (currentCallSessionId)
 * - Les AAA sont exemptés de checkProviderInactivity → pas de conflit
 * - Ne met PAS de currentCallSessionId → évite toute interférence avec les safety nets
 *
 * RÉGION : europe-west3 (même région que les fonctions de statut)
 */

interface SimulationConfig {
  enabled: boolean;
  simultaneousBusy: number;
  busyDurationMinutes: number;
  updatedAt?: admin.firestore.Timestamp;
  updatedBy?: string;
}

const DEFAULT_CONFIG: SimulationConfig = {
  enabled: false,
  simultaneousBusy: 5,
  busyDurationMinutes: 20,
};

// Limite safe pour les batch writes Firestore (max 500 ops, on garde une marge)
const BATCH_SAFE_LIMIT = 450;

export const aaaBusySimulation = scheduler.onSchedule(
  {
    schedule: 'every 4 minutes',
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
    maxInstances: 1,
    minInstances: 0,
  },
  async () => {
    try {
      const db = admin.firestore();

      // 1. Lire la configuration
      const configSnap = await db.doc('admin_config/aaa_busy_simulation').get();
      const config: SimulationConfig = configSnap.exists
        ? { ...DEFAULT_CONFIG, ...configSnap.data() }
        : DEFAULT_CONFIG;

      if (!config.enabled) {
        // Si désactivé, libérer tous les busy simulés restants
        await releaseAllSimulatedBusy(db);
        return;
      }

      console.log(`🤖 [AAA Simulation] Démarrage — target: ${config.simultaneousBusy} busy, durée: ${config.busyDurationMinutes}min`);

      // 2. Récupérer TOUS les profils AAA (single field query, auto-indexé)
      const aaaSnapshot = await db
        .collection('sos_profiles')
        .where('isAAA', '==', true)
        .get();

      if (aaaSnapshot.empty) {
        console.log('🤖 [AAA Simulation] Aucun profil AAA trouvé');
        return;
      }

      const now = admin.firestore.Timestamp.now();
      const nowMs = now.toMillis();
      const busyDurationMs = config.busyDurationMinutes * 60 * 1000;

      // Catégoriser les profils AAA
      const simulatedBusy: admin.firestore.QueryDocumentSnapshot[] = [];
      const expiredBusy: admin.firestore.QueryDocumentSnapshot[] = [];
      const availableForSimulation: admin.firestore.QueryDocumentSnapshot[] = [];

      for (const doc of aaaSnapshot.docs) {
        const data = doc.data();
        const simulatedAt = data.aaaBusySimulatedAt?.toMillis?.() || 0;

        // A un vrai appel en cours → ne JAMAIS toucher
        if (data.currentCallSessionId) {
          continue;
        }

        if (simulatedAt > 0) {
          // Ce profil est en busy simulé
          if (nowMs - simulatedAt >= busyDurationMs) {
            // Expiré → à libérer
            expiredBusy.push(doc);
          } else {
            // Encore actif
            simulatedBusy.push(doc);
          }
        } else if (data.availability !== 'busy') {
          // Disponible pour simulation (pas déjà busy par un vrai appel)
          // On accepte les profiles offline aussi — la simulation les met online
          availableForSimulation.push(doc);
        }
      }

      console.log(`🤖 [AAA Simulation] État: ${simulatedBusy.length} busy actifs, ${expiredBusy.length} expirés, ${availableForSimulation.length} disponibles`);

      // 3. Libérer les profils expirés
      if (expiredBusy.length > 0) {
        let releaseBatch = db.batch();
        let releaseOpCount = 0;

        for (const doc of expiredBusy) {
          const releaseData = buildReleaseData(now);
          releaseBatch.update(doc.ref, releaseData);
          releaseBatch.update(db.collection('users').doc(doc.id), releaseData);
          releaseOpCount += 2;

          if (releaseOpCount >= BATCH_SAFE_LIMIT) {
            await releaseBatch.commit();
            releaseBatch = db.batch();
            releaseOpCount = 0;
          }
        }

        if (releaseOpCount > 0) {
          await releaseBatch.commit();
        }
        console.log(`🤖 [AAA Simulation] ✅ ${expiredBusy.length} profils libérés (busy expiré)`);
      }

      // 4. Calculer combien de nouveaux busy sont nécessaires
      const currentActiveBusy = simulatedBusy.length;
      const needed = Math.max(0, config.simultaneousBusy - currentActiveBusy);

      if (needed === 0) {
        console.log(`🤖 [AAA Simulation] ✅ Déjà ${currentActiveBusy} busy actifs, rien à faire`);
        return;
      }

      if (availableForSimulation.length === 0) {
        console.log(`🤖 [AAA Simulation] ⚠️ Besoin de ${needed} nouveaux busy mais aucun profil AAA disponible`);
        return;
      }

      // 5. Piocher aléatoirement parmi les disponibles
      const shuffled = availableForSimulation.sort(() => Math.random() - 0.5);
      const toMakeBusy = shuffled.slice(0, Math.min(needed, shuffled.length));

      // 6. Mettre en busy avec décalage naturel
      // On étale les aaaBusySimulatedAt dans le passé pour que les expirations
      // soient décalées dans le temps (rotation continue, pas tous en même temps)
      const staggerMs = Math.floor(busyDurationMs / (config.simultaneousBusy + 1));
      let busyBatch = db.batch();
      let busyOpCount = 0;

      for (let i = 0; i < toMakeBusy.length; i++) {
        const doc = toMakeBusy[i];
        // Décaler le timestamp de simulation pour créer un effet de rotation
        // Les premiers profils auront un simulatedAt plus ancien → expireront plus tôt
        const staggerOffset = i * staggerMs;
        const simulatedAt = admin.firestore.Timestamp.fromMillis(nowMs - staggerOffset);

        const busyData: Record<string, any> = {
          availability: 'busy',
          isOnline: true,
          isActive: true,
          busySince: simulatedAt,
          busyReason: 'in_call',
          busyBySibling: false,
          aaaBusySimulatedAt: simulatedAt,
          lastStatusChange: now,
          lastActivityCheck: now,
          lastActivity: now,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        busyBatch.update(doc.ref, busyData);
        busyBatch.update(db.collection('users').doc(doc.id), busyData);
        busyOpCount += 2;

        if (busyOpCount >= BATCH_SAFE_LIMIT) {
          await busyBatch.commit();
          busyBatch = db.batch();
          busyOpCount = 0;
        }

        console.log(`🤖 [AAA Simulation] → ${doc.id} mis en busy (stagger: -${Math.round(staggerOffset / 60000)}min)`);
      }

      if (busyOpCount > 0) {
        await busyBatch.commit();
      }
      console.log(`🤖 [AAA Simulation] ✅ ${toMakeBusy.length} nouveaux profils en busy (total actif: ${currentActiveBusy + toMakeBusy.length})`);

    } catch (error) {
      console.error('❌ [AAA Simulation] Erreur:', error);
      throw error; // Re-throw pour que Firebase enregistre l'échec
    }
  }
);

/**
 * Construit l'objet de release pour remettre un profil en available.
 * Supprime tous les champs busy pour un nettoyage complet.
 */
function buildReleaseData(now: admin.firestore.Timestamp): Record<string, any> {
  return {
    availability: 'available',
    isOnline: true,
    isActive: true,
    busySince: admin.firestore.FieldValue.delete(),
    busyReason: admin.firestore.FieldValue.delete(),
    busyBySibling: admin.firestore.FieldValue.delete(),
    busySiblingProviderId: admin.firestore.FieldValue.delete(),
    busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
    aaaBusySimulatedAt: admin.firestore.FieldValue.delete(),
    lastStatusChange: now,
    lastActivityCheck: now,
    lastActivity: now,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Libère TOUS les profils AAA en busy simulé.
 * Appelé quand la simulation est désactivée (enabled=false).
 */
async function releaseAllSimulatedBusy(db: admin.firestore.Firestore): Promise<void> {
  try {
    const simulatedSnapshot = await db
      .collection('sos_profiles')
      .where('isAAA', '==', true)
      .get();

    if (simulatedSnapshot.empty) return;

    const now = admin.firestore.Timestamp.now();
    let releasedCount = 0;
    let batch = db.batch();
    let opCount = 0;

    for (const doc of simulatedSnapshot.docs) {
      const data = doc.data();
      // Ne libérer que les profils effectivement en simulation busy
      if (!data.aaaBusySimulatedAt || data.availability !== 'busy') continue;

      const releaseData = buildReleaseData(now);
      batch.update(doc.ref, releaseData);
      batch.update(db.collection('users').doc(doc.id), releaseData);
      opCount += 2;
      releasedCount++;

      if (opCount >= BATCH_SAFE_LIMIT) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    if (releasedCount > 0) {
      console.log(`🤖 [AAA Simulation] Désactivée — ${releasedCount} profils libérés`);
    }
  } catch (error) {
    console.error('❌ [AAA Simulation] Erreur lors de la libération:', error);
    throw error;
  }
}
