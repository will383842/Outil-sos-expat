/**
 * Chatter Referral Service
 *
 * Core business logic for the 2-level referral system:
 * - Threshold-based commissions ($10 → $1, $50 → $4, N2 $50 → $2)
 * - Per-call commissions: N1 = $1/call, N2 = $0.50/call (real-time via onCallCompleted)
 * - Tier bonuses (5/10/20/50/100/500 qualified filleuls)
 * - Early adopter (+50% lifetime bonus)
 * - Promotion multipliers (hackathons, special events)
 *
 * NOTE: Old monthly 5% recurring system has been REMOVED.
 * Commissions are now paid in real-time per call via the onCallCompleted trigger.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterReferralCommission,
  ChatterEarlyAdopterCounter,
  ChatterTierBonusHistory,
  ChatterPromotion,
  REFERRAL_CONFIG,
} from "../types";
import { getChatterConfigCached } from "../utils/chatterConfigService";

// ============================================================================
// HELPER: Get client earnings (EXCLUDING referral earnings)
// ============================================================================

/**
 * Calculate client earnings (total earned minus referral earnings)
 * This is used for threshold calculations as referral earnings don't count
 */
export function getClientEarnings(chatter: Chatter): number {
  return chatter.totalEarned - (chatter.referralEarnings || 0);
}

// ============================================================================
// N2 PARRAIN CALCULATION
// ============================================================================

/**
 * Calculate the N2 parrain (parrain of parrain) for a chatter
 */
export async function calculateParrainN2(chatterId: string): Promise<string | null> {
  const db = getFirestore();

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return null;

    const chatter = chatterDoc.data() as Chatter;
    if (!chatter.recruitedBy) return null;

    // Get the N1 parrain
    const parrainN1Doc = await db.collection("chatters").doc(chatter.recruitedBy).get();
    if (!parrainN1Doc.exists) return null;

    const parrainN1 = parrainN1Doc.data() as Chatter;
    // Return the N1 parrain's parrain (N2)
    return parrainN1.recruitedBy || null;
  } catch (error) {
    logger.error("[calculateParrainN2] Error", { chatterId, error });
    return null;
  }
}

// ============================================================================
// THRESHOLD CHECKS AND COMMISSIONS
// ============================================================================

export interface ThresholdResult {
  threshold10Applied: boolean;
  threshold50Applied: boolean;
  n2BonusApplied: boolean;
  commissionsCreated: string[];
}

/**
 * Check and apply threshold commissions when a chatter's earnings change
 * IMPORTANT: Uses clientEarnings (totalEarned - referralEarnings) for threshold checks
 */
export async function checkAndApplyThresholds(chatterId: string): Promise<ThresholdResult> {
  const db = getFirestore();
  const result: ThresholdResult = {
    threshold10Applied: false,
    threshold50Applied: false,
    n2BonusApplied: false,
    commissionsCreated: [],
  };

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return result;

    const chatter = chatterDoc.data() as Chatter;
    const clientEarnings = getClientEarnings(chatter);

    // Check $10 threshold
    if (!chatter.threshold10Reached && clientEarnings >= REFERRAL_CONFIG.THRESHOLDS.THRESHOLD_10) {
      if (chatter.recruitedBy) {
        const commissionId = await createReferralCommission({
          parrainId: chatter.recruitedBy,
          filleulId: chatterId,
          type: "threshold_10",
          level: 1,
          baseAmount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_10_AMOUNT,
        });

        if (commissionId) {
          result.commissionsCreated.push(commissionId);
          result.threshold10Applied = true;
        }
      }

      // Mark threshold as reached
      await db.collection("chatters").doc(chatterId).update({
        threshold10Reached: true,
        updatedAt: Timestamp.now(),
      });
    }

    // Check $50 threshold
    if (!chatter.threshold50Reached && clientEarnings >= REFERRAL_CONFIG.THRESHOLDS.THRESHOLD_50) {
      // Commission to N1 parrain
      if (chatter.recruitedBy) {
        const commissionIdN1 = await createReferralCommission({
          parrainId: chatter.recruitedBy,
          filleulId: chatterId,
          type: "threshold_50",
          level: 1,
          baseAmount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_50_N1_AMOUNT,
        });

        if (commissionIdN1) {
          result.commissionsCreated.push(commissionIdN1);
          result.threshold50Applied = true;

          // Increment qualifiedReferralsCount for the parrain
          await db.collection("chatters").doc(chatter.recruitedBy).update({
            qualifiedReferralsCount: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });

          // Check tier bonuses for the parrain
          await checkAndApplyTierBonuses(chatter.recruitedBy);
        }
      }

      // Commission to N2 parrain
      if (chatter.parrainNiveau2Id) {
        const commissionIdN2 = await createReferralCommission({
          parrainId: chatter.parrainNiveau2Id,
          filleulId: chatterId,
          type: "threshold_50_n2",
          level: 2,
          baseAmount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_50_N2_AMOUNT,
        });

        if (commissionIdN2) {
          result.commissionsCreated.push(commissionIdN2);
          result.n2BonusApplied = true;
        }
      }

      // Mark threshold as reached
      await db.collection("chatters").doc(chatterId).update({
        threshold50Reached: true,
        updatedAt: Timestamp.now(),
      });

      // Check and apply early adopter status for the filleul
      await checkAndApplyEarlyAdopter(chatterId);
    }

    return result;
  } catch (error) {
    logger.error("[checkAndApplyThresholds] Error", { chatterId, error });
    return result;
  }
}

