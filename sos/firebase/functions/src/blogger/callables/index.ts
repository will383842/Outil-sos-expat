/**
 * Blogger Callables - Export Index
 */

// User callables
export { registerBlogger } from "./registerBlogger";
export { getBloggerDashboard } from "./getBloggerDashboard";
export { updateBloggerProfile } from "./updateBloggerProfile";
export { bloggerRequestWithdrawal } from "./requestWithdrawal";
export { getBloggerLeaderboard } from "./getBloggerLeaderboard";
export { getBloggerRecruits } from "./getBloggerRecruits";

// Resources (EXCLUSIVE)
export {
  getBloggerResources,
  downloadBloggerResource,
  copyBloggerResourceText,
} from "./resources";

// Guide (EXCLUSIVE)
export {
  getBloggerGuide,
  copyBloggerGuideText,
  trackBloggerGuideUsage,
} from "./guide";

// Articles
export {
  getBloggerArticles,
  copyBloggerArticle,
  adminGetBloggerArticles,
  adminCreateBloggerArticle,
  adminUpdateBloggerArticle,
  adminDeleteBloggerArticle,
} from "./articles";

// Admin callables
export {
  adminGetBloggersList,
  adminGetBloggerDetail,
  adminProcessBloggerWithdrawal,
  adminUpdateBloggerStatus,
  adminGetBloggerConfig,
  adminUpdateBloggerConfig,
  adminGetBloggerConfigHistory,
  adminCreateBloggerResource,
  adminUpdateBloggerResource,
  adminDeleteBloggerResource,
  adminCreateBloggerResourceText,
  adminCreateBloggerGuideTemplate,
  adminUpdateBloggerGuideTemplate,
  adminCreateBloggerGuideCopyText,
  adminUpdateBloggerGuideCopyText,
  adminCreateBloggerGuideBestPractice,
  adminUpdateBloggerGuideBestPractice,
  adminExportBloggers,
  adminBulkBloggerAction,
  adminGetBloggerLeaderboard,
  // NEW: Admin GET/SAVE/DELETE functions for console
  adminGetBloggerResources,
  adminGetBloggerGuide,
  adminSaveBloggerResourceFile,
  adminSaveBloggerResourceText,
  adminDeleteBloggerResourceFile,
  adminDeleteBloggerResourceText,
  adminSaveBloggerGuideTemplate,
  adminSaveBloggerGuideCopyText,
  adminSaveBloggerGuideBestPractice,
  adminDeleteBloggerGuideTemplate,
  adminDeleteBloggerGuideCopyText,
  adminDeleteBloggerGuideBestPractice,
  // Admin withdrawals
  adminGetBloggerWithdrawals,
} from "./admin/index";

// Public directory
export { getBloggerDirectory } from "./public";

// Admin visibility toggle
export { adminToggleBloggerVisibility } from "./admin/toggleVisibility";
