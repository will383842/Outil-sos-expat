/* -------------------------------------------------------------------------- */
/*                            src/utils/debugLogger.ts                         */
/* -------------------------------------------------------------------------- */

/**
 * Production Debug Logger - Version 2.0
 *
 * Système de logging frontend pour le debugging en production.
 * Utilisé pour tracer les problèmes de:
 * - Navigation/Redirection après paiement
 * - Accès aux données Firestore
 * - États React et transitions de pages
 * - Flux de paiement Stripe/PayPal
 *
 * @version 2.0.0 - Production Debugging Protocol
 */

// Configuration du debug (activable via localStorage)
const DEBUG_ENABLED_KEY = 'SOS_DEBUG_ENABLED';
const DEBUG_LEVEL_KEY = 'SOS_DEBUG_LEVEL';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  stack?: string;
}

// Buffer pour stocker les logs en mémoire (pour export)
const LOG_BUFFER_SIZE = 500;
const logBuffer: LogEntry[] = [];

/**
 * Vérifie si le debug est activé
 */
function isDebugEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_ENABLED_KEY) === 'true';
  } catch {
    return true; // En cas d'erreur, activer par défaut
  }
}

/**
 * Récupère le niveau de log configuré
 */
function getLogLevel(): number {
  const levels: Record<LogLevel, number> = {
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5
  };
  try {
    const level = localStorage.getItem(DEBUG_LEVEL_KEY) as LogLevel;
    return levels[level] || 4; // DEBUG par défaut
  } catch {
    return 4;
  }
}

/**
 * Formate les données pour l'affichage
 */
function formatData(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Ajoute un log au buffer
 */
function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Fonction de log principale
 */
function log(level: LogLevel, category: string, message: string, data?: unknown): void {
  const levels: Record<LogLevel, number> = {
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5
  };

  if (!isDebugEnabled() && level !== 'ERROR') return;
  if (levels[level] > getLogLevel()) return;

  const timestamp = new Date().toISOString();
  const entry: LogEntry = {
    timestamp,
    level,
    category,
    message,
    data
  };

  // Ajouter au buffer
  addToBuffer(entry);

  // Construire le message de console
  const prefix = `[${timestamp.split('T')[1].split('.')[0]}] [${level}] [${category}]`;
  const emoji = {
    ERROR: '❌',
    WARN: '⚠️',
    INFO: 'ℹ️',
    DEBUG: '🔍',
    TRACE: '📍'
  }[level];

  const fullMessage = `${emoji} ${prefix} ${message}`;

  // Afficher dans la console avec le bon niveau
  switch (level) {
    case 'ERROR':
      console.error(fullMessage, data ?? '');
      break;
    case 'WARN':
      console.warn(fullMessage, data ?? '');
      break;
    case 'INFO':
      console.info(fullMessage, data ?? '');
      break;
    default:
      console.log(fullMessage, data ?? '');
  }
}

/**
 * Payload pour les logs de debug service
 */
type ServiceDebugPayload = {
  providerId: string;
  serviceInfo: Record<string, unknown>;
};

/**
 * Fonction générique de log debug (legacy compatibility)
 */
export function debugLog(payload: { event: string; data: unknown }) {
  log('DEBUG', 'LEGACY', payload.event, payload.data);
}

/**
 * Log spécifique pour les services
 */
export function logServiceDebug(payload: ServiceDebugPayload) {
  log('DEBUG', 'SERVICE', `Provider ${payload.providerId}`, payload.serviceInfo);
}

/* ========================================================================== */
/*                        LOGGERS SPÉCIALISÉS PAR CATÉGORIE                   */
/* ========================================================================== */

/**
 * Logger pour le flux de paiement
 */
export const paymentLogger = {
  // Stripe
  stripeInit: (data: { stripeLoaded: boolean; elementsLoaded: boolean }) => {
    log('DEBUG', 'PAYMENT_STRIPE', 'Stripe initialization status', data);
  },

  createIntent: (data: { amount: number; currency: string; serviceType: string; providerId: string }) => {
    log('INFO', 'PAYMENT_STRIPE', 'Creating PaymentIntent', data);
  },

  intentCreated: (data: { paymentIntentId: string; clientSecret: string; status: string }) => {
    log('INFO', 'PAYMENT_STRIPE', 'PaymentIntent created successfully', {
      paymentIntentId: data.paymentIntentId.substring(0, 15) + '...',
      status: data.status,
      hasClientSecret: !!data.clientSecret
    });
  },

  confirmPayment: (data: { paymentIntentId: string }) => {
    log('INFO', 'PAYMENT_STRIPE', 'Confirming payment', data);
  },

  paymentSuccess: (data: { paymentIntentId: string; status: string }) => {
    log('INFO', 'PAYMENT_STRIPE', '✅ Payment successful', data);
  },

  paymentError: (error: Error | string, context?: Record<string, unknown>) => {
    log('ERROR', 'PAYMENT_STRIPE', 'Payment error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context
    });
  },

  // PayPal
  paypalInit: (data: { clientId: string; ready: boolean }) => {
    log('DEBUG', 'PAYMENT_PAYPAL', 'PayPal initialization', {
      clientId: data.clientId.substring(0, 20) + '...',
      ready: data.ready
    });
  },

  paypalOrderCreated: (data: { orderId: string; amount: number }) => {
    log('INFO', 'PAYMENT_PAYPAL', 'Order created', data);
  },

  paypalCapture: (data: { orderId: string; captureId?: string; status: string }) => {
    log('INFO', 'PAYMENT_PAYPAL', 'Order captured', data);
  },

  paypalSuccess: (data: { orderId: string; payerId: string; callSessionId?: string }) => {
    log('INFO', 'PAYMENT_PAYPAL', '✅ PayPal payment successful', data);
  },

  paypalError: (error: Error | string, context?: Record<string, unknown>) => {
    log('ERROR', 'PAYMENT_PAYPAL', 'PayPal error', {
      error: error instanceof Error ? error.message : error,
      context
    });
  }
};

