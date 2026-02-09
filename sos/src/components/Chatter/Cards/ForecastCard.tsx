/**
 * ForecastCard - Performance projection and motivation display
 * Shows "At this pace..." projections for earnings and level progression
 *
 * Features:
 * - Estimated month-end earnings projection
 * - Progress to next level with ETA
 * - Next tier bonus available
 * - Motivational message based on performance
 * - Shimmer loading state
 * - Mobile responsive
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Target,
  TrendingUp,
  Calendar,
  Gift,
  Sparkles,
  ArrowRight,
  Star,
} from 'lucide-react';
import { formatCurrencyLocale, formatCurrencyLocaleWhole } from './currencyUtils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens matching other cards
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: `
    transition-all duration-300 ease-out
    hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
    hover:-translate-y-1
  `,
  skeleton: `
    relative overflow-hidden
    bg-gray-200 dark:bg-white/10 rounded
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-shimmer
    before:bg-gradient-to-r
    before:from-transparent
    before:via-white/20
    before:to-transparent
    dark:before:via-white/10
  `,
} as const;

// Level configurations (matching ChatterLevelCard)
const LEVEL_CONFIG = {
  1: { name: 'Bronze', minEarned: 0 },
  2: { name: 'Silver', minEarned: 10000 },
  3: { name: 'Gold', minEarned: 50000 },
  4: { name: 'Platinum', minEarned: 200000 },
  5: { name: 'Diamond', minEarned: 500000 },
} as const;

// Tier bonuses (in cents)
const TIER_BONUSES: Record<number, number> = {
  5: 1500,      // $15
  10: 3500,     // $35
  20: 7500,     // $75
  50: 25000,    // $250
  100: 60000,   // $600
  500: 400000,  // $4000
};

interface ForecastCardProps {
  /** Current month earnings so far (in cents) */
  currentMonthEarnings: number;
  /** Total earnings all time (in cents) */
  totalEarned: number;
  /** Current level (1-5) */
  currentLevel: 1 | 2 | 3 | 4 | 5;
  /** Number of qualified referrals */
  qualifiedReferrals: number;
  /** Already paid tier bonuses */
  paidTierBonuses: number[];
  /** Day of month (1-31) */
  currentDayOfMonth: number;
  /** Loading state */
  loading?: boolean;
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
}

type PerformanceLevel = 'excellent' | 'good' | 'average' | 'slow' | 'starting';

