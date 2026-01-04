// src/components/admin/finance/FinanceFilters.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  RotateCcw,
  Check,
  CreditCard,
  Globe,
  DollarSign,
} from 'lucide-react';
import { countriesData, type CountryData } from '../../../data/countries';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'cancelled' | 'processing';
export type PaymentMethod = 'stripe' | 'paypal' | 'card' | 'bank_transfer' | 'apple_pay' | 'google_pay';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AUD';
export type DatePreset = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  preset: DatePreset;
}

export interface AmountRange {
  min: number | null;
  max: number | null;
}

export interface FinanceFiltersState {
  dateRange: DateRange;
  statuses: PaymentStatus[];
  paymentMethods: PaymentMethod[];
  countries: string[];
  currencies: Currency[];
  amountRange: AmountRange;
  search: string;
}

export interface FinanceFiltersProps {
  filters: FinanceFiltersState;
  onChange: (filters: FinanceFiltersState) => void;
  onReset?: () => void;
  className?: string;
  showAdvanced?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const getDefaultFilters = (): FinanceFiltersState => ({
  dateRange: {
    startDate: '',
    endDate: '',
    preset: '30d',
  },
  statuses: [],
  paymentMethods: [],
  countries: [],
  currencies: [],
  amountRange: {
    min: null,
    max: null,
  },
  search: '',
});

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_STATUSES: { value: PaymentStatus; color: string; bgColor: string; borderColor: string }[] = [
  { value: 'paid', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  { value: 'pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' },
  { value: 'processing', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
  { value: 'failed', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
  { value: 'refunded', color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
  { value: 'cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' },
];

const PAYMENT_METHODS: { value: PaymentMethod; icon: string }[] = [
  { value: 'stripe', icon: 'Stripe' },
  { value: 'paypal', icon: 'PayPal' },
  { value: 'card', icon: 'Card' },
  { value: 'bank_transfer', icon: 'Bank' },
  { value: 'apple_pay', icon: 'Apple Pay' },
  { value: 'google_pay', icon: 'Google Pay' },
];

const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'];

const DATE_PRESETS: DatePreset[] = ['today', '7d', '30d', 'this_month', 'last_month', 'custom'];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const calculateDateRange = (preset: DatePreset): { startDate: string; endDate: string } => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate: today };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split('T')[0], endDate: today };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: today };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }
    case 'custom':
    default:
      return { startDate: '', endDate: '' };
  }
};

const countActiveFilters = (filters: FinanceFiltersState): number => {
  let count = 0;
  if (filters.dateRange.preset !== '30d' || filters.dateRange.startDate || filters.dateRange.endDate) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.paymentMethods.length > 0) count++;
  if (filters.countries.length > 0) count++;
  if (filters.currencies.length > 0) count++;
  if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
  if (filters.search.trim()) count++;
  return count;
};

// ============================================================================
// INDIVIDUAL FILTER COMPONENTS
// ============================================================================

