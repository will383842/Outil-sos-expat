/**
 * Callable: getMyAffiliateData
 *
 * Returns the affiliate data for the authenticated user.
 * Includes:
 * - Affiliate code and share link
 * - Captured rates (frozen)
 * - Balances (total, available, pending)
 * - Stats (referrals, commissions)
 * - Recent commissions
 * - Bank details status
 *
 * LAZY INITIALIZATION: If user doesn't have an affiliate code (legacy users),
 * one will be generated automatically on first access.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

import {
  GetAffiliateDataResponse,
  AffiliateCommission,
  CommissionActionType,
  CommissionStatus,
  CapturedRates,
} from "../types";
import { generateAffiliateCode } from "../utils/codeGenerator";
import { getAffiliateConfigCached } from "../utils/configService";

export const getMyAffiliateData = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      /\.sos-expat\.pages\.dev$/,
      "http://localhost:5173",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
    ],
  },
  async (request): Promise<GetAffiliateDataResponse> => {
    // Firebase Admin is initialized globally in index.ts

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Get user document
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      let userData = userDoc.data()!;

      // 3. LAZY INITIALIZATION: Generate affiliate code for legacy users
      // P1-5 FIX: Use transaction to prevent race condition where concurrent
      // calls could generate different affiliate codes for the same user
      if (!userData.affiliateCode) {
        logger.info("[getMyAffiliateData] Initializing affiliate data for legacy user", { userId });

        try {
          // Pre-generate code and config outside transaction (these are idempotent)
          const affiliateCode = await generateAffiliateCode(
            userData.email,
            userData.firstName,
            userData.lastName
          );
          const config = await getAffiliateConfigCached();

          const capturedRates: CapturedRates = {
            capturedAt: Timestamp.now(),
            configVersion: config.version.toString(),
            signupBonus: config.defaultRates.signupBonus,
            callCommissionRate: config.defaultRates.callCommissionRate,
            callFixedBonus: config.defaultRates.callFixedBonus,
            subscriptionRate: config.defaultRates.subscriptionRate,
            subscriptionFixedBonus: config.defaultRates.subscriptionFixedBonus,
            providerValidationBonus: config.defaultRates.providerValidationBonus,
          };

          // Transaction: re-check and only write if still no affiliate code
          await db.runTransaction(async (transaction: Transaction) => {
            const freshSnap = await transaction.get(db.collection("users").doc(userId));
            if (!freshSnap.exists) {
              throw new HttpsError("not-found", "User not found");
            }

            // Another concurrent call may have already initialized
            if (freshSnap.data()!.affiliateCode) {
              userData = { ...userData, ...freshSnap.data()! };
              return;
            }

            const affiliateFields = {
              affiliateCode,
              capturedRates,
              totalEarned: 0,
              availableBalance: 0,
              pendingBalance: 0,
              affiliateStats: {
                totalReferrals: 0,
                activeReferrals: 0,
                totalCommissions: 0,
                byType: {
                  signup: { count: 0, amount: 0 },
                  firstCall: { count: 0, amount: 0 },
                  recurringCall: { count: 0, amount: 0 },
                  subscription: { count: 0, amount: 0 },
                  renewal: { count: 0, amount: 0 },
                  providerBonus: { count: 0, amount: 0 },
                },
              },
              bankDetails: null,
              pendingPayoutId: null,
              affiliateStatus: "active",
              updatedAt: Timestamp.now(),
            };

            transaction.update(freshSnap.ref, affiliateFields);
            userData = { ...userData, ...affiliateFields };
          });

          logger.info("[getMyAffiliateData] Successfully initialized affiliate for legacy user", {
            userId,
            affiliateCode: userData.affiliateCode,
          });
        } catch (initError) {
          if (initError instanceof HttpsError) throw initError;
          logger.error("[getMyAffiliateData] Failed to initialize affiliate", { userId, initError });
          throw new HttpsError("internal", "Failed to initialize affiliate account");
        }
      }

      // 4. Get recent commissions
      const commissionsQuery = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map((doc) => {
        const data = doc.data() as AffiliateCommission;
        return {
          id: doc.id,
          type: data.type as CommissionActionType,
          amount: data.amount,
          status: data.status as CommissionStatus,
          refereeEmail: maskEmail(data.refereeEmail),
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // 5. Build response
      // Build bank details summary (non-sensitive fields only)
      const bankDetails = userData.bankDetails;
      const hasBankDetails = !!bankDetails;

      const response: GetAffiliateDataResponse = {
        affiliateCode: userData.affiliateCode,
        referredBy: userData.referredBy || null,
        capturedRates: userData.capturedRates || null,
        totalEarned: userData.totalEarned || 0,
        availableBalance: userData.availableBalance || 0,
        pendingBalance: userData.pendingBalance || 0,
        affiliateStats: userData.affiliateStats || {
          totalReferrals: 0,
          activeReferrals: 0,
          totalCommissions: 0,
          byType: {
            signup: { count: 0, amount: 0 },
            firstCall: { count: 0, amount: 0 },
            recurringCall: { count: 0, amount: 0 },
            subscription: { count: 0, amount: 0 },
            renewal: { count: 0, amount: 0 },
            providerBonus: { count: 0, amount: 0 },
          },
        },
        hasBankDetails,
        bankAccountType: hasBankDetails ? bankDetails.accountType : undefined,
        bankCurrency: hasBankDetails ? bankDetails.currency : undefined,
        maskedBankAccount: hasBankDetails ? `****${bankDetails.accountType === "iban" ? " (IBAN)" : ""}` : undefined,
        pendingPayoutId: userData.pendingPayoutId || null,
        recentCommissions,
      };

      logger.info("[getMyAffiliateData] Returned data", {
        userId,
        affiliateCode: userData.affiliateCode,
        totalEarned: userData.totalEarned,
        availableBalance: userData.availableBalance,
      });

      return response;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getMyAffiliateData] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get affiliate data");
    }
  }
);

/**
 * Mask email for privacy (show only first 2 chars and domain)
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "***@***.***";
  }

  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + "***" : "***";

  return `${maskedLocal}@${domain}`;
}
