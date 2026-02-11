/**
 * GroupAdmin Module - Main Export
 *
 * Group/Community Administrator (GroupAdmin) system for SOS-Expat.
 * Provides affiliate program for group/community admins to earn commissions
 * by referring clients and recruiting other group admins.
 */

// Types
export * from "./types";

// Configuration
export { getGroupAdminConfig, updateGroupAdminConfig } from "./groupAdminConfig";

// Callables
export {
  // User callables
  registerGroupAdmin,
  getGroupAdminDashboard,
  getGroupAdminCommissions,
  getGroupAdminNotifications,
  getGroupAdminLeaderboard,
  updateGroupAdminProfile,
  requestGroupAdminWithdrawal,
  // Resource callables
  getGroupAdminResources,
  getGroupAdminResourceContent,
  getGroupAdminProcessedResourceContent,
  trackGroupAdminResourceUsage,
  // Post callables
  getGroupAdminPosts,
  getGroupAdminPostContent,
  getGroupAdminProcessedPost,
  trackGroupAdminPostUsage,
  // Admin callables
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
} from "./callables";

// Services
export {
  createClientReferralCommission,
  createRecruitmentCommission,
  createManualAdjustment,
  validatePendingCommissions,
  releaseValidatedCommissions,
  cancelCommission,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  startProcessingWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  getWithdrawalStats,
  seedDefaultResources,
  seedDefaultPosts,
  getResourceStats,
} from "./services";

// Triggers
export {
  onCallCompletedGroupAdmin,
  onGroupAdminCreated,
} from "./triggers";

// Scheduled Functions
export {
  validatePendingGroupAdminCommissions,
  releaseValidatedGroupAdminCommissions,
} from "./scheduled";
