/**
 * Get Blogger Dashboard Callable
 *
 * Returns dashboard data for the authenticated blogger.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  GetBloggerDashboardResponse,
  Blogger,
  BloggerCommission,
} from "../types";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

export const getBloggerDashboard = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerDashboardResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Get blogger profile
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger profile not found");
      }

      const blogger = bloggerDoc.data() as Blogger;

      // 3. Get recent commissions
      const commissionsQuery = await db
        .collection("blogger_commissions")
        .where("bloggerId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const recentCommissions = commissionsQuery.docs.map(doc => {
        const data = doc.data() as BloggerCommission;
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          status: data.status,
          description: data.description,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // 4. Get unread notifications count
      const notificationsQuery = await db
        .collection("blogger_notifications")
        .where("bloggerId", "==", uid)
        .where("isRead", "==", false)
        .count()
        .get();

      const unreadNotifications = notificationsQuery.data().count;

      // 5. Get config for commission amounts
      const config = await getBloggerConfigCached();

      // 6. Calculate current month stats
      const currentMonth = new Date().toISOString().slice(0, 7);
      let monthlyStats = {
        earnings: 0,
        clients: 0,
        recruits: 0,
        rank: null as number | null,
      };

      if (blogger.currentMonthStats?.month === currentMonth) {
        monthlyStats = {
          earnings: blogger.currentMonthStats.earnings,
          clients: blogger.currentMonthStats.clients,
          recruits: blogger.currentMonthStats.recruits,
          rank: blogger.currentMonthRank,
        };
      }

      // 7. Build response (exclude sensitive fields)
      const { paymentDetails, adminNotes, ...bloggerPublic } = blogger;

      // Convert Timestamps to strings for JSON serialization
      const bloggerResponse = {
        ...bloggerPublic,
        createdAt: blogger.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        updatedAt: blogger.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        lastLoginAt: blogger.lastLoginAt?.toDate?.()?.toISOString?.() || null,
        definitiveRoleAcknowledgedAt: blogger.definitiveRoleAcknowledgedAt?.toDate?.()?.toISOString?.() || null,
      };

      logger.info("[getBloggerDashboard] Dashboard retrieved", {
        bloggerId: uid,
        commissionsCount: recentCommissions.length,
      });

      return {
        blogger: bloggerResponse as unknown as GetBloggerDashboardResponse["blogger"],
        recentCommissions,
        monthlyStats,
        unreadNotifications,
        config: {
          commissionClientAmount: config.commissionClientAmount,
          commissionRecruitmentAmount: config.commissionRecruitmentAmount,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
        },
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getBloggerDashboard] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get dashboard data");
    }
  }
);
