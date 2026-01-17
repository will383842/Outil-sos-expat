/**
 * =============================================================================
 * ERROR TRACKING SERVICE - Sentry Integration
 * =============================================================================
 *
 * Service centralisé pour le tracking d'erreurs:
 * - Capture automatique des erreurs
 * - Contexte utilisateur
 * - Breadcrumbs pour debugging
 * - Performance monitoring
 * - Release tracking
 *
 * =============================================================================
 */

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = "fatal" | "error" | "warning" | "info" | "debug";

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  page?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

export interface BreadcrumbData {
  category: string;
  message: string;
  level?: ErrorSeverity;
  data?: Record<string, unknown>;
}

interface SentryLike {
  init: (options: SentryInitOptions) => void;
  captureException: (error: Error, context?: { extra?: Record<string, unknown>; tags?: Record<string, string> }) => string;
  captureMessage: (message: string, level?: ErrorSeverity) => string;
  setUser: (user: { id: string; email?: string; [key: string]: unknown } | null) => void;
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: unknown) => void;
  addBreadcrumb: (breadcrumb: { category: string; message: string; level?: string; data?: Record<string, unknown> }) => void;
  withScope: (callback: (scope: SentryScope) => void) => void;
  startTransaction: (context: { name: string; op: string }) => SentryTransaction;
}

interface SentryScope {
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: unknown) => void;
  setLevel: (level: ErrorSeverity) => void;
}

interface SentryTransaction {
  finish: () => void;
  startChild: (context: { op: string; description: string }) => SentrySpan;
}

interface SentrySpan {
  finish: () => void;
}

interface SentryInitOptions {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  integrations?: unknown[];
  beforeSend?: (event: unknown) => unknown | null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";
const ENVIRONMENT = import.meta.env.VITE_ENV || "development";
const RELEASE = import.meta.env.VITE_RELEASE || "unknown";

// =============================================================================
// ERROR TRACKING SERVICE
// =============================================================================

class ErrorTrackingService {
  private initialized = false;
  private Sentry: SentryLike | null = null;
  private errorQueue: Array<{ error: Error; context?: ErrorContext }> = [];
  private currentUser: { id: string; email?: string } | null = null;

  /**
   * Initialize Sentry
   */
  async init(): Promise<void> {
    if (this.initialized || !SENTRY_DSN) {
      console.debug("[ErrorTracking] Sentry DSN not configured, skipping init");
      return;
    }

    try {
      // Dynamic import Sentry
      const Sentry = await import("@sentry/react");

      Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        release: RELEASE,
        tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        beforeSend: (event) => {
          // Filtrer les erreurs non pertinentes
          if (this.shouldIgnoreError(event)) {
            return null;
          }
          return event;
        },
      });

      this.Sentry = Sentry as unknown as SentryLike;
      this.initialized = true;

      // Process queued errors
      this.processQueue();

      console.debug("[ErrorTracking] Sentry initialized");
    } catch (error) {
      console.warn("[ErrorTracking] Failed to init Sentry:", error);
    }
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(event: unknown): boolean {
    const eventObj = event as { exception?: { values?: Array<{ value?: string }> } };
    const message = eventObj?.exception?.values?.[0]?.value || "";

    // Ignore common non-actionable errors
    const ignorePatterns = [
      /ResizeObserver loop/i,
      /Loading chunk.*failed/i,
      /Network request failed/i,
      /AbortError/i,
      /cancelled/i,
    ];

    return ignorePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Process queued errors after init
   */
  private processQueue(): void {
    while (this.errorQueue.length > 0) {
      const { error, context } = this.errorQueue.shift()!;
      this.captureError(error, context);
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; role?: string } | null): void {
    this.currentUser = user;

    if (!this.Sentry) return;

    if (user) {
      this.Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } else {
      this.Sentry.setUser(null);
    }
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context?: ErrorContext): string {
    console.error("[ErrorTracking]", error);

    if (!this.Sentry) {
      this.errorQueue.push({ error, context });
      return "";
    }

    return this.Sentry.captureException(error, {
      extra: {
        ...context?.extra,
        page: context?.page || window.location.pathname,
        action: context?.action,
      },
      tags: {
        userRole: context?.userRole || "unknown",
      },
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: ErrorSeverity = "info"): string {
    if (!this.Sentry) {
      console.log(`[ErrorTracking] ${level}: ${message}`);
      return "";
    }

    return this.Sentry.captureMessage(message, level);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(data: BreadcrumbData): void {
    if (!this.Sentry) return;

    this.Sentry.addBreadcrumb({
      category: data.category,
      message: data.message,
      level: data.level || "info",
      data: data.data,
    });
  }

  /**
   * Set a tag
   */
  setTag(key: string, value: string): void {
    if (!this.Sentry) return;
    this.Sentry.setTag(key, value);
  }

  /**
   * Set extra context
   */
  setExtra(key: string, value: unknown): void {
    if (!this.Sentry) return;
    this.Sentry.setExtra(key, value);
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string): {
    finish: () => void;
    startChild: (op: string, description: string) => { finish: () => void };
  } {
    if (!this.Sentry) {
      return {
        finish: () => {},
        startChild: () => ({ finish: () => {} }),
      };
    }

    const transaction = this.Sentry.startTransaction({ name, op });

    return {
      finish: () => transaction.finish(),
      startChild: (childOp: string, description: string) => {
        const span = transaction.startChild({ op: childOp, description });
        return { finish: () => span.finish() };
      },
    };
  }

  /**
   * Capture with scope
   */
  captureWithScope(
    error: Error,
    scopeConfig: {
      level?: ErrorSeverity;
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    }
  ): void {
    if (!this.Sentry) {
      this.captureError(error);
      return;
    }

    this.Sentry.withScope((scope) => {
      if (scopeConfig.level) scope.setLevel(scopeConfig.level);
      if (scopeConfig.tags) {
        Object.entries(scopeConfig.tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (scopeConfig.extra) {
        Object.entries(scopeConfig.extra).forEach(([k, v]) => scope.setExtra(k, v));
      }
      this.Sentry?.captureException(error);
    });
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const errorTracking = new ErrorTrackingService();

// =============================================================================
// ERROR BOUNDARY HELPER
// =============================================================================

export function createErrorBoundaryFallback(
  componentName: string
): (error: Error, errorInfo: { componentStack: string }) => void {
  return (error: Error, errorInfo: { componentStack: string }) => {
    errorTracking.captureWithScope(error, {
      level: "error",
      tags: { component: componentName },
      extra: { componentStack: errorInfo.componentStack },
    });
  };
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useEffect, useCallback } from "react";

export function useErrorTracking(componentName?: string) {
  useEffect(() => {
    if (componentName) {
      errorTracking.addBreadcrumb({
        category: "navigation",
        message: `Mounted: ${componentName}`,
      });
    }
  }, [componentName]);

  const captureError = useCallback((error: Error, context?: ErrorContext) => {
    errorTracking.captureError(error, {
      ...context,
      page: componentName,
    });
  }, [componentName]);

  const trackAction = useCallback((action: string, data?: Record<string, unknown>) => {
    errorTracking.addBreadcrumb({
      category: "user-action",
      message: action,
      data,
    });
  }, []);

  return { captureError, trackAction };
}

// =============================================================================
// GLOBAL ERROR HANDLERS
// =============================================================================

export function setupGlobalErrorHandlers(): void {
  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    errorTracking.captureError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { action: "unhandledrejection" }
    );
  });

  // Global errors
  window.addEventListener("error", (event) => {
    errorTracking.captureError(event.error || new Error(event.message), {
      action: "global-error",
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}

export default errorTracking;
