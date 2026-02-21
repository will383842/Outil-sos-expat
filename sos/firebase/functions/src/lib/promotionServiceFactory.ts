/**
 * Promotion Service Factory
 *
 * Generic factory that creates promotion management services for any affiliate module.
 * Avoids code duplication between chatter, influencer, blogger, and groupAdmin promotions.
 *
 * Usage:
 *   const service = createPromotionService({
 *     collectionName: "influencer_promotions",
 *     commissionCollectionName: "influencer_commissions",
 *     participantIdField: "influencerId",
 *     logPrefix: "influencer",
 *   });
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generic promotion document (same structure across all affiliate modules)
 */
export interface AffiliatePromotion {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  type: "hackathon" | "bonus_weekend" | "country_challenge" | "special_event";
  multiplier: number;
  appliesToTypes: string[];
  targetCountries: string[];
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  maxBudget: number;
  currentSpent: number;
  participantCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePromotionInput {
  name: string;
  nameTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  type: AffiliatePromotion["type"];
  multiplier: number;
  appliesToTypes: string[];
  targetCountries: string[];
  startDate: Date;
  endDate: Date;
  maxBudget?: number;
  createdBy: string;
}

export interface UpdatePromotionInput {
  promotionId: string;
  name?: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  multiplier?: number;
  appliesToTypes?: string[];
  targetCountries?: string[];
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  maxBudget?: number;
}

export interface PromotionServiceConfig {
  collectionName: string;
  commissionCollectionName: string;
  participantIdField: string;
  logPrefix: string;
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPromotionService(config: PromotionServiceConfig) {
  const { collectionName, commissionCollectionName, participantIdField, logPrefix } = config;

  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  async function createPromotion(
    input: CreatePromotionInput
  ): Promise<{ success: boolean; promotionId?: string; error?: string }> {
    const db = getFirestore();

    try {
      if (input.startDate >= input.endDate) {
        return { success: false, error: "Start date must be before end date" };
      }
      if (input.multiplier < 1 || input.multiplier > 10) {
        return { success: false, error: "Multiplier must be between 1 and 10" };
      }

      const now = Timestamp.now();
      const promoRef = db.collection(collectionName).doc();

      const promotion: AffiliatePromotion = {
        id: promoRef.id,
        name: input.name,
        nameTranslations: input.nameTranslations,
        description: input.description,
        descriptionTranslations: input.descriptionTranslations,
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

      logger.info(`[${logPrefix}.createPromotion] Promotion created`, {
        promotionId: promoRef.id,
        name: input.name,
        multiplier: input.multiplier,
      });

      return { success: true, promotionId: promoRef.id };
    } catch (error) {
      logger.error(`[${logPrefix}.createPromotion] Error`, { error });
      return { success: false, error: "Failed to create promotion" };
    }
  }

  async function updatePromotion(
    input: UpdatePromotionInput
  ): Promise<{ success: boolean; error?: string }> {
    const db = getFirestore();

    try {
      const promoRef = db.collection(collectionName).doc(input.promotionId);
      const promoDoc = await promoRef.get();

      if (!promoDoc.exists) {
        return { success: false, error: "Promotion not found" };
      }

      const updates: Partial<AffiliatePromotion> = {
        updatedAt: Timestamp.now(),
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.nameTranslations !== undefined) updates.nameTranslations = input.nameTranslations;
      if (input.description !== undefined) updates.description = input.description;
      if (input.descriptionTranslations !== undefined) updates.descriptionTranslations = input.descriptionTranslations;
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

      logger.info(`[${logPrefix}.updatePromotion] Promotion updated`, {
        promotionId: input.promotionId,
      });

      return { success: true };
    } catch (error) {
      logger.error(`[${logPrefix}.updatePromotion] Error`, { error });
      return { success: false, error: "Failed to update promotion" };
    }
  }

  async function deletePromotion(
    promotionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = getFirestore();

    try {
      const promoRef = db.collection(collectionName).doc(promotionId);
      const promoDoc = await promoRef.get();

      if (!promoDoc.exists) {
        return { success: false, error: "Promotion not found" };
      }

      await promoRef.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      logger.info(`[${logPrefix}.deletePromotion] Promotion deactivated`, { promotionId });

      return { success: true };
    } catch (error) {
      logger.error(`[${logPrefix}.deletePromotion] Error`, { error });
      return { success: false, error: "Failed to delete promotion" };
    }
  }

  // --------------------------------------------------------------------------
  // QUERIES
  // --------------------------------------------------------------------------

  async function getAllPromotions(options: {
    includeInactive?: boolean;
    limit?: number;
  }): Promise<AffiliatePromotion[]> {
    const db = getFirestore();

    try {
      let query = db.collection(collectionName).orderBy("createdAt", "desc");

      if (!options.includeInactive) {
        query = query.where("isActive", "==", true);
      }

      const snapshot = await query.limit(options.limit || 100).get();
      return snapshot.docs.map((doc) => doc.data() as AffiliatePromotion);
    } catch (error) {
      logger.error(`[${logPrefix}.getAllPromotions] Error`, { error });
      return [];
    }
  }

  async function getPromotion(promotionId: string): Promise<AffiliatePromotion | null> {
    const db = getFirestore();

    try {
      const promoDoc = await db.collection(collectionName).doc(promotionId).get();
      if (!promoDoc.exists) return null;
      return promoDoc.data() as AffiliatePromotion;
    } catch (error) {
      logger.error(`[${logPrefix}.getPromotion] Error`, { promotionId, error });
      return null;
    }
  }

  async function getActivePromotions(
    participantId: string,
    country: string,
    commissionType?: string
  ): Promise<AffiliatePromotion[]> {
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      const snapshot = await db
        .collection(collectionName)
        .where("isActive", "==", true)
        .where("startDate", "<=", now)
        .where("endDate", ">=", now)
        .get();

      const activePromotions: AffiliatePromotion[] = [];

      for (const doc of snapshot.docs) {
        const promo = doc.data() as AffiliatePromotion;

        if (promo.targetCountries.length > 0 && !promo.targetCountries.includes(country)) {
          continue;
        }

        if (promo.maxBudget > 0 && promo.currentSpent >= promo.maxBudget) {
          continue;
        }

        if (commissionType && !promo.appliesToTypes.includes(commissionType)) {
          continue;
        }

        activePromotions.push(promo);
      }

      return activePromotions;
    } catch (error) {
      logger.error(`[${logPrefix}.getActivePromotions] Error`, { participantId, error });
      return [];
    }
  }

  async function getBestPromoMultiplier(
    participantId: string,
    country: string,
    commissionType: string
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
      const activePromotions = await getActivePromotions(participantId, country, commissionType);

      for (const promo of activePromotions) {
        if (promo.multiplier > result.multiplier) {
          result.multiplier = promo.multiplier;
          result.promoId = promo.id;
          result.promoName = promo.name;
        }
      }

      return result;
    } catch (error) {
      logger.error(`[${logPrefix}.getBestPromoMultiplier] Error`, { participantId, error });
      return result;
    }
  }

