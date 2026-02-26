/**
 * Admin Callables: GroupAdmin Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminStatus,
  GroupAdminWithdrawal,
  GroupAdminWithdrawalStatus,
} from "../../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify the caller is an admin
 */
async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  // Check custom claims first (faster, no Firestore read)
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin") {
    return;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (!userData || userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface GetGroupAdminsListInput {
  status?: GroupAdminStatus | "all";
  isVerified?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  groupType?: string;
  groupSize?: string;
}

interface GroupAdminListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  groupName: string;
  groupUrl: string;
  groupType: string;
  groupSize: string;
  groupCountry?: string;
  status: GroupAdminStatus;
  isGroupVerified: boolean;
  isVisible: boolean;
  totalEarned: number;
  availableBalance: number;
  totalClients: number;
  totalRecruits: number;
  createdAt: Timestamp;
  isFeatured?: boolean;
}

interface GroupAdminStats {
  totalActive: number;
  totalSuspended: number;
  totalEarnings: number;
  newThisMonth: number;
  verifiedGroups: number;
}

interface GetGroupAdminsListResponse {
  groupAdmins: GroupAdminListItem[];
  total: number;
  page: number;
  limit: number;
  stats?: GroupAdminStats;
}

/**
 * Get list of GroupAdmins with filtering
 */
export const adminGetGroupAdminsList = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminsListResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as GetGroupAdminsListInput;
    const limit = Math.min(input.limit || 50, 100);
    const page = Math.max(input.page || 1, 1); // 1-indexed page
    const offset = (page - 1) * limit;

    try {
      // Fetch all documents for filtering (needed for search, groupType, groupSize)
      // These filters can't be done efficiently in Firestore, so we fetch and filter
      let query = db.collection("group_admins").orderBy("createdAt", "desc");

      // Apply status filter (can be done in Firestore)
      if (input.status && input.status !== "all") {
        query = query.where("status", "==", input.status);
      }

      // Apply verification filter (can be done in Firestore)
      if (input.isVerified !== undefined) {
        query = query.where("isGroupVerified", "==", input.isVerified);
      }

      const snapshot = await query.get();

      // Fetch isFeatured from users collection (badge set by admin)
      const userRefs = snapshot.docs.map((doc) => db.collection("users").doc(doc.id));
      const userDocs = snapshot.docs.length > 0 ? await db.getAll(...userRefs) : [];
      const featuredMap: Record<string, boolean> = {};
      userDocs.forEach((doc) => {
        if (doc.exists) featuredMap[doc.id] = doc.data()?.isFeatured === true;
      });

      let allGroupAdmins = snapshot.docs.map((doc) => {
        const data = doc.data() as GroupAdmin;
        return {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          groupName: data.groupName,
          groupUrl: data.groupUrl,
          groupType: data.groupType,
          groupSize: data.groupSize,
          groupCountry: data.groupCountry,
          status: data.status,
          isGroupVerified: data.isGroupVerified,
          isVisible: data.isVisible ?? false,
          totalEarned: data.totalEarned,
          availableBalance: data.availableBalance,
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          createdAt: data.createdAt,
          isFeatured: featuredMap[doc.id] ?? false,
        };
      });

      // Apply groupType filter (client-side)
      if (input.groupType) {
        allGroupAdmins = allGroupAdmins.filter(
          (ga) => ga.groupType === input.groupType
        );
      }

      // Apply groupSize filter (client-side)
      if (input.groupSize) {
        allGroupAdmins = allGroupAdmins.filter(
          (ga) => ga.groupSize === input.groupSize
        );
      }

      // Apply search filter (client-side)
      if (input.search) {
        const search = input.search.toLowerCase();
        allGroupAdmins = allGroupAdmins.filter(
          (ga) =>
            ga.email.toLowerCase().includes(search) ||
            ga.firstName.toLowerCase().includes(search) ||
            ga.lastName.toLowerCase().includes(search) ||
            ga.groupName.toLowerCase().includes(search)
        );
      }

      // Get total after all filters
      const total = allGroupAdmins.length;

      // Apply pagination (offset-based)
      const paginatedGroupAdmins = allGroupAdmins.slice(offset, offset + limit);

      // Calculate stats (from ALL group_admins, not filtered)
      const allDocsSnapshot = await db.collection("group_admins").get();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

      let totalActive = 0;
      let totalSuspended = 0;
      let totalEarnings = 0;
      let newThisMonth = 0;
      let verifiedGroups = 0;

      allDocsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as GroupAdmin;
        if (data.status === "active") totalActive++;
        if (data.status === "suspended") totalSuspended++;
        totalEarnings += data.totalEarned || 0;
        if (data.isGroupVerified) verifiedGroups++;
        if (data.createdAt && data.createdAt.toMillis() >= startOfMonthTimestamp.toMillis()) {
          newThisMonth++;
        }
      });

      const stats: GroupAdminStats = {
        totalActive,
        totalSuspended,
        totalEarnings,
        newThisMonth,
        verifiedGroups,
      };

      return {
        groupAdmins: paginatedGroupAdmins,
        total,
        page,
        limit,
        stats,
      };
    } catch (error) {
      logger.error("[adminGetGroupAdminsList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch GroupAdmins list");
    }
  }
);

