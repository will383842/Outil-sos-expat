/**
 * Trigger: onProviderRegistered (Influencer)
 *
 * Triggered when a new provider (lawyer or expat) is created.
 * Checks if they were recruited by an influencer and creates a referral tracking record.
 *
 * NOTE: The actual commission ($5) is created when the provider receives their first call,
 * and continues for 6 months from recruitment date.
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer, InfluencerReferral } from "../types";
import { getInfluencerConfigCached } from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface ProviderDocument {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "lawyer" | "expat";
  // Influencer tracking (set during registration via cookie)
  recruitedByInfluencer?: boolean;
  influencerCode?: string;
  influencerId?: string;
  createdAt: Timestamp;
}

export async function handleInfluencerProviderRegistered(event: any) {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const userData = snapshot.data() as ProviderDocument;
    const userId = event.params.userId;

    // Only process providers (lawyers and expats)
    if (userData.role !== "lawyer" && userData.role !== "expat") {
      return;
    }

    // Check if recruited by influencer
    if (!userData.recruitedByInfluencer || !userData.influencerCode) {
      return;
    }

    const db = getFirestore();

    try {
      const config = await getInfluencerConfigCached();

      if (!config.isSystemActive) {
        logger.info("[influencerOnProviderRegistered] System not active", {
          userId,
        });
        return;
      }

      // Find influencer
      let influencer: Influencer | null = null;
      let influencerId = userData.influencerId;

      if (influencerId) {
        const influencerDoc = await db.collection("influencers").doc(influencerId).get();
        if (influencerDoc.exists) {
          influencer = influencerDoc.data() as Influencer;
        }
      } else {
        // Find by recruitment code (REC-XXXX format)
        const code = userData.influencerCode.toUpperCase();
        const clientCode = code.replace("REC-", "");

        const influencerQuery = await db
          .collection("influencers")
          .where("affiliateCodeClient", "==", clientCode)
          .limit(1)
          .get();

        if (!influencerQuery.empty) {
          influencer = influencerQuery.docs[0].data() as Influencer;
          influencerId = influencer.id;
        }
      }

      if (!influencer || !influencerId) {
        logger.warn("[influencerOnProviderRegistered] Influencer not found", {
          userId,
          influencerCode: userData.influencerCode,
        });
        return;
      }

      // Check influencer status
      if (influencer.status !== "active") {
        logger.info("[influencerOnProviderRegistered] Influencer not active", {
          userId,
          influencerId,
          status: influencer.status,
        });
        return;
      }

      // Calculate commission window end (6 months from now)
      const now = Timestamp.now();
      const commissionWindowEnds = new Date();
      commissionWindowEnds.setMonth(commissionWindowEnds.getMonth() + config.recruitmentWindowMonths);

      // Create referral tracking record
      const referralRef = db.collection("influencer_referrals").doc();
      const referral: InfluencerReferral = {
        id: referralRef.id,
        influencerId,
        influencerCode: influencer.affiliateCodeClient,
        influencerEmail: influencer.email,
        providerId: userId,
        providerEmail: userData.email,
        providerType: userData.role,
        providerName: `${userData.firstName} ${userData.lastName}`,
        recruitedAt: now,
        commissionWindowEndsAt: Timestamp.fromDate(commissionWindowEnds),
        isActive: true,
        callsWithCommission: 0,
        totalCommissions: 0,
        lastCommissionAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await db.runTransaction(async (transaction) => {
        // Create referral
        transaction.set(referralRef, referral);

        // Update influencer stats
        const influencerRef = db.collection("influencers").doc(influencerId);
        const influencerDoc = await transaction.get(influencerRef);

        if (influencerDoc.exists) {
          const data = influencerDoc.data() as Influencer;
          transaction.update(influencerRef, {
            totalRecruits: data.totalRecruits + 1,
            updatedAt: now,
          });
        }

        // Update provider document with recruitment info
        const userRef = db.collection("users").doc(userId);
        transaction.update(userRef, {
          influencerReferralId: referralRef.id,
          updatedAt: now,
        });
      });

      // Create notification for influencer
      const notificationRef = db.collection("influencer_notifications").doc();
      await notificationRef.set({
        id: notificationRef.id,
        influencerId,
        type: "new_referral",
        title: "Nouveau prestataire recruté !",
        titleTranslations: {
          fr: "Nouveau prestataire recruté !",
          en: "New provider recruited!",
          es: "¡Nuevo proveedor reclutado!",
          de: "Neuer Anbieter rekrutiert!",
          pt: "Novo prestador recrutado!",
          ru: "Новый поставщик привлечён!",
          hi: "नया प्रदाता भर्ती हुआ!",
          zh: "新服务商已招募！",
          ar: "تم تجنيد مزوّد جديد!",
        },
        message: `${userData.firstName} ${userData.lastName.charAt(0)}. s'est inscrit via votre lien. Vous gagnerez $5 à chaque appel reçu pendant 6 mois.`,
        messageTranslations: {
          fr: `${userData.firstName} ${userData.lastName.charAt(0)}. s'est inscrit via votre lien. Vous gagnerez $5 à chaque appel reçu pendant 6 mois.`,
          en: `${userData.firstName} ${userData.lastName.charAt(0)}. signed up via your link. You'll earn $5 for each call they receive for 6 months.`,
          es: `${userData.firstName} ${userData.lastName.charAt(0)}. se registró a través de tu enlace. Ganarás $5 por cada llamada durante 6 meses.`,
          de: `${userData.firstName} ${userData.lastName.charAt(0)}. hat sich über Ihren Link registriert. Sie verdienen $5 pro Anruf für 6 Monate.`,
          pt: `${userData.firstName} ${userData.lastName.charAt(0)}. registrou-se pelo seu link. Você ganhará $5 por cada chamada durante 6 meses.`,
          ru: `${userData.firstName} ${userData.lastName.charAt(0)}. зарегистрировался по вашей ссылке. Вы будете получать $5 за каждый звонок в течение 6 месяцев.`,
          hi: `${userData.firstName} ${userData.lastName.charAt(0)}. आपके लिंक से पंजीकृत हुआ। आप 6 महीने तक हर कॉल पर $5 कमाएंगे।`,
          zh: `${userData.firstName} ${userData.lastName.charAt(0)}. 通过您的链接注册。您将在6个月内每次通话赚取 $5。`,
          ar: `${userData.firstName} ${userData.lastName.charAt(0)}. سجّل عبر رابطك. ستحصل على $5 عن كل مكالمة لمدة 6 أشهر.`,
        },
        actionUrl: "/influencer/filleuls",
        isRead: false,
        emailSent: false,
        data: {
          referralId: referralRef.id,
          providerId: userId,
        },
        createdAt: now,
      });

      logger.info("[influencerOnProviderRegistered] Referral created", {
        providerId: userId,
        influencerId,
        referralId: referralRef.id,
        commissionWindowEnds: commissionWindowEnds.toISOString(),
      });
    } catch (error) {
      logger.error("[influencerOnProviderRegistered] Error", {
        userId,
        error,
      });
    }
}

export const influencerOnProviderRegistered = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleInfluencerProviderRegistered
);

/**
 * Secondary trigger: onProviderCallCompleted
 *
 * When a recruited provider receives a completed call, create $5 commission
 * for the influencer (if within 6-month window).
 */
