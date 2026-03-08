/**
 * Chatter Resources Callables
 *
 * Handles chatter resources:
 * - SOS-Expat resources (logos, images, texts)
 * - Ulixai AI resources
 * - Founder's resources (photos, bio, quotes)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterResourceCategory,
  ChatterResource,
  ChatterResourceText,
  SupportedChatterLanguage,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// GET RESOURCES
// ============================================================================

interface GetChatterResourcesInput {
  category?: ChatterResourceCategory;
}

interface GetChatterResourcesResponse {
  resources: object[];
  texts: object[];
}

export const getChatterResources = onCall(
  {
    region: "us-central1",
    memory: "512MiB",  // FIX: 256MiB caused OOM at startup
    cpu: 0.5,  // FIX: memory > 256MiB requires cpu >= 0.5
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetChatterResourcesResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as GetChatterResourcesInput;
    const db = getFirestore();

    try {
      const chatterDoc = await db.collection("chatters").doc(uid).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("permission-denied", "Only chatters can access resources");
      }

      const chatter = chatterDoc.data() as Chatter;

      if (chatter.status !== "active") {
        throw new HttpsError("permission-denied", "Your chatter account is not active");
      }

      const userLanguage = chatter.language as SupportedChatterLanguage;

      let resourcesQuery = db
        .collection("chatter_resources")
        .where("isActive", "==", true)
        .orderBy("order", "asc");

      let textsQuery = db
        .collection("chatter_resource_texts")
        .where("isActive", "==", true)
        .orderBy("order", "asc");

      if (input?.category) {
        resourcesQuery = resourcesQuery.where("category", "==", input.category);
        textsQuery = textsQuery.where("category", "==", input.category);
      }

      const [resourcesSnapshot, textsSnapshot] = await Promise.all([
        resourcesQuery.get(),
        textsQuery.get(),
      ]);

      const resources = resourcesSnapshot.docs.map(doc => {
        const data = doc.data() as ChatterResource;
        return {
          id: data.id,
          category: data.category,
          type: data.type,
          name: getTranslation(data.name, data.nameTranslations, userLanguage),
          description: data.description
            ? getTranslation(data.description, data.descriptionTranslations, userLanguage)
            : undefined,
          fileUrl: data.fileUrl,
          previewUrl: data.thumbnailUrl,
          format: data.fileFormat,
          size: data.fileSize,
          sizeFormatted: formatFileSize(data.fileSize),
          dimensions: data.dimensions,
        };
      });

      const texts = textsSnapshot.docs.map(doc => {
        const data = doc.data() as ChatterResourceText;
        return {
          id: data.id,
          category: data.category,
          type: data.type,
          title: getTranslation(data.title, data.titleTranslations, userLanguage),
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
        };
      });

      logger.info("[getChatterResources] Resources retrieved", {
        chatterId: uid,
        category: input?.category || "all",
        resourcesCount: resources.length,
        textsCount: texts.length,
      });

      return { resources, texts };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getChatterResources] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get resources");
    }
  }
);

// ============================================================================
// DOWNLOAD RESOURCE
// ============================================================================

export const downloadChatterResource = onCall(
  {
    region: "us-central1",
    memory: "512MiB",  // FIX: 256MiB caused OOM at startup
    cpu: 0.5,  // FIX: memory > 256MiB requires cpu >= 0.5
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; downloadUrl: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as { resourceId: string };
    const db = getFirestore();

    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const chatterDoc = await db.collection("chatters").doc(uid).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("permission-denied", "Only chatters can download resources");
      }

      const chatter = chatterDoc.data() as Chatter;

      if (chatter.status !== "active") {
        throw new HttpsError("permission-denied", "Your chatter account is not active");
      }

      const resourceDoc = await db
        .collection("chatter_resources")
        .doc(input.resourceId)
        .get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const resource = resourceDoc.data() as ChatterResource;

      if (!resource.isActive) {
        throw new HttpsError("not-found", "Resource is not available");
      }

      if (!resource.fileUrl) {
        throw new HttpsError("failed-precondition", "Resource has no downloadable file");
      }

      await Promise.all([
        resourceDoc.ref.update({
          downloadCount: FieldValue.increment(1),
        }),
        db.collection("chatter_usage_log").add({
          chatterId: uid,
          action: "download",
          resourceType: "resource",
          resourceId: input.resourceId,
          resourceName: resource.name,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[downloadChatterResource] Resource downloaded", {
        chatterId: uid,
        resourceId: input.resourceId,
        resourceName: resource.name,
      });

      return { success: true, downloadUrl: resource.fileUrl };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[downloadChatterResource] Error", { uid, resourceId: input.resourceId, error });
      throw new HttpsError("internal", "Failed to download resource");
    }
  }
);

// ============================================================================
// COPY RESOURCE TEXT
// ============================================================================

export const copyChatterResourceText = onCall(
  {
    region: "us-central1",
    memory: "512MiB",  // FIX: 256MiB caused OOM at startup
    cpu: 0.5,  // FIX: memory > 256MiB requires cpu >= 0.5
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; content: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as { textId: string };
    const db = getFirestore();

    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      const chatterDoc = await db.collection("chatters").doc(uid).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("permission-denied", "Only chatters can access resources");
      }

      const chatter = chatterDoc.data() as Chatter;

      if (chatter.status !== "active") {
        throw new HttpsError("permission-denied", "Your chatter account is not active");
      }

      const textDoc = await db
        .collection("chatter_resource_texts")
        .doc(input.textId)
        .get();

      if (!textDoc.exists) {
        throw new HttpsError("not-found", "Text resource not found");
      }

      const textResource = textDoc.data() as ChatterResourceText;

      if (!textResource.isActive) {
        throw new HttpsError("not-found", "Text resource is not available");
      }

      const userLanguage = chatter.language as SupportedChatterLanguage;
      const content = getTranslation(textResource.content, textResource.contentTranslations, userLanguage);

      await Promise.all([
        textDoc.ref.update({
          copyCount: FieldValue.increment(1),
        }),
        db.collection("chatter_usage_log").add({
          chatterId: uid,
          action: "copy",
          resourceType: "resource_text",
          resourceId: input.textId,
          resourceName: textResource.title,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[copyChatterResourceText] Text copied", {
        chatterId: uid,
        textId: input.textId,
        textTitle: textResource.title,
      });

      return { success: true, content };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[copyChatterResourceText] Error", { uid, textId: input.textId, error });
      throw new HttpsError("internal", "Failed to copy text");
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFileSize(bytes?: number): string | undefined {
  if (!bytes) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getTranslation(
  defaultValue: string,
  translations: { [key: string]: string } | undefined,
  language: SupportedChatterLanguage
): string {
  if (translations && translations[language]) {
    return translations[language];
  }
  return defaultValue;
}
