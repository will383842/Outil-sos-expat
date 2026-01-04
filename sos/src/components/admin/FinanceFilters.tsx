// src/components/admin/FinanceFilters.tsx
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Search,
  Calendar,
  Filter,
  X,
  ChevronDown,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import Button from '../common/Button';

// =============================================================================
// TYPES
// =============================================================================

export type TransactionType = 'all' | 'call_payment' | 'subscription' | 'refund' | 'payout';
export type TransactionStatus = 'all' | 'paid' | 'pending' | 'refunded' | 'disputed' | 'failed';
export type PaymentMethod = 'all' | 'stripe' | 'paypal';

export interface FinanceFiltersState {
  search: string;
  status: TransactionStatus;
  type: TransactionType;
  method: PaymentMethod;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

export interface FinanceFiltersProps {
  filters: FinanceFiltersState;
  onFiltersChange: (filters: FinanceFiltersState) => void;
  onReset: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  showAdvanced?: boolean;
}

// =============================================================================
// DEFAULT FILTERS
// =============================================================================

export const defaultFinanceFilters: FinanceFiltersState = {
  search: '',
  status: 'all',
  type: 'all',
  method: 'all',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
};

// =============================================================================
// COMPONENT
// =============================================================================

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isLoading = false,
  showAdvanced: initialShowAdvanced = false,
}) => {
  const intl = useIntl();
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleChange = useCallback(
    <K extends keyof FinanceFiltersState>(key: K, value: FinanceFiltersState[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const handleSearchClear = useCallback(() => {
    handleChange('search', '');
    searchInputRef.current?.focus();
  }, [handleChange]);

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.method !== 'all' ||
    filters.startDate !== '' ||
    filters.endDate !== '' ||
    filters.minAmount !== '' ||
    filters.maxAmount !== '' ||
    filters.search !== '';

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Main Filter Row */}
      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {intl.formatMessage({ id: 'admin.transactions.filters.search' })}
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder={intl.formatMessage({ id: 'admin.transactions.filters.searchPlaceholder' })}
                value={filters.search}
                onChange={(e) => handleChange('search', e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {filters.search && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label={intl.formatMessage({ id: 'admin.transactions.filters.clearSearch' })}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {intl.formatMessage({ id: 'admin.transactions.filters.status' })}
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value as TransactionStatus)}
            >
              <option value="all">{intl.formatMessage({ id: 'admin.transactions.filters.statusAll' })}</option>
              <option value="paid">{intl.formatMessage({ id: 'admin.transactions.filters.statusPaid' })}</option>
              <option value="pending">{intl.formatMessage({ id: 'admin.transactions.filters.statusPending' })}</option>
              <option value="refunded">{intl.formatMessage({ id: 'admin.transactions.filters.statusRefunded' })}</option>
              <option value="disputed">{intl.formatMessage({ id: 'admin.transactions.filters.statusDisputed' })}</option>
              <option value="failed">{intl.formatMessage({ id: 'admin.transactions.filters.statusFailed' })}</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="w-full lg:w-44">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {intl.formatMessage({ id: 'admin.transactions.filters.type' })}
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
              value={filters.type}
              onChange={(e) => handleChange('type', e.target.value as TransactionType)}
            >
              <option value="all">{intl.formatMessage({ id: 'admin.transactions.filters.typeAll' })}</option>
              <option value="call_payment">{intl.formatMessage({ id: 'admin.transactions.filters.typeCallPayment' })}</option>
              <option value="subscription">{intl.formatMessage({ id: 'admin.transactions.filters.typeSubscription' })}</option>
              <option value="refund">{intl.formatMessage({ id: 'admin.transactions.filters.typeRefund' })}</option>
              <option value="payout">{intl.formatMessage({ id: 'admin.transactions.filters.typePayout' })}</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {intl.formatMessage({ id: 'admin.transactions.filters.advanced' })}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="small"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {intl.formatMessage({ id: 'admin.transactions.filters.refresh' })}
              </span>
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="small"
                onClick={onReset}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">
                  {intl.formatMessage({ id: 'admin.transactions.filters.reset' })}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar className="w-3 h-3 inline-block mr-1" />
                {intl.formatMessage({ id: 'admin.transactions.filters.dateFrom' })}
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar className="w-3 h-3 inline-block mr-1" />
                {intl.formatMessage({ id: 'admin.transactions.filters.dateTo' })}
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <CreditCard className="w-3 h-3 inline-block mr-1" />
                {intl.formatMessage({ id: 'admin.transactions.filters.method' })}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                value={filters.method}
                onChange={(e) => handleChange('method', e.target.value as PaymentMethod)}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.transactions.filters.methodAll' })}</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {intl.formatMessage({ id: 'admin.transactions.filters.amountRange' })}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({ id: 'admin.transactions.filters.min' })}
                  value={filters.minAmount}
                  onChange={(e) => handleChange('minAmount', e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={intl.formatMessage({ id: 'admin.transactions.filters.max' })}
                  value={filters.maxAmount}
                  onChange={(e) => handleChange('maxAmount', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceFilters;
