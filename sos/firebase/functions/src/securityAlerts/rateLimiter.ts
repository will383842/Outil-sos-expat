/**
 * Rate Limiter pour les alertes de sécurité SOS Expat
 * Évite le spam d'alertes en limitant par type et par source
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { SecurityAlertType, AlertRateLimit } from './types';

// ==========================================
// CONFIGURATION DES LIMITES PAR TYPE
// ==========================================

export interface RateLimitConfig {
  windowMs: number;      // Durée de la fenêtre en ms
  maxAlerts: number;     // Nombre max d'alertes dans la fenêtre
  burstLimit?: number;   // Limite de burst (optionnel)
}

export const ALERT_RATE_LIMITS: Record<SecurityAlertType, RateLimitConfig> = {
  'security.brute_force_detected': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 3,
    burstLimit: 1,
  },
  'security.unusual_location': {
    windowMs: 60 * 60 * 1000,     // 1 heure
    maxAlerts: 5,
  },
  'security.suspicious_payment': {
    windowMs: 15 * 60 * 1000,     // 15 minutes
    maxAlerts: 5,
  },
  'security.mass_account_creation': {
    windowMs: 10 * 60 * 1000,     // 10 minutes
    maxAlerts: 2,
    burstLimit: 1,
  },
  'security.api_abuse': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 10,
  },
  'security.data_breach_attempt': {
    windowMs: 2 * 60 * 1000,      // 2 minutes
    maxAlerts: 1,                  // Toujours alerter immédiatement
    burstLimit: 1,
  },
  'security.admin_action_required': {
    windowMs: 30 * 60 * 1000,     // 30 minutes
    maxAlerts: 10,
  },
  'security.system_critical': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 3,
  },
  'security.impossible_travel': {
    windowMs: 60 * 60 * 1000,     // 1 heure
    maxAlerts: 3,
  },
  'security.multiple_sessions': {
    windowMs: 30 * 60 * 1000,     // 30 minutes
    maxAlerts: 5,
  },
  'security.card_testing': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 2,
    burstLimit: 1,
  },
  'security.promo_abuse': {
    windowMs: 60 * 60 * 1000,     // 1 heure
    maxAlerts: 5,
  },
  'security.sql_injection': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 3,
    burstLimit: 1,
  },
  'security.xss_attempt': {
    windowMs: 5 * 60 * 1000,      // 5 minutes
    maxAlerts: 3,
    burstLimit: 1,
  },
  'security.rate_limit_exceeded': {
    windowMs: 10 * 60 * 1000,     // 10 minutes
    maxAlerts: 5,
  },
};

// ==========================================
// GÉNÉRATION DE CLÉS DE RATE LIMIT
// ==========================================

export interface RateLimitKeyParams {
  alertType: SecurityAlertType;
  sourceIp?: string;
  userId?: string;
  endpoint?: string;
}

/**
 * Génère une clé unique pour le rate limiting
 * Combine le type d'alerte avec la source (IP, userId, ou endpoint)
 */
export function generateRateLimitKey(params: RateLimitKeyParams): string {
  const { alertType, sourceIp, userId, endpoint } = params;

  const parts = [alertType];

  // Priorité: userId > IP > endpoint > global
  if (userId) {
    parts.push(`user:${userId}`);
  } else if (sourceIp) {
    // Normaliser l'IP (supprimer le port si présent)
    const normalizedIp = sourceIp.split(':')[0];
    parts.push(`ip:${normalizedIp}`);
  } else if (endpoint) {
    parts.push(`endpoint:${endpoint}`);
  } else {
    parts.push('global');
  }

  return parts.join('|');
}

// ==========================================
// VÉRIFICATION DE RATE LIMIT
// ==========================================

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  windowRemainingMs: number;
  suppressed: number;
  retryAfterMs?: number;
}

/**
 * Vérifie si une nouvelle alerte peut être créée selon les limites
 */
