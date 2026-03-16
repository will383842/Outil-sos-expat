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
    memory: "512MiB",  // FIX: 256MiB caused OOM at startup
    cpu: 0.5,  // FIX: memory > 256MiB requires cpu >= 0.5
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
      // Step 1: Get chatter data
      logger.info("[getReferralDashboard] Step 1: Get chatter", { chatterId });
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Step 2: Get N1 filleuls (limited to 50 for performance — stats use chatter counters)
      logger.info("[getReferralDashboard] Step 2: Get N1 filleuls");
      const filleulsN1Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", chatterId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const filleulsN1 = filleulsN1Query.docs.map((doc) => {
        const filleul = doc.data() as Chatter;
        const clientEarnings = getClientEarnings(filleul);

        const isActive = (filleul.totalEarned || 0) > 0;

        return {
          id: doc.id,
          name: `${filleul.firstName || ""} ${filleul.lastName || ""}`.trim() || "Unknown",
          email: filleul.email || "",
          clientEarnings,
          threshold10Reached: filleul.threshold10Reached || false,
          threshold50Reached: filleul.threshold50Reached || false,
          isActive,
          joinedAt: filleul.createdAt?.toDate?.()?.toISOString?.() || "",
        };
      });

      // Step 3: Get N2 filleuls (filleuls of filleuls)
      logger.info("[getReferralDashboard] Step 3: Get N2 filleuls");
      const filleulsN1Ids = filleulsN1Query.docs.map((doc) => doc.id);
      let filleulsN2: GetReferralDashboardResponse["filleulsN2"] = [];

      if (filleulsN1Ids.length > 0) {
        // Limit to first 30 N1 IDs for N2 lookup (max 3 Firestore 'in' queries)
        const limitedN1Ids = filleulsN1Ids.slice(0, 30);
        const chunks = [];
        for (let i = 0; i < limitedN1Ids.length; i += 10) {
          chunks.push(limitedN1Ids.slice(i, i + 10));
        }

        const MAX_N2 = 50;
        for (const chunk of chunks) {
          if (filleulsN2.length >= MAX_N2) break;

          const n2Query = await db
            .collection("chatters")
            .where("recruitedBy", "in", chunk)
            .limit(MAX_N2 - filleulsN2.length)
            .get();

          for (const doc of n2Query.docs) {
            const filleul = doc.data() as Chatter;
            const parrainN1 = filleulsN1.find((f) => f.id === filleul.recruitedBy);

            filleulsN2.push({
              id: doc.id,
              name: `${filleul.firstName || ""} ${filleul.lastName || ""}`.trim() || "Unknown",
              parrainN1Name: parrainN1?.name || "Unknown",
              threshold50Reached: filleul.threshold50Reached || false,
              joinedAt: filleul.createdAt?.toDate?.()?.toISOString?.() || "",
            });
          }
        }
      }

      // Step 4: Get recent referral commissions
      logger.info("[getReferralDashboard] Step 4: Get recent commissions");
      const REFERRAL_COMMISSION_TYPES = [
        "n1_call", "n2_call", "activation_bonus", "n1_recruit_bonus", "tier_bonus",
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
          amount: data.amount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
        };
      });

      // Step 5: Monthly earnings
      logger.info("[getReferralDashboard] Step 5: Monthly earnings");
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

      // Step 6: Tier progress
      logger.info("[getReferralDashboard] Step 6: Tier progress");
      const nextTier = getNextTierBonus(chatter);

      // Calculate qualified N1 count — use chatter doc counter or separate count query
      // (filleulsN1 is limited to 50, so filter would be inaccurate for large networks)
      const qualifiedFilleulsN1 = chatter.qualifiedReferralsCount ?? filleulsN1.filter((f) => f.threshold50Reached).length;

      const paidTiers = chatter.tierBonusesPaid || [];

      logger.info("[getReferralDashboard] Success", {
        chatterId,
        n1Count: filleulsN1.length,
        n2Count: filleulsN2.length,
        qualifiedN1: qualifiedFilleulsN1,
      });

      // Use chatter doc counters for accurate stats (query is limited to 50)
      const totalN1FromDoc = chatter.totalRecruits || filleulsN1.length;
      const totalN2FromDoc = chatter.referralsN2Count || filleulsN2.length;

      return {
        stats: {
          totalFilleulsN1: totalN1FromDoc,
          qualifiedFilleulsN1,
          totalFilleulsN2: totalN2FromDoc,
          totalReferralEarnings: chatter.referralEarnings || 0,
          monthlyReferralEarnings,
        },
        recentCommissions,
        filleulsN1,
        filleulsN2,
        tierProgress: nextTier
          ? {
              currentTier: paidTiers.length > 0 ? paidTiers[paidTiers.length - 1] : null,
              nextTier: nextTier.tier,
              filleulsNeeded: nextTier.filleulsNeeded,
              bonusAmount: nextTier.bonusAmount,
            }
          : {
              currentTier: paidTiers.length > 0 ? paidTiers[paidTiers.length - 1] : 500,
              nextTier: null,
              filleulsNeeded: 0,
              bonusAmount: 0,
            },
        activePromotion: null,
      };
    } catch (error: any) {
      logger.error("[getReferralDashboard] Error", {
        chatterId,
        errorMessage: error?.message || "unknown",
        errorCode: error?.code || "unknown",
        errorStack: error?.stack?.substring(0, 500) || "",
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get referral dashboard");
    }
  }
);
