/**
 * =============================================================================
 * SUBSCRIPTION GUARD - Composant de protection d'accès
 * =============================================================================
 *
 * Protège les routes/composants qui nécessitent un abonnement actif.
 *
 * Usage:
 *   <SubscriptionGuard>
 *     <ProtectedContent />
 *   </SubscriptionGuard>
 *
 * =============================================================================
 */

import React from "react";
import { useRequireSubscription, useExpirationAlert } from "../hooks/useSubscription";
import { AlertTriangle, CreditCard, Clock, XCircle, Loader2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showExpirationAlert?: boolean;
}

interface SubscriptionAlertProps {
  message: string;
  daysRemaining: number | null;
  onDismiss: () => void;
}

interface SubscriptionRequiredProps {
  message: string;
  onSubscribe?: () => void;
}

// =============================================================================
// COMPOSANTS
// =============================================================================

/**
 * Alerte d'expiration proche
 */
export function ExpirationAlert({ message, daysRemaining, onDismiss }: SubscriptionAlertProps) {
  const { t } = useLanguage({ mode: "provider" });
  const isUrgent = daysRemaining !== null && daysRemaining <= 3;

  return (
    <div
      className={`
        relative flex items-center gap-3 p-4 rounded-lg mb-4
        ${isUrgent
          ? "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          : "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
        }
      `}
    >
      <Clock className={`h-5 w-5 flex-shrink-0 ${isUrgent ? "text-red-500" : "text-amber-500"}`} />
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label={t("guards.close")}
      >
        <XCircle className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Page affichée quand l'abonnement est requis
 */
export function SubscriptionRequired({ message, onSubscribe }: SubscriptionRequiredProps) {
  const { t } = useLanguage({ mode: "provider" });
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
        <CreditCard className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {t("guards.subscriptionRequired")}
      </h2>

      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {message}
      </p>

      <div className="flex gap-3">
        <a
          href="https://sos-expat.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="
            inline-flex items-center gap-2 px-6 py-3
            bg-blue-600 text-white rounded-lg font-medium
            hover:bg-blue-700 transition-colors
          "
        >
          <CreditCard className="h-5 w-5" />
          {t("guards.viewOffers")}
        </a>

        {onSubscribe && (
          <button
            onClick={onSubscribe}
            className="
              inline-flex items-center gap-2 px-6 py-3
              border border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300 rounded-lg font-medium
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
            "
          >
            {t("guards.contactSupport")}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-500 mt-8">
        {t("guards.needHelp")}{" "}
        <a
          href="mailto:support@sos-expat.com"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          support@sos-expat.com
        </a>
      </p>
    </div>
  );
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

/**
 * Guard principal
 */
export function SubscriptionGuard({
  children,
  fallback,
  showExpirationAlert = true,
}: SubscriptionGuardProps) {
  const { t } = useLanguage({ mode: "provider" });
  const { hasAccess, isLoading, errorMessage } = useRequireSubscription();
  const { showAlert, message: alertMessage, daysRemaining, dismiss } = useExpirationAlert();

  // Loading
  if (isLoading) {
    return <>{fallback || <LoadingState />}</>;
  }

  // Pas d'accès
  if (!hasAccess) {
    return <SubscriptionRequired message={errorMessage || t("guards.subscriptionRequiredMessage")} />;
  }

  // Accès autorisé
  return (
    <>
      {showExpirationAlert && showAlert && alertMessage && (
        <ExpirationAlert
          message={alertMessage}
          daysRemaining={daysRemaining}
          onDismiss={dismiss}
        />
      )}
      {children}
    </>
  );
}

// =============================================================================
// HOC VERSION (pour les class components ou usage alternatif)
// =============================================================================

/**
 * HOC pour protéger un composant avec vérification d'abonnement
 *
 * Usage:
 *   export default withSubscription(MyComponent);
 */
export function withSubscription<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <SubscriptionGuard>
        <Component {...props} />
      </SubscriptionGuard>
    );
  };
}

// =============================================================================
// BADGE DE STATUT D'ABONNEMENT
// =============================================================================

interface SubscriptionBadgeProps {
  status: string;
  className?: string;
}

export function SubscriptionBadge({ status, className = "" }: SubscriptionBadgeProps) {
  const { t } = useLanguage({ mode: "provider" });

  const config: Record<string, { bg: string; text: string; labelKey: string }> = {
    active: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      labelKey: "subscription.active",
    },
    trialing: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      labelKey: "subscription.trial",
    },
    past_due: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      labelKey: "subscription.pastDue",
    },
    canceled: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-400",
      labelKey: "subscription.canceled",
    },
    expired: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      labelKey: "subscription.expired",
    },
    unpaid: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      labelKey: "subscription.unpaid",
    },
  };

  const { bg, text, labelKey } = config[status] || config.canceled;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${bg} ${text} ${className}
      `}
    >
      {t(labelKey)}
    </span>
  );
}

export default SubscriptionGuard;
