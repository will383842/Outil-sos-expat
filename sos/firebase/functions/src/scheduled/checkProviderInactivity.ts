import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { setProviderAvailable } from '../callables/providerStatusManager';
// P2-6 FIX: Use shared constants instead of magic numbers
import { FIRESTORE_BATCH_SAFE_LIMIT } from '../lib/constants';

// Maximum time a provider should remain "busy" before the cron fallback releases them (15 minutes)
// This is slightly longer than the Cloud Tasks-based safety timeout (10 min)
// to give the Cloud Task a chance to fire first
const BUSY_FALLBACK_TIMEOUT_MS = 15 * 60 * 1000;

// Prestataires qui gèrent leur statut manuellement — jamais déconnectés automatiquement
// Julien Valentine (julienvalentine1@gmail.com)
const MANUAL_STATUS_ONLY_IDS = ['DfDbWASBaeaVEZrqg6Wlcd3zpYX2'];

export const checkProviderInactivity = scheduler.onSchedule(
  {
    // 2026-01-19: Toutes les 15 minutes pour mettre hors ligne les prestataires inactifs
    // Le frontend ne peut pas gérer les cas où l'onglet est fermé/arrière-plan
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Paris',
    // ✅ BUG FIX: Ajouter configuration pour éviter les échecs silencieux
    region: 'europe-west3',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 180, // 3 minutes max pour traiter tous les prestataires
  },
  async () => {
    console.log('🔍 Vérification inactivité prestataires...');

    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      // 2026-02-08: Augmenté de 90min à 180min pour être cohérent avec le frontend (T+130 + marge)
      const inactivityThreshold = Date.now() - 180 * 60 * 1000; // 180 minutes = 3h

      // ✅ FIX: Récupérer tous les profils en ligne, puis filtrer en mémoire (plus sûr, pas de dépendance index)
      const onlineProvidersSnapshot = await db
        .collection('sos_profiles')
        .where('isOnline', '==', true)
        .limit(2000)
        .get();

      // Filtrer uniquement les prestataires (lawyers et expats) en mémoire
      // ✅ EXEMPTION AAA: Les profils AAA ne doivent JAMAIS être mis hors ligne automatiquement
      // ✅ EXEMPTION MANUAL_STATUS_ONLY_IDS: Julien Valentine gère son statut manuellement
      const providerDocs = onlineProvidersSnapshot.docs.filter(doc => {
        const data = doc.data();
        const type = data.type;
        const isAAA = data.isAAA === true || doc.id.startsWith('aaa_');

        // Skip les profils AAA - ils restent en ligne jusqu'à mise hors ligne manuelle
        if (isAAA) {
          return false;
        }

        // Skip les prestataires qui gèrent leur statut manuellement
        if (MANUAL_STATUS_ONLY_IDS.includes(doc.id)) {
          return false;
        }

        return type === 'lawyer' || type === 'expat';
      });

      console.log(`📊 ${providerDocs.length} prestataires en ligne à vérifier (sur ${onlineProvidersSnapshot.size} profils)`);

      // P1 FIX: use let + track op count to avoid Firestore 500-ops-per-batch limit
      // Each inactive provider adds up to 2 batch ops (sos_profiles + users)
      let batch = db.batch();
      let batchOpCount = 0;
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

          const offlineUpdate = {
            isOnline: false,
            availability: 'offline',
            lastStatusChange: now,
            lastActivityCheck: now,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // ✅ FIX: Restaurer lastActivityCheck + lastStatusChange pour compatibilité
          batch.update(doc.ref, offlineUpdate);
          batchOpCount++;

          // ✅ FIX: Vérifier si le document users existe avant de le mettre à jour
          const userRef = db.collection('users').doc(doc.id);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            batch.update(userRef, offlineUpdate);
            batchOpCount++;
          } else {
            console.warn(`⚠️ Document users/${doc.id} not found, skipping user update`);
          }

          // P1 FIX: Commit and reset batch before reaching 500-ops Firestore limit
          if (batchOpCount >= FIRESTORE_BATCH_SAFE_LIMIT) {
            await batch.commit();
            batch = db.batch();
            batchOpCount = 0;
          }

          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        console.log(`✅ ${count} prestataires mis hors ligne pour inactivité >180min`);
      } else {
        console.log('✅ Aucun prestataire inactif depuis 180min');
      }

      // =====================================================================
      // 2026-02-09: FALLBACK - Release providers stuck in "busy" state
      // This is a safety net in case the Cloud Tasks-based busySafetyTimeoutTask
      // fails to fire (URL misconfigured, queue issue, Cloud Tasks outage, etc.)
      // =====================================================================
      await releaseStuckBusyProviders(db);

    } catch (error) {
      console.error('❌ Erreur checkProviderInactivity:', error);
      // Re-throw pour que Firebase enregistre l'échec de la fonction
      throw error;
    }
  }
);

