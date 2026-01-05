// src/components/admin/finance/UsageChart.tsx
// Usage Chart component for displaying cost evolution over time
import React, { useState, useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PeriodType = '7d' | '30d' | '90d' | '365d' | 'all';

export interface UsageDataPoint {
  /** Date label for the X axis */
  date: string;
  /** Raw date value for sorting */
  timestamp: number;
  /** Firestore costs in cents/euros */
  firestore: number;
  /** Cloud Functions costs */
  functions: number;
  /** Cloud Storage costs */
  storage: number;
  /** Twilio SMS/Voice costs */
  twilio: number;
  /** Total costs (computed) */
  total?: number;
}

export interface UsageChartProps {
  /** Data points to display */
  data: UsageDataPoint[];
  /** Selected period */
  period?: PeriodType;
  /** Callback when period changes */
  onPeriodChange?: (period: PeriodType) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Callback for refresh action */
  onRefresh?: () => void;
  /** Show period selector */
  showPeriodSelector?: boolean;
  /** Chart height */
  height?: number;
  /** Currency for formatting */
  currency?: string;
  /** Additional CSS classes */
  className?: string;
  /** Title for the chart */
  title?: string;
  /** Show total line */
  showTotal?: boolean;
}

export interface SeriesConfig {
  key: keyof Omit<UsageDataPoint, 'date' | 'timestamp'>;
  name: string;
  color: string;
  enabled: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PERIOD_OPTIONS: { value: PeriodType; label: string; labelKey: string }[] = [
  { value: '7d', label: '7 jours', labelKey: 'finance.period.7days' },
  { value: '30d', label: '30 jours', labelKey: 'finance.period.30days' },
  { value: '90d', label: '90 jours', labelKey: 'finance.period.90days' },
  { value: '365d', label: '12 mois', labelKey: 'finance.period.12months' },
  { value: 'all', label: 'Tout', labelKey: 'finance.period.all' },
];

const DEFAULT_SERIES: SeriesConfig[] = [
  { key: 'firestore', name: 'Firestore', color: '#F59E0B', enabled: true },
  { key: 'functions', name: 'Functions', color: '#3B82F6', enabled: true },
  { key: 'storage', name: 'Storage', color: '#10B981', enabled: true },
  { key: 'twilio', name: 'Twilio', color: '#8B5CF6', enabled: true },
  { key: 'total', name: 'Total', color: '#EF4444', enabled: false },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number, currency: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const calculateTrend = (data: UsageDataPoint[]): number => {
  if (data.length < 2) return 0;

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + (d.total || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + (d.total || 0), 0) / secondHalf.length;

  if (firstAvg === 0) return 0;
  return ((secondAvg - firstAvg) / firstAvg) * 100;
};

// ============================================================================
// Sub-components
// ============================================================================

interface PeriodSelectorProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
  disabled?: boolean;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange, disabled }) => {
  const intl = useIntl();

  return (
    <div className="flex items-center gap-2">
      <Calendar size={16} className="text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodType)}
        disabled={disabled}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm
                   focus:ring-2 focus:ring-red-500 focus:border-red-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   bg-white"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {intl.formatMessage({ id: option.labelKey, defaultMessage: option.label })}
          </option>
        ))}
      </select>
    </div>
  );
};

interface LegendItemProps {
  series: SeriesConfig;
  onClick: () => void;
}

const LegendItem: React.FC<LegendItemProps> = ({ series, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
      'border hover:shadow-sm',
      series.enabled
        ? 'bg-white border-gray-200 text-gray-700'
        : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
    )}
  >
    <span
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: series.enabled ? series.color : '#D1D5DB' }}
    />
    {series.name}
  </button>
);

interface InteractiveLegendProps {
  series: SeriesConfig[];
  onToggle: (key: string) => void;
}

const InteractiveLegend: React.FC<InteractiveLegendProps> = ({ series, onToggle }) => (
  <div className="flex flex-wrap gap-2 justify-center mt-4">
    {series.map((s) => (
      <LegendItem
        key={s.key}
        series={s}
        onClick={() => onToggle(s.key)}
      />
    ))}
  </div>
);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: string;
  currency: string;
  locale: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  currency,
  locale,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(entry.value || 0, currency, locale)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Total</span>
        <span className="text-sm font-bold text-gray-900">
          {formatCurrency(total, currency, locale)}
        </span>
      </div>
    </div>
  );
};

