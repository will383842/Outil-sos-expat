// functions/src/scheduledBackup.ts
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as crypto from "crypto";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const client = new admin.firestore.v1.FirestoreAdminClient();

// Configuration
const CONFIG = {
  RETENTION_DAYS: 30,
  CRITICAL_COLLECTIONS: [
    "users",
    "sos_profiles",
    "call_sessions",
    "payments",
    "subscriptions",
    "invoices",
  ],
};

/**
 * Calcule un checksum basé sur les métadonnées du backup
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
 * Compte les documents dans les collections critiques pour validation
 */
async function getCollectionCounts(): Promise<Record<string, number>> {
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
      counts[collectionId] = -1; // Erreur
    }
  }

  return counts;
}

export const scheduledBackup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    memory: "512MiB",
  },
  async () => {
    const startTime = Date.now();

    try {
      logger.info("[ScheduledBackup] Starting daily backup at 3 AM...");

      const projectId = process.env.GCLOUD_PROJECT as string;
      const bucket = `gs://${projectId}.firebasestorage.app`;
      const databaseName = client.databasePath(projectId, "(default)");
      const timestamp = Date.now();

      // Obtenir les counts avant backup pour validation
      const collectionCounts = await getCollectionCounts();
      const totalDocuments = Object.values(collectionCounts).reduce(
        (a, b) => (b > 0 ? a + b : a),
        0
      );

      logger.info("[ScheduledBackup] Collection counts:", collectionCounts);

      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/scheduled-backups/backup-${timestamp}`,
        collectionIds: [],
      });

      logger.info("[ScheduledBackup] Export operation started:", operation.name);

      // Générer le checksum
      const checksum = generateBackupChecksum(
        projectId,
        timestamp,
        operation.name || ""
      );

      // Sauvegarder les métadonnées enrichies
      const backupDoc = await admin.firestore().collection("backups").add({
        type: "automatic",
        status: "completed",
        operationName: operation.name,
        bucketPath: `${bucket}/scheduled-backups/backup-${timestamp}`,
        createdBy: "system",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp,
        schedule: "0 3 * * *",
        // Nouvelles métadonnées pour validation
        checksum,
        collectionCounts,
        totalDocuments,
        executionTimeMs: Date.now() - startTime,
        version: "2.0",
      });

      // Log dans system_logs pour monitoring
      await admin.firestore().collection("system_logs").add({
        type: "firestore_backup",
        backupId: backupDoc.id,
        operationName: operation.name,
        checksum,
        totalDocuments,
        success: true,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(
        `[ScheduledBackup] Completed. Checksum: ${checksum}, Documents: ${totalDocuments}`
      );

      return;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[ScheduledBackup] Failed:", err);

      await admin.firestore().collection("backup_errors").add({
        type: "scheduled",
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        executionTimeMs: Date.now() - startTime,
      });

      // Créer une alerte critique
      await admin.firestore().collection("system_alerts").add({
        type: "backup_failure",
        severity: "critical",
        message: `Daily Firestore backup failed: ${err.message}`,
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw error;
    }
  }
);
