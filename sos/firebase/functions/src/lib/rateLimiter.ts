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
    // SECURITY FIX: Fail-closed — reject request if rate limiter DB is unavailable
    throw new HttpsError("unavailable", "Service temporarily unavailable. Please try again.");
  }
}

/**
 * Rate limiting par IP (pour requêtes anonymes / non-authentifiées).
 * Utilise un hash SHA-256 tronqué de l'IP pour éviter de stocker l'IP brute en Firestore.
 */
export async function checkIpRateLimit(
  ip: string,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  const crypto = await import("crypto");
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
  await checkRateLimit(`ip_${ipHash}`, action, config);
}

/**
 * Extrait l'IP client depuis un Request (Cloud Functions / Express).
 * Prend en compte Cloudflare (CF-Connecting-IP), puis x-forwarded-for, puis remoteAddress.
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }

  return req.socket?.remoteAddress || "unknown";
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
  /** Scraping protection: 60 req / minute par IP (pages publiques) */
  PUBLIC_PAGE: { maxRequests: 60, windowMs: 60 * 1000 },
  /** API publique: 30 req / minute par IP */
  PUBLIC_API: { maxRequests: 30, windowMs: 60 * 1000 },
  /** SSR render: 20 req / minute par IP (bots légitimes) */
  SSR_RENDER: { maxRequests: 20, windowMs: 60 * 1000 },
} as const;
