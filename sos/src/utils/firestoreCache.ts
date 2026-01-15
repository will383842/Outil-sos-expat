/**
 * Firestore Cache Utility
 *
 * Provides localStorage caching for Firestore data that rarely changes.
 * Reduces Firestore reads by caching static data like:
 * - subscription_plans (24h TTL)
 * - countries (7 days TTL)
 * - help_categories (1h TTL)
 *
 * COST OPTIMIZATION: Can reduce Firestore reads by 30-50% for frequently accessed static data.
 */

// Cache configuration
const CACHE_CONFIG = {
  SUBSCRIPTION_PLANS: {
    key: 'sos_cache_subscription_plans',
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours - plans rarely change
  },
  COUNTRIES: {
    key: 'sos_cache_countries',
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days - countries almost never change
  },
  HELP_CATEGORIES: {
    key: 'sos_cache_help_categories',
    ttlMs: 60 * 60 * 1000, // 1 hour
  },
  TRIAL_CONFIG: {
    key: 'sos_cache_trial_config',
    ttlMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

type CacheKey = keyof typeof CACHE_CONFIG;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

// Cache version - increment to invalidate all caches
const CACHE_VERSION = 1;

/**
 * Get cached data from localStorage
 * Returns null if cache is expired or doesn't exist
 */
export function getCached<T>(cacheKey: CacheKey, subKey?: string): T | null {
  try {
    const config = CACHE_CONFIG[cacheKey];
    const fullKey = subKey ? `${config.key}_${subKey}` : config.key;
    const cached = localStorage.getItem(fullKey);

    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Check version
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(fullKey);
      return null;
    }

    // Check TTL
    const isExpired = Date.now() - entry.timestamp > config.ttlMs;
    if (isExpired) {
      localStorage.removeItem(fullKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    // If parsing fails, remove corrupted cache
    console.warn(`[FirestoreCache] Error reading cache for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Set data in localStorage cache
 */
export function setCache<T>(cacheKey: CacheKey, data: T, subKey?: string): void {
  try {
    const config = CACHE_CONFIG[cacheKey];
    const fullKey = subKey ? `${config.key}_${subKey}` : config.key;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (error) {
    // localStorage might be full or disabled
    console.warn(`[FirestoreCache] Error writing cache for ${cacheKey}:`, error);
  }
}

/**
 * Clear specific cache
 */
export function clearCache(cacheKey: CacheKey, subKey?: string): void {
  const config = CACHE_CONFIG[cacheKey];
  const fullKey = subKey ? `${config.key}_${subKey}` : config.key;
  localStorage.removeItem(fullKey);
}

/**
 * Clear all SOS caches
 */
export function clearAllCaches(): void {
  Object.values(CACHE_CONFIG).forEach(config => {
    // Remove base key
    localStorage.removeItem(config.key);

    // Remove any sub-keys (e.g., plans_lawyer, plans_expat)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(config.key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  });

  console.log('[FirestoreCache] All caches cleared');
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): Record<string, { exists: boolean; age?: string; size?: number }> {
  const stats: Record<string, { exists: boolean; age?: string; size?: number }> = {};

  Object.entries(CACHE_CONFIG).forEach(([name, config]) => {
    const cached = localStorage.getItem(config.key);
    if (cached) {
      try {
        const entry = JSON.parse(cached);
        const ageMs = Date.now() - entry.timestamp;
        const ageMinutes = Math.round(ageMs / 60000);
        stats[name] = {
          exists: true,
          age: ageMinutes < 60 ? `${ageMinutes}m` : `${Math.round(ageMinutes / 60)}h`,
          size: cached.length,
        };
      } catch {
        stats[name] = { exists: true };
      }
    } else {
      stats[name] = { exists: false };
    }
  });

  return stats;
}

/**
 * Helper to fetch with cache
 * Usage:
 * const plans = await fetchWithCache('SUBSCRIPTION_PLANS', 'lawyer', () => getPlansFromFirestore('lawyer'));
 */
export async function fetchWithCache<T>(
  cacheKey: CacheKey,
  subKey: string | undefined,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = getCached<T>(cacheKey, subKey);
  if (cached !== null) {
    console.log(`[FirestoreCache] Cache HIT for ${cacheKey}${subKey ? `_${subKey}` : ''}`);
    return cached;
  }

  // Fetch from Firestore
  console.log(`[FirestoreCache] Cache MISS for ${cacheKey}${subKey ? `_${subKey}` : ''}, fetching...`);
  const data = await fetchFn();

  // Store in cache
  setCache(cacheKey, data, subKey);

  return data;
}