// ============================================================================
// EARLY ADOPTER (PIONEER) SYSTEM
// ============================================================================

export interface EarlyAdopterResult {
  becameEarlyAdopter: boolean;
  country: string | null;
}

/**
 * Check and apply early adopter status when a chatter reaches $50 threshold
 */
export async function checkAndApplyEarlyAdopter(chatterId: string): Promise<EarlyAdopterResult> {
  const db = getFirestore();
  const result: EarlyAdopterResult = { becameEarlyAdopter: false, country: null };

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return result;

    const chatter = chatterDoc.data() as Chatter;

    // Already an early adopter
    if (chatter.isEarlyAdopter) {
      return { becameEarlyAdopter: false, country: chatter.earlyAdopterCountry };
    }

    // Must have reached $50 threshold
    if (!chatter.threshold50Reached) return result;

    // GLOBAL early adopter counter (not per country) - uses "global" as the key
    const counterRef = db.collection("chatter_early_adopter_counters").doc("global");

    // Try to claim an early adopter slot
    const success = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let counter: ChatterEarlyAdopterCounter;
      if (!counterDoc.exists) {
        // Create counter if it doesn't exist
        counter = {
          countryCode: "global",
          countryName: "Global",
          maxEarlyAdopters: REFERRAL_CONFIG.EARLY_ADOPTER.TOTAL_SLOTS,
          currentCount: 0,
          remainingSlots: REFERRAL_CONFIG.EARLY_ADOPTER.TOTAL_SLOTS,
          isOpen: true,
          earlyAdopterIds: [],
          updatedAt: Timestamp.now(),
        };
      } else {
        counter = counterDoc.data() as ChatterEarlyAdopterCounter;
      }

      // Check if slots are available
      if (!counter.isOpen || counter.remainingSlots <= 0) {
        return false;
      }

      // Update counter
      const updatedCounter: Partial<ChatterEarlyAdopterCounter> = {
        currentCount: counter.currentCount + 1,
        remainingSlots: counter.remainingSlots - 1,
        isOpen: counter.remainingSlots - 1 > 0,
        earlyAdopterIds: [...counter.earlyAdopterIds, chatterId],
        updatedAt: Timestamp.now(),
      };

      if (counterDoc.exists) {
        transaction.update(counterRef, updatedCounter);
      } else {
        transaction.set(counterRef, { ...counter, ...updatedCounter });
      }

      // Update chatter - keep earlyAdopterCountry for backwards compatibility but set to "global"
      const chatterRef = db.collection("chatters").doc(chatterId);
      transaction.update(chatterRef, {
        isEarlyAdopter: true,
        earlyAdopterCountry: "global", // Now global instead of per-country
        earlyAdopterDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return true;
    });

    if (success) {
      result.becameEarlyAdopter = true;
      result.country = "global";

      logger.info("[checkAndApplyEarlyAdopter] New early adopter (global program)", {
        chatterId,
        originalCountry: chatter.country,
      });
    }

    return result;
  } catch (error) {
    logger.error("[checkAndApplyEarlyAdopter] Error", { chatterId, error });
    return result;
  }
}

