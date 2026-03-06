/**
 * PartnerStatsCard - Generic stat card with icon, label, value, and optional trend
 */

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PartnerStatsCardProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: React.ReactNode;
}

const PartnerStatsCard: React.FC<PartnerStatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  subtitle,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {label}
        </span>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-xl dark:text-white sm:text-2xl font-bold">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend.isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default PartnerStatsCard;
