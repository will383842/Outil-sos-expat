/**
 * Trigger: onCallCompleted
 *
 * Creates a commission for GroupAdmin when a client call is completed AND paid.
 * Listens to the call_sessions collection for completed+paid calls.
 *
 * Attribution flow:
 * 1. Client registers with ?ref=GROUP-XXXX code
 * 2. Code is stored as pendingReferralCode on users/{clientId}
 * 3. Global affiliate onUserCreated may also resolve it to referredBy
 * 4. This trigger looks up users/{clientId} and checks for GROUP- prefixed codes
 * 5. Finds the GroupAdmin via group_admins.affiliateCodeClient query
 *
 * IMPORTANT: Commission is only created when isPaid === true,
 * which is set by Stripe/PayPal webhooks when payment is captured
 * (money received on SOS Expat's account).
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

/** Minimum call duration in seconds to earn commission (anti-fraud) */
const MIN_CALL_DURATION_SECONDS = 120;

/** Prefix used by GroupAdmin affiliate codes */
const GROUP_ADMIN_CODE_PREFIX = "GROUP-";

interface CallSession {
  id: string;
  status: string;
  clientId: string;
  providerId: string;
  duration?: number;
  isPaid?: boolean;
  completedAt?: Timestamp;
  groupAdminCommissionPaid?: boolean;
}

/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full groupAdmin onCallCompleted logic.
 */
export async function handleCallCompleted(
  event: Parameters<Parameters<typeof onDocumentUpdated>[1]>[0]
): Promise<void> {
  ensureInitialized();

  const beforeData = event.data?.before.data() as CallSession | undefined;
  const afterData = event.data?.after.data() as CallSession | undefined;

  if (!beforeData || !afterData) {
    return;
  }

  // Only process when call becomes completed AND paid (payment captured)
  const wasNotPaid = beforeData.status !== "completed" || !beforeData.isPaid;
  const isNowPaid = afterData.status === "completed" && afterData.isPaid === true;

  if (!wasNotPaid || !isNowPaid) {
    return;
  }

  // Minimum call duration check (anti-fraud: prevent 1-second call commissions)
  if (!afterData.duration || afterData.duration < MIN_CALL_DURATION_SECONDS) {
    logger.warn("[onCallCompletedGroupAdmin] Call too short for commission", {
      sessionId: event.params.sessionId,
      duration: afterData.duration,
      minimum: MIN_CALL_DURATION_SECONDS,
    });
    return;
  }

  // Quick idempotence check (non-transactional, just to avoid unnecessary work)
  if (afterData.groupAdminCommissionPaid) {
    return;
  }

  const db = getFirestore();
  const sessionId = event.params.sessionId;

    try {
      // ================================================================
      // ATTRIBUTION: Look up client user doc for GroupAdmin referral code
      // ================================================================
      const clientDoc = await db.collection("users").doc(afterData.clientId).get();

      if (!clientDoc.exists) {
        return; // No client data, can't determine attribution
      }

      const clientData = clientDoc.data()!;

      // Check for GroupAdmin referral code in multiple fields:
      // 1. pendingReferralCode (set at client registration from ?ref=GROUP-XXXX)
      // 2. referredBy (set by global affiliate onUserCreated if code was resolved)
      let groupAdminCode: string | null = null;

      const pendingCode = clientData.pendingReferralCode;
      if (pendingCode && typeof pendingCode === "string" && pendingCode.toUpperCase().startsWith(GROUP_ADMIN_CODE_PREFIX)) {
        groupAdminCode = pendingCode.toUpperCase();
      }

      if (!groupAdminCode) {
        const referredBy = clientData.referredBy;
        if (referredBy && typeof referredBy === "string" && referredBy.toUpperCase().startsWith(GROUP_ADMIN_CODE_PREFIX)) {
          groupAdminCode = referredBy.toUpperCase();
        }
      }

      if (!groupAdminCode) {
        return; // Not a GroupAdmin referral
      }

      // ================================================================
      // FIND GROUP ADMIN by affiliate code
      // ================================================================
      const groupAdminQuery = await db
        .collection("group_admins")
        .where("affiliateCodeClient", "==", groupAdminCode)
        .limit(1)
        .get();

      if (groupAdminQuery.empty) {
        logger.warn("[onCallCompletedGroupAdmin] GroupAdmin not found for code", {
          affiliateCode: groupAdminCode,
          sessionId,
        });
        return;
      }

      const groupAdminId = groupAdminQuery.docs[0].id;
      const groupAdmin = groupAdminQuery.docs[0].data() as GroupAdmin;

      // Verify GroupAdmin is active
      if (groupAdmin.status !== "active") {
        logger.warn("[onCallCompletedGroupAdmin] GroupAdmin not active", {
          groupAdminId,
          status: groupAdmin.status,
          sessionId,
        });
        return;
      }

      // Anti-self-referral: check if client is the GroupAdmin themselves
      if (afterData.clientId === groupAdminId) {
        logger.warn("[onCallCompletedGroupAdmin] Self-referral detected, skipping commission", {
          groupAdminId,
          clientId: afterData.clientId,
          sessionId,
        });
        return;
      }

      // Anti-self-referral: check if client email matches GroupAdmin email
      if (clientData.email && clientData.email.toLowerCase() === groupAdmin.email.toLowerCase()) {
        logger.warn("[onCallCompletedGroupAdmin] Self-referral by email detected, skipping commission", {
          groupAdminId,
          clientId: afterData.clientId,
          sessionId,
        });
        return;
      }

      // ================================================================
      // IDEMPOTENCE: Transaction-based guard to prevent duplicate commissions
      // ================================================================
      const sessionRef = event.data!.after.ref;
      const shouldProceed = await db.runTransaction(async (tx) => {
        const freshSession = await tx.get(sessionRef);
        if (freshSession.data()?.groupAdminCommissionPaid) return false;
        tx.update(sessionRef, { groupAdminCommissionPaid: true });
        return true;
      });

      if (!shouldProceed) {
        logger.info("[onCallCompletedGroupAdmin] Already processed by another trigger", { sessionId });
        return;
      }

      // ================================================================
      // CREATE COMMISSION
      // ================================================================
      const commission = await createClientReferralCommission(
        groupAdminId,
        afterData.clientId,
        sessionId,
        `Client referral commission for session ${sessionId}`
      );

      if (commission) {
        // Mark commission metadata on the session document
        await sessionRef.update({
          groupAdminCommissionId: commission.id,
          groupAdminCommissionAt: Timestamp.now(),
        });

        logger.info("[onCallCompletedGroupAdmin] Commission created", {
          sessionId,
          groupAdminId,
          affiliateCode: groupAdminCode,
          commissionId: commission.id,
          amount: commission.amount,
        });
      } else {
        // Commission creation failed (duplicate check in service or inactive admin).
        // Revert the idempotence flag so a retry can attempt again.
        await sessionRef.update({ groupAdminCommissionPaid: false });
      }
    } catch (error) {
      logger.error("[onCallCompletedGroupAdmin] Error creating commission", {
        sessionId,
        error,
      });
      // Revert idempotence flag so a future retry can re-attempt commission creation.
      try {
        const sessionRef = event.data!.after.ref;
        await sessionRef.update({ groupAdminCommissionPaid: false });
      } catch (revertError) {
        logger.error("[onCallCompletedGroupAdmin] Failed to revert idempotence flag", {
          sessionId,
          revertError,
        });
      }
    }
}

export const onCallCompletedGroupAdmin = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  handleCallCompleted
);
