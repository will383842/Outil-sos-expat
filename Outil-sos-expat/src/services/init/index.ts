/**
 * =============================================================================
 * SERVICES D'INITIALISATION - EXPORT
 * =============================================================================
 *
 * PERFORMANCE: Ces services sont conçus pour être chargés de manière différée
 * via useEffect dans App.tsx, après le premier render React.
 */

export { initAllMonitoring, initPerformanceMonitoring, initKeyboardShortcuts, initOfflineHandling } from "./monitoring";
export { initTheme, detectTheme, applyTheme, watchSystemTheme } from "./theme";
export type { ThemeMode } from "./theme";
export { initPWA, registerServiceWorker, requestNotificationPermission } from "./pwa";

/**
 * Initialise tous les services non-critiques (à appeler dans useEffect)
 * Retourne une fonction de cleanup
 */
export function initDeferredServices(): () => void {
  // Import dynamique pour éviter le bundling dans le chunk principal
  const { initAllMonitoring } = require("./monitoring");
  const { initTheme } = require("./theme");
  const { initPWA } = require("./pwa");

  initAllMonitoring();
  const cleanupTheme = initTheme();
  initPWA();

  return () => {
    cleanupTheme();
  };
}
