/**
 * Provider Status Manager
 *
 * Gestion atomique du statut des prestataires (available/busy/offline)
 * pendant les sessions d'appel.
 *
 * Utilisé par:
 * - TwilioCallManager: quand un prestataire répond/termine un appel
 * - twilioWebhooks: sur les événements answered/completed/failed
 * - cleanupOrphanedSessions: pour nettoyer les statuts orphelins
 */

import * as admin from 'firebase-admin';
import { logError } from '../utils/logs/logError';
import { scheduleBusySafetyTimeoutTask, cancelBusySafetyTimeoutTask } from '../lib/tasks';

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

// =============================
// Types
// =============================

export type AvailabilityStatus = 'available' | 'busy' | 'offline';

export type BusyReason = 'in_call' | 'pending_call' | 'break' | 'offline' | 'manually_disabled';

export interface ProviderStatusResponse {
  success: boolean;
  providerId: string;
  previousStatus: AvailabilityStatus;
  newStatus: AvailabilityStatus;
  timestamp: number;
  message?: string;
  error?: string;
}

export interface ProviderStatusOptions {
  callSessionId?: string;
  reason?: BusyReason | string;
  skipAuditLog?: boolean;
}

// =============================
// Helper: lookup du compte parent multi-prestataire
// =============================

/**
 * Recherche le compte parent (propriétaire) qui contient ce providerId
 * dans son linkedProviderIds.
 *
 * Contexte du bug: Dans l'admin multi-prestataires, shareBusyStatus et
 * linkedProviderIds sont stockés sur le document users/{accountOwnerId},
 * PAS sur users/{providerId}. Donc quand setProviderBusy/setProviderAvailable
 * lit users/{providerId}, ces champs sont absents → pas de propagation.
 *
 * Cette fonction fait une query array-contains pour retrouver le parent.
 *
 * @param providerId - ID du prestataire
 * @returns { linkedProviderIds, shareBusyStatus } ou null si pas de parent
 */
async function findParentAccountConfig(
  providerId: string
): Promise<{ linkedProviderIds: string[]; shareBusyStatus: boolean } | null> {
  try {
    const db = getDb();
    const parentQuery = await db
      .collection('users')
      .where('linkedProviderIds', 'array-contains', providerId)
      .limit(1)
      .get();

    if (parentQuery.empty) {
      return null;
    }

    const parentDoc = parentQuery.docs[0];
    const parentData = parentDoc.data();
    const linkedProviderIds: string[] = parentData?.linkedProviderIds || [];
    const shareBusyStatus: boolean = parentData?.shareBusyStatus === true;

    console.log(`🔗 [findParentAccountConfig] Found parent account ${parentDoc.id} for provider ${providerId}`);
    console.log(`🔗   linkedProviderIds: [${linkedProviderIds.join(', ')}]`);
    console.log(`🔗   shareBusyStatus: ${shareBusyStatus}`);

    return { linkedProviderIds, shareBusyStatus };
  } catch (error) {
    console.error(`⚠️ [findParentAccountConfig] Error looking up parent account for ${providerId}:`, error);
    return null;
  }
}

// =============================
// Fonctions principales
// =============================

/**
 * Met un prestataire en statut "busy" (en appel)
 * Si shareBusyStatus est activé, propage aux autres prestataires liés
 *
 * ✅ BUG FIX: Utilise runTransaction pour garantir l'atomicité read-modify-write
 * et éviter les race conditions entre lecture du statut et mise à jour
 *
 * @param providerId - ID du prestataire
 * @param callSessionId - ID de la session d'appel
 * @param reason - Raison de l'indisponibilité (default: 'in_call')
 * @returns Résultat de l'opération
 */
