/**
 * Affiliate Utils - Barrel Export
 *
 * Re-exports all utility functions for the affiliate system.
 */

// Code generation
export {
  generateAffiliateCode,
  isValidAffiliateCode,
  normalizeAffiliateCode,
  resolveAffiliateCode,
  reserveAffiliateCode,
} from "./codeGenerator";

// Commission calculation
export {
  calculateCommission,
  formatCents,
  validateCommissionAmount,
  shouldCreateCommission,
  getBaseAmountForRule,
  CommissionCalculationResult,
} from "./commissionCalculator";

// Fraud detection
export {
  checkReferralFraud,
  getPendingFraudAlertsCount,
  resolveFraudAlert,
  FraudCheckResult,
  FraudIssue,
} from "./fraudDetection";

// Config service
export {
  getAffiliateConfig,
  getAffiliateConfigCached,
  clearConfigCache,
  initializeAffiliateConfig,
} from "./configService";

// Bank details encryption
export {
  encryptBankDetails,
  decryptBankDetails,
  maskBankAccount,
} from "./bankDetailsEncryption";
