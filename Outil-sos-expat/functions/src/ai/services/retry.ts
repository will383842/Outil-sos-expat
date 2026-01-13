/**
 * =============================================================================
 * SOS EXPAT — Retry Logic with Exponential Backoff + Circuit Breaker
 * =============================================================================
 *
 * Module de retry intelligent avec:
 * - Classification des erreurs (retryable vs non-retryable)
 * - Exponential backoff avec jitter
 * - Circuit Breaker pour éviter les cascading failures
 * - Logging détaillé pour debug production
 */

import { logger } from "firebase-functions";
import { AI_CONFIG } from "../core/config";

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation - requests pass through
  OPEN = "OPEN",         // Failing - requests are rejected immediately
  HALF_OPEN = "HALF_OPEN" // Testing - allowing limited requests to test recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening (default: 3)
  resetTimeoutMs: number;      // Time before trying again (default: 60000ms = 1min)
  halfOpenMaxAttempts: number; // Requests allowed in half-open state (default: 1)
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  halfOpenAttempts: number;
}

// Circuit breakers par service (clé = nom du service)
const circuitBreakers = new Map<string, CircuitBreakerState>();

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenMaxAttempts: 1
};

/**
 * Récupère ou initialise l'état du circuit breaker pour un service
 */
function getCircuitState(serviceName: string): CircuitBreakerState {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      halfOpenAttempts: 0
    });
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Vérifie si le circuit permet une requête
 */
export function canExecute(
  serviceName: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): boolean {
  const circuit = getCircuitState(serviceName);
  const now = Date.now();

  switch (circuit.state) {
    case CircuitState.CLOSED:
      return true;

    case CircuitState.OPEN:
      // Vérifier si le timeout de reset est passé
      if (now - circuit.lastFailureTime >= config.resetTimeoutMs) {
        // Passer en half-open pour tester
        circuit.state = CircuitState.HALF_OPEN;
        circuit.halfOpenAttempts = 0;
        logger.info(`[CircuitBreaker] ${serviceName}: OPEN → HALF_OPEN (testing recovery)`);
        return true;
      }
      return false;

    case CircuitState.HALF_OPEN:
      // Permettre un nombre limité de requêtes de test
      if (circuit.halfOpenAttempts < config.halfOpenMaxAttempts) {
        circuit.halfOpenAttempts++;
        return true;
      }
      return false;

    default:
      return true;
  }
}

/**
 * Enregistre un succès - réinitialise le circuit
 */
export function recordSuccess(serviceName: string): void {
  const circuit = getCircuitState(serviceName);

  if (circuit.state === CircuitState.HALF_OPEN) {
    logger.info(`[CircuitBreaker] ${serviceName}: HALF_OPEN → CLOSED (recovery successful)`);
  }

  circuit.state = CircuitState.CLOSED;
  circuit.failures = 0;
  circuit.halfOpenAttempts = 0;
}

/**
 * Enregistre un échec - peut ouvrir le circuit
 */
export function recordFailure(
  serviceName: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): void {
  const circuit = getCircuitState(serviceName);
  circuit.failures++;
  circuit.lastFailureTime = Date.now();

  if (circuit.state === CircuitState.HALF_OPEN) {
    // Échec pendant le test - retour à OPEN
    circuit.state = CircuitState.OPEN;
    logger.warn(`[CircuitBreaker] ${serviceName}: HALF_OPEN → OPEN (test failed)`);
  } else if (circuit.failures >= config.failureThreshold) {
    // Seuil atteint - ouvrir le circuit
    circuit.state = CircuitState.OPEN;
    logger.error(`[CircuitBreaker] ${serviceName}: CLOSED → OPEN (${circuit.failures} failures)`);
  }
}

/**
 * Récupère l'état actuel du circuit (pour monitoring)
 */
export function getCircuitStatus(serviceName: string): {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
} {
  const circuit = getCircuitState(serviceName);
  return {
    state: circuit.state,
    failures: circuit.failures,
    lastFailureTime: circuit.lastFailureTime
  };
}

/**
 * Réinitialise manuellement un circuit (pour admin/debug)
 */
export function resetCircuit(serviceName: string): void {
  circuitBreakers.set(serviceName, {
    state: CircuitState.CLOSED,
    failures: 0,
    lastFailureTime: 0,
    halfOpenAttempts: 0
  });
  logger.info(`[CircuitBreaker] ${serviceName}: Manually reset to CLOSED`);
}

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
  /** Nom du service pour le Circuit Breaker (si non fourni, pas de circuit breaker) */
  serviceName?: string;
  /** Configuration du Circuit Breaker */
  circuitBreakerConfig?: CircuitBreakerConfig;
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
 * Exécute une fonction avec retry, exponential backoff, et Circuit Breaker
 *
 * Fonctionnalités:
 * - Circuit Breaker pour éviter les cascading failures
 * - Classification des erreurs pour déterminer si retryable
 * - Exponential backoff avec jitter
 * - Logging pour debug production
 * - Délai max configurable
 *
 * @example
 * const result = await withExponentialBackoff(
 *   () => callAPI(),
 *   { logContext: "OpenAI Chat", maxRetries: 3, serviceName: "openai" }
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
    onRetry,
    serviceName,
    circuitBreakerConfig
  } = options;

  // Circuit Breaker check (si serviceName fourni)
  if (serviceName) {
    if (!canExecute(serviceName, circuitBreakerConfig)) {
      const status = getCircuitStatus(serviceName);
      const error = new Error(
        `[CircuitBreaker] Service "${serviceName}" is ${status.state}. ` +
        `${status.failures} failures. Last failure: ${new Date(status.lastFailureTime).toISOString()}`
      );
      logger.warn(`[CircuitBreaker] ${logContext} - Request rejected (circuit OPEN)`, {
        serviceName,
        state: status.state,
        failures: status.failures
      });
      throw error;
    }
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`[Retry] ${logContext} - Tentative ${attempt + 1}/${maxRetries}`);
      }

      const result = await fn();

      // Succès - enregistrer dans le circuit breaker
      if (serviceName) {
        recordSuccess(serviceName);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      const classification = classifyError(error);

      // Enregistrer l'échec dans le circuit breaker
      if (serviceName) {
        recordFailure(serviceName, circuitBreakerConfig);
      }

      // Si non retryable, throw immédiatement
      if (!classification.isRetryable) {
        logger.warn(`[Retry] ${logContext} - Erreur non-retryable`, {
          errorType: classification.errorType,
          statusCode: classification.statusCode,
          error: lastError.message,
          serviceName
        });
        throw lastError;
      }

      // Si c'était la dernière tentative, throw
      if (attempt === maxRetries - 1) {
        logger.error(`[Retry] ${logContext} - Max retries (${maxRetries}) atteint`, {
          errorType: classification.errorType,
          statusCode: classification.statusCode,
          error: lastError.message,
          serviceName
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
        error: lastError.message,
        serviceName
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
