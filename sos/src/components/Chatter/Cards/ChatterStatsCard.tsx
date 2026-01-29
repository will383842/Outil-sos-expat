/**
 * ChatterStatsCard - Statistics card for chatter dashboard
 * Displays metrics like conversions, earnings, referrals, etc.
 */

import React from 'react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
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
}

const ChatterStatsCard: React.FC<ChatterStatsCardProps> = ({
  icon,
  label,
  value,
  subValue,
  gradient,
  iconBg,
  loading,
  trend,
}) => {
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
    <div className={`${UI.card} ${UI.cardHover} p-4 sm:p-5 min-h-[120px]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {value}
            </p>
            {trend && (
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
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
        <div className={`p-2.5 sm:p-3 rounded-xl ${iconBg} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default ChatterStatsCard;
