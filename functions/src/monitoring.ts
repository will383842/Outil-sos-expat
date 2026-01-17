/**
 * =============================================================================
 * MONITORING - Utilities pour surveillance et alerting
 * =============================================================================
 *
 * Ce module fournit des utilitaires pour:
 * - Logging structuré avec contexte
 * - Métriques de performance
 * - Alerting sur événements critiques
 * - Tracking des erreurs
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// =============================================================================
// TYPES
// =============================================================================

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface AlertConfig {
  severity: AlertSeverity;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  notifySlack?: boolean;
  notifyEmail?: boolean;
}

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  error: Error | string;
  context: Record<string, unknown>;
  severity: AlertSeverity;
  userId?: string;
  requestId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALERT_THRESHOLDS = {
  // Seuils de latence (ms)
  AI_RESPONSE_WARNING: 10000, // 10s
  AI_RESPONSE_CRITICAL: 30000, // 30s
  API_RESPONSE_WARNING: 5000, // 5s
  API_RESPONSE_CRITICAL: 15000, // 15s

  // Seuils d'erreurs par heure
  ERROR_RATE_WARNING: 10,
  ERROR_RATE_CRITICAL: 50,

  // Seuils de quota
  QUOTA_WARNING_PERCENT: 80,
  QUOTA_CRITICAL_PERCENT: 95,
};

// =============================================================================
// LOGGING STRUCTURÉ
// =============================================================================

/**
 * Log avec contexte structuré pour Cloud Logging
 */
export function logStructured(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {}
): void {
  const logData = {
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  switch (level) {
    case "info":
      logger.info(message, logData);
      break;
    case "warn":
      logger.warn(message, logData);
      break;
    case "error":
      logger.error(message, logData);
      break;
  }
}

// =============================================================================
// PERFORMANCE TRACKING
// =============================================================================

/**
 * Crée un tracker de performance pour une opération
 */
export function createPerformanceTracker(operation: string) {
  const startTime = Date.now();

  return {
    /**
     * Termine le tracking et log les métriques
     */
    end(success: boolean = true, metadata: Record<string, unknown> = {}): PerformanceMetric {
      const durationMs = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        durationMs,
        success,
        metadata,
      };

      // Log la métrique
      logStructured(
        success ? "info" : "warn",
        `[Performance] ${operation}`,
        {
          durationMs,
          success,
          ...metadata,
        }
      );

      // Vérifier les seuils d'alerte
      if (operation.startsWith("ai_")) {
        if (durationMs > ALERT_THRESHOLDS.AI_RESPONSE_CRITICAL) {
          trackAlert({
            severity: "critical",
            category: "performance",
            message: `AI response time critical: ${durationMs}ms`,
            context: { operation, durationMs },
          });
        } else if (durationMs > ALERT_THRESHOLDS.AI_RESPONSE_WARNING) {
          trackAlert({
            severity: "warning",
            category: "performance",
            message: `AI response time warning: ${durationMs}ms`,
            context: { operation, durationMs },
          });
        }
      }

      return metric;
    },

    /**
     * Retourne la durée actuelle sans terminer le tracking
     */
    elapsed(): number {
      return Date.now() - startTime;
    },
  };
}

// =============================================================================
// ALERTING
// =============================================================================

/**
 * Enregistre une alerte dans Firestore et log
 */
export async function trackAlert(config: AlertConfig): Promise<void> {
  const { severity, category, message, context = {} } = config;

  // Log immédiat
  const logLevel = severity === "critical" || severity === "error" ? "error" : "warn";
  logStructured(logLevel, `[Alert] ${message}`, {
    severity,
    category,
    ...context,
  });

  // Stocker dans Firestore pour dashboard et historique
  try {
    const db = admin.firestore();
    await db.collection("alerts").add({
      severity,
      category,
      message,
      context,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      acknowledged: false,
    });
  } catch (error) {
    // Ne pas bloquer si l'écriture échoue
    logger.error("[Monitoring] Failed to store alert", { error });
  }
}

/**
 * Crée une alerte pour les erreurs critiques
 */
