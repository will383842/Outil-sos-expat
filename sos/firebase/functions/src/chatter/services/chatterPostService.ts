/**
 * Chatter Post Service
 *
 * Manages post submissions from chatters tracking their promotional content.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { ChatterPostSubmission, ChatterPlatform, SupportedChatterLanguage } from "../types";

// ============================================================================
// CREATE POST SUBMISSION
// ============================================================================

export interface CreatePostInput {
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  chatterCode: string;
  url: string;
  platform: ChatterPlatform;
  targetCountry: string;
  language: SupportedChatterLanguage;
  content?: string;
  screenshotUrl?: string;
  groupId?: string;
  groupName?: string;
  postedAt?: Timestamp;
}

export interface CreatePostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Create a new post submission
 */
export async function createPostSubmission(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    // Validate URL format
    if (!isValidUrl(input.url)) {
      return { success: false, error: "Invalid URL format" };
    }

    // Check for duplicate URL (same chatter, same URL in last 24h)
    const recentDuplicate = await db
      .collection("chatter_posts")
      .where("chatterId", "==", input.chatterId)
      .where("url", "==", input.url)
      .where("submittedAt", ">", Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)))
      .limit(1)
      .get();

    if (!recentDuplicate.empty) {
      return { success: false, error: "This URL was already submitted in the last 24 hours" };
    }

    // Create post document
    const postRef = db.collection("chatter_posts").doc();
    const post: ChatterPostSubmission = {
      id: postRef.id,
      chatterId: input.chatterId,
      chatterEmail: input.chatterEmail,
      chatterName: input.chatterName,
      chatterCode: input.chatterCode,
      url: input.url,
      platform: input.platform,
      targetCountry: input.targetCountry,
      language: input.language,
      content: input.content,
      screenshotUrl: input.screenshotUrl,
      groupId: input.groupId,
      groupName: input.groupName,
      clickCount: 0,
      conversionCount: 0,
      earningsGenerated: 0,
      status: "pending",
      isSpamFlagged: false,
      postedAt: input.postedAt || now,
      submittedAt: now,
      updatedAt: now,
    };

    await postRef.set(post);

    // Update chatter stats
    await db.collection("chatters").doc(input.chatterId).update({
      "stats.totalPosts": FieldValue.increment(1),
      "stats.pendingPosts": FieldValue.increment(1),
      updatedAt: now,
    });

    // Update group stats if group is specified
    if (input.groupId) {
      const groupRef = db.collection("chatter_groups").doc(input.groupId);
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        await groupRef.update({
          totalPosts: FieldValue.increment(1),
          updatedAt: now,
        });

        // Update chatter activity in group
        const activityRef = groupRef.collection("chatter_activity").doc(input.chatterId);
        const activityDoc = await activityRef.get();

        if (activityDoc.exists) {
          await activityRef.update({
            postCount: FieldValue.increment(1),
            lastPostAt: now,
            updatedAt: now,
          });
        } else {
          await activityRef.set({
            chatterId: input.chatterId,
            chatterEmail: input.chatterEmail,
            groupId: input.groupId,
            postCount: 1,
            clickCount: 0,
            conversionCount: 0,
            earningsGenerated: 0,
            status: "active",
            firstPostAt: now,
            lastPostAt: now,
            updatedAt: now,
          });

          // Add chatter to group's active chatters
          await groupRef.update({
            activeChatterIds: FieldValue.arrayUnion(input.chatterId),
            activeChatterCount: FieldValue.increment(1),
          });
        }
      }
    }

    logger.info("[createPostSubmission] Post created", {
      postId: postRef.id,
      chatterId: input.chatterId,
      platform: input.platform,
    });

    return { success: true, postId: postRef.id };
  } catch (error) {
    logger.error("[createPostSubmission] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}

// ============================================================================
// MODERATE POST
// ============================================================================

export interface ModeratePostInput {
  postId: string;
  action: "approve" | "reject";
  moderatorId: string;
  rejectionReason?: string;
}

export interface ModeratePostResult {
  success: boolean;
  error?: string;
}

/**
 * Moderate a post submission (admin action)
 */
export async function moderatePost(
  input: ModeratePostInput
): Promise<ModeratePostResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    const postRef = db.collection("chatter_posts").doc(input.postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return { success: false, error: "Post not found" };
    }

    const post = postDoc.data() as ChatterPostSubmission;

    if (post.status !== "pending") {
      return { success: false, error: "Post already moderated" };
    }

    // Update post status
    await postRef.update({
      status: input.action === "approve" ? "approved" : "rejected",
      moderatedBy: input.moderatorId,
      moderatedAt: now,
      rejectionReason: input.action === "reject" ? input.rejectionReason : null,
      updatedAt: now,
    });

    // Update chatter stats
    const chatterRef = db.collection("chatters").doc(post.chatterId);
    if (input.action === "approve") {
      await chatterRef.update({
        "stats.pendingPosts": FieldValue.increment(-1),
        "stats.approvedPosts": FieldValue.increment(1),
        updatedAt: now,
      });
    } else {
      await chatterRef.update({
        "stats.pendingPosts": FieldValue.increment(-1),
        "stats.rejectedPosts": FieldValue.increment(1),
        updatedAt: now,
      });
    }

    logger.info("[moderatePost] Post moderated", {
      postId: input.postId,
      action: input.action,
      moderatorId: input.moderatorId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[moderatePost] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to moderate post",
    };
  }
}

// ============================================================================
// GET CHATTER POSTS
// ============================================================================

export interface GetChatterPostsInput {
  chatterId: string;
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}

export interface GetChatterPostsResult {
  success: boolean;
  posts: ChatterPostSubmission[];
  total: number;
  error?: string;
}

/**
 * Get posts submitted by a chatter
 */
export async function getChatterPosts(
  input: GetChatterPostsInput
): Promise<GetChatterPostsResult> {
  const db = getFirestore();
  const limit = input.limit || 20;

  try {
    let query = db
      .collection("chatter_posts")
      .where("chatterId", "==", input.chatterId)
      .orderBy("submittedAt", "desc");

    if (input.status) {
      query = query.where("status", "==", input.status);
    }

    const snapshot = await query.limit(limit).get();
    const posts = snapshot.docs.map(doc => doc.data() as ChatterPostSubmission);

    // Get total count
    const countQuery = input.status
      ? db.collection("chatter_posts")
          .where("chatterId", "==", input.chatterId)
          .where("status", "==", input.status)
      : db.collection("chatter_posts")
          .where("chatterId", "==", input.chatterId);

    const countSnapshot = await countQuery.count().get();
    const total = countSnapshot.data().count;

    return { success: true, posts, total };
  } catch (error) {
    logger.error("[getChatterPosts] Error", { error });
    return {
      success: false,
      posts: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to get posts",
    };
  }
}

// ============================================================================
// GET PENDING POSTS FOR MODERATION
// ============================================================================

export interface GetPendingPostsResult {
  success: boolean;
  posts: ChatterPostSubmission[];
  total: number;
  error?: string;
}

/**
 * Get pending posts for moderation (admin)
 */
export async function getPendingPosts(
  limit: number = 50
): Promise<GetPendingPostsResult> {
  const db = getFirestore();

  try {
    const snapshot = await db
      .collection("chatter_posts")
      .where("status", "==", "pending")
      .orderBy("submittedAt", "asc")
      .limit(limit)
      .get();

    const posts = snapshot.docs.map(doc => doc.data() as ChatterPostSubmission);

    const countSnapshot = await db
      .collection("chatter_posts")
      .where("status", "==", "pending")
      .count()
      .get();
    const total = countSnapshot.data().count;

    return { success: true, posts, total };
  } catch (error) {
    logger.error("[getPendingPosts] Error", { error });
    return {
      success: false,
      posts: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to get pending posts",
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
