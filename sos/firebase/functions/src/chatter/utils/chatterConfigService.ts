/**
 * Chatter Config Service
 *
 * Provides cached access to chatter configuration.
 * Similar pattern to affiliate configService.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ChatterConfig, DEFAULT_CHATTER_CONFIG } from "../types";

// Cache configuration
let cachedConfig: ChatterConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get chatter configuration with caching
 */
export async function getChatterConfigCached(): Promise<ChatterConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const db = getFirestore();
  const configDoc = await db.collection("chatter_config").doc("current").get();

  if (!configDoc.exists) {
    // Create default config if it doesn't exist
    logger.warn("[getChatterConfigCached] Config not found, creating default");

    const fullConfig: ChatterConfig = {
      ...DEFAULT_CHATTER_CONFIG,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    };

    await db.collection("chatter_config").doc("current").set(fullConfig);

    cachedConfig = fullConfig;
    cacheTimestamp = now;

    return fullConfig;
  }

  cachedConfig = configDoc.data() as ChatterConfig;
  cacheTimestamp = now;

  return cachedConfig;
}

/**
 * Force refresh the cached config
 */
export async function refreshChatterConfigCache(): Promise<ChatterConfig> {
  cachedConfig = null;
  cacheTimestamp = 0;
  return getChatterConfigCached();
}

/**
 * Invalidate the config cache
 */
export function invalidateChatterConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Calculate level from total earnings
 */
export function calculateLevelFromEarnings(
  totalEarned: number,
  config: ChatterConfig
): { level: 1 | 2 | 3 | 4 | 5; progress: number } {
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
  const progress = (totalEarned / thresholds.level2) * 100;
  return { level: 1, progress: Math.min(99, Math.floor(progress)) };
}

/**
 * Get level bonus multiplier
 */
export function getLevelBonus(
  level: 1 | 2 | 3 | 4 | 5,
  config: ChatterConfig
): number {
  return config.levelBonuses[`level${level}`];
}

/**
 * Get Top 3 bonus multiplier based on rank
 */
