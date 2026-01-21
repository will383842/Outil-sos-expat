// src/utils/networkResilience.ts
// Protection contre les extensions de navigateur qui bloquent les requêtes Firebase

/**
 * Liste des patterns d'URL Firebase qui peuvent être bloqués par des extensions
 */
const FIREBASE_PATTERNS = [
  'firebaseapp.com',
  'googleapis.com',
  'firebase.google.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'cloudfunctions.net', // Cloud Functions v2 - nécessaire pour PayPal et autres callables
];

/**
 * Vérifie si une URL est une URL Firebase
 */
const isFirebaseUrl = (url: string): boolean => {
  return FIREBASE_PATTERNS.some(pattern => url.includes(pattern));
};

/**
 * Vérifie si une erreur est une AbortError (typiquement causée par une extension)
 */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === 'AbortError' ||
           error.message.includes('aborted') ||
           error.message.includes('AbortError');
  }
  return false;
};

/**
 * Vérifie si l'erreur est probablement causée par une extension de navigateur
 */
export const isExtensionBlockedError = (error: unknown): boolean => {
  if (isAbortError(error)) return true;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network error') ||
           msg.includes('failed to fetch') ||
           msg.includes('blocked') ||
           msg.includes('cors');
  }
  return false;
};

/**
 * Delay utility
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrapper fetch avec retry automatique pour les requêtes Firebase
 * Réessaye automatiquement si une requête est avortée (extension bloqueuse)
 */
export const resilientFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = 3,
  retryDelay = 500
): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  const isFirebase = isFirebaseUrl(url);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Si c'est une requête Firebase et une AbortError, on réessaye
      if (isFirebase && isAbortError(error) && attempt < maxRetries - 1) {
        console.warn(
          `[NetworkResilience] Requête Firebase avortée (tentative ${attempt + 1}/${maxRetries}), nouvelle tentative...`
        );
        await delay(retryDelay * (attempt + 1)); // Backoff exponentiel
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

/**
 * Installe un intercepteur global pour les requêtes fetch
 * Ceci permet de réessayer automatiquement les requêtes Firebase bloquées
 */
let isInstalled = false;
let originalFetch: typeof fetch;

export const installNetworkResilience = (): void => {
  if (isInstalled || typeof window === 'undefined') return;

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input :
                input instanceof Request ? input.url : input.toString();

    // Seulement pour les requêtes Firebase
    if (!isFirebaseUrl(url)) {
      return originalFetch(input, init);
    }

    let lastError: Error | null = null;
    const maxRetries = 3;

    // Extraire les options de la requête pour pouvoir les réutiliser
    // On ne peut pas réutiliser un objet Request - il faut recréer la requête à chaque fois
    let requestUrl: string;
    let requestInit: RequestInit | undefined;

    if (input instanceof Request) {
      requestUrl = input.url;
      // Clone les options de la requête originale
      requestInit = {
        method: input.method,
        headers: input.headers,
        mode: input.mode as RequestMode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        integrity: input.integrity,
        // Pour le body, on ne peut le lire qu'une fois, donc on utilise init.body si fourni
        body: init?.body,
        ...init
      };
    } else {
      requestUrl = typeof input === 'string' ? input : input.toString();
      requestInit = init;
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await originalFetch(requestUrl, requestInit);
      } catch (error) {
        lastError = error as Error;

        // Si c'est une AbortError et pas le dernier essai, on réessaye
        if (isAbortError(error) && attempt < maxRetries - 1) {
          // Log discret (pas d'erreur pour ne pas effrayer l'utilisateur)
          if (attempt === 0) {
            console.info('[SOS Expat] Optimisation de la connexion en cours...');
          }
          await delay(300 * (attempt + 1));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  };

  isInstalled = true;
  console.log('[NetworkResilience] Protection anti-extensions installée');
};

/**
 * Supprime les erreurs parasites de la console (frame_ant.js, etc.)
 */
export const suppressExtensionErrors = (): void => {
  if (typeof window === 'undefined') return;

  const originalError = console.error.bind(console);

  console.error = (...args: unknown[]): void => {
    const message = args.map(a => String(a)).join(' ');

    // Ignorer les erreurs d'extensions connues
    const suppressPatterns = [
      'frame_ant.js',
      'AbortError: The user aborted a request',
      'net::ERR_BLOCKED_BY_CLIENT',
      'Uncaught (in promise) AbortError',
    ];

    if (suppressPatterns.some(pattern => message.includes(pattern))) {
      // Log discret en mode dev uniquement
      if (import.meta.env.DEV) {
        console.debug('[Suppressed extension error]', ...args);
      }
      return;
    }

    originalError(...args);
  };
};

/**
 * Détecte si l'utilisateur a des extensions qui peuvent bloquer Firebase
 */
export const detectBlockingExtensions = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    // Test avec une requête simple vers Firebase
    await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=test', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return false; // Pas de blocage
  } catch (error) {
    if (isAbortError(error)) {
      return true; // Extension bloquante détectée
    }
    return false; // Autre type d'erreur (probablement normale)
  }
};

/**
 * Message d'aide pour l'utilisateur si des extensions bloquent
 */
export const getExtensionBlockedMessage = (language = 'fr'): { title: string; message: string; steps: string[] } => {
  const messages: Record<string, { title: string; message: string; steps: string[] }> = {
    fr: {
      title: 'Problème de connexion détecté',
      message: 'Une extension de navigateur (antivirus, bloqueur de pub) semble bloquer la connexion. Voici comment résoudre :',
      steps: [
        'Essayez en mode Navigation Privée (Ctrl+Shift+N)',
        'Désactivez temporairement votre antivirus web (Avast, Norton, etc.)',
        'Désactivez les bloqueurs de publicités pour ce site',
        'Ajoutez sos-expat.com à la liste blanche de votre antivirus',
      ],
    },
    en: {
      title: 'Connection issue detected',
      message: 'A browser extension (antivirus, ad blocker) seems to be blocking the connection. Here\'s how to fix it:',
      steps: [
        'Try in Private/Incognito mode (Ctrl+Shift+N)',
        'Temporarily disable your web antivirus (Avast, Norton, etc.)',
        'Disable ad blockers for this site',
        'Add sos-expat.com to your antivirus whitelist',
      ],
    },
    es: {
      title: 'Problema de conexión detectado',
      message: 'Una extensión del navegador (antivirus, bloqueador de anuncios) parece estar bloqueando la conexión. Cómo solucionarlo:',
      steps: [
        'Prueba en modo de navegación privada (Ctrl+Shift+N)',
        'Desactiva temporalmente tu antivirus web (Avast, Norton, etc.)',
        'Desactiva los bloqueadores de anuncios para este sitio',
        'Añade sos-expat.com a la lista blanca de tu antivirus',
      ],
    },
    de: {
      title: 'Verbindungsproblem erkannt',
      message: 'Eine Browser-Erweiterung (Antivirus, Werbeblocker) scheint die Verbindung zu blockieren. So beheben Sie es:',
      steps: [
        'Versuchen Sie es im privaten Modus (Strg+Umschalt+N)',
        'Deaktivieren Sie vorübergehend Ihren Web-Antivirus (Avast, Norton, etc.)',
        'Deaktivieren Sie Werbeblocker für diese Website',
        'Fügen Sie sos-expat.com zur Whitelist Ihres Antivirus hinzu',
      ],
    },
  };

  return messages[language] || messages.en;
};
