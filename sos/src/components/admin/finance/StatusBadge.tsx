// src/components/admin/finance/StatusBadge.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'live';

export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  /** Status type determining color scheme */
  status: StatusType;
  /** Display label (if not provided, will use status as label) */
  label?: string;
  /** Size variant */
  size?: StatusSize;
  /** Optional icon to display before label */
  icon?: React.ReactNode;
  /** Enable pulsing animation (useful for 'live' or 'processing' statuses) */
  pulse?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const statusColors: Record<StatusType, { bg: string; text: string; border: string; dot?: string }> = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  warning: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-500',
  },
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  refunded: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-500',
  },
  active: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  live: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
};

const sizeClasses: Record<StatusSize, { container: string; text: string; icon: string; dot: string }> = {
  sm: {
    container: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'w-4 h-4',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'w-5 h-5',
    dot: 'w-2.5 h-2.5',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  icon,
  pulse = false,
  className,
}) => {
  const colors = statusColors[status];
  const sizes = sizeClasses[size];
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  // Auto-enable pulse for certain statuses
  const shouldPulse = pulse || status === 'live' || status === 'processing';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        colors.bg,
        colors.text,
        colors.border,
        sizes.container,
        sizes.text,
        className
      )}
    >
      {/* Pulsing dot for live/processing statuses */}
      {shouldPulse && (
        <span className="relative mr-1.5 flex">
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping',
              colors.dot,
              sizes.dot
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full',
              colors.dot,
              sizes.dot
            )}
          />
        </span>
      )}

      {/* Icon */}
      {icon && !shouldPulse && (
        <span className={cn('mr-1 flex-shrink-0', sizes.icon)}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
