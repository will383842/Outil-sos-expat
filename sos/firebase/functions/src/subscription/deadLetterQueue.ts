/**
 * Dead Letter Queue (DLQ) for Stripe Webhooks
 * Gère les événements webhook qui ont échoué et permet leur re-traitement
 *
 * Fonctionnalités:
 * - Stockage des événements échoués dans Firestore
 * - Retry automatique avec backoff exponentiel
 * - Interface admin pour retry manuel
 * - Alertes sur événements critiques échoués
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

export interface DLQEntry {
  eventId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: FirebaseFirestore.Timestamp | null;
  status: 'pending' | 'retrying' | 'failed_permanent' | 'resolved';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  resolvedAt?: FirebaseFirestore.Timestamp;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface DLQConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  criticalEventTypes: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: DLQConfig = {
  maxRetries: 5,
  baseDelayMs: 60000, // 1 minute
  maxDelayMs: 3600000, // 1 hour max
  criticalEventTypes: [
    'invoice.paid',
    'invoice.payment_failed',
    'customer.subscription.deleted',
    'charge.dispute.created',
    'charge.refunded',
    'transfer.failed'
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDb = () => admin.firestore();

/**
 * Calcule le délai pour le prochain retry avec backoff exponentiel
 */
function calculateNextRetryDelay(retryCount: number, config: DLQConfig = DEFAULT_CONFIG): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, retryCount),
    config.maxDelayMs
  );
  // Ajouter un jitter de +/- 10% pour éviter les thundering herds
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/**
 * Crée une alerte admin pour un événement critique échoué
 */
async function createCriticalAlert(entry: DLQEntry): Promise<void> {
  try {
    await getDb().collection('admin_alerts').add({
      type: 'webhook_failure',
      priority: 'critical', read: false,
      title: `Webhook Stripe échoué: ${entry.eventType}`,
      message: `L'événement ${entry.eventId} (${entry.eventType}) a échoué après ${entry.retryCount} tentatives. Erreur: ${entry.errorMessage}`,
      eventId: entry.eventId,
      eventType: entry.eventType,
      errorMessage: entry.errorMessage,
      retryCount: entry.retryCount,
      status: 'unread',
      createdAt: admin.firestore.Timestamp.now(),
      metadata: entry.metadata
    });
    logger.warn(`[DLQ] Critical alert created for event ${entry.eventId}`);
  } catch (error) {
    logger.error('[DLQ] Failed to create critical alert:', error);
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Ajoute un événement webhook échoué à la Dead Letter Queue
 */
export async function addToDeadLetterQueue(
  event: Stripe.Event,
  error: Error,
  metadata?: Record<string, unknown>
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const config = DEFAULT_CONFIG;

  const entry: DLQEntry = {
    eventId: event.id,
    eventType: event.type,
    eventData: event.data.object as Record<string, unknown>,
    errorMessage: error.message,
    errorStack: error.stack,
    retryCount: 0,
    maxRetries: config.maxRetries,
    nextRetryAt: admin.firestore.Timestamp.fromMillis(
      Date.now() + calculateNextRetryDelay(0, config)
    ),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    metadata
  };

  // Utiliser l'eventId comme document ID pour éviter les doublons
  const docRef = getDb().collection('webhook_dlq').doc(event.id);

  // Vérifier si l'événement existe déjà
  const existingDoc = await docRef.get();
  if (existingDoc.exists) {
    const existingData = existingDoc.data() as DLQEntry;
    // Si déjà résolu ou en échec permanent, ne pas re-créer
    if (existingData.status === 'resolved' || existingData.status === 'failed_permanent') {
      logger.info(`[DLQ] Event ${event.id} already in DLQ with status ${existingData.status}, skipping`);
      return event.id;
    }
    // Sinon, incrémenter le retry count
    entry.retryCount = existingData.retryCount + 1;
    entry.createdAt = existingData.createdAt;

    if (entry.retryCount >= config.maxRetries) {
      entry.status = 'failed_permanent';
      entry.nextRetryAt = null;

      // Créer une alerte si c'est un événement critique
      if (config.criticalEventTypes.includes(event.type)) {
        await createCriticalAlert(entry);
      }
    } else {
      entry.nextRetryAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + calculateNextRetryDelay(entry.retryCount, config)
      );
    }
  }

  await docRef.set(entry);

  logger.info(`[DLQ] Event ${event.id} (${event.type}) added to DLQ. Retry count: ${entry.retryCount}`);

  // Log pour monitoring
  await getDb().collection('webhook_dlq_logs').add({
    eventId: event.id,
    eventType: event.type,
    action: entry.retryCount === 0 ? 'added' : 'retry_scheduled',
    retryCount: entry.retryCount,
    nextRetryAt: entry.nextRetryAt,
    errorMessage: error.message,
    createdAt: now
  });

  return event.id;
}

/**
 * Marque un événement DLQ comme résolu
 */
export async function markAsResolved(
  eventId: string,
  resolvedBy?: string
): Promise<boolean> {
  const docRef = getDb().collection('webhook_dlq').doc(eventId);
  const doc = await docRef.get();

  if (!doc.exists) {
    logger.warn(`[DLQ] Event ${eventId} not found in DLQ`);
    return false;
  }

  const now = admin.firestore.Timestamp.now();

  await docRef.update({
    status: 'resolved',
    nextRetryAt: null,
    resolvedAt: now,
    resolvedBy: resolvedBy || 'system',
    updatedAt: now
  });

  logger.info(`[DLQ] Event ${eventId} marked as resolved by ${resolvedBy || 'system'}`);

  return true;
}

/**
 * Récupère les événements à retenter
 */
export async function getEventsToRetry(limit: number = 10): Promise<DLQEntry[]> {
  const now = admin.firestore.Timestamp.now();

  const snapshot = await getDb()
    .collection('webhook_dlq')
    .where('status', '==', 'pending')
    .where('nextRetryAt', '<=', now)
    .orderBy('nextRetryAt', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    ...doc.data(),
    eventId: doc.id
  } as DLQEntry));
}

