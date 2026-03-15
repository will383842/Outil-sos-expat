/**
 * Scheduled: Auto-migrate legacy affiliate codes to unified system
 *
 * Runs daily at 3 AM. Migrates users who still have legacy codes (with dashes)
 * to the new unified code format. Safe to run multiple times (idempotent).
 * Stops automatically when all users are migrated.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

export const unifiedAutoMigrateAffiliateCodes = onSchedule(
  {
    schedule: "0 3 * * *", // Daily at 3:00 AM
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
    retryCount: 1,
  },
  async () => {
    ensureInitialized();

    logger.info("[autoMigrate] Starting daily affiliate code migration");

    try {
      // Check if unified system is enabled
      const db = getFirestore();
      const configSnap = await db.doc("unified_commission_system/config").get();
      const config = configSnap.data();

      if (!config?.enabled) {
        logger.info("[autoMigrate] Unified system not enabled, skipping migration");
        return;
      }

      const { batchMigrateAffiliateCodes } = await import("../codeMigrator");
      const result = await batchMigrateAffiliateCodes(200);

      logger.info("[autoMigrate] Migration complete", {
        total: result.total,
        migrated: result.migrated,
        skipped: result.skipped,
        errors: result.errors,
      });

      // If no migrations needed, log it clearly
      if (result.migrated === 0) {
        logger.info("[autoMigrate] All users already migrated — no action needed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[autoMigrate] Migration failed: ${msg}`);
    }
  }
);
