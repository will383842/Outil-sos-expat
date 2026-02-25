/**
 * Callable: requestWithdrawal
 *
 * Creates a withdrawal request for affiliate earnings.
 * - Validates balance and bank details
 * - Creates payout document
 * - Marks commissions as pending payout
 * - Updates user balances
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";
import { getFirestore, Timestamp, FieldValue, Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  AffiliateCommission,
} from "../types";
import {
  getWithdrawalSettings,
  areWithdrawalsEnabled,
} from "../utils/configService";
import { maskBankAccount } from "../utils/bankDetailsEncryption";
import { sendWithdrawalConfirmation, WithdrawalConfirmationRole } from "../../telegram/withdrawalConfirmation";
import { TELEGRAM_SECRETS } from "../../lib/secrets";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const requestWithdrawal = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
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
    const input = request.data as RequestWithdrawalInput;

    logger.info("[requestWithdrawal] Processing request", {
      userId,
      requestedAmount: input.amount,
    });

    const db = getFirestore();

    try {
      // 2. Check if withdrawals are enabled
      const withdrawalsEnabled = await areWithdrawalsEnabled();
      if (!withdrawalsEnabled) {
        throw new HttpsError(
          "failed-precondition",
          "Withdrawals are currently disabled"
        );
      }

      // 3. Get withdrawal settings
      const settings = await getWithdrawalSettings();

      // 4. Get user document
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data()!;

      // 5. Validate user has affiliate code
      if (!userData.affiliateCode) {
        throw new HttpsError("failed-precondition", "User is not an affiliate");
      }

      // 5b. Verify Telegram is connected (required for withdrawal 2FA + marketing ID capture)
      if (!userData.telegramId) {
        throw new HttpsError(
          "failed-precondition",
          "TELEGRAM_REQUIRED: You must connect Telegram before requesting a withdrawal"
        );
      }

      // 6. Check for pending payout
      if (userData.pendingPayoutId) {
        throw new HttpsError(
          "failed-precondition",
          "You already have a pending withdrawal"
        );
      }

      // 7. Check bank details
      if (!userData.bankDetails) {
        throw new HttpsError(
          "failed-precondition",
          "Please add your bank details before requesting a withdrawal"
        );
      }

      // 8. Get available balance
      const availableBalance = userData.availableBalance || 0;

      if (availableBalance <= 0) {
        throw new HttpsError(
          "failed-precondition",
          "No available balance to withdraw"
        );
      }

      // 9. Determine withdrawal amount
      const withdrawalAmount = input.amount ? Math.min(input.amount, availableBalance) : availableBalance;

      // 10. Check minimum amount
      if (withdrawalAmount < settings.minimumAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Minimum withdrawal amount is €${(settings.minimumAmount / 100).toFixed(2)}`
        );
      }

      // 11. Check monthly limits (query payment_withdrawals - unified collection)
      if (settings.maxWithdrawalsPerMonth > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPayoutsQuery = await db
          .collection("payment_withdrawals")
          .where("userId", "==", userId)
          .where("userType", "==", "affiliate")
          .where("requestedAt", ">=", startOfMonth.toISOString())
          .get();

        if (monthlyPayoutsQuery.size >= settings.maxWithdrawalsPerMonth) {
          throw new HttpsError(
            "failed-precondition",
            `You have reached the maximum of ${settings.maxWithdrawalsPerMonth} withdrawals this month`
          );
        }
      }

      if (settings.maxAmountPerMonth > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPayoutsQuery = await db
          .collection("payment_withdrawals")
          .where("userId", "==", userId)
          .where("userType", "==", "affiliate")
          .where("requestedAt", ">=", startOfMonth.toISOString())
          .where("status", "in", ["pending", "approved", "processing", "completed"])
          .get();

        const monthlyTotal = monthlyPayoutsQuery.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        if (monthlyTotal + withdrawalAmount > settings.maxAmountPerMonth) {
          const remaining = settings.maxAmountPerMonth - monthlyTotal;
          throw new HttpsError(
            "failed-precondition",
            `Monthly limit exceeded. You can withdraw up to €${(remaining / 100).toFixed(2)} more this month`
          );
        }
      }

      // 12. Get candidate commissions (query outside transaction - Firestore limitation)
      const commissionsQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", userId)
        .where("status", "==", "available")
        .orderBy("createdAt", "asc")
        .get();

      let totalFromCommissions = 0;
      const candidateCommissionIds: string[] = [];

      for (const doc of commissionsQuery.docs) {
        const commission = doc.data() as AffiliateCommission;

        if (totalFromCommissions + commission.amount <= withdrawalAmount) {
          totalFromCommissions += commission.amount;
          candidateCommissionIds.push(doc.id);
        }

        if (totalFromCommissions >= withdrawalAmount) {
          break;
        }
      }

      if (totalFromCommissions < settings.minimumAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Available commissions (€${(totalFromCommissions / 100).toFixed(2)}) are below the minimum withdrawal amount`
        );
      }

      // 13. Create withdrawal document in unified payment_withdrawals collection (W1 migration)
      // P0-2 FIX: Re-validate balance + commission status INSIDE transaction
      // to prevent race conditions from concurrent withdrawal requests
      const withdrawalRef = db.collection("payment_withdrawals").doc();
      const now = Timestamp.now();
      const nowIso = now.toDate().toISOString();

      let actualAmount = 0;
      const commissionIds: string[] = [];

      await db.runTransaction(async (transaction: Transaction) => {
        // Re-read user doc inside transaction to get authoritative balance
        const freshUserSnap = await transaction.get(db.collection("users").doc(userId));
        if (!freshUserSnap.exists) {
          throw new HttpsError("not-found", "User not found");
        }
        const freshUserData = freshUserSnap.data()!;

        // Re-verify no pending payout (race condition guard)
        if (freshUserData.pendingPayoutId) {
          throw new HttpsError("failed-precondition", "You already have a pending withdrawal");
        }

        // Re-verify each commission is still "available" (race condition guard)
        actualAmount = 0;
        commissionIds.length = 0;

        for (const candidateId of candidateCommissionIds) {
          const commSnap = await transaction.get(
            db.collection("affiliate_commissions").doc(candidateId)
          );
          if (commSnap.exists && commSnap.data()!.status === "available") {
            actualAmount += commSnap.data()!.amount;
            commissionIds.push(candidateId);
          }
        }

        if (actualAmount < settings.minimumAmount) {
          throw new HttpsError(
            "failed-precondition",
            "Some commissions are no longer available, please retry"
          );
        }

        // Re-verify balance is sufficient
        const freshBalance = freshUserData.availableBalance || 0;
        if (freshBalance < actualAmount) {
          throw new HttpsError("failed-precondition", "Insufficient balance, please retry");
        }

        const userName = `${freshUserData.firstName || ""} ${freshUserData.lastName || ""}`.trim();
        const bankDetails = freshUserData.bankDetails || {};

        // Build unified WithdrawalRequest document + affiliate-specific fields
        const withdrawal = {
          id: withdrawalRef.id,
          // User info
          userId,
          userType: "affiliate",
          userEmail: freshUserData.email,
          userName,
          // Amount
          amount: actualAmount,
          sourceCurrency: "USD",
          targetCurrency: bankDetails.currency || "USD",
          // Payment method (synthetic ID — affiliates don't use paymentMethods collection)
          paymentMethodId: `affiliate_${userId}`,
          provider: "wise",
          methodType: "bank_transfer",
          paymentDetails: {
            type: "bank_transfer",
            accountHolderName: userName,
            country: bankDetails.country || "",
            currency: bankDetails.currency || "USD",
            iban: bankDetails.iban,
            accountNumber: bankDetails.accountNumber,
            routingNumber: bankDetails.routingNumber,
            sortCode: bankDetails.sortCode,
            bsb: bankDetails.bsb,
            ifsc: bankDetails.ifsc,
            swiftBic: bankDetails.swiftBic,
            bankName: bankDetails.bankName,
            maskedAccount: maskBankAccount(bankDetails),
          },
          // Status
          status: "pending",
          statusHistory: [{
            status: "pending",
            timestamp: nowIso,
            actorType: "user",
            note: "Withdrawal requested by affiliate",
          }],
          // Processing (manual — admin reviews affiliate withdrawals)
          isAutomatic: false,
          retryCount: 0,
          maxRetries: 3,
          // Timestamps
          requestedAt: nowIso,
          // Affiliate-specific: track which commissions are included
          commissionIds,
          commissionCount: commissionIds.length,
        };

        // Create withdrawal in unified collection
        transaction.set(withdrawalRef, withdrawal);

        // Update commissions status
        for (const commissionId of commissionIds) {
          transaction.update(db.collection("affiliate_commissions").doc(commissionId), {
            status: "paid",
            payoutId: withdrawalRef.id,
            paidAt: now,
            updatedAt: now,
          });
        }

        // Update user balance
        transaction.update(db.collection("users").doc(userId), {
          availableBalance: FieldValue.increment(-actualAmount),
          pendingPayoutId: withdrawalRef.id,
          updatedAt: now,
        });
      });

      // 14. Send Telegram confirmation (REQUIRED - 2FA + captures telegram_id for marketing)
      const telegramId = userData.telegramId as number;
      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId: withdrawalRef.id,
        userId,
        role: "affiliate" as WithdrawalConfirmationRole,
        collection: "payment_withdrawals",
        amount: actualAmount,
        paymentMethod: "Wise / Bank Transfer",
        telegramId,
      });

      if (!confirmResult.success) {
        logger.warn("[requestWithdrawal] Telegram confirmation failed, reverting withdrawal", {
          withdrawalId: withdrawalRef.id, userId,
        });
        // Revert: restore commissions and balance
        try {
          await db.runTransaction(async (revertTx: Transaction) => {
            revertTx.delete(withdrawalRef);
            for (const commissionId of commissionIds) {
              revertTx.update(db.collection("affiliate_commissions").doc(commissionId), {
                status: "available",
                payoutId: null,
                paidAt: null,
                updatedAt: Timestamp.now(),
              });
            }
            revertTx.update(db.collection("users").doc(userId), {
              availableBalance: FieldValue.increment(actualAmount),
              pendingPayoutId: null,
              updatedAt: Timestamp.now(),
            });
          });
        } catch (revertErr) {
          logger.error("[requestWithdrawal] Failed to revert withdrawal after Telegram failure", {
            withdrawalId: withdrawalRef.id, error: revertErr,
          });
        }
        throw new HttpsError("unavailable", "TELEGRAM_SEND_FAILED");
      }

      logger.info("[requestWithdrawal] Withdrawal created with Telegram confirmation", {
        withdrawalId: withdrawalRef.id,
        userId,
        amount: actualAmount,
        commissionCount: commissionIds.length,
      });

      return {
        payoutId: withdrawalRef.id,
        amount: actualAmount,
        status: "pending",
        telegramConfirmationRequired: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[requestWithdrawal] Error", { userId, error });
      throw new HttpsError("internal", "Failed to process withdrawal request");
    }
  }
);
