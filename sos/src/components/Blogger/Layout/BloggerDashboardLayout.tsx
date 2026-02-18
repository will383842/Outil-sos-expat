/**
 * BloggerDashboardLayout - Layout wrapper for blogger dashboard pages
 *
 * Includes sidebar navigation with:
 * - Dashboard, Earnings, Referrals, Leaderboard, Payments
 * - Resources (EXCLUSIVE)
 * - Integration Guide (EXCLUSIVE)
 * - Profile
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Trophy,
  CreditCard,
  FolderOpen,
  BookOpen,
  Code,
  User,
  LogOut,
  Menu,
  X,
  PenTool,
  Gift,
} from 'lucide-react';

interface BloggerDashboardLayoutProps {
  children: React.ReactNode;
}

const BloggerDashboardLayout: React.FC<BloggerDashboardLayoutProps> = ({ children }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: intl.formatMessage({ id: 'blogger.menu.dashboard', defaultMessage: 'Tableau de bord' }),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/blogger/tableau-de-bord',
      exclusive: false,
    },
    {
      id: 'earnings',
      label: intl.formatMessage({ id: 'blogger.menu.earnings', defaultMessage: 'Mes gains' }),
      icon: <DollarSign className="w-5 h-5" />,
      path: '/blogger/gains',
      exclusive: false,
    },
    {
      id: 'referrals',
      label: intl.formatMessage({ id: 'blogger.menu.referrals', defaultMessage: 'Mes filleuls' }),
      icon: <Users className="w-5 h-5" />,
      path: '/blogger/filleuls',
      exclusive: false,
    },
    {
      id: 'blogger-recruitment',
      label: intl.formatMessage({ id: 'blogger.menu.bloggerRecruitment', defaultMessage: 'Parrainage blogueurs' }),
      icon: <Gift className="w-5 h-5" />,
      path: '/blogger/parrainage-blogueurs',
      exclusive: false,
    },
    {
      id: 'leaderboard',
      label: intl.formatMessage({ id: 'blogger.menu.leaderboard', defaultMessage: 'Classement' }),
      icon: <Trophy className="w-5 h-5" />,
      path: '/blogger/classement',
      exclusive: false,
    },
    {
      id: 'payments',
      label: intl.formatMessage({ id: 'blogger.menu.payments', defaultMessage: 'Paiements' }),
      icon: <CreditCard className="w-5 h-5" />,
      path: '/blogger/paiements',
      exclusive: false,
    },
    {
      id: 'resources',
      label: intl.formatMessage({ id: 'blogger.menu.resources', defaultMessage: 'Ressources' }),
      icon: <FolderOpen className="w-5 h-5" />,
      path: '/blogger/ressources',
      exclusive: false,
    },
    {
      id: 'guide',
      label: intl.formatMessage({ id: 'blogger.menu.guide', defaultMessage: 'Guide' }),
      icon: <BookOpen className="w-5 h-5" />,
      path: '/blogger/guide',
      exclusive: false,
    },
    {
      id: 'widgets',
      label: intl.formatMessage({ id: 'blogger.menu.widgets', defaultMessage: 'Widgets' }),
      icon: <Code className="w-5 h-5" />,
      path: '/blogger/widgets',
      exclusive: false,
    },
    {
      id: 'profile',
      label: intl.formatMessage({ id: 'blogger.menu.profile', defaultMessage: 'Mon profil' }),
      icon: <User className="w-5 h-5" />,
      path: '/blogger/profil',
      exclusive: false,
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
                <div className="bg-gradient-to-r from-purple-600 to-violet-700 p-4">
                  <div className="flex items-center gap-3">
                    {user?.profilePhoto?.startsWith('http') ? (
                      <img
                        src={user.profilePhoto}
                        alt={user.firstName || user.displayName || ''}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.firstName || user?.displayName?.split(' ')[0] || user?.email || ''}
                      </p>
                      <p className="text-xs text-white/70">
                        <FormattedMessage id="blogger.sidebar.title" defaultMessage="Espace Blogueur" />
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const active = isActive(item.path);

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          active
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {item.exclusive && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            <FormattedMessage id="blogger.menu.exclusive" defaultMessage="Exclusif" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Commission Info */}
                <div className="mt-6 pt-4 border-t dark:border-gray-700">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs dark:text-gray-600 mb-2">
                      <FormattedMessage id="blogger.sidebar.commissions" defaultMessage="Commissions fixes" />
                    </p>
                    <div className="flex justify-around">
                      <div>
                        <span className="text-lg dark:text-purple-400 font-bold">$10</span>
                        <p className="text-xs dark:text-gray-700">
                          <FormattedMessage id="blogger.sidebar.perClient" defaultMessage="/appel" />
                        </p>
                      </div>
                      <div>
                        <span className="text-lg dark:text-purple-400 font-bold">$5</span>
                        <p className="text-xs dark:text-gray-700">
                          <FormattedMessage id="blogger.sidebar.perRecruit" defaultMessage="/partenaire" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      <FormattedMessage id="blogger.sidebar.back" defaultMessage="Retour au site" />
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

export default BloggerDashboardLayout;
