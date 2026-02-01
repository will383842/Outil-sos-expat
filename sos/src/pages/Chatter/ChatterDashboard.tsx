/**
 * ChatterDashboard - Main dashboard for active chatters
 * Enhanced with daily missions, motivation widgets, team management, and PWA prompt
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useChatter } from '@/hooks/useChatter';
import { useChatterReferrals } from '@/hooks/useChatterReferrals';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import {
  ChatterBalanceCard,
  ChatterStatsCard,
  ChatterLevelCard,
  DailyMissionsCard,
  MotivationWidget,
} from '@/components/Chatter/Cards';
import { EarningsRatioCard } from '@/components/Chatter/Cards/EarningsRatioCard';
import { PioneerBadgeCard } from '@/components/Chatter/Cards/PioneerBadgeCard';
import { RecruitmentBanner } from '@/components/Chatter/RecruitmentBanner';
import { ChatterAffiliateLinks } from '@/components/Chatter/Links';
import { PWAInstallPrompt } from '@/components/pwa';
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
  Rocket,
  Target,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

// Level thresholds in cents
const LEVEL_THRESHOLDS = {
  1: 0,
  2: 5000,     // $50
  3: 25000,    // $250
  4: 100000,   // $1000
  5: 500000,   // $5000
};

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
  } = useChatter();

  // Referral data
  const {
    stats: referralStats,
    earlyAdopter,
    isLoading: referralsLoading
  } = useChatterReferrals();

  const paymentsRoute = `/${getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode)}`;
  const referralsRoute = `/${getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode)}`;
  const referRoute = `/${getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode)}`;
  const leaderboardRoute = `/${getTranslatedRouteSlug('chatter-leaderboard' as RouteKey, langCode)}`;

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

  // Get next level threshold
  const getNextLevelThreshold = (currentLevel: number): number => {
    const nextLevel = Math.min(currentLevel + 1, 5) as 1 | 2 | 3 | 4 | 5;
    return LEVEL_THRESHOLDS[nextLevel];
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

  // Team size
  const teamSize = (referralStats?.totalFilleulsN1 || 0) + (referralStats?.totalFilleulsN2 || 0);

  return (
    <ChatterDashboardLayout activeKey="dashboard">
      <div className="space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Rocket className="w-7 h-7 text-red-500" />
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

        {/* Recruitment Banner - Prominent at top */}
        {teamSize < 10 && (
          <RecruitmentBanner
            referralLink={recruitmentShareUrl}
            referralCode={chatter.affiliateCodeRecruitment || ''}
            onLearnMore={() => navigate(referRoute)}
            defaultExpanded={false}
          />
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

        {/* Daily Missions - Gamification */}
        <DailyMissionsCard
          streak={chatter.currentStreak}
          bestStreak={chatter.bestStreak}
          onTaskComplete={(taskId) => console.log('Task completed:', taskId)}
          onAllComplete={() => console.log('All missions complete!')}
          loading={isLoading}
        />

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

            {/* Motivation Widget - Tips & Actions */}
            <MotivationWidget
              level={chatter.level}
              totalEarned={chatter.totalEarned}
              nextLevelThreshold={getNextLevelThreshold(chatter.level)}
              monthlyRank={chatter.currentMonthRank ?? undefined}
              currentStreak={chatter.currentStreak}
              clientShareUrl={clientShareUrl}
              recruitmentShareUrl={recruitmentShareUrl}
              onViewLeaderboard={() => navigate(leaderboardRoute)}
              loading={isLoading}
              defaultExpanded={true}
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
                    <Target className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.dashboard.noCommissions" defaultMessage="Aucune commission pour l'instant" />
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    <FormattedMessage id="chatter.dashboard.shareLinks" defaultMessage="Partagez vos liens pour commencer à gagner" />
                  </p>
                  <button
                    onClick={() => navigate(referRoute)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-4 h-4" />
                    <FormattedMessage id="chatter.dashboard.startSharing" defaultMessage="Commencer à partager" />
                  </button>
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

            {/* Team Quick Stats */}
            {referralStats && (
              <div className={`${UI.card} p-4 sm:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <FormattedMessage id="chatter.referrals.myTeam" defaultMessage="Mon Équipe" />
                  </h3>
                  <button
                    onClick={() => navigate(referralsRoute)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 min-h-[44px] px-2 -mr-2 active:opacity-70"
                  >
                    <FormattedMessage id="common.manage" defaultMessage="Gérer" />
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {teamSize === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <FormattedMessage id="chatter.referrals.noTeamYet" defaultMessage="Pas encore d'équipe" />
                    </p>
                    <button
                      onClick={() => navigate(referRoute)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Share2 className="w-4 h-4" />
                      <FormattedMessage id="chatter.referrals.recruitFirst" defaultMessage="Recruter mon premier chatter" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {referralStats.totalFilleulsN1}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <FormattedMessage id="chatter.referrals.directN1" defaultMessage="Directs (N1)" />
                        </p>
                      </div>
                      <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                        <p className="text-2xl sm:text-3xl font-bold text-pink-600 dark:text-pink-400">
                          {referralStats.totalFilleulsN2}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <FormattedMessage id="chatter.referrals.indirectN2" defaultMessage="Indirects (N2)" />
                        </p>
                      </div>
                    </div>

                    {/* Team earnings this month */}
                    {referralStats.monthlyReferralEarnings > 0 && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              <FormattedMessage id="chatter.referrals.teamEarningsMonth" defaultMessage="Gains équipe ce mois" />
                            </p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              +{formatAmount(referralStats.monthlyReferralEarnings)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                              <TrendingUp className="w-3 h-3" />
                              5% récurrent
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PWA Install Prompt - Shows after 30 seconds */}
        <PWAInstallPrompt
          onInstall={() => console.log('PWA installed')}
          onDismiss={() => console.log('PWA prompt dismissed')}
        />
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterDashboard;
