/**
 * Callable: requestWithdrawal
 *
 * Creates a withdrawal request for the chatter.
 * Validates balance, payment details, and creates request.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  ChatterPaymentDetails,
} from "../types";
import { createWithdrawalRequest } from "../services";
import { getChatterConfigCached, areWithdrawalsEnabled, getMinimumWithdrawalAmount } from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const requestWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
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

      // 5. Check for existing pending withdrawal
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

      // 7. Create withdrawal request
      const result = await createWithdrawalRequest({
        chatterId: userId,
        amount: requestedAmount,
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to create withdrawal");
      }

      logger.info("[requestWithdrawal] Withdrawal requested", {
        chatterId: userId,
        withdrawalId: result.withdrawalId,
        amount: result.amount,
        paymentMethod: input.paymentMethod,
      });

      return {
        success: true,
        withdrawalId: result.withdrawalId!,
        amount: result.amount!,
        status: "pending",
        message: "Withdrawal request submitted successfully. Processing typically takes 1-3 business days.",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[requestWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to request withdrawal");
    }
  }
);

/**
 * Validate payment details based on method
 */
function validatePaymentDetails(
  method: string,
  details: ChatterPaymentDetails
): void {
  if (details.type !== method.replace("_", "-").toLowerCase().replace("-", "_")) {
    // Allow some flexibility in type naming
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
      // Validate phone number format (basic check)
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
