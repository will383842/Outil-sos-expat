/**
 * =============================================================================
 * SENTRY - Configuration optimisée pour plan GRATUIT
 * =============================================================================
 *
 * Stratégie pour rester dans le plan gratuit (5K erreurs/mois) :
 * - Échantillonnage 30% des erreurs
 * - 5% des transactions performance
 * - Replay uniquement sur 10% des erreurs
 * - Filtrage agressif des erreurs non critiques
 * - Déduplication des erreurs répétées
 *
 * Variables d'environnement :
 * - VITE_SENTRY_DSN: DSN Sentry (obligatoire)
 * - VITE_APP_VERSION: Version de l'app
 */

import * as Sentry from "@sentry/react";

// =============================================================================
// CONFIGURATION
// =============================================================================

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

// Compteur d'erreurs en session pour déduplication
const errorCounts = new Map<string, number>();

// =============================================================================
// ERREURS À IGNORER
// =============================================================================

const IGNORED_ERRORS = [
  // Erreurs réseau (temporaires, pas des bugs)
  "Failed to fetch",
  "Network Error",
  "Network request failed",
  "Load failed",
  "NetworkError",
  "AbortError",
  "TypeError: Failed to fetch",
  "TypeError: NetworkError",
  "TypeError: cancelled",
  "The operation was aborted",
  "cancelled",

  // ResizeObserver (bug Chrome, pas critique)
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",

  // Erreurs non-Error
  "Non-Error promise rejection captured",
  "Non-Error exception captured",

  // Firebase Auth (comportement normal)
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/network-request-failed",
  "auth/user-token-expired",

  // Navigation (utilisateur quitte la page)
  "Navigation cancelled",
  "Navigating to current location",

  // Erreurs Safari connues
  "webkit-masked-url",
  "The request is not allowed",
];

// Patterns regex pour ignorer
const IGNORED_ERROR_PATTERNS = [
  /Extension context invalidated/i,
  /chrome-extension/i,
  /moz-extension/i,
  /safari-extension/i,
  /script error/i,
];

// URLs à ignorer
const DENIED_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /facebook\.net/i,
  /facebook\.com/i,
  /doubleclick\.net/i,
  /hotjar\.com/i,
];

// =============================================================================
// INITIALIZATION
// =============================================================================

let isInitialized = false;

/**
 * Initialise Sentry avec configuration optimisée pour plan gratuit
 */
