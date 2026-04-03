/**
 * ChatterDashboard - Redesigned main dashboard
 *
 * KEY CHANGES:
 * - Uses useChatterData() (Context) instead of direct useChatter() call
 * - Removed 21 unnecessary useMemo, kept only expensive ones
 * - Removed auto-refresh 60s + ticker 30s (onSnapshot is real-time)
 * - Above-fold components imported synchronously
 * - Below-fold components in single lazy bundle
 * - New chatter ($0) sees NewChatterDashboard instead of empty dashboard
 * - Bento grid layout for desktop
 */

import React, { useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import { trackMetaViewContent } from '@/utils/metaPixel';
import { logAnalyticsEvent } from '@/config/firebase';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useChatterData } from '@/contexts/ChatterDataContext';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';

// Above-fold: imported synchronously (visible immediately)
import HeroEarningsCard from '@/components/Chatter/Cards/HeroEarningsCard';
import BalanceCards from '@/components/Chatter/Cards/BalanceCards';
import NextActionCard from '@/components/Chatter/Cards/NextActionCard';
import LevelProgressCard from '@/components/Chatter/Cards/LevelProgressCard';
import RecentActivityFeed from '@/components/Chatter/Cards/RecentActivityFeed';
import NewChatterDashboard from '@/components/Chatter/Activation/NewChatterDashboard';
import MicroObjectiveCard from '@/components/Chatter/Activation/MicroObjectiveCard';
import { CelebrationProvider } from '@/components/Chatter/Activation/CelebrationSystem';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import DashboardSkeleton from '@/components/Chatter/Cards/DashboardSkeleton';
import { WhatsAppBanner } from '@/whatsapp-groups';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';
import ImageBankSection from '@/components/ImageBankSection';

// Unified affiliate dashboard (Phase 8)
const UnifiedAffiliateDashboard = lazy(() => import('@/components/unified/UnifiedAffiliateDashboard'));

// Below-fold: individual lazy wrappers that resolve named exports from the bundle

// Skeleton for below-fold content
const BelowFoldSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl h-48">
        <div className="p-5 space-y-3">
          <div className="h-5 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-2/3" />
          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const ChatterDashboard: React.FC = () => {
  return (
    <ChatterDashboardLayout activeKey="home">
      <ChatterDashboardContent />
    </ChatterDashboardLayout>
  );
};

