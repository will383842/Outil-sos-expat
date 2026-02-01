/**
 * Callable: getChatterDashboard
 *
 * Returns comprehensive dashboard data for the chatter.
 * Includes:
 * - Chatter profile (excluding sensitive data)
 * - Recent commissions
 * - Monthly stats
 * - Upcoming Zoom meetings
 * - Unread notifications count
 * - Relevant config values
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  ChatterCommission,
  ChatterLevel,
  ChatterZoomMeeting,
  GetChatterDashboardResponse,
  REFERRAL_CONFIG,
} from "../types";
import { getChatterConfigCached } from "../utils";
import { getNextTierBonus, getClientEarnings } from "../services/chatterReferralService";
import { getActivePromotions } from "../services/chatterPromotionService";
import {
  getActiveSocialNetworks,
  getChatterSocialLikes,
} from "../services/chatterSocialLikesService";

// Helper function to get week start date (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get month start date
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

// Helper to calculate percentage change
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Helper to estimate time to next level
function estimateTimeToNextLevel(
  currentLevel: ChatterLevel,
  totalEarned: number,
  monthlyPace: number,
  levelThresholds: { level2: number; level3: number; level4: number; level5: number }
): string | null {
  if (currentLevel >= 5) return null;
  if (monthlyPace <= 0) return null;

  const thresholdMap: Record<number, number> = {
    1: levelThresholds.level2,
    2: levelThresholds.level3,
    3: levelThresholds.level4,
    4: levelThresholds.level5,
  };

  const nextThreshold = thresholdMap[currentLevel];
  if (!nextThreshold) return null;

  const amountNeeded = nextThreshold - totalEarned;
  if (amountNeeded <= 0) return null;

  const weeksNeeded = Math.ceil(amountNeeded / (monthlyPace / 4));

  if (weeksNeeded <= 1) return "1 week";
  if (weeksNeeded <= 4) return `${weeksNeeded} weeks`;

  const monthsNeeded = Math.ceil(weeksNeeded / 4);
  if (monthsNeeded <= 1) return "1 month";
  if (monthsNeeded <= 12) return `${monthsNeeded} months`;

  return `${Math.ceil(monthsNeeded / 12)} year${Math.ceil(monthsNeeded / 12) > 1 ? "s" : ""}`;
}

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getChatterDashboard = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetChatterDashboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Update last login
      await db.collection("chatters").doc(userId).update({
        lastLoginAt: Timestamp.now(),
      });

      // 3. Get config
      const config = await getChatterConfigCached();

      // 4. Get recent commissions
      const commissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        return {
          id: doc.id,
          type: data.type,
          amount: data.amount,
          status: data.status,
          description: data.description,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // 5. Calculate monthly stats
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStart = Timestamp.fromDate(firstOfMonth);

      const monthlyCommissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", userId)
        .where("createdAt", ">=", monthStart)
        .get();

      let monthlyEarnings = 0;
      let monthlyClients = 0;
      let monthlyRecruits = 0;

      monthlyCommissionsQuery.docs.forEach((doc) => {
        const data = doc.data() as ChatterCommission;
        // Only count available/paid commissions for earnings
        if (data.status === "available" || data.status === "paid") {
          monthlyEarnings += data.amount;
        }
        if (data.type === "client_referral") {
          monthlyClients++;
        }
        if (data.type === "recruitment") {
          monthlyRecruits++;
        }
      });

      // 6. Get current month rank
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const rankingDoc = await db.collection("chatter_monthly_rankings").doc(monthKey).get();

      let monthlyRank: number | null = null;
      if (rankingDoc.exists) {
        const rankings = rankingDoc.data()?.rankings as Array<{ chatterId: string; rank: number }>;
        const chatterRanking = rankings?.find((r) => r.chatterId === userId);
        monthlyRank = chatterRanking?.rank || null;
      }

      // 6b. Calculate trends, comparison, and forecast
      // Query historical data for last 6 months
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const historicalCommissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", userId)
        .where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo))
        .get();

      const historicalCommissions = historicalCommissionsQuery.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        return {
          type: data.type,
          amount: data.amount,
          status: data.status,
          createdAt: data.createdAt.toDate(),
        };
      });

      // Calculate weekly trends (last 4 weeks)
      const earningsWeekly: number[] = [0, 0, 0, 0];
      const clientsWeekly: number[] = [0, 0, 0, 0];
      const recruitsWeekly: number[] = [0, 0, 0, 0];

      const currentWeekStart = getWeekStart(now);
      for (const commission of historicalCommissions) {
        const commissionWeekStart = getWeekStart(commission.createdAt);
        const weeksDiff = Math.floor(
          (currentWeekStart.getTime() - commissionWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        if (weeksDiff >= 0 && weeksDiff < 4) {
          const weekIndex = 3 - weeksDiff; // Index 3 = current week, 0 = oldest
          if (commission.status === "available" || commission.status === "paid") {
            earningsWeekly[weekIndex] += commission.amount;
          }
          if (commission.type === "client_referral") {
            clientsWeekly[weekIndex]++;
          }
          if (commission.type === "recruitment") {
            recruitsWeekly[weekIndex]++;
          }
        }
      }

      // Calculate monthly trends (last 6 months)
      const earningsMonthly: number[] = [0, 0, 0, 0, 0, 0];

      for (const commission of historicalCommissions) {
        const commissionMonthStart = getMonthStart(commission.createdAt);
        const currentMonthStart = getMonthStart(now);
        const monthsDiff =
          (currentMonthStart.getFullYear() - commissionMonthStart.getFullYear()) * 12 +
          (currentMonthStart.getMonth() - commissionMonthStart.getMonth());

        if (monthsDiff >= 0 && monthsDiff < 6) {
          const monthIndex = 5 - monthsDiff; // Index 5 = current month, 0 = oldest
          if (commission.status === "available" || commission.status === "paid") {
            earningsMonthly[monthIndex] += commission.amount;
          }
        }
      }

      // Calculate previous month stats for comparison
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      let lastMonthEarnings = 0;
      let lastMonthClients = 0;
      let lastMonthRecruits = 0;

      for (const commission of historicalCommissions) {
        if (commission.createdAt >= lastMonthStart && commission.createdAt <= lastMonthEnd) {
          if (commission.status === "available" || commission.status === "paid") {
            lastMonthEarnings += commission.amount;
          }
          if (commission.type === "client_referral") {
            lastMonthClients++;
          }
          if (commission.type === "recruitment") {
            lastMonthRecruits++;
          }
        }
      }

      // Get last month rank for comparison
      const lastMonthKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, "0")}`;
      const lastMonthRankingDoc = await db
        .collection("chatter_monthly_rankings")
        .doc(lastMonthKey)
        .get();

      let lastMonthRank: number | null = null;
      if (lastMonthRankingDoc.exists) {
        const rankings = lastMonthRankingDoc.data()?.rankings as Array<{
          chatterId: string;
          rank: number;
        }>;
        const chatterRanking = rankings?.find((r) => r.chatterId === userId);
        lastMonthRank = chatterRanking?.rank || null;
      }

      // Build trends object
      const trends: GetChatterDashboardResponse["trends"] = {
        earningsWeekly,
        earningsMonthly,
        clientsWeekly,
        recruitsWeekly,
      };

      // Build comparison object
      const comparison: GetChatterDashboardResponse["comparison"] = {
        earningsVsLastMonth: calculatePercentChange(monthlyEarnings, lastMonthEarnings),
        clientsVsLastMonth: calculatePercentChange(monthlyClients, lastMonthClients),
        recruitsVsLastMonth: calculatePercentChange(monthlyRecruits, lastMonthRecruits),
        rankChange:
          monthlyRank !== null && lastMonthRank !== null
            ? lastMonthRank - monthlyRank // Positive = improved (moved up in rank)
            : 0,
      };

      // Build forecast object
      // Calculate estimated monthly earnings based on current pace
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const estimatedMonthlyEarnings =
        dayOfMonth > 0 ? Math.round((monthlyEarnings / dayOfMonth) * daysInMonth) : 0;

      // Calculate time to next level
      const estimatedNextLevel = estimateTimeToNextLevel(
        chatter.level,
        chatter.totalEarned,
        estimatedMonthlyEarnings,
        config.levelThresholds
      );

      // Get potential next tier bonus
      const nextTierBonusInfo = getNextTierBonus(chatter);
      const potentialBonus = nextTierBonusInfo?.bonusAmount || 0;

      const forecast: GetChatterDashboardResponse["forecast"] = {
        estimatedMonthlyEarnings,
        estimatedNextLevel,
        potentialBonus,
      };

      // 7. Get upcoming Zoom meeting
      let upcomingZoomMeeting: GetChatterDashboardResponse["upcomingZoomMeeting"] = null;

      const nowTimestamp = Timestamp.now();
      const zoomQuery = await db
        .collection("chatter_zoom_meetings")
        .where("scheduledAt", ">=", nowTimestamp)
        .where("hasEnded", "==", false)
        .orderBy("scheduledAt", "asc")
        .limit(1)
        .get();

      if (!zoomQuery.empty) {
        const meeting = zoomQuery.docs[0].data() as ChatterZoomMeeting;

        // Check if chatter is eligible for this meeting
        const isEligible =
          meeting.targetAudience === "all" ||
          (meeting.targetAudience === "new_chatters" && chatter.totalCommissions === 0) ||
          (meeting.targetAudience === "top_performers" && (chatter.currentMonthRank || 999) <= 10) ||
          (meeting.targetAudience === "selected" &&
            meeting.selectedChatterIds?.includes(userId)) ||
          (meeting.minimumLevel && chatter.level >= meeting.minimumLevel);

        if (isEligible) {
          upcomingZoomMeeting = {
            id: zoomQuery.docs[0].id,
            title:
              meeting.titleTranslations?.[chatter.language] || meeting.title,
            scheduledAt: meeting.scheduledAt.toDate().toISOString(),
            joinUrl: meeting.joinUrl || meeting.zoomUrl || "",
          };
        }
      }

      // 8. Get unread notifications count
      const notificationsQuery = await db
        .collection("chatter_notifications")
        .where("chatterId", "==", userId)
        .where("isRead", "==", false)
        .count()
        .get();

      const unreadNotifications = notificationsQuery.data().count;

      // 9. Build response
      const response: GetChatterDashboardResponse = {
        chatter: {
          id: chatter.id,
          email: chatter.email,
          firstName: chatter.firstName,
          lastName: chatter.lastName,
          phone: chatter.phone,
          photoUrl: chatter.photoUrl,
          country: chatter.country,
          interventionCountries: chatter.interventionCountries,
          language: chatter.language,
          additionalLanguages: chatter.additionalLanguages,
          platforms: chatter.platforms,
          bio: chatter.bio,
          status: chatter.status,
          level: chatter.level,
          levelProgress: chatter.levelProgress,
          affiliateCodeClient: chatter.affiliateCodeClient,
          affiliateCodeRecruitment: chatter.affiliateCodeRecruitment,
          totalEarned: chatter.totalEarned,
          availableBalance: chatter.availableBalance,
          pendingBalance: chatter.pendingBalance,
          validatedBalance: chatter.validatedBalance,
          totalClients: chatter.totalClients,
          totalRecruits: chatter.totalRecruits,
          totalCommissions: chatter.totalCommissions,
          commissionsByType: chatter.commissionsByType,
          currentStreak: chatter.currentStreak,
          bestStreak: chatter.bestStreak,
          lastActivityDate: chatter.lastActivityDate,
          badges: chatter.badges,
          currentMonthRank: chatter.currentMonthRank,
          bestRank: chatter.bestRank,
          zoomMeetingsAttended: chatter.zoomMeetingsAttended,
          lastZoomAttendance: chatter.lastZoomAttendance,
          quizAttempts: chatter.quizAttempts,
          lastQuizAttempt: chatter.lastQuizAttempt,
          quizPassedAt: chatter.quizPassedAt,
          preferredPaymentMethod: chatter.preferredPaymentMethod,
          pendingWithdrawalId: chatter.pendingWithdrawalId,
          recruitedBy: chatter.recruitedBy,
          recruitedByCode: chatter.recruitedByCode,
          recruitedAt: chatter.recruitedAt,
          recruiterCommissionPaid: chatter.recruiterCommissionPaid,
          // Referral N2 system fields
          parrainNiveau2Id: chatter.parrainNiveau2Id,
          isEarlyAdopter: chatter.isEarlyAdopter,
          earlyAdopterCountry: chatter.earlyAdopterCountry,
          earlyAdopterDate: chatter.earlyAdopterDate,
          qualifiedReferralsCount: chatter.qualifiedReferralsCount,
          referralsN2Count: chatter.referralsN2Count,
          referralEarnings: chatter.referralEarnings,
          referralToClientRatio: chatter.referralToClientRatio,
          threshold10Reached: chatter.threshold10Reached,
          threshold50Reached: chatter.threshold50Reached,
          tierBonusesPaid: chatter.tierBonusesPaid,
          // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
          totalClientCalls: chatter.totalClientCalls || 0,
          isActivated: chatter.isActivated || false,
          activatedAt: chatter.activatedAt || null,
          activationBonusPaid: chatter.activationBonusPaid || false,
          createdAt: chatter.createdAt,
          updatedAt: chatter.updatedAt,
          lastLoginAt: chatter.lastLoginAt,
          // Monthly Top Multiplier (reward for top 3)
          monthlyTopMultiplier: chatter.monthlyTopMultiplier || 1,
          monthlyTopMultiplierMonth: chatter.monthlyTopMultiplierMonth || null,
          // Terms acceptance tracking
          termsAccepted: chatter.termsAccepted || false,
          termsAcceptedAt: chatter.termsAcceptedAt || "",
          termsVersion: chatter.termsVersion || "1.0",
          termsType: chatter.termsType || "terms_chatters",
        },
        recentCommissions,
        monthlyStats: {
          earnings: monthlyEarnings,
          clients: monthlyClients,
          recruits: monthlyRecruits,
          rank: monthlyRank,
        },
        upcomingZoomMeeting,
        unreadNotifications,
        config: {
          commissionClientAmount: config.commissionClientAmount,
          commissionRecruitmentAmount: config.commissionRecruitmentAmount,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
          levelThresholds: config.levelThresholds,
          levelBonuses: config.levelBonuses,
        },
        // Referral system stats
        referralStats: {
          filleulsN1: chatter.totalRecruits,
          qualifiedFilleulsN1: chatter.qualifiedReferralsCount || 0,
          filleulsN2: chatter.referralsN2Count || 0,
          referralEarnings: chatter.referralEarnings || 0,
          nextTierBonus: getNextTierBonus(chatter),
        },
        // Early adopter (Pioneer) status
        earlyAdopter: {
          isEarlyAdopter: chatter.isEarlyAdopter || false,
          country: chatter.earlyAdopterCountry || null,
          multiplier: chatter.isEarlyAdopter ? REFERRAL_CONFIG.EARLY_ADOPTER.MULTIPLIER : 1,
        },
        // Earnings ratio
        earningsRatio: (() => {
          const affiliationEarnings = (chatter.totalEarned || 0) - (chatter.referralEarnings || 0);
          const referralEarnings = chatter.referralEarnings || 0;
          const total = affiliationEarnings + referralEarnings;
          return {
            affiliationEarnings,
            referralEarnings,
            affiliationPercent: total > 0 ? Math.round((affiliationEarnings / total) * 100) : 100,
            referralPercent: total > 0 ? Math.round((referralEarnings / total) * 100) : 0,
          };
        })(),
        // Active promotion
        activePromotion: await (async () => {
          const promos = await getActivePromotions(userId, chatter.country);
          if (promos.length === 0) return null;
          const best = promos.reduce((a, b) => (a.multiplier > b.multiplier ? a : b));
          return {
            id: best.id,
            name: best.name,
            multiplier: best.multiplier,
            endsAt: best.endDate.toDate().toISOString(),
          };
        })(),
        // Piggy Bank - Bonus pending unlock
        piggyBank: await (async () => {
          const clientEarnings = getClientEarnings(chatter);
          const unlockThreshold = REFERRAL_CONFIG.SOCIAL_LIKES.UNLOCK_THRESHOLD; // $100

          // Social likes bonus
          const socialNetworks = await getActiveSocialNetworks();
          const socialLikes = await getChatterSocialLikes(userId);
          const likedNetworkIds = new Set(socialLikes.map(l => l.networkId));

          const socialLikesPending = socialLikes
            .filter(l => !l.bonusPaid)
            .reduce((sum, l) => sum + l.bonusAmount, 0);

          const socialLikesPaid = chatter.socialBonusPaid || 0;
          const socialNetworksTotal = socialNetworks.length;
          const socialNetworksLiked = socialLikes.length;

          // Calculate progress to unlock
          const progressPercent = Math.min(100, Math.round((clientEarnings / unlockThreshold) * 100));
          const amountToUnlock = Math.max(0, unlockThreshold - clientEarnings);
          const isUnlocked = clientEarnings >= unlockThreshold;

          return {
            // Overall unlock status
            isUnlocked,
            clientEarnings,
            unlockThreshold,
            progressPercent,
            amountToUnlock,
            // Social likes details
            socialLikes: {
              networksAvailable: socialNetworksTotal,
              networksLiked: socialNetworksLiked,
              bonusPending: socialLikesPending,
              bonusPaid: socialLikesPaid,
              networks: socialNetworks.map(n => ({
                id: n.id,
                platform: n.platform,
                label: n.label,
                url: n.url,
                bonusAmount: n.bonusAmount,
                liked: likedNetworkIds.has(n.id),
              })),
            },
            // Total pending in piggy bank
            totalPending: socialLikesPending,
            // Message for UI
            message: isUnlocked
              ? socialLikesPending > 0
                ? `${(socialLikesPending / 100).toFixed(0)}$ de bonus likes en attente de paiement`
                : "Tirelire vide - likez nos reseaux pour gagner des bonus !"
              : `Encore ${(amountToUnlock / 100).toFixed(0)}$ de ventes pour debloquer ${(socialLikesPending / 100).toFixed(0)}$ de bonus`,
          };
        })(),
        // Historical trends for charts
        trends,
        // Comparison with previous period
        comparison,
        // Forecast based on current pace
        forecast,
      };

      logger.info("[getChatterDashboard] Dashboard data returned", {
        chatterId: userId,
        status: chatter.status,
        level: chatter.level,
        availableBalance: chatter.availableBalance,
      });

      return response;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getChatterDashboard] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get dashboard data");
    }
  }
);
