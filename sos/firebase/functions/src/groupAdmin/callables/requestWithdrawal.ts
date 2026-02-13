/**
 * Callable: requestGroupAdminWithdrawal
 *
 * Creates a withdrawal request for a GroupAdmin.
 * Uses atomic transaction for commission selection + balance deduction.
 * Writes to centralized payment_withdrawals collection.
 *
 * Migration: Previously wrote to group_admin_withdrawals, now uses payment/ module format.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminCommission,
  RequestWithdrawalRequest,
  RequestWithdrawalResponse,
  GroupAdminPaymentMethod,
} from "../types";
import { areWithdrawalsEnabled, getMinimumWithdrawalAmount } from "../groupAdminConfig";
import { getPaymentService } from "../../payment/services/paymentService";
import {
  PaymentMethodDetails,
  BankTransferDetails,
  MobileMoneyDetails,
  WithdrawalRequest,
  WithdrawalStatus,
  StatusHistoryEntry,
} from "../../payment/types";
import { COLLECTIONS } from "../../payment/services/paymentService";
import { sendWithdrawalConfirmation } from "../../telegram/withdrawalConfirmation";
import { TELEGRAM_SECRETS } from "../../lib/secrets";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Valid payment methods
const VALID_PAYMENT_METHODS: GroupAdminPaymentMethod[] = [
  "wise", "mobile_money", "bank_transfer"
];

/**
 * Convert legacy GroupAdmin payment details to centralized PaymentMethodDetails
 */
function convertToPaymentMethodDetails(
  method: GroupAdminPaymentMethod,
  details: Record<string, unknown>
): PaymentMethodDetails {
  switch (method) {
    case "wise":
      return {
        type: "bank_transfer",
        accountHolderName: (details.accountHolderName as string) || "",
        country: (details.country as string) || "",
        currency: (details.currency as string) || "USD",
        iban: details.iban as string | undefined,
        accountNumber: details.accountNumber as string | undefined,
        routingNumber: details.routingNumber as string | undefined,
        swiftBic: details.swiftCode as string | undefined,
      } as BankTransferDetails;

    case "bank_transfer":
      return {
        type: "bank_transfer",
        accountHolderName: (details.accountHolderName as string) || "",
        country: (details.country as string) || "",
        currency: (details.currency as string) || "USD",
        accountNumber: details.accountNumber as string | undefined,
        routingNumber: details.routingNumber as string | undefined,
        swiftBic: details.swiftCode as string | undefined,
        iban: details.iban as string | undefined,
        bankName: details.bankName as string | undefined,
      } as BankTransferDetails;

    case "mobile_money":
      return {
        type: "mobile_money",
        provider: details.provider as string,
        phoneNumber: details.phoneNumber as string,
        country: details.country as string,
        accountName: (details.accountName as string) || (details.accountHolderName as string) || "",
        currency: (details.currency as string) || "XOF",
      } as MobileMoneyDetails;

    default:
      throw new HttpsError("invalid-argument", `Unsupported payment method: ${method}`);
  }
}

