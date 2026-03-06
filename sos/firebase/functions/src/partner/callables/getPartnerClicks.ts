/**
 * Callable: getPartnerClicks
 *
 * Partner self-access callable that returns click data aggregated
 * by day or month for Recharts graphs.
 * Supports period filter: 30d, 6m, 12m.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetPartnerClicksInput {
  period?: "30d" | "6m" | "12m";
}

interface ClickDataPoint {
  date: string; // YYYY-MM-DD or YYYY-MM
  clicks: number;
  conversions: number;
}

interface GetPartnerClicksResponse {
  data: ClickDataPoint[];
  totalClicks: number;
  totalConversions: number;
  period: string;
}

export const getPartnerClicks = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 30,
  },
  async (request): Promise<GetPartnerClicksResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetPartnerClicksInput;

    const period = input?.period || "30d";
    if (!["30d", "6m", "12m"].includes(period)) {
      throw new HttpsError("invalid-argument", "Period must be 30d, 6m, or 12m");
    }

    try {
      // Verify partner exists
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      // Calculate start date based on period
      const now = new Date();
      let startDate: Date;
      let aggregateByMonth = false;

      switch (period) {
        case "30d":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "6m":
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          aggregateByMonth = true;
          break;
        case "12m":
          startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          aggregateByMonth = true;
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
      }
      startDate.setHours(0, 0, 0, 0);

      // Query clicks
      const clicksSnap = await db
        .collection("partner_affiliate_clicks")
        .where("partnerId", "==", userId)
        .where("clickedAt", ">=", Timestamp.fromDate(startDate))
        .orderBy("clickedAt", "asc")
        .get();

      // Aggregate data
      const aggregated: Record<string, { clicks: number; conversions: number }> = {};
      let totalClicks = 0;
      let totalConversions = 0;

      clicksSnap.docs.forEach((doc) => {
        const data = doc.data();
        const clickDate = (data.clickedAt as Timestamp).toDate();

        let key: string;
        if (aggregateByMonth) {
          key = `${clickDate.getFullYear()}-${String(clickDate.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = `${clickDate.getFullYear()}-${String(clickDate.getMonth() + 1).padStart(2, "0")}-${String(clickDate.getDate()).padStart(2, "0")}`;
        }

        if (!aggregated[key]) {
          aggregated[key] = { clicks: 0, conversions: 0 };
        }
        aggregated[key].clicks++;
        totalClicks++;

        if (data.converted === true) {
          aggregated[key].conversions++;
          totalConversions++;
        }
      });

      // Fill in missing dates/months for continuous chart data
      if (aggregateByMonth) {
        const months = period === "6m" ? 6 : 12;
        for (let i = months; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!aggregated[key]) {
            aggregated[key] = { clicks: 0, conversions: 0 };
          }
        }
      } else {
        for (let i = 30; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (!aggregated[key]) {
            aggregated[key] = { clicks: 0, conversions: 0 };
          }
        }
      }

      const data: ClickDataPoint[] = Object.entries(aggregated)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      logger.info("[getPartnerClicks] Clicks data returned", {
        partnerId: userId,
        period,
        totalClicks,
        totalConversions,
      });

      return {
        data,
        totalClicks,
        totalConversions,
        period,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[getPartnerClicks] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get click data");
    }
  }
);
