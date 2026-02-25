/**
 * Callable: requestWithdrawal
 *
 * Creates a withdrawal request for the chatter.
 * Delegates to the centralized payment system (payment_withdrawals collection).
 *
 * Migration: Previously wrote to chatter_withdrawals, now uses payment/ module.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  ChatterPaymentDetails,
  ChatterPaymentMethod,
} from "../types";
import { getChatterConfigCached, areWithdrawalsEnabled, getMinimumWithdrawalAmount } from "../utils";
import { getPaymentService } from "../../payment/services/paymentService";
import {
  PaymentMethodDetails,
  BankTransferDetails,
  MobileMoneyDetails,
} from "../../payment/types";
import { sendWithdrawalConfirmation, WithdrawalConfirmationRole } from "../../telegram/withdrawalConfirmation";
import { TELEGRAM_SECRETS } from "../../lib/secrets";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Convert legacy Chatter payment details to centralized PaymentMethodDetails
 */
function convertToPaymentMethodDetails(
  method: ChatterPaymentMethod,
  details: ChatterPaymentDetails
): PaymentMethodDetails {
  switch (method) {
    case "wise":
      return {
        type: "bank_transfer",
        accountHolderName: (details as { accountHolderName: string }).accountHolderName,
        country: (details as { country?: string }).country || "",
        currency: (details as { currency?: string }).currency || "USD",
        iban: (details as { iban?: string }).iban,
        accountNumber: (details as { accountNumber?: string }).accountNumber,
        routingNumber: (details as { routingNumber?: string }).routingNumber,
        sortCode: (details as { sortCode?: string }).sortCode,
        swiftBic: (details as { bic?: string }).bic,
      } as BankTransferDetails;

    case "bank_transfer":
      return {
        type: "bank_transfer",
        accountHolderName: (details as { accountHolderName: string }).accountHolderName,
        country: (details as { country?: string }).country || "",
        currency: (details as { currency?: string }).currency || "USD",
        accountNumber: (details as { accountNumber?: string }).accountNumber,
        routingNumber: (details as { routingNumber?: string }).routingNumber,
        swiftBic: (details as { swiftCode?: string }).swiftCode,
        iban: (details as { iban?: string }).iban,
        bankName: (details as { bankName?: string }).bankName,
      } as BankTransferDetails;

    case "mobile_money":
      return {
        type: "mobile_money",
        provider: (details as { provider: string }).provider,
        phoneNumber: (details as { phoneNumber: string }).phoneNumber,
        country: (details as { country: string }).country,
        accountName: (details as { accountName?: string }).accountName || (details as { accountHolderName?: string }).accountHolderName || "",
        currency: (details as { currency?: string }).currency || "XOF",
      } as MobileMoneyDetails;

    default:
      throw new HttpsError("invalid-argument", `Unsupported payment method: ${method}`);
  }
}

