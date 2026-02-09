/**
 * Trigger: onCommissionCreated
 *
 * Fires when a new commission is created in chatter_commissions.
 * Adds the commission to the live activity feed in real-time.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { addActivityToFeed } from "../scheduled/aggregateActivityFeed";
import { ChatterCommission } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterOnCommissionCreated = onDocumentCreated(
  {
    document: "chatter_commissions/{commissionId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (event) => {
    ensureInitialized();

    const commissionData = event.data?.data() as ChatterCommission | undefined;

    if (!commissionData) {
      logger.warn("[chatterOnCommissionCreated] No data in event");
      return;
    }

    const commissionId = event.params.commissionId;

    logger.info("[chatterOnCommissionCreated] Processing new commission", {
      commissionId,
      chatterId: commissionData.chatterId,
      type: commissionData.type,
      amount: commissionData.amount,
    });

    try {
      // Add to activity feed
      await addActivityToFeed({
        id: commissionId,
        type: "commission",
        chatterId: commissionData.chatterId,
        amount: commissionData.amount,
      });

      logger.info("[chatterOnCommissionCreated] Added to activity feed", {
        commissionId,
      });
    } catch (error) {
      logger.error("[chatterOnCommissionCreated] Error", { commissionId, error });
      // Don't throw - activity feed is not critical
    }
  }
);
