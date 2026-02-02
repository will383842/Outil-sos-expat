/**
 * Callable: getReferralDashboard
 *
 * Returns detailed referral dashboard data for a chatter.
 * Includes filleuls N1/N2, referral commissions, tier progress,
 * early adopter status, and active promotions.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  ChatterReferralCommission,
  GetReferralDashboardResponse,
  REFERRAL_CONFIG,
} from "../types";
import {
  getClientEarnings,
  getNextTierBonus,
} from "../services/chatterReferralService";
import {
  getActivePromotions,
} from "../services/chatterPromotionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getReferralDashboard = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<GetReferralDashboardResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const chatterId = request.auth.uid;
    const db = getFirestore();

    try {
      // Get chatter data
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Get N1 filleuls
      const filleulsN1Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", chatterId)
        .orderBy("createdAt", "desc")
        .get();

      const filleulsN1 = filleulsN1Query.docs.map((doc) => {
        const filleul = doc.data() as Chatter;
        const clientEarnings = getClientEarnings(filleul);

        // Check if filleul was active this month (earned $20+)
        const isActive = filleul.totalEarned > 0; // Simplified - actual check would need monthly data

        return {
          id: doc.id,
          name: `${filleul.firstName} ${filleul.lastName}`,
          email: filleul.email,
          clientEarnings,
          threshold10Reached: filleul.threshold10Reached || false,
          threshold50Reached: filleul.threshold50Reached || false,
          isActive,
          joinedAt: filleul.createdAt?.toDate().toISOString() || "",
        };
      });

      // Get N2 filleuls (filleuls of filleuls)
      const filleulsN1Ids = filleulsN1Query.docs.map((doc) => doc.id);
      let filleulsN2: GetReferralDashboardResponse["filleulsN2"] = [];

      if (filleulsN1Ids.length > 0) {
        // Batch query in chunks of 10 (Firestore 'in' limit)
        const chunks = [];
        for (let i = 0; i < filleulsN1Ids.length; i += 10) {
          chunks.push(filleulsN1Ids.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const n2Query = await db
            .collection("chatters")
            .where("recruitedBy", "in", chunk)
            .get();

          for (const doc of n2Query.docs) {
            const filleul = doc.data() as Chatter;
            const parrainN1 = filleulsN1.find((f) => f.id === filleul.recruitedBy);

            filleulsN2.push({
              id: doc.id,
              name: `${filleul.firstName} ${filleul.lastName}`,
              parrainN1Name: parrainN1?.name || "Unknown",
              threshold50Reached: filleul.threshold50Reached || false,
              joinedAt: filleul.createdAt?.toDate().toISOString() || "",
            });
          }
        }
      }

      // Get recent referral commissions
      const commissionsQuery = await db
        .collection("chatter_referral_commissions")
        .where("parrainId", "==", chatterId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map((doc) => {
        const commission = doc.data() as ChatterReferralCommission;
        return {
          id: doc.id,
          type: commission.type,
          filleulName: commission.filleulName,
          amount: commission.amount,
          createdAt: commission.createdAt?.toDate().toISOString() || "",
        };
      });

      // Calculate monthly earnings (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCommissionsQuery = await db
        .collection("chatter_referral_commissions")
        .where("parrainId", "==", chatterId)
        .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
        .get();

      let monthlyReferralEarnings = 0;
      for (const doc of monthlyCommissionsQuery.docs) {
        monthlyReferralEarnings += doc.data().amount || 0;
      }

      // Get tier progress
      const nextTier = getNextTierBonus(chatter);

      // Get early adopter info
      const earlyAdopter = {
        isEarlyAdopter: chatter.isEarlyAdopter || false,
        country: chatter.earlyAdopterCountry || null,
        multiplier: chatter.isEarlyAdopter
          ? REFERRAL_CONFIG.EARLY_ADOPTER.MULTIPLIER
          : 1.0,
      };

      // Get active promotion
      const activePromos = await getActivePromotions(
        chatterId,
        chatter.country,
        "threshold_50" // Check for referral-type promotions
      );

      const activePromotion =
        activePromos.length > 0
          ? {
              id: activePromos[0].id,
              name: activePromos[0].name,
              multiplier: activePromos[0].multiplier,
              endsAt: activePromos[0].endDate?.toDate().toISOString() || "",
            }
          : null;

      // Calculate qualified N1 count
      const qualifiedFilleulsN1 = filleulsN1.filter((f) => f.threshold50Reached).length;

      return {
        stats: {
          totalFilleulsN1: filleulsN1.length,
          qualifiedFilleulsN1,
          totalFilleulsN2: filleulsN2.length,
          totalReferralEarnings: chatter.referralEarnings || 0,
          monthlyReferralEarnings,
        },
        recentCommissions,
        filleulsN1,
        filleulsN2,
        tierProgress: nextTier
          ? {
              currentTier: chatter.tierBonusesPaid?.slice(-1)[0] || null,
              nextTier: nextTier.tier,
              filleulsNeeded: nextTier.filleulsNeeded,
              bonusAmount: nextTier.bonusAmount,
            }
          : {
              currentTier: 50, // Max tier achieved
              nextTier: null,
              filleulsNeeded: 0,
              bonusAmount: 0,
            },
        earlyAdopter,
        activePromotion,
      };
    } catch (error) {
      logger.error("[getReferralDashboard] Error", { chatterId, error });
      throw new HttpsError("internal", "Failed to get referral dashboard");
    }
  }
);
