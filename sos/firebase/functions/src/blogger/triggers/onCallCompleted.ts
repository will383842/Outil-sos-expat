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

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger } from "../types";
import { createBloggerCommission } from "../services/bloggerCommissionService";
import { checkAndPayRecruitmentCommission } from "../services/bloggerRecruitmentService";
import { awardBloggerRecruitmentCommission } from "./onProviderRegistered";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

/** Minimum call duration in seconds to earn commission (anti-fraud) */
const MIN_CALL_DURATION_SECONDS = 60;

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
  connectionFee: number,
  providerType?: 'lawyer' | 'expat'
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
        .collection("blogger_affiliate_clicks")
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

      // SECURITY: Block self-referral
      if (bloggerId === clientId) {
        logger.warn("[checkBloggerClientReferral] Self-referral blocked", { bloggerId, clientId, callSessionId });
        return { awarded: false, error: "Self-referral blocked" };
      }

      // Proceed with commission
      return await awardBloggerCommission(
        bloggerId,
        callSessionId,
        clientId,
        clientEmail,
        callDuration,
        connectionFee,
        providerType
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

    // SECURITY: Block self-referral
    if (bloggerId === clientId) {
      logger.warn("[checkBloggerClientReferral] Self-referral blocked", { bloggerId, clientId, callSessionId });
      return { awarded: false, error: "Self-referral blocked" };
    }

    return await awardBloggerCommission(
      bloggerId,
      callSessionId,
      clientId,
      clientEmail,
      callDuration,
      connectionFee,
      providerType
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
  connectionFee: number,
  providerType?: 'lawyer' | 'expat'
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

  // Create commission (split by provider type: lawyer=$5, expat=$3)
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
        providerType,
      },
    },
    providerType,
    description: `Commission client référé - Appel #${callSessionId.slice(-6)}`,
  });

  if (result.success) {
    logger.info("[awardBloggerCommission] Commission awarded", {
      bloggerId,
      commissionId: result.commissionId,
      amount: result.amount,
    });

    // Create notification (i18n: 9 languages, English fallback)
    const amountStr = (result.amount! / 100).toFixed(2);
    await db.collection("blogger_notifications").add({
      bloggerId,
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
      message: `Vous avez gagné $${amountStr} pour un client référé.`,
      messageTranslations: {
        fr: `Vous avez gagné $${amountStr} pour un client référé.`,
        en: `You earned $${amountStr} for a referred client.`,
        es: `Has ganado $${amountStr} por un cliente referido.`,
        de: `Sie haben $${amountStr} für einen geworbenen Kunden verdient.`,
        pt: `Você ganhou $${amountStr} por um cliente indicado.`,
        ru: `Вы заработали $${amountStr} за привлечённого клиента.`,
        hi: `आपने रेफ़र किए गए क्लाइंट के लिए $${amountStr} कमाए।`,
        zh: `您因推荐客户赚取了 $${amountStr}。`,
        ar: `لقد ربحت $${amountStr} مقابل عميل محال.`,
      },
      isRead: false,
      emailSent: false,
      data: {
        commissionId: result.commissionId,
        amount: result.amount,
      },
      createdAt: Timestamp.now(),
    });

    // Check and pay recruitment commission (recruiter gets $50 when this blogger reaches $200)
    await checkAndPayRecruitmentCommission(bloggerId);

    // ============================================================
    // N1/N2 NETWORK COMMISSIONS + ACTIVATION BONUS
    // ============================================================
    const bloggerConfig = await getBloggerConfigCached();

    // Increment totalClientCalls
    await db.collection("bloggers").doc(bloggerId).update({
      totalClientCalls: FieldValue.increment(1),
    });

    const freshBlogger = (await db.collection("bloggers").doc(bloggerId).get()).data() as Blogger;
    const totalCalls = freshBlogger.totalClientCalls || 1;

    // --- ACTIVATION BONUS ---
    if (
      !freshBlogger.isActivated &&
      totalCalls >= (bloggerConfig.activationCallsRequired || 2) &&
      freshBlogger.recruitedBy
    ) {
      await db.collection("bloggers").doc(bloggerId).update({ isActivated: true });

      const recruiterId = freshBlogger.recruitedBy;
      const recruiterDoc = await db.collection("bloggers").doc(recruiterId).get();
      if (recruiterDoc.exists) {
        const recruiter = recruiterDoc.data() as Blogger;
        const minDirect = bloggerConfig.activationMinDirectCommissions || 10000;

        if ((recruiter.totalEarned || 0) >= minDirect && !freshBlogger.activationBonusPaid) {
          const activationAmount = recruiter.individualRates?.commissionActivationBonusAmount
            ?? recruiter.lockedRates?.commissionActivationBonusAmount
            ?? bloggerConfig.commissionActivationBonusAmount ?? 500;

          const actResult = await createBloggerCommission({
            bloggerId: recruiterId,
            type: "activation_bonus",
            source: { id: bloggerId, type: "user", details: { activatedBloggerId: bloggerId, totalClientCalls: totalCalls } },
            baseAmount: activationAmount,
            description: `Bonus activation: filleul ${bloggerId} activé`,
          });

          if (actResult.success) {
            await db.collection("bloggers").doc(bloggerId).update({ activationBonusPaid: true });
            logger.info("[bloggerOnCallCompleted] Activation bonus paid", { recruiterId, activatedId: bloggerId });
          }

          // N1 Recruit Bonus to grand-parrain
          if (recruiter.recruitedBy) {
            const gpDoc = await db.collection("bloggers").doc(recruiter.recruitedBy).get();
            if (gpDoc.exists) {
              const gp = gpDoc.data() as Blogger;
              const n1RecruitAmt = gp.individualRates?.commissionN1RecruitBonusAmount
                ?? gp.lockedRates?.commissionN1RecruitBonusAmount
                ?? bloggerConfig.commissionN1RecruitBonusAmount ?? 100;

              await createBloggerCommission({
                bloggerId: recruiter.recruitedBy,
                type: "n1_recruit_bonus",
                source: { id: bloggerId, type: "user", details: { activatedBloggerId: bloggerId, recruiterId } },
                baseAmount: n1RecruitAmt,
                description: `Bonus N1 recrutement: ${bloggerId} activé via ${recruiterId}`,
              });
            }
          }
        }
      }
    }

    // --- N1 COMMISSION ---
    if (freshBlogger.recruitedBy) {
      const n1Doc = await db.collection("bloggers").doc(freshBlogger.recruitedBy).get();
      if (n1Doc.exists) {
        const n1 = n1Doc.data() as Blogger;
        if (n1.status === "active") {
          const n1Amt = n1.individualRates?.commissionN1CallAmount
            ?? n1.lockedRates?.commissionN1CallAmount
            ?? bloggerConfig.commissionN1CallAmount ?? 100;

          await createBloggerCommission({
            bloggerId: freshBlogger.recruitedBy,
            type: "n1_call",
            source: { id: callSessionId, type: "call_session", details: { originBloggerId: bloggerId, clientId, providerType } },
            baseAmount: n1Amt,
            description: `Commission N1: appel client de ${bloggerId}`,
          });
        }
      }
    }

    // --- N2 COMMISSION ---
    if (freshBlogger.parrainNiveau2Id) {
      const n2Doc = await db.collection("bloggers").doc(freshBlogger.parrainNiveau2Id).get();
      if (n2Doc.exists) {
        const n2 = n2Doc.data() as Blogger;
        if (n2.status === "active") {
          const n2Amt = n2.individualRates?.commissionN2CallAmount
            ?? n2.lockedRates?.commissionN2CallAmount
            ?? bloggerConfig.commissionN2CallAmount ?? 50;

          await createBloggerCommission({
            bloggerId: freshBlogger.parrainNiveau2Id,
            type: "n2_call",
            source: { id: callSessionId, type: "call_session", details: { originBloggerId: bloggerId, n1Id: freshBlogger.recruitedBy || undefined, clientId, providerType } },
            baseAmount: n2Amt,
            description: `Commission N2: appel client de ${bloggerId}`,
          });
        }
      }
    }

    // --- MILESTONE CHECK ---
    if (freshBlogger.recruitedBy) {
      const { checkAndPayRecruitmentMilestones } = await import("../../lib/milestoneService");
      const milestoneRecruiterDoc = await db.collection("bloggers").doc(freshBlogger.recruitedBy).get();
      if (milestoneRecruiterDoc.exists) {
        const milestoneRecruiter = milestoneRecruiterDoc.data() as Blogger;
        const recruitsSnap = await db.collection("bloggers")
          .where("recruitedBy", "==", freshBlogger.recruitedBy)
          .get();

        await checkAndPayRecruitmentMilestones({
          affiliateId: freshBlogger.recruitedBy,
          role: "blogger",
          collection: "bloggers",
          commissionCollection: "blogger_commissions",
          totalRecruits: recruitsSnap.size,
          tierBonusesPaid: milestoneRecruiter.tierBonusesPaid || [],
          milestones: bloggerConfig.recruitmentMilestones || [],
          commissionType: "tier_bonus",
        });
      }
    }
  }

  return {
    awarded: result.success,
    commissionId: result.commissionId,
    error: result.error,
  };
}

