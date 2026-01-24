/**
 * =============================================================================
 * PWAInstallBanner - Bannière d'installation PWA multi-plateforme
 * =============================================================================
 *
 * Affiche une bannière pour installer l'application :
 * - Android/Chrome Desktop : Bouton qui déclenche le prompt natif
 * - iOS Safari : Affiche les instructions manuelles
 *
 * L'utilisateur reste connecté après installation grâce à la persistance
 * Firebase Auth via IndexedDB.
 */

import { useState } from "react";
import { X, Download, Smartphone, Share, PlusSquare, Check } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { useTranslation } from "react-i18next";

interface PWAInstallBannerProps {
  /** Variante d'affichage */
  variant?: "banner" | "compact" | "modal";
  /** Callback après installation réussie */
  onInstalled?: () => void;
  /** Callback après fermeture */
  onDismiss?: () => void;
  /** Forcer l'affichage (pour tests) */
  forceShow?: boolean;
}

export function PWAInstallBanner({
  variant = "banner",
  onInstalled,
  onDismiss,
  forceShow = false,
}: PWAInstallBannerProps) {
  const { t } = useTranslation();
  const {
    canPrompt,
    isIOS,
    isInstalled,
    shouldShowBanner,
    platform,
    install,
    dismissBanner,
  } = usePWAInstall();

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Ne pas afficher si déjà installé ou si le banner ne doit pas être affiché
  if (!forceShow && (!shouldShowBanner || isInstalled)) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (canPrompt) {
      setIsInstalling(true);
      const result = await install();
      setIsInstalling(false);

      if (result.success) {
        onInstalled?.();
      }
    }
  };

  const handleDismiss = () => {
    dismissBanner();
    onDismiss?.();
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  // Modal d'instructions iOS
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Installer SOS Dashboard
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sur votre iPhone/iPad
                </p>
              </div>
            </div>
            <button
              onClick={closeIOSInstructions}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Instructions */}
          <ol className="space-y-4 mb-6">
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Share className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  1. Appuyez sur le bouton Partager
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  En bas de l'écran Safari (icône carrée avec flèche)
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <PlusSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  2. Sélectionnez "Sur l'écran d'accueil"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Faites défiler si nécessaire pour trouver l'option
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  3. Appuyez sur "Ajouter"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  L'app sera ajoutée à votre écran d'accueil
                </p>
              </div>
            </li>
          </ol>

          {/* Note sur la connexion */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Bonne nouvelle !</strong> Vous resterez connecté après l'installation.
              Pas besoin de vous reconnecter.
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={closeIOSInstructions}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25"
          >
            Compris, merci !
          </button>
        </div>
      </div>
    );
  }

  // Variante compact (petit bouton)
  if (variant === "compact") {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {isInstalling ? "Installation..." : "Installer l'app"}
      </button>
    );
  }

  // Variante banner (par défaut)
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Gradient accent */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-700" />

          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <Smartphone className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Installer SOS Dashboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Accédez rapidement à vos stats et prestataires depuis votre écran d'accueil.
                  Vous resterez connecté !
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isInstalling
                      ? "Installation..."
                      : isIOS
                      ? "Comment installer"
                      : "Installer"}
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                  >
                    Plus tard
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton d'installation simple pour intégration dans un menu ou une page
 */
export function PWAInstallButton({
  className = "",
  showIfInstalled = false,
}: {
  className?: string;
  showIfInstalled?: boolean;
}) {
  const { canPrompt, isIOS, isInstalled, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Afficher l'état "installé" si demandé
  if (isInstalled && showIfInstalled) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <Check className="w-5 h-5" />
        <span>Application installée</span>
      </div>
    );
  }

  // Ne rien afficher si déjà installé et showIfInstalled est false
  if (isInstalled) {
    return null;
  }

  // Ne rien afficher si on ne peut pas installer (sauf iOS)
  if (!canPrompt && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setIsInstalling(true);
    await install();
    setIsInstalling(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isInstalling}
        className={`flex items-center gap-2 ${className}`}
      >
        <Download className="w-5 h-5" />
        <span>{isInstalling ? "Installation..." : "Installer l'application"}</span>
      </button>

      {/* Modal iOS si nécessaire */}
      {showIOSModal && (
        <PWAInstallBanner
          variant="modal"
          forceShow={true}
          onDismiss={() => setShowIOSModal(false)}
        />
      )}
    </>
  );
}

export default PWAInstallBanner;
