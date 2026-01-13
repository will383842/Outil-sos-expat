import { db, FieldValue } from '../firebase';
import { safeLogData } from './truncateId';
import * as logger from 'firebase-functions/logger';
import { calculateExpireAt } from '../firestoreTTL';
import { getCorrelationId, getSessionId } from '../correlationId';

function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  try {
    // P2-2 FIX: Appliquer le masquage des IDs avant stringify
    const safeObj = typeof obj === 'object' && obj !== null ? safeLogData(obj as Record<string, unknown>) : obj;

    return JSON.stringify(safeObj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message};
      }
      return value;
    });
  } catch (err) {
    return `Unstringifiable object: ${String(err)}`;
  }
}

/**
 * Fallback logging to Cloud Logging when Firestore is unavailable
 * This ensures we never lose error traces even if Firestore is down
 */
function logToCloudLogging(
  context: string,
  message: string,
  errorType: string,
  stack: string,
  severity: string,
  _originalError: unknown, // Kept for potential future use (e.g., structured error logging)
  firestoreError?: unknown
): void {
  const logPayload = {
    context,
    message,
    errorType,
    stack: stack.slice(0, 2000), // Truncate for Cloud Logging
    severity,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    firestoreFallback: true,
    firestoreError: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
  };

  // Use firebase-functions logger which writes to Cloud Logging
  // This is always available even when Firestore is down
  switch (severity) {
    case 'critical':
      logger.error(`[CRITICAL][${context}] ${message}`, logPayload);
      break;
    case 'high':
      logger.error(`[HIGH][${context}] ${message}`, logPayload);
      break;
    case 'medium':
      logger.warn(`[MEDIUM][${context}] ${message}`, logPayload);
      break;
    default:
      logger.info(`[LOW][${context}] ${message}`, logPayload);
  }
}

/**
 * Log error with multiple fallback strategies:
 * 1. Primary: Write to Firestore error_logs collection
 * 2. Fallback: Write to Cloud Logging (always available)
 * 3. Last resort: console.error (captured by Cloud Functions)
 *
 * This ensures we NEVER lose error traces.
 */
export async function logError(context: string, error: unknown) {
  let message = 'Erreur inconnue';
  let stack = '';
  let errorType = 'unknown';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Parse error details first (outside try/catch so we always have them)
  try {
    if (error instanceof Error) {
      message = error.message;
      stack = (error.stack || '').slice(0, 5000); // tronqué pour Firestore
      errorType = error.constructor.name;
    } else if (typeof error === 'string') {
      message = error;
      errorType = 'string';
    } else if (error && typeof error === 'object') {
      message = safeStringify(error);
      errorType = 'object';
    } else {
      message = String(error);
      errorType = typeof error;
    }
    severity = getSeverityLevel(context);
  } catch (parseError) {
    message = `Error parsing failed: ${String(error)}`;
    errorType = 'parse_error';
  }

  // Always log to console first (guaranteed to work)
  console.error(`[${context}] ${message}`, error);

  // Try Firestore with timeout to avoid blocking
  try {
    const firestorePromise = db.collection('error_logs').add({
      context,
      message,
      stack,
      errorType,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      severity,
      environment: process.env.NODE_ENV || 'development',
      // TTL: auto-expire after 30 days
      expireAt: calculateExpireAt('error_logs'),
      // Correlation ID for end-to-end tracing
      correlationId: getCorrelationId(),
      sessionId: getSessionId()
    });

    // Timeout after 5 seconds to avoid blocking indefinitely
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout after 5s')), 5000)
    );

    await Promise.race([firestorePromise, timeoutPromise]);

  } catch (firestoreError) {
    // Firestore failed - use Cloud Logging as fallback
    // This is CRITICAL: we must not lose error traces
    logToCloudLogging(
      context,
      message,
      errorType,
      stack,
      severity,
      error,
      firestoreError
    );

    // Also log the Firestore failure itself
    console.error('[logError] Firestore write failed, used Cloud Logging fallback:', {
      firestoreError: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
      originalContext: context
    });
  }
}

function getSeverityLevel(context: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalContexts = ['payment', 'stripe', 'billing'];
  const highContexts = ['twilio', 'call', 'webhook'];
  const mediumContexts = ['notification', 'email', 'sms'];

  if (criticalContexts.some(ctx => context.toLowerCase().includes(ctx))) {
    return 'critical';
  }
  if (highContexts.some(ctx => context.toLowerCase().includes(ctx))) {
    return 'high';
  }
  if (mediumContexts.some(ctx => context.toLowerCase().includes(ctx))) {
    return 'medium';
  }
  return 'low';
}
