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
  DEFAULT_CHATTER_CONFIG,
} from "../types";
import { getChatterConfigCached } from "../utils";
import { getNextTierBonus, getClientEarnings } from "../services/chatterReferralService";
import { getActivePromotions } from "../services/chatterPromotionService";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";
import { getWithdrawalFee } from "../../services/feeCalculationService";

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
    region: "us-central1",
    memory: "512MiB",  // FIX: 256MiB OOM (261MiB used at runtime)
    cpu: 0.5,          // Required when memory > 256MiB
    timeoutSeconds: 30,
    maxInstances: 10,  // Reduced from 20 to save quota
    minInstances: 0,   // Reduced from 1 to free quota in us-central1
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetChatterDashboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Support 2-level payload: 'essential' skips heavy trend calculations
    const level: "essential" | "full" = request.data?.level === "essential" ? "essential" : "full";

    try {
      // 2. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Update last login (fire-and-forget, don't block the response)
      db.collection("chatters").doc(userId).update({
        lastLoginAt: Timestamp.now(),
      }).catch(() => {});

      // 3. Run all independent queries in parallel
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, "0")}`;
      const nowTimestamp = Timestamp.now();

      const [
        config,
        commissionsQuery,
        historicalCommissionsQuery,
        rankingDoc,
        lastMonthRankingDoc,
        zoomQuery,
        notificationsQuery,
        withdrawalFee,
        activePromotions,
        recruiterDoc,
      ] = await Promise.all([
        // Config (cached)
        getChatterConfigCached(),
        // Recent commissions (limited to 10)
        db.collection("chatter_commissions")
          .where("chatterId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get(),
        // Historical commissions for trends (last 6 months) — skip in essential mode
        level === "full"
          ? db.collection("chatter_commissions")
              .where("chatterId", "==", userId)
              .where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo))
              .orderBy("createdAt", "desc")
              .limit(150)
              .get()
          : Promise.resolve({ docs: [] } as unknown as FirebaseFirestore.QuerySnapshot),
        // Current month ranking
        db.collection("chatter_monthly_rankings").doc(monthKey).get(),
        // Last month ranking
        db.collection("chatter_monthly_rankings").doc(lastMonthKey).get(),
        // Upcoming Zoom meeting
        db.collection("chatter_zoom_meetings")
          .where("scheduledAt", ">=", nowTimestamp)
          .where("hasEnded", "==", false)
          .orderBy("scheduledAt", "asc")
          .limit(1)
          .get(),
        // Unread notifications count
        db.collection("chatter_notifications")
          .where("chatterId", "==", userId)
          .where("isRead", "==", false)
          .count()
          .get(),
        // Withdrawal fee
        getWithdrawalFee().then(f => f.fixedFee * 100).catch(() => 300),
        // Active promotions
        getActivePromotions(userId, chatter.country),
        // Recruiter info (if recruited)
        chatter.recruitedBy
          ? db.collection("chatters").doc(chatter.recruitedBy).get()
          : Promise.resolve(null),
      ]);

      // Recruiter info
      const recruiterData = recruiterDoc?.exists ? recruiterDoc.data() : null;
      const recruiterName = recruiterData
        ? [recruiterData.firstName, recruiterData.lastName].filter(Boolean).join(" ") || recruiterData.email || null
        : null;
      const recruiterPhoto = recruiterData?.profilePhoto || recruiterData?.photoURL || null;

      // 4. Process recent commissions
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

      // 5. Calculate monthly stats from historical data (filter in memory)
      let monthlyEarnings = 0;
      let monthlyClients = 0;
      let monthlyRecruits = 0;

      // 5b. Process historical commissions in a single pass for all stats
      const historicalCommissions = historicalCommissionsQuery.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        return {
          type: data.type,
          amount: data.amount,
          status: data.status,
          createdAt: data.createdAt.toDate(),
        };
      });

      const earningsWeekly: number[] = [0, 0, 0, 0];
      const clientsWeekly: number[] = [0, 0, 0, 0];
      const recruitsWeekly: number[] = [0, 0, 0, 0];
      const earningsMonthly: number[] = [0, 0, 0, 0, 0, 0];

      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      let lastMonthEarnings = 0;
      let lastMonthClients = 0;
      let lastMonthRecruits = 0;

      const currentWeekStart = getWeekStart(now);
      const currentMonthStart = getMonthStart(now);

      // Single pass over all historical commissions
      for (const commission of historicalCommissions) {
        const isEarning = commission.status === "available" || commission.status === "paid";
        const isClient = commission.type === "client_referral" || commission.type === "client_call";
        const isRecruit = commission.type === "recruitment" || commission.type === "activation_bonus" || commission.type === "n1_recruit_bonus";

        // Monthly stats (current month)
        if (commission.createdAt >= firstOfMonth) {
          if (isEarning) monthlyEarnings += commission.amount;
          if (isClient) monthlyClients++;
          if (isRecruit) monthlyRecruits++;
        }

        // Weekly trends (last 4 weeks)
        const commissionWeekStart = getWeekStart(commission.createdAt);
        const weeksDiff = Math.floor(
          (currentWeekStart.getTime() - commissionWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksDiff >= 0 && weeksDiff < 4) {
          const weekIndex = 3 - weeksDiff;
          if (isEarning) earningsWeekly[weekIndex] += commission.amount;
          if (isClient) clientsWeekly[weekIndex]++;
          if (isRecruit) recruitsWeekly[weekIndex]++;
        }

        // Monthly trends (last 6 months)
        const commissionMonthStart = getMonthStart(commission.createdAt);
        const monthsDiff =
          (currentMonthStart.getFullYear() - commissionMonthStart.getFullYear()) * 12 +
          (currentMonthStart.getMonth() - commissionMonthStart.getMonth());
        if (monthsDiff >= 0 && monthsDiff < 6) {
          const monthIndex = 5 - monthsDiff;
          if (isEarning) earningsMonthly[monthIndex] += commission.amount;
        }

        // Last month comparison
        if (commission.createdAt >= lastMonthStart && commission.createdAt <= lastMonthEnd) {
          if (isEarning) lastMonthEarnings += commission.amount;
          if (isClient) lastMonthClients++;
          if (isRecruit) lastMonthRecruits++;
        }
      }

      // 6. Process rankings (already fetched in parallel)
      let monthlyRank: number | null = null;
      if (rankingDoc.exists) {
        const rankings = rankingDoc.data()?.rankings as Array<{ chatterId: string; rank: number }>;
        const chatterRanking = rankings?.find((r) => r.chatterId === userId);
        monthlyRank = chatterRanking?.rank || null;
      }

      let lastMonthRank: number | null = null;
      if (lastMonthRankingDoc.exists) {
        const rankings = lastMonthRankingDoc.data()?.rankings as Array<{
          chatterId: string;
          rank: number;
        }>;
        const chatterRanking = rankings?.find((r) => r.chatterId === userId);
        lastMonthRank = chatterRanking?.rank || null;
      }

      // Build trends, comparison, forecast (heavy — only in 'full' mode)
      let trends: GetChatterDashboardResponse["trends"] | null = null;
      let comparison: GetChatterDashboardResponse["comparison"] | null = null;
      let forecast: GetChatterDashboardResponse["forecast"] | null = null;

      if (level === "full") {
        trends = {
          earningsWeekly,
          earningsMonthly,
          clientsWeekly,
          recruitsWeekly,
        };

        comparison = {
          earningsVsLastMonth: calculatePercentChange(monthlyEarnings, lastMonthEarnings),
          clientsVsLastMonth: calculatePercentChange(monthlyClients, lastMonthClients),
          recruitsVsLastMonth: calculatePercentChange(monthlyRecruits, lastMonthRecruits),
          rankChange:
            monthlyRank !== null && lastMonthRank !== null
              ? lastMonthRank - monthlyRank
              : 0,
          lastMonth: {
            earnings: lastMonthEarnings,
            clients: lastMonthClients,
            recruits: lastMonthRecruits,
          },
        };

        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const estimatedMonthlyEarnings =
          dayOfMonth > 0 ? Math.round((monthlyEarnings / dayOfMonth) * daysInMonth) : 0;

        const estimatedNextLevel = estimateTimeToNextLevel(
          chatter.level,
          chatter.totalEarned,
          estimatedMonthlyEarnings,
          config.levelThresholds
        );

        const nextTierBonusInfo = getNextTierBonus(chatter);
        const potentialBonus = nextTierBonusInfo?.bonusAmount || 0;

        forecast = {
          estimatedMonthlyEarnings,
          estimatedNextLevel,
          potentialBonus,
          currentDayOfMonth: dayOfMonth,
        };
      }

      // 7. Process Zoom meeting (already fetched in parallel)
      let upcomingZoomMeeting: GetChatterDashboardResponse["upcomingZoomMeeting"] = null;

      if (!zoomQuery.empty) {
        const meeting = zoomQuery.docs[0].data() as ChatterZoomMeeting;
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

      // 8. Unread notifications (already fetched in parallel)
      const unreadNotifications = notificationsQuery.data().count;

      // 8b. Self-healing: generate affiliateCodeProvider if missing (pre-migration chatters)
      let affiliateCodeProvider = chatter.affiliateCodeProvider;
      if (!affiliateCodeProvider && chatter.affiliateCodeClient) {
        affiliateCodeProvider = `PROV-${chatter.affiliateCodeClient}`;
        // Write back to Firestore (fire-and-forget, don't block response)
        db.collection("chatters").doc(uid).update({
          affiliateCodeProvider,
          updatedAt: Timestamp.now(),
        }).catch((err: unknown) => {
          logger.warn("[getChatterDashboard] Self-healing affiliateCodeProvider failed", { uid, error: err });
        });
        logger.info("[getChatterDashboard] Self-healed affiliateCodeProvider", { uid, affiliateCodeProvider });
      }

      // 9. Build response
      const response: GetChatterDashboardResponse = {
        chatter: {
          id: chatter.id,
          email: chatter.email,
          firstName: chatter.firstName,
          lastName: chatter.lastName,
          phone: chatter.phone,
          whatsapp: chatter.whatsapp,
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
          affiliateCodeProvider: affiliateCodeProvider,
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
          lastZoomAttendance: chatter.lastZoomAttendance?.toDate().toISOString() || null,
          preferredPaymentMethod: chatter.preferredPaymentMethod,
          pendingWithdrawalId: chatter.pendingWithdrawalId,
          recruitedBy: chatter.recruitedBy,
          recruitedByCode: chatter.recruitedByCode,
          recruitedAt: chatter.recruitedAt?.toDate().toISOString() || null,
          recruiterName: recruiterName || null,
          recruiterPhoto: recruiterPhoto || null,
          recruiterCommissionPaid: chatter.recruiterCommissionPaid,
          // Referral N2 system fields
          parrainNiveau2Id: chatter.parrainNiveau2Id,
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
          activatedAt: chatter.activatedAt?.toDate().toISOString() || null,
          activationBonusPaid: chatter.activationBonusPaid || false,
          createdAt: chatter.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: chatter.updatedAt?.toDate().toISOString() || new Date().toISOString(),
          lastLoginAt: chatter.lastLoginAt?.toDate().toISOString() || null,
          // Monthly Top Multiplier (reward for top 3)
          monthlyTopMultiplier: chatter.monthlyTopMultiplier || 1,
          monthlyTopMultiplierMonth: chatter.monthlyTopMultiplierMonth || null,
          // Terms acceptance tracking
          termsAccepted: chatter.termsAccepted || false,
          termsAcceptedAt: chatter.termsAcceptedAt || "",
          termsVersion: chatter.termsVersion || "1.0",
          termsType: chatter.termsType || "terms_chatters",
          isVisible: chatter.isVisible ?? true,
          hasTelegram: chatter.hasTelegram || false,
          telegramId: chatter.telegramId ?? undefined,
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
          // Use lockedRates (lifetime rate lock) when available, fallback to global config
          // Priority: lockedRates → new config field → deprecated config field
          commissionClientAmount: chatter.lockedRates?.commissionClientCallAmount ?? config.commissionClientCallAmount ?? config.commissionClientAmount,
          commissionRecruitmentAmount: chatter.lockedRates?.commissionProviderCallAmount ?? config.commissionProviderCallAmount ?? config.commissionRecruitmentAmount,
          commissionClientCallAmount: chatter.lockedRates?.commissionClientCallAmount ?? config.commissionClientCallAmount ?? config.commissionClientAmount,
          commissionClientCallAmountLawyer: chatter.lockedRates?.commissionClientCallAmountLawyer ?? config.commissionClientCallAmountLawyer,
          commissionClientCallAmountExpat: chatter.lockedRates?.commissionClientCallAmountExpat ?? config.commissionClientCallAmountExpat,
          commissionN1CallAmount: chatter.lockedRates?.commissionN1CallAmount ?? config.commissionN1CallAmount,
          commissionN2CallAmount: chatter.lockedRates?.commissionN2CallAmount ?? config.commissionN2CallAmount,
          commissionActivationBonusAmount: chatter.lockedRates?.commissionActivationBonusAmount ?? config.commissionActivationBonusAmount,
          commissionN1RecruitBonusAmount: chatter.lockedRates?.commissionN1RecruitBonusAmount ?? config.commissionN1RecruitBonusAmount,
          commissionProviderCallAmount: chatter.lockedRates?.commissionProviderCallAmount ?? config.commissionProviderCallAmount ?? config.commissionRecruitmentAmount,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
          levelThresholds: config.levelThresholds,
          levelBonuses: config.levelBonuses,
          withdrawalFeeCents: withdrawalFee,
          recruitmentMilestones: config.recruitmentMilestones ?? DEFAULT_CHATTER_CONFIG.recruitmentMilestones,
          monthlyCompetitionPrizes: config.monthlyCompetitionPrizes ?? DEFAULT_CHATTER_CONFIG.monthlyCompetitionPrizes,
        },
        // Commission Plan info (deferred — only in full mode)
        commissionPlan: level === "full" && chatter.commissionPlanId ? {
          id: chatter.commissionPlanId,
          name: chatter.commissionPlanName || "Plan personnalis\u00e9",
          rateLockDate: chatter.rateLockDate,
          isLifetimeLock: true,
        } : null,
        // Referral system stats
        referralStats: {
          filleulsN1: chatter.totalRecruits,
          qualifiedFilleulsN1: chatter.qualifiedReferralsCount || 0,
          filleulsN2: chatter.referralsN2Count || 0,
          referralEarnings: chatter.referralEarnings || 0,
          nextTierBonus: getNextTierBonus(chatter),
        },
        // Earnings ratio (deferred — only in full mode)
        earningsRatio: level === "full" ? (() => {
          const affiliationEarnings = (chatter.totalEarned || 0) - (chatter.referralEarnings || 0);
          const referralEarnings = chatter.referralEarnings || 0;
          const total = affiliationEarnings + referralEarnings;
          return {
            affiliationEarnings,
            referralEarnings,
            affiliationPercent: total > 0 ? Math.round((affiliationEarnings / total) * 100) : 100,
            referralPercent: total > 0 ? Math.round((referralEarnings / total) * 100) : 0,
          };
        })() : undefined,
        // Active promotion (already fetched in parallel)
        activePromotion: (() => {
          if (activePromotions.length === 0) return null;
          const best = activePromotions.reduce((a, b) => (a.multiplier > b.multiplier ? a : b));
          return {
            id: best.id,
            name: best.name,
            multiplier: best.multiplier,
            endsAt: best.endDate.toDate().toISOString(),
          };
        })(),
        // Piggy Bank - Bonus pending unlock (sync calculation, no await needed)
        piggyBank: (() => {
          const clientEarnings = getClientEarnings(chatter);
          const unlockThreshold = REFERRAL_CONFIG.TELEGRAM_BONUS.UNLOCK_THRESHOLD;

          const telegramBonusAmount = REFERRAL_CONFIG.TELEGRAM_BONUS?.AMOUNT || 5000;
          const hasTelegram = chatter.hasTelegram === true && chatter.telegramId;
          const telegramBonusPending = hasTelegram && !chatter.telegramBonusPaid ? telegramBonusAmount : 0;

          const progressPercent = Math.min(100, Math.round((clientEarnings / unlockThreshold) * 100));
          const amountToUnlock = Math.max(0, unlockThreshold - clientEarnings);
          const isUnlocked = clientEarnings >= unlockThreshold;
          const totalPending = telegramBonusPending;

          return {
            isUnlocked,
            clientEarnings,
            unlockThreshold,
            progressPercent,
            amountToUnlock,
            totalPending,
            message: isUnlocked
              ? totalPending > 0
                ? `$${(totalPending / 100).toFixed(0)} Telegram bonus ready to claim`
                : "Connect Telegram to get a $50 bonus!"
              : `Earn $${(amountToUnlock / 100).toFixed(0)} more in client commissions to unlock your $${(totalPending / 100).toFixed(0)} bonus`,
          };
        })(),
        // Historical trends for charts (undefined in essential mode)
        trends: trends ?? undefined,
        // Comparison with previous period (undefined in essential mode)
        comparison: comparison ?? undefined,
        // Forecast based on current pace (undefined in essential mode)
        forecast: forecast ?? undefined,
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
