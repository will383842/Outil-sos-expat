/**
 * Callable: getReferralDashboard
 *
 * Returns detailed referral dashboard data for a chatter.
 * Includes filleuls N1/N2, referral commissions, tier progress,
 * and active promotions.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  GetReferralDashboardResponse,
} from "../types";
import {
  getClientEarnings,
  getNextTierBonus,
} from "../services/chatterReferralService";
import {
  getActivePromotions,
} from "../services/chatterPromotionService";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getReferralDashboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
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

      // Get recent referral commissions from chatter_commissions (new system)
      // Referral-related types: n1_call, n2_call, activation_bonus, n1_recruit_bonus, tier_bonus
      const REFERRAL_COMMISSION_TYPES = [
        "n1_call", "n2_call", "activation_bonus", "n1_recruit_bonus", "tier_bonus",
        // Legacy types for backward compatibility
        "threshold_10", "threshold_50", "threshold_50_n2", "recurring_5pct",
      ];

      const commissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", chatterId)
        .where("type", "in", REFERRAL_COMMISSION_TYPES)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          filleulName: data.description || "",
          amount: data.amount,
          createdAt: data.createdAt?.toDate().toISOString() || "",
        };
      });

      // Calculate monthly earnings (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCommissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", chatterId)
        .where("type", "in", REFERRAL_COMMISSION_TYPES)
        .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
        .get();

      let monthlyReferralEarnings = 0;
      for (const doc of monthlyCommissionsQuery.docs) {
        monthlyReferralEarnings += doc.data().amount || 0;
      }

      // Get tier progress
      const nextTier = getNextTierBonus(chatter);

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
              currentTier: 500, // Max tier achieved
              nextTier: null,
              filleulsNeeded: 0,
              bonusAmount: 0,
            },
        activePromotion,
      };
    } catch (error) {
      logger.error("[getReferralDashboard] Error", { chatterId, error });
      throw new HttpsError("internal", "Failed to get referral dashboard");
    }
  }
);
