/**
 * Get Influencer Recruited Providers Callable
 *
 * Returns list of providers (lawyers/expats) recruited by the current influencer with:
 * - Provider info (name, email, type, recruitment date)
 * - Commission window status
 * - Calls with commission count and total earned
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Influencer, InfluencerReferral } from "../types";
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

export interface GetInfluencerRecruitedProvidersResponse {
  success: boolean;
  providers: RecruitedProviderInfo[];
  summary: {
    totalProviders: number;
    activeProviders: number;
    totalCallsWithCommission: number;
    totalEarned: number;
  };
}

export const getInfluencerRecruitedProviders = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerRecruitedProvidersResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const influencerId = request.auth.uid;
    const db = getFirestore();

    try {
      const influencerDoc = await db.collection("influencers").doc(influencerId).get();
      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      const influencer = influencerDoc.data() as Influencer;
      if (influencer.status !== "active") {
        throw new HttpsError("permission-denied", "Influencer account is not active");
      }

      const referralsQuery = await db
        .collection("influencer_referrals")
        .where("influencerId", "==", influencerId)
        .get();

      if (referralsQuery.empty) {
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

      for (const doc of referralsQuery.docs) {
        const referral = doc.data() as InfluencerReferral;
        const isActive = referral.commissionWindowEndsAt.toMillis() > now;

        providers.push({
          recruitId: doc.id,
          providerId: referral.providerId,
          providerName: referral.providerName,
          providerEmail: referral.providerEmail,
          providerType: referral.providerType,
          recruitedAt: referral.recruitedAt.toDate().toISOString(),
          commissionWindowEndsAt: referral.commissionWindowEndsAt.toDate().toISOString(),
          isActive,
          callsWithCommission: referral.callsWithCommission || 0,
          totalCommissions: referral.totalCommissions || 0,
          lastCommissionAt: referral.lastCommissionAt?.toDate().toISOString() || null,
        });
      }

      const summary = {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.isActive).length,
        totalCallsWithCommission: providers.reduce((sum, p) => sum + p.callsWithCommission, 0),
        totalEarned: providers.reduce((sum, p) => sum + p.totalCommissions, 0),
      };

      providers.sort((a, b) => new Date(b.recruitedAt).getTime() - new Date(a.recruitedAt).getTime());

      logger.info("[getInfluencerRecruitedProviders] Fetched", {
        influencerId,
        totalProviders: providers.length,
      });

      return { success: true, providers, summary };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getInfluencerRecruitedProviders] Error", { influencerId, error });
      throw new HttpsError("internal", "Failed to fetch recruited providers");
    }
  }
);
