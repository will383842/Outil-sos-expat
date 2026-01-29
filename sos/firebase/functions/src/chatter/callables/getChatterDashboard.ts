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
  ChatterZoomMeeting,
  GetChatterDashboardResponse,
} from "../types";
import { getChatterConfigCached } from "../utils";

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
          createdAt: chatter.createdAt,
          updatedAt: chatter.updatedAt,
          lastLoginAt: chatter.lastLoginAt,
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
