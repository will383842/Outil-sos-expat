/**
 * Callable: partnerRequestWithdrawal
 *
 * Partner self-access callable to request a withdrawal.
 * Validates balance, checks no pending withdrawal, creates withdrawal
 * via centralized payment system, and deducts from available balance.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type Partner, PARTNER_CONSTANTS } from "../types";
import { getPartnerConfig } from "../services/partnerConfigService";
import { getPaymentService } from "../../payment/services/paymentService";
import { getWithdrawalFee } from "../../services/feeCalculationService";
import { sendWithdrawalConfirmation } from "../../telegram/withdrawalConfirmation";
import { partnerConfig } from "../../lib/functionConfigs";
import { TELEGRAM_SECRETS } from "../../lib/secrets";
import { checkRateLimit, RATE_LIMITS } from "../../lib/rateLimiter";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface PartnerRequestWithdrawalInput {
  amount: number;
  paymentMethodId: string;
}

export const partnerRequestWithdrawal = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 60,
    secrets: [...TELEGRAM_SECRETS],
  },
  async (request): Promise<{ success: boolean; withdrawalId: string; telegramConfirmationRequired?: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    await checkRateLimit(userId, "partner_requestWithdrawal", RATE_LIMITS.WITHDRAWAL);
    const db = getFirestore();
    const input = request.data as PartnerRequestWithdrawalInput;

    if (!input?.amount || typeof input.amount !== "number" || input.amount <= 0) {
      throw new HttpsError("invalid-argument", "Valid amount is required");
    }
    if (!input?.paymentMethodId) {
      throw new HttpsError("invalid-argument", "paymentMethodId is required");
    }

    try {
      // 1. Get config
      const config = await getPartnerConfig();
      if (!config.withdrawalsEnabled) {
        throw new HttpsError("failed-precondition", "Withdrawals are currently disabled");
      }

      // Verify Telegram is connected (required for withdrawal confirmation)
      const userDoc = await db.doc(`users/${userId}`).get();
      if (!userDoc.exists || !userDoc.data()?.telegramId) {
        throw new HttpsError(
          "failed-precondition",
          "TELEGRAM_REQUIRED: You must connect Telegram before requesting a withdrawal"
        );
      }
      const telegramId = userDoc.data()!.telegramId as number;

      const minimumAmount = config.minimumWithdrawalAmount || PARTNER_CONSTANTS.MIN_WITHDRAWAL_AMOUNT;
      const feeConfig = await getWithdrawalFee();
      const withdrawalFee = feeConfig.fixedFee * 100; // Convert dollars to cents

      if (input.amount < minimumAmount) {
        throw new HttpsError(
          "invalid-argument",
          `Minimum withdrawal amount is $${(minimumAmount / 100).toFixed(2)}`
        );
      }

      // 2. Atomic transaction to check balance and claim withdrawal slot
      let partnerEmail = "";
      let partnerName = "";
      const totalDebited = input.amount + withdrawalFee;

      await db.runTransaction(async (transaction) => {
        const partnerRef = db.collection("partners").doc(userId);
        const partnerDoc = await transaction.get(partnerRef);

        if (!partnerDoc.exists) {
          throw new HttpsError("not-found", "Partner profile not found");
        }

        const partner = partnerDoc.data() as Partner;

        if (partner.status !== "active") {
          throw new HttpsError(
            "failed-precondition",
            `Cannot request withdrawal: account is ${partner.status}`
          );
        }

        if (partner.pendingWithdrawalId) {
          throw new HttpsError(
            "failed-precondition",
            "A withdrawal request is already pending"
          );
        }

        if (partner.availableBalance < totalDebited) {
          throw new HttpsError(
            "invalid-argument",
            `Insufficient balance. Available: $${(partner.availableBalance / 100).toFixed(2)}, needed: $${(totalDebited / 100).toFixed(2)} (amount + $${(withdrawalFee / 100).toFixed(2)} fee)`
          );
        }

        partnerEmail = partner.email;
        partnerName = partner.firstName;

        // Claim withdrawal slot and deduct balance atomically
        transaction.update(partnerRef, {
          pendingWithdrawalId: `pending_lock_${Date.now()}`,
          availableBalance: partner.availableBalance - totalDebited,
          totalWithdrawn: partner.totalWithdrawn + input.amount,
          updatedAt: Timestamp.now(),
        });
      });

      // 3. Create withdrawal via centralized payment service
      const paymentService = getPaymentService();
      let withdrawal;

      try {
        withdrawal = await paymentService.createWithdrawalRequest({
          userId,
          userType: "partner",
          userEmail: partnerEmail,
          userName: partnerName,
          amount: input.amount,
          paymentMethodId: input.paymentMethodId,
        });
      } catch (withdrawalError) {
        // Rollback: release lock and restore balance atomically
        await db.collection("partners").doc(userId).update({
          pendingWithdrawalId: null,
          availableBalance: FieldValue.increment(totalDebited),
          totalWithdrawn: FieldValue.increment(-input.amount),
          updatedAt: Timestamp.now(),
        });
        throw withdrawalError;
      }

      // 4. Update pendingWithdrawalId with actual withdrawal ID
      await db.collection("partners").doc(userId).update({
        pendingWithdrawalId: withdrawal.id,
        updatedAt: Timestamp.now(),
      });

      // 5. Send Telegram confirmation (double verification)
      const methodLabels: Record<string, string> = {
        paypal: "PayPal",
        stripe: "Stripe",
        wise: "Wise",
        bank_transfer: "Virement bancaire",
        mobile_money: "Mobile Money",
      };

      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId: withdrawal.id,
        userId,
        role: "partner",
        collection: "payment_withdrawals",
        amount: input.amount,
        paymentMethod: methodLabels[input.paymentMethodId] || input.paymentMethodId,
        telegramId,
      });

      if (!confirmResult.success) {
        // Telegram failed — cancel withdrawal and restore balance
        logger.error("[partnerRequestWithdrawal] Telegram confirmation failed, rolling back", {
          withdrawalId: withdrawal.id,
        });

        await db.collection("payment_withdrawals").doc(withdrawal.id).update({
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
          statusHistory: FieldValue.arrayUnion({
            status: "cancelled",
            timestamp: new Date().toISOString(),
            actorType: "system",
            note: "Auto-cancelled: failed to send Telegram confirmation",
          }),
        });

        await db.collection("partners").doc(userId).update({
          pendingWithdrawalId: null,
          availableBalance: FieldValue.increment(totalDebited),
          totalWithdrawn: FieldValue.increment(-input.amount),
          updatedAt: Timestamp.now(),
        });

        throw new HttpsError(
          "internal",
          "Failed to send Telegram confirmation. Withdrawal cancelled."
        );
      }

      logger.info("[partnerRequestWithdrawal] Withdrawal requested", {
        partnerId: userId,
        withdrawalId: withdrawal.id,
        amount: input.amount,
        fee: withdrawalFee,
        totalDebited,
        telegramConfirmation: true,
      });

      return {
        success: true,
        withdrawalId: withdrawal.id,
        telegramConfirmationRequired: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg.includes("Insufficient balance")) {
        throw new HttpsError("failed-precondition", "Insufficient balance for this withdrawal");
      }
      if (errMsg.includes("already pending")) {
        throw new HttpsError("failed-precondition", "A withdrawal request is already pending");
      }

      logger.error("[partnerRequestWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to request withdrawal");
    }
  }
);
