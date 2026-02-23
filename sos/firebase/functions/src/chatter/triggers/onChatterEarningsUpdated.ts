/**
 * Trigger: onChatterEarningsUpdated
 *
 * Fires when a chatter's totalEarned changes.
 * Checks and applies referral threshold commissions ($10 → $1, $50 → $4/$2).
 *
 * IMPORTANT: Thresholds are based on CLIENT earnings (totalEarned - referralEarnings),
 * NOT including referral commissions. This prevents gaming the system.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter } from "../types";
import {
  checkAndApplyThresholds,
  getClientEarnings,
} from "../services/chatterReferralService";
import {
  updateReferralToClientRatio,
  runComprehensiveFraudCheck,
} from "../services/chatterReferralFraudService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterOnChatterEarningsUpdated = onDocumentUpdated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 120,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as Chatter | undefined;
    const afterData = event.data?.after.data() as Chatter | undefined;

    if (!beforeData || !afterData) {
      logger.warn("[chatterOnChatterEarningsUpdated] Missing data");
      return;
    }

    const chatterId = event.params.chatterId;

    // Calculate client earnings (excluding referral earnings)
    const beforeClientEarnings = getClientEarnings(beforeData);
    const afterClientEarnings = getClientEarnings(afterData);

    // Only process if client earnings actually changed
    if (beforeClientEarnings === afterClientEarnings) {
      return;
    }

    logger.info("[chatterOnChatterEarningsUpdated] Client earnings changed", {
      chatterId,
      beforeClientEarnings,
      afterClientEarnings,
      beforeTotalEarned: beforeData.totalEarned,
      afterTotalEarned: afterData.totalEarned,
      beforeReferralEarnings: beforeData.referralEarnings || 0,
      afterReferralEarnings: afterData.referralEarnings || 0,
    });

    try {
      // Check if this chatter needs to trigger threshold commissions for their parrain
      const thresholdResult = await checkAndApplyThresholds(chatterId);

      if (thresholdResult.threshold10Applied || thresholdResult.threshold50Applied) {
        logger.info("[chatterOnChatterEarningsUpdated] Thresholds applied", {
          chatterId,
          ...thresholdResult,
        });
      }

      // Update referral to client ratio for fraud detection
      if (afterData.recruitedBy) {
        // Update ratio for this chatter
        await updateReferralToClientRatio(chatterId);
      }

      // If this chatter has referral earnings, run a fraud check
      if (
        (afterData.referralEarnings || 0) > 0 &&
        afterData.referralEarnings !== beforeData.referralEarnings
      ) {
        const fraudResult = await runComprehensiveFraudCheck(chatterId);

        if (fraudResult.hasIssues) {
          logger.warn("[chatterOnChatterEarningsUpdated] Fraud issues detected", {
            chatterId,
            issues: fraudResult.issues,
            shouldSuspend: fraudResult.shouldSuspend,
          });
        }
      }
    } catch (error) {
      logger.error("[chatterOnChatterEarningsUpdated] Error processing", {
        chatterId,
        error,
      });
    }
  }
);