/**
 * Get detailed info for a specific GroupAdmin
 */
export const adminGetGroupAdminDetail = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ groupAdmin: GroupAdmin; recentWithdrawals: GroupAdminWithdrawal[]; recentCommissions: GroupAdminCommission[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const { groupAdminId } = request.data as { groupAdminId: string };

    if (!groupAdminId) {
      throw new HttpsError("invalid-argument", "GroupAdmin ID is required");
    }

    try {
      const groupAdminDoc = await db.collection("group_admins").doc(groupAdminId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      // Get recent withdrawals
      const withdrawalsSnapshot = await db
        .collection("group_admin_withdrawals")
        .where("groupAdminId", "==", groupAdminId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentWithdrawals = withdrawalsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminWithdrawal
      );

      // Get recent commissions
      const commissionsSnapshot = await db
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", groupAdminId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminCommission
      );

      return {
        groupAdmin,
        recentWithdrawals,
        recentCommissions,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetGroupAdminDetail] Error", { error });
      throw new HttpsError("internal", "Failed to fetch GroupAdmin detail");
    }
  }
);

interface UpdateStatusInput {
  groupAdminId: string;
  status: GroupAdminStatus;
  reason?: string;
  adminNotes?: string;
}

/**
 * Update GroupAdmin status (activate, suspend, block)
 */
export const adminUpdateGroupAdminStatus = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as UpdateStatusInput;

    if (!input.groupAdminId || !input.status) {
      throw new HttpsError("invalid-argument", "GroupAdmin ID and status are required");
    }

    const validStatuses: GroupAdminStatus[] = ["active", "suspended", "banned"];
    if (!validStatuses.includes(input.status)) {
      throw new HttpsError("invalid-argument", "Invalid status");
    }

    try {
      const groupAdminRef = db.collection("group_admins").doc(input.groupAdminId);
      const groupAdminDoc = await groupAdminRef.get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin not found");
      }

      const updates: Record<string, unknown> = {
        status: input.status,
        updatedAt: Timestamp.now(),
      };

      if (input.status === "suspended" && input.reason) {
        updates.suspensionReason = input.reason;
      } else if (input.status === "active") {
        updates.suspensionReason = null;
      }

      if (input.adminNotes !== undefined) {
        updates.adminNotes = input.adminNotes;
      }

      await groupAdminRef.update(updates);

      // Also update user document
      await db.collection("users").doc(input.groupAdminId).update({
        groupAdminStatus: input.status,
        updatedAt: Timestamp.now(),
      });

      logger.info("[adminUpdateGroupAdminStatus] Status updated", {
        adminId: request.auth.uid,
        groupAdminId: input.groupAdminId,
        newStatus: input.status,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateGroupAdminStatus] Error", { error });
      throw new HttpsError("internal", "Failed to update status");
    }
  }
);

interface VerifyGroupInput {
  groupAdminId: string;
  verified: boolean;
}

/**
 * Verify/unverify a group
 */
export const adminVerifyGroup = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as VerifyGroupInput;

    if (!input.groupAdminId) {
      throw new HttpsError("invalid-argument", "GroupAdmin ID is required");
    }

    try {
      const groupAdminRef = db.collection("group_admins").doc(input.groupAdminId);
      const groupAdminDoc = await groupAdminRef.get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin not found");
      }

      const updates: Record<string, unknown> = {
        isGroupVerified: input.verified,
        updatedAt: Timestamp.now(),
      };

      if (input.verified) {
        updates.groupVerifiedAt = Timestamp.now();

        // Award badge if not already earned
        const groupAdminData = groupAdminDoc.data();
        const badges = groupAdminData?.badges || [];
        if (!badges.includes("group_verified")) {
          updates.badges = FieldValue.arrayUnion("group_verified");
        }
      }

      await groupAdminRef.update(updates);

      logger.info("[adminVerifyGroup] Group verification updated", {
        adminId: request.auth.uid,
        groupAdminId: input.groupAdminId,
        verified: input.verified,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminVerifyGroup] Error", { error });
      throw new HttpsError("internal", "Failed to update verification");
    }
  }
);

