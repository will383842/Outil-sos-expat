/**
 * InfluencerDashboard - Premium Elite Dashboard for Influencers
 *
 * Features:
 * - React.lazy for code splitting
 * - React.memo for pure components
 * - useMemo/useCallback for optimization
 * - Staggered entrance animations
 * - Skeleton loading states
 * - Pull-to-refresh (mobile)
 * - Auto-refresh every 60s
 * - Mobile-first responsive design
 * - Glassmorphism UI
 */

import React, { useMemo, useState, useEffect, useCallback, useRef, lazy, Suspense, memo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useInfluencer } from '@/hooks/useInfluencer';
import type { InfluencerCommission } from '@/types/influencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';

// ============================================================================
// CRITICAL ABOVE-FOLD COMPONENTS - Loaded synchronously
// ============================================================================
import InfluencerBalanceCard from '@/components/Influencer/Cards/InfluencerBalanceCard';
import InfluencerStatsCard from '@/components/Influencer/Cards/InfluencerStatsCard';

// ============================================================================
// LAZY-LOADED BELOW-FOLD COMPONENTS - Code splitting
// ============================================================================
const InfluencerLevelCard = lazy(() =>
  import('@/components/Influencer/Cards/InfluencerLevelCard').then(m => ({ default: m.InfluencerLevelCard }))
);
const InfluencerMotivationWidget = lazy(() =>
  import('@/components/Influencer/Cards/InfluencerMotivationWidget').then(m => ({ default: m.InfluencerMotivationWidget }))
);
const InfluencerLiveActivityFeed = lazy(() =>
  import('@/components/Influencer/Cards/InfluencerLiveActivityFeed').then(m => ({ default: m.InfluencerLiveActivityFeed }))
);
const InfluencerEarningsBreakdownCard = lazy(() =>
  import('@/components/Influencer/Cards/InfluencerEarningsBreakdownCard').then(m => ({ default: m.InfluencerEarningsBreakdownCard }))
);
const InfluencerTeamCard = lazy(() =>
  import('@/components/Influencer/Cards/InfluencerTeamCard').then(m => ({ default: m.InfluencerTeamCard }))
);
const InfluencerAffiliateLinks = lazy(() =>
  import('@/components/Influencer/Links/InfluencerAffiliateLinks')
);
import PWAInstallCards from '@/components/dashboard/PWAInstallCards';

// Icons
import {
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
  Bell,
  RefreshCw,
  Rocket,
  Share2,
  Trophy,
  Zap,
  CheckCircle,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// SKELETON COMPONENTS FOR SUSPENSE
// ============================================================================
const CardSkeleton = memo<{ height?: string; className?: string }>(({
  height = 'h-48',
  className = '',
}) => (
  <div className={`bg-white/80 dark:bg-white/5 backdrop-blur-xl border dark:border-white/10 rounded-2xl shadow-lg animate-pulse${height}${className}`}>
    <div className="p-4 sm:p-6 space-y-3">
      <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
    </div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

const FullSkeleton = memo(() => (
  <div className="space-y-6 animate-pulse">
    <div className="h-12 bg-gray-200 dark:bg-white/10 rounded-xl w-1/2" />
    <div className="grid lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-200 dark:bg-white/10 rounded-2xl" />
      ))}
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <CardSkeleton height="h-64" />
      <CardSkeleton height="h-64" />
    </div>
  </div>
));
FullSkeleton.displayName = 'FullSkeleton';

// ============================================================================
// MEMOIZED SUB-COMPONENTS
// ============================================================================
interface CommissionItemProps {
  commission: InfluencerCommission;
  formatAmount: (cents: number) => string;
  intl: ReturnType<typeof useIntl>;
  index: number;
}

