/**
 * InfluencerDashboard - Main dashboard for influencers
 * Shows stats, recent commissions, quick actions
 */

import React, { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useInfluencer } from '@/hooks/useInfluencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import InfluencerBalanceCard from '@/components/Influencer/Cards/InfluencerBalanceCard';
import InfluencerStatsCard from '@/components/Influencer/Cards/InfluencerStatsCard';
import InfluencerAffiliateLinks from '@/components/Influencer/Links/InfluencerAffiliateLinks';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
  Bell,
  Copy,
  ExternalLink,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const InfluencerDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const { dashboard, loading, error, refreshDashboard } = useInfluencer();

  useEffect(() => {
    refreshDashboard();
  }, []);

  // Redirect to suspended page if suspended
  useEffect(() => {
    if (dashboard?.influencer?.status === 'suspended') {
      navigate(`/${getTranslatedRouteSlug('influencer-suspended' as RouteKey, langCode)}`);
    }
  }, [dashboard?.influencer?.status]);

  if (loading && !dashboard) {
    return (
      <InfluencerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="large" color="red" />
        </div>
      </InfluencerDashboardLayout>
    );
  }

  if (error) {
    return (
      <InfluencerDashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={refreshDashboard}
            className={`${UI.button.primary} mt-4 px-6 py-2`}
          >
            <FormattedMessage id="common.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      </InfluencerDashboardLayout>
    );
  }

  const influencer = dashboard?.influencer;
  const config = dashboard?.config;
  const monthlyStats = dashboard?.monthlyStats;
  const recentCommissions = dashboard?.recentCommissions || [];

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage
                id="influencer.dashboard.welcome"
                defaultMessage="Bonjour {name} !"
                values={{ name: influencer?.firstName }}
              />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="influencer.dashboard.subtitle"
                defaultMessage="Voici un aperçu de vos performances"
              />
            </p>
          </div>

          {dashboard?.unreadNotifications > 0 && (
            <button
              onClick={() => navigate(`/${getTranslatedRouteSlug('influencer-notifications' as RouteKey, langCode)}`)}
              className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
            >
              <Bell className="w-4 h-4" />
              {dashboard.unreadNotifications}
              <FormattedMessage
                id="influencer.dashboard.notifications"
                defaultMessage="nouvelles notifications"
              />
            </button>
          )}
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfluencerBalanceCard
            label={intl.formatMessage({ id: 'influencer.dashboard.balance.available', defaultMessage: 'Disponible' })}
            amount={influencer?.availableBalance || 0}
            color="green"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <InfluencerBalanceCard
            label={intl.formatMessage({ id: 'influencer.dashboard.balance.pending', defaultMessage: 'En attente' })}
            amount={influencer?.pendingBalance || 0}
            color="yellow"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <InfluencerBalanceCard
            label={intl.formatMessage({ id: 'influencer.dashboard.balance.total', defaultMessage: 'Total gagné' })}
            amount={influencer?.totalEarned || 0}
            color="red"
            icon={<DollarSign className="w-5 h-5" />}
          />
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfluencerStatsCard
            label={intl.formatMessage({ id: 'influencer.dashboard.stats.monthlyEarnings', defaultMessage: 'Gains ce mois' })}
            value={formatCurrency(monthlyStats?.earnings || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
          />
          <InfluencerStatsCard
            label={intl.formatMessage({ id: 'influencer.dashboard.stats.clients', defaultMessage: 'Clients ce mois' })}
            value={monthlyStats?.clients?.toString() || '0'}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <InfluencerStatsCard
            label={intl.formatMessage({ id: 'influencer.dashboard.stats.recruits', defaultMessage: 'Recrutés ce mois' })}
            value={monthlyStats?.recruits?.toString() || '0'}
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
          <InfluencerStatsCard
            label={intl.formatMessage({ id: 'influencer.dashboard.stats.rank', defaultMessage: 'Classement' })}
            value={monthlyStats?.rank ? `#${monthlyStats.rank}` : '-'}
            icon={<TrendingUp className="w-5 h-5" />}
            color="yellow"
          />
        </div>

        {/* Affiliate Links */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="influencer.dashboard.links.title" defaultMessage="Vos liens de parrainage" />
          </h2>
          <InfluencerAffiliateLinks
            clientCode={influencer?.affiliateCodeClient || ''}
            recruitmentCode={influencer?.affiliateCodeRecruitment || ''}
            clientDiscount={config?.clientDiscountPercent || 5}
          />
        </div>

        {/* Quick Actions + Recent Commissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.dashboard.actions.title" defaultMessage="Actions rapides" />
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/${getTranslatedRouteSlug('influencer-tools' as RouteKey, langCode)}`)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="influencer.dashboard.actions.tools" defaultMessage="Outils promotionnels" />
                </span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={() => navigate(`/${getTranslatedRouteSlug('influencer-payments' as RouteKey, langCode)}`)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="influencer.dashboard.actions.withdraw" defaultMessage="Demander un retrait" />
                </span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={() => navigate(`/${getTranslatedRouteSlug('influencer-referrals' as RouteKey, langCode)}`)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="influencer.dashboard.actions.referrals" defaultMessage="Voir mes filleuls" />
                </span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Recent Commissions */}
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.dashboard.commissions.title" defaultMessage="Dernières commissions" />
              </h2>
              <button
                onClick={() => navigate(`/${getTranslatedRouteSlug('influencer-earnings' as RouteKey, langCode)}`)}
                className="text-sm text-red-500 hover:text-red-600"
              >
                <FormattedMessage id="influencer.dashboard.commissions.viewAll" defaultMessage="Voir tout" />
              </button>
            </div>

            {recentCommissions.length > 0 ? (
              <div className="space-y-3">
                {recentCommissions.slice(0, 5).map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {commission.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(commission.amount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        commission.status === 'available'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : commission.status === 'validated'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {commission.status === 'available'
                          ? intl.formatMessage({ id: 'influencer.status.available', defaultMessage: 'Disponible' })
                          : commission.status === 'validated'
                          ? intl.formatMessage({ id: 'influencer.status.validated', defaultMessage: 'Validé' })
                          : intl.formatMessage({ id: 'influencer.status.pending', defaultMessage: 'En attente' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="influencer.dashboard.commissions.empty"
                  defaultMessage="Pas encore de commissions. Partagez votre lien pour commencer !"
                />
              </div>
            )}
          </div>
        </div>

        {/* Commission Info */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="influencer.dashboard.info.title" defaultMessage="Vos commissions" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(config?.commissionClientAmount || 1000)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage id="influencer.dashboard.info.client" defaultMessage="par client référé" />
              </p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(config?.commissionRecruitmentAmount || 500)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage id="influencer.dashboard.info.recruit" defaultMessage="par appel recruté (6 mois)" />
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(config?.minimumWithdrawalAmount || 5000)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage id="influencer.dashboard.info.minWithdraw" defaultMessage="minimum de retrait" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerDashboard;
