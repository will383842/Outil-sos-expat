/**
 * =============================================================================
 * QUOTA SERVICE - Gestion distribuée des quotas IA via Redis
 * =============================================================================
 *
 * Remplace le cache in-memory par Redis pour:
 * - Cohérence multi-instances Cloud Functions
 * - Incrémentation atomique (INCR)
 * - Sync périodique vers Firestore
 */

import * as admin from "firebase-admin";
import redis from "./RedisClient";
import { CACHE_TTL } from "./CacheService";

// =============================================================================
// CONFIGURATION
// =============================================================================

const QUOTA_PREFIX = "quota";
const DEFAULT_QUOTA_LIMIT = 100;
const SYNC_THRESHOLD = 10; // Sync vers Firestore tous les 10 incréments
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Sync toutes les 5 minutes

// =============================================================================
// TYPES
// =============================================================================

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  hasQuota: boolean;
  unlimited: boolean;
  lastSyncAt?: number;
}

interface CachedProviderQuota {
  limit: number;
  unlimited: boolean;
  lastSyncAt: number;
}

// =============================================================================
// QUOTA SERVICE
// =============================================================================

class QuotaService {
  private db = admin.firestore();
  private pendingSyncs = new Map<string, number>();
  private syncTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  /**
   * Initialise le service de quota
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await redis.connect();

    // Démarrer le sync périodique
    this.startPeriodicSync();

    this.initialized = true;
    console.log("[QuotaService] Initialisé");
  }

  /**
   * Construit la clé Redis pour le quota
   * Format: quota:{providerId}:{YYYY-MM-DD}
   */
  private buildKey(providerId: string, date?: Date): string {
    const d = date || new Date();
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    return `${QUOTA_PREFIX}:${providerId}:${dateStr}`;
  }

  /**
   * Construit la clé pour les métadonnées provider
   */
  private buildMetaKey(providerId: string): string {
    return `${QUOTA_PREFIX}:meta:${providerId}`;
  }

  // ===========================================================================
  // OPÉRATIONS QUOTA
  // ===========================================================================

  /**
   * Vérifie le quota d'un provider
   */
  async checkQuota(providerId: string): Promise<QuotaInfo> {
    await this.initialize();

    const key = this.buildKey(providerId);
    const metaKey = this.buildMetaKey(providerId);

    // Récupérer les métadonnées (limite, unlimited)
    let meta = await redis.get<CachedProviderQuota>(metaKey);

    // Si pas de méta en cache, charger depuis Firestore
    if (!meta) {
      meta = await this.loadProviderMeta(providerId);
    }

    // Provider avec accès illimité
    if (meta.unlimited) {
      return {
        used: 0,
        limit: -1,
        remaining: -1,
        hasQuota: true,
        unlimited: true,
      };
    }

    // Récupérer le compteur actuel
    const used = (await redis.get<number>(key)) || 0;
    const remaining = Math.max(0, meta.limit - used);

    return {
      used,
      limit: meta.limit,
      remaining,
      hasQuota: remaining > 0,
      unlimited: false,
      lastSyncAt: meta.lastSyncAt,
    };
  }

