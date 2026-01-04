// src/components/admin/finance/DateRangeQuickSelect.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';

export type QuickSelectPreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'all'
  | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface DateRangeQuickSelectProps {
  /** Currently selected date range */
  value: DateRange;
  /** Handler for date range changes */
  onChange: (range: DateRange, preset: QuickSelectPreset) => void;
  /** Currently selected preset */
  selectedPreset?: QuickSelectPreset;
  /** Available presets (defaults to all) */
  presets?: QuickSelectPreset[];
  /** Compact mode (inline buttons instead of dropdown) */
  compact?: boolean;
  /** Show custom date picker */
  showCustomPicker?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
}

const getPresetDateRange = (preset: QuickSelectPreset): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday,
        endDate: new Date(today.getTime() - 1),
      };
    }

    case 'last7days':
      return {
        startDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'last30days':
      return {
        startDate: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'last90days':
      return {
        startDate: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };

    case 'thisMonth': {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: firstDayOfMonth,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'lastMonth': {
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: firstDayOfLastMonth,
        endDate: new Date(lastDayOfLastMonth.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'thisQuarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDayOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return {
        startDate: firstDayOfQuarter,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'thisYear': {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: firstDayOfYear,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'lastYear': {
      const firstDayOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const lastDayOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: firstDayOfLastYear,
        endDate: new Date(lastDayOfLastYear.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'all':
      return {
        startDate: null,
        endDate: null,
      };

    case 'custom':
    default:
      return {
        startDate: null,
        endDate: null,
      };
  }
};

const defaultPresets: QuickSelectPreset[] = [
  'today',
  'yesterday',
  'last7days',
  'last30days',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'thisYear',
  'all',
];

export const DateRangeQuickSelect: React.FC<DateRangeQuickSelectProps> = ({
  value,
  onChange,
  selectedPreset = 'last30days',
  presets = defaultPresets,
  compact = false,
  showCustomPicker = true,
  className,
  placeholder,
  disabled = false,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preset labels
  const presetLabels: Record<QuickSelectPreset, string> = useMemo(
    () => ({
      today: intl.formatMessage({ id: 'finance.dateRange.today', defaultMessage: 'Today' }),
      yesterday: intl.formatMessage({ id: 'finance.dateRange.yesterday', defaultMessage: 'Yesterday' }),
      last7days: intl.formatMessage({ id: 'finance.dateRange.last7days', defaultMessage: 'Last 7 days' }),
      last30days: intl.formatMessage({ id: 'finance.dateRange.last30days', defaultMessage: 'Last 30 days' }),
      last90days: intl.formatMessage({ id: 'finance.dateRange.last90days', defaultMessage: 'Last 90 days' }),
      thisMonth: intl.formatMessage({ id: 'finance.dateRange.thisMonth', defaultMessage: 'This month' }),
      lastMonth: intl.formatMessage({ id: 'finance.dateRange.lastMonth', defaultMessage: 'Last month' }),
      thisQuarter: intl.formatMessage({ id: 'finance.dateRange.thisQuarter', defaultMessage: 'This quarter' }),
      thisYear: intl.formatMessage({ id: 'finance.dateRange.thisYear', defaultMessage: 'This year' }),
      lastYear: intl.formatMessage({ id: 'finance.dateRange.lastYear', defaultMessage: 'Last year' }),
      all: intl.formatMessage({ id: 'finance.dateRange.all', defaultMessage: 'All time' }),
      custom: intl.formatMessage({ id: 'finance.dateRange.custom', defaultMessage: 'Custom range' }),
    }),
    [intl]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = useCallback(
    (preset: QuickSelectPreset) => {
      if (preset === 'custom') {
        // Don't close dropdown, show custom picker
        return;
      }
      const range = getPresetDateRange(preset);
      onChange(range, preset);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      onChange({ startDate, endDate }, 'custom');
      setIsOpen(false);
    }
  }, [customStartDate, customEndDate, onChange]);

  const formatDisplayValue = (): string => {
    if (selectedPreset === 'custom' && value.startDate && value.endDate) {
      return `${intl.formatDate(value.startDate)} - ${intl.formatDate(value.endDate)}`;
    }
    return presetLabels[selectedPreset] || placeholder || presetLabels.last30days;
  };

  // Compact mode: inline buttons
  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
              selectedPreset === preset
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {presetLabels[preset]}
          </button>
        ))}
      </div>
    );
  }

  // Full mode: dropdown
  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors',
          'bg-white text-gray-700 border-gray-300',
          'hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-red-500 border-red-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Calendar size={16} className="text-gray-500" />
        <span>{formatDisplayValue()}</span>
        <ChevronDown
          size={16}
          className={cn('text-gray-500 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Preset Options */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors',
                  selectedPreset === preset
                    ? 'bg-red-50 text-red-600 font-medium'
                    : 'text-gray-700'
                )}
              >
                {presetLabels[preset]}
              </button>
            ))}
          </div>

          {/* Custom Date Picker */}
          {showCustomPicker && (
            <div className="border-t border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'finance.dateRange.customRange', defaultMessage: 'Custom range' })}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {intl.formatMessage({ id: 'finance.dateRange.startDate', defaultMessage: 'Start date' })}
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {intl.formatMessage({ id: 'finance.dateRange.endDate', defaultMessage: 'End date' })}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customStartDate || !customEndDate}
                  className={cn(
                    'w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    customStartDate && customEndDate
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {intl.formatMessage({ id: 'finance.dateRange.apply', defaultMessage: 'Apply' })}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simplified hook for using date range
export const useDateRangeQuickSelect = (initialPreset: QuickSelectPreset = 'last30days') => {
  const [selectedPreset, setSelectedPreset] = useState<QuickSelectPreset>(initialPreset);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange(initialPreset));

  const handleChange = useCallback((range: DateRange, preset: QuickSelectPreset) => {
    setDateRange(range);
    setSelectedPreset(preset);
  }, []);

  const reset = useCallback(() => {
    const range = getPresetDateRange(initialPreset);
    setDateRange(range);
    setSelectedPreset(initialPreset);
  }, [initialPreset]);

  return {
    dateRange,
    selectedPreset,
    handleChange,
    reset,
    getPresetDateRange,
  };
};

export default DateRangeQuickSelect;
