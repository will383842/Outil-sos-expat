/**
 * @deprecated This service is deprecated.
 * Use the centralized payment system (payment/ module) instead.
 * Withdrawals now go through payment_withdrawals collection.
 *
 * Influencer Withdrawal Service (Legacy)
 *
 * Handles withdrawal requests for influencers:
 * - Creating withdrawal requests
 * - Processing withdrawals (approve, reject, complete, fail)
 * - Getting pending withdrawals
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Influencer,
  InfluencerCommission,
  InfluencerWithdrawal,
  InfluencerPaymentMethod,
  InfluencerPaymentDetails,
} from "../types";
import { getInfluencerConfigCached } from "../utils/influencerConfigService";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateWithdrawalInput {
  influencerId: string;
  amount?: number; // If not provided, withdraw all available
  paymentMethod: InfluencerPaymentMethod;
  paymentDetails: InfluencerPaymentDetails;
}

export interface CreateWithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  amount?: number;
  error?: string;
}

export interface ProcessWithdrawalResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// CREATE WITHDRAWAL REQUEST
// ============================================================================

/**
 * Create a new withdrawal request
 */
export async function createWithdrawalRequest(
  input: CreateWithdrawalInput
): Promise<CreateWithdrawalResult> {
  const db = getFirestore();
  const { influencerId, amount: requestedAmount, paymentMethod, paymentDetails } = input;

  try {
    // 1. Get influencer data
    const influencerDoc = await db.collection("influencers").doc(influencerId).get();

    if (!influencerDoc.exists) {
      return { success: false, error: "Influencer not found" };
    }

    const influencer = influencerDoc.data() as Influencer;

    // 2. Check influencer status
    if (influencer.status !== "active") {
      return { success: false, error: `Account is ${influencer.status}` };
    }

    // 3. Check if there's already a pending withdrawal
    if (influencer.pendingWithdrawalId) {
      return { success: false, error: "A withdrawal request is already pending" };
    }

    // 4. Get config and check if withdrawals are enabled
    const config = await getInfluencerConfigCached();

    if (!config.withdrawalsEnabled) {
      return { success: false, error: "Withdrawals are currently disabled" };
    }

    // 5. Pre-calculate withdrawal amount for validation
    const withdrawAmount = requestedAmount || influencer.availableBalance;

    if (withdrawAmount <= 0) {
      return { success: false, error: "No balance available for withdrawal" };
    }

    // 6. Check minimum withdrawal amount
    if (withdrawAmount < config.minimumWithdrawalAmount) {
      const minDollars = config.minimumWithdrawalAmount / 100;
      return {
        success: false,
        error: `Minimum withdrawal amount is $${minDollars}`,
      };
    }

    // 7. Get available commissions to include
    const availableCommissions = await db
      .collection("influencer_commissions")
      .where("influencerId", "==", influencerId)
      .where("status", "==", "available")
      .get();

    const commissionIds: string[] = [];
    let totalFromCommissions = 0;

    for (const doc of availableCommissions.docs) {
      const commission = doc.data() as InfluencerCommission;
      if (totalFromCommissions + commission.amount <= withdrawAmount) {
        commissionIds.push(doc.id);
        totalFromCommissions += commission.amount;
      }
      if (totalFromCommissions >= withdrawAmount) break;
    }

    // 8. Create withdrawal document
    const now = Timestamp.now();
    const withdrawalRef = db.collection("influencer_withdrawals").doc();

    // 9. ATOMIC transaction: re-verify balance + create withdrawal + deduct balance
    // FIX: Balance is now verified INSIDE the transaction to prevent race condition
    // where two concurrent withdrawals both pass the balance check.
    await db.runTransaction(async (transaction) => {
      // Re-read influencer INSIDE transaction for accurate balance
      const influencerRef = db.collection("influencers").doc(influencerId);
      const freshInfluencerDoc = await transaction.get(influencerRef);

      if (!freshInfluencerDoc.exists) {
        throw new Error("Influencer not found");
      }

      const freshInfluencer = freshInfluencerDoc.data() as Influencer;

      // Validate balance INSIDE transaction (prevents race condition)
      if (withdrawAmount > freshInfluencer.availableBalance) {
        throw new Error("Insufficient balance");
      }

      // Check for pending withdrawal INSIDE transaction
      if (freshInfluencer.pendingWithdrawalId) {
        throw new Error("A withdrawal request is already pending");
      }

      const withdrawal: InfluencerWithdrawal = {
        id: withdrawalRef.id,
        influencerId,
        influencerEmail: freshInfluencer.email,
        influencerName: `${freshInfluencer.firstName} ${freshInfluencer.lastName}`,
        amount: withdrawAmount,
        sourceCurrency: "USD",
        targetCurrency: paymentDetails.currency || "USD",
        status: "pending",
        paymentMethod,
        paymentDetailsSnapshot: paymentDetails,
        commissionIds,
        commissionCount: commissionIds.length,
        requestedAt: now,
      };

      // Create withdrawal
      transaction.set(withdrawalRef, withdrawal);

      // Update influencer (decrement balance + set lock)
      transaction.update(influencerRef, {
        availableBalance: FieldValue.increment(-withdrawAmount),
        pendingWithdrawalId: withdrawalRef.id,
        updatedAt: now,
      });

      // Mark commissions as paid
      for (const commissionId of commissionIds) {
        const commissionRef = db.collection("influencer_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "paid",
          withdrawalId: withdrawalRef.id,
          paidAt: now,
          updatedAt: now,
        });
      }
    });

    logger.info("[influencer.createWithdrawalRequest] Withdrawal created", {
      withdrawalId: withdrawalRef.id,
      influencerId,
      amount: withdrawAmount,
      paymentMethod,
    });

    return {
      success: true,
      withdrawalId: withdrawalRef.id,
      amount: withdrawAmount,
    };
  } catch (error) {
    logger.error("[influencer.createWithdrawalRequest] Error", { influencerId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create withdrawal",
    };
  }
}

