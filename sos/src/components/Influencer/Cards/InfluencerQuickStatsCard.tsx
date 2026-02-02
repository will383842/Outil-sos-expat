/**
 * InfluencerQuickStatsCard - Compact card showing key influencer stats with animated counters
 *
 * Features:
 * - 2x2 grid on mobile, horizontal on desktop
 * - Animated number count-up
 * - Comparison badges with percentage vs last month
 * - Glassmorphism design with dark mode support
 * - Hover lift effect on desktop, tap feedback on mobile
 * - React.memo for optimization
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { DollarSign, Users, UserPlus, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens
const UI = {
  card: `
    bg-white/80 dark:bg-white/5
    backdrop-blur-xl
    border border-white/20 dark:border-white/10
    rounded-2xl
    shadow-lg
  `,
  cardHover: `
    transition-all duration-300 ease-out
    hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
    hover:-translate-y-1
    active:scale-[0.98]
  `,
  statItem: `
    p-3 sm:p-4
    rounded-xl
    transition-all duration-200
    cursor-default
    hover:bg-black/5 dark:hover:bg-white/5
    active:bg-black/10 dark:active:bg-white/10
  `,
} as const;

// Color configurations for each stat type
const statColors = {
  earnings: {
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    gradient: 'from-green-600 to-emerald-500',
    badge: {
      positive: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      negative: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
  },
  clients: {
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    gradient: 'from-red-600 to-rose-500',
    badge: {
      positive: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      negative: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
  },
  recruits: {
    icon: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    gradient: 'from-purple-600 to-violet-500',
    badge: {
      positive: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      negative: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
  },
  rank: {
    icon: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    gradient: 'from-yellow-600 to-amber-500',
    badge: {
      positive: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      negative: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
  },
} as const;

interface InfluencerQuickStatsCardProps {
  stats: {
    thisMonthEarnings: number; // in cents
    thisMonthClients: number;
    thisMonthRecruits: number;
    rank?: number;
  };
  previousMonth?: {
    earnings: number;
    clients: number;
  };
  className?: string;
}

// Helper to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

// Comparison badge component
const ComparisonBadge = memo(function ComparisonBadge({
  percentage,
  colorType,
}: {
  percentage: number | null;
  colorType: keyof typeof statColors;
}) {
  if (percentage === null) return null;

  const isPositive = percentage >= 0;
  const colors = statColors[colorType];
  const badgeClass = isPositive ? colors.badge.positive : colors.badge.negative;

  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${badgeClass}`}>
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      )}
      <span>{isPositive ? '+' : ''}{percentage}%</span>
    </div>
  );
});

// Individual stat item component
const StatItem = memo(function StatItem({
  icon: Icon,
  labelKey,
  value,
  isCurrency = false,
  colorType,
  percentageChange,
  animationDelay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  value: number;
  isCurrency?: boolean;
  colorType: keyof typeof statColors;
  percentageChange?: number | null;
  animationDelay?: number;
}) {
  const colors = statColors[colorType];

  return (
    <div className={UI.statItem}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`p-2 sm:p-2.5 rounded-lg ${colors.iconBg} flex-shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
            <FormattedMessage id={labelKey} />
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-lg sm:text-xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
              {isCurrency ? (
                <AnimatedNumber
                  value={value}
                  isCurrency
                  currencyCode="USD"
                  duration={1200}
                  delay={animationDelay}
                  animateOnVisible
                />
              ) : (
                <AnimatedNumber
                  value={value}
                  duration={1200}
                  delay={animationDelay}
                  animateOnVisible
                />
              )}
            </span>
          </div>
          {percentageChange !== undefined && (
            <div className="mt-1">
              <ComparisonBadge percentage={percentageChange} colorType={colorType} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const InfluencerQuickStatsCard = memo(function InfluencerQuickStatsCard({
  stats,
  previousMonth,
  className = '',
}: InfluencerQuickStatsCardProps) {
  // Calculate percentage changes
  const earningsChange = useMemo(() => {
    if (!previousMonth) return undefined;
    return calculatePercentageChange(stats.thisMonthEarnings, previousMonth.earnings);
  }, [stats.thisMonthEarnings, previousMonth]);

  const clientsChange = useMemo(() => {
    if (!previousMonth) return undefined;
    return calculatePercentageChange(stats.thisMonthClients, previousMonth.clients);
  }, [stats.thisMonthClients, previousMonth]);

  return (
    <div className={`${UI.card} ${UI.cardHover} p-2 sm:p-3 ${className}`}>
      {/* 2x2 grid on mobile, horizontal on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
        <StatItem
          icon={DollarSign}
          labelKey="influencer.stats.thisMonthEarnings"
          value={stats.thisMonthEarnings}
          isCurrency
          colorType="earnings"
          percentageChange={earningsChange}
          animationDelay={0}
        />
        <StatItem
          icon={Users}
          labelKey="influencer.stats.thisMonthClients"
          value={stats.thisMonthClients}
          colorType="clients"
          percentageChange={clientsChange}
          animationDelay={100}
        />
        <StatItem
          icon={UserPlus}
          labelKey="influencer.stats.thisMonthRecruits"
          value={stats.thisMonthRecruits}
          colorType="recruits"
          animationDelay={200}
        />
        {stats.rank !== undefined && (
          <StatItem
            icon={Trophy}
            labelKey="influencer.stats.rank"
            value={stats.rank}
            colorType="rank"
            animationDelay={300}
          />
        )}
      </div>
    </div>
  );
});

// Named export
export { InfluencerQuickStatsCard };

// Default export
export default InfluencerQuickStatsCard;
