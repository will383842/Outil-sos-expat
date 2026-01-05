// src/components/admin/finance/RateLimitStats.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, MessageSquare, Phone, Users, Clock, AlertTriangle } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';

// Types
export type RateLimitType = 'sms' | 'voice' | 'contact';

export interface RateLimitData {
  type: RateLimitType;
  used: number;
  limit: number;
  resetAt: Date;
}

export interface RateLimitStatsProps {
  /** Data for rate limits - if not provided, will use mock data */
  data?: RateLimitData[];
  /** Custom fetch function to get rate limit data */
  fetchData?: () => Promise<RateLimitData[]>;
  /** Auto-refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number;
  /** Whether to show the refresh button */
  showRefreshButton?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when data is refreshed */
  onRefresh?: () => void;
}

// Utility functions
const getTypeIcon = (type: RateLimitType): React.ReactNode => {
  const iconClass = 'w-5 h-5';
  switch (type) {
    case 'sms':
      return <MessageSquare className={iconClass} />;
    case 'voice':
      return <Phone className={iconClass} />;
    case 'contact':
      return <Users className={iconClass} />;
    default:
      return null;
  }
};

const getTypeLabel = (type: RateLimitType, intl: ReturnType<typeof useIntl>): string => {
  switch (type) {
    case 'sms':
      return intl.formatMessage({ id: 'rateLimit.type.sms', defaultMessage: 'SMS' });
    case 'voice':
      return intl.formatMessage({ id: 'rateLimit.type.voice', defaultMessage: 'Voice' });
    case 'contact':
      return intl.formatMessage({ id: 'rateLimit.type.contact', defaultMessage: 'Contact' });
    default:
      return type;
  }
};

const getUsagePercentage = (used: number, limit: number): number => {
  if (limit === 0) return 100;
  return Math.min((used / limit) * 100, 100);
};

const getUsageColor = (percentage: number): { bg: string; text: string; progress: string } => {
  if (percentage >= 90) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      progress: 'bg-red-500',
    };
  }
  if (percentage >= 70) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      progress: 'bg-amber-500',
    };
  }
  if (percentage >= 50) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      progress: 'bg-yellow-500',
    };
  }
  return {
    bg: 'bg-green-50',
    text: 'text-green-700',
    progress: 'bg-green-500',
  };
};

const formatTimeUntilReset = (resetAt: Date, intl: ReturnType<typeof useIntl>): string => {
  const now = new Date();
  const diffMs = resetAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return intl.formatMessage({ id: 'rateLimit.reset.now', defaultMessage: 'Now' });
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    return intl.formatMessage(
      { id: 'rateLimit.reset.hours', defaultMessage: '{hours}h {minutes}m' },
      { hours: diffHours, minutes: diffMinutes % 60 }
    );
  }
  if (diffMinutes > 0) {
    return intl.formatMessage(
      { id: 'rateLimit.reset.minutes', defaultMessage: '{minutes}m {seconds}s' },
      { minutes: diffMinutes, seconds: diffSeconds % 60 }
    );
  }
  return intl.formatMessage(
    { id: 'rateLimit.reset.seconds', defaultMessage: '{seconds}s' },
    { seconds: diffSeconds }
  );
};

// Mock data generator for demo purposes
const generateMockData = (): RateLimitData[] => {
  const now = new Date();
  return [
    {
      type: 'sms',
      used: Math.floor(Math.random() * 800) + 100,
      limit: 1000,
      resetAt: new Date(now.getTime() + 3600000), // 1 hour from now
    },
    {
      type: 'voice',
      used: Math.floor(Math.random() * 400) + 50,
      limit: 500,
      resetAt: new Date(now.getTime() + 1800000), // 30 min from now
    },
    {
      type: 'contact',
      used: Math.floor(Math.random() * 90) + 10,
      limit: 100,
      resetAt: new Date(now.getTime() + 7200000), // 2 hours from now
    },
  ];
};

