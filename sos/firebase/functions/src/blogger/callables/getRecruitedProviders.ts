/**
 * Get Blogger Recruited Providers Callable
 *
 * Returns list of providers (lawyers/expats) recruited by the current blogger with:
 * - Provider info (name, email, type, recruitment date)
 * - Commission window status
 * - Calls with commission count and total earned
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger, BloggerRecruitedProvider } from "../types";
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

export interface GetBloggerRecruitedProvidersResponse {
  success: boolean;
  providers: RecruitedProviderInfo[];
  summary: {
    totalProviders: number;
    activeProviders: number;
    totalCallsWithCommission: number;
    totalEarned: number;
  };
}

export const getBloggerRecruitedProviders = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerRecruitedProvidersResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const bloggerId = request.auth.uid;
    const db = getFirestore();

    try {
      const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();
      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger profile not found");
      }

      const blogger = bloggerDoc.data() as Blogger;
      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Blogger account is not active");
      }

      const recruitsQuery = await db
        .collection("blogger_recruited_providers")
        .where("bloggerId", "==", bloggerId)
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
        const recruit = doc.data() as BloggerRecruitedProvider;
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

      logger.info("[getBloggerRecruitedProviders] Fetched", {
        bloggerId,
        totalProviders: providers.length,
      });

      return { success: true, providers, summary };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getBloggerRecruitedProviders] Error", { bloggerId, error });
      throw new HttpsError("internal", "Failed to fetch recruited providers");
    }
  }
);
