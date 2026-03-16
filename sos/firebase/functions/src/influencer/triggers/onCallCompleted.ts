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
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
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

      // SECURITY: Block self-referral — influencer cannot earn commissions on their own calls
      if (influencerId === afterData.clientId) {
        logger.warn("[influencerOnCallCompleted] Self-referral blocked", {
          influencerId,
          clientId: afterData.clientId,
          sessionId,
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

        // ============================================================
        // N1/N2 NETWORK COMMISSIONS + ACTIVATION BONUS
        // ============================================================

        // Increment totalClientCalls for activation tracking
        await db.collection("influencers").doc(influencerId).update({
          totalClientCalls: FieldValue.increment(1),
        });

        const freshInfluencer = (await db.collection("influencers").doc(influencerId).get()).data() as Influencer;
        const totalCalls = freshInfluencer.totalClientCalls || 1;

        // --- ACTIVATION BONUS ---
        // Check if this influencer just reached activation threshold (2nd call)
        if (
          !freshInfluencer.isActivated &&
          totalCalls >= (config.activationCallsRequired || 2) &&
          freshInfluencer.recruitedBy
        ) {
          // Mark as activated
          await db.collection("influencers").doc(influencerId).update({
            isActivated: true,
          });

          // Pay activation bonus to recruiter (if recruiter has $100+ in direct commissions)
          const recruiterId = freshInfluencer.recruitedBy;
          const recruiterDoc = await db.collection("influencers").doc(recruiterId).get();
          if (recruiterDoc.exists) {
            const recruiter = recruiterDoc.data() as Influencer;
            const minDirectCommissions = config.activationMinDirectCommissions || 10000;

            if ((recruiter.totalEarned || 0) >= minDirectCommissions && !freshInfluencer.activationBonusPaid) {
              const activationAmount = recruiter.individualRates?.commissionActivationBonusAmount
                ?? recruiter.lockedRates?.commissionActivationBonusAmount
                ?? config.commissionActivationBonusAmount ?? 500;

              const activationResult = await createCommission({
                influencerId: recruiterId,
                type: "activation_bonus",
                source: {
                  id: influencerId,
                  type: "user",
                  details: {
                    activatedInfluencerId: influencerId,
                    totalClientCalls: totalCalls,
                    providerType: afterData.providerType,
                  },
                },
                baseAmount: activationAmount,
              });

              if (activationResult.success) {
                await db.collection("influencers").doc(influencerId).update({
                  activationBonusPaid: true,
                });
                logger.info("[influencerOnCallCompleted] Activation bonus paid", {
                  recruiterId,
                  activatedId: influencerId,
                  amount: activationAmount,
                });
              }

              // N1 Recruit Bonus: if recruiter also has a recruiter (grand-parrain)
              if (recruiter.recruitedBy || recruiter.parrainId) {
                const grandParrainId = recruiter.recruitedBy || recruiter.parrainId;
                const gpDoc = await db.collection("influencers").doc(grandParrainId!).get();
                if (gpDoc.exists) {
                  const gp = gpDoc.data() as Influencer;
                  const n1RecruitAmount = gp.individualRates?.commissionN1RecruitBonusAmount
                    ?? gp.lockedRates?.commissionN1RecruitBonusAmount
                    ?? config.commissionN1RecruitBonusAmount ?? 100;

                  await createCommission({
                    influencerId: grandParrainId!,
                    type: "n1_recruit_bonus",
                    source: {
                      id: influencerId,
                      type: "user",
                      details: {
                        activatedInfluencerId: influencerId,
                        recruiterId,
                      },
                    },
                    baseAmount: n1RecruitAmount,
                  });
                  logger.info("[influencerOnCallCompleted] N1 recruit bonus paid", {
                    grandParrainId,
                    recruiterId,
                    activatedId: influencerId,
                  });
                }
              }
            }
          }
        }

        // --- N1 COMMISSION ---
        // If this influencer was recruited, pay N1 commission to recruiter
        if (freshInfluencer.recruitedBy) {
          const n1Id = freshInfluencer.recruitedBy;
          const n1Doc = await db.collection("influencers").doc(n1Id).get();
          if (n1Doc.exists) {
            const n1 = n1Doc.data() as Influencer;
            if (n1.status === "active") {
              const n1Amount = n1.individualRates?.commissionN1CallAmount
                ?? n1.lockedRates?.commissionN1CallAmount
                ?? config.commissionN1CallAmount ?? 100;

              await createCommission({
                influencerId: n1Id,
                type: "n1_call",
                source: {
                  id: sessionId,
                  type: "call_session",
                  details: {
                    originInfluencerId: influencerId,
                    clientId: afterData.clientId,
                    callDuration: afterData.duration,
                    providerType: afterData.providerType,
                  },
                },
                baseAmount: n1Amount,
              });
              logger.info("[influencerOnCallCompleted] N1 commission paid", {
                n1Id,
                originId: influencerId,
                amount: n1Amount,
              });
            }
          }
        }

        // --- N2 COMMISSION ---
        // If this influencer's recruiter also has a recruiter, pay N2
        if (freshInfluencer.parrainNiveau2Id || (freshInfluencer.recruitedBy && freshInfluencer.parrainId)) {
          const n2Id = freshInfluencer.parrainNiveau2Id;
          if (n2Id) {
            const n2Doc = await db.collection("influencers").doc(n2Id).get();
            if (n2Doc.exists) {
              const n2 = n2Doc.data() as Influencer;
              if (n2.status === "active") {
                const n2Amount = n2.individualRates?.commissionN2CallAmount
                  ?? n2.lockedRates?.commissionN2CallAmount
                  ?? config.commissionN2CallAmount ?? 50;

                await createCommission({
                  influencerId: n2Id,
                  type: "n2_call",
                  source: {
                    id: sessionId,
                    type: "call_session",
                    details: {
                      originInfluencerId: influencerId,
                      n1Id: freshInfluencer.recruitedBy || undefined,
                      clientId: afterData.clientId,
                      callDuration: afterData.duration,
                      providerType: afterData.providerType,
                    },
                  },
                  baseAmount: n2Amount,
                });
                logger.info("[influencerOnCallCompleted] N2 commission paid", {
                  n2Id,
                  n1Id: freshInfluencer.recruitedBy,
                  originId: influencerId,
                  amount: n2Amount,
                });
              }
            }
          }
        }

        // --- MILESTONE CHECK ---
        // Check recruitment milestones for the recruiter
        if (freshInfluencer.recruitedBy) {
          const { checkAndPayRecruitmentMilestones } = await import("../../lib/milestoneService");
          const recruiterDoc = await db.collection("influencers").doc(freshInfluencer.recruitedBy).get();
          if (recruiterDoc.exists) {
            const recruiter = recruiterDoc.data() as Influencer;
            // Count total recruits
            const recruitsSnap = await db.collection("influencers")
              .where("recruitedBy", "==", freshInfluencer.recruitedBy)
              .get();

            await checkAndPayRecruitmentMilestones({
              affiliateId: freshInfluencer.recruitedBy,
              role: "influencer",
              collection: "influencers",
              commissionCollection: "influencer_commissions",
              totalRecruits: recruitsSnap.size,
              tierBonusesPaid: recruiter.tierBonusesPaid || [],
              milestones: config.recruitmentMilestones || [],
              commissionType: "tier_bonus",
            });
          }
        }
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
