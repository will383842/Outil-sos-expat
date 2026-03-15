/**
 * Lawyer Promotion Service
 *
 * Instantiates the generic promotion factory for the lawyer module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const lawyerPromotionService = createPromotionService({
  collectionName: "lawyer_promotions",
  commissionCollectionName: "lawyer_commissions",
  participantIdField: "lawyerId",
  logPrefix: "lawyer",
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
} = lawyerPromotionService;
