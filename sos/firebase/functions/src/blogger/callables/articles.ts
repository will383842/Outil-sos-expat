/**
 * Blogger Articles Callables
 *
 * Handles SEO-ready articles that bloggers can copy and publish:
 * - Full articles with {{AFFILIATE_LINK}} placeholder replacement
 * - Categories: SEO, how-to, comparison, testimonial, news
 * - Copy tracking
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger, SupportedBloggerLanguage } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// TYPES
// ============================================================================

export interface BloggerArticle {
  id: string;
  title: string;
  titleTranslations?: { [key in SupportedBloggerLanguage]?: string };
  content: string;
  contentTranslations?: { [key in SupportedBloggerLanguage]?: string };
  category: "seo" | "how_to" | "comparison" | "testimonial" | "news";
  seoTitle?: string;
  seoKeywords?: string[];
  estimatedWordCount?: number;
  isActive: boolean;
  order: number;
  copyCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ============================================================================
// GET ARTICLES
// ============================================================================

export const getBloggerArticles = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ articles: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    seoTitle?: string;
    seoKeywords?: string[];
    estimatedWordCount?: number;
  }> }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    try {
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access articles");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      const userLanguage = blogger.language as SupportedBloggerLanguage;

      const snapshot = await db
        .collection("blogger_articles")
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      const articles = snapshot.docs.map(doc => {
        const data = doc.data() as BloggerArticle;
        return {
          id: data.id,
          title: getTranslation(data.title, data.titleTranslations, userLanguage),
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
          category: data.category,
          seoTitle: data.seoTitle,
          seoKeywords: data.seoKeywords,
          estimatedWordCount: data.estimatedWordCount,
        };
      });

      logger.info("[getBloggerArticles] Articles retrieved", {
        bloggerId: uid,
        articlesCount: articles.length,
      });

      return { articles };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getBloggerArticles] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get articles");
    }
  }
);

// ============================================================================
// COPY ARTICLE (with affiliate link replacement)
// ============================================================================

export const copyBloggerArticle = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; content: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const { articleId } = request.data as { articleId: string };
    const db = getFirestore();

    if (!articleId) {
      throw new HttpsError("invalid-argument", "Article ID is required");
    }

    try {
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access articles");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      const articleDoc = await db.collection("blogger_articles").doc(articleId).get();

      if (!articleDoc.exists) {
        throw new HttpsError("not-found", "Article not found");
      }

      const article = articleDoc.data() as BloggerArticle;

      if (!article.isActive) {
        throw new HttpsError("not-found", "Article is not available");
      }

      const userLanguage = blogger.language as SupportedBloggerLanguage;
      let content = getTranslation(article.content, article.contentTranslations, userLanguage);

      // Replace {{AFFILIATE_LINK}} with the blogger's actual share URL
      const shareUrl = `https://sos-expat.com/?ref=${blogger.affiliateCodeClient || ""}`;
      content = content.replace(/\{\{AFFILIATE_LINK\}\}/g, shareUrl);

      // Track copy
      await Promise.all([
        articleDoc.ref.update({
          copyCount: FieldValue.increment(1),
        }),
        db.collection("blogger_usage_log").add({
          bloggerId: uid,
          action: "copy",
          resourceType: "article",
          resourceId: articleId,
          resourceName: article.title,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[copyBloggerArticle] Article copied", {
        bloggerId: uid,
        articleId,
        articleTitle: article.title,
      });

      return { success: true, content };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[copyBloggerArticle] Error", { uid, articleId, error });
      throw new HttpsError("internal", "Failed to copy article");
    }
  }
);

// ============================================================================
// ADMIN CRUD
// ============================================================================

async function checkAdmin(uid: string): Promise<void> {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

export const adminGetBloggerArticles = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ articles: unknown[] }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    await checkAdmin(request.auth.uid);

    const db = getFirestore();
    const snapshot = await db.collection("blogger_articles").orderBy("order", "asc").get();

    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
      };
    });

    return { articles };
  }
);

export const adminCreateBloggerArticle = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; articleId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    await checkAdmin(request.auth.uid);

    const input = request.data as Partial<BloggerArticle>;
    const db = getFirestore();

    try {
      const articleRef = db.collection("blogger_articles").doc();
      const now = Timestamp.now();

      const article: BloggerArticle = {
        id: articleRef.id,
        title: input.title || "",
        titleTranslations: input.titleTranslations as BloggerArticle["titleTranslations"],
        content: input.content || "",
        contentTranslations: input.contentTranslations as BloggerArticle["contentTranslations"],
        category: input.category || "seo",
        seoTitle: input.seoTitle,
        seoKeywords: input.seoKeywords,
        estimatedWordCount: input.estimatedWordCount,
        isActive: input.isActive !== false,
        order: input.order || 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await articleRef.set(article);

      return { success: true, articleId: articleRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerArticle] Error", { error });
      throw new HttpsError("internal", "Failed to create article");
    }
  }
);

export const adminUpdateBloggerArticle = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    await checkAdmin(request.auth.uid);

    const input = request.data as { articleId: string; [key: string]: unknown };
    const db = getFirestore();

    if (!input?.articleId) {
      throw new HttpsError("invalid-argument", "Article ID is required");
    }

    try {
      const { articleId, ...updates } = input;
      await db.collection("blogger_articles").doc(articleId).update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateBloggerArticle] Error", { error });
      throw new HttpsError("internal", "Failed to update article");
    }
  }
);

export const adminDeleteBloggerArticle = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    await checkAdmin(request.auth.uid);

    const { articleId } = request.data as { articleId: string };
    const db = getFirestore();

    if (!articleId) {
      throw new HttpsError("invalid-argument", "Article ID is required");
    }

    try {
      await db.collection("blogger_articles").doc(articleId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerArticle] Error", { error });
      throw new HttpsError("internal", "Failed to delete article");
    }
  }
);

// ============================================================================
// HELPER
// ============================================================================

function getTranslation(
  defaultValue: string,
  translations: { [key: string]: string } | undefined,
  language: SupportedBloggerLanguage
): string {
  if (translations && translations[language]) {
    return translations[language];
  }
  return defaultValue;
}
