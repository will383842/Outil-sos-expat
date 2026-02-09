/**
 * Scheduled: validatePendingCommissions
 *
 * Runs every hour to validate commissions that have passed their hold period.
 * Moves commissions from "pending" to "validated" status.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { validatePendingCommissions as validateCommissions } from "../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterValidatePendingCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[chatterValidatePendingCommissions] Starting validation run");

    try {
      const result = await validateCommissions();

      logger.info("[chatterValidatePendingCommissions] Validation complete", {
        validated: result.validated,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[chatterValidatePendingCommissions] Error", { error });
      throw error;
    }
  }
);
