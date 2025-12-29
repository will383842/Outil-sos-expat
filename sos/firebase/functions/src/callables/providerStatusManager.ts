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

const db = admin.firestore();

// =============================
// Types
// =============================

export type AvailabilityStatus = 'available' | 'busy' | 'offline';

export type BusyReason = 'in_call' | 'break' | 'offline' | 'manually_disabled';

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

  try {
    // 1. Récupérer le statut actuel
    const userRef = db.collection('users').doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`[ProviderStatusManager] Provider not found: ${providerId}`);
      return {
        success: false,
        providerId,
        previousStatus: 'offline',
        newStatus: 'busy',
        timestamp: now.toMillis(),
        error: 'Provider not found',
      };
    }

    const userData = userDoc.data();
    const previousStatus: AvailabilityStatus =
      (userData?.availability as AvailabilityStatus) || 'available';

    // 2. Vérifier si déjà busy
    if (previousStatus === 'busy') {
      console.log(`[ProviderStatusManager] Provider ${providerId} already busy`);
      return {
        success: true,
        providerId,
        previousStatus: 'busy',
        newStatus: 'busy',
        timestamp: now.toMillis(),
        message: 'Provider already busy',
      };
    }

    // 3. Mise à jour atomique avec batch
    const batch = db.batch();

    const updateData = {
      availability: 'busy',
      isOnline: true,
      currentCallSessionId: callSessionId,
      busySince: now,
      busyReason: reason,
      lastStatusChange: now,
      lastActivityCheck: now,
      updatedAt: now,
    };

    // Mettre à jour users
    batch.update(userRef, updateData);

    // Mettre à jour sos_profiles
    const profileRef = db.collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    // Log d'audit
    batch.set(db.collection('provider_status_logs').doc(), {
      providerId,
      action: 'SET_BUSY',
      previousStatus,
      newStatus: 'busy',
      callSessionId,
      reason,
      timestamp: now,
    });

    await batch.commit();

    console.log(`✅ [ProviderStatusManager] Provider ${providerId} set to BUSY (session: ${callSessionId})`);

    return {
      success: true,
      providerId,
      previousStatus,
      newStatus: 'busy',
      timestamp: now.toMillis(),
      message: `Provider status changed from ${previousStatus} to busy`,
    };

  } catch (error) {
    console.error(`❌ [ProviderStatusManager] Error setting provider busy:`, error);
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
 * Remet un prestataire en statut "available" (disponible)
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
    const userRef = db.collection('users').doc(providerId);
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
    const batch = db.batch();

    const updateData = {
      availability: 'available',
      isOnline: true,
      currentCallSessionId: admin.firestore.FieldValue.delete(),
      busySince: admin.firestore.FieldValue.delete(),
      busyReason: admin.firestore.FieldValue.delete(),
      lastStatusChange: now,
      lastActivityCheck: now,
      lastActivity: now,
      updatedAt: now,
    };

    // Mettre à jour users
    batch.update(userRef, updateData);

    // Mettre à jour sos_profiles
    const profileRef = db.collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    // Log d'audit
    batch.set(db.collection('provider_status_logs').doc(), {
      providerId,
      action: 'SET_AVAILABLE',
      previousStatus,
      newStatus: 'available',
      reason,
      timestamp: now,
    });

    await batch.commit();

    console.log(`✅ [ProviderStatusManager] Provider ${providerId} set to AVAILABLE (reason: ${reason})`);

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
    const userRef = db.collection('users').doc(providerId);
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

    const batch = db.batch();

    const updateData = {
      availability: newStatus,
      isOnline: newStatus !== 'offline',
      lastStatusChange: now,
      lastActivityCheck: now,
      updatedAt: now,
    };

    batch.update(userRef, updateData);

    const profileRef = db.collection('sos_profiles').doc(providerId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      batch.update(profileRef, updateData);
    }

    if (!options?.skipAuditLog) {
      batch.set(db.collection('provider_status_logs').doc(), {
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
    const profileRef = db.collection('sos_profiles').doc(providerId);
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
    const profileRef = db.collection('sos_profiles').doc(providerId);
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
