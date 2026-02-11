/**
 * Influencer Configuration Service
 *
 * Manages configuration for the influencer system:
 * - Caching for performance
 * - Default values
 * - Validation helpers
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  InfluencerConfig,
  InfluencerCommissionRule,
  InfluencerCapturedRates,
  InfluencerCommissionType,
  InfluencerLevel,
  InfluencerRateHistoryEntry,
  DEFAULT_INFLUENCER_CONFIG,
  DEFAULT_COMMISSION_RULES,
  DEFAULT_ANTI_FRAUD_CONFIG,
} from "../types";

// ============================================================================
// CACHE
// ============================================================================

let configCache: InfluencerConfig | null = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// GET CONFIG
// ============================================================================

/**
 * Get influencer config with caching
 */
export async function getInfluencerConfigCached(): Promise<InfluencerConfig> {
  const now = Date.now();

  // Return cached if valid
  if (configCache && now < cacheExpiry) {
    return configCache;
  }

  // Fetch from Firestore
  const db = getFirestore();
  const configDoc = await db.collection("influencer_config").doc("current").get();

  if (configDoc.exists) {
    configCache = configDoc.data() as InfluencerConfig;
  } else {
    // Initialize with defaults
    await initializeInfluencerConfig("system");
    configCache = {
      ...DEFAULT_INFLUENCER_CONFIG,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    } as InfluencerConfig;
  }

  cacheExpiry = now + CACHE_DURATION_MS;
  return configCache;
}

/**
 * Clear the config cache (call after updates)
 */
export function clearInfluencerConfigCache(): void {
  configCache = null;
  cacheExpiry = 0;
}

// ============================================================================
// INITIALIZE CONFIG
// ============================================================================

/**
 * Initialize influencer config with defaults
 */
export async function initializeInfluencerConfig(
  adminId: string
): Promise<InfluencerConfig> {
  const db = getFirestore();
  const configRef = db.collection("influencer_config").doc("current");
  const now = Timestamp.now();

  const config: InfluencerConfig = {
    ...DEFAULT_INFLUENCER_CONFIG,
    updatedAt: now,
    updatedBy: adminId,
  };

  await configRef.set(config);

  logger.info("[initializeInfluencerConfig] Config initialized", {
    adminId,
  });

  // Update cache
  configCache = config;
  cacheExpiry = Date.now() + CACHE_DURATION_MS;

  return config;
}

/**
 * Update influencer config
 */
