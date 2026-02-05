/**
 * Stats Card Component
 * Displays a KPI with optional trend indicator
 */
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBg?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBg = 'bg-primary-100',
  trend,
  subtitle,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-5 border border-gray-100">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs sm:text-sm truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5">{value}</p>

          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}

          {subtitle && !trend && (
            <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`w-9 h-9 sm:w-12 sm:h-12 ${iconBg} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
