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
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GetAffiliateDataResponse,
  AffiliateCommission,
  CommissionActionType,
  CommissionStatus,
} from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getMyAffiliateData = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetAffiliateDataResponse> => {
    ensureInitialized();

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

      const userData = userDoc.data()!;

      // 3. Check if user has affiliate data
      if (!userData.affiliateCode) {
        throw new HttpsError("failed-precondition", "User is not an affiliate");
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
        hasBankDetails: !!userData.bankDetails,
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
