/**
 * Scheduled Function: releaseHeldCommissions
 *
 * Runs hourly to release pending commissions that have passed their hold period.
 * Updates commission status from "pending" to "available" and adjusts user balances.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { releasePendingCommissions } from "../services/commissionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Scheduled function to release held commissions
 * Runs every hour
 */
export const affiliateReleaseHeldCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[releaseHeldCommissions] Starting scheduled job");

    try {
      const result = await releasePendingCommissions();

      logger.info("[releaseHeldCommissions] Completed", {
        released: result.released,
        failed: result.failed,
      });

      if (result.failed > 0) {
        logger.warn("[releaseHeldCommissions] Some commissions failed to release", {
          failed: result.failed,
        });
      }
    } catch (error) {
      logger.error("[releaseHeldCommissions] Error", { error });
      throw error;
    }
  }
);
