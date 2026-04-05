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
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getInfluencerDashboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 10,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerDashboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();

    // Admin impersonation: allow admin to view any influencer's dashboard
    const requestedUserId = request.data?.userId as string | undefined;
    let userId = request.auth.uid;
    let isAdminView = false;

    if (requestedUserId && requestedUserId !== request.auth.uid) {
      const callerRole = request.auth.token?.role as string | undefined;
      if (callerRole !== "admin" && callerRole !== "superadmin") {
        const callerDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!callerDoc.exists || !["admin", "superadmin"].includes(callerDoc.data()?.role)) {
          throw new HttpsError("permission-denied", "Admin access required to view other users' dashboards");
        }
      }
      userId = requestedUserId;
      isAdminView = true;
    }

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

      // 3b. Get config for response
      const config = await getInfluencerConfigCached();

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

      // 7. Config already fetched above for self-healing

      // 8. Update last login - skip for admin view
      if (!isAdminView) {
        await db.collection("influencers").doc(userId).update({
          lastLoginAt: Timestamp.now(),
        });
      }

      // 9. FIX: Fetch recruited influencers (filleuls) — was missing from response
      const recruitsQuery = await db
        .collection("influencers")
        .where("recruitedBy", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const recruitedInfluencers = recruitsQuery.docs.map(doc => {
        const data = doc.data() as Influencer;
        return {
          id: doc.id,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown",
          email: data.email || "",
          totalEarned: data.totalEarned || 0,
          isActive: (data.totalEarned || 0) > 0,
          joinedAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
        };
      });

      // 9b. FIX: Fetch recruiter info (parrain) — cross-collection fallback
      let recruiterName: string | null = null;
      let recruiterPhoto: string | null = null;
      if (influencer.recruitedBy) {
        let recruiterDoc = await db.collection("influencers").doc(influencer.recruitedBy).get();
        if (!recruiterDoc.exists) {
          recruiterDoc = await db.collection("users").doc(influencer.recruitedBy).get();
        }
        if (recruiterDoc.exists) {
          const recruiterData = recruiterDoc.data();
          recruiterName = [recruiterData?.firstName, recruiterData?.lastName].filter(Boolean).join(" ") || recruiterData?.email || null;
          recruiterPhoto = recruiterData?.profilePhoto || recruiterData?.photoURL || null;
        }
      }

      // 10. Build response (exclude sensitive fields)
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
        isAdminView,
        // FIX: Include recruited influencers and recruiter info
        recruitedInfluencers,
        recruiterName,
        recruiterPhoto,
        config: {
          // Use lockedRates (lifetime rate lock) when available, fallback to global config
          commissionClientAmount: influencer.lockedRates?.commissionClientAmount ?? config.commissionClientAmount,
          commissionClientAmountLawyer: influencer.lockedRates?.commissionClientAmountLawyer ?? config.commissionClientAmountLawyer,
          commissionClientAmountExpat: influencer.lockedRates?.commissionClientAmountExpat ?? config.commissionClientAmountExpat,
          commissionRecruitmentAmount: influencer.lockedRates?.commissionRecruitmentAmount ?? config.commissionRecruitmentAmount,
          clientDiscountType: config.clientDiscountType,
          clientDiscountPercent: config.clientDiscountPercent,
          clientDiscountAmount: config.clientDiscountAmount,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
        },
        // Commission Plan info (for display on dashboard)
        commissionPlan: influencer.commissionPlanId ? {
          id: influencer.commissionPlanId,
          name: influencer.commissionPlanName || "Plan personnalis\u00e9",
          rateLockDate: influencer.rateLockDate,
          isLifetimeLock: true,
        } : null,
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