interface ProcessWithdrawalInput {
  withdrawalId: string;
  action: "approve" | "reject" | "complete" | "fail";
  reason?: string;
  paymentReference?: string;
  processingFee?: number;
}

/**
 * Process a withdrawal request
 */
export const adminProcessWithdrawal = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as ProcessWithdrawalInput;
    const adminId = request.auth.uid;

    if (!input.withdrawalId || !input.action) {
      throw new HttpsError("invalid-argument", "Withdrawal ID and action are required");
    }

    try {
      const withdrawalRef = db.collection("group_admin_withdrawals").doc(input.withdrawalId);
      const withdrawalDoc = await withdrawalRef.get();

      if (!withdrawalDoc.exists) {
        throw new HttpsError("not-found", "Withdrawal not found");
      }

      const withdrawalData = withdrawalDoc.data();
      if (!withdrawalData) {
        throw new HttpsError("not-found", "Withdrawal data is missing");
      }
      const withdrawal = withdrawalData as GroupAdminWithdrawal;

      // Validate amount exists and is positive
      if (!withdrawal.amount || typeof withdrawal.amount !== "number" || withdrawal.amount <= 0) {
        throw new HttpsError("failed-precondition", "Invalid withdrawal amount");
      }

      // Validate state transitions
      const validTransitions: Record<GroupAdminWithdrawalStatus, string[]> = {
        pending: ["approved", "rejected"],
        approved: ["processing", "rejected"],
        processing: ["completed", "failed"],
        completed: [],
        failed: ["approved"],
        rejected: [],
      };

      const newStatus = input.action === "approve" ? "approved" :
                       input.action === "reject" ? "rejected" :
                       input.action === "complete" ? "completed" : "failed";

      if (!validTransitions[withdrawal.status].includes(newStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `Cannot transition from ${withdrawal.status} to ${newStatus}`
        );
      }

      const updates: Record<string, unknown> = {
        status: newStatus,
      };

      const now = Timestamp.now();

      switch (input.action) {
        case "approve":
          updates.approvedAt = now;
          updates.approvedBy = adminId;
          break;
        case "reject":
          updates.rejectedAt = now;
          updates.rejectedBy = adminId;
          updates.rejectionReason = input.reason;
          break;
        case "complete":
          updates.completedAt = now;
          updates.paymentReference = input.paymentReference;
          if (input.processingFee !== undefined && input.processingFee !== null) {
            // Validate processingFee is valid
            if (typeof input.processingFee !== "number" || input.processingFee < 0) {
              throw new HttpsError("invalid-argument", "Processing fee must be a non-negative number");
            }
            if (input.processingFee > withdrawal.amount) {
              throw new HttpsError("invalid-argument", "Processing fee cannot exceed withdrawal amount");
            }
            updates.processingFee = input.processingFee;
            updates.netAmount = withdrawal.amount - input.processingFee;
          } else {
            updates.netAmount = withdrawal.amount;
          }
          break;
        case "fail":
          updates.failedAt = now;
          updates.failureReason = input.reason;
          break;
      }

      await db.runTransaction(async (transaction) => {
        transaction.update(withdrawalRef, updates);

        // If rejected or failed, refund commissions to available balance
        if (input.action === "reject" || input.action === "fail") {
          const groupAdminRef = db.collection("group_admins").doc(withdrawal.groupAdminId);
          transaction.update(groupAdminRef, {
            availableBalance: FieldValue.increment(withdrawal.amount),
            pendingWithdrawalId: null,
            updatedAt: now,
          });

          // Revert commission statuses
          for (const commissionId of withdrawal.commissionIds) {
            const commissionRef = db.collection("group_admin_commissions").doc(commissionId);
            transaction.update(commissionRef, {
              status: "available",
              paidAt: null,
              withdrawalId: null,
            });
          }
        }

        // If completed, update total withdrawn
        if (input.action === "complete") {
          const groupAdminRef = db.collection("group_admins").doc(withdrawal.groupAdminId);
          transaction.update(groupAdminRef, {
            totalWithdrawn: FieldValue.increment(withdrawal.amount),
            pendingWithdrawalId: null,
            updatedAt: now,
          });
        }
      });

      logger.info("[adminProcessWithdrawal] Withdrawal processed", {
        adminId,
        withdrawalId: input.withdrawalId,
        action: input.action,
        groupAdminId: withdrawal.groupAdminId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminProcessWithdrawal] Error", { error });
      throw new HttpsError("internal", "Failed to process withdrawal");
    }
  }
);

