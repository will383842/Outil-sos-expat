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

export {
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminGetResourcesList,
} from "./resources";

export {
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminGetPostsList,
} from "./posts";

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
