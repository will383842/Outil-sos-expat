/**
 * ChatterDashboard - Main dashboard for active chatters
 * Enhanced with daily missions, motivation widgets, team management, and PWA prompt
 *
 * Features:
 * - Staggered card entrance animations
 * - Animated number count-ups
 * - Shimmer loading states
 * - Success feedback (confetti, toasts)
 * - Hover lift effects on cards
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - React.lazy for below-fold components (TeamManagementCard, RevenueCalculatorCard, etc.)
 * - React.memo for pure card components that receive stable props
 * - useMemo for computed values (filtered lists, formatted currencies, derived state)
 * - useCallback for handlers passed to children (prevents unnecessary re-renders)
 * - Suspense boundaries with skeleton fallbacks for lazy-loaded components
 * - Virtualization-ready structure for long lists (commissions, team members)
 */

import React, { useMemo, useState, useEffect, useCallback, useRef, lazy, Suspense, memo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChatter } from '@/hooks/useChatter';
import { useChatterReferrals, getNextTierInfo } from '@/hooks/useChatterReferrals';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';

// ============================================================================
// CRITICAL ABOVE-FOLD COMPONENTS - Loaded synchronously for fast initial render
// These are immediately visible and critical for LCP (Largest Contentful Paint)
// ============================================================================
import {
  ChatterBalanceCard,
  ChatterStatsCard,
  ChatterLevelCard,
  PiggyBankCard,
  EarningsMotivationCard,
} from '@/components/Chatter/Cards';
import type { EarningsByCategory } from '@/components/Chatter/Cards/EarningsBreakdownCard';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import { SkeletonDashboard } from '@/components/ui/SkeletonCard';
import { useSuccessFeedback, Toast, ConfettiCelebration } from '@/components/ui/SuccessFeedback';

// ============================================================================
// LAZY-LOADED BELOW-FOLD COMPONENTS - Code splitting for smaller initial bundle
// These components are heavy and/or not immediately visible on initial render
// Each lazy import creates a separate chunk that loads on demand
// ============================================================================

// Heavy card components with animations/charts
const DailyMissionsCard = lazy(() => import('@/components/Chatter/Cards/DailyMissionsCard'));
const MotivationWidget = lazy(() => import('@/components/Chatter/Cards/MotivationWidget'));
const WeeklyChallengeCard = lazy(() => import('@/components/Chatter/Cards/WeeklyChallengeCard'));
const LiveActivityFeed = lazy(() => import('@/components/Chatter/Cards/LiveActivityFeed'));
const RevenueCalculatorCard = lazy(() => import('@/components/Chatter/Cards/RevenueCalculatorCard'));
const TrendsChartCard = lazy(() => import('@/components/Chatter/Cards/TrendsChartCard'));
const ComparisonStatsCard = lazy(() => import('@/components/Chatter/Cards/ComparisonStatsCard'));
const ForecastCard = lazy(() => import('@/components/Chatter/Cards/ForecastCard'));
const AchievementBadgesCard = lazy(() => import('@/components/Chatter/Cards/AchievementBadgesCard'));
const EarningsBreakdownCard = lazy(() => import('@/components/Chatter/Cards/EarningsBreakdownCard'));

// Named exports need special handling with .then()
const TeamManagementCard = lazy(() =>
  import('@/components/Chatter/Cards/TeamManagementCard').then(m => ({ default: m.TeamManagementCard }))
);
const EarningsRatioCard = lazy(() =>
  import('@/components/Chatter/Cards/EarningsRatioCard').then(m => ({ default: m.EarningsRatioCard }))
);
const TeamMessagesCard = lazy(() =>
  import('@/components/Chatter/Cards/TeamMessagesCard').then(m => ({ default: m.TeamMessagesCard }))
);
const ReferralTreeCard = lazy(() =>
  import('@/components/Chatter/Cards/ReferralTreeCard').then(m => ({ default: m.ReferralTreeCard }))
);

// Utility components - less critical
const RecruitmentBanner = lazy(() =>
  import('@/components/Chatter/RecruitmentBanner').then(m => ({ default: m.RecruitmentBanner }))
);
const ChatterAffiliateLinks = lazy(() =>
  import('@/components/Chatter/Links').then(m => ({ default: m.ChatterAffiliateLinks }))
);
const NotificationBell = lazy(() =>
  import('@/components/Chatter/NotificationBell').then(m => ({ default: m.NotificationBell }))
);
// PWAInstallPrompt removed — now handled by PWAInstallCards in dashboard content
const QuickActionsMenu = lazy(() => import('@/components/Chatter/QuickActionsMenu'));
const DashboardTour = lazy(() => import('@/components/Chatter/DashboardTour'));

import PWAInstallCards from '@/components/dashboard/PWAInstallCards';

// Icons - imported synchronously as they're small and used everywhere
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
  DollarSign,
  AlertTriangle,
  Bell,
  Info,
  Award,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// SKELETON COMPONENTS FOR SUSPENSE FALLBACKS
// Memoized to prevent unnecessary re-renders during loading states
// ============================================================================

/**
 * Card skeleton for lazy-loaded card components.
 * Provides visual continuity while components load.
 */
