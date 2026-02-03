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
    if (
      !transactionResult.skipPropagation &&
      transactionResult.shareBusyStatus &&
      transactionResult.linkedProviderIds &&
      transactionResult.linkedProviderIds.length > 0
    ) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, propagating to ${transactionResult.linkedProviderIds.length} linked providers`);
      await propagateBusyToSiblings(providerId, transactionResult.linkedProviderIds, callSessionId, now);
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

  for (const siblingId of linkedProviderIds) {
    // Ne pas propager à soi-même
    if (siblingId === originProviderId) continue;

    try {
      const siblingUserRef = getDb().collection('users').doc(siblingId);
      const siblingUserDoc = await siblingUserRef.get();

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
      batch.update(siblingUserRef, siblingUpdateData);

      // Mettre à jour sos_profiles
      const siblingProfileRef = getDb().collection('sos_profiles').doc(siblingId);
      const siblingProfileDoc = await siblingProfileRef.get();
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
    if (
      !transactionResult.skipSiblingRelease &&
      transactionResult.shareBusyStatus &&
      transactionResult.linkedProviderIds &&
      transactionResult.linkedProviderIds.length > 0
    ) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, releasing ${transactionResult.linkedProviderIds.length} linked providers`);
      await releaseSiblingsFromBusy(providerId, transactionResult.linkedProviderIds, now);
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

  for (const siblingId of linkedProviderIds) {
    // Ne pas traiter soi-même
    if (siblingId === originProviderId) continue;

    try {
      const siblingUserRef = getDb().collection('users').doc(siblingId);
      const siblingUserDoc = await siblingUserRef.get();

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
      batch.update(siblingUserRef, releaseData);

      // Mettre à jour sos_profiles
      const siblingProfileRef = getDb().collection('sos_profiles').doc(siblingId);
      const siblingProfileDoc = await siblingProfileRef.get();
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
