/**
 * Blogger Scheduled Functions
 *
 * Cron jobs for the blogger system:
 * - Validate pending commissions
 * - Release validated commissions
 * - Update monthly rankings
 * - Deactivate expired recruitment windows
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import {
  validatePendingBloggerCommissions,
  releaseValidatedBloggerCommissions,
  updateBloggerMonthlyRankings,
} from "../services/bloggerCommissionService";
import { deactivateExpiredRecruitments } from "../triggers/onProviderRegistered";

/**
 * Validate pending commissions - runs every hour
 *
 * Moves commissions from "pending" to "validated" after hold period
 */
export const bloggerValidatePendingCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    logger.info("[bloggerValidatePendingCommissions] Starting scheduled job");

    try {
      const result = await validatePendingBloggerCommissions();

      logger.info("[bloggerValidatePendingCommissions] Job completed", {
        validated: result.validated,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[bloggerValidatePendingCommissions] Job failed", { error });
    }
  }
);

/**
 * Release validated commissions - runs every hour
 *
 * Moves commissions from "validated" to "available" after release delay
 */
export const bloggerReleaseValidatedCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at minute 30
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    logger.info("[bloggerReleaseValidatedCommissions] Starting scheduled job");

    try {
      const result = await releaseValidatedBloggerCommissions();

      logger.info("[bloggerReleaseValidatedCommissions] Job completed", {
        released: result.released,
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[bloggerReleaseValidatedCommissions] Job failed", { error });
    }
  }
);

/**
 * Update monthly rankings - runs daily at midnight
 *
 * Recalculates the Top 10 leaderboard (informational only, no rewards)
 */
export const bloggerUpdateMonthlyRankings = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    logger.info("[bloggerUpdateMonthlyRankings] Starting scheduled job");

    try {
      const result = await updateBloggerMonthlyRankings();

      logger.info("[bloggerUpdateMonthlyRankings] Job completed", {
        success: result.success,
        rankingsUpdated: result.rankingsUpdated,
      });
    } catch (error) {
      logger.error("[bloggerUpdateMonthlyRankings] Job failed", { error });
    }
  }
);

/**
 * Deactivate expired recruitment windows - runs daily at 1 AM
 *
 * Sets isActive=false for recruitment links past 6 months
 */
export const bloggerDeactivateExpiredRecruitments = onSchedule(
  {
    schedule: "0 1 * * *", // Daily at 1 AM
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async () => {
    logger.info("[bloggerDeactivateExpiredRecruitments] Starting scheduled job");

    try {
      const result = await deactivateExpiredRecruitments();

      logger.info("[bloggerDeactivateExpiredRecruitments] Job completed", {
        deactivated: result.deactivated,
      });
    } catch (error) {
      logger.error("[bloggerDeactivateExpiredRecruitments] Job failed", { error });
    }
  }
);

/**
 * Finalize previous month rankings - runs on 1st of each month at 2 AM
 *
 * Finalizes the previous month's rankings
 */
export const bloggerFinalizeMonthlyRankings = onSchedule(
  {
    schedule: "0 2 1 * *", // 1st of each month at 2 AM
    region: "europe-west1",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    logger.info("[bloggerFinalizeMonthlyRankings] Starting scheduled job");

    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore();

    try {
      // Calculate previous month
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthStr = previousMonth.toISOString().slice(0, 7);

      // Get and finalize previous month ranking
      const rankingRef = db.collection("blogger_monthly_rankings").doc(previousMonthStr);
      const rankingDoc = await rankingRef.get();

      if (rankingDoc.exists && !rankingDoc.data()?.isFinalized) {
        await rankingRef.update({
          isFinalized: true,
          finalizedAt: Timestamp.now(),
        });

        logger.info("[bloggerFinalizeMonthlyRankings] Rankings finalized", {
          month: previousMonthStr,
        });
      } else {
        logger.info("[bloggerFinalizeMonthlyRankings] No rankings to finalize", {
          month: previousMonthStr,
        });
      }
    } catch (error) {
      logger.error("[bloggerFinalizeMonthlyRankings] Job failed", { error });
    }
  }
);
