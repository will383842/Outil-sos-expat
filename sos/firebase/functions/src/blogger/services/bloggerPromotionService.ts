/**
 * Blogger Promotion Service
 *
 * Instantiates the generic promotion factory for the blogger module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const bloggerPromotionService = createPromotionService({
  collectionName: "blogger_promotions",
  commissionCollectionName: "blogger_commissions",
  participantIdField: "bloggerId",
  logPrefix: "blogger",
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
} = bloggerPromotionService;
