/**
 * =============================================================================
 * PROTECTED ROUTE - Protection d'accès SSO (VERSION CONSOLIDÉE)
 * =============================================================================
 *
 * LOGIQUE ROBUSTE:
 * 1. Attendre que l'authentification soit chargée
 * 2. Si pas connecté → Redirige vers /auth
 * 3. Si admin OU provider → Accès immédiat (bypass tout le reste)
 * 4. Sinon, vérifier le rôle
 *
 * NOTE IMPORTANTE:
 * L'abonnement est géré côté SOS-Expat (Laravel), PAS ici.
 * Si l'utilisateur est un provider (trouvé par email), il a accès.
 *
 * =============================================================================
 */

import { memo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth, useSubscription, useProvider } from "../contexts/UnifiedUserContext";
import { BlockedScreen } from "./guards";
import { useLanguage } from "../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface LoadingSpinnerProps {
  messageKey: string;
}

// =============================================================================
// COMPOSANT: Loading Spinner
// =============================================================================

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
  const { hasAllowedRole, role, loading: subLoading, error } = useSubscription();
  const { isProvider, providerProfile } = useProvider();
  const [searchParams] = useSearchParams();

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 0: DEV MODE BYPASS (uniquement en développement)
  // ═══════════════════════════════════════════════════════════════════════════
  const isDev = import.meta.env.DEV ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isDev && searchParams.get("dev") === "true") {
    sessionStorage.setItem("devMode", "true");
  }

  const devBypass = isDev && (
    searchParams.get("dev") === "true" ||
    sessionStorage.getItem("devMode") === "true"
  );

  if (devBypass) {
    console.warn("⚠️ [DEV MODE] Bypass activé");
    return <>{children}</>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1: ATTENDRE L'AUTHENTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  if (authLoading) {
    return <LoadingSpinner messageKey="guards.loading" />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2: VÉRIFIER SI CONNECTÉ
  // ═══════════════════════════════════════════════════════════════════════════
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 3: BYPASS ADMIN - Les admins ont toujours accès
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return <>{children}</>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 4: BYPASS PROVIDER - Les providers ont toujours accès
  // C'est la règle clé: si trouvé dans la collection "providers" par email,
  // l'utilisateur a accès. L'abonnement est géré par SOS-Expat.
  // ═══════════════════════════════════════════════════════════════════════════
  if (isProvider && providerProfile) {
    return <>{children}</>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 5: ATTENDRE LE CHARGEMENT DES DONNÉES UTILISATEUR
  // (Seulement si pas admin/provider - sinon on aurait déjà retourné)
  // ═══════════════════════════════════════════════════════════════════════════
  if (subLoading) {
    return <LoadingSpinner messageKey="guards.verifyingAccess" />;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 6: VÉRIFIER LES ERREURS
  // Note: Cette erreur ne devrait pas apparaître pour les providers car ils
  // sont gérés à l'étape 4. Ceci est pour les autres utilisateurs.
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 7: VÉRIFIER LE RÔLE
  // Note: hasAllowedRole inclut déjà isProvider et isAdmin dans sa logique
  // Donc ce check est une sécurité supplémentaire pour les cas edge
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 8: TOUT OK → AFFICHER LE CONTENU
  // ═══════════════════════════════════════════════════════════════════════════
  return <>{children}</>;
}

export default memo(ProtectedRoute);
