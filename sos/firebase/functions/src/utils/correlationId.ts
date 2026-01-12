/**
 * Correlation ID Utility - Backend
 *
 * Gère les IDs de corrélation côté backend pour tracer les requêtes
 * de bout en bout depuis le frontend.
 *
 * Usage:
 * - Extraire le correlation ID des headers de requête
 * - Propager le correlation ID dans tous les logs
 * - Générer un nouveau ID si non fourni
 */

import * as logger from 'firebase-functions/logger';

// Header HTTP utilisé pour transmettre le correlation ID
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const SESSION_ID_HEADER = 'x-session-id';

// AsyncLocalStorage pour propager le context sans le passer explicitement
// Note: Si AsyncLocalStorage n'est pas disponible, on utilise un fallback
let currentCorrelationId: string | null = null;
let currentSessionId: string | null = null;

/**
 * Génère un nouvel ID de corrélation backend
 */
export function generateCorrelationId(prefix = 'srv'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Extrait le correlation ID des headers HTTP
 * Si absent, génère un nouveau ID
 */
export function extractCorrelationId(
  headers: Record<string, string | string[] | undefined> | undefined
): string {
  if (!headers) {
    return generateCorrelationId();
  }

  // Les headers HTTP sont case-insensitive
  const correlationId =
    headers[CORRELATION_ID_HEADER] ||
    headers['X-Correlation-ID'] ||
    headers['x-correlation-id'];

  if (typeof correlationId === 'string' && correlationId) {
    return correlationId;
  }

  if (Array.isArray(correlationId) && correlationId[0]) {
    return correlationId[0];
  }

  return generateCorrelationId();
}

/**
 * Extrait le session ID des headers HTTP
 */
export function extractSessionId(
  headers: Record<string, string | string[] | undefined> | undefined
): string | null {
  if (!headers) {
    return null;
  }

  const sessionId =
    headers[SESSION_ID_HEADER] ||
    headers['X-Session-ID'] ||
    headers['x-session-id'];

  if (typeof sessionId === 'string' && sessionId) {
    return sessionId;
  }

  if (Array.isArray(sessionId) && sessionId[0]) {
    return sessionId[0];
  }

  return null;
}

/**
 * Définit le correlation ID pour le contexte courant
 */
export function setCorrelationId(correlationId: string, sessionId?: string | null): void {
  currentCorrelationId = correlationId;
  currentSessionId = sessionId || null;
}

/**
 * Obtient le correlation ID du contexte courant
 */
export function getCorrelationId(): string {
  return currentCorrelationId || generateCorrelationId();
}

/**
 * Obtient le session ID du contexte courant
 */
export function getSessionId(): string | null {
  return currentSessionId;
}

/**
 * Efface le contexte de corrélation (à appeler à la fin d'une requête)
 */
export function clearCorrelationContext(): void {
  currentCorrelationId = null;
  currentSessionId = null;
}

/**
 * Interface pour le contexte de corrélation
 */
export interface CorrelationContext {
  correlationId: string;
  sessionId: string | null;
  source: 'backend';
  timestamp: string;
}

/**
 * Crée un contexte de corrélation complet pour les logs
 */
export function getCorrelationContext(): CorrelationContext {
  return {
    correlationId: getCorrelationId(),
    sessionId: getSessionId(),
    source: 'backend',
    timestamp: new Date().toISOString()
  };
}

/**
 * Logger enrichi avec correlation ID
 * Ajoute automatiquement le correlation ID à tous les logs
 */
export const correlatedLogger = {
  info: (message: string, data?: Record<string, unknown>): void => {
    logger.info(message, {
      ...data,
      correlationId: getCorrelationId(),
      sessionId: getSessionId()
    });
  },

  warn: (message: string, data?: Record<string, unknown>): void => {
    logger.warn(message, {
      ...data,
      correlationId: getCorrelationId(),
      sessionId: getSessionId()
    });
  },

  error: (message: string, data?: Record<string, unknown>): void => {
    logger.error(message, {
      ...data,
      correlationId: getCorrelationId(),
      sessionId: getSessionId()
    });
  },

  debug: (message: string, data?: Record<string, unknown>): void => {
    logger.debug(message, {
      ...data,
      correlationId: getCorrelationId(),
      sessionId: getSessionId()
    });
  }
};

/**
 * Middleware/Wrapper pour les Cloud Functions HTTP
 * Extrait le correlation ID et le définit pour le contexte
 */
export function withCorrelation<T>(
  handler: (correlationId: string) => Promise<T>,
  headers?: Record<string, string | string[] | undefined>
): Promise<T> {
  const correlationId = extractCorrelationId(headers);
  const sessionId = extractSessionId(headers);

  setCorrelationId(correlationId, sessionId);

  return handler(correlationId).finally(() => {
    clearCorrelationContext();
  });
}

/**
 * Crée les données de corrélation à ajouter aux documents Firestore
 */
export function getCorrelationData(): Record<string, string | null> {
  return {
    correlationId: getCorrelationId(),
    sessionId: getSessionId()
  };
}

/**
 * Wrapper pour les callable functions
 * Extrait le correlation ID du contexte Firebase
 */
export function extractCorrelationFromCallable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): { correlationId: string; sessionId: string | null } {
  // Pour les callable functions, le correlation ID peut être dans rawRequest
  const headers = context?.rawRequest?.headers;
  const correlationId = extractCorrelationId(headers);
  const sessionId = extractSessionId(headers);

  setCorrelationId(correlationId, sessionId);

  return { correlationId, sessionId };
}

// Export un objet utilitaire pour faciliter l'import
export const CorrelationId = {
  generate: generateCorrelationId,
  extract: extractCorrelationId,
  extractSession: extractSessionId,
  set: setCorrelationId,
  get: getCorrelationId,
  getSession: getSessionId,
  clear: clearCorrelationContext,
  getContext: getCorrelationContext,
  getData: getCorrelationData,
  logger: correlatedLogger,
  wrap: withCorrelation,
  fromCallable: extractCorrelationFromCallable,
  HEADER: CORRELATION_ID_HEADER,
  SESSION_HEADER: SESSION_ID_HEADER
};

export default CorrelationId;
