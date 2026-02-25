/**
 * Payment Monitoring - Surveillance des paiements en production
 *
 * Surveille spécifiquement les flux de paiement :
 *   - Stripe: PaymentIntent failures, capture delays, refund anomalies
 *   - PayPal: Order failures, payout delays, webhook issues
 *   - Calls: Scheduling failures, capture issues
 *
 * @version 1.0.0 - Phase 4 Payment Monitoring
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger as functionsLogger } from 'firebase-functions';
import { logger } from '../utils/productionLogger';

// =====================
// CONFIGURATION
// =====================

const CONFIG = {
  THRESHOLDS: {
    // Stripe
    STRIPE_FAILED_PAYMENTS_HOUR: 3,       // Alerter si > 3 échecs/heure
    STRIPE_UNCAPTURED_PAYMENTS_COUNT: 5,  // Alerter si > 5 paiements non capturés
    STRIPE_UNCAPTURED_AGE_HOURS: 6,       // Alerter si non capturé après 6h

    // PayPal
    PAYPAL_FAILED_ORDERS_HOUR: 3,         // Alerter si > 3 échecs/heure
    PAYPAL_PENDING_PAYOUTS_COUNT: 5,      // Alerter si > 5 payouts en attente
    PAYPAL_PENDING_PAYOUT_AGE_HOURS: 24,  // Alerter si payout en attente > 24h

    // Calls
    FAILED_CALLS_HOUR: 5,                 // Alerter si > 5 appels échoués/heure
    ORPHAN_SESSIONS_COUNT: 10,            // Alerter si > 10 sessions orphelines
  },
  ALERTS_COLLECTION: 'payment_alerts',
  METRICS_COLLECTION: 'payment_metrics'
};

// =====================
// TYPES
// =====================

type PaymentAlertSeverity = 'warning' | 'critical' | 'emergency';
type PaymentAlertCategory = 'stripe' | 'paypal' | 'twilio' | 'general';

interface PaymentAlert {
  id: string;
  severity: PaymentAlertSeverity;
  category: PaymentAlertCategory;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
  resolved: boolean;
  resolvedAt?: FirebaseFirestore.Timestamp;
  resolvedBy?: string;
}

interface PaymentMetrics {
  timestamp: FirebaseFirestore.Timestamp;
  stripe: {
    successfulPayments: number;
    failedPayments: number;
    pendingCaptures: number;
    totalVolume: number; // in cents
    averageAmount: number;
  };
  paypal: {
    successfulOrders: number;
    failedOrders: number;
    pendingPayouts: number;
    totalVolume: number;
  };
  calls: {
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    captureRate: number; // percentage
  };
}

// =====================
// HELPER FUNCTIONS
// =====================

const db = () => admin.firestore();

async function createPaymentAlert(
  severity: PaymentAlertSeverity,
  category: PaymentAlertCategory,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const alertId = `payment_alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const alert: PaymentAlert = {
    id: alertId,
    severity,
    category,
    title,
    message,
    metadata,
    createdAt: admin.firestore.Timestamp.now(),
    resolved: false
  };

  await db().collection(CONFIG.ALERTS_COLLECTION).doc(alertId).set(alert);

  // Also create in system_alerts for unified monitoring
  await db().collection('system_alerts').add({
    ...alert,
    source: 'payment_monitoring'
  });

  logger.warn('PaymentMonitoring', `${severity} alert: ${title}`, { alertId, category });

  return alertId;
}

// =====================
// STRIPE MONITORING
// =====================

async function checkStripePayments(): Promise<void> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const timestampOneHourAgo = admin.firestore.Timestamp.fromDate(oneHourAgo);

  try {
    // Check failed payments in last hour
    const failedPayments = await db().collection('payments')
      .where('status', 'in', ['failed', 'canceled'])
      .where('gateway', '==', 'stripe')
      .where('updatedAt', '>=', timestampOneHourAgo)
      .get();

    if (failedPayments.size >= CONFIG.THRESHOLDS.STRIPE_FAILED_PAYMENTS_HOUR) {
      await createPaymentAlert(
        'critical',
        'stripe',
        'Taux d\'échec Stripe élevé',
        `${failedPayments.size} paiements Stripe ont échoué dans la dernière heure.`,
        {
          failedCount: failedPayments.size,
          threshold: CONFIG.THRESHOLDS.STRIPE_FAILED_PAYMENTS_HOUR,
          period: '1h'
        }
      );
    }

    // Check uncaptured payments (stuck in requires_capture)
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - CONFIG.THRESHOLDS.STRIPE_UNCAPTURED_AGE_HOURS);
    const timestampSixHoursAgo = admin.firestore.Timestamp.fromDate(sixHoursAgo);

    const uncapturedPayments = await db().collection('payments')
      .where('status', '==', 'requires_capture')
      .where('gateway', '==', 'stripe')
      .where('createdAt', '<=', timestampSixHoursAgo)
      .get();

    if (uncapturedPayments.size >= CONFIG.THRESHOLDS.STRIPE_UNCAPTURED_PAYMENTS_COUNT) {
      await createPaymentAlert(
        'critical',
        'stripe',
        'Paiements Stripe non capturés',
        `${uncapturedPayments.size} paiements Stripe sont en attente de capture depuis plus de ${CONFIG.THRESHOLDS.STRIPE_UNCAPTURED_AGE_HOURS}h.`,
        {
          count: uncapturedPayments.size,
          oldestPaymentIds: uncapturedPayments.docs.slice(0, 5).map(d => d.id)
        }
      );
    }

    logger.debug('PaymentMonitoring', 'Stripe check completed', {
      failedLastHour: failedPayments.size,
      uncapturedOld: uncapturedPayments.size
    });

  } catch (error) {
    logger.error('PaymentMonitoring', 'Stripe check failed', { error });
  }
}

// =====================
// PAYPAL MONITORING
// =====================

async function checkPayPalPayments(): Promise<void> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const timestampOneHourAgo = admin.firestore.Timestamp.fromDate(oneHourAgo);

  try {
    // Check failed orders in last hour
    const failedOrders = await db().collection('paypal_orders')
      .where('status', 'in', ['FAILED', 'VOIDED'])
      .where('updatedAt', '>=', timestampOneHourAgo)
      .get();

    if (failedOrders.size >= CONFIG.THRESHOLDS.PAYPAL_FAILED_ORDERS_HOUR) {
      await createPaymentAlert(
        'critical',
        'paypal',
        'Taux d\'échec PayPal élevé',
        `${failedOrders.size} commandes PayPal ont échoué dans la dernière heure.`,
        {
          failedCount: failedOrders.size,
          threshold: CONFIG.THRESHOLDS.PAYPAL_FAILED_ORDERS_HOUR
        }
      );
    }

    // Check pending payouts (stuck)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - CONFIG.THRESHOLDS.PAYPAL_PENDING_PAYOUT_AGE_HOURS);
    const timestampTwentyFourHoursAgo = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

    const pendingPayouts = await db().collection('paypal_payouts')
      .where('status', '==', 'PENDING')
      .where('createdAt', '<=', timestampTwentyFourHoursAgo)
      .get();

    if (pendingPayouts.size >= CONFIG.THRESHOLDS.PAYPAL_PENDING_PAYOUTS_COUNT) {
      await createPaymentAlert(
        'warning',
        'paypal',
        'Payouts PayPal en attente',
        `${pendingPayouts.size} payouts PayPal sont en attente depuis plus de ${CONFIG.THRESHOLDS.PAYPAL_PENDING_PAYOUT_AGE_HOURS}h.`,
        {
          count: pendingPayouts.size,
          oldestPayoutIds: pendingPayouts.docs.slice(0, 5).map(d => d.id)
        }
      );
    }

    // Check failed payout alerts
    const failedPayoutAlerts = await db().collection('failed_payouts_alerts')
      .where('status', '==', 'failed')
      .get();

    if (failedPayoutAlerts.size > 0) {
      await createPaymentAlert(
        'emergency',
        'paypal',
        'Payouts PayPal échoués',
        `${failedPayoutAlerts.size} payouts PayPal ont échoué et nécessitent une intervention manuelle.`,
        {
          count: failedPayoutAlerts.size,
          payoutIds: failedPayoutAlerts.docs.map(d => d.id)
        }
      );
    }

    logger.debug('PaymentMonitoring', 'PayPal check completed', {
      failedLastHour: failedOrders.size,
      pendingOld: pendingPayouts.size,
      failedPayouts: failedPayoutAlerts.size
    });

  } catch (error) {
    logger.error('PaymentMonitoring', 'PayPal check failed', { error });
  }
}

// =====================
// CALL MONITORING
// =====================

async function checkCallSessions(): Promise<void> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  const timestampOneHourAgo = admin.firestore.Timestamp.fromDate(oneHourAgo);

  try {
    // Check failed calls in last hour
    const failedCalls = await db().collection('call_sessions')
      .where('status', '==', 'failed')
      .where('updatedAt', '>=', timestampOneHourAgo)
      .get();

    if (failedCalls.size >= CONFIG.THRESHOLDS.FAILED_CALLS_HOUR) {
      // Analyze failure reasons
      const reasons: Record<string, number> = {};
      failedCalls.docs.forEach(doc => {
        const reason = doc.data().failureReason || 'unknown';
        reasons[reason] = (reasons[reason] || 0) + 1;
      });

      await createPaymentAlert(
        'critical',
        'twilio',
        'Taux d\'échec d\'appels élevé',
        `${failedCalls.size} appels ont échoué dans la dernière heure.`,
        {
          count: failedCalls.size,
          reasons,
          threshold: CONFIG.THRESHOLDS.FAILED_CALLS_HOUR
        }
      );
    }

    // Check orphan sessions (paid but no call attempted)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const timestampTwoHoursAgo = admin.firestore.Timestamp.fromDate(twoHoursAgo);

    const orphanSessions = await db().collection('call_sessions')
      .where('status', 'in', ['pending', 'scheduled'])
      .where('createdAt', '<=', timestampTwoHoursAgo)
      .get();

    if (orphanSessions.size >= CONFIG.THRESHOLDS.ORPHAN_SESSIONS_COUNT) {
      await createPaymentAlert(
        'warning',
        'twilio',
        'Sessions d\'appel orphelines',
        `${orphanSessions.size} sessions d\'appel sont bloquées en statut pending/scheduled depuis plus de 2h.`,
        {
          count: orphanSessions.size,
          sessionIds: orphanSessions.docs.slice(0, 5).map(d => d.id)
        }
      );
    }

    // Check capture rate (calls completed vs captured)
    const completedCalls = await db().collection('call_sessions')
      .where('status', '==', 'completed')
      .where('updatedAt', '>=', timestampOneHourAgo)
      .get();

    const capturedCalls = completedCalls.docs.filter(doc => {
      const data = doc.data();
      return data.payment?.status === 'captured';
    });

    const captureRate = completedCalls.size > 0
      ? (capturedCalls.length / completedCalls.size) * 100
      : 100;

    if (captureRate < 90 && completedCalls.size >= 5) {
      await createPaymentAlert(
        'warning',
        'twilio',
        'Taux de capture faible',
        `Seulement ${captureRate.toFixed(1)}% des appels terminés ont été capturés (${capturedCalls.length}/${completedCalls.size}).`,
        {
          captureRate,
          completed: completedCalls.size,
          captured: capturedCalls.length
        }
      );
    }

    logger.debug('PaymentMonitoring', 'Call check completed', {
      failedLastHour: failedCalls.size,
      orphan: orphanSessions.size,
      captureRate
    });

  } catch (error) {
    logger.error('PaymentMonitoring', 'Call check failed', { error });
  }
}

// =====================
// METRICS COLLECTION
// =====================

async function collectPaymentMetrics(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const timestamp24h = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

  try {
    // Stripe metrics
    const stripePayments = await db().collection('payments')
      .where('gateway', '==', 'stripe')
      .where('createdAt', '>=', timestamp24h)
      .get();

    const stripeSuccess = stripePayments.docs.filter(d => d.data().status === 'succeeded' || d.data().status === 'captured');
    const stripeFailed = stripePayments.docs.filter(d => d.data().status === 'failed');
    const stripePending = stripePayments.docs.filter(d => d.data().status === 'requires_capture');
    const stripeVolume = stripeSuccess.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    // PayPal metrics
    const paypalOrders = await db().collection('paypal_orders')
      .where('createdAt', '>=', timestamp24h)
      .get();

    const paypalSuccess = paypalOrders.docs.filter(d => d.data().status === 'COMPLETED');
    const paypalFailed = paypalOrders.docs.filter(d => ['FAILED', 'VOIDED'].includes(d.data().status));
    const paypalPending = await db().collection('paypal_payouts')
      .where('status', '==', 'PENDING')
      .get();
    const paypalVolume = paypalSuccess.reduce((sum, d) => sum + (parseFloat(d.data().amount || '0') * 100), 0);

    // Call metrics
    const callSessions = await db().collection('call_sessions')
      .where('createdAt', '>=', timestamp24h)
      .get();

    const callSuccess = callSessions.docs.filter(d => d.data().status === 'completed');
    const callFailed = callSessions.docs.filter(d => d.data().status === 'failed');
    const callDurations = callSuccess.map(d => d.data().duration || 0);
    const avgDuration = callDurations.length > 0
      ? callDurations.reduce((sum, d) => sum + d, 0) / callDurations.length
      : 0;
    const capturedCalls = callSuccess.filter(d => d.data().payment?.status === 'captured');
    const captureRate = callSuccess.length > 0
      ? (capturedCalls.length / callSuccess.length) * 100
      : 100;

    // Save metrics
    const metrics: PaymentMetrics = {
      timestamp: admin.firestore.Timestamp.now(),
      stripe: {
        successfulPayments: stripeSuccess.length,
        failedPayments: stripeFailed.length,
        pendingCaptures: stripePending.length,
        totalVolume: stripeVolume,
        averageAmount: stripeSuccess.length > 0 ? stripeVolume / stripeSuccess.length : 0
      },
      paypal: {
        successfulOrders: paypalSuccess.length,
        failedOrders: paypalFailed.length,
        pendingPayouts: paypalPending.size,
        totalVolume: paypalVolume
      },
      calls: {
        successfulCalls: callSuccess.length,
        failedCalls: callFailed.length,
        averageDuration: avgDuration,
        captureRate
      }
    };

    await db().collection(CONFIG.METRICS_COLLECTION).add(metrics);

    logger.info('PaymentMonitoring', 'Metrics collected', {
      stripe: `${stripeSuccess.length} success, ${stripeFailed.length} failed`,
      paypal: `${paypalSuccess.length} success, ${paypalFailed.length} failed`,
      calls: `${callSuccess.length} success, ${callFailed.length} failed, ${captureRate.toFixed(1)}% capture rate`
    });

  } catch (error) {
    logger.error('PaymentMonitoring', 'Metrics collection failed', { error });
  }
}

// =====================
// SCHEDULED JOBS
// =====================

/**
 * Vérification des paiements toutes les 4 heures
 * 2025-01-16: Garder à 4h car paiements impliqués (pas quotidien)
 */
