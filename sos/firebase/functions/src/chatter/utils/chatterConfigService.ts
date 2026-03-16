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
 * Get commission amount for a direct client call
 * lockedRates take absolute priority over config when present
 * Note: All multipliers have been permanently removed.
 */
export function getClientCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat', lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  let base: number;
  // PRIORITY 1: Individual admin overrides
  if (individualRates) {
    if (providerType === 'lawyer' && individualRates.commissionClientCallAmountLawyer != null) {
      return Math.round(individualRates.commissionClientCallAmountLawyer);
    } else if (providerType === 'expat' && individualRates.commissionClientCallAmountExpat != null) {
      return Math.round(individualRates.commissionClientCallAmountExpat);
    } else if (individualRates.commissionClientCallAmount != null) {
      return Math.round(individualRates.commissionClientCallAmount);
    }
  }
  // PRIORITY 2: Locked rates (lifetime rate lock)
  if (lockedRates) {
    if (providerType === 'lawyer' && lockedRates.commissionClientCallAmountLawyer != null) {
      base = lockedRates.commissionClientCallAmountLawyer;
    } else if (providerType === 'expat' && lockedRates.commissionClientCallAmountExpat != null) {
      base = lockedRates.commissionClientCallAmountExpat;
    } else if (lockedRates.commissionClientCallAmount != null) {
      base = lockedRates.commissionClientCallAmount;
    } else {
      // Locked rates exist but this specific key is missing — fall through to config
      base = getClientCallBase(config, providerType);
    }
  } else {
    base = getClientCallBase(config, providerType);
  }
  return Math.round(base);
}

function getClientCallBase(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  if (providerType === 'lawyer' && config.commissionClientCallAmountLawyer != null) {
    return config.commissionClientCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionClientCallAmountExpat != null) {
    return config.commissionClientCallAmountExpat;
  }
  return config.commissionClientCallAmount || 300;
}

/**
 * Get commission amount for N1 referral call
 * Applies flash bonus multiplier if active
 */
export function getN1CallCommission(config: ChatterConfig, lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  const base = individualRates?.commissionN1CallAmount ?? lockedRates?.commissionN1CallAmount ?? config.commissionN1CallAmount ?? 100;
  return Math.round(base);
}

/**
 * Get commission amount for N2 referral call
 * Applies flash bonus multiplier if active
 */
export function getN2CallCommission(config: ChatterConfig, lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  const base = individualRates?.commissionN2CallAmount ?? lockedRates?.commissionN2CallAmount ?? config.commissionN2CallAmount ?? 50;
  return Math.round(base);
}

/**
 * Get activation bonus amount (after referral's 2nd call)
 * Applies flash bonus multiplier if active
 */
export function getActivationBonusAmount(config: ChatterConfig, lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  const base = individualRates?.commissionActivationBonusAmount ?? lockedRates?.commissionActivationBonusAmount ?? config.commissionActivationBonusAmount ?? 500;
  return Math.round(base);
}

/**
 * Get N1 recruit bonus amount (when N1 recruits someone who activates)
 * Applies flash bonus multiplier if active
 */
export function getN1RecruitBonusAmount(config: ChatterConfig, lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  const base = individualRates?.commissionN1RecruitBonusAmount ?? lockedRates?.commissionN1RecruitBonusAmount ?? config.commissionN1RecruitBonusAmount ?? 100;
  return Math.round(base);
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
export function getProviderCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat', lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  let base: number;
  // PRIORITY 1: Individual admin overrides
  if (individualRates) {
    if (providerType === 'lawyer' && individualRates.commissionProviderCallAmountLawyer != null) {
      return Math.round(individualRates.commissionProviderCallAmountLawyer);
    } else if (providerType === 'expat' && individualRates.commissionProviderCallAmountExpat != null) {
      return Math.round(individualRates.commissionProviderCallAmountExpat);
    } else if (individualRates.commissionProviderCallAmount != null) {
      return Math.round(individualRates.commissionProviderCallAmount);
    }
  }
  // PRIORITY 2: Locked rates (lifetime rate lock)
  if (lockedRates) {
    if (providerType === 'lawyer' && lockedRates.commissionProviderCallAmountLawyer != null) {
      base = lockedRates.commissionProviderCallAmountLawyer;
    } else if (providerType === 'expat' && lockedRates.commissionProviderCallAmountExpat != null) {
      base = lockedRates.commissionProviderCallAmountExpat;
    } else if (lockedRates.commissionProviderCallAmount != null) {
      base = lockedRates.commissionProviderCallAmount;
    } else {
      base = getProviderCallBase(config, providerType);
    }
  } else {
    base = getProviderCallBase(config, providerType);
  }
  return Math.round(base);
}

function getProviderCallBase(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  if (providerType === 'lawyer' && config.commissionProviderCallAmountLawyer != null) {
    return config.commissionProviderCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionProviderCallAmountExpat != null) {
    return config.commissionProviderCallAmountExpat;
  }
  return config.commissionProviderCallAmount || 500;
}

/**
 * Get commission amount for captain chatter calls (N1/N2 of captain)
 * Flash bonus is applied when active (same as regular chatters)
 */
export function getCaptainCallCommission(config: ChatterConfig, providerType?: 'lawyer' | 'expat', lockedRates?: Record<string, number> | null, individualRates?: Record<string, number> | null): number {
  let base: number;
  // PRIORITY 1: Individual admin overrides
  if (individualRates) {
    if (providerType === 'lawyer' && individualRates.commissionCaptainCallAmountLawyer != null) {
      return Math.round(individualRates.commissionCaptainCallAmountLawyer);
    } else if (providerType === 'expat' && individualRates.commissionCaptainCallAmountExpat != null) {
      return Math.round(individualRates.commissionCaptainCallAmountExpat);
    } else if (individualRates.commissionCaptainCallAmount != null) {
      return Math.round(individualRates.commissionCaptainCallAmount);
    }
  }
  // PRIORITY 2: Locked rates (lifetime rate lock)
  if (lockedRates) {
    if (providerType === 'lawyer' && lockedRates.commissionCaptainCallAmountLawyer != null) {
      base = lockedRates.commissionCaptainCallAmountLawyer;
    } else if (providerType === 'expat' && lockedRates.commissionCaptainCallAmountExpat != null) {
      base = lockedRates.commissionCaptainCallAmountExpat;
    } else {
      // BUG FIX: was using commissionClientCallAmount, should fall through to config
      base = getCaptainCallBase(config, providerType);
    }
  } else {
    base = getCaptainCallBase(config, providerType);
  }
  return Math.round(base);
}

function getCaptainCallBase(config: ChatterConfig, providerType?: 'lawyer' | 'expat'): number {
  if (providerType === 'lawyer' && config.commissionCaptainCallAmountLawyer != null) {
    return config.commissionCaptainCallAmountLawyer;
  } else if (providerType === 'expat' && config.commissionCaptainCallAmountExpat != null) {
    return config.commissionCaptainCallAmountExpat;
  }
  if (providerType === 'expat') {
    return config.commissionCaptainCallAmountExpat ?? 200;
  }
  return config.commissionCaptainCallAmountLawyer ?? 300;
}

/**
 * Get the duration (in months) for provider recruitment commission
 */
export function getProviderRecruitmentDurationMonths(config: ChatterConfig): number {
  return config.providerRecruitmentDurationMonths || 6;
}

