/**
 * =============================================================================
 * APP - Point d'entrée de l'application
 * =============================================================================
 *
 * Routes:
 * - /auth         → Page SSO (reçoit token depuis sos-expat.com)
 * - /auth?token=x → Connexion automatique avec Custom Token
 * - /admin/*      → Console Admin (réservée aux administrateurs SOS-Expat)
 * - /dashboard/*  → Espace Prestataire (pour les prestataires abonnés)
 * - /*            → Redirige vers /auth
 *
 * Architecture:
 * - /admin = Console de pilotage (gestion prestataires, config IA, analytics)
 * - /dashboard = Espace prestataire (conversations IA, historique, profil)
 *
 * L'utilisateur ne peut PAS se connecter directement ici.
 * Il doit passer par sos-expat.com qui génère un token SSO.
 *
 * =============================================================================
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import ProtectedRoute from "./components/ProtectedRoute";
import { UnifiedUserProvider } from "./contexts/UnifiedUserContext";
import { Toaster } from "react-hot-toast";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

// Lazy loading des pages principales
const AdminApp = lazy(() => import("./admin/AppAdmin"));
const DashboardApp = lazy(() => import("./dashboard/AppDashboard"));
const AuthSSO = lazy(() => import("./pages/AuthSSO"));
const Login = lazy(() => import("./pages/Login"));

// =============================================================================
// ERROR BOUNDARY - Capture les erreurs React non gérées
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log l'erreur vers un service de monitoring (ex: Sentry)
    console.error("[ErrorBoundary] Erreur capturée:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/auth";
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {/* Icône erreur */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oups ! Une erreur est survenue
              </h1>

              <p className="text-gray-600 mb-6">
                L'application a rencontré un problème inattendu. Nos équipes ont été notifiées.
              </p>

              {/* Détails de l'erreur (en mode dev uniquement) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Détails techniques
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-red-600 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recharger la page
                </button>

                <button
                  onClick={this.handleReset}
                  className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>

            {/* Copyright */}
            <p className="mt-8 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} SOS Expats. Tous droits réservés.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loader global pour les transitions de route
function GlobalLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Chargement">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sos-red" aria-hidden="true" />
        <span className="text-gray-600">Chargement...</span>
      </div>
    </div>
  );
}

// Logger de debug pour les routes (uniquement en développement)
function RouteLogger() {
  const location = useLocation();
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug("[Router] path =", location.pathname);
    }
  }, [location.pathname]);
  return null;
}

export default function App() {
  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Initialisation différée des services non-critiques
  // Ces services ne bloquent PAS le premier render
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Import dynamique pour éviter le bundling dans le chunk principal
    const initServices = async () => {
      const { initAllMonitoring } = await import("./services/init/monitoring");
      const { initTheme } = await import("./services/init/theme");
      const { initPWA } = await import("./services/init/pwa");

      initAllMonitoring();
      initTheme();
      initPWA();

      // Log performance
      if (import.meta.env.DEV) {
        console.log("✅ Services d'initialisation différée chargés");
      }
    };

    // Exécuter après le premier render (non-bloquant)
    const timeoutId = setTimeout(initServices, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnifiedUserProvider>
          <BrowserRouter>
              <RouteLogger />
              <Suspense fallback={<GlobalLoader />}>
                <Routes>
                {/* Page SSO - reçoit le token depuis Laravel */}
                <Route path="/auth" element={<AuthSSO />} />

                {/* Page Login directe (pour tests et admins) */}
                <Route path="/login" element={<Login />} />

                {/* Console Admin - réservée aux administrateurs */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute>
                      <AdminApp />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard Prestataire - pour tous les prestataires */}
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <DashboardApp />
                    </ProtectedRoute>
                  }
                />

                {/* Toute autre route → SSO (production) */}
                <Route path="*" element={<Navigate to="/auth" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>

            {/* Toast notifications - accessible */}
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#FFFFFF',
                  },
                  duration: 5000,
                },
              }}
              containerStyle={{
                bottom: 80, // Au-dessus de la barre de navigation mobile
              }}
            />
        </UnifiedUserProvider>
        {/* React Query DevTools - uniquement en développement */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
