/**
 * ComparisonStatsCard - Month-over-month comparison display
 * Shows side-by-side metrics comparison with arrow indicators
 *
 * Features:
 * - This month vs Last month comparison
 * - Three metrics: Earnings, Clients, Recruits
 * - Arrow indicators with colors (up green, down red)
 * - Percentage change for each metric
 * - Shimmer loading state
 * - Mobile responsive
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ArrowUp, ArrowDown, DollarSign, Users, UserPlus, Minus } from 'lucide-react';
import { formatCurrencyLocale } from './currencyUtils';

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

interface MonthlyStats {
  earnings: number; // In cents
  clients: number;
  recruits: number;
}

interface ComparisonStatsCardProps {
  /** This month's statistics */
  thisMonth: MonthlyStats;
  /** Last month's statistics */
  lastMonth: MonthlyStats;
  /** Loading state */
  loading?: boolean;
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
}

interface MetricComparisonProps {
  label: React.ReactNode;
  icon: React.ReactNode;
  thisValue: number | string;
  lastValue: number | string;
  percentChange: number;
  isPositive: boolean;
  isCurrency?: boolean;
  delay: number;
}

const MetricComparison: React.FC<MetricComparisonProps> = ({
  label,
  icon,
  thisValue,
  lastValue,
  percentChange,
  isPositive,
  delay,
}) => {
  const isNeutral = percentChange === 0;

  return (
    <div
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-transform hover:scale-[1.01] opacity-0 animate-fade-in"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Icon */}
      <div className="p-2 rounded-lg bg-white dark:bg-white/10 shadow-sm">
        {icon}
      </div>

      {/* Values */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {thisValue}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            vs {lastValue}
          </span>
        </div>
      </div>

      {/* Change Indicator */}
      <div
        className={`
          flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold
          ${isNeutral
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            : isPositive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }
        `}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isPositive ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )}
        {percentChange.toFixed(0)}%
      </div>
    </div>
  );
};

const ComparisonStatsCard = memo(function ComparisonStatsCard({
  thisMonth,
  lastMonth,
  loading,
  animationDelay = 0,
}: ComparisonStatsCardProps) {
  const intl = useIntl();

  // Calculate percentage changes
  const comparisons = useMemo(() => {
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      earnings: {
        change: calcChange(thisMonth.earnings, lastMonth.earnings),
        isPositive: thisMonth.earnings >= lastMonth.earnings,
      },
      clients: {
        change: calcChange(thisMonth.clients, lastMonth.clients),
        isPositive: thisMonth.clients >= lastMonth.clients,
      },
      recruits: {
        change: calcChange(thisMonth.recruits, lastMonth.recruits),
        isPositive: thisMonth.recruits >= lastMonth.recruits,
      },
    };
  }, [thisMonth, lastMonth]);

  const formatAmount = (cents: number) => formatCurrencyLocale(cents, intl.locale);

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${UI.skeleton} h-5 w-32`} />
          <div className={`${UI.skeleton} h-4 w-24`} />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${UI.skeleton} h-16 rounded-xl`} />
          ))}
        </div>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <FormattedMessage
            id="chatter.comparison.title"
            defaultMessage="Comparaison mensuelle"
          />
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage
            id="chatter.comparison.vsLastMonth"
            defaultMessage="vs mois dernier"
          />
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Earnings */}
        <MetricComparison
          label={
            <FormattedMessage
              id="chatter.comparison.earnings"
              defaultMessage="Gains"
            />
          }
          icon={<DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />}
          thisValue={formatAmount(thisMonth.earnings)}
          lastValue={formatAmount(lastMonth.earnings)}
          percentChange={Math.abs(comparisons.earnings.change)}
          isPositive={comparisons.earnings.isPositive}
          isCurrency
          delay={animationDelay + 100}
        />

        {/* Clients */}
        <MetricComparison
          label={
            <FormattedMessage
              id="chatter.comparison.clients"
              defaultMessage="Clients"
            />
          }
          icon={<Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          thisValue={thisMonth.clients}
          lastValue={lastMonth.clients}
          percentChange={Math.abs(comparisons.clients.change)}
          isPositive={comparisons.clients.isPositive}
          delay={animationDelay + 200}
        />

        {/* Recruits */}
        <MetricComparison
          label={
            <FormattedMessage
              id="chatter.comparison.recruits"
              defaultMessage="Recrues"
            />
          }
          icon={<UserPlus className="w-4 h-4 text-red-600 dark:text-red-400" />}
          thisValue={thisMonth.recruits}
          lastValue={lastMonth.recruits}
          percentChange={Math.abs(comparisons.recruits.change)}
          isPositive={comparisons.recruits.isPositive}
          delay={animationDelay + 300}
        />
      </div>

      {/* Overall Summary */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-center gap-2 text-xs">
          {comparisons.earnings.isPositive &&
           comparisons.clients.isPositive &&
           comparisons.recruits.isPositive ? (
            <>
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <ArrowUp className="w-3.5 h-3.5" />
                <FormattedMessage
                  id="chatter.comparison.allUp"
                  defaultMessage="Tous les indicateurs en hausse !"
                />
              </span>
            </>
          ) : !comparisons.earnings.isPositive &&
             !comparisons.clients.isPositive &&
             !comparisons.recruits.isPositive ? (
            <>
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <ArrowDown className="w-3.5 h-3.5" />
                <FormattedMessage
                  id="chatter.comparison.allDown"
                  defaultMessage="Tous les indicateurs en baisse"
                />
              </span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.comparison.mixed"
                defaultMessage="Performance mixte ce mois"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ComparisonStatsCard;