/**
 * Logger pour la navigation et les redirections
 */
export const navigationLogger = {
  beforeNavigate: (data: { from: string; to: string; params?: Record<string, string> }) => {
    log('INFO', 'NAVIGATION', `🚀 Navigating: ${data.from} → ${data.to}`, data.params);
  },

  afterNavigate: (data: { path: string; searchParams?: Record<string, string> }) => {
    log('DEBUG', 'NAVIGATION', `📍 Arrived at: ${data.path}`, data.searchParams);
  },

  redirectBlocked: (data: { from: string; to: string; reason: string }) => {
    log('WARN', 'NAVIGATION', `⛔ Navigation blocked: ${data.from} → ${data.to}`, { reason: data.reason });
  },

  stateChange: (data: { component: string; prevState: string; newState: string }) => {
    log('DEBUG', 'NAVIGATION', `State change in ${data.component}`, data);
  },

  urlParamsMissing: (data: { page: string; missingParams: string[] }) => {
    log('WARN', 'NAVIGATION', `⚠️ Missing URL params on ${data.page}`, data.missingParams);
  },

  historyPush: (path: string, state?: unknown) => {
    log('TRACE', 'NAVIGATION', `History push: ${path}`, state);
  }
};

/**
 * Logger pour Firestore
 */
export const firestoreLogger = {
  read: (data: { collection: string; docId: string; found: boolean }) => {
    log('DEBUG', 'FIRESTORE', `Read ${data.collection}/${data.docId}`, { found: data.found });
  },

  write: (data: { collection: string; docId: string; operation: 'create' | 'update' | 'set' }) => {
    log('DEBUG', 'FIRESTORE', `${data.operation.toUpperCase()} ${data.collection}/${data.docId}`);
  },

  snapshot: (data: { collection: string; docId: string; exists: boolean; status?: string }) => {
    log('TRACE', 'FIRESTORE', `onSnapshot ${data.collection}/${data.docId}`, { exists: data.exists, status: data.status });
  },

  snapshotError: (data: { collection: string; docId: string; error: string }) => {
    log('ERROR', 'FIRESTORE', `onSnapshot error ${data.collection}/${data.docId}`, { error: data.error });
  },

  retry: (data: { collection: string; docId: string; attempt: number; maxAttempts: number }) => {
    log('WARN', 'FIRESTORE', `⏳ Retry ${data.attempt}/${data.maxAttempts} for ${data.collection}/${data.docId}`);
  },

  queryStart: (data: { collection: string; filters?: Record<string, unknown> }) => {
    log('DEBUG', 'FIRESTORE', `Query ${data.collection}`, data.filters);
  },

  queryResult: (data: { collection: string; count: number; ids?: string[] }) => {
    log('DEBUG', 'FIRESTORE', `Query result: ${data.count} documents`, data.ids);
  }
};

/**
 * Logger pour les appels (calls)
 */
