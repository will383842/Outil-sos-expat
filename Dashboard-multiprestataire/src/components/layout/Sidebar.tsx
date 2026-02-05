/**
 * Sidebar Component
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Inbox, X, Download, Share, Plus } from 'lucide-react';
import { useInstallPWA, useBookingRequests } from '../../hooks';
import { Button } from '../ui';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/requests', icon: Inbox, label: 'Demandes', hasBadge: true },
  { to: '/team', icon: Users, label: 'Équipe' },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { canInstall, isIOS, isInstalled, install } = useInstallPWA();
  const { pendingCount } = useBookingRequests();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const showInstallOption = !isInstalled && (canInstall || isIOS);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await install();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 safe-top">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">SOS Multi</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  onClick={onClose}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.hasBadge && pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section - Install button */}
        {showInstallOption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <button
              onClick={handleInstall}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
            >
              <Download className="w-5 h-5" />
              Installer l'application
            </button>
          </div>
        )}
      </aside>

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
    </>
  );
}
