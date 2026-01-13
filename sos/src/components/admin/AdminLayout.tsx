// =============================================================================
// AdminLayout.tsx - VERSION PRODUCTION (sans debug)
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link, useNavigate, useOutlet, useLocation } from 'react-router-dom';
import {
  Shield,
  LogOut,
  Menu,
  X,
  Home,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  ChevronDown,
} from 'lucide-react';

import { adminMenuTree } from '../../config/adminMenu';
import SidebarItem from './sidebar/SidebarItem';

import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useIntl } from 'react-intl';
import Button from '../common/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import { logError } from '../../utils/logging';

// =============================================================================
// TYPES
// =============================================================================

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isApproved?: boolean;
}

interface AdminLayoutProps {
  children?: ReactNode;
}

// =============================================================================
// CONFIGURATION LANGUES
// =============================================================================

type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

const ADMIN_LANGUAGES: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ch', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

// =============================================================================
// COMPOSANT LANGUAGE SELECTOR
// =============================================================================

const AdminLanguageSelector: React.FC = () => {
  const { language, setLanguage } = useApp();
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const currentLang = ADMIN_LANGUAGES.find(l => l.code === language) || ADMIN_LANGUAGES[0];

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback((langCode: SupportedLanguage) => {
    setLanguage(langCode);
    setIsOpen(false);
    localStorage.setItem('admin-language', langCode);
  }, [setLanguage]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={intl.formatMessage({ id: 'admin.language.select', defaultMessage: 'Changer de langue' })}
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-lg">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.nativeName}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          role="listbox"
          aria-label={intl.formatMessage({ id: 'admin.language.list', defaultMessage: 'Langues disponibles' })}
        >
          {ADMIN_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                language === lang.code ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700'
              }`}
              role="option"
              aria-selected={language === lang.code}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  // =========================================================================
  // HOOKS
  // =========================================================================
  const navigate = useNavigate();
  const _location = useLocation();
  const outlet = useOutlet();
  
  const authContext = useAuth();
  const { user, logout, isLoading, authInitialized } = authContext as {
    user: AdminUser | null;
    logout: () => Promise<void>;
    isLoading: boolean;
    authInitialized: boolean;
  };
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  // =========================================================================
  // LOCAL STATE
  // =========================================================================
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUpdatingProfiles, setIsUpdatingProfiles] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin-sidebar-open');
      if (saved !== null) {
        setIsSidebarOpen(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse admin-sidebar-open from localStorage:', e);
      // Keep default state
    }
  }, []);

  // =========================================================================
  // CALLBACKS
  // =========================================================================

  const handleLogout = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logError({
        origin: 'frontend',
        error: `Erreur de déconnexion admin: ${errorMessage}`,
        context: { component: 'AdminLayout', userId: user?.id },
      });
      // Navigate même en cas d'erreur
      navigate('/admin/login');
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate, user?.id, loggingOut]);

  const handleUpdateProfiles = useCallback(async () => {
    const ok = window.confirm(t('admin.layout.confirmUpdateProfiles'));
    if (!ok) return;

    setIsUpdatingProfiles(true);
    setUpdateSuccess(null);
    try {
      if (user?.role !== 'admin') throw new Error('Permissions insuffisantes');
      const { updateExistingProfiles } = await import('../../utils/firestore');
      if (typeof updateExistingProfiles !== 'function') {
        throw new Error('Fonction de mise à jour non disponible');
      }
      const success = await updateExistingProfiles();
      setUpdateSuccess(success);
      setTimeout(() => setUpdateSuccess(null), 5000);
    } catch (_error) {
      setUpdateSuccess(false);
      setTimeout(() => setUpdateSuccess(null), 5000);
    } finally {
      setIsUpdatingProfiles(false);
    }
  }, [user?.id, user?.role]);

  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('admin-sidebar-open', JSON.stringify(newState));
  }, [isSidebarOpen]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((s) => !s);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================

  const userInitials = useMemo(() => {
    const first = (user?.firstName || '').charAt(0);
    const last = (user?.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  // =========================================================================
  // GUARDS
  // =========================================================================

  // Guard 1: Loading state
  if (isLoading || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("admin.layout.loading")}</p>
        </div>
      </div>
    );
  }

  // Guard 2: Not admin - vérifie le rôle admin
  // On vérifie user.role === 'admin' au lieu de comparer les emails
  // car user.email peut être undefined si le champ n'existe pas dans Firestore
  const isAdmin = user?.role === 'admin';
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("admin.layout.accessDenied")}</h1>
          <p className="text-gray-600 mb-4">{t("admin.layout.accessDeniedMessage")}</p>
          <p className="text-sm text-gray-500 mb-4">
            {t('admin.layout.email')}: {user?.email || t('admin.layout.notDefined')} | {t('admin.layout.role')}: {user?.role || t('admin.layout.none')}
          </p>
          <Button onClick={() => navigate('/')}>Retour à l&apos;accueil</Button>
        </div>
      </div>
    );
  }

  // Guard 3: Account status - utilise approvalStatus (pas status qui n'existe pas)
  // Note: Les admins ont isApproved=true donc ce guard ne les bloque pas
  const approvalStatus = user?.approvalStatus;
  const isAccountBlocked = approvalStatus === 'rejected' || (approvalStatus === 'pending' && !user?.isApproved);
  if (isAccountBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {approvalStatus === 'rejected' ? t('admin.layout.accountSuspended') : t('admin.layout.accountPending')}
          </h1>
          <p className="text-gray-600 mb-4">
            {approvalStatus === 'rejected'
              ? 'Votre compte a été suspendu. Contactez le support.'
              : 'Votre compte est en cours de validation.'}
          </p>
          <Button onClick={handleLogout} variant="secondary" disabled={loggingOut} loading={loggingOut}>
            {loggingOut ? t('admin.layout.loggingOut') : t('admin.layout.logout')}
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER PRINCIPAL
  // =========================================================================

  return (
    <ErrorBoundary
      onError={(error: Error, errorInfo: ErrorInfo) => {
        logError({
          origin: 'frontend',
          error: `AdminLayout error: ${error.message}`,
          context: { component: 'AdminLayout', componentStack: errorInfo.componentStack, userId: user?.id },
        });
      }}
    >
      <div className="h-screen flex overflow-hidden bg-gray-100">

        {/* MOBILE SIDEBAR */}
        {isMobile && isMobileSidebarOpen && (
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
              <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <span className="ml-2 text-xl font-bold text-white">Admin SOS</span>
                </div>
                <button
                  onClick={closeMobileSidebar}
                  className="text-gray-400 hover:text-white p-2 -m-2 rounded-md"
                  aria-label={t('admin.layout.closeMenu')}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <nav className="px-2 py-4 space-y-1">
                  {adminMenuTree.map((node) => (
                    <SidebarItem key={node.id} node={node} />
                  ))}

                  <div className="px-2 pt-3">
                    <Button
                      onClick={handleUpdateProfiles}
                      loading={isUpdatingProfiles}
                      disabled={isUpdatingProfiles}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <RefreshCw size={16} className={`mr-2 ${isUpdatingProfiles ? 'animate-spin' : ''}`} />
                      {t('admin.layout.updateProfiles')}
                    </Button>

                    {updateSuccess !== null && (
                      <div
                        className={`mt-2 text-xs p-2 rounded ${
                          updateSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                        role="alert"
                      >
                        {updateSuccess ? t('admin.layout.profilesUpdated') : t('admin.layout.profilesUpdateError')}
                      </div>
                    )}
                  </div>
                </nav>
              </div>

              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    loggingOut
                      ? 'text-gray-500 cursor-not-allowed opacity-70'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {loggingOut ? (
                    <>
                      <div className="h-5 w-5 mr-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      <span>{t('admin.layout.loggingOut')}</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-5 w-5 mr-3" />
                      <span>{t('admin.layout.logout')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div className={`flex flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-20'}`}>
            <div className="flex flex-col w-full relative">
              <button
                onClick={toggleSidebar}
                className={`absolute top-4 z-10 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-all duration-300 ${
                  isSidebarOpen ? 'right-4' : 'right-2'
                }`}
                aria-label={isSidebarOpen ? t('admin.layout.collapseSidebar') : t('admin.layout.expandSidebar')}
              >
                {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              <div className="flex flex-col h-0 flex-1 bg-gray-900">
                <div className="flex items-center h-16 px-4 bg-gray-800">
                  <div className="flex items-center min-w-0">
                    <Shield className="h-8 w-8 text-red-600 flex-shrink-0" />
                    {isSidebarOpen && (
                      <span className="ml-2 text-xl font-bold text-white truncate">Admin SOS Expats</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <nav className="px-2 py-4 space-y-1">
                    {adminMenuTree.map((node) => (
                      <SidebarItem key={node.id} node={node} isSidebarCollapsed={!isSidebarOpen} />
                    ))}

                    {isSidebarOpen && (
                      <div className="px-2 pt-3">
                        <Button
                          onClick={handleUpdateProfiles}
                          loading={isUpdatingProfiles}
                          disabled={isUpdatingProfiles}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        >
                          <RefreshCw size={14} className={`mr-2 ${isUpdatingProfiles ? 'animate-spin' : ''}`} />
                          {t('admin.layout.updateProfiles')}
                        </Button>

                        {updateSuccess !== null && (
                          <div
                            className={`mt-2 text-xs p-2 rounded ${
                              updateSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                            role="alert"
                          >
                            {updateSuccess ? t('admin.layout.profilesUpdated') : t('admin.layout.profilesUpdateError')}
                          </div>
                        )}
                      </div>
                    )}
                  </nav>
                </div>

                <div className="p-4 border-t border-gray-700">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      loggingOut
                        ? 'text-gray-500 cursor-not-allowed opacity-70'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } ${!isSidebarOpen ? 'justify-center' : ''}`}
                  >
                    {loggingOut ? (
                      <>
                        <div className="h-5 w-5 flex-shrink-0 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        {isSidebarOpen && <span className="ml-3">{t('admin.layout.loggingOut')}</span>}
                      </>
                    ) : (
                      <>
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        {isSidebarOpen && <span className="ml-3">{t('admin.layout.logout')}</span>}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <header className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            {isMobile && (
              <button
                onClick={toggleMobileSidebar}
                className="px-4 text-gray-500 hover:bg-gray-50"
                aria-label={t('admin.layout.openMenu')}
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            <div className="flex-1 px-4 flex justify-between items-center">
              <nav className="flex items-center text-sm">
                <Link to="/" className="text-gray-500 hover:text-gray-700 p-1 -m-1 rounded-md" aria-label={t('admin.layout.backHome')}>
                  <Home className="h-5 w-5" />
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-900 font-medium">{t('admin.layout.administration')}</span>
              </nav>
              <div className="flex items-center space-x-4">
                <AdminLanguageSelector />
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user.firstName} {user.lastName}
                </span>
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium text-sm">
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 relative overflow-y-auto focus:outline-none" role="main">
            {outlet ?? children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminLayout;