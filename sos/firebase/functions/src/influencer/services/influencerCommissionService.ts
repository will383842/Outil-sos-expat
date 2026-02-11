/**
 * Influencer Commission Service
 *
 * Core business logic for commission management:
 * - Creating commissions with level/streak/top3 bonuses
 * - Validating commissions after hold period (7 days)
 * - Releasing commissions to available balance
 * - Handling cancellations
 *
 * Commission structure (aligned with Chatter):
 * - $10 base per client referral + level/streak/top3 bonuses
 * - $5 per provider call (within 6-month window, no bonuses)
 * - $5 one-time recruitment commission (when recruit reaches $50)
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Influencer,
  InfluencerCommission,
  InfluencerCommissionType,
  InfluencerConfig,
  CommissionCalculationType,
} from "../types";
import {
  getInfluencerConfigCached,
  getValidationDelayMs,
  getReleaseDelayMs,
  getCommissionRule,
  calculateLevelFromEarnings,
  getLevelBonus,
  getTop3Bonus,
  getStreakBonusMultiplier,
  calculateCommissionWithBonuses,
} from "../utils/influencerConfigService";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCommissionInput {
  influencerId: string;
  type: InfluencerCommissionType;
  source: {
    id: string | null;
    type: "call_session" | "user" | "provider";
    details?: {
      // For client referral
      clientId?: string;
      clientEmail?: string;
      callSessionId?: string;
      callDuration?: number;
      connectionFee?: number;
      discountApplied?: number;
      // For recruitment
      providerId?: string;
      providerEmail?: string;
      providerType?: "lawyer" | "expat";
      callId?: string;
      recruitmentDate?: string;
      monthsRemaining?: number;
      // For percentage-based calculations (V2)
      totalAmount?: number;
    };
  };
  amount?: number; // Override amount (otherwise use config/captured rates)
  baseAmount?: number; // Base amount for percentage calculations (V2)
  description?: string;
}

export interface CreateCommissionResult {
  success: boolean;
  commissionId?: string;
  amount?: number;
  error?: string;
  reason?: string;
}

// ============================================================================
// V2: COMMISSION CALCULATION
// ============================================================================

/**
 * Calculate commission amount based on V2 flexible rules
 * Uses captured rates (frozen at registration) if available
 */
export function calculateCommissionAmount(
  influencer: Influencer,
  type: InfluencerCommissionType,
  baseAmount: number,
  config: InfluencerConfig
): number {
  // V2: Use captured rates if available (frozen at registration)
  if (influencer.capturedRates && influencer.capturedRates.rules[type]) {
    const capturedRule = influencer.capturedRates.rules[type]!;
    return calculateByType(
      capturedRule.calculationType,
      capturedRule.fixedAmount,
      capturedRule.percentageRate,
      baseAmount
    );
  }

  // Fallback: Use current config rules
  const rule = getCommissionRule(config, type);
  if (rule && rule.enabled) {
    return calculateByType(
      rule.calculationType,
      rule.fixedAmount,
      rule.percentageRate,
      baseAmount
    );
  }

  // Legacy fallback: Use fixed amounts from config
  switch (type) {
    case "client_referral":
      return config.commissionClientAmount;
    case "recruitment":
      return config.commissionRecruitmentAmount;
    default:
      return 0;
  }
}

/**
 * Calculate amount based on calculation type
 */
function calculateByType(
  calculationType: CommissionCalculationType,
  fixedAmount: number,
  percentageRate: number,
  baseAmount: number
): number {
  switch (calculationType) {
    case "fixed":
      return fixedAmount;
    case "percentage":
      return Math.round(baseAmount * percentageRate);
    case "hybrid":
      return fixedAmount + Math.round(baseAmount * percentageRate);
    default:
      return fixedAmount;
  }
}

// ============================================================================
// CREATE COMMISSION
// ============================================================================

/**
 * Create a new commission for an influencer
 */