// Progress Bar Component
interface ProgressBarProps {
  percentage: number;
  colorClass: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, colorClass, showLabel = false }) => (
  <div className="relative w-full">
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={cn('h-2.5 rounded-full transition-all duration-500 ease-out', colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
    {showLabel && (
      <span className="absolute right-0 -top-5 text-xs text-gray-500">{percentage.toFixed(0)}%</span>
    )}
  </div>
);

// Table Row Component
interface RateLimitRowProps {
  data: RateLimitData;
  intl: ReturnType<typeof useIntl>;
}

const RateLimitRow: React.FC<RateLimitRowProps> = ({ data, intl }) => {
  const percentage = getUsagePercentage(data.used, data.limit);
  const colors = getUsageColor(percentage);
  const remaining = Math.max(data.limit - data.used, 0);
  const timeUntilReset = formatTimeUntilReset(data.resetAt, intl);

  return (
    <tr className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', colors.bg)}>
      {/* Type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('p-1.5 rounded-lg', colors.bg, colors.text)}>
            {getTypeIcon(data.type)}
          </span>
          <span className="font-medium text-gray-900">{getTypeLabel(data.type, intl)}</span>
        </div>
      </td>

      {/* Used */}
      <td className="px-4 py-3 text-center">
        <span className={cn('font-semibold', colors.text)}>
          {intl.formatNumber(data.used)}
        </span>
      </td>

      {/* Limit */}
      <td className="px-4 py-3 text-center">
        <span className="text-gray-600">{intl.formatNumber(data.limit)}</span>
      </td>

      {/* Remaining */}
      <td className="px-4 py-3 text-center">
        <span className={cn('font-medium', remaining === 0 ? 'text-red-600' : 'text-gray-700')}>
          {intl.formatNumber(remaining)}
        </span>
      </td>

      {/* Progress Bar */}
      <td className="px-4 py-3 w-40">
        <div className="flex items-center gap-2">
          <ProgressBar percentage={percentage} colorClass={colors.progress} />
          <span className={cn('text-xs font-medium min-w-[40px] text-right', colors.text)}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </td>

      {/* Reset Time */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{timeUntilReset}</span>
        </div>
      </td>
    </tr>
  );
};

// Skeleton Loader
const SkeletonRow: React.FC = () => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

// Warning Banner for high usage
interface WarningBannerProps {
  criticalTypes: RateLimitType[];
  intl: ReturnType<typeof useIntl>;
}

const WarningBanner: React.FC<WarningBannerProps> = ({ criticalTypes, intl }) => {
  if (criticalTypes.length === 0) return null;

  const typeLabels = criticalTypes.map((t) => getTypeLabel(t, intl)).join(', ');

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">
        {intl.formatMessage(
          {
            id: 'rateLimit.warning.highUsage',
            defaultMessage: 'High usage detected for: {types}. Consider monitoring closely.',
          },
          { types: typeLabels }
        )}
      </span>
    </div>
  );
};

// Main Component
export const RateLimitStats: React.FC<RateLimitStatsProps> = ({
  data: externalData,
  fetchData,
  refreshInterval = 30000,
  showRefreshButton = true,
  isLoading: externalLoading,
  className,
  onRefresh,
}) => {
  const intl = useIntl();
  const [internalData, setInternalData] = useState<RateLimitData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(refreshInterval / 1000);

  // Use external data if provided, otherwise use internal data
  const data = externalData ?? internalData;
  const isLoading = externalLoading ?? (data.length === 0 && !externalData);

  // Fetch data function
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (fetchData) {
        const newData = await fetchData();
        setInternalData(newData);
      } else if (!externalData) {
        // Use mock data if no fetch function and no external data
        setInternalData(generateMockData());
      }
      setLastUpdated(new Date());
      setCountdown(refreshInterval / 1000);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to fetch rate limit data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData, externalData, refreshInterval, onRefresh]);

  // Initial fetch
  useEffect(() => {
    if (!externalData) {
      refreshData();
    }
  }, [externalData, refreshData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, refreshData]);

  // Countdown timer
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const countdownId = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : refreshInterval / 1000));
    }, 1000);

    return () => clearInterval(countdownId);
  }, [refreshInterval]);

  // Find critical types (>= 80% usage)
  const criticalTypes = data
    .filter((item) => getUsagePercentage(item.used, item.limit) >= 80)
    .map((item) => item.type);

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {intl.formatMessage({ id: 'rateLimit.title', defaultMessage: 'Rate Limit Status' })}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {intl.formatMessage(
              { id: 'rateLimit.lastUpdated', defaultMessage: 'Last updated: {time}' },
              { time: intl.formatTime(lastUpdated, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Countdown */}
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {intl.formatMessage(
              { id: 'rateLimit.nextRefresh', defaultMessage: 'Refresh in {seconds}s' },
              { seconds: countdown }
            )}
          </div>
          {/* Refresh button */}
          {showRefreshButton && (
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={intl.formatMessage({ id: 'rateLimit.refresh', defaultMessage: 'Refresh' })}
            >
              <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="px-6 pt-4">
        <WarningBanner criticalTypes={criticalTypes} intl={intl} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm">
              <th className="px-4 py-3 text-left font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.type', defaultMessage: 'Type' })}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.used', defaultMessage: 'Used' })}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.limit', defaultMessage: 'Limit' })}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.remaining', defaultMessage: 'Remaining' })}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.usage', defaultMessage: 'Usage' })}
              </th>
              <th className="px-4 py-3 text-center font-medium">
                {intl.formatMessage({ id: 'rateLimit.column.reset', defaultMessage: 'Reset' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {intl.formatMessage({
                    id: 'rateLimit.noData',
                    defaultMessage: 'No rate limit data available',
                  })}
                </td>
              </tr>
            ) : (
              data.map((item) => <RateLimitRow key={item.type} data={item} intl={intl} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with summary */}
      {!isLoading && data.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {intl.formatMessage(
                {
                  id: 'rateLimit.summary.total',
                  defaultMessage: 'Total: {used} / {limit} requests used',
                },
                {
                  used: intl.formatNumber(data.reduce((sum, item) => sum + item.used, 0)),
                  limit: intl.formatNumber(data.reduce((sum, item) => sum + item.limit, 0)),
                }
              )}
            </span>
            <span className="text-gray-400">
              {intl.formatMessage({
                id: 'rateLimit.summary.autoRefresh',
                defaultMessage: 'Auto-refreshes every 30 seconds',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLimitStats;
