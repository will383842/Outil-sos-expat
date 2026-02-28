/**
 * Get GroupAdmin Recruited Providers Callable
 *
 * Returns list of providers (lawyers/expats) recruited by the current groupAdmin with:
 * - Provider info (name, email, type, recruitment date)
 * - Commission window status
 * - Calls with commission count and total earned
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { GroupAdmin, GroupAdminRecruitedProvider } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

export interface RecruitedProviderInfo {
  recruitId: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerType: "lawyer" | "expat";
  recruitedAt: string;
  commissionWindowEndsAt: string;
  isActive: boolean;
  callsWithCommission: number;
  totalCommissions: number;
  lastCommissionAt: string | null;
}

export interface GetGroupAdminRecruitedProvidersResponse {
  success: boolean;
  providers: RecruitedProviderInfo[];
  summary: {
    totalProviders: number;
    activeProviders: number;
    totalCallsWithCommission: number;
    totalEarned: number;
  };
}

export const getGroupAdminRecruitedProviders = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminRecruitedProvidersResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const groupAdminId = request.auth.uid;
    const db = getFirestore();

    try {
      const groupAdminDoc = await db.collection("group_admins").doc(groupAdminId).get();
      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;
      if (groupAdmin.status !== "active") {
        throw new HttpsError("permission-denied", "GroupAdmin account is not active");
      }

      const recruitsQuery = await db
        .collection("group_admin_recruited_providers")
        .where("groupAdminId", "==", groupAdminId)
        .get();

      if (recruitsQuery.empty) {
        return {
          success: true,
          providers: [],
          summary: {
            totalProviders: 0,
            activeProviders: 0,
            totalCallsWithCommission: 0,
            totalEarned: 0,
          },
        };
      }

      const now = Date.now();
      const providers: RecruitedProviderInfo[] = [];

      for (const doc of recruitsQuery.docs) {
        const recruit = doc.data() as GroupAdminRecruitedProvider;
        const isActive = recruit.commissionWindowEndsAt.toMillis() > now;

        providers.push({
          recruitId: doc.id,
          providerId: recruit.providerId,
          providerName: recruit.providerName,
          providerEmail: recruit.providerEmail,
          providerType: recruit.providerType,
          recruitedAt: recruit.recruitedAt.toDate().toISOString(),
          commissionWindowEndsAt: recruit.commissionWindowEndsAt.toDate().toISOString(),
          isActive,
          callsWithCommission: recruit.callsWithCommission || 0,
          totalCommissions: recruit.totalCommissions || 0,
          lastCommissionAt: recruit.lastCommissionAt?.toDate().toISOString() || null,
        });
      }

      const summary = {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.isActive).length,
        totalCallsWithCommission: providers.reduce((sum, p) => sum + p.callsWithCommission, 0),
        totalEarned: providers.reduce((sum, p) => sum + p.totalCommissions, 0),
      };

      providers.sort((a, b) => new Date(b.recruitedAt).getTime() - new Date(a.recruitedAt).getTime());

      logger.info("[getGroupAdminRecruitedProviders] Fetched", {
        groupAdminId,
        totalProviders: providers.length,
      });

      return { success: true, providers, summary };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getGroupAdminRecruitedProviders] Error", { groupAdminId, error });
      throw new HttpsError("internal", "Failed to fetch recruited providers");
    }
  }
);
