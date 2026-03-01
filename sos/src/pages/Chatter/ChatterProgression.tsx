/**
 * ChatterProgression - "Ma Progression" page
 * Consolidated view of chatter progression: level, recruitment tiers,
 * overall stats, piggy bank, captain tier (if captain), captain teaser (if not).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import {
  TrendingUp,
  Star,
  Trophy,
  Flame,
  Award,
  Shield,
  Crown,
  Gem,
  Users,
  Target,
  Sparkles,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useChatter } from '@/hooks/useChatter';
import { useChatterReferrals, getNextTierInfo } from '@/hooks/useChatterReferrals';
import { functionsAffiliate } from '@/config/firebase';
import { db } from '@/config/firebase';
import { PiggyBankCard } from '@/components/Chatter/Cards';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
};

// ============================================================================
// LEVEL CONFIG
// ============================================================================

const LEVEL_NAMES: Record<number, { fr: string; en: string }> = {
  1: { fr: 'Débutant', en: 'Beginner' },
  2: { fr: 'Amateur', en: 'Amateur' },
  3: { fr: 'Confirmé', en: 'Confirmed' },
  4: { fr: 'Expert', en: 'Expert' },
  5: { fr: 'Élite', en: 'Elite' },
};

const LEVEL_COLORS: Record<number, { bg: string; text: string; gradient: string }> = {
  1: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', gradient: 'from-gray-400 to-gray-500' },
  2: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', gradient: 'from-green-400 to-green-600' },
  3: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-400 to-blue-600' },
  4: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', gradient: 'from-purple-400 to-purple-600' },
  5: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', gradient: 'from-yellow-400 to-yellow-500' },
};

// ============================================================================
// RECRUITMENT TIER CONFIG
// ============================================================================

const RECRUITMENT_MILESTONES = [
  { count: 5, bonus: '$15' },
  { count: 10, bonus: '$35' },
  { count: 20, bonus: '$75' },
  { count: 50, bonus: '$250' },
  { count: 100, bonus: '$600' },
  { count: 500, bonus: '$4,000' },
];

// ============================================================================
// CAPTAIN TIER CONFIG
// ============================================================================

interface TierInfo {
  name: string;
  bonus: number;
  minCalls?: number;
}

interface CaptainDashboardData {
  captainInfo: {
    captainPromotedAt: string | { _seconds: number; _nanoseconds: number } | null;
    captainMonthlyTeamCalls: number;
    captainQualityBonusEnabled: boolean;
  };
  tierProgression: {
    currentTier: TierInfo | null;
    nextTier: (TierInfo & { minCalls: number }) | null;
    callsToNext: number;
    progressPercent: number;
  };
  tiers: Array<{ name: string; minCalls: number; bonus: number }>;
  n1Recruits: unknown[];
  n2Recruits: unknown[];
  monthlyCommissions: unknown[];
  recentCommissions: unknown[];
  archives: unknown[];
}

const CAPTAIN_TIER_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; gradient: string }> = {
  Bronze: {
    icon: <Shield className="h-5 w-5" />,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    gradient: "from-amber-500 to-amber-700",
  },
  Argent: {
    icon: <Star className="h-5 w-5" />,
    color: "text-gray-500 dark:text-gray-300",
    bg: "bg-gray-100 dark:bg-gray-700/30",
    gradient: "from-gray-400 to-gray-600",
  },
  Or: {
    icon: <Award className="h-5 w-5" />,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    gradient: "from-yellow-400 to-yellow-600",
  },
  Platine: {
    icon: <Crown className="h-5 w-5" />,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    gradient: "from-cyan-400 to-cyan-600",
  },
  Diamant: {
    icon: <Gem className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    gradient: "from-purple-400 to-purple-600",
  },
};

const DEFAULT_TIER_STYLE = {
  icon: <Shield className="h-5 w-5" />,
  color: "text-gray-500",
  bg: "bg-gray-100 dark:bg-gray-700/30",
  gradient: "from-gray-400 to-gray-500",
};

// ============================================================================
// SKELETON
// ============================================================================

function ProgressionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Level skeleton */}
      <div className={`${UI.card} p-6`}>
        <div className="h-7 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-gray-200 dark:bg-white/10 rounded-xl" />
          ))}
        </div>
        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-full mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
      </div>

      {/* Recruitment skeleton */}
      <div className={`${UI.card} p-6`}>
        <div className="h-7 bg-gray-200 dark:bg-white/10 rounded w-2/5 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-full mb-3" />
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-3 w-8 bg-gray-200 dark:bg-white/10 rounded" />
          ))}
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className={`${UI.card} p-6`}>
        <div className="h-7 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

