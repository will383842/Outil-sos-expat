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
    // 1. Récupérer le statut actuel
    const userRef = getDb().collection('users').doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`🔶 [${logId}] ❌ Provider not found: ${providerId}`);
      return {
        success: false,
        providerId,
        previousStatus: 'offline',
        newStatus: 'busy',
        timestamp: now.toMillis(),
        error: 'Provider not found',
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
          previousStatus: 'busy',
          newStatus: 'busy',
          timestamp: now.toMillis(),
          message: 'Provider already busy',
        };
      }
    }

    // 3. Mise à jour atomique avec batch
    const batch = getDb().batch();

    const updateData = {
      availability: 'busy',
      isOnline: true,
      currentCallSessionId: callSessionId,
      busySince: now,
      busyReason: reason,
      busyBySibling: false, // Ce prestataire est directement en appel
      lastStatusChange: now,
      lastActivityCheck: now,
      updatedAt: now,
    };

    // Mettre à jour users
    batch.update(userRef, updateData);

    // Mettre à jour sos_profiles
    const profileRef = getDb().collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    // Log d'audit
    batch.set(getDb().collection('provider_status_logs').doc(), {
      providerId,
      action: 'SET_BUSY',
      previousStatus,
      newStatus: 'busy',
      callSessionId,
      reason,
      timestamp: now,
    });

    console.log(`🔶 [${logId}] Committing batch update...`);
    await batch.commit();

    console.log(`🔶 [${logId}] ═══════════════════════════════════════════════════════════`);
    console.log(`🔶 [${logId}] ✅ SUCCESS: Provider ${providerId} set to BUSY`);
    console.log(`🔶 [${logId}]   previousStatus: ${previousStatus}`);
    console.log(`🔶 [${logId}]   newStatus: busy`);
    console.log(`🔶 [${logId}]   callSessionId: ${callSessionId}`);
    console.log(`🔶 [${logId}]   reason: ${reason}`);
    console.log(`🔶 [${logId}] ═══════════════════════════════════════════════════════════`);

    // 4. Propager aux prestataires liés si shareBusyStatus est activé
    const linkedProviderIds: string[] = userData?.linkedProviderIds || [];
    const shareBusyStatus: boolean = userData?.shareBusyStatus === true;

    if (shareBusyStatus && linkedProviderIds.length > 0) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, propagating to ${linkedProviderIds.length} linked providers`);
      await propagateBusyToSiblings(providerId, linkedProviderIds, callSessionId, now);
    }

    return {
      success: true,
      providerId,
      previousStatus,
      newStatus: 'busy',
      timestamp: now.toMillis(),
      message: `Provider status changed from ${previousStatus} to busy`,
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

      const siblingUpdateData = {
        availability: 'busy',
        isOnline: true,
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
    // 1. Récupérer le statut actuel
    const userRef = getDb().collection('users').doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`[ProviderStatusManager] Provider not found: ${providerId}`);
      return {
        success: false,
        providerId,
        previousStatus: 'offline',
        newStatus: 'available',
        timestamp: now.toMillis(),
        error: 'Provider not found',
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
        previousStatus: 'available',
        newStatus: 'available',
        timestamp: now.toMillis(),
        message: 'Provider already available',
      };
    }

    // 3. Mise à jour atomique avec batch
    const batch = getDb().batch();

    const updateData = {
      availability: 'available',
      isOnline: true,
      currentCallSessionId: admin.firestore.FieldValue.delete(),
      busySince: admin.firestore.FieldValue.delete(),
      busyReason: admin.firestore.FieldValue.delete(),
      busyBySibling: admin.firestore.FieldValue.delete(),
      busySiblingProviderId: admin.firestore.FieldValue.delete(),
      busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
      lastStatusChange: now,
      lastActivityCheck: now,
      lastActivity: now,
      updatedAt: now,
    };

    // Mettre à jour users
    batch.update(userRef, updateData);

    // Mettre à jour sos_profiles
    const profileRef = getDb().collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    // Log d'audit
    batch.set(getDb().collection('provider_status_logs').doc(), {
      providerId,
      action: 'SET_AVAILABLE',
      previousStatus,
      newStatus: 'available',
      reason,
      timestamp: now,
    });

    await batch.commit();

    console.log(`✅ [ProviderStatusManager] Provider ${providerId} set to AVAILABLE (reason: ${reason})`);

    // 4. Libérer les siblings si shareBusyStatus est activé
    const linkedProviderIds: string[] = userData?.linkedProviderIds || [];
    const shareBusyStatus: boolean = userData?.shareBusyStatus === true;

    if (shareBusyStatus && linkedProviderIds.length > 0) {
      console.log(`[ProviderStatusManager] shareBusyStatus=true, releasing ${linkedProviderIds.length} linked providers`);
      await releaseSiblingsFromBusy(providerId, linkedProviderIds, now);
    }

    return {
      success: true,
      providerId,
      previousStatus,
      newStatus: 'available',
      timestamp: now.toMillis(),
      message: `Provider status changed from ${previousStatus} to available`,
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
