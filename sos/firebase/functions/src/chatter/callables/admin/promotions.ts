/**
 * Admin Callables: Promotions Management
 *
 * Admin functions for managing hackathons and promotions:
 * - CRUD operations
 * - Stats and analytics
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";

import {
  ChatterPromotion,
  ChatterCommissionType,
  SupportedChatterLanguage,
} from "../../types";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getAllPromotions,
  getPromotion,
  getPromotionStats,
  UpdatePromotionInput,
} from "../../services/chatterPromotionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// ADMIN: GET PROMOTIONS
// ============================================================================

interface GetPromotionsInput {
  includeInactive?: boolean;
  limit?: number;
}

interface GetPromotionsResponse {
  promotions: Array<ChatterPromotion & {
    stats?: {
      totalCommissions: number;
      totalAmount: number;
      uniqueParticipants: number;
      budgetUsedPercent: number;
    };
  }>;
}

export const adminGetPromotions = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetPromotionsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetPromotionsInput;

    try {
      const promotions = await getAllPromotions({
        includeInactive: input.includeInactive,
        limit: input.limit,
      });

      // Enhance with stats
      const promotionsWithStats = await Promise.all(
        promotions.map(async (promo) => {
          const stats = await getPromotionStats(promo.id);
          return {
            ...promo,
            stats: stats || undefined,
          };
        })
      );

      return { promotions: promotionsWithStats };
    } catch (error) {
      logger.error("[adminGetPromotions] Error", { error });
      throw new HttpsError("internal", "Failed to get promotions");
    }
  }
);

// ============================================================================
// ADMIN: CREATE PROMOTION
// ============================================================================

interface CreatePromotionApiInput {
  name: string;
  nameTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  description: string;
  descriptionTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  type: ChatterPromotion["type"];
  multiplier: number;
  appliesToTypes: ChatterCommissionType[];
  targetCountries: string[];
  startDate: string; // ISO string
  endDate: string; // ISO string
  maxBudget?: number;
}

export const adminCreatePromotion = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; promotionId?: string; error?: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as CreatePromotionApiInput;

    // Validate input
    if (!input.name || !input.description || !input.type || !input.multiplier) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      const result = await createPromotion({
        name: input.name,
        nameTranslations: input.nameTranslations,
        description: input.description,
        descriptionTranslations: input.descriptionTranslations,
        type: input.type,
        multiplier: input.multiplier,
        appliesToTypes: input.appliesToTypes || [],
        targetCountries: input.targetCountries || [],
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        maxBudget: input.maxBudget,
        createdBy: request.auth.uid,
      });

      return result;
    } catch (error) {
      logger.error("[adminCreatePromotion] Error", { error });
      throw new HttpsError("internal", "Failed to create promotion");
    }
  }
);

// ============================================================================
// ADMIN: UPDATE PROMOTION
// ============================================================================

interface UpdatePromotionApiInput {
  promotionId: string;
  name?: string;
  nameTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  description?: string;
  descriptionTranslations?: Partial<Record<SupportedChatterLanguage, string>>;
  multiplier?: number;
  appliesToTypes?: ChatterCommissionType[];
  targetCountries?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  maxBudget?: number;
}

export const adminUpdatePromotion = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; error?: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as UpdatePromotionApiInput;

    if (!input.promotionId) {
      throw new HttpsError("invalid-argument", "Promotion ID required");
    }

    try {
      const updateData: UpdatePromotionInput = {
        promotionId: input.promotionId,
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.nameTranslations !== undefined) updateData.nameTranslations = input.nameTranslations;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.descriptionTranslations !== undefined) {
        updateData.descriptionTranslations = input.descriptionTranslations;
      }
      if (input.multiplier !== undefined) updateData.multiplier = input.multiplier;
      if (input.appliesToTypes !== undefined) updateData.appliesToTypes = input.appliesToTypes;
      if (input.targetCountries !== undefined) updateData.targetCountries = input.targetCountries;
      if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
      if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.maxBudget !== undefined) updateData.maxBudget = input.maxBudget;

      const result = await updatePromotion(updateData);
      return result;
    } catch (error) {
      logger.error("[adminUpdatePromotion] Error", { error });
      throw new HttpsError("internal", "Failed to update promotion");
    }
  }
);

// ============================================================================
// ADMIN: DELETE PROMOTION
// ============================================================================

interface DeletePromotionInput {
  promotionId: string;
}

export const adminDeletePromotion = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; error?: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as DeletePromotionInput;

    if (!input.promotionId) {
      throw new HttpsError("invalid-argument", "Promotion ID required");
    }

    try {
      const result = await deletePromotion(input.promotionId);
      return result;
    } catch (error) {
      logger.error("[adminDeletePromotion] Error", { error });
      throw new HttpsError("internal", "Failed to delete promotion");
    }
  }
);

// ============================================================================
// ADMIN: GET PROMOTION STATS
// ============================================================================

interface GetPromotionStatsInput {
  promotionId: string;
}

interface GetPromotionStatsResponse {
  promotion: ChatterPromotion | null;
  stats: {
    totalCommissions: number;
    totalAmount: number;
    uniqueParticipants: number;
    budgetUsedPercent: number;
    averageCommission: number;
    topParticipants: Array<{
      parrainId: string;
      parrainEmail: string;
      commissionsCount: number;
      totalAmount: number;
    }>;
  } | null;
}

export const adminGetPromotionStats = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetPromotionStatsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetPromotionStatsInput;
    const db = getFirestore();

    try {
      const promotion = await getPromotion(input.promotionId);
      if (!promotion) {
        return { promotion: null, stats: null };
      }

      // Get detailed stats
      const commissionsQuery = await db
        .collection("chatter_referral_commissions")
        .where("promotionId", "==", input.promotionId)
        .get();

      let totalAmount = 0;
      const participantStats = new Map<
        string,
        { email: string; count: number; amount: number }
      >();

      for (const doc of commissionsQuery.docs) {
        const commission = doc.data();
        totalAmount += commission.amount || 0;

        const parrainId = commission.parrainId;
        const existing = participantStats.get(parrainId) || {
          email: commission.parrainEmail || "",
          count: 0,
          amount: 0,
        };
        existing.count++;
        existing.amount += commission.amount || 0;
        participantStats.set(parrainId, existing);
      }

      // Sort participants by amount
      const topParticipants = Array.from(participantStats.entries())
        .map(([parrainId, data]) => ({
          parrainId,
          parrainEmail: data.email,
          commissionsCount: data.count,
          totalAmount: data.amount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      return {
        promotion,
        stats: {
          totalCommissions: commissionsQuery.size,
          totalAmount,
          uniqueParticipants: participantStats.size,
          budgetUsedPercent:
            promotion.maxBudget > 0
              ? Math.round((promotion.currentSpent / promotion.maxBudget) * 100)
              : 0,
          averageCommission:
            commissionsQuery.size > 0
              ? Math.round(totalAmount / commissionsQuery.size)
              : 0,
          topParticipants,
        },
      };
    } catch (error) {
      logger.error("[adminGetPromotionStats] Error", { error });
      throw new HttpsError("internal", "Failed to get promotion stats");
    }
  }
);

// ============================================================================
// ADMIN: DUPLICATE PROMOTION
// ============================================================================

interface DuplicatePromotionInput {
  promotionId: string;
  newName: string;
  startDate: string;
  endDate: string;
}

export const adminDuplicatePromotion = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (
    request
  ): Promise<{ success: boolean; promotionId?: string; error?: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as DuplicatePromotionInput;

    try {
      const originalPromo = await getPromotion(input.promotionId);
      if (!originalPromo) {
        throw new HttpsError("not-found", "Original promotion not found");
      }

      const result = await createPromotion({
        name: input.newName,
        nameTranslations: originalPromo.nameTranslations,
        description: originalPromo.description,
        descriptionTranslations: originalPromo.descriptionTranslations,
        type: originalPromo.type,
        multiplier: originalPromo.multiplier,
        appliesToTypes: originalPromo.appliesToTypes,
        targetCountries: originalPromo.targetCountries,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        maxBudget: originalPromo.maxBudget,
        createdBy: request.auth.uid,
      });

      return result;
    } catch (error) {
      logger.error("[adminDuplicatePromotion] Error", { error });
      throw new HttpsError("internal", "Failed to duplicate promotion");
    }
  }
);
