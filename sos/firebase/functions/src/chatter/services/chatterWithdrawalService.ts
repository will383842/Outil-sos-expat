/**
 * @deprecated This service is deprecated.
 * Use the centralized payment system (payment/ module) instead.
 * Withdrawals now go through payment_withdrawals collection.
 *
 * Chatter Withdrawal Service (Legacy)
 *
 * Handles withdrawal requests and processing:
 * - Creating withdrawal requests
 * - Processing via Wise or Mobile Money
 * - Completing/failing withdrawals
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterCommission,
  ChatterWithdrawal,
  ChatterPaymentMethod,
  ChatterPaymentDetails,
} from "../types";
import {
  getChatterConfigCached,
  getMinimumWithdrawalAmount,
  areWithdrawalsEnabled,
} from "../utils/chatterConfigService";

// ============================================================================
// TYPES
// ============================================================================

export interface CreateWithdrawalInput {
  chatterId: string;
  amount?: number; // If not provided, withdraw all available
  paymentMethod: ChatterPaymentMethod;
  paymentDetails: ChatterPaymentDetails;
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
  paymentReference?: string;
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
  const { chatterId, amount: requestedAmount, paymentMethod, paymentDetails } = input;

  try {
    // 1. Get config and check if withdrawals are enabled
    const config = await getChatterConfigCached();

    if (!areWithdrawalsEnabled(config)) {
      return { success: false, error: "Withdrawals are currently disabled" };
    }

    // 2. Get chatter data
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();

    if (!chatterDoc.exists) {
      return { success: false, error: "Chatter not found" };
    }

    const chatter = chatterDoc.data() as Chatter;

    // 3. Check chatter status
    if (chatter.status !== "active") {
      return { success: false, error: `Chatter is ${chatter.status}` };
    }

    // 4. Check for existing pending withdrawal
    if (chatter.pendingWithdrawalId) {
      return { success: false, error: "A withdrawal is already pending" };
    }

    // 5. Calculate withdrawal amount
    const minimumAmount = getMinimumWithdrawalAmount(config);
    const amount = requestedAmount || chatter.availableBalance;

    if (amount < minimumAmount) {
      return {
        success: false,
        error: `Minimum withdrawal amount is $${(minimumAmount / 100).toFixed(2)}`,
      };
    }

    if (amount > chatter.availableBalance) {
      return {
        success: false,
        error: `Insufficient balance. Available: $${(chatter.availableBalance / 100).toFixed(2)}`,
      };
    }

    // 6. Get commissions to include in withdrawal
    const availableCommissions = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", chatterId)
      .where("status", "==", "available")
      .orderBy("createdAt", "asc")
      .get();

    const commissionIds: string[] = [];
    let totalAmount = 0;

    for (const doc of availableCommissions.docs) {
      if (totalAmount >= amount) break;
      commissionIds.push(doc.id);
      totalAmount += (doc.data() as ChatterCommission).amount;
    }

    // 7. Create withdrawal document
    const now = Timestamp.now();
    const withdrawalRef = db.collection("chatter_withdrawals").doc();

    const withdrawal: ChatterWithdrawal = {
      id: withdrawalRef.id,
      chatterId,
      chatterEmail: chatter.email,
      chatterName: `${chatter.firstName} ${chatter.lastName}`,
      amount,
      sourceCurrency: "USD",
      targetCurrency: paymentDetails.type === "wise"
        ? (paymentDetails as { currency: string }).currency
        : paymentDetails.type === "mobile_money"
        ? (paymentDetails as { currency: string }).currency
        : (paymentDetails as { currency: string }).currency,
      status: "pending",
      paymentMethod,
      paymentDetailsSnapshot: paymentDetails,
      commissionIds,
      commissionCount: commissionIds.length,
      requestedAt: now,
    };

    // 8. Execute in transaction
    await db.runTransaction(async (transaction) => {
      // Re-read chatter for consistency
      const chatterRef = db.collection("chatters").doc(chatterId);
      const freshChatter = await transaction.get(chatterRef);

      if (!freshChatter.exists) {
        throw new Error("Chatter not found in transaction");
      }

      const currentData = freshChatter.data() as Chatter;

      if (currentData.pendingWithdrawalId) {
        throw new Error("Withdrawal already pending");
      }

      if (currentData.availableBalance < amount) {
        throw new Error("Insufficient balance");
      }

      // Create withdrawal
      transaction.set(withdrawalRef, withdrawal);

      // Update chatter
      transaction.update(chatterRef, {
        availableBalance: currentData.availableBalance - amount,
        pendingWithdrawalId: withdrawalRef.id,
        preferredPaymentMethod: paymentMethod,
        paymentDetails,
        updatedAt: now,
      });

      // Mark commissions as paid (aligned with Influencer/Blogger/GroupAdmin)
      for (const commissionId of commissionIds) {
        const commissionRef = db.collection("chatter_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "paid",
          withdrawalId: withdrawalRef.id,
          paidAt: now,
          updatedAt: now,
        });
      }
    });

    logger.info("[createWithdrawalRequest] Withdrawal created", {
      withdrawalId: withdrawalRef.id,
      chatterId,
      amount,
      paymentMethod,
      commissionsCount: commissionIds.length,
    });

    return {
      success: true,
      withdrawalId: withdrawalRef.id,
      amount,
    };
  } catch (error) {
    logger.error("[createWithdrawalRequest] Error", { chatterId, error });
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
 * Approve a pending withdrawal
 */
