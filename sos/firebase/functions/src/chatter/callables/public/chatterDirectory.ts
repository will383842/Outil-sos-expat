/**
 * Public Chatter Directory Callable
 *
 * Returns list of visible chatters for the public directory page.
 * No authentication required.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";
import { Chatter, ChatterConfig } from "../../types";

interface GetChatterDirectoryInput {
  country?: string;
  language?: string;
  platform?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface ChatterDirectoryItem {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  platforms: string[];
  bio?: string;
}

interface GetChatterDirectoryResponse {
  chatters: ChatterDirectoryItem[];
  total: number;
  isPageVisible: boolean;
}

export const getChatterDirectory = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetChatterDirectoryResponse> => {
    const db = getFirestore();

    try {
      // Check if page is visible
      const configDoc = await db.collection("chatter_config").doc("current").get();
      const config = configDoc.data() as ChatterConfig | undefined;

      if (!config?.isChatterListingPageVisible) {
        return {
          chatters: [],
          total: 0,
          isPageVisible: false,
        };
      }

      const input = request.data as GetChatterDirectoryInput | null;
      let query: FirebaseFirestore.Query = db.collection("chatters")
        .where("isVisible", "==", true)
        .where("status", "==", "active");

      if (input?.country) {
        query = query.where("country", "==", input.country);
      }
      if (input?.language) {
        query = query.where("language", "==", input.language);
      }
      if (input?.platform) {
        query = query.where("platforms", "array-contains", input.platform);
      }

      const limit = Math.min(input?.limit || 50, 100);
      query = query.limit(limit);

      const snapshot = await query.get();

      let chatters: ChatterDirectoryItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as Chatter;
        return {
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          photoUrl: data.photoUrl,
          country: data.country,
          language: data.language,
          platforms: data.platforms ?? [],
          bio: data.bio,
        };
      });

      // Client-side search filter
      if (input?.search) {
        const search = input.search.toLowerCase();
        chatters = chatters.filter(c =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.bio?.toLowerCase().includes(search)
        );
      }

      logger.info("[getChatterDirectory] Directory fetched", {
        count: chatters.length,
        country: input?.country,
        platform: input?.platform,
      });

      return {
        chatters,
        total: chatters.length,
        isPageVisible: true,
      };
    } catch (error) {
      logger.error("[getChatterDirectory] Error", { error });
      throw new HttpsError("internal", "Failed to get chatter directory");
    }
  }
);