const CardSkeleton = memo<{ height?: string; className?: string }>(({
  height = 'h-48',
  className = '',
}) => (
  <div
    className={`bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg animate-pulse ${height} ${className}`}
  >
    <div className="p-4 sm:p-6 space-y-3">
      <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
    </div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

/**
 * Inline skeleton for small components like buttons and badges
 */
const InlineSkeleton = memo<{ width?: string }>(({ width = 'w-24' }) => (
  <div className={`h-10 ${width} bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse`} />
));
InlineSkeleton.displayName = 'InlineSkeleton';

/**
 * Large card skeleton for team management and other heavy components
 */
const LargeCardSkeleton = memo(() => (
  <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg animate-pulse h-96">
    <div className="p-4 sm:p-6 space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="h-24 bg-gray-200 dark:bg-white/10 rounded-xl" />
        <div className="h-24 bg-gray-200 dark:bg-white/10 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-xl" />
    </div>
  </div>
));
LargeCardSkeleton.displayName = 'LargeCardSkeleton';

// ============================================================================
// MEMOIZED SUB-COMPONENTS
// Pure components wrapped in React.memo to prevent unnecessary re-renders
// ============================================================================

/**
 * Memoized commission item component for the commissions list.
 * Uses custom comparison to only re-render when commission data changes.
 */
interface CommissionItemProps {
  commission: {
    id: string;
    type: string;
    status: string;
    amount: number;
    createdAt: string;
  };
  formatAmount: (cents: number) => string;
  locale: string;
}

const CommissionItem = memo<CommissionItemProps>(({ commission, formatAmount, locale }) => {
  // Memoize the formatted date to avoid recalculating on every render
  const formattedDate = useMemo(
    () => new Date(commission.createdAt).toLocaleDateString(locale),
    [commission.createdAt, locale]
  );

  return (
    <div className="px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[72px]">
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
            <FormattedMessage
              id={commission.type === 'client_referral' ? 'chatter.commission.client' : 'chatter.commission.recruitment'}
              defaultMessage={commission.type === 'client_referral' ? 'Commission Client' : 'Commission Recrutement'}
            />
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className="font-bold text-green-600 dark:text-green-400">+{formatAmount(commission.amount)}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          commission.status === 'available'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : commission.status === 'pending'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          <FormattedMessage id={`chatter.status.${commission.status}`} defaultMessage={commission.status} />
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if commission data or locale changes
  return (
    prevProps.commission.id === nextProps.commission.id &&
    prevProps.commission.status === nextProps.commission.status &&
    prevProps.commission.amount === nextProps.commission.amount &&
    prevProps.locale === nextProps.locale
  );
});
CommissionItem.displayName = 'CommissionItem';

/**
 * Memoized inactive member alert item
 */
interface InactiveMemberItemProps {
  member: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  onMotivate: () => void;
}

const InactiveMemberItem = memo<InactiveMemberItemProps>(({ member, onMotivate }) => (
  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 font-semibold">
        {member.firstName?.[0]?.toUpperCase() || '?'}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {member.firstName} {member.lastName?.[0]}.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <FormattedMessage id="chatter.alerts.inactive" defaultMessage="Inactif depuis 14+ jours" />
        </p>
      </div>
    </div>
    <button
      onClick={onMotivate}
      className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
    >
      <FormattedMessage id="chatter.alerts.motivate" defaultMessage="Motiver" />
    </button>
  </div>
));
InactiveMemberItem.displayName = 'InactiveMemberItem';

// ============================================================================
// CONSTANTS AND UTILITIES
// ============================================================================

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

// Auto-refresh interval in milliseconds (60 seconds)
const REFRESH_INTERVAL = 60000;

/**
 * Format time difference for "last updated" display
 * Pure function - memoization handled at call site
 */
function formatTimeAgo(timestamp: number, locale: string): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 10) {
    return locale === 'fr' ? "a l'instant" : 'just now';
  }
  if (diffSeconds < 60) {
    return locale === 'fr' ? `il y a ${diffSeconds}s` : `${diffSeconds}s ago`;
  }
  if (diffMinutes === 1) {
    return locale === 'fr' ? 'il y a 1 min' : '1 min ago';
  }
  if (diffMinutes < 60) {
    return locale === 'fr' ? `il y a ${diffMinutes} min` : `${diffMinutes} min ago`;
  }
  return locale === 'fr' ? 'il y a plus d\'1h' : '1h+ ago';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChatterDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const {
    dashboardData,
    commissions,
    notifications,
    isLoading,
    error,
    isChatter,
    clientShareUrl,
    recruitmentShareUrl,
    canWithdraw,
    minimumWithdrawal,
    refreshDashboard,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  } = useChatter();

  // Referral data
  const {
    stats: referralStats,
    tierProgress,
    filleulsN1,
    filleulsN2,
    isLoading: referralsLoading,
    refreshDashboard: refreshReferrals,
  } = useChatterReferrals();

  // ============================================================================
  // STATE
  // ============================================================================

  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTimeAgeTick] = useState(0);
  const [selectedInactiveMember, setSelectedInactiveMember] = useState<typeof filleulsN1[0] | null>(null);
  const [selectedEarningsCategory, setSelectedEarningsCategory] = useState<keyof EarningsByCategory | null>(null);

  // ============================================================================
  // MEMOIZED ROUTE CALCULATIONS
  // Routes are computed once and cached until langCode changes
  // ============================================================================

  const routes = useMemo(() => ({
    telegram: `/${getTranslatedRouteSlug('chatter-telegram' as RouteKey, langCode)}`,
    payments: `/${getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode)}`,
    referrals: `/${getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode)}`,
    refer: `/${getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode)}`,
    leaderboard: `/${getTranslatedRouteSlug('chatter-leaderboard' as RouteKey, langCode)}`,
    training: `/${getTranslatedRouteSlug('chatter-training' as RouteKey, langCode)}`,
  }), [langCode]);

  // ============================================================================
  // TELEGRAM ONBOARDING CHECK (mandatory step)
  // ============================================================================
  useEffect(() => {
    // Redirect to Telegram onboarding if not completed
    if (user && !user.telegramOnboardingCompleted) {
      navigate(routes.telegram, { replace: true });
    }
  }, [user, navigate, routes.telegram]);

  // ============================================================================
  // MEMOIZED FORMATTERS
  // Currency formatter is expensive to create, so we memoize it
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
  // These are expensive calculations that should only run when dependencies change
  // ============================================================================

  // This month's commissions - filtered once when commissions array changes
  const thisMonthCommissions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return commissions.filter(c => {
      const date = new Date(c.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }, [commissions]);

  // This month's total earnings
  const thisMonthTotal = useMemo(() => {
    return thisMonthCommissions.reduce((sum, c) => sum + c.amount, 0);
  }, [thisMonthCommissions]);

  // Pending commission count
  const pendingCount = useMemo(() => {
    return commissions.filter(c => c.status === 'pending').length;
  }, [commissions]);

  // Commission breakdown by type
  const commissionBreakdown = useMemo(() => {
    const clientCalls = thisMonthCommissions.filter(c => c.type === 'client_referral').length;
    const recurringCommissions = thisMonthCommissions.filter(c => c.type === 'recurring_5pct');
    const n1Calls = recurringCommissions.filter(c => c.amount === 100).length;
    const n2Calls = recurringCommissions.filter(c => c.amount === 50).length;
    return { clientCalls, n1Calls, n2Calls };
  }, [thisMonthCommissions]);

  // Team passive income
  const teamPassiveIncome = useMemo(() => {
    return referralStats?.monthlyReferralEarnings || 0;
  }, [referralStats?.monthlyReferralEarnings]);

  // Next tier info
  const nextTier = useMemo(() => {
    if (!tierProgress) return null;
    return getNextTierInfo(tierProgress.qualifiedFilleulsCount ?? 0, tierProgress.paidTierBonuses ?? []);
  }, [tierProgress]);

  // Recent commissions (top 5) - sliced once
  const recentCommissions = useMemo(() => commissions.slice(0, 5), [commissions]);

  // Inactive team members - expensive filtering
  const inactiveMembers = useMemo(() => {
    if (!filleulsN1 || filleulsN1.length === 0) return [];
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return filleulsN1.filter(member => {
      const lastActivity = member.lastActivityAt ? new Date(member.lastActivityAt).getTime() : 0;
      return lastActivity < fourteenDaysAgo;
    }).slice(0, 3);
  }, [filleulsN1]);

  // Team size
  const teamSize = useMemo(() => {
    return (referralStats?.totalFilleulsN1 || 0) + (referralStats?.totalFilleulsN2 || 0);
  }, [referralStats?.totalFilleulsN1, referralStats?.totalFilleulsN2]);

  // Earnings breakdown (derived from dashboard data)
  const earningsData = useMemo(() => {
    if (!dashboardData?.chatter) return { affiliation: 0, referral: 0 };
    const { chatter } = dashboardData;
    return {
      affiliation: chatter.totalEarned - (chatter.referralEarnings || 0),
      referral: chatter.referralEarnings || 0,
    };
  }, [dashboardData]);

  // Memoized piggy bank data for PiggyBankCard - avoids creating new object on each render
  const piggyBankData = useMemo(() => {
    if (!dashboardData?.piggyBank) return null;
    const pb = dashboardData.piggyBank;
    return {
      isUnlocked: pb.isUnlocked,
      clientEarnings: pb.clientEarnings,
      unlockThreshold: pb.unlockThreshold,
      progressPercent: pb.progressPercent,
      amountToUnlock: pb.amountToUnlock,
      totalPending: pb.totalPending,
      message: pb.message,
    };
  }, [dashboardData?.piggyBank]);

  // Earnings breakdown by category for EarningsBreakdownCard
  const earningsByCategory = useMemo((): EarningsByCategory => {
    // Initialize all categories to 0
    const breakdown: EarningsByCategory = {
      clientReferrals: 0,
      teamRecruitment: 0,
      tierBonuses: 0,
      streakBonuses: 0,
      recurringCommissions: 0,
    };

    // Map commission types to categories
    commissions.forEach((commission) => {
      const amount = commission.amount;
      switch (commission.type) {
        // Client referrals: client_call + client_referral
        case 'client_call':
        case 'client_referral':
          breakdown.clientReferrals += amount;
          break;
        // Team recruitment: activation_bonus + n1_recruit_bonus + recruitment
        case 'activation_bonus':
        case 'n1_recruit_bonus':
        case 'recruitment':
          breakdown.teamRecruitment += amount;
          break;
        // Tier bonuses: tier_bonus + bonus_top3
        case 'tier_bonus':
        case 'bonus_top3':
          breakdown.tierBonuses += amount;
          break;
        // Streak bonuses: bonus_streak + bonus_level + bonus_zoom
        case 'bonus_streak':
        case 'bonus_level':
        case 'bonus_zoom':
          breakdown.streakBonuses += amount;
          break;
        // Recurring commissions: n1_call + n2_call + recurring_5pct
        case 'n1_call':
        case 'n2_call':
        case 'recurring_5pct':
          breakdown.recurringCommissions += amount;
          break;
        default:
          break;
      }
    });

    return breakdown;
  }, [commissions]);

  // Memoized chatter data for AchievementBadgesCard - avoids creating new object on each render
  // Note: We intentionally depend on dashboardData?.chatter rather than dashboardData
  // to avoid unnecessary recalculations when other parts of dashboardData change
  const achievementBadgesChatterData = useMemo(() => {
    if (!dashboardData?.chatter) return null;
    const { chatter } = dashboardData;
    return {
      totalClients: chatter.totalClients,
      totalRecruits: chatter.totalRecruits,
      currentStreak: chatter.currentStreak,
      bestStreak: chatter.bestStreak,
      totalEarned: chatter.totalEarned,
      level: chatter.level,
      bestRank: chatter.bestRank ?? undefined,
      zoomMeetingsAttended: chatter.zoomMeetingsAttended,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData?.chatter]);

  // ============================================================================
  // MEMOIZED CALLBACKS
  // Event handlers passed to children should be stable references
  // ============================================================================

  // Combined refresh function
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshDashboard(), refreshReferrals()]);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('[ChatterDashboard] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [refreshDashboard, refreshReferrals]);

  // Pull-to-refresh handlers
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

  // Navigation callbacks - memoized to prevent child re-renders
  const navigateToPayments = useCallback(() => navigate(routes.payments), [navigate, routes.payments]);
  const navigateToRefer = useCallback(() => navigate(routes.refer), [navigate, routes.refer]);
  const navigateToReferrals = useCallback(() => navigate(routes.referrals), [navigate, routes.referrals]);
  const navigateToLeaderboard = useCallback(() => navigate(routes.leaderboard), [navigate, routes.leaderboard]);
  const navigateToTraining = useCallback(() => navigate(routes.training), [navigate, routes.training]);

  // Weekly challenge CTA handler
  const handleWeeklyChallengeClick = useCallback((type: string) => {
    if (type === 'recruiter' || type === 'caller') {
      navigate(routes.refer);
    } else {
      navigate(routes.referrals);
    }
  }, [navigate, routes.refer, routes.referrals]);

  // Inactive member selection handler
  const handleSelectInactiveMember = useCallback((member: typeof filleulsN1[0]) => {
    setSelectedInactiveMember(member);
  }, []);

  const handleCloseInactiveMemberModal = useCallback(() => {
    setSelectedInactiveMember(null);
  }, []);

  // Earnings breakdown segment click handler - toggles category filter
  const handleEarningsSegmentClick = useCallback((category: keyof EarningsByCategory) => {
    setSelectedEarningsCategory((prev) => (prev === category ? null : category));
  }, []);

  // Member handlers - navigate to member profile or open messaging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewMember = useCallback((memberId: string) => {
    // Navigate to referrals page where member details can be viewed
    // TODO: Use memberId to navigate to specific member profile when feature is available
    navigateToReferrals();
  }, [navigateToReferrals]);

  const handleMessageMember = useCallback((memberId: string) => {
    // Find the member and open the messaging modal
    const member = filleulsN1.find(m => m.id === memberId);
    if (member) {
      setSelectedInactiveMember(member);
    }
  }, [filleulsN1]);

  // Team messages send handler - memoized for TeamMessagesCard
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSendTeamMessage = useCallback((msg: string, channel: string) => {
    // Message sending is handled by the TeamMessagesCard component internally
    // TODO: Log message sent via channel for analytics when feature is available
    handleCloseInactiveMemberModal();
  }, [handleCloseInactiveMemberModal]);

  // Mission completion handler - memoized for DailyMissionsCard
  const handleAllMissionsComplete = useCallback(() => {
    // Missions completed - no additional UI feedback needed as the card handles it
  }, []);

  // PWA handlers - memoized for PWAInstallPrompt
  const handlePwaInstall = useCallback(() => {
    // PWA was installed successfully - no additional action needed
  }, []);

  const handlePwaDismiss = useCallback(() => {
    // User dismissed the PWA prompt - no additional action needed
  }, []);

  // Tour skip handler - memoized for DashboardTour
  const handleTourSkip = useCallback(() => {
    // User skipped the tour - no additional action needed
  }, []);

  // Get next level threshold
  const getNextLevelThreshold = useCallback((currentLevel: number): number => {
    const nextLevel = Math.min(currentLevel + 1, 5) as 1 | 2 | 3 | 4 | 5;
    return LEVEL_THRESHOLDS[nextLevel];
  }, []);

  // ============================================================================
  // SUCCESS FEEDBACK
  // ============================================================================

  const {
    state: feedbackState,
    showToast,
    hideToast,
    celebrateCommission,
  } = useSuccessFeedback();

  // Share link success handler
  const handleShareLinkSuccess = useCallback(() => {
    showToast('success', intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copie !' }));
  }, [showToast, intl]);

  // Tour completion handler
  const handleTourComplete = useCallback(() => {
    showToast(
      'success',
      intl.formatMessage({ id: 'chatter.tour.completed', defaultMessage: 'Tour Complete!' }),
      intl.formatMessage({ id: 'chatter.tour.startEarning', defaultMessage: 'Start sharing your links!' })
    );
  }, [showToast, intl]);

  // Piggy bank handlers
  const handlePiggyBankClaim = useCallback(() => {
    if (dashboardData?.piggyBank?.isUnlocked && dashboardData.piggyBank.totalPending > 0) {
      navigate(routes.payments);
    } else {
      showToast(
        'success',
        intl.formatMessage({
          id: 'chatter.piggyBank.needMoreSales',
          defaultMessage: 'Continue selling to unlock your bonuses!',
        }),
        intl.formatMessage({
          id: 'chatter.piggyBank.keepGoing',
          defaultMessage: 'Keep going!',
        })
      );
    }
  }, [dashboardData?.piggyBank, navigate, routes.payments, showToast, intl]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Visibility API - pause refresh when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);
      if (visible && Date.now() - lastUpdated > 30000) {
        handleRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastUpdated, handleRefresh]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isTabVisible || !isChatter) return;
    const intervalId = setInterval(handleRefresh, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isTabVisible, isChatter, handleRefresh]);

  // Update "time ago" display
  useEffect(() => {
    const intervalId = setInterval(() => setTimeAgeTick(tick => tick + 1), 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Update lastUpdated when data loads
  useEffect(() => {
    if (dashboardData && !isLoading) {
      setLastUpdated(Date.now());
    }
  }, [dashboardData, isLoading]);

  // Detect new commissions for celebration
  const prevCommissionCount = useRef(commissions.length);
  useEffect(() => {
    if (commissions.length > prevCommissionCount.current && prevCommissionCount.current > 0) {
      const latestCommission = commissions[0];
      const amount = new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency: 'USD',
      }).format(latestCommission.amount / 100);
      celebrateCommission(amount);
    }
    prevCommissionCount.current = commissions.length;
  }, [commissions, intl.locale, celebrateCommission]);

  // ============================================================================
  // EARLY RETURNS FOR LOADING/ERROR STATES
  // ============================================================================

  if (isLoading) {
    return (
      <ChatterDashboardLayout>
        <SkeletonDashboard />
      </ChatterDashboardLayout>
    );
  }

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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ChatterDashboardLayout activeKey="dashboard">
      <div
        ref={containerRef}
        className="space-y-3 sm:space-y-4 lg:space-y-6 pb-24 sm:pb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {isPulling && (
          <div
            className="flex justify-center items-center transition-all duration-200 overflow-hidden"
            style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
          >
            <div className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 ${pullDistance > 60 ? 'text-red-500 dark:text-red-400' : ''}`}>
              <RefreshCw className={`w-5 h-5 ${pullDistance > 60 ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3.6}deg)` }} />
              <span className="text-sm">
                {pullDistance > 60
                  ? (langCode === 'fr' ? 'Relacher pour actualiser' : 'Release to refresh')
                  : (langCode === 'fr' ? 'Tirer pour actualiser' : 'Pull to refresh')
                }
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-red-500 flex-shrink-0" />
              <span className="truncate">
                <FormattedMessage id="chatter.dashboard.title" defaultMessage="Tableau de bord" />
              </span>
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">
              <FormattedMessage
                id="chatter.dashboard.welcome"
                defaultMessage="Bienvenue, {name} !"
                values={{ name: chatter.firstName }}
              />
            </p>
            {/* Refresh indicator */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 min-h-[32px] px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                title={langCode === 'fr' ? 'Actualiser' : 'Refresh'}
                aria-label={langCode === 'fr' ? 'Actualiser le tableau de bord' : 'Refresh dashboard'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {langCode === 'fr' ? 'Mis a jour ' : 'Updated '}
                  {formatTimeAgo(lastUpdated, langCode)}
                </span>
              </button>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <FormattedMessage id="common.refreshing" defaultMessage="Actualisation..." />
                </span>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Notification Bell - Lazy loaded with inline fallback */}
            <div data-tour="notifications">
              <Suspense fallback={<InlineSkeleton width="w-12" />}>
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadNotificationsCount}
                  onMarkAsRead={markNotificationRead}
                  onMarkAllAsRead={markAllNotificationsRead}
                />
              </Suspense>
            </div>
            {/* Refer button */}
            <button
              onClick={navigateToRefer}
              className="flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-red-500/30 flex-1 sm:flex-none"
              aria-label={intl.formatMessage({ id: 'chatter.referrals.refer.aria', defaultMessage: 'Share referral links' })}
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
              <FormattedMessage id="chatter.referrals.refer" defaultMessage="Parrainer" />
            </button>
          </div>
        </div>

        {/* Team Alerts Section */}
        {inactiveMembers.length > 0 && (
          <div className={`${UI.card} p-4 sm:p-6 border-l-4 border-amber-500`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <FormattedMessage id="chatter.alerts.teamTitle" defaultMessage="Alertes Equipe" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.alerts.inactiveCount"
                    defaultMessage="{count} membres inactifs necessitent votre attention"
                    values={{ count: inactiveMembers.length }}
                  />
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {inactiveMembers.map((member) => (
                <InactiveMemberItem
                  key={member.id}
                  member={member}
                  onMotivate={() => handleSelectInactiveMember(member)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Team Messages Modal - Lazy loaded */}
        {selectedInactiveMember && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-message-modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseInactiveMemberModal(); }}
            onKeyDown={(e) => { if (e.key === 'Escape') handleCloseInactiveMemberModal(); }}
          >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <Suspense fallback={<CardSkeleton height="h-64" />}>
                <TeamMessagesCard
                  memberName={selectedInactiveMember.firstName || 'Membre'}
                  memberStatus="inactive"
                  memberPhone={selectedInactiveMember.phone}
                  memberEmail={selectedInactiveMember.email}
                  onSendMessage={handleSendTeamMessage}
                />
              </Suspense>
              <button
                onClick={handleCloseInactiveMemberModal}
                className="mt-2 w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                aria-label={intl.formatMessage({ id: 'common.close.modal', defaultMessage: 'Close modal' })}
              >
                <FormattedMessage id="common.close" defaultMessage="Fermer" />
              </button>
            </div>
          </div>
        )}

        {/* Recruitment Banner - Lazy loaded */}
        {teamSize < 10 && (
          <Suspense fallback={<CardSkeleton height="h-32" />}>
            <RecruitmentBanner
              referralLink={recruitmentShareUrl}
              referralCode={chatter.affiliateCodeRecruitment || ''}
              onLearnMore={navigateToRefer}
              defaultExpanded={false}
            />
          </Suspense>
        )}

        {/* Commission Rates Info Banner */}
        <div className={`${UI.card} p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800/30`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <FormattedMessage id="chatter.commissions.rates" defaultMessage="Vos commissions:" />
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                <Phone className="w-3.5 h-3.5" />
                <FormattedMessage id="chatter.commissions.clientCall" defaultMessage="Client = 10$" />
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                <Users className="w-3.5 h-3.5" />
                <FormattedMessage id="chatter.commissions.n1Call" defaultMessage="N1 = 1$" />
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-full text-sm font-semibold">
                <Users className="w-3.5 h-3.5" />
                <FormattedMessage id="chatter.commissions.n2Call" defaultMessage="N2 = 0.50$" />
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid - Critical above-fold, loaded synchronously */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* This Month - Most Prominent */}
          <div
            className={`
              ${UI.card} p-4 sm:p-5 min-h-[140px]
              bg-gradient-to-br from-green-500/10 to-emerald-500/10
              dark:from-green-500/20 dark:to-emerald-500/20
              border-green-300 dark:border-green-700/50
              opacity-0 animate-fade-in-up
              transition-all duration-300 ease-out
              hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1
            `}
            style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  <FormattedMessage id="chatter.stats.thisMonth" defaultMessage="Ce mois" />
                </p>
                <div className="mt-1">
                  <AnimatedNumber
                    value={thisMonthTotal}
                    isCurrency
                    currencyCode="USD"
                    duration={1500}
                    delay={200}
                    animateOnVisible
                    className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {commissionBreakdown.clientCalls > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {commissionBreakdown.clientCalls} clients (10$/u)
                    </p>
                  )}
                  {teamPassiveIncome > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      <FormattedMessage
                        id="chatter.stats.passiveIncome"
                        defaultMessage="Passif: {amount}"
                        values={{ amount: formatAmount(teamPassiveIncome) }}
                      />
                    </p>
                  )}
                </div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-green-100 dark:bg-green-900/30 flex-shrink-0 transition-transform duration-300 hover:scale-110">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <ChatterStatsCard
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.conversions', defaultMessage: 'Conversions' })}
            value={chatter.totalClients + chatter.totalRecruits}
            subValue={intl.formatMessage(
              { id: 'chatter.stats.breakdown', defaultMessage: '{clients} clients, {recruits} recrutés' },
              { clients: chatter.totalClients, recruits: chatter.totalRecruits }
            )}
            gradient="from-red-600 to-pink-600"
            iconBg="bg-red-100 dark:bg-red-900/30"
            loading={isLoading}
            animationDelay={50}
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
            animationDelay={100}
          />

          <ChatterStatsCard
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />}
            label={intl.formatMessage({ id: 'chatter.stats.totalEarned', defaultMessage: 'Total gagne' })}
            value={formatAmount(chatter.totalEarned)}
            gradient="from-emerald-600 to-teal-600"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            loading={isLoading}
            animationDelay={150}
          />
        </div>

        {/* Tier Progress Card */}
        {nextTier && (
          <div className={`${UI.card} p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/30`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    <FormattedMessage
                      id="chatter.tier.progress"
                      defaultMessage="Prochain palier: {tier} filleuls"
                      values={{ tier: nextTier.tier }}
                    />
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.tier.needed"
                      defaultMessage="Plus que {needed} recrutements pour debloquer"
                      values={{ needed: nextTier.needed }}
                    />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{nextTier.bonus}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.tier.bonus" defaultMessage="Bonus" />
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-amber-200 dark:bg-amber-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((tierProgress?.qualifiedFilleulsCount || 0) / nextTier.tier) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{tierProgress?.qualifiedFilleulsCount || 0} qualifies</span>
                <span>{nextTier.tier} requis</span>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Calculator Card - Lazy loaded */}
        <Suspense fallback={<CardSkeleton height="h-64" />}>
          <RevenueCalculatorCard
            currentCalls={commissionBreakdown.clientCalls}
            n1TeamSize={referralStats?.totalFilleulsN1 || 0}
            n1TeamCalls={commissionBreakdown.n1Calls}
            n2TeamSize={referralStats?.totalFilleulsN2 || 0}
            n2TeamCalls={commissionBreakdown.n2Calls}
            paidTierBonuses={tierProgress?.paidTierBonuses || []}
            onRecruit={navigateToRefer}
            loading={isLoading || referralsLoading}
          />
        </Suspense>

        {/* Insights Section - Lazy loaded */}
        {(dashboardData?.trends || dashboardData?.comparison || dashboardData?.forecast) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.insights.title" defaultMessage="Insights & Projections" />
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData?.trends && (
                <Suspense fallback={<CardSkeleton height="h-48" />}>
                  <TrendsChartCard
                    thisWeekData={dashboardData.trends.earningsWeekly}
                    lastWeekData={dashboardData.trends.earningsMonthly}
                    loading={isLoading}
                    animationDelay={200}
                  />
                </Suspense>
              )}
              {dashboardData?.comparison && (
                <Suspense fallback={<CardSkeleton height="h-48" />}>
                  <ComparisonStatsCard
                    thisMonth={{
                      earnings: dashboardData.monthlyStats.earnings,
                      clients: dashboardData.monthlyStats.clients,
                      recruits: dashboardData.monthlyStats.recruits,
                    }}
                    lastMonth={dashboardData.comparison.lastMonth}
                    loading={isLoading}
                    animationDelay={250}
                  />
                </Suspense>
              )}
              {dashboardData?.forecast && (
                <Suspense fallback={<CardSkeleton height="h-48" />}>
                  <ForecastCard
                    currentMonthEarnings={dashboardData.monthlyStats.earnings}
                    totalEarned={chatter.totalEarned}
                    currentLevel={chatter.level as 1 | 2 | 3 | 4 | 5}
                    qualifiedReferrals={tierProgress?.qualifiedFilleulsCount || 0}
                    paidTierBonuses={tierProgress?.paidTierBonuses || []}
                    currentDayOfMonth={dashboardData.forecast.currentDayOfMonth}
                    loading={isLoading}
                    animationDelay={300}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}

        {/* Daily Missions & Weekly Challenge - Lazy loaded */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div data-tour="missions-card">
            <Suspense fallback={<CardSkeleton height="h-80" />}>
              <DailyMissionsCard
                streak={chatter.currentStreak}
                bestStreak={chatter.bestStreak}
                onAllComplete={handleAllMissionsComplete}
                loading={isLoading}
              />
            </Suspense>
          </div>
          <div data-tour="leaderboard">
            <Suspense fallback={<CardSkeleton height="h-80" />}>
              <WeeklyChallengeCard
                challenge={null}
                myRank={chatter.currentMonthRank ?? null}
                myScore={thisMonthCommissions.length}
                userId={user?.uid || ''}
                loading={isLoading}
                onCtaClick={handleWeeklyChallengeClick}
              />
            </Suspense>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Affiliate Links - Lazy loaded */}
            <div data-tour="affiliate-links">
              <Suspense fallback={<CardSkeleton height="h-48" />}>
                <ChatterAffiliateLinks
                  affiliateCodeClient={chatter.affiliateCodeClient || ''}
                  affiliateCodeRecruitment={chatter.affiliateCodeRecruitment || ''}
                  clientLinkUrl={clientShareUrl}
                  recruitmentLinkUrl={recruitmentShareUrl}
                  totalClientConversions={chatter.totalClients}
                  totalRecruitmentConversions={chatter.totalRecruits}
                />
              </Suspense>
            </div>

            {/* Motivation Widget - Lazy loaded */}
            <Suspense fallback={<CardSkeleton height="h-64" />}>
              <MotivationWidget
                level={chatter.level}
                totalEarned={chatter.totalEarned}
                nextLevelThreshold={getNextLevelThreshold(chatter.level)}
                monthlyRank={chatter.currentMonthRank ?? undefined}
                currentStreak={chatter.currentStreak}
                clientShareUrl={clientShareUrl}
                recruitmentShareUrl={recruitmentShareUrl}
                onViewLeaderboard={navigateToLeaderboard}
                loading={isLoading}
                defaultExpanded={true}
              />
            </Suspense>

            {/* Recent Commissions - Using memoized items */}
            <div className={`${UI.card} overflow-hidden`}>
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <FormattedMessage id="chatter.dashboard.recentCommissions" defaultMessage="Commissions récentes" />
                </h3>
                <button
                  onClick={navigateToPayments}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 min-h-[44px] px-3 -mr-3 active:opacity-70"
                  aria-label={intl.formatMessage({ id: 'chatter.dashboard.viewAllCommissions', defaultMessage: 'View all commissions' })}
                >
                  <FormattedMessage id="common.viewAll" defaultMessage="Voir tout" />
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
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
                    onClick={navigateToRefer}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    aria-label={intl.formatMessage({ id: 'chatter.dashboard.startSharing.aria', defaultMessage: 'Start sharing referral links' })}
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    <FormattedMessage id="chatter.dashboard.startSharing" defaultMessage="Commencer à partager" />
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {recentCommissions.map((commission) => (
                    <CommissionItem
                      key={commission.id}
                      commission={commission}
                      formatAmount={formatAmount}
                      locale={intl.locale}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Balance Card - Critical, loaded synchronously */}
            <div data-tour="balance-card">
              <ChatterBalanceCard
                availableBalance={chatter.availableBalance}
                pendingBalance={chatter.pendingBalance}
                validatedBalance={chatter.validatedBalance}
                minimumWithdrawal={minimumWithdrawal}
                canWithdraw={canWithdraw}
                hasPendingWithdrawal={!!chatter.pendingWithdrawalId}
                onWithdraw={navigateToPayments}
                loading={isLoading}
                animationDelay={200}
              />
            </div>

            {/* Earnings Motivation Card - Shows cumulative earnings & motivation */}
            <EarningsMotivationCard
              totalEarned={chatter.totalEarned}
              monthlyEarnings={dashboardData?.monthlyStats?.earnings || 0}
              lastMonthEarnings={dashboardData?.comparison?.lastMonth?.earnings}
              currentStreak={chatter.currentStreak}
              totalClients={chatter.totalClients}
              totalRecruits={chatter.totalRecruits}
              memberSince={chatter.createdAt}
              monthlyRank={chatter.currentMonthRank}
              onViewLeaderboard={navigateToLeaderboard}
              loading={isLoading}
              animationDelay={250}
            />

            {/* Earnings Breakdown Card - Shows earnings sources with donut chart */}
            {chatter.totalEarned > 0 && (
              <Suspense fallback={<CardSkeleton height="h-80" />}>
                <EarningsBreakdownCard
                  earnings={earningsByCategory}
                  totalEarnings={chatter.totalEarned}
                  onSegmentClick={handleEarningsSegmentClick}
                  selectedCategory={selectedEarningsCategory}
                  loading={isLoading}
                />
              </Suspense>
            )}

            {/* Piggy Bank Card - Critical, loaded synchronously */}
            {piggyBankData && (
              <div data-tour="piggy-bank">
                <PiggyBankCard
                  piggyBank={piggyBankData}
                  onClaim={handlePiggyBankClaim}
                  loading={isLoading}
                />
              </div>
            )}

            {/* Level Card - Critical, loaded synchronously */}
            <ChatterLevelCard
              level={chatter.level as 1 | 2 | 3 | 4 | 5}
              totalEarned={chatter.totalEarned}
              currentStreak={chatter.currentStreak}
              bestStreak={chatter.bestStreak}
              monthlyRank={chatter.currentMonthRank ?? undefined}
              loading={isLoading}
              animationDelay={300}
            />

            {/* Achievement Badges - Lazy loaded */}
            {achievementBadgesChatterData && (
              <Suspense fallback={<CardSkeleton height="h-48" />}>
                <AchievementBadgesCard
                  earnedBadges={chatter.badges || []}
                  chatter={achievementBadgesChatterData}
                  loading={isLoading}
                  animationDelay={350}
                  variant="compact"
                />
              </Suspense>
            )}

            {/* Live Activity Feed - Lazy loaded */}
            <Suspense fallback={<CardSkeleton height="h-64" />}>
              <LiveActivityFeed
                maxItems={5}
                showHeader={true}
                compact={true}
                loading={isLoading}
              />
            </Suspense>

            {/* Earnings Ratio Card - Lazy loaded */}
            {(earningsData.affiliation > 0 || earningsData.referral > 0) && (
              <Suspense fallback={<CardSkeleton height="h-32" />}>
                <EarningsRatioCard
                  affiliationEarnings={earningsData.affiliation}
                  referralEarnings={earningsData.referral}
                  isLoading={isLoading || referralsLoading}
                />
              </Suspense>
            )}

            {/* Team Quick Stats */}
            {referralStats && (
              <div data-tour="team-card" className={`${UI.card} p-4 sm:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    <FormattedMessage id="chatter.referrals.myTeam" defaultMessage="Mon Equipe" />
                  </h3>
                  <button
                    onClick={navigateToReferrals}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 min-h-[44px] px-2 -mr-2 active:opacity-70"
                    aria-label={intl.formatMessage({ id: 'chatter.referrals.manageTeam', defaultMessage: 'Manage team' })}
                  >
                    <FormattedMessage id="common.manage" defaultMessage="Gerer" />
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                {teamSize === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Users className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <FormattedMessage id="chatter.referrals.noTeamYet" defaultMessage="Pas encore d'equipe" />
                    </p>
                    <button
                      onClick={navigateToRefer}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      aria-label={intl.formatMessage({ id: 'chatter.referrals.recruitFirst.aria', defaultMessage: 'Recruit your first team member' })}
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      <FormattedMessage id="chatter.referrals.recruitFirst" defaultMessage="Recruter mon premier chatter" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                          {referralStats.totalFilleulsN1}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <FormattedMessage id="chatter.referrals.directN1" defaultMessage="Directs (N1)" />
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">1$/appel</p>
                      </div>
                      <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                        <p className="text-2xl sm:text-3xl font-bold text-pink-600 dark:text-pink-400">
                          {referralStats.totalFilleulsN2}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <FormattedMessage id="chatter.referrals.indirectN2" defaultMessage="Indirects (N2)" />
                        </p>
                        <p className="text-xs text-pink-600 dark:text-pink-400 font-medium mt-0.5">0.50$/appel</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            <FormattedMessage id="chatter.referrals.passiveIncome" defaultMessage="Revenus passifs" />
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          <TrendingUp className="w-3 h-3" />
                          <FormattedMessage id="chatter.referrals.recurring" defaultMessage="Recurrent" />
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        +{formatAmount(referralStats.monthlyReferralEarnings || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <FormattedMessage id="chatter.referrals.passiveDesc" defaultMessage="Ce mois, sans rien faire de plus" />
                      </p>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        <FormattedMessage id="chatter.referrals.ratesReminder" defaultMessage="Chaque appel de votre equipe vous rapporte automatiquement !" />
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Referral Tree Card - Lazy loaded, heavy visualization */}
        {teamSize > 0 && (
          <Suspense fallback={<LargeCardSkeleton />}>
            <ReferralTreeCard
              stats={referralStats}
              filleulsN1={filleulsN1}
              filleulsN2={filleulsN2}
              isLoading={referralsLoading}
              onRefresh={refreshReferrals}
              onViewMember={handleViewMember}
            />
          </Suspense>
        )}

        {/* Team Management Card - Lazy loaded, very heavy component */}
        {teamSize > 0 && (
          <Suspense fallback={<LargeCardSkeleton />}>
            <TeamManagementCard
              stats={referralStats}
              filleulsN1={filleulsN1}
              filleulsN2={filleulsN2}
              qualifiedCount={tierProgress?.qualifiedFilleulsCount || 0}
              paidTiers={tierProgress?.paidTierBonuses || []}
              isLoading={referralsLoading}
              onInvite={navigateToRefer}
              onViewMember={handleViewMember}
              onMessageMember={handleMessageMember}
              onRefresh={refreshReferrals}
            />
          </Suspense>
        )}

        {/* PWA Install Cards - inline in dashboard */}
        <div className="px-4 sm:px-6 py-3">
          <PWAInstallCards />
        </div>
      </div>

      {/* Success Feedback */}
      <ConfettiCelebration show={feedbackState.confetti} />
      <Toast
        show={feedbackState.toast.show}
        type={feedbackState.toast.type}
        title={feedbackState.toast.title}
        message={feedbackState.toast.message}
        amount={feedbackState.toast.amount}
        onClose={hideToast}
      />

      {/* Quick Actions FAB - Lazy loaded */}
      <div data-tour="quick-actions">
        <Suspense fallback={null}>
          <QuickActionsMenu
            affiliateLink={clientShareUrl}
            canWithdraw={canWithdraw}
            availableBalance={chatter.availableBalance}
            minimumWithdrawal={minimumWithdrawal}
            hasIncompleteTraining={false}
            onShareLink={handleShareLinkSuccess}
            onViewEarnings={navigateToPayments}
            onInviteTeam={navigateToRefer}
            onContinueTraining={navigateToTraining}
            onRequestWithdrawal={navigateToPayments}
          />
        </Suspense>
      </div>

      {/* Dashboard Tour - Lazy loaded */}
      <Suspense fallback={null}>
        <DashboardTour
          isNewChatter={chatter.totalCommissions === 0}
          totalCommissions={chatter.totalCommissions}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      </Suspense>
    </ChatterDashboardLayout>
  );
};

export default ChatterDashboard;
