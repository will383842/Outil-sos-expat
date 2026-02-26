/**
 * Cost Metrics Cloud Function
 *
 * Calcule et retourne les metriques de couts estimees pour:
 * - Twilio (SMS, appels vocaux)
 * - Firestore (lectures/ecritures)
 * - Cloud Functions (invocations)
 * - Storage (octets utilises)
 *
 * @version 1.0.0
 * @admin-only Cette fonction est reservee aux administrateurs
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// ============================================================================
// TYPES
// ============================================================================

interface TwilioCosts {
  smsCount: number;
  voiceMinutes: number;
  estimatedCost: number;
}

interface FirestoreCosts {
  reads: number;
  writes: number;
  estimatedCost: number;
}

interface FunctionsCosts {
  invocations: number;
  estimatedCost: number;
}

interface StorageCosts {
  bytesUsed: number;
  estimatedCost: number;
}

interface CostAlert {
  type: string;
  message: string;
  timestamp: Date;
}

interface CostMetrics {
  period: {
    start: Date;
    end: Date;
  };
  twilio: TwilioCosts;
  firestore: FirestoreCosts;
  functions: FunctionsCosts;
  storage: StorageCosts;
  totalEstimatedCost: number;
  alerts: CostAlert[];
}

// ============================================================================
// CONFIGURATION DES PRIX
// ============================================================================

const PRICING = {
  // Twilio pricing (approximatif Europe)
  TWILIO: {
    SMS_OUTBOUND_EUR: 0.075,        // Prix par SMS sortant
    SMS_INBOUND_EUR: 0.0075,        // Prix par SMS entrant
    VOICE_PER_MINUTE_EUR: 0.014,    // Prix par minute d'appel
    PHONE_NUMBER_MONTHLY_EUR: 1.15, // Prix mensuel numero
  },
  // Firestore pricing (approximatif, par 100k operations)
  FIRESTORE: {
    READS_PER_100K_EUR: 0.036,
    WRITES_PER_100K_EUR: 0.108,
    DELETES_PER_100K_EUR: 0.012,
  },
  // Cloud Functions pricing
  FUNCTIONS: {
    INVOCATIONS_PER_MILLION_EUR: 0.40,
    GB_SECONDS_EUR: 0.000025,
    GHZ_SECONDS_EUR: 0.000010,
  },
  // Storage pricing (par GB/mois)
  STORAGE: {
    STANDARD_PER_GB_MONTH_EUR: 0.026,
    OPERATIONS_PER_10K_EUR: 0.05,
  },
  // Seuils d'alerte
  THRESHOLDS: {
    DAILY_COST_WARNING_EUR: 10,
    DAILY_COST_CRITICAL_EUR: 50,
    SMS_COUNT_WARNING: 100,
    SMS_COUNT_CRITICAL: 500,
    VOICE_MINUTES_WARNING: 120,
    VOICE_MINUTES_CRITICAL: 500,
    FIRESTORE_READS_WARNING: 500000,
    FIRESTORE_READS_CRITICAL: 2000000,
    FUNCTION_INVOCATIONS_WARNING: 100000,
    FUNCTION_INVOCATIONS_CRITICAL: 500000,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifie que l'utilisateur est admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    logger.error('[CostMetrics] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Recupere les stats de rate limits pour SMS
 */
async function getSmsRateLimitStats(periodStart: Date): Promise<{ count: number }> {
  try {
    // Recuperer le document global de rate limit SMS
    const smsGlobalDoc = await db().collection('rate_limits').doc('sms_global').get();

    if (!smsGlobalDoc.exists) {
      return { count: 0 };
    }

    const data = smsGlobalDoc.data();
    if (!data) {
      return { count: 0 };
    }

    // Si la fenetre est active (moins d'1h), retourner le compteur
    const windowStart = data.windowStart || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (now - windowStart < oneHour) {
      return { count: data.count || 0 };
    }

    // Sinon, estimer depuis les logs de notifications SMS
    const smsLogs = await db().collection('notification_deliveries')
      .where('channel', '==', 'sms')
      .where('status', '==', 'sent')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();

    return { count: smsLogs.data().count };
  } catch (error) {
    logger.error('[CostMetrics] Error getting SMS stats:', error);
    return { count: 0 };
  }
}