export async function alertCriticalError(
  error: Error | string,
  context: Record<string, unknown> = {}
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  await trackAlert({
    severity: "critical",
    category: "error",
    message: `Critical error: ${errorMessage}`,
    context: {
      ...context,
      errorStack,
    },
  });
}

// =============================================================================
// ERROR TRACKING
// =============================================================================

/**
 * Enregistre une erreur avec contexte complet
 */
export async function trackError(report: ErrorReport): Promise<void> {
  const { error, context, severity, userId, requestId } = report;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log immédiat
  logStructured("error", `[Error] ${errorMessage}`, {
    severity,
    userId,
    requestId,
    errorStack,
    ...context,
  });

  // Stocker dans Firestore
  try {
    const db = admin.firestore();
    await db.collection("errorLogs").add({
      message: errorMessage,
      stack: errorStack,
      severity,
      userId: userId || null,
      requestId: requestId || null,
      context,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Incrémenter le compteur d'erreurs pour rate limiting
    const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const counterRef = db.collection("errorCounters").doc(hourKey);
    await counterRef.set(
      {
        count: admin.firestore.FieldValue.increment(1),
        lastError: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    logger.error("[Monitoring] Failed to store error", { e });
  }
}

// =============================================================================
// QUOTA MONITORING
// =============================================================================

/**
 * Vérifie et alerte sur les quotas IA
 */
export async function checkQuotaAlerts(
  providerId: string,
  used: number,
  limit: number
): Promise<void> {
  const percentUsed = (used / limit) * 100;

  if (percentUsed >= ALERT_THRESHOLDS.QUOTA_CRITICAL_PERCENT) {
    await trackAlert({
      severity: "critical",
      category: "quota",
      message: `Provider ${providerId} quota critical: ${percentUsed.toFixed(1)}%`,
      context: { providerId, used, limit, percentUsed },
    });
  } else if (percentUsed >= ALERT_THRESHOLDS.QUOTA_WARNING_PERCENT) {
    await trackAlert({
      severity: "warning",
      category: "quota",
      message: `Provider ${providerId} quota warning: ${percentUsed.toFixed(1)}%`,
      context: { providerId, used, limit, percentUsed },
    });
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Vérifie la santé des services critiques
 */
export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  services: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number }>;
}> {
  const services: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number }> = {};

  // Check Firestore
  try {
    const start = Date.now();
    const db = admin.firestore();
    await db.collection("health").doc("ping").set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    const latencyMs = Date.now() - start;
    services.firestore = {
      status: latencyMs < 1000 ? "ok" : "degraded",
      latencyMs,
    };
  } catch {
    services.firestore = { status: "down" };
  }

  // Check Auth
  try {
    const start = Date.now();
    await admin.auth().listUsers(1);
    const latencyMs = Date.now() - start;
    services.auth = {
      status: latencyMs < 2000 ? "ok" : "degraded",
      latencyMs,
    };
  } catch {
    services.auth = { status: "down" };
  }

  const healthy = Object.values(services).every((s) => s.status !== "down");

  return { healthy, services };
}

// =============================================================================
// METRICS AGGREGATION
// =============================================================================

/**
 * Agrège les métriques pour un endpoint
 */
export async function recordEndpointMetrics(
  endpoint: string,
  statusCode: number,
  durationMs: number,
  requestId: string
): Promise<void> {
  try {
    const db = admin.firestore();
    const hourKey = new Date().toISOString().slice(0, 13);
    const metricsRef = db.collection("endpointMetrics").doc(`${endpoint}_${hourKey}`);

    await metricsRef.set(
      {
        endpoint,
        hour: hourKey,
        totalRequests: admin.firestore.FieldValue.increment(1),
        totalDurationMs: admin.firestore.FieldValue.increment(durationMs),
        [`status_${statusCode}`]: admin.firestore.FieldValue.increment(1),
        lastRequestId: requestId,
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    // Silent fail - metrics should not impact main flow
    logger.warn("[Monitoring] Failed to record metrics", { error });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ALERT_THRESHOLDS };
