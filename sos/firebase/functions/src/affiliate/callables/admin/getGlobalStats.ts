/**
 * Admin Callable: getAffiliateGlobalStats
 *
 * Returns global affiliate statistics for the admin dashboard.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { AdminGetGlobalStatsResponse } from "../../types";
import { getPendingFraudAlertsCount } from "../../utils/fraudDetection";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Check if user is admin
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Check custom claims first
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") {
    return uid;
  }

  // Check Firestore
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

export const getAffiliateGlobalStats = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<AdminGetGlobalStatsResponse> => {
    ensureInitialized();

    const adminId = await assertAdmin(request);

    logger.info("[getAffiliateGlobalStats] Processing request", {
      adminId,
    });

    const db = getFirestore();

    try {
      // Calculate date ranges
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Get total affiliates count (users with affiliateCode)
      const totalAffiliatesQuery = await db
        .collection("users")
        .where("affiliateCode", "!=", null)
        .count()
        .get();
      const totalAffiliates = totalAffiliatesQuery.data().count;

      // 2. Get active affiliates (at least 1 referral)
      const activeAffiliatesQuery = await db
        .collection("users")
        .where("affiliateStats.totalReferrals", ">", 0)
        .count()
        .get();
      const activeAffiliates = activeAffiliatesQuery.data().count;

      // 3. Get total referrals
      const referralsQuery = await db
        .collection("referrals")
        .count()
        .get();
      const totalReferrals = referralsQuery.data().count;

      // 4. Get total commissions amount
      const commissionsQuery = await db
        .collection("affiliate_commissions")
        .where("status", "in", ["pending", "available", "paid"])
        .get();

      const totalCommissionsAmount = commissionsQuery.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      // 5. Get total payouts amount (completed)
      const payoutsQuery = await db
        .collection("affiliate_payouts")
        .where("status", "==", "completed")
        .get();

      const totalPayoutsAmount = payoutsQuery.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      // 6. Get pending payouts
      const pendingPayoutsQuery = await db
        .collection("affiliate_payouts")
        .where("status", "in", ["pending", "approved"])
        .get();

      const pendingPayouts = {
        count: pendingPayoutsQuery.size,
        amount: pendingPayoutsQuery.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        ),
      };

      // 7. Calculate total to disburse (sum of all availableBalance)
      const usersWithBalanceQuery = await db
        .collection("users")
        .where("availableBalance", ">", 0)
        .get();

      const totalToDisburse = usersWithBalanceQuery.docs.reduce(
        (sum, doc) => sum + (doc.data().availableBalance || 0),
        0
      );

      // 8. Get commissions today
      const commissionsTodayQuery = await db
        .collection("affiliate_commissions")
        .where("createdAt", ">=", Timestamp.fromDate(startOfDay))
        .get();

      const commissionsToday = {
        count: commissionsTodayQuery.size,
        amount: commissionsTodayQuery.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        ),
      };

      // 9. Get commissions this month
      const commissionsMonthQuery = await db
        .collection("affiliate_commissions")
        .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
        .get();

      const commissionsThisMonth = {
        count: commissionsMonthQuery.size,
        amount: commissionsMonthQuery.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        ),
      };

      // 10. Get top 10 affiliates
      const topAffiliatesQuery = await db
        .collection("users")
        .where("totalEarned", ">", 0)
        .orderBy("totalEarned", "desc")
        .limit(10)
        .get();

      const topAffiliates = topAffiliatesQuery.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          affiliateCode: data.affiliateCode,
          totalEarned: data.totalEarned || 0,
          referralCount: data.affiliateStats?.totalReferrals || 0,
        };
      });

      // 11. Get pending fraud alerts
      const fraudAlertsPending = await getPendingFraudAlertsCount();

      const response: AdminGetGlobalStatsResponse = {
        totalAffiliates,
        activeAffiliates,
        totalReferrals,
        totalCommissionsAmount,
        totalPayoutsAmount,
        pendingPayouts,
        totalToDisburse,
        commissionsToday,
        commissionsThisMonth,
        topAffiliates,
        fraudAlertsPending,
      };

      logger.info("[getAffiliateGlobalStats] Returned stats", {
        totalAffiliates,
        activeAffiliates,
        totalCommissionsAmount,
        pendingPayoutsCount: pendingPayouts.count,
      });

      return response;
    } catch (error) {
      logger.error("[getAffiliateGlobalStats] Error", { error });
      throw new HttpsError("internal", "Failed to get global stats");
    }
  }
);
