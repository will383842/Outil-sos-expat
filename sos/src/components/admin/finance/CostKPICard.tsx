// src/components/admin/finance/CostKPICard.tsx
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Database,
  Zap,
  HardDrive,
  Phone,
  CreditCard,
  Server,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';

/**
 * Service types for cost tracking
 */
export type CostServiceType =
  | 'firestore'
  | 'functions'
  | 'storage'
  | 'twilio'
  | 'stripe'
  | 'hosting'
  | 'other';

/**
 * Trend direction for cost changes
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Budget status level based on percentage used
 */
export type BudgetLevel = 'safe' | 'warning' | 'critical';

export interface CostKPICardProps {
  /** Service type (determines icon and default styling) */
  serviceType: CostServiceType;
  /** Title of the service */
  title: string;
  /** Current cost value */
  currentValue: number;
  /** Budget limit for this service */
  budgetLimit: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Percentage change from previous period */
  percentChange?: number;
  /** Trend direction */
  trend?: TrendDirection;
  /** Loading state */
  isLoading?: boolean;
  /** Click handler for drill-down */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon override */
  customIcon?: React.ReactNode;
  /** Show budget progress bar */
  showBudgetProgress?: boolean;
  /** Subtitle or description */
  subtitle?: string;
}

/**
 * Service icon mapping
 */
const serviceIcons: Record<CostServiceType, LucideIcon> = {
  firestore: Database,
  functions: Zap,
  storage: HardDrive,
  twilio: Phone,
  stripe: CreditCard,
  hosting: Server,
  other: Cloud,
};

/**
 * Service color themes
 */
const serviceColorThemes: Record<
  CostServiceType,
  { iconBg: string; iconColor: string; accent: string }
> = {
  firestore: {
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    accent: 'border-orange-200',
  },
  functions: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    accent: 'border-blue-200',
  },
  storage: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    accent: 'border-purple-200',
  },
  twilio: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    accent: 'border-red-200',
  },
  stripe: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    accent: 'border-indigo-200',
  },
  hosting: {
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    accent: 'border-cyan-200',
  },
  other: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    accent: 'border-gray-200',
  },
};

/**
 * Budget level color mapping
 */
const budgetLevelColors: Record<
  BudgetLevel,
  { bg: string; fill: string; text: string; badge: string }
