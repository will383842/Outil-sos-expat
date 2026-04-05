/**
 * Get Blogger Dashboard Callable
 *
 * Returns dashboard data for the authenticated blogger.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 10,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerDashboardResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();

    // Admin impersonation: allow admin to view any blogger's dashboard
    const requestedUserId = request.data?.userId as string | undefined;
    let uid = request.auth.uid;
    let isAdminView = false;

    if (requestedUserId && requestedUserId !== request.auth.uid) {
      const callerRole = request.auth.token?.role as string | undefined;
      if (callerRole !== "admin" && callerRole !== "superadmin") {
        const callerDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!callerDoc.exists || !["admin", "superadmin"].includes(callerDoc.data()?.role)) {
          throw new HttpsError("permission-denied", "Admin access required to view other users' dashboards");
        }
      }
      uid = requestedUserId;
      isAdminView = true;
    }

    try {
      // 2. Get blogger profile
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger profile not found");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status === "banned") {
        throw new HttpsError("permission-denied", "Account is banned");
      }

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

      // 7. Update last login - skip for admin view
      if (!isAdminView) {
        await db.collection("bloggers").doc(uid).update({
          lastLoginAt: Timestamp.now(),
        });
      }

      // 8. FIX: Fetch recruited bloggers (filleuls) — was missing
      const recruitsQuery = await db
        .collection("bloggers")
        .where("recruitedBy", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const recruitedBloggers = recruitsQuery.docs.map(doc => {
        const data = doc.data() as Blogger;
        return {
          id: doc.id,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown",
          email: data.email || "",
          totalEarned: data.totalEarned || 0,
          isActive: (data.totalEarned || 0) > 0,
          joinedAt: data.createdAt?.toDate?.()?.toISOString?.() || "",
        };
      });

      // 8b. FIX: Fetch recruiter info (parrain) — cross-collection fallback
      let recruiterName: string | null = null;
      let recruiterPhoto: string | null = null;
      if (blogger.recruitedBy) {
        let recruiterDoc = await db.collection("bloggers").doc(blogger.recruitedBy).get();
        if (!recruiterDoc.exists) {
          recruiterDoc = await db.collection("users").doc(blogger.recruitedBy).get();
        }
        if (recruiterDoc.exists) {
          const recruiterData = recruiterDoc.data();
          recruiterName = [recruiterData?.firstName, recruiterData?.lastName].filter(Boolean).join(" ") || recruiterData?.email || null;
          recruiterPhoto = recruiterData?.profilePhoto || recruiterData?.photoURL || null;
        }
      }

      // 9. Build response (exclude sensitive fields)
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
        recruitsCount: recruitedBloggers.length,
      });

      return {
        blogger: bloggerResponse as unknown as GetBloggerDashboardResponse["blogger"],
        recentCommissions,
        monthlyStats,
        unreadNotifications,
        isAdminView,
        // FIX: Include recruited bloggers and recruiter info
        recruitedBloggers,
        recruiterName,
        recruiterPhoto,
        config: {
          // Use lockedRates (lifetime rate lock) when available, fallback to global config
          commissionClientAmount: blogger.lockedRates?.commissionClientAmount ?? config.commissionClientAmount,
          commissionClientAmountLawyer: blogger.lockedRates?.commissionClientAmountLawyer ?? config.commissionClientAmountLawyer,
          commissionClientAmountExpat: blogger.lockedRates?.commissionClientAmountExpat ?? config.commissionClientAmountExpat,
          commissionRecruitmentAmount: blogger.lockedRates?.commissionRecruitmentAmount ?? config.commissionRecruitmentAmount,
          minimumWithdrawalAmount: config.minimumWithdrawalAmount,
        },
        // Commission Plan info (for display on dashboard)
        commissionPlan: blogger.commissionPlanId ? {
          id: blogger.commissionPlanId,
          name: blogger.commissionPlanName || "Plan personnalis\u00e9",
          rateLockDate: blogger.rateLockDate,
          isLifetimeLock: true,
        } : null,
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
