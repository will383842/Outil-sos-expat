/**
 * Callable: requestInfluencerWithdrawal
 *
 * Creates a withdrawal request for an influencer.
 * Delegates to the centralized payment system (payment_withdrawals collection).
 *
 * Migration: Previously wrote to influencer_withdrawals, now uses payment/ module.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  RequestInfluencerWithdrawalInput,
  RequestInfluencerWithdrawalResponse,
  InfluencerPaymentMethod,
} from "../types";
import { getInfluencerConfigCached } from "../utils";
import { getPaymentService } from "../../payment/services/paymentService";
import {
  PaymentMethodDetails,
  BankTransferDetails,
  MobileMoneyDetails,
} from "../../payment/types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const VALID_PAYMENT_METHODS: InfluencerPaymentMethod[] = [
  "wise", "bank_transfer", "mobile_money"
];

/**
 * Convert legacy Influencer payment details to centralized PaymentMethodDetails
 */
function convertToPaymentMethodDetails(
  method: InfluencerPaymentMethod,
  details: Record<string, unknown>
): PaymentMethodDetails {
  switch (method) {
    case "wise":
      return {
        type: "bank_transfer",
        accountHolderName: details.accountHolderName as string,
        country: (details.country as string) || "",
        currency: (details.currency as string) || "USD",
        iban: details.iban as string | undefined,
        accountNumber: details.accountNumber as string | undefined,
        routingNumber: details.routingNumber as string | undefined,
        sortCode: details.sortCode as string | undefined,
        swiftBic: details.bic as string | undefined,
      } as BankTransferDetails;

    case "bank_transfer":
      return {
        type: "bank_transfer",
        accountHolderName: details.accountHolderName as string,
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

export const requestWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true,
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

    // Validate payment details based on type
    const details = input.paymentDetails;
    switch (details.type) {
      case "wise":
        if (!details.email || !details.accountHolderName) {
          throw new HttpsError("invalid-argument", "Wise requires email and account holder name");
        }
        break;
      case "bank_transfer":
        if (!details.bankName || !details.accountHolderName || !details.accountNumber) {
          throw new HttpsError(
            "invalid-argument",
            "Bank transfer requires bank name, account holder, and account number"
          );
        }
        break;
      case "mobile_money":
        if (!details.provider || !details.phoneNumber || !details.country) {
          throw new HttpsError(
            "invalid-argument",
            "Mobile Money requires provider, phone number, and country"
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

      // 5. Check for pending withdrawal (legacy field check)
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

      // 8. Convert legacy details → centralized format
      const centralizedDetails = convertToPaymentMethodDetails(
        input.paymentMethod,
        input.paymentDetails as unknown as Record<string, unknown>
      );

      // 9. Save payment method in centralized system
      const paymentService = getPaymentService();
      const paymentMethod = await paymentService.savePaymentMethod({
        userId,
        userType: "influencer",
        details: centralizedDetails,
        setAsDefault: true,
      });

      // 10. Create withdrawal via centralized service
      const withdrawal = await paymentService.createWithdrawalRequest({
        userId,
        userType: "influencer",
        userEmail: influencer.email || "",
        userName: influencer.firstName || "",
        amount: withdrawAmount,
        paymentMethodId: paymentMethod.id,
      });

      // 11. Set pendingWithdrawalId on influencer doc (backward compatibility)
      await db.collection("influencers").doc(userId).update({
        pendingWithdrawalId: withdrawal.id,
        updatedAt: Timestamp.now(),
      });

      logger.info("[requestInfluencerWithdrawal] Withdrawal requested via centralized system", {
        influencerId: userId,
        withdrawalId: withdrawal.id,
        amount: withdrawAmount,
        paymentMethod: input.paymentMethod,
        collection: "payment_withdrawals",
      });

      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: withdrawAmount,
        status: "pending",
        message: "Withdrawal request submitted successfully",
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

      logger.error("[requestInfluencerWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to process withdrawal request");
    }
  }
);
