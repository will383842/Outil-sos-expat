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
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return 0;
}

export const releaseValidatedGroupAdminCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at minute 30
    timeZone: "UTC",
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[releaseValidatedGroupAdminCommissions] Starting release run");

    try {
      const releasedCount = await runWithRetry(
        releaseCommissions,
        "releaseValidatedGroupAdminCommissions"
      );

      logger.info("[releaseValidatedGroupAdminCommissions] Release complete", {
        releasedCount,
      });
    } catch (error) {
      logger.error("[releaseValidatedGroupAdminCommissions] All retries failed", {
        error,
      });
    }
  }
);
