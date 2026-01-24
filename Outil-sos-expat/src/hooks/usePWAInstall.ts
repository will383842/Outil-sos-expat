/**
 * =============================================================================
 * usePWAInstall - Hook pour gérer l'installation de la PWA
 * =============================================================================
 *
 * Gère l'installation PWA sur tous les appareils :
 * - Android/Chrome : Prompt natif via beforeinstallprompt
 * - iOS Safari : Instructions manuelles (pas de prompt natif)
 * - Desktop : Prompt natif
 *
 * L'authentification Firebase est persistée via IndexedDB, donc l'utilisateur
 * reste connecté après installation de la PWA.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Type pour l'événement beforeinstallprompt (non standard, donc pas dans lib.dom.d.ts)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Clé localStorage pour mémoriser la fermeture du banner
const LS_BANNER_CLOSED_KEY = "pwa_install_banner_closed_at";
const LS_INSTALL_PROMPTED_KEY = "pwa_install_prompted";

// Durée avant de réafficher le banner après fermeture (en jours)
const CLOSE_COOLDOWN_DAYS = 7;

/**
 * Vérifie si l'app est déjà installée (mode standalone)
 */
const isStandalone = (): boolean => {
  // Check display-mode media query
  if (window.matchMedia?.("(display-mode: standalone)").matches) {
    return true;
  }
  // Check iOS Safari standalone mode
  if ((navigator as any)?.standalone === true) {
    return true;
  }
  // Check si lancé depuis TWA (Trusted Web Activity) sur Android
  if (document.referrer.includes("android-app://")) {
    return true;
  }
  return false;
};

/**
 * Détecte le type d'appareil/navigateur
 */
const detectPlatform = (): "ios" | "android" | "desktop" => {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
};

/**
 * Vérifie si on est sur Safari iOS (le seul navigateur iOS qui ne supporte pas beforeinstallprompt)
 */
const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);

  return isIOS && isWebkit && !isChrome && !isFirefox;
};

/**
 * Calcule le nombre de jours depuis un timestamp
 */
const daysSince = (timestamp: number): number => {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
};

export interface UsePWAInstallReturn {
  /** L'app peut être installée via prompt natif (Android/Desktop Chrome) */
  canPrompt: boolean;
  /** L'app est sur iOS et nécessite des instructions manuelles */
  isIOS: boolean;
  /** L'app est déjà installée en mode standalone */
  isInstalled: boolean;
  /** Le banner devrait être affiché (pas récemment fermé, pas installé) */
  shouldShowBanner: boolean;
  /** Type de plateforme détectée */
  platform: "ios" | "android" | "desktop";
  /** Déclenche le prompt d'installation (Android/Desktop) */
  install: () => Promise<{ success: boolean; outcome?: string }>;
  /** Ferme le banner temporairement */
  dismissBanner: () => void;
  /** Force l'affichage du banner (pour les tests) */
  forceShowBanner: () => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  // État pour l'événement beforeinstallprompt capturé
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // L'app est-elle installée ?
  const [isInstalled, setIsInstalled] = useState<boolean>(isStandalone);

  // Plateforme détectée
  const platform = useMemo(() => detectPlatform(), []);

  // Est-ce iOS ?
  const isIOS = platform === "ios";

  // Timestamp de la dernière fermeture du banner
  const closedAtRef = useRef<number | null>(null);

  // Force show pour debug
  const [forceShow, setForceShow] = useState(false);

  // Charger le timestamp de fermeture depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_BANNER_CLOSED_KEY);
      closedAtRef.current = raw ? Number(raw) : null;
    } catch {
      // localStorage non disponible
    }
  }, []);

  // Écouter l'événement beforeinstallprompt (Android/Chrome Desktop)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher le prompt automatique du navigateur
      e.preventDefault();
      // Sauvegarder l'événement pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Marquer comme installé dans localStorage
      try {
        localStorage.setItem(LS_INSTALL_PROMPTED_KEY, "installed");
      } catch {
        // Ignore
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Surveiller les changements de mode d'affichage (ex: installation)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Peut-on utiliser le prompt natif ?
  const canPrompt = !!deferredPrompt && !isInstalled;

  // Le banner a-t-il été fermé récemment ?
  const recentlyClosed =
    closedAtRef.current !== null &&
    daysSince(closedAtRef.current) < CLOSE_COOLDOWN_DAYS;

  // Devrait-on afficher le banner ?
  const shouldShowBanner = useMemo(() => {
    if (forceShow) return true;
    if (isInstalled) return false;
    if (recentlyClosed) return false;
    // Sur iOS, toujours afficher (instructions manuelles)
    // Sur Android/Desktop, afficher seulement si on peut prompter
    return isIOS || canPrompt;
  }, [forceShow, isInstalled, recentlyClosed, isIOS, canPrompt]);

  // Fonction d'installation
  const install = useCallback(async (): Promise<{
    success: boolean;
    outcome?: string;
  }> => {
    if (!deferredPrompt) {
      return { success: false };
    }

    try {
      // Déclencher le prompt natif
      await deferredPrompt.prompt();

      // Attendre le choix de l'utilisateur
      const choiceResult = await deferredPrompt.userChoice;

      // Nettoyer l'événement (ne peut être utilisé qu'une fois)
      setDeferredPrompt(null);

      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        return { success: true, outcome: "accepted" };
      }

      return { success: false, outcome: "dismissed" };
    } catch (error) {
      console.error("[PWA Install] Erreur lors du prompt:", error);
      return { success: false };
    }
  }, [deferredPrompt]);

  // Fermer le banner temporairement
  const dismissBanner = useCallback(() => {
    const now = Date.now();
    closedAtRef.current = now;
    try {
      localStorage.setItem(LS_BANNER_CLOSED_KEY, String(now));
    } catch {
      // Ignore
    }
    setForceShow(false);
  }, []);

  // Forcer l'affichage (pour debug)
  const forceShowBanner = useCallback(() => {
    setForceShow(true);
  }, []);

  return {
    canPrompt,
    isIOS,
    isInstalled,
    shouldShowBanner,
    platform,
    install,
    dismissBanner,
    forceShowBanner,
  };
}

export default usePWAInstall;
