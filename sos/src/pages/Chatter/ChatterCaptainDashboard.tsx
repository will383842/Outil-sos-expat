/**
 * ChatterCaptainDashboard - Team dashboard for captain chatters
 *
 * Displays:
 * - Monthly team calls gauge with tier progression
 * - Current tier badge (Bronze/Argent/Or/Platine/Diamant)
 * - N1 recruits (direct) with call counts
 * - N2 recruits (indirect) with call counts
 * - Monthly captain_call commissions history
 * - Monthly archives (past months)
 *
 * Calls getCaptainDashboard callable (us-central1) on mount.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Users,
  Trophy,
  TrendingUp,
  Phone,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  Crown,
  Gem,
  Shield,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface Recruit {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country?: string;
  totalCallCount: number;
  totalEarned: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  recruitedVia?: string; // only N2
}

interface Commission {
  id: string;
  type?: string;
  amount: number;
  description?: string;
  status: string;
  sourceDetails?: Record<string, unknown>;
  createdAt: string | { _seconds: number; _nanoseconds: number };
}

interface Archive {
  id: string;
  month: number;
  year: number;
  teamCalls: number;
  tierName: string;
  bonusAmount: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  [key: string]: unknown;
}

interface TierInfo {
  name: string;
  bonus: number;
  minCalls?: number;
}

interface QualityBonusStatus {
  activeN1Count: number;
  minRecruits: number;
  monthlyTeamCommissions: number;
  minCommissions: number;
  criteriaMet: boolean;
  adminOverride: boolean;
  qualified: boolean;
  bonusAmount: number;
}

interface CaptainDashboardData {
  captainInfo: {
    captainPromotedAt: string | { _seconds: number; _nanoseconds: number } | null;
    captainMonthlyTeamCalls: number;
    captainQualityBonusEnabled: boolean;
  };
  qualityBonusStatus?: QualityBonusStatus;
  tierProgression: {
    currentTier: TierInfo | null;
    nextTier: (TierInfo & { minCalls: number }) | null;
    callsToNext: number;
    progressPercent: number;
  };
  n1Recruits: Recruit[];
  n2Recruits: Recruit[];
  monthlyCommissions: Commission[];
  recentCommissions: Commission[];
  archives: Archive[];
  tiers: Array<{ name: string; minCalls: number; bonus: number }>;
}

// ============================================================================
// TIER VISUALS
// ============================================================================

const TIER_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; gradient: string }> = {
  Bronze: {
    icon: <Shield className="h-6 w-6" />,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
    gradient: "from-amber-500 to-amber-700",
  },
  Argent: {
    icon: <Star className="h-6 w-6" />,
    color: "text-gray-500 dark:text-gray-300",
    bg: "bg-gray-100 dark:bg-gray-700/30",
    border: "border-gray-300 dark:border-gray-600",
    gradient: "from-gray-400 to-gray-600",
  },
  Or: {
    icon: <Award className="h-6 w-6" />,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-300 dark:border-yellow-700",
    gradient: "from-yellow-400 to-yellow-600",
  },
  Platine: {
    icon: <Crown className="h-6 w-6" />,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    border: "border-cyan-300 dark:border-cyan-700",
    gradient: "from-cyan-400 to-cyan-600",
  },
  Diamant: {
    icon: <Gem className="h-6 w-6" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    gradient: "from-purple-400 to-purple-600",
  },
};

const DEFAULT_TIER_STYLE = TIER_CONFIG.Bronze;

// ============================================================================
// HELPERS
// ============================================================================

function parseTimestamp(ts: string | { _seconds: number; _nanoseconds: number } | null | undefined): Date | null {
  if (!ts) return null;
  if (typeof ts === 'string') return new Date(ts);
  if (typeof ts === 'object' && '_seconds' in ts) return new Date(ts._seconds * 1000);
  return null;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ============================================================================
// SKELETON
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Gauge skeleton */}
      <div className={`${UI.card} p-6`}>
        <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-full mb-3" />
        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className={`${UI.card} p-6`}>
            <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-12 bg-gray-200 dark:bg-white/10 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Commission skeleton */}
      <div className={`${UI.card} p-6`}>
        <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RECRUIT ROW
