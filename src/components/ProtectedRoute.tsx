/**
 * =============================================================================
 * PROTECTED ROUTE - Protection d'accès SSO
 * =============================================================================
 *
 * Vérifie :
 * 1. L'utilisateur est connecté (via SSO depuis sos-expat.com)
 * 2. L'utilisateur a un rôle autorisé (avocat, expat, admin)
 *
 * NOTE: L'abonnement est géré côté SOS-Expat (Laravel), pas ici.
 * Si l'utilisateur est authentifié via SSO, il a accès.
 *
 * Si pas connecté → Redirige vers /auth (page SSO)
 * Si rôle non autorisé → Écran "Accès réservé aux prestataires"
 *
 * =============================================================================
 */

import { memo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth, useSubscription } from "../contexts/UnifiedUserContext";
import { BlockedScreen } from "./guards";
import { useLanguage } from "../hooks/useLanguage";

// =============================================================================
// DEV MODE: Bypass d'authentification pour les tests
// Activer via ?dev=true dans l'URL ou via VITE_DEV_BYPASS=true
// =============================================================================

const DEV_BYPASS_ENABLED = import.meta.env.DEV && (
  import.meta.env.VITE_DEV_BYPASS === "true" ||
  typeof window !== "undefined" && window.location.search.includes("dev=true")
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// =============================================================================
// COMPOSANT: Loading Spinner réutilisable
// =============================================================================

interface LoadingSpinnerProps {
  messageKey: string;
}

const LoadingSpinner = memo(function LoadingSpinner({ messageKey }: LoadingSpinnerProps) {
  const { t } = useLanguage({ mode: "provider" });
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
        <p className="mt-4 text-gray-600">{t(messageKey)}</p>
      </div>
    </div>
  );
});

// =============================================================================
// COMPOSANT PRINCIPAL: ProtectedRoute
// =============================================================================

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useLanguage({ mode: "provider" });
  const { user, loading: authLoading, isAdmin } = useAuth();
  const {
    hasAllowedRole,
    role,
    loading: subLoading,
    error,
  } = useSubscription();
  const [searchParams] = useSearchParams();

  // ─────────────────────────────────────────────────────────────────────────
  // DEV MODE BYPASS: Accès direct pour tests (uniquement en développement)
  // Usage: ajouter ?dev=true à l'URL (sera mémorisé dans sessionStorage)
  // ─────────────────────────────────────────────────────────────────────────
  const isDev = import.meta.env.DEV || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Stocker le mode dev dans sessionStorage pour le conserver pendant la navigation
  if (isDev && searchParams.get("dev") === "true") {
    sessionStorage.setItem("devMode", "true");
  }

  const devBypass = isDev && (searchParams.get("dev") === "true" || sessionStorage.getItem("devMode") === "true");
  if (devBypass) {
    console.warn("⚠️ [DEV MODE] Bypass d'authentification activé - NE PAS UTILISER EN PRODUCTION");
    return <>{children}</>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN BYPASS: Les admins ont accès à tout
  // ─────────────────────────────────────────────────────────────────────────
  if (isAdmin && user) {
    return <>{children}</>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING: Authentification
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return <LoadingSpinner messageKey="guards.loading" />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NON CONNECTÉ → Redirige vers SSO
  // ─────────────────────────────────────────────────────────────────────────
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING: Vérification abonnement/rôle
  // ─────────────────────────────────────────────────────────────────────────
  if (subLoading) {
    return <LoadingSpinner messageKey="guards.verifyingAccess" />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ERREUR: Compte non trouvé dans Firestore
  // ─────────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <BlockedScreen
        icon="user"
        title={t("guards.accountNotFound")}
        description={t("guards.accountNotFoundDescription")}
        primaryAction={{
          label: t("guards.registerOnSosExpat"),
          href: "https://sos-expat.com/devenir-prestataire",
        }}
        secondaryAction={{
          label: t("guards.contactSupport"),
          href: "https://sos-expat.com/contact",
        }}
        userEmail={user.email}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RÔLE NON AUTORISÉ
  // ─────────────────────────────────────────────────────────────────────────
  if (!hasAllowedRole) {
    const roleDescription = role
      ? `${t("guards.accessReservedDescription")} ${t("guards.currentRoleNotAllowed", { role })}`
      : t("guards.accessReservedDescription");
    return (
      <BlockedScreen
        icon="shield"
        title={t("guards.accessReservedProviders")}
        description={roleDescription}
        primaryAction={{
          label: t("guards.becomeProvider"),
          href: "https://sos-expat.com/devenir-prestataire",
        }}
        secondaryAction={{
          label: t("guards.backToSosExpat"),
          href: "https://sos-expat.com",
        }}
        userEmail={user.email}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOUT OK → Afficher le contenu protégé
  // NOTE: L'abonnement est géré côté SOS-Expat, pas de vérification ici
  // ─────────────────────────────────────────────────────────────────────────
  return <>{children}</>;
}

export default memo(ProtectedRoute);
