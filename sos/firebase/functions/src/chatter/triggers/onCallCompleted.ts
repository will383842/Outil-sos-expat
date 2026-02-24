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
} from "../utils/chatterConfigService";
import { updateChatterChallengeScore } from "../scheduled/weeklyChallenges";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/** Minimum call duration in seconds to earn commission (anti-fraud) */
const MIN_CALL_DURATION_SECONDS = 120;

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

      const clientCallAmount = getClientCallCommission(config);

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
      // ========================================================================

      if (chatter.recruitedBy) {
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
            "Commission N1 !",
            `Votre filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a g\u00e9n\u00e9r\u00e9 un appel ! +$${(n1CallAmount / 100).toFixed(2)}`,
            n1Result.commissionId!,
            n1Result.amount!
          );

          // Update weekly challenge score for N1 call
          await updateChatterChallengeScore(chatter.recruitedBy, "n1_call");
        }

        // ========================================================================
        // 6. N2 CALL COMMISSION ($0.50) - If chatter's recruiter also has a recruiter
        // ========================================================================

        if (chatter.parrainNiveau2Id) {
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

            // Get N1 recruiter name for notification
            const n1Doc = await db.collection("chatters").doc(chatter.recruitedBy).get();
            const n1Name = n1Doc.exists
              ? `${(n1Doc.data() as Chatter).firstName} ${(n1Doc.data() as Chatter).lastName.charAt(0)}.`
              : "votre filleul N1";

            await createCommissionNotification(
              db,
              chatter.parrainNiveau2Id,
              "commission_earned",
              "Commission N2 !",
              `Le filleul de ${n1Name} a g\u00e9n\u00e9r\u00e9 un appel ! +$${(n2CallAmount / 100).toFixed(2)}`,
              n2Result.commissionId!,
              n2Result.amount!
            );

            // Update weekly challenge score for N2 call (counts as team action)
            await updateChatterChallengeScore(chatter.parrainNiveau2Id, "n2_call");
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
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  handleCallCompleted
);

/**
 * Process provider recruitment commission
 * When a chatter recruits a provider (lawyer/expat), they earn $5 on EVERY call
 * the provider receives for 6 months from recruitment date.
 */
