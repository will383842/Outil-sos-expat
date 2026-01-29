/**
 * Callable: requestInfluencerWithdrawal
 *
 * Creates a withdrawal request for an influencer.
 * Minimum withdrawal: $50
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  RequestInfluencerWithdrawalInput,
  RequestInfluencerWithdrawalResponse,
  InfluencerPaymentMethod,
} from "../types";
import { getInfluencerConfigCached } from "../utils";
import { createWithdrawalRequest } from "../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const VALID_PAYMENT_METHODS: InfluencerPaymentMethod[] = [
  "wise", "paypal", "bank_transfer"
];

export const requestWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<RequestInfluencerWithdrawalResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RequestInfluencerWithdrawalInput;

    if (!input.paymentMethod || !VALID_PAYMENT_METHODS.includes(input.paymentMethod)) {
      throw new HttpsError("invalid-argument", "Valid payment method is required");
    }

    if (!input.paymentDetails) {
      throw new HttpsError("invalid-argument", "Payment details are required");
    }

    if (input.paymentDetails.type !== input.paymentMethod) {
      throw new HttpsError(
        "invalid-argument",
        "Payment details type must match payment method"
      );
    }

    // Validate payment details based on type (using discriminated union)
    const details = input.paymentDetails;
    switch (details.type) {
      case "wise":
        if (!details.email || !details.accountHolderName) {
          throw new HttpsError("invalid-argument", "Wise requires email and account holder name");
        }
        break;
      case "paypal":
        if (!details.email || !details.accountHolderName) {
          throw new HttpsError("invalid-argument", "PayPal requires email and account holder name");
        }
        break;
      case "bank_transfer":
        if (
          !details.bankName ||
          !details.accountHolderName ||
          !details.accountNumber
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Bank transfer requires bank name, account holder, and account number"
          );
        }
        break;
    }

    try {
      // 3. Get influencer data
      const influencerDoc = await db.collection("influencers").doc(userId).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      const influencer = influencerDoc.data() as Influencer;

      // 4. Check status
      if (influencer.status !== "active") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot withdraw: account is ${influencer.status}`
        );
      }

      // 5. Check for pending withdrawal
      if (influencer.pendingWithdrawalId) {
        throw new HttpsError(
          "failed-precondition",
          "You already have a pending withdrawal request"
        );
      }

      // 6. Check config
      const config = await getInfluencerConfigCached();

      if (!config.withdrawalsEnabled) {
        throw new HttpsError("failed-precondition", "Withdrawals are currently disabled");
      }

      // 7. Calculate amount
      const withdrawAmount = input.amount || influencer.availableBalance;

      if (withdrawAmount <= 0) {
        throw new HttpsError("failed-precondition", "No balance available for withdrawal");
      }

      if (withdrawAmount > influencer.availableBalance) {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient balance. Available: $${(influencer.availableBalance / 100).toFixed(2)}`
        );
      }

      if (withdrawAmount < config.minimumWithdrawalAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Minimum withdrawal amount is $${(config.minimumWithdrawalAmount / 100).toFixed(2)}`
        );
      }

      // 8. Create withdrawal request
      const result = await createWithdrawalRequest({
        influencerId: userId,
        amount: withdrawAmount,
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to create withdrawal request");
      }

      logger.info("[requestInfluencerWithdrawal] Withdrawal requested", {
        influencerId: userId,
        withdrawalId: result.withdrawalId,
        amount: withdrawAmount,
        paymentMethod: input.paymentMethod,
      });

      return {
        success: true,
        withdrawalId: result.withdrawalId!,
        amount: result.amount!,
        status: "pending",
        message: "Withdrawal request submitted successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[requestInfluencerWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to process withdrawal request");
    }
  }
);
