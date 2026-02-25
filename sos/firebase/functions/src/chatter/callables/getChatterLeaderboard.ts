/**
 * Callable: getChatterLeaderboard
 *
 * Returns the monthly leaderboard for chatters.
 * Accessible by authenticated chatters.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter, ChatterCommission, ChatterMonthlyRanking } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface LeaderboardEntry {
  rank: number;
  chatterId: string;
  chatterName: string;
  chatterCode: string;
  photoUrl?: string;
  country: string;
  monthlyEarnings: number;
  monthlyClients: number;
  monthlyRecruits: number;
  level: 1 | 2 | 3 | 4 | 5;
}

interface GetLeaderboardInput {
  month?: string; // YYYY-MM format
}

interface GetLeaderboardResponse {
  rankings: LeaderboardEntry[];
  month: string;
  totalParticipants: number;
  myRank: number | null;
}

/**
 * Assert that the request is from an authenticated user
 */
function assertAuthenticated(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return request.auth.uid;
}

export const getChatterLeaderboard = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetLeaderboardResponse> => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const db = getFirestore();
    const input = request.data as GetLeaderboardInput;

    // Default to current month
    const targetMonth =
      input.month ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new HttpsError("invalid-argument", "Invalid month format. Use YYYY-MM");
    }

    try {
      // First check if we have a pre-calculated ranking
      const rankingDoc = await db
        .collection("chatter_monthly_rankings")
        .doc(targetMonth)
        .get();

      let rankings: LeaderboardEntry[] = [];
      let totalParticipants = 0;

      if (rankingDoc.exists) {
        const rankingData = rankingDoc.data() as ChatterMonthlyRanking;
        rankings = rankingData.rankings.map((r) => ({
          rank: r.rank,
          chatterId: r.chatterId,
          chatterName: r.chatterName,
          chatterCode: r.chatterCode,
          photoUrl: r.photoUrl,
          country: r.country,
          monthlyEarnings: r.monthlyEarnings,
          monthlyClients: r.monthlyClients,
          monthlyRecruits: r.monthlyRecruits,
          level: r.level,
        }));
        totalParticipants = rankingData.rankings.length;
      } else {
        // Calculate ranking on the fly (for current month or missing data)
        const startOfMonth = new Date(`${targetMonth}-01T00:00:00.000Z`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        // Get all active chatters
        const chattersSnapshot = await db
          .collection("chatters")
          .where("status", "==", "active")
          .get();

        const chatterIds = chattersSnapshot.docs.map((doc) => doc.id);

        // Get commissions for this month
        const tempRankings: Array<{
          chatterId: string;
          monthlyEarnings: number;
          monthlyClients: number;
          monthlyRecruits: number;
        }> = [];

        // Process chatters in batches of 10 for efficiency
        for (let i = 0; i < chatterIds.length; i += 10) {
          const batch = chatterIds.slice(i, i + 10);

          const commissionsPromises = batch.map(async (chatterId) => {
            const commissions = await db
              .collection("chatter_commissions")
              .where("chatterId", "==", chatterId)
              .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
              .where("createdAt", "<", Timestamp.fromDate(endOfMonth))
              .get();

            let monthlyEarnings = 0;
            let monthlyClients = 0;
            let monthlyRecruits = 0;

            commissions.docs.forEach((doc) => {
              const comm = doc.data() as ChatterCommission;
              if (comm.status !== "cancelled") {
                monthlyEarnings += comm.amount;
                if (comm.type === "client_referral") monthlyClients++;
                if (comm.type === "recruitment") monthlyRecruits++;
              }
            });

            return { chatterId, monthlyEarnings, monthlyClients, monthlyRecruits };
          });

          const batchResults = await Promise.all(commissionsPromises);
          tempRankings.push(...batchResults);
        }

        // Filter and format rankings
        for (const result of tempRankings) {
          const chatterDoc = chattersSnapshot.docs.find((d) => d.id === result.chatterId);
          if (!chatterDoc) continue;

          const chatter = chatterDoc.data() as Chatter;

          if (result.monthlyEarnings > 0 || result.monthlyClients > 0) {
            rankings.push({
              rank: 0,
              chatterId: result.chatterId,
              chatterName: `${chatter.firstName} ${chatter.lastName.charAt(0)}.`,
              chatterCode: chatter.affiliateCodeClient,
              photoUrl: chatter.photoUrl,
              country: chatter.country,
              monthlyEarnings: result.monthlyEarnings,
              monthlyClients: result.monthlyClients,
              monthlyRecruits: result.monthlyRecruits,
              level: chatter.level,
            });
          }
        }

        // Sort by earnings
        rankings.sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);

        // Assign ranks
        rankings.forEach((r, idx) => {
          r.rank = idx + 1;
        });

        totalParticipants = rankings.length;
      }

      // Find current user's rank
      const myRank = rankings.find((r) => r.chatterId === uid)?.rank ?? null;

      // Limit to top 50 for display (but include current user's rank)
      const topRankings = rankings.slice(0, 50);

      logger.info("[getChatterLeaderboard] Leaderboard fetched", {
        month: targetMonth,
        totalParticipants,
        requestedBy: uid,
        myRank,
      });

      return {
        rankings: topRankings,
        month: targetMonth,
        totalParticipants,
        myRank,
      };
    } catch (error) {
      logger.error("[getChatterLeaderboard] Error", { error, uid });
      throw new HttpsError("internal", "Failed to fetch leaderboard");
    }
  }
);
