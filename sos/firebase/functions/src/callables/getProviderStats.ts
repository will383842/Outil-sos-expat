/**
 * getProviderStats.ts
 *
 * Callable function for admin to retrieve provider performance statistics.
 * Supports filtering, sorting, pagination, and summary statistics.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  ProviderMonthlyStats,
  GetProviderStatsParams,
  GetProviderStatsResponse,
  ProviderStatsSummary,
  ProviderStatsType,
} from "../utils/providerStatsTypes";

// Lazy initialization
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

/** Verify admin permissions */
function assertAdmin(ctx: { auth?: { uid?: string; token?: Record<string, unknown> } }) {
  const uid = ctx.auth?.uid;
  const claims = ctx.auth?.token;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required");
  const isAdmin = claims?.admin === true || claims?.role === "admin";
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin only");
}

/**
 * Get provider stats with filtering, sorting, and pagination
 */
export const getProviderStats = onCall<GetProviderStatsParams, Promise<GetProviderStatsResponse>>(
  {
    region: "europe-west1",
    memory: "128MiB",
    timeoutSeconds: 60,
  },
  async (req) => {
    assertAdmin(req);

    const {
      month,
      providerType = "all",
      compliance = "all",
      search = "",
      sortBy = "providerName",
      sortDir = "asc",
      pageSize = 50,
      offset = 0,
    } = req.data || {};

    // Default to current month
    const targetMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new HttpsError("invalid-argument", "Month must be in YYYY-MM format");
    }

    console.log(`📊 [getProviderStats] Fetching stats for ${targetMonth}`);
    console.log(`   Filters: type=${providerType}, compliance=${compliance}, search="${search}"`);
    console.log(`   Sort: ${sortBy} ${sortDir}, page=${Math.floor(offset / pageSize) + 1}`);

    try {
      const db = getDb();

      // Build query
      let query: admin.firestore.Query = db
        .collection("provider_stats")
        .where("month", "==", targetMonth);

      // Filter by provider type
      if (providerType !== "all") {
        query = query.where("providerType", "==", providerType);
      }

      // Filter by compliance
      if (compliance === "compliant") {
        query = query.where("isCompliant", "==", true);
      } else if (compliance === "non-compliant") {
        query = query.where("isCompliant", "==", false);
      }

      // Execute query
      const snapshot = await query.get();

      let stats: ProviderMonthlyStats[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as ProviderMonthlyStats),
        id: doc.id,
      }));

      // Filter by search term (client-side filtering for name/email)
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        stats = stats.filter(
          (s) =>
            s.providerName.toLowerCase().includes(searchLower) ||
            s.providerEmail.toLowerCase().includes(searchLower)
        );
      }

      // Get total before pagination
      const total = stats.length;

      // Sort
      stats.sort((a, b) => {
        let valA: string | number | boolean;
        let valB: string | number | boolean;

        switch (sortBy) {
          case "hoursOnline":
            valA = a.hoursOnline;
            valB = b.hoursOnline;
            break;
          case "callsMissed":
            valA = a.callsMissed;
            valB = b.callsMissed;
            break;
          case "callsReceived":
            valA = a.callsReceived;
            valB = b.callsReceived;
            break;
          case "avgCallDuration":
            valA = a.avgCallDuration;
            valB = b.avgCallDuration;
            break;
          case "providerName":
          default:
            valA = a.providerName.toLowerCase();
            valB = b.providerName.toLowerCase();
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortDir === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (sortDir === "asc") {
          return (valA as number) - (valB as number);
        }
        return (valB as number) - (valA as number);
      });

      // Paginate
      const paginatedStats = stats.slice(offset, offset + pageSize);

      console.log(`📊 [getProviderStats] Returning ${paginatedStats.length} of ${total} stats`);

      return {
        success: true,
        stats: paginatedStats,
        total,
        month: targetMonth,
      };
    } catch (error) {
      console.error("❌ [getProviderStats] Error:", error);
      return {
        success: false,
        stats: [],
        total: 0,
        month: targetMonth,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Get summary statistics for a month
 */
export const getProviderStatsSummary = onCall<
  { month?: string },
  Promise<{ success: boolean; summary?: ProviderStatsSummary; error?: string }>
>(
  {
    region: "europe-west1",
    memory: "128MiB",
    timeoutSeconds: 60,
  },
  async (req) => {
    assertAdmin(req);

    const { month } = req.data || {};

    // Default to current month
    const targetMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new HttpsError("invalid-argument", "Month must be in YYYY-MM format");
    }

    console.log(`📊 [getProviderStatsSummary] Calculating summary for ${targetMonth}`);

    try {
      const db = getDb();

      const snapshot = await db
        .collection("provider_stats")
        .where("month", "==", targetMonth)
        .get();

      if (snapshot.empty) {
        return {
          success: true,
          summary: {
            month: targetMonth,
            totalProviders: 0,
            compliantProviders: 0,
            nonCompliantProviders: 0,
            complianceRate: 0,
            avgHoursOnline: 0,
            avgMissedCalls: 0,
            totalCallsReceived: 0,
            totalCallsAnswered: 0,
            totalCallsMissed: 0,
          },
        };
      }

      const stats = snapshot.docs.map((doc) => doc.data() as ProviderMonthlyStats);

      const totalProviders = stats.length;
      const compliantProviders = stats.filter((s) => s.isCompliant).length;
      const nonCompliantProviders = totalProviders - compliantProviders;
      const complianceRate = totalProviders > 0 ? (compliantProviders / totalProviders) * 100 : 0;

      const totalHoursOnline = stats.reduce((sum, s) => sum + s.hoursOnline, 0);
      const avgHoursOnline = totalProviders > 0 ? totalHoursOnline / totalProviders : 0;

      const totalMissedCalls = stats.reduce((sum, s) => sum + s.callsMissed, 0);
      const avgMissedCalls = totalProviders > 0 ? totalMissedCalls / totalProviders : 0;

      const totalCallsReceived = stats.reduce((sum, s) => sum + s.callsReceived, 0);
      const totalCallsAnswered = stats.reduce((sum, s) => sum + s.callsAnswered, 0);

      const summary: ProviderStatsSummary = {
        month: targetMonth,
        totalProviders,
        compliantProviders,
        nonCompliantProviders,
        complianceRate: Math.round(complianceRate * 10) / 10,
        avgHoursOnline: Math.round(avgHoursOnline * 10) / 10,
        avgMissedCalls: Math.round(avgMissedCalls * 10) / 10,
        totalCallsReceived,
        totalCallsAnswered,
        totalCallsMissed: totalMissedCalls,
      };

      console.log(`📊 [getProviderStatsSummary] Summary:`, summary);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      console.error("❌ [getProviderStatsSummary] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Get available months (for month selector dropdown)
 */
export const getProviderStatsMonths = onCall<
  Record<string, never>,
  Promise<{ success: boolean; months: string[]; error?: string }>
>(
  {
    region: "europe-west1",
    memory: "128MiB",
    timeoutSeconds: 30,
  },
  async (req) => {
    assertAdmin(req);

    try {
      const db = getDb();

      // Get distinct months from provider_stats
      // Note: Firestore doesn't support DISTINCT, so we query and dedupe
      const snapshot = await db
        .collection("provider_stats")
        .select("month")
        .limit(1000)
        .get();

      const monthsSet = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.month) {
          monthsSet.add(data.month);
        }
      });

      // Sort months descending (most recent first)
      const months = Array.from(monthsSet).sort().reverse();

      // Always include current month even if no data
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (!months.includes(currentMonth)) {
        months.unshift(currentMonth);
      }

      console.log(`📊 [getProviderStatsMonths] Found ${months.length} months`);

      return {
        success: true,
        months,
      };
    } catch (error) {
      console.error("❌ [getProviderStatsMonths] Error:", error);
      return {
        success: false,
        months: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Export provider stats to CSV format
 */
export const exportProviderStatsCsv = onCall<
  { month?: string; providerType?: ProviderStatsType | "all" },
  Promise<{ success: boolean; csv?: string; filename?: string; error?: string }>
>(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (req) => {
    assertAdmin(req);

    const { month, providerType = "all" } = req.data || {};

    // Default to current month
    const targetMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    console.log(`📊 [exportProviderStatsCsv] Exporting stats for ${targetMonth}`);

    try {
      const db = getDb();

      let query: admin.firestore.Query = db
        .collection("provider_stats")
        .where("month", "==", targetMonth);

      if (providerType !== "all") {
        query = query.where("providerType", "==", providerType);
      }

      const snapshot = await query.get();

      const stats = snapshot.docs.map((doc) => doc.data() as ProviderMonthlyStats);

      // Sort by name
      stats.sort((a, b) => a.providerName.localeCompare(b.providerName));

      // Build CSV
      const headers = [
        "Provider ID",
        "Provider Name",
        "Provider Email",
        "Provider Type",
        "Month",
        "Hours Online",
        "Hours Target",
        "Hours Compliant",
        "Calls Received",
        "Calls Answered",
        "Calls Missed",
        "Missed Calls Target",
        "Missed Calls Compliant",
        "Total Call Duration (sec)",
        "Avg Call Duration (sec)",
        "Overall Compliant",
      ];

      const rows = stats.map((s) => [
        s.providerId,
        `"${s.providerName.replace(/"/g, '""')}"`,
        s.providerEmail,
        s.providerType,
        s.month,
        s.hoursOnline.toFixed(2),
        s.hoursOnlineTarget,
        s.hoursCompliant ? "Yes" : "No",
        s.callsReceived,
        s.callsAnswered,
        s.callsMissed,
        s.missedCallsTarget,
        s.missedCallsCompliant ? "Yes" : "No",
        s.totalCallDuration,
        s.avgCallDuration,
        s.isCompliant ? "Yes" : "No",
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      const filename = `provider_stats_${targetMonth}_${providerType}.csv`;

      console.log(`📊 [exportProviderStatsCsv] Generated CSV with ${stats.length} rows`);

      return {
        success: true,
        csv,
        filename,
      };
    } catch (error) {
      console.error("❌ [exportProviderStatsCsv] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
