/**
 * Get GroupAdmin Recruits Callable
 *
 * Returns list of groupAdmins recruited by the current groupAdmin with:
 * - Recruit info (name, email, registration date, group name)
 * - Current direct earnings (client_referral only)
 * - Progress towards $200 threshold
 * - Whether $50 bonus has been paid
 * - Commission window expiration
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { GroupAdmin, GroupAdminRecruit, GroupAdminCommission } from "../types";
import { getGroupAdminConfig } from "../groupAdminConfig";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

export interface GroupAdminRecruitInfo {
  recruitId: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
  recruitedGroupName: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  isActive: boolean;

  // Earnings data
  totalDirectEarnings: number; // Sum of client_referral commissions (in cents)
  progressPercent: number; // Progress towards threshold (0-100)
  threshold: number; // $200 = 20000 cents

  // Bonus status
  bonusPaid: boolean;
  bonusAmount: number; // $50 = 5000 cents
  bonusPaidAt: string | null;
  commissionId: string | null;
}

export interface GetGroupAdminRecruitsResponse {
  success: boolean;
  recruits: GroupAdminRecruitInfo[];
  summary: {
    totalRecruits: number;
    activeRecruits: number;
    bonusesPaid: number;
    bonusesPending: number;
    totalBonusEarned: number;
  };
  threshold: number;
  bonusAmount: number;
}

export const getGroupAdminRecruits = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminRecruitsResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const groupAdminId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Verify groupAdmin exists and is active
      const groupAdminDoc = await db.collection("group_admins").doc(groupAdminId).get();
      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;
      if (groupAdmin.status !== "active") {
        throw new HttpsError("permission-denied", "GroupAdmin account is not active");
      }

      // 3. Get config for threshold and bonus amount
      const config = await getGroupAdminConfig();
      const threshold = config.recruitmentCommissionThreshold; // 20000 cents ($200)
      const bonusAmount = config.commissionRecruitmentAmount; // $50 = 5000 cents (from config)

      // 4. Get all groupAdmin recruits
      const recruitsQuery = await db
        .collection("group_admin_recruited_admins")
        .where("recruiterId", "==", groupAdminId)
        .get();

      if (recruitsQuery.empty) {
        return {
          success: true,
          recruits: [],
          summary: {
            totalRecruits: 0,
            activeRecruits: 0,
            bonusesPaid: 0,
            bonusesPending: 0,
            totalBonusEarned: 0,
          },
          threshold,
          bonusAmount,
        };
      }

      // 5. For each recruit, get their direct earnings (client_referral only)
      const recruits: GroupAdminRecruitInfo[] = [];
      const now = Date.now();

      for (const recruitDoc of recruitsQuery.docs) {
        const recruit = recruitDoc.data() as GroupAdminRecruit;

        // Check if commission window is still active
        const isActive = recruit.commissionWindowEnd.toMillis() > now;

        // Get all client_referral commissions for this recruited groupAdmin
        const commissionsQuery = await db
          .collection("group_admin_commissions")
          .where("groupAdminId", "==", recruit.recruitedId)
          .where("type", "==", "client_referral")
          .get();

        // Sum non-cancelled commissions
        let totalDirectEarnings = 0;
        for (const commDoc of commissionsQuery.docs) {
          const comm = commDoc.data() as GroupAdminCommission;
          if (comm.status !== "cancelled") {
            totalDirectEarnings += comm.amount;
          }
        }

        // Calculate progress
        const progressPercent = Math.min(100, Math.round((totalDirectEarnings / threshold) * 100));

        recruits.push({
          recruitId: recruitDoc.id,
          recruitedId: recruit.recruitedId,
          recruitedName: recruit.recruitedName,
          recruitedEmail: recruit.recruitedEmail,
          recruitedGroupName: recruit.recruitedGroupName,
          recruitedAt: recruit.recruitedAt.toDate().toISOString(),
          commissionWindowEnd: recruit.commissionWindowEnd.toDate().toISOString(),
          isActive,
          totalDirectEarnings,
          progressPercent,
          threshold,
          bonusPaid: recruit.commissionPaid || false,
          bonusAmount,
          bonusPaidAt: recruit.commissionPaidAt?.toDate().toISOString() || null,
          commissionId: recruit.commissionId || null,
        });
      }

      // 6. Calculate summary
      const summary = {
        totalRecruits: recruits.length,
        activeRecruits: recruits.filter(r => r.isActive).length,
        bonusesPaid: recruits.filter(r => r.bonusPaid).length,
        bonusesPending: recruits.filter(r => !r.bonusPaid && r.isActive).length,
        totalBonusEarned: recruits.filter(r => r.bonusPaid).length * bonusAmount,
      };

      // 7. Sort by recruitment date (newest first)
      recruits.sort((a, b) => new Date(b.recruitedAt).getTime() - new Date(a.recruitedAt).getTime());

      logger.info("[getGroupAdminRecruits] Fetched recruits", {
        groupAdminId,
        totalRecruits: recruits.length,
      });

      return {
        success: true,
        recruits,
        summary,
        threshold,
        bonusAmount,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminRecruits] Error", { groupAdminId, error });
      throw new HttpsError("internal", "Failed to fetch groupAdmin recruits");
    }
  }
);
