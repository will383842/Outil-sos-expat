import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorLogging } from './utils/logging';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Sentry - initialiser EN PREMIER pour capturer toutes les erreurs
import { initSentry } from './config/sentry';
initSentry();

// Initialize GTM/GA4 if user has already consented
import { hasAnalyticsConsent } from './utils/ga4';
import { initializeGTM } from './utils/gtm';

// Initialiser la capture d'erreurs globale
setupGlobalErrorLogging();

// Initialize GTM/GA4 if consent was already given
if (hasAnalyticsConsent()) {
  initializeGTM().catch(console.error);
}

// Composant racine
const RootApp = (
  // StrictMode désactivé temporairement - cause des AbortError avec Firebase
  // <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </HelmetProvider>
  // </React.StrictMode>
);

const container = document.getElementById('root')!;

// Si la page a été pre-rendue par react-snap, hydrater au lieu de render
if (container.hasChildNodes()) {
  hydrateRoot(container, RootApp);
} else {
  createRoot(container).render(RootApp);
}