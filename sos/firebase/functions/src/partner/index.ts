/**
 * Partner Module — Barrel Export
 *
 * Exports all partner-related Cloud Functions:
 * - Callables (partner-facing)
 * - Admin callables
 * - Firestore triggers
 * - Scheduled functions
 */

// Callables (partner-facing)
export {
  createPartner,
  getPartnerDashboard,
  updatePartnerProfile,
  getPartnerCommissions,
  getPartnerClicks,
  getPartnerWidgets,
  getPartnerNotifications,
  markPartnerNotificationRead,
  partnerRequestWithdrawal,
  trackPartnerClick,
  submitPartnerApplication,
} from "./callables";

// Admin callables
export {
  adminPartnersList,
  adminPartnerDetail,
  adminUpdatePartnerConfig,
  adminUpdatePartnerCommissionConfig,
  adminTogglePartnerVisibility,
  adminTogglePartnerStatus,
  adminIssueManualCommission,
  adminGetPartnerStats,
  adminManagePartnerWidgets,
  adminPartnerApplicationsList,
  adminUpdatePartnerApplication,
  adminConvertApplicationToPartner,
  adminDeletePartner,
} from "./callables/admin";

// Admin Promotions callables
export {
  adminGetPartnerPromotions,
  adminCreatePartnerPromotion,
  adminUpdatePartnerPromotion,
  adminDeletePartnerPromotion,
  adminGetPartnerPromotionStats,
  adminDuplicatePartnerPromotion,
} from "./callables/admin/promotions";

// Triggers
export { onPartnerCreated } from "./triggers";

// Scheduled
export { releasePartnerPendingCommissions } from "./scheduled/releasePartnerPendingCommissions";
export { updatePartnerMonthlyStats } from "./scheduled/updatePartnerMonthlyStats";