const ChatterDashboardContent: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // Data from Context (NOT direct useChatter() - shared via ChatterDataProvider)
  const {
    dashboardData,
    commissions,
    isLoading,
    error,
    clientShareUrl,
    refreshDashboard,
    canWithdraw,
  } = useChatterData();

  const chatter = dashboardData?.chatter;
  const totalEarned = (chatter?.totalEarned || 0);

  // Referral stats from dashboard payload (no separate callable needed)
  const referralStats = dashboardData?.referralStats ?? null;

  // Routes
  const paymentsRoute = `/${getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode)}`;
  const referralsRoute = `/${getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode)}`;
  const telegramRoute = `/${getTranslatedRouteSlug('chatter-telegram' as RouteKey, langCode)}`;

  // Analytics tracking (once)
  useEffect(() => {
    trackMetaViewContent({ content_name: 'Chatter Dashboard' });
    logAnalyticsEvent('chatter_dashboard_view', {});
  }, []);

  // Refresh on tab focus (only if inactive > 5 minutes)
  useEffect(() => {
    let lastActive = Date.now();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const inactiveMs = Date.now() - lastActive;
        if (inactiveMs > 5 * 60 * 1000) {
          refreshDashboard(true);
        }
      } else {
        lastActive = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshDashboard]);

  // Actions
  const handleCopyLink = useCallback(async () => {
    if (!clientShareUrl) return;
    const success = await copyToClipboard(clientShareUrl);
    if (success) {
      localStorage.setItem('chatter_link_copied', Date.now().toString());
      navigator.vibrate?.(50);
      toast.success(
        intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Lien copie ! Partagez-le sur WhatsApp, Telegram...' }),
        { duration: 3000 }
      );
    } else {
      toast.error(intl.formatMessage({ id: 'chatter.copyFailed', defaultMessage: 'Impossible de copier le lien' }));
    }
  }, [clientShareUrl, intl]);

  const handleShareLink = useCallback(async () => {
    if (!clientShareUrl) return;
    localStorage.setItem('chatter_link_shared', Date.now().toString());

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOS Expat',
          text: intl.formatMessage({ id: 'chatter.shareText', defaultMessage: "Besoin d'aide juridique a l'etranger ? Appelez un avocat en 2 minutes !" }),
          url: clientShareUrl,
        });
        toast.success(intl.formatMessage({ id: 'chatter.shared', defaultMessage: 'Lien partage !' }));
      } catch {
        // User cancelled share
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Besoin d'aide juridique ? ${clientShareUrl}`)}`;
      window.open(whatsappUrl, '_blank');
    }
  }, [clientShareUrl, intl]);

  // Pull-to-refresh handler — always force refresh (explicit user action)
  const handleRefresh = useCallback(() => {
    refreshDashboard(true);
    toast.success(intl.formatMessage({ id: 'chatter.refreshed', defaultMessage: 'Mise a jour...' }), { duration: 1500 });
  }, [refreshDashboard, intl]);

  // Loading state — full dashboard skeleton mimicking above-fold structure
  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={handleRefresh} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white px-6 py-2 rounded-xl">
          <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
        </button>
      </div>
    );
  }

  // NEW CHATTER ($0) - Alternative dashboard
  if (totalEarned === 0) {
    return (
      <>
        <CelebrationProvider />
        {chatter && (
          <div className="px-4 pt-4">
            <WhatsAppBanner
              userId={chatter.id}
              role="chatter"
              language={chatter.language || langCode}
              country={chatter.country || ''}
              alreadyClicked={chatter.whatsappGroupClicked}
            />
          </div>
        )}
        <NewChatterDashboard
          onNavigateToTelegram={() => navigate(telegramRoute)}
        />
      </>
    );
  }

  // ACTIVE CHATTER - Full dashboard with Bento layout
  return (
    <>
      <CelebrationProvider />

      <div className="px-4 py-4 space-y-4">
        {/* === ABOVE THE FOLD === */}

        {/* WhatsApp Group Banner (hidden if already joined) */}
        {chatter && (
          <WhatsAppBanner
            userId={chatter.id}
            role="chatter"
            language={chatter.language || langCode}
            country={chatter.country || ''}
            alreadyClicked={chatter.whatsappGroupClicked}
          />
        )}

        {/* Hero Earnings Card */}
        <HeroEarningsCard />

        {/* 3 Balance Cards */}
        <BalanceCards onNavigateToWithdraw={() => navigate(paymentsRoute)} />

        {/* Unified Affiliate Dashboard (Phase 8) */}
        <Suspense fallback={null}>
          <UnifiedAffiliateDashboard compact showBalance={false} showHistory={false} />
        </Suspense>

        {/* Next Action / Micro Objective */}
        <MicroObjectiveCard
          onShareLink={handleShareLink}
          onNavigateToWithdraw={() => navigate(paymentsRoute)}
          onNavigateToRecruit={() => navigate(referralsRoute)}
          onNavigateToTelegram={() => navigate(telegramRoute)}
        />

        {/* Level Progress + Streak */}
        <LevelProgressCard />

        {/* Desktop: 2-column layout for secondary cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity Feed */}
          <RecentActivityFeed
            onViewAll={() => navigate(paymentsRoute)}
          />

          {/* Next Action Card (desktop secondary position) */}
          <div className="hidden lg:block">
            <NextActionCard
              onCopyLink={handleCopyLink}
              onShareLink={handleShareLink}
              onNavigateToRecruit={() => navigate(referralsRoute)}
              onNavigateToTelegram={() => navigate(telegramRoute)}
            />
          </div>
        </div>

        {/* === BELOW THE FOLD (lazy loaded) === */}
        <Suspense fallback={<BelowFoldSkeleton />}>
          <BelowFoldSection />
        </Suspense>
      </div>
    </>
  );
};

/**
 * BelowFoldSection - Lazy-loaded below-fold cards
 * Each card is its own lazy chunk for optimal loading
 */
