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
  // getZoomBonus, // DISABLED: Zoom bonus feature removed
  getStreakBonusMultiplier,
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
      // For social likes bonus
      networkCount?: number;
      networks?: string;
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

    // 4b. Duplicate check - fast path outside transaction (catches most duplicates)
    if (source.id) {
      const duplicateCheck = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", chatterId)
        .where("type", "==", type)
        .where("sourceId", "==", source.id)
        .limit(1)
        .get();

      if (!duplicateCheck.empty) {
        logger.warn("[createCommission] Duplicate commission detected", {
          chatterId,
          type,
          sourceId: source.id,
          existingCommissionId: duplicateCheck.docs[0].id,
        });
        return { success: false, error: "Commission already exists for this action" };
      }
    }

    // 5. Calculate base amount
    let baseAmount: number;

    if (inputBaseAmount !== undefined) {
      baseAmount = inputBaseAmount;
    } else {
      switch (type) {
        // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
        case "client_call":
          baseAmount = config.commissionClientCallAmount || config.commissionClientAmount || 1000;
          break;
        case "n1_call":
          baseAmount = config.commissionN1CallAmount || 100;
          break;
        case "n2_call":
          baseAmount = config.commissionN2CallAmount || 50;
          break;
        case "activation_bonus":
          baseAmount = config.commissionActivationBonusAmount || 500;
          break;
        case "n1_recruit_bonus":
          baseAmount = config.commissionN1RecruitBonusAmount || 100;
          break;
        case "provider_call":
          // $5 per call for providers recruited by this chatter (6 months window)
          baseAmount = config.commissionProviderCallAmount || 500;
          break;
        // LEGACY types (kept for backward compatibility)
        case "client_referral":
          baseAmount = config.commissionClientAmount || config.commissionClientCallAmount || 1000;
          break;
        case "recruitment":
          baseAmount = config.commissionRecruitmentAmount || 500;
          break;
        default:
          baseAmount = 0;
      }
    }

    // 6. Calculate bonuses
    const levelBonus = getLevelBonus(chatter.level, config);
    const top3Bonus = getTop3Bonus(chatter.currentMonthRank, config);
    // DISABLED: Zoom bonus feature removed - always 0
    const zoomBonus = 0;
    const streakBonus = getStreakBonusMultiplier(chatter.currentStreak || 0, config);

    // 6b. Check for monthly top multiplier (reward for being top 3 previous month)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyTopMultiplier =
      chatter.monthlyTopMultiplierMonth === currentMonth && chatter.monthlyTopMultiplier > 1.0
        ? chatter.monthlyTopMultiplier
        : 1.0;

    const { amount: calculatedAmount, details: calculationDetails } =
      calculateCommissionWithBonuses(baseAmount, levelBonus, top3Bonus, zoomBonus);

    // Apply streak bonus and monthly top multiplier on top of other bonuses
    const afterStreakAmount = Math.round(calculatedAmount * streakBonus);
    const finalAmount = Math.round(afterStreakAmount * monthlyTopMultiplier);

    // Build final calculation details
    let finalCalculationDetails = calculationDetails;
    if (streakBonus > 1.0) {
      finalCalculationDetails += ` × ${streakBonus}x (Streak ${chatter.currentStreak}j)`;
    }
    if (monthlyTopMultiplier > 1.0) {
      finalCalculationDetails += ` × ${monthlyTopMultiplier}x (Top ${chatter.currentMonthRank || '?'} mois précédent)`;
    }

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
      streakBonus,
      monthlyTopMultiplier, // multiplier for being top 3 previous month
      amount: finalAmount,
      currency: "USD",
      calculationDetails: finalCalculationDetails,
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

      // Double-check for duplicates inside transaction (race condition safety net)
      if (source.id) {
        const txDuplicateCheck = await transaction.get(
          db.collection("chatter_commissions")
            .where("chatterId", "==", chatterId)
            .where("type", "==", type)
            .where("sourceId", "==", source.id)
            .limit(1)
        );
        if (!txDuplicateCheck.empty) {
          throw new Error("Commission already exists for this action");
        }
      }

      const currentData = freshChatter.data() as Chatter;

      // Calculate new stats
      const newPendingBalance = currentData.pendingBalance + finalAmount;
      const newTotalCommissions = currentData.totalCommissions + 1;

      // Update commission count by type
      const commissionsByType = { ...currentData.commissionsByType };
      // NEW SIMPLIFIED SYSTEM: client_call, n1_call, n2_call count as client_referral
      // activation_bonus, n1_recruit_bonus count as recruitment
      if (type === "client_referral" || type === "client_call" || type === "n1_call" || type === "n2_call") {
        commissionsByType.client_referral.count += 1;
        commissionsByType.client_referral.amount += finalAmount;
      } else if (type === "recruitment" || type === "activation_bonus" || type === "n1_recruit_bonus") {
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
    // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
    case "client_call":
      return `Commission appel client${details?.clientEmail ? ` (${maskEmail(details.clientEmail)})` : ""}`;
    case "n1_call":
      return `Commission N1${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "n2_call":
      return `Commission N2${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "activation_bonus":
      return `Bonus activation${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "n1_recruit_bonus":
      return `Bonus recrutement N1${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "provider_call":
      return `Commission appel prestataire recruté${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    // LEGACY types (kept for backward compatibility)
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
    case "bonus_telegram":
      return "Bonus connexion Telegram";
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

    // Check and award milestone badges
    await checkAndAwardBadges(commission.chatterId);

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
// AUTOMATIC BADGE ATTRIBUTION
// ============================================================================

/**
 * Badge milestone definitions
 */
const BADGE_MILESTONES = {
  // Streak badges (consecutive days with activity)
  streak: [
    { badge: "streak_7" as const, threshold: 7 },
    { badge: "streak_30" as const, threshold: 30 },
    { badge: "streak_100" as const, threshold: 100 },
  ],
  // Client count badges
  clients: [
    { badge: "clients_10" as const, threshold: 10 },
    { badge: "clients_50" as const, threshold: 50 },
    { badge: "clients_100" as const, threshold: 100 },
  ],
  // Direct recruits (N1) badges - Team building motivation
  recruits: [
    { badge: "recruits_3" as const, threshold: 3 },   // Première équipe
    { badge: "recruits_5" as const, threshold: 5 },   // Équipe Bronze
    { badge: "recruits_10" as const, threshold: 10 }, // Équipe Argent
    { badge: "recruits_25" as const, threshold: 25 }, // Équipe Or
    { badge: "recruits_50" as const, threshold: 50 }, // Équipe Platine
  ],
  // Earnings badges (in cents)
  earnings: [
    { badge: "earned_100" as const, threshold: 10000 },   // $100
    { badge: "earned_500" as const, threshold: 50000 },   // $500
    { badge: "earned_1000" as const, threshold: 100000 }, // $1000
  ],
  // Team size badges (N1 + N2 total network)
  teamSize: [
    { badge: "team_10" as const, threshold: 10 },   // Réseau 10 personnes
    { badge: "team_25" as const, threshold: 25 },   // Réseau 25 personnes
    { badge: "team_50" as const, threshold: 50 },   // Réseau 50 personnes
    { badge: "team_100" as const, threshold: 100 }, // Réseau 100 personnes
  ],
  // Team earnings badges (total earned by N1 recruits)
  teamEarnings: [
    { badge: "team_earned_500" as const, threshold: 50000 },    // Équipe a gagné $500
    { badge: "team_earned_1000" as const, threshold: 100000 },  // Équipe a gagné $1000
    { badge: "team_earned_5000" as const, threshold: 500000 },  // Équipe a gagné $5000
  ],
};

/**
 * Get team statistics for a chatter (N1 + N2 network)
 */
async function getTeamStats(
  db: FirebaseFirestore.Firestore,
  chatterId: string
): Promise<{
  totalTeamSize: number;
  n1Count: number;
  n2Count: number;
  teamTotalEarnings: number;
}> {
  try {
    // Get direct recruits (N1)
    const n1Query = await db
      .collection("chatters")
      .where("recruitedBy", "==", chatterId)
      .where("status", "==", "active")
      .get();

    const n1Count = n1Query.size;
    let n2Count = 0;
    let teamTotalEarnings = 0;

    // For each N1, count their recruits (N2) and sum earnings
    for (const n1Doc of n1Query.docs) {
      const n1Data = n1Doc.data() as Chatter;
      teamTotalEarnings += n1Data.totalEarned || 0;

      // Count N2 (recruits of this N1)
      const n2Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", n1Doc.id)
        .where("status", "==", "active")
        .get();

      n2Count += n2Query.size;
    }

    return {
      totalTeamSize: n1Count + n2Count,
      n1Count,
      n2Count,
      teamTotalEarnings,
    };
  } catch (error) {
    logger.error("[getTeamStats] Error", { chatterId, error });
    return {
      totalTeamSize: 0,
      n1Count: 0,
      n2Count: 0,
      teamTotalEarnings: 0,
    };
  }
}

/**
 * Check and award all milestone badges for a chatter
 * Should be called after commission processing
 */
export async function checkAndAwardBadges(chatterId: string): Promise<{
  badgesAwarded: string[];
}> {
  const db = getFirestore();
  const badgesAwarded: string[] = [];

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();

    if (!chatterDoc.exists) {
      return { badgesAwarded };
    }

    const chatter = chatterDoc.data() as Chatter;
    const currentBadges = new Set(chatter.badges || []);
    const newBadges: string[] = [];

    // Check streak badges
    for (const { badge, threshold } of BADGE_MILESTONES.streak) {
      if (chatter.bestStreak >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Check client badges
    for (const { badge, threshold } of BADGE_MILESTONES.clients) {
      if (chatter.totalClients >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Check recruit badges (direct N1 recruits)
    for (const { badge, threshold } of BADGE_MILESTONES.recruits) {
      if (chatter.totalRecruits >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Check earnings badges
    for (const { badge, threshold } of BADGE_MILESTONES.earnings) {
      if (chatter.totalEarned >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Check team size badges (N1 + N2 network)
    const teamStats = await getTeamStats(db, chatterId);

    for (const { badge, threshold } of BADGE_MILESTONES.teamSize) {
      if (teamStats.totalTeamSize >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Check team earnings badges (total earned by N1 recruits)
    for (const { badge, threshold } of BADGE_MILESTONES.teamEarnings) {
      if (teamStats.teamTotalEarnings >= threshold && !currentBadges.has(badge)) {
        newBadges.push(badge);
      }
    }

    // Award new badges
    if (newBadges.length > 0) {
      await db.collection("chatters").doc(chatterId).update({
        badges: FieldValue.arrayUnion(...newBadges),
        updatedAt: Timestamp.now(),
      });

      // Create badge award records
      const batch = db.batch();
      for (const badge of newBadges) {
        const awardRef = db.collection("chatter_badge_awards").doc();
        batch.set(awardRef, {
          chatterId,
          chatterEmail: chatter.email,
          badgeType: badge,
          awardedAt: Timestamp.now(),
          bonusCommissionId: null,
          context: {
            bestStreak: chatter.bestStreak,
            totalClients: chatter.totalClients,
            totalRecruits: chatter.totalRecruits,
            totalEarned: chatter.totalEarned,
            zoomMeetings: chatter.zoomMeetingsAttended,
          },
        });
      }
      await batch.commit();

      // Create notifications for each badge
      for (const badge of newBadges) {
        const notificationRef = db.collection("chatter_notifications").doc();
        await notificationRef.set({
          id: notificationRef.id,
          chatterId,
          type: "badge_earned",
          title: `Badge débloqué : ${getBadgeDisplayName(badge)} !`,
          titleTranslations: { en: `Badge unlocked: ${getBadgeDisplayName(badge)}!` },
          message: getBadgeDescription(badge),
          messageTranslations: { en: getBadgeDescription(badge) },
          isRead: false,
          emailSent: false,
          data: { badgeType: badge },
          createdAt: Timestamp.now(),
        });
      }

      badgesAwarded.push(...newBadges);

      logger.info("[checkAndAwardBadges] Badges awarded", {
        chatterId,
        badges: newBadges,
      });
    }

    return { badgesAwarded };
  } catch (error) {
    logger.error("[checkAndAwardBadges] Error", { chatterId, error });
    return { badgesAwarded };
  }
}

/**
 * Get display name for a badge
 */
function getBadgeDisplayName(badge: string): string {
  const names: Record<string, string> = {
    // Streak badges
    streak_7: "Série 7 jours",
    streak_30: "Série 30 jours",
    streak_100: "Série 100 jours",
    // Client badges
    clients_10: "10 Clients",
    clients_50: "50 Clients",
    clients_100: "100 Clients",
    // Direct recruits badges (N1)
    recruits_3: "Première Équipe",
    recruits_5: "Équipe Bronze",
    recruits_10: "Équipe Argent",
    recruits_25: "Équipe Or",
    recruits_50: "Équipe Platine",
    // Earnings badges
    earned_100: "$100 Gagnés",
    earned_500: "$500 Gagnés",
    earned_1000: "$1000 Gagnés",
    // Team size badges (N1 + N2)
    team_10: "Réseau 10",
    team_25: "Réseau 25",
    team_50: "Réseau 50",
    team_100: "Réseau 100",
    // Team earnings badges
    team_earned_500: "Équipe $500",
    team_earned_1000: "Équipe $1000",
    team_earned_5000: "Équipe $5000",
    // Special badges
    first_client: "Premier Client",
    first_recruitment: "Première Recrue",
    first_quiz_pass: "Quiz Réussi",
    top1_monthly: "Top 1 Mensuel",
    top3_monthly: "Top 3 Mensuel",
  };
  return names[badge] || badge;
}

/**
 * Get description for a badge
 */
function getBadgeDescription(badge: string): string {
  const descriptions: Record<string, string> = {
    // Streak badges
    streak_7: "Vous avez été actif 7 jours consécutifs !",
    streak_30: "Vous avez été actif 30 jours consécutifs !",
    streak_100: "Incroyable ! 100 jours consécutifs d'activité !",
    // Client badges
    clients_10: "Vous avez référé 10 clients !",
    clients_50: "Vous avez référé 50 clients !",
    clients_100: "Félicitations ! 100 clients référés !",
    // Direct recruits badges (N1)
    recruits_3: "Vous avez recruté 3 personnes dans votre équipe !",
    recruits_5: "Équipe Bronze : 5 recrues directes !",
    recruits_10: "Équipe Argent : 10 recrues directes !",
    recruits_25: "Équipe Or : 25 recrues directes ! Impressionnant !",
    recruits_50: "Équipe Platine : 50 recrues directes ! Vous êtes un leader !",
    // Earnings badges
    earned_100: "Vous avez gagné $100 en commissions !",
    earned_500: "Vous avez gagné $500 en commissions !",
    earned_1000: "Félicitations ! $1000 de gains !",
    // Team size badges (N1 + N2)
    team_10: "Votre réseau compte 10 personnes (N1 + N2) !",
    team_25: "Votre réseau compte 25 personnes !",
    team_50: "Votre réseau compte 50 personnes ! Belle croissance !",
    team_100: "Réseau de 100 personnes ! Vous construisez un empire !",
    // Team earnings badges
    team_earned_500: "Votre équipe N1 a généré $500 de gains !",
    team_earned_1000: "Votre équipe N1 a généré $1000 de gains !",
    team_earned_5000: "Incroyable ! Votre équipe a généré $5000 !",
    // Special badges
    first_client: "Vous avez référé votre premier client !",
    first_recruitment: "Vous avez recruté votre premier membre d'équipe !",
    first_quiz_pass: "Vous avez réussi le quiz de qualification !",
    top1_monthly: "Vous avez été #1 du classement mensuel !",
    top3_monthly: "Vous avez été dans le Top 3 mensuel !",
  };
  return descriptions[badge] || "Badge débloqué !";
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
