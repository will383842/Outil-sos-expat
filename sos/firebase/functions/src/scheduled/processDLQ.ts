/**
 * Scheduled Job pour traiter la Dead Letter Queue des webhooks Stripe
 * Exécute toutes les 5 minutes pour retenter les événements échoués
 */

import * as functions from 'firebase-functions/v1';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logger } from 'firebase-functions';
import {
  getEventsToRetry,
  updateForRetry,
  markAsResolved,
  getDLQStats,
  cleanupOldEntries
} from '../subscription/deadLetterQueue';

// Import webhook handlers
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleDisputeCreated,
  handleDisputeClosed,
  handlePayoutFailed,
  handleRefundFailed
} from '../subscription/webhooks';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 10; // Nombre d'événements à traiter par exécution

// ============================================================================
// WEBHOOK HANDLER MAP
// ============================================================================

type WebhookHandler = (data: unknown, context: { eventId: string; eventType: string }) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler> = {
  'customer.subscription.created': async (data, ctx) => {
    await handleSubscriptionCreated(data as Stripe.Subscription, ctx);
  },
  'customer.subscription.updated': async (data, ctx) => {
    await handleSubscriptionUpdated(data as Stripe.Subscription, ctx);
  },
  'customer.subscription.deleted': async (data, ctx) => {
    await handleSubscriptionDeleted(data as Stripe.Subscription, ctx);
  },
  'invoice.paid': async (data, ctx) => {
    await handleInvoicePaid(data as Stripe.Invoice, ctx);
  },
  'invoice.payment_failed': async (data, ctx) => {
    await handleInvoicePaymentFailed(data as Stripe.Invoice, ctx);
  },
  'charge.dispute.created': async (data, ctx) => {
    await handleDisputeCreated(data as Stripe.Dispute, ctx);
  },
  'charge.dispute.closed': async (data, ctx) => {
    await handleDisputeClosed(data as Stripe.Dispute, ctx);
  },
  'payout.failed': async (data, ctx) => {
    await handlePayoutFailed(data as Stripe.Payout, ctx);
  },
  'refund.failed': async (data, ctx) => {
    await handleRefundFailed(data as Stripe.Refund, ctx);
  }
};

// ============================================================================
// PROCESS DLQ FUNCTION
// ============================================================================

/**
 * Traite les événements en attente dans la Dead Letter Queue
 * Exécute toutes les 5 minutes
 */
export const processWebhookDLQ = onSchedule(
  {
    // OPTIMIZED: Changed from 5 minutes to 30 minutes to reduce invocations by 83%
    // Previous: 288 invocations/day → Now: 48 invocations/day
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 300
  },
  async () => {
    logger.info('[DLQ Processor] Starting DLQ processing...');

    try {
      // Récupérer les événements à retenter
      const eventsToRetry = await getEventsToRetry(BATCH_SIZE);

      if (eventsToRetry.length === 0) {
        logger.info('[DLQ Processor] No events to retry');
        return;
      }

      logger.info(`[DLQ Processor] Found ${eventsToRetry.length} events to retry`);

      let successCount = 0;
      let failCount = 0;

      for (const entry of eventsToRetry) {
        try {
          logger.info(`[DLQ Processor] Retrying event ${entry.eventId} (${entry.eventType})`);

          const handler = webhookHandlers[entry.eventType];

          if (!handler) {
            logger.warn(`[DLQ Processor] No handler for event type ${entry.eventType}, marking as resolved`);
            await markAsResolved(entry.eventId, 'no_handler');
            continue;
          }

          // Exécuter le handler
          await handler(entry.eventData, {
            eventId: entry.eventId,
            eventType: entry.eventType
          });

          // Marquer comme résolu
          await updateForRetry(entry.eventId, true);
          successCount++;

          logger.info(`[DLQ Processor] Event ${entry.eventId} processed successfully`);
        } catch (error: unknown) {
          failCount++;
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`[DLQ Processor] Event ${entry.eventId} retry failed:`, err);

          // Mettre à jour avec l'erreur
          await updateForRetry(entry.eventId, false, err);
        }
      }

      // Log des statistiques
      const stats = await getDLQStats();
      logger.info(`[DLQ Processor] Completed. Success: ${successCount}, Failed: ${failCount}`);
      logger.info(`[DLQ Processor] DLQ Stats - Pending: ${stats.pending}, Failed Permanent: ${stats.failed_permanent}, Critical: ${stats.critical_pending}`);

    } catch (error) {
      logger.error('[DLQ Processor] Fatal error:', error);
      throw error;
    }
  }
);

/**
 * Nettoie les anciens événements résolus (hebdomadaire)
 * Exécute tous les dimanches à 4h du matin
 */
export const cleanupWebhookDLQ = onSchedule(
  {
    schedule: '0 4 * * 0', // Dimanche 4h UTC
    region: 'europe-west1',
    timeZone: 'Europe/Paris',
    memory: '256MiB'
  },
  async () => {
    logger.info('[DLQ Cleanup] Starting cleanup...');

    try {
      const cleanedCount = await cleanupOldEntries(30); // Garder 30 jours
      logger.info(`[DLQ Cleanup] Cleaned ${cleanedCount} old entries`);

      // Log dans les stats système
      await admin.firestore().collection('system_logs').add({
        type: 'dlq_cleanup',
        cleanedCount,
        createdAt: admin.firestore.Timestamp.now()
      });
    } catch (error) {
      logger.error('[DLQ Cleanup] Error:', error);
      throw error;
    }
  }
);

/**
 * Callable function pour forcer le retry d'un événement (Admin)
 */
export const adminForceRetryDLQEvent = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { eventId } = data as { eventId: string };

    if (!eventId) {
      throw new functions.https.HttpsError('invalid-argument', 'eventId is required');
    }

    try {
      // Importer la fonction forceRetry
      const { forceRetry } = await import('../subscription/deadLetterQueue');
      const success = await forceRetry(eventId);

      if (!success) {
        throw new functions.https.HttpsError('not-found', 'Event not found in DLQ');
      }

      // Log l'action admin
      await admin.firestore().collection('admin_audit_logs').add({
        action: 'FORCE_RETRY_DLQ',
        adminId: context.auth.uid,
        targetId: eventId,
        targetType: 'webhook_dlq',
        createdAt: admin.firestore.Timestamp.now()
      });

      return { success: true, message: `Event ${eventId} scheduled for immediate retry` };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Admin] Force retry failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Callable function pour obtenir les stats DLQ (Admin)
 */
export const adminGetDLQStats = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const stats = await getDLQStats();

      // Récupérer aussi les derniers événements en échec permanent
      const failedEvents = await admin.firestore()
        .collection('webhook_dlq')
        .where('status', '==', 'failed_permanent')
        .orderBy('updatedAt', 'desc')
        .limit(10)
        .get();

      return {
        stats,
        recentFailures: failedEvents.docs.map(doc => ({
          eventId: doc.id,
          eventType: doc.data().eventType,
          errorMessage: doc.data().errorMessage,
          retryCount: doc.data().retryCount,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString()
        }))
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Admin] Get DLQ stats failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });
