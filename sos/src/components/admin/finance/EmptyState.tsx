// src/components/admin/finance/EmptyState.tsx
import React from 'react';
import { FileX, Search, DollarSign, CreditCard, AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '../../common/Button';

export type EmptyStateType =
  | 'no-data'
  | 'no-results'
  | 'no-transactions'
  | 'no-payments'
  | 'error'
  | 'empty-inbox';

export interface EmptyStateProps {
  /** Type of empty state (determines default icon and message) */
  type?: EmptyStateType;
  /** Custom icon override */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Optional illustration image URL */
  illustrationUrl?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const defaultContent: Record<
  EmptyStateType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  'no-data': {
    icon: <Inbox className="w-12 h-12 text-gray-400" />,
    title: 'No data available',
    description: 'There is no data to display at the moment.',
  },
  'no-results': {
    icon: <Search className="w-12 h-12 text-gray-400" />,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  'no-transactions': {
    icon: <CreditCard className="w-12 h-12 text-gray-400" />,
    title: 'No transactions',
    description: 'No transactions have been recorded yet.',
  },
  'no-payments': {
    icon: <DollarSign className="w-12 h-12 text-gray-400" />,
    title: 'No payments',
    description: 'No payments have been processed for this period.',
  },
  error: {
    icon: <AlertCircle className="w-12 h-12 text-red-400" />,
    title: 'Something went wrong',
    description: 'An error occurred while loading the data. Please try again.',
  },
  'empty-inbox': {
    icon: <FileX className="w-12 h-12 text-gray-400" />,
    title: 'Your inbox is empty',
    description: 'No items to display at this time.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  icon,
  title,
  description,
  illustrationUrl,
  action,
  secondaryAction,
  compact = false,
  className,
}) => {
  const defaults = defaultContent[type];
  const displayIcon = icon || defaults.icon;
  const displayTitle = title || defaults.title;
  const displayDescription = description || defaults.description;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {/* Illustration or Icon */}
      {illustrationUrl ? (
        <img
          src={illustrationUrl}
          alt=""
          className={cn('mb-6', compact ? 'w-24 h-24' : 'w-40 h-40')}
          aria-hidden="true"
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-100 mb-4',
            compact ? 'w-16 h-16' : 'w-20 h-20'
          )}
        >
          {displayIcon}
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-gray-900',
          compact ? 'text-lg' : 'text-xl'
        )}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-gray-500 mt-2 max-w-md',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={cn(
            'flex items-center gap-3',
            compact ? 'mt-4' : 'mt-6'
          )}
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size={compact ? 'small' : 'medium'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Specialized empty state for finance tables
export interface FinanceEmptyStateProps extends Omit<EmptyStateProps, 'type'> {
  /** Whether data is being filtered */
  isFiltered?: boolean;
  /** Handler to clear filters */
  onClearFilters?: () => void;
}

export const FinanceEmptyState: React.FC<FinanceEmptyStateProps> = ({
  isFiltered = false,
  onClearFilters,
  ...props
}) => {
  if (isFiltered && onClearFilters) {
    return (
      <EmptyState
        type="no-results"
        action={{
          label: 'Clear filters',
          onClick: onClearFilters,
          variant: 'outline',
        }}
        {...props}
      />
    );
  }

  return <EmptyState type="no-transactions" {...props} />;
};

export default EmptyState;
