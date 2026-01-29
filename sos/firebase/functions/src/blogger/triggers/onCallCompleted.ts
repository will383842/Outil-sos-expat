/**
 * Trigger: On Call Completed (for blogger commissions)
 *
 * This trigger should be called when a call is completed to check
 * if the client was referred by a blogger and award commission.
 *
 * NOTE: This trigger listens to call_sessions collection.
 * The actual trigger should be integrated with your existing call completion flow.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
// Note: Import onDocumentUpdated when uncommenting the trigger below:
// import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger } from "../types";
import { createBloggerCommission } from "../services/bloggerCommissionService";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

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
  }

  return {
    awarded: result.success,
    commissionId: result.commissionId,
    error: result.error,
  };
}

/**
 * Example Firestore trigger for call completion
 * Uncomment and adapt to your call_sessions structure if needed
 */
/*
export const onCallSessionCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west1",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const sessionId = event.params.sessionId;

    // Check if call just completed
    if (before?.status !== "completed" && after?.status === "completed") {
      // Check for blogger referral
      await checkBloggerClientReferral(
        sessionId,
        after.clientId,
        after.clientEmail,
        after.duration,
        after.connectionFee
      );
    }
  }
);
*/
