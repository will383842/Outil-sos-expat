/**
 * Chatter Promotion Service
 *
 * Manages hackathons, bonus weekends, and special promotions:
 * - CRUD operations for promotions
 * - Active promotion queries
 * - Best multiplier calculation
 * - Budget tracking
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  ChatterPromotion,
  ChatterCommissionType,
  SupportedChatterLanguage,
} from "../types";

// ============================================================================
// PROMOTION CRUD
// ============================================================================

export interface CreatePromotionInput {
  name: string;
  nameTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  description: string;
  descriptionTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  type: ChatterPromotion["type"];
  multiplier: number;
  appliesToTypes: ChatterCommissionType[];
  targetCountries: string[];
  startDate: Date;
  endDate: Date;
  maxBudget?: number;
  createdBy: string;
}

/**
 * Create a new promotion
 */
export async function createPromotion(
  input: CreatePromotionInput
): Promise<{ success: boolean; promotionId?: string; error?: string }> {
  const db = getFirestore();

  try {
    // Validate dates
    if (input.startDate >= input.endDate) {
      return { success: false, error: "Start date must be before end date" };
    }

    // Validate multiplier
    if (input.multiplier < 1 || input.multiplier > 10) {
      return { success: false, error: "Multiplier must be between 1 and 10" };
    }

    const now = Timestamp.now();
    const promoRef = db.collection("chatter_promotions").doc();

    const promotion: ChatterPromotion = {
      id: promoRef.id,
      name: input.name,
      nameTranslations: input.nameTranslations as ChatterPromotion["nameTranslations"],
      description: input.description,
      descriptionTranslations: input.descriptionTranslations as ChatterPromotion["descriptionTranslations"],
      type: input.type,
      multiplier: input.multiplier,
      appliesToTypes: input.appliesToTypes,
      targetCountries: input.targetCountries,
      startDate: Timestamp.fromDate(input.startDate),
      endDate: Timestamp.fromDate(input.endDate),
      isActive: true,
      maxBudget: input.maxBudget || 0,
      currentSpent: 0,
      participantCount: 0,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    await promoRef.set(promotion);

    logger.info("[createPromotion] Promotion created", {
      promotionId: promoRef.id,
      name: input.name,
      multiplier: input.multiplier,
    });

    return { success: true, promotionId: promoRef.id };
  } catch (error) {
    logger.error("[createPromotion] Error", { error });
    return { success: false, error: "Failed to create promotion" };
  }
}

export interface UpdatePromotionInput {
  promotionId: string;
  name?: string;
  nameTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  description?: string;
  descriptionTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  multiplier?: number;
  appliesToTypes?: ChatterCommissionType[];
  targetCountries?: string[];
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  maxBudget?: number;
}

/**
 * Update an existing promotion
 */
export async function updatePromotion(
  input: UpdatePromotionInput
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const promoRef = db.collection("chatter_promotions").doc(input.promotionId);
    const promoDoc = await promoRef.get();

    if (!promoDoc.exists) {
      return { success: false, error: "Promotion not found" };
    }

    const updates: Partial<ChatterPromotion> = {
      updatedAt: Timestamp.now(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.nameTranslations !== undefined) {
      updates.nameTranslations = input.nameTranslations as ChatterPromotion["nameTranslations"];
    }
    if (input.description !== undefined) updates.description = input.description;
    if (input.descriptionTranslations !== undefined) {
      updates.descriptionTranslations = input.descriptionTranslations as ChatterPromotion["descriptionTranslations"];
    }
    if (input.multiplier !== undefined) {
      if (input.multiplier < 1 || input.multiplier > 10) {
        return { success: false, error: "Multiplier must be between 1 and 10" };
      }
      updates.multiplier = input.multiplier;
    }
    if (input.appliesToTypes !== undefined) updates.appliesToTypes = input.appliesToTypes;
    if (input.targetCountries !== undefined) updates.targetCountries = input.targetCountries;
    if (input.startDate !== undefined) updates.startDate = Timestamp.fromDate(input.startDate);
    if (input.endDate !== undefined) updates.endDate = Timestamp.fromDate(input.endDate);
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.maxBudget !== undefined) updates.maxBudget = input.maxBudget;

    await promoRef.update(updates);

    logger.info("[updatePromotion] Promotion updated", {
      promotionId: input.promotionId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[updatePromotion] Error", { error });
    return { success: false, error: "Failed to update promotion" };
  }
}

/**
 * Delete (deactivate) a promotion
 */
export async function deletePromotion(
  promotionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const promoRef = db.collection("chatter_promotions").doc(promotionId);
    const promoDoc = await promoRef.get();

    if (!promoDoc.exists) {
      return { success: false, error: "Promotion not found" };
    }

    // Soft delete - just deactivate
    await promoRef.update({
      isActive: false,
      updatedAt: Timestamp.now(),
    });

    logger.info("[deletePromotion] Promotion deactivated", { promotionId });

    return { success: true };
  } catch (error) {
    logger.error("[deletePromotion] Error", { error });
    return { success: false, error: "Failed to delete promotion" };
  }
}

// ============================================================================
// PROMOTION QUERIES
// ============================================================================

/**
 * Get all promotions (for admin)
 */
export async function getAllPromotions(options: {
  includeInactive?: boolean;
  limit?: number;
}): Promise<ChatterPromotion[]> {
  const db = getFirestore();

  try {
    let query = db
      .collection("chatter_promotions")
      .orderBy("createdAt", "desc");

    if (!options.includeInactive) {
      query = query.where("isActive", "==", true);
    }

    const snapshot = await query.limit(options.limit || 100).get();

    return snapshot.docs.map((doc) => doc.data() as ChatterPromotion);
  } catch (error) {
    logger.error("[getAllPromotions] Error", { error });
    return [];
  }
}

/**
 * Get active promotions for a chatter
 */
export async function getActivePromotions(
  chatterId: string,
  country: string,
  commissionType?: ChatterCommissionType
): Promise<ChatterPromotion[]> {
  const db = getFirestore();

  try {
    const now = Timestamp.now();

    const snapshot = await db
      .collection("chatter_promotions")
      .where("isActive", "==", true)
      .where("startDate", "<=", now)
      .where("endDate", ">=", now)
      .get();

    const activePromotions: ChatterPromotion[] = [];

    for (const doc of snapshot.docs) {
      const promo = doc.data() as ChatterPromotion;

      // Check country restrictions
      if (promo.targetCountries.length > 0 && !promo.targetCountries.includes(country)) {
        continue;
      }

      // Check budget
      if (promo.maxBudget > 0 && promo.currentSpent >= promo.maxBudget) {
        continue;
      }

      // Check commission type if specified
      if (commissionType && !promo.appliesToTypes.includes(commissionType)) {
        continue;
      }

      activePromotions.push(promo);
    }

    return activePromotions;
  } catch (error) {
    logger.error("[getActivePromotions] Error", { chatterId, error });
    return [];
  }
}

/**
 * Get the best (highest) promotion multiplier for a chatter
 */
export async function getBestPromoMultiplier(
  chatterId: string,
  country: string,
  commissionType: ChatterCommissionType
): Promise<{
  multiplier: number;
  promoId: string | null;
  promoName: string | null;
}> {
  const result = {
    multiplier: 1.0,
    promoId: null as string | null,
    promoName: null as string | null,
  };

  try {
    const activePromotions = await getActivePromotions(chatterId, country, commissionType);

    for (const promo of activePromotions) {
      if (promo.multiplier > result.multiplier) {
        result.multiplier = promo.multiplier;
        result.promoId = promo.id;
        result.promoName = promo.name;
      }
    }

    return result;
  } catch (error) {
    logger.error("[getBestPromoMultiplier] Error", { chatterId, error });
    return result;
  }
}

/**
 * Get a single promotion by ID
 */
export async function getPromotion(promotionId: string): Promise<ChatterPromotion | null> {
  const db = getFirestore();

  try {
    const promoDoc = await db.collection("chatter_promotions").doc(promotionId).get();

    if (!promoDoc.exists) {
      return null;
    }

    return promoDoc.data() as ChatterPromotion;
  } catch (error) {
    logger.error("[getPromotion] Error", { promotionId, error });
    return null;
  }
}

// ============================================================================
// PROMOTION STATS
// ============================================================================

/**
 * Get promotion statistics
 */
export async function getPromotionStats(promotionId: string): Promise<{
  totalCommissions: number;
  totalAmount: number;
  uniqueParticipants: number;
  budgetUsedPercent: number;
} | null> {
  const db = getFirestore();

  try {
    const promoDoc = await db.collection("chatter_promotions").doc(promotionId).get();

    if (!promoDoc.exists) {
      return null;
    }

    const promo = promoDoc.data() as ChatterPromotion;

    // Count commissions that used this promotion
    const commissionsQuery = await db
      .collection("chatter_referral_commissions")
      .where("promotionId", "==", promotionId)
      .get();

    let totalAmount = 0;
    const participants = new Set<string>();

    for (const doc of commissionsQuery.docs) {
      const commission = doc.data();
      totalAmount += commission.amount || 0;
      participants.add(commission.parrainId);
    }

    return {
      totalCommissions: commissionsQuery.size,
      totalAmount,
      uniqueParticipants: participants.size,
      budgetUsedPercent: promo.maxBudget > 0
        ? Math.round((promo.currentSpent / promo.maxBudget) * 100)
        : 0,
    };
  } catch (error) {
    logger.error("[getPromotionStats] Error", { promotionId, error });
    return null;
  }
}

// ============================================================================
// AUTOMATIC PROMOTION MANAGEMENT
// ============================================================================

/**
 * Deactivate expired promotions (run daily)
 */
export async function deactivateExpiredPromotions(): Promise<{
  deactivated: number;
}> {
  const db = getFirestore();
  let deactivated = 0;

  try {
    const now = Timestamp.now();

    const expiredQuery = await db
      .collection("chatter_promotions")
      .where("isActive", "==", true)
      .where("endDate", "<", now)
      .get();

    const batch = db.batch();

    for (const doc of expiredQuery.docs) {
      batch.update(doc.ref, {
        isActive: false,
        updatedAt: now,
      });
      deactivated++;
    }

    if (deactivated > 0) {
      await batch.commit();
    }

    logger.info("[deactivateExpiredPromotions] Completed", { deactivated });

    return { deactivated };
  } catch (error) {
    logger.error("[deactivateExpiredPromotions] Error", { error });
    return { deactivated };
  }
}

/**
 * Check promotions that have exceeded their budget
 */
export async function checkPromotionBudgets(): Promise<{
  exhausted: number;
}> {
  const db = getFirestore();
  let exhausted = 0;

  try {
    const activeQuery = await db
      .collection("chatter_promotions")
      .where("isActive", "==", true)
      .get();

    const batch = db.batch();

    for (const doc of activeQuery.docs) {
      const promo = doc.data() as ChatterPromotion;

      // Check if budget is exhausted
      if (promo.maxBudget > 0 && promo.currentSpent >= promo.maxBudget) {
        batch.update(doc.ref, {
          isActive: false,
          updatedAt: Timestamp.now(),
        });
        exhausted++;

        logger.warn("[checkPromotionBudgets] Budget exhausted", {
          promotionId: promo.id,
          name: promo.name,
          spent: promo.currentSpent,
          budget: promo.maxBudget,
        });
      }
    }

    if (exhausted > 0) {
      await batch.commit();
    }

    return { exhausted };
  } catch (error) {
    logger.error("[checkPromotionBudgets] Error", { error });
    return { exhausted };
  }
}
