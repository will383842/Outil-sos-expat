/**
 * =============================================================================
 * CACHE SERVICE - Cache intelligent pour réponses IA
 * =============================================================================
 *
 * Gère le cache des réponses IA avec:
 * - Hash des prompts pour déduplication
 * - TTL configurables par type
 * - Invalidation par pattern
 * - Métriques de hit/miss
 */

import { createHash } from "crypto";
import redis from "./RedisClient";

// =============================================================================
// CONFIGURATION TTL
// =============================================================================

export const CACHE_TTL = {
  /** Réponses chat général - 1 heure */
  AI_CHAT: 3600,
  /** Analyse de booking - 30 minutes */
  AI_BOOKING: 1800,
  /** Suggestions provider - 24 heures */
  AI_PROVIDER: 86400,
  /** Résultats modération - 7 jours */
  MODERATION: 604800,
  /** Quota provider - 24 heures (sync avec reset quotidien) */
  QUOTA: 86400,
  /** Rate limit window - 60 secondes */
  RATE_LIMIT: 60,
  /** Circuit breaker state - 5 minutes */
  CIRCUIT_BREAKER: 300,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type CacheType = keyof typeof CACHE_TTL;

export interface CachedAIResponse {
  content: string;
  model: string;
  provider: string;
  citations?: string[];
  cachedAt: number;
  hash: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  mode: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
}

// =============================================================================
// CACHE KEYS
// =============================================================================

const CACHE_PREFIX = {
  AI_CHAT: "ai:chat",
  AI_BOOKING: "ai:booking",
  AI_PROVIDER: "ai:provider",
  MODERATION: "moderation",
  QUOTA: "quota",
  RATE_LIMIT: "ratelimit",
  CIRCUIT_BREAKER: "circuit",
} as const;

// =============================================================================
// CACHE SERVICE
// =============================================================================

class CacheService {
  private metrics: CacheMetrics = { hits: 0, misses: 0 };
  private initialized = false;

  /**
   * Initialise le service de cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await redis.connect();
    this.initialized = true;
    console.log(`[CacheService] Initialisé en mode ${redis.getMode()}`);
  }

  // ===========================================================================
  // HASH & KEYS
  // ===========================================================================

  /**
   * Génère un hash MD5 du contenu pour clé de cache
   */
  private hashContent(content: string): string {
    const normalized = content
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "");
    return createHash("md5").update(normalized).digest("hex").substring(0, 16);
  }

  /**
   * Construit une clé de cache
   */
  private buildKey(
    type: CacheType,
    ...parts: (string | undefined)[]
  ): string {
    const prefix = CACHE_PREFIX[type] || type.toLowerCase();
    const validParts = parts.filter((p) => p !== undefined);
    return `${prefix}:${validParts.join(":")}`;
  }

  // ===========================================================================
  // CACHE IA
  // ===========================================================================

  /**
   * Récupère une réponse IA du cache
   */
  async getAIResponse(
    conversationId: string,
    message: string,
    providerId?: string
  ): Promise<CachedAIResponse | null> {
    await this.initialize();

    const hash = this.hashContent(message);
    const key = this.buildKey("AI_CHAT", conversationId, providerId, hash);

    const cached = await redis.get<CachedAIResponse>(key);

    if (cached) {
      this.metrics.hits++;
      console.log(`[CacheService] HIT: ${key}`);
      return cached;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Stocke une réponse IA dans le cache
   */
  async setAIResponse(
    conversationId: string,
    message: string,
    response: {
      content: string;
      model: string;
      provider: string;
      citations?: string[];
    },
    providerId?: string
  ): Promise<void> {
    await this.initialize();

    const hash = this.hashContent(message);
    const key = this.buildKey("AI_CHAT", conversationId, providerId, hash);

    const cached: CachedAIResponse = {
      ...response,
      cachedAt: Date.now(),
      hash,
    };

    await redis.set(key, cached, CACHE_TTL.AI_CHAT);
    console.log(`[CacheService] SET: ${key} (TTL: ${CACHE_TTL.AI_CHAT}s)`);
  }

  /**
   * Récupère une analyse de booking du cache
   */
  async getBookingAnalysis(
    bookingId: string,
    actionType: string
  ): Promise<CachedAIResponse | null> {
    await this.initialize();

    const key = this.buildKey("AI_BOOKING", bookingId, actionType);
    const cached = await redis.get<CachedAIResponse>(key);

    if (cached) {
      this.metrics.hits++;
      return cached;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Stocke une analyse de booking
   */
  async setBookingAnalysis(
    bookingId: string,
    actionType: string,
    response: {
      content: string;
      model: string;
      provider: string;
    }
  ): Promise<void> {
    await this.initialize();

    const key = this.buildKey("AI_BOOKING", bookingId, actionType);
    const cached: CachedAIResponse = {
      ...response,
      cachedAt: Date.now(),
      hash: actionType,
    };

    await redis.set(key, cached, CACHE_TTL.AI_BOOKING);
  }

  /**
   * Récupère des suggestions provider du cache
   */
  async getProviderSuggestions(
    providerId: string,
    queryType: string
  ): Promise<CachedAIResponse | null> {
    await this.initialize();

    const key = this.buildKey("AI_PROVIDER", providerId, queryType);
    const cached = await redis.get<CachedAIResponse>(key);

    if (cached) {
      this.metrics.hits++;
      return cached;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Stocke des suggestions provider
   */
  async setProviderSuggestions(
    providerId: string,
    queryType: string,
    response: {
      content: string;
      model: string;
      provider: string;
    }
  ): Promise<void> {
    await this.initialize();

    const key = this.buildKey("AI_PROVIDER", providerId, queryType);
    const cached: CachedAIResponse = {
      ...response,
      cachedAt: Date.now(),
      hash: queryType,
    };

    await redis.set(key, cached, CACHE_TTL.AI_PROVIDER);
  }

  // ===========================================================================
  // MODÉRATION
  // ===========================================================================

  /**
   * Récupère un résultat de modération du cache
   */
  async getModerationResult(
    content: string
  ): Promise<{ safe: boolean; reason?: string } | null> {
    await this.initialize();

    const hash = this.hashContent(content);
    const key = this.buildKey("MODERATION", hash);

    return redis.get(key);
  }

  /**
   * Stocke un résultat de modération
   */
  async setModerationResult(
    content: string,
    result: { safe: boolean; reason?: string }
  ): Promise<void> {
    await this.initialize();

    const hash = this.hashContent(content);
    const key = this.buildKey("MODERATION", hash);

    await redis.set(key, result, CACHE_TTL.MODERATION);
  }

  // ===========================================================================
  // INVALIDATION
  // ===========================================================================

  /**
   * Invalide le cache d'une conversation
   */
  async invalidateConversation(conversationId: string): Promise<number> {
    await this.initialize();
    const pattern = this.buildKey("AI_CHAT", conversationId, "*");
    return redis.deletePattern(pattern);
  }

  /**
   * Invalide le cache d'un booking
   */
  async invalidateBooking(bookingId: string): Promise<number> {
    await this.initialize();
    const pattern = this.buildKey("AI_BOOKING", bookingId, "*");
    return redis.deletePattern(pattern);
  }

  /**
   * Invalide le cache d'un provider
   */
  async invalidateProvider(providerId: string): Promise<number> {
    await this.initialize();

    let count = 0;

    // Suggestions provider
    const providerPattern = this.buildKey("AI_PROVIDER", providerId, "*");
    count += await redis.deletePattern(providerPattern);

    // Chat avec ce provider
    const chatPattern = `${CACHE_PREFIX.AI_CHAT}:*:${providerId}:*`;
    count += await redis.deletePattern(chatPattern);

    return count;
  }

  /**
   * Invalide tout le cache par type
   */
  async invalidateByType(type: CacheType): Promise<number> {
    await this.initialize();
    const prefix = CACHE_PREFIX[type] || type.toLowerCase();
    return redis.deletePattern(`${prefix}:*`);
  }

  // ===========================================================================
  // MÉTRIQUES
  // ===========================================================================

  /**
   * Récupère les statistiques du cache
   */
  getStats(): CacheStats {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? Math.round((this.metrics.hits / total) * 100) : 0,
      mode: redis.getMode(),
    };
  }

  /**
   * Réinitialise les métriques
   */
  resetStats(): void {
    this.metrics = { hits: 0, misses: 0 };
  }

  /**
   * Vérifie si le cache Redis est actif
   */
  isRedisActive(): boolean {
    return redis.isConnected();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const cacheService = new CacheService();

export default cacheService;
