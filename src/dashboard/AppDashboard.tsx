/**
 * =============================================================================
 * ESPACE PRESTATAIRE SOS-EXPAT
 * =============================================================================
 *
 * Application principale pour l'espace prestataire :
 * - Conversations avec les clients (via IA)
 * - Historique des consultations
 * - Profil et paramètres
 *
 * Architecture :
 * - Layout avec Sidebar fixe (fond foncé slate-900)
 * - Zone de contenu principale scrollable
 * - Accès pour prestataires solo et multi-prestataires
 *
 * =============================================================================
 */

import { Routes, Route, Navigate, Link, useSearchParams } from "react-router-dom";
import { lazy, Suspense, memo } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth, useProvider, useSubscription } from "../contexts/UnifiedUserContext";
import ProviderSidebar from "./components/ProviderSidebar";
import DevTestTools from "./components/DevTestTools";
import { Loader2, ShieldAlert, UserX } from "lucide-react";

// Mock provider for dev mode
const MOCK_PROVIDER = {
  id: "dev-provider-1",
  name: "Test Provider (Dev Mode)",
  email: "test@dev.local",
  type: "lawyer" as const,
  active: true,
  country: "France",
};

// =============================================================================
// LAZY LOADING - Pages du dashboard prestataire
// =============================================================================

const ProviderHome = lazy(() => import("./pages/ProviderHome"));
const ConversationHistory = lazy(() => import("./pages/ConversationHistory"));
const ConversationDetail = lazy(() => import("./pages/ConversationDetail"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));

// =============================================================================
// PAGE LOADER COMPONENT
// =============================================================================

const PageLoader = memo(function PageLoader() {
  return (
    <div
      className="flex items-center justify-center min-h-[400px]"
      role="status"
      aria-label="Chargement de la page"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="w-8 h-8 animate-spin text-red-600"
          aria-hidden="true"
        />
        <span className="text-sm text-gray-500">Chargement...</span>
      </div>
    </div>
  );
});

// =============================================================================
// NO PROVIDER LINKED COMPONENT
// =============================================================================

interface NoProviderProps {
  email?: string | null;
}

const NoProviderLinked = memo(function NoProviderLinked({ email }: NoProviderProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="max-w-md text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserX className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Aucun prestataire lié
        </h1>
        <p className="text-gray-600 mb-6">
          Votre compte n'est pas encore lié à un prestataire.
          Veuillez contacter l'administrateur SOS-Expat pour activer votre accès.
        </p>
        {email && (
          <p className="text-sm text-gray-500 mb-4">
            Connecté en tant que: {email}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Se déconnecter
          </button>
          <Link
            to="/"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] inline-flex items-center"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// ACCESS DENIED COMPONENT
// =============================================================================

const AccessDenied = memo(function AccessDenied({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="max-w-md text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Accès refusé
        </h1>
        <p className="text-gray-600 mb-6">
          Vous n'avez pas les droits nécessaires pour accéder à cet espace.
        </p>
        {email && (
          <p className="text-sm text-gray-500 mb-4">
            Connecté en tant que: {email}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Se déconnecter
          </button>
          <Link
            to="/"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] inline-flex items-center"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="text-sm text-slate-400">Chargement de votre espace...</span>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardApp() {
  const { user, loading: authLoading, isProvider: authIsProvider, isAdmin } = useAuth();
  const { linkedProviders, activeProvider, loading: providerLoading } = useProvider();
  const { hasAllowedRole } = useSubscription();
  const [searchParams] = useSearchParams();

  // DEV MODE BYPASS
  const isDev = import.meta.env.DEV || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const devBypass = isDev && (searchParams.get("dev") === "true" || sessionStorage.getItem("devMode") === "true");
  if (devBypass) {
    console.warn("⚠️ [DEV MODE] Dashboard accessible sans authentification");
    // Use mock provider in dev mode if no real provider
    const effectiveProvider = activeProvider || MOCK_PROVIDER;
    const effectiveProviders = linkedProviders.length > 0 ? linkedProviders : [MOCK_PROVIDER];

    return (
      <div className="flex h-screen bg-gray-100">
        <ProviderSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Dev Mode Banner */}
            <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm">
              🔧 Mode développement actif - Utilisez le bouton "Dev Tools" en bas à droite pour créer des données de test
            </div>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route index element={<ProviderHome />} />
                <Route path="historique" element={<ConversationHistory />} />
                <Route path="conversation/:id" element={<ConversationDetail />} />
                <Route path="profil" element={<ProviderProfile />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
        {/* Outils de test (dev mode uniquement) */}
        <DevTestTools />
      </div>
    );
  }

  // Loading state
  if (authLoading || providerLoading) {
    return <LoadingState />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN BYPASS: Les admins ont accès à tout
  if (isAdmin) {
    // Continue with normal flow but don't block
  }

  // Check if user has provider role (provider, admin, or linked to providers)
  const canAccessDashboard = authIsProvider || isAdmin || hasAllowedRole || linkedProviders.length > 0;
  if (!canAccessDashboard) {
    return <AccessDenied email={user?.email} />;
  }

  // No provider linked to account (except for admins)
  if (!isAdmin && linkedProviders.length === 0 && !activeProvider) {
    return <NoProviderLinked email={user?.email} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <ProviderSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Page d'accueil - Conversations */}
              <Route index element={<ProviderHome />} />

              {/* Historique des conversations */}
              <Route path="historique" element={<ConversationHistory />} />

              {/* Détail d'une conversation */}
              <Route path="conversation/:id" element={<ConversationDetail />} />

              {/* Profil */}
              <Route path="profil" element={<ProviderProfile />} />

              {/* Route par défaut */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* Outils de test (dev mode uniquement) */}
      <DevTestTools />
    </div>
  );
}