> = {
  safe: {
    bg: 'bg-gray-200',
    fill: 'bg-green-500',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  warning: {
    bg: 'bg-gray-200',
    fill: 'bg-yellow-500',
    text: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  critical: {
    bg: 'bg-gray-200',
    fill: 'bg-red-500',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
};

/**
 * Determine budget level based on percentage used
 */
const getBudgetLevel = (percentage: number): BudgetLevel => {
  if (percentage >= 80) return 'critical';
  if (percentage >= 50) return 'warning';
  return 'safe';
};

/**
 * Skeleton loader component for loading state
 */
const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-gray-200 rounded w-28 mb-3"></div>
        <div className="h-3 bg-gray-200 rounded w-20 mb-4"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-full ml-4"></div>
    </div>
  </div>
);

/**
 * CostKPICard Component
 *
 * A specialized card component for displaying service cost KPIs with:
 * - Service-specific icons (Firestore, Functions, Storage, Twilio, Stripe)
 * - Current cost value with currency formatting
 * - Trend indicator (up/down with percentage)
 * - Budget progress bar with color-coded status
 * - Dynamic coloring based on budget utilization
 */
export const CostKPICard: React.FC<CostKPICardProps> = ({
  serviceType,
  title,
  currentValue,
  budgetLimit,
  currency = 'USD',
  percentChange,
  trend,
  isLoading = false,
  onClick,
  className,
  customIcon,
  showBudgetProgress = true,
  subtitle,
}) => {
  const intl = useIntl();

  // Calculate budget percentage
  const budgetPercentage = budgetLimit > 0
    ? Math.min((currentValue / budgetLimit) * 100, 100)
    : 0;
  const budgetLevel = getBudgetLevel(budgetPercentage);

  // Get service theme
  const theme = serviceColorThemes[serviceType];
  const budgetColors = budgetLevelColors[budgetLevel];

  // Get icon component
  const IconComponent = serviceIcons[serviceType];

  // Format currency value
  const formatCurrency = (value: number): string => {
    return intl.formatNumber(value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Determine trend direction if not explicitly provided
  const effectiveTrend: TrendDirection = trend ?? (
    percentChange !== undefined
      ? percentChange > 0
        ? 'up'
        : percentChange < 0
          ? 'down'
          : 'neutral'
      : 'neutral'
  );

  // For costs, "up" is typically bad (red) and "down" is good (green)
  const trendIsPositive = effectiveTrend === 'down';
  const trendColor = trendIsPositive ? 'text-green-600' : effectiveTrend === 'up' ? 'text-red-600' : 'text-gray-500';

  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl shadow-sm p-5 border transition-all duration-200',
        theme.accent,
        isClickable && 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.98]',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      aria-label={`${title}: ${formatCurrency(currentValue)}`}
    >
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          {/* Header Section */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-sm font-medium text-gray-500 truncate">
                {title}
              </h3>

              {/* Current Value */}
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(currentValue)}
              </p>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Service Icon */}
            <div className={cn('p-3 rounded-full flex-shrink-0 ml-3', theme.iconBg)}>
              {customIcon || <IconComponent size={24} className={theme.iconColor} />}
            </div>
          </div>

          {/* Trend Indicator */}
          {percentChange !== undefined && (
            <div className={cn('flex items-center text-sm mb-3', trendColor)}>
              {effectiveTrend === 'up' ? (
                <TrendingUp size={16} className="mr-1 flex-shrink-0" />
              ) : effectiveTrend === 'down' ? (
                <TrendingDown size={16} className="mr-1 flex-shrink-0" />
              ) : null}
              <span className="font-medium">
                {percentChange > 0 ? '+' : ''}
                {percentChange.toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-1.5 text-xs truncate">
                {intl.formatMessage({
                  id: 'finance.cost.vsPreviousPeriod',
                  defaultMessage: 'vs previous period',
                })}
              </span>
            </div>
          )}

          {/* Budget Progress Section */}
          {showBudgetProgress && budgetLimit > 0 && (
            <div className="mt-3">
              {/* Progress Bar */}
              <div className={cn('h-2 rounded-full overflow-hidden', budgetColors.bg)}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    budgetColors.fill
                  )}
                  style={{ width: `${budgetPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={budgetPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Budget utilization: ${budgetPercentage.toFixed(0)}%`}
                />
              </div>

              {/* Budget Info */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {intl.formatMessage(
                    {
                      id: 'finance.cost.budgetUsed',
                      defaultMessage: '{percentage}% of budget',
                    },
                    { percentage: budgetPercentage.toFixed(0) }
                  )}
                </span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', budgetColors.badge)}>
                  {formatCurrency(budgetLimit)}
                </span>
              </div>
            </div>
          )}

          {/* Budget Status Indicator (alternative display when no progress bar) */}
          {!showBudgetProgress && budgetLimit > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className={cn('text-xs font-medium', budgetColors.text)}>
                {budgetPercentage.toFixed(0)}%{' '}
                {intl.formatMessage({
                  id: 'finance.cost.ofBudget',
                  defaultMessage: 'of budget',
                })}
              </span>
              <span className="text-xs text-gray-400">
                {formatCurrency(budgetLimit)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * CostKPICardGrid Component
 *
 * A convenience wrapper for displaying multiple CostKPICards in a responsive grid
 */
export interface CostKPICardGridProps {
  /** Array of CostKPICard props */
  cards: CostKPICardProps[];
  /** Number of columns (default: auto-responsive) */
  columns?: 1 | 2 | 3 | 4;
  /** Additional CSS classes */
  className?: string;
  /** Loading state for all cards */
  isLoading?: boolean;
}

export const CostKPICardGrid: React.FC<CostKPICardGridProps> = ({
  cards,
  columns,
  className,
  isLoading = false,
}) => {
  const gridCols = columns
    ? {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      }[columns]
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {cards.map((cardProps, index) => (
        <CostKPICard
          key={`${cardProps.serviceType}-${index}`}
          {...cardProps}
          isLoading={isLoading || cardProps.isLoading}
        />
      ))}
    </div>
  );
};

export default CostKPICard;
