/**
 * Monthly Top 3 Rewards System for Chatters
 *
 * Features:
 * - Calculates monthly rankings based on totalEarned during the month
 * - Awards commission MULTIPLIERS to Top 3 performers (not cash)
 * - Updates currentMonthRank on chatters for the new month
 * - Stores rankings history in chatter_monthly_rankings collection
 *
 * Schedule: Runs on 1st of each month at 00:30 UTC
 *
 * Rewards (commission multipliers for the following month):
 * - Top 1: 2.0x (commissions doubled)
 * - Top 2: 1.5x (commissions +50%)
 * - Top 3: 1.15x (commissions +15%)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter, ChatterMonthlyRanking, ChatterCommission } from "../types";
import { getChatterConfig, getMonthlyTopMultiplier } from "../chatterConfig";

// ============================================================================
// TYPES
// ============================================================================

interface MonthlyChatterStats {
  chatterId: string;
  chatterName: string;
  chatterCode: string;
  photoUrl?: string;
  country: string;
  level: 1 | 2 | 3 | 4 | 5;
  monthlyEarnings: number;
  monthlyClients: number;
  monthlyRecruits: number;
}

interface ProcessMonthlyTop3Result {
  success: boolean;
  monthId: string;
  totalChattersRanked: number;
  top3Awarded: number;
  totalBonusesAwarded: number;
  commissionIds: string[];
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(date: Date = new Date()): string {
  const prevMonth = new Date(date);
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);

  const year = prevMonth.getUTCFullYear();
  const month = String(prevMonth.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/**
 * Get the current month in YYYY-MM format
 */
function getCurrentMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/**
 * Get start and end timestamps for a given month (YYYY-MM)
 */
function getMonthBoundaries(monthId: string): { start: Timestamp; end: Timestamp } {
  const [year, month] = monthId.split("-").map(Number);

  // Start: First day of month at 00:00:00 UTC
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

  // End: Last millisecond of the last day of month
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    start: Timestamp.fromDate(startDate),
    end: Timestamp.fromDate(endDate),
  };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate monthly earnings for all active chatters
 */
async function calculateMonthlyRankings(monthId: string): Promise<MonthlyChatterStats[]> {
  const db = getFirestore();
  const { start, end } = getMonthBoundaries(monthId);

  logger.info("[calculateMonthlyRankings] Calculating rankings", {
    monthId,
    startDate: start.toDate().toISOString(),
    endDate: end.toDate().toISOString(),
  });

  // Get all active chatters
  const chattersSnapshot = await db
    .collection("chatters")
    .where("status", "==", "active")
    .get();

  if (chattersSnapshot.empty) {
    logger.warn("[calculateMonthlyRankings] No active chatters found");
    return [];
  }

  const chatterStats: MonthlyChatterStats[] = [];

  // For each chatter, calculate their monthly earnings
  for (const chatterDoc of chattersSnapshot.docs) {
    const chatter = chatterDoc.data() as Chatter;
    const chatterId = chatterDoc.id;

    // Get all commissions for this chatter during the month
    // that are validated, available, or paid (not pending or cancelled)
    const commissionsQuery = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", chatterId)
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", end)
      .get();

    let monthlyEarnings = 0;
    let monthlyClients = 0;
    let monthlyRecruits = 0;

    for (const commissionDoc of commissionsQuery.docs) {
      const commission = commissionDoc.data() as ChatterCommission;

      // Only count commissions that aren't cancelled
      if (commission.status === "cancelled") {
        continue;
      }

      monthlyEarnings += commission.amount;

      // Count clients (client_call, client_referral)
      if (commission.type === "client_call" || commission.type === "client_referral") {
        monthlyClients += 1;
      }

      // Count recruits (activation_bonus indicates a recruit activated)
      if (commission.type === "activation_bonus" || commission.type === "recruitment") {
        monthlyRecruits += 1;
      }
    }

    // Only include chatters with earnings > 0
    if (monthlyEarnings > 0) {
      chatterStats.push({
        chatterId,
        chatterName: `${chatter.firstName} ${chatter.lastName}`,
        chatterCode: chatter.affiliateCodeClient,
        photoUrl: chatter.photoUrl,
        country: chatter.country,
        level: chatter.level,
        monthlyEarnings,
        monthlyClients,
        monthlyRecruits,
      });
    }
  }

  // Sort by monthly earnings (descending)
  chatterStats.sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);

  logger.info("[calculateMonthlyRankings] Rankings calculated", {
    monthId,
    totalChattersWithEarnings: chatterStats.length,
    topEarner: chatterStats[0]?.monthlyEarnings || 0,
  });

  return chatterStats;
}