export async function checkRateLimit(
  alertType: SecurityAlertType,
  key: string
): Promise<RateLimitResult> {
  const config = ALERT_RATE_LIMITS[alertType];
  if (!config) {
    // Type inconnu, autoriser par défaut
    return {
      allowed: true,
      currentCount: 0,
      maxAllowed: 100,
      windowRemainingMs: 0,
      suppressed: 0,
    };
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;

  const limitRef = db.collection('alert_rate_limits').doc(key);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(limitRef);

      if (!doc.exists) {
        // Première alerte de ce type pour cette source
        const newLimit: Omit<AlertRateLimit, 'key'> = {
          alertType,
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          windowEnd: Timestamp.fromMillis(now + config.windowMs),
          lastAlertId: '',
          suppressed: 0,
        };

        transaction.set(limitRef, { ...newLimit, key });

        return {
          allowed: true,
          currentCount: 1,
          maxAllowed: config.maxAlerts,
          windowRemainingMs: config.windowMs,
          suppressed: 0,
        };
      }

      const data = doc.data() as AlertRateLimit;
      const docWindowStart = data.windowStart.toMillis();

      // Vérifier si la fenêtre a expiré
      if (docWindowStart < windowStart) {
        // Nouvelle fenêtre
        const newLimit: Partial<AlertRateLimit> = {
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          windowEnd: Timestamp.fromMillis(now + config.windowMs),
          suppressed: 0,
        };

        transaction.update(limitRef, newLimit);

        return {
          allowed: true,
          currentCount: 1,
          maxAllowed: config.maxAlerts,
          windowRemainingMs: config.windowMs,
          suppressed: 0,
        };
      }

      // Fenêtre en cours
      const newCount = data.count + 1;
      const windowRemaining = data.windowEnd.toMillis() - now;

      if (newCount > config.maxAlerts) {
        // Rate limit dépassé - incrémenter le compteur de suppression
        transaction.update(limitRef, {
          suppressed: FieldValue.increment(1),
        });

        return {
          allowed: false,
          currentCount: data.count,
          maxAllowed: config.maxAlerts,
          windowRemainingMs: Math.max(0, windowRemaining),
          suppressed: data.suppressed + 1,
          retryAfterMs: Math.max(0, windowRemaining),
        };
      }

      // Vérifier le burst limit
      if (config.burstLimit && newCount > config.burstLimit) {
        // Calculer le délai entre les alertes
        const timeSinceWindowStart = now - docWindowStart;
        const expectedInterval = config.windowMs / config.maxAlerts;
        const actualInterval = timeSinceWindowStart / data.count;

        if (actualInterval < expectedInterval * 0.5) {
          // Burst trop rapide
          transaction.update(limitRef, {
            suppressed: FieldValue.increment(1),
          });

          return {
            allowed: false,
            currentCount: data.count,
            maxAllowed: config.maxAlerts,
            windowRemainingMs: Math.max(0, windowRemaining),
            suppressed: data.suppressed + 1,
            retryAfterMs: Math.round(expectedInterval),
          };
        }
      }

      // Autoriser l'alerte
      transaction.update(limitRef, {
        count: newCount,
      });

      return {
        allowed: true,
        currentCount: newCount,
        maxAllowed: config.maxAlerts,
        windowRemainingMs: Math.max(0, windowRemaining),
        suppressed: data.suppressed,
      };
    });

    return result;
  } catch (error) {
    console.error('[RateLimiter] Error checking rate limit:', error);
    // En cas d'erreur, autoriser par défaut pour ne pas bloquer les alertes critiques
    return {
      allowed: true,
      currentCount: 0,
      maxAllowed: config.maxAlerts,
      windowRemainingMs: 0,
      suppressed: 0,
    };
  }
}

// ==========================================
// MISE À JOUR APRÈS CRÉATION D'ALERTE
// ==========================================

/**
 * Met à jour le rate limit après création réussie d'une alerte
 */
export async function updateRateLimitAfterAlert(
  key: string,
  alertId: string
): Promise<void> {
  try {
    await db.collection('alert_rate_limits').doc(key).update({
      lastAlertId: alertId,
    });
  } catch (error) {
    // Ignorer les erreurs de mise à jour
    console.warn('[RateLimiter] Failed to update lastAlertId:', error);
  }
}

// ==========================================
// NETTOYAGE DES RATE LIMITS EXPIRÉS
// ==========================================

