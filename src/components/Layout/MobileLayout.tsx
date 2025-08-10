import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LogOut, 
  Settings, 
  Shield, 
  Menu, 
  X, 
  User, 
  Bell,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showAdminButton?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  onAdminClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  headerActions?: React.ReactNode;
  isLoading?: boolean;
}

export default function MobileLayout({ 
  children, 
  title = "Outils SOS Expat",
  subtitle,
  showAdminButton = false,
  showNotifications = true,
  showSettings = true,
  onAdminClick,
  onNotificationClick,
  onSettingsClick,
  headerActions,
  isLoading = false
}: MobileLayoutProps) {
  const { signOut, userProfile, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationCount, setNotificationCount] = useState(3); // Exemple
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Gestion du statut réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const StatusBar = () => (
    <div className="flex items-center justify-between px-4 py-1 bg-sos-red text-white text-xs">
      <div className="flex items-center space-x-2">
        <span className="font-medium">9:41</span>
        {!isOnline && (
          <div className="flex items-center space-x-1">
            <WifiOff size={12} />
            <span>Hors ligne</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-1">
        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        <Signal size={12} />
        <Battery size={12} />
      </div>
    </div>
  );

  const UserAvatar = () => (
    <div className="relative">
      <div className="w-10 h-10 bg-gradient-to-br from-sos-red to-sos-red-dark rounded-full flex items-center justify-center shadow-md">
        <span className="text-white font-bold text-sm">
          {getInitials(userProfile?.displayName)}
        </span>
      </div>
      {isOnline && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      )}
    </div>
  );

  const NotificationBadge = ({ count }: { count: number }) => (
    count > 0 && (
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-sos-red rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">
          {count > 9 ? '9+' : count}
        </span>
      </div>
    )
  );

  const QuickMenu = () => (
    <div className={`absolute top-full right-0 mt-2 w-64 bg-white rounded-sos shadow-xl border border-gray-100 z-50 transform transition-all duration-200 ${
      isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
    }`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <UserAvatar />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sos-text truncate">
              {userProfile?.displayName || 'Utilisateur'}
            </p>
            <p className="text-sm text-sos-text-light truncate">
              {userProfile?.email}
            </p>
            {isAdmin && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-sos-red text-white mt-1">
                <Shield size={10} className="mr-1" />
                Administrateur
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="py-2">
        {showSettings && (
          <button
            onClick={() => {
              onSettingsClick?.();
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <Settings size={18} className="text-gray-500" />
            <span className="text-sos-text">Paramètres</span>
          </button>
        )}

        {isAdmin && showAdminButton && (
          <button
            onClick={() => {
              onAdminClick?.();
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <Shield size={18} className="text-sos-red" />
            <span className="text-sos-text">Administration</span>
          </button>
        )}

        <div className="border-t border-gray-100 mt-2 pt-2">
          <button
            onClick={() => {
              handleSignOut();
              setIsMenuOpen(false);
            }}
            disabled={isSigningOut}
            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} className="text-red-600" />
            <span className="text-red-600">
              {isSigningOut ? 'Déconnexion...' : 'Se déconnecter'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // Fermer le menu en cliquant dehors
  useEffect(() => {
    const handleClickOutside = () => setIsMenuOpen(false);
    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-sos-bg">
      <StatusBar />
      
      {/* Header mobile avec animations */}
      <header className="bg-white shadow-sos sticky top-0 z-40 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo et titre avec animation */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-sos-red to-sos-red-dark rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold text-sos-text truncate">{title}</h1>
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-sos-red border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <p className="text-xs text-sos-text-light truncate">
                  {subtitle || userProfile?.displayName || 'Connecté'}
                </p>
              </div>
            </div>

            {/* Actions header */}
            <div className="flex items-center space-x-2">
              {headerActions}
              
              {/* Notifications */}
              {showNotifications && (
                <button
                  onClick={onNotificationClick}
                  className="relative p-2 rounded-sos bg-gray-50 text-sos-text hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                >
                  <Bell size={20} />
                  <NotificationBadge count={notificationCount} />
                </button>
              )}

              {/* Menu utilisateur */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-2 rounded-sos bg-gray-50 text-sos-text hover:bg-gray-100 transition-all duration-200 hover:scale-105"
                >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <QuickMenu />
              </div>
            </div>
          </div>
        </div>

        {/* Indicateur de statut réseau */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-center py-2 text-sm animate-pulse">
            <div className="flex items-center justify-center space-x-2">
              <WifiOff size={16} />
              <span>Mode hors ligne - Certaines fonctionnalités sont limitées</span>
            </div>
          </div>
        )}
      </header>

      {/* Main content avec gestion PWA */}
      <main className="pb-safe-area">
        <div className={`transition-all duration-300 ${isMenuOpen ? 'filter blur-sm' : ''}`}>
          {children}
        </div>
      </main>

      {/* Overlay pour fermer le menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

// Styles CSS à ajouter
const additionalStyles = `
/* Support PWA safe areas */
.pb-safe-area {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

/* Animation du menu */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Gestion du blur pour le menu */
.filter {
  transition: filter 0.3s ease-in-out;
}

/* Animation du loader */
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;