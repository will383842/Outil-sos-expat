/**
 * App Component
 * Main application with routing and providers
 */
import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AppLayout } from './components/layout';
import { InstallPrompt } from './components/pwa';
import { Login, Dashboard, Team, Requests, NotFound } from './pages';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { t, i18n } = useTranslation();

  // Set RTL direction for Arabic and other RTL languages
  useEffect(() => {
    const isRTL = ['ar', 'he', 'fa', 'ur'].includes(i18n.language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // PWA update toast — listens for custom event from main.tsx SW registration
  const showUpdateToast = useCallback(() => {
    toast(
      (toastInstance) => (
        <div className="flex items-center gap-3">
          <span>{t('pwa.update_available', 'Mise \u00e0 jour disponible')}</span>
          <button
            onClick={() => {
              toast.dismiss(toastInstance.id);
              // Activate waiting SW then reload
              window.dispatchEvent(new CustomEvent('pwa:do-update'));
            }}
            className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            {t('pwa.reload', 'Recharger')}
          </button>
        </div>
      ),
      { duration: Infinity, icon: '\uD83D\uDD04' },
    );
  }, [t]);

  useEffect(() => {
    window.addEventListener('pwa:update-available', showUpdateToast);
    return () => window.removeEventListener('pwa:update-available', showUpdateToast);
  }, [showUpdateToast]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes with layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/requests" element={<Requests />} />
                  <Route path="/team" element={<Team />} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>

          {/* PWA Install Prompt */}
          <InstallPrompt />

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#1f2937',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                borderRadius: '0.75rem',
                padding: '1rem',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