interface GetWithdrawalsListInput {
  status?: GroupAdminWithdrawalStatus | "all";
  limit?: number;
  startAfter?: string;
}

interface WithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  completedThisMonth: number;
  completedAmountThisMonth: number;
}

/**
 * Get list of withdrawals with filtering
 */
export const adminGetWithdrawalsList = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ withdrawals: GroupAdminWithdrawal[]; hasMore: boolean; stats: WithdrawalStats }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as GetWithdrawalsListInput;
    const limit = Math.min(input.limit || 50, 100);

    try {
      // Fetch withdrawals with filtering
      let query = db.collection("group_admin_withdrawals").orderBy("createdAt", "desc");

      if (input.status && input.status !== "all") {
        query = query.where("status", "==", input.status);
      }

      if (input.startAfter) {
        const startDoc = await db.collection("group_admin_withdrawals").doc(input.startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.limit(limit + 1).get();

      const withdrawals = snapshot.docs.slice(0, limit).map(
        (doc) => doc.data() as GroupAdminWithdrawal
      );

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

      // Get pending stats
      const pendingSnapshot = await db
        .collection("group_admin_withdrawals")
        .where("status", "==", "pending")
        .get();

      let pendingAmount = 0;
      pendingSnapshot.docs.forEach((doc) => {
        pendingAmount += (doc.data() as GroupAdminWithdrawal).amount;
      });

      // Get approved stats
      const approvedSnapshot = await db
        .collection("group_admin_withdrawals")
        .where("status", "==", "approved")
        .get();

      let approvedAmount = 0;
      approvedSnapshot.docs.forEach((doc) => {
        approvedAmount += (doc.data() as GroupAdminWithdrawal).amount;
      });

      // Get completed this month stats
      const completedSnapshot = await db
        .collection("group_admin_withdrawals")
        .where("status", "==", "completed")
        .where("completedAt", ">=", startOfMonthTimestamp)
        .get();

      let completedAmountThisMonth = 0;
      completedSnapshot.docs.forEach((doc) => {
        const withdrawal = doc.data() as GroupAdminWithdrawal;
        completedAmountThisMonth += withdrawal.netAmount || withdrawal.amount;
      });

      const stats: WithdrawalStats = {
        pendingCount: pendingSnapshot.size,
        pendingAmount,
        approvedCount: approvedSnapshot.size,
        approvedAmount,
        completedThisMonth: completedSnapshot.size,
        completedAmountThisMonth,
      };

      return {
        withdrawals,
        hasMore: snapshot.docs.length > limit,
        stats,
      };
    } catch (error) {
      logger.error("[adminGetWithdrawalsList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch withdrawals list");
    }
  }
);

// ============================================================================
// EXPORT GROUP ADMINS
// ============================================================================

interface ExportGroupAdminsInput {
  status?: GroupAdminStatus | "all";
  groupType?: string;
  groupSize?: string;
  isVerified?: boolean;
  search?: string;
}

interface ExportGroupAdminItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  groupName: string;
  groupUrl: string;
  groupType: string;
  groupSize: string;
  status: GroupAdminStatus;
  isGroupVerified: boolean;
  totalEarned: number;
  availableBalance: number;
  totalClients: number;
  totalRecruits: number;
  createdAt: string;
}

/**
 * Export GroupAdmins to CSV-friendly format
 */
