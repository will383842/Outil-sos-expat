/**
 * Admin Callables: Resource Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import {
  GroupAdminResource,
  GroupAdminResourceCategory,
  GroupAdminResourceType,
  SupportedGroupAdminLanguage,
} from "../../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify the caller is an admin
 */
async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  // Check custom claims first (faster, no Firestore read)
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin" || tokenRole === "dev") {
    return;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (!userData || !["admin", "dev"].includes(userData.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface CreateResourceInput {
  category: GroupAdminResourceCategory;
  type: GroupAdminResourceType;
  name: string;
  nameTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  description?: string;
  descriptionTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: "JPEG" | "PNG" | "GIF" | "MP4";
  dimensions?: { width: number; height: number };
  content?: string;
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  placeholders?: string[];
  isActive?: boolean;
  order?: number;
}

/**
 * Create a new resource
 */
export const adminCreateResource = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; resourceId: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as CreateResourceInput;

    // Validate required fields
    if (!input.category || !input.type || !input.name) {
      throw new HttpsError("invalid-argument", "Category, type, and name are required");
    }

    const validCategories: GroupAdminResourceCategory[] = [
      "pinned_posts", "cover_banners", "post_images", "story_images", "badges", "welcome_messages"
    ];
    if (!validCategories.includes(input.category)) {
      throw new HttpsError("invalid-argument", "Invalid category");
    }

    const validTypes: GroupAdminResourceType[] = ["image", "text", "template", "video"];
    if (!validTypes.includes(input.type)) {
      throw new HttpsError("invalid-argument", "Invalid type");
    }

    try {
      const resourceRef = db.collection("group_admin_resources").doc();
      const now = Timestamp.now();

      const resource: GroupAdminResource = {
        id: resourceRef.id,
        category: input.category,
        type: input.type,
        name: input.name,
        nameTranslations: input.nameTranslations || {},
        description: input.description,
        descriptionTranslations: input.descriptionTranslations,
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl,
        fileSize: input.fileSize,
        fileFormat: input.fileFormat,
        dimensions: input.dimensions,
        content: input.content,
        contentTranslations: input.contentTranslations,
        placeholders: input.placeholders || [],
        isActive: input.isActive ?? true,
        order: input.order ?? 0,
        downloadCount: 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await resourceRef.set(resource);

      logger.info("[adminCreateResource] Resource created", {
        adminId: request.auth.uid,
        resourceId: resourceRef.id,
        category: input.category,
        type: input.type,
      });

      return {
        success: true,
        resourceId: resourceRef.id,
      };
    } catch (error) {
      logger.error("[adminCreateResource] Error", { error });
      throw new HttpsError("internal", "Failed to create resource");
    }
  }
);

interface UpdateResourceInput {
  resourceId: string;
  name?: string;
  nameTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  description?: string;
  descriptionTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: "JPEG" | "PNG" | "GIF" | "MP4";
  dimensions?: { width: number; height: number };
  content?: string;
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  placeholders?: string[];
  isActive?: boolean;
  order?: number;
}

/**
 * Update an existing resource
 */
export const adminUpdateResource = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as UpdateResourceInput;

    if (!input.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const resourceRef = db.collection("group_admin_resources").doc(input.resourceId);
      const resourceDoc = await resourceRef.get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      // Apply provided updates
      if (input.name !== undefined) updates.name = input.name;
      if (input.nameTranslations !== undefined) updates.nameTranslations = input.nameTranslations;
      if (input.description !== undefined) updates.description = input.description;
      if (input.descriptionTranslations !== undefined) updates.descriptionTranslations = input.descriptionTranslations;
      if (input.fileUrl !== undefined) updates.fileUrl = input.fileUrl;
      if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl;
      if (input.fileSize !== undefined) updates.fileSize = input.fileSize;
      if (input.fileFormat !== undefined) updates.fileFormat = input.fileFormat;
      if (input.dimensions !== undefined) updates.dimensions = input.dimensions;
      if (input.content !== undefined) updates.content = input.content;
      if (input.contentTranslations !== undefined) updates.contentTranslations = input.contentTranslations;
      if (input.placeholders !== undefined) updates.placeholders = input.placeholders;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.order !== undefined) updates.order = input.order;

      await resourceRef.update(updates);

      logger.info("[adminUpdateResource] Resource updated", {
        adminId: request.auth.uid,
        resourceId: input.resourceId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateResource] Error", { error });
      throw new HttpsError("internal", "Failed to update resource");
    }
  }
);

/**
 * Delete a resource (soft delete by setting isActive = false)
 */
export const adminDeleteResource = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const { resourceId, hardDelete } = request.data as { resourceId: string; hardDelete?: boolean };

    if (!resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const resourceRef = db.collection("group_admin_resources").doc(resourceId);
      const resourceDoc = await resourceRef.get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      if (hardDelete) {
        await resourceRef.delete();
      } else {
        await resourceRef.update({
          isActive: false,
          updatedAt: Timestamp.now(),
        });
      }

      logger.info("[adminDeleteResource] Resource deleted", {
        adminId: request.auth.uid,
        resourceId,
        hardDelete: !!hardDelete,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeleteResource] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource");
    }
  }
);

interface GetResourcesListInput {
  category?: GroupAdminResourceCategory | "all";
  type?: GroupAdminResourceType | "all";
  includeInactive?: boolean;
}

/**
 * Get list of resources for admin
 */
export const adminGetResourcesList = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ resources: GroupAdminResource[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as GetResourcesListInput;

    try {
      let query = db.collection("group_admin_resources").orderBy("order", "asc");

      if (input.category && input.category !== "all") {
        query = query.where("category", "==", input.category);
      }

      if (input.type && input.type !== "all") {
        query = query.where("type", "==", input.type);
      }

      if (!input.includeInactive) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.get();

      const resources = snapshot.docs.map((doc) => doc.data() as GroupAdminResource);

      return { resources };
    } catch (error) {
      logger.error("[adminGetResourcesList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch resources list");
    }
  }
);
