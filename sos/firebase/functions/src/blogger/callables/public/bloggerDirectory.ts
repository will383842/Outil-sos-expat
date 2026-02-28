/**
 * Public Blogger Directory Callable
 *
 * Returns list of visible bloggers for the public directory page.
 * No authentication required.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";
import { Blogger, BloggerConfig, BlogTheme, BlogTrafficTier } from "../../types";

interface GetBloggerDirectoryInput {
  country?: string;
  language?: string;
  blogTheme?: BlogTheme;
  blogTraffic?: BlogTrafficTier;
  search?: string;
  limit?: number;
  offset?: number;
}

interface BloggerDirectoryItem {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  blogName: string;
  blogUrl: string;
  blogTheme: BlogTheme;
  blogTraffic: BlogTrafficTier;
  blogLanguage: string;
  blogCountry: string;
  bio?: string;
  blogDescription?: string;
}

interface GetBloggerDirectoryResponse {
  bloggers: BloggerDirectoryItem[];
  total: number;
  isPageVisible: boolean;
}

export const getBloggerDirectory = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerDirectoryResponse> => {
    const db = getFirestore();

    try {
      // Check if page is visible
      const configDoc = await db.collection("blogger_config").doc("current").get();
      const config = configDoc.data() as BloggerConfig | undefined;

      if (!config?.isBloggerListingPageVisible) {
        return {
          bloggers: [],
          total: 0,
          isPageVisible: false,
        };
      }

      const input = request.data as GetBloggerDirectoryInput | null;
      let query: FirebaseFirestore.Query = db.collection("bloggers")
        .where("isVisible", "==", true)
        .where("status", "==", "active");

      if (input?.country) {
        query = query.where("country", "==", input.country);
      }
      if (input?.language) {
        query = query.where("language", "==", input.language);
      }
      if (input?.blogTheme) {
        query = query.where("blogTheme", "==", input.blogTheme);
      }
      if (input?.blogTraffic) {
        query = query.where("blogTraffic", "==", input.blogTraffic);
      }

      const limit = Math.min(input?.limit || 50, 100);
      query = query.limit(limit);

      const snapshot = await query.get();

      let bloggers: BloggerDirectoryItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as Blogger;
        return {
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          photoUrl: data.photoUrl,
          country: data.country,
          language: data.language,
          blogName: data.blogName,
          blogUrl: data.blogUrl,
          blogTheme: data.blogTheme,
          blogTraffic: data.blogTraffic,
          blogLanguage: data.blogLanguage,
          blogCountry: data.blogCountry,
          bio: data.bio,
          blogDescription: data.blogDescription,
        };
      });

      // Client-side search filter
      if (input?.search) {
        const search = input.search.toLowerCase();
        bloggers = bloggers.filter(b =>
          b.firstName.toLowerCase().includes(search) ||
          b.lastName.toLowerCase().includes(search) ||
          b.blogName.toLowerCase().includes(search) ||
          b.blogDescription?.toLowerCase().includes(search) ||
          b.bio?.toLowerCase().includes(search)
        );
      }

      logger.info("[getBloggerDirectory] Directory fetched", {
        count: bloggers.length,
        country: input?.country,
        blogTheme: input?.blogTheme,
      });

      return {
        bloggers,
        total: bloggers.length,
        isPageVisible: true,
      };
    } catch (error) {
      logger.error("[getBloggerDirectory] Error", { error });
      throw new HttpsError("internal", "Failed to get blogger directory");
    }
  }
);