// ============================================================================
// APPROVE WITHDRAWAL
// ============================================================================

/**
 * Approve a pending withdrawal (admin action)
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminId: string,
  notes?: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("influencer_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as InfluencerWithdrawal;

    if (withdrawal.status !== "pending") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await withdrawalRef.update({
      status: "approved",
      processedAt: now,
      processedBy: adminId,
      adminNotes: notes || null,
      updatedAt: now,
    });

    logger.info("[influencer.approveWithdrawal] Withdrawal approved", {
      withdrawalId,
      adminId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.approveWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve withdrawal",
    };
  }
}

// ============================================================================
// REJECT WITHDRAWAL
// ============================================================================

/**
 * Reject a pending withdrawal (admin action)
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminId: string,
  reason: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("influencer_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as InfluencerWithdrawal;

    if (withdrawal.status !== "pending" && withdrawal.status !== "approved") {
      return { success: false, error: `Cannot reject: status is ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "rejected",
        processedAt: now,
        processedBy: adminId,
        rejectionReason: reason,
        updatedAt: now,
      });

      // Clear pending withdrawal from influencer
      const influencerRef = db.collection("influencers").doc(withdrawal.influencerId);
      transaction.update(influencerRef, {
        pendingWithdrawalId: null,
        updatedAt: now,
      });

      // Reset commissions back to available
      for (const commissionId of withdrawal.commissionIds) {
        const commissionRef = db.collection("influencer_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "available",
          withdrawalId: null,
          paidAt: null,
          updatedAt: now,
        });
      }
    });

    logger.info("[influencer.rejectWithdrawal] Withdrawal rejected", {
      withdrawalId,
      adminId,
      reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.rejectWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject withdrawal",
    };
  }
}

// ============================================================================
// MARK AS PROCESSING
// ============================================================================

/**
 * Mark a withdrawal as processing (payment in progress)
 */
export async function markWithdrawalProcessing(
  withdrawalId: string,
  paymentReference?: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("influencer_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as InfluencerWithdrawal;

    if (withdrawal.status !== "approved") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await withdrawalRef.update({
      status: "processing",
      paymentReference: paymentReference || null,
      updatedAt: now,
    });

    logger.info("[influencer.markWithdrawalProcessing] Withdrawal processing", {
      withdrawalId,
      paymentReference,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.markWithdrawalProcessing] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as processing",
    };
  }
}

// ============================================================================
// COMPLETE WITHDRAWAL
// ============================================================================

/**
 * Complete a withdrawal (payment successful)
 */
