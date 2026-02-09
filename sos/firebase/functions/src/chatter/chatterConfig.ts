/**
 * Chatter Config - Firestore Collection Schema and Management
 *
 * This module manages the chatter_config collection with settings for:
 * - Anti-fraud thresholds
 * - Commission/gains amounts
 * - Tier bonuses for filleul milestones
 * - Monthly top performer rewards
 * - Flash bonus promotions
 *
 * Collection: chatter_config/settings
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Flash bonus configuration for temporary promotions
 */
export interface FlashBonusConfig {
  /** Whether flash bonus is currently active */
  enabled: boolean;
  /** Multiplier for commissions during flash bonus (default: 2 = double) */
  multiplier: number;
  /** When the flash bonus ends (null if not set or ended) */
  endsAt: Timestamp | null;
}

/**
 * Chatter Config interface for the settings document
 * Collection: chatter_config/settings
 */
export interface ChatterConfigSettings {
  /** Document ID (always "settings") */
  id: "settings";

  /**
   * Anti-fraud thresholds
   */
  thresholds: {
    /** Minimum calls to be considered "active" (default: 2) */
    activeMinCalls: number;
    /** Days of inactivity before alert is triggered (default: 7) */
    inactiveAlertDays: number;
    /** Maximum referrals allowed per hour (anti-fraud, default: 5) */
    maxReferralsPerHour: number;
    /** Maximum accounts allowed from same IP (anti-fraud, default: 3) */
    maxAccountsPerIP: number;
  };

  /**
   * Commission/gains amounts (all in cents)
   */
  gains: {
    /** Commission for chatter's own client call (default: 1000 = $10) */
    clientCall: number;
    /** Commission for N1 filleul's call (default: 100 = $1) */
    n1Call: number;
    /** Commission for N2 filleul's call (default: 50 = $0.50) */
    n2Call: number;
    /** Bonus when chatter activates (after 2nd call, default: 500 = $5) */
    activationBonus: number;
    /** Bonus when N1 recruits someone who activates (default: 100 = $1) */
    n1RecruitBonus: number;
  };

  /**
   * Tier bonuses for filleul milestones (amounts in cents)
   * Key is number of qualified filleuls, value is bonus amount
   * A filleul is "qualified" when they have earned $20+ in direct commissions
   */
  tierBonuses: {
    5: number;    // Default: 1500 ($15)
    10: number;   // Default: 3500 ($35)
    20: number;   // Default: 7500 ($75)
    50: number;   // Default: 25000 ($250)
    100: number;  // Default: 60000 ($600)
    500: number;  // Default: 400000 ($4000)
  };

  /**
   * Minimum direct earnings (cents) for a filleul to be counted as "qualified"
   * This excludes referral earnings - only counts direct client commissions
   */
  qualifiedFilleulThreshold: number;

  /**
   * Monthly top performer rewards (MULTIPLIERS, not amounts)
   * Applied to commissions earned during the following month
   * Key is rank (1, 2, 3), value is multiplier (2.0 = double, 1.5 = +50%, etc.)
   */
  monthlyTop: {
    1: number;  // Default: 2.0 (commissions doubled)
    2: number;  // Default: 1.5 (commissions +50%)
    3: number;  // Default: 1.15 (commissions +15%)
  };

  /**
   * Flash bonus configuration for temporary promotions
   */
  flashBonus: FlashBonusConfig;

  /** Config version (incremented on each update) */
  version: number;

  /** Last update timestamp */
  updatedAt: Timestamp;

  /** Who last updated (user ID or "system") */
  updatedBy: string;

  /** When the config was created */
  createdAt: Timestamp;
}

/**
 * Default configuration values
 */
export const DEFAULT_CHATTER_CONFIG_SETTINGS: Omit<
  ChatterConfigSettings,
  "updatedAt" | "updatedBy" | "createdAt"
> = {
  id: "settings",

  thresholds: {
    activeMinCalls: 2,
    inactiveAlertDays: 7,
    maxReferralsPerHour: 5,
    maxAccountsPerIP: 3,
  },

  gains: {
    clientCall: 1000,      // $10
    n1Call: 100,           // $1
    n2Call: 50,            // $0.50
    activationBonus: 500,  // $5
    n1RecruitBonus: 100,   // $1
  },

  tierBonuses: {
    5: 1500,       // $15
    10: 3500,      // $35
    20: 7500,      // $75
    50: 25000,     // $250
    100: 60000,    // $600
    500: 400000,   // $4000
  },

  qualifiedFilleulThreshold: 2000, // $20 - filleul must earn this much in direct commissions

  // Monthly top rewards: commission multipliers for next month (not cash)
  // Top 1: 2.0 = commissions doubled (100% bonus)
  // Top 2: 1.5 = commissions +50%
  // Top 3: 1.15 = commissions +15%
  monthlyTop: {
    1: 2.0,   // 2x commissions next month
    2: 1.5,   // 1.5x commissions next month
    3: 1.15,  // 1.15x commissions next month
  },

  flashBonus: {
    enabled: false,
    multiplier: 2,
    endsAt: null,
  },

  version: 1,
};

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// CACHE
// ============================================================================

