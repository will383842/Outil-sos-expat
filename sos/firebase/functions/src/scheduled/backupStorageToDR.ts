/**
 * Backup Storage vers Bucket DR (Cross-Region)
 *
 * Copie les fichiers critiques (photos, documents) vers le bucket de DR
 * pour une protection contre la perte de données en cas de problème régional.
 *
 * Exécute quotidiennement à 5h du matin (après les backups Firestore)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { Storage } from "@google-cloud/storage";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Bucket source (Firebase Storage principal)
  SOURCE_BUCKET: "sos-urgently-ac307.firebasestorage.app",
  // Bucket de destination (DR)
  DR_BUCKET: "sos-expat-backup-dr",
  // Préfixes à sauvegarder (dossiers critiques)
  CRITICAL_PREFIXES: [
    "profilePhotos/",      // Photos de profil utilisateurs
    "profile_photos/",     // Photos de profil (autre format)
    "documents/",          // Documents KYC
    "invoices/",           // Factures PDF
    "auth_backups/",       // Backups Auth (déjà copiés mais on s'assure)
  ],
  // Préfixes à exclure (fichiers temporaires)
  EXCLUDE_PREFIXES: [
    "registration_temp/",
    "temp_profiles/",
    ".cache/",
  ],
  // Taille max par batch (pour éviter timeout)
  BATCH_SIZE: 100,
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Backup hebdomadaire des fichiers Storage vers DR
 * 2025-01-16: Réduit de quotidien à hebdomadaire (dimanche) pour économies (~€8/mois)
 */
export const backupStorageToDR = onSchedule(
  {
    schedule: "0 5 * * 0", // Dimanche 5h du matin (était: tous les jours)
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
    timeoutSeconds: 540, // 9 minutes
  },
  async () => {
    const startTime = Date.now();
    const storage = new Storage();
    const db = admin.firestore();

    logger.info("[StorageBackup] Starting daily Storage backup to DR bucket...");

    const stats = {
      totalFiles: 0,
      copiedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      errors: [] as string[],
    };

    try {
      const sourceBucket = storage.bucket(CONFIG.SOURCE_BUCKET);
      const drBucket = storage.bucket(CONFIG.DR_BUCKET);

      // Pour chaque préfixe critique
      for (const prefix of CONFIG.CRITICAL_PREFIXES) {
        logger.info(`[StorageBackup] Processing prefix: ${prefix}`);

        try {
          // Lister les fichiers
          const [files] = await sourceBucket.getFiles({
            prefix,
            maxResults: 1000, // Limite par prefix
          });

          for (const file of files) {
            stats.totalFiles++;

            // Vérifier si le fichier doit être exclu
            const shouldExclude = CONFIG.EXCLUDE_PREFIXES.some(
              (excludePrefix) => file.name.startsWith(excludePrefix)
            );

            if (shouldExclude) {
              stats.skippedFiles++;
              continue;
            }

            try {
              // Vérifier si le fichier existe déjà dans DR
              const drFile = drBucket.file(`storage-backup/${file.name}`);
              const [exists] = await drFile.exists();

              if (exists) {
                // Vérifier si la source est plus récente
                const [sourceMetadata] = await file.getMetadata();
                const [drMetadata] = await drFile.getMetadata();

                const sourceUpdated = new Date(sourceMetadata.updated || 0);
                const drUpdated = new Date(drMetadata.updated || 0);

                if (sourceUpdated <= drUpdated) {
                  stats.skippedFiles++;
                  continue; // Fichier déjà à jour
                }
              }

              // Copier le fichier
              await file.copy(drFile);
              stats.copiedFiles++;

            } catch (fileError: unknown) {
              const err = fileError instanceof Error ? fileError : new Error(String(fileError));
              stats.errorFiles++;
              if (stats.errors.length < 10) {
                stats.errors.push(`${file.name}: ${err.message}`);
              }
            }
          }

        } catch (prefixError: unknown) {
          const err = prefixError instanceof Error ? prefixError : new Error(String(prefixError));
          logger.warn(`[StorageBackup] Error processing prefix ${prefix}:`, err);
          stats.errors.push(`Prefix ${prefix}: ${err.message}`);
        }
      }

      const executionTimeMs = Date.now() - startTime;

      // Log le résultat
      await db.collection("system_logs").add({
        type: "storage_backup_dr",
        success: stats.errorFiles === 0,
        stats,
        executionTimeMs,
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`[StorageBackup] Completed in ${executionTimeMs}ms`, stats);

      // Alerter si beaucoup d'erreurs
      if (stats.errorFiles > 10) {
        await db.collection("system_alerts").add({
          type: "storage_backup_warning",
          severity: "warning",
          message: `Storage backup to DR had ${stats.errorFiles} errors`,
          acknowledged: false,
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[StorageBackup] Failed:", err);

      await db.collection("system_alerts").add({
        type: "storage_backup_failure",
        severity: "critical",
        message: `Storage backup to DR failed: ${err.message}`,
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw error;
    }
  }
);

/**
 * Backup manuel du Storage (déclenchable par admin)
 */
export const triggerStorageBackup = async (adminId: string): Promise<{
  success: boolean;
  stats: typeof CONFIG extends { CRITICAL_PREFIXES: string[] } ? Record<string, number> : never;
}> => {
  const startTime = Date.now();
  const storage = new Storage();
  const db = admin.firestore();

  // Log l'action admin
  await db.collection("admin_audit_logs").add({
    action: "MANUAL_STORAGE_BACKUP",
    adminId,
    createdAt: admin.firestore.Timestamp.now(),
  });

  const stats = {
    totalFiles: 0,
    copiedFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
  };

  try {
    const sourceBucket = storage.bucket(CONFIG.SOURCE_BUCKET);
    const drBucket = storage.bucket(CONFIG.DR_BUCKET);

    for (const prefix of CONFIG.CRITICAL_PREFIXES) {
      const [files] = await sourceBucket.getFiles({ prefix, maxResults: 500 });

      for (const file of files) {
        stats.totalFiles++;

        try {
          const drFile = drBucket.file(`storage-backup/${file.name}`);
          await file.copy(drFile);
          stats.copiedFiles++;
        } catch {
          stats.errorFiles++;
        }
      }
    }

    await db.collection("system_logs").add({
      type: "storage_backup_dr_manual",
      success: true,
      stats,
      triggeredBy: adminId,
      executionTimeMs: Date.now() - startTime,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return { success: true, stats: stats as never };

  } catch (error) {
    logger.error("[StorageBackup] Manual backup failed:", error);
    throw error;
  }
};
