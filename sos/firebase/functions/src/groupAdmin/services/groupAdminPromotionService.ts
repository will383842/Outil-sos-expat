/**
 * GroupAdmin Promotion Service
 *
 * Instantiates the generic promotion factory for the groupAdmin module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const groupAdminPromotionService = createPromotionService({
  collectionName: "group_admin_promotions",
  commissionCollectionName: "group_admin_commissions",
  participantIdField: "groupAdminId",
  logPrefix: "groupAdmin",
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
} = groupAdminPromotionService;
