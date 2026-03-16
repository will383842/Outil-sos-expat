/**
 * Chatter Utils - Main Export
 */

// Code Generator
export {
  generateChatterClientCode,
  generateChatterRecruitmentCode,
  generateChatterProviderCode,
  normalizeForCode,
  isValidClientCode,
  isValidRecruitmentCode,
  isValidProviderCode,
  getClientCodeFromRecruitmentCode,
  normalizeCodeForLookup,
  findChatterByClientCode,
  findChatterByRecruitmentCode,
  findChatterByProviderCode,
  resolveChatterCode,
} from "./chatterCodeGenerator";

// Config Service
export {
  getChatterConfigCached,
  refreshChatterConfigCache,
  invalidateChatterConfigCache,
  getTop3Bonus,
  isCountrySupported,
  getMinimumWithdrawalAmount,
  areWithdrawalsEnabled,
  areRegistrationsEnabled,
  getValidationDelayMs,
  getReleaseDelayMs,
  // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
  getClientCallCommission,
  getN1CallCommission,
  getN2CallCommission,
  getActivationBonusAmount,
  getN1RecruitBonusAmount,
  getActivationCallsRequired,
  getProviderCallCommission,
  getProviderRecruitmentDurationMonths,
  getCaptainCallCommission,
} from "./chatterConfigService";

// Fraud Detection
export {
  hashIP,
  isEmailDomainBlocked,
  checkChatterRegistrationFraud,
  checkCommissionFraud,
  checkAutoSuspension,
  checkClickRateLimit,
  FraudCheckResult,
} from "./chatterFraudDetection";
