/**
 * Blogger Withdrawal Service
 *
 * Handles withdrawal requests and processing for bloggers.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Blogger,
  BloggerWithdrawal,
  BloggerWithdrawalStatus,
  BloggerPaymentMethod,
  BloggerPaymentDetails,
  BloggerCommission,
} from "../types";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBloggerWithdrawalInput {
  bloggerId: string;
  amount?: number; // If not provided, withdraw all available
  paymentMethod: BloggerPaymentMethod;
  paymentDetails: BloggerPaymentDetails;
}

export interface CreateBloggerWithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  amount?: number;
  error?: string;
}

export interface ProcessBloggerWithdrawalInput {
  withdrawalId: string;
  action: "approve" | "reject" | "complete" | "fail";
  adminId: string;
  reason?: string;
  paymentReference?: string;
  notes?: string;
}

export interface ProcessBloggerWithdrawalResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// CREATE WITHDRAWAL
// ============================================================================

/**
 * Create a new withdrawal request
 */
export async function createBloggerWithdrawal(
  input: CreateBloggerWithdrawalInput
): Promise<CreateBloggerWithdrawalResult> {
  const db = getFirestore();
  const { bloggerId, amount: requestedAmount, paymentMethod, paymentDetails } = input;

  try {
    // 1. Get blogger
    const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

    if (!bloggerDoc.exists) {
      return { success: false, error: "Blogger not found" };
    }

    const blogger = bloggerDoc.data() as Blogger;

    // 2. Check status
    if (blogger.status !== "active") {
      return { success: false, error: "Blogger account is not active" };
    }

    // 3. Check for existing pending withdrawal
    if (blogger.pendingWithdrawalId) {
      return { success: false, error: "A withdrawal request is already pending" };
    }

    // 4. Get config
    const config = await getBloggerConfigCached();

    if (!config.withdrawalsEnabled) {
      return { success: false, error: "Withdrawals are currently disabled" };
    }

    // 5. Determine withdrawal amount
    const withdrawalAmount = requestedAmount || blogger.availableBalance;

    if (withdrawalAmount <= 0) {
      return { success: false, error: "No available balance to withdraw" };
    }

    if (withdrawalAmount > blogger.availableBalance) {
      return { success: false, error: "Insufficient available balance" };
    }

    if (withdrawalAmount < config.minimumWithdrawalAmount) {
      return {
        success: false,
        error: `Minimum withdrawal amount is $${config.minimumWithdrawalAmount / 100}`,
      };
    }

    // 6. Get available commissions to include in withdrawal
    const commissionsQuery = await db
      .collection("blogger_commissions")
      .where("bloggerId", "==", bloggerId)
      .where("status", "==", "available")
      .orderBy("createdAt", "asc")
      .get();

    const commissionIds: string[] = [];
    let totalFromCommissions = 0;

    for (const doc of commissionsQuery.docs) {
      if (totalFromCommissions >= withdrawalAmount) break;
      const commission = doc.data() as BloggerCommission;
      commissionIds.push(doc.id);
      totalFromCommissions += commission.amount;
    }

    // 7. Create withdrawal document
    const now = Timestamp.now();
    const withdrawalRef = db.collection("blogger_withdrawals").doc();

    // Determine target currency from payment details
    const targetCurrency = paymentDetails.currency || "USD";

    const withdrawal: BloggerWithdrawal = {
      id: withdrawalRef.id,
      bloggerId,
      bloggerEmail: blogger.email,
      bloggerName: `${blogger.firstName} ${blogger.lastName}`,
      amount: withdrawalAmount,
      sourceCurrency: "USD",
      targetCurrency,
      status: "pending",
      paymentMethod,
      paymentDetailsSnapshot: paymentDetails,
      commissionIds,
      commissionCount: commissionIds.length,
      requestedAt: now,
    };

    // 8. Run transaction to create withdrawal and update balances
    await db.runTransaction(async (transaction) => {
      const bloggerRef = db.collection("bloggers").doc(bloggerId);
      const freshBlogger = await transaction.get(bloggerRef);

      if (!freshBlogger.exists) {
        throw new Error("Blogger not found");
      }

      const currentData = freshBlogger.data() as Blogger;

      // Verify balance hasn't changed
      if (currentData.availableBalance < withdrawalAmount) {
        throw new Error("Insufficient balance");
      }

      // Create withdrawal
      transaction.set(withdrawalRef, withdrawal);

      // Update blogger
      transaction.update(bloggerRef, {
        availableBalance: currentData.availableBalance - withdrawalAmount,
        pendingWithdrawalId: withdrawalRef.id,
        updatedAt: now,
      });

      // Update commissions status to "paid"
      for (const commissionId of commissionIds) {
        const commissionRef = db.collection("blogger_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "paid",
          withdrawalId: withdrawalRef.id,
          paidAt: now,
          updatedAt: now,
        });
      }
    });

    logger.info("[createBloggerWithdrawal] Withdrawal created", {
      withdrawalId: withdrawalRef.id,
      bloggerId,
      amount: withdrawalAmount,
      commissionCount: commissionIds.length,
    });

    return {
      success: true,
      withdrawalId: withdrawalRef.id,
      amount: withdrawalAmount,
    };
  } catch (error) {
    logger.error("[createBloggerWithdrawal] Error", { bloggerId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create withdrawal",
    };
  }
}