/**
 * Get the early adopter multiplier for a chatter
 */
export function getEarlyAdopterMultiplier(chatter: Chatter): number {
  return chatter.isEarlyAdopter ? REFERRAL_CONFIG.EARLY_ADOPTER.MULTIPLIER : 1.0;
}

// ============================================================================
// TIER BONUSES
// ============================================================================

export interface TierBonusResult {
  bonusesApplied: number[];
  commissionsCreated: string[];
}

/**
 * Check and apply tier bonuses based on qualified filleuls count
 */
export async function checkAndApplyTierBonuses(chatterId: string): Promise<TierBonusResult> {
  const db = getFirestore();
  const result: TierBonusResult = { bonusesApplied: [], commissionsCreated: [] };

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return result;

    const chatter = chatterDoc.data() as Chatter;
    const qualifiedCount = chatter.qualifiedReferralsCount || 0;
    const paidTiers = chatter.tierBonusesPaid || [];

    // Check each tier
    const tiers = [5, 10, 25, 50];

    for (const tier of tiers) {
      // Skip if already paid or not enough filleuls
      if (paidTiers.includes(tier) || qualifiedCount < tier) continue;

      const bonusAmount = REFERRAL_CONFIG.TIER_BONUSES[tier];
      if (!bonusAmount) continue;

      // Create tier bonus commission
      const commissionId = await createReferralCommission({
        parrainId: chatterId,
        filleulId: chatterId, // Self-referencing for tier bonus
        type: "tier_bonus",
        level: 1,
        baseAmount: bonusAmount,
        tierReached: tier,
      });

      if (commissionId) {
        result.bonusesApplied.push(tier);
        result.commissionsCreated.push(commissionId);

        // Record in history
        const historyRef = db.collection("chatter_tier_bonuses_history").doc();
        const historyRecord: ChatterTierBonusHistory = {
          id: historyRef.id,
          chatterId,
          chatterEmail: chatter.email,
          chatterName: `${chatter.firstName} ${chatter.lastName}`,
          tier: tier as 5 | 10 | 25 | 50,
          amount: bonusAmount,
          commissionId,
          qualifiedFilleulsCount: qualifiedCount,
          awardedAt: Timestamp.now(),
        };
        await historyRef.set(historyRecord);

        // Update chatter's tierBonusesPaid
        await db.collection("chatters").doc(chatterId).update({
          tierBonusesPaid: FieldValue.arrayUnion(tier),
          updatedAt: Timestamp.now(),
        });

        logger.info("[checkAndApplyTierBonuses] Tier bonus applied", {
          chatterId,
          tier,
          bonusAmount,
        });
      }
    }

    return result;
  } catch (error) {
    logger.error("[checkAndApplyTierBonuses] Error", { chatterId, error });
    return result;
  }
}

/**
 * Get the next tier bonus info for a chatter
 */
export function getNextTierBonus(chatter: Chatter): {
  tier: number;
  filleulsNeeded: number;
  bonusAmount: number;
} | null {
  const qualifiedCount = chatter.qualifiedReferralsCount || 0;
  const paidTiers = chatter.tierBonusesPaid || [];

  const tiers = [5, 10, 25, 50];

  for (const tier of tiers) {
    if (!paidTiers.includes(tier) && qualifiedCount < tier) {
      return {
        tier,
        filleulsNeeded: tier - qualifiedCount,
        bonusAmount: REFERRAL_CONFIG.TIER_BONUSES[tier] || 0,
      };
    }
  }

  return null; // All tiers achieved
}

