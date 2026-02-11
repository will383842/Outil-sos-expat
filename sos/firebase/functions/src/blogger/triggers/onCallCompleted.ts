/**
 * Trigger: On Call Completed (for blogger commissions)
 *
 * This trigger fires when a call is completed AND paid to check
 * if the client was referred by a blogger and award commission.
 *
 * IMPORTANT: Commission is only created when isPaid === true,
 * which is set by Stripe/PayPal webhooks when payment is captured
 * (money received on SOS Expat's account).
 *
 * NOTE: This trigger listens to call_sessions collection.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger } from "../types";
import { createBloggerCommission } from "../services/bloggerCommissionService";
import { checkAndPayRecruitmentCommission } from "../services/bloggerRecruitmentService";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

/** Minimum call duration in seconds to earn commission (anti-fraud) */
const MIN_CALL_DURATION_SECONDS = 120;

/**
 * Check and award blogger commission when a call is completed
 *
 * Call this function from your existing call completion logic,
 * or set up a trigger on your call_sessions collection.
 */
export async function checkBloggerClientReferral(
  callSessionId: string,
  clientId: string,
  clientEmail: string,
  callDuration: number,
  connectionFee: number
): Promise<{ awarded: boolean; commissionId?: string; error?: string }> {
  const db = getFirestore();

  try {
    // 1. Check if config is active
    const config = await getBloggerConfigCached();
    if (!config.isSystemActive) {
      return { awarded: false, error: "Blogger system not active" };
    }

    // Minimum call duration check (anti-fraud: prevent 1-second call commissions)
    if (!callDuration || callDuration < MIN_CALL_DURATION_SECONDS) {
      logger.warn("[checkBloggerClientReferral] Call too short for commission", {
        callSessionId, callDuration, minimum: MIN_CALL_DURATION_SECONDS,
      });
      return { awarded: false, error: "Call too short for commission" };
    }

    // 2. Look for blogger attribution for this client
    // Check in user document or attribution collection
    const userDoc = await db.collection("users").doc(clientId).get();

    if (!userDoc.exists) {
      return { awarded: false, error: "User not found" };
    }

    const userData = userDoc.data();

    // Check if user was referred by a blogger
    // Look for bloggerReferredBy field (set during signup with blogger code)
    const bloggerCode = userData?.bloggerReferredBy || userData?.referredByBlogger;

    if (!bloggerCode) {
      // Check attribution collection as fallback
      const attributionQuery = await db
        .collection("blogger_clicks")
        .where("conversionId", "==", clientId)
        .where("converted", "==", true)
        .limit(1)
        .get();

      if (attributionQuery.empty) {
        return { awarded: false }; // Not a blogger referral
      }

      // Get blogger from attribution
      const attribution = attributionQuery.docs[0].data();
      const bloggerId = attribution.bloggerId;

      // Proceed with commission
      return await awardBloggerCommission(
        bloggerId,
        callSessionId,
        clientId,
        clientEmail,
        callDuration,
        connectionFee
      );
    }

    // 3. Find blogger by code
    const bloggerQuery = await db
      .collection("bloggers")
      .where("affiliateCodeClient", "==", bloggerCode)
      .limit(1)
      .get();

    if (bloggerQuery.empty) {
      return { awarded: false, error: "Blogger not found for code" };
    }

    const bloggerId = bloggerQuery.docs[0].id;

    return await awardBloggerCommission(
      bloggerId,
      callSessionId,
      clientId,
      clientEmail,
      callDuration,
      connectionFee
    );
  } catch (error) {
    logger.error("[checkBloggerClientReferral] Error", { callSessionId, error });
    return {
      awarded: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Award commission to a blogger for a client referral
 */
async function awardBloggerCommission(
  bloggerId: string,
  callSessionId: string,
  clientId: string,
  clientEmail: string,
  callDuration: number,
  connectionFee: number
): Promise<{ awarded: boolean; commissionId?: string; error?: string }> {
  const db = getFirestore();

  // Check blogger status
  const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

  if (!bloggerDoc.exists) {
    return { awarded: false, error: "Blogger not found" };
  }

  const blogger = bloggerDoc.data() as Blogger;

  if (blogger.status !== "active") {
    return { awarded: false, error: "Blogger not active" };
  }

  // Check if commission already exists for this call
  const existingCommission = await db
    .collection("blogger_commissions")
    .where("bloggerId", "==", bloggerId)
    .where("sourceId", "==", callSessionId)
    .where("type", "==", "client_referral")
    .limit(1)
    .get();

  if (!existingCommission.empty) {
    return { awarded: false, error: "Commission already exists for this call" };
  }

  // Create commission (FIXED amount from config)
  const result = await createBloggerCommission({
    bloggerId,
    type: "client_referral",
    source: {
      id: callSessionId,
      type: "call_session",
      details: {
        clientId,
        clientEmail,
        callSessionId,
        callDuration,
        connectionFee,
      },
    },
    description: `Commission client référé - Appel #${callSessionId.slice(-6)}`,
  });

  if (result.success) {
    logger.info("[awardBloggerCommission] Commission awarded", {
      bloggerId,
      commissionId: result.commissionId,
      amount: result.amount,
    });

    // Create notification
    await db.collection("blogger_notifications").add({
      bloggerId,
      type: "commission_earned",
      title: "Nouvelle commission !",
      titleTranslations: { en: "New commission!" },
      message: `Vous avez gagné $${(result.amount! / 100).toFixed(2)} pour un client référé.`,
      messageTranslations: {
        en: `You earned $${(result.amount! / 100).toFixed(2)} for a referred client.`,
      },
      isRead: false,
      emailSent: false,
      data: {
        commissionId: result.commissionId,
        amount: result.amount,
      },
      createdAt: Timestamp.now(),
    });

    // Check and pay recruitment commission (recruiter gets $5 when this blogger reaches $50)
    await checkAndPayRecruitmentCommission(bloggerId);
  }

  return {
    awarded: result.success,
    commissionId: result.commissionId,
    error: result.error,
  };
}

/**
 * Firestore trigger for call completion - awards blogger commissions
 */
export const bloggerOnCallSessionCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const sessionId = event.params.sessionId;

    if (!before || !after) return;

    // Check if call just completed and is paid (isPaid set by Stripe/PayPal webhook on capture)
    const wasNotPaid = before.status !== "completed" || !before.isPaid;
    const isNowPaid = after.status === "completed" && after.isPaid === true;

    if (wasNotPaid && isNowPaid) {
      const clientId = after.clientId || after.userId;
      const clientEmail = after.clientEmail || after.userEmail || "";
      const duration = after.duration || after.callDuration || 0;
      const connectionFee = after.connectionFee || after.amount || 0;

      if (!clientId) {
        logger.warn("[bloggerOnCallSessionCompleted] No clientId found", { sessionId });
        return;
      }

      // Check for blogger referral and award commission
      const result = await checkBloggerClientReferral(
        sessionId,
        clientId,
        clientEmail,
        duration,
        connectionFee
      );

      if (result.awarded) {
        logger.info("[bloggerOnCallSessionCompleted] Blogger commission awarded", {
          sessionId,
          commissionId: result.commissionId,
        });
      }
    }
  }
);