// DateRangeFilter Component
export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange, className = '' }) => {
  const intl = useIntl();

  const handlePresetChange = useCallback((preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset: 'custom' });
    } else {
      const { startDate, endDate } = calculateDateRange(preset);
      onChange({ startDate, endDate, preset });
    }
  }, [value, onChange]);

  const handleDateChange = useCallback((field: 'startDate' | 'endDate', date: string) => {
    onChange({ ...value, [field]: date, preset: 'custom' });
  }, [value, onChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        <Calendar size={14} className="inline mr-1.5" />
        {intl.formatMessage({ id: 'admin.finance.filters.dateRange', defaultMessage: 'Date Range' })}
      </label>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetChange(preset)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              value.preset === preset
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {intl.formatMessage({
              id: `admin.finance.filters.datePreset.${preset}`,
              defaultMessage: preset === 'today' ? 'Today' :
                             preset === '7d' ? '7 Days' :
                             preset === '30d' ? '30 Days' :
                             preset === 'this_month' ? 'This Month' :
                             preset === 'last_month' ? 'Last Month' : 'Custom'
            })}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {value.preset === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {intl.formatMessage({ id: 'admin.finance.filters.dateFrom', defaultMessage: 'From' })}
            </label>
            <input
              type="date"
              value={value.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {intl.formatMessage({ id: 'admin.finance.filters.dateTo', defaultMessage: 'To' })}
            </label>
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// StatusFilter Component
export interface StatusFilterProps {
  value: PaymentStatus[];
  onChange: (value: PaymentStatus[]) => void;
  className?: string;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({ value, onChange, className = '' }) => {
  const intl = useIntl();

  const handleToggle = useCallback((status: PaymentStatus) => {
    if (value.includes(status)) {
      onChange(value.filter(s => s !== status));
    } else {
      onChange([...value, status]);
    }
  }, [value, onChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {intl.formatMessage({ id: 'admin.finance.filters.status', defaultMessage: 'Status' })}
      </label>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_STATUSES.map(({ value: status, color, bgColor, borderColor }) => {
          const isSelected = value.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => handleToggle(status)}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md border transition-all ${
                isSelected
                  ? `${bgColor} ${color} ${borderColor} ring-2 ring-offset-1 ring-red-300`
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isSelected && <Check size={14} className="mr-1.5" />}
              {intl.formatMessage({
                id: `admin.finance.filters.status.${status}`,
                defaultMessage: status.charAt(0).toUpperCase() + status.slice(1)
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// PaymentMethodFilter Component
export interface PaymentMethodFilterProps {
  value: PaymentMethod[];
  onChange: (value: PaymentMethod[]) => void;
  className?: string;
}

export const PaymentMethodFilter: React.FC<PaymentMethodFilterProps> = ({ value, onChange, className = '' }) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback((method: PaymentMethod) => {
    if (value.includes(method)) {
      onChange(value.filter(m => m !== method));
    } else {
      onChange([...value, method]);
    }
  }, [value, onChange]);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <CreditCard size={14} className="inline mr-1.5" />
        {intl.formatMessage({ id: 'admin.finance.filters.paymentMethod', defaultMessage: 'Payment Method' })}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white text-sm hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
      >
        <span className="text-gray-700">
          {value.length === 0
            ? intl.formatMessage({ id: 'admin.finance.filters.allMethods', defaultMessage: 'All Methods' })
            : `${value.length} ${intl.formatMessage({ id: 'admin.finance.filters.selected', defaultMessage: 'selected' })}`
          }
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {PAYMENT_METHODS.map(({ value: method, icon }) => (
            <button
              key={method}
              type="button"
              onClick={() => handleToggle(method)}
              className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 text-left"
            >
              <div className={`w-5 h-5 border rounded mr-3 flex items-center justify-center ${
                value.includes(method) ? 'bg-red-600 border-red-600' : 'border-gray-300'
              }`}>
                {value.includes(method) && <Check size={14} className="text-white" />}
              </div>
              <span>{icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// CountryFilter Component
export interface CountryFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  language?: string;
}

export const CountryFilter: React.FC<CountryFilterProps> = ({
  value,
  onChange,
  className = '',
  language = 'en'
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getCountryName = useCallback((country: CountryData): string => {
    switch (language) {
      case 'fr': return country.nameFr;
      case 'es': return country.nameEs;
      case 'de': return country.nameDe;
      case 'pt': return country.namePt;
      case 'it': return country.nameIt;
      case 'nl': return country.nameNl;
      case 'ru': return country.nameRu;
      case 'zh': return country.nameZh;
      case 'ar': return country.nameAr;
      default: return country.nameEn;
    }
  }, [language]);

  const filteredCountries = useMemo(() => {
    return countriesData
      .filter(c => c.code !== 'SEPARATOR' && !c.disabled)
      .filter(c => {
        if (!searchTerm) return true;
        const name = getCountryName(c).toLowerCase();
        return name.includes(searchTerm.toLowerCase()) ||
               c.code.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }, [searchTerm, getCountryName]);

  const handleToggle = useCallback((code: string) => {
    if (value.includes(code)) {
      onChange(value.filter(c => c !== code));
    } else {
      onChange([...value, code]);
    }
  }, [value, onChange]);

  const selectedCountries = useMemo(() => {
    return countriesData.filter(c => value.includes(c.code));
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <Globe size={14} className="inline mr-1.5" />
        {intl.formatMessage({ id: 'admin.finance.filters.country', defaultMessage: 'Country' })}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white text-sm hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
      >
        <span className="text-gray-700 truncate">
          {value.length === 0
            ? intl.formatMessage({ id: 'admin.finance.filters.allCountries', defaultMessage: 'All Countries' })
            : selectedCountries.map(c => `${c.flag} ${c.code}`).join(', ')
          }
        </span>
        <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.finance.filters.searchCountry', defaultMessage: 'Search country...' })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-auto">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleToggle(country.code)}
                className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <div className={`w-5 h-5 border rounded mr-3 flex items-center justify-center flex-shrink-0 ${
                  value.includes(country.code) ? 'bg-red-600 border-red-600' : 'border-gray-300'
                }`}>
                  {value.includes(country.code) && <Check size={14} className="text-white" />}
                </div>
                <span className="mr-2 text-lg">{country.flag}</span>
                <span className="truncate">{getCountryName(country)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// CurrencyFilter Component
export interface CurrencyFilterProps {
  value: Currency[];
  onChange: (value: Currency[]) => void;
  className?: string;
}

export const CurrencyFilter: React.FC<CurrencyFilterProps> = ({ value, onChange, className = '' }) => {
  const intl = useIntl();

  const handleToggle = useCallback((currency: Currency) => {
    if (value.includes(currency)) {
      onChange(value.filter(c => c !== currency));
    } else {
      onChange([...value, currency]);
    }
  }, [value, onChange]);

  const getCurrencySymbol = (currency: Currency): string => {
    switch (currency) {
      case 'EUR': return '\u20AC';
      case 'USD': return '$';
      case 'GBP': return '\u00A3';
      case 'CHF': return 'CHF';
      case 'CAD': return 'C$';
      case 'AUD': return 'A$';
      default: return currency;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        <DollarSign size={14} className="inline mr-1.5" />
        {intl.formatMessage({ id: 'admin.finance.filters.currency', defaultMessage: 'Currency' })}
      </label>
      <div className="flex flex-wrap gap-2">
        {CURRENCIES.map((currency) => {
          const isSelected = value.includes(currency);
          return (
            <button
              key={currency}
              type="button"
              onClick={() => handleToggle(currency)}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md border transition-all ${
                isSelected
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium mr-1">{getCurrencySymbol(currency)}</span>
              {currency}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// AmountRangeFilter Component
export interface AmountRangeFilterProps {
  value: AmountRange;
  onChange: (value: AmountRange) => void;
  currency?: Currency;
  className?: string;
}

export const AmountRangeFilter: React.FC<AmountRangeFilterProps> = ({
  value,
  onChange,
  currency = 'EUR',
  className = ''
}) => {
  const intl = useIntl();

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    onChange({ ...value, min: val });
  }, [value, onChange]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    onChange({ ...value, max: val });
  }, [value, onChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {intl.formatMessage({ id: 'admin.finance.filters.amountRange', defaultMessage: 'Amount Range' })}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : '$'}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.min ?? ''}
            onChange={handleMinChange}
            placeholder={intl.formatMessage({ id: 'admin.finance.filters.min', defaultMessage: 'Min' })}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : '$'}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.max ?? ''}
            onChange={handleMaxChange}
            placeholder={intl.formatMessage({ id: 'admin.finance.filters.max', defaultMessage: 'Max' })}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>
    </div>
  );
};

// SearchFilter Component
export interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  value,
  onChange,
  placeholder,
  className = ''
}) => {
  const intl = useIntl();

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <Search size={14} className="inline mr-1.5" />
        {intl.formatMessage({ id: 'admin.finance.filters.search', defaultMessage: 'Search' })}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || intl.formatMessage({
            id: 'admin.finance.filters.searchPlaceholder',
            defaultMessage: 'Client name, email, ID...'
          })}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN FINANCE FILTERS COMPONENT
// ============================================================================

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  filters,
  onChange,
  onReset,
  className = '',
  showAdvanced = true,
  collapsible = true,
  defaultExpanded = false,
}) => {
  const intl = useIntl();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(defaultExpanded);
  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      onChange(getDefaultFilters());
    }
  }, [onChange, onReset]);

  const updateFilter = useCallback(<K extends keyof FinanceFiltersState>(
    key: K,
    value: FinanceFiltersState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <span className="font-medium text-gray-900">
            {intl.formatMessage({ id: 'admin.finance.filters.title', defaultMessage: 'Filters' })}
          </span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-red-600 text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <RotateCcw size={14} className="mr-1" />
            {intl.formatMessage({ id: 'admin.finance.filters.reset', defaultMessage: 'Reset' })}
          </button>
        )}
      </div>

      {/* Main Filters Section */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <SearchFilter
              value={filters.search}
              onChange={(value) => updateFilter('search', value)}
            />
          </div>

          {/* Date Range */}
          <div className="lg:col-span-2">
            <DateRangeFilter
              value={filters.dateRange}
              onChange={(value) => updateFilter('dateRange', value)}
            />
          </div>
        </div>

        {/* Status Filter (always visible) */}
        <div className="mt-4">
          <StatusFilter
            value={filters.statuses}
            onChange={(value) => updateFilter('statuses', value)}
          />
        </div>
      </div>

      {/* Advanced Filters Section */}
      {showAdvanced && (
        <>
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full px-4 py-2 flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              {isAdvancedOpen ? (
                <>
                  <ChevronUp size={16} className="mr-1" />
                  {intl.formatMessage({ id: 'admin.finance.filters.hideAdvanced', defaultMessage: 'Hide Advanced Filters' })}
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="mr-1" />
                  {intl.formatMessage({ id: 'admin.finance.filters.showAdvanced', defaultMessage: 'Show Advanced Filters' })}
                </>
              )}
            </button>
          )}

          {(!collapsible || isAdvancedOpen) && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Payment Method */}
                <PaymentMethodFilter
                  value={filters.paymentMethods}
                  onChange={(value) => updateFilter('paymentMethods', value)}
                />

                {/* Country */}
                <CountryFilter
                  value={filters.countries}
                  onChange={(value) => updateFilter('countries', value)}
                />

                {/* Currency */}
                <div className="lg:col-span-2">
                  <CurrencyFilter
                    value={filters.currencies}
                    onChange={(value) => updateFilter('currencies', value)}
                  />
                </div>

                {/* Amount Range */}
                <div className="lg:col-span-2">
                  <AmountRangeFilter
                    value={filters.amountRange}
                    onChange={(value) => updateFilter('amountRange', value)}
                    currency={filters.currencies.length === 1 ? filters.currencies[0] : 'EUR'}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Export default
export default FinanceFilters;