// ============================================================================
// MONTHLY RECURRING COMMISSIONS - DEPRECATED
// ============================================================================
// NOTE: This system has been REPLACED by per-call commissions.
// N1 and N2 commissions are now paid in real-time via onCallCompleted trigger:
// - N1: $1 per call (n1_call)
// - N2: $0.50 per call (n2_call)
//
// The old 5% monthly system is no longer used.
// Keeping this interface for backwards compatibility with existing code.
// ============================================================================

export interface RecurringCommissionResult {
  filleulsActifs: number;
  totalCommission: number;
  commissionsCreated: string[];
}

/**
 * @deprecated Use per-call commissions via onCallCompleted trigger instead.
 * This function is kept for backwards compatibility but returns empty results.
 *
 * The new system pays commissions in real-time:
 * - N1 calls: $1 per call
 * - N2 calls: $0.50 per call
 */
export async function calculateMonthlyRecurringCommission(
  parrainId: string,
  month: string // YYYY-MM format
): Promise<RecurringCommissionResult> {
  logger.warn("[calculateMonthlyRecurringCommission] DEPRECATED - Using per-call system now", {
    parrainId,
    month,
    message: "This function is deprecated. N1/N2 commissions are now paid in real-time via onCallCompleted.",
  });

  // Return empty result - commissions are now handled per-call
  return {
    filleulsActifs: 0,
    totalCommission: 0,
    commissionsCreated: [],
  };
}

// ============================================================================
// PROMOTION MULTIPLIER
// ============================================================================

export interface PromoMultiplierResult {
  multiplier: number;
  promoId: string | null;
  promoName: string | null;
}

/**
 * Get the best active promotion multiplier for a chatter
 */
export async function getActivePromoMultiplier(
  chatterId: string,
  commissionType: string
): Promise<PromoMultiplierResult> {
  const db = getFirestore();
  const result: PromoMultiplierResult = {
    multiplier: 1.0,
    promoId: null,
    promoName: null,
  };

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return result;

    const chatter = chatterDoc.data() as Chatter;
    const now = Timestamp.now();

    // Query active promotions
    const promosQuery = await db
      .collection("chatter_promotions")
      .where("isActive", "==", true)
      .where("startDate", "<=", now)
      .where("endDate", ">=", now)
      .get();

    let bestMultiplier = 1.0;
    let bestPromo: ChatterPromotion | null = null;

    for (const promoDoc of promosQuery.docs) {
      const promo = promoDoc.data() as ChatterPromotion;

      // Check if promotion applies to this commission type
      if (!promo.appliesToTypes.includes(commissionType as any)) {
        continue;
      }

      // Check country restrictions
      if (promo.targetCountries.length > 0 && !promo.targetCountries.includes(chatter.country)) {
        continue;
      }

      // Check budget
      if (promo.maxBudget > 0 && promo.currentSpent >= promo.maxBudget) {
        continue;
      }

      // Take the best multiplier
      if (promo.multiplier > bestMultiplier) {
        bestMultiplier = promo.multiplier;
        bestPromo = promo;
      }
    }

    if (bestPromo) {
      result.multiplier = bestMultiplier;
      result.promoId = bestPromo.id;
      result.promoName = bestPromo.name;
    }

    return result;
  } catch (error) {
    logger.error("[getActivePromoMultiplier] Error", { chatterId, error });
    return result;
  }
}

// ============================================================================
// CREATE REFERRAL COMMISSION (INTERNAL)
// ============================================================================

interface CreateReferralCommissionInput {
  parrainId: string;
  filleulId: string;
  // NOTE: "recurring_5pct" removed - replaced by per-call commissions (n1_call, n2_call)
  type: "threshold_10" | "threshold_50" | "threshold_50_n2" | "tier_bonus";
  level: 1 | 2;
  baseAmount: number;
  tierReached?: number;
}

/**
 * Create a referral commission with all multipliers applied
 */
