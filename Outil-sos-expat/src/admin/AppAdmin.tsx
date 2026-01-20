/**
 * =============================================================================
 * CONSOLE D'ADMINISTRATION SOS-EXPAT
 * =============================================================================
 *
 * Console d'administration pour piloter la plateforme :
 * - Gestion des prestataires (avocats, experts)
 * - Suivi de tous les dossiers
 * - Analytics et statistiques
 * - Configuration de l'IA
 * - Gestion de l'équipe admin
 *
 * Architecture :
 * - Layout avec Sidebar fixe (fond foncé slate-900)
 * - Zone de contenu principale scrollable
 * - Accès réservé aux administrateurs uniquement
 *
 * =============================================================================
 */

import { Routes, Route, Navigate, Link, useSearchParams } from "react-router-dom";
import { lazy, Suspense, memo } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth, useSubscription } from "../contexts/UnifiedUserContext";
import { useLanguage } from "../hooks/useLanguage";
import AdminSidebar from "./components/AdminSidebar";
import { Loader2, ShieldAlert } from "lucide-react";

// =============================================================================
// LAZY LOADING - Toutes les pages admin
// =============================================================================

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Prestataires = lazy(() => import("./pages/Prestataires"));
const MultiPrestataires = lazy(() => import("./pages/MultiPrestataires"));
const Dossiers = lazy(() => import("./pages/Dossiers"));
const DossierDetail = lazy(() => import("./pages/DossierDetail"));
const Utilisateurs = lazy(() => import("./pages/Utilisateurs"));
const Pays = lazy(() => import("./pages/Pays"));
const AIConfig = lazy(() => import("./pages/AIConfig"));
const Parametres = lazy(() => import("./pages/Parametres"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));

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
// ACCESS DENIED COMPONENT
// =============================================================================

interface AccessDeniedProps {
  email?: string | null;
  role?: string | null;
  t: (key: string) => string;
}

const AccessDenied = memo(function AccessDenied({
  email,
  role,
  t,
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="max-w-md text-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("admin:accessDenied.title")}
        </h1>
        <p className="text-gray-600 mb-6">{t("admin:accessDenied.description")}</p>
        {email && (
          <p className="text-sm text-gray-500 mb-4">
            {t("admin:accessDenied.connectedAs")}: {email}
            {role && (
              <span className="block text-xs mt-1">
                {t("admin:accessDenied.role")}: {role}
              </span>
            )}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            {t("common:navigation.signOut")}
          </button>
          <Link
            to="/"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] inline-flex items-center"
          >
            {t("common:actions.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

const LoadingState = memo(function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="text-sm text-slate-400">{message}</span>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AdminApp() {
  const { isAdmin, loading, user } = useAuth();
  const { role } = useSubscription();
  const { t } = useLanguage({ mode: "admin" });
  const [searchParams] = useSearchParams();

  // DEV MODE BYPASS - Only in Vite dev server AND localhost (never in production builds)
  const isLocalDev = import.meta.env.DEV && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const devBypass = isLocalDev && searchParams.get("dev") === "true";
  if (devBypass && import.meta.env.DEV) {
    console.warn("⚠️ [DEV MODE] Console Admin accessible sans authentification - localhost uniquement");
    return (
      <div className="flex h-screen bg-gray-100">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Dev Mode Banner */}
            <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm">
              🔧 Mode développement actif - Console Admin
            </div>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="prestataires" element={<Prestataires />} />
                <Route path="multi-prestataires" element={<MultiPrestataires />} />
                <Route path="dossiers" element={<Dossiers />} />
                <Route path="dossier/:id" element={<DossierDetail />} />
                <Route path="utilisateurs" element={<Utilisateurs />} />
                <Route path="pays" element={<Pays />} />
                <Route path="ia" element={<AIConfig />} />
                <Route path="parametres" element={<Parametres />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <LoadingState message={t("admin:verifyingRights")} />;
  }

  // Access check - ADMIN ONLY
  if (!isAdmin) {
    return <AccessDenied email={user?.email} role={role} t={t} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Dashboard principal */}
              <Route index element={<AdminDashboard />} />

              {/* Analytics */}
              <Route path="analytics" element={<Analytics />} />

              {/* Gestion */}
              <Route path="prestataires" element={<Prestataires />} />
              <Route path="multi-prestataires" element={<MultiPrestataires />} />
              <Route path="dossiers" element={<Dossiers />} />
              <Route path="dossier/:id" element={<DossierDetail />} />
              <Route path="utilisateurs" element={<Utilisateurs />} />

              {/* Configuration */}
              <Route path="pays" element={<Pays />} />
              <Route path="ia" element={<AIConfig />} />
              <Route path="parametres" element={<Parametres />} />

              {/* Sécurité */}
              <Route path="audit" element={<AuditLogs />} />

              {/* Route par défaut */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