export async function approveWithdrawal(
  withdrawalId: string,
  processedBy: string,
  notes?: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("chatter_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as ChatterWithdrawal;

    if (withdrawal.status !== "pending") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await withdrawalRef.update({
      status: "approved",
      processedAt: now,
      processedBy,
      adminNotes: notes,
      updatedAt: now,
    });

    logger.info("[approveWithdrawal] Withdrawal approved", {
      withdrawalId,
      processedBy,
    });

    return { success: true };
  } catch (error) {
    logger.error("[approveWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve withdrawal",
    };
  }
}

/**
 * Reject a pending withdrawal
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  processedBy: string,
  reason: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("chatter_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as ChatterWithdrawal;

    if (withdrawal.status !== "pending" && withdrawal.status !== "approved") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update withdrawal
      transaction.update(withdrawalRef, {
        status: "rejected",
        processedAt: now,
        processedBy,
        rejectionReason: reason,
        updatedAt: now,
      });

      // Return funds to chatter
      const chatterRef = db.collection("chatters").doc(withdrawal.chatterId);
      const chatterDoc = await transaction.get(chatterRef);

      if (chatterDoc.exists) {
        const chatter = chatterDoc.data() as Chatter;
        transaction.update(chatterRef, {
          availableBalance: chatter.availableBalance + withdrawal.amount,
          pendingWithdrawalId: null,
          updatedAt: now,
        });
      }

      // Revert commission withdrawalIds
      for (const commissionId of withdrawal.commissionIds) {
        const commissionRef = db.collection("chatter_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          withdrawalId: null,
          updatedAt: now,
        });
      }
    });

    logger.info("[rejectWithdrawal] Withdrawal rejected", {
      withdrawalId,
      processedBy,
      reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("[rejectWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject withdrawal",
    };
  }
}

/**
 * Mark withdrawal as processing (payment initiated)
 */
export async function markWithdrawalProcessing(
  withdrawalId: string,
  paymentReference?: string
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("chatter_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as ChatterWithdrawal;

    if (withdrawal.status !== "approved") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();
    const updates: Record<string, unknown> = {
      status: "processing",
      updatedAt: now,
    };

    if (paymentReference) {
      updates.paymentReference = paymentReference;
    }

    await withdrawalRef.update(updates);

    logger.info("[markWithdrawalProcessing] Withdrawal processing", {
      withdrawalId,
      paymentReference,
    });

    return { success: true, paymentReference };
  } catch (error) {
    logger.error("[markWithdrawalProcessing] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update withdrawal",
    };
  }
}

/**
 * Complete a withdrawal successfully
 */
