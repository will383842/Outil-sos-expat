/**
 * Chatter Commission Service
 *
 * Core business logic for commission management:
 * - Creating commissions with bonus calculations
 * - Validating commissions after hold period
 * - Releasing commissions to available balance
 * - Handling cancellations
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterCommission,
  ChatterCommissionType,
} from "../types";
import {
  getChatterConfigCached,
  calculateLevelFromEarnings,
  getLevelBonus,
  getTop3Bonus,
  getZoomBonus,
  calculateCommissionWithBonuses,
  getValidationDelayMs,
  getReleaseDelayMs,
} from "../utils/chatterConfigService";
// Note: getValidationDelayMs and getReleaseDelayMs are used in validateCommission and batch operations
import { checkCommissionFraud, checkAutoSuspension } from "../utils/chatterFraudDetection";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCommissionInput {
  chatterId: string;
  type: ChatterCommissionType;
  source: {
    id: string | null;
    type: "call_session" | "user" | "provider" | "bonus";
    details?: {
      clientId?: string;
      clientEmail?: string;
      callSessionId?: string;
      callDuration?: number;
      connectionFee?: number;
      providerId?: string;
      providerEmail?: string;
      providerType?: "lawyer" | "expat";
      firstCallId?: string;
      bonusType?: string;
      bonusReason?: string;
      rank?: number;
      month?: string;
      streakDays?: number;
      levelReached?: 1 | 2 | 3 | 4 | 5;
    };
  };
  baseAmount?: number; // Override base amount (otherwise use config)
  description?: string;
  skipFraudCheck?: boolean; // For system-generated bonuses
}

export interface CreateCommissionResult {
  success: boolean;
  commissionId?: string;
  amount?: number;
  error?: string;
  reason?: string;
}

// ============================================================================
// CREATE COMMISSION
// ============================================================================

/**
 * Create a new commission for a chatter
 */
