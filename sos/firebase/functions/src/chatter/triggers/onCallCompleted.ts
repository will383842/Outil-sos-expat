/**
 * Trigger: onCallCompleted
 *
 * NEW SIMPLIFIED COMMISSION SYSTEM (2026)
 *
 * Fires when a call session is marked as completed and paid.
 *
 * Commission Structure:
 * 1. CLIENT CALL: $10 - when a client calls via chatter's link
 * 2. N1 CALL: $1 - when your direct referral (N1) makes a call
 * 3. N2 CALL: $0.50 - when your N1's referral (N2) makes a call
 * 4. ACTIVATION BONUS: $5 - ONLY after referral's 2nd client call (anti-fraud)
 * 5. N1 RECRUIT BONUS: $1 - when your N1 recruits someone who activates
 *
 * Removed (OLD SYSTEM):
 * - NO commission at signup (was $2)
 * - NO commission at quiz (was $3)
 * - NO commission at 1st call only
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { ChatterNotification, Chatter } from "../types";
import { createCommission, checkAndPayTelegramBonus, checkAndPayRecruitmentCommission } from "../services";
import {
  getChatterConfigCached,
  getClientCallCommission,
  getN1CallCommission,
  getN2CallCommission,
  getActivationBonusAmount,
  getN1RecruitBonusAmount,
  getActivationCallsRequired,
  getFlashBonusMultiplier,
  getProviderCallCommission,
  getProviderRecruitmentDurationMonths,
  getCaptainCallCommission,
} from "../utils/chatterConfigService";
import { updateChatterChallengeScore } from "../scheduled/weeklyChallenges";

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
  providerId: string;
  providerType: "lawyer" | "expat";
  duration?: number;
  connectionFee?: number;
  totalAmount?: number;
  isPaid?: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

interface UserDocument {
  email: string;
  firstName?: string;
  lastName?: string;
  referredByChatter?: string; // Chatter code that referred this user
  referredByChatterId?: string;
  providerRecruitedByChatter?: string; // For providers: chatter code that recruited them
  providerRecruitedByChatterId?: string;
  providerFirstCallReceived?: boolean; // Track if provider received first call
}

/**
 * Extracted handler for use by consolidated trigger.
 * Contains the full chatter onCallCompleted logic.
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

  // Only trigger when call is marked as completed and paid
  const wasNotCompleted =
    beforeData.status !== "completed" || !beforeData.isPaid;
  const isNowCompleted =
    afterData.status === "completed" && afterData.isPaid;

  if (!wasNotCompleted || !isNowCompleted) {
    return;
  }

  const sessionId = event.params.sessionId;
  const session = afterData;

    // Minimum call duration check (anti-fraud: prevent 1-second call commissions)
    if (!session.duration || session.duration < MIN_CALL_DURATION_SECONDS) {
      logger.warn("[chatterOnCallCompleted] Call too short for commission", {
        sessionId,
        duration: session.duration,
        minimum: MIN_CALL_DURATION_SECONDS,
      });
      return;
    }

    logger.info("[chatterOnCallCompleted] Processing completed call", {
      sessionId,
      clientId: session.clientId,
      providerId: session.providerId,
      duration: session.duration,
    });

    const db = getFirestore();
    const config = await getChatterConfigCached();
    const flashMultiplier = getFlashBonusMultiplier(config);

    try {
      // ========================================================================
      // PART A: PROVIDER RECRUITMENT COMMISSION ($5)
      // Process this FIRST and independently of client referral
      // When a recruited provider receives ANY call, their recruiter earns $5
      // ========================================================================

      await processProviderRecruitmentCommission(db, session, config, sessionId, flashMultiplier);

      // ========================================================================
      // PART B: CLIENT REFERRAL COMMISSIONS ($10, $1, $0.50, etc.)
      // Only if the CLIENT was referred by a chatter
      // ========================================================================

      // Check if client was referred by a chatter
      const clientDoc = await db.collection("users").doc(session.clientId).get();

      if (!clientDoc.exists) {
        logger.info("[chatterOnCallCompleted] Client not found, skipping client referral", { sessionId });
        return;
      }

      const clientData = clientDoc.data() as UserDocument;

      // If client was NOT referred by a chatter, skip client referral processing
      // (provider recruitment was already processed above)
      if (!clientData.referredByChatterId) {
        logger.info("[chatterOnCallCompleted] Client not referred by chatter, skipping client referral", {
          sessionId,
          clientId: session.clientId,
        });
        return;
      }

      const chatterId = clientData.referredByChatterId;

      // Get chatter document
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();
      if (!chatterDoc.exists) {
        logger.warn("[chatterOnCallCompleted] Chatter not found", { chatterId });
        return;
      }

      const chatter = chatterDoc.data() as Chatter;

      // ========================================================================
      // 1. DIRECT CLIENT CALL COMMISSION ($10)
      // ========================================================================

      const clientCallAmount = getClientCallCommission(config, session.providerType);

      const clientCallResult = await createCommission({
        chatterId,
        type: "client_call",
        source: {
          id: sessionId,
          type: "call_session",
          details: {
            clientId: session.clientId,
            clientEmail: clientData.email,
            callSessionId: sessionId,
            callDuration: session.duration,
            connectionFee: session.connectionFee,
          },
        },
        baseAmount: clientCallAmount,
        description: `Commission appel client${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
      });

      if (clientCallResult.success) {
        logger.info("[chatterOnCallCompleted] Client call commission created", {
          sessionId,
          chatterId,
          commissionId: clientCallResult.commissionId,
          amount: clientCallResult.amount,
        });

        // Create notification
        await createCommissionNotification(
          db,
          chatterId,
          "commission_earned",
          "client_call",
          "Commission appel client !",
          `Vous avez gagn\u00e9 $${(clientCallAmount / 100).toFixed(2)} pour l'appel de ${maskEmail(clientData.email)}.`,
          clientCallResult.commissionId!,
          clientCallResult.amount!
        );

        // Check and award first client badge
        await checkFirstClientBadge(db, chatterId);

        // Update weekly challenge score for client call
        await updateChatterChallengeScore(chatterId, "client_call");

        // Update daily missions progress
        await updateDailyMissionCall(db, chatterId);

        // Check and pay telegram bonus if eligible (requires $150 direct earnings)
        const telegramBonusResult = await checkAndPayTelegramBonus(chatterId);
        if (telegramBonusResult.paid) {
          logger.info("[chatterOnCallCompleted] Telegram bonus paid", {
            chatterId,
            amount: telegramBonusResult.amount,
          });
        }

        // Check and pay recruitment commission (recruiter gets $5 when this chatter reaches $50)
        await checkAndPayRecruitmentCommission(chatterId);
      }

      // ========================================================================
      // 2. INCREMENT CALL COUNT & CHECK ACTIVATION (with transaction to prevent race conditions)
      // ========================================================================

      const activationRequired = getActivationCallsRequired(config);

      // Use transaction to atomically update call count and check activation
      const activationResult = await db.runTransaction(async (transaction) => {
        const chatterRef = db.collection("chatters").doc(chatterId);
        const chatterSnap = await transaction.get(chatterRef);

        if (!chatterSnap.exists) {
          return { activated: false, newCallCount: 0, shouldPayActivationBonus: false };
        }

        const currentChatter = chatterSnap.data() as Chatter;
        const currentCallCount = currentChatter.totalClientCalls || 0;
        const newCallCount = currentCallCount + 1;

        // Check if this triggers activation (after 2nd call by default)
        const wasNotActivated = !currentChatter.isActivated;
        const shouldActivate = wasNotActivated && newCallCount >= activationRequired;

        // Check if we should pay activation bonus (only once)
        const shouldPayActivationBonus = shouldActivate &&
          currentChatter.recruitedBy &&
          !currentChatter.activationBonusPaid;

        // Update chatter atomically
        const updateData: Record<string, unknown> = {
          totalClientCalls: newCallCount,
          updatedAt: Timestamp.now(),
        };

        if (shouldActivate) {
          updateData.isActivated = true;
          updateData.activatedAt = Timestamp.now();
        }

        if (shouldPayActivationBonus) {
          // Mark as paid BEFORE creating commission to prevent double payment
          updateData.activationBonusPaid = true;
        }

        transaction.update(chatterRef, updateData);

        return {
          activated: shouldActivate,
          newCallCount,
          shouldPayActivationBonus,
          recruitedBy: currentChatter.recruitedBy,
          chatterData: currentChatter,
        };
      });

      const newCallCount = activationResult.newCallCount;

      if (activationResult.activated) {
        logger.info("[chatterOnCallCompleted] Chatter activation triggered", {
          chatterId,
          callCount: newCallCount,
          activationRequired,
        });
      }

      // ========================================================================
      // 3. ACTIVATION BONUS TO RECRUITER ($5) - Outside transaction but protected by flag
      // ========================================================================

      if (activationResult.shouldPayActivationBonus && activationResult.recruitedBy) {
        const activationBonusAmount = getActivationBonusAmount(config);
        const chatterData = activationResult.chatterData!;

        const bonusResult = await createCommission({
          chatterId: activationResult.recruitedBy,
          type: "activation_bonus",
          source: {
            id: chatterId,
            type: "user",
            details: {
              providerId: chatterId,
              providerEmail: chatterData.email,
              bonusType: "activation",
              bonusReason: `Activation de ${chatterData.firstName} ${chatterData.lastName.charAt(0)}. apr\u00e8s ${newCallCount} appels`,
            },
          },
          baseAmount: activationBonusAmount,
          description: `Bonus activation filleul ${chatterData.firstName} ${chatterData.lastName.charAt(0)}.${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
          skipFraudCheck: true,
        });

        if (bonusResult.success) {
          logger.info("[chatterOnCallCompleted] Activation bonus paid", {
            recruiterId: activationResult.recruitedBy,
            recruitedChatterId: chatterId,
            commissionId: bonusResult.commissionId,
            amount: bonusResult.amount,
          });

          // Notify the recruiter
          await createCommissionNotification(
            db,
            activationResult.recruitedBy,
            "commission_earned",
            "activation_bonus",
            "Bonus d'activation !",
            `Votre filleul ${chatterData.firstName} ${chatterData.lastName.charAt(0)}. est maintenant activ\u00e9 ! +$${(activationBonusAmount / 100).toFixed(2)}`,
            bonusResult.commissionId!,
            bonusResult.amount!
          );

          // ========================================================================
          // 4. N1 RECRUIT BONUS ($1) - When N1 recruits someone who activates
          // ========================================================================

          // Check if the recruiter (N1) was also recruited by someone (N2 parrain)
          const recruiterDoc = await db.collection("chatters").doc(activationResult.recruitedBy).get();
          if (recruiterDoc.exists) {
            const recruiter = recruiterDoc.data() as Chatter;

            if (recruiter.recruitedBy) {
              const n1RecruitBonusAmount = getN1RecruitBonusAmount(config);

              const n1RecruitResult = await createCommission({
                chatterId: recruiter.recruitedBy,
                type: "n1_recruit_bonus",
                source: {
                  id: chatterId,
                  type: "user",
                  details: {
                    providerId: chatterId,
                    providerEmail: chatterData.email,
                    bonusType: "n1_recruit",
                    bonusReason: `N1 ${recruiter.firstName} ${recruiter.lastName.charAt(0)}. a recrut\u00e9 ${chatterData.firstName} qui s'est activ\u00e9`,
                  },
                },
                baseAmount: n1RecruitBonusAmount,
                description: `Bonus recrutement N1${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
                skipFraudCheck: true,
              });

              if (n1RecruitResult.success) {
                logger.info("[chatterOnCallCompleted] N1 recruit bonus paid", {
                  n2ParrainId: recruiter.recruitedBy,
                  n1RecruiterId: activationResult.recruitedBy,
                  activatedChatterId: chatterId,
                  commissionId: n1RecruitResult.commissionId,
                  amount: n1RecruitResult.amount,
                });

                await createCommissionNotification(
                  db,
                  recruiter.recruitedBy,
                  "commission_earned",
                  "n1_recruit_bonus",
                  "Bonus recrutement N1 !",
                  `Votre filleul ${recruiter.firstName} ${recruiter.lastName.charAt(0)}. a recrut\u00e9 un nouveau chatter activ\u00e9 ! +$${(n1RecruitBonusAmount / 100).toFixed(2)}`,
                  n1RecruitResult.commissionId!,
                  n1RecruitResult.amount!
                );
              }
            }
          }
        }
      }

      // ========================================================================
      // 5. N1 CALL COMMISSION ($1) - If chatter has a recruiter
      //    Captain check: if N1 is captain, gets captain_call instead
      // ========================================================================

      if (chatter.recruitedBy) {
        // Check if N1 recruiter is a captain
        const n1Doc = await db.collection("chatters").doc(chatter.recruitedBy).get();
        const n1Data = n1Doc.exists ? n1Doc.data() as Chatter : null;
        const n1IsCaptain = n1Data?.role === 'captainChatter';

        if (n1IsCaptain) {
          // Captain gets captain_call INSTEAD of n1_call
          const captainN1Amount = getCaptainCallCommission(config, session.providerType);

          const captainN1Result = await createCommission({
            chatterId: chatter.recruitedBy,
            type: "captain_call",
            source: {
              id: sessionId,
              type: "call_session",
              details: {
                clientId: session.clientId,
                clientEmail: clientData.email,
                callSessionId: sessionId,
                callDuration: session.duration,
                providerId: chatterId,
                providerEmail: chatter.email,
                level: "n1",
                providerType: session.providerType,
              },
            },
            baseAmount: captainN1Amount,
            description: `Commission capitaine \u2014 appel N1 ${session.providerType === 'lawyer' ? 'avocat' : 'expatri\u00e9'}`,
          });

          if (captainN1Result.success) {
            logger.info("[chatterOnCallCompleted] Captain N1 call commission created", {
              sessionId,
              captainId: chatter.recruitedBy,
              chatterWhoCalled: chatterId,
              commissionId: captainN1Result.commissionId,
              amount: captainN1Result.amount,
            });

            // Increment captain monthly counter
            await db.collection("chatters").doc(chatter.recruitedBy).update({
              captainMonthlyTeamCalls: FieldValue.increment(1),
              updatedAt: Timestamp.now(),
            });

            await createCommissionNotification(
              db,
              chatter.recruitedBy,
              "commission_earned",
              "captain_commission",
              "Commission Capitaine !",
              `Votre filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a g\u00e9n\u00e9r\u00e9 un appel ! +$${(captainN1Amount / 100).toFixed(2)}`,
              captainN1Result.commissionId!,
              captainN1Result.amount!
            );

            await updateChatterChallengeScore(chatter.recruitedBy, "captain_call");
          }
        } else {
          // Standard n1_call commission
          const n1CallAmount = getN1CallCommission(config);

          const n1Result = await createCommission({
            chatterId: chatter.recruitedBy,
            type: "n1_call",
            source: {
              id: sessionId,
              type: "call_session",
              details: {
                clientId: session.clientId,
                clientEmail: clientData.email,
                callSessionId: sessionId,
                callDuration: session.duration,
                providerId: chatterId,
                providerEmail: chatter.email,
              },
            },
            baseAmount: n1CallAmount,
            description: `Commission N1 (appel de ${chatter.firstName} ${chatter.lastName.charAt(0)}.)${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
          });

          if (n1Result.success) {
            logger.info("[chatterOnCallCompleted] N1 call commission created", {
              sessionId,
              n1ParrainId: chatter.recruitedBy,
              chatterWhoCalled: chatterId,
              commissionId: n1Result.commissionId,
              amount: n1Result.amount,
            });

            await createCommissionNotification(
              db,
              chatter.recruitedBy,
              "commission_earned",
              "n1_commission",
              "Commission N1 !",
              `Votre filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a g\u00e9n\u00e9r\u00e9 un appel ! +$${(n1CallAmount / 100).toFixed(2)}`,
              n1Result.commissionId!,
              n1Result.amount!
            );

            await updateChatterChallengeScore(chatter.recruitedBy, "n1_call");
          }
        }

        // ========================================================================
        // 6. N2 CALL COMMISSION ($0.50) - If chatter's recruiter also has a recruiter
        //    Captain check: if N2 is captain, gets captain_call instead
        // ========================================================================

        if (chatter.parrainNiveau2Id) {
          const n2Doc = await db.collection("chatters").doc(chatter.parrainNiveau2Id).get();
          const n2Data = n2Doc.exists ? n2Doc.data() as Chatter : null;
          const n2IsCaptain = n2Data?.role === 'captainChatter';

          if (n2IsCaptain) {
            // Captain gets captain_call INSTEAD of n2_call
            const captainN2Amount = getCaptainCallCommission(config, session.providerType);

            const captainN2Result = await createCommission({
              chatterId: chatter.parrainNiveau2Id,
              type: "captain_call",
              source: {
                id: sessionId,
                type: "call_session",
                details: {
                  clientId: session.clientId,
                  clientEmail: clientData.email,
                  callSessionId: sessionId,
                  callDuration: session.duration,
                  providerId: chatterId,
                  providerEmail: chatter.email,
                  level: "n2",
                  providerType: session.providerType,
                },
              },
              baseAmount: captainN2Amount,
              description: `Commission capitaine \u2014 appel N2 ${session.providerType === 'lawyer' ? 'avocat' : 'expatri\u00e9'}`,
            });

            if (captainN2Result.success) {
              logger.info("[chatterOnCallCompleted] Captain N2 call commission created", {
                sessionId,
                captainId: chatter.parrainNiveau2Id,
                chatterWhoCalled: chatterId,
                commissionId: captainN2Result.commissionId,
                amount: captainN2Result.amount,
              });

              await db.collection("chatters").doc(chatter.parrainNiveau2Id).update({
                captainMonthlyTeamCalls: FieldValue.increment(1),
                updatedAt: Timestamp.now(),
              });

              await createCommissionNotification(
                db,
                chatter.parrainNiveau2Id,
                "commission_earned",
                "captain_commission",
                "Commission Capitaine !",
                `Un filleul N2 a g\u00e9n\u00e9r\u00e9 un appel ! +$${(captainN2Amount / 100).toFixed(2)}`,
                captainN2Result.commissionId!,
                captainN2Result.amount!
              );

              await updateChatterChallengeScore(chatter.parrainNiveau2Id, "captain_call");
            }
          } else {
            // Standard n2_call commission
            const n2CallAmount = getN2CallCommission(config);

            const n2Result = await createCommission({
              chatterId: chatter.parrainNiveau2Id,
              type: "n2_call",
              source: {
                id: sessionId,
                type: "call_session",
                details: {
                  clientId: session.clientId,
                  clientEmail: clientData.email,
                  callSessionId: sessionId,
                  callDuration: session.duration,
                  providerId: chatterId,
                  providerEmail: chatter.email,
                },
              },
              baseAmount: n2CallAmount,
              description: `Commission N2 (appel de ${chatter.firstName} ${chatter.lastName.charAt(0)}.)${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
            });

            if (n2Result.success) {
              logger.info("[chatterOnCallCompleted] N2 call commission created", {
                sessionId,
                n2ParrainId: chatter.parrainNiveau2Id,
                n1ParrainId: chatter.recruitedBy,
                chatterWhoCalled: chatterId,
                commissionId: n2Result.commissionId,
                amount: n2Result.amount,
              });

              const n1Name = n1Data
                ? `${n1Data.firstName} ${n1Data.lastName.charAt(0)}.`
                : "votre filleul N1";

              await createCommissionNotification(
                db,
                chatter.parrainNiveau2Id,
                "commission_earned",
                "n2_commission",
                "Commission N2 !",
                `Le filleul de ${n1Name} a g\u00e9n\u00e9r\u00e9 un appel ! +$${(n2CallAmount / 100).toFixed(2)}`,
                n2Result.commissionId!,
                n2Result.amount!
              );

              await updateChatterChallengeScore(chatter.parrainNiveau2Id, "n2_call");
            }
          }
        }
      }

      logger.info("[chatterOnCallCompleted] Call processing complete", {
        sessionId,
        chatterId,
        callCount: newCallCount,
        wasActivated: activationResult.activated,
      });

    } catch (error) {
      logger.error("[chatterOnCallCompleted] Error", { sessionId, error });
    }
}

export const chatterOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  handleCallCompleted
);

/**
 * Process provider recruitment commission (HARMONIZED with Blogger/Influencer/GroupAdmin)
 *
 * When a chatter recruits a provider (lawyer/expat), they earn $5 on EVERY call
 * the provider receives for 6 months from recruitment date.
 *
 * Uses `chatter_recruited_providers` collection with atomic increments of
 * callsWithCommission and totalCommissions (same pattern as other 3 roles).
 */
