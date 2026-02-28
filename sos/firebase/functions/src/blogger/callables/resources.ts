/**
 * Blogger Resources Callables (EXCLUSIVE TO BLOGGERS)
 *
 * Handles blogger-exclusive resources:
 * - SOS-Expat resources (logos, images, texts)
 * - Ulixai AI resources
 * - Founder's resources (photos, bio, quotes)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  GetBloggerResourcesInput,
  GetBloggerResourcesResponse,
  DownloadBloggerResourceInput,
  DownloadBloggerResourceResponse,
  CopyBloggerResourceTextInput,
  CopyBloggerResourceTextResponse,
  Blogger,
  BloggerResource,
  BloggerResourceText,
  SupportedBloggerLanguage,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// GET RESOURCES
// ============================================================================

export const getBloggerResources = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetBloggerResourcesResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as GetBloggerResourcesInput;
    const db = getFirestore();

    try {
      // 2. Verify blogger status
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access resources");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      // 3. Get user's language for translations
      const userLanguage = blogger.language as SupportedBloggerLanguage;

      // 4. Build queries
      let resourcesQuery = db
        .collection("blogger_resources")
        .where("isActive", "==", true)
        .orderBy("order", "asc");

      let textsQuery = db
        .collection("blogger_resource_texts")
        .where("isActive", "==", true)
        .orderBy("order", "asc");

      // Filter by category if specified
      if (input?.category) {
        resourcesQuery = resourcesQuery.where("category", "==", input.category);
        textsQuery = textsQuery.where("category", "==", input.category);
      }

      // 5. Execute queries
      const [resourcesSnapshot, textsSnapshot] = await Promise.all([
        resourcesQuery.get(),
        textsQuery.get(),
      ]);

      // 6. Format resources
      const resources = resourcesSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerResource;
        return {
          id: data.id,
          category: data.category,
          type: data.type,
          name: getTranslation(data.name, data.nameTranslations, userLanguage),
          description: data.description
            ? getTranslation(data.description, data.descriptionTranslations, userLanguage)
            : undefined,
          fileUrl: data.fileUrl,
          thumbnailUrl: data.thumbnailUrl,
          fileSize: data.fileSize,
          fileFormat: data.fileFormat,
          dimensions: data.dimensions,
        };
      });

      // 7. Format texts
      const texts = textsSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerResourceText;
        return {
          id: data.id,
          category: data.category,
          type: data.type,
          title: getTranslation(data.title, data.titleTranslations, userLanguage),
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
        };
      });

      logger.info("[getBloggerResources] Resources retrieved", {
        bloggerId: uid,
        category: input?.category || "all",
        resourcesCount: resources.length,
        textsCount: texts.length,
      });

      return {
        resources,
        texts,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getBloggerResources] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get resources");
    }
  }
);

// ============================================================================
// DOWNLOAD RESOURCE
// ============================================================================

export const downloadBloggerResource = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<DownloadBloggerResourceResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as DownloadBloggerResourceInput;
    const db = getFirestore();

    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      // 2. Verify blogger status
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can download resources");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      // 3. Get resource
      const resourceDoc = await db
        .collection("blogger_resources")
        .doc(input.resourceId)
        .get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const resource = resourceDoc.data() as BloggerResource;

      if (!resource.isActive) {
        throw new HttpsError("not-found", "Resource is not available");
      }

      if (!resource.fileUrl) {
        throw new HttpsError("failed-precondition", "Resource has no downloadable file");
      }

      // 4. Increment download count and log usage
      await Promise.all([
        resourceDoc.ref.update({
          downloadCount: FieldValue.increment(1),
        }),
        db.collection("blogger_usage_log").add({
          bloggerId: uid,
          action: "download",
          resourceType: "resource",
          resourceId: input.resourceId,
          resourceName: resource.name,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[downloadBloggerResource] Resource downloaded", {
        bloggerId: uid,
        resourceId: input.resourceId,
        resourceName: resource.name,
      });

      return {
        success: true,
        downloadUrl: resource.fileUrl,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[downloadBloggerResource] Error", { uid, resourceId: input.resourceId, error });
      throw new HttpsError("internal", "Failed to download resource");
    }
  }
);

// ============================================================================
// COPY RESOURCE TEXT
// ============================================================================

export const copyBloggerResourceText = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<CopyBloggerResourceTextResponse> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as CopyBloggerResourceTextInput;
    const db = getFirestore();

    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      // 2. Verify blogger status
      const bloggerDoc = await db.collection("bloggers").doc(uid).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("permission-denied", "Only bloggers can access resources");
      }

      const blogger = bloggerDoc.data() as Blogger;

      if (blogger.status !== "active") {
        throw new HttpsError("permission-denied", "Your blogger account is not active");
      }

      // 3. Get text resource
      const textDoc = await db
        .collection("blogger_resource_texts")
        .doc(input.textId)
        .get();

      if (!textDoc.exists) {
        throw new HttpsError("not-found", "Text resource not found");
      }

      const textResource = textDoc.data() as BloggerResourceText;

      if (!textResource.isActive) {
        throw new HttpsError("not-found", "Text resource is not available");
      }

      // 4. Get content in user's language
      const userLanguage = blogger.language as SupportedBloggerLanguage;
      const content = getTranslation(textResource.content, textResource.contentTranslations, userLanguage);

      // 5. Increment copy count and log usage
      await Promise.all([
        textDoc.ref.update({
          copyCount: FieldValue.increment(1),
        }),
        db.collection("blogger_usage_log").add({
          bloggerId: uid,
          action: "copy",
          resourceType: "resource_text",
          resourceId: input.textId,
          resourceName: textResource.title,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[copyBloggerResourceText] Text copied", {
        bloggerId: uid,
        textId: input.textId,
        textTitle: textResource.title,
      });

      return {
        success: true,
        content,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[copyBloggerResourceText] Error", { uid, textId: input.textId, error });
      throw new HttpsError("internal", "Failed to copy text");
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