async function createReferralCommission(input: CreateReferralCommissionInput): Promise<string | null> {
  const db = getFirestore();

  try {
    // Get parrain data
    const parrainDoc = await db.collection("chatters").doc(input.parrainId).get();
    if (!parrainDoc.exists) return null;

    const parrain = parrainDoc.data() as Chatter;

    // Check parrain status
    if (parrain.status !== "active") {
      logger.warn("[createReferralCommission] Parrain not active", {
        parrainId: input.parrainId,
        status: parrain.status,
      });
      return null;
    }

    // Get filleul data
    const filleulDoc = await db.collection("chatters").doc(input.filleulId).get();
    const filleul = filleulDoc.exists ? (filleulDoc.data() as Chatter) : null;

    // Calculate multipliers
    const earlyAdopterMultiplier = getEarlyAdopterMultiplier(parrain);
    const promoResult = await getActivePromoMultiplier(input.parrainId, input.type);

    // Calculate final amount
    const finalAmount = Math.floor(
      input.baseAmount * earlyAdopterMultiplier * promoResult.multiplier
    );

    // Build calculation details string
    let calculationDetails = `Base: $${(input.baseAmount / 100).toFixed(2)}`;
    if (earlyAdopterMultiplier > 1) {
      calculationDetails += ` x ${earlyAdopterMultiplier} (Pioneer)`;
    }
    if (promoResult.multiplier > 1) {
      calculationDetails += ` x ${promoResult.multiplier} (${promoResult.promoName})`;
    }
    calculationDetails += ` = $${(finalAmount / 100).toFixed(2)}`;

    // Create commission document
    const now = Timestamp.now();
    const commissionRef = db.collection("chatter_referral_commissions").doc();

    const commission: ChatterReferralCommission = {
      id: commissionRef.id,
      parrainId: input.parrainId,
      parrainEmail: parrain.email,
      parrainCode: parrain.affiliateCodeClient,
      filleulId: input.filleulId,
      filleulEmail: filleul?.email || "unknown",
      filleulName: filleul ? `${filleul.firstName} ${filleul.lastName}` : "Unknown",
      type: input.type,
      level: input.level,
      baseAmount: input.baseAmount,
      earlyAdopterMultiplier,
      promoMultiplier: promoResult.multiplier,
      amount: finalAmount,
      // recurringMonth and filleulMonthlyEarnings removed - old 5% system deprecated
      tierReached: input.tierReached,
      currency: "USD",
      status: "pending",
      calculationDetails,
      promotionId: promoResult.promoId || undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Update parrain's balances and referral earnings
    await db.runTransaction(async (transaction) => {
      const freshParrainDoc = await transaction.get(
        db.collection("chatters").doc(input.parrainId)
      );

      if (!freshParrainDoc.exists) {
        throw new Error("Parrain not found in transaction");
      }

      const freshParrain = freshParrainDoc.data() as Chatter;

      transaction.set(commissionRef, commission);

      transaction.update(db.collection("chatters").doc(input.parrainId), {
        pendingBalance: freshParrain.pendingBalance + finalAmount,
        referralEarnings: (freshParrain.referralEarnings || 0) + finalAmount,
        updatedAt: now,
      });

      // Update promotion spend if applicable
      if (promoResult.promoId && promoResult.multiplier > 1) {
        const bonusAmount = finalAmount - input.baseAmount;
        transaction.update(db.collection("chatter_promotions").doc(promoResult.promoId), {
          currentSpent: FieldValue.increment(bonusAmount),
          participantCount: FieldValue.increment(1),
          updatedAt: now,
        });
      }
    });

    logger.info("[createReferralCommission] Commission created", {
      commissionId: commissionRef.id,
      parrainId: input.parrainId,
      filleulId: input.filleulId,
      type: input.type,
      baseAmount: input.baseAmount,
      finalAmount,
      earlyAdopterMultiplier,
      promoMultiplier: promoResult.multiplier,
    });

    return commissionRef.id;
  } catch (error) {
    logger.error("[createReferralCommission] Error", { input, error });
    return null;
  }
}

// ============================================================================
// REFERRAL COMMISSION VALIDATION/RELEASE
// ============================================================================

/**
 * Validate a pending referral commission
 */
export async function validateReferralCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const config = await getChatterConfigCached();
    const commissionRef = db.collection("chatter_referral_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as ChatterReferralCommission;

    if (commission.status !== "pending") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const now = Timestamp.now();
    const releaseDelayMs = (config.releaseDelayHours || 24) * 60 * 60 * 1000;
    const availableAt = Timestamp.fromMillis(now.toMillis() + releaseDelayMs);

    await db.runTransaction(async (transaction) => {
      transaction.update(commissionRef, {
        status: "validated",
        validatedAt: now,
        availableAt,
        updatedAt: now,
      });

      // Move from pending to validated in parrain balances
      const parrainRef = db.collection("chatters").doc(commission.parrainId);
      const parrainDoc = await transaction.get(parrainRef);

      if (parrainDoc.exists) {
        const parrain = parrainDoc.data() as Chatter;
        transaction.update(parrainRef, {
          pendingBalance: Math.max(0, parrain.pendingBalance - commission.amount),
          validatedBalance: parrain.validatedBalance + commission.amount,
          updatedAt: now,
        });
      }
    });

    return { success: true };
  } catch (error) {
    logger.error("[validateReferralCommission] Error", { commissionId, error });
    return { success: false, error: "Failed to validate commission" };
  }
}

