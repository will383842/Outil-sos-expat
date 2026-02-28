/**
 * Firebase Usage Metrics Cloud Function
 *
 * Queries the cost_metrics collection and aggregates Firebase/GCP usage:
 * - Firestore reads/writes/deletes
 * - Cloud Functions invocations and compute time
 * - Storage usage
 * - Estimated cost
 *
 * @version 1.0.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

// ============================================================================
// TYPES
// ============================================================================

interface FirestoreUsage {
  reads: number;
  writes: number;
  deletes: number;
}

interface FunctionsUsage {
  invocations: number;
  computeTime: number; // in milliseconds
}

interface StorageUsage {
  bytesUsed: number;
}

interface FirebaseUsageResponse {
  firestore: FirestoreUsage;
  functions: FunctionsUsage;
  storage: StorageUsage;
  estimatedCost: number;
  currency: 'USD';
  period: string;
  timestamp: Date;
}

interface CostMetricDocument {
  period?: {
    start: admin.firestore.Timestamp;
    end: admin.firestore.Timestamp;
  };
  firestore?: {
    reads: number;
    writes: number;
    estimatedCost: number;
  };
  functions?: {
    invocations: number;
    estimatedCost: number;
  };
  storage?: {
    bytesUsed: number;
    estimatedCost: number;
  };
  totalEstimatedCost?: number;
  calculatedAt?: admin.firestore.Timestamp;
  twilio?: {
    sms?: { hourlyCount?: number; estimatedCostEur?: number };
    voice?: { hourlyCount?: number; estimatedCostEur?: number };
    total?: { estimatedCostEur?: number };
  };
}

// ============================================================================
// PRICING CONFIGURATION (USD)
// ============================================================================

const PRICING_USD = {
  // Firestore pricing (per 100k operations)
  FIRESTORE: {
    READS_PER_100K: 0.036,
    WRITES_PER_100K: 0.108,
    DELETES_PER_100K: 0.012,
  },
  // Cloud Functions pricing
  FUNCTIONS: {
    INVOCATIONS_PER_MILLION: 0.40,
    GB_SECONDS: 0.000025,
    GHZ_SECONDS: 0.000010,
  },
  // Storage pricing (per GB/month)
  STORAGE: {
    STANDARD_PER_GB_MONTH: 0.026,
    OPERATIONS_PER_10K: 0.05,
  },
  // EUR to USD conversion (approximate)
  EUR_TO_USD: 1.08,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifies that the user is an admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    logger.error('[FirebaseUsage] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Gets the period string (e.g., "last 24 hours", "last 7 days")
 */
function getPeriodString(periodDays: number): string {
  if (periodDays === 1) {
    return 'last 24 hours';
  } else if (periodDays === 7) {
    return 'last 7 days';
  } else if (periodDays === 30) {
    return 'last 30 days';
  }
  return `last ${periodDays} day${periodDays > 1 ? 's' : ''}`;
}

/**
 * Aggregates metrics from cost_metrics collection
 */
async function aggregateFromCostMetrics(
  periodStart: Date,
  periodEnd: Date
): Promise<{
  firestore: FirestoreUsage;
  functions: FunctionsUsage;
  storage: StorageUsage;
  totalCostEur: number;
}> {
  const result = {
    firestore: { reads: 0, writes: 0, deletes: 0 },
    functions: { invocations: 0, computeTime: 0 },
    storage: { bytesUsed: 0 },
    totalCostEur: 0,
  };

  try {
    // Query cost_metrics collection for recent entries
    const metricsSnapshot = await db()
      .collection('cost_metrics')
      .where('calculatedAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('calculatedAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
      .orderBy('calculatedAt', 'desc')
      .limit(100)
      .get();

    if (!metricsSnapshot.empty) {
      // Get the most recent metric for storage (it's cumulative)
      const latestDoc = metricsSnapshot.docs[0].data() as CostMetricDocument;

      if (latestDoc.storage?.bytesUsed) {
        result.storage.bytesUsed = latestDoc.storage.bytesUsed;
      }

      // Aggregate reads/writes/invocations from all documents in the period
      metricsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as CostMetricDocument;

        if (data.firestore) {
          result.firestore.reads += data.firestore.reads || 0;
          result.firestore.writes += data.firestore.writes || 0;
        }

        if (data.functions) {
          result.functions.invocations += data.functions.invocations || 0;
        }

        if (data.totalEstimatedCost) {
          result.totalCostEur += data.totalEstimatedCost;
        }
      });

      logger.info('[FirebaseUsage] Aggregated from cost_metrics', {
        documentsProcessed: metricsSnapshot.size,
        firestoreReads: result.firestore.reads,
        firestoreWrites: result.firestore.writes,
      });
    }

    // Also check cost_metrics documents by date (YYYY-MM-DD format)
    const dateDocsSnapshot = await db()
      .collection('cost_metrics')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(30)
      .get();

    dateDocsSnapshot.docs.forEach((doc) => {
      // Check if document ID is a date string (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(doc.id)) {
        const data = doc.data() as CostMetricDocument;

        // Add Twilio costs if present (from aggregateCostMetrics)
        if (data.twilio?.total?.estimatedCostEur) {
          result.totalCostEur += data.twilio.total.estimatedCostEur;
        }
      }
    });

  } catch (error) {
    logger.warn('[FirebaseUsage] Error querying cost_metrics:', error);
  }

  return result;
}

