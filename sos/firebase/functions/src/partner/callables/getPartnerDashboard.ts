/**
 * Callable: getPartnerDashboard
 *
 * Returns comprehensive dashboard data for the partner.
 * Includes: partner profile, recent commissions, click aggregation,
 * monthly stats, and unread notifications.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  type Partner,
  type PartnerCommission,
  type PartnerNotification,
  type GetPartnerDashboardResponse,
} from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getPartnerDashboard = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 30,
  },
  async (request): Promise<GetPartnerDashboardResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 1. Get partner profile
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      const partner = partnerDoc.data() as Partner;

      // Update last login
      await db.collection("partners").doc(userId).update({
        lastLoginAt: Timestamp.now(),
      });

      // 2. Get recent commissions (last 10)
      const commissionsSnap = await db
        .collection("partner_commissions")
        .where("partnerId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsSnap.docs.map((doc) => {
        return doc.data() as PartnerCommission;
      });

      // 3. Get recent clicks aggregated by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const clicksSnap = await db
        .collection("partner_affiliate_clicks")
        .where("partnerId", "==", userId)
        .where("clickedAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
        .orderBy("clickedAt", "desc")
        .get();

      // Aggregate clicks by date
      const clicksByDate: Record<string, number> = {};
      clicksSnap.docs.forEach((doc) => {
        const data = doc.data();
        const clickDate = (data.clickedAt as Timestamp).toDate();
        const dateKey = `${clickDate.getFullYear()}-${String(clickDate.getMonth() + 1).padStart(2, "0")}-${String(clickDate.getDate()).padStart(2, "0")}`;
        clicksByDate[dateKey] = (clicksByDate[dateKey] || 0) + 1;
      });

      const recentClicks = Object.entries(clicksByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 4. Get monthly stats (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const monthlyCommissionsSnap = await db
        .collection("partner_commissions")
        .where("partnerId", "==", userId)
        .where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo))
        .get();

      const monthlyClicksSnap = await db
        .collection("partner_affiliate_clicks")
        .where("partnerId", "==", userId)
        .where("clickedAt", ">=", Timestamp.fromDate(sixMonthsAgo))
        .get();

      // Build monthly stats
      const monthlyMap: Record<string, { clicks: number; clients: number; calls: number; earnings: number }> = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { clicks: 0, clients: 0, calls: 0, earnings: 0 };
      }

      monthlyCommissionsSnap.docs.forEach((doc) => {
        const data = doc.data() as PartnerCommission;
        const d = data.createdAt.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key]) {
          if (data.status === "available" || data.status === "paid" || data.status === "validated") {
            monthlyMap[key].earnings += data.amount;
          }
          if (data.type === "client_referral") {
            monthlyMap[key].calls++;
            monthlyMap[key].clients++;
          }
        }
      });

      monthlyClicksSnap.docs.forEach((doc) => {
        const data = doc.data();
        const d = (data.clickedAt as Timestamp).toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key]) {
          monthlyMap[key].clicks++;
        }
      });

      const monthlyStats = Object.entries(monthlyMap)
        .map(([month, stats]) => ({ month, ...stats }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // 5. Get unread notifications (last 10)
      const notificationsSnap = await db
        .collection("partner_notifications")
        .where("partnerId", "==", userId)
        .where("isRead", "==", false)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const notifications = notificationsSnap.docs.map((doc) => {
        return doc.data() as PartnerNotification;
      });

      logger.info("[getPartnerDashboard] Dashboard data returned", {
        partnerId: userId,
        status: partner.status,
        availableBalance: partner.availableBalance,
      });

      return {
        partner,
        recentCommissions,
        recentClicks,
        monthlyStats,
        notifications,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[getPartnerDashboard] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get dashboard data");
    }
  }
);
