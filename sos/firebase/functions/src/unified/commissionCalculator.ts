/**
 * Unified Commission Calculator — Entry Point
 *
 * Single entry point that dispatches commission events to the appropriate handler.
 * Used by both shadow mode (Phase 6) and production mode (Phase 10).
 *
 * In shadow mode: handlers calculate but do NOT write to Firestore.
 * In production mode: handlers calculate AND write commissions.
 */

import { logger } from "firebase-functions/v2";
import { CommissionEvent, ShadowResult, UnifiedSystemConfig } from "./types";
import { getFirestore } from "firebase-admin/firestore";

// Cache for system config
let systemConfig: UnifiedSystemConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Load the unified system configuration.
 * Controls whether the system is enabled, in shadow mode, etc.
 */
export async function getSystemConfig(): Promise<UnifiedSystemConfig> {
  if (systemConfig && Date.now() - configCacheTime < CONFIG_CACHE_TTL_MS) {
    return systemConfig;
  }

  const db = getFirestore();
  const doc = await db.collection("unified_commission_system").doc("config").get();

  if (!doc.exists) {
    // Default: disabled
    systemConfig = {
      enabled: false,
      shadowMode: false,
    };
  } else {
    systemConfig = doc.data() as UnifiedSystemConfig;
  }

  configCacheTime = Date.now();
  return systemConfig;
}

/** Force-clear the config cache (e.g., after admin changes) */
export function clearSystemConfigCache(): void {
  systemConfig = null;
  configCacheTime = 0;
}

/**
 * Main entry point: calculate commissions for a given event.
 *
 * Checks if the unified system is enabled (or in shadow mode) before proceeding.
 * Returns null if the system is completely disabled.
 *
 * @param event - The commission event to process
 * @param forceShadow - Force shadow mode regardless of config (used by Phase 6 triggers)
 */
export async function calculateAndCreateCommissions(
  event: CommissionEvent & { shadowMode?: boolean },
  forceShadow = false
): Promise<ShadowResult | null> {
  try {
    const config = await getSystemConfig();

    // System completely disabled → skip
    if (!config.enabled && !config.shadowMode && !forceShadow) {
      return null;
    }

    // Determine effective shadow mode
    const isShadow = forceShadow || config.shadowMode || false;

    // Dispatch to appropriate handler
    switch (event.type) {
      case "call_completed": {
        const { handleCallCompleted } = await import("./handlers/handleCallCompleted");
        return await handleCallCompleted({ ...event, shadowMode: isShadow });
      }

      case "user_registered": {
        const { handleUserRegistered } = await import("./handlers/handleUserRegistered");
        return await handleUserRegistered({ ...event, shadowMode: isShadow });
      }

      case "provider_registered": {
        const { handleProviderRegistered } = await import("./handlers/handleProviderRegistered");
        return await handleProviderRegistered({ ...event, shadowMode: isShadow });
      }

      case "subscription_created": {
        const { handleSubscriptionCreated } = await import("./handlers/handleSubscriptionEvent");
        return await handleSubscriptionCreated({ ...event, shadowMode: isShadow });
      }

      case "subscription_renewed": {
        const { handleSubscriptionRenewed } = await import("./handlers/handleSubscriptionEvent");
        return await handleSubscriptionRenewed({ ...event, shadowMode: isShadow });
      }

      default:
        logger.warn(`[unified] Unknown event type: ${(event as { type: string }).type}`);
        return null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[unified] calculateAndCreateCommissions failed: ${msg}`, {
      eventType: event.type,
    });
    // Never let the unified system crash the caller
    return null;
  }
}
