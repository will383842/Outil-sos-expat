/**
 * InfluencerLevelCard - Displays influencer level, progress, and achievement badges
 * Shows gamification elements like level progression based on total earnings
 *
 * Features:
 * - Animated progress bar fill
 * - Hover lift effect
 * - Shimmer loading state
 * - Staggered entrance animation
 * - Achievement badges display
 */

import React, { memo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Star, Award, Crown, TrendingUp, Zap } from 'lucide-react';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens with enhanced effects
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

// Level configurations based on total earnings (in cents)
// Level 1: $0+, Level 2: $100+, Level 3: $500+, Level 4: $2000+, Level 5: $10000+
const LEVEL_CONFIG = {
  1: {
    name: 'Starter',
    color: 'from-gray-400 to-gray-500',
    icon: Star,
    minEarned: 0,
    badge: null,
  },
  2: {
    name: 'Rising Star',
    color: 'from-blue-400 to-blue-500',
    icon: TrendingUp,
    minEarned: 10000, // $100 in cents
    badge: 'rising',
  },
  3: {
    name: 'Pro',
    color: 'from-purple-400 to-purple-500',
    icon: Award,
    minEarned: 50000, // $500 in cents
    badge: 'pro',
  },
  4: {
    name: 'Expert',
    color: 'from-amber-400 to-orange-500',
    icon: Crown,
    minEarned: 200000, // $2000 in cents
    badge: 'expert',
  },
  5: {
    name: 'Elite',
    color: 'from-yellow-400 to-amber-400',
    icon: Zap,
    minEarned: 1000000, // $10000 in cents
    badge: 'elite',
  },
} as const;

// Badge configurations for achievements
const BADGE_CONFIG: Record<string, { color: string; bgColor: string }> = {
  rising: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  pro: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  expert: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  elite: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
};

/**
 * Calculate influencer level based on total earnings
 * @param totalEarnedCents - Total earnings in cents
 * @returns Level from 1-5
 */
function calculateLevel(totalEarnedCents: number): 1 | 2 | 3 | 4 | 5 {
  if (totalEarnedCents >= LEVEL_CONFIG[5].minEarned) return 5;
  if (totalEarnedCents >= LEVEL_CONFIG[4].minEarned) return 4;
  if (totalEarnedCents >= LEVEL_CONFIG[3].minEarned) return 3;
  if (totalEarnedCents >= LEVEL_CONFIG[2].minEarned) return 2;
  return 1;
}

/**
 * Format cents to USD display format using Intl.NumberFormat
 */
function formatCurrencyLocale(cents: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

interface InfluencerLevelCardProps {
  /** Total earnings in cents */
  totalEarned: number;
  /** Additional CSS classes */
  className?: string;
  /** Show loading skeleton */
  loading?: boolean;
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
}

const InfluencerLevelCard = memo(function InfluencerLevelCard({
  totalEarned,
  className = '',
  loading = false,
  animationDelay = 0,
}: InfluencerLevelCardProps) {
  const intl = useIntl();
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [badgesVisible, setBadgesVisible] = useState(false);

  // Calculate level based on total earnings
  const level = calculateLevel(totalEarned);

  // Trigger progress bar animation after mount
  useEffect(() => {
    const progressTimer = setTimeout(() => {
      setProgressAnimated(true);
    }, animationDelay + 300);

    const badgesTimer = setTimeout(() => {
      setBadgesVisible(true);
    }, animationDelay + 600);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(badgesTimer);
    };
  }, [animationDelay]);

  // Format amount in cents to USD display
  const formatAmount = (cents: number) => {
    return formatCurrencyLocale(cents, intl.locale);
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

  // Get earned badges (all levels below current)
  const earnedBadges = Object.entries(LEVEL_CONFIG)
    .filter(([lvl, config]) => config.badge && Number(lvl) <= level)
    .map(([lvl, config]) => ({
      level: Number(lvl),
      name: config.name,
      badge: config.badge as string,
      Icon: config.icon,
    }));

  // Loading skeleton with shimmer effect
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl ${UI.skeleton}`} />
          <div className="flex-1">
            <div className={`h-4 sm:h-5 w-20 sm:w-24 mb-2 ${UI.skeleton}`} />
            <div className={`h-3 sm:h-4 w-24 sm:w-32 ${UI.skeleton}`} />
          </div>
        </div>
        <div className={`h-1.5 sm:h-2 w-full mb-3 sm:mb-4 ${UI.skeleton} rounded-full`} />
        <div className="flex gap-2">
          <div className={`h-8 w-16 rounded-lg ${UI.skeleton}`} />
          <div className={`h-8 w-16 rounded-lg ${UI.skeleton}`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-4 sm:p-6 opacity-0 animate-fade-in-up ${className}`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Level Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div
          className={`
            w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl
            bg-gradient-to-br ${levelConfig.color}
            flex items-center justify-center shadow-lg
            transition-transform duration-300 hover:scale-110
          `}
        >
          <LevelIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
            <FormattedMessage
              id="influencer.level.title"
              defaultMessage="Level {level}"
              values={{ level }}
            />
            <span
              className={`
                text-xs sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 rounded-full
                bg-gradient-to-r ${levelConfig.color} text-white
                animate-fade-in
              `}
              style={{ animationDelay: `${animationDelay + 200}ms` }}
            >
              {levelConfig.name}
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="influencer.level.totalEarned"
              defaultMessage="Total earned: {amount}"
              values={{ amount: formatAmount(totalEarned) }}
            />
          </p>
        </div>
      </div>

      {/* Progress to Next Level - Animated fill */}
      {nextLevel && (
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate mr-2">
              <FormattedMessage
                id="influencer.level.progress"
                defaultMessage="Progress to {levelName}"
                values={{ levelName: nextLevel.name }}
              />
            </span>
            <span className="flex-shrink-0 font-medium">
              <AnimatedNumber
                value={progressToNextLevel}
                duration={1000}
                delay={animationDelay + 400}
                decimals={0}
                suffix="%"
                animateOnVisible
              />
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${levelConfig.color} rounded-full transition-all duration-1000 ease-out`}
              style={{
                width: progressAnimated ? `${progressToNextLevel}%` : '0%',
              }}
            />
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="truncate">
              <FormattedMessage
                id="influencer.level.remaining"
                defaultMessage="{amount} more to reach {levelName}"
                values={{
                  amount: formatAmount(amountToNextLevel),
                  levelName: nextLevel.name
                }}
              />
            </span>
          </p>
        </div>
      )}

      {/* Max Level Reached */}
      {!nextLevel && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg sm:rounded-xl text-center animate-pulse-subtle">
          <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
            <FormattedMessage
              id="influencer.level.maxReached"
              defaultMessage="Maximum level reached!"
            />
          </p>
        </div>
      )}

      {/* Achievement Badges */}
      {earnedBadges.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2">
            <FormattedMessage
              id="influencer.level.badges"
              defaultMessage="Earned Badges"
            />
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {earnedBadges.map((badge, index) => {
              const badgeStyle = BADGE_CONFIG[badge.badge];
              const BadgeIcon = badge.Icon;
              return (
                <div
                  key={badge.level}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-lg
                    ${badgeStyle.bgColor} ${badgeStyle.color}
                    transition-all duration-300
                    ${badgesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                    hover:scale-105
                  `}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                  }}
                  title={badge.name}
                >
                  <BadgeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">
                    {badge.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// Named export
export { InfluencerLevelCard };

// Default export
export default InfluencerLevelCard;
