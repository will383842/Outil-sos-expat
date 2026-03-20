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

// ✅ PERF: Pré-charger les traductions AVANT le rendu React
// Détecte la langue depuis l'URL (ex: /fr-fr/... → fr, /en-us/... → en)
// Évite le flash de français pour les utilisateurs non-FR lors de l'hydration react-snap
import { preloadTranslations } from './App';

function detectLanguageFromURL(): string {
  const path = window.location.pathname;
  // Format: /{lang}-{country}/... → extraire les 2 premiers caractères
  const match = path.match(/^\/([a-z]{2})-[a-z]{2}(\/|$)/);
  if (match) {
    const lang = match[1];
    // Mapper zh → ch (notre code interne pour le chinois)
    return lang === 'zh' ? 'ch' : lang;
  }
  // Fallback: localStorage ou EN par défaut (langue universelle)
  try {
    return localStorage.getItem('sos_language') || localStorage.getItem('app:lang') || 'en';
  } catch {
    return 'en';
  }
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

// Pré-charger les traductions puis monter React
// Pour FR: résolution immédiate (statique). Pour les autres: charge le chunk puis monte.
const detectedLang = detectLanguageFromURL();
preloadTranslations(detectedLang).then(() => {
  // Si la page a été pre-rendue par react-snap, hydrater au lieu de render
  if (container.hasChildNodes()) {
    hydrateRoot(container, RootApp);
  } else {
    createRoot(container).render(RootApp);
  }
});