async function processProviderRecruitmentCommission(
  db: FirebaseFirestore.Firestore,
  session: CallSession,
  config: Awaited<ReturnType<typeof getChatterConfigCached>>,
  sessionId: string,
  flashMultiplier: number
): Promise<void> {
  try {
    // Get provider data
    const providerDoc = await db.collection("users").doc(session.providerId).get();

    if (!providerDoc.exists) {
      return;
    }

    const providerData = providerDoc.data() as UserDocument;

    // Check if provider was recruited by a chatter
    if (!providerData.providerRecruitedByChatterId) {
      return;
    }

    // Get the recruitment link to check the date
    const linkQuery = await db
      .collection("chatter_recruitment_links")
      .where("chatterId", "==", providerData.providerRecruitedByChatterId)
      .where("usedByProviderId", "==", session.providerId)
      .limit(1)
      .get();

    if (linkQuery.empty) {
      // Fallback: check user document for recruitment date
      // The provider might have been recruited before the link system was in place
      logger.info("[processProviderRecruitmentCommission] No recruitment link found, checking user doc", {
        providerId: session.providerId,
        chatterId: providerData.providerRecruitedByChatterId,
      });
    }

    // Determine recruitment date
    let recruitmentDate: Date | null = null;

    if (!linkQuery.empty) {
      const linkData = linkQuery.docs[0].data();
      recruitmentDate = linkData.usedAt?.toDate() || linkData.createdAt?.toDate();
    }

    // If no recruitment date found, use a fallback (user creation date)
    if (!recruitmentDate && providerDoc.createTime) {
      recruitmentDate = providerDoc.createTime.toDate();
    }

    if (!recruitmentDate) {
      logger.warn("[processProviderRecruitmentCommission] No recruitment date found", {
        providerId: session.providerId,
      });
      return;
    }

    // Check if within the commission window (6 months by default)
    const durationMonths = getProviderRecruitmentDurationMonths(config);
    const expirationDate = new Date(recruitmentDate);
    expirationDate.setMonth(expirationDate.getMonth() + durationMonths);

    const now = new Date();
    if (now > expirationDate) {
      logger.info("[processProviderRecruitmentCommission] Commission window expired", {
        providerId: session.providerId,
        recruitmentDate: recruitmentDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
      });
      return;
    }

    // Get the recruiting chatter
    const recruiterChatterId = providerData.providerRecruitedByChatterId;
    const recruiterDoc = await db.collection("chatters").doc(recruiterChatterId).get();

    if (!recruiterDoc.exists) {
      logger.warn("[processProviderRecruitmentCommission] Recruiter chatter not found", {
        chatterId: recruiterChatterId,
      });
      return;
    }

    const recruiter = recruiterDoc.data() as Chatter;

    // Check recruiter is active
    if (recruiter.status !== "active") {
      logger.info("[processProviderRecruitmentCommission] Recruiter not active", {
        chatterId: recruiterChatterId,
        status: recruiter.status,
      });
      return;
    }

    // Create commission for provider call
    const providerCallAmount = getProviderCallCommission(config);

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
        },
      },
      baseAmount: providerCallAmount,
      description: `Commission prestataire recruté (${session.providerType === "lawyer" ? "avocat" : "aidant"})${flashMultiplier > 1 ? ` (x${flashMultiplier} Flash Bonus)` : ""}`,
      skipFraudCheck: true, // Provider calls are low-fraud risk
    });

    if (providerCallResult.success) {
      logger.info("[processProviderRecruitmentCommission] Provider call commission created", {
        sessionId,
        recruiterId: recruiterChatterId,
        providerId: session.providerId,
        commissionId: providerCallResult.commissionId,
        amount: providerCallResult.amount,
        monthsRemaining: Math.ceil((expirationDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)),
      });

      // Create notification
      await createCommissionNotification(
        db,
        recruiterChatterId,
        "commission_earned",
        "Commission prestataire recruté !",
        `Votre ${session.providerType === "lawyer" ? "avocat" : "aidant"} recruté a reçu un appel ! +$${(providerCallAmount / 100).toFixed(2)}`,
        providerCallResult.commissionId!,
        providerCallResult.amount!
      );

      // Update weekly challenge score
      await updateChatterChallengeScore(recruiterChatterId, "provider_call");
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
 * Create a commission notification
 */
async function createCommissionNotification(
  db: FirebaseFirestore.Firestore,
  chatterId: string,
  type: ChatterNotification["type"],
  title: string,
  message: string,
  commissionId: string,
  amount: number
): Promise<void> {
  const notificationRef = db.collection("chatter_notifications").doc();

  const notification: ChatterNotification = {
    id: notificationRef.id,
    chatterId,
    type,
    title,
    titleTranslations: {
      en: title.includes("N1")
        ? "N1 Commission!"
        : title.includes("N2")
          ? "N2 Commission!"
          : title.includes("activation")
            ? "Activation Bonus!"
            : title.includes("recrutement")
              ? "Recruitment Bonus!"
              : "Client Call Commission!",
    },
    message,
    messageTranslations: {
      en: message, // Simplified for now
    },
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

  // Create notification
  const notificationRef = db.collection("chatter_notifications").doc();
  await notificationRef.set({
    id: notificationRef.id,
    chatterId,
    type: "badge_earned",
    title: "Badge d\u00e9bloqu\u00e9 : Premier Client !",
    titleTranslations: { en: "Badge unlocked: First Client!" },
    message: "Vous avez r\u00e9f\u00e9r\u00e9 votre premier client !",
    messageTranslations: { en: "You referred your first client!" },
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
