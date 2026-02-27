/**
 * Chatter Admin Commissions - Advanced Commission Tracking
 *
 * Professional commission tracking system for admin console.
 * Features:
 * - Detailed commission queries with filters
 * - Dashboard analytics and stats
 * - Cascade view support (N1/N2 relationships)
 * - Export support
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";
import {
  ChatterCommission,
  ChatterCommissionType,
  ChatterCommissionStatus,
  Chatter,
} from "../../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Assert that the request is from an admin
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Check custom claims first (faster)
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") {
    return uid;
  }

  // Fall back to Firestore check
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for adminGetCommissionsDetailed
 */
export interface AdminGetCommissionsDetailedInput {
  chatterId?: string;
  dateRange?: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };
  type?: ChatterCommissionType;
  status?: ChatterCommissionStatus;
  sourceType?: "call_session" | "user" | "provider" | "bonus";
  limit?: number;
  offset?: number;
  search?: string; // Search by chatter email, name, or commission ID
}

/**
 * Detailed commission with enriched data
 */
export interface CommissionDetailed {
  id: string;
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  chatterCode: string;
  type: ChatterCommissionType;
  sourceId: string | null;
  sourceType: "call_session" | "user" | "provider" | "bonus" | null;
  sourceDetails?: Record<string, unknown>;
  baseAmount: number;
  levelBonus: number;
  top3Bonus: number;
  zoomBonus: number;
  streakBonus?: number;
  monthlyTopMultiplier?: number;
  amount: number;
  currency: "USD";
  calculationDetails: string;
  status: ChatterCommissionStatus;
  createdAt: string;
  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
  withdrawalId: string | null;
  description: string;
  // Enriched data
  relatedChatter?: {
    id: string;
    name: string;
    email: string;
    code: string;
  };
  callSession?: {
    id: string;
    clientEmail?: string;
    duration?: number;
    connectionFee?: number;
  };
}

/**
 * Response for adminGetCommissionsDetailed
 */
export interface AdminGetCommissionsDetailedResponse {
  commissions: CommissionDetailed[];
  stats: {
    total: number;
    totalAmount: number;
    byStatus: Record<ChatterCommissionStatus, { count: number; amount: number }>;
    byType: Record<string, { count: number; amount: number }>;
  };
  hasMore: boolean;
}

/**
 * Input for adminGetCommissionStats
 */
export interface AdminGetCommissionStatsInput {
  dateRange?: {
    start: string;
    end: string;
  };
  country?: string;
}

/**
 * Response for adminGetCommissionStats
 */
export interface AdminGetCommissionStatsResponse {
  totals: {
    amount: number;
    count: number;
    pending: number;
    validated: number;
    available: number;
    paid: number;
  };
  byType: Record<string, { amount: number; count: number }>;
  byMonth: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  topEarners: Array<{
    chatterId: string;
    chatterName: string;
    chatterCode: string;
    amount: number;
    count: number;
    country: string;
  }>;
  pendingValidation: {
    count: number;
    amount: number;
    oldestDate: string | null;
  };
  recentActivity: Array<{
    id: string;
    chatterId: string;
    chatterName: string;
    type: ChatterCommissionType;
    amount: number;
    status: ChatterCommissionStatus;
    createdAt: string;
  }>;
}

// ============================================================================
// GET COMMISSIONS DETAILED
// ============================================================================

/**
 * Get detailed commissions with advanced filters
 */
