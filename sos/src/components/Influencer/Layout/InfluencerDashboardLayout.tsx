/**
 * InfluencerDashboardLayout - Layout wrapper for influencer dashboard pages
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
  DollarSign,
  Users,
  Trophy,
  CreditCard,
  Image,
  FolderOpen,
  User,
  LogOut,
  Menu,
  X,
  Megaphone,
} from 'lucide-react';

interface InfluencerDashboardLayoutProps {
  children: React.ReactNode;
}

const InfluencerDashboardLayout: React.FC<InfluencerDashboardLayoutProps> = ({ children }) => {
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
      label: intl.formatMessage({ id: 'influencer.menu.dashboard', defaultMessage: 'Tableau de bord' }),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: `/influencer/tableau-de-bord`,
      routeKey: 'influencer-dashboard' as RouteKey,
    },
    {
      id: 'earnings',
      label: intl.formatMessage({ id: 'influencer.menu.earnings', defaultMessage: 'Mes gains' }),
      icon: <DollarSign className="w-5 h-5" />,
      path: `/influencer/gains`,
      routeKey: 'influencer-earnings' as RouteKey,
    },
    {
      id: 'referrals',
      label: intl.formatMessage({ id: 'influencer.menu.referrals', defaultMessage: 'Mes filleuls' }),
      icon: <Users className="w-5 h-5" />,
      path: `/influencer/filleuls`,
      routeKey: 'influencer-referrals' as RouteKey,
    },
    {
      id: 'leaderboard',
      label: intl.formatMessage({ id: 'influencer.menu.leaderboard', defaultMessage: 'Classement' }),
      icon: <Trophy className="w-5 h-5" />,
      path: `/influencer/classement`,
      routeKey: 'influencer-leaderboard' as RouteKey,
    },
    {
      id: 'payments',
      label: intl.formatMessage({ id: 'influencer.menu.payments', defaultMessage: 'Paiements' }),
      icon: <CreditCard className="w-5 h-5" />,
      path: `/influencer/paiements`,
      routeKey: 'influencer-payments' as RouteKey,
    },
    {
      id: 'resources',
      label: intl.formatMessage({ id: 'influencer.menu.resources', defaultMessage: 'Ressources' }),
      icon: <FolderOpen className="w-5 h-5" />,
      path: `/influencer/ressources`,
      routeKey: 'influencer-resources' as RouteKey,
    },
    {
      id: 'tools',
      label: intl.formatMessage({ id: 'influencer.menu.tools', defaultMessage: 'Outils promo' }),
      icon: <Image className="w-5 h-5" />,
      path: `/influencer/outils`,
      routeKey: 'influencer-promo-tools' as RouteKey,
    },
    {
      id: 'profile',
      label: intl.formatMessage({ id: 'influencer.menu.profile', defaultMessage: 'Mon profil' }),
      icon: <User className="w-5 h-5" />,
      path: `/influencer/profil`,
      routeKey: 'influencer-profile' as RouteKey,
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({ id: 'influencer.sidebar.title', defaultMessage: 'Espace Influenceur' })}
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
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 shadow-lg">
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
                              ? 'bg-red-50 text-red-700 dark:bg-white/5 dark:text-red-400'
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
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4 sticky top-8">
                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    <FormattedMessage id="influencer.sidebar.title" defaultMessage="Espace Influenceur" />
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
                            ? 'bg-red-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      <FormattedMessage id="influencer.sidebar.back" defaultMessage="Retour au site" />
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

export default InfluencerDashboardLayout;