/** Level Progression Section — gauge + 5 levels in a row */
function LevelProgressionSection({
  level,
  levelProgress,
  config,
  forecast,
  lang,
}: {
  level: number;
  levelProgress: number;
  config: { levelThresholds: Record<string, number> } | null;
  forecast: { estimatedNextLevel: string | null } | null;
  lang: string;
}) {
  const intl = useIntl();
  const isMax = level >= 5;
  const currentColors = LEVEL_COLORS[level] || LEVEL_COLORS[1];

  // Estimate days from forecast string (e.g., "2 weeks" → 14)
  const forecastDays = useMemo(() => {
    if (!forecast?.estimatedNextLevel) return null;
    const str = forecast.estimatedNextLevel.toLowerCase();
    const weekMatch = str.match(/(\d+)\s*week/);
    if (weekMatch) return parseInt(weekMatch[1]) * 7;
    const dayMatch = str.match(/(\d+)\s*day/);
    if (dayMatch) return parseInt(dayMatch[1]);
    const monthMatch = str.match(/(\d+)\s*month/);
    if (monthMatch) return parseInt(monthMatch[1]) * 30;
    return null;
  }, [forecast?.estimatedNextLevel]);

  return (
    <div className={`${UI.card} p-6`}>
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.level.title" defaultMessage="Mon Niveau" />
        </h2>
      </div>

      {/* 5 level badges in a row */}
      <div className="flex gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((l) => {
          const colors = LEVEL_COLORS[l];
          const isActive = l === level;
          const isPast = l < level;
          const name = LEVEL_NAMES[l]?.[lang === 'fr' ? 'fr' : 'en'] ?? `Lv.${l}`;

          return (
            <div
              key={l}
              className={`flex-1 text-center py-2.5 px-1 rounded-xl border-2 transition-all ${
                isActive
                  ? `${colors.bg} border-current ${colors.text} ring-2 ring-offset-2 ring-current dark:ring-offset-gray-900`
                  : isPast
                    ? `${colors.bg} border-transparent ${colors.text} opacity-70`
                    : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400 dark:text-gray-600'
              }`}
            >
              <div className={`text-lg font-black ${isActive ? '' : ''}`}>{l}</div>
              <div className="text-[10px] font-medium truncate">{name}</div>
            </div>
          );
        })}
      </div>

      {/* Progress bar to next level */}
      {!isMax ? (
        <>
          <div className="relative h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${currentColors.gradient} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, levelProgress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{Math.round(levelProgress)}%</span>
            <span>
              <FormattedMessage
                id="chatter.progression.level.next"
                defaultMessage="Prochain niveau"
              />
              {': '}
              {LEVEL_NAMES[level + 1]?.[lang === 'fr' ? 'fr' : 'en'] ?? `Lv.${level + 1}`}
            </span>
          </div>
          {forecastDays && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
              <FormattedMessage
                id="chatter.progression.level.forecast"
                defaultMessage="Estimation : {level} dans ~{days} jours"
                values={{
                  level: LEVEL_NAMES[level + 1]?.[lang === 'fr' ? 'fr' : 'en'] ?? `Lv.${level + 1}`,
                  days: forecastDays,
                }}
              />
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          <FormattedMessage id="chatter.progression.level.maxReached" defaultMessage="Niveau maximum atteint !" />
        </div>
      )}
    </div>
  );
}

