/**
 * Admin Callables: Post Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import {
  GroupAdminPost,
  GroupAdminPostCategory,
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

interface CreatePostInput {
  name: string;
  nameTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  category: GroupAdminPostCategory;
  content: string;
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  imageResourceId?: string;
  placeholders?: string[];
  recommendedPinDuration?: "1_week" | "2_weeks" | "1_month" | "permanent";
  bestTimeToPost?: "monday_morning" | "weekend" | "evening" | "any";
  isActive?: boolean;
  order?: number;
}

/**
 * Create a new post
 */
export const adminCreatePost = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; postId: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as CreatePostInput;

    // Validate required fields
    if (!input.name || !input.category || !input.content) {
      throw new HttpsError("invalid-argument", "Name, category, and content are required");
    }

    const validCategories: GroupAdminPostCategory[] = [
      "announcement", "reminder", "testimonial", "qa", "emergency", "seasonal"
    ];
    if (!validCategories.includes(input.category)) {
      throw new HttpsError("invalid-argument", "Invalid category");
    }

    try {
      const postRef = db.collection("group_admin_posts").doc();
      const now = Timestamp.now();

      const post: GroupAdminPost = {
        id: postRef.id,
        name: input.name,
        nameTranslations: input.nameTranslations || {},
        category: input.category,
        content: input.content,
        contentTranslations: input.contentTranslations || {},
        imageResourceId: input.imageResourceId,
        placeholders: input.placeholders || [],
        recommendedPinDuration: input.recommendedPinDuration,
        bestTimeToPost: input.bestTimeToPost,
        usageCount: 0,
        isActive: input.isActive ?? true,
        order: input.order ?? 0,
        createdAt: now,
        updatedAt: now,
      };

      await postRef.set(post);

      logger.info("[adminCreatePost] Post created", {
        adminId: request.auth.uid,
        postId: postRef.id,
        category: input.category,
      });

      return {
        success: true,
        postId: postRef.id,
      };
    } catch (error) {
      logger.error("[adminCreatePost] Error", { error });
      throw new HttpsError("internal", "Failed to create post");
    }
  }
);

interface UpdatePostInput {
  postId: string;
  name?: string;
  nameTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  category?: GroupAdminPostCategory;
  content?: string;
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  imageResourceId?: string | null;
  placeholders?: string[];
  recommendedPinDuration?: "1_week" | "2_weeks" | "1_month" | "permanent" | null;
  bestTimeToPost?: "monday_morning" | "weekend" | "evening" | "any" | null;
  isActive?: boolean;
  order?: number;
}

/**
 * Update an existing post
 */
export const adminUpdatePost = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
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
    const input = request.data as UpdatePostInput;

    if (!input.postId) {
      throw new HttpsError("invalid-argument", "Post ID is required");
    }

    try {
      const postRef = db.collection("group_admin_posts").doc(input.postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        throw new HttpsError("not-found", "Post not found");
      }

      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      // Apply provided updates
      if (input.name !== undefined) updates.name = input.name;
      if (input.nameTranslations !== undefined) updates.nameTranslations = input.nameTranslations;
      if (input.category !== undefined) {
        const validCategories: GroupAdminPostCategory[] = [
          "announcement", "reminder", "testimonial", "qa", "emergency", "seasonal"
        ];
        if (!validCategories.includes(input.category)) {
          throw new HttpsError("invalid-argument", "Invalid category");
        }
        updates.category = input.category;
      }
      if (input.content !== undefined) updates.content = input.content;
      if (input.contentTranslations !== undefined) updates.contentTranslations = input.contentTranslations;
      if (input.imageResourceId !== undefined) updates.imageResourceId = input.imageResourceId;
      if (input.placeholders !== undefined) updates.placeholders = input.placeholders;
      if (input.recommendedPinDuration !== undefined) updates.recommendedPinDuration = input.recommendedPinDuration;
      if (input.bestTimeToPost !== undefined) updates.bestTimeToPost = input.bestTimeToPost;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.order !== undefined) updates.order = input.order;

      await postRef.update(updates);

      logger.info("[adminUpdatePost] Post updated", {
        adminId: request.auth.uid,
        postId: input.postId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdatePost] Error", { error });
      throw new HttpsError("internal", "Failed to update post");
    }
  }
);

/**
 * Delete a post (soft delete by setting isActive = false)
 */
export const adminDeletePost = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
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
    const { postId, hardDelete } = request.data as { postId: string; hardDelete?: boolean };

    if (!postId) {
      throw new HttpsError("invalid-argument", "Post ID is required");
    }

    try {
      const postRef = db.collection("group_admin_posts").doc(postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        throw new HttpsError("not-found", "Post not found");
      }

      if (hardDelete) {
        await postRef.delete();
      } else {
        await postRef.update({
          isActive: false,
          updatedAt: Timestamp.now(),
        });
      }

      logger.info("[adminDeletePost] Post deleted", {
        adminId: request.auth.uid,
        postId,
        hardDelete: !!hardDelete,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeletePost] Error", { error });
      throw new HttpsError("internal", "Failed to delete post");
    }
  }
);

interface GetPostsListInput {
  category?: GroupAdminPostCategory | "all";
  includeInactive?: boolean;
}

/**
 * Get list of posts for admin
 */
export const adminGetPostsList = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ posts: GroupAdminPost[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const db = getFirestore();
    const input = request.data as GetPostsListInput;

    try {
      let query = db.collection("group_admin_posts").orderBy("order", "asc");

      if (input.category && input.category !== "all") {
        query = query.where("category", "==", input.category);
      }

      if (!input.includeInactive) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.get();

      const posts = snapshot.docs.map((doc) => doc.data() as GroupAdminPost);

      return { posts };
    } catch (error) {
      logger.error("[adminGetPostsList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch posts list");
    }
  }
);
