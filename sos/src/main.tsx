import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AdminViewProvider } from './contexts/AdminViewContext';

// ⚡ PERF: Sentry, GTM, Google Ads et error logging différés via requestIdleCallback
// pour ne pas bloquer le rendu initial (~300ms de gagné)
// Les erreurs dans les premières ~2s ne seront pas captées par Sentry (acceptable)
const deferToIdle = (fn: () => void, timeout = 3000) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => fn(), { timeout });
  } else {
    setTimeout(fn, 100);
  }
};

deferToIdle(() => {
  import('./config/sentry').then(({ initSentry }) => initSentry());
});

deferToIdle(() => {
  import('./utils/logging').then(({ setupGlobalErrorLogging }) => setupGlobalErrorLogging());
});

deferToIdle(() => {
  import('./utils/gtm').then(({ initializeGTM }) => {
    initializeGTM().catch(() => {});
  });
});

deferToIdle(() => {
  import('./utils/googleAds').then(({ initializeGoogleAds, hasMarketingConsent }) => {
    if (hasMarketingConsent()) {
      initializeGoogleAds();
    }
  });
});

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
// Timeout de sécurité : si le chunk ne charge pas en 3s, monter quand même (avec EN en fallback)
const detectedLang = detectLanguageFromURL();

function mountApp() {
  if (container.hasChildNodes()) {
    hydrateRoot(container, RootApp);
  } else {
    createRoot(container).render(RootApp);
  }
}

// Pour EN: résolution immédiate (statique). Pour les autres: charge le chunk puis monte.
// Promise.race garantit que l'app se monte même si le chunk échoue.
let mounted = false;
const safeMount = () => { if (!mounted) { mounted = true; mountApp(); } };

Promise.race([
  preloadTranslations(detectedLang),
  new Promise<void>(resolve => setTimeout(resolve, 3000)), // Timeout 3s
]).then(safeMount).catch(safeMount);