/**
 * =============================================================================
 * SERVICE D'INITIALISATION - MONITORING
 * =============================================================================
 *
 * PERFORMANCE: Ce module est chargé de manière différée APRÈS le render React
 * pour ne pas bloquer le Time to Interactive.
 */

// Variable pour éviter double initialisation
let monitoringInitialized = false;

/**
 * Initialise le monitoring de performance (non-bloquant)
 */
export function initPerformanceMonitoring(): void {
  if (monitoringInitialized) return;
  monitoringInitialized = true;

  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // Memory usage pour débogage (dev uniquement)
  if (isDevelopment && "memory" in performance) {
    const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    if (memory) {
      console.log("💾 Mémoire utilisée:", Math.round(memory.usedJSHeapSize / 1024 / 1024), "MB");
    }
  }

  // Network status
  if ("connection" in navigator) {
    const connection = (navigator as { connection?: { effectiveType: string; downlink: number } }).connection;
    if (connection) {
      console.log("📶 Connexion:", connection.effectiveType, "- Débit:", connection.downlink, "Mbps");
    }
  }

  // Web Vitals logging en production
  if (isProduction) {
    window.addEventListener("load", () => {
      const loadTime = performance.now();
      console.log("⚡ Temps de chargement:", Math.round(loadTime), "ms");
    });
  }
}

/**
 * Initialise les raccourcis clavier
 */
export function initKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // Ctrl+K ou Cmd+K : Recherche rapide
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      // Dispatch custom event pour que React puisse l'écouter
      window.dispatchEvent(new CustomEvent("app:search"));
    }

    // Ctrl+/ ou Cmd+/ : Raccourcis aide
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("app:help"));
    }
  });
}

/**
 * Initialise la gestion du mode offline
 */
export function initOfflineHandling(): void {
  window.addEventListener("online", () => {
    console.log("🌐 Connexion rétablie");
    window.dispatchEvent(new CustomEvent("app:online"));
  });

  window.addEventListener("offline", () => {
    console.log("📵 Mode hors ligne");
    window.dispatchEvent(new CustomEvent("app:offline"));
  });
}

/**
 * Initialise tous les services de monitoring (à appeler dans useEffect)
 */
export function initAllMonitoring(): void {
  initPerformanceMonitoring();
  initKeyboardShortcuts();
  initOfflineHandling();
}
