/**
 * @deprecated Legacy callable name preserved for frontend compatibility.
 * Now delegates to the centralized payment system (payment_withdrawals collection).
 *
 * Request Blogger Withdrawal Callable
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

import {
  RequestBloggerWithdrawalInput,
  RequestBloggerWithdrawalResponse,
  Blogger,
  BloggerPaymentMethod,
} from "../types";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";
import { getPaymentService } from "../../payment/services/paymentService";
import {
  PaymentMethodDetails,
  BankTransferDetails,
  MobileMoneyDetails,
} from "../../payment/types";
import { sendWithdrawalConfirmation, WithdrawalConfirmationRole } from "../../telegram/withdrawalConfirmation";
import { TELEGRAM_SECRETS } from "../../lib/secrets";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// VALIDATION
// ============================================================================

const PAYMENT_METHODS: BloggerPaymentMethod[] = ["wise", "mobile_money", "bank_transfer"];

function validateInput(input: RequestBloggerWithdrawalInput): void {
  if (!input.paymentMethod || !PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new HttpsError("invalid-argument", "Valid payment method is required");
  }

  if (!input.paymentDetails) {
    throw new HttpsError("invalid-argument", "Payment details are required");
  }

  if (input.paymentDetails.type !== input.paymentMethod) {
    throw new HttpsError("invalid-argument", "Payment details type must match payment method");
  }

  const d = input.paymentDetails;
  switch (d.type) {
    case "wise": {
      if (!d.email?.trim()) throw new HttpsError("invalid-argument", "Wise email is required");
      if (!d.accountHolderName?.trim()) throw new HttpsError("invalid-argument", "Account holder name is required");
      break;
    }
    case "mobile_money": {
      if (!d.phoneNumber?.trim()) throw new HttpsError("invalid-argument", "Phone number is required for Mobile Money");
      if (!d.provider) throw new HttpsError("invalid-argument", "Mobile Money provider is required");
      break;
    }
    case "bank_transfer": {
      if (!d.bankName?.trim()) throw new HttpsError("invalid-argument", "Bank name is required");
      if (!d.accountHolderName?.trim()) throw new HttpsError("invalid-argument", "Account holder name is required");
      if (!d.accountNumber?.trim()) throw new HttpsError("invalid-argument", "Account number is required");
      break;
    }
  }

  if (input.amount !== undefined && input.amount <= 0) {
    throw new HttpsError("invalid-argument", "Withdrawal amount must be positive");
  }
}

/**
 * Convert legacy Blogger payment details to centralized PaymentMethodDetails
 */
function convertToPaymentMethodDetails(
  method: BloggerPaymentMethod,
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

// ============================================================================
// CALLABLE
// ============================================================================

export const bloggerRequestWithdrawal = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
    secrets: [...TELEGRAM_SECRETS],
  },
  async (request): Promise<RequestBloggerWithdrawalResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as RequestBloggerWithdrawalInput;

    // 2. Validate input
    validateInput(input);

    const db = getFirestore();

    // 2b. Verify Telegram is connected (required for withdrawal confirmation)
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists || !userDoc.data()?.telegramId) {
      throw new HttpsError(
        "failed-precondition",
        "TELEGRAM_REQUIRED: You must connect Telegram before requesting a withdrawal"
      );
    }

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

      // 5. Check for pending withdrawal (legacy field check)
      if ((blogger as unknown as Record<string, unknown>).pendingWithdrawalId) {
        throw new HttpsError(
          "failed-precondition",
          "You already have a pending withdrawal request"
        );
      }

      // 6. Get config
      const config = await getBloggerConfigCached();

      if (!config.withdrawalsEnabled) {
        throw new HttpsError(
          "failed-precondition",
          "Withdrawals are currently disabled. Please try again later."
        );
      }

      // 7. Check minimum amount
      const withdrawalAmount = input.amount || blogger.availableBalance;

      if (withdrawalAmount < config.minimumWithdrawalAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Minimum withdrawal amount is $${config.minimumWithdrawalAmount / 100}`
        );
      }

      if (withdrawalAmount > blogger.availableBalance) {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient balance. Available: $${(blogger.availableBalance / 100).toFixed(2)}`
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
        userId: uid,
        userType: "blogger",
        details: centralizedDetails,
        setAsDefault: true,
      });

      // 10. Create withdrawal via centralized service
      const withdrawal = await paymentService.createWithdrawalRequest({
        userId: uid,
        userType: "blogger",
        userEmail: blogger.email || "",
        userName: blogger.firstName || "",
        amount: withdrawalAmount,
        paymentMethodId: paymentMethod.id,
      });

      // 11. Set pendingWithdrawalId on blogger doc (backward compatibility)
      await db.collection("bloggers").doc(uid).update({
        pendingWithdrawalId: withdrawal.id,
        updatedAt: Timestamp.now(),
      });

      // 12. Send Telegram confirmation
      const telegramId = userDoc.data()?.telegramId as number;
      const methodLabels: Record<string, string> = {
        bank_transfer: "Virement bancaire",
        mobile_money: "Mobile Money",
        wise: "Wise",
      };
      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId: withdrawal.id,
        userId: uid,
        role: "blogger" as WithdrawalConfirmationRole,
        collection: "payment_withdrawals",
        amount: withdrawalAmount,
        paymentMethod: methodLabels[input.paymentMethod] || input.paymentMethod,
        telegramId,
      });

      if (!confirmResult.success) {
        logger.warn("[bloggerRequestWithdrawal] Telegram confirmation failed, cancelling", {
          withdrawalId: withdrawal.id, userId: uid,
        });
        try {
          const svc = getPaymentService();
          await svc.cancelWithdrawal(withdrawal.id, uid, "Telegram confirmation failed to send");
        } catch (cancelErr) {
          logger.error("[bloggerRequestWithdrawal] Failed to auto-cancel", { withdrawalId: withdrawal.id, error: cancelErr });
        }
        throw new HttpsError("unavailable", "TELEGRAM_SEND_FAILED");
      }

      logger.info("[bloggerRequestWithdrawal] Withdrawal requested via centralized system", {
        bloggerId: uid,
        withdrawalId: withdrawal.id,
        amount: withdrawalAmount,
        paymentMethod: input.paymentMethod,
        collection: "payment_withdrawals",
      });

      return {
        success: true,
        withdrawalId: withdrawal.id,
        amount: withdrawalAmount,
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

      logger.error("[bloggerRequestWithdrawal] Error", { uid, error });
      throw new HttpsError("internal", "Failed to process withdrawal request");
    }
  }
);
