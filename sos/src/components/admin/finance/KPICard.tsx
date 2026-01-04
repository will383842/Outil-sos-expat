// src/components/admin/finance/KPICard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  /** Title of the KPI card */
  title: string;
  /** Value to display (number or formatted string) */
  value: number | string;
  /** Icon component to display */
  icon?: React.ReactNode;
  /** Percentage change compared to previous period */
  percentChange?: number;
  /** Currency code for currency formatting (e.g., 'EUR', 'USD') */
  currency?: string;
  /** Format value as currency */
  isCurrency?: boolean;
  /** Optional suffix to append (e.g., '%', 'min') */
  suffix?: string;
  /** Loading state - shows skeleton */
  isLoading?: boolean;
  /** Click handler for drill-down */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Color theme for the card */
  colorTheme?: 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'cyan' | 'default';
}

const colorThemes = {
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
  },
  green: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
  },
  red: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
  },
  purple: {
    text: 'text-purple-600',
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
  },
  amber: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
  },
  cyan: {
    text: 'text-cyan-600',
    bg: 'bg-cyan-50',
    iconBg: 'bg-cyan-100',
  },
  default: {
    text: 'text-gray-900',
    bg: 'bg-white',
    iconBg: 'bg-gray-100',
  },
};

const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-20"></div>
  </div>
);

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  percentChange,
  currency = 'EUR',
  isCurrency = false,
  suffix,
  isLoading = false,
  onClick,
  className,
  colorTheme = 'default',
}) => {
  const intl = useIntl();
  const theme = colorThemes[colorTheme];

  const formatValue = (): string => {
    if (typeof value === 'string') return value;

    if (isCurrency) {
      return intl.formatNumber(value, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return intl.formatNumber(value);
  };

  const isPositiveChange = percentChange !== undefined && percentChange >= 0;
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg shadow-sm p-4 border border-gray-200 transition-all duration-200',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.98]',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', theme.text)}>
              {formatValue()}
              {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
            </p>
            {percentChange !== undefined && (
              <div
                className={cn(
                  'flex items-center text-sm mt-1',
                  isPositiveChange ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositiveChange ? (
                  <TrendingUp size={14} className="mr-1 flex-shrink-0" />
                ) : (
                  <TrendingDown size={14} className="mr-1 flex-shrink-0" />
                )}
                <span>
                  {isPositiveChange ? '+' : ''}
                  {percentChange.toFixed(1)}%
                </span>
                <span className="text-gray-400 ml-1 truncate">
                  {intl.formatMessage({ id: 'finance.kpi.vsPreviousPeriod', defaultMessage: 'vs previous period' })}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-3 rounded-full flex-shrink-0 ml-3', theme.iconBg)}>
              {icon}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
