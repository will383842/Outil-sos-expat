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
import { getFirestore, Timestamp, FieldValue, Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  AffiliatePayout,
  AffiliateCommission,
} from "../types";
import {
  getWithdrawalSettings,
  areWithdrawalsEnabled,
} from "../utils/configService";
import { maskBankAccount } from "../utils/bankDetailsEncryption";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const requestWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
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

      // 11. Check monthly limits
      if (settings.maxWithdrawalsPerMonth > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPayoutsQuery = await db
          .collection("affiliate_payouts")
          .where("userId", "==", userId)
          .where("requestedAt", ">=", Timestamp.fromDate(startOfMonth))
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
          .collection("affiliate_payouts")
          .where("userId", "==", userId)
          .where("requestedAt", ">=", Timestamp.fromDate(startOfMonth))
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

      // 12. Get available commissions to include in payout
      const commissionsQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", userId)
        .where("status", "==", "available")
        .orderBy("createdAt", "asc")
        .get();

      let totalFromCommissions = 0;
      const commissionIds: string[] = [];

      for (const doc of commissionsQuery.docs) {
        const commission = doc.data() as AffiliateCommission;

        if (totalFromCommissions + commission.amount <= withdrawalAmount) {
          totalFromCommissions += commission.amount;
          commissionIds.push(doc.id);
        }

        if (totalFromCommissions >= withdrawalAmount) {
          break;
        }
      }

      // Use actual amount from commissions
      const actualAmount = totalFromCommissions;

      if (actualAmount < settings.minimumAmount) {
        throw new HttpsError(
          "failed-precondition",
          `Available commissions (€${(actualAmount / 100).toFixed(2)}) are below the minimum withdrawal amount`
        );
      }

      // 13. Create payout document and update in transaction
      const payoutRef = db.collection("affiliate_payouts").doc();
      const now = Timestamp.now();

      const payout: Omit<AffiliatePayout, "id"> = {
        userId,
        userEmail: userData.email,
        userName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
        amount: actualAmount,
        sourceCurrency: "USD",
        targetCurrency: userData.bankDetails.currency || "USD",
        status: "pending",
        bankDetailsSnapshot: {
          accountType: userData.bankDetails.accountType,
          accountHolderName: userData.bankDetails.accountHolderName,
          country: userData.bankDetails.country,
          currency: userData.bankDetails.currency,
          maskedAccount: maskBankAccount(userData.bankDetails),
        },
        commissionIds,
        commissionCount: commissionIds.length,
        requestedAt: now,
      };

      await db.runTransaction(async (transaction: Transaction) => {
        // Create payout
        transaction.set(payoutRef, { ...payout, id: payoutRef.id });

        // Update commissions status
        for (const commissionId of commissionIds) {
          transaction.update(db.collection("affiliate_commissions").doc(commissionId), {
            status: "paid",
            payoutId: payoutRef.id,
            paidAt: now,
            updatedAt: now,
          });
        }

        // Update user
        transaction.update(db.collection("users").doc(userId), {
          availableBalance: FieldValue.increment(-actualAmount),
          pendingPayoutId: payoutRef.id,
          updatedAt: now,
        });
      });

      logger.info("[requestWithdrawal] Payout created", {
        payoutId: payoutRef.id,
        userId,
        amount: actualAmount,
        commissionCount: commissionIds.length,
      });

      return {
        payoutId: payoutRef.id,
        amount: actualAmount,
        status: "pending",
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