export const adminGetCommissionsDetailed = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request): Promise<AdminGetCommissionsDetailedResponse> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const input = (request.data as AdminGetCommissionsDetailedInput) || {};

    const {
      chatterId,
      dateRange,
      type,
      status,
      sourceType,
      limit = 50,
      offset = 0,
      search,
    } = input;

    try {
      // Build base query
      let query = db.collection("chatter_commissions") as FirebaseFirestore.Query;

      // Apply filters
      if (chatterId) {
        query = query.where("chatterId", "==", chatterId);
      }

      if (type) {
        query = query.where("type", "==", type);
      }

      if (status) {
        query = query.where("status", "==", status);
      }

      if (sourceType) {
        query = query.where("sourceType", "==", sourceType);
      }

      if (dateRange?.start && dateRange?.end) {
        const startDate = Timestamp.fromDate(new Date(dateRange.start));
        const endDate = Timestamp.fromDate(new Date(dateRange.end));
        query = query
          .where("createdAt", ">=", startDate)
          .where("createdAt", "<=", endDate);
      }

      // Order by createdAt desc
      query = query.orderBy("createdAt", "desc");

      // Execute query for stats calculation (without pagination)
      const statsSnapshot = await query.limit(10000).get();

      // Calculate stats from all matching documents
      const stats = {
        total: statsSnapshot.size,
        totalAmount: 0,
        byStatus: {
          pending: { count: 0, amount: 0 },
          validated: { count: 0, amount: 0 },
          available: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          cancelled: { count: 0, amount: 0 },
        } as Record<ChatterCommissionStatus, { count: number; amount: number }>,
        byType: {} as Record<string, { count: number; amount: number }>,
      };

      statsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as ChatterCommission;
        stats.totalAmount += data.amount;

        // By status
        if (stats.byStatus[data.status]) {
          stats.byStatus[data.status].count++;
          stats.byStatus[data.status].amount += data.amount;
        }

        // By type
        if (!stats.byType[data.type]) {
          stats.byType[data.type] = { count: 0, amount: 0 };
        }
        stats.byType[data.type].count++;
        stats.byType[data.type].amount += data.amount;
      });

      // Apply pagination
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      // Get unique chatter IDs for enrichment
      const chatterIds = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as ChatterCommission;
        chatterIds.add(data.chatterId);
        // Also add related chatters from sourceDetails
        if (data.sourceDetails?.clientId) {
          chatterIds.add(data.sourceDetails.clientId as string);
        }
      });

      // Fetch chatter details for enrichment
      const chatterMap = new Map<string, Chatter>();
      const chatterPromises = Array.from(chatterIds).map(async (id) => {
        const chatterDoc = await db.collection("chatters").doc(id).get();
        if (chatterDoc.exists) {
          chatterMap.set(id, chatterDoc.data() as Chatter);
        }
      });
      await Promise.all(chatterPromises);

      // Transform to detailed commissions
      let commissions: CommissionDetailed[] = snapshot.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        const chatter = chatterMap.get(data.chatterId);

        const detailed: CommissionDetailed = {
          id: doc.id,
          chatterId: data.chatterId,
          chatterEmail: data.chatterEmail,
          chatterName: chatter
            ? `${chatter.firstName} ${chatter.lastName}`
            : data.chatterEmail.split("@")[0],
          chatterCode: data.chatterCode,
          type: data.type,
          sourceId: data.sourceId,
          sourceType: data.sourceType,
          sourceDetails: data.sourceDetails,
          baseAmount: data.baseAmount,
          levelBonus: data.levelBonus,
          top3Bonus: data.top3Bonus,
          zoomBonus: data.zoomBonus,
          streakBonus: data.streakBonus,
          monthlyTopMultiplier: data.monthlyTopMultiplier,
          amount: data.amount,
          currency: data.currency,
          calculationDetails: data.calculationDetails,
          status: data.status,
          createdAt: data.createdAt.toDate().toISOString(),
          validatedAt: data.validatedAt?.toDate().toISOString() || null,
          availableAt: data.availableAt?.toDate().toISOString() || null,
          paidAt: data.paidAt?.toDate().toISOString() || null,
          withdrawalId: data.withdrawalId,
          description: data.description,
        };

        // Add call session details if available
        if (data.sourceType === "call_session" && data.sourceDetails) {
          detailed.callSession = {
            id: data.sourceId || "",
            clientEmail: data.sourceDetails.clientEmail as string | undefined,
            duration: data.sourceDetails.callDuration as number | undefined,
            connectionFee: data.sourceDetails.connectionFee as number | undefined,
          };
        }

        // Add related chatter for N1/N2 commissions
        if (
          (data.type === "n1_call" ||
            data.type === "n2_call" ||
            data.type === "activation_bonus" ||
            data.type === "n1_recruit_bonus") &&
          data.sourceDetails?.clientId
        ) {
          const relatedChatter = chatterMap.get(
            data.sourceDetails.clientId as string
          );
          if (relatedChatter) {
            detailed.relatedChatter = {
              id: data.sourceDetails.clientId as string,
              name: `${relatedChatter.firstName} ${relatedChatter.lastName}`,
              email: relatedChatter.email,
              code: relatedChatter.affiliateCodeClient,
            };
          }
        }

        return detailed;
      });

      // Apply client-side search filter
      if (search) {
        const searchLower = search.toLowerCase();
        commissions = commissions.filter(
          (c) =>
            c.id.toLowerCase().includes(searchLower) ||
            c.chatterEmail.toLowerCase().includes(searchLower) ||
            c.chatterName.toLowerCase().includes(searchLower) ||
            c.chatterCode.toLowerCase().includes(searchLower)
        );
      }

      logger.info("[adminGetCommissionsDetailed] Commissions fetched", {
        total: stats.total,
        returned: commissions.length,
        filters: { chatterId, dateRange, type, status, sourceType, search },
      });

      return {
        commissions,
        stats,
        hasMore: offset + commissions.length < stats.total,
      };
    } catch (error) {
      logger.error("[adminGetCommissionsDetailed] Error", { error });
      throw new HttpsError("internal", "Failed to fetch commissions");
    }
  }
);

