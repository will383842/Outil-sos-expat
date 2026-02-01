/**
 * Chatter Social Likes Service
 *
 * Manages the social media likes bonus system:
 * - Admin adds social networks (Facebook, Instagram, TikTok, etc.)
 * - Chatters mark networks as "liked" (honor system with intelligent UX)
 * - Bonus of $1 per network is unlocked when chatter reaches $100 direct earnings
 *
 * Collection: chatter_social_networks/{networkId} - Admin-managed networks
 * Subcollection: chatters/{chatterId}/socialLikes/{networkId} - Chatter's likes
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterSocialNetwork,
  ChatterSocialLike,
  SocialPlatformType,
  REFERRAL_CONFIG,
} from "../types";
import { createCommission } from "./chatterCommissionService";
import { getClientEarnings } from "./chatterReferralService";

// ============================================================================
// TYPES
// ============================================================================

export interface AddSocialNetworkInput {
  platform: SocialPlatformType;
  label: string;
  url: string;
  bonusAmount?: number; // Default: $1 (100 cents)
  order?: number;
}

export interface UpdateSocialNetworkInput {
  networkId: string;
  platform?: SocialPlatformType;
  label?: string;
  url?: string;
  bonusAmount?: number;
  isActive?: boolean;
  order?: number;
}

export interface MarkNetworkLikedInput {
  chatterId: string;
  networkId: string;
}

export interface SocialBonusCheckResult {
  eligible: boolean;
  reason: string;
  clientEarnings: number;
  threshold: number;
  networksLiked: number;
  potentialBonus: number;
  alreadyPaid: number;
  newBonusToPay: number;
}

// ============================================================================
// ADMIN: SOCIAL NETWORK MANAGEMENT
// ============================================================================

/**
 * Get all social networks (active and inactive)
 */
export async function getAllSocialNetworks(): Promise<ChatterSocialNetwork[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection("chatter_social_networks")
    .orderBy("order", "asc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChatterSocialNetwork);
}

/**
 * Get only active social networks (for chatters to see)
 */
export async function getActiveSocialNetworks(): Promise<ChatterSocialNetwork[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection("chatter_social_networks")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChatterSocialNetwork);
}

/**
 * Add a new social network (admin only)
 */
export async function addSocialNetwork(
  input: AddSocialNetworkInput,
  adminId: string
): Promise<ChatterSocialNetwork> {
  const db = getFirestore();
  const now = Timestamp.now();

  // Get max order if not provided
  let order = input.order;
  if (order === undefined) {
    const existingNetworks = await db
      .collection("chatter_social_networks")
      .orderBy("order", "desc")
      .limit(1)
      .get();

    order = existingNetworks.empty
      ? 0
      : (existingNetworks.docs[0].data().order as number) + 1;
  }

  const docRef = db.collection("chatter_social_networks").doc();

  const network: ChatterSocialNetwork = {
    id: docRef.id,
    platform: input.platform,
    label: input.label,
    url: input.url,
    bonusAmount: input.bonusAmount ?? REFERRAL_CONFIG.SOCIAL_LIKES.BONUS_PER_NETWORK,
    isActive: true,
    order,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };

  await docRef.set(network);

  logger.info("[addSocialNetwork] Network added", {
    networkId: network.id,
    platform: network.platform,
    label: network.label,
    adminId,
  });

  return network;
}

/**
 * Update an existing social network (admin only)
 */
export async function updateSocialNetwork(
  input: UpdateSocialNetworkInput,
  adminId: string
): Promise<ChatterSocialNetwork | null> {
  const db = getFirestore();
  const docRef = db.collection("chatter_social_networks").doc(input.networkId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  const updates: Partial<ChatterSocialNetwork> = {
    updatedAt: Timestamp.now(),
  };

  if (input.platform !== undefined) updates.platform = input.platform;
  if (input.label !== undefined) updates.label = input.label;
  if (input.url !== undefined) updates.url = input.url;
  if (input.bonusAmount !== undefined) updates.bonusAmount = input.bonusAmount;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.order !== undefined) updates.order = input.order;

  await docRef.update(updates);

  const updated = await docRef.get();

  logger.info("[updateSocialNetwork] Network updated", {
    networkId: input.networkId,
    updates: Object.keys(updates),
    adminId,
  });

  return updated.data() as ChatterSocialNetwork;
}

