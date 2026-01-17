/**
 * =============================================================================
 * SENTRY - Configuration du monitoring d'erreurs backend
 * =============================================================================
 */

import * as Sentry from "@sentry/node";
import { logger } from "firebase-functions";

// Flag pour éviter double initialisation
let isInitialized = false;

/**
 * Initialise Sentry pour les Cloud Functions
 * Doit être appelé au début de chaque fonction
 */
export function initSentry(): void {
  if (isInitialized) return;

  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info("[Sentry] Désactivé (SENTRY_DSN non configuré)");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "production",

    // Cloud Functions specifics
    serverName: "sos-expat-functions",

    // Taux d'échantillonnage
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // Intégrations pour Node.js
    integrations: [
      Sentry.httpIntegration(),
    ],

    // Filtrer les erreurs non pertinentes
    ignoreErrors: [
      "PERMISSION_DENIED",
      "NOT_FOUND",
      "UNAUTHENTICATED",
    ],

    // Avant d'envoyer une erreur
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ne pas envoyer les erreurs de rate limiting
      if (error instanceof Error && error.message.includes("rate limit")) {
        return null;
      }

      // Ne pas envoyer les erreurs de quota
      if (error instanceof Error && error.message.includes("quota")) {
        return null;
      }

      return event;
    },
  });

  isInitialized = true;
  logger.info("[Sentry] Initialisé");
}

/**
 * Capture une erreur avec contexte Cloud Functions
 */
export function captureError(
  error: Error,
  context?: {
    functionName?: string;
    userId?: string;
    providerId?: string;
    requestId?: string;
    extra?: Record<string, unknown>;
  }
): void {
  if (!isInitialized) {
    logger.error("[Sentry] Erreur (non initialisé):", error.message);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.functionName) {
      scope.setTag("function", context.functionName);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.providerId) {
      scope.setTag("provider_id", context.providerId);
    }
    if (context?.requestId) {
      scope.setTag("request_id", context.requestId);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture un message d'alerte
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "warning"
): void {
  if (!isInitialized) {
    logger.log(`[Sentry] ${level}: ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Wrapper pour les Cloud Functions avec Sentry
 * Capture automatiquement les erreurs non gérées
 */
export function wrapWithSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  functionName: string,
  fn: T
): T {
  return (async (...args: unknown[]) => {
    initSentry();

    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, { functionName });
      throw error;
    }
  }) as T;
}

/**
 * Flush les événements Sentry avant la fin de la fonction
 * Appelé automatiquement si timeout proche
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  if (!isInitialized) return;

  try {
    await Sentry.flush(timeout);
  } catch (error) {
    logger.warn("[Sentry] Flush timeout");
  }
}

// Export Sentry pour utilisation directe
export { Sentry };
