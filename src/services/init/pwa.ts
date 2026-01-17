/**
 * =============================================================================
 * SERVICE D'INITIALISATION - PWA
 * =============================================================================
 *
 * PERFORMANCE: Le Service Worker est enregistré de manière différée
 * pour ne pas bloquer le chargement initial.
 */

/**
 * Enregistre le Service Worker (production uniquement)
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("📱 Service Worker enregistré:", registration.scope);

        // Notification pour mise à jour disponible
        registration.addEventListener("updatefound", () => {
          console.log("🔄 Nouvelle version disponible");
          window.dispatchEvent(new CustomEvent("app:update-available"));
        });
      })
      .catch((error) => {
        console.error("❌ Erreur Service Worker:", error);
      });
  });
}

/**
 * Gère le prompt d'installation PWA
 */
export function initInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📲 Installation PWA disponible");
    // Stocker l'événement pour installation ultérieure
    (window as { deferredPrompt?: Event }).deferredPrompt = e;
    window.dispatchEvent(new CustomEvent("app:install-available"));
  });
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
  initInstallPrompt();
}
