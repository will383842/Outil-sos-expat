/**
 * Social Likes Callables
 *
 * Admin functions:
 * - getSocialNetworks: List all social networks
 * - addSocialNetwork: Add a new social network
 * - updateSocialNetwork: Update an existing network
 * - deleteSocialNetwork: Deactivate a network
 *
 * Chatter functions:
 * - getChatterSocialStatus: Get social networks and chatter's like status
 * - markSocialNetworkLiked: Mark a network as liked (honor system)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { adminConfig } from "../../lib/functionConfigs";

import {
  getAllSocialNetworks,
  getActiveSocialNetworks,
  addSocialNetwork,
  updateSocialNetwork,
  deleteSocialNetwork,
  markNetworkAsLiked,
  getChatterSocialLikes,
  checkAndPaySocialBonus,
} from "../services/chatterSocialLikesService";
import { getClientEarnings } from "../services/chatterReferralService";
import {
  ChatterSocialNetwork,
  ChatterSocialLike,
  SocialPlatformType,
  Chatter,
  REFERRAL_CONFIG,
} from "../types";

// ============================================================================
// INITIALIZATION
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

/**
 * Get all social networks (admin view - includes inactive)
 */
export const adminGetSocialNetworks = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; networks: ChatterSocialNetwork[] }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const networks = await getAllSocialNetworks();
      return { success: true, networks };
    } catch (error) {
      logger.error("[adminGetSocialNetworks] Error", { error });
      throw new HttpsError("internal", "Failed to get social networks");
    }
  }
);

/**
 * Add a new social network (admin only)
 */
export const adminAddSocialNetwork = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; network: ChatterSocialNetwork }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { platform, label, url, bonusAmount, order } = request.data as {
      platform: SocialPlatformType;
      label: string;
      url: string;
      bonusAmount?: number;
      order?: number;
    };

    // Validate input
    if (!platform || !label || !url) {
      throw new HttpsError(
        "invalid-argument",
        "platform, label, and url are required"
      );
    }

    const validPlatforms: SocialPlatformType[] = [
      "facebook",
      "instagram",
      "tiktok",
      "youtube",
      "twitter",
      "linkedin",
      "other",
    ];
    if (!validPlatforms.includes(platform)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`
      );
    }

    try {
      const network = await addSocialNetwork(
        { platform, label, url, bonusAmount, order },
        request.auth.uid
      );

      return { success: true, network };
    } catch (error) {
      logger.error("[adminAddSocialNetwork] Error", { error });
      throw new HttpsError("internal", "Failed to add social network");
    }
  }
);

/**
 * Update an existing social network (admin only)
 */
export const adminUpdateSocialNetwork = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; network: ChatterSocialNetwork | null }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { networkId, platform, label, url, bonusAmount, isActive, order } =
      request.data as {
        networkId: string;
        platform?: SocialPlatformType;
        label?: string;
        url?: string;
        bonusAmount?: number;
        isActive?: boolean;
        order?: number;
      };

    if (!networkId) {
      throw new HttpsError("invalid-argument", "networkId is required");
    }

    try {
      const network = await updateSocialNetwork(
        { networkId, platform, label, url, bonusAmount, isActive, order },
        request.auth.uid
      );

      if (!network) {
        throw new HttpsError("not-found", "Network not found");
      }

      return { success: true, network };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateSocialNetwork] Error", { error });
      throw new HttpsError("internal", "Failed to update social network");
    }
  }
);

/**
 * Delete (deactivate) a social network (admin only)
 */
export const adminDeleteSocialNetwork = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Check admin role
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superadmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { networkId } = request.data as { networkId: string };

    if (!networkId) {
      throw new HttpsError("invalid-argument", "networkId is required");
    }

    try {
      const deleted = await deleteSocialNetwork(networkId, request.auth.uid);

      if (!deleted) {
        throw new HttpsError("not-found", "Network not found");
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeleteSocialNetwork] Error", { error });
      throw new HttpsError("internal", "Failed to delete social network");
    }
  }
);

// ============================================================================
// CHATTER CALLABLES
// ============================================================================

/**
 * Get chatter's social status (networks to like, likes made, bonus status)
 */
export const getChatterSocialStatus = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (
    request
  ): Promise<{
    success: boolean;
    networks: Array<ChatterSocialNetwork & { liked: boolean; likedAt?: string }>;
    likes: ChatterSocialLike[];
    bonusStatus: {
      eligible: boolean;
      clientEarnings: number;
      threshold: number;
      unlocked: boolean;
      totalPotentialBonus: number;
      bonusPaid: number;
      bonusPending: number;
    };
    config: {
      minViewSeconds: number;
    };
  }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getFirestore();
    const chatterId = request.auth.uid;

    try {
      // Get chatter
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();
      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // Get active networks
      const networks = await getActiveSocialNetworks();

      // Get chatter's likes
      const likes = await getChatterSocialLikes(chatterId);
      const likedNetworkIds = new Set(likes.map((l) => l.networkId));

      // Merge networks with like status
      const networksWithStatus = networks.map((network) => {
        const like = likes.find((l) => l.networkId === network.id);
        return {
          ...network,
          liked: likedNetworkIds.has(network.id),
          likedAt: like?.likedAt?.toDate().toISOString(),
        };
      });

      // Calculate bonus status
      const clientEarnings = getClientEarnings(chatter);
      const threshold = REFERRAL_CONFIG.SOCIAL_LIKES.UNLOCK_THRESHOLD;
      const unlocked = chatter.socialBonusUnlocked || false;
      const bonusPaid = chatter.socialBonusPaid || 0;

      const totalPotentialBonus = likes.reduce((sum, l) => sum + l.bonusAmount, 0);
      const bonusPending = likes
        .filter((l) => !l.bonusPaid)
        .reduce((sum, l) => sum + l.bonusAmount, 0);

      return {
        success: true,
        networks: networksWithStatus,
        likes,
        bonusStatus: {
          eligible: clientEarnings >= threshold,
          clientEarnings,
          threshold,
          unlocked,
          totalPotentialBonus,
          bonusPaid,
          bonusPending,
        },
        config: {
          minViewSeconds: REFERRAL_CONFIG.SOCIAL_LIKES.MIN_VIEW_SECONDS,
        },
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getChatterSocialStatus] Error", { chatterId, error });
      throw new HttpsError("internal", "Failed to get social status");
    }
  }
);

/**
 * Mark a social network as liked (honor system)
 * Chatter confirms they clicked and liked the page
 */
export const markSocialNetworkLiked = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 30 },
  async (
    request
  ): Promise<{
    success: boolean;
    like?: ChatterSocialLike;
    bonusPaid?: boolean;
    bonusAmount?: number;
    error?: string;
  }> => {
    ensureInitialized();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { networkId } = request.data as { networkId: string };

    if (!networkId) {
      throw new HttpsError("invalid-argument", "networkId is required");
    }

    const chatterId = request.auth.uid;

    try {
      // Mark as liked
      const result = await markNetworkAsLiked({ chatterId, networkId });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Check if this triggers a bonus payout (if threshold already reached)
      const payResult = await checkAndPaySocialBonus(chatterId);

      logger.info("[markSocialNetworkLiked] Network marked as liked", {
        chatterId,
        networkId,
        bonusPaid: payResult.paid,
        bonusAmount: payResult.amount,
      });

      return {
        success: true,
        like: result.like,
        bonusPaid: payResult.paid,
        bonusAmount: payResult.amount,
      };
    } catch (error) {
      logger.error("[markSocialNetworkLiked] Error", { chatterId, networkId, error });
      throw new HttpsError("internal", "Failed to mark network as liked");
    }
  }
);
