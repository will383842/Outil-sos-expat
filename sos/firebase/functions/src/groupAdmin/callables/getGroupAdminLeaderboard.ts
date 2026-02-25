/**
 * Callable: getGroupAdminLeaderboard
 *
 * Returns the monthly leaderboard for GroupAdmins.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminBadgeType,
  GroupAdminLeaderboardResponse,
  GroupAdminMonthlyRanking,
} from "../types";
import { getLeaderboardSize } from "../groupAdminConfig";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetLeaderboardInput {
  month?: string; // YYYY-MM format, defaults to current month. Use "all-time" for all-time leaderboard
}

export const getGroupAdminLeaderboard = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GroupAdminLeaderboardResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetLeaderboardInput;

    try {
      // 2. Determine month
      const currentMonth = new Date().toISOString().substring(0, 7);
      const targetMonth = input.month || currentMonth;
      const isAllTime = targetMonth === "all-time";

      // Validate month format (unless all-time)
      if (!isAllTime && !/^\d{4}-\d{2}$/.test(targetMonth)) {
        throw new HttpsError("invalid-argument", "Invalid month format. Use YYYY-MM or 'all-time'");
      }

      // 3. Check if user is a GroupAdmin
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const currentAdmin = groupAdminDoc.data() as GroupAdmin;

      // 4. Handle all-time leaderboard
      if (isAllTime) {
        const leaderboardSize = await getLeaderboardSize();

        // Get all active GroupAdmins sorted by total earnings
        const adminSnapshot = await db
          .collection("group_admins")
          .where("status", "==", "active")
          .orderBy("totalEarned", "desc")
          .get();

        const allAdmins = adminSnapshot.docs.map((doc, index) => {
          const data = doc.data() as GroupAdmin;
          return {
            rank: index + 1,
            groupAdminId: doc.id,
            groupAdminName: `${data.firstName} ${data.lastName.charAt(0)}.`,
            groupName: data.groupName,
            earnings: data.totalEarned,
            clients: data.totalClients,
            recruits: data.totalRecruits,
            badges: (data.badges || []) as GroupAdminBadgeType[],
          };
        });

        // Find current admin's rank
        let currentAdminRank: number | null = null;
        const adminInList = allAdmins.find((a) => a.groupAdminId === userId);
        if (adminInList) {
          currentAdminRank = adminInList.rank;
        } else {
          currentAdminRank = allAdmins.length + 1;
        }

        // Return top N
        const topRankings = allAdmins.slice(0, leaderboardSize);

        return {
          month: "all-time",
          rankings: topRankings,
          currentAdminRank,
          totalParticipants: allAdmins.length,
        };
      }

      // 5. Try to get pre-calculated ranking first (for past months)
      const rankingDoc = await db
        .collection("group_admin_monthly_rankings")
        .doc(targetMonth)
        .get();

      if (rankingDoc.exists) {
        const rankingData = rankingDoc.data() as GroupAdminMonthlyRanking;

        // Fetch badges for all admins in the ranking
        const adminIds = rankingData.rankings.map((r) => r.groupAdminId);
        const badgeMap = new Map<string, GroupAdminBadgeType[]>();

        if (adminIds.length > 0) {
          // Firestore 'in' query supports max 30 items, batch if needed
          const batches = [];
          for (let i = 0; i < adminIds.length; i += 30) {
            batches.push(adminIds.slice(i, i + 30));
          }

          for (const batch of batches) {
            const batchSnapshot = await db
              .collection("group_admins")
              .where("__name__", "in", batch)
              .get();

            batchSnapshot.docs.forEach((doc) => {
              const data = doc.data() as GroupAdmin;
              badgeMap.set(doc.id, (data.badges || []) as GroupAdminBadgeType[]);
            });
          }
        }

        // Find current admin's rank
        const currentAdminRank =
          rankingData.rankings.find((r) => r.groupAdminId === userId)?.rank || null;

        // Add badges to rankings
        const rankingsWithBadges = rankingData.rankings.map((r) => ({
          ...r,
          badges: badgeMap.get(r.groupAdminId) || [],
        }));

        return {
          month: targetMonth,
          rankings: rankingsWithBadges,
          currentAdminRank,
          totalParticipants: rankingData.rankings.length,
        };
      }

      // 6. Calculate current month leaderboard in real-time
      const leaderboardSize = await getLeaderboardSize();

      // Get all active GroupAdmins with stats for this month
      const adminSnapshot = await db
        .collection("group_admins")
        .where("status", "==", "active")
        .where("currentMonthStats.month", "==", targetMonth)
        .orderBy("currentMonthStats.earnings", "desc")
        .get();

      const allAdmins = adminSnapshot.docs.map((doc, index) => {
        const data = doc.data() as GroupAdmin;
        return {
          rank: index + 1,
          groupAdminId: doc.id,
          groupAdminName: `${data.firstName} ${data.lastName.charAt(0)}.`,
          groupName: data.groupName,
          earnings: data.currentMonthStats.earnings,
          clients: data.currentMonthStats.clients,
          recruits: data.currentMonthStats.recruits,
          badges: (data.badges || []) as GroupAdminBadgeType[],
        };
      });

      // Find current admin's rank (might be outside top N)
      let currentAdminRank: number | null = null;
      const adminInList = allAdmins.find((a) => a.groupAdminId === userId);
      if (adminInList) {
        currentAdminRank = adminInList.rank;
      } else if (currentAdmin.currentMonthStats.month === targetMonth) {
        // Admin has no earnings this month, calculate their potential rank
        currentAdminRank = allAdmins.length + 1;
      }

      // Return top N
      const topRankings = allAdmins.slice(0, leaderboardSize);

      return {
        month: targetMonth,
        rankings: topRankings,
        currentAdminRank,
        totalParticipants: allAdmins.length,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminLeaderboard] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch leaderboard");
    }
  }
);
