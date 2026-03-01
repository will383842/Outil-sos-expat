/**
 * Chatter Admin Callables
 *
 * Admin-only functions for managing chatters.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";

import {
  Chatter,
  ChatterCommission,
  ChatterWithdrawal,
  ChatterRecruitmentLink,
  ChatterBadgeAward,
  ChatterQuizAttempt,
  ChatterConfig,
  ChatterConfigHistoryEntry,
  ChatterMonthlyRanking,
  AdminGetChattersListInput,
  AdminGetChattersListResponse,
  AdminGetChatterDetailResponse,
  AdminProcessWithdrawalInput,
  AdminUpdateChatterStatusInput,
  DEFAULT_CHATTER_CONFIG,
} from "../../types";
import {
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  failWithdrawal,
} from "../../services";

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
// GET CHATTERS LIST
// ============================================================================

export const adminGetChattersList = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<AdminGetChattersListResponse> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const input = (request.data as AdminGetChattersListInput) || {};

    try {
      const {
        status,
        level,
        country,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        limit = 50,
        offset = 0,
      } = input;

      // Build query
      let query = db.collection("chatters") as FirebaseFirestore.Query;

      if (status) {
        query = query.where("status", "==", status);
      }

      if (level) {
        query = query.where("level", "==", level);
      }

      if (country) {
        query = query.where("country", "==", country.toUpperCase());
      }

      // Apply sorting
      const validSortFields = ["createdAt", "totalEarned", "totalClients", "currentStreak"];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
      query = query.orderBy(sortField, sortOrder);

      // Get total count (without pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();

      // Fetch isFeatured from users collection (badge set by admin)
      const userRefs = snapshot.docs.map((doc) => db.collection("users").doc(doc.id));
      const userDocs = snapshot.docs.length > 0 ? await db.getAll(...userRefs) : [];
      const featuredMap: Record<string, boolean> = {};
      userDocs.forEach((doc) => {
        if (doc.exists) featuredMap[doc.id] = doc.data()?.isFeatured === true;
      });

      let chatters = snapshot.docs.map((doc) => {
        const data = doc.data() as Chatter;
        return {
          id: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          status: data.status,
          level: data.level,
          totalEarned: data.totalEarned,
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          currentStreak: data.currentStreak,
          createdAt: data.createdAt.toDate().toISOString(),
          isFeatured: featuredMap[doc.id] ?? false,
          isVisible: data.isVisible ?? false,
          photoUrl: data.photoUrl,
        };
      });

      // Apply search filter (client-side for flexibility)
      if (search) {
        const searchLower = search.toLowerCase();
        chatters = chatters.filter(
          (c) =>
            c.email.toLowerCase().includes(searchLower) ||
            c.firstName.toLowerCase().includes(searchLower) ||
            c.lastName.toLowerCase().includes(searchLower) ||
            c.id.toLowerCase().includes(searchLower)
        );
      }

      logger.info("[adminGetChattersList] List fetched", {
        total,
        returned: chatters.length,
        filters: { status, level, country, search },
      });

      return {
        chatters,
        total,
        hasMore: offset + chatters.length < total,
      };
    } catch (error) {
      logger.error("[adminGetChattersList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch chatters list");
    }
  }
);

// ============================================================================
// GET CHATTER DETAIL
// ============================================================================

export const adminGetChatterDetail = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<AdminGetChatterDetailResponse> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const { chatterId } = request.data as { chatterId: string };

    if (!chatterId) {
      throw new HttpsError("invalid-argument", "Chatter ID is required");
    }

    try {
      // Get chatter
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Get commissions
      const commissionsSnapshot = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", chatterId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const commissions = commissionsSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterCommission;
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // Get withdrawals
      const withdrawalsSnapshot = await db
        .collection("chatter_withdrawals")
        .where("chatterId", "==", chatterId)
        .orderBy("requestedAt", "desc")
        .limit(20)
        .get();

      const withdrawals = withdrawalsSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterWithdrawal;
        return {
          ...data,
          id: doc.id,
          requestedAt: data.requestedAt.toDate().toISOString(),
        };
      });

      // Get recruitment links
      const linksSnapshot = await db
        .collection("chatter_recruitment_links")
        .where("chatterId", "==", chatterId)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const recruitmentLinks = linksSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterRecruitmentLink;
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // Get badges
      const badgesSnapshot = await db
        .collection("chatter_badge_awards")
        .where("chatterId", "==", chatterId)
        .orderBy("awardedAt", "desc")
        .get();

      const badges = badgesSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterBadgeAward;
        return {
          ...data,
          id: doc.id,
          awardedAt: data.awardedAt.toDate().toISOString(),
        };
      });

      // Get quiz attempts
      const quizSnapshot = await db
        .collection("chatter_quiz_attempts")
        .where("chatterId", "==", chatterId)
        .orderBy("completedAt", "desc")
        .limit(10)
        .get();

      const quizAttempts = quizSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterQuizAttempt;
        return {
          ...data,
          id: doc.id,
          completedAt: data.completedAt.toDate().toISOString(),
        };
      });

      logger.info("[adminGetChatterDetail] Detail fetched", {
        chatterId,
        commissionsCount: commissions.length,
        withdrawalsCount: withdrawals.length,
      });

      return {
        chatter,
        commissions: commissions as (ChatterCommission & { createdAt: string })[],
        withdrawals: withdrawals as (ChatterWithdrawal & { requestedAt: string })[],
        recruitmentLinks: recruitmentLinks as (ChatterRecruitmentLink & { createdAt: string })[],
        badges: badges as (ChatterBadgeAward & { awardedAt: string })[],
        quizAttempts: quizAttempts as (ChatterQuizAttempt & { completedAt: string })[],
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminGetChatterDetail] Error", { chatterId, error });
      throw new HttpsError("internal", "Failed to fetch chatter detail");
    }
  }
);

// ============================================================================
// PROCESS WITHDRAWAL
// ============================================================================

export const adminProcessWithdrawal = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const input = request.data as AdminProcessWithdrawalInput;

    if (!input.withdrawalId) {
      throw new HttpsError("invalid-argument", "Withdrawal ID is required");
    }

    if (!input.action) {
      throw new HttpsError("invalid-argument", "Action is required");
    }

    try {
      let result;

      switch (input.action) {
        case "approve":
          result = await approveWithdrawal(input.withdrawalId, adminId, input.notes);
          break;

        case "reject":
          if (!input.reason) {
            throw new HttpsError("invalid-argument", "Reason is required for rejection");
          }
          result = await rejectWithdrawal(input.withdrawalId, adminId, input.reason);
          break;

        case "complete":
          result = await completeWithdrawal(input.withdrawalId, input.paymentReference);
          break;

        case "fail":
          if (!input.reason) {
            throw new HttpsError("invalid-argument", "Reason is required for failure");
          }
          result = await failWithdrawal(input.withdrawalId, input.reason, true);
          break;

        default:
          throw new HttpsError("invalid-argument", `Unknown action: ${input.action}`);
      }

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Operation failed");
      }

      logger.info("[adminProcessWithdrawal] Withdrawal processed", {
        withdrawalId: input.withdrawalId,
        action: input.action,
        processedBy: adminId,
      });

      // P2-02 FIX: Create audit log for withdrawal action
      try {
        await getFirestore().collection("admin_audit_logs").add({
          action: `withdrawal_${input.action}`,
          targetId: input.withdrawalId,
          targetType: "payment_withdrawal",
          performedBy: adminId,
          timestamp: Timestamp.now(),
          details: {
            reason: input.reason || null,
            notes: input.notes || null,
            paymentReference: input.paymentReference || null,
          },
        });
      } catch (auditErr) {
        logger.error("[adminProcessWithdrawal] Audit log failed", { auditErr });
      }

      return {
        success: true,
        message: `Withdrawal ${input.action}d successfully`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminProcessWithdrawal] Error", {
        withdrawalId: input.withdrawalId,
        error,
      });
      throw new HttpsError("internal", "Failed to process withdrawal");
    }
  }
);

// ============================================================================
// UPDATE CHATTER STATUS
// ============================================================================

export const adminUpdateChatterStatus = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const db = getFirestore();
    const input = request.data as AdminUpdateChatterStatusInput;

    if (!input.chatterId) {
      throw new HttpsError("invalid-argument", "Chatter ID is required");
    }

    if (!input.status) {
      throw new HttpsError("invalid-argument", "Status is required");
    }

    if (!input.reason) {
      throw new HttpsError("invalid-argument", "Reason is required");
    }

    // AUDIT-FIX m1: Removed "pending_quiz" (quiz no longer exists)
    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(input.status)) {
      throw new HttpsError("invalid-argument", `Invalid status: ${input.status}`);
    }

    try {
      const chatterRef = db.collection("chatters").doc(input.chatterId);
      const chatterDoc = await chatterRef.get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data() as Chatter;
      const previousStatus = chatter.status;

      // Update chatter
      const now = Timestamp.now();
      await chatterRef.update({
        status: input.status,
        adminNotes: chatter.adminNotes
          ? `${chatter.adminNotes}\n[${now.toDate().toISOString()}] Status changed from ${previousStatus} to ${input.status} by ${adminId}: ${input.reason}`
          : `[${now.toDate().toISOString()}] Status changed from ${previousStatus} to ${input.status} by ${adminId}: ${input.reason}`,
        updatedAt: now,
      });

      // Also update user document
      await db.collection("users").doc(input.chatterId).update({
        chatterStatus: input.status,
        updatedAt: now,
      });

      // Audit trail
      await db.collection("admin_audit_logs").add({
        action: "chatter_status_updated",
        targetId: input.chatterId,
        targetType: "chatter",
        performedBy: adminId,
        timestamp: now,
        details: {
          previousStatus,
          newStatus: input.status,
          reason: input.reason,
        },
      });

      logger.info("[adminUpdateChatterStatus] Status updated", {
        chatterId: input.chatterId,
        previousStatus,
        newStatus: input.status,
        reason: input.reason,
        updatedBy: adminId,
      });

      return {
        success: true,
        message: `Chatter status updated to ${input.status}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminUpdateChatterStatus] Error", {
        chatterId: input.chatterId,
        error,
      });
      throw new HttpsError("internal", "Failed to update chatter status");
    }
  }
);

// ============================================================================
// GET PENDING WITHDRAWALS
// ============================================================================

export const adminGetPendingWithdrawals = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{
    success: boolean;
    withdrawals: ChatterWithdrawal[];
    total: number;
  }> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();

    try {
      const snapshot = await db
        .collection("chatter_withdrawals")
        .where("status", "in", ["pending", "approved", "processing"])
        .orderBy("requestedAt", "asc")
        .limit(100)
        .get();

      const withdrawals = snapshot.docs.map((doc) => doc.data() as ChatterWithdrawal);

      logger.info("[adminGetPendingWithdrawals] Fetched pending withdrawals", {
        count: withdrawals.length,
      });

      return {
        success: true,
        withdrawals,
        total: withdrawals.length,
      };
    } catch (error) {
      logger.error("[adminGetPendingWithdrawals] Error", { error });
      throw new HttpsError("internal", "Failed to fetch pending withdrawals");
    }
  }
);

// ============================================================================
// EXPORT CHATTERS
// ============================================================================

/**
 * Export chatters to CSV
 */
