/**
 * PWA Install Cards - Direct install button in dashboards
 * Replaces popup banners with a clean in-dashboard button
 * Outil IA (ia.sos-expat.com) install is handled on that site via SSO
 */
import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function PWAInstallCards() {
  const { canPrompt, install, installed } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleInstall = async () => {
    if (canPrompt) {
      await install();
    } else if (isIOS()) {
      setShowIOSInstructions(true);
    }
  };

  // Don't show if already installed
  if (installed) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all text-sm font-medium"
      >
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="font-semibold">Installer SOS Expat</div>
          <div className="text-xs text-white/80">Accès rapide depuis votre écran</div>
        </div>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIOSInstructions(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Installer sur iPhone/iPad</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">1</span>
                <span>Appuyez sur le bouton <strong>Partager</strong> (icône ⬆️ en bas de Safari)</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</span>
                <span>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</span>
                <span>Appuyez sur <strong>Ajouter</strong></span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
