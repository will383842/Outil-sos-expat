/**
 * Influencer Module - Main Export
 *
 * Central export for all influencer-related Cloud Functions.
 */

// ============================================================================
// TRIGGERS
// ============================================================================

export {
  influencerOnInfluencerCreated,
  influencerOnCallCompleted,
  influencerOnProviderRegistered,
  influencerOnProviderCallCompleted,
} from "./triggers";

// ============================================================================
// USER CALLABLES
// ============================================================================

export { registerInfluencer } from "./callables/registerInfluencer";
export { getInfluencerDashboard } from "./callables/getInfluencerDashboard";
export { updateInfluencerProfile } from "./callables/updateInfluencerProfile";
export { influencerRequestWithdrawal } from "./callables";
export { getInfluencerLeaderboard } from "./callables/getInfluencerLeaderboard";

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

export {
  adminGetInfluencersList,
  adminGetInfluencerDetail,
  adminProcessInfluencerWithdrawal,
  adminUpdateInfluencerStatus,
  adminGetPendingInfluencerWithdrawals,
  adminGetInfluencerConfig,
  adminUpdateInfluencerConfig,
  adminGetInfluencerLeaderboard,
  // V2 Admin Callables
  adminUpdateCommissionRules,
  adminGetRateHistory,
  adminUpdateAntiFraudConfig,
  adminExportInfluencers,
  adminBulkInfluencerAction,
} from "./callables/admin";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export {
  influencerValidatePendingCommissions,
  influencerReleaseValidatedCommissions,
} from "./scheduled";

// ============================================================================
// INITIALIZATION
// ============================================================================

export {
  initializeInfluencerConfig,
  updateInfluencerConfig,
  clearInfluencerConfigCache,
} from "./utils";

// ============================================================================
// SERVICES (for internal use by other modules)
// ============================================================================

export {
  createCommission as createInfluencerCommission,
  validateCommission as validateInfluencerCommission,
  releaseCommission as releaseInfluencerCommission,
  cancelCommission as cancelInfluencerCommission,
  CreateCommissionInput as InfluencerCommissionInput,
  CreateCommissionResult as InfluencerCommissionResult,
} from "./services";

// ============================================================================
// TYPES (re-export for consumers)
// ============================================================================

export type {
  Influencer,
  InfluencerStatus,
  InfluencerCommission,
  InfluencerCommissionType,
  InfluencerCommissionStatus,
  InfluencerWithdrawal,
  InfluencerWithdrawalStatus,
  InfluencerConfig,
  InfluencerPaymentMethod,
  InfluencerPaymentDetails,
  InfluencerWiseDetails,
  InfluencerPayPalDetails,
  InfluencerBankDetails,
  InfluencerReferral,
  InfluencerMonthlyRanking,
  InfluencerPlatform,
  InfluencerPlatformDefinition,
  InfluencerAffiliateClick,
  InfluencerNotification,
  WidgetBanner,
  WidgetText,
  SupportedInfluencerLanguage,
  RegisterInfluencerInput,
  RegisterInfluencerResponse,
  GetInfluencerDashboardResponse,
  RequestInfluencerWithdrawalInput,
  RequestInfluencerWithdrawalResponse,
  UpdateInfluencerProfileInput,
  GetInfluencerLeaderboardResponse,
  AdminGetInfluencersListInput,
  AdminGetInfluencersListResponse,
  AdminGetInfluencerDetailResponse,
  AdminProcessInfluencerWithdrawalInput,
  AdminUpdateInfluencerStatusInput,
} from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

export { INFLUENCER_PLATFORMS, DEFAULT_INFLUENCER_CONFIG } from "./types";
