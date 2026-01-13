/**
 * Correlation ID Utility
 *
 * Génère et gère des IDs de corrélation pour tracer les requêtes
 * de bout en bout entre le frontend et le backend.
 *
 * Format: {prefix}-{timestamp}-{random}
 * Exemple: sos-1704067200000-a1b2c3d4
 */

// Header HTTP utilisé pour transmettre le correlation ID
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

// Clé de stockage session
const SESSION_CORRELATION_KEY = 'sos_session_correlation_id';
const REQUEST_CORRELATION_KEY = 'sos_current_correlation_id';

/**
 * Génère un nouvel ID de corrélation unique
 *
 * @param prefix - Préfixe optionnel pour identifier le contexte (default: 'sos')
 * @returns Un ID unique au format {prefix}-{timestamp}-{random}
 */
export function generateCorrelationId(prefix = 'sos'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Génère un ID de corrélation pour une session utilisateur
 * Persisté dans sessionStorage pour la durée de la session
 */
export function getSessionCorrelationId(): string {
  if (typeof window === 'undefined') {
    return generateCorrelationId('srv');
  }

  let sessionId = sessionStorage.getItem(SESSION_CORRELATION_KEY);

  if (!sessionId) {
    sessionId = generateCorrelationId('session');
    sessionStorage.setItem(SESSION_CORRELATION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Obtient ou crée un ID de corrélation pour la requête courante
 * Utilisé pour lier toutes les opérations d'une action utilisateur
 */
export function getCurrentCorrelationId(): string {
  if (typeof window === 'undefined') {
    return generateCorrelationId('req');
  }

  let correlationId = sessionStorage.getItem(REQUEST_CORRELATION_KEY);

  if (!correlationId) {
    correlationId = generateCorrelationId('req');
    sessionStorage.setItem(REQUEST_CORRELATION_KEY, correlationId);
  }

  return correlationId;
}

/**
 * Définit un nouvel ID de corrélation pour la requête courante
 * À appeler au début d'une nouvelle action utilisateur
 */
export function setCurrentCorrelationId(correlationId?: string): string {
  const newId = correlationId || generateCorrelationId('req');

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(REQUEST_CORRELATION_KEY, newId);
  }

  return newId;
}

/**
 * Efface l'ID de corrélation courant
 * À appeler à la fin d'une action utilisateur
 */
export function clearCurrentCorrelationId(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(REQUEST_CORRELATION_KEY);
  }
}

/**
 * Crée un contexte de corrélation complet pour les logs
 */
export interface CorrelationContext {
  correlationId: string;
  sessionId: string;
  timestamp: string;
  source: 'frontend';
}

export function getCorrelationContext(): CorrelationContext {
  return {
    correlationId: getCurrentCorrelationId(),
    sessionId: getSessionCorrelationId(),
    timestamp: new Date().toISOString(),
    source: 'frontend'
  };
}

/**
 * HOF pour wrapper les appels API avec correlation ID
 * Ajoute automatiquement le header X-Correlation-ID
 */
export function withCorrelationId<T extends Record<string, string>>(
  headers: T = {} as T
): T & { [CORRELATION_ID_HEADER]: string } {
  return {
    ...headers,
    [CORRELATION_ID_HEADER]: getCurrentCorrelationId()
  };
}

/**
 * Crée les headers pour un appel Firebase Functions
 * Compatible avec httpsCallable
 */
export function getCorrelationHeaders(): Record<string, string> {
  return {
    [CORRELATION_ID_HEADER]: getCurrentCorrelationId(),
    'X-Session-ID': getSessionCorrelationId()
  };
}

/**
 * Parse un correlation ID depuis une réponse ou un contexte
 * Utile pour extraire l'ID d'une réponse backend
 */
export function parseCorrelationId(value: string | null | undefined): string | null {
  if (!value) return null;

  // Valide le format: prefix-timestamp-random
  const pattern = /^[a-z]+-\d+-[a-z0-9]+$/i;
  return pattern.test(value) ? value : null;
}

/**
 * Decorator/Wrapper pour les actions utilisateur
 * Crée un nouveau correlation ID au début et le nettoie à la fin
 */
export async function withCorrelation<T>(
  action: (correlationId: string) => Promise<T>,
  prefix = 'action'
): Promise<T> {
  const correlationId = setCurrentCorrelationId(generateCorrelationId(prefix));

  try {
    return await action(correlationId);
  } finally {
    clearCurrentCorrelationId();
  }
}

/**
 * Hook-friendly version pour les composants React
 */
export function createCorrelationScope(prefix = 'scope'): {
  correlationId: string;
  cleanup: () => void;
} {
  const correlationId = setCurrentCorrelationId(generateCorrelationId(prefix));

  return {
    correlationId,
    cleanup: clearCurrentCorrelationId
  };
}

// Export un objet utilitaire pour faciliter l'import
export const CorrelationId = {
  generate: generateCorrelationId,
  getCurrent: getCurrentCorrelationId,
  setCurrent: setCurrentCorrelationId,
  clear: clearCurrentCorrelationId,
  getSession: getSessionCorrelationId,
  getContext: getCorrelationContext,
  getHeaders: getCorrelationHeaders,
  withHeaders: withCorrelationId,
  parse: parseCorrelationId,
  wrap: withCorrelation,
  createScope: createCorrelationScope,
  HEADER: CORRELATION_ID_HEADER
};

export default CorrelationId;
