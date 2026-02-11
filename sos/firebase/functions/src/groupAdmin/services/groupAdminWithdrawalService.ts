/**
 * @deprecated This service is deprecated.
 * Use the centralized payment system (payment/ module) instead.
 * Withdrawals now go through payment_withdrawals collection.
 *
 * GroupAdmin Withdrawal Service (Legacy)
 *
 * Handles withdrawal processing and status management.
 */

import { getFirestore, Timestamp, FieldValue, Firestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";

import {
  GroupAdminWithdrawal,
  GroupAdminWithdrawalStatus,
} from "../types";

// Lazy Firestore initialization
let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!getApps().length) {
    initializeApp();
  }
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

/**
 * Get pending withdrawals for processing
 */
export async function getPendingWithdrawals(limit: number = 50): Promise<GroupAdminWithdrawal[]> {
  try {
    const snapshot = await getDb()
      .collection("group_admin_withdrawals")
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as GroupAdminWithdrawal);
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error getting pending withdrawals", { error });
    return [];
  }
}

/**
 * Approve a withdrawal
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string
): Promise<boolean> {
  try {
    const withdrawalRef = getDb().collection("group_admin_withdrawals").doc(withdrawalId);

    // Transaction ensures atomic status check + update (prevents concurrent approvals)
    const result = await getDb().runTransaction(async (tx) => {
      const withdrawalDoc = await tx.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        logger.error("[GroupAdminWithdrawal] Withdrawal not found", { withdrawalId });
        return false;
      }

      const withdrawal = withdrawalDoc.data() as GroupAdminWithdrawal;

      if (withdrawal.status !== "pending") {
        logger.warn("[GroupAdminWithdrawal] Cannot approve non-pending withdrawal", {
          withdrawalId,
          status: withdrawal.status,
        });
        return false;
      }

      tx.update(withdrawalRef, {
        status: "approved" as GroupAdminWithdrawalStatus,
        approvedAt: Timestamp.now(),
        approvedBy: adminId,
      });

      return true;
    });

    if (result) {
      logger.info("[GroupAdminWithdrawal] Withdrawal approved", {
        withdrawalId,
        adminId,
      });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error approving withdrawal", {
      withdrawalId,
      error,
    });
    return false;
  }
}

/**
 * Reject a withdrawal
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminId: string,
  reason: string
): Promise<boolean> {
  try {
    const withdrawalRef = getDb().collection("group_admin_withdrawals").doc(withdrawalId);

    // All checks + mutations inside transaction to prevent double-refund
    const result = await getDb().runTransaction(async (transaction) => {
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        logger.error("[GroupAdminWithdrawal] Withdrawal not found", { withdrawalId });
        return false;
      }

      const withdrawal = withdrawalDoc.data() as GroupAdminWithdrawal;

      if (!["pending", "approved"].includes(withdrawal.status)) {
        logger.warn("[GroupAdminWithdrawal] Cannot reject withdrawal in this status", {
          withdrawalId,
          status: withdrawal.status,
        });
        return false;
      }

      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "rejected" as GroupAdminWithdrawalStatus,
        rejectedAt: Timestamp.now(),
        rejectedBy: adminId,
        rejectionReason: reason,
      });

      // Refund commissions to available balance
      const groupAdminRef = getDb().collection("group_admins").doc(withdrawal.groupAdminId);
      transaction.update(groupAdminRef, {
        availableBalance: FieldValue.increment(withdrawal.amount),
        pendingWithdrawalId: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      // Revert commission statuses (with validation)
      if (Array.isArray(withdrawal.commissionIds)) {
        for (const commissionId of withdrawal.commissionIds) {
          if (typeof commissionId === "string" && commissionId) {
            const commissionRef = getDb().collection("group_admin_commissions").doc(commissionId);
            transaction.update(commissionRef, {
              status: "available",
              paidAt: FieldValue.delete(),
              withdrawalId: FieldValue.delete(),
            });
          }
        }
      }

      return true;
    });

    if (result) {
      logger.info("[GroupAdminWithdrawal] Withdrawal rejected", {
        withdrawalId,
        adminId,
        reason,
      });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error rejecting withdrawal", {
      withdrawalId,
      error,
    });
    return false;
  }
}

/**
 * Mark withdrawal as processing
 */
export async function startProcessingWithdrawal(withdrawalId: string): Promise<boolean> {
  try {
    const withdrawalRef = getDb().collection("group_admin_withdrawals").doc(withdrawalId);

    // Transaction to prevent concurrent status transitions
    const result = await getDb().runTransaction(async (tx) => {
      const withdrawalDoc = await tx.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        logger.error("[GroupAdminWithdrawal] Withdrawal not found", { withdrawalId });
        return false;
      }

      const withdrawal = withdrawalDoc.data() as GroupAdminWithdrawal;

      if (withdrawal.status !== "approved") {
        logger.warn("[GroupAdminWithdrawal] Can only process approved withdrawals", {
          withdrawalId,
          status: withdrawal.status,
        });
        return false;
      }

      tx.update(withdrawalRef, {
        status: "processing" as GroupAdminWithdrawalStatus,
        processingStartedAt: Timestamp.now(),
      });

      return true;
    });

    if (result) {
      logger.info("[GroupAdminWithdrawal] Withdrawal processing started", { withdrawalId });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error starting withdrawal processing", {
      withdrawalId,
      error,
    });
    return false;
  }
}

