/**
 * Callable: GroupAdmin Resources
 *
 * Manages access to resources (images, banners, texts) for GroupAdmins.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminResource,
  GroupAdminResourcesResponse,
  GroupAdminResourceCategory,
  SupportedGroupAdminLanguage,
} from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Get all available resources for a GroupAdmin
 */
export const getGroupAdminResources = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<GroupAdminResourcesResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Verify GroupAdmin status
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status === "blocked") {
        throw new HttpsError("permission-denied", "Your account has been blocked");
      }

      // 3. Fetch all active resources
      const resourcesSnapshot = await db
        .collection("group_admin_resources")
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      const resources: GroupAdminResource[] = resourcesSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminResource
      );

      // 4. Calculate category counts
      const categoryCounts: Record<GroupAdminResourceCategory, number> = {
        pinned_posts: 0,
        cover_banners: 0,
        post_images: 0,
        story_images: 0,
        badges: 0,
        welcome_messages: 0,
      };

      for (const resource of resources) {
        categoryCounts[resource.category]++;
      }

      const categories = Object.entries(categoryCounts).map(([category, count]) => ({
        category: category as GroupAdminResourceCategory,
        count,
      }));

      return {
        resources,
        categories,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminResources] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch resources");
    }
  }
);

interface GetResourceContentInput {
  resourceId: string;
  language?: SupportedGroupAdminLanguage;
}

interface ResourceContentResponse {
  resource: GroupAdminResource;
  content: string | null;
  fileUrl: string | null;
}

/**
 * Get a specific resource with content in the requested language
 */
export const getGroupAdminResourceContent = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<ResourceContentResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetResourceContentInput;

    if (!input.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      // 2. Verify GroupAdmin status
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status === "blocked") {
        throw new HttpsError("permission-denied", "Your account has been blocked");
      }

      // 3. Get resource
      const resourceDoc = await db
        .collection("group_admin_resources")
        .doc(input.resourceId)
        .get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const resource = resourceDoc.data() as GroupAdminResource;

      if (!resource.isActive) {
        throw new HttpsError("not-found", "Resource is no longer available");
      }

      // 4. Get content in requested language
      const lang = input.language || groupAdmin.language;
      let content: string | null = null;

      if (resource.type === "text" || resource.type === "template") {
        // Try requested language, then fall back to default
        content = resource.contentTranslations?.[lang] || resource.content || null;
      }

      return {
        resource,
        content,
        fileUrl: resource.fileUrl || null,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminResourceContent] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch resource content");
    }
  }
);

interface TrackResourceUsageInput {
  resourceId: string;
  action: "view" | "download" | "copy";
  language: SupportedGroupAdminLanguage;
}

/**
 * Track resource usage (download/copy)
 */
export const trackGroupAdminResourceUsage = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as TrackResourceUsageInput;

    if (!input.resourceId || !input.action) {
      throw new HttpsError("invalid-argument", "Resource ID and action are required");
    }

    try {
      // 2. Verify GroupAdmin exists
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      // 3. Update resource stats and log usage
      const resourceRef = db.collection("group_admin_resources").doc(input.resourceId);

      await db.runTransaction(async (transaction) => {
        const resourceDoc = await transaction.get(resourceRef);

        if (!resourceDoc.exists) {
          throw new HttpsError("not-found", "Resource not found");
        }

        // Update count based on action
        const updateField = input.action === "download" ? "downloadCount" : "copyCount";
        if (input.action !== "view") {
          transaction.update(resourceRef, {
            [updateField]: FieldValue.increment(1),
          });
        }

        // Log usage
        const logRef = db.collection("group_admin_usage_log").doc();
        transaction.set(logRef, {
          id: logRef.id,
          groupAdminId: userId,
          resourceType: "resource",
          resourceId: input.resourceId,
          action: input.action,
          language: input.language,
          createdAt: Timestamp.now(),
        });
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[trackGroupAdminResourceUsage] Error", { userId, error });
      throw new HttpsError("internal", "Failed to track resource usage");
    }
  }
);

interface ProcessResourceContentInput {
  resourceId: string;
  language: SupportedGroupAdminLanguage;
}

interface ProcessedContentResponse {
  content: string;
  placeholdersReplaced: string[];
}

/**
 * Get resource content with placeholders replaced with actual values
 */
export const getGroupAdminProcessedResourceContent = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<ProcessedContentResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as ProcessResourceContentInput;

    if (!input.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      // 2. Get GroupAdmin profile
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status === "blocked") {
        throw new HttpsError("permission-denied", "Your account has been blocked");
      }

      // 3. Get resource
      const resourceDoc = await db
        .collection("group_admin_resources")
        .doc(input.resourceId)
        .get();

      if (!resourceDoc.exists) {
        throw new HttpsError("not-found", "Resource not found");
      }

      const resource = resourceDoc.data() as GroupAdminResource;

      // 4. Get content in requested language
      const lang = input.language || groupAdmin.language;
      let content = resource.contentTranslations?.[lang] || resource.content || "";

      // 5. Replace placeholders
      const placeholdersReplaced: string[] = [];

      // Build affiliate link
      const affiliateLink = `https://sos-expat.com/r/${groupAdmin.affiliateCodeClient}`;
      const recruitmentLink = `https://sos-expat.com/group-admin/inscription?ref=${groupAdmin.affiliateCodeRecruitment}`;

      const replacements: Record<string, string> = {
        "{{AFFILIATE_LINK}}": affiliateLink,
        "{{RECRUITMENT_LINK}}": recruitmentLink,
        "{{GROUP_NAME}}": groupAdmin.groupName,
        "{{ADMIN_NAME}}": `${groupAdmin.firstName} ${groupAdmin.lastName}`,
        "{{ADMIN_FIRST_NAME}}": groupAdmin.firstName,
        "{{DISCOUNT_AMOUNT}}": "$5",
        "{{DISCOUNT_PERCENT}}": "5%",
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        if (content.includes(placeholder)) {
          content = content.split(placeholder).join(value);
          placeholdersReplaced.push(placeholder);
        }
      }

      return {
        content,
        placeholdersReplaced,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminProcessedResourceContent] Error", { userId, error });
      throw new HttpsError("internal", "Failed to process resource content");
    }
  }
);
