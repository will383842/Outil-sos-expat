/**
 * Trigger: onCallCompleted
 *
 * Creates a commission for GroupAdmin when a client call is completed.
 * Listens to the calls collection for completed calls.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdmin } from "../types";
import { createClientReferralCommission } from "../services/groupAdminCommissionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface CallDocument {
  id: string;
  status: string;
  clientId: string;
  providerId: string;
  completedAt?: Timestamp;
  groupAdminAffiliateCode?: string;
  groupAdminId?: string;
  groupAdminCommissionPaid?: boolean;
}

export const onCallCompletedGroupAdmin = onDocumentUpdated(
  {
    document: "calls/{callId}",
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as CallDocument | undefined;
    const afterData = event.data?.after.data() as CallDocument | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Only process if status changed to completed
    if (beforeData.status === afterData.status || afterData.status !== "completed") {
      return;
    }

    // Check if this call has a GroupAdmin attribution
    if (!afterData.groupAdminAffiliateCode && !afterData.groupAdminId) {
      return;
    }

    // Check if commission already paid
    if (afterData.groupAdminCommissionPaid) {
      logger.info("[onCallCompletedGroupAdmin] Commission already paid", {
        callId: afterData.id,
      });
      return;
    }

    const db = getFirestore();
    const callId = event.params.callId;

    try {
      // Get GroupAdmin by affiliate code or ID
      let groupAdminId = afterData.groupAdminId;

      if (!groupAdminId && afterData.groupAdminAffiliateCode) {
        const groupAdminQuery = await db
          .collection("group_admins")
          .where("affiliateCodeClient", "==", afterData.groupAdminAffiliateCode)
          .limit(1)
          .get();

        if (groupAdminQuery.empty) {
          logger.warn("[onCallCompletedGroupAdmin] GroupAdmin not found for code", {
            affiliateCode: afterData.groupAdminAffiliateCode,
            callId,
          });
          return;
        }

        groupAdminId = groupAdminQuery.docs[0].id;
      }

      if (!groupAdminId) {
        logger.warn("[onCallCompletedGroupAdmin] No GroupAdmin ID found", { callId });
        return;
      }

      // Verify GroupAdmin is active
      const groupAdminDoc = await db.collection("group_admins").doc(groupAdminId).get();

      if (!groupAdminDoc.exists) {
        logger.warn("[onCallCompletedGroupAdmin] GroupAdmin not found", {
          groupAdminId,
          callId,
        });
        return;
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status !== "active") {
        logger.warn("[onCallCompletedGroupAdmin] GroupAdmin not active", {
          groupAdminId,
          status: groupAdmin.status,
          callId,
        });
        return;
      }

      // Create the commission
      const commission = await createClientReferralCommission(
        groupAdminId,
        afterData.clientId,
        callId,
        `Client referral commission for call ${callId}`
      );

      if (commission) {
        // Mark commission as paid on the call document
        await event.data?.after.ref.update({
          groupAdminCommissionPaid: true,
          groupAdminCommissionId: commission.id,
          groupAdminCommissionAt: Timestamp.now(),
        });

        logger.info("[onCallCompletedGroupAdmin] Commission created", {
          callId,
          groupAdminId,
          commissionId: commission.id,
          amount: commission.amount,
        });
      }
    } catch (error) {
      logger.error("[onCallCompletedGroupAdmin] Error creating commission", {
        callId,
        error,
      });
    }
  }
);