/**
 * Recupere les stats de rate limits pour Voice
 */
async function getVoiceRateLimitStats(periodStart: Date): Promise<{ count: number; totalMinutes: number }> {
  try {
    // Recuperer le document global de rate limit Voice
    const voiceGlobalDoc = await db().collection('rate_limits').doc('voice_global').get();

    let currentWindowCount = 0;
    if (voiceGlobalDoc.exists) {
      const data = voiceGlobalDoc.data();
      const windowStart = data?.windowStart || 0;
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - windowStart < oneHour) {
        currentWindowCount = data?.count || 0;
      }
    }

    // Calculer les minutes totales depuis les sessions d'appel
    const callSessions = await db().collection('call_sessions')
      .where('status', '==', 'completed')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .get();

    let totalMinutes = 0;
    let callCount = 0;

    callSessions.docs.forEach(doc => {
      const data = doc.data();
      const durationSeconds = data.duration || data.actualDuration || 0;
      totalMinutes += durationSeconds / 60;
      callCount++;
    });

    return {
      count: Math.max(currentWindowCount, callCount),
      totalMinutes: Math.ceil(totalMinutes),
    };
  } catch (error) {
    logger.error('[CostMetrics] Error getting Voice stats:', error);
    return { count: 0, totalMinutes: 0 };
  }
}

/**
 * Recupere les stats de rate limits pour Contact
 */
async function getContactRateLimitStats(periodStart: Date): Promise<{ count: number }> {
  try {
    // Compter les messages de contact depuis la periode
    const contactMessages = await db().collection('contact_messages')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();

    return { count: contactMessages.data().count };
  } catch (error) {
    logger.error('[CostMetrics] Error getting Contact stats:', error);
    return { count: 0 };
  }
}

/**
 * Estime l'usage Firestore depuis les logs d'activite
 */
