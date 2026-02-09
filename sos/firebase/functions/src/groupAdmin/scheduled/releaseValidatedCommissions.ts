/**
 * Scheduled: releaseValidatedCommissions
 *
 * Runs every hour to release validated commissions to available balance.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { releaseValidatedCommissions as releaseCommissions } from "../services/groupAdminCommissionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const releaseValidatedGroupAdminCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at minute 30
    timeZone: "UTC",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();

    logger.info("[releaseValidatedGroupAdminCommissions] Starting release run");

    try {
      const releasedCount = await releaseCommissions();

      logger.info("[releaseValidatedGroupAdminCommissions] Release complete", {
        releasedCount,
      });
    } catch (error) {
      logger.error("[releaseValidatedGroupAdminCommissions] Error during release", {
        error,
      });
    }
  }
);
