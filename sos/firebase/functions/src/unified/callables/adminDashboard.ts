/**
 * Admin Dashboard Callables — Unified Commission System
 *
 * Operations for the admin dashboard:
 * - Commission listing, cancellation, release
 * - User commission summary
 * - Global stats
 * - Shadow mode stats & system toggle
 *
 * Region: us-central1 (affiliate region, optimal Firestore latency)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { affiliateAdminConfig } from "../../lib/functionConfigs";
import {
  getCommissionsByReferrer,
  getCommissionSummary,
  cancelCommission,
  releaseHeldCommission,
} from "../commissionWriter";
import { getShadowComparisons, getShadowStats } from "../shadowComparator";
import type { CommissionStatus, CommissionType } from "../types";

// ============================================================================
// HELPERS
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") return uid;

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// LIST COMMISSIONS (with filters)
// ============================================================================

export const adminListUnifiedCommissions = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const {
      referrerId,
      status,
      type,
      limit: queryLimit,
      startAfterDate,
    } = (request.data || {}) as {
      referrerId?: string;
      status?: CommissionStatus;
      type?: CommissionType;
      limit?: number;
      startAfterDate?: string;
    };

    const db = getFirestore();

    // If referrerId provided, use the existing helper
    if (referrerId) {
      const commissions = await getCommissionsByReferrer(referrerId, {
        status,
        type,
        limit: queryLimit || 50,
        startAfter: startAfterDate ? Timestamp.fromDate(new Date(startAfterDate)) : undefined,
      });

      return {
        success: true,
        commissions: commissions.map((c) => serializeCommission(c as unknown as Record<string, unknown>)),
        count: commissions.length,
      };
    }

    // Global query across all users
    let query: FirebaseFirestore.Query = db.collection("commissions");

    if (status) {
      query = query.where("status", "==", status);
    }
    if (type) {
      query = query.where("type", "==", type);
    }

    query = query.orderBy("createdAt", "desc");

    if (startAfterDate) {
      query = query.startAfter(Timestamp.fromDate(new Date(startAfterDate)));
    }

    query = query.limit(queryLimit || 50);

    const snap = await query.get();
    const commissions = snap.docs.map((doc) => serializeCommission({ id: doc.id, ...doc.data() } as Record<string, unknown>));

    return {
      success: true,
      commissions,
      count: commissions.length,
    };
  }
);

// ============================================================================
// GET USER COMMISSION SUMMARY
// ============================================================================

export const adminGetUserCommissionSummary = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { userId } = request.data as { userId: string };
    if (!userId) throw new HttpsError("invalid-argument", "userId is required");

    const summary = await getCommissionSummary(userId);

    // Also get user doc for context
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    return {
      success: true,
      userId,
      summary,
      userInfo: userData
        ? {
            email: userData.email,
            firstName: userData.firstName || userData.name,
            role: userData.role || userData.affiliateRole,
            affiliateCode: userData.affiliateCode || userData.affiliateCodeClient,
            commissionPlanId: userData.commissionPlanId || null,
            lockedRates: userData.lockedRates || null,
          }
        : null,
    };
  }
);

// ============================================================================
// CANCEL COMMISSION
// ============================================================================

export const adminCancelCommission = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { commissionId, reason } = request.data as {
      commissionId: string;
      reason: string;
    };

    if (!commissionId) throw new HttpsError("invalid-argument", "commissionId is required");
    if (!reason) throw new HttpsError("invalid-argument", "reason is required");

    try {
      await cancelCommission(commissionId, reason);
      logger.info("Admin cancelled commission", { commissionId, reason, adminId });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) {
        throw new HttpsError("not-found", message);
      }
      if (message.includes("already")) {
        throw new HttpsError("failed-precondition", message);
      }
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// RELEASE HELD COMMISSION
// ============================================================================

export const adminReleaseHeldCommission = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { commissionId } = request.data as { commissionId: string };
    if (!commissionId) throw new HttpsError("invalid-argument", "commissionId is required");

    try {
      await releaseHeldCommission(commissionId);
      logger.info("Admin released held commission", { commissionId, adminId });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) {
        throw new HttpsError("not-found", message);
      }
      if (message.includes("Cannot release")) {
        throw new HttpsError("failed-precondition", message);
      }
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// GLOBAL DASHBOARD STATS
// ============================================================================

export const adminGetUnifiedDashboardStats = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { sinceDays } = (request.data || {}) as { sinceDays?: number };
    const since = new Date();
    since.setDate(since.getDate() - (sinceDays || 30));
    const sinceTs = Timestamp.fromDate(since);

    const db = getFirestore();

    // Count commissions by status
    const commissionsSnap = await db
      .collection("commissions")
      .where("createdAt", ">=", sinceTs)
      .get();

    const stats = {
      total: commissionsSnap.size,
      totalAmount: 0,
      byStatus: {} as Record<string, { count: number; amount: number }>,
      byType: {} as Record<string, { count: number; amount: number }>,
      byRole: {} as Record<string, { count: number; amount: number }>,
    };

    for (const doc of commissionsSnap.docs) {
      const data = doc.data();
      const amount = data.amount || 0;
      const status = data.status || "unknown";
      const type = data.type || "unknown";
      const role = data.referrerRole || "unknown";

      if (status !== "cancelled") {
        stats.totalAmount += amount;
      }

      // By status
      if (!stats.byStatus[status]) stats.byStatus[status] = { count: 0, amount: 0 };
      stats.byStatus[status].count++;
      stats.byStatus[status].amount += amount;

      // By type
      if (!stats.byType[type]) stats.byType[type] = { count: 0, amount: 0 };
      stats.byType[type].count++;
      stats.byType[type].amount += amount;

      // By role
      if (!stats.byRole[role]) stats.byRole[role] = { count: 0, amount: 0 };
      stats.byRole[role].count++;
      stats.byRole[role].amount += amount;
    }

    // Get system config
    const configDoc = await db.doc("unified_commission_system/config").get();
    const systemConfig = configDoc.exists
      ? configDoc.data()
      : { enabled: false, shadowMode: true };

    return {
      success: true,
      period: { sinceDays: sinceDays || 30, since: since.toISOString() },
      stats,
      systemConfig,
    };
  }
);

// ============================================================================
// SHADOW MODE STATS
// ============================================================================

export const adminGetUnifiedShadowStats = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { sinceDays, eventType, verdict, limit: queryLimit } = (request.data || {}) as {
      sinceDays?: number;
      eventType?: string;
      verdict?: string;
      limit?: number;
    };

    const since = new Date();
    since.setDate(since.getDate() - (sinceDays || 7));

    // Get aggregated stats
    const stats = await getShadowStats(since);

    // Get recent comparisons for detail view
    const comparisons = await getShadowComparisons({
      eventType,
      verdict,
      limit: queryLimit || 20,
    });

    return {
      success: true,
      period: { sinceDays: sinceDays || 7, since: since.toISOString() },
      stats,
      recentComparisons: comparisons.map((c) => ({
        ...c,
        timestamp: c.timestamp?.toDate?.()?.toISOString() || null,
      })),
    };
  }
);

// ============================================================================
// TOGGLE UNIFIED SYSTEM (enable/disable + shadow mode)
// ============================================================================

export const adminToggleUnifiedSystem = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 15 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { enabled, shadowMode } = request.data as {
      enabled?: boolean;
      shadowMode?: boolean;
    };

    if (enabled === undefined && shadowMode === undefined) {
      throw new HttpsError("invalid-argument", "At least one of 'enabled' or 'shadowMode' is required");
    }

    const db = getFirestore();
    const configRef = db.doc("unified_commission_system/config");

    const update: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedBy: adminId,
    };

    if (enabled !== undefined) update.enabled = enabled;
    if (shadowMode !== undefined) update.shadowMode = shadowMode;

    await configRef.set(update, { merge: true });

    logger.info("Admin toggled unified system", { enabled, shadowMode, adminId });

    // Read back the full config
    const configDoc = await configRef.get();

    return {
      success: true,
      config: configDoc.data(),
    };
  }
);

// ============================================================================
// HELPERS
// ============================================================================

function serializeCommission(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  // Convert Firestore Timestamps to ISO strings for JSON transport
  for (const key of ["createdAt", "availableAt", "validatedAt", "holdUntil", "paidAt", "cancelledAt"]) {
    if (result[key] && typeof (result[key] as { toDate?: () => Date }).toDate === "function") {
      result[key] = (result[key] as { toDate: () => Date }).toDate().toISOString();
    }
  }
  return result;
}