let cachedConfigSettings: ChatterConfigSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the config cache
 */
export function invalidateChatterConfigSettingsCache(): void {
  cachedConfigSettings = null;
  cacheTimestamp = 0;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current chatter config with defaults if not set
 * Uses caching for performance (5 minute TTL)
 *
 * @returns Promise<ChatterConfigSettings>
 */
export async function getChatterConfig(): Promise<ChatterConfigSettings> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfigSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfigSettings;
  }

  const db = getDb();
  const configRef = db.collection("chatter_config").doc("settings");

  try {
    const doc = await configRef.get();

    if (!doc.exists) {
      logger.info("[getChatterConfig] Config not found, creating default");

      // Create default config
      const defaultConfig = await initializeChatterConfig();
      cachedConfigSettings = defaultConfig;
      cacheTimestamp = now;

      return defaultConfig;
    }

    const data = doc.data() as ChatterConfigSettings;

    // Update cache
    cachedConfigSettings = data;
    cacheTimestamp = now;

    return data;
  } catch (error) {
    logger.error("[getChatterConfig] Error fetching config:", error);

    // Return defaults on error (but don't cache)
    return {
      ...DEFAULT_CHATTER_CONFIG_SETTINGS,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
      createdAt: Timestamp.now(),
    };
  }
}

/**
 * Update chatter config (partial update supported)
 * Admin only - requires authentication check before calling
 *
 * @param data - Partial config data to update
 * @param updatedBy - User ID who is making the update
 * @returns Promise<ChatterConfigSettings> - Updated config
 */
export async function updateChatterConfig(
  data: Partial<Omit<ChatterConfigSettings, "id" | "version" | "updatedAt" | "updatedBy" | "createdAt">>,
  updatedBy: string
): Promise<ChatterConfigSettings> {
  const db = getDb();
  const configRef = db.collection("chatter_config").doc("settings");

  try {
    // Get current config
    const currentConfig = await getChatterConfig();

    // Merge updates with current config
    const updatedConfig: Partial<ChatterConfigSettings> = {
      ...data,
      version: currentConfig.version + 1,
      updatedAt: Timestamp.now(),
      updatedBy,
    };

    // Perform partial update
    await configRef.update(updatedConfig);

    // Invalidate cache
    invalidateChatterConfigSettingsCache();

    // Fetch and return updated config
    const newConfig = await getChatterConfig();

    logger.info("[updateChatterConfig] Config updated successfully", {
      version: newConfig.version,
      updatedBy,
    });

    return newConfig;
  } catch (error) {
    logger.error("[updateChatterConfig] Error updating config:", error);
    throw error;
  }
}

/**
 * Initialize default chatter config if it doesn't exist
 * Safe to call multiple times - only creates if missing
 *
 * @returns Promise<ChatterConfigSettings> - The config (existing or newly created)
 */