/**
 * Set commission multipliers for Top 3 performers (applied to next month's commissions)
 *
 * NEW SYSTEM (2026):
 * - Top 1: 2.0x (commissions doubled for the month)
 * - Top 2: 1.5x (commissions +50%)
 * - Top 3: 1.15x (commissions +15%)
 *
 * No cash bonus is created - instead, the multiplier is stored on the chatter
 * and applied when commissions are created during the following month.
 */
async function setTop3Multipliers(
  rankings: MonthlyChatterStats[],
  _monthId: string
): Promise<{ chatterIds: string[]; multipliersSet: number }> {
  const db = getFirestore();
  const config = await getChatterConfig();

  const chatterIds: string[] = [];
  let multipliersSet = 0;

  // Calculate the month when multiplier will be active (current month)
  const activeMonth = getCurrentMonth();

  // Set multipliers for top 3 (if they exist)
  const top3 = rankings.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    const rank = i + 1;
    const chatterStats = top3[i];
    const multiplier = getMonthlyTopMultiplier(rank, config);

    if (multiplier <= 1.0) {
      logger.warn("[setTop3Multipliers] No multiplier configured for rank", { rank });
      continue;
    }

    // Get chatter data
    const chatterDoc = await db.collection("chatters").doc(chatterStats.chatterId).get();

    if (!chatterDoc.exists) {
      logger.error("[setTop3Multipliers] Chatter not found", { chatterId: chatterStats.chatterId });
      continue;
    }

    // Set the multiplier on the chatter for the current month
    await db.collection("chatters").doc(chatterStats.chatterId).update({
      monthlyTopMultiplier: multiplier,
      monthlyTopMultiplierMonth: activeMonth,
      updatedAt: Timestamp.now(),
    });

    // Create notification for chatter
    const notificationRef = db.collection("chatter_notifications").doc();
    const bonusPercentage = Math.round((multiplier - 1) * 100);

    await notificationRef.set({
      id: notificationRef.id,
      chatterId: chatterStats.chatterId,
      type: "system",
      title: `Top ${rank} du mois !`,
      titleTranslations: {
        en: `Top ${rank} of the month!`,
        es: `Top ${rank} del mes!`,
        pt: `Top ${rank} do mês!`,
      },
      message: `Félicitations ! Vous étiez Top ${rank} le mois dernier. Toutes vos commissions ce mois-ci seront majorées de +${bonusPercentage}% !`,
      messageTranslations: {
        en: `Congratulations! You were Top ${rank} last month. All your commissions this month will be boosted by +${bonusPercentage}%!`,
      },
      actionUrl: "/chatter/dashboard",
      isRead: false,
      emailSent: false,
      data: {
        rank,
        multiplier,
        activeMonth,
      },
      createdAt: Timestamp.now(),
    });

    chatterIds.push(chatterStats.chatterId);
    multipliersSet++;

    logger.info("[setTop3Multipliers] Multiplier set", {
      rank,
      chatterId: chatterStats.chatterId,
      chatterName: chatterStats.chatterName,
      multiplier,
      activeMonth,
    });
  }

  return { chatterIds, multipliersSet };
}

// Keep old function name as alias for backwards compatibility
const awardTop3Bonuses = async (
  rankings: MonthlyChatterStats[],
  monthId: string
): Promise<{ commissionIds: string[]; totalAwarded: number }> => {
  const result = await setTop3Multipliers(rankings, monthId);
  // Return compatible format (no commissions created, no cash awarded)
  return { commissionIds: result.chatterIds, totalAwarded: result.multipliersSet };
};