interface TrendIndicatorProps {
  trend: number;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend }) => {
  const isPositive = trend >= 0;
  // For costs, positive trend (increasing costs) is bad (red), negative is good (green)
  const colorClass = isPositive ? 'text-red-600' : 'text-green-600';
  const bgClass = isPositive ? 'bg-red-50' : 'bg-green-50';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium', bgClass, colorClass)}>
      <Icon size={14} />
      <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const UsageChart: React.FC<UsageChartProps> = ({
  data,
  period = '30d',
  onPeriodChange,
  isLoading = false,
  onRefresh,
  showPeriodSelector = true,
  height = 350,
  currency = 'EUR',
  className,
  title,
  showTotal = false,
}) => {
  const intl = useIntl();
  const locale = intl.locale || 'fr-FR';

  // State for series visibility
  const [seriesConfig, setSeriesConfig] = useState<SeriesConfig[]>(() =>
    DEFAULT_SERIES.map((s) => ({
      ...s,
      enabled: s.key === 'total' ? showTotal : s.enabled,
    }))
  );

  // Compute data with totals
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      total: point.firestore + point.functions + point.storage + point.twilio,
    }));
  }, [data]);

  // Calculate trend
  const trend = useMemo(() => calculateTrend(chartData), [chartData]);

  // Calculate totals for the period
  const periodTotals = useMemo(() => {
    return {
      firestore: chartData.reduce((sum, d) => sum + d.firestore, 0),
      functions: chartData.reduce((sum, d) => sum + d.functions, 0),
      storage: chartData.reduce((sum, d) => sum + d.storage, 0),
      twilio: chartData.reduce((sum, d) => sum + d.twilio, 0),
      total: chartData.reduce((sum, d) => sum + (d.total || 0), 0),
    };
  }, [chartData]);

  // Toggle series visibility
  const handleToggleSeries = useCallback((key: string) => {
    setSeriesConfig((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  // Handle period change
  const handlePeriodChange = useCallback(
    (newPeriod: PeriodType) => {
      onPeriodChange?.(newPeriod);
    },
    [onPeriodChange]
  );

  // Enabled series for rendering
  const enabledSeries = useMemo(
    () => seriesConfig.filter((s) => s.enabled),
    [seriesConfig]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={32} className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">
              {intl.formatMessage({ id: 'common.loading', defaultMessage: 'Chargement...' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-gray-500">
            {intl.formatMessage({ id: 'finance.noData', defaultMessage: 'Aucune donnee disponible' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            )}
            <TrendIndicator trend={trend} />
          </div>

          <div className="flex items-center gap-3">
            {showPeriodSelector && (
              <PeriodSelector
                value={period}
                onChange={handlePeriodChange}
                disabled={isLoading}
              />
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700
                         bg-gray-100 hover:bg-gray-200 rounded-md transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                {intl.formatMessage({ id: 'common.refresh', defaultMessage: 'Actualiser' })}
              </button>
            )}
          </div>
        </div>

        {/* Period totals summary */}
        <div className="flex flex-wrap gap-4 mt-4">
          {seriesConfig
            .filter((s) => s.key !== 'total')
            .map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-gray-500">{s.name}:</span>
                <span className="text-xs font-medium text-gray-700">
                  {formatCurrency(periodTotals[s.key as keyof typeof periodTotals] || 0, currency, locale)}
                </span>
              </div>
            ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-gray-500">Total:</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(periodTotals.total, currency, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              stroke="#9CA3AF"
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              stroke="#9CA3AF"
              tickLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => `${value}${currency === 'EUR' ? '€' : '$'}`}
            />
            <Tooltip
              content={
                <CustomTooltip
                  currency={currency}
                  locale={locale}
                />
              }
            />
            <Legend content={() => null} />

            {enabledSeries.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={series.key === 'total' ? 3 : 2}
                dot={{
                  fill: series.color,
                  strokeWidth: 2,
                  r: 3,
                }}
                activeDot={{
                  fill: series.color,
                  strokeWidth: 2,
                  r: 5,
                }}
                strokeDasharray={series.key === 'total' ? '5 5' : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Interactive Legend */}
        <InteractiveLegend series={seriesConfig} onToggle={handleToggleSeries} />
      </div>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default UsageChart;