export const influencerOnProviderCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const before = event.data?.before;
    const after = event.data?.after;
    if (!before || !after) {
      return;
    }

    const beforeData = before.data();
    const callData = after.data();
    const sessionId = event.params.sessionId;

    // Only process when call becomes completed AND paid (aligned with chatter/blogger/groupAdmin)
    const wasNotPaid = beforeData.status !== "completed" || !beforeData.isPaid;
    const isNowPaid = callData.status === "completed" && callData.isPaid === true;
    if (!wasNotPaid || !isNowPaid) {
      return;
    }

    const providerId = callData.providerId;
    if (!providerId) {
      return;
    }

    const db = getFirestore();

    try {
      // Check if provider was recruited by an influencer
      const referralQuery = await db
        .collection("influencer_referrals")
        .where("providerId", "==", providerId)
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (referralQuery.empty) {
        return; // Provider not recruited by influencer
      }

      const referral = referralQuery.docs[0].data() as InfluencerReferral;

      // Check if within commission window
      const now = new Date();
      const windowEnd = referral.commissionWindowEndsAt.toDate();

      if (now > windowEnd) {
        // Window expired - mark referral as inactive
        await db.collection("influencer_referrals").doc(referral.id).update({
          isActive: false,
          updatedAt: Timestamp.now(),
        });

        logger.info("[influencerOnProviderCallCompleted] Commission window expired", {
          sessionId,
          referralId: referral.id,
        });
        return;
      }

      const config = await getInfluencerConfigCached();

      if (!config.isSystemActive) {
        return;
      }

      // Check influencer status
      const influencerDoc = await db.collection("influencers").doc(referral.influencerId).get();
      if (!influencerDoc.exists) {
        return;
      }

      const influencer = influencerDoc.data() as Influencer;
      if (influencer.status !== "active") {
        return;
      }

      // Anti-double payment: skip if same influencer referred the client AND recruited the provider
      const clientIdForCheck = callData.clientId || callData.userId;
      if (clientIdForCheck) {
        const clientDocForCheck = await db.collection("users").doc(clientIdForCheck).get();
        if (clientDocForCheck.exists) {
          const clientCheckData = clientDocForCheck.data();

          // Check via direct ID field (if available)
          if (clientCheckData?.referredByInfluencerId === referral.influencerId) {
            logger.info("[influencerOnProviderCallCompleted] Skipping — anti-double via ID", {
              influencerId: referral.influencerId, clientId: clientIdForCheck, sessionId,
            });
            return;
          }

          // Check via influencer code (fallback — referredByInfluencerId may not be set)
          const clientInfluencerCode = clientCheckData?.influencerCode;
          if (clientInfluencerCode && clientCheckData?.referredByInfluencer) {
            const influencerByCode = await db.collection("influencers")
              .where("affiliateCodeClient", "==", clientInfluencerCode)
              .limit(1)
              .get();
            if (!influencerByCode.empty && influencerByCode.docs[0].id === referral.influencerId) {
              logger.info("[influencerOnProviderCallCompleted] Skipping — anti-double via code", {
                influencerId: referral.influencerId, clientId: clientIdForCheck, sessionId,
              });
              return;
            }
          }
        }
      }

      // Idempotency check: skip if commission already exists for this call
      const existingCommission = await db
        .collection("influencer_commissions")
        .where("influencerId", "==", referral.influencerId)
        .where("sourceId", "==", sessionId)
        .where("type", "==", "recruitment")
        .limit(1)
        .get();

      if (!existingCommission.empty) {
        logger.info("[influencerOnProviderCallCompleted] Commission already exists for this call", {
          sessionId,
          influencerId: referral.influencerId,
        });
        return;
      }

      // Calculate months remaining
      const diffMs = windowEnd.getTime() - now.getTime();
      const monthsRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));

      // Import createCommission from services
      const { createCommission } = await import("../services");

      // Create $5 recruitment commission
      const result = await createCommission({
        influencerId: referral.influencerId,
        type: "recruitment",
        source: {
          id: sessionId,
          type: "call_session",
          details: {
            providerId,
            providerEmail: referral.providerEmail,
            providerType: referral.providerType,
            callId: sessionId,
            recruitmentDate: referral.recruitedAt.toDate().toISOString(),
            monthsRemaining,
          },
        },
      });

      if (result.success) {
        // Update referral stats with atomic increments (prevent race conditions)
        await db.collection("influencer_referrals").doc(referral.id).update({
          callsWithCommission: FieldValue.increment(1),
          totalCommissions: FieldValue.increment(result.amount!),
          lastCommissionAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        logger.info("[influencerOnProviderCallCompleted] Recruitment commission created", {
          sessionId,
          influencerId: referral.influencerId,
          commissionId: result.commissionId,
          amount: result.amount,
          monthsRemaining,
        });
      }
    } catch (error) {
      logger.error("[influencerOnProviderCallCompleted] Error", {
        sessionId,
        error,
      });
    }
  }
);
