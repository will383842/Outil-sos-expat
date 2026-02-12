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
  User,
  LogOut,
  Menu,
  X,
  PenTool,
} from 'lucide-react';

interface BloggerDashboardLayoutProps {
  children: React.ReactNode;
}

const BloggerDashboardLayout: React.FC<BloggerDashboardLayoutProps> = ({ children }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { logout } = useAuth();
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
    <Layout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({ id: 'blogger.sidebar.title', defaultMessage: 'Espace Blogueur' })}
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
                    const active = isActive(item.path);

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            navigate(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                            active
                              ? 'bg-purple-50 text-purple-700 dark:bg-white/5 dark:text-purple-400'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          {item.icon}
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.exclusive && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              active
                                ? 'bg-purple-200/50 text-purple-700 dark:bg-white/10 dark:text-purple-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              <FormattedMessage id="blogger.menu.exclusive" defaultMessage="Exclusif" />
                            </span>
                          )}
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
                    <FormattedMessage id="blogger.sidebar.title" defaultMessage="Espace Blogueur" />
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <FormattedMessage id="blogger.sidebar.subtitle" defaultMessage="Programme Partenaire" />
                  </p>
                </div>

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
                        <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
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
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <FormattedMessage id="blogger.sidebar.commissions" defaultMessage="Commissions fixes" />
                    </p>
                    <div className="flex justify-around">
                      <div>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">$10</span>
                        <p className="text-xs text-gray-500">
                          <FormattedMessage id="blogger.sidebar.perClient" defaultMessage="/appel" />
                        </p>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">$5</span>
                        <p className="text-xs text-gray-500">
                          <FormattedMessage id="blogger.sidebar.perRecruit" defaultMessage="/partenaire" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      <FormattedMessage id="blogger.sidebar.back" defaultMessage="Retour au site" />
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

export default BloggerDashboardLayout;
