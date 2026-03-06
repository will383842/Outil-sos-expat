/**
 * Admin — Get Partner Stats
 *
 * Returns global partner program stats: totalPartners, activePartners,
 * totalEarnings, totalClicks, totalCalls, topPartners, monthlyGrowth.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { Partner } from "../../types";

interface PartnerStatsResponse {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  bannedPartners: number;
  totalEarnings: number;
  totalClicks: number;
  totalCalls: number;
  totalWithdrawn: number;
  topPartners: Array<{
    id: string;
    websiteName: string;
    affiliateCode: string;
    totalEarned: number;
    totalClicks: number;
    totalCalls: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    newPartners: number;
    earnings: number;
    clicks: number;
  }>;
}

export const adminGetPartnerStats = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 60 },
  async (request): Promise<PartnerStatsResponse> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      // Get all partners
      const partnersSnap = await db.collection("partners").get();
      const partners = partnersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Array<Partner>;

      // Aggregate stats
      let totalEarnings = 0;
      let totalClicks = 0;
      let totalCalls = 0;
      let totalWithdrawn = 0;
      let activePartners = 0;
      let suspendedPartners = 0;
      let bannedPartners = 0;

      for (const p of partners) {
        totalEarnings += p.totalEarned || 0;
        totalClicks += p.totalClicks || 0;
        totalCalls += p.totalCalls || 0;
        totalWithdrawn += p.totalWithdrawn || 0;

        if (p.status === "active") activePartners++;
        else if (p.status === "suspended") suspendedPartners++;
        else if (p.status === "banned") bannedPartners++;
      }

      // Top partners by earnings (top 10)
      const topPartners = [...partners]
        .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          websiteName: p.websiteName,
          affiliateCode: p.affiliateCode,
          totalEarned: p.totalEarned || 0,
          totalClicks: p.totalClicks || 0,
          totalCalls: p.totalCalls || 0,
        }));

      // Monthly growth — last 6 months
      const monthlyGrowth: PartnerStatsResponse["monthlyGrowth"] = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = Timestamp.fromDate(d);
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const monthEnd = Timestamp.fromDate(nextMonth);

        // Count new partners created in this month
        const newPartners = partners.filter((p) => {
          if (!p.createdAt) return false;
          const ts = p.createdAt;
          return ts.toMillis() >= monthStart.toMillis() && ts.toMillis() < monthEnd.toMillis();
        }).length;

        // Sum commissions for this month
        const commissionsSnap = await db
          .collection("partner_commissions")
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<", monthEnd)
          .where("status", "!=", "cancelled")
          .get();

        let monthlyEarnings = 0;
        commissionsSnap.docs.forEach((doc) => {
          monthlyEarnings += doc.data().amount || 0;
        });

        // Sum clicks for this month
        const clicksSnap = await db
          .collection("partner_affiliate_clicks")
          .where("clickedAt", ">=", monthStart)
          .where("clickedAt", "<", monthEnd)
          .count()
          .get();

        monthlyGrowth.push({
          month: monthStr,
          newPartners,
          earnings: monthlyEarnings,
          clicks: clicksSnap.data().count,
        });
      }

      logger.info("[adminGetPartnerStats] Stats computed", {
        totalPartners: partners.length,
        activePartners,
      });

      return {
        totalPartners: partners.length,
        activePartners,
        suspendedPartners,
        bannedPartners,
        totalEarnings,
        totalClicks,
        totalCalls,
        totalWithdrawn,
        topPartners,
        monthlyGrowth,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetPartnerStats] Error", { error });
      throw new HttpsError("internal", "Failed to compute partner stats");
    }
  }
);