export async function createCommission(
  input: CreateCommissionInput
): Promise<CreateCommissionResult> {
  const db = getFirestore();
  const { chatterId, type, source, baseAmount: inputBaseAmount, description, skipFraudCheck } = input;

  try {
    // 1. Get chatter data
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();

    if (!chatterDoc.exists) {
      return { success: false, error: "Chatter not found" };
    }

    const chatter = chatterDoc.data() as Chatter;

    // 2. Check chatter status
    if (chatter.status !== "active") {
      return {
        success: false,
        error: "Chatter is not active",
        reason: `Status: ${chatter.status}`,
      };
    }

    // 3. Get config
    const config = await getChatterConfigCached();

    if (!config.isSystemActive) {
      return { success: false, error: "Chatter system is not active" };
    }

    // 4. Fraud check (for client referrals)
    if (!skipFraudCheck && type === "client_referral" && source.details?.clientId) {
      const fraudResult = await checkCommissionFraud(
        chatterId,
        source.details.clientId,
        source.details.clientEmail || ""
      );

      if (fraudResult.shouldBlock) {
        // Log detailed flags for internal monitoring only
        logger.warn("[createCommission] Blocked by fraud detection", {
          chatterId,
          flags: fraudResult.flags,
          severity: fraudResult.severity,
        });
        // Return generic error to prevent exposing detection patterns
        return {
          success: false,
          error: "Commission could not be processed",
          reason: "security_check_failed",
        };
      }

      // Check if chatter should be auto-suspended
      const suspensionCheck = await checkAutoSuspension(chatterId);
      if (suspensionCheck.shouldSuspend) {
        // Suspend chatter
        await db.collection("chatters").doc(chatterId).update({
          status: "suspended",
          adminNotes: FieldValue.arrayUnion(
            `Auto-suspended: ${suspensionCheck.reason} (${new Date().toISOString()})`
          ),
          updatedAt: Timestamp.now(),
        });

        return {
          success: false,
          error: "Chatter has been suspended",
          reason: suspensionCheck.reason || undefined,
        };
      }
    }

    // 5. Calculate base amount
    let baseAmount: number;

    if (inputBaseAmount !== undefined) {
      baseAmount = inputBaseAmount;
    } else {
      switch (type) {
        case "client_referral":
          baseAmount = config.commissionClientAmount;
          break;
        case "recruitment":
          baseAmount = config.commissionRecruitmentAmount;
          break;
        default:
          baseAmount = 0;
      }
    }

    // 6. Calculate bonuses
    const levelBonus = getLevelBonus(chatter.level, config);
    const top3Bonus = getTop3Bonus(chatter.currentMonthRank, config);
    const zoomBonus = getZoomBonus(chatter.lastZoomAttendance, config);

    const { amount: finalAmount, details: calculationDetails } =
      calculateCommissionWithBonuses(baseAmount, levelBonus, top3Bonus, zoomBonus);

    // 7. Create timestamp
    const now = Timestamp.now();

    // 8. Create commission document
    const commissionRef = db.collection("chatter_commissions").doc();

    const commission: ChatterCommission = {
      id: commissionRef.id,
      chatterId,
      chatterEmail: chatter.email,
      chatterCode: chatter.affiliateCodeClient,
      type,
      sourceId: source.id,
      sourceType: source.type,
      sourceDetails: source.details,
      baseAmount,
      levelBonus,
      top3Bonus,
      zoomBonus,
      amount: finalAmount,
      currency: "USD",
      calculationDetails,
      status: "pending",
      validatedAt: null, // Will be set when validated
      availableAt: null, // Will be set when available
      withdrawalId: null,
      paidAt: null,
      description: description || getDefaultDescription(type, source.details),
      createdAt: now,
      updatedAt: now,
    };

    // 9. Update chatter balances and stats in transaction
    await db.runTransaction(async (transaction) => {
      // Re-read chatter for consistency
      const chatterRef = db.collection("chatters").doc(chatterId);
      const freshChatter = await transaction.get(chatterRef);

      if (!freshChatter.exists) {
        throw new Error("Chatter not found in transaction");
      }

      const currentData = freshChatter.data() as Chatter;

      // Calculate new stats
      const newPendingBalance = currentData.pendingBalance + finalAmount;
      const newTotalCommissions = currentData.totalCommissions + 1;

      // Update commission count by type
      const commissionsByType = { ...currentData.commissionsByType };
      if (type === "client_referral") {
        commissionsByType.client_referral.count += 1;
        commissionsByType.client_referral.amount += finalAmount;
      } else if (type === "recruitment") {
        commissionsByType.recruitment.count += 1;
        commissionsByType.recruitment.amount += finalAmount;
      } else {
        commissionsByType.bonus.count += 1;
        commissionsByType.bonus.amount += finalAmount;
      }

      // Update client/recruit counts
      let newTotalClients = currentData.totalClients;
      let newTotalRecruits = currentData.totalRecruits;

      if (type === "client_referral") {
        newTotalClients += 1;
      } else if (type === "recruitment") {
        newTotalRecruits += 1;
      }

      // Update streak (activity today)
      const today = new Date().toISOString().split("T")[0];
      let newStreak = currentData.currentStreak;
      let newBestStreak = currentData.bestStreak;

      if (currentData.lastActivityDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (currentData.lastActivityDate === yesterdayStr) {
          // Continue streak
          newStreak += 1;
          if (newStreak > newBestStreak) {
            newBestStreak = newStreak;
          }
        } else {
          // Reset streak
          newStreak = 1;
        }
      }

      // Create commission
      transaction.set(commissionRef, commission);

      // Update chatter
      transaction.update(chatterRef, {
        pendingBalance: newPendingBalance,
        totalCommissions: newTotalCommissions,
        commissionsByType,
        totalClients: newTotalClients,
        totalRecruits: newTotalRecruits,
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastActivityDate: today,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("[createCommission] Commission created", {
      commissionId: commissionRef.id,
      chatterId,
      type,
      baseAmount,
      finalAmount,
      levelBonus,
      top3Bonus,
      zoomBonus,
    });

    return {
      success: true,
      commissionId: commissionRef.id,
      amount: finalAmount,
    };
  } catch (error) {
    logger.error("[createCommission] Error", { chatterId, type, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create commission",
    };
  }
}

/**
 * Get default description for a commission type
 */
function getDefaultDescription(
  type: ChatterCommissionType,
  details?: CreateCommissionInput["source"]["details"]
): string {
  switch (type) {
    case "client_referral":
      return `Commission client referral${details?.clientEmail ? ` (${maskEmail(details.clientEmail)})` : ""}`;
    case "recruitment":
      return `Commission recrutement prestataire${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "bonus_level":
      return `Bonus passage niveau ${details?.levelReached || ""}`;
    case "bonus_streak":
      return `Bonus streak ${details?.streakDays || ""} jours`;
    case "bonus_top3":
      return `Bonus Top ${details?.rank || ""} mensuel (${details?.month || ""})`;
    case "bonus_zoom":
      return "Bonus participation Zoom";
    case "manual_adjustment":
      return details?.bonusReason || "Ajustement manuel";
    default:
      return "Commission";
  }
}

/**
 * Mask email for privacy
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

// ============================================================================
// VALIDATE COMMISSION
// ============================================================================

/**
 * Validate a pending commission (move from pending to validated)
 */
export async function validateCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("chatter_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as ChatterCommission;

    if (commission.status !== "pending") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const config = await getChatterConfigCached();
    const now = Timestamp.now();
    const availableAt = Timestamp.fromMillis(now.toMillis() + getReleaseDelayMs(config));

    await db.runTransaction(async (transaction) => {
      // Update commission status
      transaction.update(commissionRef, {
        status: "validated",
        validatedAt: now,
        availableAt,
        updatedAt: now,
      });

      // Move from pending to validated in chatter balances
      const chatterRef = db.collection("chatters").doc(commission.chatterId);
      const chatterDoc = await transaction.get(chatterRef);

      if (chatterDoc.exists) {
        const chatter = chatterDoc.data() as Chatter;
        transaction.update(chatterRef, {
          pendingBalance: Math.max(0, chatter.pendingBalance - commission.amount),
          validatedBalance: chatter.validatedBalance + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[validateCommission] Commission validated", {
      commissionId,
      chatterId: commission.chatterId,
      amount: commission.amount,
    });

    return { success: true };
  } catch (error) {
    logger.error("[validateCommission] Error", { commissionId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate commission",
    };
  }
}

// ============================================================================
// RELEASE COMMISSION
// ============================================================================

/**
 * Release a validated commission (move from validated to available)
 */
export async function releaseCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("chatter_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as ChatterCommission;

    if (commission.status !== "validated") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update commission status
      transaction.update(commissionRef, {
        status: "available",
        updatedAt: now,
      });

      // Move from validated to available in chatter balances
      // Also add to totalEarned
      const chatterRef = db.collection("chatters").doc(commission.chatterId);
      const chatterDoc = await transaction.get(chatterRef);

      if (chatterDoc.exists) {
        const chatter = chatterDoc.data() as Chatter;
        transaction.update(chatterRef, {
          validatedBalance: Math.max(0, chatter.validatedBalance - commission.amount),
          availableBalance: chatter.availableBalance + commission.amount,
          totalEarned: chatter.totalEarned + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[releaseCommission] Commission released", {
      commissionId,
      chatterId: commission.chatterId,
      amount: commission.amount,
    });

    // Check for level up
    await checkAndUpdateLevel(commission.chatterId);

    // Check for $50 recruiter bonus (when recruited chatter reaches $500)
    await checkRecruiterMilestoneBonus(commission.chatterId);

    return { success: true };
  } catch (error) {
    logger.error("[releaseCommission] Error", { commissionId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to release commission",
    };
  }
}

// ============================================================================
// CANCEL COMMISSION
// ============================================================================

/**
 * Cancel a commission (admin action or refund)
 */
export async function cancelCommission(
  commissionId: string,
  reason: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("chatter_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as ChatterCommission;

    if (commission.status === "paid" || commission.status === "cancelled") {
      return { success: false, error: `Cannot cancel: status is ${commission.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update commission status
      transaction.update(commissionRef, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy,
        cancelledAt: now,
        updatedAt: now,
      });

      // Update chatter balances
      const chatterRef = db.collection("chatters").doc(commission.chatterId);
      const chatterDoc = await transaction.get(chatterRef);

      if (chatterDoc.exists) {
        const chatter = chatterDoc.data() as Chatter;
        const updates: Record<string, unknown> = { updatedAt: now };

        // Deduct from appropriate balance based on previous status
        switch (commission.status) {
          case "pending":
            updates.pendingBalance = Math.max(0, chatter.pendingBalance - commission.amount);
            break;
          case "validated":
            updates.validatedBalance = Math.max(0, chatter.validatedBalance - commission.amount);
            break;
          case "available":
            updates.availableBalance = Math.max(0, chatter.availableBalance - commission.amount);
            // Also deduct from totalEarned if already counted
            updates.totalEarned = Math.max(0, chatter.totalEarned - commission.amount);
            break;
        }

        transaction.update(chatterRef, updates);
      }
    });

    logger.info("[cancelCommission] Commission cancelled", {
      commissionId,
      chatterId: commission.chatterId,
      amount: commission.amount,
      reason,
      cancelledBy,
    });

    return { success: true };
  } catch (error) {
    logger.error("[cancelCommission] Error", { commissionId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel commission",
    };
  }
}

// ============================================================================
// LEVEL MANAGEMENT
// ============================================================================

/**
 * Check and update chatter level based on total earnings
 */
export async function checkAndUpdateLevel(chatterId: string): Promise<{
  levelChanged: boolean;
  newLevel?: 1 | 2 | 3 | 4 | 5;
  previousLevel?: 1 | 2 | 3 | 4 | 5;
}> {
  const db = getFirestore();

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();

    if (!chatterDoc.exists) {
      return { levelChanged: false };
    }

    const chatter = chatterDoc.data() as Chatter;
    const config = await getChatterConfigCached();

    const { level: newLevel, progress } = calculateLevelFromEarnings(
      chatter.totalEarned,
      config
    );

    if (newLevel === chatter.level) {
      // Just update progress
      await db.collection("chatters").doc(chatterId).update({
        levelProgress: progress,
        updatedAt: Timestamp.now(),
      });
      return { levelChanged: false };
    }

    // Level changed
    await db.collection("chatters").doc(chatterId).update({
      level: newLevel,
      levelProgress: progress,
      badges: FieldValue.arrayUnion(`level_${newLevel}` as const),
      updatedAt: Timestamp.now(),
    });

    // Create level-up bonus commission
    const badgeDoc = await db.collection("chatter_badges").doc(`level_${newLevel}`).get();
    if (badgeDoc.exists) {
      const badge = badgeDoc.data();
      if (badge?.bonusReward && badge.bonusReward > 0) {
        await createCommission({
          chatterId,
          type: "bonus_level",
          source: {
            id: null,
            type: "bonus",
            details: {
              bonusType: "level_up",
              levelReached: newLevel,
            },
          },
          baseAmount: badge.bonusReward,
          description: `Bonus niveau ${newLevel} atteint`,
          skipFraudCheck: true,
        });
      }
    }

    // Create badge award record
    await db.collection("chatter_badge_awards").add({
      chatterId,
      chatterEmail: chatter.email,
      badgeType: `level_${newLevel}`,
      awardedAt: Timestamp.now(),
      bonusCommissionId: null,
      context: { level: newLevel },
    });

    logger.info("[checkAndUpdateLevel] Level updated", {
      chatterId,
      previousLevel: chatter.level,
      newLevel,
    });

    return {
      levelChanged: true,
      newLevel,
      previousLevel: chatter.level,
    };
  } catch (error) {
    logger.error("[checkAndUpdateLevel] Error", { chatterId, error });
    return { levelChanged: false };
  }
}

// ============================================================================
// RECRUITER MILESTONE BONUS
// ============================================================================

/**
 * Award $50 recruiter bonus when recruited chatter reaches $500 in total earnings
 * This is a one-time bonus per recruited chatter
 */
export async function checkRecruiterMilestoneBonus(chatterId: string): Promise<{
  bonusAwarded: boolean;
  recruiterId?: string;
  bonusCommissionId?: string;
}> {
  const db = getFirestore();
  const MILESTONE_THRESHOLD = 50000; // $500 in cents
  const RECRUITER_BONUS_AMOUNT = 5000; // $50 in cents

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();

    if (!chatterDoc.exists) {
      return { bonusAwarded: false };
    }

    const chatter = chatterDoc.data() as Chatter;

    // Check if chatter was recruited by another chatter
    if (!chatter.recruitedBy) {
      return { bonusAwarded: false };
    }

    // Check if chatter has reached $500 milestone
    if (chatter.totalEarned < MILESTONE_THRESHOLD) {
      return { bonusAwarded: false };
    }

    // Check if recruiter bonus was already paid for this milestone
    // We use a special field to track this
    if (chatter.recruiterMilestoneBonusPaid) {
      return { bonusAwarded: false };
    }

    // Get recruiter
    const recruiterDoc = await db.collection("chatters").doc(chatter.recruitedBy).get();

    if (!recruiterDoc.exists) {
      logger.warn("[checkRecruiterMilestoneBonus] Recruiter not found", {
        chatterId,
        recruiterId: chatter.recruitedBy,
      });
      return { bonusAwarded: false };
    }

    const recruiter = recruiterDoc.data() as Chatter;

    // Check recruiter is active
    if (recruiter.status !== "active") {
      logger.info("[checkRecruiterMilestoneBonus] Recruiter not active, skipping bonus", {
        chatterId,
        recruiterId: chatter.recruitedBy,
        recruiterStatus: recruiter.status,
      });
      return { bonusAwarded: false };
    }

    // Mark milestone bonus as processing to prevent race conditions
    await db.collection("chatters").doc(chatterId).update({
      recruiterMilestoneBonusPaid: true,
      recruiterMilestoneBonusAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Create the $50 recruiter bonus commission
    const result = await createCommission({
      chatterId: chatter.recruitedBy,
      type: "recruitment",
      source: {
        id: chatterId,
        type: "user",
        details: {
          providerId: chatterId,
          providerEmail: chatter.email,
          bonusType: "recruiter_milestone",
          bonusReason: `$500 milestone bonus for recruited chatter ${chatter.firstName} ${chatter.lastName}`,
        },
      },
      baseAmount: RECRUITER_BONUS_AMOUNT,
      description: `Bonus $50 - Filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a atteint $500 de commissions`,
      skipFraudCheck: true,
    });

    if (result.success) {
      logger.info("[checkRecruiterMilestoneBonus] Recruiter milestone bonus awarded", {
        chatterId,
        recruiterId: chatter.recruitedBy,
        commissionId: result.commissionId,
        amount: RECRUITER_BONUS_AMOUNT,
      });

      // Create notification for recruiter
      const notificationRef = db.collection("chatter_notifications").doc();
      await notificationRef.set({
        id: notificationRef.id,
        chatterId: chatter.recruitedBy,
        type: "commission_earned",
        title: "Prime de recrutement $50 !",
        titleTranslations: { en: "$50 Recruitment Bonus!" },
        message: `Votre filleul ${chatter.firstName} ${chatter.lastName.charAt(0)}. a atteint $500 de commissions ! Vous recevez $50 de bonus.`,
        messageTranslations: {
          en: `Your recruit ${chatter.firstName} ${chatter.lastName.charAt(0)}. has reached $500 in commissions! You receive a $50 bonus.`,
        },
        actionUrl: "/chatter/dashboard",
        isRead: false,
        emailSent: false,
        data: {
          commissionId: result.commissionId,
          amount: RECRUITER_BONUS_AMOUNT,
        },
        createdAt: Timestamp.now(),
      });

      return {
        bonusAwarded: true,
        recruiterId: chatter.recruitedBy,
        bonusCommissionId: result.commissionId,
      };
    } else {
      // Rollback the flag if commission creation failed
      await db.collection("chatters").doc(chatterId).update({
        recruiterMilestoneBonusPaid: false,
        recruiterMilestoneBonusAt: null,
        updatedAt: Timestamp.now(),
      });

      logger.error("[checkRecruiterMilestoneBonus] Failed to create bonus commission", {
        chatterId,
        recruiterId: chatter.recruitedBy,
        error: result.error,
      });
      return { bonusAwarded: false };
    }
  } catch (error) {
    logger.error("[checkRecruiterMilestoneBonus] Error", { chatterId, error });
    return { bonusAwarded: false };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Validate all pending commissions past their hold period
 */
export async function validatePendingCommissions(): Promise<{
  validated: number;
  errors: number;
}> {
  const db = getFirestore();
  const config = await getChatterConfigCached();

  const holdPeriodMs = getValidationDelayMs(config);
  const cutoffTime = Timestamp.fromMillis(Date.now() - holdPeriodMs);

  const pendingQuery = await db
    .collection("chatter_commissions")
    .where("status", "==", "pending")
    .where("createdAt", "<=", cutoffTime)
    .limit(100) // Process in batches
    .get();

  let validated = 0;
  let errors = 0;

  for (const doc of pendingQuery.docs) {
    const result = await validateCommission(doc.id);
    if (result.success) {
      validated++;
    } else {
      errors++;
    }
  }

  logger.info("[validatePendingCommissions] Batch complete", {
    validated,
    errors,
    total: pendingQuery.size,
  });

  return { validated, errors };
}

/**
 * Release all validated commissions past their release delay
 */
export async function releaseValidatedCommissions(): Promise<{
  released: number;
  errors: number;
}> {
  const db = getFirestore();
  const now = Timestamp.now();

  const validatedQuery = await db
    .collection("chatter_commissions")
    .where("status", "==", "validated")
    .where("availableAt", "<=", now)
    .limit(100) // Process in batches
    .get();

  let released = 0;
  let errors = 0;

  for (const doc of validatedQuery.docs) {
    const result = await releaseCommission(doc.id);
    if (result.success) {
      released++;
    } else {
      errors++;
    }
  }

  logger.info("[releaseValidatedCommissions] Batch complete", {
    released,
    errors,
    total: validatedQuery.size,
  });

  return { released, errors };
}