/**
 * Supprime les documents de rate limit expirés
 * À appeler via une Cloud Function scheduled (ex: toutes les heures)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const now = Timestamp.now();
  const batchSize = 500;
  let deletedCount = 0;

  try {
    const expiredDocs = await db
      .collection('alert_rate_limits')
      .where('windowEnd', '<', now)
      .limit(batchSize)
      .get();

    if (expiredDocs.empty) {
      return 0;
    }

    const batch = db.batch();
    expiredDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    console.log(`[RateLimiter] Cleaned up ${deletedCount} expired rate limits`);
    return deletedCount;
  } catch (error) {
    console.error('[RateLimiter] Error cleaning up expired rate limits:', error);
    throw error;
  }
}

// ==========================================
// STATISTIQUES DE RATE LIMITING
// ==========================================

export interface RateLimitStats {
  totalActive: number;
  byAlertType: Record<string, number>;
  totalSuppressed: number;
  topSuppressed: Array<{
    key: string;
    alertType: SecurityAlertType;
    suppressed: number;
  }>;
}

/**
 * Récupère les statistiques de rate limiting
 */
export async function getRateLimitStats(): Promise<RateLimitStats> {
  try {
    const snapshot = await db.collection('alert_rate_limits').get();

    const stats: RateLimitStats = {
      totalActive: snapshot.size,
      byAlertType: {},
      totalSuppressed: 0,
      topSuppressed: [],
    };

    const suppressedList: Array<{
      key: string;
      alertType: SecurityAlertType;
      suppressed: number;
    }> = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AlertRateLimit;

      // Compter par type
      stats.byAlertType[data.alertType] = (stats.byAlertType[data.alertType] || 0) + 1;

      // Total supprimé
      stats.totalSuppressed += data.suppressed || 0;

      // Ajouter à la liste pour tri
      if (data.suppressed > 0) {
        suppressedList.push({
          key: data.key,
          alertType: data.alertType,
          suppressed: data.suppressed,
        });
      }
    });

    // Top 10 des plus supprimés
    stats.topSuppressed = suppressedList
      .sort((a, b) => b.suppressed - a.suppressed)
      .slice(0, 10);

    return stats;
  } catch (error) {
    console.error('[RateLimiter] Error getting stats:', error);
    throw error;
  }
}

// ==========================================
// BYPASS POUR ALERTES CRITIQUES
// ==========================================

/**
 * Vérifie si une alerte doit bypasser le rate limiting
 * Les alertes emergency et certains types critiques ne sont jamais rate-limitées
 */
export function shouldBypassRateLimit(
  alertType: SecurityAlertType,
  severity: string,
  forceNotify?: boolean
): boolean {
  // Emergency bypass toujours
  if (severity === 'emergency') {
    return true;
  }

  // Force notify bypass
  if (forceNotify) {
    return true;
  }

  // Types qui ne doivent jamais être rate-limitées
  const neverRateLimitTypes: SecurityAlertType[] = [
    'security.data_breach_attempt',
    'security.system_critical',
  ];

  return neverRateLimitTypes.includes(alertType);
}

// ==========================================
// RESET DE RATE LIMIT (ADMIN)
// ==========================================

/**
 * Réinitialise le rate limit pour une clé spécifique
 * Utilisé par les admins pour débloquer manuellement
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await db.collection('alert_rate_limits').doc(key).delete();
    console.log(`[RateLimiter] Reset rate limit for key: ${key}`);
  } catch (error) {
    console.error('[RateLimiter] Error resetting rate limit:', error);
    throw error;
  }
}

/**
 * Réinitialise tous les rate limits pour un type d'alerte
 */
export async function resetRateLimitsByType(
  alertType: SecurityAlertType
): Promise<number> {
  try {
    const snapshot = await db
      .collection('alert_rate_limits')
      .where('alertType', '==', alertType)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`[RateLimiter] Reset ${snapshot.size} rate limits for type: ${alertType}`);
    return snapshot.size;
  } catch (error) {
    console.error('[RateLimiter] Error resetting rate limits by type:', error);
    throw error;
  }
}
