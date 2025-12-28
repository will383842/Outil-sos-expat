/**
 * =============================================================================
 * REDIS MONITOR - Monitoring métriques Redis/Cache
 * =============================================================================
 *
 * Collecte et publie les métriques Redis:
 * - Hit/Miss rates
 * - Latence opérations
 * - Utilisation mémoire
 * - Connexions actives
 * - Clés expirées
 *
 * =============================================================================
 */

import { redis, isRedisAvailable } from "../cache/RedisClient";
import { metrics } from "./MetricsService";

// =============================================================================
// TYPES
// =============================================================================

export interface RedisMetrics {
  connected: boolean;
  type: "ioredis" | "upstash" | "memory";
  latencyMs: number;
  memoryUsedMB?: number;
  memoryMaxMB?: number;
  memoryUsagePercent?: number;
  connectedClients?: number;
  totalKeys?: number;
  hitRate?: number;
  missRate?: number;
  opsPerSecond?: number;
  expiredKeys?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
}

// =============================================================================
// IN-MEMORY TRACKING
// =============================================================================

let cacheHits = 0;
let cacheMisses = 0;
let cacheErrors = 0;
const operationLatencies: number[] = [];
const MAX_LATENCIES = 1000;

// =============================================================================
// OPERATION WRAPPERS
// =============================================================================

/**
 * Wrap a cache get operation with monitoring
 */