export function getTop3Bonus(
  rank: number | null,
  config: ChatterConfig
): number {
  if (!rank || rank > 3) {
    return 1.0; // No bonus
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
 * Check if chatter has active Zoom bonus
 */
export function hasActiveZoomBonus(
  lastZoomAttendance: Timestamp | null,
  config: ChatterConfig
): boolean {
  if (!lastZoomAttendance) {
    return false;
  }

  const now = Date.now();
  const attendanceTime = lastZoomAttendance.toMillis();
  const bonusDurationMs = config.zoomBonusDurationDays * 24 * 60 * 60 * 1000;

  return now - attendanceTime < bonusDurationMs;
}

/**
 * Get Zoom bonus multiplier
 */
export function getZoomBonus(
  lastZoomAttendance: Timestamp | null,
  config: ChatterConfig
): number {
  if (hasActiveZoomBonus(lastZoomAttendance, config)) {
    return config.zoomBonusMultiplier;
  }
  return 1.0;
}

/**
 * Calculate total commission with all bonuses
 */
export function calculateCommissionWithBonuses(
  baseAmount: number,
  levelBonus: number,
  top3Bonus: number,
  zoomBonus: number
): {
  amount: number;
  details: string;
} {
  // Apply bonuses multiplicatively
  const afterLevel = baseAmount * levelBonus;
  const afterTop3 = afterLevel * top3Bonus;
  const finalAmount = Math.round(afterTop3 * zoomBonus);

  // Build explanation
  const parts: string[] = [`Base: $${(baseAmount / 100).toFixed(2)}`];

  if (levelBonus > 1) {
    parts.push(`Level bonus: +${Math.round((levelBonus - 1) * 100)}%`);
  }
  if (top3Bonus > 1) {
    parts.push(`Top 3 bonus: +${Math.round((top3Bonus - 1) * 100)}%`);
  }
  if (zoomBonus > 1) {
    parts.push(`Zoom bonus: +${Math.round((zoomBonus - 1) * 100)}%`);
  }

  parts.push(`Final: $${(finalAmount / 100).toFixed(2)}`);

  return {
    amount: finalAmount,
    details: parts.join(" | "),
  };
}

/**
 * Check if a country is supported
 */
export function isCountrySupported(
  countryCode: string,
  config: ChatterConfig
): boolean {
  return config.supportedCountries.includes(countryCode.toUpperCase());
}

/**
 * Get minimum withdrawal amount
 */
export function getMinimumWithdrawalAmount(config: ChatterConfig): number {
  return config.minimumWithdrawalAmount;
}

/**
 * Check if withdrawals are enabled
 */
export function areWithdrawalsEnabled(config: ChatterConfig): boolean {
  return config.isSystemActive && config.withdrawalsEnabled;
}

/**
 * Check if new registrations are enabled
 */
export function areRegistrationsEnabled(config: ChatterConfig): boolean {
  return config.isSystemActive && config.newRegistrationsEnabled;
}

/**
 * Get commission validation delay (when pending becomes validated)
 */
export function getValidationDelayMs(config: ChatterConfig): number {
  return config.validationHoldPeriodHours * 60 * 60 * 1000;
}

/**
 * Get release delay (when validated becomes available)
 */
export function getReleaseDelayMs(config: ChatterConfig): number {
  return config.releaseDelayHours * 60 * 60 * 1000;
}

// ============================================================================
// NEW SIMPLIFIED COMMISSION SYSTEM (2026)
// ============================================================================

/**
 * Get the flash bonus multiplier (1.0 if not active or expired)
 */
export function getFlashBonusMultiplier(config: ChatterConfig): number {
  if (!config.flashBonusActive) {
    return 1.0;
  }

  // Check if flash bonus has expired
  if (config.flashBonusEndsAt) {
    const now = Date.now();
    const endsAt = config.flashBonusEndsAt.toMillis();
    if (now > endsAt) {
      return 1.0;
    }
  }

  return config.flashBonusMultiplier || 1.0;
}

/**
 * Get commission amount for a direct client call
 * Applies flash bonus multiplier if active
 */
export function getClientCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  let base: number;
  if (providerType === 'lawyer' && config.commissionClientCallAmountLawyer != null) {
    base = config.commissionClientCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionClientCallAmountExpat != null) {
    base = config.commissionClientCallAmountExpat;
  } else {
    base = config.commissionClientCallAmount || 300;
  }
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get commission amount for N1 referral call
 * Applies flash bonus multiplier if active
 */
export function getN1CallCommission(config: ChatterConfig): number {
  const base = config.commissionN1CallAmount || 100; // Default $1
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get commission amount for N2 referral call
 * Applies flash bonus multiplier if active
 */
export function getN2CallCommission(config: ChatterConfig): number {
  const base = config.commissionN2CallAmount || 50; // Default $0.50
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get activation bonus amount (after referral's 2nd call)
 * Applies flash bonus multiplier if active
 */
export function getActivationBonusAmount(config: ChatterConfig): number {
  const base = config.commissionActivationBonusAmount || 500; // Default $5
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get N1 recruit bonus amount (when N1 recruits someone who activates)
 * Applies flash bonus multiplier if active
 */
export function getN1RecruitBonusAmount(config: ChatterConfig): number {
  const base = config.commissionN1RecruitBonusAmount || 100; // Default $1
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get the number of calls required for activation
 */
export function getActivationCallsRequired(config: ChatterConfig): number {
  return config.activationCallsRequired || 2;
}

/**
 * Get commission amount for recruited provider's call
 * Applies flash bonus multiplier if active
 */
export function getProviderCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  let base: number;
  if (providerType === 'lawyer' && config.commissionProviderCallAmountLawyer != null) {
    base = config.commissionProviderCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionProviderCallAmountExpat != null) {
    base = config.commissionProviderCallAmountExpat;
  } else {
    base = config.commissionProviderCallAmount || 500;
  }
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get commission amount for captain chatter calls (N1/N2 of captain)
 * Flash bonus is applied when active (same as regular chatters)
 */
export function getCaptainCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  let base: number;
  if (providerType === 'lawyer' && config.commissionCaptainCallAmountLawyer != null) {
    base = config.commissionCaptainCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionCaptainCallAmountExpat != null) {
    base = config.commissionCaptainCallAmountExpat;
  } else {
    base = config.commissionCaptainCallAmountLawyer ?? 300;
  }
  const flashMultiplier = getFlashBonusMultiplier(config);
  return Math.round(base * flashMultiplier);
}

/**
 * Get the duration (in months) for provider recruitment commission
 */
export function getProviderRecruitmentDurationMonths(config: ChatterConfig): number {
  return config.providerRecruitmentDurationMonths || 6;
}

/**
 * Get streak bonus multiplier based on current streak days
 *
 * Streak bonuses reward consecutive activity days:
 * - 7+ days: 1.05x (5% bonus)
 * - 14+ days: 1.10x (10% bonus)
 * - 30+ days: 1.20x (20% bonus)
 * - 100+ days: 1.50x (50% bonus)
 *
 * Returns 1.0 (no bonus) for streaks under 7 days.
 */
export function getStreakBonusMultiplier(
  currentStreak: number,
  config: ChatterConfig
): number {
  // No bonus for streaks under 7 days
  if (currentStreak < 7) {
    return 1.0;
  }

  const bonuses = config.streakBonuses || {
    days7: 1.05,
    days14: 1.10,
    days30: 1.20,
    days100: 1.50,
  };

  // Return the highest applicable bonus
  if (currentStreak >= 100) {
    return bonuses.days100;
  }
  if (currentStreak >= 30) {
    return bonuses.days30;
  }
  if (currentStreak >= 14) {
    return bonuses.days14;
  }

  return bonuses.days7;
}
