/**
 * Scheduled Function: Monthly Promotion Maintenance
 *
 * Runs on the 1st of each month to:
 * - Deactivate expired promotions
 * - Check promotion budget exhaustion
 *
 * NOTE: The old 5% monthly recurring commission system has been removed.
 * N1/N2 commissions are now paid per-call in real-time via onCallCompleted.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { deactivateExpiredPromotions, checkPromotionBudgets } from "../services/chatterPromotionService";
import {
  deactivateExpiredPromotions as deactivateExpiredInfluencerPromotions,
  checkPromotionBudgets as checkInfluencerPromotionBudgets,
} from "../../influencer/services/influencerPromotionService";
import {
  deactivateExpiredPromotions as deactivateExpiredGroupAdminPromotions,
  checkPromotionBudgets as checkGroupAdminPromotionBudgets,
} from "../../groupAdmin/services/groupAdminPromotionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Monthly promotion maintenance
 * Deactivates expired promotions and checks budget exhaustion
 */
export const chatterMonthlyRecurringCommissions = onSchedule(
  {
    schedule: "0 2 1 * *", // 1st of each month at 02:00 UTC
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 120,
    retryCount: 2,
  },
  async () => {
    ensureInitialized();

    logger.info("[monthlyPromotionMaintenance] Running monthly promotion maintenance");

    try {
      // Chatter promotions
      const promoExpired = await deactivateExpiredPromotions();
      const promoExhausted = await checkPromotionBudgets();

      // Influencer promotions
      const influencerExpired = await deactivateExpiredInfluencerPromotions();
      const influencerExhausted = await checkInfluencerPromotionBudgets();

      // GroupAdmin promotions
      const groupAdminExpired = await deactivateExpiredGroupAdminPromotions();
      const groupAdminExhausted = await checkGroupAdminPromotionBudgets();

      logger.info("[monthlyPromotionMaintenance] Monthly maintenance completed", {
        chatter: { deactivated: promoExpired.deactivated, exhausted: promoExhausted.exhausted },
        influencer: { deactivated: influencerExpired.deactivated, exhausted: influencerExhausted.exhausted },
        groupAdmin: { deactivated: groupAdminExpired.deactivated, exhausted: groupAdminExhausted.exhausted },
      });
    } catch (error) {
      logger.error("[monthlyPromotionMaintenance] Error during maintenance", { error });
      throw error;
    }
  }
);

/**
 * Validate and release pending referral commissions
 * Runs daily at 03:00 UTC
 */
export const chatterValidatePendingReferralCommissions = onSchedule(
  {
    schedule: "0 3 * * *", // Daily at 03:00 UTC
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 300,
    retryCount: 2,
  },
  async () => {
    ensureInitialized();

    const {
      validatePendingReferralCommissions,
      releaseValidatedReferralCommissions,
    } = await import("../services/chatterReferralService");

    logger.info("[validatePendingReferralCommissions] Starting");

    try {
      // Validate pending commissions
      const validateResult = await validatePendingReferralCommissions();

      // Release validated commissions
      const releaseResult = await releaseValidatedReferralCommissions();

      logger.info("[validatePendingReferralCommissions] Completed", {
        validated: validateResult.validated,
        validateErrors: validateResult.errors,
        released: releaseResult.released,
        releaseErrors: releaseResult.errors,
      });
    } catch (error) {
      logger.error("[validatePendingReferralCommissions] Fatal error", { error });
      throw error;
    }
  }
);
