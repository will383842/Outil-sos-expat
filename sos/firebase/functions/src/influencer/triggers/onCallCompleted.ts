/**
 * Trigger: onCallCompleted (Influencer)
 *
 * Triggered when a call session is completed.
 * Checks if the client was referred by an influencer and creates commission.
 *
 * Commission: Fixed $10 per client referral
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";
import { createCommission } from "../services";
import { getInfluencerConfigCached } from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface CallSession {
  id: string;
  status: string;
  clientId: string;
  clientEmail?: string;
  providerId: string;
  providerType: "lawyer" | "expat";
  connectionFee?: number;
  duration?: number;
  // Influencer tracking
  influencerCode?: string;
  influencerId?: string;
  influencerCommissionCreated?: boolean;
}

export const influencerOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as CallSession | undefined;
    const afterData = event.data?.after.data() as CallSession | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Only process when status changes to "completed"
    if (beforeData.status === afterData.status || afterData.status !== "completed") {
      return;
    }

    const sessionId = event.params.sessionId;
    const db = getFirestore();

    // Check if influencer commission already created
    if (afterData.influencerCommissionCreated) {
      logger.info("[influencerOnCallCompleted] Commission already created", {
        sessionId,
      });
      return;
    }

    // Check if call was from an influencer referral
    if (!afterData.influencerCode && !afterData.influencerId) {
      // No influencer referral - check if client has influencer cookie
      const userDoc = await db.collection("users").doc(afterData.clientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.referredByInfluencer && userData?.influencerCode) {
          afterData.influencerCode = userData.influencerCode;
          afterData.influencerId = userData.referredByInfluencerId;
        }
      }

      if (!afterData.influencerCode) {
        return; // No influencer referral
      }
    }

    try {
      const config = await getInfluencerConfigCached();

      if (!config.isSystemActive) {
        logger.info("[influencerOnCallCompleted] System not active", {
          sessionId,
        });
        return;
      }

      // Find influencer by code or ID
      let influencer: Influencer | null = null;
      let influencerId = afterData.influencerId;

      if (influencerId) {
        const influencerDoc = await db.collection("influencers").doc(influencerId).get();
        if (influencerDoc.exists) {
          influencer = influencerDoc.data() as Influencer;
        }
      } else if (afterData.influencerCode) {
        const influencerQuery = await db
          .collection("influencers")
          .where("affiliateCodeClient", "==", afterData.influencerCode.toUpperCase())
          .limit(1)
          .get();

        if (!influencerQuery.empty) {
          influencer = influencerQuery.docs[0].data() as Influencer;
          influencerId = influencer.id;
        }
      }

      if (!influencer || !influencerId) {
        logger.warn("[influencerOnCallCompleted] Influencer not found", {
          sessionId,
          influencerCode: afterData.influencerCode,
        });
        return;
      }

      // Check influencer status
      if (influencer.status !== "active") {
        logger.info("[influencerOnCallCompleted] Influencer not active", {
          sessionId,
          influencerId,
          status: influencer.status,
        });
        return;
      }

      // Create commission ($10 fixed)
      const result = await createCommission({
        influencerId,
        type: "client_referral",
        source: {
          id: sessionId,
          type: "call_session",
          details: {
            clientId: afterData.clientId,
            clientEmail: afterData.clientEmail,
            callSessionId: sessionId,
            callDuration: afterData.duration,
            connectionFee: afterData.connectionFee,
            discountApplied: config.clientDiscountPercent,
          },
        },
      });

      if (result.success) {
        // Mark commission as created on session
        await db.collection("call_sessions").doc(sessionId).update({
          influencerCommissionCreated: true,
          influencerCommissionId: result.commissionId,
          influencerCommissionAmount: result.amount,
          updatedAt: Timestamp.now(),
        });

        // Create notification for influencer
        const notificationRef = db.collection("influencer_notifications").doc();
        await notificationRef.set({
          id: notificationRef.id,
          influencerId,
          type: "commission_earned",
          title: "Nouvelle commission !",
          titleTranslations: { en: "New commission!" },
          message: `Vous avez gagné $${(result.amount! / 100).toFixed(2)} pour le parrainage d'un client.`,
          messageTranslations: {
            en: `You earned $${(result.amount! / 100).toFixed(2)} for a client referral.`,
          },
          actionUrl: "/influencer/gains",
          isRead: false,
          emailSent: false,
          data: {
            commissionId: result.commissionId,
            amount: result.amount,
          },
          createdAt: Timestamp.now(),
        });

        logger.info("[influencerOnCallCompleted] Commission created", {
          sessionId,
          influencerId,
          commissionId: result.commissionId,
          amount: result.amount,
        });
      } else {
        logger.error("[influencerOnCallCompleted] Failed to create commission", {
          sessionId,
          influencerId,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("[influencerOnCallCompleted] Error", {
        sessionId,
        error,
      });
    }
  }
);
