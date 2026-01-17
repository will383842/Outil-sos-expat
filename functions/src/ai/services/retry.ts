/**
 * =============================================================================
 * SOS EXPAT — Retry Logic with Exponential Backoff
 * =============================================================================
 *
 * Module de retry intelligent avec:
 * - Classification des erreurs (retryable vs non-retryable)
 * - Exponential backoff avec jitter
 * - Logging détaillé pour debug production
 */

import { logger } from "firebase-functions";
import { AI_CONFIG } from "../core/config";

// =============================================================================
// TYPES
// =============================================================================

export interface RetryableError {
  isRetryable: boolean;
  statusCode?: number;
  errorType: "timeout" | "rate_limit" | "server_error" | "network_error" | "auth_error" | "client_error" | "unknown";
  shouldWait: boolean;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  logContext?: string;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classifie une erreur pour déterminer si elle est retryable
 */
export function classifyError(error: unknown): RetryableError {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Erreurs d'authentification - JAMAIS retry
  if (errorMsg.includes("401") || errorMsg.includes("unauthorized") ||
      errorMsg.includes("api key") || errorMsg.includes("invalid_api_key") ||
      errorMsg.includes("authentication")) {
    return {
      isRetryable: false,
      statusCode: 401,
      errorType: "auth_error",
      shouldWait: false
    };
  }

  // Erreurs client (mauvaise requête) - pas de retry
  if (errorMsg.includes("400") || errorMsg.includes("bad request") ||
      errorMsg.includes("invalid") || errorMsg.includes("malformed")) {
    return {
      isRetryable: false,
      statusCode: 400,
      errorType: "client_error",
      shouldWait: false
    };
  }

  // Rate limit - TOUJOURS retry avec backoff
  if (errorMsg.includes("429") || errorMsg.includes("rate limit") ||
      errorMsg.includes("too many requests") || errorMsg.includes("quota exceeded")) {
    return {
      isRetryable: true,
      statusCode: 429,
      errorType: "rate_limit",
      shouldWait: true
    };
  }

  // Erreurs serveur (5xx) - retry
  const serverErrorMatch = errorMsg.match(/\b(500|502|503|504)\b/);
  if (serverErrorMatch || errorMsg.includes("internal server error") ||
      errorMsg.includes("bad gateway") || errorMsg.includes("service unavailable") ||
      errorMsg.includes("gateway timeout")) {
    return {
      isRetryable: true,
      statusCode: serverErrorMatch ? parseInt(serverErrorMatch[1]) : 500,
      errorType: "server_error",
      shouldWait: true
    };
  }

  // Timeout - retry
  if (errorMsg.includes("timeout") || errorMsg.includes("timed out") ||
      errorMsg.includes("deadline exceeded") || errorMsg.includes("aborted") ||
      errorMsg.includes("408")) {
    return {
      isRetryable: true,
      statusCode: 408,
      errorType: "timeout",
      shouldWait: true
    };
  }

  // Erreurs réseau - retry
  if (errorMsg.includes("econnreset") || errorMsg.includes("econnrefused") ||
      errorMsg.includes("enotfound") || errorMsg.includes("network") ||
      errorMsg.includes("socket") || errorMsg.includes("getaddrinfo") ||
      errorMsg.includes("fetch failed")) {
    return {
      isRetryable: true,
      errorType: "network_error",
      shouldWait: true
    };
  }

  // Erreur inconnue - ne pas retry par sécurité
  return {
    isRetryable: false,
    errorType: "unknown",
    shouldWait: false
  };
}

// =============================================================================
// BACKOFF CALCULATION
// =============================================================================

/**
 * Calcule le délai de backoff exponentiel avec jitter optionnel
 * Formule: delay = min(initialDelay * multiplier^attempt, maxDelay) ± jitter
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  initialDelayMs: number = AI_CONFIG.INITIAL_RETRY_DELAY_MS,
  multiplier: number = AI_CONFIG.RETRY_BACKOFF_MULTIPLIER,
  maxDelayMs: number = AI_CONFIG.RETRY_MAX_DELAY_MS
): number {
  // Calcul exponentiel: initialDelay * (multiplier ^ attemptNumber)
  let delay = initialDelayMs * Math.pow(multiplier, attemptNumber);

  // Plafonner au délai max
  delay = Math.min(delay, maxDelayMs);

  // Ajouter du jitter (±10%) pour éviter le thundering herd
  if (AI_CONFIG.RETRY_JITTER) {
    const jitterPercent = 0.1;
    const jitter = delay * jitterPercent * (2 * Math.random() - 1);
    delay = delay + jitter;
  }

  return Math.round(delay);
}

/**
 * Helper pour attendre un délai
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// =============================================================================

/**
 * Exécute une fonction avec retry et exponential backoff
 *
 * Fonctionnalités:
 * - Classification des erreurs pour déterminer si retryable
 * - Exponential backoff avec jitter
 * - Logging pour debug production
 * - Délai max configurable
 *
 * @example
 * const result = await withExponentialBackoff(
 *   () => callAPI(),
 *   { logContext: "OpenAI Chat", maxRetries: 3 }
 * );
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = AI_CONFIG.MAX_RETRIES,
    initialDelayMs = AI_CONFIG.INITIAL_RETRY_DELAY_MS,
    logContext = "API Call",
    onRetry
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`[Retry] ${logContext} - Tentative ${attempt + 1}/${maxRetries}`);
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;
      const classification = classifyError(error);

      // Si non retryable, throw immédiatement
      if (!classification.isRetryable) {
        logger.warn(`[Retry] ${logContext} - Erreur non-retryable`, {
          errorType: classification.errorType,
          statusCode: classification.statusCode,
          error: lastError.message
        });
        throw lastError;
      }

      // Si c'était la dernière tentative, throw
      if (attempt === maxRetries - 1) {
        logger.error(`[Retry] ${logContext} - Max retries (${maxRetries}) atteint`, {
          errorType: classification.errorType,
          statusCode: classification.statusCode,
          error: lastError.message
        });
        throw lastError;
      }

      // Calculer le délai et attendre
      const nextDelayMs = calculateBackoffDelay(attempt, initialDelayMs);
      logger.warn(`[Retry] ${logContext} - Erreur retryable, attente ${nextDelayMs}ms`, {
        attempt: attempt + 1,
        maxRetries,
        errorType: classification.errorType,
        statusCode: classification.statusCode,
        nextDelayMs,
        error: lastError.message
      });

      if (onRetry) {
        onRetry(attempt + 1, lastError, nextDelayMs);
      }

      await sleep(nextDelayMs);
    }
  }

  throw lastError || new Error(`${logContext} failed after ${maxRetries} retries`);
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Fonction legacy pour compatibilité
 * Utilise maintenant withExponentialBackoff en interne
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = AI_CONFIG.MAX_RETRIES,
  initialDelay = AI_CONFIG.INITIAL_RETRY_DELAY_MS
): Promise<T> {
  return withExponentialBackoff(fn, {
    maxRetries,
    initialDelayMs: initialDelay,
    logContext: "API Call"
  });
}