export async function completeWithdrawal(
  withdrawalId: string,
  paymentReference?: string,
  exchangeRate?: number,
  convertedAmount?: number
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("influencer_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as InfluencerWithdrawal;

    if (withdrawal.status !== "approved" && withdrawal.status !== "processing") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "completed",
        paymentReference: paymentReference || withdrawal.paymentReference,
        exchangeRate: exchangeRate || null,
        convertedAmount: convertedAmount || null,
        completedAt: now,
        updatedAt: now,
      });

      // Update influencer - deduct from available balance
      const influencerRef = db.collection("influencers").doc(withdrawal.influencerId);
      const influencerDoc = await transaction.get(influencerRef);

      if (influencerDoc.exists) {
        const influencer = influencerDoc.data() as Influencer;
        transaction.update(influencerRef, {
          availableBalance: Math.max(0, influencer.availableBalance - withdrawal.amount),
          pendingWithdrawalId: null,
          updatedAt: now,
        });
      }
    });

    // Create notification for influencer
    const notificationRef = db.collection("influencer_notifications").doc();
    await notificationRef.set({
      id: notificationRef.id,
      influencerId: withdrawal.influencerId,
      type: "withdrawal_completed",
      title: "Retrait effectué",
      titleTranslations: { en: "Withdrawal completed" },
      message: `Votre retrait de $${(withdrawal.amount / 100).toFixed(2)} a été effectué avec succès.`,
      messageTranslations: {
        en: `Your withdrawal of $${(withdrawal.amount / 100).toFixed(2)} has been completed successfully.`,
      },
      actionUrl: "/influencer/paiements",
      isRead: false,
      emailSent: false,
      data: {
        withdrawalId,
        amount: withdrawal.amount,
      },
      createdAt: now,
    });

    logger.info("[influencer.completeWithdrawal] Withdrawal completed", {
      withdrawalId,
      amount: withdrawal.amount,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.completeWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete withdrawal",
    };
  }
}

// ============================================================================
// FAIL WITHDRAWAL
// ============================================================================

/**
 * Mark a withdrawal as failed
 */
export async function failWithdrawal(
  withdrawalId: string,
  reason: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("influencer_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as InfluencerWithdrawal;

    if (withdrawal.status !== "approved" && withdrawal.status !== "processing") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "failed",
        failedAt: now,
        failureReason: reason,
        updatedAt: now,
      });

      // Clear pending withdrawal from influencer
      const influencerRef = db.collection("influencers").doc(withdrawal.influencerId);
      transaction.update(influencerRef, {
        pendingWithdrawalId: null,
        updatedAt: now,
      });

      // Reset commissions back to available
      for (const commissionId of withdrawal.commissionIds) {
        const commissionRef = db.collection("influencer_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "available",
          withdrawalId: null,
          paidAt: null,
          updatedAt: now,
        });
      }
    });

    // Create notification for influencer
    const notificationRef = db.collection("influencer_notifications").doc();
    await notificationRef.set({
      id: notificationRef.id,
      influencerId: withdrawal.influencerId,
      type: "withdrawal_rejected",
      title: "Retrait échoué",
      titleTranslations: { en: "Withdrawal failed" },
      message: `Votre retrait de $${(withdrawal.amount / 100).toFixed(2)} a échoué. ${reason}`,
      messageTranslations: {
        en: `Your withdrawal of $${(withdrawal.amount / 100).toFixed(2)} has failed. ${reason}`,
      },
      actionUrl: "/influencer/paiements",
      isRead: false,
      emailSent: false,
      data: {
        withdrawalId,
        amount: withdrawal.amount,
      },
      createdAt: now,
    });

    logger.info("[influencer.failWithdrawal] Withdrawal failed", {
      withdrawalId,
      reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("[influencer.failWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark withdrawal as failed",
    };
  }
}

// ============================================================================
// GET WITHDRAWALS
// ============================================================================

/**
 * Get pending withdrawals (for admin)
 */
export async function getPendingWithdrawals(
  limit: number = 50
): Promise<InfluencerWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("influencer_withdrawals")
    .where("status", "in", ["pending", "approved", "processing"])
    .orderBy("requestedAt", "asc")
    .limit(limit)
    .get();

  return query.docs.map((doc) => doc.data() as InfluencerWithdrawal);
}

/**
 * Get influencer's withdrawals
 */
export async function getInfluencerWithdrawals(
  influencerId: string,
  limit: number = 20
): Promise<InfluencerWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("influencer_withdrawals")
    .where("influencerId", "==", influencerId)
    .orderBy("requestedAt", "desc")
    .limit(limit)
    .get();

  return query.docs.map((doc) => doc.data() as InfluencerWithdrawal);
}
