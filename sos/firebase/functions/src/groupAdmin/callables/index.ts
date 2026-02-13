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

// Resource Callables
export {
  getGroupAdminResources,
  getGroupAdminResourceContent,
  getGroupAdminProcessedResourceContent,
  trackGroupAdminResourceUsage,
} from "./resources";

// Post Callables
export {
  getGroupAdminPosts,
  getGroupAdminPostContent,
  getGroupAdminProcessedPost,
  trackGroupAdminPostUsage,
} from "./posts";

// Admin Callables
export {
  adminGetGroupAdminsList,
  adminGetGroupAdminDetail,
  adminUpdateGroupAdminStatus,
  adminVerifyGroup,
  adminProcessWithdrawal,
  adminGetWithdrawalsList,
  adminExportGroupAdmins,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminGetResourcesList,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminGetPostsList,
  adminUpdateGroupAdminConfig,
  adminGetGroupAdminConfig,
  adminGetRecruitmentsList,
  adminGetGroupAdminRecruits,
} from "./admin";