async function estimateFirestoreUsage(periodStart: Date): Promise<{ reads: number; writes: number }> {
  try {
    // Recuperer les metriques depuis les logs si disponibles
    const metricsSnapshot = await db().collection('payment_metrics')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .get();

    // Estimation basee sur l'activite
    // Chaque metrique = environ 50 reads (aggregations) + 1 write (log)
    const metricsReads = metricsSnapshot.size * 50;
    const metricsWrites = metricsSnapshot.size;

    // Estimer les reads/writes depuis les collections principales
    const collections = [
      'users',
      'providers',
      'payments',
      'call_sessions',
      'bookings',
      'reviews',
      'notifications',
      'contact_messages',
    ];

    let estimatedReads = metricsReads;
    let estimatedWrites = metricsWrites;

    // Pour chaque collection, estimer l'activite
    for (const collectionName of collections) {
      try {
        // Compter les documents modifies recemment
        const recentDocs = await db().collection(collectionName)
          .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
          .count()
          .get();

        const count = recentDocs.data().count;

        // Estimation: chaque write genere 2-3 reads (validation, triggers)
        estimatedWrites += count;
        estimatedReads += count * 2.5;
      } catch {
        // Collection peut ne pas avoir updatedAt, ignorer
      }
    }

    // Ajouter les reads des Cloud Functions scheduled
    // Estimation: ~100 reads par heure pour le monitoring
    const hoursSincePeriodStart = (Date.now() - periodStart.getTime()) / (1000 * 60 * 60);
    estimatedReads += Math.ceil(hoursSincePeriodStart * 100);

    // Ajouter les writes des logs
    const errorLogs = await db().collection('error_logs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    estimatedWrites += errorLogs.data().count;

    const systemLogs = await db().collection('system_logs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    estimatedWrites += systemLogs.data().count;

    return {
      reads: Math.ceil(estimatedReads),
      writes: Math.ceil(estimatedWrites),
    };
  } catch (error) {
    logger.error('[CostMetrics] Error estimating Firestore usage:', error);
    return { reads: 0, writes: 0 };
  }
}

/**
 * Estime l'usage des Cloud Functions
 */
async function estimateFunctionsUsage(periodStart: Date): Promise<{ invocations: number }> {
  try {
    // Compter les invocations depuis les logs
    let totalInvocations = 0;

    // Webhook DLQ entries = invocations de webhooks
    const webhookLogs = await db().collection('webhook_dlq')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    totalInvocations += webhookLogs.data().count;

    // Notification deliveries = invocations de notifications
    const notificationLogs = await db().collection('notification_deliveries')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    totalInvocations += notificationLogs.data().count;

    // Call sessions = invocations de scheduling + webhooks Twilio
    const callSessions = await db().collection('call_sessions')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    // Chaque appel genere ~5 invocations (create, schedule, status updates, webhooks)
    totalInvocations += callSessions.data().count * 5;

    // Payments = invocations Stripe/PayPal
    const payments = await db().collection('payments')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .count()
      .get();
    // Chaque paiement genere ~3 invocations (create, capture, webhook)
    totalInvocations += payments.data().count * 3;

    // Scheduled functions (estimation basee sur le temps)
    const hoursSincePeriodStart = (Date.now() - periodStart.getTime()) / (1000 * 60 * 60);
    // Environ 10 scheduled functions par heure
    totalInvocations += Math.ceil(hoursSincePeriodStart * 10);

    return { invocations: totalInvocations };
  } catch (error) {
    logger.error('[CostMetrics] Error estimating Functions usage:', error);
    return { invocations: 0 };
  }
}

/**
 * Estime l'usage du Storage
 */
async function estimateStorageUsage(): Promise<{ bytesUsed: number }> {
  try {
    // Obtenir les stats depuis le dernier backup ou estimation
    const backupLogs = await db().collection('system_logs')
      .where('type', '==', 'backup')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!backupLogs.empty) {
      const data = backupLogs.docs[0].data();
      if (data.storageBytes) {
        return { bytesUsed: data.storageBytes };
      }
    }

    // Estimation basee sur le nombre de documents
    // En moyenne: ~2KB par document Firestore, ~500KB par fichier Storage
    const estimatedFirestoreBytes = await estimateFirestoreDocumentBytes();

    // Estimer les fichiers Storage (photos, documents, invoices)
    const providers = await db().collection('providers').count().get();
    const users = await db().collection('users').count().get();

    // Estimation: 20% des providers ont une photo (~200KB), 5% des users (~100KB)
    const providerPhotosBytes = providers.data().count * 0.2 * 200 * 1024;
    const userPhotosBytes = users.data().count * 0.05 * 100 * 1024;

    // Invoices: environ 50KB par facture
    const invoices = await db().collection('invoices').count().get();
    const invoicesBytes = invoices.data().count * 50 * 1024;

    const totalBytes = estimatedFirestoreBytes + providerPhotosBytes + userPhotosBytes + invoicesBytes;

    return { bytesUsed: Math.ceil(totalBytes) };
  } catch (error) {
    logger.error('[CostMetrics] Error estimating Storage usage:', error);
    return { bytesUsed: 0 };
  }
}

/**
 * Estime la taille totale des documents Firestore
 */
async function estimateFirestoreDocumentBytes(): Promise<number> {
  const collections = [
    { name: 'users', avgSize: 2000 },
    { name: 'providers', avgSize: 5000 },
    { name: 'payments', avgSize: 1500 },
    { name: 'call_sessions', avgSize: 2000 },
    { name: 'bookings', avgSize: 1000 },
    { name: 'reviews', avgSize: 500 },
    { name: 'notifications', avgSize: 300 },
    { name: 'rate_limits', avgSize: 200 },
    { name: 'system_logs', avgSize: 500 },
    { name: 'error_logs', avgSize: 1000 },
  ];

  let totalBytes = 0;

  for (const col of collections) {
    try {
      const count = await db().collection(col.name).count().get();
      totalBytes += count.data().count * col.avgSize;
    } catch {
      // Ignorer les collections inexistantes
    }
  }

  return totalBytes;
}

/**
 * Genere les alertes de couts
 */
function generateCostAlerts(metrics: {
  twilio: TwilioCosts;
  firestore: FirestoreCosts;
  functions: FunctionsCosts;
  totalCost: number;
}): CostAlert[] {
  const alerts: CostAlert[] = [];
  const now = new Date();

  // Alertes Twilio SMS
  if (metrics.twilio.smsCount >= PRICING.THRESHOLDS.SMS_COUNT_CRITICAL) {
    alerts.push({
      type: 'critical',
      message: `Volume SMS critique: ${metrics.twilio.smsCount} SMS envoyes. Verifier les abus potentiels.`,
      timestamp: now,
    });
  } else if (metrics.twilio.smsCount >= PRICING.THRESHOLDS.SMS_COUNT_WARNING) {
    alerts.push({
      type: 'warning',
      message: `Volume SMS eleve: ${metrics.twilio.smsCount} SMS envoyes.`,
      timestamp: now,
    });
  }

  // Alertes Twilio Voice
  if (metrics.twilio.voiceMinutes >= PRICING.THRESHOLDS.VOICE_MINUTES_CRITICAL) {
    alerts.push({
      type: 'critical',
      message: `Volume appels critique: ${metrics.twilio.voiceMinutes} minutes. Verifier les abus potentiels.`,
      timestamp: now,
    });
  } else if (metrics.twilio.voiceMinutes >= PRICING.THRESHOLDS.VOICE_MINUTES_WARNING) {
    alerts.push({
      type: 'warning',
      message: `Volume appels eleve: ${metrics.twilio.voiceMinutes} minutes.`,
      timestamp: now,
    });
  }

  // Alertes Firestore
  if (metrics.firestore.reads >= PRICING.THRESHOLDS.FIRESTORE_READS_CRITICAL) {
    alerts.push({
      type: 'critical',
      message: `Lectures Firestore critiques: ${(metrics.firestore.reads / 1000000).toFixed(2)}M reads. Optimiser les requetes.`,
      timestamp: now,
    });
  } else if (metrics.firestore.reads >= PRICING.THRESHOLDS.FIRESTORE_READS_WARNING) {
    alerts.push({
      type: 'warning',
      message: `Lectures Firestore elevees: ${(metrics.firestore.reads / 1000).toFixed(0)}K reads.`,
      timestamp: now,
    });
  }

  // Alertes Functions
  if (metrics.functions.invocations >= PRICING.THRESHOLDS.FUNCTION_INVOCATIONS_CRITICAL) {
    alerts.push({
      type: 'critical',
      message: `Invocations Functions critiques: ${(metrics.functions.invocations / 1000).toFixed(0)}K invocations.`,
      timestamp: now,
    });
  } else if (metrics.functions.invocations >= PRICING.THRESHOLDS.FUNCTION_INVOCATIONS_WARNING) {
    alerts.push({
      type: 'warning',
      message: `Invocations Functions elevees: ${(metrics.functions.invocations / 1000).toFixed(0)}K invocations.`,
      timestamp: now,
    });
  }

  // Alertes cout total
  if (metrics.totalCost >= PRICING.THRESHOLDS.DAILY_COST_CRITICAL_EUR) {
    alerts.push({
      type: 'critical',
      message: `Cout journalier critique: ${metrics.totalCost.toFixed(2)} EUR. Action immediate requise.`,
      timestamp: now,
    });
  } else if (metrics.totalCost >= PRICING.THRESHOLDS.DAILY_COST_WARNING_EUR) {
    alerts.push({
      type: 'warning',
      message: `Cout journalier eleve: ${metrics.totalCost.toFixed(2)} EUR. Surveiller l'evolution.`,
      timestamp: now,
    });
  }

  return alerts;
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getCostMetrics - Cloud Function onCall (admin only)
 *
 * Recupere les metriques de couts estimees pour la periode specifiee.
 *
 * @param data.periodDays - Nombre de jours a analyser (defaut: 1 pour 24h)
 * @returns CostMetrics - Objet contenant toutes les metriques de couts
 */
export const getCostMetrics = functions
  .region('europe-west1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context): Promise<CostMetrics> => {
    // Verification d'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Verification admin
    const isAdmin = await verifyAdminAccess(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    logger.info('[CostMetrics] Calculating cost metrics', { uid: context.auth.uid });

    try {
      // Determiner la periode d'analyse
      const periodDays = data?.periodDays || 1;
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Recuperer les stats de rate limits
      const [smsStats, voiceStats, _contactStats] = await Promise.all([
        getSmsRateLimitStats(periodStart),
        getVoiceRateLimitStats(periodStart),
        getContactRateLimitStats(periodStart),
      ]);

      // Estimer l'usage Firestore, Functions et Storage
      const [firestoreUsage, functionsUsage, storageUsage] = await Promise.all([
        estimateFirestoreUsage(periodStart),
        estimateFunctionsUsage(periodStart),
        estimateStorageUsage(),
      ]);

      // Calculer les couts Twilio
      const twilioCosts: TwilioCosts = {
        smsCount: smsStats.count,
        voiceMinutes: voiceStats.totalMinutes,
        estimatedCost:
          smsStats.count * PRICING.TWILIO.SMS_OUTBOUND_EUR +
          voiceStats.totalMinutes * PRICING.TWILIO.VOICE_PER_MINUTE_EUR,
      };

      // Calculer les couts Firestore
      const firestoreCosts: FirestoreCosts = {
        reads: firestoreUsage.reads,
        writes: firestoreUsage.writes,
        estimatedCost:
          (firestoreUsage.reads / 100000) * PRICING.FIRESTORE.READS_PER_100K_EUR +
          (firestoreUsage.writes / 100000) * PRICING.FIRESTORE.WRITES_PER_100K_EUR,
      };

      // Calculer les couts Functions
      const functionsCosts: FunctionsCosts = {
        invocations: functionsUsage.invocations,
        estimatedCost:
          (functionsUsage.invocations / 1000000) * PRICING.FUNCTIONS.INVOCATIONS_PER_MILLION_EUR,
      };

      // Calculer les couts Storage
      const storageCosts: StorageCosts = {
        bytesUsed: storageUsage.bytesUsed,
        estimatedCost:
          (storageUsage.bytesUsed / (1024 * 1024 * 1024)) *
          PRICING.STORAGE.STANDARD_PER_GB_MONTH_EUR *
          (periodDays / 30), // Prorata pour la periode
      };

      // Cout total
      const totalEstimatedCost =
        twilioCosts.estimatedCost +
        firestoreCosts.estimatedCost +
        functionsCosts.estimatedCost +
        storageCosts.estimatedCost;

      // Generer les alertes
      const alerts = generateCostAlerts({
        twilio: twilioCosts,
        firestore: firestoreCosts,
        functions: functionsCosts,
        totalCost: totalEstimatedCost,
      });

      // Construire la reponse
      const metrics: CostMetrics = {
        period: {
          start: periodStart,
          end: periodEnd,
        },
        twilio: twilioCosts,
        firestore: firestoreCosts,
        functions: functionsCosts,
        storage: storageCosts,
        totalEstimatedCost,
        alerts,
      };

      // Logger les metriques pour audit
      logger.info('[CostMetrics] Metrics calculated', {
        period: `${periodDays} day(s)`,
        totalCost: totalEstimatedCost.toFixed(2),
        alertsCount: alerts.length,
        smsCount: smsStats.count,
        voiceMinutes: voiceStats.totalMinutes,
        firestoreReads: firestoreUsage.reads,
        firestoreWrites: firestoreUsage.writes,
        functionsInvocations: functionsUsage.invocations,
        storageMB: (storageUsage.bytesUsed / (1024 * 1024)).toFixed(2),
      });

      // Optionnel: sauvegarder les metriques pour historique
      await db().collection('cost_metrics').add({
        ...metrics,
        period: {
          start: admin.firestore.Timestamp.fromDate(periodStart),
          end: admin.firestore.Timestamp.fromDate(periodEnd),
        },
        alerts: alerts.map(a => ({
          ...a,
          timestamp: admin.firestore.Timestamp.fromDate(a.timestamp),
        })),
        calculatedAt: admin.firestore.Timestamp.now(),
        calculatedBy: context.auth.uid,
      });

      return metrics;
    } catch (error) {
      logger.error('[CostMetrics] Error calculating metrics:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to calculate cost metrics'
      );
    }
  });
