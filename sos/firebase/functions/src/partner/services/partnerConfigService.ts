/**
 * Partner Config Service — cached config with 5-min TTL
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { type PartnerConfig, DEFAULT_PARTNER_CONFIG } from "../types";

let cachedConfig: PartnerConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get partner config with 5-min cache
 */
export async function getPartnerConfig(): Promise<PartnerConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  const db = getFirestore();
  const doc = await db.collection("partner_config").doc("current").get();

  if (doc.exists) {
    cachedConfig = doc.data() as PartnerConfig;
  } else {
    // Create default config
    const defaultConfig: PartnerConfig = {
      ...DEFAULT_PARTNER_CONFIG,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await db.collection("partner_config").doc("current").set(defaultConfig);
    cachedConfig = defaultConfig;
  }

  cacheExpiry = now + CACHE_TTL_MS;
  return cachedConfig;
}

/**
 * Clear config cache (after admin update)
 */
export function clearPartnerConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}
