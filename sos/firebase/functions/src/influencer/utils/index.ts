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
  // Level & Bonus calculations
  calculateLevelFromEarnings,
  getLevelBonus,
  getTop3Bonus,
  getStreakBonusMultiplier,
  calculateCommissionWithBonuses,
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
  generateClientReferralLink,
  generateRecruitmentLink,
  generateLinkWithUtm,
  isValidClientCode,
  isValidRecruitmentCode,
  extractClientCode,
  hashIP,
} from "./influencerCodeGenerator";
