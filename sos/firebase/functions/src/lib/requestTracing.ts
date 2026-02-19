/**
 * Request ID Tracing Utility
 *
 * Generates unique correlation IDs for each Cloud Function invocation,
 * allowing logs from the same request to be grouped and traced end-to-end.
 *
 * Usage:
 *   import { generateRequestId, withRequestId, createRequestLogger } from '../lib/requestTracing';
 *
 *   // In a callable / HTTP function:
 *   const requestId = generateRequestId();
 *   const log = createRequestLogger(requestId, 'myFunctionName');
 *   log.info('Processing started', { userId: context.auth?.uid });
 *   // ... do work ...
 *   log.info('Processing complete', { result: 'ok' });
 *
 *   // Or enrich arbitrary metadata:
 *   const enriched = withRequestId(requestId, { userId: '123', action: 'create' });
 *   // => { requestId: 'req_1708300000000_a1b2c3d4', userId: '123', action: 'create' }
 */

import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Generate a unique request ID.
 *
 * Format: `req_<timestamp>_<random8hex>`
 * - Timestamp gives rough ordering and instant readability in logs.
 * - 8 hex chars (4 bytes) give 4 billion unique suffixes per millisecond,
 *   which is more than sufficient for Cloud Functions concurrency.
 *
 * Example: `req_1708300000000_a1b2c3d4`
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex'); // 8 hex chars
  return `req_${timestamp}_${random}`;
}

/**
 * Enrich a metadata object with the given requestId.
 *
 * Returns a **new** object; the original is not mutated.
 */
export function withRequestId(
  requestId: string,
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  return { requestId, ...metadata };
}

// ---------------------------------------------------------------------------
// Structured request logger
// ---------------------------------------------------------------------------

/**
 * A lightweight, structured logger scoped to a single request.
 *
 * Every log line emitted by this logger automatically includes:
 * - `requestId`  – correlation ID for the request
 * - `fn`         – the Cloud Function name (source)
 * - `severity`   – log level (INFO / WARN / ERROR / DEBUG)
 * - `timestamp`  – ISO-8601 timestamp
 *
 * Output is JSON, which Cloud Logging parses natively, enabling
 * filtering by `jsonPayload.requestId` in the GCP console.
 */
export interface RequestLogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>, err?: Error) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Create a `RequestLogger` bound to a specific request and function name.
 *
 * @param requestId - Unique correlation ID (from `generateRequestId()`)
 * @param functionName - Name of the Cloud Function (e.g. `'createAndScheduleCall'`)
 */
export function createRequestLogger(
  requestId: string,
  functionName: string,
): RequestLogger {
  const emit = (
    severity: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
    data?: Record<string, unknown>,
    err?: Error,
  ) => {
    const entry: Record<string, unknown> = {
      severity,
      timestamp: new Date().toISOString(),
      requestId,
      fn: functionName,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (err) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    // Use the appropriate console method so Cloud Logging picks up severity
    const line = JSON.stringify(entry);
    switch (severity) {
      case 'ERROR':
        console.error(line);
        break;
      case 'WARN':
        console.warn(line);
        break;
      case 'DEBUG':
        console.debug(line);
        break;
      default:
        console.log(line);
    }
  };

  return {
    info: (message, data) => emit('INFO', message, data),
    warn: (message, data) => emit('WARN', message, data),
    error: (message, data, err) => emit('ERROR', message, data, err),
    debug: (message, data) => emit('DEBUG', message, data),
  };
}