export const adminExportGroupAdmins = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; data: ExportGroupAdminItem[]; csv: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = (request.data as ExportGroupAdminsInput) || {};

    try {
      let query: FirebaseFirestore.Query = db.collection("group_admins");

      // Apply status filter
      if (input.status && input.status !== "all") {
        query = query.where("status", "==", input.status);
      }

      // Apply groupType filter
      if (input.groupType && input.groupType !== "all") {
        query = query.where("groupType", "==", input.groupType);
      }

      // Apply groupSize filter
      if (input.groupSize && input.groupSize !== "all") {
        query = query.where("groupSize", "==", input.groupSize);
      }

      // Apply verification filter
      if (input.isVerified !== undefined) {
        query = query.where("isGroupVerified", "==", input.isVerified);
      }

      // Get all matching documents (no limit for export)
      const snapshot = await query.get();

      let groupAdmins = snapshot.docs.map((doc) => {
        const data = doc.data() as GroupAdmin;
        return {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          groupName: data.groupName,
          groupUrl: data.groupUrl,
          groupType: data.groupType,
          groupSize: data.groupSize,
          status: data.status,
          isGroupVerified: data.isGroupVerified,
          totalEarned: data.totalEarned,
          availableBalance: data.availableBalance,
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
        };
      });

      // Apply search filter (client-side for flexibility)
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        groupAdmins = groupAdmins.filter(
          (ga) =>
            ga.email.toLowerCase().includes(searchLower) ||
            ga.firstName.toLowerCase().includes(searchLower) ||
            ga.lastName.toLowerCase().includes(searchLower) ||
            ga.groupName.toLowerCase().includes(searchLower) ||
            ga.id.toLowerCase().includes(searchLower)
        );
      }

      // Generate CSV
      const headers = [
        "ID",
        "Email",
        "FirstName",
        "LastName",
        "GroupName",
        "GroupUrl",
        "GroupType",
        "GroupSize",
        "Status",
        "IsGroupVerified",
        "TotalEarned",
        "AvailableBalance",
        "TotalClients",
        "TotalRecruits",
        "CreatedAt",
      ];

      const rows = groupAdmins.map((ga) => [
        ga.id,
        ga.email,
        ga.firstName,
        ga.lastName,
        ga.groupName,
        ga.groupUrl,
        ga.groupType,
        ga.groupSize,
        ga.status,
        ga.isGroupVerified ? "Yes" : "No",
        (ga.totalEarned / 100).toFixed(2), // Convert cents to dollars
        (ga.availableBalance / 100).toFixed(2),
        ga.totalClients,
        ga.totalRecruits,
        ga.createdAt,
      ]);

      const csv = "\uFEFF" + [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      logger.info("[adminExportGroupAdmins] Export completed", {
        total: groupAdmins.length,
        filters: input,
      });

      return {
        success: true,
        data: groupAdmins,
        csv,
      };
    } catch (error) {
      logger.error("[adminExportGroupAdmins] Error", { error });
      throw new HttpsError("internal", "Failed to export GroupAdmins");
    }
  }
);

// ============================================================================
// BULK GROUP ADMIN ACTION
// ============================================================================

/**
 * Bulk actions on multiple group admins
 */
export const adminBulkGroupAdminAction = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { groupAdminIds, action } = request.data || {};

    if (!groupAdminIds || !Array.isArray(groupAdminIds) || groupAdminIds.length === 0) {
      throw new HttpsError("invalid-argument", "groupAdminIds is required");
    }
    if (!action || !["activate", "suspend"].includes(action)) {
      throw new HttpsError("invalid-argument", "action must be 'activate' or 'suspend'");
    }

    const db = getFirestore();
    const batch = db.batch();
    const now = Timestamp.now();
    let processed = 0;

    try {
      for (const groupAdminId of groupAdminIds) {
        const groupAdminRef = db.collection("group_admins").doc(groupAdminId);
        const groupAdminDoc = await groupAdminRef.get();

        if (!groupAdminDoc.exists) continue;

        if (action === "activate") {
          batch.update(groupAdminRef, {
            status: "active" as GroupAdminStatus,
            updatedAt: now,
          });
        } else if (action === "suspend") {
          batch.update(groupAdminRef, {
            status: "suspended" as GroupAdminStatus,
            updatedAt: now,
          });
        }
        processed++;
      }

      await batch.commit();

      logger.info("[adminBulkGroupAdminAction] Bulk action applied", {
        action,
        processed,
        total: groupAdminIds.length,
      });

      return { success: true, message: `${action} applied to ${processed} group admins` };
    } catch (error) {
      logger.error("[adminBulkGroupAdminAction] Error", { action, error });
      throw new HttpsError("internal", "Failed to apply bulk action");
    }
  }
);
