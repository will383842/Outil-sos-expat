/**
 * PartnerDashboardLayout - Sidebar layout with navigation + mobile responsive
 *
 * Blue-600/indigo-700 gradient theme for partner dashboard.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import { usePartner } from '@/hooks/usePartner';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';
import {
  LayoutDashboard,
  DollarSign,
  BarChart3,
  Code,
  User,
  Wallet,
  LogOut,
  Menu,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface PartnerDashboardLayoutProps {
  children: React.ReactNode;
}

const PartnerDashboardLayout: React.FC<PartnerDashboardLayoutProps> = ({ children }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { partner, affiliateLink } = usePartner();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Redirect suspended/banned partners to suspended page
  useEffect(() => {
    if (partner && (partner.status === 'suspended' || partner.status === 'banned') && !location.pathname.includes('/partner/suspendu')) {
      navigate('/partner/suspendu');
    }
  }, [partner, location.pathname, navigate]);

  const menuItems = [
    {
      id: 'dashboard',
      label: intl.formatMessage({ id: 'partner.menu.dashboard', defaultMessage: 'Tableau de bord' }),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/partner/tableau-de-bord',
    },
    {
      id: 'earnings',
      label: intl.formatMessage({ id: 'partner.menu.earnings', defaultMessage: 'Mes gains' }),
      icon: <DollarSign className="w-5 h-5" />,
      path: '/partner/gains',
    },
    {
      id: 'statistics',
      label: intl.formatMessage({ id: 'partner.menu.statistics', defaultMessage: 'Statistiques' }),
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/partner/statistiques',
    },
    {
      id: 'widgets',
      label: intl.formatMessage({ id: 'partner.menu.widgets', defaultMessage: 'Widgets' }),
      icon: <Code className="w-5 h-5" />,
      path: '/partner/widgets',
    },
    {
      id: 'profile',
      label: intl.formatMessage({ id: 'partner.menu.profile', defaultMessage: 'Mon profil' }),
      icon: <User className="w-5 h-5" />,
      path: '/partner/profil',
    },
    {
      id: 'payments',
      label: intl.formatMessage({ id: 'partner.menu.payments', defaultMessage: 'Paiements' }),
      icon: <Wallet className="w-5 h-5" />,
      path: '/partner/paiements',
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

  const [linkCopied, setLinkCopied] = useState(false);

  const copyAffiliateLink = async () => {
    if (!affiliateLink) return;
    const success = await copyToClipboard(affiliateLink);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }));
    } else {
      toast.error(intl.formatMessage({ id: 'common.copyFailed', defaultMessage: 'Copy failed' }));
    }
  };

  const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const renderSidebar = (isMobile = false) => (
    <div className={`${isMobile ? '' : 'sticky top-8'}`}>
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
        {/* Header with user info */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
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
                <FormattedMessage id="partner.sidebar.title" defaultMessage="Espace Partenaire" />
              </p>
            </div>
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white/70 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Fermer' })}
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* Affiliate Link */}
          {affiliateLink && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
                <FormattedMessage id="partner.sidebar.affiliateLink" defaultMessage="Votre lien d'affiliation" />
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={affiliateLink}
                  readOnly
                  className="flex-1 text-xs bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-2 py-1.5 truncate"
                />
                <button
                  onClick={copyAffiliateLink}
                  className={`p-1.5 text-white rounded-lg transition-all ${
                    linkCopied ? 'bg-green-600 scale-110' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                  title={intl.formatMessage({ id: linkCopied ? 'common.copied' : 'common.copy', defaultMessage: linkCopied ? 'Copié !' : 'Copier' })}
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Balance Card */}
          {partner && (
            <div className="mb-4 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                <FormattedMessage id="partner.sidebar.balance" defaultMessage="Solde disponible" />
              </p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                {formatUSD(partner.availableBalance)}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Back to site */}
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">
                <FormattedMessage id="partner.sidebar.back" defaultMessage="Retour au site" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 min-h-[44px] min-w-[44px] bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm flex items-center justify-center"
              aria-label={intl.formatMessage({ id: 'partner.sidebar.openMenu', defaultMessage: 'Ouvrir le menu' })}
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <FormattedMessage id="partner.sidebar.title" defaultMessage="Espace Partenaire" />
            </span>
            <div className="w-10" />
          </div>

          <div className="flex lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              {renderSidebar(false)}
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={intl.formatMessage({ id: 'partner.sidebar.title', defaultMessage: 'Espace Partenaire' })}>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 overflow-y-auto">
            {renderSidebar(true)}
          </nav>
        </div>
      )}
    </Layout>
  );
};

export default PartnerDashboardLayout;
