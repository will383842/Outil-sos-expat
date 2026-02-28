/**
 * Cleanup Audit Logs
 *
 * Supprime les entrées d'audit de plus de 3 ans dans les collections :
 * - admin_audit_logs
 * - admin_actions
 * - payment_audit_logs
 * - provider_action_logs
 * - auth_claims_logs
 *
 * Note: gdpr_audit_logs a déjà son propre TTL de 3 ans.
 *
 * Exécution: 1er de chaque mois à 4h00 (Europe/Paris)
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const AUDIT_COLLECTIONS = [
  'admin_audit_logs',
  'admin_actions',
  'payment_audit_logs',
  'provider_action_logs',
  'auth_claims_logs',
];

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 400; // Firestore batch limit is 500, leave room

/**
 * Delete old documents from a single collection
 */
async function cleanupCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  cutoffDate: Date,
): Promise<number> {
  let totalDeleted = 0;
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
  const cutoffIso = cutoffDate.toISOString();

  // Try each field with both Timestamp and ISO string comparisons (handles mixed types)
  const timestampFields = ['timestamp', 'createdAt', 'created_at'];
  const cutoffValues = [cutoffTimestamp, cutoffIso];

  for (const field of timestampFields) {
    for (const cutoff of cutoffValues) {
      try {
        let hasMore = true;
        while (hasMore) {
          const snapshot = await db
            .collection(collectionName)
            .where(field, '<', cutoff)
            .limit(BATCH_SIZE)
            .get();

          if (snapshot.empty) {
            hasMore = false;
            break;
          }

          const batch = db.batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          totalDeleted += snapshot.size;

          if (snapshot.size < BATCH_SIZE) {
            hasMore = false;
          }
        }

        if (totalDeleted > 0) return totalDeleted; // Found the right field+type
      } catch {
        // Field/type combo doesn't work, try next
        continue;
      }
    }
  }

  return totalDeleted;
}

export const cleanupAuditLogs = scheduler.onSchedule(
  {
    schedule: '0 4 1 * *', // 1st of each month at 4:00 AM
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 540, // 9 minutes max
    maxInstances: 1,
  },
  async () => {
    ensureInitialized();
    const db = getFirestore();
    const cutoffDate = new Date(Date.now() - THREE_YEARS_MS);

    logger.info('[cleanupAuditLogs] Starting cleanup', {
      cutoffDate: cutoffDate.toISOString(),
      collections: AUDIT_COLLECTIONS,
    });

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    for (const collection of AUDIT_COLLECTIONS) {
      try {
        const deleted = await cleanupCollection(db, collection, cutoffDate);
        results[collection] = deleted;
        totalDeleted += deleted;

        if (deleted > 0) {
          logger.info(`[cleanupAuditLogs] Cleaned ${collection}`, { deleted });
        }
      } catch (error) {
        logger.error(`[cleanupAuditLogs] Error cleaning ${collection}`, {
          error: error instanceof Error ? error.message : 'Unknown',
        });
        results[collection] = -1; // Mark as error
      }
    }

    logger.info('[cleanupAuditLogs] Cleanup complete', {
      totalDeleted,
      results,
    });
  }
);