/**
 * Complete a withdrawal
 */
export async function completeWithdrawal(
  withdrawalId: string,
  paymentReference: string,
  processingFee: number = 0
): Promise<boolean> {
  try {
    const withdrawalRef = getDb().collection("group_admin_withdrawals").doc(withdrawalId);

    // All checks + mutations inside transaction to prevent double-completion
    const result = await getDb().runTransaction(async (transaction) => {
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        logger.error("[GroupAdminWithdrawal] Withdrawal not found", { withdrawalId });
        return false;
      }

      const withdrawal = withdrawalDoc.data() as GroupAdminWithdrawal;

      if (withdrawal.status !== "processing") {
        logger.warn("[GroupAdminWithdrawal] Can only complete processing withdrawals", {
          withdrawalId,
          status: withdrawal.status,
        });
        return false;
      }

      const netAmount = withdrawal.amount - processingFee;

      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "completed" as GroupAdminWithdrawalStatus,
        completedAt: Timestamp.now(),
        paymentReference,
        processingFee,
        netAmount,
      });

      // Update GroupAdmin total withdrawn
      // Use gross amount (withdrawal.amount) since availableBalance was already
      // deducted by the gross amount during the request phase
      const groupAdminRef = getDb().collection("group_admins").doc(withdrawal.groupAdminId);
      transaction.update(groupAdminRef, {
        totalWithdrawn: FieldValue.increment(withdrawal.amount),
        pendingWithdrawalId: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      return true;
    });

    if (result) {
      logger.info("[GroupAdminWithdrawal] Withdrawal completed", {
        withdrawalId,
        paymentReference,
      });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error completing withdrawal", {
      withdrawalId,
      error,
    });
    return false;
  }
}

/**
 * Mark withdrawal as failed
 */
export async function failWithdrawal(
  withdrawalId: string,
  reason: string
): Promise<boolean> {
  try {
    const withdrawalRef = getDb().collection("group_admin_withdrawals").doc(withdrawalId);

    // All checks + mutations inside transaction to prevent double-refund
    const result = await getDb().runTransaction(async (transaction) => {
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        logger.error("[GroupAdminWithdrawal] Withdrawal not found", { withdrawalId });
        return false;
      }

      const withdrawal = withdrawalDoc.data() as GroupAdminWithdrawal;

      if (withdrawal.status !== "processing") {
        logger.warn("[GroupAdminWithdrawal] Can only fail processing withdrawals", {
          withdrawalId,
          status: withdrawal.status,
        });
        return false;
      }

      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "failed" as GroupAdminWithdrawalStatus,
        failedAt: Timestamp.now(),
        failureReason: reason,
      });

      // Refund commissions to available balance
      const groupAdminRef = getDb().collection("group_admins").doc(withdrawal.groupAdminId);
      transaction.update(groupAdminRef, {
        availableBalance: FieldValue.increment(withdrawal.amount),
        pendingWithdrawalId: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      // Revert commission statuses (with validation)
      if (Array.isArray(withdrawal.commissionIds)) {
        for (const commissionId of withdrawal.commissionIds) {
          if (typeof commissionId === "string" && commissionId) {
            const commissionRef = getDb().collection("group_admin_commissions").doc(commissionId);
            transaction.update(commissionRef, {
              status: "available",
              paidAt: FieldValue.delete(),
              withdrawalId: FieldValue.delete(),
            });
          }
        }
      }

      return true;
    });

    if (result) {
      logger.info("[GroupAdminWithdrawal] Withdrawal failed", {
        withdrawalId,
        reason,
      });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error failing withdrawal", {
      withdrawalId,
      error,
    });
    return false;
  }
}

/**
 * Get withdrawal statistics
 */
export async function getWithdrawalStats(): Promise<{
  pending: { count: number; amount: number };
  processing: { count: number; amount: number };
  completedThisMonth: { count: number; amount: number };
}> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get pending
    const pendingSnapshot = await getDb()
      .collection("group_admin_withdrawals")
      .where("status", "==", "pending")
      .get();

    let pendingAmount = 0;
    pendingSnapshot.docs.forEach((doc) => {
      pendingAmount += (doc.data() as GroupAdminWithdrawal).amount;
    });

    // Get processing
    const processingSnapshot = await getDb()
      .collection("group_admin_withdrawals")
      .where("status", "==", "processing")
      .get();

    let processingAmount = 0;
    processingSnapshot.docs.forEach((doc) => {
      processingAmount += (doc.data() as GroupAdminWithdrawal).amount;
    });

    // Get completed this month
    const completedSnapshot = await getDb()
      .collection("group_admin_withdrawals")
      .where("status", "==", "completed")
      .where("completedAt", ">=", Timestamp.fromDate(startOfMonth))
      .get();

    let completedAmount = 0;
    completedSnapshot.docs.forEach((doc) => {
      const withdrawal = doc.data() as GroupAdminWithdrawal;
      completedAmount += withdrawal.netAmount || withdrawal.amount;
    });

    return {
      pending: { count: pendingSnapshot.size, amount: pendingAmount },
      processing: { count: processingSnapshot.size, amount: processingAmount },
      completedThisMonth: { count: completedSnapshot.size, amount: completedAmount },
    };
  } catch (error) {
    logger.error("[GroupAdminWithdrawal] Error getting withdrawal stats", { error });
    return {
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      completedThisMonth: { count: 0, amount: 0 },
    };
  }
}
