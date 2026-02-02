/**
 * GroupAdmin Callables - Main Export
 */

// User Callables
export { registerGroupAdmin } from "./registerGroupAdmin";
export { getGroupAdminDashboard } from "./getGroupAdminDashboard";
export { getGroupAdminLeaderboard } from "./getGroupAdminLeaderboard";
export { updateGroupAdminProfile } from "./updateGroupAdminProfile";
export { requestGroupAdminWithdrawal } from "./requestWithdrawal";

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
} from "./admin";
