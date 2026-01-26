/**
 * Affiliate Module - Main Export
 *
 * Central export for all affiliate-related Cloud Functions.
 */

// ============================================================================
// TRIGGERS
// ============================================================================

export { affiliateOnUserCreated } from "./triggers/onUserCreated";
export { affiliateOnCallCompleted } from "./triggers/onCallCompleted";
export { affiliateOnSubscriptionCreated } from "./triggers/onSubscriptionCreated";
export { affiliateOnSubscriptionRenewed } from "./triggers/onSubscriptionRenewed";

// ============================================================================
// USER CALLABLES
// ============================================================================

export { getMyAffiliateData } from "./callables/getMyAffiliateData";
export { updateBankDetails } from "./callables/updateBankDetails";
export { requestWithdrawal } from "./callables/requestWithdrawal";

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

export { adminUpdateAffiliateConfig } from "./callables/admin/updateConfig";
export { getAffiliateGlobalStats } from "./callables/admin/getGlobalStats";
export {
  adminProcessPayoutWise,
  adminProcessPayoutManual,
  adminRejectPayout,
  adminApprovePayout,
  adminGetPendingPayouts,
} from "./callables/admin/processPayout";

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

export { affiliateReleaseHeldCommissions } from "./scheduled/releaseHeldCommissions";

// ============================================================================
// WEBHOOKS
// ============================================================================

export { wiseWebhook } from "./webhooks/wiseWebhook";

// ============================================================================
// INITIALIZATION
// ============================================================================

export {
  initializeAffiliateConfig,
  resetAffiliateConfigToDefaults,
} from "./initializeAffiliateConfig";

// ============================================================================
// SERVICES (for internal use by other modules)
// ============================================================================

export { createCommission, CreateCommissionInput, CreateCommissionResult } from "./services/commissionService";

// ============================================================================
// TYPES (re-export for consumers)
// ============================================================================

export type {
  AffiliateConfig,
  AffiliateCommission,
  AffiliatePayout,
  BankDetails,
  CapturedRates,
  CommissionActionType,
  CommissionStatus,
  PayoutStatus,
  CommissionRule,
  UserAffiliateFields,
  GetAffiliateDataResponse,
  UpdateBankDetailsInput,
  RequestWithdrawalInput,
  RequestWithdrawalResponse,
  AdminGetGlobalStatsResponse,
} from "./types";
