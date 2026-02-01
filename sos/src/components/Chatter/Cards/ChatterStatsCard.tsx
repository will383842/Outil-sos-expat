/**
 * ChatterStatsCard - Statistics card for chatter dashboard
 * Displays metrics like conversions, earnings, referrals, etc.
 *
 * Features:
 * - Animated number count-up
 * - Hover lift effect
 * - Shimmer loading state
 * - Staggered entrance animation support
 */

import React, { memo, useMemo } from 'react';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens with enhanced hover effects
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: `
    transition-all duration-300 ease-out
    hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
    hover:-translate-y-1
    active:scale-[0.98]
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

interface ChatterStatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  gradient: string;
  iconBg: string;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
  /** Whether to animate the number value */
  animateValue?: boolean;
}

const ChatterStatsCard = memo(function ChatterStatsCard({
  icon,
  label,
  value,
  subValue,
  gradient,
  iconBg,
  loading,
  trend,
  animationDelay = 0,
  animateValue = true,
}: ChatterStatsCardProps) {
  // Determine if value is a currency (all amounts are in USD, stored in cents)
  const valueInfo = useMemo(() => {
    if (typeof value === 'number') {
      return { type: 'number' as const, numericValue: value };
    }

    const stringValue = String(value);
    // Check if it's a USD currency value like "$123.45"
    const dollarMatch = stringValue.match(/^\$?([\d,.]+)/);

    if (dollarMatch) {
      const numericValue = parseFloat(dollarMatch[1].replace(/[,\s]/g, '')) * 100; // Convert to cents
      return { type: 'currency' as const, numericValue, currency: 'USD' };
    }

    return { type: 'string' as const, stringValue };
  }, [value]);

  // Loading skeleton with shimmer effect
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5 min-h-[120px]`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`${UI.skeleton} h-4 w-20 mb-3`} />
            <div className={`${UI.skeleton} h-8 w-16 mb-2`} />
            <div className={`${UI.skeleton} h-3 w-24`} />
          </div>
          <div className={`${UI.skeleton} h-12 w-12 rounded-xl`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-4 sm:p-5 min-h-[120px] opacity-0 animate-fade-in-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {animateValue && valueInfo.type === 'number' ? (
                <AnimatedNumber
                  value={valueInfo.numericValue}
                  duration={1200}
                  delay={animationDelay + 200}
                  animateOnVisible
                />
              ) : animateValue && valueInfo.type === 'currency' ? (
                <AnimatedNumber
                  value={valueInfo.numericValue}
                  isCurrency
                  currencyCode={valueInfo.currency}
                  duration={1200}
                  delay={animationDelay + 200}
                  animateOnVisible
                />
              ) : (
                value
              )}
            </p>
            {trend && (
              <span
                className={`text-xs font-medium transition-all duration-300 ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subValue && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {subValue}
            </p>
          )}
        </div>
        <div
          className={`
            p-2.5 sm:p-3 rounded-xl ${iconBg} flex-shrink-0
            transition-transform duration-300
            group-hover:scale-110
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
});

export default ChatterStatsCard;
