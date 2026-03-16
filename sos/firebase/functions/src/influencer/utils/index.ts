/**
 * Influencer Utils - Main Export
 */

export {
  getInfluencerConfigCached,
  clearInfluencerConfigCache,
  initializeInfluencerConfig,
  updateInfluencerConfig,
  areRegistrationsEnabled,
  getValidationDelayMs,
  getReleaseDelayMs,
  getRecruitmentWindowEnd,
  isRecruitmentActive,
  getRecruitmentMonthsRemaining,
  // Top 3 bonus calculation
  getTop3Bonus,
  // V2 exports
  getCommissionRule,
  getEnabledCommissionRules,
  captureCurrentRates,
  updateCommissionRules,
  getRateHistory,
  getHoldPeriodForType,
  getHoldPeriodMsForType,
  getReleaseDelayMsForType,
  getAntiFraudConfig,
  isAntiFraudEnabled,
} from "./influencerConfigService";

export {
  generateClientCode,
  generateRecruitmentCode,
  generateProviderCode,
  findInfluencerByProviderCode,
  generateClientReferralLink,
  generateRecruitmentLink,
  generateLinkWithUtm,
  isValidClientCode,
  isValidRecruitmentCode,
  isValidProviderCode,
  extractClientCode,
  hashIP,
} from "./influencerCodeGenerator";
