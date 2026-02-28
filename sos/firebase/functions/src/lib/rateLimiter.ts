/**
 * Rate Limiter pour Firebase Callables
 * Utilise Firestore pour tracker les requêtes par utilisateur/action
 */

import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

interface RateLimitConfig {
  /** Nombre max de requêtes autorisées dans la fenêtre */
  maxRequests: number;
  /** Durée de la fenêtre en millisecondes */
  windowMs: number;
}

const COLLECTION = "rate_limits";

/**
 * Vérifie et applique le rate limiting pour un utilisateur/action.
 * Lève HttpsError("resource-exhausted") si la limite est dépassée.
 */
export async function checkRateLimit(
  uid: string,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection(COLLECTION).doc(`${uid}_${action}`);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      const data = doc.data();

      const recentTimestamps: number[] = data
        ? (data.timestamps || []).filter((t: number) => t > windowStart)
        : [];

      if (recentTimestamps.length >= config.maxRequests) {
        throw new HttpsError(
          "resource-exhausted",
          `Too many requests. Limit: ${config.maxRequests} per ${Math.round(config.windowMs / 1000)}s.`
        );
      }

      tx.set(docRef, {
        timestamps: [...recentTimestamps, now],
        updatedAt: now,
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`[rateLimiter] Error for ${uid}/${action}:`, error);
  }
}

/** Presets pour les cas courants */
export const RATE_LIMITS = {
  /** Admin claims: 5 req / 5 min */
  ADMIN_CLAIMS: { maxRequests: 5, windowMs: 5 * 60 * 1000 },
  /** Appels: 3 req / minute */
  CREATE_CALL: { maxRequests: 3, windowMs: 60 * 1000 },
  /** Retraits: 3 req / heure (user-initiated) */
  WITHDRAWAL: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  /** Auth sensible: 10 req / 15 min */
  SENSITIVE_AUTH: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  /** Registration: 2 req / heure (anti-fraud) */
  REGISTRATION: { maxRequests: 2, windowMs: 60 * 60 * 1000 },
} as const;