/**
 * Update currentMonthRank for all chatters
 * - Top 3 get their rank (1, 2, or 3)
 * - Others get null (reset)
 * - Also resets multiplier for chatters whose bonus month has expired
 */
async function updateChatterRanks(rankings: MonthlyChatterStats[]): Promise<void> {
  const db = getFirestore();

  // Get top 3 chatter IDs
  const top3Ids = new Set(rankings.slice(0, 3).map((r) => r.chatterId));

  // Current month for multiplier comparison
  const currentMonth = getCurrentMonth();

  // Update all active chatters
  const chattersSnapshot = await db
    .collection("chatters")
    .where("status", "==", "active")
    .get();

  // Use batched writes (max 500 per batch)
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  for (const chatterDoc of chattersSnapshot.docs) {
    const chatterId = chatterDoc.id;
    const chatter = chatterDoc.data() as Chatter;

    // Find rank for this chatter
    const rankIndex = rankings.findIndex((r) => r.chatterId === chatterId);
    const newRank = rankIndex >= 0 && rankIndex < 3 ? rankIndex + 1 : null;

    // Update best rank if applicable
    const updates: Record<string, unknown> = {
      currentMonthRank: newRank,
      updatedAt: Timestamp.now(),
    };

    if (newRank !== null) {
      if (chatter.bestRank === null || newRank < chatter.bestRank) {
        updates.bestRank = newRank;
      }

      // Add badges for top performers
      if (newRank === 1) {
        updates.badges = FieldValue.arrayUnion("top1_monthly");
      }
      if (newRank <= 3) {
        updates.badges = FieldValue.arrayUnion("top3_monthly");
      }
    }

    // Reset multiplier if the bonus month has passed (not the new month being set)
    // Multiplier is set for THIS month, so we reset it if it was set for a previous month
    if (
      chatter.monthlyTopMultiplierMonth &&
      chatter.monthlyTopMultiplierMonth !== currentMonth &&
      !top3Ids.has(chatterId) // Don't reset if they're getting a new multiplier
    ) {
      updates.monthlyTopMultiplier = 1.0;
      updates.monthlyTopMultiplierMonth = null;
    }

    currentBatch.update(db.collection("chatters").doc(chatterId), updates);
    operationCount++;

    // Firestore batch limit is 500
    if (operationCount >= 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
  }

  // Don't forget the last batch
  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches
  for (const batch of batches) {
    await batch.commit();
  }

  logger.info("[updateChatterRanks] Ranks updated", {
    totalUpdated: chattersSnapshot.size,
    top3Ids: Array.from(top3Ids),
  });
}

/**
 * Store the monthly rankings in chatter_monthly_rankings collection
 */
async function storeMonthlyRankings(
  rankings: MonthlyChatterStats[],
  monthId: string,
  commissionIds: string[]
): Promise<void> {
  const db = getFirestore();

  // Prepare rankings with rank numbers (top 100)
  const rankedChatters = rankings.slice(0, 100).map((stats, index) => ({
    rank: index + 1,
    chatterId: stats.chatterId,
    chatterName: stats.chatterName,
    chatterCode: stats.chatterCode,
    photoUrl: stats.photoUrl,
    country: stats.country,
    monthlyEarnings: stats.monthlyEarnings,
    monthlyClients: stats.monthlyClients,
    monthlyRecruits: stats.monthlyRecruits,
    level: stats.level,
  }));

  const monthlyRanking: ChatterMonthlyRanking = {
    id: monthId,
    month: monthId,
    rankings: rankedChatters,
    bonusesAwarded: commissionIds.length > 0,
    bonusCommissionIds: commissionIds,
    calculatedAt: Timestamp.now(),
    isFinalized: true,
  };

  await db.collection("chatter_monthly_rankings").doc(monthId).set(monthlyRanking);

  logger.info("[storeMonthlyRankings] Rankings stored", {
    monthId,
    totalRanked: rankedChatters.length,
    bonusesAwarded: commissionIds.length,
  });
}

/**
 * Main function: Process monthly top 3 rewards
 */
async function processMonthlyTop3Rewards(monthId?: string): Promise<ProcessMonthlyTop3Result> {
  // Use previous month if not specified
  const targetMonth = monthId || getPreviousMonth();

  logger.info("[processMonthlyTop3Rewards] Starting", { monthId: targetMonth });

  try {
    const db = getFirestore();

    // Check if this month was already processed
    const existingRanking = await db
      .collection("chatter_monthly_rankings")
      .doc(targetMonth)
      .get();

    if (existingRanking.exists) {
      const data = existingRanking.data() as ChatterMonthlyRanking;
      if (data.isFinalized && data.bonusesAwarded) {
        logger.warn("[processMonthlyTop3Rewards] Month already processed", {
          monthId: targetMonth,
          bonusesAwarded: data.bonusCommissionIds?.length || 0,
        });
        return {
          success: true,
          monthId: targetMonth,
          totalChattersRanked: data.rankings?.length || 0,
          top3Awarded: data.bonusCommissionIds?.length || 0,
          totalBonusesAwarded: 0,
          commissionIds: data.bonusCommissionIds || [],
          error: "Month already processed",
        };
      }
    }

    // 1. Calculate rankings
    const rankings = await calculateMonthlyRankings(targetMonth);

    if (rankings.length === 0) {
      logger.warn("[processMonthlyTop3Rewards] No rankings to process", { monthId: targetMonth });

      // Store empty ranking
      await storeMonthlyRankings([], targetMonth, []);

      return {
        success: true,
        monthId: targetMonth,
        totalChattersRanked: 0,
        top3Awarded: 0,
        totalBonusesAwarded: 0,
        commissionIds: [],
      };
    }

    // 2. Award bonuses to Top 3
    const { commissionIds, totalAwarded } = await awardTop3Bonuses(rankings, targetMonth);

    // 3. Update chatter ranks for the new month
    await updateChatterRanks(rankings);

    // 4. Store rankings
    await storeMonthlyRankings(rankings, targetMonth, commissionIds);

    logger.info("[processMonthlyTop3Rewards] Completed successfully", {
      monthId: targetMonth,
      totalChattersRanked: rankings.length,
      top3Awarded: commissionIds.length,
      totalBonusesAwarded: totalAwarded,
    });

    return {
      success: true,
      monthId: targetMonth,
      totalChattersRanked: rankings.length,
      top3Awarded: commissionIds.length,
      totalBonusesAwarded: totalAwarded,
      commissionIds,
    };
  } catch (error) {
    logger.error("[processMonthlyTop3Rewards] Error", { monthId: targetMonth, error });
    return {
      success: false,
      monthId: targetMonth,
      totalChattersRanked: 0,
      top3Awarded: 0,
      totalBonusesAwarded: 0,
      commissionIds: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Monthly Top 3 Rewards - Scheduled Function
 *
 * Runs on the 1st of each month at 00:30 UTC
 * - Calculates rankings for the previous month
 * - Awards bonuses to Top 3 performers
 * - Updates currentMonthRank for all chatters
 * - Stores rankings in chatter_monthly_rankings
 */
export const chatterMonthlyTop3Rewards = onSchedule(
  {
    schedule: "30 0 1 * *", // 1st of month at 00:30 UTC
    region: "europe-west3",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 540, // 9 minutes
    retryCount: 3,
  },
  async () => {
    ensureInitialized();
    logger.info("[chatterMonthlyTop3Rewards] Starting scheduled job...");

    try {
      const result = await processMonthlyTop3Rewards();

      if (!result.success) {
        logger.error("[chatterMonthlyTop3Rewards] Job failed", result);
        throw new Error(result.error || "Unknown error");
      }

      logger.info("[chatterMonthlyTop3Rewards] Job completed", result);
    } catch (error) {
      logger.error("[chatterMonthlyTop3Rewards] Unhandled error", { error });
      throw error;
    }
  }
);

// ============================================================================
// EXPORTS FOR TESTING / MANUAL TRIGGER
// ============================================================================

export {
  processMonthlyTop3Rewards,
  calculateMonthlyRankings,
  awardTop3Bonuses,
  setTop3Multipliers,
  updateChatterRanks,
  storeMonthlyRankings,
  getPreviousMonth,
  getCurrentMonth,
  getMonthBoundaries,
};
