/**
 * Scheduled Function: monthlyRecurringCommissions
 *
 * @deprecated This function is DISABLED. The old 5% monthly recurring system
 * has been replaced by per-call commissions in real-time.
 *
 * NEW SYSTEM (via onCallCompleted trigger):
 * - N1 calls: $1 per call
 * - N2 calls: $0.50 per call
 *
 * This scheduled function no longer creates any commissions.
 * It only runs promotion maintenance tasks.
 *
 * OLD SYSTEM (removed):
 * - 5% monthly on active filleuls' earnings
 * - A filleul was "active" if they earned at least $20/month
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// NOTE: Chatter and calculateMonthlyRecurringCommission are no longer used
// The 5% recurring system has been replaced by per-call commissions
import { deactivateExpiredPromotions, checkPromotionBudgets } from "../services/chatterPromotionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(): string {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = String(prevMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * @deprecated Monthly recurring 5% commissions are DISABLED.
 * N1/N2 commissions are now paid per-call in real-time via onCallCompleted.
 *
 * This function only runs promotion maintenance tasks.
 */
export const chatterMonthlyRecurringCommissions = onSchedule(
  {
    schedule: "0 2 1 * *", // 1st of each month at 02:00 UTC
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 120,
    retryCount: 2,
  },
  async () => {
    ensureInitialized();

    const previousMonth = getPreviousMonth();

    logger.info("[monthlyRecurringCommissions] Running monthly maintenance (5% commissions DISABLED)", {
      month: previousMonth,
      note: "N1/N2 commissions are now paid per-call via onCallCompleted trigger",
    });

    try {
      // Only run promotion maintenance - no more 5% recurring commissions
      const promoExpired = await deactivateExpiredPromotions();
      const promoExhausted = await checkPromotionBudgets();

      logger.info("[monthlyRecurringCommissions] Monthly maintenance completed", {
        month: previousMonth,
        promotionsDeactivated: promoExpired.deactivated,
        promotionsBudgetExhausted: promoExhausted.exhausted,
        recurringCommissions: "DISABLED - using per-call system",
      });
    } catch (error) {
      logger.error("[monthlyRecurringCommissions] Error during maintenance", { error });
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
    region: "europe-west1",
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