export async function initializeChatterConfig(): Promise<ChatterConfigSettings> {
  const db = getDb();
  const configRef = db.collection("chatter_config").doc("settings");

  try {
    const existingDoc = await configRef.get();

    if (existingDoc.exists) {
      logger.info("[initializeChatterConfig] Config already exists, skipping");
      return existingDoc.data() as ChatterConfigSettings;
    }

    // Create default config
    const now = Timestamp.now();
    const fullConfig: ChatterConfigSettings = {
      ...DEFAULT_CHATTER_CONFIG_SETTINGS,
      updatedAt: now,
      updatedBy: "system",
      createdAt: now,
    };

    await configRef.set(fullConfig);

    logger.info("[initializeChatterConfig] Created default config", {
      version: fullConfig.version,
    });

    // Update cache
    cachedConfigSettings = fullConfig;
    cacheTimestamp = Date.now();

    return fullConfig;
  } catch (error) {
    logger.error("[initializeChatterConfig] Error initializing config:", error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if flash bonus is currently active
 *
 * @param config - The chatter config settings
 * @returns boolean - Whether flash bonus is active and not expired
 */
export function isFlashBonusActive(config: ChatterConfigSettings): boolean {
  if (!config.flashBonus.enabled) {
    return false;
  }

  if (!config.flashBonus.endsAt) {
    return true; // Enabled but no end date = always active
  }

  return config.flashBonus.endsAt.toMillis() > Date.now();
}

/**
 * Get the commission multiplier (includes flash bonus if active)
 *
 * @param config - The chatter config settings
 * @returns number - The multiplier (1 if no bonus, flashBonus.multiplier if active)
 */
export function getCommissionMultiplier(config: ChatterConfigSettings): number {
  if (isFlashBonusActive(config)) {
    return config.flashBonus.multiplier;
  }
  return 1;
}

/**
 * Get tier bonus amount for a given number of filleuls
 *
 * @param filleulCount - Number of qualified filleuls
 * @param config - The chatter config settings
 * @returns number | null - Bonus amount in cents, or null if no tier reached
 */
export function getTierBonusForFilleulCount(
  filleulCount: number,
  config: ChatterConfigSettings
): { tier: number; amount: number } | null {
  const tiers = [500, 100, 50, 20, 10, 5]; // Check from highest to lowest

  for (const tier of tiers) {
    if (filleulCount >= tier) {
      const amount = config.tierBonuses[tier as keyof typeof config.tierBonuses];
      return { tier, amount };
    }
  }

  return null;
}

/**
 * Get monthly top multiplier for a given rank
 *
 * @param rank - The monthly ranking (1, 2, or 3)
 * @param config - The chatter config settings
 * @returns number - Commission multiplier (1.0 if rank > 3 = no bonus)
 */
export function getMonthlyTopMultiplier(
  rank: number,
  config: ChatterConfigSettings
): number {
  if (rank === 1) return config.monthlyTop[1];
  if (rank === 2) return config.monthlyTop[2];
  if (rank === 3) return config.monthlyTop[3];
  return 1.0; // No multiplier bonus for rank > 3
}

// Alias for backwards compatibility
export const getMonthlyTopReward = getMonthlyTopMultiplier;

// ============================================================================
// ADMIN AUTHENTICATION HELPER
// ============================================================================

/**
 * Assert that the caller is an admin
 * Throws HttpsError if not authenticated or not admin
 */
async function assertAdmin(auth: { uid: string; token?: Record<string, unknown> } | undefined): Promise<void> {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const claims = auth.token;
  const isAdmin = claims?.admin === true || claims?.role === "admin";

  if (isAdmin) {
    return; // Admin via claims
  }

  // Fallback: check users collection
  const db = getDb();
  const userDoc = await db.collection("users").doc(auth.uid).get();

  if (!userDoc.exists || !["admin", "dev"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// ============================================================================
// CALLABLE CLOUD FUNCTION
// ============================================================================

/**
 * Admin callable to update chatter config settings
 *
 * Request data can include any of:
 * - thresholds: Partial<thresholds>
 * - gains: Partial<gains>
 * - tierBonuses: Partial<tierBonuses>
 * - monthlyTop: Partial<monthlyTop>
 * - flashBonus: Partial<flashBonus>
 *
 * @example
 * // Update thresholds
 * await adminUpdateChatterConfigSettings({ thresholds: { maxReferralsPerHour: 10 } });
 *
 * @example
 * // Enable flash bonus for 24 hours
 * await adminUpdateChatterConfigSettings({
 *   flashBonus: {
 *     enabled: true,
 *     multiplier: 2,
 *     endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
 *   }
 * });
 */
export const adminUpdateChatterConfigSettings = onCall(
  {
    cors: true,
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (request): Promise<{
    success: boolean;
    message: string;
    config: ChatterConfigSettings;
  }> => {
    ensureInitialized();

    // Check admin authentication
    await assertAdmin(request.auth);

    const { thresholds, gains, tierBonuses, monthlyTop, flashBonus } = request.data || {};

    // Validate input
    if (!thresholds && !gains && !tierBonuses && !monthlyTop && !flashBonus) {
      throw new HttpsError(
        "invalid-argument",
        "At least one config section must be provided (thresholds, gains, tierBonuses, monthlyTop, or flashBonus)"
      );
    }

    try {
      // Get current config
      const currentConfig = await getChatterConfig();

      // Build update object with deep merge
      const updates: Partial<Omit<ChatterConfigSettings, "id" | "version" | "updatedAt" | "updatedBy" | "createdAt">> = {};

      if (thresholds) {
        updates.thresholds = {
          ...currentConfig.thresholds,
          ...thresholds,
        };
      }

      if (gains) {
        updates.gains = {
          ...currentConfig.gains,
          ...gains,
        };
      }

      if (tierBonuses) {
        updates.tierBonuses = {
          ...currentConfig.tierBonuses,
          ...tierBonuses,
        };
      }

      if (monthlyTop) {
        updates.monthlyTop = {
          ...currentConfig.monthlyTop,
          ...monthlyTop,
        };
      }

      if (flashBonus) {
        // Convert endsAt if provided as ISO string
        let endsAt = flashBonus.endsAt;
        if (typeof endsAt === "string") {
          endsAt = Timestamp.fromDate(new Date(endsAt));
        }

        updates.flashBonus = {
          ...currentConfig.flashBonus,
          ...flashBonus,
          endsAt: endsAt ?? currentConfig.flashBonus.endsAt,
        };
      }

      // Perform update
      const updatedConfig = await updateChatterConfig(updates, request.auth!.uid);

      logger.info("[adminUpdateChatterConfigSettings] Config updated", {
        updatedBy: request.auth!.uid,
        sections: Object.keys(updates),
        newVersion: updatedConfig.version,
      });

      return {
        success: true,
        message: "Chatter config updated successfully",
        config: updatedConfig,
      };
    } catch (error) {
      logger.error("[adminUpdateChatterConfigSettings] Error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to update chatter config");
    }
  }
);

/**
 * Admin callable to get current chatter config settings
 */
export const adminGetChatterConfigSettings = onCall(
  {
    cors: true,
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    success: boolean;
    config: ChatterConfigSettings;
    flashBonusActive: boolean;
    currentMultiplier: number;
  }> => {
    ensureInitialized();

    // Check admin authentication
    await assertAdmin(request.auth);

    try {
      const config = await getChatterConfig();
      const flashBonusActive = isFlashBonusActive(config);
      const currentMultiplier = getCommissionMultiplier(config);

      return {
        success: true,
        config,
        flashBonusActive,
        currentMultiplier,
      };
    } catch (error) {
      logger.error("[adminGetChatterConfigSettings] Error:", error);
      throw new HttpsError("internal", "Failed to get chatter config");
    }
  }
);

/**
 * Admin callable to initialize chatter config with defaults
 * Safe to call multiple times - only creates if missing
 */
export const adminInitializeChatterConfigSettings = onCall(
  {
    cors: true,
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    success: boolean;
    message: string;
    created: boolean;
    config: ChatterConfigSettings;
  }> => {
    ensureInitialized();

    // Check admin authentication
    await assertAdmin(request.auth);

    try {
      const db = getDb();
      const configRef = db.collection("chatter_config").doc("settings");
      const existingDoc = await configRef.get();

      const config = await initializeChatterConfig();

      const created = !existingDoc.exists;

      logger.info("[adminInitializeChatterConfigSettings] Result", {
        created,
        version: config.version,
        by: request.auth!.uid,
      });

      return {
        success: true,
        message: created
          ? "Chatter config initialized with defaults"
          : "Chatter config already exists",
        created,
        config,
      };
    } catch (error) {
      logger.error("[adminInitializeChatterConfigSettings] Error:", error);
      throw new HttpsError("internal", "Failed to initialize chatter config");
    }
  }
);

/**
 * Admin callable to enable/disable flash bonus
 * Convenience function for quickly toggling flash bonus
 */
export const adminToggleFlashBonus = onCall(
  {
    cors: true,
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    success: boolean;
    message: string;
    flashBonus: FlashBonusConfig;
  }> => {
    ensureInitialized();

    // Check admin authentication
    await assertAdmin(request.auth);

    const { enabled, multiplier, durationHours } = request.data || {};

    if (typeof enabled !== "boolean") {
      throw new HttpsError("invalid-argument", "enabled (boolean) is required");
    }

    try {
      const currentConfig = await getChatterConfig();

      const flashBonusUpdate: FlashBonusConfig = {
        enabled,
        multiplier: multiplier ?? currentConfig.flashBonus.multiplier,
        endsAt: null,
      };

      // Set end time if duration is provided and enabling
      if (enabled && durationHours && typeof durationHours === "number" && durationHours > 0) {
        const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);
        flashBonusUpdate.endsAt = Timestamp.fromDate(endTime);
      }

      const updatedConfig = await updateChatterConfig(
        { flashBonus: flashBonusUpdate },
        request.auth!.uid
      );

      logger.info("[adminToggleFlashBonus] Flash bonus toggled", {
        enabled,
        multiplier: flashBonusUpdate.multiplier,
        endsAt: flashBonusUpdate.endsAt?.toDate?.()?.toISOString() || null,
        by: request.auth!.uid,
      });

      return {
        success: true,
        message: enabled
          ? `Flash bonus enabled (x${flashBonusUpdate.multiplier})`
          : "Flash bonus disabled",
        flashBonus: updatedConfig.flashBonus,
      };
    } catch (error) {
      logger.error("[adminToggleFlashBonus] Error:", error);
      throw new HttpsError("internal", "Failed to toggle flash bonus");
    }
  }
);

// Types ChatterConfigSettings and FlashBonusConfig are already exported
// at their interface declarations above