export const runPaymentHealthCheck = onSchedule(
  {
    schedule: '0 */4 * * *', // Every 4 hours (paiements = garder réactif)
    region: 'europe-west3',
    timeZone: 'Europe/Paris',
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 120
  },
  async () => {
    functionsLogger.info('[PaymentMonitoring] Starting payment health check...');

    try {
      await Promise.all([
        checkStripePayments(),
        checkPayPalPayments(),
        checkCallSessions()
      ]);

      functionsLogger.info('[PaymentMonitoring] Payment health check completed');
    } catch (error) {
      functionsLogger.error('[PaymentMonitoring] Payment health check failed:', error);
    }
  }
);

/**
 * Collecte des métriques quotidienne
 */
export const collectDailyPaymentMetrics = onSchedule(
  {
    schedule: '0 6 * * *', // 6h du matin
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '128MiB',
    cpu: 0.083
  },
  async () => {
    functionsLogger.info('[PaymentMonitoring] Collecting daily metrics...');

    try {
      await collectPaymentMetrics();
      functionsLogger.info('[PaymentMonitoring] Daily metrics collected');
    } catch (error) {
      functionsLogger.error('[PaymentMonitoring] Metrics collection failed:', error);
    }
  }
);

/**
 * Nettoyage des anciennes alertes (hebdomadaire)
 */
