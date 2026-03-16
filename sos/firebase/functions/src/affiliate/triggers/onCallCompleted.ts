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

      // SECURITY: Block self-referral — user cannot earn commissions on themselves
      if (referredByUserId === clientId) {
        logger.warn("[affiliateOnCallCompleted] Self-referral blocked", {
          clientId,
          referredByUserId,
          sessionId,
        });
        return;
      }

      // P1-1 FIX: Skip if a role-specific handler already covers this referral.
      // When a user signs up via a chatter/influencer/blogger/groupAdmin link,
      // affiliateOnUserCreated writes BOTH referredByUserId AND the role-specific
      // field (e.g. referredByChatterId). Without this guard, the consolidated
      // trigger creates commissions in BOTH systems → double payout.
      // Role-specific handlers take priority; affiliate handler is the fallback
      // for "pure" affiliate referrals that have no role-specific counterpart.
      const hasRoleSpecificReferral =
        clientData.referredByChatterId ||
        clientData.chatterReferredBy ||
        clientData.referredByInfluencerId ||
        clientData.influencerReferredBy ||
        clientData.referredByBlogger ||
        clientData.bloggerReferredBy ||
        clientData.referredByGroupAdmin ||
        clientData.groupAdminReferredBy ||
        clientData.partnerReferredBy ||
        clientData.partnerReferredById;

      if (hasRoleSpecificReferral) {
        logger.info("[affiliateOnCallCompleted] Skipping — handled by role-specific handler", {
          sessionId,
          clientId,
          referredByChatterId: !!clientData.referredByChatterId,
          chatterReferredBy: !!clientData.chatterReferredBy,
          referredByInfluencerId: !!clientData.referredByInfluencerId,
          influencerReferredBy: !!clientData.influencerReferredBy,
          referredByBlogger: !!clientData.referredByBlogger,
          referredByGroupAdmin: !!clientData.referredByGroupAdmin,
          partnerReferredBy: !!clientData.partnerReferredBy,
          partnerReferredById: !!clientData.partnerReferredById,
        });
        return;
      }

      // 3. Calculate call duration
      const callDuration = after.duration || after.durationSeconds || 0;

      // 3b. Skip if call too short (anti-fraud, harmonized with other roles)
      if (!callDuration || callDuration < 60) {
        logger.info("[affiliateOnCallCompleted] Skipping - call too short", {
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

      // 6b. Deduplicate: check if a commission was already created for this exact session
      const existingSessionCommission = await db
        .collection("affiliate_commissions")
        .where("sourceId", "==", sessionId)
        .where("referrerId", "==", referredByUserId)
        .limit(1)
        .get();

      if (!existingSessionCommission.empty) {
        logger.info("[affiliateOnCallCompleted] Commission already exists for this session, skipping", {
          sessionId,
          existingCommissionId: existingSessionCommission.docs[0].id,
        });
        return;
      }

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

        // Create commission notification (i18n: 9 languages, English fallback)
        const notifRef = db.collection("affiliate_notifications").doc();
        const amountDollars = ((commissionResult.amount || 0) / 100).toFixed(2);
        await notifRef.set({
          id: notifRef.id,
          affiliateId: referredByUserId,
          type: "commission_earned",
          title: isFirstCall ? "Premier appel converti !" : "Commission appel reçue !",
          titleTranslations: isFirstCall
            ? {
                fr: "Premier appel converti !",
                en: "First call converted!",
                es: "¡Primera llamada convertida!",
                de: "Erster Anruf konvertiert!",
                pt: "Primeira chamada convertida!",
                ru: "Первый звонок конвертирован!",
                hi: "पहला कॉल कन्वर्ट हुआ!",
                zh: "首次通话已转化！",
                ar: "تم تحويل المكالمة الأولى!",
              }
            : {
                fr: "Commission appel reçue !",
                en: "Call commission received!",
                es: "¡Comisión de llamada recibida!",
                de: "Anruf-Provision erhalten!",
                pt: "Comissão de chamada recebida!",
                ru: "Комиссия за звонок получена!",
                hi: "कॉल कमीशन प्राप्त!",
                zh: "通话佣金已收到！",
                ar: "تم استلام عمولة المكالمة!",
              },
          message: `Vous avez gagné $${amountDollars} pour l'appel de ${clientData.email}.`,
          messageTranslations: {
            fr: `Vous avez gagné $${amountDollars} pour l'appel de ${clientData.email}.`,
            en: `You earned $${amountDollars} for the call from ${clientData.email}.`,
            es: `Has ganado $${amountDollars} por la llamada de ${clientData.email}.`,
            de: `Sie haben $${amountDollars} für den Anruf von ${clientData.email} verdient.`,
            pt: `Você ganhou $${amountDollars} pela chamada de ${clientData.email}.`,
            ru: `Вы заработали $${amountDollars} за звонок от ${clientData.email}.`,
            hi: `आपने ${clientData.email} की कॉल के लिए $${amountDollars} कमाए।`,
            zh: `您因 ${clientData.email} 的通话赚取了 $${amountDollars}。`,
            ar: `لقد ربحت $${amountDollars} مقابل مكالمة ${clientData.email}.`,
          },
          isRead: false,
          emailSent: false,
          data: {
            commissionId: commissionResult.commissionId,
            amount: commissionResult.amount,
          },
          createdAt: Timestamp.now(),
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

        // ============================================================
        // N1/N2 NETWORK COMMISSIONS + ACTIVATION BONUS
        // ============================================================

        // Increment totalClientCalls on referrer's user doc
        await db.collection("users").doc(referredByUserId).update({
          totalClientCalls: FieldValue.increment(1),
        });

        const freshUser = (await db.collection("users").doc(referredByUserId).get()).data();
        const totalCalls = freshUser?.totalClientCalls || 1;

        // --- ACTIVATION BONUS ---
        if (
          !freshUser?.isActivated &&
          totalCalls >= 2 &&
          freshUser?.recruitedBy
        ) {
          await db.collection("users").doc(referredByUserId).update({ isActivated: true });

          const recruiterId = freshUser.recruitedBy;
          const recruiterDoc = await db.collection("users").doc(recruiterId).get();
          if (recruiterDoc.exists) {
            const recruiter = recruiterDoc.data()!;
            const minDirect = recruiter.individualRates?.activationMinDirectCommissions
                ?? recruiter.lockedRates?.activationMinDirectCommissions
                ?? 10000; // $100 default

            if ((recruiter.totalEarned || 0) >= minDirect && !freshUser.activationBonusPaid) {
              const activationAmount = recruiter.individualRates?.commissionActivationBonusAmount
                ?? recruiter.lockedRates?.commissionActivationBonusAmount
                ?? 500; // $5

              // Create activation bonus commission (pending — goes through validation/release cycle)
              const actRef = db.collection("affiliate_commissions").doc();
              await actRef.set({
                id: actRef.id,
                referrerId: recruiterId,
                type: "activation_bonus",
                amount: activationAmount,
                status: "pending",
                source: {
                  type: "activation",
                  details: {
                    activatedUserId: referredByUserId,
                    totalClientCalls: totalCalls,
                  },
                },
                description: `Bonus activation: filleul activé`,
                createdAt: Timestamp.now(),
              });

              // Increment pending balance (will be validated/released by scheduled function)
              await db.collection("users").doc(recruiterId).update({
                pendingBalance: FieldValue.increment(activationAmount),
                totalCommissions: FieldValue.increment(1),
              });

              await db.collection("users").doc(referredByUserId).update({ activationBonusPaid: true });

              logger.info("[affiliateOnCallCompleted] Activation bonus paid", {
                recruiterId,
                activatedId: referredByUserId,
                amount: activationAmount,
              });

              // N1 Recruit Bonus to grand-parrain
              if (recruiter.recruitedBy) {
                const gpDoc = await db.collection("users").doc(recruiter.recruitedBy).get();
                if (gpDoc.exists) {
                  const gp = gpDoc.data()!;
                  const n1RecruitAmt = gp.individualRates?.commissionN1RecruitBonusAmount
                    ?? gp.lockedRates?.commissionN1RecruitBonusAmount
                    ?? 100;

                  const n1rRef = db.collection("affiliate_commissions").doc();
                  await n1rRef.set({
                    id: n1rRef.id,
                    referrerId: recruiter.recruitedBy,
                    type: "n1_recruit_bonus",
                    amount: n1RecruitAmt,
                    status: "pending",
                    source: { type: "recruitment", details: { activatedUserId: referredByUserId, recruiterId } },
                    description: `Bonus N1 recrutement`,
                    createdAt: Timestamp.now(),
                  });

                  await db.collection("users").doc(recruiter.recruitedBy).update({
                    pendingBalance: FieldValue.increment(n1RecruitAmt),
                    totalCommissions: FieldValue.increment(1),
                  });
                }
              }
            }
          }
        }

        // --- N1 COMMISSION ---
        if (freshUser?.recruitedBy) {
          const n1Doc = await db.collection("users").doc(freshUser.recruitedBy).get();
          if (n1Doc.exists) {
            const n1 = n1Doc.data()!;
            const n1Amt = n1.individualRates?.commissionN1CallAmount
              ?? n1.lockedRates?.commissionN1CallAmount
              ?? 100;

            const n1Ref = db.collection("affiliate_commissions").doc();
            await n1Ref.set({
              id: n1Ref.id,
              referrerId: freshUser.recruitedBy,
              type: "n1_call",
              amount: n1Amt,
              status: "pending",
              source: {
                type: "n1_call",
                details: { originUserId: referredByUserId, clientId: after?.clientId, providerType: after?.providerType },
              },
              description: `Commission N1: appel client référé`,
              createdAt: Timestamp.now(),
            });

            await db.collection("users").doc(freshUser.recruitedBy).update({
              pendingBalance: FieldValue.increment(n1Amt),
              totalCommissions: FieldValue.increment(1),
            });
          }
        }

        // --- N2 COMMISSION ---
        if (freshUser?.parrainNiveau2Id) {
          const n2Doc = await db.collection("users").doc(freshUser.parrainNiveau2Id).get();
          if (n2Doc.exists) {
            const n2 = n2Doc.data()!;
            const n2Amt = n2.individualRates?.commissionN2CallAmount
              ?? n2.lockedRates?.commissionN2CallAmount
              ?? 50;

            const n2Ref = db.collection("affiliate_commissions").doc();
            await n2Ref.set({
              id: n2Ref.id,
              referrerId: freshUser.parrainNiveau2Id,
              type: "n2_call",
              amount: n2Amt,
              status: "pending",
              source: {
                type: "n2_call",
                details: { originUserId: referredByUserId, n1Id: freshUser.recruitedBy, providerType: after?.providerType },
              },
              description: `Commission N2: appel client référé`,
              createdAt: Timestamp.now(),
            });

            await db.collection("users").doc(freshUser.parrainNiveau2Id).update({
              pendingBalance: FieldValue.increment(n2Amt),
              totalCommissions: FieldValue.increment(1),
            });
          }
        }

        // --- MILESTONE CHECK ---
        if (freshUser?.recruitedBy) {
          const { checkAndPayRecruitmentMilestones } = await import("../../lib/milestoneService");
          const milestoneRecruiterDoc = await db.collection("users").doc(freshUser.recruitedBy).get();
          if (milestoneRecruiterDoc.exists) {
            const milestoneRecruiter = milestoneRecruiterDoc.data()!;
            const recruitsSnap = await db.collection("users")
              .where("recruitedBy", "==", freshUser.recruitedBy)
              .get();

            await checkAndPayRecruitmentMilestones({
              affiliateId: freshUser.recruitedBy,
              role: "affiliate",
              collection: "users",
              commissionCollection: "affiliate_commissions",
              totalRecruits: recruitsSnap.size,
              tierBonusesPaid: milestoneRecruiter.tierBonusesPaid || [],
              milestones: [
                { recruits: 5, bonus: 1500 },
                { recruits: 10, bonus: 3500 },
                { recruits: 20, bonus: 7500 },
                { recruits: 50, bonus: 25000 },
                { recruits: 100, bonus: 60000 },
                { recruits: 500, bonus: 400000 },
              ],
              commissionType: "tier_bonus",
            });
          }
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
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  handleCallCompleted
);
