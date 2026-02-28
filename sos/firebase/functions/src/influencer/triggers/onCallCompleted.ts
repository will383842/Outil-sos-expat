/**
 * Trigger: onCallCompleted (Influencer)
 *
 * Triggered when a call session is completed AND paid.
 * Checks if the client was referred by an influencer and creates commission.
 *
 * IMPORTANT: Commission is only created when isPaid === true,
 * which is set by Stripe/PayPal webhooks when payment is captured
 * (money received on SOS Expat's account).
 *
 * Commission: Fixed $10 per client referral
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";
import { createCommission, checkAndPayRecruitmentCommission } from "../services";
import { getInfluencerConfigCached } from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/** Minimum call duration in seconds to earn commission (anti-fraud) */
const MIN_CALL_DURATION_SECONDS = 60;

interface CallSession {
  id: string;
  status: string;
  clientId: string;
  clientEmail?: string;
  providerId: string;
  providerType: "lawyer" | "expat";
  connectionFee?: number;
  duration?: number;
  isPaid?: boolean;
  // Influencer tracking
  influencerCode?: string;
  influencerId?: string;
  influencerCommissionCreated?: boolean;
}

/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full influencer onCallCompleted logic.
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

  const sessionId = event.params.sessionId;
  const db = getFirestore();

    // Minimum call duration check (anti-fraud: prevent 1-second call commissions)
    if (!afterData.duration || afterData.duration < MIN_CALL_DURATION_SECONDS) {
      logger.warn("[influencerOnCallCompleted] Call too short for commission", {
        sessionId,
        duration: afterData.duration,
        minimum: MIN_CALL_DURATION_SECONDS,
      });
      return;
    }

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

      // Create commission (split by provider type: lawyer=$5, expat=$3)
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
            providerType: afterData.providerType,
          },
        },
        providerType: afterData.providerType,
      });

      if (result.success) {
        // Mark commission as created on session
        await db.collection("call_sessions").doc(sessionId).update({
          influencerCommissionCreated: true,
          influencerCommissionId: result.commissionId,
          influencerCommissionAmount: result.amount,
          updatedAt: Timestamp.now(),
        });

        // Create notification for influencer (i18n: 9 languages, English fallback)
        const notificationRef = db.collection("influencer_notifications").doc();
        const amountStr = (result.amount! / 100).toFixed(2);
        await notificationRef.set({
          id: notificationRef.id,
          influencerId,
          type: "commission_earned",
          title: "Nouvelle commission !",
          titleTranslations: {
            fr: "Nouvelle commission !",
            en: "New commission!",
            es: "¡Nueva comisión!",
            de: "Neue Provision!",
            pt: "Nova comissão!",
            ru: "Новая комиссия!",
            hi: "नया कमीशन!",
            zh: "新佣金！",
            ar: "عمولة جديدة!",
          },
          message: `Vous avez gagné $${amountStr} pour le parrainage d'un client.`,
          messageTranslations: {
            fr: `Vous avez gagné $${amountStr} pour le parrainage d'un client.`,
            en: `You earned $${amountStr} for a client referral.`,
            es: `Has ganado $${amountStr} por el patrocinio de un cliente.`,
            de: `Sie haben $${amountStr} für eine Kundenempfehlung verdient.`,
            pt: `Você ganhou $${amountStr} por uma indicação de cliente.`,
            ru: `Вы заработали $${amountStr} за привлечение клиента.`,
            hi: `आपने क्लाइंट रेफ़रल के लिए $${amountStr} कमाए।`,
            zh: `您因推荐客户赚取了 $${amountStr}。`,
            ar: `لقد ربحت $${amountStr} مقابل إحالة عميل.`,
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

        // Check and pay recruitment commission (recruiter gets $5 when this influencer reaches $50)
        await checkAndPayRecruitmentCommission(influencerId);
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

export const influencerOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleCallCompleted
);
