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
import { UI } from '@/components/Chatter/designTokens';

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
      <div className={`${UI.card} p-3 sm:p-5 min-h-[90px] sm:min-h-[120px]`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`${UI.skeleton} h-3 sm:h-4 w-12 sm:w-20 mb-2 sm:mb-3`} />
            <div className={`${UI.skeleton} h-6 sm:h-8 w-14 sm:w-16 mb-1 sm:mb-2`} />
            <div className={`${UI.skeleton} h-3 w-16 sm:w-24 hidden sm:block`} />
          </div>
          <div className={`${UI.skeleton} h-9 w-9 sm:h-12 sm:w-12 rounded-xl hidden sm:block`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-3 sm:p-5 min-h-[90px] sm:min-h-[120px] opacity-0 animate-fade-in-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs dark:text-gray-400 md:text-sm font-medium truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
            <p className={`text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
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
                className={`text-[10px] sm:text-xs font-medium transition-all duration-300 ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subValue && (
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs dark:text-gray-400 md:text-sm truncate">
              {subValue}
            </p>
          )}
        </div>
        {/* Icon hidden on mobile to save space in 3-col grid */}
        <div
          className={`
            hidden sm:flex p-2.5 sm:p-3 rounded-xl ${iconBg} flex-shrink-0
            transition-transform duration-300
            group-hover:scale-110 items-center justify-center
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
});

export default ChatterStatsCard;