export async function updateInfluencerConfig(
  updates: Partial<Omit<InfluencerConfig, "id" | "updatedAt" | "updatedBy">>,
  adminId: string
): Promise<InfluencerConfig> {
  const db = getFirestore();
  const configRef = db.collection("influencer_config").doc("current");

  // Get current config
  const current = await getInfluencerConfigCached();

  // Apply updates
  const newConfig: InfluencerConfig = {
    ...current,
    ...updates,
    version: current.version + 1,
    updatedAt: Timestamp.now(),
    updatedBy: adminId,
  };

  await configRef.set(newConfig);

  logger.info("[updateInfluencerConfig] Config updated", {
    adminId,
    version: newConfig.version,
    updates: Object.keys(updates),
  });

  // Clear cache
  clearInfluencerConfigCache();

  return newConfig;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if registrations are enabled
 */
export function areRegistrationsEnabled(config: InfluencerConfig): boolean {
  return config.isSystemActive && config.newRegistrationsEnabled;
}

/**
 * Get validation delay in milliseconds
 */
export function getValidationDelayMs(config: InfluencerConfig): number {
  return config.validationHoldPeriodDays * 24 * 60 * 60 * 1000;
}

/**
 * Get release delay in milliseconds
 */
export function getReleaseDelayMs(config: InfluencerConfig): number {
  return config.releaseDelayHours * 60 * 60 * 1000;
}

/**
 * Get recruitment window end date
 */
export function getRecruitmentWindowEnd(
  recruitmentDate: Date,
  config: InfluencerConfig
): Date {
  const endDate = new Date(recruitmentDate);
  endDate.setMonth(endDate.getMonth() + config.recruitmentWindowMonths);
  return endDate;
}

/**
 * Check if a recruitment is still within the commission window
 */
export function isRecruitmentActive(
  recruitmentDate: Date,
  config: InfluencerConfig
): boolean {
  const endDate = getRecruitmentWindowEnd(recruitmentDate, config);
  return new Date() < endDate;
}

/**
 * Get months remaining in recruitment window
 */
export function getRecruitmentMonthsRemaining(
  recruitmentDate: Date,
  config: InfluencerConfig
): number {
  const endDate = getRecruitmentWindowEnd(recruitmentDate, config);
  const now = new Date();

  if (now >= endDate) return 0;

  const diffMs = endDate.getTime() - now.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
  return Math.ceil(diffMonths);
}

// ============================================================================
// LEVEL & BONUS CALCULATIONS (aligned with Chatter system)
// ============================================================================

/**
 * Calculate level from total earnings
 */
export function calculateLevelFromEarnings(
  totalEarned: number,
  config: InfluencerConfig
): { level: InfluencerLevel; progress: number } {
  const thresholds = config.levelThresholds;

  if (totalEarned >= thresholds.level5) {
    return { level: 5, progress: 100 };
  }

  if (totalEarned >= thresholds.level4) {
    const progress =
      ((totalEarned - thresholds.level4) /
        (thresholds.level5 - thresholds.level4)) *
      100;
    return { level: 4, progress: Math.min(99, Math.floor(progress)) };
  }

  if (totalEarned >= thresholds.level3) {
    const progress =
      ((totalEarned - thresholds.level3) /
        (thresholds.level4 - thresholds.level3)) *
      100;
    return { level: 3, progress: Math.min(99, Math.floor(progress)) };
  }

  if (totalEarned >= thresholds.level2) {
    const progress =
      ((totalEarned - thresholds.level2) /
        (thresholds.level3 - thresholds.level2)) *
      100;
    return { level: 2, progress: Math.min(99, Math.floor(progress)) };
  }

  // Level 1
  const progress = thresholds.level2 > 0
    ? (totalEarned / thresholds.level2) * 100
    : 0;
  return { level: 1, progress: Math.min(99, Math.floor(progress)) };
}

/**
 * Get level bonus multiplier
 */
export function getLevelBonus(
  level: InfluencerLevel,
  config: InfluencerConfig
): number {
  return config.levelBonuses[`level${level}`];
}

/**
 * Get Top 3 bonus multiplier based on monthly rank
 */
export function getTop3Bonus(
  rank: number | null,
  config: InfluencerConfig
): number {
  if (!rank || rank > 3) {
    return 1.0;
  }

  switch (rank) {
    case 1:
      return config.top1BonusMultiplier;
    case 2:
      return config.top2BonusMultiplier;
    case 3:
      return config.top3BonusMultiplier;
    default:
      return 1.0;
  }
}

/**
 * Get streak bonus multiplier based on consecutive activity days
 */
export function getStreakBonusMultiplier(
  currentStreak: number,
  config: InfluencerConfig
): number {
  if (currentStreak >= 100) return config.streakBonuses.days100;
  if (currentStreak >= 30) return config.streakBonuses.days30;
  if (currentStreak >= 14) return config.streakBonuses.days14;
  if (currentStreak >= 7) return config.streakBonuses.days7;
  return 1.0;
}

/**
 * Calculate total commission with all bonuses
 */
export function calculateCommissionWithBonuses(
  baseAmount: number,
  levelBonus: number,
  top3Bonus: number,
  streakBonus: number,
  monthlyTopMultiplier: number = 1.0
): {
  amount: number;
  details: string;
} {
  // Apply bonuses multiplicatively
  const afterLevel = baseAmount * levelBonus;
  const afterTop3 = afterLevel * top3Bonus;
  const afterStreak = afterTop3 * streakBonus;
  const finalAmount = Math.round(afterStreak * monthlyTopMultiplier);

  // Build explanation
  const parts: string[] = [`Base: $${(baseAmount / 100).toFixed(2)}`];

  if (levelBonus > 1) {
    parts.push(`Level: +${Math.round((levelBonus - 1) * 100)}%`);
  }
  if (top3Bonus > 1) {
    parts.push(`Top 3: +${Math.round((top3Bonus - 1) * 100)}%`);
  }
  if (streakBonus > 1) {
    parts.push(`Streak: +${Math.round((streakBonus - 1) * 100)}%`);
  }
  if (monthlyTopMultiplier > 1) {
    parts.push(`Monthly Top: x${monthlyTopMultiplier.toFixed(2)}`);
  }

  parts.push(`Final: $${(finalAmount / 100).toFixed(2)}`);

  return {
    amount: finalAmount,
    details: parts.join(" | "),
  };
}

// ============================================================================
// V2: COMMISSION RULES
// ============================================================================

/**
 * Get commission rule by type
 */
export function getCommissionRule(
  config: InfluencerConfig,
  type: InfluencerCommissionType
): InfluencerCommissionRule | undefined {
  // V2: Use commissionRules if available
  if (config.commissionRules && config.commissionRules.length > 0) {
    return config.commissionRules.find((rule) => rule.type === type);
  }
  // Fallback to default rules
  return DEFAULT_COMMISSION_RULES.find((rule) => rule.type === type);
}

/**
 * Get all enabled commission rules
 */
export function getEnabledCommissionRules(
  config: InfluencerConfig
): InfluencerCommissionRule[] {
  const rules = config.commissionRules && config.commissionRules.length > 0
    ? config.commissionRules
    : DEFAULT_COMMISSION_RULES;
  return rules.filter((rule) => rule.enabled);
}

/**
 * Capture current rates for a new influencer (V2)
 * These rates are frozen at registration and never change
 */
export function captureCurrentRates(
  config: InfluencerConfig
): InfluencerCapturedRates {
  const rules = config.commissionRules && config.commissionRules.length > 0
    ? config.commissionRules
    : DEFAULT_COMMISSION_RULES;

  const capturedRules: InfluencerCapturedRates["rules"] = {};

  for (const rule of rules) {
    if (rule.enabled) {
      capturedRules[rule.type] = {
        calculationType: rule.calculationType,
        fixedAmount: rule.fixedAmount,
        percentageRate: rule.percentageRate,
        holdPeriodDays: rule.holdPeriodDays,
        releaseDelayHours: rule.releaseDelayHours,
      };
    }
  }

  return {
    capturedAt: Timestamp.now(),
    version: config.version,
    rules: capturedRules,
  };
}

/**
 * Update commission rules with history tracking (V2)
 */
export async function updateCommissionRules(
  newRules: InfluencerCommissionRule[],
  adminId: string,
  reason: string
): Promise<InfluencerConfig> {
  const db = getFirestore();
  const configRef = db.collection("influencer_config").doc("current");

  // Get current config
  const current = await getInfluencerConfigCached();

  // Create history entry
  const historyEntry: InfluencerRateHistoryEntry = {
    changedAt: Timestamp.now(),
    changedBy: adminId,
    previousRules: current.commissionRules || DEFAULT_COMMISSION_RULES,
    reason,
  };

  // Build new history array (keep last 50 entries)
  const newHistory = [historyEntry, ...(current.rateHistory || [])].slice(0, 50);

  // Update config
  const newConfig: InfluencerConfig = {
    ...current,
    commissionRules: newRules,
    rateHistory: newHistory,
    version: current.version + 1,
    updatedAt: Timestamp.now(),
    updatedBy: adminId,
  };

  await configRef.set(newConfig);

  logger.info("[updateCommissionRules] Rules updated", {
    adminId,
    version: newConfig.version,
    rulesCount: newRules.length,
    reason,
  });

  // Clear cache
  clearInfluencerConfigCache();

  return newConfig;
}

/**
 * Get rate history
 */
export async function getRateHistory(
  limit = 20
): Promise<InfluencerRateHistoryEntry[]> {
  const config = await getInfluencerConfigCached();
  return (config.rateHistory || []).slice(0, limit);
}

// ============================================================================
// V2: HOLD PERIOD HELPERS
// ============================================================================

/**
 * Get hold period for a specific commission type (V2)
 * Uses rule-specific hold period or falls back to config default
 */
export function getHoldPeriodForType(
  config: InfluencerConfig,
  type: InfluencerCommissionType,
  capturedRates?: InfluencerCapturedRates
): { holdPeriodDays: number; releaseDelayHours: number } {
  // Use captured rates if available (frozen at registration)
  if (capturedRates && capturedRates.rules[type]) {
    return {
      holdPeriodDays: capturedRates.rules[type]!.holdPeriodDays,
      releaseDelayHours: capturedRates.rules[type]!.releaseDelayHours,
    };
  }

  // Otherwise use current rule
  const rule = getCommissionRule(config, type);
  if (rule) {
    return {
      holdPeriodDays: rule.holdPeriodDays,
      releaseDelayHours: rule.releaseDelayHours,
    };
  }

  // Fallback to defaults
  return {
    holdPeriodDays: config.defaultHoldPeriodDays || config.validationHoldPeriodDays,
    releaseDelayHours: config.defaultReleaseDelayHours || config.releaseDelayHours,
  };
}

/**
 * Get hold period in milliseconds for a specific type
 */
export function getHoldPeriodMsForType(
  config: InfluencerConfig,
  type: InfluencerCommissionType,
  capturedRates?: InfluencerCapturedRates
): number {
  const { holdPeriodDays } = getHoldPeriodForType(config, type, capturedRates);
  return holdPeriodDays * 24 * 60 * 60 * 1000;
}

/**
 * Get release delay in milliseconds for a specific type
 */
export function getReleaseDelayMsForType(
  config: InfluencerConfig,
  type: InfluencerCommissionType,
  capturedRates?: InfluencerCapturedRates
): number {
  const { releaseDelayHours } = getHoldPeriodForType(config, type, capturedRates);
  return releaseDelayHours * 60 * 60 * 1000;
}

// ============================================================================
// V2: ANTI-FRAUD HELPERS
// ============================================================================

/**
 * Get anti-fraud configuration
 */
export function getAntiFraudConfig(config: InfluencerConfig) {
  return config.antiFraud || DEFAULT_ANTI_FRAUD_CONFIG;
}

/**
 * Check if anti-fraud is enabled
 * NOTE: Returns true by default for security
 */
export function isAntiFraudEnabled(config: InfluencerConfig): boolean {
  return config.antiFraud?.enabled ?? true;
}
