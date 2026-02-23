/**
 * Cross-Region Backup System
 *
 * Copie les backups Firestore vers un bucket dans une autre region GCP
 * pour une protection maximale contre les incidents regionaux.
 *
 * Architecture:
 * - Bucket principal: europe-west1 (sos-urgently-ac307.firebasestorage.app)
 * - Bucket DR: europe-west3 ou us-central1 (sos-expat-backup-dr)
 *
 * Execute une fois par jour apres le backup principal (4h Paris)
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Storage } from "@google-cloud/storage";
import { logger } from "firebase-functions";

// CRITICAL: Lazy initialization to avoid deployment timeout
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

// Configuration
const CONFIG = {
  // Bucket source (principal)
  SOURCE_BUCKET: process.env.GCLOUD_PROJECT + ".firebasestorage.app",
  // Bucket de destination DR (a creer dans une autre region)
  // Recommande: creer ce bucket dans europe-west3 ou us-central1
  DR_BUCKET: process.env.DR_BACKUP_BUCKET || "sos-expat-backup-dr",
  // Prefixes a copier
  BACKUP_PREFIXES: [
    "scheduled-backups/",
    "manual-backups/",
    "auth_backups/",
  ],
  // Retention des copies DR (jours)
  DR_RETENTION_DAYS: 90,
};

/**
 * Copie les fichiers d'un bucket vers un autre
 */
async function copyFiles(
  storage: Storage,
  sourcePrefix: string,
  maxFiles: number = 100
): Promise<{ copied: number; errors: string[] }> {
  const sourceBucket = storage.bucket(CONFIG.SOURCE_BUCKET);
  const drBucket = storage.bucket(CONFIG.DR_BUCKET);

  let copied = 0;
  const errors: string[] = [];

  try {
    // Lister les fichiers recents du prefix
    const [files] = await sourceBucket.getFiles({
      prefix: sourcePrefix,
      maxResults: maxFiles,
    });

    logger.info(`[CrossRegionBackup] Found ${files.length} files in ${sourcePrefix}`);

    for (const file of files) {
      try {
        // Verifier si le fichier existe deja dans le bucket DR
        const drFile = drBucket.file(file.name);
        const [exists] = await drFile.exists();

        if (exists) {
          // Fichier deja copie, skip
          continue;
        }

        // Copier le fichier
        await file.copy(drFile);
        copied++;

        logger.info(`[CrossRegionBackup] Copied: ${file.name}`);

      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        errors.push(`${file.name}: ${err}`);
        logger.warn(`[CrossRegionBackup] Failed to copy ${file.name}:`, err);
      }
    }

  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    errors.push(`Listing ${sourcePrefix}: ${err}`);
  }

  return { copied, errors };
}

/**
 * Cross-Region Backup hebdomadaire (Dimanche)
 * 2025-01-16: Réduit de quotidien à hebdomadaire pour économies (~€10/mois)
 */
