/**
 * Blogger Commission Service
 *
 * Core business logic for blogger commission management:
 * - Creating commissions (FIXED amounts, NO bonuses/multipliers)
 * - Validating commissions after hold period
 * - Releasing commissions to available balance
 * - Handling cancellations
 * - Badge management (simplified)
 * - Streak tracking
 *
 * KEY DIFFERENCES FROM CHATTER:
 * - NO level bonuses
 * - NO top 3 bonuses
 * - NO zoom bonuses
 * - FIXED commission amounts only
 * - 12 simplified badges
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Blogger,
  BloggerCommission,
  BloggerCommissionType,
  BloggerBadgeType,
} from "../types";
import {
  getBloggerConfigCached,
  getValidationDelayMs,
  getReleaseDelayMs,
} from "../utils/bloggerConfigService";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBloggerCommissionInput {
  bloggerId: string;
  type: BloggerCommissionType;
  source: {
    id: string | null;
    type: "call_session" | "user" | "provider" | null;
    details?: {
      clientId?: string;
      clientEmail?: string;
      callSessionId?: string;
      callDuration?: number;
      connectionFee?: number;
      providerId?: string;
      providerEmail?: string;
      providerType?: "lawyer" | "expat";
      callId?: string;
      recruitmentDate?: string;
      monthsRemaining?: number;
      adjustmentReason?: string;
    };
  };
  baseAmount?: number; // Override base amount (otherwise use config)
  description?: string;
}

export interface CreateBloggerCommissionResult {
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
 * Create a new commission for a blogger
 * NOTE: FIXED amounts only, no bonuses or multipliers
 */
