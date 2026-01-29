/**
 * BloggerDashboardLayout - Layout wrapper for blogger dashboard pages
 *
 * Includes sidebar navigation with:
 * - Dashboard, Earnings, Referrals, Leaderboard, Payments
 * - Resources (EXCLUSIVE)
 * - Integration Guide (EXCLUSIVE)
 * - Profile
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import Layout from '@/components/layout/Layout';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Trophy,
  CreditCard,
  FolderOpen,
  BookOpen,
  Wrench,
  User,
  LogOut,
} from 'lucide-react';

interface BloggerDashboardLayoutProps {
  children: React.ReactNode;
}

const BloggerDashboardLayout: React.FC<BloggerDashboardLayoutProps> = ({ children }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'dashboard',
      label: intl.formatMessage({ id: 'blogger.menu.dashboard', defaultMessage: 'Tableau de bord' }),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/blogger/tableau-de-bord',
    },
    {
      id: 'earnings',
      label: intl.formatMessage({ id: 'blogger.menu.earnings', defaultMessage: 'Mes gains' }),
      icon: <DollarSign className="w-5 h-5" />,
      path: '/blogger/gains',
    },
    {
      id: 'referrals',
      label: intl.formatMessage({ id: 'blogger.menu.referrals', defaultMessage: 'Mes filleuls' }),
      icon: <Users className="w-5 h-5" />,
      path: '/blogger/filleuls',
    },
    {
      id: 'leaderboard',
      label: intl.formatMessage({ id: 'blogger.menu.leaderboard', defaultMessage: 'Classement' }),
      icon: <Trophy className="w-5 h-5" />,
      path: '/blogger/classement',
    },
    {
      id: 'payments',
      label: intl.formatMessage({ id: 'blogger.menu.payments', defaultMessage: 'Paiements' }),
      icon: <CreditCard className="w-5 h-5" />,
      path: '/blogger/paiements',
    },
    {
      id: 'resources',
      label: intl.formatMessage({ id: 'blogger.menu.resources', defaultMessage: 'Ressources' }),
      icon: <FolderOpen className="w-5 h-5" />,
      path: '/blogger/ressources',
      exclusive: true,
    },
    {
      id: 'guide',
      label: intl.formatMessage({ id: 'blogger.menu.guide', defaultMessage: "Guide d'intégration" }),
      icon: <BookOpen className="w-5 h-5" />,
      path: '/blogger/guide',
      exclusive: true,
    },
    {
      id: 'tools',
      label: intl.formatMessage({ id: 'blogger.menu.tools', defaultMessage: 'Outils promo' }),
      icon: <Wrench className="w-5 h-5" />,
      path: '/blogger/outils',
    },
    {
      id: 'profile',
      label: intl.formatMessage({ id: 'blogger.menu.profile', defaultMessage: 'Mon profil' }),
      icon: <User className="w-5 h-5" />,
      path: '/blogger/profil',
    },
  ];

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4 sticky top-24">
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
                          <FormattedMessage id="blogger.sidebar.perClient" defaultMessage="/client" />
                        </p>
                      </div>
                      <div>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">$5</span>
                        <p className="text-xs text-gray-500">
                          <FormattedMessage id="blogger.sidebar.perRecruit" defaultMessage="/recrutement" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => navigate('/dashboard')}
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
              {children}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BloggerDashboardLayout;
