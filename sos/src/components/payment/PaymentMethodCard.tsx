// src/components/Payment/PaymentMethodCard.tsx
import React from 'react';
import { useIntl } from 'react-intl';
import { Edit2, Trash2, Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethodIcon, mobileMoneyProviderNames } from './PaymentMethodIcon';
import type { UserPaymentMethod, MobileMoneyDetails } from '@/types/payment';

export interface PaymentMethodCardProps {
  /** Payment method data */
  method: UserPaymentMethod;
  /** Whether this card is selected */
  selected?: boolean;
  /** Callback when card is selected */
  onSelect?: () => void;
  /** Callback when edit is clicked */
  onEdit?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Show edit/delete action buttons */
  showActions?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PaymentMethodCard - Displays a payment method as a selectable card
 *
 * Shows:
 * - Icon (bank or mobile money with provider color)
 * - Display name (e.g., "FR** **** 4532")
 * - Provider logo or name
 * - Default badge if applicable
 * - Edit/Delete actions if showActions is true
 */
export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = false,
  compact = false,
  className,
}) => {
  const intl = useIntl();
  const isMobileMoney = method.methodType === 'mobile_money';
  const mobileMoneyDetails = isMobileMoney
    ? (method.details as MobileMoneyDetails)
    : null;

  // Get provider name for mobile money
  const providerName = mobileMoneyDetails?.provider
    ? mobileMoneyProviderNames[mobileMoneyDetails.provider]
    : null;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  // Compact view
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all',
          onSelect && 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/50',
          selected
            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
            : 'border-gray-200 bg-white',
          className
        )}
      >
        {/* Icon */}
        <PaymentMethodIcon
          methodType={method.methodType}
          provider={mobileMoneyDetails?.provider}
          size="sm"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {method.displayName}
          </p>
          {providerName && (
            <p className="text-xs text-gray-500">{providerName}</p>
          )}
        </div>

        {/* Default badge */}
        {method.isDefault && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            <Star className="w-3 h-3 mr-1" />
            Default
          </span>
        )}

        {/* Selected indicator */}
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  // Full card view
  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative rounded-xl border transition-all',
        onSelect && 'cursor-pointer hover:border-blue-300 hover:shadow-md',
        selected
          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
          : 'border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {/* Card content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <PaymentMethodIcon
            methodType={method.methodType}
            provider={mobileMoneyDetails?.provider}
            size="md"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Display name */}
            <p className="text-base font-semibold text-gray-900">
              {method.displayName}
            </p>

            {/* Provider or bank name */}
            <p className="text-sm text-gray-500 mt-0.5">
              {isMobileMoney
                ? providerName
                : (method.details.type === 'bank_transfer' && method.details.bankName)
                  || 'Virement bancaire'
              }
            </p>

            {/* Currency */}
            <p className="text-xs text-gray-400 mt-1">
              {method.details.currency}
              {'country' in method.details && method.details.country && ` - ${method.details.country}`}
            </p>
          </div>

          {/* Right side: badges and actions */}
          <div className="flex flex-col items-end gap-2">
            {/* Default badge */}
            {method.isDefault && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <Star className="w-3 h-3 mr-1 fill-amber-500" />
                Par defaut
              </span>
            )}

            {/* Verified badge */}
            {method.isVerified && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verifie
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            {onEdit && (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {intl.formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {intl.formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;
