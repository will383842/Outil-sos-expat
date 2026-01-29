/**
 * Chatter Module - Main Export
 *
 * Central export for all chatter-related Cloud Functions.
 */

// ============================================================================
// TRIGGERS
// ============================================================================

export {
  chatterOnChatterCreated,
  chatterOnQuizPassed,
  chatterOnCallCompleted,
  chatterOnProviderRegistered,
  chatterOnClientRegistered,
} from "./triggers";

// ============================================================================
// USER CALLABLES
// ============================================================================

export { registerChatter } from "./callables/registerChatter";
export { submitQuiz, getQuizQuestions } from "./callables/submitQuiz";
export { getChatterDashboard } from "./callables/getChatterDashboard";
export { getChatterLeaderboard } from "./callables/getChatterLeaderboard";
export { requestWithdrawal as chatterRequestWithdrawal } from "./callables/requestWithdrawal";
export { updateChatterProfile } from "./callables/updateChatterProfile";

// Country Rotation
export {
  getAvailableCountriesForChatter,
  assignCountriesToCurrentChatter,
} from "./callables/countryRotation";

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

export {
  adminGetChattersList,
  adminGetChatterDetail,
  adminProcessWithdrawal as adminProcessChatterWithdrawal,
  adminUpdateChatterStatus,
  adminGetPendingWithdrawals as adminGetPendingChatterWithdrawals,
  adminGetChatterConfig,
  adminUpdateChatterConfig,
  adminGetChatterLeaderboard,
  adminExportChatters,
  adminBulkChatterAction,
} from "./callables/admin";

// Admin Country Rotation
export {
  adminInitializeCountryRotation,
  adminGetCountryRotationStatus,
  adminAdvanceCycle,
  adminUpdateCycleThreshold,
} from "./callables/countryRotation";

// Posts Callables
export {
  submitPost,
  getMyPosts,
  adminGetPendingPosts,
  adminModeratePost,
} from "./callables/posts";

// Groups Callables
export {
  submitGroup,
  getAvailableGroups,
  getMyGroups,
  joinGroupAsChatter,
  adminGetGroups,
  adminUpdateGroupStatus,
} from "./callables/groups";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export {
  chatterValidatePendingCommissions,
  chatterReleaseValidatedCommissions,
} from "./scheduled";

// ============================================================================
// INITIALIZATION
// ============================================================================

export {
  initializeChatterConfig,
  resetChatterConfigToDefaults,
  initializeChatterSystem,
} from "./initializeChatterConfig";

// ============================================================================
// SERVICES (for internal use by other modules)
// ============================================================================

export {
  createCommission as createChatterCommission,
  validateCommission as validateChatterCommission,
  releaseCommission as releaseChatterCommission,
  cancelCommission as cancelChatterCommission,
  CreateCommissionInput as ChatterCommissionInput,
  CreateCommissionResult as ChatterCommissionResult,
} from "./services";

// ============================================================================
// TYPES (re-export for consumers)
// ============================================================================

export type {
  Chatter,
  ChatterStatus,
  ChatterLevel,
  ChatterCommission,
  ChatterCommissionType,
  ChatterCommissionStatus,
  ChatterWithdrawal,
  ChatterWithdrawalStatus,
  ChatterConfig,
  ChatterPaymentMethod,
  ChatterPaymentDetails,
  ChatterWiseDetails,
  ChatterMobileMoneyDetails,
  ChatterBankDetails,
  ChatterRecruitmentLink,
  ChatterQuizQuestion,
  ChatterQuizAttempt,
  ChatterBadgeType,
  ChatterBadgeDefinition,
  ChatterBadgeAward,
  ChatterMonthlyRanking,
  ChatterPlatform,
  ChatterPlatformDefinition,
  ChatterAffiliateClick,
  ChatterNotification,
  ChatterZoomMeeting,
  ChatterZoomAttendance,
  ChatterPost,
  SupportedChatterLanguage,
  RegisterChatterInput,
  RegisterChatterResponse,
  SubmitQuizInput,
  SubmitQuizResponse,
  GetChatterDashboardResponse,
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  UpdateChatterProfileInput,
  AdminGetChattersListInput,
  AdminGetChattersListResponse,
  AdminGetChatterDetailResponse,
  AdminProcessWithdrawalInput,
  AdminUpdateChatterStatusInput,
  // Country Rotation Types
  ChatterCountryAssignment,
  ChatterCountryRotationState,
  // Posts/Groups Types
  ChatterPostSubmission,
  ChatterGroup,
  ChatterGroupActivity,
} from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

export { SUPPORTED_COUNTRIES } from "./types";
