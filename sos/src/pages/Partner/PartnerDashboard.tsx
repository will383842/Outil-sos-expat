/**
 * PartnerDashboard - Main dashboard page for partners
 */

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import { usePartner } from '@/hooks/usePartner';
import { copyToClipboard as clipboardCopy } from '@/utils/clipboard';
import {
  PartnerDashboardLayout,
  PartnerBalanceCard,
  PartnerStatsCard,
  PartnerEarningsChart,
  PartnerRecentCommissions,
} from '@/components/Partner';
import toast from 'react-hot-toast';
import {
  MousePointerClick,
  Phone,
  TrendingUp,
  Percent,
  Copy,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const NotificationBell = lazy(() =>
  import('@/components/shared/NotificationBell').then((m) => ({ default: m.NotificationBell }))
);

const PartnerDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();
  const {
    dashboardData,
    partner,
    commissions,
    notifications,
    isLoading,
    error,
    isPartner,
    affiliateLink,
    canWithdraw,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  } = usePartner();

  // Redirect if not a partner
  useEffect(() => {
    if (!isLoading && !isPartner) {
      navigate('/');
    }
  }, [isLoading, isPartner, navigate]);

  const [linkCopied, setLinkCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    const success = await clipboardCopy(text);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }));
    } else {
      toast.error(intl.formatMessage({ id: 'common.copyFailed', defaultMessage: 'Copy failed' }));
    }
  };

  if (isLoading) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  if (error) {
    return (
      <PartnerDashboardLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </PartnerDashboardLayout>
    );
  }

  if (!partner) return null;

  const monthStats = partner.currentMonthStats;
  const conversionRate = monthStats.clicks > 0
    ? ((monthStats.calls / monthStats.clicks) * 100).toFixed(1)
    : '0.0';

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                <FormattedMessage
                  id="partner.dashboard.welcome"
                  defaultMessage="Bonjour, {name} !"
                  values={{ name: partner.firstName }}
                />
              </h1>
              <p className="text-blue-100">
                <FormattedMessage
                  id="partner.dashboard.welcomeSubtitle"
                  defaultMessage="Bienvenue dans votre espace partenaire"
                />
              </p>
            </div>
            <Suspense fallback={<div className="w-10 h-10" />}>
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationsCount}
                onMarkAsRead={markNotificationRead}
                onMarkAllAsRead={markAllNotificationsRead}
              />
            </Suspense>
          </div>
        </div>

        {/* Balance Cards */}
        <PartnerBalanceCard
          availableBalance={partner.availableBalance}
          pendingBalance={partner.pendingBalance + partner.validatedBalance}
          totalEarned={partner.totalEarned}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <PartnerStatsCard
            icon={<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />}
            label={<FormattedMessage id="partner.dashboard.clicks" defaultMessage="Clics ce mois" />}
            value={monthStats.clicks}
          />
          <PartnerStatsCard
            icon={<Phone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />}
            label={<FormattedMessage id="partner.dashboard.calls" defaultMessage="Appels ce mois" />}
            value={monthStats.calls}
          />
          <PartnerStatsCard
            icon={<Percent className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />}
            label={<FormattedMessage id="partner.dashboard.conversionRate" defaultMessage="Taux de conversion" />}
            value={`${conversionRate}%`}
          />
          <PartnerStatsCard
            icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />}
            label={<FormattedMessage id="partner.dashboard.monthEarnings" defaultMessage="Gains ce mois" />}
            value={`$${(monthStats.earnings / 100).toFixed(2)}`}
          />
        </div>

        {/* Earnings Chart */}
        {dashboardData?.monthlyStats && (
          <PartnerEarningsChart data={dashboardData.monthlyStats} />
        )}

        {/* Affiliate Link */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border dark:border-gray-700">
          <h2 className="text-lg dark:text-white font-semibold mb-4">
            <FormattedMessage id="partner.dashboard.affiliateLink" defaultMessage="Votre lien d'affiliation" />
          </h2>
          <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm dark:text-white font-semibold">
                <FormattedMessage id="partner.dashboard.yourCode" defaultMessage="Code: {code}" values={{ code: partner.affiliateCode }} />
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={affiliateLink}
                readOnly
                className="w-full text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3 min-h-[48px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(affiliateLink)}
                  className={`flex-1 min-h-[48px] text-white rounded-xl flex items-center justify-center gap-2 font-medium transition-colors active:scale-[0.98] ${
                    linkCopied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {linkCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span>
                    {linkCopied
                      ? <FormattedMessage id="common.copied" defaultMessage="Copied!" />
                      : <FormattedMessage id="common.copy" defaultMessage="Copier" />
                    }
                  </span>
                </button>
                <a
                  href={affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors active:scale-[0.98]"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Discount Banner */}
        {partner.discountConfig?.isActive && (
          <div className="bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Percent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  <FormattedMessage id="partner.dashboard.discountActive" defaultMessage="Remise active pour votre communauté" />
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {partner.discountConfig.type === 'fixed'
                    ? `${partner.discountConfig.label || ''} -$${(partner.discountConfig.value / 100).toFixed(2)}`
                    : `${partner.discountConfig.label || ''} -${partner.discountConfig.value}%${partner.discountConfig.maxDiscountCents ? ` (max $${(partner.discountConfig.maxDiscountCents / 100).toFixed(2)})` : ''}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Commissions */}
        <div className="relative">
          <PartnerRecentCommissions commissions={commissions} />
          {commissions.length > 0 && (
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
              <button
                onClick={() => navigate('/partner/gains')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 min-h-[44px] px-2 active:opacity-70"
              >
                <FormattedMessage id="partner.dashboard.viewAll" defaultMessage="Voir tout" />
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {canWithdraw && (
          <button
            onClick={() => navigate('/partner/paiements')}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5 sm:p-6 hover:from-blue-600 hover:to-indigo-700 transition-all min-h-[80px] active:scale-[0.98] shadow-lg text-left"
          >
            <h3 className="font-semibold mb-1 text-base sm:text-lg">
              <FormattedMessage id="partner.dashboard.withdrawCta" defaultMessage="Retirer vos gains" />
            </h3>
            <p className="text-sm opacity-90">
              <FormattedMessage
                id="partner.dashboard.withdrawDesc"
                defaultMessage="Vous avez ${amount} disponibles"
                values={{ amount: (partner.availableBalance / 100).toFixed(2) }}
              />
            </p>
          </button>
        )}
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerDashboard;