export const requestWithdrawal = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
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

    // 2. Validate input
    const input = request.data as RequestWithdrawalInput;

    if (!input.paymentMethod) {
      throw new HttpsError("invalid-argument", "Payment method is required");
    }

    if (!input.paymentDetails) {
      throw new HttpsError("invalid-argument", "Payment details are required");
    }

    // Validate payment details based on method
    validatePaymentDetails(input.paymentMethod, input.paymentDetails);

    // 2b. Verify Telegram is connected (required for withdrawal confirmation)
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists || !userDoc.data()?.telegramId) {
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_REQUIRED: You must connect Telegram before requesting a withdrawal"
      );
    }

    try {
      // 3. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // 4. Check chatter status
      if (chatter.status !== "active") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot request withdrawal: account is ${chatter.status}`
        );
      }

      // 5. Check for existing pending withdrawal (legacy field check)
      if (chatter.pendingWithdrawalId) {
        throw new HttpsError(
          "failed-precondition",
          "A withdrawal request is already pending"
        );
      }

      // 6. Get config and validate
      const config = await getChatterConfigCached();

      if (!areWithdrawalsEnabled(config)) {
        throw new HttpsError(
          "failed-precondition",
          "Withdrawals are currently disabled"
        );
      }

      const minimumAmount = getMinimumWithdrawalAmount(config);
      const requestedAmount = input.amount || chatter.availableBalance;

      if (requestedAmount < minimumAmount) {
        throw new HttpsError(
          "invalid-argument",
          `Minimum withdrawal amount is $${(minimumAmount / 100).toFixed(2)}`
        );
      }

      if (requestedAmount > chatter.availableBalance) {
        throw new HttpsError(
          "invalid-argument",
          `Insufficient balance. Available: $${(chatter.availableBalance / 100).toFixed(2)}`
        );
      }

      // 7. Convert legacy details → centralized format
      const centralizedDetails = convertToPaymentMethodDetails(
        input.paymentMethod,
        input.paymentDetails
      );

      // 8. Save payment method in centralized system
      const paymentService = getPaymentService();
      const paymentMethod = await paymentService.savePaymentMethod({
        userId,
        userType: "chatter",
        details: centralizedDetails,
        setAsDefault: true,
      });

      // 9. Create withdrawal via centralized service
      const withdrawal = await paymentService.createWithdrawalRequest({
        userId,
        userType: "chatter",
        userEmail: chatter.email || "",
        userName: chatter.firstName || "",
        amount: requestedAmount,
        paymentMethodId: paymentMethod.id,
      });

      // 10. Set pendingWithdrawalId on chatter doc (backward compatibility)
      await db.collection("chatters").doc(userId).update({
        pendingWithdrawalId: withdrawal.id,
        updatedAt: Timestamp.now(),
      });

      // 11. Send Telegram confirmation
      const telegramId = userDoc.data()?.telegramId as number;
      const methodLabels: Record<string, string> = {
        bank_transfer: "Virement bancaire",
        mobile_money: "Mobile Money",
        wise: "Wise",
      };
      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId: withdrawal.id,
        userId,
        role: "chatter" as WithdrawalConfirmationRole,
        collection: "payment_withdrawals",
        amount: requestedAmount,
        paymentMethod: methodLabels[input.paymentMethod] || input.paymentMethod,
        telegramId,
      });

      if (!confirmResult.success) {
        logger.warn("[requestWithdrawal] Telegram confirmation failed, cancelling withdrawal", {
          withdrawalId: withdrawal.id, userId,
        });
        try {
          const svc = getPaymentService();
          await svc.cancelWithdrawal(withdrawal.id, userId, "Telegram confirmation failed to send");
        } catch (cancelErr) {
          logger.error("[requestWithdrawal] Failed to auto-cancel", { withdrawalId: withdrawal.id, error: cancelErr });
        }
        throw new HttpsError("unavailable", "TELEGRAM_SEND_FAILED");
      }

      logger.info("[requestWithdrawal] Withdrawal requested via centralized system", {
        chatterId: userId,
        withdrawalId: withdrawal.id,
        amount: requestedAmount,
        paymentMethod: input.paymentMethod,
        collection: "payment_withdrawals",
      });

      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: requestedAmount,
        status: "pending",
        telegramConfirmationRequired: true,
        message: "Withdrawal request submitted successfully. Please confirm via Telegram.",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      // Surface transaction-level errors (race condition protection) as user-friendly messages
      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg.includes("Insufficient balance")) {
        throw new HttpsError("failed-precondition", "Insufficient balance for this withdrawal");
      }
      if (errMsg.includes("already pending")) {
        throw new HttpsError("failed-precondition", "A withdrawal request is already pending");
      }

      logger.error("[requestWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to request withdrawal");
    }
  }
);

/**
 * Validate payment details based on method (unchanged from legacy)
 */
function validatePaymentDetails(
  method: string,
  details: ChatterPaymentDetails
): void {
  if (details.type !== method.replace("_", "-").toLowerCase().replace("-", "_")) {
    if (
      (method === "wise" && details.type !== "wise") ||
      (method === "mobile_money" && details.type !== "mobile_money") ||
      (method === "bank_transfer" && details.type !== "bank_transfer")
    ) {
      throw new HttpsError(
        "invalid-argument",
        `Payment details type mismatch: expected ${method}, got ${details.type}`
      );
    }
  }

  switch (method) {
    case "wise":
      if (details.type !== "wise") {
        throw new HttpsError("invalid-argument", "Invalid Wise payment details");
      }
      if (!details.email || !details.currency || !details.accountHolderName) {
        throw new HttpsError(
          "invalid-argument",
          "Wise requires email, currency, and account holder name"
        );
      }
      break;

    case "mobile_money":
      if (details.type !== "mobile_money") {
        throw new HttpsError("invalid-argument", "Invalid Mobile Money payment details");
      }
      if (!details.provider || !details.phoneNumber || !details.country) {
        throw new HttpsError(
          "invalid-argument",
          "Mobile Money requires provider, phone number, and country"
        );
      }
      if (!/^\+?[0-9]{8,15}$/.test(details.phoneNumber.replace(/\s/g, ""))) {
        throw new HttpsError("invalid-argument", "Invalid phone number format");
      }
      break;

    case "bank_transfer":
      if (details.type !== "bank_transfer") {
        throw new HttpsError("invalid-argument", "Invalid bank transfer details");
      }
      if (!details.bankName || !details.accountHolderName || !details.accountNumber) {
        throw new HttpsError(
          "invalid-argument",
          "Bank transfer requires bank name, account holder name, and account number"
        );
      }
      break;

    default:
      throw new HttpsError("invalid-argument", `Unknown payment method: ${method}`);
  }
}
