/**
 * Chatter Groups Callables
 *
 * Functions for managing groups/forums database.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  createGroup,
  getGroups,
  getChatterGroups,
  joinGroup,
  updateGroupStatus,
} from "../services/chatterGroupService";
import type { ChatterPlatform, SupportedChatterLanguage, ChatterGroup, Chatter } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

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
  if (role === "admin" || role === "dev") {
    return uid;
  }

  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// USER CALLABLES
// ============================================================================

/**
 * Submit a new group
 */
export const submitGroup = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const { name, url, platform, targetCountry, language, memberCount, thematic, accessType } =
      request.data as {
        name: string;
        url: string;
        platform: ChatterPlatform;
        targetCountry: string;
        language: SupportedChatterLanguage;
        memberCount?: number;
        thematic: ChatterGroup["thematic"];
        accessType: ChatterGroup["accessType"];
      };

    if (!name || !url || !platform || !targetCountry || !language || !thematic || !accessType) {
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

      const result = await createGroup({
        name,
        url,
        platform,
        targetCountry,
        language,
        memberCount,
        thematic,
        accessType,
        submittedByChatterId: uid,
        submittedByEmail: chatter.email,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to submit group");
      }

      return {
        success: true,
        groupId: result.groupId || result.existingGroupId,
        isDuplicate: result.isDuplicate || false,
        message: result.isDuplicate
          ? "Group already exists. You have been added as an active member."
          : "Group submitted successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[submitGroup] Error", { uid, error });
      throw new HttpsError("internal", "Failed to submit group");
    }
  }
);

/**
 * Get available groups
 */
export const getAvailableGroups = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    assertAuthenticated(request);

    const { platform, targetCountry, thematic, limit } = request.data as {
      platform?: ChatterPlatform;
      targetCountry?: string;
      thematic?: ChatterGroup["thematic"];
      limit?: number;
    };

    try {
      const result = await getGroups({
        platform,
        targetCountry,
        thematic,
        status: "active",
        limit: limit || 50,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get groups");
      }

      return {
        success: true,
        groups: result.groups,
        total: result.total,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getAvailableGroups] Error", { error });
      throw new HttpsError("internal", "Failed to get groups");
    }
  }
);

/**
 * Get current chatter's groups
 */
export const getMyGroups = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    try {
      const result = await getChatterGroups(uid);

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get groups");
      }

      return {
        success: true,
        groups: result.groups,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getMyGroups] Error", { uid, error });
      throw new HttpsError("internal", "Failed to get groups");
    }
  }
);

/**
 * Join a group
 */
export const joinGroupAsChatter = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const uid = assertAuthenticated(request);

    const { groupId } = request.data as { groupId: string };

    if (!groupId) {
      throw new HttpsError("invalid-argument", "Group ID is required");
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

      const result = await joinGroup({
        groupId,
        chatterId: uid,
        chatterEmail: chatter.email,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to join group");
      }

      return {
        success: true,
        alreadyMember: result.alreadyMember || false,
        message: result.alreadyMember
          ? "You are already a member of this group"
          : "Successfully joined group",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[joinGroupAsChatter] Error", { uid, groupId, error });
      throw new HttpsError("internal", "Failed to join group");
    }
  }
);

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

/**
 * Get all groups for admin
 */
export const adminGetGroups = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { platform, targetCountry, thematic, status, limit } = request.data as {
      platform?: ChatterPlatform;
      targetCountry?: string;
      thematic?: ChatterGroup["thematic"];
      status?: ChatterGroup["status"];
      limit?: number;
    };

    try {
      const result = await getGroups({
        platform,
        targetCountry,
        thematic,
        status,
        limit: limit || 100,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to get groups");
      }

      return {
        success: true,
        groups: result.groups,
        total: result.total,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetGroups] Error", { error });
      throw new HttpsError("internal", "Failed to get groups");
    }
  }
);

/**
 * Update group status
 */
export const adminUpdateGroupStatus = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { groupId, status, adminNotes, exclusiveToChatterId } = request.data as {
      groupId: string;
      status: ChatterGroup["status"];
      adminNotes?: string;
      exclusiveToChatterId?: string;
    };

    if (!groupId || !status) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    if (status === "exclusive" && !exclusiveToChatterId) {
      throw new HttpsError("invalid-argument", "Exclusive status requires a chatter ID");
    }

    try {
      const result = await updateGroupStatus({
        groupId,
        status,
        adminId,
        adminNotes,
        exclusiveToChatterId,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to update group");
      }

      return {
        success: true,
        message: "Group status updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateGroupStatus] Error", { groupId, error });
      throw new HttpsError("internal", "Failed to update group status");
    }
  }
);
