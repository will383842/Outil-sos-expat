/**
 * Expat Promotion Service
 *
 * Instantiates the generic promotion factory for the expat module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const expatPromotionService = createPromotionService({
  collectionName: "expat_promotions",
  commissionCollectionName: "expat_commissions",
  participantIdField: "expatId",
  logPrefix: "expat",
});

export const {
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
} = expatPromotionService;
