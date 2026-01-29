/**
 * Callable: getInfluencerDashboard
 *
 * Returns dashboard data for an influencer:
 * - Profile data (without sensitive info)
 * - Recent commissions
 * - Monthly stats
 * - Unread notifications count
 * - Config values needed by frontend
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  InfluencerCommission,
  GetInfluencerDashboardResponse,
} from "../types";
import { getInfluencerConfigCached } from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getInfluencerDashboard = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetInfluencerDashboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Get influencer data
      const influencerDoc = await db.collection("influencers").doc(userId).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      const influencer = influencerDoc.data() as Influencer;

      // 3. Check status
      if (influencer.status === "banned") {
        throw new HttpsError("permission-denied", "Account is banned");
      }

      // 4. Get recent commissions (last 10)
      const commissionsQuery = await db
        .collection("influencer_commissions")
        .where("influencerId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map((doc) => {
        const data = doc.data() as InfluencerCommission;
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          status: data.status,
          description: data.description,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // 5. Calculate monthly stats
      const currentMonth = new Date().toISOString().substring(0, 7);
      let monthlyStats = {
        earnings: 0,
        clients: 0,
        recruits: 0,
        rank: null as number | null,
      };

      // Use stored monthly stats if same month
      if (influencer.currentMonthStats?.month === currentMonth) {
        monthlyStats = {
          earnings: influencer.currentMonthStats.earnings,
          clients: influencer.currentMonthStats.clients,
          recruits: influencer.currentMonthStats.recruits,
          rank: influencer.currentMonthRank,
        };
      } else {
        // Calculate from commissions if month changed
        const monthStart = new Date(currentMonth + "-01");
        const monthStartTimestamp = Timestamp.fromDate(monthStart);

        const monthlyCommissionsQuery = await db
          .collection("influencer_commissions")
          .where("influencerId", "==", userId)
          .where("createdAt", ">=", monthStartTimestamp)
          .get();

        for (const doc of monthlyCommissionsQuery.docs) {
          const commission = doc.data() as InfluencerCommission;
          monthlyStats.earnings += commission.amount;
          if (commission.type === "client_referral") {
            monthlyStats.clients++;
          } else if (commission.type === "recruitment") {
            monthlyStats.recruits++;
          }
        }
        monthlyStats.rank = influencer.currentMonthRank;
      }

      // 6. Get unread notifications count
      const notificationsQuery = await db
        .collection("influencer_notifications")
        .where("influencerId", "==", userId)
        .where("isRead", "==", false)
        .count()
        .get();

      const unreadNotifications = notificationsQuery.data().count;

      // 7. Get config values
      const config = await getInfluencerConfigCached();

      // 8. Update last login
      await db.collection("influencers").doc(userId).update({
        lastLoginAt: Timestamp.now(),
      });

      // 9. Build response (exclude sensitive fields)
      const {
        paymentDetails: _paymentDetails,
        adminNotes: _adminNotes,
        ...safeInfluencer
      } = influencer;

      return {
        influencer: safeInfluencer,
        recentCommissions,
        monthlyStats,
        unreadNotifications,
        config: {
          commissionClientAmount: config.commissionClientAmount,
          commissionRecruitmentAmount: config.commissionRecruitmentAmount,
          clientDiscountPercent: config.clientDiscountPercent,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
        },
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getInfluencerDashboard] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get dashboard data");
    }
  }
);
