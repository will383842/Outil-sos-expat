// src/components/admin/finance/TransactionRow.tsx
import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, MoreVertical, Check } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';
import { CurrencyAmount } from './CurrencyAmount';
import { StatusBadge, StatusType } from './StatusBadge';
import { PaymentMethodIcon, PaymentMethodType } from './PaymentMethodIcon';

export interface TransactionAction {
  /** Unique action key */
  key: string;
  /** Display label */
  label: string;
  /** Icon for the action */
  icon?: React.ReactNode;
  /** Action handler */
  onClick: () => void;
  /** Disable this action */
  disabled?: boolean;
  /** Destructive action styling */
  destructive?: boolean;
}

export interface TransactionData {
  /** Unique transaction ID */
  id: string;
  /** Transaction amount */
  amount: number;
  /** Currency code */
  currency: string;
  /** Transaction status */
  status: StatusType;
  /** Transaction date */
  date: Date;
  /** Payment method */
  paymentMethod?: PaymentMethodType;
  /** Card brand (for card payments) */
  cardBrand?: string;
  /** Description/memo */
  description?: string;
  /** Customer/client name */
  customerName?: string;
  /** Customer email */
  customerEmail?: string;
  /** Provider name */
  providerName?: string;
  /** Platform fee */
  platformFee?: number;
  /** Provider payout */
  providerAmount?: number;
  /** Any additional details for expanded view */
  additionalDetails?: Record<string, string | number | React.ReactNode>;
}

export interface TransactionRowProps {
  /** Transaction data */
  transaction: TransactionData;
  /** Whether the row is selected */
  selected?: boolean;
  /** Selection change handler */
  onSelectionChange?: (selected: boolean) => void;
  /** Show selection checkbox */
  showCheckbox?: boolean;
  /** Actions for the dropdown menu */
  actions?: TransactionAction[];
  /** Whether the row is expanded by default */
  defaultExpanded?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Skeleton loader for the transaction row
const TransactionRowSkeleton: React.FC = () => (
  <tr className="border-t animate-pulse">
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-4"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-8"></div>
    </td>
  </tr>
);

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  selected = false,
  onSelectionChange,
  showCheckbox = true,
  actions = [],
  defaultExpanded = false,
  isLoading = false,
  className,
}) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSelectionChange?.(e.target.checked);
    },
    [onSelectionChange]
  );

  const handleActionClick = useCallback((action: TransactionAction) => {
    action.onClick();
    setShowActionsMenu(false);
  }, []);

  if (isLoading) {
    return <TransactionRowSkeleton />;
  }

  const {
    id,
    amount,
    currency,
    status,
    date,
    paymentMethod,
    cardBrand,
    description,
    customerName,
    customerEmail,
    providerName,
    platformFee,
    providerAmount,
    additionalDetails,
  } = transaction;

  // Calculate columns count for expanded row
  const columnsCount = showCheckbox ? 8 : 7;

  return (
    <>
      {/* Main Row */}
      <tr
        className={cn(
          'border-t hover:bg-gray-50 transition-colors',
          selected && 'bg-blue-50',
          isExpanded && 'bg-gray-50',
          className
        )}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <td className="px-4 py-3 w-10">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                aria-label={intl.formatMessage(
                  { id: 'finance.transaction.selectRow', defaultMessage: 'Select transaction {id}' },
                  { id }
                )}
              />
              {selected && (
                <Check className="absolute w-3 h-3 text-blue-600 pointer-events-none" />
              )}
            </div>
          </td>
        )}

        {/* Date */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm text-gray-900">
            {intl.formatDate(date, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
          <div className="text-xs text-gray-500">
            {intl.formatTime(date, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </td>

        {/* Amount */}
        <td className="px-4 py-3 whitespace-nowrap">
          <CurrencyAmount amount={amount} currency={currency} size="sm" className="font-medium" />
        </td>

        {/* Payment Method */}
        <td className="px-4 py-3">
          {paymentMethod && (
            <PaymentMethodIcon
              method={paymentMethod}
              cardBrand={cardBrand}
              size="sm"
            />
          )}
        </td>

        {/* Customer/Description */}
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
            {customerName || description || id}
          </div>
          {customerEmail && (
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {customerEmail}
            </div>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={status} size="sm" />
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={toggleExpand}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Actions Menu */}
            {actions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                  aria-label="Transaction actions"
                  aria-haspopup="true"
                  aria-expanded={showActionsMenu}
                >
                  <MoreVertical size={16} />
                </button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActionsMenu(false)}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                      <div className="py-1">
                        {actions.map((action) => (
                          <button
                            key={action.key}
                            onClick={() => handleActionClick(action)}
                            disabled={action.disabled}
                            className={cn(
                              'w-full px-4 py-2 text-sm text-left flex items-center gap-2',
                              'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                              action.destructive && 'text-red-600 hover:bg-red-50'
                            )}
                          >
                            {action.icon}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-gray-50 border-t border-gray-100">
          <td colSpan={columnsCount} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {/* Transaction ID */}
              <div>
                <div className="font-medium text-gray-500">
                  {intl.formatMessage({ id: 'finance.transaction.id', defaultMessage: 'Transaction ID' })}
                </div>
                <div className="text-gray-900 font-mono text-xs mt-1">{id}</div>
              </div>

              {/* Provider */}
              {providerName && (
                <div>
                  <div className="font-medium text-gray-500">
                    {intl.formatMessage({ id: 'finance.transaction.provider', defaultMessage: 'Provider' })}
                  </div>
                  <div className="text-gray-900 mt-1">{providerName}</div>
                </div>
              )}

              {/* Platform Fee */}
              {platformFee !== undefined && (
                <div>
                  <div className="font-medium text-gray-500">
                    {intl.formatMessage({ id: 'finance.transaction.platformFee', defaultMessage: 'Platform Fee' })}
                  </div>
                  <div className="mt-1">
                    <CurrencyAmount amount={platformFee} currency={currency} size="sm" />
                  </div>
                </div>
              )}

              {/* Provider Amount */}
              {providerAmount !== undefined && (
                <div>
                  <div className="font-medium text-gray-500">
                    {intl.formatMessage({ id: 'finance.transaction.providerAmount', defaultMessage: 'Provider Payout' })}
                  </div>
                  <div className="mt-1">
                    <CurrencyAmount amount={providerAmount} currency={currency} size="sm" />
                  </div>
                </div>
              )}

              {/* Description */}
              {description && (
                <div className="col-span-2">
                  <div className="font-medium text-gray-500">
                    {intl.formatMessage({ id: 'finance.transaction.description', defaultMessage: 'Description' })}
                  </div>
                  <div className="text-gray-900 mt-1">{description}</div>
                </div>
              )}

              {/* Additional Details */}
              {additionalDetails &&
                Object.entries(additionalDetails).map(([key, value]) => (
                  <div key={key}>
                    <div className="font-medium text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-900 mt-1">{value}</div>
                  </div>
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default TransactionRow;