/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full blogger onCallCompleted logic.
 */
export async function handleCallCompleted(
  event: Parameters<Parameters<typeof onDocumentUpdated>[1]>[0]
): Promise<void> {
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
    const providerId = after.providerId || after.expertId || after.lawyerId || null;

    if (!clientId) {
      logger.warn("[bloggerOnCallSessionCompleted] No clientId found", { sessionId });
      return;
    }

    // Check for blogger referral and award commission (split by provider type)
    const providerType = after.providerType ?? after.metadata?.providerType;
    const result = await checkBloggerClientReferral(
      sessionId,
      clientId,
      clientEmail,
      duration,
      connectionFee,
      providerType
    );

    if (result.awarded) {
      logger.info("[bloggerOnCallSessionCompleted] Blogger commission awarded", {
        sessionId,
        commissionId: result.commissionId,
      });
    }

    // Award $5 recruitment commission to bloggers who recruited this provider
    if (providerId) {
      const recruitResult = await awardBloggerRecruitmentCommission(
        providerId,
        sessionId,
        duration,
        clientId // Anti-double payment: skip blogger who also referred this client
      );
      if (recruitResult.awarded) {
        logger.info("[bloggerOnCallSessionCompleted] Provider recruitment commissions awarded", {
          sessionId,
          providerId,
          commissionsCount: recruitResult.commissions.length,
        });
      }
    }
  }
}

/**
 * Firestore trigger for call completion - awards blogger commissions
 */
export const bloggerOnCallSessionCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  handleCallCompleted
);
