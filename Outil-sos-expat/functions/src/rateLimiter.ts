/**
 * =============================================================================
 * RATE LIMITER - Protection contre les abus
 * =============================================================================
 *
 * Système de rate limiting basé sur Firestore pour limiter :
 * - Appels API par utilisateur
 * - Appels IA par utilisateur/provider
 * - Webhooks par IP
 *
 * Utilise un système de buckets temporels pour un suivi efficace.
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// Initialize Admin SDK
try { admin.app(); } catch { admin.initializeApp(); }

// =============================================================================
// CONFIGURATION
// =============================================================================

export const RATE_LIMIT_CONFIG = {
  // Limites par défaut
  DEFAULT: {
    limit: 100,           // Requêtes max
    windowSeconds: 3600,  // Par heure
  },

  // Limites spécifiques par type d'opération
  LIMITS: {
    // Appels IA (coûteux)
    AI_CHAT: {
      limit: 50,            // 50 requêtes
      windowSeconds: 3600,  // Par heure
    },
    AI_CHAT_PROVIDER: {
      limit: 200,           // Providers ont plus de marge
      windowSeconds: 3600,
    },

    // Webhooks entrants
    WEBHOOK_INGEST: {
      limit: 100,
      windowSeconds: 60,    // Par minute (protection DDoS)
    },

    // Création de bookings
    BOOKING_CREATE: {
      limit: 20,
      windowSeconds: 3600,
    },

    // Messages
    MESSAGE_SEND: {
      limit: 100,
      windowSeconds: 3600,
    },

    // Auth attempts
    AUTH_LOGIN: {
      limit: 10,
      windowSeconds: 300,   // 10 tentatives par 5 minutes
    },

    // API générale
    API_GENERAL: {
      limit: 500,
      windowSeconds: 3600,
    },
  },

  // Durée de rétention des buckets (nettoyage)
  BUCKET_RETENTION_HOURS: 24,
} as const;

type RateLimitType = keyof typeof RATE_LIMIT_CONFIG.LIMITS;

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitBucket {
  count: number;
  bucket: number;
  firstRequestAt: admin.firestore.Timestamp;
  lastRequestAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  current: number;
}

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

/**
 * Vérifie et incrémente le compteur de rate limit
 *
 * @param key - Identifiant unique (userId, IP, etc.)
 * @param type - Type de limite à appliquer
 * @returns RateLimitResult avec le statut
 */
export async function checkRateLimit(
  key: string,
  type: RateLimitType = "API_GENERAL"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG.LIMITS[type];
  const { limit, windowSeconds } = config;

  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const bucketKey = `${type}:${key}:${bucket}`;

  const db = admin.firestore();
  const docRef = db
    .collection("ops")
    .doc("ratelimits")
    .collection("entries")
    .doc(bucketKey);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const currentCount = snap.exists ? (snap.data()?.count || 0) : 0;

      // Calculer quand le bucket expire
      const resetAt = new Date((bucket + 1) * windowSeconds * 1000);

      if (currentCount >= limit) {
        // Limite atteinte
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          limit,
          current: currentCount,
        };
      }

      // Incrémenter le compteur
      const newCount = currentCount + 1;
      const updateData: Partial<RateLimitBucket> = {
        count: newCount,
        bucket,
        lastRequestAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!snap.exists) {
        updateData.firstRequestAt = admin.firestore.Timestamp.now();
        tx.set(docRef, updateData);
      } else {
        tx.update(docRef, updateData);
      }

      return {
        allowed: true,
        remaining: limit - newCount,
        resetAt,
        limit,
        current: newCount,
      };
    });

    return result;

  } catch (error) {
    // En cas d'erreur, autoriser par défaut mais logger
    logger.warn("[checkRateLimit] Erreur, autorisation par défaut", {
      key,
      type,
      error: (error as Error).message,
    });

    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now + windowSeconds * 1000),
      limit,
      current: 0,
    };
  }
}

