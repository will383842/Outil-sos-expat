/**
 * GroupAdmin Configuration Service
 *
 * Manages system-wide configuration for the GroupAdmin program.
 * Configuration is cached in memory and refreshed periodically.
 */

import { getFirestore, Timestamp, Firestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { GroupAdminConfig, DEFAULT_GROUP_ADMIN_CONFIG } from "./types";

const CONFIG_COLLECTION = "group_admin_config";
const CONFIG_DOC_ID = "current";

// Lazy Firestore initialization
let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!getApps().length) {
    initializeApp();
  }
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

// Cache configuration in memory (5 minute TTL)
let configCache: GroupAdminConfig | null = null;
let configCacheTimestamp: number = 0;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current GroupAdmin configuration
 * Uses memory cache to avoid repeated Firestore reads
 */
export async function getGroupAdminConfig(): Promise<GroupAdminConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (configCache && now - configCacheTimestamp < CONFIG_CACHE_TTL_MS) {
    return configCache;
  }

  try {
    const configDoc = await getDb().collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).get();

    if (configDoc.exists) {
      configCache = configDoc.data() as GroupAdminConfig;
    } else {
      // Create default config if it doesn't exist
      configCache = await initializeDefaultConfig();
    }

    configCacheTimestamp = now;
    return configCache;
  } catch (error) {
    console.error("[GroupAdminConfig] Error fetching config:", error);

    // Return cached config if available, otherwise return default
    if (configCache) {
      return configCache;
    }

    return {
      ...DEFAULT_GROUP_ADMIN_CONFIG,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    };
  }
}

/**
 * Initialize default configuration in Firestore
 */
async function initializeDefaultConfig(): Promise<GroupAdminConfig> {
  const config: GroupAdminConfig = {
    ...DEFAULT_GROUP_ADMIN_CONFIG,
    updatedAt: Timestamp.now(),
    updatedBy: "system",
  };

  await getDb().collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).set(config);
  console.log("[GroupAdminConfig] Default configuration initialized");

  return config;
}

/**
 * Update GroupAdmin configuration
 * @param updates Partial configuration updates
 * @param updatedBy Admin user ID making the update
 */
export async function updateGroupAdminConfig(
  updates: Partial<Omit<GroupAdminConfig, "id" | "updatedAt" | "updatedBy" | "version">>,
  updatedBy: string
): Promise<GroupAdminConfig> {
  const currentConfig = await getGroupAdminConfig();

  // Save config history before update (max 50 entries)
  const historyEntry = {
    changedAt: Timestamp.now(),
    changedBy: updatedBy,
    previousConfig: currentConfig,
  };
  const existingHistory = currentConfig.configHistory || [];

  const updatedConfig: GroupAdminConfig = {
    ...currentConfig,
    ...updates,
    version: currentConfig.version + 1,
    updatedAt: Timestamp.now(),
    updatedBy,
    configHistory: [historyEntry, ...existingHistory].slice(0, 50),
  };

  await getDb().collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).set(updatedConfig);

  // Invalidate cache
  configCache = updatedConfig;
  configCacheTimestamp = Date.now();

  console.log(`[GroupAdminConfig] Configuration updated to version ${updatedConfig.version} by ${updatedBy}`);

  return updatedConfig;
}

/**
 * Force refresh the configuration cache
 */
export async function refreshConfigCache(): Promise<GroupAdminConfig> {
  configCache = null;
  configCacheTimestamp = 0;
  return getGroupAdminConfig();
}

/**
 * Check if the GroupAdmin system is active
 */
export async function isGroupAdminSystemActive(): Promise<boolean> {
  const config = await getGroupAdminConfig();
  return config.isSystemActive;
}

/**
 * Check if new registrations are enabled
 */
export async function areNewRegistrationsEnabled(): Promise<boolean> {
  const config = await getGroupAdminConfig();
  return config.isSystemActive && config.newRegistrationsEnabled;
}

/**
 * Check if withdrawals are enabled
 */
export async function areWithdrawalsEnabled(): Promise<boolean> {
  const config = await getGroupAdminConfig();
  return config.isSystemActive && config.withdrawalsEnabled;
}

/**
 * Get client commission amount in cents (split by provider type)
 * Lawyer = $5, Expat = $3, fallback = $3
 */
export async function getClientCommissionAmount(providerType?: 'lawyer' | 'expat'): Promise<number> {
  const config = await getGroupAdminConfig();
  if (providerType === 'lawyer' && config.commissionClientAmountLawyer != null) {
    return config.commissionClientAmountLawyer;
  }
  if (providerType === 'expat' && config.commissionClientAmountExpat != null) {
    return config.commissionClientAmountExpat;
  }
  // New fallback: commissionClientCallAmount ($3) instead of old $10
  return config.commissionClientCallAmount ?? config.commissionClientAmountExpat ?? 300;
}

/**
 * Get N1 call commission amount in cents ($1 per N1 recruit's client call)
 */
export async function getN1CallAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.commissionN1CallAmount ?? 100;
}

/**
 * Get N2 call commission amount in cents ($0.50 per N2 recruit's client call)
 */
export async function getN2CallAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.commissionN2CallAmount ?? 50;
}

/**
 * Get activation bonus amount in cents ($5 when recruit makes 2 referrals)
 */
export async function getActivationBonusAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.commissionActivationBonusAmount ?? 500;
}

/**
 * Get N1 recruit bonus amount in cents ($1 when N1 recruits a N2)
 */
export async function getN1RecruitBonusAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.commissionN1RecruitBonusAmount ?? 100;
}

/**
 * Get activation calls required (number of referrals needed to trigger bonus)
 */
export async function getActivationCallsRequired(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.activationCallsRequired ?? 2;
}

/**
 * Get client discount amount in cents
 */
export async function getClientDiscountAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.clientDiscountAmount;
}

/**
 * Get payment mode (manual or automatic)
 */
export async function getPaymentMode(): Promise<"manual" | "automatic"> {
  const config = await getGroupAdminConfig();
  return config.paymentMode;
}

/**
 * Get minimum withdrawal amount in cents
 */
export async function getMinimumWithdrawalAmount(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.minimumWithdrawalAmount;
}

/**
 * Get validation hold period in days
 */
export async function getValidationHoldPeriodDays(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.validationHoldPeriodDays;
}

/**
 * Get recruitment commission window in months
 */
export async function getRecruitmentWindowMonths(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.recruitmentWindowMonths;
}

/**
 * Get leaderboard size
 */
export async function getLeaderboardSize(): Promise<number> {
  const config = await getGroupAdminConfig();
  return config.leaderboardSize;
}
