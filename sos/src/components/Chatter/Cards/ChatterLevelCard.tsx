/**
 * ChatterLevelCard - Displays chatter level, progress, and badges
 * Shows gamification elements like level progression and streak
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Star, Flame, Trophy, ArrowUp, Zap } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

// Level configurations
const LEVEL_CONFIG = {
  1: { name: 'Bronze', color: 'from-amber-600 to-amber-700', icon: Star, minEarned: 0 },
  2: { name: 'Silver', color: 'from-gray-400 to-gray-500', icon: Star, minEarned: 10000 },
  3: { name: 'Gold', color: 'from-yellow-400 to-yellow-500', icon: Trophy, minEarned: 50000 },
  4: { name: 'Platinum', color: 'from-cyan-400 to-cyan-500', icon: Trophy, minEarned: 200000 },
  5: { name: 'Diamond', color: 'from-purple-400 to-pink-400', icon: Zap, minEarned: 500000 },
} as const;

// Level bonus percentages
const LEVEL_BONUS_PERCENT: Record<number, number> = {
  1: 0, 2: 10, 3: 20, 4: 35, 5: 50
};

interface ChatterLevelCardProps {
  level: 1 | 2 | 3 | 4 | 5;
  totalEarned: number;
  currentStreak: number;
  bestStreak: number;
  monthlyRank?: number;
  loading?: boolean;
}

const ChatterLevelCard: React.FC<ChatterLevelCardProps> = ({
  level,
  totalEarned,
  currentStreak,
  bestStreak,
  monthlyRank,
  loading,
}) => {
  const intl = useIntl();

  // Format amount in cents to display
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  const levelConfig = LEVEL_CONFIG[level];
  const nextLevel = level < 5 ? LEVEL_CONFIG[(level + 1) as keyof typeof LEVEL_CONFIG] : null;
  const LevelIcon = levelConfig.icon;

  // Calculate progress to next level
  const progressToNextLevel = nextLevel
    ? Math.min(100, ((totalEarned - levelConfig.minEarned) / (nextLevel.minEarned - levelConfig.minEarned)) * 100)
    : 100;

  const amountToNextLevel = nextLevel
    ? Math.max(0, nextLevel.minEarned - totalEarned)
    : 0;

  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className={`${UI.skeleton} w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl`} />
          <div className="flex-1">
            <div className={`${UI.skeleton} h-4 sm:h-5 w-20 sm:w-24 mb-2`} />
            <div className={`${UI.skeleton} h-3 sm:h-4 w-24 sm:w-32`} />
          </div>
        </div>
        <div className={`${UI.skeleton} h-1.5 sm:h-2 w-full mb-3 sm:mb-4`} />
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className={`${UI.skeleton} h-14 sm:h-16 rounded-lg sm:rounded-xl`} />
          <div className={`${UI.skeleton} h-14 sm:h-16 rounded-lg sm:rounded-xl`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} ${UI.cardHover} p-4 sm:p-6`}>
      {/* Level Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${levelConfig.color} flex items-center justify-center shadow-lg`}>
          <LevelIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
            <FormattedMessage
              id={`chatter.level.${level}`}
              defaultMessage="Niveau {level}"
              values={{ level }}
            />
            <span className={`text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r ${levelConfig.color} text-white`}>
              {levelConfig.name}
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="chatter.level.bonus"
              defaultMessage="Bonus: +{percent}%"
              values={{ percent: LEVEL_BONUS_PERCENT[level] || 0 }}
            />
          </p>
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate mr-2">
              <FormattedMessage id="chatter.level.progress" defaultMessage="Progression vers niveau {level}" values={{ level: level + 1 }} />
            </span>
            <span className="flex-shrink-0">{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${levelConfig.color} transition-all duration-500`}
              style={{ width: `${progressToNextLevel}%` }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="truncate">
              <FormattedMessage
                id="chatter.level.remaining"
                defaultMessage="Encore {amount} pour atteindre {level}"
                values={{
                  amount: formatAmount(amountToNextLevel),
                  level: nextLevel.name
                }}
              />
            </span>
          </p>
        </div>
      )}

      {/* Max Level Reached */}
      {!nextLevel && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg sm:rounded-xl text-center">
          <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">
            <FormattedMessage id="chatter.level.maxReached" defaultMessage="Niveau maximum atteint !" />
          </p>
        </div>
      )}

      {/* Streak and Rank */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Current Streak */}
        <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg sm:rounded-xl">
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <Flame className={`w-3 h-3 sm:w-4 sm:h-4 ${currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              <FormattedMessage id="chatter.streak.current" defaultMessage="Streak actuel" />
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {currentStreak}
            <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400 ml-0.5 sm:ml-1">
              <FormattedMessage id="chatter.streak.days" defaultMessage="jours" />
            </span>
          </p>
          {bestStreak > currentStreak && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
              <FormattedMessage
                id="chatter.streak.best"
                defaultMessage="Record: {days}j"
                values={{ days: bestStreak }}
              />
            </p>
          )}
        </div>

        {/* Monthly Rank */}
        <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg sm:rounded-xl">
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <Trophy className={`w-3 h-3 sm:w-4 sm:h-4 ${monthlyRank && monthlyRank <= 3 ? 'text-amber-500' : 'text-gray-400'}`} />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              <FormattedMessage id="chatter.rank.monthly" defaultMessage="Classement" />
            </span>
          </div>
          {monthlyRank ? (
            <>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                #{monthlyRank}
              </p>
              {monthlyRank <= 3 && (
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">
                  <FormattedMessage
                    id={`chatter.rank.top${monthlyRank}`}
                    defaultMessage="Top {rank} ce mois!"
                    values={{ rank: monthlyRank }}
                  />
                </p>
              )}
            </>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.rank.notRanked" defaultMessage="Non classé" />
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatterLevelCard;
