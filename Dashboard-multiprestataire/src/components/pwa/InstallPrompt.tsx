/**
 * PWA Install Prompt Component
 * Shows install banner and iOS instructions
 */
import { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { useInstallPWA } from '../../hooks/useInstallPWA';
import { Button } from '../ui';

export default function InstallPrompt() {
  const { canInstall, isIOS, isInstalled, install } = useInstallPWA();
  const [dismissed, setDismissed] = useState(() => {
    // Check if user dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - dismissedTime < sevenDays;
    }
    return false;
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // Don't show if can't install (not on supported browser)
  if (!canInstall && !isIOS) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));
    setDismissed(true);
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setDismissed(true);
    }
  };

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Installer SOS Multi
              </h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Pour installer l'application sur votre iPhone ou iPad :
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Appuyez sur le bouton Partager
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-gray-500">
                    <Share className="w-5 h-5" />
                    <span className="text-sm">en bas de l'écran</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Sélectionnez "Sur l'écran d'accueil"
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-gray-500">
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">dans le menu</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Appuyez sur "Ajouter"
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    L'app sera ajoutée à votre écran d'accueil
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 p-4">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setShowIOSInstructions(false)}
            >
              J'ai compris
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Install Banner
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border sm:border-gray-200">
      <div className="flex items-start gap-4">
        {/* App Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">Installer SOS Multi</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Accès rapide depuis votre écran d'accueil
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            {isIOS ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowIOSInstructions(true)}
              >
                Comment faire ?
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleInstall}
              >
                Installer
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Plus tard
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 -mt-1 -mr-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