  // --------------------------------------------------------------------------
  // STATS
  // --------------------------------------------------------------------------

  async function getPromotionStats(promotionId: string): Promise<{
    totalCommissions: number;
    totalAmount: number;
    uniqueParticipants: number;
    budgetUsedPercent: number;
  } | null> {
    const db = getFirestore();

    try {
      const promoDoc = await db.collection(collectionName).doc(promotionId).get();
      if (!promoDoc.exists) return null;

      const promo = promoDoc.data() as AffiliatePromotion;

      const commissionsQuery = await db
        .collection(commissionCollectionName)
        .where("promotionId", "==", promotionId)
        .get();

      let totalAmount = 0;
      const participants = new Set<string>();

      for (const doc of commissionsQuery.docs) {
        const commission = doc.data();
        totalAmount += commission.amount || 0;
        participants.add(commission[participantIdField]);
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
      logger.error(`[${logPrefix}.getPromotionStats] Error`, { promotionId, error });
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // AUTOMATIC MANAGEMENT
  // --------------------------------------------------------------------------

  async function deactivateExpiredPromotions(): Promise<{ deactivated: number }> {
    const db = getFirestore();
    let deactivated = 0;

    try {
      const now = Timestamp.now();

      const expiredQuery = await db
        .collection(collectionName)
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

      logger.info(`[${logPrefix}.deactivateExpiredPromotions] Completed`, { deactivated });
      return { deactivated };
    } catch (error) {
      logger.error(`[${logPrefix}.deactivateExpiredPromotions] Error`, { error });
      return { deactivated };
    }
  }

  async function checkPromotionBudgets(): Promise<{ exhausted: number }> {
    const db = getFirestore();
    let exhausted = 0;

    try {
      const activeQuery = await db
        .collection(collectionName)
        .where("isActive", "==", true)
        .get();

      const batch = db.batch();

      for (const doc of activeQuery.docs) {
        const promo = doc.data() as AffiliatePromotion;

        if (promo.maxBudget > 0 && promo.currentSpent >= promo.maxBudget) {
          batch.update(doc.ref, {
            isActive: false,
            updatedAt: Timestamp.now(),
          });
          exhausted++;

          logger.warn(`[${logPrefix}.checkPromotionBudgets] Budget exhausted`, {
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
      logger.error(`[${logPrefix}.checkPromotionBudgets] Error`, { error });
      return { exhausted };
    }
  }

  // --------------------------------------------------------------------------
  // BUDGET TRACKING
  // --------------------------------------------------------------------------

  async function trackBudgetSpend(
    promotionId: string,
    bonusAmount: number
  ): Promise<void> {
    const db = getFirestore();

    try {
      const promoRef = db.collection(collectionName).doc(promotionId);
      await promoRef.update({
        currentSpent: (await promoRef.get()).data()?.currentSpent + bonusAmount || bonusAmount,
        participantCount: ((await promoRef.get()).data()?.participantCount || 0) + 1,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error(`[${logPrefix}.trackBudgetSpend] Error`, { promotionId, error });
    }
  }

  return {
    createPromotion,
    updatePromotion,
    deletePromotion,
    getAllPromotions,
    getPromotion,
    getActivePromotions,
    getBestPromoMultiplier,
    getPromotionStats,
    deactivateExpiredPromotions,
    checkPromotionBudgets,
    trackBudgetSpend,
  };
}