export const adminExportChatters = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { status, country, language, search } = request.data || {};
    const db = getFirestore();

    try {
      let query: FirebaseFirestore.Query = db.collection("chatters");

      if (status) query = query.where("status", "==", status);
      if (country) query = query.where("country", "==", country);
      if (language) query = query.where("preferredLanguage", "==", language);

      const snapshot = await query.get();
      let chatters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-side search filter
      if (search) {
        const searchLower = search.toLowerCase();
        chatters = chatters.filter((c: any) =>
          c.firstName?.toLowerCase().includes(searchLower) ||
          c.lastName?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.affiliateCodeClient?.toLowerCase().includes(searchLower)
        );
      }

      // Generate CSV
      const headers = ["ID", "FirstName", "LastName", "Email", "Status", "Level", "Country", "TotalEarned", "TotalClients", "TotalRecruits", "CreatedAt"];
      const rows = chatters.map((c: any) => [
        c.id,
        c.firstName || "",
        c.lastName || "",
        c.email || "",
        c.status || "",
        c.level || 1,
        c.country || "",
        c.totalEarned || 0,
        c.totalClients || 0,
        c.totalRecruits || 0,
        c.createdAt?.toDate?.()?.toISOString() || ""
      ]);

      const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");

      logger.info("[adminExportChatters] CSV exported", {
        total: chatters.length,
        filters: { status, country, language, search },
      });

      return { success: true, csv };
    } catch (error) {
      logger.error("[adminExportChatters] Error", { error });
      throw new HttpsError("internal", "Failed to export chatters");
    }
  }
);

