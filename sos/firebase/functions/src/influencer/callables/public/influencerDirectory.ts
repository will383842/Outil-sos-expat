/**
 * Public Callable: Influencer Directory
 *
 * Returns the public list of visible Influencers.
 * No authentication required.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { Influencer, InfluencerConfig } from "../../types";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetInfluencerDirectoryInput {
  country?: string;
  language?: string;
  platform?: string;
  page?: number;
  limit?: number;
}

export interface PublicInfluencer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  platforms: string[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
}

interface GetInfluencerDirectoryResponse {
  influencers: PublicInfluencer[];
  total: number;
  isPageVisible: boolean;
}

/**
 * getInfluencerDirectory
 *
 * Public callable — no auth required.
 * Returns visible, active Influencers from the directory.
 * Respects the `isInfluencerListingPageVisible` flag from influencer_config/current.
 */
export const getInfluencerDirectory = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerDirectoryResponse> => {
    ensureInitialized();

    const db = getFirestore();
    const input = (request.data || {}) as GetInfluencerDirectoryInput;
    const limit = Math.min(input.limit || 20, 100);
    const page = Math.max(input.page || 1, 1);
    const offset = (page - 1) * limit;

    try {
      // 1. Check if the listing page is globally enabled
      const configDoc = await db.collection("influencer_config").doc("current").get();
      let isPageVisible = true;

      if (configDoc.exists) {
        const config = configDoc.data() as InfluencerConfig;
        if (config.isInfluencerListingPageVisible === false) {
          isPageVisible = false;
        }
      }

      if (!isPageVisible) {
        return {
          influencers: [],
          total: 0,
          isPageVisible: false,
        };
      }

      // 2. Query visible + active influencers
      const query = db
        .collection("influencers")
        .where("isVisible", "==", true)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      // 3. Map to public shape
      let allInfluencers: PublicInfluencer[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Influencer;
        const inf: PublicInfluencer = {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          language: data.language,
          platforms: data.platforms ?? [],
        };
        if (data.photoUrl) inf.photoUrl = data.photoUrl;
        if (data.bio) inf.bio = data.bio;
        if (data.communitySize) inf.communitySize = data.communitySize;
        if (data.communityNiche) inf.communityNiche = data.communityNiche;
        return inf;
      });

      // 4. Client-side filters
      if (input.country) {
        allInfluencers = allInfluencers.filter((inf) => inf.country === input.country);
      }
      if (input.language) {
        allInfluencers = allInfluencers.filter((inf) => inf.language === input.language);
      }
      if (input.platform) {
        allInfluencers = allInfluencers.filter((inf) =>
          inf.platforms.includes(input.platform as string)
        );
      }

      const total = allInfluencers.length;

      // 5. Pagination
      const paginated = allInfluencers.slice(offset, offset + limit);

      return {
        influencers: paginated,
        total,
        isPageVisible: true,
      };
    } catch (error) {
      logger.error("[getInfluencerDirectory] Error", { error });
      throw new HttpsError("internal", "Failed to fetch Influencer directory");
    }
  }
);