export async function setProviderBusy(
  providerId: string,
  callSessionId: string,
  reason: BusyReason = 'in_call'
): Promise<ProviderStatusResponse> {
  const now = admin.firestore.Timestamp.now();
  const logId = `busy_${Date.now().toString(36)}`;

  console.log(`\n${'🔶'.repeat(35)}`);
  console.log(`🔶 [${logId}] setProviderBusy CALLED`);
  console.log(`🔶 [${logId}]   providerId: ${providerId}`);
  console.log(`🔶 [${logId}]   callSessionId: ${callSessionId}`);
  console.log(`🔶 [${logId}]   reason: ${reason}`);
  console.log(`${'🔶'.repeat(35)}`);

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(providerId);
    const profileRef = db.collection('sos_profiles').doc(providerId);

    // ✅ BUG FIX: Utiliser une transaction pour garantir l'atomicité read-modify-write
    // Cela évite les race conditions où le statut change entre lecture et écriture
    const transactionResult = await db.runTransaction(async (transaction) => {
      // 1. Lire les documents dans la transaction
      const userDoc = await transaction.get(userRef);
      const profileDoc = await transaction.get(profileRef);

      if (!userDoc.exists) {
        console.warn(`🔶 [${logId}] ❌ Provider not found: ${providerId}`);
        return {
          success: false,
          providerId,
          previousStatus: 'offline' as AvailabilityStatus,
          newStatus: 'busy' as AvailabilityStatus,
          timestamp: now.toMillis(),
          error: 'Provider not found',
          skipPropagation: true,
        };
      }
      console.log(`🔶 [${logId}] ✅ Provider found in users collection`);

      const userData = userDoc.data();
      const previousStatus: AvailabilityStatus =
        (userData?.availability as AvailabilityStatus) || 'available';

      console.log(`🔶 [${logId}] Current status: ${previousStatus}, isOnline: ${userData?.isOnline}`);

      // 2. Vérifier si déjà busy
      if (previousStatus === 'busy') {
        // Si le provider est busy par un sibling, on peut l'écraser avec son propre appel
        if (userData?.busyBySibling === true) {
          console.log(`🔶 [${logId}] Provider was busyBySibling, now in own call - will update`);
          // Continue pour mettre à jour avec son propre appel
        } else if (userData?.busyReason === 'pending_call' && reason === 'in_call') {
          // P0 FIX: Permettre upgrade de pending_call vers in_call
          console.log(`🔶 [${logId}] Provider upgrading from pending_call to in_call - will update`);
          // Continue pour mettre à jour avec in_call
        } else {
          console.log(`🔶 [${logId}] Provider already busy (own call) - skipping update`);
          return {
            success: true,
            providerId,
            previousStatus: 'busy' as AvailabilityStatus,
            newStatus: 'busy' as AvailabilityStatus,
            timestamp: now.toMillis(),
            message: 'Provider already busy',
            skipPropagation: true,
          };
        }
      }

      // 3. Préparer les données de mise à jour
      // ✅ BUG FIX: Sauvegarder si le prestataire était offline AVANT l'appel
      // pour pouvoir le remettre offline après l'appel (respecter son intention)
      const wasOfflineBeforeCall = previousStatus === 'offline' || userData?.isOnline === false;

      const updateData = {
        availability: 'busy',
        // ✅ BUG FIX: Ne PAS forcer isOnline: true si le prestataire était offline
        // Un prestataire offline ne devrait pas recevoir d'appel, mais si ça arrive
        // (race condition), on sauvegarde son intention pour la restaurer après
        isOnline: wasOfflineBeforeCall ? false : true,
        currentCallSessionId: callSessionId,
        busySince: now,
        busyReason: reason,
        busyBySibling: false, // Ce prestataire est directement en appel
        // ✅ BUG FIX: Sauvegarder l'intention pour setProviderAvailable
        wasOfflineBeforeCall: wasOfflineBeforeCall,
        lastStatusChange: now,
        lastActivityCheck: now,
        // ✅ BUG FIX: Toujours définir lastActivity pour que checkProviderInactivity fonctionne
        lastActivity: now,
        updatedAt: now,
      };

      // 4. Mettre à jour dans la transaction
      transaction.update(userRef, updateData);

      if (profileDoc.exists) {
        transaction.update(profileRef, updateData);
      }

      // Log d'audit (créer un nouveau document)
      const auditLogRef = db.collection('provider_status_logs').doc();
      transaction.set(auditLogRef, {
        providerId,
        action: 'SET_BUSY',
        previousStatus,
        newStatus: 'busy',
        callSessionId,
        reason,
        timestamp: now,
      });

      console.log(`🔶 [${logId}] Transaction prepared, committing...`);

      return {
        success: true,
        providerId,
        previousStatus,
        newStatus: 'busy' as AvailabilityStatus,
        timestamp: now.toMillis(),
        message: `Provider status changed from ${previousStatus} to busy`,
        linkedProviderIds: userData?.linkedProviderIds || [],
        shareBusyStatus: userData?.shareBusyStatus === true,
        // ✅ PERF FIX: Track if the provider doc has a linkedProviderIds field at all
        // If the field exists (even as []), the provider has been denormalized → no parent lookup needed
        // If absent (undefined), we may need a parent lookup for non-denormalized providers
        hasMultiProviderConfig: Array.isArray(userData?.linkedProviderIds),
        skipPropagation: false,
      };
    });

    console.log(`🔶 [${logId}] ═══════════════════════════════════════════════════════════`);
    console.log(`🔶 [${logId}] ✅ SUCCESS: Provider ${providerId} set to BUSY`);
    console.log(`🔶 [${logId}]   previousStatus: ${transactionResult.previousStatus}`);
    console.log(`🔶 [${logId}]   newStatus: busy`);
    console.log(`🔶 [${logId}]   callSessionId: ${callSessionId}`);
    console.log(`🔶 [${logId}]   reason: ${reason}`);
    console.log(`🔶 [${logId}] ═══════════════════════════════════════════════════════════`);

    // 5. Propager aux prestataires liés si shareBusyStatus est activé
    // (fait en dehors de la transaction pour éviter les deadlocks)
    //
    // ✅ BUG FIX 2026-02-05: Si linkedProviderIds/shareBusyStatus ne sont pas sur le
    // document du provider (cas multi-prestataire où ces champs sont sur le compte parent),
    // on fait un lookup du compte parent pour retrouver la config.
    //
    // ✅ PERF FIX: Skip parent lookup if the provider doc already has a linkedProviderIds field
    // (even if empty → standalone provider, denormalized). Only lookup if field is absent entirely.
    let effectiveLinkedProviderIds = transactionResult.linkedProviderIds || [];
    let effectiveShareBusyStatus = transactionResult.shareBusyStatus === true;

    if (
      !transactionResult.skipPropagation &&
      !transactionResult.hasMultiProviderConfig &&
      (!effectiveShareBusyStatus || effectiveLinkedProviderIds.length === 0)
    ) {
      console.log(`🔗 [${logId}] Provider ${providerId} has no linkedProviderIds field on own doc, checking parent account...`);
      const parentConfig = await findParentAccountConfig(providerId);
      if (parentConfig) {
        effectiveLinkedProviderIds = parentConfig.linkedProviderIds;
        effectiveShareBusyStatus = parentConfig.shareBusyStatus;
        console.log(`🔗 [${logId}] Using parent account config: shareBusyStatus=${effectiveShareBusyStatus}, linkedProviderIds=[${effectiveLinkedProviderIds.join(', ')}]`);

        // ✅ SELF-HEALING: Write parent config back to provider's own docs
        // so future calls can read directly without parent lookup
        try {
          const selfHealData = {
            linkedProviderIds: parentConfig.linkedProviderIds,
            shareBusyStatus: parentConfig.shareBusyStatus,
          };
          await Promise.all([
            db.collection('users').doc(providerId).update(selfHealData),
            db.collection('sos_profiles').doc(providerId).update(selfHealData).catch(() => {}),
          ]);
          console.log(`🔧 [${logId}] Self-healed: wrote parent config to provider ${providerId}'s own docs`);
        } catch (selfHealErr) {
          console.warn(`⚠️ [${logId}] Self-heal failed (non-blocking):`, selfHealErr);
        }
      } else {
        console.log(`🔗 [${logId}] No parent account found - provider is standalone`);
        // ✅ PERF FIX: Mark standalone provider to avoid future lookups
        try {
          const standaloneData = { linkedProviderIds: [], shareBusyStatus: false };
          await Promise.all([
            db.collection('users').doc(providerId).update(standaloneData),
            db.collection('sos_profiles').doc(providerId).update(standaloneData).catch(() => {}),
          ]);
          console.log(`🔧 [${logId}] Marked provider ${providerId} as standalone (no future lookups)`);
        } catch (standaloneErr) {
          console.warn(`⚠️ [${logId}] Failed to mark standalone (non-blocking):`, standaloneErr);
        }
      }
    }

    if (
      !transactionResult.skipPropagation &&
      effectiveShareBusyStatus &&
      effectiveLinkedProviderIds.length > 0
    ) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, propagating to ${effectiveLinkedProviderIds.length} linked providers`);
      await propagateBusyToSiblings(providerId, effectiveLinkedProviderIds, callSessionId, now);
    }

    // 6. Schedule busy safety timeout task (non-blocking)
    // This is a safety net that will release the provider if stuck in busy state
    // after 10 minutes (if the call session is not active anymore)
    if (transactionResult.success && !transactionResult.skipPropagation) {
      try {
        console.log(`🛡️ [${logId}] Scheduling busy safety timeout task for provider ${providerId}...`);
        const safetyTaskId = await scheduleBusySafetyTimeoutTask(providerId, callSessionId);
        console.log(`🛡️ [${logId}] Busy safety timeout scheduled: ${safetyTaskId}`);

        // Store the taskId in the provider document so we can cancel it later
        if (safetyTaskId && !safetyTaskId.startsWith('skipped_') && !safetyTaskId.startsWith('error_')) {
          const db = getDb();
          const updateTaskId = { busySafetyTimeoutTaskId: safetyTaskId };
          await Promise.all([
            db.collection('users').doc(providerId).update(updateTaskId),
            db.collection('sos_profiles').doc(providerId).update(updateTaskId).catch(() => {/* ignore if not exists */}),
          ]);
          console.log(`🛡️ [${logId}] Stored busySafetyTimeoutTaskId: ${safetyTaskId}`);
        }
      } catch (safetyError) {
        // Non-blocking - log error but don't fail the main operation
        console.warn(`⚠️ [${logId}] Failed to schedule busy safety timeout (non-blocking):`, safetyError);
      }
    }

    return {
      success: transactionResult.success,
      providerId: transactionResult.providerId,
      previousStatus: transactionResult.previousStatus,
      newStatus: transactionResult.newStatus,
      timestamp: transactionResult.timestamp,
      message: transactionResult.message,
      error: transactionResult.error,
    };

  } catch (error) {
    console.error(`🔶 [${logId}] ❌ ERROR setting provider busy:`, error);
    console.error(`🔶 [${logId}]   providerId: ${providerId}`);
    console.error(`🔶 [${logId}]   callSessionId: ${callSessionId}`);
    console.error(`🔶 [${logId}]   error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await logError('providerStatusManager:setProviderBusy', error as unknown);

    return {
      success: false,
      providerId,
      previousStatus: 'available',
      newStatus: 'busy',
      timestamp: now.toMillis(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Propage le statut busy aux prestataires liés (siblings)
 * Ces prestataires sont marqués avec busyBySibling=true
 */
async function propagateBusyToSiblings(
  originProviderId: string,
  linkedProviderIds: string[],
  callSessionId: string,
  now: admin.firestore.Timestamp
): Promise<void> {
  const batch = getDb().batch();
  let propagatedCount = 0;

  // P1 FIX: Fetch all sibling docs in parallel instead of sequential N+1 reads
  const siblingIds = linkedProviderIds.filter(id => id !== originProviderId);
  if (siblingIds.length === 0) return;

  const [siblingUserDocs, siblingProfileDocs] = await Promise.all([
    Promise.all(siblingIds.map(id => getDb().collection('users').doc(id).get())),
    Promise.all(siblingIds.map(id => getDb().collection('sos_profiles').doc(id).get())),
  ]);

  for (let i = 0; i < siblingIds.length; i++) {
    const siblingId = siblingIds[i];
    const siblingUserDoc = siblingUserDocs[i];
    const siblingProfileDoc = siblingProfileDocs[i];

    try {
      if (!siblingUserDoc.exists) {
        console.warn(`[ProviderStatusManager] Sibling provider not found: ${siblingId}`);
        continue;
      }

      const siblingData = siblingUserDoc.data();
      const siblingStatus = siblingData?.availability;

      // Ne pas écraser si déjà busy (en appel direct ou par autre sibling)
      if (siblingStatus === 'busy') {
        console.log(`[ProviderStatusManager] Sibling ${siblingId} already busy, skipping`);
        continue;
      }

      // 🆕 Vérifier si ce prestataire a désactivé le couplage individuel
      // receiveBusyFromSiblings: false = ne pas propager le busy à ce prestataire
      if (siblingData?.receiveBusyFromSiblings === false) {
        console.log(`[ProviderStatusManager] Sibling ${siblingId} has receiveBusyFromSiblings=false, skipping propagation`);
        continue;
      }

      // 🔒 Vérifier si ce prestataire est verrouillé hors ligne
      // lockedOffline: true = ne jamais mettre en ligne ou propager le busy
      if (siblingData?.lockedOffline === true) {
        console.log(`[ProviderStatusManager] Sibling ${siblingId} is locked offline 🔒, skipping propagation`);
        continue;
      }

      const siblingUpdateData = {
        availability: 'busy',
        isOnline: true,
        // ✅ BUG FIX: Toujours définir lastActivity lors de isOnline=true
        // pour que checkProviderInactivity puisse calculer l'inactivité correctement
        lastActivity: now,
        busySince: now,
        busyReason: 'sibling_in_call',
        busyBySibling: true,
        busySiblingProviderId: originProviderId,
        busySiblingCallSessionId: callSessionId,
        lastStatusChange: now,
        updatedAt: now,
      };

      // Mettre à jour users
      const siblingUserRef = getDb().collection('users').doc(siblingId);
      batch.update(siblingUserRef, siblingUpdateData);

      // Mettre à jour sos_profiles
      const siblingProfileRef = getDb().collection('sos_profiles').doc(siblingId);
      if (siblingProfileDoc.exists) {
        batch.update(siblingProfileRef, siblingUpdateData);
      }

      // Log d'audit
      batch.set(getDb().collection('provider_status_logs').doc(), {
        providerId: siblingId,
        action: 'SET_BUSY_BY_SIBLING',
        previousStatus: siblingStatus || 'available',
        newStatus: 'busy',
        originProviderId,
        callSessionId,
        timestamp: now,
      });

      propagatedCount++;
    } catch (err) {
      console.error(`[ProviderStatusManager] Error propagating to sibling ${siblingId}:`, err);
    }
  }

  if (propagatedCount > 0) {
    await batch.commit();
    console.log(`✅ [ProviderStatusManager] Propagated busy status to ${propagatedCount} siblings`);
  }
}

/**
 * Remet un prestataire en statut "available" (disponible)
 * Si le prestataire a shareBusyStatus activé, libère aussi les siblings
 *
 * @param providerId - ID du prestataire
 * @param reason - Raison du changement (pour audit)
 * @returns Résultat de l'opération
 */
export async function setProviderAvailable(
  providerId: string,
  reason: string = 'call_completed'
): Promise<ProviderStatusResponse> {
  const now = admin.firestore.Timestamp.now();

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(providerId);
    const profileRef = db.collection('sos_profiles').doc(providerId);

    // ✅ BUG FIX: Utiliser une transaction pour garantir l'atomicité read-modify-write
    // Cela évite les race conditions où le statut change entre lecture et écriture
    const transactionResult = await db.runTransaction(async (transaction) => {
      // 1. Lire les documents dans la transaction
      const userDoc = await transaction.get(userRef);
      const profileDoc = await transaction.get(profileRef);

      if (!userDoc.exists) {
        console.warn(`[ProviderStatusManager] Provider not found: ${providerId}`);
        return {
          success: false,
          providerId,
          previousStatus: 'offline' as AvailabilityStatus,
          newStatus: 'available' as AvailabilityStatus,
          timestamp: now.toMillis(),
          error: 'Provider not found',
          skipSiblingRelease: true,
        };
      }

      const userData = userDoc.data();
      const previousStatus: AvailabilityStatus =
        (userData?.availability as AvailabilityStatus) || 'offline';

      // 2. Vérifier si déjà available
      if (previousStatus === 'available') {
        console.log(`[ProviderStatusManager] Provider ${providerId} already available`);
        return {
          success: true,
          providerId,
          previousStatus: 'available' as AvailabilityStatus,
          newStatus: 'available' as AvailabilityStatus,
          timestamp: now.toMillis(),
          message: 'Provider already available',
          skipSiblingRelease: true,
        };
      }

      // P0 FIX 2026-01-21: Si le provider est OFFLINE mais a été mis OFFLINE par le système
      // (punition pour no_answer), on doit quand même le remettre disponible après le cooldown.
      // On vérifie le champ offlineReason qui est set par TwilioCallManager lors d'un provider_no_answer.
      //
      // Scénario bug: Provider no_answer → setProviderOffline (avec offlineReason) → 5min cooldown → setProviderAvailable
      // Avant: setProviderAvailable ignorait les OFFLINE → provider bloqué pour toujours
      // Après: Si offlineReason existe, c'est un offline forcé → on débloque
      if (previousStatus === 'offline') {
        const offlineReason = userData?.offlineReason;

        if (!offlineReason) {
          // Offline volontaire (le provider a choisi d'être offline) - ne pas changer
          console.log(`[ProviderStatusManager] Provider ${providerId} is voluntarily offline - NOT setting to available`);
          return {
            success: true,
            providerId,
            previousStatus: 'offline' as AvailabilityStatus,
            newStatus: 'offline' as AvailabilityStatus,
            timestamp: now.toMillis(),
            message: 'Provider is voluntarily offline, not changing status',
            skipSiblingRelease: true,
          };
        }

        // Offline forcé (punition no_answer) - continuer pour le remettre disponible
        console.log(`[ProviderStatusManager] Provider ${providerId} is FORCE offline (offlineReason: ${offlineReason}) - will set to available`);
      }

      // ✅ BUG FIX: Vérifier si le prestataire voulait être offline AVANT l'appel
      // Si oui, le remettre offline au lieu de available
      const wasOfflineBeforeCall = userData?.wasOfflineBeforeCall === true;
      const targetStatus = wasOfflineBeforeCall ? 'offline' : 'available';
      const targetIsOnline = !wasOfflineBeforeCall;

      if (wasOfflineBeforeCall) {
        console.log(`[ProviderStatusManager] Provider ${providerId} was offline before call - restoring offline status`);
      }

      // 3. Préparer les données de mise à jour
      // Get the safety timeout task ID before clearing it (to cancel it later)
      const busySafetyTimeoutTaskId = userData?.busySafetyTimeoutTaskId;

      const updateData = {
        availability: targetStatus,
        isOnline: targetIsOnline,
        currentCallSessionId: admin.firestore.FieldValue.delete(),
        busySince: admin.firestore.FieldValue.delete(),
        busyReason: admin.firestore.FieldValue.delete(),
        busyBySibling: admin.firestore.FieldValue.delete(),
        busySiblingProviderId: admin.firestore.FieldValue.delete(),
        busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
        // ✅ BUG FIX: Nettoyer le flag après utilisation
        wasOfflineBeforeCall: admin.firestore.FieldValue.delete(),
        // P0 FIX 2026-01-21: Nettoyer les champs offline forcé
        offlineReason: admin.firestore.FieldValue.delete(),
        offlineSince: admin.firestore.FieldValue.delete(),
        // Clean up safety timeout task ID
        busySafetyTimeoutTaskId: admin.firestore.FieldValue.delete(),
        lastStatusChange: now,
        lastActivityCheck: now,
        lastActivity: now,
        updatedAt: now,
      };

      // 4. Mettre à jour dans la transaction
      transaction.update(userRef, updateData);

      if (profileDoc.exists) {
        transaction.update(profileRef, updateData);
      }

      // Log d'audit
      const auditLogRef = db.collection('provider_status_logs').doc();
      transaction.set(auditLogRef, {
        providerId,
        action: wasOfflineBeforeCall ? 'RESTORE_OFFLINE' : 'SET_AVAILABLE',
        previousStatus,
        newStatus: targetStatus,
        reason,
        wasOfflineBeforeCall,
        timestamp: now,
      });

      return {
        success: true,
        providerId,
        previousStatus,
        newStatus: targetStatus as AvailabilityStatus,
        timestamp: now.toMillis(),
        message: `Provider status changed from ${previousStatus} to ${targetStatus}`,
        linkedProviderIds: userData?.linkedProviderIds || [],
        shareBusyStatus: userData?.shareBusyStatus === true,
        hasMultiProviderConfig: Array.isArray(userData?.linkedProviderIds),
        skipSiblingRelease: false,
        busySafetyTimeoutTaskId: busySafetyTimeoutTaskId || null,
      };
    });

    console.log(`✅ [ProviderStatusManager] Provider ${providerId} set to ${transactionResult.newStatus.toUpperCase()} (reason: ${reason})`);

    // 5.5 Cancel the busy safety timeout task if it exists (non-blocking)
    if (transactionResult.busySafetyTimeoutTaskId) {
      try {
        console.log(`🛡️ [ProviderStatusManager] Cancelling busy safety timeout task: ${transactionResult.busySafetyTimeoutTaskId}`);
        await cancelBusySafetyTimeoutTask(transactionResult.busySafetyTimeoutTaskId);
        console.log(`✅ [ProviderStatusManager] Busy safety timeout task cancelled`);
      } catch (cancelError) {
        // Non-blocking - task might already be executed or deleted
        console.warn(`⚠️ [ProviderStatusManager] Failed to cancel busy safety timeout task (non-blocking):`, cancelError);
      }
    }

    // 5. Libérer les siblings si shareBusyStatus est activé
    // (fait en dehors de la transaction pour éviter les deadlocks)
    //
    // ✅ BUG FIX 2026-02-05: Même logique que setProviderBusy - lookup du parent
    // si linkedProviderIds/shareBusyStatus ne sont pas sur le document du provider.
    // ✅ PERF FIX: Skip parent lookup if provider doc already has linkedProviderIds field.
    let effectiveLinkedProviderIds = transactionResult.linkedProviderIds || [];
    let effectiveShareBusyStatus = transactionResult.shareBusyStatus === true;

    if (
      !transactionResult.skipSiblingRelease &&
      !transactionResult.hasMultiProviderConfig &&
      (!effectiveShareBusyStatus || effectiveLinkedProviderIds.length === 0)
    ) {
      console.log(`🔗 [ProviderStatusManager] Provider ${providerId} has no linkedProviderIds field on own doc, checking parent account...`);
      const parentConfig = await findParentAccountConfig(providerId);
      if (parentConfig) {
        effectiveLinkedProviderIds = parentConfig.linkedProviderIds;
        effectiveShareBusyStatus = parentConfig.shareBusyStatus;
        console.log(`🔗 [ProviderStatusManager] Using parent account config: shareBusyStatus=${effectiveShareBusyStatus}, linkedProviderIds=[${effectiveLinkedProviderIds.join(', ')}]`);

        // ✅ SELF-HEALING: Write parent config back to provider's own docs
        try {
          const selfHealData = {
            linkedProviderIds: parentConfig.linkedProviderIds,
            shareBusyStatus: parentConfig.shareBusyStatus,
          };
          await Promise.all([
            db.collection('users').doc(providerId).update(selfHealData),
            db.collection('sos_profiles').doc(providerId).update(selfHealData).catch(() => {}),
          ]);
          console.log(`🔧 [ProviderStatusManager] Self-healed: wrote parent config to provider ${providerId}'s own docs`);
        } catch (selfHealErr) {
          console.warn(`⚠️ [ProviderStatusManager] Self-heal failed (non-blocking):`, selfHealErr);
        }
      } else {
        console.log(`🔗 [ProviderStatusManager] No parent account found - provider is standalone`);
        // ✅ PERF FIX: Mark standalone provider to avoid future lookups
        try {
          const standaloneData = { linkedProviderIds: [], shareBusyStatus: false };
          await Promise.all([
            db.collection('users').doc(providerId).update(standaloneData),
            db.collection('sos_profiles').doc(providerId).update(standaloneData).catch(() => {}),
          ]);
          console.log(`🔧 [ProviderStatusManager] Marked provider ${providerId} as standalone (no future lookups)`);
        } catch (standaloneErr) {
          console.warn(`⚠️ [ProviderStatusManager] Failed to mark standalone (non-blocking):`, standaloneErr);
        }
      }
    }

    if (
      !transactionResult.skipSiblingRelease &&
      effectiveShareBusyStatus &&
      effectiveLinkedProviderIds.length > 0
    ) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, releasing ${effectiveLinkedProviderIds.length} linked providers`);
      await releaseSiblingsFromBusy(providerId, effectiveLinkedProviderIds, now);
    }

    return {
      success: transactionResult.success,
      providerId: transactionResult.providerId,
      previousStatus: transactionResult.previousStatus,
      newStatus: transactionResult.newStatus,
      timestamp: transactionResult.timestamp,
      message: transactionResult.message,
      error: transactionResult.error,
    };

  } catch (error) {
    console.error(`❌ [ProviderStatusManager] Error setting provider available:`, error);
    await logError('providerStatusManager:setProviderAvailable', error as unknown);

    return {
      success: false,
      providerId,
      previousStatus: 'busy',
      newStatus: 'available',
      timestamp: now.toMillis(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Libère les siblings qui ont été mis en busy par propagation
 * Ne libère QUE si busyBySibling=true et busySiblingProviderId === originProviderId
 */
async function releaseSiblingsFromBusy(
  originProviderId: string,
  linkedProviderIds: string[],
  now: admin.firestore.Timestamp
): Promise<void> {
  const batch = getDb().batch();
  let releasedCount = 0;

  // P1 FIX: Fetch all sibling docs in parallel instead of sequential N+1 reads
  const siblingIds = linkedProviderIds.filter(id => id !== originProviderId);
  if (siblingIds.length === 0) return;

  const [siblingUserDocs, siblingProfileDocs] = await Promise.all([
    Promise.all(siblingIds.map(id => getDb().collection('users').doc(id).get())),
    Promise.all(siblingIds.map(id => getDb().collection('sos_profiles').doc(id).get())),
  ]);

  for (let i = 0; i < siblingIds.length; i++) {
    const siblingId = siblingIds[i];
    const siblingUserDoc = siblingUserDocs[i];
    const siblingProfileDoc = siblingProfileDocs[i];

    try {
      if (!siblingUserDoc.exists) continue;

      const siblingData = siblingUserDoc.data();

      // Ne libérer QUE si:
      // 1. busyBySibling === true (mis en busy par propagation, pas en appel direct)
      // 2. busySiblingProviderId === originProviderId (mis en busy par ce provider spécifiquement)
      if (siblingData?.busyBySibling !== true) {
        console.log(`[ProviderStatusManager] Sibling ${siblingId} not busy by sibling, skipping`);
        continue;
      }

      if (siblingData?.busySiblingProviderId !== originProviderId) {
        console.log(`[ProviderStatusManager] Sibling ${siblingId} busy by different sibling, skipping`);
        continue;
      }

      const releaseData = {
        availability: 'available',
        isOnline: true,
        // ✅ BUG FIX: Toujours définir lastActivity lors de isOnline=true
        // pour que checkProviderInactivity puisse calculer l'inactivité correctement
        lastActivity: now,
        busySince: admin.firestore.FieldValue.delete(),
        busyReason: admin.firestore.FieldValue.delete(),
        busyBySibling: admin.firestore.FieldValue.delete(),
        busySiblingProviderId: admin.firestore.FieldValue.delete(),
        busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
        lastStatusChange: now,
        updatedAt: now,
      };

      // Mettre à jour users
      const siblingUserRef = getDb().collection('users').doc(siblingId);
      batch.update(siblingUserRef, releaseData);

      // Mettre à jour sos_profiles
      const siblingProfileRef = getDb().collection('sos_profiles').doc(siblingId);
      if (siblingProfileDoc.exists) {
        batch.update(siblingProfileRef, releaseData);
      }

      // Log d'audit
      batch.set(getDb().collection('provider_status_logs').doc(), {
        providerId: siblingId,
        action: 'RELEASE_FROM_SIBLING_BUSY',
        previousStatus: 'busy',
        newStatus: 'available',
        originProviderId,
        timestamp: now,
      });

      releasedCount++;
    } catch (err) {
      console.error(`[ProviderStatusManager] Error releasing sibling ${siblingId}:`, err);
    }
  }

  if (releasedCount > 0) {
    await batch.commit();
    console.log(`✅ [ProviderStatusManager] Released ${releasedCount} siblings from busy status`);
  }
}

/**
 * Fonction générique pour mettre à jour le statut d'un prestataire
 * Utilisable par d'autres modules (TwilioCallManager, webhooks, etc.)
 *
 * @param providerId - ID du prestataire
 * @param newStatus - Nouveau statut
 * @param options - Options supplémentaires
 * @returns Résultat de l'opération
 */
export async function updateProviderStatusAtomic(
  providerId: string,
  newStatus: AvailabilityStatus,
  options?: ProviderStatusOptions
): Promise<ProviderStatusResponse> {
  if (newStatus === 'busy' && options?.callSessionId) {
    return setProviderBusy(
      providerId,
      options.callSessionId,
      (options.reason as BusyReason) || 'in_call'
    );
  }

  if (newStatus === 'available') {
    return setProviderAvailable(providerId, options?.reason || 'manual_update');
  }

  // Pour offline, utiliser la fonction existante ou gérer ici
  const now = admin.firestore.Timestamp.now();

  try {
    const userRef = getDb().collection('users').doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        success: false,
        providerId,
        previousStatus: 'offline',
        newStatus,
        timestamp: now.toMillis(),
        error: 'Provider not found',
      };
    }

    const userData = userDoc.data();
    const previousStatus: AvailabilityStatus =
      (userData?.availability as AvailabilityStatus) || 'available';

    const batch = getDb().batch();

    const updateData = {
      availability: newStatus,
      isOnline: newStatus !== 'offline',
      lastStatusChange: now,
      lastActivityCheck: now,
      updatedAt: now,
    };

    batch.update(userRef, updateData);

    const profileRef = getDb().collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    if (!options?.skipAuditLog) {
      batch.set(getDb().collection('provider_status_logs').doc(), {
        providerId,
        action: `SET_${newStatus.toUpperCase()}`,
        previousStatus,
        newStatus,
        reason: options?.reason,
        timestamp: now,
      });
    }

    await batch.commit();

    return {
      success: true,
      providerId,
      previousStatus,
      newStatus,
      timestamp: now.toMillis(),
      message: `Status changed from ${previousStatus} to ${newStatus}`,
    };

  } catch (error) {
    console.error(`❌ [ProviderStatusManager] Error updating status:`, error);
    await logError('providerStatusManager:updateProviderStatusAtomic', error as unknown);

    return {
      success: false,
      providerId,
      previousStatus: 'available',
      newStatus,
      timestamp: now.toMillis(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Vérifie si un prestataire est actuellement disponible pour un appel
 *
 * @param providerId - ID du prestataire
 * @returns true si disponible, false sinon
 */
export async function isProviderAvailable(providerId: string): Promise<boolean> {
  try {
    const profileRef = getDb().collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return false;
    }

    const data = profileDoc.data();
    return data?.isOnline === true && data?.availability === 'available';

  } catch (error) {
    console.error(`[ProviderStatusManager] Error checking availability:`, error);
    return false;
  }
}

/**
 * Récupère le statut actuel d'un prestataire
 *
 * @param providerId - ID du prestataire
 * @returns Statut actuel ou null si non trouvé
 */
export async function getProviderStatus(
  providerId: string
): Promise<{
  availability: AvailabilityStatus;
  isOnline: boolean;
  currentCallSessionId?: string;
  busySince?: admin.firestore.Timestamp;
} | null> {
  try {
    const profileRef = getDb().collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return null;
    }

    const data = profileDoc.data();
    return {
      availability: data?.availability || 'offline',
      isOnline: data?.isOnline || false,
      currentCallSessionId: data?.currentCallSessionId,
      busySince: data?.busySince,
    };

  } catch (error) {
    console.error(`[ProviderStatusManager] Error getting status:`, error);
    return null;
  }
}
