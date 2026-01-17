/**
 * =============================================================================
 * RATE LIMITER SERVICE - Rate limiting distribué via Redis
 * =============================================================================
 *
 * Remplace les transactions Firestore par Redis INCR pour:
 * - Latence < 5ms (vs 50-100ms Firestore)
 * - Cohérence multi-instances
 * - Coûts réduits (pas de transactions Firestore)
 *
 * Algorithme: Fixed Window avec fallback gracieux
 */

import redis from "./RedisClient";
import { CACHE_TTL } from "./CacheService";

// =============================================================================
// CONFIGURATION
// =============================================================================

const RATE_LIMIT_PREFIX = "ratelimit";

/**
 * Configuration des limites par type d'action et plan
 */
export const RATE_LIMITS = {
  AI_CHAT: {
    free: { requests: 20, windowSeconds: 3600 },      // 20/heure
    premium: { requests: 50, windowSeconds: 3600 },   // 50/heure
    enterprise: { requests: 200, windowSeconds: 3600 }, // 200/heure
    default: { requests: 20, windowSeconds: 3600 },
  },
  AI_CHAT_PROVIDER: {
    free: { requests: 100, windowSeconds: 3600 },
    premium: { requests: 200, windowSeconds: 3600 },
    enterprise: { requests: 500, windowSeconds: 3600 },
    default: { requests: 100, windowSeconds: 3600 },
  },
  WEBHOOK_INGEST: {
    default: { requests: 100, windowSeconds: 60 }, // 100/minute (DDoS protection)
  },
  BOOKING_CREATE: {
    free: { requests: 10, windowSeconds: 3600 },
    premium: { requests: 20, windowSeconds: 3600 },
    enterprise: { requests: 50, windowSeconds: 3600 },
    default: { requests: 10, windowSeconds: 3600 },
  },
  MESSAGE_SEND: {
    free: { requests: 50, windowSeconds: 3600 },
    premium: { requests: 100, windowSeconds: 3600 },
    enterprise: { requests: 500, windowSeconds: 3600 },
    default: { requests: 50, windowSeconds: 3600 },
  },
  AUTH_LOGIN: {
    default: { requests: 10, windowSeconds: 300 }, // 10/5min (brute force protection)
  },
  API_GENERAL: {
    free: { requests: 200, windowSeconds: 3600 },
    premium: { requests: 500, windowSeconds: 3600 },
    enterprise: { requests: 2000, windowSeconds: 3600 },
    default: { requests: 200, windowSeconds: 3600 },
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type PlanType = "free" | "premium" | "enterprise";

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp de reset de la fenêtre
  retryAfter?: number; // Secondes avant retry
}

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

// =============================================================================
// RATE LIMITER SERVICE
// =============================================================================

class RateLimiterService {
  private initialized = false;

  /**
   * Initialise le service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await redis.connect();
    this.initialized = true;
    console.log("[RateLimiter] Initialisé");
  }

  /**
   * Construit la clé Redis pour le rate limit
   * Format: ratelimit:{type}:{identifier}:{windowKey}
   */
  private buildKey(
    type: RateLimitType,
    identifier: string,
    windowSeconds: number
  ): string {
    // Calculer la fenêtre actuelle
    const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
    return `${RATE_LIMIT_PREFIX}:${type}:${identifier}:${windowKey}`;
  }

  /**
   * Récupère la configuration de limite pour un type et plan
   */
  private getLimit(
    type: RateLimitType,
    plan?: PlanType
  ): { requests: number; windowSeconds: number } {
    const config = RATE_LIMITS[type];

    if (plan && plan in config) {
      return config[plan as keyof typeof config] as { requests: number; windowSeconds: number };
    }

    return config.default;
  }

  // ===========================================================================
  // VÉRIFICATION RATE LIMIT
  // ===========================================================================

  /**
   * Vérifie et incrémente le rate limit (opération atomique)
   *
   * @param type - Type d'action (AI_CHAT, WEBHOOK_INGEST, etc.)
   * @param identifier - Identifiant unique (userId, IP, etc.)
   * @param plan - Plan utilisateur (optionnel, pour limites différenciées)
   */
  async checkLimit(
    type: RateLimitType,
    identifier: string,
    plan?: PlanType
  ): Promise<RateLimitResult> {
    await this.initialize();

    const { requests: limit, windowSeconds } = this.getLimit(type, plan);
    const key = this.buildKey(type, identifier, windowSeconds);

    try {
      // Incrémenter atomiquement
      const count = await redis.incr(key);

      // Si c'est le premier, définir le TTL
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Calculer le timestamp de reset
      const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
      const resetTimestamp = (windowKey + 1) * windowSeconds * 1000;

      const remaining = Math.max(0, limit - count);
      const allowed = count <= limit;

      const result: RateLimitResult = {
        allowed,
        limit,
        remaining,
        reset: Math.floor(resetTimestamp / 1000),
      };

      if (!allowed) {
        result.retryAfter = Math.ceil((resetTimestamp - Date.now()) / 1000);
        console.warn(
          `[RateLimiter] Limit exceeded: ${type}:${identifier} (${count}/${limit})`
        );
      }

      return result;
    } catch (error) {
      console.error(`[RateLimiter] Erreur check ${type}:${identifier}:`, error);

      // Fail open - autoriser en cas d'erreur Redis
      return {
        allowed: true,
        limit,
        remaining: limit,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
      };
    }
  }

  /**
   * Vérifie sans incrémenter (lecture seule)
   */
  async peekLimit(
    type: RateLimitType,
    identifier: string,
    plan?: PlanType
  ): Promise<RateLimitResult> {
    await this.initialize();

    const { requests: limit, windowSeconds } = this.getLimit(type, plan);
    const key = this.buildKey(type, identifier, windowSeconds);

    try {
      const count = (await redis.get<number>(key)) || 0;
      const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
      const resetTimestamp = (windowKey + 1) * windowSeconds * 1000;

      return {
        allowed: count < limit,
        limit,
        remaining: Math.max(0, limit - count),
        reset: Math.floor(resetTimestamp / 1000),
      };
    } catch (error) {
      console.error(`[RateLimiter] Erreur peek ${type}:${identifier}:`, error);

      return {
        allowed: true,
        limit,
        remaining: limit,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
      };
    }
  }

  /**
   * Réinitialise le compteur d'un identifiant (admin)
   */
  async resetLimit(type: RateLimitType, identifier: string): Promise<void> {
    await this.initialize();

    // Supprimer toutes les clés de cet identifiant
    const pattern = `${RATE_LIMIT_PREFIX}:${type}:${identifier}:*`;
    await redis.deletePattern(pattern);

    console.log(`[RateLimiter] Reset: ${type}:${identifier}`);
  }

  // ===========================================================================
  // HEADERS HTTP
  // ===========================================================================

  /**
   * Génère les headers HTTP standard pour rate limiting
   */
  getHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    };

    if (result.retryAfter !== undefined) {
      headers["Retry-After"] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Applique les headers de rate limit à une réponse Express
   */
  applyHeaders(
    res: { setHeader: (name: string, value: string) => void },
    result: RateLimitResult
  ): void {
    const headers = this.getHeaders(result);
    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });
  }

  // ===========================================================================
  // UTILITAIRES
  // ===========================================================================

  /**
   * Récupère le statut de plusieurs identifiants
   */
  async getMultipleStatus(
    type: RateLimitType,
    identifiers: string[],
    plan?: PlanType
  ): Promise<Map<string, RateLimitResult>> {
    const results = new Map<string, RateLimitResult>();

    const promises = identifiers.map(async (id) => {
      const result = await this.peekLimit(type, id, plan);
      results.set(id, result);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Vérifie si un identifiant est bloqué
   */
  async isBlocked(
    type: RateLimitType,
    identifier: string,
    plan?: PlanType
  ): Promise<boolean> {
    const result = await this.peekLimit(type, identifier, plan);
    return !result.allowed;
  }

  /**
   * Récupère les identifiants actuellement limités
   */
  async getBlockedIdentifiers(type: RateLimitType): Promise<string[]> {
    await this.initialize();

    const pattern = `${RATE_LIMIT_PREFIX}:${type}:*`;
    const keys = await redis.keys(pattern);
    const blocked: string[] = [];

    for (const key of keys) {
      const parts = key.split(":");
      if (parts.length < 4) continue;

      const identifier = parts[2];
      const count = (await redis.get<number>(key)) || 0;
      const { requests: limit } = this.getLimit(type);

      if (count >= limit && !blocked.includes(identifier)) {
        blocked.push(identifier);
      }
    }

    return blocked;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const rateLimiterService = new RateLimiterService();

export default rateLimiterService;