// ============================================================================

interface RecruitRowProps {
  recruit: Recruit;
  locale: string;
}

function RecruitRow({ recruit, locale }: RecruitRowProps) {
  const intl = useIntl();
  const joinDate = parseTimestamp(recruit.createdAt);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      {/* Avatar */}
      {recruit.photoUrl ? (
        <img
          src={recruit.photoUrl}
          alt={recruit.firstName}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {recruit.firstName} {recruit.lastName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {recruit.country && <span>{recruit.country}</span>}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {joinDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Earnings badge */}
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
          title={intl.formatMessage({ id: 'chatter.captain.recruitEarnings', defaultMessage: 'Gains totaux' })}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span className="text-sm font-bold">{formatCents(recruit.totalEarned)}</span>
        </div>
        {/* Call count badge */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          <Phone className="h-3.5 w-3.5" />
          <span className="text-sm font-bold">{recruit.totalCallCount}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ChatterCaptainDashboard() {
  const intl = useIntl();
  const { user } = useAuth();
  const locale = intl.locale;

  const [data, setData] = useState<CaptainDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expandable sections
  const [showN1, setShowN1] = useState(true);
  const [showN2, setShowN2] = useState(false);
  const [showCommissions, setShowCommissions] = useState(true);
  const [showArchives, setShowArchives] = useState(false);

  // --------------------------------------------------
  // Fetch data
  // --------------------------------------------------
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const callable = httpsCallable<void, CaptainDashboardData>(functionsAffiliate, 'getCaptainDashboard');
      const result = await callable();
      setData(result.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[CaptainDashboard] Error:', message);
      setError(message);
      toast.error(
        intl.formatMessage({
          id: 'chatter.captain.loadError',
          defaultMessage: 'Impossible de charger le tableau de bord capitaine.',
        })
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [intl]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // --------------------------------------------------
  // Derived data
  // --------------------------------------------------
  const teamCalls = data?.captainInfo.captainMonthlyTeamCalls ?? 0;
  const currentTier = data?.tierProgression.currentTier;
  const nextTier = data?.tierProgression.nextTier;
  const progressPercent = data?.tierProgression.progressPercent ?? 0;
  const callsToNext = data?.tierProgression.callsToNext ?? 0;

  const tierStyle = currentTier ? (TIER_CONFIG[currentTier.name] || DEFAULT_TIER_STYLE) : DEFAULT_TIER_STYLE;
  const nextTierStyle = nextTier ? (TIER_CONFIG[nextTier.name] || DEFAULT_TIER_STYLE) : null;

  // All tiers for the progression visual
  const allTiers = useMemo(() => data?.tiers ?? [], [data]);

  // Monthly commissions total
  const monthlyCommissionsTotal = useMemo(() => {
    if (!data?.monthlyCommissions) return 0;
    return data.monthlyCommissions.reduce((sum, c) => sum + c.amount, 0);
  }, [data?.monthlyCommissions]);

  // Current month label
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [locale]);

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------
  if (loading) {
    return <DashboardSkeleton />;
  }

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          {error}
        </p>
        <button
          onClick={() => fetchDashboard()}
          className={`${UI.button.primary} px-6 py-2.5`}
        >
          <FormattedMessage id="chatter.captain.retry" defaultMessage="Réessayer" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* HEADER */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.captain.title" defaultMessage="Tableau de bord Capitaine" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {currentMonthLabel}
          </p>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className={`${UI.button.secondary} p-2.5`}
          title={intl.formatMessage({ id: 'chatter.captain.refresh', defaultMessage: 'Actualiser' })}
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ============================================================== */}
      {/* TIER BADGE + GAUGE */}
      {/* ============================================================== */}
      <div className={`${UI.card} p-5 sm:p-6`}>
        {/* Current tier badge */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border ${tierStyle.bg} ${tierStyle.border}`}>
            <span className={tierStyle.color}>{tierStyle.icon}</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                <FormattedMessage id="chatter.captain.currentTier" defaultMessage="Palier actuel" />
              </p>
              <p className={`text-lg font-extrabold ${tierStyle.color}`}>
                {currentTier?.name || (
                  <FormattedMessage id="chatter.captain.noTier" defaultMessage="Aucun palier" />
                )}
              </p>
            </div>
          </div>

          {/* Team calls counter */}
          <div className="flex items-center gap-2 ml-auto">
            <Phone className="h-5 w-5 text-gray-400" />
            <span className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
              {teamCalls}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.captain.teamCalls" defaultMessage="appels equipe" />
            </span>
          </div>
        </div>

        {/* Progress gauge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {currentTier?.name ?? (
                <FormattedMessage id="chatter.captain.start" defaultMessage="Debut" />
              )}
            </span>
            {nextTier && (
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                {nextTier.name} ({nextTier.minCalls}
                <FormattedMessage id="chatter.captain.callsShort" defaultMessage=" appels" />)
              </span>
            )}
            {!nextTier && currentTier && (
              <span className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                <Gem className="h-3 w-3" />
                <FormattedMessage id="chatter.captain.maxTier" defaultMessage="Palier maximum atteint !" />
              </span>
            )}
          </div>

          {/* Bar */}
          <div className="relative h-4 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${
                nextTierStyle ? nextTierStyle.gradient : tierStyle.gradient
              } rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
            {/* Tier markers */}
            {allTiers.map((tier) => {
              // Compute position relative to next tier or max
              const maxCalls = nextTier ? nextTier.minCalls : (allTiers[allTiers.length - 1]?.minCalls || 1);
              const pos = Math.min(100, (tier.minCalls / maxCalls) * 100);
              if (pos <= 0 || pos > 100) return null;
              return (
                <div
                  key={tier.name}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60 dark:bg-white/20"
                  style={{ left: `${pos}%` }}
                  title={`${tier.name}: ${tier.minCalls} appels`}
                />
              );
            })}
          </div>

          {/* Calls to next */}
          {nextTier && callsToNext > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <FormattedMessage
                id="chatter.captain.callsToNext"
                defaultMessage="Encore {count} appels pour atteindre {tier}"
                values={{
                  count: <span className="font-bold text-gray-900 dark:text-white">{callsToNext}</span>,
                  tier: <span className={`font-bold ${nextTierStyle?.color || ''}`}>{nextTier.name}</span>,
                }}
              />
            </p>
          )}
        </div>

        {/* All tiers overview */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {allTiers.map((tier) => {
            const style = TIER_CONFIG[tier.name] || DEFAULT_TIER_STYLE;
            const isReached = teamCalls >= tier.minCalls;
            const isCurrent = currentTier?.name === tier.name;

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col items-center p-2.5 rounded-xl border transition-all ${
                  isCurrent
                    ? `${style.bg} ${style.border} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 ${style.border}`
                    : isReached
                      ? `${style.bg} ${style.border} opacity-60`
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-40'
                }`}
              >
                <span className={isReached ? style.color : 'text-gray-400 dark:text-gray-600'}>
                  {(TIER_CONFIG[tier.name] || DEFAULT_TIER_STYLE).icon}
                </span>
                <p className={`text-xs font-bold mt-1 ${isReached ? style.color : 'text-gray-400 dark:text-gray-600'}`}>
                  {tier.name}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {tier.minCalls} <FormattedMessage id="chatter.captain.callsUnit" defaultMessage="appels" />
                </p>
                <p className="text-[10px] font-semibold text-green-600 dark:text-green-400">
                  +{formatCents(tier.bonus)}
                </p>
                {isCurrent && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* STATS ROW */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* N1 count */}
        <div className={`${UI.card} p-4 text-center`}>
          <Users className="h-5 w-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-white">{data.n1Recruits.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.captain.n1Count" defaultMessage="Recrues N1" />
          </p>
        </div>
        {/* N2 count */}
        <div className={`${UI.card} p-4 text-center`}>
          <Users className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-white">{data.n2Recruits.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.captain.n2Count" defaultMessage="Recrues N2" />
          </p>
        </div>
        {/* Monthly commissions */}
        <div className={`${UI.card} p-4 text-center`}>
          <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{formatCents(monthlyCommissionsTotal)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.captain.monthlyEarnings" defaultMessage="Gains ce mois" />
          </p>
        </div>
        {/* Current tier bonus */}
        <div className={`${UI.card} p-4 text-center`}>
          <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
            {currentTier ? formatCents(currentTier.bonus) : '$0'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.captain.tierBonus" defaultMessage="Bonus palier" />
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QUALITY BONUS STATUS */}
      {/* ============================================================== */}
      {data.qualityBonusStatus && (
        <div className={`${UI.card} p-5 sm:p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              data.qualityBonusStatus.qualified
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-white/10'
            }`}>
              <Sparkles className={`h-5 w-5 ${
                data.qualityBonusStatus.qualified ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
              }`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.captain.qualityBonus.title" defaultMessage="Bonus qualité mensuel" />
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data.qualityBonusStatus.qualified ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    <FormattedMessage
                      id="chatter.captain.qualityBonus.qualified"
                      defaultMessage="Qualifié — +{amount} ce mois"
                      values={{ amount: formatCents(data.qualityBonusStatus.bonusAmount) }}
                    />
                  </span>
                ) : (
                  <FormattedMessage id="chatter.captain.qualityBonus.notQualified" defaultMessage="Critères non atteints ce mois" />
                )}
              </p>
            </div>
          </div>

          {/* Criteria progress bars */}
          <div className="space-y-4">
            {/* N1 Recruits criterion */}
            {(() => {
              const qb = data.qualityBonusStatus!;
              const recruitsPercent = qb.minRecruits > 0 ? Math.min(100, Math.round((qb.activeN1Count / qb.minRecruits) * 100)) : 0;
              const recruitsMet = qb.activeN1Count >= qb.minRecruits;
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      {recruitsMet ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={recruitsMet ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                        <FormattedMessage id="chatter.captain.qualityBonus.recruits" defaultMessage="Recrues actives" />
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${recruitsMet ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {qb.activeN1Count}/{qb.minRecruits}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${recruitsMet ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${recruitsPercent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Monthly commissions criterion */}
            {(() => {
              const qb = data.qualityBonusStatus!;
              const commPercent = qb.minCommissions > 0 ? Math.min(100, Math.round((qb.monthlyTeamCommissions / qb.minCommissions) * 100)) : 0;
              const commMet = qb.monthlyTeamCommissions >= qb.minCommissions;
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      {commMet ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={commMet ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                        <FormattedMessage id="chatter.captain.qualityBonus.commissions" defaultMessage="Commissions équipe" />
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${commMet ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {formatCents(qb.monthlyTeamCommissions)}/{formatCents(qb.minCommissions)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${commMet ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${commPercent}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* N1 RECRUITS */}
      {/* ============================================================== */}
      <div className={UI.card}>
        <button
          onClick={() => setShowN1(!showN1)}
          className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.captain.n1Title" defaultMessage="Recrues directes (N1)" />
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.captain.n1Subtitle"
                  defaultMessage="{count} chatters recrutes"
                  values={{ count: data.n1Recruits.length }}
                />
              </p>
            </div>
          </div>
          {showN1 ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showN1 && (
          <div className="px-4 sm:px-5 pb-5 space-y-1">
            {data.n1Recruits.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                <FormattedMessage id="chatter.captain.noRecruits" defaultMessage="Aucune recrue pour le moment." />
              </p>
            ) : (
              data.n1Recruits.map((recruit) => (
                <RecruitRow key={recruit.id} recruit={recruit} locale={locale} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* N2 RECRUITS */}
      {/* ============================================================== */}
      <div className={UI.card}>
        <button
          onClick={() => setShowN2(!showN2)}
          className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.captain.n2Title" defaultMessage="Recrues indirectes (N2)" />
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.captain.n2Subtitle"
                  defaultMessage="{count} chatters via vos N1"
                  values={{ count: data.n2Recruits.length }}
                />
              </p>
            </div>
          </div>
          {showN2 ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showN2 && (
          <div className="px-4 sm:px-5 pb-5 space-y-1">
            {data.n2Recruits.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                <FormattedMessage id="chatter.captain.noRecruits" defaultMessage="Aucune recrue pour le moment." />
              </p>
            ) : (
              data.n2Recruits.map((recruit) => (
                <RecruitRow key={recruit.id} recruit={recruit} locale={locale} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MONTHLY COMMISSIONS */}
      {/* ============================================================== */}
      <div className={UI.card}>
        <button
          onClick={() => setShowCommissions(!showCommissions)}
          className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.captain.commissionsTitle" defaultMessage="Commissions capitaine" />
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {currentMonthLabel} &mdash; {formatCents(monthlyCommissionsTotal)}
              </p>
            </div>
          </div>
          {showCommissions ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showCommissions && (
          <div className="px-4 sm:px-5 pb-5">
            {data.recentCommissions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                <FormattedMessage id="chatter.captain.noCommissions" defaultMessage="Aucune commission pour le moment." />
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentCommissions.map((commission) => {
                  const date = parseTimestamp(commission.createdAt);
                  const typeLabel = commission.type === 'captain_call'
                    ? intl.formatMessage({ id: 'chatter.captain.commissionTypeCall', defaultMessage: 'Appel equipe' })
                    : commission.type === 'captain_tier_bonus'
                      ? intl.formatMessage({ id: 'chatter.captain.commissionTypeTier', defaultMessage: 'Bonus palier' })
                      : commission.type === 'captain_quality_bonus'
                        ? intl.formatMessage({ id: 'chatter.captain.commissionTypeQuality', defaultMessage: 'Bonus qualite' })
                        : commission.type || '—';

                  return (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          commission.status === 'available'
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-yellow-100 dark:bg-yellow-900/20'
                        }`}>
                          {commission.type === 'captain_tier_bonus' ? (
                            <Trophy className={`h-4 w-4 ${commission.status === 'available' ? 'text-green-600' : 'text-yellow-600'}`} />
                          ) : commission.type === 'captain_quality_bonus' ? (
                            <Star className={`h-4 w-4 ${commission.status === 'available' ? 'text-green-600' : 'text-yellow-600'}`} />
                          ) : (
                            <Phone className={`h-4 w-4 ${commission.status === 'available' ? 'text-green-600' : 'text-yellow-600'}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {typeLabel}
                          </p>
                          {date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          +{formatCents(commission.amount)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          commission.status === 'available'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {commission.status === 'available'
                            ? intl.formatMessage({ id: 'chatter.captain.statusAvailable', defaultMessage: 'Disponible' })
                            : intl.formatMessage({ id: 'chatter.captain.statusPending', defaultMessage: 'En attente' })
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MONTHLY ARCHIVES */}
      {/* ============================================================== */}
      {data.archives.length > 0 && (
        <div className={UI.card}>
          <button
            onClick={() => setShowArchives(!showArchives)}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  <FormattedMessage id="chatter.captain.archivesTitle" defaultMessage="Archives mensuelles" />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.captain.archivesSubtitle"
                    defaultMessage="{count} mois d'historique"
                    values={{ count: data.archives.length }}
                  />
                </p>
              </div>
            </div>
            {showArchives ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {showArchives && (
            <div className="px-4 sm:px-5 pb-5 space-y-2">
              {data.archives.map((archive) => {
                const archiveStyle = TIER_CONFIG[archive.tierName] || DEFAULT_TIER_STYLE;
                const monthDate = new Date(archive.year, archive.month - 1);
                const monthLabel = monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

                return (
                  <div
                    key={archive.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${archiveStyle.bg} ${archiveStyle.border}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={archiveStyle.color}>
                        {(TIER_CONFIG[archive.tierName] || DEFAULT_TIER_STYLE).icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                          {monthLabel}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {archive.teamCalls} <FormattedMessage id="chatter.captain.callsUnit" defaultMessage="appels" />
                          {' '}&middot;{' '}
                          <span className={`font-medium ${archiveStyle.color}`}>{archive.tierName}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      +{formatCents(archive.bonusAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PAGE EXPORT (wrapped in layout)
// ============================================================================

export default function ChatterCaptainDashboardPage() {
  return (
    <ChatterDashboardLayout>
      <ChatterCaptainDashboard />
    </ChatterDashboardLayout>
  );
}