// ============================================================================
// GET COMMISSION STATS
// ============================================================================

/**
 * Get commission dashboard statistics
 */
export const adminGetCommissionStats = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request): Promise<AdminGetCommissionStatsResponse> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const input = (request.data as AdminGetCommissionStatsInput) || {};
    const { dateRange, country } = input;

    try {
      // Build base query
      let query = db.collection("chatter_commissions") as FirebaseFirestore.Query;

      // Apply date range filter
      if (dateRange?.start && dateRange?.end) {
        const startDate = Timestamp.fromDate(new Date(dateRange.start));
        const endDate = Timestamp.fromDate(new Date(dateRange.end));
        query = query
          .where("createdAt", ">=", startDate)
          .where("createdAt", "<=", endDate);
      }

      // Get all commissions for stats
      const snapshot = await query.orderBy("createdAt", "desc").limit(50000).get();

      // Initialize totals
      const totals = {
        amount: 0,
        count: 0,
        pending: 0,
        validated: 0,
        available: 0,
        paid: 0,
      };

      const byType: Record<string, { amount: number; count: number }> = {};
      const byMonth: Map<string, { amount: number; count: number }> = new Map();
      const earnerStats: Map<
        string,
        { amount: number; count: number; chatterId: string }
      > = new Map();
      const pendingDates: Date[] = [];
      const recentActivity: AdminGetCommissionStatsResponse["recentActivity"] = [];

      // Get chatter IDs for country filtering and name enrichment
      const chatterIds = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as ChatterCommission;
        chatterIds.add(data.chatterId);
      });

      // Fetch chatters for country filtering and name enrichment
      const chatterMap = new Map<
        string,
        { name: string; country: string; code: string }
      >();
      const chatterPromises = Array.from(chatterIds).map(async (id) => {
        const chatterDoc = await db.collection("chatters").doc(id).get();
        if (chatterDoc.exists) {
          const chatter = chatterDoc.data() as Chatter;
          chatterMap.set(id, {
            name: `${chatter.firstName} ${chatter.lastName}`,
            country: chatter.country,
            code: chatter.affiliateCodeClient,
          });
        }
      });
      await Promise.all(chatterPromises);

      // Process commissions
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data() as ChatterCommission;
        const chatterInfo = chatterMap.get(data.chatterId);

        // Apply country filter if specified
        if (country && chatterInfo?.country !== country.toUpperCase()) {
          return;
        }

        // Update totals
        totals.count++;
        totals.amount += data.amount;

        // Status-specific totals
        switch (data.status) {
          case "pending":
            totals.pending += data.amount;
            pendingDates.push(data.createdAt.toDate());
            break;
          case "validated":
            totals.validated += data.amount;
            break;
          case "available":
            totals.available += data.amount;
            break;
          case "paid":
            totals.paid += data.amount;
            break;
        }

        // By type
        if (!byType[data.type]) {
          byType[data.type] = { amount: 0, count: 0 };
        }
        byType[data.type].amount += data.amount;
        byType[data.type].count++;

        // By month
        const monthKey = data.createdAt
          .toDate()
          .toISOString()
          .substring(0, 7); // YYYY-MM
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, { amount: 0, count: 0 });
        }
        const monthStats = byMonth.get(monthKey)!;
        monthStats.amount += data.amount;
        monthStats.count++;

        // Earner stats (for top earners)
        const existingEarner = earnerStats.get(data.chatterId);
        if (existingEarner) {
          existingEarner.amount += data.amount;
          existingEarner.count++;
        } else {
          earnerStats.set(data.chatterId, {
            chatterId: data.chatterId,
            amount: data.amount,
            count: 1,
          });
        }

        // Recent activity (first 20)
        if (index < 20) {
          recentActivity.push({
            id: doc.id,
            chatterId: data.chatterId,
            chatterName: chatterInfo?.name || data.chatterEmail.split("@")[0],
            type: data.type,
            amount: data.amount,
            status: data.status,
            createdAt: data.createdAt.toDate().toISOString(),
          });
        }
      });

      // Format top earners
      const topEarners = Array.from(earnerStats.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((earner) => {
          const chatterInfo = chatterMap.get(earner.chatterId);
          return {
            chatterId: earner.chatterId,
            chatterName: chatterInfo?.name || "Unknown",
            chatterCode: chatterInfo?.code || "",
            amount: earner.amount,
            count: earner.count,
            country: chatterInfo?.country || "",
          };
        });

      // Format by month (sorted chronologically)
      const byMonthArray = Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, stats]) => ({
          month,
          amount: stats.amount,
          count: stats.count,
        }));

      // Pending validation stats
      const pendingCommissions = snapshot.docs.filter(
        (doc) => (doc.data() as ChatterCommission).status === "pending"
      );
      const oldestPendingDate = pendingDates.length > 0
        ? new Date(Math.min(...pendingDates.map(d => d.getTime())))
        : null;
      const pendingValidation = {
        count: pendingCommissions.length,
        amount: pendingCommissions.reduce(
          (sum, doc) => sum + (doc.data() as ChatterCommission).amount,
          0
        ),
        oldestDate: oldestPendingDate ? oldestPendingDate.toISOString() : null,
      };

      logger.info("[adminGetCommissionStats] Stats calculated", {
        totalCommissions: totals.count,
        totalAmount: totals.amount,
        topEarnersCount: topEarners.length,
        filters: { dateRange, country },
      });

      return {
        totals,
        byType,
        byMonth: byMonthArray,
        topEarners,
        pendingValidation,
        recentActivity,
      };
    } catch (error) {
      logger.error("[adminGetCommissionStats] Error", { error });
      throw new HttpsError("internal", "Failed to calculate commission stats");
    }
  }
);

