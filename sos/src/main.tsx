import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorLogging } from './utils/logging';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AdminViewProvider } from './contexts/AdminViewContext';

// Sentry - initialiser EN PREMIER pour capturer toutes les erreurs
import { initSentry } from './config/sentry';
initSentry();

// Initialize GTM (always - Consent Mode V2 handles data collection)
import { initializeGTM } from './utils/gtm';

// Initialize Google Ads if user has already consented to marketing
import { initializeGoogleAds, hasMarketingConsent } from './utils/googleAds';

// Initialiser la capture d'erreurs globale
setupGlobalErrorLogging();

// Always initialize GTM - Consent Mode V2 in index.html controls what data is collected
initializeGTM().catch(console.error);

// Initialize Google Ads if marketing consent was already given
if (hasMarketingConsent()) {
  initializeGoogleAds();
}

// Composant racine
const RootApp = (
  // StrictMode désactivé temporairement - cause des AbortError avec Firebase
  // <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <AdminViewProvider>
              <App />
            </AdminViewProvider>
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