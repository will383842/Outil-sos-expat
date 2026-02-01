/**
 * Chatter Utils - Main Export
 */

// Code Generator
export {
  generateChatterClientCode,
  generateChatterRecruitmentCode,
  normalizeForCode,
  isValidClientCode,
  isValidRecruitmentCode,
  getClientCodeFromRecruitmentCode,
  normalizeCodeForLookup,
  findChatterByClientCode,
  findChatterByRecruitmentCode,
  resolveChatterCode,
} from "./chatterCodeGenerator";

// Config Service
export {
  getChatterConfigCached,
  refreshChatterConfigCache,
  invalidateChatterConfigCache,
  calculateLevelFromEarnings,
  getLevelBonus,
  getTop3Bonus,
  hasActiveZoomBonus,
  getZoomBonus,
  calculateCommissionWithBonuses,
  isCountrySupported,
  getMinimumWithdrawalAmount,
  areWithdrawalsEnabled,
  areRegistrationsEnabled,
  getValidationDelayMs,
  getReleaseDelayMs,
  // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
  getFlashBonusMultiplier,
  getClientCallCommission,
  getN1CallCommission,
  getN2CallCommission,
  getActivationBonusAmount,
  getN1RecruitBonusAmount,
  getActivationCallsRequired,
  getProviderCallCommission,
  getProviderRecruitmentDurationMonths,
  getStreakBonusMultiplier,
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
