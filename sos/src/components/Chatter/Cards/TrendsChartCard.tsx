/**
 * TrendsChartCard - Earnings trend visualization with Week/Month toggle
 *
 * Features:
 * - Toggle between "This Week" (7-day sparkline) and "6 Months" (bar chart)
 * - Week view: SVG sparkline with week-over-week comparison
 * - Month view: 6 bars with month labels, current month highlighted
 * - Percentage change badge
 * - Shimmer loading state
 * - Mobile responsive
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrencyLocale } from './currencyUtils';
import { UI } from '@/components/Chatter/designTokens';

type ViewMode = 'week' | 'month';

interface MonthlyDataPoint {
  /** Format: "YYYY-MM" */
  month: string;
  /** Amount in cents */
  amount: number;
}

interface TrendsChartCardProps {
  /** Daily earnings for this week (7 values, in cents) */
  thisWeekData: number[];
  /** Daily earnings for last week (7 values, in cents) */
  lastWeekData: number[];
  /** Monthly earnings for the last 6 months */
  monthlyData?: MonthlyDataPoint[];
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
  monthlyData = [],
  loading,
  animationDelay = 0,
}: TrendsChartCardProps) {
  const intl = useIntl();
  const [chartAnimated, setChartAnimated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Trigger chart animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartAnimated(true);
    }, animationDelay + 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Re-animate on view mode change
  useEffect(() => {
    setChartAnimated(false);
    const timer = setTimeout(() => setChartAnimated(true), 150);
    return () => clearTimeout(timer);
  }, [viewMode]);

  // Calculate weekly totals and percentage change
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

  // Calculate monthly totals
  const { monthlyTotal, monthPercentChange, monthIsPositive } = useMemo(() => {
    const total = monthlyData.reduce((sum, m) => sum + m.amount, 0);
    // Compare current month vs previous month
    const currentMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].amount : 0;
    const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].amount : 0;
    const change = previousMonth > 0
      ? ((currentMonth - previousMonth) / previousMonth) * 100
      : currentMonth > 0 ? 100 : 0;
    return {
      monthlyTotal: total,
      monthPercentChange: Math.abs(change),
      monthIsPositive: change >= 0,
    };
  }, [monthlyData]);

  // Chart dimensions
  const chartWidth = 180;
  const chartHeight = 60;

  // Generate sparkline path for week view
  const thisWeekPath = useMemo(
    () => generateSparklinePath(thisWeekData, chartWidth, chartHeight),
    [thisWeekData]
  );

  const formatAmount = (cents: number) => formatCurrencyLocale(cents, intl.locale);

  // Day labels
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Month labels from data
  const monthLabels = useMemo(() => {
    return monthlyData.map((m) => {
      const [year, month] = m.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return intl.formatDate(date, { month: 'short' });
    });
  }, [monthlyData, intl]);

  // Current month key for highlighting
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Active display values based on view mode
  const activePercentChange = viewMode === 'week' ? percentChange : monthPercentChange;
  const activeIsPositive = viewMode === 'week' ? isPositive : monthIsPositive;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5">
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
      className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm dark:text-white font-semibold">
          <FormattedMessage
            id="chatter.trends.title"
            defaultMessage="Earnings trend"
          />
        </h3>

        <div className="flex items-center gap-1.5">
          {/* Percentage Badge */}
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
              ${activeIsPositive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }
            `}
          >
            {activeIsPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {activeIsPositive ? '+' : '-'}{activePercentChange.toFixed(0)}%
          </span>

          {/* Toggle Pills */}
          {monthlyData.length > 0 && (
            <div className="flex bg-white/[0.06] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={`
                  px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200
                  ${viewMode === 'week'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <FormattedMessage id="chatter.trends.week" defaultMessage="Week" />
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`
                  px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200
                  ${viewMode === 'month'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <FormattedMessage id="chatter.trends.month" defaultMessage="Month" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* === WEEK VIEW === */}
      {viewMode === 'week' && (
        <>
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
                className="text-slate-300 dark:text-slate-600"
                strokeOpacity="0.5"
                strokeDasharray="4 4"
              />

              {/* This week path (main) - always indigo */}
              <path
                d={thisWeekPath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-1000"
                style={{
                  strokeDasharray: chartAnimated ? 'none' : '500',
                  strokeDashoffset: chartAnimated ? 0 : 500,
                }}
              />

              {/* Area gradient under current line - indigo */}
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="#6366f1"
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor="#6366f1"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path
                d={`${thisWeekPath} L ${chartWidth - 4},${chartHeight - 4} L 4,${chartHeight - 4} Z`}
                fill="url(#trendGradient)"
                className={`transition-opacity duration-1000 ${chartAnimated ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Data points - indigo */}
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
                    fill="#6366f1"
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
                  className="text-[9px] dark:text-gray-300"
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
                <FormattedMessage id="chatter.trends.thisWeek" defaultMessage="This week" />
              </span>
              <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                {formatAmount(thisWeekTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.trends.lastWeek" defaultMessage="Last week" />
              </span>
              <p className="font-semibold text-gray-600 dark:text-gray-300">
                {formatAmount(lastWeekTotal)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* === MONTH VIEW === */}
      {viewMode === 'month' && (
        <>
          {/* Bar Chart */}
          <div className="relative mb-3">
            <MonthlyBarChart
              data={monthlyData}
              labels={monthLabels}
              currentMonthKey={currentMonthKey}
              animated={chartAnimated}
              formatAmount={formatAmount}
            />
          </div>

          {/* Monthly total */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.trends.monthlyTotal"
                  defaultMessage="Total ({months} months)"
                  values={{ months: monthlyData.length }}
                />
              </span>
              <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                {formatAmount(monthlyTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.trends.thisWeek" defaultMessage="This month" />
              </span>
              <p className="font-semibold text-gray-600 dark:text-gray-300">
                {formatAmount(monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].amount : 0)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

/**
 * MonthlyBarChart - SVG bar chart for 6-month view
 */
const MonthlyBarChart = memo(function MonthlyBarChart({
  data,
  labels,
  currentMonthKey,
  animated,
  formatAmount,
}: {
  data: MonthlyDataPoint[];
  labels: string[];
  currentMonthKey: string;
  animated: boolean;
  formatAmount: (cents: number) => string;
}) {
  const barChartHeight = 70;
  const barGap = 8;
  const barCount = data.length || 1;

  const maxAmount = useMemo(() => Math.max(...data.map((d) => d.amount), 1), [data]);

  return (
    <div className="w-full">
      {/* Bars */}
      <div className="flex items-end justify-between gap-1" style={{ height: barChartHeight }}>
        {data.map((entry, index) => {
          const isCurrent = entry.month === currentMonthKey;
          const barHeight = maxAmount > 0
            ? Math.max((entry.amount / maxAmount) * (barChartHeight - 16), 4)
            : 4;

          return (
            <div
              key={entry.month}
              className="flex-1 flex flex-col items-center justify-end gap-1"
              style={{ height: '100%' }}
            >
              {/* Amount label above bar (only if > 0) */}
              {entry.amount > 0 && (
                <span
                  className={`text-[8px] font-medium transition-opacity duration-500 ${
                    animated ? 'opacity-100' : 'opacity-0'
                  } ${isCurrent ? 'text-indigo-400' : 'text-gray-400'}`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  {formatAmount(entry.amount)}
                </span>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                  isCurrent
                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                    : 'bg-gradient-to-t from-indigo-600/40 to-indigo-400/40'
                }`}
                style={{
                  height: animated ? barHeight : 4,
                  transitionDelay: `${index * 80}ms`,
                  minWidth: 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Month labels */}
      <div className="flex justify-between mt-1.5">
        {labels.map((label, index) => {
          const isCurrent = data[index]?.month === currentMonthKey;
          return (
            <span
              key={index}
              className={`flex-1 text-center text-[9px] capitalize ${
                isCurrent
                  ? 'text-indigo-400 font-semibold'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
});

export default TrendsChartCard;