/**
 * Release a validated referral commission to available balance
 */
export async function releaseReferralCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("chatter_referral_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as ChatterReferralCommission;

    if (commission.status !== "validated") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      transaction.update(commissionRef, {
        status: "available",
        updatedAt: now,
      });

      // Move from validated to available, add to totalEarned
      const parrainRef = db.collection("chatters").doc(commission.parrainId);
      const parrainDoc = await transaction.get(parrainRef);

      if (parrainDoc.exists) {
        const parrain = parrainDoc.data() as Chatter;
        transaction.update(parrainRef, {
          validatedBalance: Math.max(0, parrain.validatedBalance - commission.amount),
          availableBalance: parrain.availableBalance + commission.amount,
          totalEarned: parrain.totalEarned + commission.amount,
          updatedAt: now,
        });
      }
    });

    return { success: true };
  } catch (error) {
    logger.error("[releaseReferralCommission] Error", { commissionId, error });
    return { success: false, error: "Failed to release commission" };
  }
}

// ============================================================================
// BATCH OPERATIONS FOR REFERRAL COMMISSIONS
// ============================================================================

/**
 * Validate all pending referral commissions past their hold period
 */
export async function validatePendingReferralCommissions(): Promise<{
  validated: number;
  errors: number;
}> {
  const db = getFirestore();
  const config = await getChatterConfigCached();

  const holdPeriodMs = (config.validationHoldPeriodHours || 48) * 60 * 60 * 1000;
  const cutoffTime = Timestamp.fromMillis(Date.now() - holdPeriodMs);

  const pendingQuery = await db
    .collection("chatter_referral_commissions")
    .where("status", "==", "pending")
    .where("createdAt", "<=", cutoffTime)
    .limit(100)
    .get();

  let validated = 0;
  let errors = 0;

  for (const doc of pendingQuery.docs) {
    const result = await validateReferralCommission(doc.id);
    if (result.success) {
      validated++;
    } else {
      errors++;
    }
  }

  logger.info("[validatePendingReferralCommissions] Batch complete", {
    validated,
    errors,
    total: pendingQuery.size,
  });

  return { validated, errors };
}

/**
 * Release all validated referral commissions past their release delay
 */
export async function releaseValidatedReferralCommissions(): Promise<{
  released: number;
  errors: number;
}> {
  const db = getFirestore();
  const now = Timestamp.now();

  const validatedQuery = await db
    .collection("chatter_referral_commissions")
    .where("status", "==", "validated")
    .where("availableAt", "<=", now)
    .limit(100)
    .get();

  let released = 0;
  let errors = 0;

  for (const doc of validatedQuery.docs) {
    const result = await releaseReferralCommission(doc.id);
    if (result.success) {
      released++;
    } else {
      errors++;
    }
  }

  logger.info("[releaseValidatedReferralCommissions] Batch complete", {
    released,
    errors,
    total: validatedQuery.size,
  });

  return { released, errors };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  REFERRAL_CONFIG,
};
