/**
 * Sentry Configuration for Firebase Functions Backend
 *
 * P1-4: Monitoring des erreurs côté backend
 *
 * Usage dans les Cloud Functions:
 * 1. Importer: import { initSentry, captureError, setUserContext } from './config/sentry'
 * 2. Appeler initSentry() au début de index.ts
 * 3. Utiliser captureError() pour les erreurs importantes
 */

import * as Sentry from "@sentry/node";

// Environment detection
const isProduction = process.env.NODE_ENV === "production" ||
  process.env.GCLOUD_PROJECT === "sos-expat";

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
  process.env.FIREBASE_EMULATOR === "true";

let isInitialized = false;

/**
 * Initialize Sentry for Firebase Functions
 * Call this lazily at runtime (not during module load)
 */
export function initSentry(): void {
  if (isInitialized) {
    return;
  }

  // Skip in emulator unless explicitly enabled
  if (isEmulator && !process.env.SENTRY_ENABLE_EMULATOR) {
    console.log("[Sentry Backend] Emulator detected, skipping initialization");
    isInitialized = true; // Mark as "handled"
    return;
  }

  // Get DSN from environment variable (set in Firebase console or .env)
  const dsn = process.env.SENTRY_DSN_BACKEND;

  if (!dsn) {
    console.info("[Sentry Backend] DSN not configured - monitoring disabled");
    isInitialized = true; // Mark as "handled"
    return;
  }

  const environment = isProduction ? "production" : "development";

  Sentry.init({
    dsn,
    environment,

    // Disable performance monitoring for functions (adds overhead)
    tracesSampleRate: isProduction ? 0.1 : 0.5,

    // Set release version
    release: process.env.K_REVISION || "firebase-functions@1.0.0",

    // Server-side settings
    serverName: process.env.K_SERVICE || "firebase-functions",

    // Filter unwanted errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Ignore common transient errors
        if (
          message.includes("econnreset") ||
          message.includes("socket hang up") ||
          message.includes("etimedout") ||
          message.includes("enotfound") ||
          message.includes("deadline exceeded") ||
          message.includes("quota exceeded")
        ) {
          console.log(`[Sentry Backend] Filtered transient error: ${error.message}`);
          return null;
        }

        // Ignore Stripe rate limit errors (handled by retry logic)
        if (message.includes("rate_limit") && message.includes("stripe")) {
          return null;
        }

        // Ignore Firebase auth token expired (user needs to re-login)
        if (message.includes("firebase") && message.includes("token expired")) {
          return null;
        }
      }

      return event;
    },

    // Add function metadata to errors
    initialScope: {
      tags: {
        app: "sos-expat-backend",
        runtime: "firebase-functions",
        nodeVersion: process.version,
      },
    },
  });

  isInitialized = true;
  console.info(`[Sentry Backend] Initialized in ${environment} mode`);
}

/**
 * Capture an error with optional context
 */
export function captureError(
  error: Error | unknown,
  context?: {
    userId?: string;
    functionName?: string;
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  }
): string | undefined {
  if (!isInitialized) {
    console.error("[Sentry Backend] Not initialized, error not captured:", error);
    return undefined;
  }

  const scope = new Sentry.Scope();

  if (context?.userId) {
    scope.setUser({ id: context.userId });
  }

  if (context?.functionName) {
    scope.setTag("function", context.functionName);
  }

  if (context?.tags) {
    Object.entries(context.tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  }

  if (context?.extra) {
    Object.entries(context.extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
  }

  const eventId = Sentry.captureException(error, scope);
  console.log(`[Sentry Backend] Error captured with ID: ${eventId}`);
  return eventId;
}

/**
 * Capture a message (for warnings or important events)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>
): string | undefined {
  if (!isInitialized) {
    console.log(`[Sentry Backend] Not initialized, message not captured: ${message}`);
    return undefined;
  }

  const eventId = Sentry.captureMessage(message, {
    level,
    extra: context,
  });

  return eventId;
}

/**
 * Set user context for current scope
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  role?: string;
} | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
    if (user.role) {
      Sentry.setTag("user_role", user.role);
    }
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info"
): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Flush pending events (call before function ends)
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  if (!isInitialized) return true;
  return Sentry.flush(timeout);
}

/**
 * Wrapper to capture errors in async functions
 */
export function withSentry<T extends (...args: unknown[]) => Promise<unknown>>(
  functionName: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      addBreadcrumb("function", `Starting ${functionName}`);
      const result = await fn(...args);
      addBreadcrumb("function", `Completed ${functionName}`);
      return result;
    } catch (error) {
      captureError(error, { functionName });
      throw error;
    }
  }) as T;
}

// Export Sentry for advanced usage
export { Sentry };