async function processProviderRecruitmentCommission(
  db: FirebaseFirestore.Firestore,
  session: CallSession,
  config: Awaited<ReturnType<typeof getChatterConfigCached>>,
  sessionId: string,
  flashMultiplier: number
): Promise<void> {
  try {
    // 1. Find active recruitment records for this provider
    const now = Timestamp.now();
    const recruitmentQuery = await db
      .collection("chatter_recruited_providers")
      .where("providerId", "==", session.providerId)
      .where("isActive", "==", true)
      .where("commissionWindowEndsAt", ">", now)
      .get();

    if (recruitmentQuery.empty) {
      // Fallback: check legacy chatter_recruitment_links for pre-migration data
      await processProviderRecruitmentCommissionLegacy(db, session, config, sessionId, flashMultiplier);
      return;
    }

    // Anti-double payment: identify client's chatter referrer (if any)
    let clientChatterReferrerId: string | null = null;
    const clientDocForCheck = await db.collection("users").doc(session.clientId).get();
    if (clientDocForCheck.exists) {
      const clientCheckData = clientDocForCheck.data();
      clientChatterReferrerId = clientCheckData?.referredByChatterId || null;
    }

    // 2. Award commission to each chatter who recruited this provider
    for (const recruitmentDoc of recruitmentQuery.docs) {
      const recruitment = recruitmentDoc.data();
      const recruiterChatterId = recruitment.chatterId;

      // Anti-double payment: skip if same chatter referred the client AND recruited the provider
      if (clientChatterReferrerId && clientChatterReferrerId === recruiterChatterId) {
        logger.info("[processProviderRecruitmentCommission] Skipping — same chatter referred client and recruited provider (anti-double)", {
          recruiterChatterId,
          clientId: session.clientId,
          sessionId,
        });
        continue;
      }

      // Check if commission already exists for this call (idempotency)
      const existingCommission = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", recruiterChatterId)
        .where("sourceId", "==", sessionId)
        .where("type", "==", "provider_call")
        .limit(1)
        .get();

      if (!existingCommission.empty) {
        continue; // Already awarded
      }

      // Check recruiter is active
      const recruiterDoc = await db.collection("chatters").doc(recruiterChatterId).get();
      if (!recruiterDoc.exists) continue;

      const recruiter = recruiterDoc.data() as Chatter;
      if (recruiter.status !== "active") continue;

      // Calculate months remaining
      const monthsRemaining = Math.ceil(
        (recruitment.commissionWindowEndsAt.toMillis() - now.toMillis()) /
        (30 * 24 * 60 * 60 * 1000)
      );

      // Create commission
      const providerCallAmount = getProviderCallCommission(config, session.providerType);

      const providerCallResult = await createCommission({
        chatterId: recruiterChatterId,
        type: "provider_call",
        source: {
          id: sessionId,
          type: "call_session",
          details: {
            providerId: session.providerId,
            providerEmail: recruitment.providerEmail,
            providerType: session.providerType,
            callSessionId: sessionId,
            callDuration: session.duration,
            recruitmentDate: recruitment.recruitedAt.toDate().toISOString(),
            monthsRemaining,
          },
        },
        baseAmount: providerCallAmount,
        description: `Commission prestataire recruté - ${recruitment.providerName} - Appel #${sessionId.slice(-6)}`,
        skipFraudCheck: true,
      });

      if (providerCallResult.success) {
        // Atomic increment of callsWithCommission and totalCommissions
        await recruitmentDoc.ref.update({
          callsWithCommission: FieldValue.increment(1),
          totalCommissions: FieldValue.increment(providerCallResult.amount!),
          lastCommissionAt: now,
          updatedAt: now,
        });

        logger.info("[processProviderRecruitmentCommission] Provider call commission created (harmonized)", {
          sessionId,
          recruiterId: recruiterChatterId,
          providerId: session.providerId,
          commissionId: providerCallResult.commissionId,
          amount: providerCallResult.amount,
          monthsRemaining,
          callsWithCommission: (recruitment.callsWithCommission || 0) + 1,
        });

        // Create notification
        await createCommissionNotification(
          db,
          recruiterChatterId,
          "commission_earned",
          "provider_recruited",
          "Commission prestataire recruté !",
          `Votre ${session.providerType === "lawyer" ? "avocat" : "aidant"} ${recruitment.providerName} a reçu un appel ! +$${(providerCallAmount / 100).toFixed(2)}`,
          providerCallResult.commissionId!,
          providerCallResult.amount!
        );

        // Update weekly challenge score
        await updateChatterChallengeScore(recruiterChatterId, "provider_call");
      }
    }
  } catch (error) {
    logger.error("[processProviderRecruitmentCommission] Error", {
      sessionId,
      providerId: session.providerId,
      error,
    });
  }
}