// ============================================================================
// EXPORT COMMISSIONS CSV
// ============================================================================

/**
 * Export commissions to CSV format
 */
export const adminExportCommissionsCSV = onCall(
  { ...adminConfig, timeoutSeconds: 120 },
  async (request): Promise<{ success: boolean; csv: string; count: number }> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const input = (request.data as AdminGetCommissionsDetailedInput) || {};

    const { chatterId, dateRange, type, status, sourceType } = input;

    try {
      // Build query
      let query = db.collection("chatter_commissions") as FirebaseFirestore.Query;

      if (chatterId) {
        query = query.where("chatterId", "==", chatterId);
      }

      if (type) {
        query = query.where("type", "==", type);
      }

      if (status) {
        query = query.where("status", "==", status);
      }

      if (sourceType) {
        query = query.where("sourceType", "==", sourceType);
      }

      if (dateRange?.start && dateRange?.end) {
        const startDate = Timestamp.fromDate(new Date(dateRange.start));
        const endDate = Timestamp.fromDate(new Date(dateRange.end));
        query = query
          .where("createdAt", ">=", startDate)
          .where("createdAt", "<=", endDate);
      }

      query = query.orderBy("createdAt", "desc").limit(10000);

      const snapshot = await query.get();

      // Get chatter details for enrichment
      const chatterIds = new Set<string>();
      snapshot.docs.forEach((doc) => {
        chatterIds.add((doc.data() as ChatterCommission).chatterId);
      });

      const chatterMap = new Map<string, Chatter>();
      const chatterPromises = Array.from(chatterIds).map(async (id) => {
        const chatterDoc = await db.collection("chatters").doc(id).get();
        if (chatterDoc.exists) {
          chatterMap.set(id, chatterDoc.data() as Chatter);
        }
      });
      await Promise.all(chatterPromises);

      // Build CSV
      const headers = [
        "ID",
        "Chatter ID",
        "Chatter Name",
        "Chatter Email",
        "Chatter Code",
        "Country",
        "Type",
        "Source Type",
        "Base Amount ($)",
        "Level Bonus",
        "Top3 Bonus",
        "Zoom Bonus",
        "Final Amount ($)",
        "Status",
        "Description",
        "Created At",
        "Validated At",
        "Available At",
        "Paid At",
        "Withdrawal ID",
      ];

      const rows = snapshot.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        const chatter = chatterMap.get(data.chatterId);

        return [
          doc.id,
          data.chatterId,
          chatter ? `${chatter.firstName} ${chatter.lastName}` : "",
          data.chatterEmail,
          data.chatterCode,
          chatter?.country || "",
          data.type,
          data.sourceType || "",
          (data.baseAmount / 100).toFixed(2),
          data.levelBonus.toFixed(2),
          data.top3Bonus.toFixed(2),
          data.zoomBonus.toFixed(2),
          (data.amount / 100).toFixed(2),
          data.status,
          data.description.replace(/"/g, '""'),
          data.createdAt.toDate().toISOString(),
          data.validatedAt?.toDate().toISOString() || "",
          data.availableAt?.toDate().toISOString() || "",
          data.paidAt?.toDate().toISOString() || "",
          data.withdrawalId || "",
        ];
      });

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((v) => `"${v}"`).join(",")
        ),
      ].join("\n");

      logger.info("[adminExportCommissionsCSV] CSV exported", {
        count: snapshot.size,
        filters: { chatterId, dateRange, type, status, sourceType },
      });

      return {
        success: true,
        csv,
        count: snapshot.size,
      };
    } catch (error) {
      logger.error("[adminExportCommissionsCSV] Error", { error });
      throw new HttpsError("internal", "Failed to export commissions");
    }
  }
);
