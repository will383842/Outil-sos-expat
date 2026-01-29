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
import { InfluencerConfig, DEFAULT_INFLUENCER_CONFIG } from "../types";

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
