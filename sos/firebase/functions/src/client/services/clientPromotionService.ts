/**
 * Client Promotion Service
 *
 * Instantiates the generic promotion factory for the client module.
 */

import { createPromotionService } from "../../lib/promotionServiceFactory";

const clientPromotionService = createPromotionService({
  collectionName: "client_promotions",
  commissionCollectionName: "client_commissions",
  participantIdField: "clientId",
  logPrefix: "client",
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
} = clientPromotionService;
