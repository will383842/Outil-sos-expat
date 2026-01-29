/**
 * Blogger Callables - Export Index
 */

// User callables
export { registerBlogger } from "./registerBlogger";
export { getBloggerDashboard } from "./getBloggerDashboard";
export { updateBloggerProfile } from "./updateBloggerProfile";
export { bloggerRequestWithdrawal } from "./requestWithdrawal";
export { getBloggerLeaderboard } from "./getBloggerLeaderboard";

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

// Admin callables
export {
  adminGetBloggersList,
  adminGetBloggerDetail,
  adminProcessBloggerWithdrawal,
  adminUpdateBloggerStatus,
  adminGetBloggerConfig,
  adminUpdateBloggerConfig,
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
  adminGetBloggerLeaderboard,
} from "./admin/index";