export const cleanupOldPaymentAlerts = onSchedule(
  {
    schedule: '0 3 * * 0', // Dimanche à 3h
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '128MiB',
    cpu: 0.083
  },
  async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const oldAlerts = await db().collection(CONFIG.ALERTS_COLLECTION)
        .where('resolved', '==', true)
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .limit(500)
        .get();

      if (!oldAlerts.empty) {
        const batch = db().batch();
        oldAlerts.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functionsLogger.info(`[PaymentMonitoring] Cleaned up ${oldAlerts.size} old alerts`);
      }

      // Keep only last 30 days of metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldMetrics = await db().collection(CONFIG.METRICS_COLLECTION)
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();

      if (!oldMetrics.empty) {
        const batch = db().batch();
        oldMetrics.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functionsLogger.info(`[PaymentMonitoring] Cleaned up ${oldMetrics.size} old metrics`);
      }

    } catch (error) {
      functionsLogger.error('[PaymentMonitoring] Cleanup failed:', error);
    }
  }
);

// =====================
// ADMIN FUNCTIONS
// =====================

/**
 * Obtenir les alertes de paiement actives
 */
export const getPaymentAlerts = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { resolved = false, limit = 50 } = data as { resolved?: boolean; limit?: number };

    try {
      const alerts = await db().collection(CONFIG.ALERTS_COLLECTION)
        .where('resolved', '==', resolved)
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 100))
        .get();

      return {
        success: true,
        alerts: alerts.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString()
        })),
        count: alerts.size
      };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to get alerts');
    }
  });

/**
 * Résoudre une alerte de paiement
 */
export const resolvePaymentAlert = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { alertId } = data as { alertId: string };
    if (!alertId) {
      throw new functions.https.HttpsError('invalid-argument', 'alertId is required');
    }

    try {
      await db().collection(CONFIG.ALERTS_COLLECTION).doc(alertId).update({
        resolved: true,
        resolvedAt: admin.firestore.Timestamp.now(),
        resolvedBy: context.auth.uid
      });

      return { success: true };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to resolve alert');
    }
  });

/**
 * Obtenir les métriques de paiement récentes
 */
export const getPaymentMetrics = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { days = 7 } = data as { days?: number };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const metrics = await db().collection(CONFIG.METRICS_COLLECTION)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .orderBy('timestamp', 'desc')
        .get();

      return {
        success: true,
        metrics: metrics.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString()
        })),
        count: metrics.size
      };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to get metrics');
    }
  });
