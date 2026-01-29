/**
 * Request Blogger Withdrawal Callable
 *
 * Handles withdrawal requests from bloggers.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  RequestBloggerWithdrawalInput,
  RequestBloggerWithdrawalResponse,
  Blogger,
  BloggerPaymentMethod,
  BloggerPayPalDetails,
  BloggerWiseDetails,
  BloggerMobileMoneyDetails,
} from "../types";
import { createBloggerWithdrawal } from "../services/bloggerWithdrawalService";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

// ============================================================================
// VALIDATION
// ============================================================================

const PAYMENT_METHODS: BloggerPaymentMethod[] = ["paypal", "wise", "mobile_money"];

function validateInput(input: RequestBloggerWithdrawalInput): void {
  if (!input.paymentMethod || !PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new HttpsError("invalid-argument", "Valid payment method is required");
  }

  if (!input.paymentDetails) {
    throw new HttpsError("invalid-argument", "Payment details are required");
  }

  // Validate payment details match method
  if (input.paymentDetails.type !== input.paymentMethod) {
    throw new HttpsError("invalid-argument", "Payment details type must match payment method");
  }

  // Validate specific payment details
  switch (input.paymentMethod) {
    case "paypal": {
      const paypalDetails = input.paymentDetails as BloggerPayPalDetails;
      if (!paypalDetails.email?.trim()) {
        throw new HttpsError("invalid-argument", "PayPal email is required");
      }
      if (!paypalDetails.accountHolderName?.trim()) {
        throw new HttpsError("invalid-argument", "Account holder name is required");
      }
      break;
    }

    case "wise": {
      const wiseDetails = input.paymentDetails as BloggerWiseDetails;
      if (!wiseDetails.email?.trim()) {
        throw new HttpsError("invalid-argument", "Wise email is required");
      }
      if (!wiseDetails.accountHolderName?.trim()) {
        throw new HttpsError("invalid-argument", "Account holder name is required");
      }
      break;
    }

    case "mobile_money": {
      const mobileDetails = input.paymentDetails as BloggerMobileMoneyDetails;
      if (mobileDetails.type !== "mobile_money") {
        throw new HttpsError("invalid-argument", "Invalid Mobile Money details");
      }
      if (!mobileDetails.phoneNumber?.trim()) {
        throw new HttpsError("invalid-argument", "Phone number is required for Mobile Money");
      }
      if (!mobileDetails.provider) {
        throw new HttpsError("invalid-argument", "Mobile Money provider is required");
      }
      break;
    }
  }

  // Validate amount if provided
  if (input.amount !== undefined && input.amount <= 0) {
    throw new HttpsError("invalid-argument", "Withdrawal amount must be positive");
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

export const bloggerRequestWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<RequestBloggerWithdrawalResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as RequestBloggerWithdrawalInput;

    // 2. Validate input
    validateInput(input);

    const db = getFirestore();

    try {
      // 3. Get blogger profile
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger profile not found");
      }

      const blogger = bloggerDoc.data() as Blogger;

      // 4. Check status
      if (blogger.status !== "active") {
        throw new HttpsError(
          "permission-denied",
          "Your account is not active. Please contact support."
        );
      }

      // 5. Get config
      const config = await getBloggerConfigCached();

      if (!config.withdrawalsEnabled) {
        throw new HttpsError(
          "failed-precondition",
          "Withdrawals are currently disabled. Please try again later."
        );
      }

      // 6. Check minimum amount
      const withdrawalAmount = input.amount || blogger.availableBalance;

      if (withdrawalAmount < config.minimumWithdrawalAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Minimum withdrawal amount is $${config.minimumWithdrawalAmount / 100}`
        );
      }

      // 7. Create withdrawal
      const result = await createBloggerWithdrawal({
        bloggerId: uid,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
      });

      if (!result.success) {
        throw new HttpsError("failed-precondition", result.error || "Failed to create withdrawal");
      }

      logger.info("[bloggerRequestWithdrawal] Withdrawal requested", {
        bloggerId: uid,
        withdrawalId: result.withdrawalId,
        amount: result.amount,
        paymentMethod: input.paymentMethod,
      });

      return {
        success: true,
        withdrawalId: result.withdrawalId!,
        amount: result.amount!,
        status: "pending",
        message: "Withdrawal request submitted successfully. You will be notified once processed.",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[bloggerRequestWithdrawal] Error", { uid, error });
      throw new HttpsError("internal", "Failed to process withdrawal request");
    }
  }
);