  /**
   * Incrémente le compteur de quota (atomique)
   */
  async incrementQuota(
    providerId: string,
    amount: number = 1
  ): Promise<QuotaInfo> {
    await this.initialize();

    const key = this.buildKey(providerId);
    const metaKey = this.buildMetaKey(providerId);

    // Récupérer les métadonnées
    let meta = await redis.get<CachedProviderQuota>(metaKey);
    if (!meta) {
      meta = await this.loadProviderMeta(providerId);
    }

    // Provider illimité - pas d'incrémentation nécessaire
    if (meta.unlimited) {
      return {
        used: 0,
        limit: -1,
        remaining: -1,
        hasQuota: true,
        unlimited: true,
      };
    }

    // Incrémenter atomiquement
    let newUsed: number;
    if (amount === 1) {
      newUsed = await redis.incr(key);
    } else {
      const current = (await redis.get<number>(key)) || 0;
      newUsed = current + amount;
      await redis.set(key, newUsed, CACHE_TTL.QUOTA);
    }

    // S'assurer que le TTL est défini (expire à minuit)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ttlSeconds = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    await redis.expire(key, ttlSeconds);

    // Marquer pour sync si seuil atteint
    const pendingCount = (this.pendingSyncs.get(providerId) || 0) + amount;
    this.pendingSyncs.set(providerId, pendingCount);

    if (pendingCount >= SYNC_THRESHOLD) {
      // Sync immédiat si seuil atteint
      await this.syncToFirestore(providerId, newUsed);
      this.pendingSyncs.delete(providerId);
    }

    const remaining = Math.max(0, meta.limit - newUsed);

    return {
      used: newUsed,
      limit: meta.limit,
      remaining,
      hasQuota: remaining > 0,
      unlimited: false,
    };
  }

  /**
   * Vérifie ET incrémente si quota disponible (opération atomique)
   */
  async checkAndIncrement(
    providerId: string,
    amount: number = 1
  ): Promise<{ allowed: boolean; info: QuotaInfo }> {
    await this.initialize();

    // Vérifier d'abord
    const current = await this.checkQuota(providerId);

    // Accès illimité
    if (current.unlimited) {
      return { allowed: true, info: current };
    }

    // Pas de quota restant
    if (!current.hasQuota || current.remaining < amount) {
      return { allowed: false, info: current };
    }

    // Incrémenter
    const updated = await this.incrementQuota(providerId, amount);

    return {
      allowed: updated.hasQuota || updated.used <= updated.limit + amount,
      info: updated,
    };
  }

  /**
   * Récupère l'usage actuel sans modifier
   */
  async getUsage(providerId: string): Promise<QuotaInfo> {
    return this.checkQuota(providerId);
  }

  /**
   * Réinitialise le quota d'un provider (admin)
   */
  async resetQuota(providerId: string): Promise<void> {
    await this.initialize();

    const key = this.buildKey(providerId);
    await redis.del(key);
    this.pendingSyncs.delete(providerId);

    console.log(`[QuotaService] Quota reset: ${providerId}`);
  }

  /**
   * Met à jour la limite d'un provider
   */
  async updateLimit(
    providerId: string,
    newLimit: number,
    unlimited: boolean = false
  ): Promise<void> {
    await this.initialize();

    const metaKey = this.buildMetaKey(providerId);
    const meta: CachedProviderQuota = {
      limit: newLimit,
      unlimited,
      lastSyncAt: Date.now(),
    };

    await redis.set(metaKey, meta, CACHE_TTL.QUOTA);

    console.log(
      `[QuotaService] Limite mise à jour: ${providerId} = ${unlimited ? "unlimited" : newLimit}`
    );
  }

  /**
   * Invalide le cache d'un provider
   */
  async invalidateProvider(providerId: string): Promise<void> {
    await this.initialize();

    const metaKey = this.buildMetaKey(providerId);
    await redis.del(metaKey);

    console.log(`[QuotaService] Cache invalidé: ${providerId}`);
  }

  // ===========================================================================
  // SYNC FIRESTORE
  // ===========================================================================

  /**
   * Charge les métadonnées provider depuis Firestore
   */
  private async loadProviderMeta(
    providerId: string
  ): Promise<CachedProviderQuota> {
    try {
      const providerDoc = await this.db
        .collection("providers")
        .doc(providerId)
        .get();

      const data = providerDoc.data();

      const meta: CachedProviderQuota = {
        // AUDIT-FIX: ?? au lieu de || pour que aiCallsLimit:0 = 0 appels (pas 100)
        limit: data?.aiCallsLimit ?? DEFAULT_QUOTA_LIMIT,
        unlimited: data?.forcedAIAccess === true,
        lastSyncAt: Date.now(),
      };

      // Cacher les métadonnées
      const metaKey = this.buildMetaKey(providerId);
      await redis.set(metaKey, meta, CACHE_TTL.QUOTA);

      return meta;
    } catch (error) {
      console.error(
        `[QuotaService] Erreur chargement meta ${providerId}:`,
        error
      );

      // Retourner des valeurs par défaut
      return {
        limit: DEFAULT_QUOTA_LIMIT,
        unlimited: false,
        lastSyncAt: Date.now(),
      };
    }
  }

