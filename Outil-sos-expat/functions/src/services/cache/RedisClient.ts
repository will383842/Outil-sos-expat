/**
 * =============================================================================
 * REDIS CLIENT - Connexion Redis avec fallback
 * =============================================================================
 *
 * Supporte deux modes:
 * - Cloud Memorystore (ioredis) pour production GCP
 * - Upstash Redis (REST) pour serverless/dev
 *
 * Fallback automatique si Redis indisponible.
 */

import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
import { defineSecret } from "firebase-functions/params";

// =============================================================================
// SECRETS FIREBASE
// =============================================================================

const REDIS_HOST = defineSecret("REDIS_HOST");
const REDIS_PORT = defineSecret("REDIS_PORT");
const UPSTASH_REDIS_REST_URL = defineSecret("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = defineSecret("UPSTASH_REDIS_REST_TOKEN");

// =============================================================================
// TYPES
// =============================================================================

export type RedisMode = "ioredis" | "upstash" | "memory" | "disabled";

interface RedisConfig {
  mode: RedisMode;
  host?: string;
  port?: number;
  upstashUrl?: string;
  upstashToken?: string;
  connectTimeout?: number;
  commandTimeout?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// =============================================================================
// FALLBACK MEMORY CACHE
// =============================================================================

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Nettoyage toutes les 60 secondes
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + 1;
    // Garde le TTL existant ou défaut 3600s
    const entry = this.cache.get(key) as CacheEntry<number> | undefined;
    const remainingTtl = entry
      ? Math.ceil((entry.expiresAt - Date.now()) / 1000)
      : 3600;
    await this.set(key, newValue, remainingTtl > 0 ? remainingTtl : 3600);
    return newValue;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const value = await this.get(key);
    if (value !== null) {
      await this.set(key, value, ttlSeconds);
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    const result: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// =============================================================================
// REDIS CLIENT UNIFIÉ
// =============================================================================

class RedisClient {
  private ioredis: IORedis | null = null;
  private upstash: UpstashRedis | null = null;
  private memory: MemoryCache;
  private mode: RedisMode = "memory";
  private connected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.memory = new MemoryCache();
  }

  /**
   * Initialise la connexion Redis
   */
  async connect(config?: Partial<RedisConfig>): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect(config);
    return this.connectionPromise;
  }

  private async _connect(config?: Partial<RedisConfig>): Promise<void> {
    // Mode explicitement désactivé
    if (config?.mode === "disabled") {
      this.mode = "disabled";
      console.log("[Redis] Mode désactivé - utilisation mémoire");
      return;
    }

    // Essayer ioredis (Cloud Memorystore)
    const host = config?.host || process.env.REDIS_HOST || REDIS_HOST.value();
    const port = config?.port || parseInt(process.env.REDIS_PORT || REDIS_PORT.value() || "6379");

    if (host && host !== "undefined") {
      try {
        this.ioredis = new IORedis({
          host,
          port,
          connectTimeout: config?.connectTimeout || 5000,
          commandTimeout: config?.commandTimeout || 1000,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
          },
          lazyConnect: true,
        });

        await this.ioredis.connect();
        await this.ioredis.ping();

        this.mode = "ioredis";
        this.connected = true;
        console.log(`[Redis] Connecté via ioredis à ${host}:${port}`);
        return;
      } catch (error) {
        console.warn("[Redis] Échec ioredis, tentative Upstash...", error);
        this.ioredis?.disconnect();
        this.ioredis = null;
      }
    }

    // Essayer Upstash
    const upstashUrl =
      config?.upstashUrl ||
      process.env.UPSTASH_REDIS_REST_URL ||
      UPSTASH_REDIS_REST_URL.value();
    const upstashToken =
      config?.upstashToken ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      UPSTASH_REDIS_REST_TOKEN.value();

    if (upstashUrl && upstashUrl !== "undefined" && upstashToken) {
      try {
        this.upstash = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });

        // Test connexion
        await this.upstash.ping();

        this.mode = "upstash";
        this.connected = true;
        console.log("[Redis] Connecté via Upstash");
        return;
      } catch (error) {
        console.warn("[Redis] Échec Upstash, fallback mémoire", error);
        this.upstash = null;
      }
    }

    // Fallback mémoire
    this.mode = "memory";
    console.log("[Redis] Mode fallback mémoire (pas de Redis configuré)");
  }

  /**
   * Vérifie si Redis est connecté
   */
  isConnected(): boolean {
    return this.connected && (this.mode === "ioredis" || this.mode === "upstash");
  }

  /**
   * Obtient le mode actuel
   */
  getMode(): RedisMode {
    return this.mode;
  }

  // ===========================================================================
  // OPÉRATIONS CACHE
  // ===========================================================================

  /**
   * Récupère une valeur du cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        const data = await this.ioredis.get(key);
        return data ? JSON.parse(data) : null;
      }

      if (this.mode === "upstash" && this.upstash) {
        const data = await this.upstash.get<T>(key);
        return data;
      }

      return this.memory.get<T>(key);
    } catch (error) {
      console.error(`[Redis] Erreur GET ${key}:`, error);
      return this.memory.get<T>(key);
    }
  }

  /**
   * Stocke une valeur avec TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        await this.ioredis.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      }

      if (this.mode === "upstash" && this.upstash) {
        await this.upstash.setex(key, ttlSeconds, value);
        return;
      }

      await this.memory.set(key, value, ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Erreur SET ${key}:`, error);
      await this.memory.set(key, value, ttlSeconds);
    }
  }

  /**
   * Supprime une clé
   */
  async del(key: string): Promise<void> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        await this.ioredis.del(key);
      } else if (this.mode === "upstash" && this.upstash) {
        await this.upstash.del(key);
      }
      await this.memory.del(key);
    } catch (error) {
      console.error(`[Redis] Erreur DEL ${key}:`, error);
      await this.memory.del(key);
    }
  }

  /**
   * Incrémente atomiquement un compteur
   */
  async incr(key: string): Promise<number> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        return await this.ioredis.incr(key);
      }

      if (this.mode === "upstash" && this.upstash) {
        return await this.upstash.incr(key);
      }

      return await this.memory.incr(key);
    } catch (error) {
      console.error(`[Redis] Erreur INCR ${key}:`, error);
      return await this.memory.incr(key);
    }
  }

  /**
   * Définit un TTL sur une clé existante
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        await this.ioredis.expire(key, ttlSeconds);
        return;
      }

      if (this.mode === "upstash" && this.upstash) {
        await this.upstash.expire(key, ttlSeconds);
        return;
      }

      await this.memory.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`[Redis] Erreur EXPIRE ${key}:`, error);
    }
  }

  /**
   * Vérifie si une clé existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        return (await this.ioredis.exists(key)) === 1;
      }

      if (this.mode === "upstash" && this.upstash) {
        return (await this.upstash.exists(key)) === 1;
      }

      return await this.memory.exists(key);
    } catch (error) {
      console.error(`[Redis] Erreur EXISTS ${key}:`, error);
      return await this.memory.exists(key);
    }
  }

  /**
   * Récupère plusieurs clés
   */
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        const results = await this.ioredis.mget(...keys);
        return results.map((r) => (r ? JSON.parse(r) : null));
      }

      if (this.mode === "upstash" && this.upstash) {
        const results = await this.upstash.mget<T[]>(...keys);
        return results;
      }

      return await this.memory.mget<T>(...keys);
    } catch (error) {
      console.error("[Redis] Erreur MGET:", error);
      return await this.memory.mget<T>(...keys);
    }
  }

  /**
   * Trouve les clés correspondant à un pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.mode === "ioredis" && this.ioredis) {
        return await this.ioredis.keys(pattern);
      }

      if (this.mode === "upstash" && this.upstash) {
        return await this.upstash.keys(pattern);
      }

      return await this.memory.keys(pattern);
    } catch (error) {
      console.error(`[Redis] Erreur KEYS ${pattern}:`, error);
      return await this.memory.keys(pattern);
    }
  }

  /**
   * Supprime les clés correspondant à un pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;

      for (const key of keys) {
        await this.del(key);
      }

      return keys.length;
    } catch (error) {
      console.error(`[Redis] Erreur deletePattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Ferme la connexion
   */
  async disconnect(): Promise<void> {
    if (this.ioredis) {
      await this.ioredis.quit();
      this.ioredis = null;
    }
    this.upstash = null;
    this.memory.destroy();
    this.connected = false;
    this.connectionPromise = null;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const redis = new RedisClient();

/**
 * Vérifie si Redis est disponible (connecté et pas en mode memory)
 */
export function isRedisAvailable(): boolean {
  return redis.isConnected();
}

export default redis;