/** Recruitment Tier Section — progress bar with milestones */
function RecruitmentTierSection({
  qualifiedCount,
  paidTierBonuses,
}: {
  qualifiedCount: number;
  paidTierBonuses: number[];
}) {
  const intl = useIntl();
  const nextTier = useMemo(
    () => getNextTierInfo(qualifiedCount, paidTierBonuses),
    [qualifiedCount, paidTierBonuses]
  );

  const maxMilestone = RECRUITMENT_MILESTONES[RECRUITMENT_MILESTONES.length - 1].count;
  const progressPercent = Math.min(100, (qualifiedCount / maxMilestone) * 100);

  return (
    <div className={`${UI.card} p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.recruitment.title" defaultMessage="Paliers de Recrutement" />
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <FormattedMessage id="chatter.progression.recruitment.subtitle" defaultMessage="Recrutez des chatters pour débloquer des bonus" />
      </p>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Milestone markers */}
        {RECRUITMENT_MILESTONES.map((m) => {
          const pos = (m.count / maxMilestone) * 100;
          const achieved = qualifiedCount >= m.count;
          return (
            <div
              key={m.count}
              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
                achieved ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={{ left: `${pos}%`, transform: `translate(-50%, -50%)` }}
              title={`${m.count} recrues → ${m.bonus}`}
            />
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-4">
        {RECRUITMENT_MILESTONES.map((m) => (
          <span
            key={m.count}
            className={qualifiedCount >= m.count ? 'text-green-600 dark:text-green-400 font-semibold' : ''}
          >
            {m.count}
          </span>
        ))}
      </div>

      {/* Qualified count + next bonus */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          <FormattedMessage
            id="chatter.progression.recruitment.qualified"
            defaultMessage="{count} filleuls qualifiés"
            values={{ count: qualifiedCount }}
          />
        </span>
        {nextTier ? (
          <span className="text-red-600 dark:text-red-400 font-semibold">
            <FormattedMessage
              id="chatter.progression.recruitment.nextBonus"
              defaultMessage="Prochain bonus : {amount} à {count} recrues"
              values={{ amount: nextTier.bonus, count: nextTier.tier }}
            />
          </span>
        ) : (
          <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <FormattedMessage id="chatter.progression.recruitment.allAchieved" defaultMessage="Tous les paliers atteints !" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Overall Stats Section — grid of mini-cards */
function OverallStatsSection({
  totalEarned,
  currentMonthRank,
  bestRank,
  currentStreak,
  bestStreak,
  badges,
}: {
  totalEarned: number;
  currentMonthRank: number | null;
  bestRank: number | null;
  currentStreak: number;
  bestStreak: number;
  badges: string[];
}) {
  const intl = useIntl();
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const stats = [
    {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.totalEarned', defaultMessage: 'Total gagné' }),
      value: formatCents(totalEarned),
      accent: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.monthRank', defaultMessage: 'Classement du mois' }),
      value: currentMonthRank
        ? `#${currentMonthRank}`
        : intl.formatMessage({ id: 'chatter.progression.stats.notRanked', defaultMessage: 'Non classé' }),
      accent: currentMonthRank ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400',
    },
    {
      icon: <Award className="h-5 w-5 text-orange-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.bestRank', defaultMessage: 'Meilleur classement' }),
      value: bestRank
        ? `#${bestRank}`
        : intl.formatMessage({ id: 'chatter.progression.stats.notRanked', defaultMessage: 'Non classé' }),
      accent: bestRank ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400',
    },
    {
      icon: <Flame className="h-5 w-5 text-red-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.currentStreak', defaultMessage: 'Série actuelle' }),
      value: intl.formatMessage({ id: 'chatter.progression.stats.days', defaultMessage: '{count}j' }, { count: currentStreak }),
      accent: currentStreak > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400',
    },
    {
      icon: <Flame className="h-5 w-5 text-purple-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.bestStreak', defaultMessage: 'Meilleure série' }),
      value: intl.formatMessage({ id: 'chatter.progression.stats.days', defaultMessage: '{count}j' }, { count: bestStreak }),
      accent: bestStreak > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400',
    },
    {
      icon: <Star className="h-5 w-5 text-blue-500" />,
      label: intl.formatMessage({ id: 'chatter.progression.stats.badges', defaultMessage: 'Badges obtenus' }),
      value: `${badges.length}`,
      accent: badges.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400',
    },
  ];

  return (
    <div className={`${UI.card} p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.stats.title" defaultMessage="Statistiques Globales" />
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
          >
            {stat.icon}
            <span className={`text-xl font-black mt-1 ${stat.accent}`}>{stat.value}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Piggy Bank Section — wraps existing PiggyBankCard */
function PiggyBankSection({
  piggyBank,
  isLoading,
}: {
  piggyBank: {
    isUnlocked: boolean;
    clientEarnings: number;
    unlockThreshold: number;
    progressPercent: number;
    amountToUnlock: number;
    totalPending: number;
    message: string;
  } | null;
  isLoading: boolean;
}) {
  // Don't show if already unlocked with no pending
  if (piggyBank?.isUnlocked && (piggyBank?.totalPending ?? 0) === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.piggyBank.title" defaultMessage="Tirelire Bonus" />
        </h2>
      </div>
      <PiggyBankCard piggyBank={piggyBank} loading={isLoading} />
    </div>
  );
}

/** Captain Tier Section — gauge Bronze → Diamant */
function CaptainTierSection({
  captainData,
}: {
  captainData: CaptainDashboardData;
}) {
  const intl = useIntl();
  const { tierProgression, tiers } = captainData;
  const currentTier = tierProgression.currentTier;
  const nextTier = tierProgression.nextTier;
  const progressPercent = tierProgression.progressPercent;
  const callsToNext = tierProgression.callsToNext;

  const tierStyle = currentTier ? (CAPTAIN_TIER_CONFIG[currentTier.name] || DEFAULT_TIER_STYLE) : DEFAULT_TIER_STYLE;
  const nextTierStyle = nextTier ? (CAPTAIN_TIER_CONFIG[nextTier.name] || DEFAULT_TIER_STYLE) : null;

  const allTiers = useMemo(() => tiers || [], [tiers]);

  return (
    <div className={`${UI.card} p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <Crown className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.captain.title" defaultMessage="Progression Capitaine" />
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        <FormattedMessage id="chatter.progression.captain.subtitle" defaultMessage="Votre progression dans les paliers capitaine" />
      </p>

      {/* Current tier badge */}
      {currentTier && (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${tierStyle.bg} ${tierStyle.color}`}>
            {tierStyle.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.progression.captain.currentTier" defaultMessage="Palier actuel" />
            </p>
            <p className={`text-lg font-black ${tierStyle.color}`}>{currentTier.name}</p>
          </div>
          {nextTier && nextTierStyle && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.progression.captain.nextTier" defaultMessage="Prochain palier" />
                </p>
                <p className={`text-lg font-black ${nextTierStyle.color}`}>{nextTier.name}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="relative h-4 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${tierStyle.gradient} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
        {/* Tier markers */}
        {allTiers.length > 0 && (() => {
          const maxCalls = allTiers[allTiers.length - 1]?.minCalls || 100;
          return allTiers.map((t) => {
            const pos = (t.minCalls / maxCalls) * 100;
            return (
              <div
                key={t.name}
                className="absolute top-0 bottom-0 w-px bg-white/50"
                style={{ left: `${pos}%` }}
                title={t.name}
              />
            );
          });
        })()}
      </div>

      {/* Calls remaining */}
      {nextTier ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <FormattedMessage
            id="chatter.progression.captain.callsNeeded"
            defaultMessage="Encore {count} appels pour {tier}"
            values={{ count: callsToNext, tier: nextTier.name }}
          />
        </p>
      ) : (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          <FormattedMessage id="chatter.progression.captain.maxTier" defaultMessage="Palier maximum atteint !" />
        </div>
      )}

      {/* All tiers row */}
      <div className="grid grid-cols-5 gap-2 mt-5">
        {allTiers.map((t) => {
          const style = CAPTAIN_TIER_CONFIG[t.name] || DEFAULT_TIER_STYLE;
          const isCurrentTier = currentTier?.name === t.name;
          const isPast = currentTier && allTiers.findIndex((x) => x.name === currentTier.name) > allTiers.findIndex((x) => x.name === t.name);

          return (
            <div
              key={t.name}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                isCurrentTier
                  ? `${style.bg} border-current ${style.color} ring-2 ring-current ring-offset-1 dark:ring-offset-gray-900`
                  : isPast
                    ? `${style.bg} border-transparent ${style.color} opacity-60`
                    : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400 dark:text-gray-600 opacity-40'
              }`}
            >
              <span className={`${isCurrentTier || isPast ? style.color : ''}`}>{style.icon}</span>
              <span className="text-[10px] font-semibold mt-1 truncate w-full text-center">{t.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Captain Promo Teaser — for non-captains */
function CaptainPromoTeaser() {
  return (
    <div className={`${UI.card} p-6 border-dashed border-2 border-orange-200 dark:border-orange-800/50`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30">
          <Crown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.teaser.title" defaultMessage="Devenez Capitaine !" />
        </h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
        <FormattedMessage
          id="chatter.progression.teaser.description"
          defaultMessage="Les capitaines gèrent une équipe de chatters et gagnent des commissions supplémentaires sur les appels de leur équipe. Atteignez un excellent niveau de performance pour être éligible !"
        />
      </p>
      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
        <MessageCircle className="h-4 w-4" />
        <FormattedMessage id="chatter.progression.teaser.cta" defaultMessage="Contactez le support pour en savoir plus" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ChatterProgression() {
  const intl = useIntl();
  const { user } = useAuth();
  const { dashboardData, isLoading } = useChatter();
  const { tierProgress } = useChatterReferrals();

  // Captain state
  const [isCaptain, setIsCaptain] = useState(false);
  const [captainData, setCaptainData] = useState<CaptainDashboardData | null>(null);
  const [captainLoading, setCaptainLoading] = useState(false);

  // Check captain role
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "chatters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data()?.role === 'captainChatter') {
        setIsCaptain(true);
      }
    }).catch(() => {});
  }, [user?.uid]);

  // Fetch captain data if captain
  const fetchCaptainData = useCallback(async () => {
    if (!isCaptain) return;
    setCaptainLoading(true);
    try {
      const callable = httpsCallable<void, CaptainDashboardData>(functionsAffiliate, 'getCaptainDashboard');
      const result = await callable();
      setCaptainData(result.data);
    } catch (err) {
      console.warn('[ChatterProgression] Failed to load captain data:', err);
    } finally {
      setCaptainLoading(false);
    }
  }, [isCaptain]);

  useEffect(() => {
    fetchCaptainData();
  }, [fetchCaptainData]);

  // Extract data
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config ?? null;
  const forecast = dashboardData?.forecast ?? null;
  const piggyBank = dashboardData?.piggyBank ?? null;
  const lang = intl.locale?.split('-')[0] || 'en';

  // Loading state
  if (isLoading && !dashboardData) {
    return <ProgressionSkeleton />;
  }

  if (!chatter) {
    return <ProgressionSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.progression.title" defaultMessage="Ma Progression" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage id="chatter.progression.subtitle" defaultMessage="Suivez votre évolution et vos objectifs" />
        </p>
      </div>

      {/* 1. Level Progression */}
      <LevelProgressionSection
        level={chatter.level}
        levelProgress={chatter.levelProgress}
        config={config}
        forecast={forecast}
        lang={lang}
      />

      {/* 2. Recruitment Tiers */}
      <RecruitmentTierSection
        qualifiedCount={dashboardData?.referralStats?.qualifiedFilleulsN1 ?? 0}
        paidTierBonuses={tierProgress?.paidTierBonuses ?? []}
      />

      {/* 3. Overall Stats */}
      <OverallStatsSection
        totalEarned={chatter.totalEarned}
        currentMonthRank={chatter.currentMonthRank}
        bestRank={chatter.bestRank}
        currentStreak={chatter.currentStreak}
        bestStreak={chatter.bestStreak}
        badges={chatter.badges || []}
      />

      {/* 4. Piggy Bank (if not fully unlocked) */}
      <PiggyBankSection
        piggyBank={piggyBank ? {
          isUnlocked: piggyBank.isUnlocked,
          clientEarnings: piggyBank.clientEarnings,
          unlockThreshold: piggyBank.unlockThreshold,
          progressPercent: piggyBank.progressPercent,
          amountToUnlock: piggyBank.amountToUnlock,
          totalPending: piggyBank.totalPending,
          message: piggyBank.message,
        } : null}
        isLoading={isLoading}
      />

      {/* 5. Captain Tier (captains only) */}
      {isCaptain && captainData && !captainLoading && (
        <CaptainTierSection captainData={captainData} />
      )}
      {isCaptain && captainLoading && (
        <div className={`${UI.card} p-6 animate-pulse`}>
          <div className="h-7 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-full mb-3" />
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-white/10 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* 6. Captain Promo Teaser (non-captains only) */}
      {!isCaptain && !captainLoading && <CaptainPromoTeaser />}
    </div>
  );
}

// ============================================================================
// PAGE EXPORT (wrapped in layout)
// ============================================================================

export default function ChatterProgressionPage() {
  return (
    <ChatterDashboardLayout activeKey="progression">
      <ChatterProgression />
    </ChatterDashboardLayout>
  );
}
