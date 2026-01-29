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
