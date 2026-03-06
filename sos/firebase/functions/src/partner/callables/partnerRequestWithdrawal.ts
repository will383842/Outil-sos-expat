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
import { partnerConfig } from "../../lib/functionConfigs";
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
  },
  async (request): Promise<{ success: boolean; withdrawalId: string }> => {
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

      const minimumAmount = config.minimumWithdrawalAmount || PARTNER_CONSTANTS.MIN_WITHDRAWAL_AMOUNT;
      const withdrawalFee = PARTNER_CONSTANTS.SOS_WITHDRAWAL_FEE_CENTS;

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

      logger.info("[partnerRequestWithdrawal] Withdrawal requested", {
        partnerId: userId,
        withdrawalId: withdrawal.id,
        amount: input.amount,
        fee: withdrawalFee,
        totalDebited,
      });

      return {
        success: true,
        withdrawalId: withdrawal.id,
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
