/**
 * Scheduled: validatePendingCommissions
 *
 * Runs every hour to validate pending commissions that have passed the hold period.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { validatePendingCommissions as validateCommissions } from "../services/groupAdminCommissionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const validatePendingGroupAdminCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();

    logger.info("[validatePendingGroupAdminCommissions] Starting validation run");

    try {
      const validatedCount = await validateCommissions();

      logger.info("[validatePendingGroupAdminCommissions] Validation complete", {
        validatedCount,
      });
    } catch (error) {
      logger.error("[validatePendingGroupAdminCommissions] Error during validation", {
        error,
      });
    }
  }
);
