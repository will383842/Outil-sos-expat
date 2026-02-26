/**
 * Chatter Posts Callables
 *
 * Functions for submitting and managing post submissions.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { adminConfig } from "../../lib/functionConfigs";
import {
  createPostSubmission,
  getChatterPosts,
  getPendingPosts,
  moderatePost,
} from "../services/chatterPostService";
import type { ChatterPlatform, SupportedChatterLanguage, Chatter } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Assert that the request is from an authenticated user
 */
function assertAuthenticated(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return request.auth.uid;
}

/**
 * Assert that the request is from an admin
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") {
    return uid;
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// USER CALLABLES
// ============================================================================

/**
 * Submit a new post
 */
export const submitPost = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const { url, platform, targetCountry, language, content, screenshotUrl, groupId, groupName, postedAt } =
      request.data as {
        url: string;
        platform: ChatterPlatform;
        targetCountry: string;
        language: SupportedChatterLanguage;
        content?: string;
        screenshotUrl?: string;
        groupId?: string;
        groupName?: string;
        postedAt?: string;
      };

    if (!url || !platform || !targetCountry || !language) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      // Get chatter profile
      const db = getFirestore();
      const chatterDoc = await db.collection("chatters").doc(uid).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      if (chatter.status !== "active") {
        throw new HttpsError("failed-precondition", "Chatter account is not active");
      }

      const result = await createPostSubmission({
        chatterId: uid,
        chatterEmail: chatter.email,
        chatterName: `${chatter.firstName} ${chatter.lastName}`,
        chatterCode: chatter.affiliateCodeClient,
        url,
        platform,
        targetCountry,
        language,
        content,
        screenshotUrl,
        groupId,
        groupName,
        postedAt: postedAt ? Timestamp.fromDate(new Date(postedAt)) : undefined,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to submit post");
      }

      return {
        success: true,
        postId: result.postId,
        message: "Post submitted successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[submitPost] Error", { uid, error });
      throw new HttpsError("internal", "Failed to submit post");
    }
  }
);

/**
 * Get current chatter's posts
 */
export const getMyPosts = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const { status, limit } = request.data as {
      status?: "pending" | "approved" | "rejected";
      limit?: number;
    };

    try {
      const result = await getChatterPosts({
        chatterId: uid,
        status,
        limit: limit || 20,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get posts");
      }

      return {
        success: true,
        posts: result.posts,
        total: result.total,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getMyPosts] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get posts");
    }
  }
);

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

/**
 * Get pending posts for moderation
 */
export const adminGetPendingPosts = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { limit } = request.data as { limit?: number };

    try {
      const result = await getPendingPosts(limit || 50);

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get posts");
      }

      return {
        success: true,
        posts: result.posts,
        total: result.total,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetPendingPosts] Error", { error });
      throw new HttpsError("internal", "Failed to get pending posts");
    }
  }
);

/**
 * Moderate a post
 */
export const adminModeratePost = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { postId, action, rejectionReason } = request.data as {
      postId: string;
      action: "approve" | "reject";
      rejectionReason?: string;
    };

    if (!postId || !action) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    if (action === "reject" && !rejectionReason) {
      throw new HttpsError("invalid-argument", "Rejection reason is required");
    }

    try {
      const result = await moderatePost({
        postId,
        action,
        moderatorId: adminId,
        rejectionReason,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to moderate post");
      }

      return {
        success: true,
        message: `Post ${action === "approve" ? "approved" : "rejected"} successfully`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminModeratePost] Error", { postId, error });
      throw new HttpsError("internal", "Failed to moderate post");
    }
  }
);
