/**
 * =============================================================================
 * USE SUBSCRIPTION HOOK - Hook React pour la gestion des abonnements
 * =============================================================================
 *
 * Hook pour accéder aux informations d'abonnement et vérifier l'accès
 * aux fonctionnalités de manière réactive.
 *
 * Usage:
 *   const { hasAccess, subscription, isLoading } = useSubscription();
 *   if (!hasAccess) return <SubscriptionRequired />;
 *
 * =============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../contexts/UnifiedUserContext";
import {
  SubscriptionInfo,
  subscribeToSubscription,
  getSubscriptionInfo,
  checkCurrentUserAccess,
  getSubscriptionErrorMessage,
} from "../services/subscriptionService";

// =============================================================================
// TYPES
// =============================================================================

interface UseSubscriptionReturn {
  // État de l'abonnement
  subscription: SubscriptionInfo | null;
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;

  // Helpers
  daysRemaining: number | null;
  isExpiringSoon: boolean; // < 7 jours
  statusLabel: string;

  // Actions
  refresh: () => Promise<void>;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const { t } = useTranslation("common");
  const { user, isAdmin } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rafraîchir manuellement les données
  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const info = await getSubscriptionInfo(user.uid);
      setSubscription(info);
    } catch (err) {
      setError((err as Error).message);
      console.error("[useSubscription] Erreur:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Écoute en temps réel des changements d'abonnement
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // S'abonner aux changements
    const unsubscribe = subscribeToSubscription(user.uid, (info) => {
      setSubscription(info);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Calculer les helpers
  const hasAccess = isAdmin || (subscription?.hasAccess ?? false);
  const daysRemaining = subscription?.daysRemaining ?? null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  // Label de statut - utilise les traductions i18n
  const getStatusLabel = (): string => {
    if (isAdmin) return t("subscription.admin");
    if (!subscription?.status) return t("subscription.noSubscription");

    // Utilise les clés de traduction pour chaque statut
    const statusKey = subscription.status;
    const translatedStatus = t(`subscription.${statusKey}`, { defaultValue: statusKey });

    return translatedStatus;
  };

  return {
    subscription,
    hasAccess,
    isLoading,
    error,
    daysRemaining,
    isExpiringSoon,
    statusLabel: getStatusLabel(),
    refresh,
  };
}

// =============================================================================
// HOOK DE PROTECTION DE ROUTE
// =============================================================================

interface UseRequireSubscriptionReturn {
  hasAccess: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  subscription: SubscriptionInfo | null;
}

/**
 * Hook pour protéger une route/composant qui nécessite un abonnement actif
 *
 * Usage:
 *   const { hasAccess, isLoading, errorMessage } = useRequireSubscription();
 *   if (isLoading) return <Loading />;
 *   if (!hasAccess) return <SubscriptionRequired message={errorMessage} />;
 */
export function useRequireSubscription(): UseRequireSubscriptionReturn {
  const { hasAccess, isLoading, subscription } = useSubscription();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!hasAccess) {
      checkCurrentUserAccess().then(({ reason }) => {
        setErrorMessage(getSubscriptionErrorMessage(reason, i18n.language || "en"));
      });
    } else {
      setErrorMessage(null);
    }
  }, [hasAccess, isLoading]);

  return {
    hasAccess,
    isLoading,
    errorMessage,
    subscription,
  };
}

// =============================================================================
// HOOK POUR AFFICHER UNE ALERTE D'EXPIRATION
// =============================================================================

interface UseExpirationAlertReturn {
  showAlert: boolean;
  message: string | null;
  daysRemaining: number | null;
  dismiss: () => void;
}

/**
 * Hook pour afficher une alerte quand l'abonnement expire bientôt
 */
export function useExpirationAlert(): UseExpirationAlertReturn {
  const { t } = useTranslation("common");
  const { subscription, isExpiringSoon, daysRemaining } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Réinitialiser le dismiss si l'abonnement change
  useEffect(() => {
    setDismissed(false);
  }, [subscription?.status]);

  const showAlert = isExpiringSoon && !dismissed;

  const getMessage = (): string | null => {
    if (!showAlert) return null;

    if (daysRemaining === 1) {
      return t("subscription.expiresTomorrow");
    }

    if (daysRemaining !== null && daysRemaining <= 3) {
      return t("subscription.expiresInDays", { days: daysRemaining });
    }

    if (daysRemaining !== null) {
      return t("subscription.expiresInDaysShort", { days: daysRemaining });
    }

    return null;
  };

  return {
    showAlert,
    message: getMessage(),
    daysRemaining,
    dismiss: () => setDismissed(true),
  };
}

// =============================================================================
// COMPOSANT DE PROTECTION (optionnel, pour usage déclaratif)
// =============================================================================

export default useSubscription;
