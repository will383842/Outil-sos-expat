/**
 * Affiliate Trigger: onCallCompleted
 *
 * Triggered when a call_session status changes to completed.
 * Handles:
 * - Check if caller was referred by an affiliate
 * - Determine if it's first call or recurring
 * - Create appropriate commission
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { isAffiliateSystemActive } from "../utils/configService";
import { createCommission } from "../services/commissionService";


// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Trigger: onCallCompleted
 *
 * Creates commission when a referred user completes a call
 */
/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full affiliate onCallCompleted logic.
 */
export async function handleCallCompleted(
  event: Parameters<Parameters<typeof onDocumentUpdated>[1]>[0]
): Promise<void> {
  ensureInitialized();

  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!before || !after) {
    logger.warn("[affiliateOnCallCompleted] Missing data in event");
    return;
  }

  // Only process when call transitions to completed AND paid
  // Must match the pattern used by chatter/influencer/blogger/groupAdmin triggers:
  // isPaid is set in a separate Firestore update AFTER status="completed",
  // so we detect the transition to (completed + isPaid=true)
  const wasNotPaid = before.status !== "completed" || !before.isPaid;
  const isNowPaid = after.status === "completed" && after.isPaid === true;
  if (!wasNotPaid || !isNowPaid) {
    return;
  }

  const sessionId = event.params.sessionId;
  const clientId = after.metadata?.clientId || after.clientId;
  const providerId = after.metadata?.providerId || after.providerId;

    logger.info("[affiliateOnCallCompleted] Processing PAID completed call", {
      sessionId,
      clientId,
      providerId,
    });

    const db = getFirestore();

    try {
      // 1. Check if affiliate system is active
      const systemActive = await isAffiliateSystemActive();
      if (!systemActive) {
        logger.info("[affiliateOnCallCompleted] Affiliate system is inactive");
        return;
      }

      // 2. Get client user to check if they were referred
      const clientDoc = await db.collection("users").doc(clientId).get();
      if (!clientDoc.exists) {
        logger.warn("[affiliateOnCallCompleted] Client not found", { clientId });
        return;
      }

      const clientData = clientDoc.data()!;
      const referredByUserId = clientData.referredByUserId;

      if (!referredByUserId) {
        logger.info("[affiliateOnCallCompleted] Client was not referred", {
          clientId,
        });
        return;
      }

      // 3. Calculate call duration
      const callDuration = after.duration || after.durationSeconds || 0;

      // 3b. Skip if call has no meaningful duration (prevents ghost commissions)
      if (callDuration <= 0) {
        logger.info("[affiliateOnCallCompleted] Skipping - call has no duration", {
          sessionId,
          clientId,
        });
        return;
      }

      // 5. Get call amounts
      const connectionFee = after.pricing?.connectionFee || after.connectionFee || 0;
      const totalAmount = after.pricing?.totalAmount || after.totalAmount || 0;

      // 6. Determine provider type
      const providerDoc = await db.collection("sos_profiles").doc(providerId).get();
      const providerType = providerDoc.exists
        ? (providerDoc.data()?.providerType as "lawyer" | "expat")
        : undefined;

      // 7. Check if this is the client's first completed call
      // First, check if a first_call commission already exists for this referral pair
      // (prevents race condition if two calls complete simultaneously)
      const existingFirstCallQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", referredByUserId)
        .where("refereeId", "==", clientId)
        .where("type", "==", "referral_first_call")
        .limit(1)
        .get();

      let isFirstCall: boolean;
      if (!existingFirstCallQuery.empty) {
        // A first_call commission already exists - this is definitely a recurring call
        isFirstCall = false;
      } else {
        // Check call_sessions as secondary check
        const previousCallsQuery = await db
          .collection("call_sessions")
          .where("clientId", "==", clientId)
          .where("status", "==", "completed")
          .limit(2)
          .get();

        const previousCompletedCalls = previousCallsQuery.docs.filter(
          (doc) => doc.id !== sessionId
        ).length;

        isFirstCall = previousCompletedCalls === 0;
      }

      logger.info("[affiliateOnCallCompleted] Call details", {
        sessionId,
        clientId,
        referredByUserId,
        isFirstCall,
        callDuration,
        connectionFee,
        providerType,
      });

      // 8. Get call count this month for recurring calls limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const callsThisMonthQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", referredByUserId)
        .where("refereeId", "==", clientId)
        .where("type", "in", ["referral_first_call", "referral_recurring_call"])
        .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
        .get();

      const callsThisMonth = callsThisMonthQuery.size;

      // 9. Get lifetime call commissions for this referral
      const lifetimeCallsQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", referredByUserId)
        .where("refereeId", "==", clientId)
        .where("type", "in", ["referral_first_call", "referral_recurring_call"])
        .get();

      const lifetimeCommissions = lifetimeCallsQuery.size;

      // 10. Create commission
      const commissionType = isFirstCall ? "referral_first_call" : "referral_recurring_call";

      const commissionResult = await createCommission({
        type: commissionType,
        referrerId: referredByUserId,
        refereeId: clientId,
        source: {
          id: sessionId,
          type: "call_session",
          details: {
            callSessionId: sessionId,
            providerType,
            callDuration,
            connectionFee,
            providerId,
          },
        },
        amounts: {
          connectionFee,
          totalAmount,
        },
        context: {
          callDuration,
          providerType,
          isFirstCall,
          callsThisMonth,
          lifetimeCommissions,
        },
        description: isFirstCall
          ? `Premier appel de ${clientData.email} (${Math.round(callDuration / 60)} min)`
          : `Appel de ${clientData.email} (${Math.round(callDuration / 60)} min)`,
      });

      if (commissionResult.success) {
        logger.info("[affiliateOnCallCompleted] Commission created", {
          commissionId: commissionResult.commissionId,
          amount: commissionResult.amount,
          type: commissionType,
          sessionId,
        });

        // 11. Update referral tracking if first call
        if (isFirstCall) {
          const referralQuery = await db
            .collection("referrals")
            .where("referrerId", "==", referredByUserId)
            .where("refereeId", "==", clientId)
            .limit(1)
            .get();

          if (!referralQuery.empty) {
            await referralQuery.docs[0].ref.update({
              firstActionAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }

          // Update referrer's active referrals count
          await db.collection("users").doc(referredByUserId).update({
            "affiliateStats.activeReferrals": FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });
        }

        // 12. Update referral total commissions
        const referralQuery = await db
          .collection("referrals")
          .where("referrerId", "==", referredByUserId)
          .where("refereeId", "==", clientId)
          .limit(1)
          .get();

        if (!referralQuery.empty) {
          await referralQuery.docs[0].ref.update({
            totalCommissions: FieldValue.increment(commissionResult.amount || 0),
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        logger.info("[affiliateOnCallCompleted] Commission not created", {
          reason: commissionResult.reason || commissionResult.error,
          sessionId,
        });
      }
    } catch (error) {
      logger.error("[affiliateOnCallCompleted] Error processing call", {
        sessionId,
        error,
      });
      throw error;
    }
}

export const affiliateOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  handleCallCompleted
);
