/**
 * Chatter Group Service
 *
 * Manages groups/forums database for chatters.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { createHash } from "crypto";
import type { ChatterGroup, ChatterGroupActivity, ChatterPlatform, SupportedChatterLanguage } from "../types";

// ============================================================================
// CREATE GROUP
// ============================================================================

export interface CreateGroupInput {
  name: string;
  url: string;
  platform: ChatterPlatform;
  targetCountry: string;
  language: SupportedChatterLanguage;
  memberCount?: number;
  thematic: ChatterGroup["thematic"];
  accessType: ChatterGroup["accessType"];
  submittedByChatterId: string;
  submittedByEmail: string;
}

export interface CreateGroupResult {
  success: boolean;
  groupId?: string;
  isDuplicate?: boolean;
  existingGroupId?: string;
  error?: string;
}

/**
 * Create a new group entry
 */
export async function createGroup(
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    // Normalize URL and create hash for deduplication
    const normalizedUrl = normalizeUrl(input.url);
    const urlHash = createHash("sha256").update(normalizedUrl).digest("hex");

    // Check for existing group with same URL
    const existingQuery = await db
      .collection("chatter_groups")
      .where("urlHash", "==", urlHash)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingGroup = existingQuery.docs[0].data() as ChatterGroup;

      // Add submitter to active chatters if not already
      if (!existingGroup.activeChatterIds.includes(input.submittedByChatterId)) {
        await existingQuery.docs[0].ref.update({
          activeChatterIds: FieldValue.arrayUnion(input.submittedByChatterId),
          activeChatterCount: FieldValue.increment(1),
          updatedAt: now,
        });
      }

      return {
        success: true,
        isDuplicate: true,
        existingGroupId: existingGroup.id,
      };
    }

    // Create new group
    const groupRef = db.collection("chatter_groups").doc();
    const group: ChatterGroup = {
      id: groupRef.id,
      name: input.name,
      url: input.url,
      platform: input.platform,
      targetCountry: input.targetCountry,
      language: input.language,
      memberCount: input.memberCount,
      thematic: input.thematic,
      accessType: input.accessType,
      submittedByChatterId: input.submittedByChatterId,
      submittedByEmail: input.submittedByEmail,
      activeChatterIds: [input.submittedByChatterId],
      activeChatterCount: 1,
      totalPosts: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalEarnings: 0,
      status: "active",
      urlHash,
      createdAt: now,
      updatedAt: now,
    };

    await groupRef.set(group);

    // Create initial activity record for submitter
    const activityRef = groupRef.collection("chatter_activity").doc(input.submittedByChatterId);
    await activityRef.set({
      chatterId: input.submittedByChatterId,
      chatterEmail: input.submittedByEmail,
      groupId: groupRef.id,
      postCount: 0,
      clickCount: 0,
      conversionCount: 0,
      earningsGenerated: 0,
      status: "active",
      firstPostAt: now,
      lastPostAt: now,
      updatedAt: now,
    });

    logger.info("[createGroup] Group created", {
      groupId: groupRef.id,
      name: input.name,
      platform: input.platform,
    });

    return { success: true, groupId: groupRef.id };
  } catch (error) {
    logger.error("[createGroup] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

// ============================================================================
// GET GROUPS
// ============================================================================

export interface GetGroupsInput {
  platform?: ChatterPlatform;
  targetCountry?: string;
  thematic?: ChatterGroup["thematic"];
  status?: ChatterGroup["status"];
  limit?: number;
}

export interface GetGroupsResult {
  success: boolean;
  groups: ChatterGroup[];
  total: number;
  error?: string;
}

/**
 * Get groups with optional filters
 */
export async function getGroups(
  input: GetGroupsInput = {}
): Promise<GetGroupsResult> {
  const db = getFirestore();
  const limit = input.limit || 50;

  try {
    let query: FirebaseFirestore.Query = db.collection("chatter_groups");

    if (input.platform) {
      query = query.where("platform", "==", input.platform);
    }
    if (input.targetCountry) {
      query = query.where("targetCountry", "==", input.targetCountry);
    }
    if (input.thematic) {
      query = query.where("thematic", "==", input.thematic);
    }
    if (input.status) {
      query = query.where("status", "==", input.status);
    }

    query = query.orderBy("totalConversions", "desc").limit(limit);

    const snapshot = await query.get();
    const groups = snapshot.docs.map(doc => doc.data() as ChatterGroup);

    return { success: true, groups, total: groups.length };
  } catch (error) {
    logger.error("[getGroups] Error", { error });
    return {
      success: false,
      groups: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to get groups",
    };
  }
}

// ============================================================================
// GET GROUP ACTIVITY
// ============================================================================

export interface GetGroupActivityResult {
  success: boolean;
  activities: ChatterGroupActivity[];
  error?: string;
}

/**
 * Get activity for a specific group
 */
export async function getGroupActivity(
  groupId: string,
  limit: number = 50
): Promise<GetGroupActivityResult> {
  const db = getFirestore();

  try {
    const snapshot = await db
      .collection("chatter_groups")
      .doc(groupId)
      .collection("chatter_activity")
      .orderBy("earningsGenerated", "desc")
      .limit(limit)
      .get();

    const activities = snapshot.docs.map(doc => doc.data() as ChatterGroupActivity);

    return { success: true, activities };
  } catch (error) {
    logger.error("[getGroupActivity] Error", { groupId, error });
    return {
      success: false,
      activities: [],
      error: error instanceof Error ? error.message : "Failed to get activity",
    };
  }
}

// ============================================================================
// GET CHATTER'S GROUPS
// ============================================================================

export interface GetChatterGroupsResult {
  success: boolean;
  groups: ChatterGroup[];
  error?: string;
}

/**
 * Get groups where a chatter is active
 */
export async function getChatterGroups(
  chatterId: string
): Promise<GetChatterGroupsResult> {
  const db = getFirestore();

  try {
    const snapshot = await db
      .collection("chatter_groups")
      .where("activeChatterIds", "array-contains", chatterId)
      .orderBy("updatedAt", "desc")
      .get();

    const groups = snapshot.docs.map(doc => doc.data() as ChatterGroup);

    return { success: true, groups };
  } catch (error) {
    logger.error("[getChatterGroups] Error", { chatterId, error });
    return {
      success: false,
      groups: [],
      error: error instanceof Error ? error.message : "Failed to get groups",
    };
  }
}

// ============================================================================
// UPDATE GROUP STATUS (Admin)
// ============================================================================

export interface UpdateGroupStatusInput {
  groupId: string;
  status: ChatterGroup["status"];
  adminId: string;
  adminNotes?: string;
  exclusiveToChatterId?: string;
}

export interface UpdateGroupStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Update group status (admin action)
 */
export async function updateGroupStatus(
  input: UpdateGroupStatusInput
): Promise<UpdateGroupStatusResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    const groupRef = db.collection("chatter_groups").doc(input.groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return { success: false, error: "Group not found" };
    }

    const updateData: Record<string, unknown> = {
      status: input.status,
      markedBy: input.adminId,
      markedAt: now,
      updatedAt: now,
    };

    if (input.adminNotes) {
      updateData.adminNotes = input.adminNotes;
    }

    if (input.status === "exclusive" && input.exclusiveToChatterId) {
      updateData.exclusiveToChatterId = input.exclusiveToChatterId;
    }

    await groupRef.update(updateData);

    logger.info("[updateGroupStatus] Group status updated", {
      groupId: input.groupId,
      status: input.status,
      adminId: input.adminId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[updateGroupStatus] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

// ============================================================================
// JOIN GROUP
// ============================================================================

export interface JoinGroupInput {
  groupId: string;
  chatterId: string;
  chatterEmail: string;
}

export interface JoinGroupResult {
  success: boolean;
  alreadyMember?: boolean;
  error?: string;
}

/**
 * Join a group as an active chatter
 */
export async function joinGroup(
  input: JoinGroupInput
): Promise<JoinGroupResult> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    const groupRef = db.collection("chatter_groups").doc(input.groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return { success: false, error: "Group not found" };
    }

    const group = groupDoc.data() as ChatterGroup;

    // Check if already member
    if (group.activeChatterIds.includes(input.chatterId)) {
      return { success: true, alreadyMember: true };
    }

    // Check if group is exclusive
    if (group.status === "exclusive" && group.exclusiveToChatterId !== input.chatterId) {
      return { success: false, error: "This group is exclusive to another chatter" };
    }

    // Check if group is banned
    if (group.status === "banned") {
      return { success: false, error: "This group has been banned" };
    }

    // Add chatter to group
    await groupRef.update({
      activeChatterIds: FieldValue.arrayUnion(input.chatterId),
      activeChatterCount: FieldValue.increment(1),
      updatedAt: now,
    });

    // Create activity record
    const activityRef = groupRef.collection("chatter_activity").doc(input.chatterId);
    await activityRef.set({
      chatterId: input.chatterId,
      chatterEmail: input.chatterEmail,
      groupId: input.groupId,
      postCount: 0,
      clickCount: 0,
      conversionCount: 0,
      earningsGenerated: 0,
      status: "active",
      firstPostAt: now,
      lastPostAt: now,
      updatedAt: now,
    });

    logger.info("[joinGroup] Chatter joined group", {
      groupId: input.groupId,
      chatterId: input.chatterId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[joinGroup] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join group",
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slashes, lowercase, remove www
    let normalized = parsed.hostname.replace(/^www\./, "").toLowerCase();
    normalized += parsed.pathname.replace(/\/+$/, "");
    return normalized;
  } catch {
    return url.toLowerCase().trim();
  }
}