// ============================================================================
// PROCESS WITHDRAWAL (ADMIN)
// ============================================================================

/**
 * Process a withdrawal request (admin action)
 */
export async function processBloggerWithdrawal(
  input: ProcessBloggerWithdrawalInput
): Promise<ProcessBloggerWithdrawalResult> {
  const db = getFirestore();
  const { withdrawalId, action, adminId, reason, paymentReference, notes } = input;

  try {
    const withdrawalRef = db.collection("blogger_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as BloggerWithdrawal;
    const now = Timestamp.now();

    // Validate action based on current status
    const validTransitions: Record<BloggerWithdrawalStatus, BloggerWithdrawalStatus[]> = {
      pending: ["approved", "rejected"],
      approved: ["processing", "completed", "failed"],
      processing: ["completed", "failed"],
      completed: [],
      failed: [],
      rejected: [],
    };

    const newStatus = getStatusFromAction(action);
    if (!validTransitions[withdrawal.status].includes(newStatus)) {
      return {
        success: false,
        error: `Cannot ${action} withdrawal with status ${withdrawal.status}`,
      };
    }

    // Build update object
    const updates: Partial<BloggerWithdrawal> & { updatedAt: Timestamp } = {
      status: newStatus,
      processedBy: adminId,
      processedAt: now,
      updatedAt: Timestamp.now(),
    };

    if (notes) {
      updates.adminNotes = notes;
    }

    if (paymentReference) {
      updates.paymentReference = paymentReference;
    }

    // Handle specific actions
    switch (action) {
      case "approve":
        // Just update status
        break;

      case "reject":
        updates.rejectionReason = reason || "Rejected by admin";
        // Need to refund balance
        await refundWithdrawal(withdrawal, db, now);
        break;

      case "complete":
        updates.completedAt = now;
        // Update blogger's totalWithdrawn
        await db.collection("bloggers").doc(withdrawal.bloggerId).update({
          totalWithdrawn: (await db.collection("bloggers").doc(withdrawal.bloggerId).get())
            .data()?.totalWithdrawn + withdrawal.amount || withdrawal.amount,
          pendingWithdrawalId: null,
          updatedAt: now,
        });
        break;

      case "fail":
        updates.failedAt = now;
        updates.failureReason = reason || "Payment failed";
        // Need to refund balance
        await refundWithdrawal(withdrawal, db, now);
        break;
    }

    await withdrawalRef.update(updates);

    // Clear pendingWithdrawalId for non-pending terminal states
    if (["rejected", "completed", "failed"].includes(newStatus)) {
      await db.collection("bloggers").doc(withdrawal.bloggerId).update({
        pendingWithdrawalId: null,
        updatedAt: now,
      });
    }

    logger.info("[processBloggerWithdrawal] Withdrawal processed", {
      withdrawalId,
      action,
      newStatus,
      adminId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[processBloggerWithdrawal] Error", { withdrawalId, action, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process withdrawal",
    };
  }
}

/**
 * Get status from action
 */
function getStatusFromAction(action: string): BloggerWithdrawalStatus {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "complete":
      return "completed";
    case "fail":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Refund withdrawal to blogger's available balance
 */
async function refundWithdrawal(
  withdrawal: BloggerWithdrawal,
  db: FirebaseFirestore.Firestore,
  now: Timestamp
): Promise<void> {
  // Restore blogger's available balance
  const bloggerRef = db.collection("bloggers").doc(withdrawal.bloggerId);
  const bloggerDoc = await bloggerRef.get();

  if (bloggerDoc.exists) {
    const blogger = bloggerDoc.data() as Blogger;
    await bloggerRef.update({
      availableBalance: blogger.availableBalance + withdrawal.amount,
      pendingWithdrawalId: null,
      updatedAt: now,
    });
  }

  // Restore commissions to "available" status
  for (const commissionId of withdrawal.commissionIds) {
    const commissionRef = db.collection("blogger_commissions").doc(commissionId);
    await commissionRef.update({
      status: "available",
      withdrawalId: null,
      paidAt: null,
      updatedAt: now,
    });
  }

  logger.info("[refundWithdrawal] Withdrawal refunded", {
    withdrawalId: withdrawal.id,
    bloggerId: withdrawal.bloggerId,
    amount: withdrawal.amount,
    commissionsRestored: withdrawal.commissionIds.length,
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get withdrawals for a blogger
 */
export async function getBloggerWithdrawals(
  bloggerId: string,
  limit = 20
): Promise<BloggerWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("blogger_withdrawals")
    .where("bloggerId", "==", bloggerId)
    .orderBy("requestedAt", "desc")
    .limit(limit)
    .get();

  return query.docs.map(doc => doc.data() as BloggerWithdrawal);
}

/**
 * Get pending withdrawals for admin
 */
export async function getPendingBloggerWithdrawals(
  limit = 50
): Promise<BloggerWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("blogger_withdrawals")
    .where("status", "in", ["pending", "approved", "processing"])
    .orderBy("requestedAt", "asc")
    .limit(limit)
    .get();

  return query.docs.map(doc => doc.data() as BloggerWithdrawal);
}