/**
 * Delete a social network (admin only)
 * Note: This is a soft delete (sets isActive to false)
 */
export async function deleteSocialNetwork(
  networkId: string,
  adminId: string
): Promise<boolean> {
  const db = getFirestore();
  const docRef = db.collection("chatter_social_networks").doc(networkId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return false;
  }

  await docRef.update({
    isActive: false,
    updatedAt: Timestamp.now(),
  });

  logger.info("[deleteSocialNetwork] Network deactivated", {
    networkId,
    adminId,
  });

  return true;
}

// ============================================================================
// CHATTER: LIKE TRACKING
// ============================================================================

/**
 * Mark a social network as liked by a chatter
 * This is an honor system - we trust the chatter clicked and liked
 */
export async function markNetworkAsLiked(
  input: MarkNetworkLikedInput
): Promise<{ success: boolean; error?: string; like?: ChatterSocialLike }> {
  const db = getFirestore();
  const { chatterId, networkId } = input;

  try {
    // Get the network
    const networkDoc = await db
      .collection("chatter_social_networks")
      .doc(networkId)
      .get();

    if (!networkDoc.exists) {
      return { success: false, error: "Network not found" };
    }

    const network = networkDoc.data() as ChatterSocialNetwork;

    if (!network.isActive) {
      return { success: false, error: "Network is no longer active" };
    }

    // Check if already liked
    const existingLikeDoc = await db
      .collection("chatters")
      .doc(chatterId)
      .collection("socialLikes")
      .doc(networkId)
      .get();

    if (existingLikeDoc.exists) {
      return { success: false, error: "Already liked this network" };
    }

    // Create the like record
    const now = Timestamp.now();
    const like: ChatterSocialLike = {
      networkId,
      platform: network.platform,
      networkLabel: network.label,
      likedAt: now,
      bonusAmount: network.bonusAmount,
      bonusPaid: false,
      bonusPaidAt: null,
      commissionId: null,
    };

    // Use transaction to update both the like and chatter's likedSocialNetworks array
    await db.runTransaction(async (transaction) => {
      const likeRef = db
        .collection("chatters")
        .doc(chatterId)
        .collection("socialLikes")
        .doc(networkId);

      const chatterRef = db.collection("chatters").doc(chatterId);

      transaction.set(likeRef, like);
      transaction.update(chatterRef, {
        likedSocialNetworks: FieldValue.arrayUnion(networkId),
        updatedAt: now,
      });
    });

    logger.info("[markNetworkAsLiked] Network marked as liked", {
      chatterId,
      networkId,
      platform: network.platform,
      bonusAmount: network.bonusAmount,
    });

    return { success: true, like };
  } catch (error) {
    logger.error("[markNetworkAsLiked] Error", { chatterId, networkId, error });
    return { success: false, error: "Failed to mark network as liked" };
  }
}

/**
 * Get all social likes for a chatter
 */
