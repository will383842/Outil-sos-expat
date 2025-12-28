/**
 * =============================================================================
 * CACHE SERVICES - Export centralisé
 * =============================================================================
 */

// Client Redis
export { redis, default as RedisClient } from "./RedisClient";
export type { RedisMode } from "./RedisClient";

// Service de cache IA
export { cacheService, default as CacheService } from "./CacheService";
export { CACHE_TTL } from "./CacheService";
export type {
  CacheType,
  CachedAIResponse,
  CacheStats,
} from "./CacheService";

// Service de quota
export { quotaService, default as QuotaService } from "./QuotaService";
export type { QuotaInfo } from "./QuotaService";

// Service de rate limiting
export { rateLimiterService, default as RateLimiterService } from "./RateLimiterService";
export { RATE_LIMITS } from "./RateLimiterService";
export type {
  RateLimitType,
  PlanType,
  RateLimitResult,
  RateLimitHeaders,
} from "./RateLimiterService";

/**
 * Initialise tous les services de cache
 */
export async function initializeCacheServices(): Promise<void> {
  const { redis } = await import("./RedisClient");
  await redis.connect();
  console.log("[CacheServices] Tous les services initialisés");
}