export function initSentry(): void {
  // Éviter double initialisation
  if (isInitialized) {
    return;
  }

  // Seulement en production avec DSN configuré
  if (!IS_PRODUCTION || !SENTRY_DSN) {
    if (IS_DEVELOPMENT) {
      console.log("[Sentry] Désactivé (mode dev ou DSN manquant)");
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: `sos-expat-tools@${APP_VERSION}`,

      // ═══════════════════════════════════════════════════════════════════════
      // ÉCHANTILLONNAGE - Pour rester dans le plan gratuit
      // ═══════════════════════════════════════════════════════════════════════

      // 30% des erreurs (économise le quota)
      sampleRate: 0.3,

      // 5% des transactions performance (économise beaucoup)
      tracesSampleRate: 0.05,

      // Pas de replay par défaut (consomme beaucoup de quota)
      replaysSessionSampleRate: 0,

      // Replay seulement sur 10% des erreurs (pour debug)
      replaysOnErrorSampleRate: 0.1,

      // ═══════════════════════════════════════════════════════════════════════
      // INTÉGRATIONS
      // ═══════════════════════════════════════════════════════════════════════

      integrations: [
        Sentry.browserTracingIntegration({
          traceFetch: true,
          traceXHR: true,
        }),
        Sentry.replayIntegration({
          maskAllInputs: true,
          maskAllText: false,
        }),
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // FILTRAGE - Économise le quota
      // ═══════════════════════════════════════════════════════════════════════

      ignoreErrors: IGNORED_ERRORS,
      denyUrls: DENIED_URLS,

      // Filtre avant envoi
      beforeSend(event, hint) {
        const error = hint.originalException;

        // 1. Ignorer les erreurs des extensions navigateur
        if (error instanceof Error && error.stack) {
          if (
            error.stack.includes("chrome-extension://") ||
            error.stack.includes("moz-extension://") ||
            error.stack.includes("safari-extension://")
          ) {
            return null;
          }

          // Ignorer les erreurs de scripts tiers
          if (
            error.stack.includes("facebook.com") ||
            error.stack.includes("google-analytics.com") ||
            error.stack.includes("googletagmanager.com")
          ) {
            return null;
          }
        }

        // 2. Vérifier les patterns d'erreur à ignorer
        if (error instanceof Error) {
          for (const pattern of IGNORED_ERROR_PATTERNS) {
            if (pattern.test(error.message) || pattern.test(error.stack || "")) {
              return null;
            }
          }
        }

        // 3. Déduplication : limite les erreurs répétées (>10 = ignoré)
        const fingerprint = event.fingerprint?.[0] || event.message || "unknown";
        const count = errorCounts.get(fingerprint) || 0;

        if (count > 10) {
          return null; // Trop d'erreurs identiques, on ignore
        }

        errorCounts.set(fingerprint, count + 1);

        // Reset le compteur toutes les 5 minutes
        setTimeout(() => {
          errorCounts.delete(fingerprint);
        }, 5 * 60 * 1000);

        // 4. Enrichir avec des tags utiles
        event.tags = {
          ...event.tags,
          device_type: /Mobi|Android/i.test(navigator.userAgent)
            ? "mobile"
            : "desktop",
          browser_lang: navigator.language,
        };

        return event;
      },

      // Nettoyer les breadcrumbs (retire les données sensibles)
      beforeBreadcrumb(breadcrumb) {
        // Retirer les corps de requête/réponse (peuvent contenir des données sensibles)
        if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
          if (breadcrumb.data) {
            delete breadcrumb.data.request_body;
            delete breadcrumb.data.response_body;
          }
        }

        // Filtrer les console.log en production
        if (breadcrumb.category === "console") {
          if (breadcrumb.level === "log" || breadcrumb.level === "debug") {
            return null;
          }
        }

        return breadcrumb;
      },
    });

    isInitialized = true;
    console.log(`[Sentry] Initialisé (v${APP_VERSION})`);
  } catch (error) {
    console.error("[Sentry] Erreur d'initialisation:", error);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Capture une erreur critique uniquement
 * Utiliser pour les vraies erreurs, pas les erreurs utilisateur
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>,
  tags?: Record<string, string>
): void {
  if (!isInitialized) {
    console.error("[Sentry] Erreur:", error, context);
    return;
  }

  const errorObj = error instanceof Error ? error : new Error(String(error));

  Sentry.captureException(errorObj, {
    extra: context,
    tags: {
      ...tags,
      captured_manually: "true",
    },
  });
}

/**
 * Capture un message important (warning, error)
 * NE PAS utiliser pour les logs normaux
 */
export function captureMessage(
  message: string,
  level: "warning" | "error" = "warning",
  context?: Record<string, unknown>
): void {
  if (!isInitialized) {
    console.log(`[Sentry] ${level}:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Définit le contexte utilisateur
 */
export interface SentryUser {
  id: string;
  email?: string;
  role?: string;
  providerId?: string;
}

export function setUserContext(user: SentryUser | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
    Sentry.setTag("user_role", user.role || "unknown");
    if (user.providerId) {
      Sentry.setTag("provider_id", user.providerId);
    }
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Ajoute un breadcrumb (trace d'action)
 */
export function addBreadcrumb(
  message: string,
  category: string = "custom",
  data?: Record<string, unknown>
): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Sentry };
export const ErrorBoundary = Sentry.ErrorBoundary;
