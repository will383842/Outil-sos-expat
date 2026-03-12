/**
 * GroupAdmin Admin Callables - Main Export
 */

export {
  adminGetGroupAdminsList,
  adminGetGroupAdminDetail,
  adminUpdateGroupAdminStatus,
  adminVerifyGroup,
  adminProcessWithdrawal,
  adminGetWithdrawalsList,
  adminExportGroupAdmins,
  adminBulkGroupAdminAction,
} from "./groupAdmins";

// Resources & Posts — MIGRATED TO LARAVEL (Phase 4, 2026-03-12)

export {
  adminUpdateGroupAdminConfig,
  adminGetGroupAdminConfig,
  adminGetGroupAdminConfigHistory,
} from "./config";

export {
  adminGetRecruitmentsList,
  adminGetGroupAdminRecruits,
} from "./recruitments";

export {
  adminGetGroupAdminPromotions,
  adminCreateGroupAdminPromotion,
  adminUpdateGroupAdminPromotion,
  adminDeleteGroupAdminPromotion,
  adminGetGroupAdminPromotionStats,
  adminDuplicateGroupAdminPromotion,
} from "./promotions";

export {
  adminToggleGroupAdminVisibility,
} from "./toggleVisibility";

export { adminDeleteGroupAdmin } from "./deleteGroupAdmin";
