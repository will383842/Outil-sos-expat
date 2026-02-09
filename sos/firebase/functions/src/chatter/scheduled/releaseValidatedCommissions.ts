/**
 * Scheduled: releaseValidatedCommissions
 *
 * Runs every hour to release commissions that have passed their release delay.
 * Moves commissions from "validated" to "available" status.
 * Also updates chatter totalEarned.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { releaseValidatedCommissions as releaseCommissions } from "../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterReleaseValidatedCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at minute 30
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[chatterReleaseValidatedCommissions] Starting release run");

    try {
      const result = await releaseCommissions();

      logger.info("[chatterReleaseValidatedCommissions] Release complete", {
        released: result.released,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[chatterReleaseValidatedCommissions] Error", { error });
      throw error;
    }
  }
);
