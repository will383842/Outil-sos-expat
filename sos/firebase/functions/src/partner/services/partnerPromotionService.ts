/**
 * Partner Promotion Service
 *
 * Instantiates the generic promotion factory for the partner module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const partnerPromotionService = createPromotionService({
  collectionName: "partner_promotions",
  commissionCollectionName: "partner_commissions",
  participantIdField: "partnerId",
  logPrefix: "partner",
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
} = partnerPromotionService;
