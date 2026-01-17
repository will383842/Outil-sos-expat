import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  // Ne pas initialiser si pas de DSN (dev local sans Sentry)
  if (!SENTRY_DSN) {
    console.info('[Sentry] DSN non configuré - monitoring désactivé')
    return
  }

  const isProduction = import.meta.env.PROD
  const environment = import.meta.env.VITE_ENV || (isProduction ? 'production' : 'development')

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,

    // Intégrations recommandées
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Masquer les données sensibles
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% en prod, 100% en dev

    // Session Replay - capture 10% des sessions normales, 100% avec erreur
    replaysSessionSampleRate: isProduction ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filtrer les erreurs non pertinentes
    beforeSend(event, hint) {
      const error = hint.originalException

      // Ignorer les erreurs de réseau (offline, timeout)
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()

        // Erreurs de réseau à ignorer
        if (
          errorMessage.includes('network error') ||
          errorMessage.includes('failed to fetch') ||
          errorMessage.includes('load failed') ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('timeout')
        ) {
          return null
        }

        // Erreurs de permissions navigateur
        if (
          errorMessage.includes('permission denied') ||
          errorMessage.includes('notallowederror')
        ) {
          return null
        }

        // Erreurs Firebase transient
        if (
          errorMessage.includes('firebase') &&
          (errorMessage.includes('unavailable') || errorMessage.includes('internal'))
        ) {
          return null
        }
      }

      // Ne pas envoyer les erreurs en dev local
      if (event.environment === 'development' && !SENTRY_DSN?.includes('localhost')) {
        return null
      }

      return event
    },

    // Masquer les données sensibles
    beforeSendTransaction(event) {
      // Supprimer les données sensibles des transactions
      if (event.contexts?.trace) {
        delete event.contexts.trace.data
      }
      return event
    },

    // Tags par défaut
    initialScope: {
      tags: {
        app: 'sos-expat-frontend',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
  })

  console.info(`[Sentry] Initialisé en mode ${environment}`)
}

// Fonctions utilitaires pour le monitoring
export function setUserContext(user: { id: string; email?: string; role?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Ne pas exposer de données sensibles
    })
    Sentry.setTag('user_role', user.role || 'unknown')
  } else {
    Sentry.setUser(null)
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
  })
}

// Export pour usage dans les Error Boundaries
export { Sentry }
