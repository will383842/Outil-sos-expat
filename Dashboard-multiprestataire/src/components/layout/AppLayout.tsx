/**
 * App Layout Component
 * Wraps protected pages with Sidebar and Header
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Download, X, Share, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useInstallPWA } from '../../hooks';
import { Button } from '../ui';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { canInstall, isIOS, isInstalled, install } = useInstallPWA();
  const { t } = useTranslation();

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
              className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg -ml-2"
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
                {t('pwa.install')}
              </button>
            )}
          </div>
          <Header />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('pwa.install_title')}
                </h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                {t('pwa.ios_instructions')}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {t('pwa.ios_step1_title')}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-gray-500">
                      <Share className="w-5 h-5" />
                      <span className="text-sm">{t('pwa.ios_step1_hint')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {t('pwa.ios_step2_title')}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-gray-500">
                      <Plus className="w-5 h-5" />
                      <span className="text-sm">{t('pwa.ios_step2_hint')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {t('pwa.ios_step3_title')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('pwa.ios_step3_hint')}
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
                {t('pwa.understood')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
