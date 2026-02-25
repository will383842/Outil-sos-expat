/**
 * Callable: getInfluencerLeaderboard
 *
 * Returns the top 10 influencers for the current month.
 * NOTE: This is INFORMATIONAL ONLY - no bonus is awarded to top performers.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  GetInfluencerLeaderboardResponse,
} from "../types";
import { getInfluencerConfigCached } from "../utils";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getInfluencerLeaderboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerLeaderboardResponse> => {
    ensureInitialized();

    // 1. Check authentication (optional for leaderboard)
    const userId = request.auth?.uid || null;
    const db = getFirestore();

    try {
      const config = await getInfluencerConfigCached();
      const currentMonth = new Date().toISOString().substring(0, 7);
      const leaderboardSize = config.leaderboardSize || 10;

      // 2. Get top influencers by current month earnings
      // Query influencers with currentMonthStats for this month, sorted by earnings
      const influencersQuery = await db
        .collection("influencers")
        .where("status", "==", "active")
        .where("currentMonthStats.month", "==", currentMonth)
        .orderBy("currentMonthStats.earnings", "desc")
        .limit(leaderboardSize)
        .get();

      const rankings: GetInfluencerLeaderboardResponse["rankings"] = [];

      influencersQuery.docs.forEach((doc, index) => {
        const influencer = doc.data() as Influencer;
        const monthlyEarnings = influencer.currentMonthStats?.earnings || 0;

        // Only include if they have earnings this month
        if (monthlyEarnings > 0) {
          rankings.push({
            rank: index + 1,
            influencerId: influencer.id,
            influencerName: `${influencer.firstName} ${influencer.lastName.charAt(0)}.`,
            photoUrl: influencer.photoUrl,
            country: influencer.country,
            monthlyEarnings,
            monthlyClients: influencer.currentMonthStats?.clients || 0,
            isCurrentUser: userId ? influencer.id === userId : false,
          });
        }
      });

      // 3. Get current user's stats if authenticated
      let currentUserRank: number | null = null;
      let currentUserStats: GetInfluencerLeaderboardResponse["currentUserStats"] = null;

      if (userId) {
        const userDoc = await db.collection("influencers").doc(userId).get();

        if (userDoc.exists) {
          const userInfluencer = userDoc.data() as Influencer;

          if (userInfluencer.currentMonthStats?.month === currentMonth) {
            currentUserStats = {
              monthlyEarnings: userInfluencer.currentMonthStats.earnings,
              monthlyClients: userInfluencer.currentMonthStats.clients,
              monthlyRecruits: userInfluencer.currentMonthStats.recruits,
            };

            // Find user's rank if in leaderboard
            const userRankEntry = rankings.find((r) => r.influencerId === userId);
            if (userRankEntry) {
              currentUserRank = userRankEntry.rank;
            } else if (currentUserStats.monthlyEarnings > 0) {
              // Calculate approximate rank if not in top 10
              const countAboveQuery = await db
                .collection("influencers")
                .where("status", "==", "active")
                .where("currentMonthStats.month", "==", currentMonth)
                .where("currentMonthStats.earnings", ">", currentUserStats.monthlyEarnings)
                .count()
                .get();

              currentUserRank = countAboveQuery.data().count + 1;
            }
          }
        }
      }

      logger.info("[getInfluencerLeaderboard] Leaderboard fetched", {
        month: currentMonth,
        rankingsCount: rankings.length,
        requestUserId: userId,
      });

      return {
        rankings,
        currentUserRank,
        currentUserStats,
        month: currentMonth,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getInfluencerLeaderboard] Error", { error });
      throw new HttpsError("internal", "Failed to get leaderboard");
    }
  }
);
