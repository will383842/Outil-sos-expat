/**
 * Blogger Integration Guide Callables (EXCLUSIVE TO BLOGGERS)
 *
 * Handles blogger-exclusive integration guide:
 * - Article templates
 * - Ready-to-copy texts (with [LIEN] placeholder replacement)
 * - Best practices
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  GetBloggerGuideResponse,
  CopyBloggerGuideTextInput,
  CopyBloggerGuideTextResponse,
  TrackBloggerGuideUsageInput,
  Blogger,
  BloggerGuideTemplate,
  BloggerGuideCopyText,
  BloggerGuideBestPractice,
  SupportedBloggerLanguage,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// GET GUIDE
// ============================================================================

export const getBloggerGuide = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerGuideResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Verify blogger status
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access the integration guide");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      // 3. Get user's language
      const userLanguage = blogger.language as SupportedBloggerLanguage;

      // 4. Fetch all guide content
      const [templatesSnapshot, copyTextsSnapshot, bestPracticesSnapshot] = await Promise.all([
        db
          .collection("blogger_guide_templates")
          .where("isActive", "==", true)
          .orderBy("order", "asc")
          .get(),
        db
          .collection("blogger_guide_copy_texts")
          .where("isActive", "==", true)
          .orderBy("order", "asc")
          .get(),
        db
          .collection("blogger_guide_best_practices")
          .where("isActive", "==", true)
          .orderBy("order", "asc")
          .get(),
      ]);

      // 5. Format templates
      const templates = templatesSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerGuideTemplate;
        return {
          id: data.id,
          name: getTranslation(data.name, data.nameTranslations, userLanguage),
          description: data.description
            ? getTranslation(data.description, data.descriptionTranslations, userLanguage)
            : undefined,
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
          targetAudience: data.targetAudience,
          recommendedWordCount: data.recommendedWordCount,
          seoKeywords: data.seoKeywords,
        };
      });

      // 6. Format copy texts
      const copyTexts = copyTextsSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerGuideCopyText;
        const content = getTranslation(data.content, data.contentTranslations, userLanguage);
        return {
          id: data.id,
          name: getTranslation(data.name, data.nameTranslations, userLanguage),
          category: data.category,
          content,
          characterCount: content.length,
        };
      });

      // 7. Format best practices
      const bestPractices = bestPracticesSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerGuideBestPractice;
        return {
          id: data.id,
          title: getTranslation(data.title, data.titleTranslations, userLanguage),
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
          category: data.category,
          icon: data.icon,
        };
      });

      logger.info("[getBloggerGuide] Guide retrieved", {
        bloggerId: uid,
        templatesCount: templates.length,
        copyTextsCount: copyTexts.length,
        bestPracticesCount: bestPractices.length,
      });

      return {
        templates,
        copyTexts,
        bestPractices,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getBloggerGuide] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get integration guide");
    }
  }
);

// ============================================================================
// COPY GUIDE TEXT
// ============================================================================

export const copyBloggerGuideText = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<CopyBloggerGuideTextResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as CopyBloggerGuideTextInput;
    const db = getFirestore();

    // Validate input
    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }
    if (!input?.textType || !["template", "copy_text"].includes(input.textType)) {
      throw new HttpsError("invalid-argument", "Valid text type is required (template or copy_text)");
    }
    if (!input?.affiliateLink) {
      throw new HttpsError("invalid-argument", "Affiliate link is required for [LIEN] replacement");
    }

    try {
      // 2. Verify blogger status
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access the integration guide");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      // 3. Get the text document
      const collectionName = input.textType === "template"
        ? "blogger_guide_templates"
        : "blogger_guide_copy_texts";

      const textDoc = await db.collection(collectionName).doc(input.textId).get();

      if (!textDoc.exists) {
        throw new HttpsError("not-found", "Text not found");
      }

      const textData = textDoc.data() as BloggerGuideTemplate | BloggerGuideCopyText;

      if (!textData.isActive) {
        throw new HttpsError("not-found", "Text is not available");
      }

      // 4. Get content in user's language
      const userLanguage = blogger.language as SupportedBloggerLanguage;
      let content = getTranslation(
        textData.content,
        textData.contentTranslations,
        userLanguage
      );

      // 5. Replace [LIEN] placeholder with actual affiliate link
      // Support various placeholder formats
      const placeholderPatterns = [
        /\[LIEN\]/gi,
        /\[LINK\]/gi,
        /\[VOTRE_LIEN\]/gi,
        /\[YOUR_LINK\]/gi,
        /\{\{LIEN\}\}/gi,
        /\{\{LINK\}\}/gi,
      ];

      for (const pattern of placeholderPatterns) {
        content = content.replace(pattern, input.affiliateLink);
      }

      // 6. Increment usage count and log
      await Promise.all([
        textDoc.ref.update({
          usageCount: FieldValue.increment(1),
        }),
        db.collection("blogger_usage_log").add({
          bloggerId: uid,
          action: "copy",
          resourceType: input.textType,
          resourceId: input.textId,
          resourceName: "name" in textData ? textData.name : (textData as BloggerGuideTemplate).name,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[copyBloggerGuideText] Text copied with link replacement", {
        bloggerId: uid,
        textId: input.textId,
        textType: input.textType,
      });

      return {
        success: true,
        content,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[copyBloggerGuideText] Error", { uid, textId: input.textId, error });
      throw new HttpsError("internal", "Failed to copy text");
    }
  }
);

// ============================================================================
// TRACK GUIDE USAGE
// ============================================================================

export const trackBloggerGuideUsage = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 15,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as TrackBloggerGuideUsageInput;
    const db = getFirestore();

    // Validate input
    if (!input?.resourceType || !["template", "copy_text", "best_practice"].includes(input.resourceType)) {
      throw new HttpsError("invalid-argument", "Valid resource type is required");
    }
    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }
    if (!input?.action || !["view", "copy"].includes(input.action)) {
      throw new HttpsError("invalid-argument", "Valid action is required (view or copy)");
    }

    try {
      // 2. Verify blogger
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can use this feature");
      }

      // 3. Get resource name for better analytics
      let resourceName = "";
      try {
        let collectionName = "";
        switch (input.resourceType) {
          case "template":
            collectionName = "blogger_guide_templates";
            break;
          case "copy_text":
            collectionName = "blogger_guide_copy_texts";
            break;
          case "best_practice":
            collectionName = "blogger_guide_best_practices";
            break;
        }

        if (collectionName) {
          const resourceDoc = await db.collection(collectionName).doc(input.resourceId).get();
          if (resourceDoc.exists) {
            const resourceData = resourceDoc.data();
            resourceName = resourceData?.name || resourceData?.title || "";
          }
        }
      } catch (err) {
        // Non-blocking error - just log without resource name
        logger.warn("[trackBloggerGuideUsage] Could not fetch resource name", {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          error: err,
        });
      }

      // 4. Log usage
      await db.collection("blogger_usage_log").add({
        bloggerId: uid,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName,
        timestamp: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[trackBloggerGuideUsage] Error", { uid, error });
      throw new HttpsError("internal", "Failed to track usage");
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get translated content or fallback to default
 */
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
