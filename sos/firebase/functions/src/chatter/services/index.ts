/**
 * Chatter Services - Main Export
 */

// Commission Service
export {
  createCommission,
  validateCommission,
  releaseCommission,
  cancelCommission,
  checkAndUpdateLevel,
  checkAndAwardBadges,
  validatePendingCommissions,
  releaseValidatedCommissions,
  CreateCommissionInput,
  CreateCommissionResult,
} from "./chatterCommissionService";

// Withdrawal Service
export {
  createWithdrawalRequest,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalProcessing,
  completeWithdrawal,
  failWithdrawal,
  getPendingWithdrawals,
  getChatterWithdrawals,
  CreateWithdrawalInput,
  CreateWithdrawalResult,
  ProcessWithdrawalResult,
} from "./chatterWithdrawalService";

// Country Rotation Service
export {
  initializeCountryRotation,
  getAvailableCountries,
  assignCountriesToChatter,
  releaseChatterCountries,
  getCountryRotationStatus,
  advanceCycleManually,
  updateCycleThreshold,
} from "./countryRotationService";

// Post Service
export {
  createPostSubmission,
  moderatePost,
  getChatterPosts,
  getPendingPosts,
  CreatePostInput,
  CreatePostResult,
  ModeratePostInput,
  ModeratePostResult,
  GetChatterPostsInput,
  GetChatterPostsResult,
  GetPendingPostsResult,
} from "./chatterPostService";

// Group Service
export {
  createGroup,
  getGroups,
  getGroupActivity,
  getChatterGroups,
  updateGroupStatus,
  joinGroup,
  CreateGroupInput,
  CreateGroupResult,
  GetGroupsInput,
  GetGroupsResult,
  GetGroupActivityResult,
  GetChatterGroupsResult,
  UpdateGroupStatusInput,
  UpdateGroupStatusResult,
  JoinGroupInput,
  JoinGroupResult,
} from "./chatterGroupService";

// Zoom Service
export {
  createZoomMeeting,
  updateZoomMeeting,
  getUpcomingMeetings,
  getPastMeetings,
  getMeetingById,
  recordAttendance,
  getChatterAttendances,
  markAttendanceBonusPaid,
  getAllMeetings,
  getMeetingAttendees,
  cancelMeeting,
  completeMeeting,
  setMeetingLive,
  CreateZoomMeetingInput,
  RecordAttendanceInput,
  RecordAttendanceResult,
} from "./chatterZoomService";

// ============================================================================
// REFERRAL SERVICES (2-LEVEL SYSTEM)
// ============================================================================

// Referral Service
export {
  getClientEarnings,
  calculateParrainN2,
  checkAndApplyThresholds,
  checkAndApplyEarlyAdopter,
  getEarlyAdopterMultiplier,
  checkAndApplyTierBonuses,
  getNextTierBonus,
  getActivePromoMultiplier,
  validateReferralCommission,
  releaseReferralCommission,
  validatePendingReferralCommissions,
  releaseValidatedReferralCommissions,
  REFERRAL_CONFIG,
  ThresholdResult,
  EarlyAdopterResult,
  TierBonusResult,
  PromoMultiplierResult,
} from "./chatterReferralService";

// Referral Fraud Service
export {
  updateReferralToClientRatio,
  checkHighRatioChatter,
  detectCircularReferral,
  detectMultipleAccounts,
  checkRapidReferrals,
  createReferralFraudAlert,
  reviewFraudAlert,
  getPendingFraudAlerts,
  runComprehensiveFraudCheck,
} from "./chatterReferralFraudService";

// Promotion Service
export {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getAllPromotions,
  getActivePromotions,
  getBestPromoMultiplier,
  getPromotion,
  getPromotionStats,
  deactivateExpiredPromotions,
  checkPromotionBudgets,
  CreatePromotionInput,
  UpdatePromotionInput,
} from "./chatterPromotionService";

// Social Likes Service
export {
  getAllSocialNetworks,
  getActiveSocialNetworks,
  addSocialNetwork,
  updateSocialNetwork,
  deleteSocialNetwork,
  markNetworkAsLiked,
  getChatterSocialLikes,
  checkSocialBonusEligibility,
  paySocialBonus,
  checkAndPaySocialBonus,
  checkAndPayTelegramBonus,
  AddSocialNetworkInput,
  UpdateSocialNetworkInput,
  MarkNetworkLikedInput,
  SocialBonusCheckResult,
} from "./chatterSocialLikesService";
