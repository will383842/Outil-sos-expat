/**
 * Scheduled: tierBonusCheck
 *
 * Runs daily at 3:00 AM to check and pay tier bonuses to chatters
 * who have reached new milestones (5, 10, 20, 50, 100, 500 qualified filleuls).
 *
 * A filleul is considered "qualified" when they have earned $20+ in direct commissions
 * (clientEarnings = totalEarned - referralEarnings >= $20)
 *
 * Tier bonus amounts (configurable in chatter_config/settings):
 * - 5 filleuls qualifiés   -> $15   (1500 cents)
 * - 10 filleuls qualifiés  -> $35   (3500 cents)
 * - 20 filleuls qualifiés  -> $75   (7500 cents)
 * - 50 filleuls qualifiés  -> $250  (25000 cents)
 * - 100 filleuls qualifiés -> $600  (60000 cents)
 * - 500 filleuls qualifiés -> $4000 (400000 cents)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { getChatterConfig } from "../chatterConfig";
import { createCommission } from "../services/chatterCommissionService";
import { Chatter } from "../types";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of the tier bonus check process
 */
export interface TierBonusCheckResult {
  /** Number of chatters checked */
  chattersChecked: number;
  /** Number of tier bonuses paid */
  bonusesPaid: number;
  /** Total amount paid in cents */
  totalAmountPaid: number;
  /** Number of errors encountered */
  errors: number;
  /** Detailed breakdown by tier */
  breakdown: {
    tier: number;
    count: number;
    amount: number;
  }[];
}

// ============================================================================
// TIER BONUS LEVELS
// ============================================================================

/** Tier levels in ascending order */
const TIER_LEVELS = [5, 10, 20, 50, 100, 500] as const;

/** Default threshold for a filleul to be "qualified" (in cents) */
const DEFAULT_QUALIFIED_THRESHOLD = 2000; // $20

// ============================================================================
// CORE LOGIC
// ============================================================================

/**
 * Count qualified filleuls (N1 only) for a chatter
 * A filleul is "qualified" when they have earned at least $20 in direct commissions
 * (clientEarnings = totalEarned - referralEarnings >= threshold)
 *
 * @param chatterId - The chatter's ID
 * @param threshold - Minimum clientEarnings in cents (default $20 = 2000)
 * @returns Number of qualified filleuls
 */
async function countQualifiedFilleuls(
  chatterId: string,
  threshold: number = DEFAULT_QUALIFIED_THRESHOLD
): Promise<number> {
  const db = getDb();

  // Get all filleuls recruited by this chatter
  const filleulsQuery = await db
    .collection("chatters")
    .where("recruitedBy", "==", chatterId)
    .where("status", "==", "active")
    .get();

  let qualifiedCount = 0;

  for (const doc of filleulsQuery.docs) {
    const filleul = doc.data() as Chatter;
    // Calculate direct client earnings (excluding referral earnings)
    const clientEarnings = filleul.totalEarned - (filleul.referralEarnings || 0);

    if (clientEarnings >= threshold) {
      qualifiedCount++;
    }
  }

  return qualifiedCount;
}

/**
 * Get unpaid tier bonuses for a chatter based on their qualified filleul count
 *
 * @param qualifiedFilleulCount - Number of qualified filleuls ($20+ direct earnings)
 * @param alreadyPaidTiers - Tiers already paid to this chatter
 * @returns Array of unpaid tier levels
 */
function getUnpaidTiers(
  qualifiedFilleulCount: number,
  alreadyPaidTiers: number[]
): number[] {
  const unpaidTiers: number[] = [];

  for (const tier of TIER_LEVELS) {
    // Check if chatter has reached this tier and hasn't been paid for it
    if (qualifiedFilleulCount >= tier && !alreadyPaidTiers.includes(tier)) {
      unpaidTiers.push(tier);
    }
  }

  return unpaidTiers;
}

/**
 * Pay tier bonus to a chatter
 *
 * @param chatterId - The chatter's ID
 * @param chatter - The chatter document data
 * @param tier - The tier level (5, 10, 20, 50, 100, or 500)
 * @param bonusAmount - The bonus amount in cents
 * @param qualifiedFilleulCount - Current number of qualified filleuls
 * @returns Whether the bonus was successfully paid
 */
async function payTierBonus(
  chatterId: string,
  chatter: Chatter,
  tier: number,
  bonusAmount: number,
  qualifiedFilleulCount: number
): Promise<boolean> {
  const db = getDb();

  try {
    // Create the tier bonus commission
    const result = await createCommission({
      chatterId,
      type: "tier_bonus",
      source: {
        id: null,
        type: "bonus",
        details: {
          bonusType: "tier_bonus",
          bonusReason: `Palier ${tier} filleuls qualifiés atteint`,
        },
      },
      baseAmount: bonusAmount,
      description: `Bonus palier: ${tier} equipiers qualifiés ($20+ chacun)`,
      skipFraudCheck: true, // System-generated bonus, no fraud check needed
    });

    if (!result.success) {
      logger.error("[payTierBonus] Failed to create commission", {
        chatterId,
        tier,
        error: result.error,
      });
      return false;
    }

    // Update chatter's tierBonusesPaid array
    await db.collection("chatters").doc(chatterId).update({
      tierBonusesPaid: FieldValue.arrayUnion(tier),
      updatedAt: Timestamp.now(),
    });

    // Record in tier bonus history for analytics
    await db.collection("chatter_tier_bonuses_history").add({
      chatterId,
      chatterEmail: chatter.email,
      chatterName: `${chatter.firstName} ${chatter.lastName}`,
      tier,
      amount: bonusAmount,
      commissionId: result.commissionId,
      qualifiedFilleulsCount: qualifiedFilleulCount,
      awardedAt: Timestamp.now(),
    });

    logger.info("[payTierBonus] Tier bonus paid successfully", {
      chatterId,
      tier,
      bonusAmount,
      commissionId: result.commissionId,
      qualifiedFilleulCount,
    });

    return true;
  } catch (error) {
    logger.error("[payTierBonus] Error paying tier bonus", {
      chatterId,
      tier,
      error,
    });
    return false;
  }
}

