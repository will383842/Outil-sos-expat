/**
 * Admin CRUD for Influencer Resources
 * Collections: influencer_resources, influencer_resource_texts
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";
import {
  InfluencerResource,
  InfluencerResourceText,
} from "../../types";

// ============================================================================
// HELPER
// ============================================================================

async function checkAdmin(uid: string): Promise<void> {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// ============================================================================
// GET ALL RESOURCES (Admin view - includes inactive)
// ============================================================================

export const adminGetInfluencerResources = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ files: unknown[]; texts: unknown[] }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const db = getFirestore();

    try {
      const [filesSnap, textsSnap] = await Promise.all([
        db.collection("influencer_resources").orderBy("order", "asc").get(),
        db.collection("influencer_resource_texts").orderBy("order", "asc").get(),
      ]);

      const files = filesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      const texts = textsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      return { files, texts };
    } catch (error) {
      logger.error("[adminGetInfluencerResources] Error", { error });
      throw new HttpsError("internal", "Failed to get resources");
    }
  }
);

// ============================================================================
// CREATE RESOURCE (File)
// ============================================================================

export const adminCreateInfluencerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; resourceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as Partial<InfluencerResource>;
    const db = getFirestore();

    try {
      const resourceRef = db.collection("influencer_resources").doc();
      const now = Timestamp.now();

      const resource: InfluencerResource = {
        id: resourceRef.id,
        category: input.category || "sos_expat",
        type: input.type || "image",
        name: input.name || "",
        nameTranslations: input.nameTranslations as InfluencerResource["nameTranslations"],
        description: input.description,
        descriptionTranslations: input.descriptionTranslations as InfluencerResource["descriptionTranslations"],
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl,
        fileSize: input.fileSize,
        fileFormat: input.fileFormat,
        dimensions: input.dimensions,
        isActive: input.isActive !== false,
        order: input.order || 0,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await resourceRef.set(resource);

      logger.info("[adminCreateInfluencerResource] Resource created", {
        resourceId: resourceRef.id,
        adminId: request.auth.uid,
      });

      return { success: true, resourceId: resourceRef.id };
    } catch (error) {
      logger.error("[adminCreateInfluencerResource] Error", { error });
      throw new HttpsError("internal", "Failed to create resource");
    }
  }
);

// ============================================================================
// UPDATE RESOURCE (File)
// ============================================================================

export const adminUpdateInfluencerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as { resourceId: string; [key: string]: unknown };
    const db = getFirestore();

    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const { resourceId, ...updates } = input;
      await db.collection("influencer_resources").doc(resourceId).update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateInfluencerResource] Error", { error });
      throw new HttpsError("internal", "Failed to update resource");
    }
  }
);

// ============================================================================
// DELETE RESOURCE (File)
// ============================================================================

export const adminDeleteInfluencerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resourceId } = request.data as { resourceId: string };
    const db = getFirestore();

    if (!resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      await db.collection("influencer_resources").doc(resourceId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteInfluencerResource] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource");
    }
  }
);

// ============================================================================
// CREATE RESOURCE TEXT
// ============================================================================

export const adminCreateInfluencerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; textId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as Partial<InfluencerResourceText>;
    const db = getFirestore();

    try {
      const textRef = db.collection("influencer_resource_texts").doc();
      const now = Timestamp.now();

      const text: InfluencerResourceText = {
        id: textRef.id,
        category: input.category || "sos_expat",
        type: input.type || "text",
        title: input.title || "",
        titleTranslations: input.titleTranslations as InfluencerResourceText["titleTranslations"],
        content: input.content || "",
        contentTranslations: input.contentTranslations as InfluencerResourceText["contentTranslations"],
        isActive: input.isActive !== false,
        order: input.order || 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await textRef.set(text);

      return { success: true, textId: textRef.id };
    } catch (error) {
      logger.error("[adminCreateInfluencerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to create resource text");
    }
  }
);

// ============================================================================
// UPDATE RESOURCE TEXT
// ============================================================================

export const adminUpdateInfluencerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as { textId: string; [key: string]: unknown };
    const db = getFirestore();

    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      const { textId, ...updates } = input;
      await db.collection("influencer_resource_texts").doc(textId).update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateInfluencerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to update resource text");
    }
  }
);

// ============================================================================
// DELETE RESOURCE TEXT
// ============================================================================

export const adminDeleteInfluencerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { textId } = request.data as { textId: string };
    const db = getFirestore();

    if (!textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      await db.collection("influencer_resource_texts").doc(textId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteInfluencerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource text");
    }
  }
);
