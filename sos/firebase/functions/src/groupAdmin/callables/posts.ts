/**
 * Callable: GroupAdmin Posts
 *
 * Manages access to ready-to-use Facebook posts for GroupAdmins.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminPost,
  GroupAdminPostsResponse,
  GroupAdminPostCategory,
  SupportedGroupAdminLanguage,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Get all available posts for a GroupAdmin
 */
export const getGroupAdminPosts = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GroupAdminPostsResponse> => {
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

      if (groupAdmin.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 3. Fetch all active posts
      const postsSnapshot = await db
        .collection("group_admin_posts")
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      const posts: GroupAdminPost[] = postsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminPost
      );

      // 4. Calculate category counts
      const categoryCounts: Record<GroupAdminPostCategory, number> = {
        announcement: 0,
        reminder: 0,
        testimonial: 0,
        qa: 0,
        emergency: 0,
        seasonal: 0,
      };

      for (const post of posts) {
        categoryCounts[post.category]++;
      }

      const categories = Object.entries(categoryCounts).map(([category, count]) => ({
        category: category as GroupAdminPostCategory,
        count,
      }));

      return {
        posts,
        categories,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminPosts] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch posts");
    }
  }
);

interface GetPostContentInput {
  postId: string;
  language?: SupportedGroupAdminLanguage;
}

interface PostContentResponse {
  post: GroupAdminPost;
  content: string;
  imageUrl: string | null;
}

/**
 * Get a specific post with content in the requested language
 */
export const getGroupAdminPostContent = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<PostContentResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetPostContentInput;

    if (!input.postId) {
      throw new HttpsError("invalid-argument", "Post ID is required");
    }

    try {
      // 2. Verify GroupAdmin status
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 3. Get post
      const postDoc = await db.collection("group_admin_posts").doc(input.postId).get();

      if (!postDoc.exists) {
        throw new HttpsError("not-found", "Post not found");
      }

      const post = postDoc.data() as GroupAdminPost;

      if (!post.isActive) {
        throw new HttpsError("not-found", "Post is no longer available");
      }

      // 4. Get content in requested language
      const lang = input.language || groupAdmin.language;
      const content = post.contentTranslations?.[lang] || post.content || "";

      // 5. Get associated image URL if any
      let imageUrl: string | null = null;
      if (post.imageResourceId) {
        const imageDoc = await db
          .collection("group_admin_resources")
          .doc(post.imageResourceId)
          .get();

        if (imageDoc.exists) {
          const imageData = imageDoc.data();
          imageUrl = imageData?.fileUrl || null;
        }
      }

      return {
        post,
        content,
        imageUrl,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminPostContent] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch post content");
    }
  }
);

interface GetProcessedPostInput {
  postId: string;
  language: SupportedGroupAdminLanguage;
}

interface ProcessedPostResponse {
  content: string;
  imageUrl: string | null;
  placeholdersReplaced: string[];
  recommendations: {
    pinDuration: string | null;
    bestTimeToPost: string | null;
  };
}

/**
 * Get a post with placeholders replaced and ready to copy
 */
export const getGroupAdminProcessedPost = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<ProcessedPostResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetProcessedPostInput;

    if (!input.postId) {
      throw new HttpsError("invalid-argument", "Post ID is required");
    }

    try {
      // 2. Get GroupAdmin profile
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const groupAdmin = groupAdminDoc.data() as GroupAdmin;

      if (groupAdmin.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 3. Get post
      const postDoc = await db.collection("group_admin_posts").doc(input.postId).get();

      if (!postDoc.exists) {
        throw new HttpsError("not-found", "Post not found");
      }

      const post = postDoc.data() as GroupAdminPost;

      if (!post.isActive) {
        throw new HttpsError("not-found", "Post is no longer available");
      }

      // 4. Get content in requested language
      const lang = input.language || groupAdmin.language;
      let content = post.contentTranslations?.[lang] || post.content || "";

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

      // 6. Get associated image URL if any
      let imageUrl: string | null = null;
      if (post.imageResourceId) {
        const imageDoc = await db
          .collection("group_admin_resources")
          .doc(post.imageResourceId)
          .get();

        if (imageDoc.exists) {
          const imageData = imageDoc.data();
          imageUrl = imageData?.fileUrl || null;
        }
      }

      // 7. Update usage count and log
      await db.runTransaction(async (transaction) => {
        transaction.update(postDoc.ref, {
          usageCount: FieldValue.increment(1),
        });

        const logRef = db.collection("group_admin_usage_log").doc();
        transaction.set(logRef, {
          id: logRef.id,
          groupAdminId: userId,
          resourceType: "post",
          resourceId: input.postId,
          action: "copy",
          language: lang,
          createdAt: Timestamp.now(),
        });
      });

      // 8. Build recommendations based on post settings
      const pinDurationLabels: Record<string, string> = {
        "1_week": "1 week",
        "2_weeks": "2 weeks",
        "1_month": "1 month",
        permanent: "Permanent",
      };

      const bestTimeLabels: Record<string, string> = {
        monday_morning: "Monday morning (9-11 AM)",
        weekend: "Weekend (Saturday or Sunday)",
        evening: "Evening (6-8 PM)",
        any: "Any time",
      };

      return {
        content,
        imageUrl,
        placeholdersReplaced,
        recommendations: {
          pinDuration: post.recommendedPinDuration
            ? pinDurationLabels[post.recommendedPinDuration] || null
            : null,
          bestTimeToPost: post.bestTimeToPost
            ? bestTimeLabels[post.bestTimeToPost] || null
            : null,
        },
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getGroupAdminProcessedPost] Error", { userId, error });
      throw new HttpsError("internal", "Failed to process post");
    }
  }
);

interface TrackPostUsageInput {
  postId: string;
  action: "view" | "copy";
  language: SupportedGroupAdminLanguage;
}

/**
 * Track post usage (view/copy)
 */
export const trackGroupAdminPostUsage = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as TrackPostUsageInput;

    if (!input.postId || !input.action) {
      throw new HttpsError("invalid-argument", "Post ID and action are required");
    }

    try {
      // 2. Verify GroupAdmin exists
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      // 3. Update post stats and log usage
      const postRef = db.collection("group_admin_posts").doc(input.postId);

      await db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);

        if (!postDoc.exists) {
          throw new HttpsError("not-found", "Post not found");
        }

        // Update usage count for copy action
        if (input.action === "copy") {
          transaction.update(postRef, {
            usageCount: FieldValue.increment(1),
          });
        }

        // Log usage
        const logRef = db.collection("group_admin_usage_log").doc();
        transaction.set(logRef, {
          id: logRef.id,
          groupAdminId: userId,
          resourceType: "post",
          resourceId: input.postId,
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

      logger.error("[trackGroupAdminPostUsage] Error", { userId, error });
      throw new HttpsError("internal", "Failed to track post usage");
    }
  }
);