const BelowFoldSection: React.FC = () => {
  const { dashboardData, commissions } = useChatterData();
  const chatter = dashboardData?.chatter;

  // Only render cards that have relevant data
  const showPiggyBank = chatter?.telegramOnboardingCompleted && (chatter?.totalEarned || 0) > 0;

  // Compute piggy bank data from chatter
  const piggyBankData = useMemo(() => {
    if (!chatter) return null;
    const clientEarnings = (chatter.commissionsByType?.client_call?.amount || 0);
    const unlockThreshold = dashboardData?.config?.piggyBankUnlockThreshold ?? 15000;
    const bonusAmount = dashboardData?.config?.telegramBonusAmount ?? 5000;
    const progressPercent = unlockThreshold > 0 ? Math.min((clientEarnings / unlockThreshold) * 100, 100) : 0;
    return {
      isUnlocked: clientEarnings >= unlockThreshold,
      clientEarnings,
      unlockThreshold,
      progressPercent,
      amountToUnlock: Math.max(unlockThreshold - clientEarnings, 0),
      totalPending: bonusAmount,
      message: clientEarnings >= unlockThreshold ? 'Debloques !' : `Encore $${((unlockThreshold - clientEarnings) / 100).toFixed(0)}`,
    };
  }, [chatter]);

  // Compute weekly trends from commissions
  const { thisWeekData, lastWeekData } = useMemo(() => {
    const now = new Date();
    const thisWeek: number[] = Array(7).fill(0);
    const lastWeek: number[] = Array(7).fill(0);
    commissions.forEach((c) => {
      if (!c.createdAt || c.status === 'cancelled') return;
      const d = new Date(c.createdAt);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) thisWeek[6 - diff] += (c.amount || 0);
      else if (diff >= 7 && diff < 14) lastWeek[6 - (diff - 7)] += (c.amount || 0);
    });
    return { thisWeekData: thisWeek, lastWeekData: lastWeek };
  }, [commissions]);

  // Compute monthly trends from commissions (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        amount: 0,
      });
    }
    commissions.forEach((c) => {
      if (!c.createdAt || c.status === 'cancelled') return;
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = months.find((m) => m.month === key);
      if (entry) entry.amount += (c.amount || 0);
    });
    return months;
  }, [commissions]);

  return (
    <div className="space-y-4">
      {/* Daily Missions */}
      <Suspense fallback={null}>
        <LazyDailyMissions />
      </Suspense>

      {/* Piggy Bank */}
      {showPiggyBank && piggyBankData && (
        <Suspense fallback={null}>
          <LazyPiggyBank piggyBank={piggyBankData} />
        </Suspense>
      )}

      {/* Trends Chart */}
      {commissions.length >= 3 && (
        <Suspense fallback={null}>
          <LazyTrendsChart thisWeekData={thisWeekData} lastWeekData={lastWeekData} monthlyData={monthlyData} />
        </Suspense>
      )}

      {/* Motivation Widget */}
      <Suspense fallback={null}>
        <LazyMotivation />
      </Suspense>

      {/* Image Bank */}
      <ImageBankSection accent="emerald" showDownload />
    </div>
  );
};

// Below-fold lazy imports — grouped into 2 chunks (engagement + analytics) for fewer round-trips
const LazyDailyMissions = lazy(() => import('@/components/Chatter/Cards/chunks/EngagementBundle').then(m => ({ default: m.DailyMissionsCard })));
const LazyPiggyBank = lazy(() => import('@/components/Chatter/Cards/chunks/EngagementBundle').then(m => ({ default: m.PiggyBankCard })));
const LazyMotivation = lazy(() => import('@/components/Chatter/Cards/chunks/AnalyticsBundle').then(m => ({ default: m.MotivationWidget })));
const LazyTrendsChart = lazy(() => import('@/components/Chatter/Cards/chunks/AnalyticsBundle').then(m => ({ default: m.TrendsChartCard })));

// Prefetch below-fold chunks + adjacent page data after dashboard is idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    // Prefetch 2 below-fold bundles (instead of 4 individual chunks)
    import('@/components/Chatter/Cards/chunks/EngagementBundle');
    import('@/components/Chatter/Cards/chunks/AnalyticsBundle');
    // Prefetch adjacent page JS chunks (most visited after dashboard)
    import('@/pages/Chatter/ChatterPayments');
    import('@/pages/Chatter/ChatterReferrals');
    import('@/pages/Chatter/ChatterLeaderboard');
    import('@/pages/Chatter/ChatterTraining');
  }, { timeout: 3000 });
}

export default ChatterDashboard;