export const dailyCrossRegionBackup = onSchedule(
  {
    schedule: "0 4 * * 0", // Dimanche à 4h (était: tous les jours)
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "1GiB",
    cpu: 1,
    timeoutSeconds: 540, // 9 minutes
  },
  async () => {
    ensureInitialized();
    const startTime = Date.now();
    const db = admin.firestore();
    const storage = new Storage();

    logger.info("[CrossRegionBackup] Starting daily cross-region backup...");

    let totalCopied = 0;
    const allErrors: string[] = [];

    try {
      // Verifier que le bucket DR existe
      const drBucket = storage.bucket(CONFIG.DR_BUCKET);
      const [exists] = await drBucket.exists();

      if (!exists) {
        logger.warn(`[CrossRegionBackup] DR bucket ${CONFIG.DR_BUCKET} does not exist. Creating...`);

        // Tenter de creer le bucket (necessite les bonnes permissions)
        try {
          await storage.createBucket(CONFIG.DR_BUCKET, {
            location: "EUROPE-WEST3", // Frankfurt - differente region de europe-west1
            storageClass: "STANDARD",
          });
          logger.info(`[CrossRegionBackup] Created DR bucket: ${CONFIG.DR_BUCKET}`);
        } catch (createError) {
          const err = createError instanceof Error ? createError.message : String(createError);
          logger.error(`[CrossRegionBackup] Cannot create DR bucket: ${err}`);

          // Enregistrer l'alerte
          await db.collection("system_alerts").add({
            type: "dr_backup_config",
            severity: "critical",
            message: `DR bucket ${CONFIG.DR_BUCKET} does not exist and could not be created. Please create it manually.`,
            acknowledged: false,
            createdAt: admin.firestore.Timestamp.now(),
          });

          throw new Error(`DR bucket ${CONFIG.DR_BUCKET} not available`);
        }
      }

      // Copier les fichiers de chaque prefix
      for (const prefix of CONFIG.BACKUP_PREFIXES) {
        logger.info(`[CrossRegionBackup] Processing prefix: ${prefix}`);
        const result = await copyFiles(storage, prefix);
        totalCopied += result.copied;
        allErrors.push(...result.errors);
      }

      // Enregistrer le resultat
      await db.collection("system_logs").add({
        type: "cross_region_backup",
        success: allErrors.length === 0,
        filesCopied: totalCopied,
        errors: allErrors.slice(0, 10), // Limiter a 10 erreurs
        sourceBucket: CONFIG.SOURCE_BUCKET,
        drBucket: CONFIG.DR_BUCKET,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      if (allErrors.length > 0) {
        logger.warn(`[CrossRegionBackup] Completed with ${allErrors.length} errors. Copied: ${totalCopied} files`);

        // Alerte si trop d'erreurs
        if (allErrors.length > 5) {
          await db.collection("system_alerts").add({
            type: "dr_backup_errors",
            severity: "warning",
            message: `Cross-region backup completed with ${allErrors.length} errors`,
            metadata: { errors: allErrors.slice(0, 5) },
            acknowledged: false,
            createdAt: admin.firestore.Timestamp.now(),
          });
        }
      } else {
        logger.info(`[CrossRegionBackup] Completed successfully. Copied: ${totalCopied} files`);
      }

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[CrossRegionBackup] Failed:", err);

      await db.collection("backup_errors").add({
        type: "cross_region",
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        executionTimeMs: Date.now() - startTime,
      });

      // Alerte critique
      await db.collection("system_alerts").add({
        type: "dr_backup_failure",
        severity: "critical",
        message: `Cross-region backup failed: ${err.message}`,
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw error;
    }
  }
);

/**
 * Nettoyage des vieux backups DR
 * Execute une fois par semaine le lundi a 5h
 */
export const cleanupDRBackups = onSchedule(
  {
    schedule: "0 5 * * 1", // Lundi a 5h
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();
    const storage = new Storage();
    const db = admin.firestore();
    const drBucket = storage.bucket(CONFIG.DR_BUCKET);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.DR_RETENTION_DAYS);

    logger.info(`[CleanupDRBackups] Deleting files older than ${cutoffDate.toISOString()}`);

    let deleted = 0;
    const errors: string[] = [];

    try {
      const [exists] = await drBucket.exists();
      if (!exists) {
        logger.warn(`[CleanupDRBackups] DR bucket ${CONFIG.DR_BUCKET} does not exist, skipping cleanup`);
        return;
      }

      for (const prefix of CONFIG.BACKUP_PREFIXES) {
        const [files] = await drBucket.getFiles({
          prefix,
          maxResults: 1000,
        });

        for (const file of files) {
          try {
            const [metadata] = await file.getMetadata();
            const fileDate = new Date(metadata.timeCreated as string);

            if (fileDate < cutoffDate) {
              await file.delete();
              deleted++;
            }
          } catch (error) {
            const err = error instanceof Error ? error.message : String(error);
            errors.push(`${file.name}: ${err}`);
          }
        }
      }

      logger.info(`[CleanupDRBackups] Deleted ${deleted} old files`);

      await db.collection("system_logs").add({
        type: "dr_backup_cleanup",
        deletedCount: deleted,
        errors: errors.slice(0, 5),
        cutoffDate: cutoffDate.toISOString(),
        createdAt: admin.firestore.Timestamp.now(),
      });

    } catch (error) {
      logger.error("[CleanupDRBackups] Failed:", error);
      throw error;
    }
  }
);
