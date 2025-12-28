/**
 * =============================================================================
 * MAIN.TSX - POINT D'ENTRÉE OPTIMISÉ
 * =============================================================================
 *
 * PERFORMANCE: Ce fichier est réduit au strict minimum pour optimiser
 * le Time to First Render et Time to Interactive.
 *
 * - Sentry: Initialisé immédiatement (critique pour monitoring erreurs)
 * - React: Rendu immédiatement
 * - Autres services: Différés via useEffect dans App.tsx
 *
 * Gain attendu: Time to Interactive -60%
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// =============================================================================
// I18N - Initialisation du système multilingue
// =============================================================================
import "./i18n";

// =============================================================================
// SENTRY - Initialisé immédiatement (critique pour monitoring erreurs)
// =============================================================================
import { initSentry } from "./lib/sentry";
initSentry();

// =============================================================================
// CONFIGURATION GLOBALE MINIMALE
// =============================================================================
const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Config globale légère (sans bloquer le render)
window.__APP_CONFIG__ = {
  version: appVersion,
  environment: import.meta.env.DEV ? "development" : "production",
  apiUrl: import.meta.env.VITE_API_URL || "",
  language: "fr",
  theme: "light",
  features: {
    analytics: import.meta.env.PROD,
    devTools: import.meta.env.DEV,
    pwa: "serviceWorker" in navigator,
    notifications: "Notification" in window,
    offline: "serviceWorker" in navigator,
    realtime: "WebSocket" in window,
  },
};

// =============================================================================
// RENDER REACT IMMÉDIATEMENT
// =============================================================================
const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// =============================================================================
// HOT MODULE REPLACEMENT (dev only)
// =============================================================================
if (import.meta.hot) {
  import.meta.hot.accept("./App.tsx", () => {
    console.log("🔥 Hot reload: App.tsx mis à jour");
  });
}

// Types globaux définis dans src/vite-env.d.ts
