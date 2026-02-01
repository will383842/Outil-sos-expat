/**
 * TrendsChartCard - Weekly earnings trend visualization
 * Shows sparkline chart with week-over-week comparison
 *
 * Features:
 * - Simple SVG sparkline (no heavy library)
 * - This week vs last week comparison
 * - Color coding: Green for up, red for down
 * - Percentage change badge
 * - Shimmer loading state
 * - Mobile responsive
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TrendingUp, TrendingDown } from 'lucide-react';
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

interface TrendsChartCardProps {
  /** Daily earnings for this week (7 values, in cents) */
  thisWeekData: number[];
  /** Daily earnings for last week (7 values, in cents) */
  lastWeekData: number[];
  /** Loading state */
  loading?: boolean;
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
}

/**
 * Generates SVG path for sparkline chart
 */
function generateSparklinePath(
  data: number[],
  width: number,
  height: number,
  padding: number = 4
): string {
  if (data.length === 0) return '';

  const maxValue = Math.max(...data, 1); // Avoid division by zero
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
}

const TrendsChartCard = memo(function TrendsChartCard({
  thisWeekData,
  lastWeekData,
  loading,
  animationDelay = 0,
}: TrendsChartCardProps) {
  const intl = useIntl();
  const [chartAnimated, setChartAnimated] = useState(false);

  // Trigger chart animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartAnimated(true);
    }, animationDelay + 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Calculate totals and percentage change
  const { thisWeekTotal, lastWeekTotal, percentChange, isPositive } = useMemo(() => {
    const thisTotal = thisWeekData.reduce((sum, val) => sum + val, 0);
    const lastTotal = lastWeekData.reduce((sum, val) => sum + val, 0);
    const change = lastTotal > 0
      ? ((thisTotal - lastTotal) / lastTotal) * 100
      : thisTotal > 0 ? 100 : 0;
    return {
      thisWeekTotal: thisTotal,
      lastWeekTotal: lastTotal,
      percentChange: Math.abs(change),
      isPositive: change >= 0,
    };
  }, [thisWeekData, lastWeekData]);

  // Chart dimensions
  const chartWidth = 180;
  const chartHeight = 60;

  // Generate paths
  const thisWeekPath = useMemo(
    () => generateSparklinePath(thisWeekData, chartWidth, chartHeight),
    [thisWeekData]
  );

  const formatAmount = (cents: number) => formatCurrencyLocale(cents, intl.locale);

  // Day labels
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`${UI.skeleton} h-4 w-28`} />
          <div className={`${UI.skeleton} h-6 w-16 rounded-full`} />
        </div>
        <div className={`${UI.skeleton} h-16 w-full rounded-lg mb-3`} />
        <div className="flex justify-between">
          <div className={`${UI.skeleton} h-3 w-20`} />
          <div className={`${UI.skeleton} h-3 w-20`} />
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <FormattedMessage
            id="chatter.trends.weeklyEarnings"
            defaultMessage="Tendance hebdomadaire"
          />
        </h3>
        {/* Percentage Badge */}
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
            ${isPositive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }
          `}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? '+' : '-'}{percentChange.toFixed(0)}%
        </span>
      </div>

      {/* Sparkline Chart */}
      <div className="relative mb-3">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
            className="text-gray-400 dark:text-gray-600"
          />

          {/* Last week path (faded) */}
          <path
            d={generateSparklinePath(lastWeekData, chartWidth, chartHeight)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-300 dark:text-gray-600"
            strokeOpacity="0.5"
            strokeDasharray="4 4"
          />

          {/* This week path (main) */}
          <path
            d={thisWeekPath}
            fill="none"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1000"
            style={{
              strokeDasharray: chartAnimated ? 'none' : '500',
              strokeDashoffset: chartAnimated ? 0 : 500,
            }}
          />

          {/* Area gradient under current line */}
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path
            d={`${thisWeekPath} L ${chartWidth - 4},${chartHeight - 4} L 4,${chartHeight - 4} Z`}
            fill="url(#trendGradient)"
            className={`transition-opacity duration-1000 ${chartAnimated ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Data points */}
          {thisWeekData.map((value, index) => {
            const maxValue = Math.max(...thisWeekData, 1);
            const minValue = Math.min(...thisWeekData, 0);
            const range = maxValue - minValue || 1;
            const x = 4 + (index / (thisWeekData.length - 1)) * (chartWidth - 8);
            const y = 4 + (chartHeight - 8) - ((value - minValue) / range) * (chartHeight - 8);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={isPositive ? '#22c55e' : '#ef4444'}
                className={`transition-all duration-500 ${chartAnimated ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              />
            );
          })}
        </svg>

        {/* Day labels */}
        <div className="flex justify-between px-1 mt-1">
          {dayLabels.map((day, index) => (
            <span
              key={index}
              className="text-[9px] text-gray-400 dark:text-gray-500"
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.trends.thisWeek" defaultMessage="Cette semaine" />
          </span>
          <p className={`font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
            {formatAmount(thisWeekTotal)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.trends.lastWeek" defaultMessage="Semaine derniere" />
          </span>
          <p className="font-semibold text-gray-600 dark:text-gray-300">
            {formatAmount(lastWeekTotal)}
          </p>
        </div>
      </div>
    </div>
  );
});

export default TrendsChartCard;
