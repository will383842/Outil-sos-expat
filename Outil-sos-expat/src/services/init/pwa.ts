/**
 * =============================================================================
 * SERVICE D'INITIALISATION - PWA
 * =============================================================================
 *
 * Ce service gère l'enregistrement du Service Worker généré par vite-plugin-pwa.
 * Le SW est configuré dans vite.config.ts avec workbox pour le caching.
 *
 * IMPORTANT: L'authentification Firebase utilise indexedDBLocalPersistence
 * pour garantir que l'utilisateur reste connecté après installation de la PWA.
 */

// @ts-expect-error - Virtual module from vite-plugin-pwa, types in vite-env.d.ts
import { registerSW } from "virtual:pwa-register";

/**
 * Enregistre le Service Worker généré par vite-plugin-pwa
 * Gère automatiquement les mises à jour
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Service Worker non supporté");
    return;
  }

  // registerSW retourne une fonction pour forcer la mise à jour
  const updateSW = registerSW({
    // Callback appelé quand une mise à jour est disponible
    onNeedRefresh() {
      console.log("🔄 Nouvelle version disponible");
      window.dispatchEvent(new CustomEvent("app:update-available"));

      // Auto-update après un délai (ou afficher un toast pour demander à l'utilisateur)
      // Pour l'instant, on laisse l'utilisateur décider via un reload
    },

    // Callback appelé quand le SW est prêt pour le mode offline
    onOfflineReady() {
      console.log("📱 Application prête pour le mode hors-ligne");
      window.dispatchEvent(new CustomEvent("app:offline-ready"));
    },

    // En cas d'erreur d'enregistrement
    onRegisterError(error: Error) {
      console.error("❌ Erreur Service Worker:", error);
    },

    // Mise à jour immédiate sans demander à l'utilisateur
    // (bon pour les apps internes comme le dashboard)
    immediate: true,
  });

  // Exposer la fonction de mise à jour pour usage ultérieur
  (window as { updateSW?: () => void }).updateSW = () => {
    updateSW(true);
  };
}

/**
 * Demande les permissions de notification
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

/**
 * Initialise toutes les fonctionnalités PWA
 */
export function initPWA(): void {
  registerServiceWorker();
}
