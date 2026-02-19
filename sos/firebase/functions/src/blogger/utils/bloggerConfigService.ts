/**
 * Blogger Config Service
 *
 * Handles configuration access with caching for the blogger module.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { BloggerConfig, DEFAULT_BLOGGER_CONFIG } from "../types";

// ============================================================================
// CACHE
// ============================================================================

let configCache: BloggerConfig | null = null;
let configCacheTime: number = 0;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CONFIG ACCESS
// ============================================================================

/**
 * Get blogger configuration with caching
 */
export async function getBloggerConfigCached(): Promise<BloggerConfig> {
  const now = Date.now();

  // Return cached config if valid
  if (configCache && now - configCacheTime < CONFIG_CACHE_TTL_MS) {
    return configCache;
  }

  // Fetch from Firestore
  const db = getFirestore();
  const configDoc = await db.collection("blogger_config").doc("current").get();

  if (configDoc.exists) {
    configCache = configDoc.data() as BloggerConfig;
    configCacheTime = now;
    return configCache;
  }

  // Return default config if not found
  logger.warn("[getBloggerConfigCached] Config not found, using defaults");
  return {
    ...DEFAULT_BLOGGER_CONFIG,
    updatedAt: Timestamp.now(),
    updatedBy: "system",
  };
}

/**
 * Clear config cache (call after updating config)
 */
export function clearBloggerConfigCache(): void {
  configCache = null;
  configCacheTime = 0;
}

/**
 * Initialize config if it doesn't exist
 */
export async function initializeBloggerConfig(): Promise<void> {
  const db = getFirestore();
  const configRef = db.collection("blogger_config").doc("current");
  const configDoc = await configRef.get();

  if (!configDoc.exists) {
    const now = Timestamp.now();
    await configRef.set({
      ...DEFAULT_BLOGGER_CONFIG,
      updatedAt: now,
      updatedBy: "system",
    });
    logger.info("[initializeBloggerConfig] Config initialized with defaults");
  }
}

/**
 * Update blogger configuration
 */
export async function updateBloggerConfig(
  updates: Partial<BloggerConfig>,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const configRef = db.collection("blogger_config").doc("current");
    const currentConfig = await configRef.get();

    if (!currentConfig.exists) {
      await initializeBloggerConfig();
    }

    const currentData = (await configRef.get()).data() as BloggerConfig;

    // Save config history before update (max 50 entries)
    const historyEntry = {
      changedAt: Timestamp.now(),
      changedBy: adminId,
      previousConfig: currentData,
    };
    const existingHistory = Array.isArray(currentData.configHistory) ? currentData.configHistory : [];
    const configHistory = [historyEntry, ...existingHistory].slice(0, 50);

    await configRef.update({
      ...updates,
      version: currentData.version + 1,
      updatedAt: Timestamp.now(),
      updatedBy: adminId,
      configHistory,
    });

    // Clear cache
    clearBloggerConfigCache();

    logger.info("[updateBloggerConfig] Config updated", {
      updates: Object.keys(updates),
      adminId,
    });

    return { success: true };
  } catch (error) {
    logger.error("[updateBloggerConfig] Error", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update config",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get validation delay in milliseconds
 */
export function getValidationDelayMs(config: BloggerConfig): number {
  return config.validationHoldPeriodDays * 24 * 60 * 60 * 1000;
}

/**
 * Get release delay in milliseconds
 */
export function getReleaseDelayMs(config: BloggerConfig): number {
  return config.releaseDelayHours * 60 * 60 * 1000;
}

/**
 * Get commission amount for a type
 */
export function getCommissionAmount(
  type: "client_referral" | "recruitment",
  config: BloggerConfig
): number {
  switch (type) {
    case "client_referral":
      return config.commissionClientAmount;
    case "recruitment":
      return config.commissionRecruitmentAmount;
    default:
      return 0;
  }
}
