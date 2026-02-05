/**
 * App Layout Component
 * Wraps protected pages with Sidebar and Header
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Download, X, Share, Plus } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useInstallPWA } from '../../hooks';
import { Button } from '../ui';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { canInstall, isIOS, isInstalled, install } = useInstallPWA();

  const showMobileInstall = !isInstalled && (canInstall || isIOS);

  const handleMobileInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await install();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-w-0">
        {/* Mobile top bar + Header */}
        <div className="sticky top-0 z-30 safe-top bg-white">
          <div className="flex items-center justify-between lg:hidden px-4 pt-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg -ml-2"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile install button */}
            {showMobileInstall && (
              <button
                onClick={handleMobileInstall}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Installer
              </button>
            )}
          </div>
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Installer SOS Multi
                </h3>
                <button
                  onClick={() => setShowIOSModal(false)}
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
                onClick={() => setShowIOSModal(false)}
              >
                J'ai compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
