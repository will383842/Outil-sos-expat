/**
 * Influencer Promotion Service
 *
 * Instantiates the generic promotion factory for the influencer module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const influencerPromotionService = createPromotionService({
  collectionName: "influencer_promotions",
  commissionCollectionName: "influencer_commissions",
  participantIdField: "influencerId",
  logPrefix: "influencer",
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
} = influencerPromotionService;