export async function createBloggerCommission(
  input: CreateBloggerCommissionInput
): Promise<CreateBloggerCommissionResult> {
  const db = getFirestore();
  const { bloggerId, type, source, baseAmount: inputBaseAmount, description } = input;

  try {
    // 1. Get blogger data
    const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

    if (!bloggerDoc.exists) {
      return { success: false, error: "Blogger not found" };
    }

    const blogger = bloggerDoc.data() as Blogger;

    // 2. Check blogger status
    if (blogger.status !== "active") {
      return {
        success: false,
        error: "Blogger is not active",
        reason: `Status: ${blogger.status}`,
      };
    }

    // 3. Get config
    const config = await getBloggerConfigCached();

    if (!config.isSystemActive) {
      return { success: false, error: "Blogger system is not active" };
    }

    // 4. Calculate amount (FIXED - NO BONUSES)
    let amount: number;

    if (inputBaseAmount !== undefined) {
      amount = inputBaseAmount;
    } else {
      switch (type) {
        case "client_referral":
          amount = config.commissionClientAmount;
          break;
        case "recruitment":
          amount = config.commissionRecruitmentAmount;
          break;
        case "manual_adjustment":
          amount = 0; // Must be provided via inputBaseAmount
          break;
        default:
          amount = 0;
      }
    }

    if (amount <= 0 && type !== "manual_adjustment") {
      return { success: false, error: "Invalid commission amount" };
    }

    // 4b. Duplicate check (same sourceId + bloggerId + type)
    if (source.id) {
      const duplicateCheck = await db
        .collection("blogger_commissions")
        .where("bloggerId", "==", bloggerId)
        .where("type", "==", type)
        .where("sourceId", "==", source.id)
        .limit(1)
        .get();

      if (!duplicateCheck.empty) {
        logger.warn("[createBloggerCommission] Duplicate commission detected", {
          bloggerId,
          type,
          sourceId: source.id,
          existingCommissionId: duplicateCheck.docs[0].id,
        });
        return { success: false, error: "Commission already exists for this action" };
      }
    }

    // 5. Create timestamp
    const now = Timestamp.now();

    // 6. Create commission document
    const commissionRef = db.collection("blogger_commissions").doc();

    const commission: BloggerCommission = {
      id: commissionRef.id,
      bloggerId,
      bloggerEmail: blogger.email,
      bloggerCode: blogger.affiliateCodeClient,
      type,
      sourceId: source.id,
      sourceType: source.type,
      sourceDetails: source.details,
      amount, // FIXED amount, no bonuses
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

    // 7. Update blogger balances and stats in transaction
    await db.runTransaction(async (transaction) => {
      const bloggerRef = db.collection("bloggers").doc(bloggerId);
      const freshBlogger = await transaction.get(bloggerRef);

      if (!freshBlogger.exists) {
        throw new Error("Blogger not found in transaction");
      }

      const currentData = freshBlogger.data() as Blogger;

      // Calculate new stats
      const newPendingBalance = currentData.pendingBalance + amount;
      const newTotalCommissions = currentData.totalCommissions + 1;

      // Update client/recruit counts
      let newTotalClients = currentData.totalClients;
      let newTotalRecruits = currentData.totalRecruits;

      if (type === "client_referral") {
        newTotalClients += 1;
      } else if (type === "recruitment") {
        newTotalRecruits += 1;
      }

      // Update monthly stats
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      let monthlyStats = { ...currentData.currentMonthStats };

      if (monthlyStats.month !== currentMonth) {
        // Reset monthly stats for new month
        monthlyStats = {
          clients: 0,
          recruits: 0,
          earnings: 0,
          month: currentMonth,
        };
      }

      if (type === "client_referral") {
        monthlyStats.clients += 1;
      } else if (type === "recruitment") {
        monthlyStats.recruits += 1;
      }
      monthlyStats.earnings += amount;

      // Update streak
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

      // Update blogger
      transaction.update(bloggerRef, {
        pendingBalance: newPendingBalance,
        totalCommissions: newTotalCommissions,
        totalClients: newTotalClients,
        totalRecruits: newTotalRecruits,
        currentMonthStats: monthlyStats,
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastActivityDate: today,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("[createBloggerCommission] Commission created", {
      commissionId: commissionRef.id,
      bloggerId,
      type,
      amount, // FIXED, no bonus breakdown
    });

    // Check and award badges
    await checkAndAwardBadges(bloggerId);

    return {
      success: true,
      commissionId: commissionRef.id,
      amount,
    };
  } catch (error) {
    logger.error("[createBloggerCommission] Error", { bloggerId, type, error });
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
  type: BloggerCommissionType,
  details?: CreateBloggerCommissionInput["source"]["details"]
): string {
  switch (type) {
    case "client_referral":
      return `Commission client référé${details?.clientEmail ? ` (${maskEmail(details.clientEmail)})` : ""}`;
    case "recruitment":
      return `Commission recrutement prestataire${details?.providerEmail ? ` (${maskEmail(details.providerEmail)})` : ""}`;
    case "manual_adjustment":
      return details?.adjustmentReason || "Ajustement manuel";
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
export async function validateBloggerCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("blogger_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as BloggerCommission;

    if (commission.status !== "pending") {
      return { success: false, error: `Invalid status: ${commission.status}` };
    }

    const config = await getBloggerConfigCached();
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

      // Move from pending to validated in blogger balances
      const bloggerRef = db.collection("bloggers").doc(commission.bloggerId);
      const bloggerDoc = await transaction.get(bloggerRef);

      if (bloggerDoc.exists) {
        const blogger = bloggerDoc.data() as Blogger;
        transaction.update(bloggerRef, {
          pendingBalance: Math.max(0, blogger.pendingBalance - commission.amount),
          validatedBalance: blogger.validatedBalance + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[validateBloggerCommission] Commission validated", {
      commissionId,
      bloggerId: commission.bloggerId,
      amount: commission.amount,
    });

    return { success: true };
  } catch (error) {
    logger.error("[validateBloggerCommission] Error", { commissionId, error });
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
export async function releaseBloggerCommission(
  commissionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("blogger_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as BloggerCommission;

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

      // Move from validated to available in blogger balances
      // Also add to totalEarned
      const bloggerRef = db.collection("bloggers").doc(commission.bloggerId);
      const bloggerDoc = await transaction.get(bloggerRef);

      if (bloggerDoc.exists) {
        const blogger = bloggerDoc.data() as Blogger;
        transaction.update(bloggerRef, {
          validatedBalance: Math.max(0, blogger.validatedBalance - commission.amount),
          availableBalance: blogger.availableBalance + commission.amount,
          totalEarned: blogger.totalEarned + commission.amount,
          updatedAt: now,
        });
      }
    });

    logger.info("[releaseBloggerCommission] Commission released", {
      commissionId,
      bloggerId: commission.bloggerId,
      amount: commission.amount,
    });

    // Check for new badges based on earnings
    await checkAndAwardBadges(commission.bloggerId);

    return { success: true };
  } catch (error) {
    logger.error("[releaseBloggerCommission] Error", { commissionId, error });
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
 * P0 FIX 2026-02-12: Cancel all blogger commissions related to a call session
 */
export async function cancelBloggerCommissionsForCallSession(
  callSessionId: string,
  reason: string,
  cancelledBy: string = "system"
): Promise<{ success: boolean; cancelledCount: number; errors: string[] }> {
  const db = getFirestore();
  const errors: string[] = [];
  let cancelledCount = 0;

  try {
    const commissionsQuery = await db
      .collection("blogger_commissions")
      .where("sourceId", "==", callSessionId)
      .get();

    const commissionsQuery2 = await db
      .collection("blogger_commissions")
      .where("sourceDetails.callSessionId", "==", callSessionId)
      .get();

    const allCommissions = [...commissionsQuery.docs, ...commissionsQuery2.docs];
    const uniqueCommissions = new Map();
    for (const doc of allCommissions) {
      uniqueCommissions.set(doc.id, doc);
    }

    logger.info("[blogger.cancelCommissionsForCallSession] Found commissions", {
      callSessionId,
      count: uniqueCommissions.size,
    });

    for (const [commissionId, doc] of uniqueCommissions.entries()) {
      const commission = doc.data() as BloggerCommission;

      if (commission.status === "cancelled" || commission.status === "paid") {
        continue;
      }

      const result = await cancelBloggerCommission(commissionId, reason, cancelledBy);

      if (result.success) {
        cancelledCount++;
      } else {
        errors.push(`${commissionId}: ${result.error || "Unknown error"}`);
      }
    }

    logger.info("[blogger.cancelCommissionsForCallSession] Complete", {
      callSessionId,
      cancelledCount,
      errorsCount: errors.length,
    });

    return { success: errors.length === 0, cancelledCount, errors };
  } catch (error) {
    logger.error("[blogger.cancelCommissionsForCallSession] Error", {
      callSessionId,
      error,
    });
    return {
      success: false,
      cancelledCount,
      errors: [error instanceof Error ? error.message : "Failed to cancel commissions"],
    };
  }
}

/**
 * Cancel a commission (admin action or refund)
 */
export async function cancelBloggerCommission(
  commissionId: string,
  reason: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("blogger_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as BloggerCommission;

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

      // Update blogger balances
      const bloggerRef = db.collection("bloggers").doc(commission.bloggerId);
      const bloggerDoc = await transaction.get(bloggerRef);

      if (bloggerDoc.exists) {
        const blogger = bloggerDoc.data() as Blogger;
        const updates: Record<string, unknown> = { updatedAt: now };

        // Deduct from appropriate balance based on previous status
        switch (commission.status) {
          case "pending":
            updates.pendingBalance = Math.max(0, blogger.pendingBalance - commission.amount);
            break;
          case "validated":
            updates.validatedBalance = Math.max(0, blogger.validatedBalance - commission.amount);
            break;
          case "available":
            updates.availableBalance = Math.max(0, blogger.availableBalance - commission.amount);
            updates.totalEarned = Math.max(0, blogger.totalEarned - commission.amount);
            break;
        }

        transaction.update(bloggerRef, updates);
      }
    });

    logger.info("[cancelBloggerCommission] Commission cancelled", {
      commissionId,
      bloggerId: commission.bloggerId,
      amount: commission.amount,
      reason,
      cancelledBy,
    });

    return { success: true };
  } catch (error) {
    logger.error("[cancelBloggerCommission] Error", { commissionId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel commission",
    };
  }
}

// ============================================================================
// BADGE MANAGEMENT (SIMPLIFIED - 12 BADGES)
// ============================================================================

/**
 * Check and award badges for a blogger
 * 12 simplified badges (vs ~20 for chatters)
 */
export async function checkAndAwardBadges(bloggerId: string): Promise<{
  badgesAwarded: BloggerBadgeType[];
}> {
  const db = getFirestore();
  const badgesAwarded: BloggerBadgeType[] = [];

  try {
    const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

    if (!bloggerDoc.exists) {
      return { badgesAwarded };
    }

    const blogger = bloggerDoc.data() as Blogger;
    const currentBadges = new Set(blogger.badges || []);
    const newBadges: BloggerBadgeType[] = [];

    // First conversion badge
    if (blogger.totalClients >= 1 && !currentBadges.has("first_conversion")) {
      newBadges.push("first_conversion");
    }

    // Earnings badges
    const earningsInDollars = blogger.totalEarned / 100;
    if (earningsInDollars >= 100 && !currentBadges.has("earnings_100")) {
      newBadges.push("earnings_100");
    }
    if (earningsInDollars >= 500 && !currentBadges.has("earnings_500")) {
      newBadges.push("earnings_500");
    }
    if (earningsInDollars >= 1000 && !currentBadges.has("earnings_1000")) {
      newBadges.push("earnings_1000");
    }
    if (earningsInDollars >= 5000 && !currentBadges.has("earnings_5000")) {
      newBadges.push("earnings_5000");
    }

    // Recruitment badges
    if (blogger.totalRecruits >= 1 && !currentBadges.has("recruit_1")) {
      newBadges.push("recruit_1");
    }
    if (blogger.totalRecruits >= 10 && !currentBadges.has("recruit_10")) {
      newBadges.push("recruit_10");
    }

    // Streak badges
    if (blogger.currentStreak >= 7 && !currentBadges.has("streak_7")) {
      newBadges.push("streak_7");
    }
    if (blogger.currentStreak >= 30 && !currentBadges.has("streak_30")) {
      newBadges.push("streak_30");
    }

    // Ranking badges are awarded separately via updateMonthlyRankings

    if (newBadges.length > 0) {
      // Update blogger with new badges
      await db.collection("bloggers").doc(bloggerId).update({
        badges: FieldValue.arrayUnion(...newBadges),
        updatedAt: Timestamp.now(),
      });

      // Create badge award records
      const batch = db.batch();
      const now = Timestamp.now();

      for (const badgeType of newBadges) {
        const awardRef = db.collection("blogger_badge_awards").doc();
        batch.set(awardRef, {
          id: awardRef.id,
          bloggerId,
          bloggerEmail: blogger.email,
          badgeType,
          awardedAt: now,
          context: getBadgeContext(badgeType, blogger),
        });
      }

      await batch.commit();

      badgesAwarded.push(...newBadges);

      logger.info("[checkAndAwardBadges] Badges awarded", {
        bloggerId,
        newBadges,
      });
    }

    return { badgesAwarded };
  } catch (error) {
    logger.error("[checkAndAwardBadges] Error", { bloggerId, error });
    return { badgesAwarded };
  }
}

/**
 * Get context for a badge award
 */
function getBadgeContext(
  badgeType: BloggerBadgeType,
  blogger: Blogger
): Record<string, unknown> {
  switch (badgeType) {
    case "first_conversion":
      return { clientCount: blogger.totalClients };
    case "earnings_100":
    case "earnings_500":
    case "earnings_1000":
    case "earnings_5000":
      return { totalEarned: blogger.totalEarned };
    case "recruit_1":
    case "recruit_10":
      return { recruitCount: blogger.totalRecruits };
    case "streak_7":
    case "streak_30":
      return { streakDays: blogger.currentStreak };
    case "top10":
    case "top3":
    case "top1":
      return {
        rank: blogger.currentMonthRank,
        month: blogger.currentMonthStats.month,
      };
    default:
      return {};
  }
}

/**
 * Award ranking badges (called from monthly ranking update)
 */
export async function awardRankingBadge(
  bloggerId: string,
  rank: number,
  month: string
): Promise<{ success: boolean; badgeType?: BloggerBadgeType }> {
  const db = getFirestore();

  try {
    const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

    if (!bloggerDoc.exists) {
      return { success: false };
    }

    const blogger = bloggerDoc.data() as Blogger;
    let badgeType: BloggerBadgeType | null = null;

    // Determine badge based on rank
    if (rank === 1) {
      badgeType = "top1";
    } else if (rank <= 3) {
      badgeType = "top3";
    } else if (rank <= 10) {
      badgeType = "top10";
    }

    if (!badgeType) {
      return { success: false };
    }

    // Check if already has this badge
    if (blogger.badges.includes(badgeType)) {
      return { success: true, badgeType }; // Already has it
    }

    // Award badge
    await db.collection("bloggers").doc(bloggerId).update({
      badges: FieldValue.arrayUnion(badgeType),
      updatedAt: Timestamp.now(),
    });

    // Create badge award record
    await db.collection("blogger_badge_awards").add({
      bloggerId,
      bloggerEmail: blogger.email,
      badgeType,
      awardedAt: Timestamp.now(),
      context: { rank, month },
    });

    logger.info("[awardRankingBadge] Badge awarded", {
      bloggerId,
      badgeType,
      rank,
      month,
    });

    return { success: true, badgeType };
  } catch (error) {
    logger.error("[awardRankingBadge] Error", { bloggerId, rank, error });
    return { success: false };
  }
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

/**
 * Update streak for a blogger (called when activity happens)
 * Note: This is also done in createBloggerCommission, but can be called separately
 */
export async function updateBloggerStreak(bloggerId: string): Promise<{
  success: boolean;
  currentStreak?: number;
  bestStreak?: number;
}> {
  const db = getFirestore();

  try {
    const bloggerRef = db.collection("bloggers").doc(bloggerId);
    const bloggerDoc = await bloggerRef.get();

    if (!bloggerDoc.exists) {
      return { success: false };
    }

    const blogger = bloggerDoc.data() as Blogger;
    const today = new Date().toISOString().split("T")[0];

    if (blogger.lastActivityDate === today) {
      // Already updated today
      return {
        success: true,
        currentStreak: blogger.currentStreak,
        bestStreak: blogger.bestStreak,
      };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak: number;
    let newBestStreak = blogger.bestStreak;

    if (blogger.lastActivityDate === yesterdayStr) {
      // Continue streak
      newStreak = blogger.currentStreak + 1;
      if (newStreak > newBestStreak) {
        newBestStreak = newStreak;
      }
    } else {
      // Reset streak
      newStreak = 1;
    }

    await bloggerRef.update({
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      lastActivityDate: today,
      updatedAt: Timestamp.now(),
    });

    // Check for streak badges
    await checkAndAwardBadges(bloggerId);

    return {
      success: true,
      currentStreak: newStreak,
      bestStreak: newBestStreak,
    };
  } catch (error) {
    logger.error("[updateBloggerStreak] Error", { bloggerId, error });
    return { success: false };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Validate all pending commissions past their hold period
 */
export async function validatePendingBloggerCommissions(): Promise<{
  validated: number;
  errors: number;
}> {
  const db = getFirestore();
  const config = await getBloggerConfigCached();

  const holdPeriodMs = getValidationDelayMs(config);
  const cutoffTime = Timestamp.fromMillis(Date.now() - holdPeriodMs);

  const pendingQuery = await db
    .collection("blogger_commissions")
    .where("status", "==", "pending")
    .where("createdAt", "<=", cutoffTime)
    .limit(100)
    .get();

  let validated = 0;
  let errors = 0;

  for (const doc of pendingQuery.docs) {
    const result = await validateBloggerCommission(doc.id);
    if (result.success) {
      validated++;
    } else {
      errors++;
    }
  }

  logger.info("[validatePendingBloggerCommissions] Batch complete", {
    validated,
    errors,
    total: pendingQuery.size,
  });

  return { validated, errors };
}

/**
 * Release all validated commissions past their release delay
 */
export async function releaseValidatedBloggerCommissions(): Promise<{
  released: number;
  errors: number;
}> {
  const db = getFirestore();
  const now = Timestamp.now();

  const validatedQuery = await db
    .collection("blogger_commissions")
    .where("status", "==", "validated")
    .where("availableAt", "<=", now)
    .limit(100)
    .get();

  let released = 0;
  let errors = 0;

  for (const doc of validatedQuery.docs) {
    const result = await releaseBloggerCommission(doc.id);
    if (result.success) {
      released++;
    } else {
      errors++;
    }
  }

  logger.info("[releaseValidatedBloggerCommissions] Batch complete", {
    released,
    errors,
    total: validatedQuery.size,
  });

  return { released, errors };
}

/**
 * Update monthly rankings
 */
export async function updateBloggerMonthlyRankings(): Promise<{
  success: boolean;
  rankingsUpdated: number;
}> {
  const db = getFirestore();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    // Get all active bloggers sorted by monthly earnings
    const bloggersQuery = await db
      .collection("bloggers")
      .where("status", "==", "active")
      .get();

    // Filter and sort by current month earnings
    const bloggersWithStats = bloggersQuery.docs
      .map(doc => {
        const data = doc.data() as Blogger;
        const monthlyEarnings = data.currentMonthStats?.month === currentMonth
          ? data.currentMonthStats.earnings
          : 0;
        return { id: doc.id, data, monthlyEarnings };
      })
      .filter(b => b.monthlyEarnings > 0)
      .sort((a, b) => b.monthlyEarnings - a.monthlyEarnings)
      .slice(0, 10); // Top 10 only

    // Update rankings document
    const rankings = bloggersWithStats.map((b, index) => ({
      rank: index + 1,
      bloggerId: b.id,
      bloggerName: `${b.data.firstName} ${b.data.lastName}`,
      bloggerCode: b.data.affiliateCodeClient,
      photoUrl: b.data.photoUrl || undefined,
      country: b.data.country,
      blogUrl: b.data.blogUrl,
      monthlyEarnings: b.monthlyEarnings,
      monthlyClients: b.data.currentMonthStats?.clients || 0,
      monthlyRecruits: b.data.currentMonthStats?.recruits || 0,
    }));

    const rankingRef = db.collection("blogger_monthly_rankings").doc(currentMonth);
    await rankingRef.set({
      id: currentMonth,
      month: currentMonth,
      rankings,
      calculatedAt: Timestamp.now(),
      isFinalized: false,
    });

    // Pre-build a map of bloggerId → current bestRank to avoid O(n²) lookups
    const bestRankMap = new Map<string, number | null>();
    for (const b of bloggersWithStats) {
      bestRankMap.set(b.id, b.data.bestRank ?? null);
    }

    // Update individual blogger ranks and award badges
    const batch = db.batch();

    for (const ranking of rankings) {
      const bloggerRef = db.collection("bloggers").doc(ranking.bloggerId);
      const previousBestRank = bestRankMap.get(ranking.bloggerId) ?? null;
      const newBestRank = previousBestRank === null || ranking.rank < previousBestRank
        ? ranking.rank
        : previousBestRank;
      batch.update(bloggerRef, {
        currentMonthRank: ranking.rank,
        bestRank: newBestRank,
        updatedAt: Timestamp.now(),
      });

      // Award ranking badges
      await awardRankingBadge(ranking.bloggerId, ranking.rank, currentMonth);
    }

    await batch.commit();

    logger.info("[updateBloggerMonthlyRankings] Rankings updated", {
      month: currentMonth,
      totalRanked: rankings.length,
    });

    return {
      success: true,
      rankingsUpdated: rankings.length,
    };
  } catch (error) {
    logger.error("[updateBloggerMonthlyRankings] Error", { error });
    return { success: false, rankingsUpdated: 0 };
  }
}
