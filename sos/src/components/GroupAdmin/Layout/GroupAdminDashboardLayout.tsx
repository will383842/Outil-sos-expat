/**
 * GroupAdminDashboardLayout - Layout wrapper for group admin dashboard pages
 * Follows InfluencerDashboardLayout pattern with indigo accent
 */

import React from 'react';
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
  const { user } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

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

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border dark:border-white/10 rounded-2xl shadow-lg overflow-hidden sticky top-8">
                {/* Header avec photo utilisateur */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 p-4">
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
                        <FormattedMessage id="groupAdmin.sidebar.title" defaultMessage="Espace Group Admin" />
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

export default GroupAdminDashboardLayout;
