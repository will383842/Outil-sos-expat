/**
 * Scheduled: Release expired held commissions (unified system)
 *
 * Runs every hour. Finds commissions with status="held" and holdUntil <= now,
 * then releases them to "available" and adjusts user balances.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

export const unifiedReleaseHeldCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at :30 (offset from legacy at :00)
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[unifiedReleaseHeld] Starting");

    try {
      const { releaseExpiredHeldCommissions } = await import("../commissionWriter");
      const released = await releaseExpiredHeldCommissions(200);

      logger.info("[unifiedReleaseHeld] Done", { released });
    } catch (error) {
      logger.error("[unifiedReleaseHeld] Error", { error });
      throw error;
    }
  }
);