/**
 * Estimates Firestore deletes from system activity
 */
async function estimateFirestoreDeletes(periodStart: Date): Promise<number> {
  try {
    // Check cleanup logs for delete operations
    const cleanupLogs = await db()
      .collection('system_logs')
      .where('type', 'in', ['cleanup', 'ttl_cleanup', 'data_cleanup'])
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .get();

    let totalDeletes = 0;
    cleanupLogs.docs.forEach((doc) => {
      const data = doc.data();
      totalDeletes += data.deletedCount || data.documentsDeleted || 0;
    });

    return totalDeletes;
  } catch (error) {
    logger.warn('[FirebaseUsage] Error estimating deletes:', error);
    return 0;
  }
}

/**
 * Estimates Cloud Functions compute time from logs
 */
async function estimateFunctionsComputeTime(periodStart: Date): Promise<number> {
  try {
    // Get execution time from system logs
    const execLogs = await db()
      .collection('system_logs')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('executionTimeMs', '>', 0)
      .limit(500)
      .get();

    let totalComputeTime = 0;
    execLogs.docs.forEach((doc) => {
      const data = doc.data();
      totalComputeTime += data.executionTimeMs || 0;
    });

    return totalComputeTime;
  } catch (error) {
    logger.warn('[FirebaseUsage] Error estimating compute time:', error);
    return 0;
  }
}

/**
 * Gets latest storage usage estimate
 */
async function getStorageUsage(): Promise<number> {
  try {
    // Check for storage stats in system logs
    const storageLogs = await db()
      .collection('system_logs')
      .where('type', '==', 'storage_stats')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!storageLogs.empty) {
      const data = storageLogs.docs[0].data();
      if (data.totalBytes || data.storageBytes) {
        return data.totalBytes || data.storageBytes;
      }
    }

    // Fallback: estimate from backup logs
    const backupLogs = await db()
      .collection('system_logs')
      .where('type', '==', 'backup')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!backupLogs.empty) {
      const data = backupLogs.docs[0].data();
      if (data.storageBytes) {
        return data.storageBytes;
      }
    }

    // If no storage logs, estimate from document counts
    return await estimateStorageFromDocuments();
  } catch (error) {
    logger.warn('[FirebaseUsage] Error getting storage usage:', error);
    return 0;
  }
}

/**
 * Estimates storage from document counts
 */
async function estimateStorageFromDocuments(): Promise<number> {
  const collections = [
    { name: 'users', avgSize: 2000 },
    { name: 'providers', avgSize: 5000 },
    { name: 'payments', avgSize: 1500 },
    { name: 'call_sessions', avgSize: 2000 },
    { name: 'bookings', avgSize: 1000 },
    { name: 'reviews', avgSize: 500 },
    { name: 'notifications', avgSize: 300 },
    { name: 'system_logs', avgSize: 500 },
    { name: 'error_logs', avgSize: 1000 },
  ];

  let totalBytes = 0;

  for (const col of collections) {
    try {
      const count = await db().collection(col.name).count().get();
      totalBytes += count.data().count * col.avgSize;
    } catch {
      // Collection may not exist, skip
    }
  }

  return totalBytes;
}

/**
 * Calculates estimated cost in USD
 */
