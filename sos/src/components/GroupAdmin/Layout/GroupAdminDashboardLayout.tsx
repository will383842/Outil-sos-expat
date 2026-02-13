/**
 * GroupAdminDashboardLayout - Layout wrapper for group admin dashboard pages
 * Follows InfluencerDashboardLayout pattern with indigo accent
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import {
  LayoutDashboard,
  Image,
  FileText,
  CreditCard,
  Users,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  Gift,
} from 'lucide-react';

interface GroupAdminDashboardLayoutProps {
  children: React.ReactNode;
}

const GroupAdminDashboardLayout: React.FC<GroupAdminDashboardLayoutProps> = ({ children }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const { logout } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: intl.formatMessage({ id: 'groupAdmin.menu.dashboard', defaultMessage: 'Tableau de bord' }),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: `/group-admin/tableau-de-bord`,
      routeKey: 'groupadmin-dashboard' as RouteKey,
    },
    {
      id: 'resources',
      label: intl.formatMessage({ id: 'groupAdmin.menu.resources', defaultMessage: 'Ressources' }),
      icon: <Image className="w-5 h-5" />,
      path: `/group-admin/ressources`,
      routeKey: 'groupadmin-resources' as RouteKey,
    },
    {
      id: 'posts',
      label: intl.formatMessage({ id: 'groupAdmin.menu.posts', defaultMessage: 'Posts' }),
      icon: <FileText className="w-5 h-5" />,
      path: `/group-admin/posts`,
      routeKey: 'groupadmin-posts' as RouteKey,
    },
    {
      id: 'payments',
      label: intl.formatMessage({ id: 'groupAdmin.menu.payments', defaultMessage: 'Paiements' }),
      icon: <CreditCard className="w-5 h-5" />,
      path: `/group-admin/paiements`,
      routeKey: 'groupadmin-payments' as RouteKey,
    },
    {
      id: 'referrals',
      label: intl.formatMessage({ id: 'groupAdmin.menu.referrals', defaultMessage: 'Filleuls' }),
      icon: <Users className="w-5 h-5" />,
      path: `/group-admin/filleuls`,
      routeKey: 'groupadmin-referrals' as RouteKey,
    },
    {
      id: 'groupAdminRecruitment',
      label: intl.formatMessage({ id: 'groupAdmin.menu.groupAdminRecruitment', defaultMessage: 'Parrainage Admins' }),
      icon: <Gift className="w-5 h-5" />,
      path: `/group-admin/parrainage-admins`,
      routeKey: 'groupadmin-admin-recruitment' as RouteKey,
    },
    {
      id: 'leaderboard',
      label: intl.formatMessage({ id: 'groupAdmin.menu.leaderboard', defaultMessage: 'Classement' }),
      icon: <Trophy className="w-5 h-5" />,
      path: `/group-admin/classement`,
      routeKey: 'groupadmin-leaderboard' as RouteKey,
    },
    {
      id: 'profile',
      label: intl.formatMessage({ id: 'groupAdmin.menu.profile', defaultMessage: 'Profil' }),
      icon: <User className="w-5 h-5" />,
      path: `/group-admin/profil`,
      routeKey: 'groupadmin-profile' as RouteKey,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({ id: 'groupAdmin.sidebar.title', defaultMessage: 'Espace Group Admin' })}
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b dark:border-white/10 shadow-lg">
              <nav className="p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => {
                    const translatedPath = `/${getTranslatedRouteSlug(item.routeKey, langCode)}`;
                    const active = isActive(item.path);

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            navigate(translatedPath);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                            active
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-white/5 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                        loggingOut
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <LogOut className="w-5 h-5" />
                      {loggingOut
                        ? intl.formatMessage({ id: 'dashboard.loggingOut', defaultMessage: 'Déconnexion...' })
                        : intl.formatMessage({ id: 'dashboard.logout', defaultMessage: 'Déconnexion' })
                      }
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border dark:border-white/10 rounded-2xl shadow-lg p-4 sticky top-8">
                <div className="mb-6 pb-4 border-b dark:border-gray-700">
                  <h2 className="text-lg dark:text-white font-bold">
                    <FormattedMessage id="groupAdmin.sidebar.title" defaultMessage="Espace Group Admin" />
                  </h2>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const translatedPath = `/${getTranslatedRouteSlug(item.routeKey, langCode)}`;
                    const active = isActive(item.path);

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(translatedPath)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          active
                            ? 'bg-indigo-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      <FormattedMessage id="groupAdmin.sidebar.back" defaultMessage="Retour au site" />
                    </span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GroupAdminDashboardLayout;
