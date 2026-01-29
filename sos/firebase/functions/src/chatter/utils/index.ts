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
