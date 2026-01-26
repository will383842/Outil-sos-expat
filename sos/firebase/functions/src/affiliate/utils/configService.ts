/**
 * Affiliate Config Service
 *
 * Manages the affiliate configuration with caching for performance.
 * Config is stored in Firestore: affiliate_config/current
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { AffiliateConfig, DEFAULT_AFFILIATE_CONFIG } from "../types";

// Cache configuration
let configCache: AffiliateConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the affiliate configuration from Firestore
 * Always fetches fresh from database (use getAffiliateConfigCached for caching)
 */
export async function getAffiliateConfig(): Promise<AffiliateConfig> {
  const db = getFirestore();

  try {
    const docRef = db.collection("affiliate_config").doc("current");
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn(
        "[AffiliateConfig] Config not found, initializing with defaults"
      );
      return await initializeAffiliateConfig();
    }

    const data = docSnap.data() as AffiliateConfig;

    // Update cache
    configCache = data;
    cacheTimestamp = Date.now();

    return data;
  } catch (error) {
    logger.error("[AffiliateConfig] Error fetching config", { error });
    throw new Error("Failed to fetch affiliate configuration");
  }
}

/**
 * Get the affiliate configuration with caching
 * Returns cached version if still valid, otherwise fetches fresh
 */
export async function getAffiliateConfigCached(): Promise<AffiliateConfig> {
  const now = Date.now();

  // Return cached if valid
  if (configCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return configCache;
  }

  // Fetch fresh
  return await getAffiliateConfig();
}

/**
 * Clear the config cache
 * Call this after updating configuration
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
  logger.info("[AffiliateConfig] Cache cleared");
}

/**
 * Initialize the affiliate configuration with defaults
 * Creates the config document if it doesn't exist
 */
export async function initializeAffiliateConfig(): Promise<AffiliateConfig> {
  const db = getFirestore();
  const docRef = db.collection("affiliate_config").doc("current");

  try {
    // Check if already exists
    const existing = await docRef.get();
    if (existing.exists) {
      logger.info("[AffiliateConfig] Config already exists");
      return existing.data() as AffiliateConfig;
    }

    // Create with defaults
    const config: AffiliateConfig = {
      ...DEFAULT_AFFILIATE_CONFIG,
      rateHistory: [],
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    };

    await docRef.set(config);

    logger.info("[AffiliateConfig] Initialized with default configuration");

    // Update cache
    configCache = config;
    cacheTimestamp = Date.now();

    return config;
  } catch (error) {
    logger.error("[AffiliateConfig] Error initializing config", { error });
    throw new Error("Failed to initialize affiliate configuration");
  }
}

/**
 * Update the affiliate configuration
 * Records history and clears cache
 */
export async function updateAffiliateConfig(
  updates: Partial<
    Omit<
      AffiliateConfig,
      "id" | "version" | "rateHistory" | "updatedAt" | "updatedBy"
    >
  >,
  updatedBy: string,
  updatedByEmail: string,
  reason: string
): Promise<AffiliateConfig> {
  const db = getFirestore();
  const docRef = db.collection("affiliate_config").doc("current");

  try {
    // Get current config
    const current = await getAffiliateConfig();

    // Create history entry
    const historyEntry = {
      changedAt: Timestamp.now(),
      changedBy: updatedBy,
      changedByEmail: updatedByEmail,
      previousRates: {
        defaultRates: current.defaultRates,
        commissionRules: current.commissionRules,
        withdrawal: current.withdrawal,
      },
      newRates: {
        defaultRates: updates.defaultRates || current.defaultRates,
        commissionRules: updates.commissionRules || current.commissionRules,
        withdrawal: updates.withdrawal || current.withdrawal,
      },
      reason,
    };

    // Prepare update
    const updatedConfig: Partial<AffiliateConfig> = {
      ...updates,
      version: current.version + 1,
      rateHistory: [...current.rateHistory, historyEntry].slice(-50), // Keep last 50 changes
      updatedAt: Timestamp.now(),
      updatedBy,
    };

    await docRef.update(updatedConfig);

    // Clear cache
    clearConfigCache();

    logger.info("[AffiliateConfig] Configuration updated", {
      version: current.version + 1,
      updatedBy,
      reason,
    });

    // Return fresh config
    return await getAffiliateConfig();
  } catch (error) {
    logger.error("[AffiliateConfig] Error updating config", {
      error,
      updatedBy,
    });
    throw new Error("Failed to update affiliate configuration");
  }
}

/**
 * Get a specific commission rule from config
 */
export async function getCommissionRule(
  actionType: keyof AffiliateConfig["commissionRules"]
) {
  const config = await getAffiliateConfigCached();
  return config.commissionRules[actionType];
}

/**
 * Check if the affiliate system is active
 */
export async function isAffiliateSystemActive(): Promise<boolean> {
  try {
    const config = await getAffiliateConfigCached();
    return config.isSystemActive;
  } catch {
    logger.warn("[AffiliateConfig] Failed to check system status");
    return false;
  }
}

/**
 * Check if withdrawals are enabled
 */
export async function areWithdrawalsEnabled(): Promise<boolean> {
  try {
    const config = await getAffiliateConfigCached();
    return config.withdrawalsEnabled;
  } catch {
    return false;
  }
}

/**
 * Check if new affiliates are accepted
 */
export async function areNewAffiliatesEnabled(): Promise<boolean> {
  try {
    const config = await getAffiliateConfigCached();
    return config.newAffiliatesEnabled;
  } catch {
    return true; // Default to enabled if config fails
  }
}

/**
 * Get withdrawal settings
 */
export async function getWithdrawalSettings(): Promise<
  AffiliateConfig["withdrawal"]
> {
  const config = await getAffiliateConfigCached();
  return config.withdrawal;
}

/**
 * Get anti-fraud settings
 */
export async function getAntiFraudSettings(): Promise<
  AffiliateConfig["antiFraud"]
> {
  const config = await getAffiliateConfigCached();
  return config.antiFraud;
}

/**
 * Get attribution settings
 */
export async function getAttributionSettings(): Promise<
  AffiliateConfig["attribution"]
> {
  const config = await getAffiliateConfigCached();
  return config.attribution;
}
