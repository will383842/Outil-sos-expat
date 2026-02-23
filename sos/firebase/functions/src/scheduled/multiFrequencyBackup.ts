/**
 * Multi-Frequency Backup System
 *
 * Execute des sauvegardes Firestore 3 fois par jour pour minimiser le RPO
 * - 3h du matin (Paris) - Backup principal
 * - 11h du matin (Paris) - Backup mi-journee
 * - 19h (Paris) - Backup fin de journee
 *
 * Cela reduit le RPO de 24h a 8h maximum
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as crypto from "crypto";
import { logger } from "firebase-functions";
// P2-6 FIX: Use shared constants instead of magic numbers
import { FIRESTORE_BATCH_LIMIT } from "../lib/constants";

// CRITICAL: Lazy initialization to avoid deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
let _client: InstanceType<typeof admin.firestore.v1.FirestoreAdminClient> | null = null;

function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getClient() {
  ensureInitialized();
  if (!_client) {
    _client = new admin.firestore.v1.FirestoreAdminClient();
  }
  return _client;
}

// Configuration - Rétention différenciée
const CONFIG = {
  // Backups standards: 30 jours (restauration opérationnelle rapide)
  STANDARD_RETENTION_DAYS: 30,
  // Archives financières: JAMAIS supprimées automatiquement (conformité légale 10 ans)
  // Le cleanup ne touche PAS aux backups marqués 'financial'
  CRITICAL_COLLECTIONS: [
    "users",
    "sos_profiles",
    "call_sessions",
    "payments",
    "subscriptions",
    "invoices",
  ],
  // Collections financières - conservation indéfinie
  FINANCIAL_COLLECTIONS: [
    "payments",
    "invoices",
    "invoice_records",
    "admin_invoices",
    "transfers",
    "refunds",
    "disputes",
    "journal_entries",
    "subscriptions",
  ],
};

/**
 * Calcule un checksum base sur les metadonnees du backup
 */
function generateBackupChecksum(
  projectId: string,
  timestamp: number,
  operationName: string
): string {
  const data = `${projectId}:${timestamp}:${operationName}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

/**
 * Compte les documents dans les collections critiques
 */
async function getCollectionCounts(): Promise<Record<string, number>> {
  ensureInitialized();
  const counts: Record<string, number> = {};

  for (const collectionId of CONFIG.CRITICAL_COLLECTIONS) {
    try {
      const snapshot = await admin
        .firestore()
        .collection(collectionId)
        .count()
        .get();
      counts[collectionId] = snapshot.data().count;
    } catch {
      counts[collectionId] = -1;
    }
  }

  return counts;
}

/**
 * Fonction de backup generique reutilisable
 */
async function performBackup(schedule: string, backupType: 'morning' | 'midday' | 'evening') {
  ensureInitialized();
  const startTime = Date.now();
  const db = admin.firestore();
  const client = getClient();

  try {
    logger.info(`[MultiFrequencyBackup] Starting ${backupType} backup...`);

    const projectId = process.env.GCLOUD_PROJECT as string;
    const bucket = `gs://${projectId}.firebasestorage.app`;
    const databaseName = client.databasePath(projectId, "(default)");
    const timestamp = Date.now();

    // Obtenir les counts avant backup
    const collectionCounts = await getCollectionCounts();
    const totalDocuments = Object.values(collectionCounts).reduce(
      (a, b) => (b > 0 ? a + b : a),
      0
    );

    logger.info(`[MultiFrequencyBackup] Collection counts:`, collectionCounts);

    const [operation] = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: `${bucket}/scheduled-backups/${backupType}/backup-${timestamp}`,
      collectionIds: [],
    });

    logger.info(`[MultiFrequencyBackup] Export operation started:`, operation.name);

    // Generer le checksum
    const checksum = generateBackupChecksum(
      projectId,
      timestamp,
      operation.name || ""
    );

    // Sauvegarder les metadonnees
    const backupDoc = await db.collection("backups").add({
      type: "automatic",
      backupType, // morning, midday, evening
      status: "completed",
      operationName: operation.name,
      bucketPath: `${bucket}/scheduled-backups/${backupType}/backup-${timestamp}`,
      createdBy: "system",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp,
      schedule,
      checksum,
      collectionCounts,
      totalDocuments,
      executionTimeMs: Date.now() - startTime,
      version: "3.1",
      retentionDays: CONFIG.STANDARD_RETENTION_DAYS,
      // Les données financières ne sont JAMAIS supprimées (conformité légale)
      containsFinancialData: true,
    });

    // Log dans system_logs
    await db.collection("system_logs").add({
      type: "firestore_backup",
      backupType,
      backupId: backupDoc.id,
      operationName: operation.name,
      checksum,
      totalDocuments,
      success: true,
      executionTimeMs: Date.now() - startTime,
      createdAt: admin.firestore.Timestamp.now(),
    });

    logger.info(
      `[MultiFrequencyBackup] ${backupType} backup completed. Checksum: ${checksum}, Documents: ${totalDocuments}`
    );

    return { success: true, backupId: backupDoc.id, checksum };

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`[MultiFrequencyBackup] ${backupType} backup failed:`, err);

    await db.collection("backup_errors").add({
      type: "scheduled",
      backupType,
      error: err.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      executionTimeMs: Date.now() - startTime,
    });

    // Creer une alerte critique
    await db.collection("system_alerts").add({
      type: "backup_failure",
      severity: "critical",
      message: `${backupType} Firestore backup failed: ${err.message}`,
      acknowledged: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    throw error;
  }
}

