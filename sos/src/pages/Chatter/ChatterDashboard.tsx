/**
 * ChatterDashboard - Main dashboard for active chatters
 * Shows stats, affiliate links, recent commissions, and balance
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useChatter } from '@/hooks/useChatter';
import { useChatterReferrals } from '@/hooks/useChatterReferrals';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { ChatterBalanceCard, ChatterStatsCard, ChatterLevelCard } from '@/components/Chatter/Cards';
import { EarningsRatioCard } from '@/components/Chatter/Cards/EarningsRatioCard';
import { PioneerBadgeCard } from '@/components/Chatter/Cards/PioneerBadgeCard';
import { ChatterAffiliateLinks } from '@/components/Chatter/Links';
import {
  Users,
  TrendingUp,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Share2,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const ChatterDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const {
    dashboardData,
    commissions,
    isLoading,
    error,
    isChatter,
    clientShareUrl,
    recruitmentShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
  } = useChatter();

  // Referral data
  const { stats: referralStats, earlyAdopter, isLoading: referralsLoading } = useChatterReferrals();

  const paymentsRoute = `/${getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode)}`;
  const referralsRoute = `/${getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode)}`;
  const referRoute = `/${getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode)}`;

  // Calculate stats
  const thisMonthCommissions = useMemo(() => {
    const now = new Date();
    return commissions.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [commissions]);

  const thisMonthTotal = useMemo(() => {
    return thisMonthCommissions.reduce((sum, c) => sum + c.amount, 0);
  }, [thisMonthCommissions]);

  const pendingCount = useMemo(() => {
    return commissions.filter(c => c.status === 'pending').length;
  }, [commissions]);

  // Recent commissions
  const recentCommissions = commissions.slice(0, 5);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  // Loading state
  if (isLoading) {
    return (
      <ChatterDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 mx-auto text-red-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
            </p>
          </div>
        </div>
      </ChatterDashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ChatterDashboardLayout>
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        </div>
      </ChatterDashboardLayout>
    );
  }

  // Not a chatter state
  if (!isChatter || !dashboardData) {
    return (
      <ChatterDashboardLayout>
        <div className={`${UI.card} p-8 text-center`}>
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            <FormattedMessage id="chatter.dashboard.notChatter.title" defaultMessage="Pas encore Chatter" />
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.dashboard.notChatter.desc" defaultMessage="Vous devez d'abord vous inscrire au programme Chatter." />
          </p>
        </div>
      </ChatterDashboardLayout>
    );
  }

  const { chatter } = dashboardData;

  // Calculate earnings ratio
  const affiliationEarnings = chatter.totalEarned - (chatter.referralEarnings || 0);
  const referralEarnings = chatter.referralEarnings || 0;

  return (
    <ChatterDashboardLayout activeKey="dashboard">
      <div className="space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.dashboard.title" defaultMessage="Tableau de bord" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.dashboard.welcome"
                defaultMessage="Bienvenue, {name} !"
                values={{ name: chatter.firstName }}
              />
            </p>
          </div>
          <button
            onClick={() => navigate(referRoute)}
            className="flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-red-500/30 w-full sm:w-auto"
          >
            <Share2 className="w-5 h-5" />
            <FormattedMessage id="chatter.referrals.refer" defaultMessage="Parrainer" />
          </button>
        </div>

        {/* Pioneer Badge (if applicable) */}
        {earlyAdopter?.isEarlyAdopter && (
          <PioneerBadgeCard earlyAdopter={earlyAdopter} variant="compact" />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <ChatterStatsCard
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.thisMonth', defaultMessage: 'Ce mois' })}
            value={formatAmount(thisMonthTotal)}
            subValue={intl.formatMessage(
              { id: 'chatter.stats.commissionsCount', defaultMessage: '{count} commissions' },
              { count: thisMonthCommissions.length }
            )}
            gradient="from-red-600 to-orange-600"
            iconBg="bg-red-100 dark:bg-red-900/30"
            loading={isLoading}
          />

          <ChatterStatsCard
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.conversions', defaultMessage: 'Conversions' })}
            value={chatter.totalClients + chatter.totalRecruits}
            subValue={intl.formatMessage(
              { id: 'chatter.stats.breakdown', defaultMessage: '{clients} clients, {recruits} recrutés' },
              { clients: chatter.totalClients, recruits: chatter.totalRecruits }
            )}
            gradient="from-purple-600 to-pink-600"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            loading={isLoading}
          />

          <ChatterStatsCard
            icon={<Phone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.commissions', defaultMessage: 'Total commissions' })}
            value={commissions.length}
            subValue={pendingCount > 0
              ? intl.formatMessage({ id: 'chatter.stats.pending', defaultMessage: '{count} en attente' }, { count: pendingCount })
              : undefined
            }
            gradient="from-blue-600 to-indigo-600"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            loading={isLoading}
          />

          <ChatterStatsCard
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.totalEarned', defaultMessage: 'Total gagné' })}
            value={formatAmount(chatter.totalEarned)}
            gradient="from-green-600 to-emerald-600"
            iconBg="bg-green-100 dark:bg-green-900/30"
            loading={isLoading}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Affiliate Links */}
            <ChatterAffiliateLinks
              affiliateCodeClient={chatter.affiliateCodeClient || ''}
              affiliateCodeRecruitment={chatter.affiliateCodeRecruitment || ''}
              clientLinkUrl={clientShareUrl}
              recruitmentLinkUrl={recruitmentShareUrl}
              totalClientConversions={chatter.totalClients}
              totalRecruitmentConversions={chatter.totalRecruits}
            />

            {/* Recent Commissions */}
            <div className={`${UI.card} overflow-hidden`}>
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <FormattedMessage id="chatter.dashboard.recentCommissions" defaultMessage="Commissions récentes" />
                </h3>
                <button
                  onClick={() => navigate(paymentsRoute)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 min-h-[44px] px-3 -mr-3 active:opacity-70"
                >
                  <FormattedMessage id="common.viewAll" defaultMessage="Voir tout" />
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {recentCommissions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.dashboard.noCommissions" defaultMessage="Aucune commission pour l'instant" />
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    <FormattedMessage id="chatter.dashboard.shareLinks" defaultMessage="Partagez vos liens pour commencer à gagner" />
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {recentCommissions.map((commission) => (
                    <div key={commission.id} className="px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[72px]">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                          commission.status === 'available'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : commission.status === 'pending'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {commission.status === 'available' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                            {commission.type === 'client_referral'
                              ? intl.formatMessage({ id: 'chatter.commission.client', defaultMessage: 'Commission Client' })
                              : intl.formatMessage({ id: 'chatter.commission.recruitment', defaultMessage: 'Commission Recrutement' })
                            }
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(commission.createdAt).toLocaleDateString(intl.locale)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          +{formatAmount(commission.amount)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          commission.status === 'available'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : commission.status === 'pending'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {intl.formatMessage({ id: `chatter.status.${commission.status}`, defaultMessage: commission.status })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Balance Card */}
            <ChatterBalanceCard
              availableBalance={chatter.availableBalance}
              pendingBalance={chatter.pendingBalance}
              validatedBalance={chatter.validatedBalance}
              minimumWithdrawal={minimumWithdrawal}
              canWithdraw={canWithdraw}
              hasPendingWithdrawal={!!chatter.pendingWithdrawalId}
              onWithdraw={() => navigate(paymentsRoute)}
              loading={isLoading}
            />

            {/* Level Card */}
            <ChatterLevelCard
              level={chatter.level as 1 | 2 | 3 | 4 | 5}
              totalEarned={chatter.totalEarned}
              currentStreak={chatter.currentStreak}
              bestStreak={chatter.bestStreak}
              monthlyRank={chatter.currentMonthRank ?? undefined}
              loading={isLoading}
            />

            {/* Earnings Ratio Card */}
            {(affiliationEarnings > 0 || referralEarnings > 0) && (
              <EarningsRatioCard
                affiliationEarnings={affiliationEarnings}
                referralEarnings={referralEarnings}
                isLoading={isLoading || referralsLoading}
              />
            )}

            {/* Referral Stats Quick View */}
            {referralStats && (referralStats.totalFilleulsN1 > 0 || referralStats.totalFilleulsN2 > 0) && (
              <div className={`${UI.card} p-4 sm:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <FormattedMessage id="chatter.referrals.myReferrals" defaultMessage="Mes Filleuls" />
                  </h3>
                  <button
                    onClick={() => navigate(referralsRoute)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 min-h-[44px] px-2 -mr-2 active:opacity-70"
                  >
                    <FormattedMessage id="common.viewAll" defaultMessage="Voir tout" />
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {referralStats.totalFilleulsN1}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <FormattedMessage id="chatter.referrals.filleulsN1" defaultMessage="Filleuls N1" />
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                      {referralStats.qualifiedFilleulsN1}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <FormattedMessage id="chatter.referrals.qualified" defaultMessage="Qualifiés" />
                    </p>
                  </div>
                </div>
                {referralStats.monthlyReferralEarnings > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage id="chatter.referrals.thisMonth" defaultMessage="Ce mois" />
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +{formatAmount(referralStats.monthlyReferralEarnings)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterDashboard;
