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

const MAX_RETRIES = 3;

async function runWithRetry(fn: () => Promise<number>, label: string): Promise<number> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      logger.error(`[${label}] Attempt ${attempt}/${MAX_RETRIES} failed`, { error, attempt });
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return 0;
}

export const validatePendingGroupAdminCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[validatePendingGroupAdminCommissions] Starting validation run");

    try {
      const validatedCount = await runWithRetry(
        validateCommissions,
        "validatePendingGroupAdminCommissions"
      );

      logger.info("[validatePendingGroupAdminCommissions] Validation complete", {
        validatedCount,
      });
    } catch (error) {
      logger.error("[validatePendingGroupAdminCommissions] All retries failed", {
        error,
      });
    }
  }
);