// ============================================================================
// BULK CHATTER ACTION
// ============================================================================

/**
 * Bulk actions on multiple chatters
 */
export const adminBulkChatterAction = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { chatterIds, action } = request.data || {};

    if (!chatterIds || !Array.isArray(chatterIds) || chatterIds.length === 0) {
      throw new HttpsError("invalid-argument", "chatterIds is required");
    }
    if (!action || !["activate", "suspend", "email"].includes(action)) {
      throw new HttpsError("invalid-argument", "action must be 'activate', 'suspend', or 'email'");
    }

    const db = getFirestore();
    const batch = db.batch();
    const now = Timestamp.now();
    let processed = 0;

    try {
      for (const chatterId of chatterIds) {
        const chatterRef = db.collection("chatters").doc(chatterId);
        const chatterDoc = await chatterRef.get();

        if (!chatterDoc.exists) continue;

        if (action === "activate") {
          batch.update(chatterRef, {
            status: "active",
            updatedAt: now,
            adminNotes: `Activated by admin on ${new Date().toISOString()}`
          });
        } else if (action === "suspend") {
          batch.update(chatterRef, {
            status: "suspended",
            updatedAt: now,
            adminNotes: `Suspended by admin on ${new Date().toISOString()}`
          });
        }
        // "email" action would require email service integration
        processed++;
      }

      await batch.commit();

      logger.info("[adminBulkChatterAction] Bulk action applied", {
        action,
        processed,
        total: chatterIds.length,
      });

      return { success: true, message: `${action} applied to ${processed} chatters` };
    } catch (error) {
      logger.error("[adminBulkChatterAction] Error", { action, error });
      throw new HttpsError("internal", "Failed to apply bulk action");
    }
  }
);