const ForecastCard = memo(function ForecastCard({
  currentMonthEarnings,
  totalEarned,
  currentLevel,
  qualifiedReferrals,
  paidTierBonuses,
  currentDayOfMonth,
  loading,
  animationDelay = 0,
}: ForecastCardProps) {
  const intl = useIntl();

  // Calculate projections
  const projections = useMemo(() => {
    // Days remaining in month (assuming 30 days)
    const daysInMonth = 30;
    const daysRemaining = Math.max(0, daysInMonth - currentDayOfMonth);
    const dailyAverage = currentDayOfMonth > 0
      ? currentMonthEarnings / currentDayOfMonth
      : 0;

    // Projected month-end earnings
    const projectedMonthEnd = currentMonthEarnings + (dailyAverage * daysRemaining);

    // Next level calculation
    const nextLevelNum = currentLevel < 5 ? (currentLevel + 1) as 2 | 3 | 4 | 5 : null;
    const nextLevelConfig = nextLevelNum ? LEVEL_CONFIG[nextLevelNum] : null;
    const amountToNextLevel = nextLevelConfig
      ? Math.max(0, nextLevelConfig.minEarned - totalEarned)
      : 0;

    // ETA to next level (in days)
    const daysToNextLevel = dailyAverage > 0 && amountToNextLevel > 0
      ? Math.ceil(amountToNextLevel / dailyAverage)
      : null;

    // Next tier bonus
    const tierThresholds = [5, 10, 20, 50, 100, 500];
    const nextTier = tierThresholds.find(
      (threshold) => !paidTierBonuses.includes(threshold) && qualifiedReferrals < threshold
    );
    const referralsToNextTier = nextTier ? nextTier - qualifiedReferrals : 0;
    const nextTierBonus = nextTier ? TIER_BONUSES[nextTier] : 0;

    // Performance assessment
    let performanceLevel: PerformanceLevel;
    if (dailyAverage >= 2000) {
      performanceLevel = 'excellent';
    } else if (dailyAverage >= 1000) {
      performanceLevel = 'good';
    } else if (dailyAverage >= 500) {
      performanceLevel = 'average';
    } else if (dailyAverage > 0) {
      performanceLevel = 'slow';
    } else {
      performanceLevel = 'starting';
    }

    return {
      dailyAverage,
      projectedMonthEnd,
      daysRemaining,
      nextLevelNum,
      nextLevelConfig,
      amountToNextLevel,
      daysToNextLevel,
      nextTier,
      referralsToNextTier,
      nextTierBonus,
      performanceLevel,
    };
  }, [currentMonthEarnings, totalEarned, currentLevel, qualifiedReferrals, paidTierBonuses, currentDayOfMonth]);

  const formatAmount = (cents: number) => formatCurrencyLocale(cents, intl.locale);
  const formatAmountWhole = (cents: number) => formatCurrencyLocaleWhole(cents, intl.locale);

  // Motivational messages based on performance
  const motivationMessages: Record<PerformanceLevel, { icon: React.ReactNode; messageId: string; defaultMessage: string }> = {
    excellent: {
      icon: <Sparkles className="w-4 h-4 text-yellow-500" />,
      messageId: 'chatter.forecast.motivation.excellent',
      defaultMessage: 'Performance exceptionnelle ! Continue comme ca !',
    },
    good: {
      icon: <Star className="w-4 h-4 text-green-500" />,
      messageId: 'chatter.forecast.motivation.good',
      defaultMessage: 'Tu es sur la bonne voie, bravo !',
    },
    average: {
      icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
      messageId: 'chatter.forecast.motivation.average',
      defaultMessage: 'Bon travail ! Un petit effort pour accelerer ?',
    },
    slow: {
      icon: <Target className="w-4 h-4 text-orange-500" />,
      messageId: 'chatter.forecast.motivation.slow',
      defaultMessage: 'Chaque client compte ! Partage ton lien.',
    },
    starting: {
      icon: <ArrowRight className="w-4 h-4 text-gray-500" />,
      messageId: 'chatter.forecast.motivation.starting',
      defaultMessage: 'Pret a commencer ? Partage ton lien !',
    },
  };

  const motivation = motivationMessages[projections.performanceLevel];

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`${UI.skeleton} h-5 w-5 rounded`} />
          <div className={`${UI.skeleton} h-5 w-32`} />
        </div>
        <div className={`${UI.skeleton} h-20 rounded-xl mb-3`} />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className={`${UI.skeleton} h-16 rounded-xl`} />
          <div className={`${UI.skeleton} h-16 rounded-xl`} />
        </div>
        <div className={`${UI.skeleton} h-12 rounded-xl`} />
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-4 sm:p-5 opacity-0 animate-fade-in-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-red-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <FormattedMessage
            id="chatter.forecast.title"
            defaultMessage="A ce rythme..."
          />
        </h3>
      </div>

      {/* Projected Month-End */}
      <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage
                id="chatter.forecast.projectedEarnings"
                defaultMessage="Gains estimes fin de mois"
              />
            </p>
            <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              <AnimatedNumber
                value={projections.projectedMonthEnd}
                isCurrency
                currencyCode="USD"
                duration={1200}
                delay={animationDelay + 200}
                animateOnVisible
              />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.forecast.daysRemaining"
                defaultMessage="{days} jours restants"
                values={{ days: projections.daysRemaining }}
              />
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ~{formatAmountWhole(projections.dailyAverage)}
              <span className="text-xs text-gray-500 dark:text-gray-400">/jour</span>
            </p>
          </div>
        </div>
      </div>

      {/* Next Level & Next Tier */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Next Level */}
        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.forecast.nextLevel"
                defaultMessage="Prochain niveau"
              />
            </span>
          </div>
          {projections.nextLevelConfig ? (
            <>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {projections.nextLevelConfig.name}
              </p>
              {projections.daysToNextLevel !== null ? (
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.forecast.etaDays"
                    defaultMessage="ETA: ~{days} jours"
                    values={{ days: projections.daysToNextLevel }}
                  />
                </p>
              ) : (
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {formatAmountWhole(projections.amountToNextLevel)}
                  <FormattedMessage
                    id="chatter.forecast.remaining"
                    defaultMessage=" restants"
                  />
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              <FormattedMessage
                id="chatter.forecast.maxLevel"
                defaultMessage="Niveau max !"
              />
            </p>
          )}
        </div>

        {/* Next Tier Bonus */}
        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.forecast.nextBonus"
                defaultMessage="Prochain bonus"
              />
            </span>
          </div>
          {projections.nextTier ? (
            <>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {formatAmount(projections.nextTierBonus)}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.forecast.referralsNeeded"
                  defaultMessage="{count} recrues de plus"
                  values={{ count: projections.referralsToNextTier }}
                />
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              <FormattedMessage
                id="chatter.forecast.allBonuses"
                defaultMessage="Tous obtenus !"
              />
            </p>
          )}
        </div>
      </div>

      {/* Motivational Message */}
      <div
        className={`
          p-3 rounded-xl flex items-center gap-2
          ${projections.performanceLevel === 'excellent'
            ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : projections.performanceLevel === 'good'
              ? 'bg-green-50 dark:bg-green-900/20'
              : projections.performanceLevel === 'average'
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : projections.performanceLevel === 'slow'
                  ? 'bg-orange-50 dark:bg-orange-900/20'
                  : 'bg-gray-50 dark:bg-gray-800/50'
          }
        `}
      >
        {motivation.icon}
        <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage
            id={motivation.messageId}
            defaultMessage={motivation.defaultMessage}
          />
        </p>
      </div>
    </div>
  );
});

export default ForecastCard;
