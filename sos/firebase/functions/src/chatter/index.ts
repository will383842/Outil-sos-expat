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
  chatterOnChatterEarningsUpdated,
  chatterOnCommissionCreated,
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

// Referral Dashboard
export { getReferralDashboard } from "./callables/getReferralDashboard";

// ============================================================================
// TRAINING CALLABLES
// ============================================================================

export {
  getChatterTrainingModules,
  getChatterTrainingModuleContent,
  updateChatterTrainingProgress,
  submitChatterTrainingQuiz,
  getChatterTrainingCertificate,
} from "./callables/training";

// Admin Training Callables
export {
  adminGetTrainingModules as adminGetChatterTrainingModules,
  adminCreateTrainingModule as adminCreateChatterTrainingModule,
  adminUpdateTrainingModule as adminUpdateChatterTrainingModule,
  adminDeleteTrainingModule as adminDeleteChatterTrainingModule,
  adminSeedTrainingModules as adminSeedChatterTrainingModules,
  adminReorderTrainingModules as adminReorderChatterTrainingModules,
} from "./callables/adminTraining";

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

// Admin Referral System
export {
  adminGetReferralStats,
  adminGetReferralTree,
  adminGetEarlyAdopters,
  adminUpdateEarlyAdopterQuota,
  adminInitializeAllEarlyAdopterCounters,
  adminGetReferralFraudAlerts,
  adminReviewFraudAlert,
  adminGetReferralCommissions,
} from "./callables/admin/referral";

// Admin Promotions
export {
  adminGetPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
  adminGetPromotionStats,
  adminDuplicatePromotion,
} from "./callables/admin/promotions";

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

// Zoom Callables
export {
  getZoomMeetings,
  recordZoomAttendance,
  getMyZoomAttendances,
  adminCreateZoomMeeting,
  adminUpdateZoomMeeting,
  adminGetZoomMeetings,
  adminGetMeetingAttendees,
  adminUpdateMeetingStatus,
} from "./callables/zoom";

// Social Likes Callables
export {
  // Admin
  adminGetSocialNetworks,
  adminAddSocialNetwork,
  adminUpdateSocialNetwork,
  adminDeleteSocialNetwork,
  // Chatter
  getChatterSocialStatus,
  markSocialNetworkLiked,
} from "./callables/socialLikes";

// Message Templates Callables
export {
  getChatterMessageTemplates,
  adminSeedMessageTemplates,
  adminCreateMessageTemplate,
  adminUpdateMessageTemplate,
  adminDeleteMessageTemplate,
  adminResetMessageTemplatesToDefaults,
  initializeMessageTemplates,
  // Service functions (for internal use)
  getMessageTemplates,
  getMessageTemplatesGrouped,
  getMessageTemplateById,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  seedMessageTemplates,
  resetMessageTemplatesToDefaults,
  // Constants
  DEFAULT_MESSAGE_TEMPLATES,
} from "./messageTemplates";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export {
  chatterValidatePendingCommissions,
  chatterReleaseValidatedCommissions,
  chatterMonthlyRecurringCommissions,
  chatterValidatePendingReferralCommissions,
  // Weekly Challenges
  chatterCreateWeeklyChallenge,
  chatterUpdateChallengeLeaderboard,
  chatterEndWeeklyChallenge,
  updateChatterChallengeScore,
  // Tier Bonus
  chatterTierBonusCheck,
  // Monthly Top 3
  chatterMonthlyTop3Rewards,
  // Activity Feed
  chatterAggregateActivityFeed,
} from "./scheduled";

// Weekly Challenges Callables
export {
  getCurrentChallenge,
  getChallengeHistory,
} from "./scheduled/weeklyChallenges";

// Activity Feed Helper (for internal use)
export { addActivityToFeed, ActivityFeedItem } from "./scheduled/aggregateActivityFeed";

// ============================================================================
// PUSH NOTIFICATIONS (FCM)
// ============================================================================

export {
  // Notification Triggers & Scheduled Functions
  chatterNotifyCommissionEarned,
  chatterNotifyTeamMemberActivated,
  chatterNotifyInactiveMembers,
  chatterNotifyTierBonusUnlocked,
  chatterNotifyNearTop3,
  chatterNotifyFlashBonusStart,
  // FCM Token Management
  chatterRegisterFcmToken,
  chatterUnregisterFcmToken,
  // Helper Functions (for internal use)
  sendChatterNotification,
  sendChatterNotificationBulk,
} from "./chatterNotifications";

// Notification Types
export type { ChatterNotificationType, ChatterFcmToken } from "./chatterNotifications";

// ============================================================================
// INITIALIZATION
// ============================================================================

export {
  initializeChatterConfig,
  resetChatterConfigToDefaults,
  initializeChatterSystem,
} from "./initializeChatterConfig";

// ============================================================================
// CHATTER CONFIG SETTINGS (New Referral System Config)
// ============================================================================

export {
  // Cloud Functions
  adminUpdateChatterConfigSettings,
  adminGetChatterConfigSettings,
  adminInitializeChatterConfigSettings,
  adminToggleFlashBonus,
  // Core Functions
  getChatterConfig as getChatterConfigSettings,
  updateChatterConfig as updateChatterConfigSettings,
  initializeChatterConfig as initializeChatterConfigSettings,
  // Helper Functions
  isFlashBonusActive,
  getCommissionMultiplier,
  getTierBonusForFilleulCount,
  getMonthlyTopReward,
  invalidateChatterConfigSettingsCache,
  // Constants
  DEFAULT_CHATTER_CONFIG_SETTINGS,
} from "./chatterConfig";

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
// ANTI-FRAUD SYSTEM
// ============================================================================

export {
  // IP fraud detection
  checkIPFraud,
  hashIP,
  // Disposable email detection
  isDisposableEmail,
  // Circular referral detection
  checkCircularReferral,
  // Rapid signup detection
  checkRapidSignups,
  // Main fraud check
  performFraudCheck,
  // IP registry
  storeRegistrationIP,
  // Manual review flagging
  flagForManualReview,
  // Activation bonus system
  incrementChatterCallCount,
  checkAndPayActivationBonus,
  getChatterCallCount,
  // Constants
  ACTIVATION_BONUS_AMOUNT,
  CALLS_REQUIRED_FOR_ACTIVATION,
} from "./antiFraud";

// Anti-Fraud Types
export type {
  IPFraudResult,
  FraudCheckResult,
  RapidSignupResult,
  ActivationBonusResult,
} from "./antiFraud";

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
  ChatterZoomMeetingStatus,
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
  // Referral System Types
  ChatterReferralCommission,
  ChatterPromotion,
  ChatterEarlyAdopterCounter,
  ChatterTierBonusHistory,
  ChatterReferralFraudAlert,
  ChatterReferralFraudAlertType,
  ChatterReferralFraudAlertStatus,
  GetReferralDashboardResponse,
  REFERRAL_CONFIG,
  // Weekly Challenges Types
  WeeklyChallengeType,
  WeeklyChallengeLeaderboardEntry,
  WeeklyChallenge,
  GetCurrentChallengeResponse,
  GetChallengeHistoryResponse,
} from "./types";

// Chatter Config Settings Types (new referral system config)
export type {
  ChatterConfigSettings,
  FlashBonusConfig,
} from "./chatterConfig";

// Message Templates Types
export type {
  MessageTemplate,
  MessageTemplateCategory,
  MessageTemplateInput,
} from "./messageTemplates";

// ============================================================================
// CONSTANTS
// ============================================================================

export { SUPPORTED_COUNTRIES } from "./types";
