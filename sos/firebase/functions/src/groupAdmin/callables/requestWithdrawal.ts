/**
 * Callable: requestGroupAdminWithdrawal
 *
 * Creates a withdrawal request for a GroupAdmin.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminWithdrawal,
  GroupAdminCommission,
  RequestWithdrawalRequest,
  RequestWithdrawalResponse,
  GroupAdminPaymentMethod,
} from "../types";
import { areWithdrawalsEnabled, getMinimumWithdrawalAmount } from "../groupAdminConfig";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Valid payment methods
const VALID_PAYMENT_METHODS: GroupAdminPaymentMethod[] = [
  "wise", "paypal", "mobile_money", "bank_transfer"
];

export const requestGroupAdminWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<RequestWithdrawalResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as RequestWithdrawalRequest;

    try {
      // 2. Check withdrawals enabled
      if (!await areWithdrawalsEnabled()) {
        throw new HttpsError("failed-precondition", "Withdrawals are currently disabled");
      }

      // 3. Validate input
      if (!input.amount || input.amount <= 0) {
        throw new HttpsError("invalid-argument", "Invalid withdrawal amount");
      }

      if (!input.paymentMethod || !VALID_PAYMENT_METHODS.includes(input.paymentMethod)) {
        throw new HttpsError("invalid-argument", "Invalid payment method");
      }

      if (!input.paymentDetails) {
        throw new HttpsError("invalid-argument", "Payment details are required");
      }

      // Validate payment details match method
      if (input.paymentDetails.type !== input.paymentMethod) {
        throw new HttpsError("invalid-argument", "Payment details type must match payment method");
      }

      // 4. Get GroupAdmin
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      // Check status
      if (groupAdmin.status !== "active") {
        throw new HttpsError("permission-denied", "Your account is not active");
      }

      // Check for pending withdrawal
      if (groupAdmin.pendingWithdrawalId) {
        throw new HttpsError("failed-precondition", "You already have a pending withdrawal request");
      }

      // 5. Check minimum withdrawal amount
      const minimumAmount = await getMinimumWithdrawalAmount();
      if (input.amount < minimumAmount) {
        throw new HttpsError(
          "invalid-argument",
          `Minimum withdrawal amount is $${(minimumAmount / 100).toFixed(2)}`
        );
      }

      // 6. Check available balance
      if (input.amount > groupAdmin.availableBalance) {
        throw new HttpsError(
          "invalid-argument",
          `Insufficient balance. Available: $${(groupAdmin.availableBalance / 100).toFixed(2)}`
        );
      }

      // 7. Get commissions to include in withdrawal
      const commissionsSnapshot = await db
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", userId)
        .where("status", "==", "available")
        .orderBy("availableAt", "asc")
        .get();

      const commissionsToInclude: string[] = [];
      let runningTotal = 0;

      for (const doc of commissionsSnapshot.docs) {
        if (runningTotal >= input.amount) break;

        const commission = doc.data() as GroupAdminCommission;
        commissionsToInclude.push(commission.id);
        runningTotal += commission.amount;
      }

      if (runningTotal < input.amount) {
        throw new HttpsError(
          "invalid-argument",
          "Not enough available commissions to cover this withdrawal"
        );
      }

      // 8. Create withdrawal request in transaction
      const withdrawalId = db.collection("group_admin_withdrawals").doc().id;

      await db.runTransaction(async (transaction) => {
        // Create withdrawal
        const withdrawalRef = db.collection("group_admin_withdrawals").doc(withdrawalId);
        const withdrawal: GroupAdminWithdrawal = {
          id: withdrawalId,
          groupAdminId: userId,
          amount: input.amount,
          currency: "USD",
          status: "pending",
          paymentMethod: input.paymentMethod,
          paymentDetails: input.paymentDetails,
          commissionIds: commissionsToInclude,
          createdAt: Timestamp.now(),
        };
        transaction.set(withdrawalRef, withdrawal);

        // Update commissions status
        for (const commissionId of commissionsToInclude) {
          const commissionRef = db.collection("group_admin_commissions").doc(commissionId);
          transaction.update(commissionRef, {
            status: "paid",
            paidAt: Timestamp.now(),
            withdrawalId,
          });
        }

        // Update GroupAdmin balance
        transaction.update(groupAdminDoc.ref, {
          availableBalance: FieldValue.increment(-input.amount),
          pendingWithdrawalId: withdrawalId,
          updatedAt: Timestamp.now(),
        });
      });

      logger.info("[requestGroupAdminWithdrawal] Withdrawal requested", {
        groupAdminId: userId,
        withdrawalId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        commissionsCount: commissionsToInclude.length,
      });

      // Estimate processing time based on method
      const processingTimes: Record<GroupAdminPaymentMethod, string> = {
        wise: "1-2 business days",
        paypal: "1-3 business days",
        mobile_money: "1-2 business days",
        bank_transfer: "3-5 business days",
      };

      return {
        success: true,
        withdrawalId,
        amount: input.amount,
        estimatedProcessingTime: processingTimes[input.paymentMethod],
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[requestGroupAdminWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to create withdrawal request");
    }
  }
);