export async function completeWithdrawal(
  withdrawalId: string,
  paymentReference?: string,
  exchangeRate?: number,
  convertedAmount?: number
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("chatter_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as ChatterWithdrawal;

    if (withdrawal.status !== "approved" && withdrawal.status !== "processing") {
      return { success: false, error: `Invalid status: ${withdrawal.status}` };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      // Update withdrawal
      const updates: Record<string, unknown> = {
        status: "completed",
        completedAt: now,
        updatedAt: now,
      };

      if (paymentReference) {
        updates.paymentReference = paymentReference;
      }
      if (exchangeRate !== undefined) {
        updates.exchangeRate = exchangeRate;
      }
      if (convertedAmount !== undefined) {
        updates.convertedAmount = convertedAmount;
      }

      transaction.update(withdrawalRef, updates);

      // Clear pending withdrawal from chatter
      const chatterRef = db.collection("chatters").doc(withdrawal.chatterId);
      transaction.update(chatterRef, {
        pendingWithdrawalId: null,
        updatedAt: now,
      });

      // Mark commissions as paid
      for (const commissionId of withdrawal.commissionIds) {
        const commissionRef = db.collection("chatter_commissions").doc(commissionId);
        transaction.update(commissionRef, {
          status: "paid",
          paidAt: now,
          updatedAt: now,
        });
      }
    });

    logger.info("[completeWithdrawal] Withdrawal completed", {
      withdrawalId,
      paymentReference,
      amount: withdrawal.amount,
      exchangeRate,
      convertedAmount,
    });

    return { success: true, paymentReference };
  } catch (error) {
    logger.error("[completeWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete withdrawal",
    };
  }
}

/**
 * Mark withdrawal as failed
 */
export async function failWithdrawal(
  withdrawalId: string,
  reason: string,
  returnFunds: boolean = true
): Promise<ProcessWithdrawalResult> {
  const db = getFirestore();

  try {
    const withdrawalRef = db.collection("chatter_withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      return { success: false, error: "Withdrawal not found" };
    }

    const withdrawal = withdrawalDoc.data() as ChatterWithdrawal;

    if (withdrawal.status === "completed" || withdrawal.status === "rejected") {
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

      // Return funds to chatter if requested
      if (returnFunds) {
        const chatterRef = db.collection("chatters").doc(withdrawal.chatterId);
        const chatterDoc = await transaction.get(chatterRef);

        if (chatterDoc.exists) {
          const chatter = chatterDoc.data() as Chatter;
          transaction.update(chatterRef, {
            availableBalance: chatter.availableBalance + withdrawal.amount,
            pendingWithdrawalId: null,
            updatedAt: now,
          });
        }

        // Revert commission withdrawalIds
        for (const commissionId of withdrawal.commissionIds) {
          const commissionRef = db.collection("chatter_commissions").doc(commissionId);
          transaction.update(commissionRef, {
            withdrawalId: null,
            updatedAt: now,
          });
        }
      } else {
        // Just clear the pending withdrawal
        const chatterRef = db.collection("chatters").doc(withdrawal.chatterId);
        transaction.update(chatterRef, {
          pendingWithdrawalId: null,
          updatedAt: now,
        });
      }
    });

    logger.info("[failWithdrawal] Withdrawal failed", {
      withdrawalId,
      reason,
      returnFunds,
    });

    return { success: true };
  } catch (error) {
    logger.error("[failWithdrawal] Error", { withdrawalId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fail withdrawal",
    };
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get pending withdrawals for admin review
 */
export async function getPendingWithdrawals(
  limit: number = 50
): Promise<ChatterWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("chatter_withdrawals")
    .where("status", "in", ["pending", "approved", "processing"])
    .orderBy("requestedAt", "asc")
    .limit(limit)
    .get();

  return query.docs.map((doc) => doc.data() as ChatterWithdrawal);
}

/**
 * Get withdrawals for a specific chatter
 */
export async function getChatterWithdrawals(
  chatterId: string,
  limit: number = 20
): Promise<ChatterWithdrawal[]> {
  const db = getFirestore();

  const query = await db
    .collection("chatter_withdrawals")
    .where("chatterId", "==", chatterId)
    .orderBy("requestedAt", "desc")
    .limit(limit)
    .get();

  return query.docs.map((doc) => doc.data() as ChatterWithdrawal);
}