function calculateEstimatedCostUSD(
  firestore: FirestoreUsage,
  functions: FunctionsUsage,
  storage: StorageUsage,
  existingCostEur: number
): number {
  // Firestore costs
  const firestoreReadsCost = (firestore.reads / 100000) * PRICING_USD.FIRESTORE.READS_PER_100K;
  const firestoreWritesCost = (firestore.writes / 100000) * PRICING_USD.FIRESTORE.WRITES_PER_100K;
  const firestoreDeletesCost = (firestore.deletes / 100000) * PRICING_USD.FIRESTORE.DELETES_PER_100K;
  const firestoreTotalCost = firestoreReadsCost + firestoreWritesCost + firestoreDeletesCost;

  // Functions costs
  const functionInvocationsCost = (functions.invocations / 1000000) * PRICING_USD.FUNCTIONS.INVOCATIONS_PER_MILLION;
  // Estimate GB-seconds from compute time (assuming 256MB average memory)
  const gbSeconds = (functions.computeTime / 1000) * 0.25; // 256MB = 0.25GB
  const functionsComputeCost = gbSeconds * PRICING_USD.FUNCTIONS.GB_SECONDS;
  const functionsTotalCost = functionInvocationsCost + functionsComputeCost;

  // Storage costs (pro-rated for the period)
  const storageGB = storage.bytesUsed / (1024 * 1024 * 1024);
  const storageCost = storageGB * PRICING_USD.STORAGE.STANDARD_PER_GB_MONTH;

  // Convert existing EUR cost to USD and add
  const existingCostUsd = existingCostEur * PRICING_USD.EUR_TO_USD;

  const totalCost = firestoreTotalCost + functionsTotalCost + storageCost + existingCostUsd;

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getFirebaseUsage - Cloud Function onCall (admin only)
 *
 * Queries the cost_metrics collection and aggregates Firebase/GCP usage metrics.
 *
 * @param data.periodDays - Number of days to analyze (default: 1 for 24h)
 * @returns FirebaseUsageResponse - Object containing all usage metrics
 */
export const getFirebaseUsage = functions.onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<FirebaseUsageResponse> => {
    // Authentication verification
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new functions.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    logger.info('[FirebaseUsage] Fetching Firebase usage metrics', {
      uid: request.auth.uid,
    });

    try {
      // Determine the analysis period
      const periodDays = request.data?.periodDays || 1;
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Aggregate metrics from cost_metrics collection
      const aggregatedMetrics = await aggregateFromCostMetrics(periodStart, periodEnd);

      // Estimate additional metrics
      const [firestoreDeletes, computeTime, storageBytes] = await Promise.all([
        estimateFirestoreDeletes(periodStart),
        estimateFunctionsComputeTime(periodStart),
        aggregatedMetrics.storage.bytesUsed > 0
          ? Promise.resolve(aggregatedMetrics.storage.bytesUsed)
          : getStorageUsage(),
      ]);

      // Build the usage objects
      const firestoreUsage: FirestoreUsage = {
        reads: aggregatedMetrics.firestore.reads,
        writes: aggregatedMetrics.firestore.writes,
        deletes: firestoreDeletes,
      };

      const functionsUsage: FunctionsUsage = {
        invocations: aggregatedMetrics.functions.invocations,
        computeTime: computeTime,
      };

      const storageUsage: StorageUsage = {
        bytesUsed: storageBytes,
      };

      // Calculate estimated cost in USD
      const estimatedCost = calculateEstimatedCostUSD(
        firestoreUsage,
        functionsUsage,
        storageUsage,
        aggregatedMetrics.totalCostEur
      );

      // Build response
      const response: FirebaseUsageResponse = {
        firestore: firestoreUsage,
        functions: functionsUsage,
        storage: storageUsage,
        estimatedCost,
        currency: 'USD',
        period: getPeriodString(periodDays),
        timestamp: new Date(),
      };

      // Log metrics for audit
      logger.info('[FirebaseUsage] Usage metrics calculated', {
        period: response.period,
        firestoreReads: firestoreUsage.reads,
        firestoreWrites: firestoreUsage.writes,
        firestoreDeletes: firestoreUsage.deletes,
        functionsInvocations: functionsUsage.invocations,
        functionsComputeTimeMs: functionsUsage.computeTime,
        storageMB: (storageUsage.bytesUsed / (1024 * 1024)).toFixed(2),
        estimatedCostUSD: estimatedCost,
      });

      return response;
    } catch (error) {
      logger.error('[FirebaseUsage] Error fetching usage metrics:', error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch Firebase usage metrics'
      );
    }
  }
);
