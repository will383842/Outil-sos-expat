/**
 * Scheduled Function: monthlyRecurringCommissions
 *
 * Runs on the 1st of each month at 02:00 UTC.
 * Calculates and creates 5% recurring commissions for parrains
 * based on their active filleuls' earnings from the previous month.
 *
 * A filleul is "active" if they earned at least $20 (client earnings) in the month.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter } from "../types";
import { calculateMonthlyRecurringCommission } from "../services/chatterReferralService";
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

export const chatterMonthlyRecurringCommissions = onSchedule(
  {
    schedule: "0 2 1 * *", // 1st of each month at 02:00 UTC
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    const db = getFirestore();
    const previousMonth = getPreviousMonth();

    logger.info("[monthlyRecurringCommissions] Starting monthly commission calculation", {
      month: previousMonth,
    });

    const stats = {
      parrainsProcessed: 0,
      filleulsActifsTotal: 0,
      totalCommissionsCreated: 0,
      totalCommissionAmount: 0,
      errors: 0,
    };

    try {
      // Get all chatters who have at least one qualified filleul
      // (qualifiedReferralsCount > 0 means they have filleuls who reached $50)
      const parrainsQuery = await db
        .collection("chatters")
        .where("status", "==", "active")
        .where("qualifiedReferralsCount", ">", 0)
        .get();

      logger.info("[monthlyRecurringCommissions] Found potential parrains", {
        count: parrainsQuery.size,
      });

      // Process each parrain
      for (const parrainDoc of parrainsQuery.docs) {
        const parrain = parrainDoc.data() as Chatter;
        const parrainId = parrainDoc.id;

        try {
          const result = await calculateMonthlyRecurringCommission(parrainId, previousMonth);

          stats.parrainsProcessed++;
          stats.filleulsActifsTotal += result.filleulsActifs;
          stats.totalCommissionsCreated += result.commissionsCreated.length;
          stats.totalCommissionAmount += result.totalCommission;

          if (result.filleulsActifs > 0) {
            logger.info("[monthlyRecurringCommissions] Parrain processed", {
              parrainId,
              parrainEmail: parrain.email,
              filleulsActifs: result.filleulsActifs,
              totalCommission: result.totalCommission,
              commissionsCreated: result.commissionsCreated.length,
            });
          }
        } catch (error) {
          stats.errors++;
          logger.error("[monthlyRecurringCommissions] Error processing parrain", {
            parrainId,
            error,
          });
        }
      }

      // Also run promotion maintenance
      const promoExpired = await deactivateExpiredPromotions();
      const promoExhausted = await checkPromotionBudgets();

      logger.info("[monthlyRecurringCommissions] Completed", {
        month: previousMonth,
        ...stats,
        promotionsDeactivated: promoExpired.deactivated,
        promotionsBudgetExhausted: promoExhausted.exhausted,
      });
    } catch (error) {
      logger.error("[monthlyRecurringCommissions] Fatal error", { error });
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