/**
 * Met à jour le statut d'un événement DLQ pour retry
 */
export async function updateForRetry(
  eventId: string,
  success: boolean,
  error?: Error
): Promise<void> {
  const docRef = getDb().collection('webhook_dlq').doc(eventId);
  const doc = await docRef.get();

  if (!doc.exists) {
    logger.warn(`[DLQ] Event ${eventId} not found for retry update`);
    return;
  }

  const data = doc.data() as DLQEntry;
  const now = admin.firestore.Timestamp.now();
  const config = DEFAULT_CONFIG;

  if (success) {
    await docRef.update({
      status: 'resolved',
      nextRetryAt: null,
      resolvedAt: now,
      resolvedBy: 'auto_retry',
      updatedAt: now
    });
    logger.info(`[DLQ] Event ${eventId} resolved after retry`);
  } else {
    const newRetryCount = data.retryCount + 1;

    if (newRetryCount >= config.maxRetries) {
      await docRef.update({
        status: 'failed_permanent',
        retryCount: newRetryCount,
        nextRetryAt: null,
        errorMessage: error?.message || data.errorMessage,
        errorStack: error?.stack || data.errorStack,
        updatedAt: now
      });

      // Créer une alerte si c'est un événement critique
      if (config.criticalEventTypes.includes(data.eventType)) {
        await createCriticalAlert({ ...data, retryCount: newRetryCount, errorMessage: error?.message || data.errorMessage });
      }

      logger.error(`[DLQ] Event ${eventId} permanently failed after ${newRetryCount} retries`);
    } else {
      await docRef.update({
        status: 'pending',
        retryCount: newRetryCount,
        nextRetryAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + calculateNextRetryDelay(newRetryCount, config)
        ),
        errorMessage: error?.message || data.errorMessage,
        errorStack: error?.stack || data.errorStack,
        updatedAt: now
      });

      logger.info(`[DLQ] Event ${eventId} scheduled for retry ${newRetryCount + 1}/${config.maxRetries}`);
    }
  }

  // Log pour monitoring
  await getDb().collection('webhook_dlq_logs').add({
    eventId,
    eventType: data.eventType,
    action: success ? 'retry_success' : 'retry_failed',
    retryCount: data.retryCount + (success ? 0 : 1),
    errorMessage: error?.message,
    createdAt: now
  });
}

/**
 * Récupère les statistiques de la DLQ
 */
export async function getDLQStats(): Promise<{
  pending: number;
  failed_permanent: number;
  resolved_today: number;
  critical_pending: number;
}> {
  const dlqRef = getDb().collection('webhook_dlq');
  const config = DEFAULT_CONFIG;

  const [pendingSnap, failedSnap, criticalSnap] = await Promise.all([
    dlqRef.where('status', '==', 'pending').count().get(),
    dlqRef.where('status', '==', 'failed_permanent').count().get(),
    dlqRef
      .where('status', '==', 'pending')
      .where('eventType', 'in', config.criticalEventTypes)
      .count()
      .get()
  ]);

  // Résolus aujourd'hui
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const resolvedTodaySnap = await dlqRef
    .where('status', '==', 'resolved')
    .where('resolvedAt', '>=', admin.firestore.Timestamp.fromDate(todayStart))
    .count()
    .get();

  return {
    pending: pendingSnap.data().count,
    failed_permanent: failedSnap.data().count,
    resolved_today: resolvedTodaySnap.data().count,
    critical_pending: criticalSnap.data().count
  };
}

/**
 * Force le retry d'un événement spécifique (admin)
 */
export async function forceRetry(eventId: string): Promise<boolean> {
  const docRef = getDb().collection('webhook_dlq').doc(eventId);
  const doc = await docRef.get();

  if (!doc.exists) {
    logger.warn(`[DLQ] Event ${eventId} not found for force retry`);
    return false;
  }

  const data = doc.data() as DLQEntry;

  // Permettre le retry même si failed_permanent
  await docRef.update({
    status: 'pending',
    nextRetryAt: admin.firestore.Timestamp.now(), // Retry immédiat
    retryCount: data.retryCount, // Ne pas incrémenter le compteur
    updatedAt: admin.firestore.Timestamp.now()
  });

  logger.info(`[DLQ] Event ${eventId} force retry initiated`);

  return true;
}

/**
 * Nettoie les anciens événements résolus (> 30 jours)
 */
export async function cleanupOldEntries(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const snapshot = await getDb()
    .collection('webhook_dlq')
    .where('status', '==', 'resolved')
    .where('resolvedAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
    .limit(500)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = getDb().batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  logger.info(`[DLQ] Cleaned up ${snapshot.size} old resolved entries`);

  return snapshot.size;
}