const CommissionItem = memo<CommissionItemProps>(({ commission, formatAmount, intl, index }) => (
  <div
    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
    style={{
      animationDelay: `${index * 80}ms`,
      animation: 'fade-in-up 0.4s ease-out forwards',
      opacity: 0,
    }}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center${
        commission.status === 'available'
          ? 'bg-green-100 dark:bg-green-900/30'
          : commission.status === 'validated'
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-yellow-100 dark:bg-yellow-900/30'
      }`}>
        {commission.status === 'available' ? (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        )}
      </div>
      <div>
        <p className="text-sm dark:text-white font-medium">
          {commission.type === 'client_referral'
            ? intl.formatMessage({ id: 'influencer.commissionType.client_referral', defaultMessage: 'Client référé' })
            : commission.type === 'recruitment'
            ? intl.formatMessage({ id: 'influencer.commissionType.provider_recruitment', defaultMessage: 'Recrutement' })
            : intl.formatMessage({ id: 'influencer.commissionType.manual_adjustment', defaultMessage: 'Ajustement' })}
        </p>
        <p className="text-xs dark:text-gray-700">
          {new Date(commission.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm dark:text-green-400 font-bold">
        +{formatAmount(commission.finalAmount)}
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
));
CommissionItem.displayName = 'CommissionItem';

// ============================================================================
// CONSTANTS
// ============================================================================
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg transition-all hover:shadow-xl",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]",
  },
} as const;

const REFRESH_INTERVAL = 60000; // 60 seconds

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const InfluencerDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const { dashboardData: dashboard, isLoading: loading, error, refreshDashboard } = useInfluencer();

  // ============================================================================
  // STATE
  // ============================================================================
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);

  // ============================================================================
  // MEMOIZED ROUTES
  // ============================================================================
  const routes = useMemo(() => ({
    tools: `/${getTranslatedRouteSlug('influencer-tools' as RouteKey, langCode)}`,
    payments: `/${getTranslatedRouteSlug('influencer-payments' as RouteKey, langCode)}`,
    referrals: `/${getTranslatedRouteSlug('influencer-referrals' as RouteKey, langCode)}`,
    earnings: `/${getTranslatedRouteSlug('influencer-earnings' as RouteKey, langCode)}`,
    leaderboard: `/${getTranslatedRouteSlug('influencer-leaderboard' as RouteKey, langCode)}`,
    suspended: `/${getTranslatedRouteSlug('influencer-suspended' as RouteKey, langCode)}`,
  }), [langCode]);

  // ============================================================================
  // MEMOIZED FORMATTERS
  // ============================================================================
  const formatAmount = useCallback((cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }, [intl.locale]);

  // ============================================================================
  // MEMOIZED COMPUTED VALUES
  // ============================================================================
  const influencer = dashboard?.influencer;
  const config = dashboard?.config;

  const recentCommissions = useMemo(() =>
    (dashboard?.recentCommissions || []).slice(0, 5),
    [dashboard?.recentCommissions]
  );

  const unreadCount = useMemo(() =>
    (dashboard?.recentNotifications || []).filter(n => !n.readAt).length,
    [dashboard?.recentNotifications]
  );

  const thisMonthCommissions = useMemo(() => {
    const comms = dashboard?.recentCommissions || [];
    const now = new Date();
    return comms.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [dashboard?.recentCommissions]);

  const earningsBreakdown = useMemo(() => ({
    clientReferrals: thisMonthCommissions
      .filter(c => c.type === 'client_referral')
      .reduce((sum, c) => sum + c.finalAmount, 0),
    recruitmentCommissions: thisMonthCommissions
      .filter(c => c.type === 'recruitment')
      .reduce((sum, c) => sum + c.finalAmount, 0),
  }), [thisMonthCommissions]);

  const activityFeedItems = useMemo(() =>
    recentCommissions.map(c => ({
      id: c.id,
      type: c.type as 'client_referral' | 'recruitment' | 'withdrawal' | 'badge_earned',
      amount: c.finalAmount,
      createdAt: c.createdAt,
    })),
    [recentCommissions]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
      setLastUpdated(Date.now());
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [refreshDashboard]);

  // Pull-to-refresh handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY.current;
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, 100));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60 && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
    pullStartY.current = null;
  }, [pullDistance, isRefreshing, handleRefresh]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial load
  useEffect(() => {
    refreshDashboard();
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
      setLastUpdated(Date.now());
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  // Redirect if suspended
  useEffect(() => {
    if (dashboard?.influencer?.status === 'suspended') {
      navigate(routes.suspended);
    }
  }, [dashboard?.influencer?.status, navigate, routes.suspended]);

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================
  if (loading && !dashboard) {
    return (
      <InfluencerDashboardLayout>
        <FullSkeleton />
      </InfluencerDashboardLayout>
    );
  }

  // ============================================================================
  // RENDER - ERROR
  // ============================================================================
  if (error) {
    return (
      <InfluencerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] text-center px-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl dark:text-white font-bold mb-2">
            <FormattedMessage id="common.error.title" defaultMessage="Oops! Une erreur est survenue" />
          </h2>
          <p className="text-gray-700 dark:text-gray-700 mb-6 max-w-md">{error}</p>
          <button
            onClick={handleRefresh}
            className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
          >
            <RefreshCw className="w-5 h-5" />
            <FormattedMessage id="common.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      </InfluencerDashboardLayout>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================
  return (
    <InfluencerDashboardLayout>
      <div
        ref={containerRef}
        className="space-y-6 pb-20 md:pb-6 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* Pull-to-refresh indicator */}
        {isPulling && (
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
            style={{ top: -50 + pullDistance * 0.5 }}
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-lg ${pullDistance > 60 ? 'scale-110' : ''} transition-transform`}>
              <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
            </div>
          </div>
        )}

        {/* CSS Animations */}
        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
          }
        `}</style>

        {/* ================================================================ */}
        {/* HEADER - Welcome + Refresh */}
        {/* ================================================================ */}
        <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-2xl dark:text-white sm:text-3xl font-black">
              <FormattedMessage
                id="influencer.dashboard.welcome"
                defaultMessage="Bonjour {name} !"
                values={{ name: influencer?.firstName || 'Influencer' }}
              />
            </h1>
            <p className="text-gray-700 dark:text-gray-700 flex items-center gap-2">
              <FormattedMessage id="influencer.dashboard.subtitle" defaultMessage="Voici un aperçu de vos performances" />
              {isRefreshing && <RefreshCw className="w-4 h-4 animate-spin" />}
            </p>
            {influencer?.monthlyTopMultiplier && influencer.monthlyTopMultiplier > 1.0 && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-100 dark:from-yellow-900/30 to-amber-100 dark:to-amber-900/30 border dark:border-yellow-800">
                <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs dark:text-yellow-300 font-semibold">
                  <FormattedMessage
                    id="influencer.dashboard.bonusActive"
                    defaultMessage="Bonus Top 3 actif : x{multiplier}"
                    values={{ multiplier: influencer.monthlyTopMultiplier.toFixed(2) }}
                  />
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button className="relative p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`${UI.button.secondary} p-2 sm:px-4 sm:py-2 flex items-center gap-2`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
              </span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MOTIVATION WIDGET */}
        {/* ================================================================ */}
        <Suspense fallback={<CardSkeleton height="h-24" />}>
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <InfluencerMotivationWidget />
          </div>
        </Suspense>

        {/* ================================================================ */}
        {/* BALANCE CARDS - 4 columns */}
        {/* ================================================================ */}
        <div className="grid lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: intl.formatMessage({ id: 'influencer.dashboard.balance.total', defaultMessage: 'Total gagné' }), amount: influencer?.totalEarned || 0, color: 'gray' as const, icon: <DollarSign className="w-5 h-5" />, delay: 150 },
            { label: intl.formatMessage({ id: 'influencer.dashboard.balance.available', defaultMessage: 'Disponible' }), amount: influencer?.availableBalance || 0, color: 'green' as const, icon: <DollarSign className="w-5 h-5" />, highlight: true, delay: 200 },
            { label: intl.formatMessage({ id: 'influencer.dashboard.balance.pending', defaultMessage: 'En attente' }), amount: (influencer?.pendingBalance || 0) + (influencer?.validatedBalance || 0), color: 'yellow' as const, icon: <Clock className="w-5 h-5" />, delay: 250 },
            { label: intl.formatMessage({ id: 'influencer.dashboard.balance.withdrawn', defaultMessage: 'Déjà retiré' }), amount: influencer?.totalWithdrawn || 0, color: 'gray' as const, icon: <CheckCircle className="w-5 h-5" />, delay: 300 },
          ].map((card, i) => (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${card.delay}ms` }}>
              <InfluencerBalanceCard
                label={card.label}
                amount={card.amount}
                color={card.color}
                icon={card.icon}
                highlight={card.highlight}
              />
            </div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* AFFILIATE LINKS - Prominent position for easy access */}
        {/* ================================================================ */}
        <Suspense fallback={<CardSkeleton height="h-48" />}>
          <div className={`${UI.card} p-4 sm:p-6 animate-fade-in-up`} style={{ animationDelay: '350ms' }}>
            <h2 className="text-lg dark:text-white font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <FormattedMessage id="influencer.dashboard.links.title" defaultMessage="Vos liens de parrainage" />
            </h2>
            <InfluencerAffiliateLinks
              clientCode={influencer?.affiliateCodeClient || ''}
              recruitmentCode={influencer?.affiliateCodeRecruitment || ''}
              clientDiscount={config?.clientDiscountPercent || 5}
            />
          </div>
        </Suspense>

        {/* ================================================================ */}
        {/* LEVEL + STATS ROW */}
        {/* ================================================================ */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Level Card */}
          <Suspense fallback={<CardSkeleton height="h-48" />}>
            <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <InfluencerLevelCard
                totalEarned={influencer?.totalEarned || 0}
                level={influencer?.level}
                levelProgress={influencer?.levelProgress}
                monthlyTopMultiplier={influencer?.monthlyTopMultiplier}
              />
            </div>
          </Suspense>

          {/* Monthly Stats */}
          <div className="lg:col-span-2 grid sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: intl.formatMessage({ id: 'influencer.dashboard.stats.monthlyEarnings', defaultMessage: 'Ce mois' }), value: formatAmount(influencer?.currentMonthEarnings || 0), icon: <DollarSign className="w-5 h-5" />, color: 'green' as const, delay: 400 },
              { label: intl.formatMessage({ id: 'influencer.dashboard.stats.clients', defaultMessage: 'Clients' }), value: (influencer?.totalClientsReferred || 0).toString(), icon: <Users className="w-5 h-5" />, color: 'red' as const, delay: 450 },
              { label: intl.formatMessage({ id: 'influencer.dashboard.stats.recruits', defaultMessage: 'Recrutés' }), value: (influencer?.totalProvidersRecruited || 0).toString(), icon: <Users className="w-5 h-5" />, color: 'purple' as const, delay: 500 },
              { label: intl.formatMessage({ id: 'influencer.dashboard.stats.rank', defaultMessage: 'Classement' }), value: influencer?.currentMonthRank ? `#${influencer.currentMonthRank}` : '-', icon: <Trophy className="w-5 h-5" />, color: 'yellow' as const, delay: 550 },
            ].map((stat, i) => (
              <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${stat.delay}ms` }}>
                <InfluencerStatsCard
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* QUICK ACTIONS - Mobile-optimized grid */}
        {/* ================================================================ */}
        <div className={`${UI.card} p-4 sm:p-6 animate-fade-in-up`} style={{ animationDelay: '600ms' }}>
          <h2 className="text-lg dark:text-white font-bold mb-4 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-red-500" />
            <FormattedMessage id="influencer.dashboard.actions.title" defaultMessage="Actions rapides" />
          </h2>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { label: intl.formatMessage({ id: 'influencer.dashboard.actions.tools', defaultMessage: 'Outils promo' }), icon: <Share2 className="w-6 h-6" />, route: routes.tools, color: 'from-red-500 to-orange-500' },
              { label: intl.formatMessage({ id: 'influencer.dashboard.actions.withdraw', defaultMessage: 'Retrait' }), icon: <DollarSign className="w-6 h-6" />, route: routes.payments, color: 'from-green-500 to-emerald-500' },
              { label: intl.formatMessage({ id: 'influencer.dashboard.actions.referrals', defaultMessage: 'Mon équipe' }), icon: <Users className="w-6 h-6" />, route: routes.referrals, color: 'from-purple-500 to-pink-500' },
              { label: intl.formatMessage({ id: 'influencer.dashboard.actions.leaderboard', defaultMessage: 'Classement' }), icon: <Trophy className="w-6 h-6" />, route: routes.leaderboard, color: 'from-yellow-500 to-amber-500' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                className={`flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br${action.color}text-white transition-all hover:scale-105 active:scale-95 shadow-lg min-h-[100px]`}
              >
                {action.icon}
                <span className="mt-2 text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* EARNINGS BREAKDOWN + ACTIVITY FEED */}
        {/* ================================================================ */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Earnings Breakdown */}
          <Suspense fallback={<CardSkeleton height="h-72" />}>
            <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
              <InfluencerEarningsBreakdownCard breakdown={earningsBreakdown} />
            </div>
          </Suspense>

          {/* Live Activity Feed */}
          <Suspense fallback={<CardSkeleton height="h-72" />}>
            <div className="animate-fade-in-up" style={{ animationDelay: '750ms' }}>
              <InfluencerLiveActivityFeed
                activities={activityFeedItems}
                isLoading={loading}
              />
            </div>
          </Suspense>
        </div>

        {/* ================================================================ */}
        {/* RECENT COMMISSIONS */}
        {/* ================================================================ */}
        <div className={`${UI.card} p-4 sm:p-6 animate-fade-in-up`} style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg dark:text-white font-bold">
              <FormattedMessage id="influencer.dashboard.commissions.title" defaultMessage="Dernières commissions" />
            </h2>
            <button
              onClick={() => navigate(routes.earnings)}
              className="text-sm hover:text-red-600 flex items-center gap-1"
            >
              <FormattedMessage id="influencer.dashboard.commissions.viewAll" defaultMessage="Voir tout" />
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {recentCommissions.length > 0 ? (
            <div className="space-y-3">
              {recentCommissions.map((commission, i) => (
                <CommissionItem
                  key={commission.id}
                  commission={commission}
                  formatAmount={formatAmount}
                  intl={intl}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-700 mb-4">
                <FormattedMessage
                  id="influencer.dashboard.commissions.empty"
                  defaultMessage="Pas encore de commissions"
                />
              </p>
              <button
                onClick={() => navigate(routes.tools)}
                className={`${UI.button.primary} px-6 py-3 inline-flex items-center gap-2`}
              >
                <Share2 className="w-5 h-5" />
                <FormattedMessage id="influencer.dashboard.startSharing" defaultMessage="Commencer à partager" />
              </button>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* COMMISSION INFO */}
        {/* ================================================================ */}
        <div className={`${UI.card} p-4 sm:p-6 animate-fade-in-up`} style={{ animationDelay: '850ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg dark:text-white font-bold">
              <FormattedMessage id="influencer.dashboard.info.title" defaultMessage="Vos commissions" />
            </h2>
            {influencer?.capturedRates && (
              <span className="text-xs dark:text-indigo-300 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                <FormattedMessage id="influencer.dashboard.info.frozen" defaultMessage="Taux figés à vie" />
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 dark:from-red-900/20 to-orange-50 dark:to-orange-900/20 border dark:border-red-800">
              <p className="text-3xl dark:text-red-400 font-black">$10</p>
              <p className="text-sm dark:text-gray-600 mt-1">
                <FormattedMessage id="influencer.dashboard.info.client" defaultMessage="par client référé" />
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 border dark:border-purple-800">
              <p className="text-3xl dark:text-purple-400 font-black">$5<span className="text-lg">/call</span></p>
              <p className="text-sm dark:text-gray-600 mt-1">
                <FormattedMessage id="influencer.dashboard.info.partner" defaultMessage="par appel de vos partenaires (6 mois)" />
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PWA INSTALL CARDS */}
        {/* ================================================================ */}
        <div className="animate-fade-in-up" style={{ animationDelay: '900ms' }}>
          <PWAInstallCards />
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerDashboard;
