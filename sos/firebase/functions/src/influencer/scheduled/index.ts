/**
 * Scheduled Functions for Influencer Module
 *
 * - validatePendingCommissions: Validates commissions after 7 days
 * - releaseValidatedCommissions: Releases validated commissions to available balance
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  validatePendingCommissions,
  releaseValidatedCommissions,
} from "../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Validate pending commissions every hour
 * Moves commissions from 'pending' to 'validated' after hold period (7 days)
 */
export const influencerValidatePendingCommissions = onSchedule(
  {
    schedule: "every 1 hours",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();

    logger.info("[influencerValidatePendingCommissions] Starting batch validation");

    try {
      const result = await validatePendingCommissions();

      logger.info("[influencerValidatePendingCommissions] Batch complete", {
        validated: result.validated,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[influencerValidatePendingCommissions] Error", { error });
    }
  }
);

/**
 * Release validated commissions every hour
 * Moves commissions from 'validated' to 'available' after release delay (24h)
 */
export const influencerReleaseValidatedCommissions = onSchedule(
  {
    schedule: "every 1 hours",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();

    logger.info("[influencerReleaseValidatedCommissions] Starting batch release");

    try {
      const result = await releaseValidatedCommissions();

      logger.info("[influencerReleaseValidatedCommissions] Batch complete", {
        released: result.released,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[influencerReleaseValidatedCommissions] Error", { error });
    }
  }
);
