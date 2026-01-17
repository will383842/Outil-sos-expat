/**
 * =============================================================================
 * CLIENT CLOUD FUNCTIONS — Appels HTTP avec timeout et retry
 * =============================================================================
 *
 * PERFORMANCE: Ajoute timeout et retry pour éviter les blocages UI.
 * - Timeout par défaut: 30s
 * - Retry configurable pour opérations critiques
 */

// =============================================================================
// TYPES
// =============================================================================

export interface CallOptions {
  /** Timeout en millisecondes (défaut: 30000) */
  timeout?: number;
  /** Nombre de tentatives en cas d'échec (défaut: 0) */
  retries?: number;
  /** Délai entre tentatives en ms (défaut: 1000) */
  retryDelay?: number;
}

export interface ChatResponse {
  reply: string;
  model?: string;
  provider?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 secondes
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000;

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Attend un délai en millisecondes
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crée un contrôleur d'annulation avec timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

// =============================================================================
// FONCTIONS D'APPEL
// =============================================================================

/**
 * Appelle une URL avec timeout et retry
 *
 * @param url - URL à appeler
 * @param options - Options fetch + timeout/retry
 * @returns Response JSON parsée
 * @throws Error si timeout, erreur réseau ou réponse non-OK
 */
async function fetchWithTimeout<T = unknown>(
  url: string,
  fetchOptions: RequestInit,
  callOptions: CallOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = callOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { controller, timeoutId } = createTimeoutController(timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json() as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Timeout
        if (error.name === 'AbortError') {
          lastError = new Error(
            `Timeout après ${timeout}ms. Le serveur met trop de temps à répondre.`
          );
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error('Erreur inconnue');
      }

      // Log l'erreur
      console.warn(
        `[functionsClient] Tentative ${attempt + 1}/${retries + 1} échouée:`,
        lastError.message
      );

      // Si ce n'est pas la dernière tentative, attendre avant retry
      if (attempt < retries) {
        await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
  }

  throw lastError;
}

// =============================================================================
// API PUBLIQUE
// =============================================================================

/**
 * Appelle la Cloud Function chat avec timeout
 *
 * @param convId - ID de la conversation
 * @param message - Message à envoyer
 * @param options - Options de timeout/retry
 * @returns Réponse de l'IA
 * @throws Error si timeout ou erreur
 */
export async function callChat(
  convId: string,
  message: string,
  options: CallOptions = {}
): Promise<string> {
  // URL de base des fonctions (configurable via env)
  const base = import.meta.env['VITE_FUNCTIONS_URL_BASE'] || '';
  if (!base) {
    console.warn(
      'VITE_FUNCTIONS_URL_BASE is not set. Falling back to /chat (same origin proxy).'
    );
  }

  const url = `${base}/chat`;

  // Chat IA peut être long, timeout de 60s par défaut
  const chatOptions: CallOptions = {
    timeout: options.timeout ?? 60000, // 60s par défaut pour chat IA
    retries: options.retries ?? 1, // 1 retry par défaut
    retryDelay: options.retryDelay ?? 2000,
  };

  const data = await fetchWithTimeout<ChatResponse>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convId, message }),
    },
    chatOptions
  );

  return data.reply;
}

/**
 * Appelle une Cloud Function générique avec timeout
 *
 * @param functionName - Nom de la fonction
 * @param payload - Données à envoyer
 * @param options - Options de timeout/retry
 * @returns Réponse JSON
 */
export async function callFunction<T = unknown>(
  functionName: string,
  payload: Record<string, unknown> = {},
  options: CallOptions = {}
): Promise<T> {
  const base = import.meta.env['VITE_FUNCTIONS_URL_BASE'] || '';
  const url = `${base}/${functionName}`;

  return fetchWithTimeout<T>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    options
  );
}

// =============================================================================
// HELPERS PRÉDÉFINIS
// =============================================================================

/**
 * Appel rapide avec timeout court (10s) - pour actions légères
 */
export const functionsClientFast = {
  call: <T = unknown>(functionName: string, payload: Record<string, unknown> = {}) =>
    callFunction<T>(functionName, payload, { timeout: 10000 }),
};

/**
 * Appel fiable avec retry (3 tentatives) - pour opérations critiques
 */
export const functionsClientReliable = {
  call: <T = unknown>(functionName: string, payload: Record<string, unknown> = {}) =>
    callFunction<T>(functionName, payload, {
      timeout: 30000,
      retries: 3,
      retryDelay: 2000,
    }),
};

/**
 * Client par défaut avec configuration standard
 */
export const functionsClient = {
  call: callFunction,
  callChat,
  fast: functionsClientFast,
  reliable: functionsClientReliable,
};

export default functionsClient;