export async function monitoredCacheGet<T>(
  key: string,
  getFn: () => Promise<T | null>
): Promise<T | null> {
  const start = Date.now();

  try {
    const result = await getFn();
    const duration = Date.now() - start;

    // Track latency
    trackLatency(duration);
    metrics.recordLatency("cache_get", duration);

    // Track hit/miss
    if (result !== null) {
      cacheHits++;
      metrics.recordCacheAccess(true, "redis");
    } else {
      cacheMisses++;
      metrics.recordCacheAccess(false, "redis");
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    cacheErrors++;

    trackLatency(duration);
    metrics.recordError("cache_get", (error as Error).name);
    metrics.recordLatency("cache_get", duration, { error: "true" });

    throw error;
  }
}

/**
 * Wrap a cache set operation with monitoring
 */
export async function monitoredCacheSet(
  key: string,
  setFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();

  try {
    await setFn();
    const duration = Date.now() - start;

    trackLatency(duration);
    metrics.recordLatency("cache_set", duration);
    metrics.incrementCounter("cache_sets");
  } catch (error) {
    const duration = Date.now() - start;
    cacheErrors++;

    trackLatency(duration);
    metrics.recordError("cache_set", (error as Error).name);
    metrics.recordLatency("cache_set", duration, { error: "true" });

    throw error;
  }
}

/**
 * Track operation latency
 */
function trackLatency(ms: number): void {
  operationLatencies.push(ms);
  if (operationLatencies.length > MAX_LATENCIES) {
    operationLatencies.shift();
  }
}

// =============================================================================
// METRICS COLLECTION
// =============================================================================

/**
 * Collect Redis metrics
 */
export async function collectRedisMetrics(): Promise<RedisMetrics> {
  const start = Date.now();

  if (!isRedisAvailable()) {
    return {
      connected: false,
      type: "memory",
      latencyMs: 0,
    };
  }

  try {
    // Ping to measure latency
    await redis.set("__health_check__", "1", 1);
    const latency = Date.now() - start;

    // Get basic stats
    const hitRate = cacheHits + cacheMisses > 0
      ? (cacheHits / (cacheHits + cacheMisses)) * 100
      : 0;

    const baseMetrics: RedisMetrics = {
      connected: true,
      type: "upstash", // Default since we can't detect type easily
      latencyMs: latency,
      hitRate,
      missRate: 100 - hitRate,
    };

    // Log metrics
    metrics.recordMetric("redis_latency", latency);
    metrics.recordMetric("redis_hit_rate", hitRate);

    return baseMetrics;
  } catch (error) {
    metrics.error("Redis metrics collection failed", {
      error: (error as Error).message,
    });

    return {
      connected: false,
      type: "memory",
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;
  const errorRate = total > 0 ? (cacheErrors / total) * 100 : 0;

  // Calculate latency percentiles
  const sorted = [...operationLatencies].sort((a, b) => a - b);
  const avgLatency = sorted.length > 0
    ? sorted.reduce((a, b) => a + b, 0) / sorted.length
    : 0;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95Latency = sorted.length > 0 ? sorted[p95Index] || sorted[sorted.length - 1] : 0;

  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate,
    avgLatencyMs: avgLatency,
    p95LatencyMs: p95Latency,
    errorRate,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
  cacheErrors = 0;
  operationLatencies.length = 0;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();

  if (!isRedisAvailable()) {
    return {
      healthy: true, // Memory fallback is "healthy" in dev
      latencyMs: 0,
      message: "Using in-memory fallback",
    };
  }

  try {
    const testKey = "__health_check__";
    const testValue = Date.now().toString();

    // Test write
    await redis.set(testKey, testValue, 10);

    // Test read
    const read = await redis.get(testKey);

    // Test delete
    await redis.del(testKey);

    const latency = Date.now() - start;

    if (read !== testValue) {
      return {
        healthy: false,
        latencyMs: latency,
        message: "Read value mismatch",
      };
    }

    // Check latency SLO
    const SLO_LATENCY_MS = 100;
    if (latency > SLO_LATENCY_MS) {
      metrics.warn("Redis health check slow", {
        latency,
        slo: SLO_LATENCY_MS,
      });
    }

    return {
      healthy: true,
      latencyMs: latency,
      message: "OK",
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      message: (error as Error).message,
    };
  }
}

// =============================================================================
// SCHEDULED METRICS COLLECTION
// =============================================================================

/**
 * Collect and log all Redis metrics (for scheduled function)
 */
export async function collectAndLogMetrics(): Promise<void> {
  const redisMetrics = await collectRedisMetrics();
  const cacheStats = getCacheStats();
  const health = await checkRedisHealth();

  // Log comprehensive metrics
  metrics.info("Redis metrics snapshot", {
    redis: redisMetrics,
    cache: cacheStats,
    health: health,
  });

  // Record in metrics store
  metrics.recordMetric("redis_connected", redisMetrics.connected ? 1 : 0);
  metrics.recordMetric("cache_hit_rate", cacheStats.hitRate);
  metrics.recordMetric("cache_avg_latency", cacheStats.avgLatencyMs);
  metrics.recordMetric("cache_p95_latency", cacheStats.p95LatencyMs);
  metrics.recordMetric("cache_error_rate", cacheStats.errorRate);

  // Check SLOs
  if (cacheStats.hitRate < 30) { // Cache hit rate SLO
    metrics.warn("Cache hit rate below SLO", {
      actual: cacheStats.hitRate,
      target: 30,
    });
  }

  if (cacheStats.p95LatencyMs > 10) { // Cache latency SLO
    metrics.warn("Cache latency above SLO", {
      actual: cacheStats.p95LatencyMs,
      target: 10,
    });
  }
}

// =============================================================================
// KEY PATTERN ANALYSIS
// =============================================================================

/**
 * Analyze cache key patterns for optimization insights
 */
export async function analyzeKeyPatterns(): Promise<{
  patterns: Record<string, number>;
  recommendations: string[];
}> {
  if (!isRedisAvailable()) {
    return {
      patterns: {},
      recommendations: ["Redis not available, using memory fallback"],
    };
  }

  try {
    // Get all keys (be careful in production!)
    const keys = await redis.keys("*");

    // Analyze patterns
    const patterns: Record<string, number> = {};
    for (const key of keys) {
      const prefix = key.split(":")[0];
      patterns[prefix] = (patterns[prefix] || 0) + 1;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    // Check for potential issues
    if (keys.length > 10000) {
      recommendations.push("High key count - consider TTL review");
    }

    for (const [pattern, count] of Object.entries(patterns)) {
      if (count > 1000) {
        recommendations.push(`Pattern "${pattern}" has ${count} keys - review eviction policy`);
      }
    }

    return { patterns, recommendations };
  } catch (error) {
    metrics.error("Key pattern analysis failed", {
      error: (error as Error).message,
    });

    return {
      patterns: {},
      recommendations: ["Analysis failed: " + (error as Error).message],
    };
  }
}

export default {
  monitoredCacheGet,
  monitoredCacheSet,
  collectRedisMetrics,
  getCacheStats,
  resetCacheStats,
  checkRedisHealth,
  collectAndLogMetrics,
  analyzeKeyPatterns,
};
