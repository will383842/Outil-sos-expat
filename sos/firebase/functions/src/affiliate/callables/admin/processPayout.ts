/**
 * Admin Payout Processing
 *
 * Admin functions for processing affiliate payouts:
 * - Approve and process via Wise (automatic)
 * - Approve and mark as manually processed
 * - Reject payout
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { WISE_PAYOUT_SECRETS, ENCRYPTION_KEY } from "../../../lib/secrets";
import { AffiliatePayout, PayoutStatus } from "../../types";
import { decryptBankDetails } from "../../utils/bankDetailsEncryption";
import {
  isWiseConfigured,
  getOrCreateRecipient,
  calculatePayoutDetails,
  executeWisePayout,
  WiseApiError,
} from "../../wise";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Check if user is admin
 */
async function isAdmin(uid: string): Promise<boolean> {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) return false;

  const userData = userDoc.data()!;
  return userData.role === "admin" || userData.isAdmin === true;
}

// ============================================================================
// APPROVE AND PROCESS VIA WISE (AUTOMATIC)
// ============================================================================

export const adminProcessPayoutWise = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: true,
    secrets: WISE_PAYOUT_SECRETS,
  },
  async (request) => {
    ensureInitialized();

    const { payoutId } = request.data as { payoutId: string };

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!payoutId) {
      throw new HttpsError("invalid-argument", "Payout ID is required");
    }

    const adminUid = request.auth.uid;

    // Verify admin
    if (!(await isAdmin(adminUid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    // Check Wise configuration
    if (!isWiseConfigured()) {
      throw new HttpsError(
        "failed-precondition",
        "Wise is not configured. Use manual processing instead."
      );
    }

    const db = getFirestore();

    try {
      // Get payout document
      const payoutRef = db.collection("affiliate_payouts").doc(payoutId);
      const payoutDoc = await payoutRef.get();

      if (!payoutDoc.exists) {
        throw new HttpsError("not-found", "Payout not found");
      }

      const payout = { id: payoutDoc.id, ...payoutDoc.data() } as AffiliatePayout;

      // Verify payout status
      if (payout.status !== "pending" && payout.status !== "approved") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot process payout with status: ${payout.status}`
        );
      }

      logger.info("[adminProcessPayoutWise] Processing payout", {
        payoutId,
        userId: payout.userId,
        amount: payout.amount,
        adminUid,
      });

      // Get user bank details
      const userDoc = await db.collection("users").doc(payout.userId).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data()!;
      const bankDetails = userData.bankDetails;

      if (!bankDetails) {
        throw new HttpsError("failed-precondition", "User has no bank details");
      }

      // Decrypt bank details
      const decryptedValues = decryptBankDetails(bankDetails);

      // Update status to processing
      await payoutRef.update({
        status: "processing" as PayoutStatus,
        processedAt: Timestamp.now(),
        processedBy: adminUid,
        updatedAt: Timestamp.now(),
      });

      try {
        // 1. Get or create recipient in Wise
        const recipient = await getOrCreateRecipient(bankDetails, decryptedValues);

        // Update bank details with Wise recipient ID
        await db.collection("users").doc(payout.userId).update({
          "bankDetails.wiseRecipientId": recipient.id.toString(),
          updatedAt: Timestamp.now(),
        });

        // 2. Create quote
        const payoutDetails = await calculatePayoutDetails(
          payout.amount,
          payout.targetCurrency
        );

        // 3. Execute the payout
        const { transfer } = await executeWisePayout(
          recipient.id,
          payoutDetails.quote.id,
          payoutId,
          `SOS-Expat Affiliate Payout`
        );

        // 4. Update payout with Wise details
        await payoutRef.update({
          status: "processing" as PayoutStatus,
          wiseRecipientId: recipient.id.toString(),
          wiseQuoteId: payoutDetails.quote.id,
          wiseTransferId: transfer.id.toString(),
          wiseTransferStatus: transfer.status,
          exchangeRate: payoutDetails.rate,
          convertedAmount: Math.round(payoutDetails.targetAmount * 100), // Store in cents
          estimatedArrival: Timestamp.fromDate(new Date(payoutDetails.estimatedDelivery)),
          updatedAt: Timestamp.now(),
        });

        logger.info("[adminProcessPayoutWise] Payout initiated via Wise", {
          payoutId,
          transferId: transfer.id,
          status: transfer.status,
        });

        return {
          success: true,
          message: "Payout initiated via Wise",
          transferId: transfer.id,
          status: transfer.status,
          estimatedArrival: payoutDetails.estimatedDelivery,
          exchangeRate: payoutDetails.rate,
          fee: payoutDetails.fee,
        };
      } catch (wiseError) {
        // Wise processing failed, revert to pending
        logger.error("[adminProcessPayoutWise] Wise processing failed", {
          payoutId,
          error: wiseError,
        });

        await payoutRef.update({
          status: "pending" as PayoutStatus,
          processedAt: null,
          processedBy: null,
          failureReason:
            wiseError instanceof WiseApiError
              ? wiseError.message
              : "Wise processing failed",
          updatedAt: Timestamp.now(),
        });

        throw new HttpsError(
          "internal",
          wiseError instanceof WiseApiError
            ? wiseError.message
            : "Wise processing failed. Try manual processing."
        );
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[adminProcessPayoutWise] Error", {
        payoutId,
        error,
      });

      throw new HttpsError("internal", "Failed to process payout");
    }
  }
);

// ============================================================================
// MARK AS MANUALLY PROCESSED
// ============================================================================

export const adminProcessPayoutManual = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
    secrets: [ENCRYPTION_KEY],
  },
  async (request) => {
    ensureInitialized();

    const { payoutId, transactionReference, notes } = request.data as {
      payoutId: string;
      transactionReference?: string;
      notes?: string;
    };

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!payoutId) {
      throw new HttpsError("invalid-argument", "Payout ID is required");
    }

    const adminUid = request.auth.uid;

    // Verify admin
    if (!(await isAdmin(adminUid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      // Get payout document
      const payoutRef = db.collection("affiliate_payouts").doc(payoutId);
      const payoutDoc = await payoutRef.get();

      if (!payoutDoc.exists) {
        throw new HttpsError("not-found", "Payout not found");
      }

      const payout = { id: payoutDoc.id, ...payoutDoc.data() } as AffiliatePayout;

      // Verify payout status
      if (payout.status !== "pending" && payout.status !== "approved") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot process payout with status: ${payout.status}`
        );
      }

      logger.info("[adminProcessPayoutManual] Processing payout manually", {
        payoutId,
        userId: payout.userId,
        amount: payout.amount,
        adminUid,
      });

      // Update payout as completed
      await payoutRef.update({
        status: "completed" as PayoutStatus,
        processedAt: Timestamp.now(),
        processedBy: adminUid,
        completedAt: Timestamp.now(),
        adminNotes: notes
          ? `[Manual] ${notes}${transactionReference ? ` - Ref: ${transactionReference}` : ""}`
          : transactionReference
          ? `[Manual] Transaction ref: ${transactionReference}`
          : "[Manual] Processed manually by admin",
        updatedAt: Timestamp.now(),
      });

      // Update user's pendingPayoutId
      await db.collection("users").doc(payout.userId).update({
        pendingPayoutId: null,
        updatedAt: Timestamp.now(),
      });

      // Update commissions as paid
      const batch = db.batch();
      for (const commissionId of payout.commissionIds) {
        const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
        batch.update(commissionRef, {
          status: "paid",
          paidAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      await batch.commit();

      logger.info("[adminProcessPayoutManual] Payout marked as completed", {
        payoutId,
        commissionCount: payout.commissionIds.length,
      });

      return {
        success: true,
        message: "Payout marked as completed",
        payoutId,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[adminProcessPayoutManual] Error", {
        payoutId,
        error,
      });

      throw new HttpsError("internal", "Failed to process payout");
    }
  }
);

// ============================================================================
// REJECT PAYOUT
// ============================================================================

export const adminRejectPayout = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    ensureInitialized();

    const { payoutId, reason } = request.data as {
      payoutId: string;
      reason: string;
    };

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!payoutId) {
      throw new HttpsError("invalid-argument", "Payout ID is required");
    }

    if (!reason || reason.trim().length < 5) {
      throw new HttpsError("invalid-argument", "A rejection reason is required (min 5 characters)");
    }

    const adminUid = request.auth.uid;

    // Verify admin
    if (!(await isAdmin(adminUid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      // Get payout document
      const payoutRef = db.collection("affiliate_payouts").doc(payoutId);
      const payoutDoc = await payoutRef.get();

      if (!payoutDoc.exists) {
        throw new HttpsError("not-found", "Payout not found");
      }

      const payout = { id: payoutDoc.id, ...payoutDoc.data() } as AffiliatePayout;

      // Verify payout status
      if (payout.status !== "pending" && payout.status !== "approved") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot reject payout with status: ${payout.status}`
        );
      }

      logger.info("[adminRejectPayout] Rejecting payout", {
        payoutId,
        userId: payout.userId,
        amount: payout.amount,
        reason,
        adminUid,
      });

      // Start transaction to revert balances
      await db.runTransaction(async (transaction) => {
        // Update payout as rejected
        transaction.update(payoutRef, {
          status: "rejected" as PayoutStatus,
          processedAt: Timestamp.now(),
          processedBy: adminUid,
          rejectionReason: reason.trim(),
          updatedAt: Timestamp.now(),
        });

        // Revert commissions to available
        for (const commissionId of payout.commissionIds) {
          const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
          transaction.update(commissionRef, {
            status: "available",
            payoutId: null,
            updatedAt: Timestamp.now(),
          });
        }

        // Restore user's available balance
        const userRef = db.collection("users").doc(payout.userId);
        transaction.update(userRef, {
          availableBalance: FieldValue.increment(payout.amount),
          pendingPayoutId: null,
          updatedAt: Timestamp.now(),
        });
      });

      logger.info("[adminRejectPayout] Payout rejected and balance restored", {
        payoutId,
        amount: payout.amount,
        commissionCount: payout.commissionIds.length,
      });

      return {
        success: true,
        message: "Payout rejected and balance restored",
        payoutId,
        restoredAmount: payout.amount,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[adminRejectPayout] Error", {
        payoutId,
        error,
      });

      throw new HttpsError("internal", "Failed to reject payout");
    }
  }
);

// ============================================================================
// APPROVE PAYOUT (without immediate processing)
// ============================================================================

export const adminApprovePayout = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    ensureInitialized();

    const { payoutId, notes } = request.data as {
      payoutId: string;
      notes?: string;
    };

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!payoutId) {
      throw new HttpsError("invalid-argument", "Payout ID is required");
    }

    const adminUid = request.auth.uid;

    // Verify admin
    if (!(await isAdmin(adminUid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      // Get payout document
      const payoutRef = db.collection("affiliate_payouts").doc(payoutId);
      const payoutDoc = await payoutRef.get();

      if (!payoutDoc.exists) {
        throw new HttpsError("not-found", "Payout not found");
      }

      const payout = { id: payoutDoc.id, ...payoutDoc.data() } as AffiliatePayout;

      // Verify payout status
      if (payout.status !== "pending") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot approve payout with status: ${payout.status}`
        );
      }

      logger.info("[adminApprovePayout] Approving payout", {
        payoutId,
        userId: payout.userId,
        amount: payout.amount,
        adminUid,
      });

      // Update payout as approved
      await payoutRef.update({
        status: "approved" as PayoutStatus,
        processedAt: Timestamp.now(),
        processedBy: adminUid,
        adminNotes: notes || null,
        updatedAt: Timestamp.now(),
      });

      logger.info("[adminApprovePayout] Payout approved", { payoutId });

      return {
        success: true,
        message: "Payout approved. Ready for processing.",
        payoutId,
        wiseConfigured: isWiseConfigured(),
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[adminApprovePayout] Error", {
        payoutId,
        error,
      });

      throw new HttpsError("internal", "Failed to approve payout");
    }
  }
);

// ============================================================================
// GET PENDING PAYOUTS
// ============================================================================

export const adminGetPendingPayouts = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const adminUid = request.auth.uid;

    // Verify admin
    if (!(await isAdmin(adminUid))) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      // Get pending and approved payouts
      const payoutsQuery = await db
        .collection("affiliate_payouts")
        .where("status", "in", ["pending", "approved", "processing"])
        .orderBy("requestedAt", "desc")
        .limit(100)
        .get();

      const payouts = payoutsQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info("[adminGetPendingPayouts] Retrieved payouts", {
        count: payouts.length,
      });

      return {
        success: true,
        payouts,
        wiseConfigured: isWiseConfigured(),
      };
    } catch (error) {
      logger.error("[adminGetPendingPayouts] Error", { error });
      throw new HttpsError("internal", "Failed to get pending payouts");
    }
  }
);