/**
 * Legacy fallback for pre-migration data in chatter_recruitment_links.
 * Used when no record exists in chatter_recruited_providers.
 */
async function processProviderRecruitmentCommissionLegacy(
  db: FirebaseFirestore.Firestore,
  session: CallSession,
  config: Awaited<ReturnType<typeof getChatterConfigCached>>,
  sessionId: string,
  flashMultiplier: number
): Promise<void> {
  // Get provider data
  const providerDoc = await db.collection("users").doc(session.providerId).get();
  if (!providerDoc.exists) return;

  const providerData = providerDoc.data() as UserDocument;
  if (!providerData.providerRecruitedByChatterId) return;

  const recruiterChatterId = providerData.providerRecruitedByChatterId;

  // Get the legacy recruitment link to check the date
  const linkQuery = await db
    .collection("chatter_recruitment_links")
    .where("chatterId", "==", recruiterChatterId)
    .where("usedByProviderId", "==", session.providerId)
    .limit(1)
    .get();

  // Determine recruitment date
  let recruitmentDate: Date | null = null;
  if (!linkQuery.empty) {
    const linkData = linkQuery.docs[0].data();
    recruitmentDate = linkData.usedAt?.toDate() || linkData.createdAt?.toDate();
  }
  if (!recruitmentDate && providerDoc.createTime) {
    recruitmentDate = providerDoc.createTime.toDate();
  }
  if (!recruitmentDate) return;

  // Check if within the commission window
  const durationMonths = getProviderRecruitmentDurationMonths(config);
  const expirationDate = new Date(recruitmentDate);
  expirationDate.setMonth(expirationDate.getMonth() + durationMonths);

  const now = new Date();
  if (now > expirationDate) return;

  // Anti-double payment
  const clientDocForCheck = await db.collection("users").doc(session.clientId).get();
  if (clientDocForCheck.exists) {
    const clientCheckData = clientDocForCheck.data();
    if (clientCheckData?.referredByChatterId === recruiterChatterId) return;
  }

  const recruiterDoc = await db.collection("chatters").doc(recruiterChatterId).get();
  if (!recruiterDoc.exists) return;

  const recruiter = recruiterDoc.data() as Chatter;
  if (recruiter.status !== "active") return;

  // Create commission
  const providerCallAmount = getProviderCallCommission(config, session.providerType);

  const providerCallResult = await createCommission({
    chatterId: recruiterChatterId,
    type: "provider_call",
    source: {
      id: sessionId,
      type: "call_session",
      details: {
        providerId: session.providerId,
        providerEmail: providerData.email,
        providerType: session.providerType,
        callSessionId: sessionId,
        callDuration: session.duration,
        legacy: true,
      },
    },
    baseAmount: providerCallAmount,
    description: `Commission prestataire recruté (${session.providerType === "lawyer" ? "avocat" : "aidant"})${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
    skipFraudCheck: true,
  });

  if (providerCallResult.success) {
    // Auto-migrate: create the new chatter_recruited_providers record
    const providerName =
      [providerData.firstName, providerData.lastName].filter(Boolean).join(" ") || providerData.email || session.providerId;

    const migrationRef = db.collection("chatter_recruited_providers").doc();
    await migrationRef.set({
      id: migrationRef.id,
      chatterId: recruiterChatterId,
      chatterCode: recruiter.affiliateCodeRecruitment || recruiter.affiliateCodeClient || "",
      chatterEmail: recruiter.email,
      providerId: session.providerId,
      providerEmail: providerData.email || "",
      providerType: session.providerType,
      providerName,
      recruitedAt: Timestamp.fromDate(recruitmentDate!),
      commissionWindowEndsAt: Timestamp.fromDate(expirationDate),
      isActive: now < expirationDate,
      callsWithCommission: 1,
      totalCommissions: providerCallResult.amount!,
      lastCommissionAt: Timestamp.now(),
      createdAt: Timestamp.fromDate(recruitmentDate!),
      updatedAt: Timestamp.now(),
    });

    logger.info("[processProviderRecruitmentCommissionLegacy] Legacy commission + auto-migration", {
      sessionId,
      recruiterId: recruiterChatterId,
      providerId: session.providerId,
      commissionId: providerCallResult.commissionId,
      amount: providerCallResult.amount,
      migratedDocId: migrationRef.id,
    });

    await createCommissionNotification(
      db,
      recruiterChatterId,
      "commission_earned",
      "provider_recruited",
      "Commission prestataire recruté !",
      `Votre ${session.providerType === "lawyer" ? "avocat" : "aidant"} recruté a reçu un appel ! +$${(providerCallAmount / 100).toFixed(2)}`,
      providerCallResult.commissionId!,
      providerCallResult.amount!
    );

    await updateChatterChallengeScore(recruiterChatterId, "provider_call");
  }
}

/**
 * Commission notification i18n title maps (9 languages, English fallback)
 */
const COMM_TITLES: Record<string, Record<string, string>> = {
  client_call: {
    fr: "Commission appel client !", en: "Client call commission!",
    es: "¡Comisión de llamada!", de: "Kundenanruf-Provision!",
    pt: "Comissão de chamada!", ru: "Комиссия за звонок!",
    hi: "कॉल कमीशन!", zh: "客户通话佣金！", ar: "عمولة مكالمة العميل!",
  },
  activation_bonus: {
    fr: "Bonus d'activation !", en: "Activation bonus!",
    es: "¡Bono de activación!", de: "Aktivierungsbonus!",
    pt: "Bônus de ativação!", ru: "Бонус активации!",
    hi: "एक्टिवेशन बोनस!", zh: "激活奖金！", ar: "مكافأة التفعيل!",
  },
  n1_recruit_bonus: {
    fr: "Bonus recrutement N1 !", en: "N1 Recruitment bonus!",
    es: "¡Bono reclutamiento N1!", de: "N1-Rekrutierungsbonus!",
    pt: "Bônus recrutamento N1!", ru: "Бонус за рекрутинг N1!",
    hi: "N1 भर्ती बोनस!", zh: "N1招募奖金！", ar: "مكافأة توظيف N1!",
  },
  captain_commission: {
    fr: "Commission Capitaine !", en: "Captain commission!",
    es: "¡Comisión de Capitán!", de: "Kapitän-Provision!",
    pt: "Comissão de Capitão!", ru: "Комиссия Капитана!",
    hi: "कैप्टन कमीशन!", zh: "队长佣金！", ar: "عمولة القبطان!",
  },
  n1_commission: {
    fr: "Commission N1 !", en: "N1 Commission!",
    es: "¡Comisión N1!", de: "N1-Provision!",
    pt: "Comissão N1!", ru: "Комиссия N1!",
    hi: "N1 कमीशन!", zh: "N1佣金！", ar: "عمولة N1!",
  },
  n2_commission: {
    fr: "Commission N2 !", en: "N2 Commission!",
    es: "¡Comisión N2!", de: "N2-Provision!",
    pt: "Comissão N2!", ru: "Комиссия N2!",
    hi: "N2 कमीशन!", zh: "N2佣金！", ar: "عمولة N2!",
  },
  provider_recruited: {
    fr: "Commission prestataire recruté !", en: "Recruited provider commission!",
    es: "¡Comisión proveedor reclutado!", de: "Provision rekrutierter Anbieter!",
    pt: "Comissão prestador recrutado!", ru: "Комиссия за привлечённого!",
    hi: "भर्ती प्रदाता कमीशन!", zh: "招募服务商佣金！", ar: "عمولة مقدم خدمة مُجنّد!",
  },
};

function getCommMsgTranslations(amountStr: string): Record<string, string> {
  return {
    fr: `Vous avez gagné $${amountStr} en commission.`,
    en: `You earned $${amountStr} in commission.`,
    es: `Has ganado $${amountStr} en comisión.`,
    de: `Sie haben $${amountStr} Provision verdient.`,
    pt: `Você ganhou $${amountStr} em comissão.`,
    ru: `Вы заработали $${amountStr} комиссии.`,
    hi: `आपने $${amountStr} कमीशन कमाया।`,
    zh: `您赚取了 $${amountStr} 佣金。`,
    ar: `لقد ربحت $${amountStr} عمولة.`,
  };
}

/**
 * Create a commission notification (i18n: 9 languages, English fallback)
 */
async function createCommissionNotification(
  db: FirebaseFirestore.Firestore,
  chatterId: string,
  type: ChatterNotification["type"],
  notifKey: string,
  title: string,
  message: string,
  commissionId: string,
  amount: number
): Promise<void> {
  const notificationRef = db.collection("chatter_notifications").doc();
  const amountStr = (amount / 100).toFixed(2);

  const notification: ChatterNotification = {
    id: notificationRef.id,
    chatterId,
    type,
    title,
    titleTranslations: (COMM_TITLES[notifKey] || { en: title }) as ChatterNotification["titleTranslations"],
    message,
    messageTranslations: getCommMsgTranslations(amountStr) as ChatterNotification["messageTranslations"],
    actionUrl: "/chatter/dashboard",
    isRead: false,
    emailSent: false,
    data: {
      commissionId,
      amount,
    },
    createdAt: Timestamp.now(),
  };

  await notificationRef.set(notification);
}

/**
 * Check and award first client badge (with transaction to prevent duplicates)
 */
async function checkFirstClientBadge(
  db: FirebaseFirestore.Firestore,
  chatterId: string
): Promise<void> {
  // Use transaction to prevent awarding badge twice
  const badgeAwarded = await db.runTransaction(async (transaction) => {
    const chatterRef = db.collection("chatters").doc(chatterId);
    const chatterSnap = await transaction.get(chatterRef);

    if (!chatterSnap.exists) return false;

    const chatter = chatterSnap.data() as Chatter;

    // Check if badge already awarded
    if (chatter.badges && chatter.badges.includes("first_client")) {
      return false;
    }

    // Award badge atomically
    transaction.update(chatterRef, {
      badges: FieldValue.arrayUnion("first_client"),
      updatedAt: Timestamp.now(),
    });

    return { awarded: true, chatter };
  });

  if (!badgeAwarded || typeof badgeAwarded === 'boolean') return;

  const chatter = badgeAwarded.chatter;

  // Create badge award record (outside transaction - idempotent)
  await db.collection("chatter_badge_awards").add({
    chatterId,
    chatterEmail: chatter.email,
    badgeType: "first_client",
    awardedAt: Timestamp.now(),
    bonusCommissionId: null,
    context: { clientCount: 1 },
  });

  // Create notification (i18n: 9 languages, English fallback)
  const notificationRef = db.collection("chatter_notifications").doc();
  await notificationRef.set({
    id: notificationRef.id,
    chatterId,
    type: "badge_earned",
    title: "Badge d\u00e9bloqu\u00e9 : Premier Client !",
    titleTranslations: {
      fr: "Badge débloqué : Premier Client !",
      en: "Badge unlocked: First Client!",
      es: "¡Insignia desbloqueada: Primer Cliente!",
      de: "Abzeichen freigeschaltet: Erster Kunde!",
      pt: "Distintivo desbloqueado: Primeiro Cliente!",
      ru: "Значок разблокирован: Первый Клиент!",
      hi: "बैज अनलॉक: पहला क्लाइंट!",
      zh: "徽章解锁：第一个客户！",
      ar: "شارة مفتوحة: أول عميل!",
    },
    message: "Vous avez r\u00e9f\u00e9r\u00e9 votre premier client !",
    messageTranslations: {
      fr: "Vous avez référé votre premier client !",
      en: "You referred your first client!",
      es: "¡Referiste a tu primer cliente!",
      de: "Sie haben Ihren ersten Kunden empfohlen!",
      pt: "Você indicou seu primeiro cliente!",
      ru: "Вы привлекли своего первого клиента!",
      hi: "आपने अपना पहला क्लाइंट रेफ़र किया!",
      zh: "您推荐了第一位客户！",
      ar: "لقد أحلت عميلك الأول!",
    },
    isRead: false,
    emailSent: false,
    data: { badgeType: "first_client" },
    createdAt: Timestamp.now(),
  });

  logger.info("[checkFirstClientBadge] Badge awarded", { chatterId });
}

/**
 * Mask email for display
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * Update daily mission progress when a call is generated
 * Increments callsToday counter in the chatter's daily missions
 */
async function updateDailyMissionCall(
  db: FirebaseFirestore.Firestore,
  chatterId: string
): Promise<void> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    const missionRef = db
      .collection("chatters")
      .doc(chatterId)
      .collection("dailyMissions")
      .doc(today);

    // Use transaction for atomic update
    await db.runTransaction(async (transaction) => {
      const missionDoc = await transaction.get(missionRef);

      if (missionDoc.exists) {
        // Increment existing counter
        const data = missionDoc.data();
        transaction.update(missionRef, {
          callsToday: (data?.callsToday || 0) + 1,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new daily mission doc with 1 call
        transaction.set(missionRef, {
          date: today,
          sharesCount: 0,
          loggedInToday: false,
          messagesSentToday: 0,
          videoWatched: false,
          callsToday: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    });

    logger.info("[updateDailyMissionCall] Daily mission updated", {
      chatterId,
      date: today,
    });
  } catch (error) {
    // Don't fail the main trigger if daily mission update fails
    logger.error("[updateDailyMissionCall] Error", { chatterId, error });
  }
}