/**
 * Process tier bonus check for all active chatters
 *
 * @returns Result of the tier bonus check
 */
export async function processTierBonusCheck(): Promise<TierBonusCheckResult> {
  const db = getDb();

  const result: TierBonusCheckResult = {
    chattersChecked: 0,
    bonusesPaid: 0,
    totalAmountPaid: 0,
    errors: 0,
    breakdown: [],
  };

  const breakdownMap = new Map<number, { count: number; amount: number }>();

  try {
    // Get configuration with tier bonus amounts and qualified threshold
    const config = await getChatterConfig();
    const tierBonuses: Record<number, number> = config.tierBonuses || {
      5: 1500,      // $15
      10: 3500,     // $35
      20: 7500,     // $75
      50: 25000,    // $250
      100: 60000,   // $600
      500: 400000,  // $4000
    };
    const qualifiedThreshold = config.qualifiedFilleulThreshold || DEFAULT_QUALIFIED_THRESHOLD;

    // Query all active chatters who might be eligible for tier bonuses
    // We look for chatters who have at least one filleul (totalRecruits > 0 is a good proxy)
    const chattersQuery = await db
      .collection("chatters")
      .where("status", "==", "active")
      .get();

    logger.info("[processTierBonusCheck] Processing chatters", {
      totalChatters: chattersQuery.size,
      qualifiedThreshold,
    });

    // Process each chatter
    for (const chatterDoc of chattersQuery.docs) {
      result.chattersChecked++;

      const chatter = chatterDoc.data() as Chatter;
      const chatterId = chatterDoc.id;

      try {
        // Count qualified filleuls for this chatter (those with $20+ direct earnings)
        const qualifiedFilleulCount = await countQualifiedFilleuls(chatterId, qualifiedThreshold);

        // Skip chatters with no qualified filleuls
        if (qualifiedFilleulCount === 0) {
          continue;
        }

        // Get already paid tiers
        const alreadyPaidTiers = chatter.tierBonusesPaid || [];

        // Determine unpaid tiers the chatter has qualified for
        const unpaidTiers = getUnpaidTiers(qualifiedFilleulCount, alreadyPaidTiers);

        // Pay each unpaid tier
        for (const tier of unpaidTiers) {
          const bonusAmount = tierBonuses[tier as keyof typeof tierBonuses] || 0;

          if (bonusAmount === 0) {
            logger.warn("[processTierBonusCheck] No bonus amount configured for tier", { tier });
            continue;
          }

          const success = await payTierBonus(
            chatterId,
            chatter,
            tier,
            bonusAmount,
            qualifiedFilleulCount
          );

          if (success) {
            result.bonusesPaid++;
            result.totalAmountPaid += bonusAmount;

            // Update breakdown
            const existing = breakdownMap.get(tier) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += bonusAmount;
            breakdownMap.set(tier, existing);
          } else {
            result.errors++;
          }
        }
      } catch (error) {
        logger.error("[processTierBonusCheck] Error processing chatter", {
          chatterId,
          error,
        });
        result.errors++;
      }
    }

    // Convert breakdown map to array
    result.breakdown = Array.from(breakdownMap.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      amount: data.amount,
    }));

    logger.info("[processTierBonusCheck] Processing complete", {
      chattersChecked: result.chattersChecked,
      bonusesPaid: result.bonusesPaid,
      totalAmountPaid: result.totalAmountPaid,
      totalAmountPaidDollars: (result.totalAmountPaid / 100).toFixed(2),
      errors: result.errors,
      breakdown: result.breakdown,
    });

    return result;
  } catch (error) {
    logger.error("[processTierBonusCheck] Fatal error", { error });
    throw error;
  }
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Daily scheduled function to check and pay tier bonuses
 * Runs at 3:00 AM Europe/Paris time
 */
export const chatterTierBonusCheck = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 3:00 AM
    region: "europe-west3",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 540, // 9 minutes (processing many chatters might take time)
    retryCount: 2,
  },
  async () => {
    ensureInitialized();

    logger.info("[chatterTierBonusCheck] Starting daily tier bonus check");

    try {
      const result = await processTierBonusCheck();

      logger.info("[chatterTierBonusCheck] Daily tier bonus check complete", {
        chattersChecked: result.chattersChecked,
        bonusesPaid: result.bonusesPaid,
        totalAmountPaidDollars: (result.totalAmountPaid / 100).toFixed(2),
        errors: result.errors,
      });
    } catch (error) {
      logger.error("[chatterTierBonusCheck] Error during scheduled run", { error });
      throw error; // Re-throw to trigger retry
    }
  }
);
