/**
 * Get Blogger Leaderboard Callable
 *
 * Returns the monthly top 10 bloggers.
 * NOTE: Informational only - no rewards (unlike Chatters)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  GetBloggerLeaderboardResponse,
  Blogger,
  BloggerMonthlyRanking,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

export const getBloggerLeaderboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerLeaderboardResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const db = getFirestore();
    const currentMonth = new Date().toISOString().slice(0, 7);

    try {
      // 2. Get current month rankings
      const rankingDoc = await db
        .collection("blogger_monthly_rankings")
        .doc(currentMonth)
        .get();

      let rankings: GetBloggerLeaderboardResponse["rankings"] = [];

      if (rankingDoc.exists) {
        const rankingData = rankingDoc.data() as BloggerMonthlyRanking;
        rankings = rankingData.rankings.map(r => ({
          rank: r.rank,
          bloggerId: r.bloggerId,
          bloggerName: r.bloggerName,
          photoUrl: r.photoUrl,
          country: r.country,
          blogUrl: r.blogUrl,
          monthlyEarnings: r.monthlyEarnings,
          monthlyClients: r.monthlyClients,
          isCurrentUser: r.bloggerId === uid,
        }));
      } else {
        // No rankings yet, calculate live from bloggers
        const bloggersQuery = await db
          .collection("bloggers")
          .where("status", "==", "active")
          .get();

        const bloggerStats = bloggersQuery.docs
          .map(doc => {
            const data = doc.data() as Blogger;
            const monthlyEarnings = data.currentMonthStats?.month === currentMonth
              ? data.currentMonthStats.earnings
              : 0;
            return {
              bloggerId: doc.id,
              bloggerName: `${data.firstName} ${data.lastName}`,
              photoUrl: data.photoUrl,
              country: data.country,
              blogUrl: data.blogUrl,
              monthlyEarnings,
              monthlyClients: data.currentMonthStats?.month === currentMonth
                ? data.currentMonthStats.clients
                : 0,
            };
          })
          .filter(b => b.monthlyEarnings > 0)
          .sort((a, b) => b.monthlyEarnings - a.monthlyEarnings)
          .slice(0, 10);

        rankings = bloggerStats.map((b, index) => ({
          rank: index + 1,
          bloggerId: b.bloggerId,
          bloggerName: b.bloggerName,
          photoUrl: b.photoUrl,
          country: b.country,
          blogUrl: b.blogUrl,
          monthlyEarnings: b.monthlyEarnings,
          monthlyClients: b.monthlyClients,
          isCurrentUser: b.bloggerId === uid,
        }));
      }

      // 3. Get current user stats
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();
      let currentUserRank: number | null = null;
      let currentUserStats: GetBloggerLeaderboardResponse["currentUserStats"] = null;

      if (bloggerDoc.exists) {
        const blogger = bloggerDoc.data() as Blogger;
        currentUserRank = blogger.currentMonthRank;

        if (blogger.currentMonthStats?.month === currentMonth) {
          currentUserStats = {
            monthlyEarnings: blogger.currentMonthStats.earnings,
            monthlyClients: blogger.currentMonthStats.clients,
            monthlyRecruits: blogger.currentMonthStats.recruits,
          };
        } else {
          currentUserStats = {
            monthlyEarnings: 0,
            monthlyClients: 0,
            monthlyRecruits: 0,
          };
        }

        // Check if user is in rankings but not in top 10
        if (!currentUserRank && currentUserStats.monthlyEarnings > 0) {
          const userInRankings = rankings.find(r => r.bloggerId === uid);
          if (userInRankings) {
            currentUserRank = userInRankings.rank;
          }
        }
      }

      logger.info("[getBloggerLeaderboard] Leaderboard retrieved", {
        bloggerId: uid,
        month: currentMonth,
        rankingsCount: rankings.length,
        currentUserRank,
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

      logger.error("[getBloggerLeaderboard] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get leaderboard");
    }
  }
);
