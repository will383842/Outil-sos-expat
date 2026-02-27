/**
 * Influencer Resources Callables
 *
 * Handles influencer resources:
 * - SOS-Expat resources (logos, images, texts)
 * - Ulixai AI resources
 * - Founder's resources (photos, bio, quotes)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  GetInfluencerResourcesInput,
  GetInfluencerResourcesResponse,
  DownloadInfluencerResourceInput,
  DownloadInfluencerResourceResponse,
  CopyInfluencerResourceTextInput,
  CopyInfluencerResourceTextResponse,
  Influencer,
  InfluencerResource,
  InfluencerResourceText,
  SupportedInfluencerLanguage,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// GET RESOURCES
// ============================================================================

export const getInfluencerResources = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerResourcesResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as GetInfluencerResourcesInput;
    const db = getFirestore();

    try {
      const influencerDoc = await db.collection("influencers").doc(uid).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("permission-denied", "Only influencers can access resources");
      }

      const influencer = influencerDoc.data() as Influencer;

      if (influencer.status !== "active") {
        throw new HttpsError("permission-denied", "Your influencer account is not active");
      }

      const userLanguage = influencer.language as SupportedInfluencerLanguage;

      let resourcesQuery = db
        .collection("influencer_resources")
        .where("isActive", "==", true)
        .orderBy("order", "asc");

      let textsQuery = db
        .collection("influencer_resource_texts")
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
        const data = doc.data() as InfluencerResource;
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

      const texts = textsSnapshot.docs.map(doc => {
        const data = doc.data() as InfluencerResourceText;
        return {
          id: data.id,
          category: data.category,
          type: data.type,
          title: getTranslation(data.title, data.titleTranslations, userLanguage),
          content: getTranslation(data.content, data.contentTranslations, userLanguage),
        };
      });

      logger.info("[getInfluencerResources] Resources retrieved", {
        influencerId: uid,
        category: input?.category || "all",
        resourcesCount: resources.length,
        textsCount: texts.length,
      });

      return { resources, texts };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getInfluencerResources] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get resources");
    }
  }
);

// ============================================================================
// DOWNLOAD RESOURCE
// ============================================================================

export const downloadInfluencerResource = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<DownloadInfluencerResourceResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as DownloadInfluencerResourceInput;
    const db = getFirestore();

    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const influencerDoc = await db.collection("influencers").doc(uid).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("permission-denied", "Only influencers can download resources");
      }

      const influencer = influencerDoc.data() as Influencer;

      if (influencer.status !== "active") {
        throw new HttpsError("permission-denied", "Your influencer account is not active");
      }

      const resourceDoc = await db
        .collection("influencer_resources")
        .doc(input.resourceId)
        .get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const resource = resourceDoc.data() as InfluencerResource;

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
        db.collection("influencer_usage_log").add({
          influencerId: uid,
          action: "download",
          resourceType: "resource",
          resourceId: input.resourceId,
          resourceName: resource.name,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[downloadInfluencerResource] Resource downloaded", {
        influencerId: uid,
        resourceId: input.resourceId,
        resourceName: resource.name,
      });

      return { success: true, downloadUrl: resource.fileUrl };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[downloadInfluencerResource] Error", { uid, resourceId: input.resourceId, error });
      throw new HttpsError("internal", "Failed to download resource");
    }
  }
);

// ============================================================================
// COPY RESOURCE TEXT
// ============================================================================

export const copyInfluencerResourceText = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<CopyInfluencerResourceTextResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as CopyInfluencerResourceTextInput;
    const db = getFirestore();

    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      const influencerDoc = await db.collection("influencers").doc(uid).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("permission-denied", "Only influencers can access resources");
      }

      const influencer = influencerDoc.data() as Influencer;

      if (influencer.status !== "active") {
        throw new HttpsError("permission-denied", "Your influencer account is not active");
      }

      const textDoc = await db
        .collection("influencer_resource_texts")
        .doc(input.textId)
        .get();

      if (!textDoc.exists) {
        throw new HttpsError("not-found", "Text resource not found");
      }

      const textResource = textDoc.data() as InfluencerResourceText;

      if (!textResource.isActive) {
        throw new HttpsError("not-found", "Text resource is not available");
      }

      const userLanguage = influencer.language as SupportedInfluencerLanguage;
      const content = getTranslation(textResource.content, textResource.contentTranslations, userLanguage);

      await Promise.all([
        textDoc.ref.update({
          copyCount: FieldValue.increment(1),
        }),
        db.collection("influencer_usage_log").add({
          influencerId: uid,
          action: "copy",
          resourceType: "resource_text",
          resourceId: input.textId,
          resourceName: textResource.title,
          timestamp: Timestamp.now(),
        }),
      ]);

      logger.info("[copyInfluencerResourceText] Text copied", {
        influencerId: uid,
        textId: input.textId,
        textTitle: textResource.title,
      });

      return { success: true, content };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[copyInfluencerResourceText] Error", { uid, textId: input.textId, error });
      throw new HttpsError("internal", "Failed to copy text");
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTranslation(
  defaultValue: string,
  translations: { [key: string]: string } | undefined,
  language: SupportedInfluencerLanguage
): string {
  if (translations && translations[language]) {
    return translations[language];
  }
  return defaultValue;
}