// ============================================================================
// GET CHATTER CONFIG
// ============================================================================

/**
 * Get current chatter system configuration
 */
export const adminGetChatterConfig = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ config: ChatterConfig }> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();

    try {
      const configDoc = await db.collection("chatter_config").doc("current").get();

      if (!configDoc.exists) {
        // Return defaults if not initialized
        const now = Timestamp.now();
        return {
          config: {
            ...DEFAULT_CHATTER_CONFIG,
            updatedAt: now,
            updatedBy: "system",
          } as ChatterConfig,
        };
      }

      const config = configDoc.data() as ChatterConfig;

      logger.info("[adminGetChatterConfig] Config fetched", {
        version: config.version,
      });

      return { config };
    } catch (error) {
      logger.error("[adminGetChatterConfig] Error", { error });
      throw new HttpsError("internal", "Failed to fetch configuration");
    }
  }
);

// ============================================================================
// UPDATE CHATTER CONFIG
// ============================================================================

/**
 * Update chatter system configuration
 */
export const adminUpdateChatterConfig = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const db = getFirestore();
    const updates = request.data as Partial<ChatterConfig>;

    if (!updates || Object.keys(updates).length === 0) {
      throw new HttpsError("invalid-argument", "No updates provided");
    }

    try {
      const configRef = db.collection("chatter_config").doc("current");
      const configDoc = await configRef.get();

      let currentVersion = 0;
      if (configDoc.exists) {
        currentVersion = configDoc.data()?.version || 0;
      }

      // Validate and sanitize updates
      const allowedFields = [
        "isSystemActive",
        "newRegistrationsEnabled",
        "withdrawalsEnabled",
        "commissionClientAmount",
        "commissionRecruitmentAmount",
        "levelBonuses",
        "levelThresholds",
        "top1BonusMultiplier",
        "top2BonusMultiplier",
        "top3BonusMultiplier",
        "zoomBonusMultiplier",
        "zoomBonusDurationDays",
        "recruitmentLinkDurationMonths",
        "minimumWithdrawalAmount",
        "validationHoldPeriodHours",
        "releaseDelayHours",
        "quizPassingScore",
        "quizRetryDelayHours",
        "quizQuestionsCount",
        "attributionWindowDays",
        "commissionClientCallAmountLawyer",
        "commissionClientCallAmountExpat",
        "commissionProviderCallAmountLawyer",
        "commissionProviderCallAmountExpat",
        "commissionCaptainCallAmountLawyer",
        "commissionCaptainCallAmountExpat",
        "captainTiers",
        "captainQualityBonusAmount",
        "recruitmentCommissionThreshold",
        // NEW: Simplified commission system (2026)
        "commissionClientCallAmount",
        "commissionN1CallAmount",
        "commissionN2CallAmount",
        "commissionActivationBonusAmount",
        "commissionN1RecruitBonusAmount",
        "activationCallsRequired",
        "commissionProviderCallAmount",
        "providerRecruitmentDurationMonths",
      ];

      const sanitizedUpdates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (updates[field as keyof ChatterConfig] !== undefined) {
          sanitizedUpdates[field] = updates[field as keyof ChatterConfig];
        }
      }

      // Save config history before update (max 50 entries)
      if (configDoc.exists) {
        const currentData = configDoc.data() || {};
        const historyEntry: ChatterConfigHistoryEntry = {
          changedAt: Timestamp.now(),
          changedBy: adminId,
          previousConfig: currentData,
        };
        const existingHistory = Array.isArray(currentData.configHistory) ? currentData.configHistory : [];
        sanitizedUpdates.configHistory = [historyEntry, ...existingHistory].slice(0, 50);
      }

      // Add metadata
      sanitizedUpdates.version = currentVersion + 1;
      sanitizedUpdates.updatedAt = Timestamp.now();
      sanitizedUpdates.updatedBy = adminId;

      // Merge with existing or create new
      if (configDoc.exists) {
        await configRef.update(sanitizedUpdates);
      } else {
        await configRef.set({
          ...DEFAULT_CHATTER_CONFIG,
          ...sanitizedUpdates,
        });
      }

      logger.info("[adminUpdateChatterConfig] Config updated", {
        adminId,
        newVersion: currentVersion + 1,
        updatedFields: Object.keys(sanitizedUpdates),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateChatterConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update configuration");
    }
  }
);

