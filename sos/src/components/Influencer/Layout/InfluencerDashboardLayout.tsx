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
  const { logout, user } = useAuth();
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
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border dark:border-white/10 rounded-2xl shadow-lg overflow-hidden sticky top-8">
                {/* Header avec photo utilisateur */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const photo = [user?.profilePhoto, user?.photoURL, user?.avatar].find(
                        (u) => u && u.startsWith('http')
                      );
                      return photo ? (
                        <img
                          src={photo}
                          alt={user?.firstName || user?.displayName || ''}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50"
                          loading="eager"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.firstName || user?.displayName?.split(' ')[0] || user?.email || ''}
                      </p>
                      <p className="text-xs text-white/70">
                        <FormattedMessage id="influencer.sidebar.title" defaultMessage="Espace Influenceur" />
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
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

                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      <FormattedMessage id="influencer.sidebar.back" defaultMessage="Retour au site" />
                    </span>
                  </button>
                </div>
                </div>{/* end p-4 */}
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