export const callLogger = {
  sessionCreated: (data: { callSessionId: string; providerId: string; clientId: string }) => {
    log('INFO', 'CALL', '📞 Call session created', data);
  },

  statusChange: (data: { callSessionId: string; prevStatus: string; newStatus: string }) => {
    log('INFO', 'CALL', `Call status: ${data.prevStatus} → ${data.newStatus}`, { callSessionId: data.callSessionId });
  },

  waitingForDoc: (data: { callSessionId: string; waitTime: number }) => {
    log('DEBUG', 'CALL', `Waiting for call_sessions document`, { callSessionId: data.callSessionId, waitTime: `${data.waitTime}ms` });
  },

  docFound: (data: { callSessionId: string; status: string }) => {
    log('INFO', 'CALL', '✅ Call session document found', data);
  },

  docNotFound: (data: { callSessionId: string; retryCount: number }) => {
    log('WARN', 'CALL', `⚠️ Call session not found, retry ${data.retryCount}`, { callSessionId: data.callSessionId });
  }
};

/**
 * Logger pour l'authentification
 */
export const authLogger = {
  stateChange: (data: { isAuthenticated: boolean; userId?: string; isFullyReady: boolean }) => {
    log('DEBUG', 'AUTH', 'Auth state changed', {
      isAuthenticated: data.isAuthenticated,
      userId: data.userId ? data.userId.substring(0, 8) + '...' : null,
      isFullyReady: data.isFullyReady
    });
  },

  redirectToLogin: (data: { from: string; reason: string }) => {
    log('INFO', 'AUTH', `🔐 Redirect to login from ${data.from}`, { reason: data.reason });
  },

  tokenRefresh: (success: boolean) => {
    log('DEBUG', 'AUTH', `Token refresh ${success ? 'successful' : 'failed'}`);
  }
};

/**
 * Logger pour les composants React
 */
export const componentLogger = {
  mount: (componentName: string, props?: Record<string, unknown>) => {
    log('TRACE', 'COMPONENT', `📦 ${componentName} mounted`, props);
  },

  unmount: (componentName: string) => {
    log('TRACE', 'COMPONENT', `📦 ${componentName} unmounted`);
  },

  render: (componentName: string, renderCount: number) => {
    log('TRACE', 'COMPONENT', `🔄 ${componentName} render #${renderCount}`);
  },

  effectRun: (componentName: string, effectName: string, deps?: unknown[]) => {
    log('TRACE', 'COMPONENT', `⚡ ${componentName}.${effectName} effect ran`, { deps });
  },

  stateUpdate: (componentName: string, stateName: string, oldValue: unknown, newValue: unknown) => {
    log('DEBUG', 'COMPONENT', `📊 ${componentName}.${stateName} updated`, { from: oldValue, to: newValue });
  }
};

/* ========================================================================== */
/*                              UTILITAIRES                                   */
/* ========================================================================== */

/**
 * Active/désactive le debug mode
 */
export function setDebugMode(enabled: boolean): void {
  try {
    localStorage.setItem(DEBUG_ENABLED_KEY, String(enabled));
    console.log(`[DEBUG MODE] ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch {
    console.warn('Unable to persist debug mode setting');
  }
}

/**
 * Change le niveau de log
 */
export function setLogLevel(level: LogLevel): void {
  try {
    localStorage.setItem(DEBUG_LEVEL_KEY, level);
    console.log(`[DEBUG LEVEL] Set to ${level}`);
  } catch {
    console.warn('Unable to persist log level setting');
  }
}

/**
 * Exporte les logs en JSON pour analyse
 */
export function exportLogs(): string {
  return JSON.stringify(logBuffer, null, 2);
}

/**
 * Affiche les logs dans la console de manière formatée
 */
export function printLogs(): void {
  console.group('🔍 SOS Expat Debug Logs');
  logBuffer.forEach((entry) => {
    const color = {
      ERROR: 'color: red',
      WARN: 'color: orange',
      INFO: 'color: blue',
      DEBUG: 'color: gray',
      TRACE: 'color: lightgray'
    }[entry.level];

    console.log(
      `%c[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}`,
      color,
      entry.data ?? ''
    );
  });
  console.groupEnd();
}

/**
 * Efface le buffer de logs
 */
export function clearLogs(): void {
  logBuffer.length = 0;
  console.log('[DEBUG] Logs cleared');
}

/**
 * Ajoute les utilitaires au window pour accès depuis la console
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).sosDebug = {
    enable: () => setDebugMode(true),
    disable: () => setDebugMode(false),
    setLevel: setLogLevel,
    exportLogs,
    printLogs,
    clearLogs,
    getBuffer: () => logBuffer
  };

  // Activer le debug par défaut en développement
  if (import.meta.env.DEV || isDebugEnabled()) {
    setDebugMode(true);
  }
}
