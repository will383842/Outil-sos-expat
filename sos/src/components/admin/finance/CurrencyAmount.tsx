// src/components/admin/finance/CurrencyAmount.tsx
import React from 'react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';

export type CurrencyAmountSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface CurrencyAmountProps {
  /** Amount to display */
  amount: number;
  /** Currency code (e.g., 'EUR', 'USD') */
  currency?: string;
  /** Locale for formatting (defaults to intl locale) */
  locale?: string;
  /** Color based on value (positive = green, negative = red) */
  showColor?: boolean;
  /** Size variant */
  size?: CurrencyAmountSize;
  /** Show + sign for positive numbers */
  showSign?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Display style: 'symbol' ($100), 'code' (USD 100), or 'name' (100 US dollars) */
  displayStyle?: 'symbol' | 'code' | 'name';
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
}

const sizeClasses: Record<CurrencyAmountSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-medium',
  xl: 'text-2xl font-bold',
};

export const CurrencyAmount: React.FC<CurrencyAmountProps> = ({
  amount,
  currency = 'EUR',
  locale,
  showColor = false,
  size = 'md',
  showSign = false,
  className,
  displayStyle = 'symbol',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}) => {
  const intl = useIntl();
  const effectiveLocale = locale || intl.locale;

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  };

  // Adjust currency display based on displayStyle
  switch (displayStyle) {
    case 'code':
      formatOptions.currencyDisplay = 'code';
      break;
    case 'name':
      formatOptions.currencyDisplay = 'name';
      break;
    case 'symbol':
    default:
      formatOptions.currencyDisplay = 'symbol';
      break;
  }

  // Format the absolute value first
  const absAmount = Math.abs(amount);
  let formattedAmount = new Intl.NumberFormat(effectiveLocale, formatOptions).format(absAmount);

  // Add sign if needed
  if (showSign && amount > 0) {
    formattedAmount = '+' + formattedAmount;
  } else if (amount < 0) {
    formattedAmount = '-' + formattedAmount;
  }

  // Determine color class
  let colorClass = '';
  if (showColor) {
    if (amount > 0) {
      colorClass = 'text-green-600';
    } else if (amount < 0) {
      colorClass = 'text-red-600';
    } else {
      colorClass = 'text-gray-600';
    }
  }

  return (
    <span
      className={cn(
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {formattedAmount}
    </span>
  );
};

// Utility component for displaying amounts with a secondary comparison
export interface CurrencyAmountWithComparisonProps extends CurrencyAmountProps {
  /** Previous amount for comparison */
  previousAmount?: number;
  /** Show the difference as percentage */
  showPercentChange?: boolean;
}

export const CurrencyAmountWithComparison: React.FC<CurrencyAmountWithComparisonProps> = ({
  previousAmount,
  showPercentChange = true,
  ...props
}) => {
  const { amount, currency } = props;

  if (previousAmount === undefined) {
    return <CurrencyAmount {...props} />;
  }

  const difference = amount - previousAmount;
  const percentChange = previousAmount !== 0
    ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100
    : 0;

  return (
    <div className="flex flex-col">
      <CurrencyAmount {...props} />
      <div className="flex items-center gap-1 mt-0.5">
        <CurrencyAmount
          amount={difference}
          currency={currency}
          size="xs"
          showColor
          showSign
        />
        {showPercentChange && previousAmount !== 0 && (
          <span
            className={cn(
              'text-xs',
              percentChange >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
};

export default CurrencyAmount;