/**
 * Backup du matin - 3h (Paris) - PRINCIPAL
 */
export const morningBackup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
  },
  async () => {
    await performBackup("0 3 * * *", "morning");
  }
);

/**
 * Backup mi-journee - 11h (Paris)
 *
 * DÉSACTIVÉ le 2025-01-16 pour réduction des coûts.
 * Le backup du matin (3h) suffit pour la plupart des cas.
 * RPO passe de 8h à 24h max - acceptable pour le volume actuel.
 * Économie estimée: ~€240-360/mois
 */
// export const middayBackup = onSchedule(
//   {
//     schedule: "0 11 * * *",
//     timeZone: "Europe/Paris",
//     region: "europe-west3",
//     memory: "512MiB",
//     timeoutSeconds: 300,
//   },
//   async () => {
//     await performBackup("0 11 * * *", "midday");
//   }
// );

/**
 * Backup du soir - 19h (Paris)
 *
 * DÉSACTIVÉ le 2025-01-16 pour réduction des coûts.
 * Le backup du matin (3h) suffit pour la plupart des cas.
 * Économie estimée: ~€240-360/mois
 */
// export const eveningBackup = onSchedule(
//   {
//     schedule: "0 19 * * *",
//     timeZone: "Europe/Paris",
//     region: "europe-west3",
//     memory: "512MiB",
//     timeoutSeconds: 300,
//   },
//   async () => {
//     await performBackup("0 19 * * *", "evening");
//   }
// );

/**
 * Nettoyage des anciens backups
 * - Supprime les backups standards > 30 jours
 * - NE JAMAIS supprimer les backups contenant des données financières
 * Execute une fois par semaine le dimanche a 4h
 */
export const cleanupOldBackups = onSchedule(
  {
    schedule: "0 4 * * 0", // Dimanche a 4h
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.STANDARD_RETENTION_DAYS);

    logger.info(`[CleanupBackups] Cleaning up standard backups older than ${cutoffDate.toISOString()}`);
    logger.info(`[CleanupBackups] Note: Financial data backups are NEVER deleted (legal compliance)`);

    try {
      // Ne récupérer QUE les backups qui ne contiennent PAS de données financières
      // et qui sont plus anciens que la date limite
      const oldBackups = await db
        .collection("backups")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .where("containsFinancialData", "==", false)
        .get();

      let deleted = 0;
      let skippedFinancial = 0;
      let batch = db.batch(); // P1 FIX: let (not const) to allow reset after each commit

      for (const doc of oldBackups.docs) {
        const data = doc.data();

        // Double vérification: ne JAMAIS supprimer les backups financiers
        if (data.containsFinancialData === true) {
          skippedFinancial++;
          continue;
        }

        batch.delete(doc.ref);
        deleted++;

        // Commit par lots de 500 et réinitialiser le batch
        // P1 FIX: Without batch = db.batch() after commit, Firestore throws
        // "Cannot modify a WriteBatch that has already been committed"
        if (deleted % FIRESTORE_BATCH_LIMIT === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }

      if (deleted % FIRESTORE_BATCH_LIMIT !== 0) {
        await batch.commit();
      }

      logger.info(`[CleanupBackups] Deleted ${deleted} old standard backup records, preserved ${skippedFinancial} financial backups`);

      // Log l'action
      await db.collection("system_logs").add({
        type: "backup_cleanup",
        deletedCount: deleted,
        preservedFinancial: skippedFinancial,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: CONFIG.STANDARD_RETENTION_DAYS,
        createdAt: admin.firestore.Timestamp.now(),
      });

    } catch (error) {
      logger.error("[CleanupBackups] Failed:", error);
      throw error;
    }
  }
);
