/**
 * Admin Callables: GroupAdmin Promotions Management
 *
 * Admin functions for managing groupAdmin hackathons and promotions:
 * - CRUD operations
 * - Stats and analytics
 * - Duplication
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";
import {
  AffiliatePromotion,
  UpdatePromotionInput,
} from "../../../lib/promotionServiceFactory";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getAllPromotions,
  getPromotion,
  getPromotionStats,
} from "../../services/groupAdminPromotionService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Assert that the request is from an admin.
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const uid = request.auth.uid;

  const role = request.auth.token?.role as string | undefined;
  if (role === "admin" || role === "dev") {
    return uid;
  }

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// ADMIN: GET PROMOTIONS
// ============================================================================

export const adminGetGroupAdminPromotions = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{
    promotions: Array<AffiliatePromotion & {
      stats?: {
        totalCommissions: number;
        totalAmount: number;
        uniqueParticipants: number;
        budgetUsedPercent: number;
      };
    }>;
  }> => {
    ensureInitialized();
    await assertAdmin(request);

    const input = request.data as { includeInactive?: boolean; limit?: number };

    try {
      const promotions = await getAllPromotions({
        includeInactive: input.includeInactive,
        limit: input.limit,
      });

      const promotionsWithStats = await Promise.all(
        promotions.map(async (promo) => {
          const stats = await getPromotionStats(promo.id);
          return { ...promo, stats: stats || undefined };
        })
      );

      return { promotions: promotionsWithStats };
    } catch (error) {
      logger.error("[adminGetGroupAdminPromotions] Error", { error });
      throw new HttpsError("internal", "Failed to get promotions");
    }
  }
);

// ============================================================================
// ADMIN: CREATE PROMOTION
// ============================================================================

export const adminCreateGroupAdminPromotion = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; promotionId?: string; error?: string }> => {
    ensureInitialized();
    const adminUid = await assertAdmin(request);

    const input = request.data as {
      name: string;
      nameTranslations?: Record<string, string>;
      description: string;
      descriptionTranslations?: Record<string, string>;
      type: AffiliatePromotion["type"];
      multiplier: number;
      appliesToTypes: string[];
      targetCountries: string[];
      startDate: string;
      endDate: string;
      maxBudget?: number;
    };

    if (!input.name || !input.description || !input.type || !input.multiplier) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      return await createPromotion({
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
        createdBy: adminUid,
      });
    } catch (error) {
      logger.error("[adminCreateGroupAdminPromotion] Error", { error });
      throw new HttpsError("internal", "Failed to create promotion");
    }
  }
);

// ============================================================================
// ADMIN: UPDATE PROMOTION
// ============================================================================

export const adminUpdateGroupAdminPromotion = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; error?: string }> => {
    ensureInitialized();
    await assertAdmin(request);

    const input = request.data as {
      promotionId: string;
      name?: string;
      nameTranslations?: Record<string, string>;
      description?: string;
      descriptionTranslations?: Record<string, string>;
      multiplier?: number;
      appliesToTypes?: string[];
      targetCountries?: string[];
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
      maxBudget?: number;
    };

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
      if (input.descriptionTranslations !== undefined) updateData.descriptionTranslations = input.descriptionTranslations;
      if (input.multiplier !== undefined) updateData.multiplier = input.multiplier;
      if (input.appliesToTypes !== undefined) updateData.appliesToTypes = input.appliesToTypes;
      if (input.targetCountries !== undefined) updateData.targetCountries = input.targetCountries;
      if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
      if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.maxBudget !== undefined) updateData.maxBudget = input.maxBudget;

      return await updatePromotion(updateData);
    } catch (error) {
      logger.error("[adminUpdateGroupAdminPromotion] Error", { error });
      throw new HttpsError("internal", "Failed to update promotion");
    }
  }
);

// ============================================================================
// ADMIN: DELETE PROMOTION
// ============================================================================

export const adminDeleteGroupAdminPromotion = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; error?: string }> => {
    ensureInitialized();
    await assertAdmin(request);

    const { promotionId } = request.data as { promotionId: string };

    if (!promotionId) {
      throw new HttpsError("invalid-argument", "Promotion ID required");
    }

    try {
      return await deletePromotion(promotionId);
    } catch (error) {
      logger.error("[adminDeleteGroupAdminPromotion] Error", { error });
      throw new HttpsError("internal", "Failed to delete promotion");
    }
  }
);

// ============================================================================
// ADMIN: GET PROMOTION STATS
// ============================================================================

export const adminGetGroupAdminPromotionStats = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{
    promotion: AffiliatePromotion | null;
    stats: {
      totalCommissions: number;
      totalAmount: number;
      uniqueParticipants: number;
      budgetUsedPercent: number;
      averageCommission: number;
      topParticipants: Array<{
        participantId: string;
        participantEmail: string;
        commissionsCount: number;
        totalAmount: number;
      }>;
    } | null;
  }> => {
    ensureInitialized();
    await assertAdmin(request);

    const { promotionId } = request.data as { promotionId: string };
    const db = getFirestore();

    try {
      const promotion = await getPromotion(promotionId);
      if (!promotion) {
        return { promotion: null, stats: null };
      }

      const commissionsQuery = await db
        .collection("group_admin_commissions")
        .where("promotionId", "==", promotionId)
        .get();

      let totalAmount = 0;
      const participantStats = new Map<string, { email: string; count: number; amount: number }>();

      for (const doc of commissionsQuery.docs) {
        const commission = doc.data();
        totalAmount += commission.amount || 0;

        const pid = commission.groupAdminId;
        const existing = participantStats.get(pid) || {
          email: "",
          count: 0,
          amount: 0,
        };
        existing.count++;
        existing.amount += commission.amount || 0;
        participantStats.set(pid, existing);
      }

      const topParticipants = Array.from(participantStats.entries())
        .map(([participantId, data]) => ({
          participantId,
          participantEmail: data.email,
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
          budgetUsedPercent: promotion.maxBudget > 0
            ? Math.round((promotion.currentSpent / promotion.maxBudget) * 100)
            : 0,
          averageCommission: commissionsQuery.size > 0
            ? Math.round(totalAmount / commissionsQuery.size)
            : 0,
          topParticipants,
        },
      };
    } catch (error) {
      logger.error("[adminGetGroupAdminPromotionStats] Error", { error });
      throw new HttpsError("internal", "Failed to get promotion stats");
    }
  }
);

// ============================================================================
// ADMIN: DUPLICATE PROMOTION
// ============================================================================

export const adminDuplicateGroupAdminPromotion = onCall(
  { ...affiliateAdminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; promotionId?: string; error?: string }> => {
    ensureInitialized();
    const adminUid = await assertAdmin(request);

    const input = request.data as {
      promotionId: string;
      newName: string;
      startDate: string;
      endDate: string;
    };

    try {
      const originalPromo = await getPromotion(input.promotionId);
      if (!originalPromo) {
        throw new HttpsError("not-found", "Original promotion not found");
      }

      return await createPromotion({
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
        createdBy: adminUid,
      });
    } catch (error) {
      logger.error("[adminDuplicateGroupAdminPromotion] Error", { error });
      throw new HttpsError("internal", "Failed to duplicate promotion");
    }
  }
);
