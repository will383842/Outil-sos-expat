/**
 * GroupAdmin Callables - Main Export
 */

// User Callables
export { registerGroupAdmin } from "./registerGroupAdmin";
export { getGroupAdminDashboard } from "./getGroupAdminDashboard";
export { getGroupAdminCommissions } from "./getGroupAdminCommissions";
export { getGroupAdminNotifications } from "./getGroupAdminNotifications";
export { getGroupAdminLeaderboard } from "./getGroupAdminLeaderboard";
export { updateGroupAdminProfile } from "./updateGroupAdminProfile";
export { requestGroupAdminWithdrawal } from "./requestWithdrawal";
export { getGroupAdminRecruits } from "./getGroupAdminRecruits";
export { getGroupAdminRecruitedProviders } from "./getRecruitedProviders";

// Resource & Post Callables — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)

// Admin Callables
export {
  adminGetGroupAdminsList,
  adminGetGroupAdminDetail,
  adminUpdateGroupAdminStatus,
  adminVerifyGroup,
  adminProcessWithdrawal,
  adminGetWithdrawalsList,
  adminExportGroupAdmins,
  adminBulkGroupAdminAction,
  // adminCreateResource..adminGetPostsList — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)
  adminUpdateGroupAdminConfig,
  adminGetGroupAdminConfig,
  adminGetGroupAdminConfigHistory,
  adminGetRecruitmentsList,
  adminGetGroupAdminRecruits,
  // Promotions
  adminGetGroupAdminPromotions,
  adminCreateGroupAdminPromotion,
  adminUpdateGroupAdminPromotion,
  adminDeleteGroupAdminPromotion,
  adminGetGroupAdminPromotionStats,
  adminDuplicateGroupAdminPromotion,
  // Visibility
  adminToggleGroupAdminVisibility,
  // Delete
  adminDeleteGroupAdmin,
  // Locked rates
  adminUpdateGroupAdminLockedRates,
} from "./admin";

// Public Callables
export {
  getGroupAdminDirectory,
} from "./public";
