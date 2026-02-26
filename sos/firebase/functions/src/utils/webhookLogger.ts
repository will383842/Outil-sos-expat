/**
 * Webhook Logger avec support Sentry
 * SOS-Expat Platform
 *
 * Ce module gère le logging des webhooks avec:
 * - Logging vers Cloud Functions logger
 * - Logging vers Sentry (si configuré)
 * - Stockage des webhooks échoués dans Firestore
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { SENTRY_DSN } from '../lib/secrets';

// Re-export SENTRY_DSN for consumers that import from here
export { SENTRY_DSN };

// Lazy initialization to prevent deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookLog {
  id?: string;
  source: 'stripe' | 'sendgrid' | 'twilio' | 'other';
  eventType: string;
  eventId: string;
  status: 'received' | 'processing' | 'success' | 'failed';
  payload?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  processingTimeMs?: number;
  retryCount?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
  };
}

// ============================================================================
// SENTRY INTEGRATION (lazy loading, optional)
// ============================================================================

let sentryInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

interface SentryScope {
  setTag(key: string, value: string): void;
  setExtras(extras: Record<string, unknown>): void;
  setExtra(key: string, value: unknown): void;
  setUser(user: { id?: string; email?: string }): void;
}

/**
 * Initialise Sentry si le DSN est configuré et le module installé
 */
async function initSentry(): Promise<void> {
  if (sentryInitialized) return;

  try {
    const dsn = SENTRY_DSN.value();
    if (!dsn) {
      logger.info('[WebhookLogger] Sentry DSN non configuré, logging Sentry désactivé');
      sentryInitialized = true;
      return;
    }

    // Import dynamique de Sentry (optionnel)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    try {
      // Use require for dynamic import to avoid TS errors when module is not installed
      Sentry = require('@sentry/node');
    } catch {
      logger.info('[WebhookLogger] @sentry/node non installé, logging Sentry désactivé');
      sentryInitialized = true;
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.FUNCTIONS_EMULATOR ? 'development' : 'production',
      tracesSampleRate: 0.1, // 10% des transactions pour le tracing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend(event: any) {
        // Ne pas envoyer les erreurs en mode émulateur
        if (process.env.FUNCTIONS_EMULATOR) {
          return null;
        }
        return event;
      },
    });

    sentryInitialized = true;
    logger.info('[WebhookLogger] Sentry initialisé');
  } catch (error) {
    logger.warn('[WebhookLogger] Impossible d\'initialiser Sentry:', error);
    sentryInitialized = true; // Marquer comme initialisé pour éviter les retry
  }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Log un webhook reçu
 */
export async function logWebhookReceived(
  source: WebhookLog['source'],
  eventType: string,
  eventId: string,
  payload?: Record<string, unknown>
): Promise<string> {
  const now = admin.firestore.Timestamp.now();

  const log: WebhookLog = {
    source,
    eventType,
    eventId,
    status: 'received',
    payload: sanitizePayload(payload),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection('webhook_logs').add(log);

  logger.info(`[Webhook:${source}] Reçu:`, {
    logId: docRef.id,
    eventType,
    eventId,
  });

  return docRef.id;
}

/**
 * Log le succès d'un webhook
 */
export async function logWebhookSuccess(
  logId: string,
  processingTimeMs: number
): Promise<void> {
  await getDb().collection('webhook_logs').doc(logId).update({
    status: 'success',
    processingTimeMs,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  logger.info('[Webhook] Traitement réussi:', {
    logId,
    processingTimeMs,
  });
}

/**
 * Log l'échec d'un webhook avec Sentry
 */
export async function logWebhookError(
  logId: string,
  error: Error,
  context?: SentryContext
): Promise<void> {
  // Initialiser Sentry si nécessaire
  await initSentry();

  const errorData = {
    message: error.message,
    stack: error.stack,
    code: (error as NodeJS.ErrnoException).code,
  };

  // Mettre à jour le log Firestore
  await getDb().collection('webhook_logs').doc(logId).update({
    status: 'failed',
    error: errorData,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Récupérer le log complet pour Sentry
  const logDoc = await getDb().collection('webhook_logs').doc(logId).get();
  const logData = logDoc.data() as WebhookLog;

  // Logger vers Cloud Functions
  logger.error('[Webhook] Échec traitement:', {
    logId,
    eventType: logData?.eventType,
    eventId: logData?.eventId,
    error: errorData,
  });

  // Envoyer vers Sentry si disponible
  if (Sentry) {
    Sentry.withScope((scope: SentryScope) => {
      scope.setTag('webhook_source', logData?.source || 'unknown');
      scope.setTag('webhook_event_type', logData?.eventType || 'unknown');
      scope.setTag('webhook_log_id', logId);

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        scope.setExtras(context.extra);
      }

      if (context?.user) {
        scope.setUser(context.user);
      }

      scope.setExtra('webhook_payload', logData?.payload);
      scope.setExtra('event_id', logData?.eventId);

      Sentry!.captureException(error);
    });
  }

  // Ajouter aux failed_webhooks pour review manuel
  await getDb().collection('failed_webhooks').add({
    webhookLogId: logId,
    source: logData?.source,
    eventType: logData?.eventType,
    eventId: logData?.eventId,
    error: errorData,
    payload: logData?.payload,
    requiresManualReview: true,
    reviewedAt: null,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Capture une exception vers Sentry
 */
export async function captureException(
  error: Error,
  context?: SentryContext
): Promise<void> {
  await initSentry();

  logger.error('[Error]', {
    message: error.message,
    stack: error.stack,
    ...context?.extra,
  });

  if (Sentry) {
    Sentry.withScope((scope: SentryScope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        scope.setExtras(context.extra);
      }

      if (context?.user) {
        scope.setUser(context.user);
      }

      Sentry!.captureException(error);
    });
  }
}

/**
 * Capture un message vers Sentry
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: SentryContext
): Promise<void> {
  await initSentry();

  const logFn = level === 'error' ? logger.error : level === 'warning' ? logger.warn : logger.info;
  logFn('[Message]', message, context?.extra);

  if (Sentry) {
    Sentry.withScope((scope: SentryScope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        scope.setExtras(context.extra);
      }

      Sentry!.captureMessage(message, level);
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize le payload webhook pour le stockage
 * Supprime les données sensibles
 */
function sanitizePayload(
  payload?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!payload) return undefined;

  const sanitized = { ...payload };

  // Liste des champs sensibles à masquer
  const sensitiveFields = [
    'card',
    'bank_account',
    'source',
    'payment_method',
    'client_secret',
    'api_key',
    'secret',
    'password',
    'token',
  ];

  const maskSensitive = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = maskSensitive(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  return maskSensitive(sanitized);
}

/**
 * Récupère les webhooks échoués non reviewés
 */
export async function getFailedWebhooks(
  limit: number = 50
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snapshot = await getDb()
    .collection('failed_webhooks')
    .where('requiresManualReview', '==', true)
    .where('reviewedAt', '==', null)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }));
}

/**
 * Marque un webhook échoué comme reviewé
 */
export async function markWebhookReviewed(
  failedWebhookId: string,
  resolution: 'resolved' | 'ignored' | 'retried',
  notes?: string
): Promise<void> {
  await getDb().collection('failed_webhooks').doc(failedWebhookId).update({
    requiresManualReview: false,
    reviewedAt: admin.firestore.Timestamp.now(),
    resolution,
    notes,
  });
}