export async function createCommission(
  input: CreateCommissionInput
): Promise<CreateCommissionResult> {
  const db = getFirestore();
  const { influencerId, type, source, amount: inputAmount, baseAmount, description } = input;

  try {
    // 1. Get influencer data
    const influencerDoc = await db.collection("influencers").doc(influencerId).get();

    if (!influencerDoc.exists) {
      return { success: false, error: "Influencer not found" };
    }

    const influencer = influencerDoc.data() as Influencer;

    // 2. Check influencer status
    if (influencer.status !== "active") {
      return {
        success: false,
        error: "Influencer is not active",
        reason: `Status: ${influencer.status}`,
      };
    }

    // 3. Get config
    const config = await getInfluencerConfigCached();

    if (!config.isSystemActive) {
      return { success: false, error: "Influencer system is not active" };
    }

    // 4. Duplicate check (same sourceId + influencerId + type)
    if (source.id) {
      const duplicateCheck = await db
        .collection("influencer_commissions")
        .where("influencerId", "==", influencerId)
        .where("type", "==", type)
        .where("sourceId", "==", source.id)
        .limit(1)
        .get();

      if (!duplicateCheck.empty) {
        logger.warn("[createCommission] Duplicate commission detected", {
          influencerId,
          type,
          sourceId: source.id,
          existingCommissionId: duplicateCheck.docs[0].id,
        });
        return { success: false, error: "Commission already exists for this action" };
      }
    }

    // 5. Calculate base amount (V2: flexible calculation using captured rates)
    let baseCommissionAmount: number;

    if (inputAmount !== undefined) {
      // Manual override
      baseCommissionAmount = inputAmount;
    } else {
      // V2: Calculate using captured rates or current rules
      const base = baseAmount
        || source.details?.totalAmount
        || source.details?.connectionFee
        || 0;

      baseCommissionAmount = calculateCommissionAmount(influencer, type, base, config);
    }

    // 5b. Apply level/streak/top3 bonuses (only for client_referral)
    let commissionAmount = baseCommissionAmount;
    let levelBonusMultiplier = 1.0;
    let top3BonusMultiplier = 1.0;
    let streakBonusMultiplier = 1.0;
    let monthlyTopMult = influencer.monthlyTopMultiplier ?? 1.0;
    let calculationDetails = "";

    if (type === "client_referral") {
      // Calculate level (self-healing: use totalEarned if level field missing)
      const levelInfo = calculateLevelFromEarnings(influencer.totalEarned || 0, config);
      const effectiveLevel = influencer.level || levelInfo.level;

      levelBonusMultiplier = getLevelBonus(effectiveLevel, config);
      top3BonusMultiplier = getTop3Bonus(influencer.currentMonthRank, config);
      streakBonusMultiplier = getStreakBonusMultiplier(influencer.currentStreak || 0, config);

      const bonusResult = calculateCommissionWithBonuses(
        baseCommissionAmount,
        levelBonusMultiplier,
        top3BonusMultiplier,
        streakBonusMultiplier,
        monthlyTopMult
      );

      commissionAmount = bonusResult.amount;
      calculationDetails = bonusResult.details;
    }

    // 5c. Create timestamp
    const now = Timestamp.now();

    // 6. Create commission document
    const commissionRef = db.collection("influencer_commissions").doc();

    const commission: InfluencerCommission = {
      id: commissionRef.id,
      influencerId,
      influencerEmail: influencer.email,
      influencerCode: influencer.affiliateCodeClient,
      type,
      sourceId: source.id,
      sourceType: source.type,
      sourceDetails: source.details,
      amount: commissionAmount,
      baseAmount: baseCommissionAmount,
      levelBonus: levelBonusMultiplier,
      top3Bonus: top3BonusMultiplier,
      streakBonus: streakBonusMultiplier,
      monthlyTopMultiplier: monthlyTopMult,
      calculationDetails,
      currency: "USD",
      description: description || getDefaultDescription(type, source.details),
      status: "pending",
      validatedAt: null,
      availableAt: null,
      withdrawalId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Update influencer balances and stats in transaction
    await db.runTransaction(async (transaction) => {
      // Re-read influencer for consistency
      const influencerRef = db.collection("influencers").doc(influencerId);
      const freshInfluencer = await transaction.get(influencerRef);

      if (!freshInfluencer.exists) {
        throw new Error("Influencer not found in transaction");
      }

      const currentData = freshInfluencer.data() as Influencer;

      // Calculate new stats
      const newPendingBalance = currentData.pendingBalance + commissionAmount;
      const newTotalCommissions = currentData.totalCommissions + 1;

      // Update client/recruit counts
      let newTotalClients = currentData.totalClients;
      let newTotalRecruits = currentData.totalRecruits;

      if (type === "client_referral") {
        newTotalClients += 1;
      } else if (type === "recruitment") {
        newTotalRecruits += 1;
      }

      // Update current month stats
      const currentMonth = now.toDate().toISOString().substring(0, 7); // YYYY-MM
      let currentMonthStats = { ...currentData.currentMonthStats };

      if (currentMonthStats.month !== currentMonth) {
        // New month, reset stats
        currentMonthStats = {
          clients: 0,
          recruits: 0,
          earnings: 0,
          month: currentMonth,
        };
      }

      if (type === "client_referral") {
        currentMonthStats.clients += 1;
        currentMonthStats.earnings += commissionAmount;
      } else if (type === "recruitment") {
        currentMonthStats.recruits += 1;
        currentMonthStats.earnings += commissionAmount;
      }

      // Update last activity date and streak
      const today = new Date().toISOString().split("T")[0];
      let newStreak = currentData.currentStreak || 0;
      let newBestStreak = currentData.bestStreak || 0;

      if (currentData.lastActivityDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (currentData.lastActivityDate === yesterdayStr) {
          // Consecutive day
          newStreak += 1;
        } else if (currentData.lastActivityDate !== today) {
          // Streak broken (gap > 1 day)
          newStreak = 1;
        }
        // Same day = no change to streak
      } else {
        newStreak = 1;
      }

      if (newStreak > newBestStreak) {
        newBestStreak = newStreak;
      }

      // Check level progression
      const newTotalEarned = (currentData.totalEarned || 0) + commissionAmount;
      const levelResult = calculateLevelFromEarnings(newTotalEarned, config);

      // Create commission
      transaction.set(commissionRef, commission);

      // Update influencer
      transaction.update(influencerRef, {
        pendingBalance: newPendingBalance,
        totalCommissions: newTotalCommissions,
        totalClients: newTotalClients,
        totalRecruits: newTotalRecruits,
        currentMonthStats,
        lastActivityDate: today,
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        level: levelResult.level,
        levelProgress: levelResult.progress,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("[influencer.createCommission] Commission created", {
      commissionId: commissionRef.id,
      influencerId,
      type,
      amount: commissionAmount,
    });

    return {
      success: true,
      commissionId: commissionRef.id,
      amount: commissionAmount,
    };
  } catch (error) {
    logger.error("[influencer.createCommission] Error", { influencerId, type, error });
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
  type: InfluencerCommissionType,
  details?: CreateCommissionInput["source"]["details"]
): string {
  switch (type) {
    case "client_referral":
      return `Commission parrainage client${details?.clientEmail ? ` (${maskEmail(details.clientEmail)})` : ""}`;
    case "recruitment":
      return `Commission recrutement prestataire${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "manual_adjustment":
      return "Ajustement manuel";
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
    const commissionRef = db.collection("influencer_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as InfluencerCommission;

    if (commission.status !== "pending") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const config = await getInfluencerConfigCached();
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

      // Move from pending to validated in influencer balances
      const influencerRef = db.collection("influencers").doc(commission.influencerId);
      const influencerDoc = await transaction.get(influencerRef);

      if (influencerDoc.exists) {
        const influencer = influencerDoc.data() as Influencer;
        transaction.update(influencerRef, {
          pendingBalance: Math.max(0, influencer.pendingBalance - commission.amount),
          validatedBalance: influencer.validatedBalance + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[influencer.validateCommission] Commission validated", {
      commissionId,
      influencerId: commission.influencerId,
      amount: commission.amount,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.validateCommission] Error", { commissionId, error });
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
    const commissionRef = db.collection("influencer_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as InfluencerCommission;

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

      // Move from validated to available in influencer balances
      // Also add to totalEarned
      const influencerRef = db.collection("influencers").doc(commission.influencerId);
      const influencerDoc = await transaction.get(influencerRef);

      if (influencerDoc.exists) {
        const influencer = influencerDoc.data() as Influencer;
        transaction.update(influencerRef, {
          validatedBalance: Math.max(0, influencer.validatedBalance - commission.amount),
          availableBalance: influencer.availableBalance + commission.amount,
          totalEarned: influencer.totalEarned + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[influencer.releaseCommission] Commission released", {
      commissionId,
      influencerId: commission.influencerId,
      amount: commission.amount,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.releaseCommission] Error", { commissionId, error });
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
    const commissionRef = db.collection("influencer_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as InfluencerCommission;

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

      // Update influencer balances
      const influencerRef = db.collection("influencers").doc(commission.influencerId);
      const influencerDoc = await transaction.get(influencerRef);

      if (influencerDoc.exists) {
        const influencer = influencerDoc.data() as Influencer;
        const updates: Record<string, unknown> = { updatedAt: now };

        // Deduct from appropriate balance based on previous status
        switch (commission.status) {
          case "pending":
            updates.pendingBalance = Math.max(0, influencer.pendingBalance - commission.amount);
            break;
          case "validated":
            updates.validatedBalance = Math.max(0, influencer.validatedBalance - commission.amount);
            break;
          case "available":
            updates.availableBalance = Math.max(0, influencer.availableBalance - commission.amount);
            // Also deduct from totalEarned if already counted
            updates.totalEarned = Math.max(0, influencer.totalEarned - commission.amount);
            break;
        }

        transaction.update(influencerRef, updates);
      }
    });

    logger.info("[influencer.cancelCommission] Commission cancelled", {
      commissionId,
      influencerId: commission.influencerId,
      amount: commission.amount,
      reason,
      cancelledBy,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.cancelCommission] Error", { commissionId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel commission",
    };
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
  const config = await getInfluencerConfigCached();

  const holdPeriodMs = getValidationDelayMs(config);
  const cutoffTime = Timestamp.fromMillis(Date.now() - holdPeriodMs);

  const pendingQuery = await db
    .collection("influencer_commissions")
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

  logger.info("[influencer.validatePendingCommissions] Batch complete", {
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
    .collection("influencer_commissions")
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

  logger.info("[influencer.releaseValidatedCommissions] Batch complete", {
    released,
    errors,
    total: validatedQuery.size,
  });

  return { released, errors };
}