export async function getChatterSocialLikes(
  chatterId: string
): Promise<ChatterSocialLike[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection("chatters")
    .doc(chatterId)
    .collection("socialLikes")
    .orderBy("likedAt", "asc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChatterSocialLike);
}

// ============================================================================
// BONUS PAYMENT
// ============================================================================

/**
 * Check if a chatter is eligible for social bonus payout
 * Requires $100+ in direct earnings (clientEarnings)
 */
export async function checkSocialBonusEligibility(
  chatterId: string
): Promise<SocialBonusCheckResult> {
  const db = getFirestore();
  const threshold = REFERRAL_CONFIG.SOCIAL_LIKES.UNLOCK_THRESHOLD;

  // Get chatter
  const chatterDoc = await db.collection("chatters").doc(chatterId).get();
  if (!chatterDoc.exists) {
    return {
      eligible: false,
      reason: "Chatter not found",
      clientEarnings: 0,
      threshold,
      networksLiked: 0,
      potentialBonus: 0,
      alreadyPaid: 0,
      newBonusToPay: 0,
    };
  }

  const chatter = chatterDoc.data() as Chatter;
  const clientEarnings = getClientEarnings(chatter);

  // Get all likes
  const likes = await getChatterSocialLikes(chatterId);
  const networksLiked = likes.length;

  // Calculate potential bonus (all liked networks)
  const potentialBonus = likes.reduce((sum, like) => sum + like.bonusAmount, 0);

  // Calculate already paid
  const alreadyPaid = chatter.socialBonusPaid || 0;

  // Calculate new bonus to pay (unpaid likes)
  const unpaidLikes = likes.filter((like) => !like.bonusPaid);
  const newBonusToPay = unpaidLikes.reduce((sum, like) => sum + like.bonusAmount, 0);

  // Check eligibility
  if (clientEarnings < threshold) {
    return {
      eligible: false,
      reason: `Need $${(threshold / 100).toFixed(0)} in direct earnings (currently $${(clientEarnings / 100).toFixed(2)})`,
      clientEarnings,
      threshold,
      networksLiked,
      potentialBonus,
      alreadyPaid,
      newBonusToPay,
    };
  }

  if (newBonusToPay === 0) {
    return {
      eligible: false,
      reason: "No unpaid social likes",
      clientEarnings,
      threshold,
      networksLiked,
      potentialBonus,
      alreadyPaid,
      newBonusToPay,
    };
  }

  return {
    eligible: true,
    reason: "Eligible for social bonus payout",
    clientEarnings,
    threshold,
    networksLiked,
    potentialBonus,
    alreadyPaid,
    newBonusToPay,
  };
}

/**
 * Pay social bonus to a chatter
 * Called when chatter reaches $100 in direct earnings
 * Pays all unpaid social likes as a single commission
 */
export async function paySocialBonus(
  chatterId: string
): Promise<{ success: boolean; amountPaid?: number; commissionId?: string; error?: string }> {
  const db = getFirestore();

  try {
    // Check eligibility
    const eligibility = await checkSocialBonusEligibility(chatterId);

    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Get unpaid likes
    const likes = await getChatterSocialLikes(chatterId);
    const unpaidLikes = likes.filter((like) => !like.bonusPaid);

    if (unpaidLikes.length === 0) {
      return { success: false, error: "No unpaid social likes" };
    }

    const totalAmount = unpaidLikes.reduce((sum, like) => sum + like.bonusAmount, 0);
    const networkCount = unpaidLikes.length;

    // Create commission
    const commissionResult = await createCommission({
      chatterId,
      type: "bonus_social" as any, // We'll add this type
      source: {
        id: null,
        type: "bonus",
        details: {
          bonusType: "social_likes",
          bonusReason: `Likes reseaux sociaux (${networkCount} reseaux)`,
          networkCount,
          networks: unpaidLikes.map((l) => l.networkLabel).join(", "),
        },
      },
      baseAmount: totalAmount,
      description: `Bonus likes reseaux sociaux (${networkCount} reseaux)`,
      skipFraudCheck: true,
    });

    if (!commissionResult.success) {
      return { success: false, error: commissionResult.error };
    }

    // Mark all likes as paid
    const now = Timestamp.now();
    const batch = db.batch();

    for (const like of unpaidLikes) {
      const likeRef = db
        .collection("chatters")
        .doc(chatterId)
        .collection("socialLikes")
        .doc(like.networkId);

      batch.update(likeRef, {
        bonusPaid: true,
        bonusPaidAt: now,
        commissionId: commissionResult.commissionId,
      });
    }

    // Update chatter's socialBonusPaid and unlock status
    const chatterRef = db.collection("chatters").doc(chatterId);
    batch.update(chatterRef, {
      socialBonusUnlocked: true,
      socialBonusUnlockedAt: now,
      socialBonusPaid: FieldValue.increment(totalAmount),
      updatedAt: now,
    });

    await batch.commit();

    logger.info("[paySocialBonus] Social bonus paid", {
      chatterId,
      amountPaid: totalAmount,
      networkCount,
      commissionId: commissionResult.commissionId,
    });

    return {
      success: true,
      amountPaid: totalAmount,
      commissionId: commissionResult.commissionId,
    };
  } catch (error) {
    logger.error("[paySocialBonus] Error", { chatterId, error });
    return { success: false, error: "Failed to pay social bonus" };
  }
}

/**
 * Check and pay social bonus if eligible
 * This should be called after commission creation to check if threshold is reached
 */
export async function checkAndPaySocialBonus(
  chatterId: string
): Promise<{ paid: boolean; amount?: number }> {
  const eligibility = await checkSocialBonusEligibility(chatterId);

  if (eligibility.eligible && eligibility.newBonusToPay > 0) {
    const result = await paySocialBonus(chatterId);
    if (result.success) {
      return { paid: true, amount: result.amountPaid };
    }
  }

  return { paid: false };
}