/**
 * Vérifie le rate limit sans incrémenter (peek)
 */
export async function peekRateLimit(
  key: string,
  type: RateLimitType = "API_GENERAL"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG.LIMITS[type];
  const { limit, windowSeconds } = config;

  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const bucketKey = `${type}:${key}:${bucket}`;

  const db = admin.firestore();
  const docRef = db
    .collection("ops")
    .doc("ratelimits")
    .collection("entries")
    .doc(bucketKey);

  const snap = await docRef.get();
  const currentCount = snap.exists ? (snap.data()?.count || 0) : 0;
  const resetAt = new Date((bucket + 1) * windowSeconds * 1000);

  return {
    allowed: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
    resetAt,
    limit,
    current: currentCount,
  };
}

/**
 * Réinitialise le compteur pour une clé (admin only)
 */
export async function resetRateLimit(
  key: string,
  type: RateLimitType = "API_GENERAL"
): Promise<void> {
  const config = RATE_LIMIT_CONFIG.LIMITS[type];
  const { windowSeconds } = config;

  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const bucketKey = `${type}:${key}:${bucket}`;

  const db = admin.firestore();
  await db
    .collection("ops")
    .doc("ratelimits")
    .collection("entries")
    .doc(bucketKey)
    .delete();

  logger.info("[resetRateLimit] Compteur réinitialisé", { key, type });
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Helper pour générer les headers de rate limit HTTP
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt.getTime() / 1000).toString(),
    "Retry-After": result.allowed
      ? "0"
      : Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
  };
}

/**
 * Wrapper pour appliquer le rate limiting à une fonction
 */
export async function withRateLimit<T>(
  key: string,
  type: RateLimitType,
  fn: () => Promise<T>
): Promise<{ result: T | null; rateLimitResult: RateLimitResult }> {
  const rateLimitResult = await checkRateLimit(key, type);

  if (!rateLimitResult.allowed) {
    return { result: null, rateLimitResult };
  }

  const result = await fn();
  return { result, rateLimitResult };
}

// =============================================================================
// NETTOYAGE DES ANCIENS BUCKETS
// =============================================================================

/**
 * Supprime les anciens buckets de rate limit
 * À appeler via Cloud Scheduler (quotidiennement)
 */
export async function cleanupOldBuckets(): Promise<{
  deleted: number;
  errors: number;
}> {
  const db = admin.firestore();
  const retentionMs = RATE_LIMIT_CONFIG.BUCKET_RETENTION_HOURS * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - retentionMs);

  const oldBuckets = await db
    .collection("ops")
    .doc("ratelimits")
    .collection("entries")
    .where("lastRequestAt", "<", cutoff)
    .limit(500) // Batch de 500
    .get();

  let deleted = 0;
  let errors = 0;

  // Supprimer par batch
  const batch = db.batch();
  for (const doc of oldBuckets.docs) {
    batch.delete(doc.ref);
    deleted++;
  }

  try {
    await batch.commit();
  } catch (error) {
    errors = deleted;
    deleted = 0;
    logger.error("[cleanupOldBuckets] Erreur batch delete", error);
  }

  logger.info("[cleanupOldBuckets] Nettoyage terminé", { deleted, errors });

  return { deleted, errors };
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques de rate limit pour un utilisateur
 */
export async function getRateLimitStats(key: string): Promise<{
  types: Record<RateLimitType, { current: number; limit: number; resetAt: Date }>;
}> {
  const types = Object.keys(RATE_LIMIT_CONFIG.LIMITS) as RateLimitType[];
  const stats: Record<string, { current: number; limit: number; resetAt: Date }> = {};

  await Promise.all(
    types.map(async (type) => {
      const result = await peekRateLimit(key, type);
      stats[type] = {
        current: result.current,
        limit: result.limit,
        resetAt: result.resetAt,
      };
    })
  );

  return { types: stats as Record<RateLimitType, { current: number; limit: number; resetAt: Date }> };
}