  /**
   * Synchronise le compteur vers Firestore
   */
  private async syncToFirestore(
    providerId: string,
    currentUsage: number
  ): Promise<void> {
    try {
      await this.db
        .collection("providers")
        .doc(providerId)
        .update({
          aiCallsUsed: currentUsage,
          aiLastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(
        `[QuotaService] Synced to Firestore: ${providerId} = ${currentUsage}`
      );
    } catch (error) {
      console.error(`[QuotaService] Erreur sync ${providerId}:`, error);
    }
  }

  /**
   * Démarre le sync périodique
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      await this.syncAllPending();
    }, SYNC_INTERVAL_MS);

    console.log(
      `[QuotaService] Sync périodique démarré (${SYNC_INTERVAL_MS / 1000}s)`
    );
  }

  /**
   * Synchronise tous les compteurs en attente
   */
  async syncAllPending(): Promise<void> {
    if (this.pendingSyncs.size === 0) return;

    const batch = this.db.batch();
    const synced: string[] = [];

    for (const [providerId] of this.pendingSyncs) {
      try {
        const key = this.buildKey(providerId);
        const currentUsage = (await redis.get<number>(key)) || 0;

        const ref = this.db.collection("providers").doc(providerId);
        batch.update(ref, {
          aiCallsUsed: currentUsage,
          aiLastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        synced.push(providerId);
      } catch (error) {
        console.error(`[QuotaService] Erreur préparation sync ${providerId}:`, error);
      }
    }

    if (synced.length > 0) {
      try {
        await batch.commit();
        synced.forEach((id) => this.pendingSyncs.delete(id));
        console.log(`[QuotaService] Batch sync: ${synced.length} providers`);
      } catch (error) {
        console.error("[QuotaService] Erreur batch sync:", error);
      }
    }
  }

  /**
   * Arrête le service proprement
   */
  async shutdown(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Sync final
    await this.syncAllPending();

    console.log("[QuotaService] Arrêté");
  }

  // ===========================================================================
  // UTILITAIRES
  // ===========================================================================

  /**
   * Récupère les quotas de plusieurs providers
   */
  async getMultipleQuotas(providerIds: string[]): Promise<Map<string, QuotaInfo>> {
    await this.initialize();

    const results = new Map<string, QuotaInfo>();

    // Récupérer en parallèle
    const promises = providerIds.map(async (id) => {
      const info = await this.checkQuota(id);
      results.set(id, info);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Récupère les providers proches de leur limite
   */
  async getProvidersNearLimit(
    threshold: number = 0.9
  ): Promise<Array<{ providerId: string; info: QuotaInfo }>> {
    // Cette opération nécessite un scan - utiliser avec précaution
    const keys = await redis.keys(`${QUOTA_PREFIX}:*:*`);
    const nearLimit: Array<{ providerId: string; info: QuotaInfo }> = [];

    for (const key of keys) {
      // Extraire providerId du format quota:{providerId}:{date}
      const parts = key.split(":");
      if (parts.length < 3 || parts[1] === "meta") continue;

      const providerId = parts[1];
      const info = await this.checkQuota(providerId);

      if (!info.unlimited && info.limit > 0) {
        const usage = info.used / info.limit;
        if (usage >= threshold) {
          nearLimit.push({ providerId, info });
        }
      }
    }

    return nearLimit;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const quotaService = new QuotaService();

export default quotaService;
