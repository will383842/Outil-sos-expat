/**
 * Get GroupAdmin Recruits Callable
 *
 * Returns list of groupAdmins recruited by the current groupAdmin with:
 * - Recruit info (name, email, registration date, group name)
 * - Activation call count (referrals made by the recruit)
 * - Progress towards activation threshold (default: 2 referrals)
 * - Whether $5 activation bonus has been paid
 * - Commission window expiration
 *
 * NOTE: Migrated from old $200 threshold / $50 bonus system to
 * Chatter-style activation: $5 bonus when recruit makes 2 referrals.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { GroupAdmin, GroupAdminRecruit } from "../types";
import { getActivationBonusAmount, getActivationCallsRequired } from "../groupAdminConfig";
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

  // Activation progress (Chatter-style: count of referrals made by recruit)
  activationCallCount: number;   // How many client_referral calls the recruit has made
  progressPercent: number;       // Progress towards activationCallsRequired (0-100)
  threshold: number;             // activationCallsRequired (default: 2)

  // Bonus status
  bonusPaid: boolean;
  bonusAmount: number;           // $5 = 500 cents
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

      // 3. Get config for activation threshold and bonus amount (Chatter-style)
      const [threshold, bonusAmount] = await Promise.all([
        getActivationCallsRequired(), // 2 referrals required (not $200)
        getActivationBonusAmount(),   // $5 = 500 cents (not $50)
      ]);

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

        // Use activationCallCount stored on recruit doc (maintained by checkAndPayActivationBonus)
        const activationCallCount = recruit.activationCallCount ?? 0;

        // Calculate progress towards activation (call count vs required calls)
        const progressPercent = Math.min(100, Math.round((activationCallCount / threshold) * 100));

        // Bonus paid: check new field first, then legacy for backward compat
        const bonusPaid = recruit.activationBonusPaid || recruit.commissionPaid || false;
        const bonusPaidAt = (recruit.activationBonusPaidAt ?? recruit.commissionPaidAt)?.toDate().toISOString() || null;
        const commissionId = recruit.activationBonusCommissionId || recruit.commissionId || null;

        recruits.push({
          recruitId: recruitDoc.id,
          recruitedId: recruit.recruitedId,
          recruitedName: recruit.recruitedName,
          recruitedEmail: recruit.recruitedEmail,
          recruitedGroupName: recruit.recruitedGroupName,
          recruitedAt: recruit.recruitedAt.toDate().toISOString(),
          commissionWindowEnd: recruit.commissionWindowEnd.toDate().toISOString(),
          isActive,
          activationCallCount,
          progressPercent,
          threshold,
          bonusPaid,
          bonusAmount,
          bonusPaidAt,
          commissionId,
        });
      }

      // 6. Calculate summary
      const summary = {
        totalRecruits: recruits.length,
        activeRecruits: recruits.filter(r => r.isActive).length,
        bonusesPaid: recruits.filter(r => r.bonusPaid).length,
        bonusesPending: recruits.filter(r => !r.bonusPaid && r.isActive).length,
        totalBonusEarned: recruits.filter(r => r.bonusPaid).length * bonusAmount, // $5 per paid bonus
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