// ============================================================================
// GET CHATTER LEADERBOARD (Admin with filters)
// ============================================================================

/**
 * Get chatter leaderboard with country/language filters (admin version)
 */
export const adminGetChatterLeaderboard = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    const { month, country, language, limit = 100 } = request.data || {};

    // Default to current month
    const targetMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

    try {
      // First check if we have a pre-calculated ranking
      const rankingDoc = await db
        .collection("chatter_monthly_rankings")
        .doc(targetMonth)
        .get();

      if (rankingDoc.exists) {
        const rankingData = rankingDoc.data() as ChatterMonthlyRanking;
        let rankings = rankingData.rankings;

        // Apply filters
        if (country) {
          rankings = rankings.filter(r => r.country === country.toUpperCase());
        }

        // Re-rank after filtering
        rankings = rankings.map((r, idx) => ({ ...r, rank: idx + 1 }));

        return {
          success: true,
          rankings: rankings.slice(0, limit),
          month: targetMonth,
          totalParticipants: rankingData.rankings.length,
          isFinalized: rankingData.isFinalized,
        };
      }

      // Calculate ranking on the fly (for current month or missing data)
      const startOfMonth = new Date(`${targetMonth}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // Get all active chatters
      let chattersQuery = db
        .collection("chatters")
        .where("status", "==", "active") as FirebaseFirestore.Query;

      if (country) {
        chattersQuery = chattersQuery.where("country", "==", country.toUpperCase());
      }

      if (language) {
        chattersQuery = chattersQuery.where("language", "==", language);
      }

      const chattersSnapshot = await chattersQuery.get();
      const chatterIds = chattersSnapshot.docs.map(doc => doc.id);

      // Get commissions for this month (batch queries for large datasets)
      const rankings: Array<{
        rank: number;
        chatterId: string;
        chatterName: string;
        chatterCode: string;
        photoUrl?: string;
        country: string;
        language: string;
        monthlyEarnings: number;
        monthlyClients: number;
        monthlyRecruits: number;
        level: number;
      }> = [];

      // Process chatters in batches of 10
      for (let i = 0; i < chatterIds.length; i += 10) {
        const batch = chatterIds.slice(i, i + 10);

        const commissionsPromises = batch.map(async (chatterId) => {
          const commissions = await db
            .collection("chatter_commissions")
            .where("chatterId", "==", chatterId)
            .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
            .where("createdAt", "<", Timestamp.fromDate(endOfMonth))
            .get();

          let monthlyEarnings = 0;
          let monthlyClients = 0;
          let monthlyRecruits = 0;

          commissions.docs.forEach((doc) => {
            const comm = doc.data() as ChatterCommission;
            if (comm.status !== "cancelled") {
              monthlyEarnings += comm.amount;
              if (comm.type === "client_referral") monthlyClients++;
              if (comm.type === "recruitment") monthlyRecruits++;
            }
          });

          return { chatterId, monthlyEarnings, monthlyClients, monthlyRecruits };
        });

        const batchResults = await Promise.all(commissionsPromises);

        for (const result of batchResults) {
          const chatterDoc = chattersSnapshot.docs.find(d => d.id === result.chatterId);
          if (!chatterDoc) continue;

          const chatter = chatterDoc.data() as Chatter;

          if (result.monthlyEarnings > 0 || result.monthlyClients > 0) {
            rankings.push({
              rank: 0,
              chatterId: result.chatterId,
              chatterName: `${chatter.firstName} ${chatter.lastName.charAt(0)}.`,
              chatterCode: chatter.affiliateCodeClient,
              photoUrl: chatter.photoUrl,
              country: chatter.country,
              language: chatter.language,
              monthlyEarnings: result.monthlyEarnings,
              monthlyClients: result.monthlyClients,
              monthlyRecruits: result.monthlyRecruits,
              level: chatter.level,
            });
          }
        }
      }

      // Sort by earnings
      rankings.sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);

      // Assign ranks
      rankings.forEach((r, idx) => {
        r.rank = idx + 1;
      });

      logger.info("[adminGetChatterLeaderboard] Leaderboard calculated", {
        month: targetMonth,
        totalEntries: rankings.length,
        filters: { country, language },
      });

      return {
        success: true,
        rankings: rankings.slice(0, limit),
        month: targetMonth,
        totalParticipants: rankings.length,
        isFinalized: false,
      };
    } catch (error) {
      logger.error("[adminGetChatterLeaderboard] Error", { error });
      throw new HttpsError("internal", "Failed to fetch leaderboard");
    }
  }
);

// ============================================================================
// GET CHATTER CONFIG HISTORY
// ============================================================================

export const adminGetChatterConfigHistory = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ history: ChatterConfigHistoryEntry[] }> => {
    ensureInitialized();
    await assertAdmin(request);

    const db = getFirestore();
    try {
      const configDoc = await db.collection("chatter_config").doc("current").get();
      if (!configDoc.exists) {
        return { history: [] };
      }
      const data = configDoc.data() || {};
      const history = Array.isArray(data.configHistory) ? data.configHistory : [];
      return { history };
    } catch (error) {
      logger.error("[adminGetChatterConfigHistory] Error", { error });
      throw new HttpsError("internal", "Failed to fetch config history");
    }
  }
);