/**
 * 2026-02-09: Fallback to release providers stuck in "busy" state for > 15 minutes
 * when the call session is no longer active.
 *
 * This catches cases where:
 * - busySafetyTimeoutTask Cloud Task URL is misconfigured
 * - Cloud Tasks queue is paused or errored
 * - The task was created but never executed
 * - Any other Cloud Tasks failure
 */
async function releaseStuckBusyProviders(db: admin.firestore.Firestore): Promise<void> {
  console.log('🛡️ [BusyFallback] Checking for providers stuck in busy state...');

  try {
    // Query users with availability === 'busy'
    const busyProviders = await db
      .collection('users')
      .where('availability', '==', 'busy')
      .get();

    if (busyProviders.empty) {
      console.log('🛡️ [BusyFallback] No busy providers found');
      return;
    }

    console.log(`🛡️ [BusyFallback] Found ${busyProviders.size} busy providers to evaluate`);
    const nowMs = Date.now();
    let releasedCount = 0;

    for (const providerDoc of busyProviders.docs) {
      const data = providerDoc.data();
      const providerId = providerDoc.id;
      const isAAA = data.isAAA === true || providerId.startsWith('aaa_');

      // Skip AAA profiles - they are test accounts
      if (isAAA) {
        continue;
      }

      // Note: MANUAL_STATUS_ONLY_IDS (Julien Valentine) n'est PAS skipé ici car
      // cette fonction remet en "available" (pas offline) — nécessaire pour débloquer
      // un état "busy" orphelin après un appel manqué

      // Check how long they've been busy
      const busySince = data.busySince?.toMillis?.() || data.lastStatusChange?.toMillis?.() || 0;
      if (busySince === 0) {
        console.log(`🛡️ [BusyFallback] Skip ${providerId}: no busySince timestamp`);
        continue;
      }

      const busyDurationMs = nowMs - busySince;
      const busyDurationMin = Math.round(busyDurationMs / 60000);

      // Only act if busy for > 15 minutes (gives Cloud Tasks timeout of 10 min a chance to fire first)
      if (busyDurationMs < BUSY_FALLBACK_TIMEOUT_MS) {
        console.log(`🛡️ [BusyFallback] Skip ${providerId}: busy for only ${busyDurationMin} min (< 15 min threshold)`);
        continue;
      }

      // Check if the call session is still active
      const callSessionId = data.currentCallSessionId;
      let sessionStillActive = false;

      if (callSessionId) {
        try {
          const sessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
          if (sessionDoc.exists) {
            const sessionStatus = sessionDoc.data()?.status;
            const activeStatuses = ['pending', 'scheduled', 'provider_connecting', 'client_connecting', 'both_connecting', 'active'];
            sessionStillActive = activeStatuses.includes(sessionStatus);

            if (sessionStillActive) {
              console.log(`🛡️ [BusyFallback] Skip ${providerId}: session ${callSessionId} still active (status: ${sessionStatus})`);
              continue;
            }
            console.log(`🛡️ [BusyFallback] Provider ${providerId} busy for ${busyDurationMin} min, session ${callSessionId} is ${sessionStatus} → releasing`);
          } else {
            console.log(`🛡️ [BusyFallback] Provider ${providerId} busy for ${busyDurationMin} min, session ${callSessionId} NOT FOUND → releasing`);
          }
        } catch (sessionError) {
          console.warn(`⚠️ [BusyFallback] Error checking session ${callSessionId}:`, sessionError);
          // Session check failed - still release if busy for a long time (> 30 min)
          if (busyDurationMs < 30 * 60 * 1000) {
            console.log(`🛡️ [BusyFallback] Skip ${providerId}: session check failed and busy < 30 min`);
            continue;
          }
          console.log(`🛡️ [BusyFallback] Provider ${providerId} busy for ${busyDurationMin} min, session check failed → releasing (> 30 min safety)`);
        }
      } else {
        // No callSessionId but busy → definitely stuck
        console.log(`🛡️ [BusyFallback] Provider ${providerId} busy for ${busyDurationMin} min with NO currentCallSessionId → releasing`);
      }

      // Release the provider using setProviderAvailable (handles sibling propagation)
      try {
        const result = await setProviderAvailable(providerId, 'busy_fallback_cron');
        releasedCount++;
        console.log(`✅ [BusyFallback] Released ${providerId}: ${result.previousStatus} → ${result.newStatus}`);
      } catch (releaseError) {
        console.error(`❌ [BusyFallback] Failed to release ${providerId}:`, releaseError);
      }
    }

    if (releasedCount > 0) {
      console.log(`🛡️ [BusyFallback] Released ${releasedCount} stuck busy providers`);
    } else {
      console.log('🛡️ [BusyFallback] No providers needed release');
    }
  } catch (error) {
    // Non-blocking - don't fail the whole cron if busy fallback fails
    console.error('❌ [BusyFallback] Error in releaseStuckBusyProviders:', error);
  }
}