/**
 * Callable: getGroupAdminDashboard
 *
 * Returns comprehensive dashboard data for a GroupAdmin including:
 * - Profile info
 * - Recent commissions
 * - Recent recruits
 * - Notifications
 * - Leaderboard preview
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminWithdrawal,
  GroupAdminRecruit,
  GroupAdminNotification,
  GroupAdminDashboardResponse,
} from "../types";
import { getLeaderboardSize, getGroupAdminConfig } from "../groupAdminConfig";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getGroupAdminDashboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GroupAdminDashboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();

    // Admin impersonation: allow admin to view any group admin's dashboard
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
      // 2. Get GroupAdmin profile
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const profile = groupAdminDoc.data() as GroupAdmin;

      // Check status
      if (profile.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 3. Update current month stats if needed (transaction to avoid race with concurrent commissions)
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (profile.currentMonthStats.month !== currentMonth) {
        await db.runTransaction(async (tx) => {
          const freshDoc = await tx.get(groupAdminDoc.ref);
          const freshProfile = freshDoc.data() as GroupAdmin;
          // Re-check inside transaction — another call or commission may have already reset
          if (freshProfile.currentMonthStats.month !== currentMonth) {
            tx.update(groupAdminDoc.ref, {
              "currentMonthStats.month": currentMonth,
              "currentMonthStats.clients": 0,
              "currentMonthStats.recruits": 0,
              "currentMonthStats.earnings": 0,
              currentMonthRank: null,
              updatedAt: Timestamp.now(),
            });
          }
        });
        profile.currentMonthStats = {
          month: currentMonth,
          clients: 0,
          recruits: 0,
          earnings: 0,
        };
        profile.currentMonthRank = null;
      }

      // 4. Fetch recent commissions (last 5 for dashboard preview)
      const commissionsSnapshot = await db
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      const recentCommissions: GroupAdminCommission[] = commissionsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminCommission
      );

      // 5. Fetch recent withdrawals (last 5)
      const withdrawalsSnapshot = await db
        .collection("group_admin_withdrawals")
        .where("groupAdminId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      const recentWithdrawals: GroupAdminWithdrawal[] = withdrawalsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminWithdrawal
      );

      // 6. Fetch recent recruits (last 5)
      const recruitsSnapshot = await db
        .collection("group_admin_recruited_admins")
        .where("recruiterId", "==", userId)
        .orderBy("recruitedAt", "desc")
        .limit(5)
        .get();

      const recentRecruits: GroupAdminRecruit[] = recruitsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminRecruit
      );

      // 7. Fetch recent notifications (last 5 for dashboard preview)
      const notificationsSnapshot = await db
        .collection("group_admin_notifications")
        .where("groupAdminId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      const notifications: GroupAdminNotification[] = notificationsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminNotification
      );

      // 8. Fetch current month leaderboard
      const leaderboardSize = await getLeaderboardSize();
      const leaderboardSnapshot = await db
        .collection("group_admins")
        .where("status", "==", "active")
        .where("currentMonthStats.month", "==", currentMonth)
        .orderBy("currentMonthStats.earnings", "desc")
        .limit(leaderboardSize)
        .get();

      const leaderboard = leaderboardSnapshot.docs.map((doc, index) => {
        const data = doc.data() as GroupAdmin;
        return {
          rank: index + 1,
          groupAdminId: doc.id,
          groupAdminName: `${data.firstName} ${data.lastName.charAt(0)}.`,
          earnings: data.currentMonthStats.earnings,
        };
      });

      // Update last login - skip for admin view
      if (!isAdminView) {
        await groupAdminDoc.ref.update({
          lastLoginAt: Timestamp.now(),
        });
      }

      // Get global config and apply lockedRates override (Lifetime Rate Lock)
      const gaConfig = await getGroupAdminConfig();

      return {
        profile,
        recentCommissions,
        recentWithdrawals,
        recentRecruits,
        notifications,
        leaderboard,
        isAdminView,
        config: {
          commissionClientCallAmount: profile.lockedRates?.commissionClientCallAmount ?? gaConfig.commissionClientCallAmount,
          commissionClientAmountLawyer: profile.lockedRates?.commissionClientAmountLawyer ?? gaConfig.commissionClientAmountLawyer,
          commissionClientAmountExpat: profile.lockedRates?.commissionClientAmountExpat ?? gaConfig.commissionClientAmountExpat,
          commissionN1CallAmount: profile.lockedRates?.commissionN1CallAmount ?? gaConfig.commissionN1CallAmount,
          commissionN2CallAmount: profile.lockedRates?.commissionN2CallAmount ?? gaConfig.commissionN2CallAmount,
          commissionActivationBonusAmount: profile.lockedRates?.commissionActivationBonusAmount ?? gaConfig.commissionActivationBonusAmount,
          commissionN1RecruitBonusAmount: profile.lockedRates?.commissionN1RecruitBonusAmount ?? gaConfig.commissionN1RecruitBonusAmount,
          clientDiscountType: gaConfig.clientDiscountType,
          clientDiscountAmount: gaConfig.clientDiscountAmount,
          clientDiscountPercent: gaConfig.clientDiscountPercent,
        },
        // Commission Plan info (for display on dashboard)
        commissionPlan: profile.commissionPlanId ? {
          id: profile.commissionPlanId,
          name: profile.commissionPlanName || "Plan personnalis\u00e9",
          rateLockDate: profile.rateLockDate,
          isLifetimeLock: true,
        } : null,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminDashboard] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch dashboard data");
    }
  }
);