export const requestGroupAdminWithdrawal = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
    secrets: [...TELEGRAM_SECRETS],
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

      if (input.paymentDetails.type !== input.paymentMethod) {
        throw new HttpsError("invalid-argument", "Payment details type must match payment method");
      }

      // 4a. Check telegramId BEFORE creating withdrawal (critical: avoid orphaned withdrawals)
      const userDoc = await db.collection("users").doc(userId).get();
      const telegramId = userDoc.data()?.telegramId as number | undefined;

      if (!telegramId) {
        throw new HttpsError("failed-precondition", "TELEGRAM_REQUIRED");
      }

      // 4b. Pre-validate (fast checks before transaction)
      const minimumAmount = await getMinimumWithdrawalAmount();
      if (input.amount < minimumAmount) {
        throw new HttpsError(
          "invalid-argument",
          `Minimum withdrawal amount is $${(minimumAmount / 100).toFixed(2)}`
        );
      }

      // 5. Convert payment details and save payment method
      const centralizedDetails = convertToPaymentMethodDetails(
        input.paymentMethod,
        input.paymentDetails as unknown as Record<string, unknown>
      );

      const paymentService = getPaymentService();
      const paymentMethod = await paymentService.savePaymentMethod({
        userId,
        userType: "group_admin",
        details: centralizedDetails,
        setAsDefault: true,
      });

      // 6. Get payment config for auto/manual mode
      const paymentConfig = await paymentService.getConfig();
      const isAutomatic =
        paymentConfig.paymentMode === 'automatic' ||
        (paymentConfig.paymentMode === 'hybrid' && input.amount <= paymentConfig.autoPaymentThreshold);

      // 7. Atomic transaction: validate state + select commissions + create withdrawal in payment_withdrawals
      const withdrawalId = db.collection(COLLECTIONS.WITHDRAWALS).doc().id;
      const now = new Date().toISOString();

      await db.runTransaction(async (transaction) => {
        // Re-read GroupAdmin inside transaction for atomic consistency
        const groupAdminDoc = await transaction.get(db.collection("group_admins").doc(userId));

        if (!groupAdminDoc.exists) {
          throw new HttpsError("not-found", "GroupAdmin profile not found");
        }

        const groupAdmin = groupAdminDoc.data() as GroupAdmin;

        if (groupAdmin.status !== "active") {
          throw new HttpsError("permission-denied", "Your account is not active");
        }

        // Atomic check: no concurrent pending withdrawal
        if (groupAdmin.pendingWithdrawalId) {
          throw new HttpsError("failed-precondition", "You already have a pending withdrawal request");
        }

        if (input.amount > groupAdmin.availableBalance) {
          throw new HttpsError(
            "invalid-argument",
            `Insufficient balance. Available: $${(groupAdmin.availableBalance / 100).toFixed(2)}`
          );
        }

        // Also check centralized system for pending withdrawals
        const pendingCheck = await db
          .collection(COLLECTIONS.WITHDRAWALS)
          .where('userId', '==', userId)
          .where('userType', '==', 'group_admin')
          .where('status', 'in', ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'])
          .limit(1)
          .get();

        if (!pendingCheck.empty) {
          throw new HttpsError("failed-precondition", "A withdrawal request is already pending");
        }

        // Select commissions to include
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
          commissionsToInclude.push(doc.id);
          runningTotal += (doc.data() as GroupAdminCommission).amount;
        }

        if (runningTotal < input.amount) {
          throw new HttpsError(
            "invalid-argument",
            "Not enough available commissions to cover this withdrawal"
          );
        }

        // Create withdrawal document in centralized collection
        const withdrawalRef = db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId);

        const initialStatus: WithdrawalStatus = 'pending';
        const initialHistory: StatusHistoryEntry = {
          status: initialStatus,
          timestamp: now,
          actor: userId,
          actorType: 'user',
          note: 'Withdrawal request submitted',
        };

        const withdrawal: WithdrawalRequest = {
          id: withdrawalId,
          userId,
          userType: 'group_admin',
          userEmail: groupAdmin.email || "",
          userName: groupAdmin.firstName || "",
          amount: input.amount,
          sourceCurrency: 'USD',
          targetCurrency: paymentMethod.details.currency || 'USD',
          paymentMethodId: paymentMethod.id,
          provider: paymentMethod.provider,
          methodType: paymentMethod.methodType,
          paymentDetails: paymentMethod.details,
          status: initialStatus,
          statusHistory: [initialHistory],
          isAutomatic,
          retryCount: 0,
          maxRetries: paymentConfig.maxRetries,
          requestedAt: now,
        };

        transaction.set(withdrawalRef, withdrawal);

        // Mark commissions as paid
        for (const commissionId of commissionsToInclude) {
          const commissionRef = db.collection("group_admin_commissions").doc(commissionId);
          transaction.update(commissionRef, {
            status: "paid",
            paidAt: Timestamp.now(),
            withdrawalId,
          });
        }

        // Deduct balance + lock account for this withdrawal
        transaction.update(groupAdminDoc.ref, {
          availableBalance: FieldValue.increment(-input.amount),
          pendingWithdrawalId: withdrawalId,
          updatedAt: Timestamp.now(),
        });
      });

      logger.info("[requestGroupAdminWithdrawal] Withdrawal requested via centralized system", {
        groupAdminId: userId,
        withdrawalId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        collection: "payment_withdrawals",
      });

      // Payment method label for Telegram message
      const methodLabels: Record<GroupAdminPaymentMethod, string> = {
        wise: "Wise",
        mobile_money: "Mobile Money",
        bank_transfer: "Virement bancaire",
      };

      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId,
        userId,
        role: "groupAdmin",
        collection: "payment_withdrawals",
        amount: input.amount,
        paymentMethod: methodLabels[input.paymentMethod] || input.paymentMethod,
        telegramId,
      });

      // If Telegram message failed to send, cancel the withdrawal to avoid orphaned state
      if (!confirmResult.success) {
        logger.warn("[requestGroupAdminWithdrawal] Telegram confirmation failed, cancelling", {
          withdrawalId, userId,
        });
        try {
          // Reverse the transaction: refund balance + clear pendingWithdrawalId
          await db.runTransaction(async (tx) => {
            tx.update(db.collection("group_admins").doc(userId), {
              availableBalance: FieldValue.increment(input.amount),
              pendingWithdrawalId: null,
              updatedAt: Timestamp.now(),
            });
            tx.update(db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId), {
              status: "cancelled",
              cancelledAt: new Date().toISOString(),
              statusHistory: FieldValue.arrayUnion({
                status: "cancelled",
                timestamp: new Date().toISOString(),
                actorType: "system",
                note: "Telegram confirmation failed to send",
              }),
            });
          });
        } catch (cancelErr) {
          logger.error("[requestGroupAdminWithdrawal] Failed to auto-cancel after Telegram failure", {
            withdrawalId, error: cancelErr,
          });
        }
        throw new HttpsError("unavailable", "TELEGRAM_SEND_FAILED");
      }

      // Estimate processing time based on method
      const processingTimes: Record<GroupAdminPaymentMethod, string> = {
        wise: "1-2 business days",
        mobile_money: "1-2 business days",
        bank_transfer: "3-5 business days",
      };

      return {
        success: true,
        withdrawalId,
        amount: input.amount,
        estimatedProcessingTime: processingTimes[input.paymentMethod],
        telegramConfirmationRequired: true,
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
