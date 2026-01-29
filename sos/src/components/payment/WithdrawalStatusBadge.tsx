// src/components/Payment/WithdrawalStatusBadge.tsx
import React from 'react';
import {
  Clock,
  Search,
  CheckCircle,
  ListOrdered,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WithdrawalStatus } from '@/types/payment';

export type WithdrawalStatusBadgeSize = 'sm' | 'md' | 'lg';

export interface WithdrawalStatusBadgeProps {
  /** Withdrawal status */
  status: WithdrawalStatus;
  /** Size variant */
  size?: WithdrawalStatusBadgeSize;
  /** Show status icon */
  showIcon?: boolean;
  /** Enable pulse animation for processing statuses */
  animated?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Status color configurations
const statusColors: Record<WithdrawalStatus, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  iconColor: string;
}> = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-500',
  },
  validating: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-500',
  },
  approved: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  queued: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  processing: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  sent: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    iconColor: 'text-green-500',
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    iconColor: 'text-red-500',
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    iconColor: 'text-red-500',
  },
  cancelled: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    iconColor: 'text-gray-400',
  },
};

// Size configurations
const sizeClasses: Record<WithdrawalStatusBadgeSize, {
  container: string;
  text: string;
  icon: string;
  dot: string;
}> = {
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

// Status icons mapping
const StatusIcon: React.FC<{ status: WithdrawalStatus; className?: string }> = ({
  status,
  className
}) => {
  const iconProps = { className };

  switch (status) {
    case 'pending':
      return <Clock {...iconProps} />;
    case 'validating':
      return <Search {...iconProps} />;
    case 'approved':
      return <CheckCircle {...iconProps} />;
    case 'queued':
      return <ListOrdered {...iconProps} />;
    case 'processing':
      return <Loader2 {...iconProps} className={cn(iconProps.className, 'animate-spin')} />;
    case 'sent':
      return <Send {...iconProps} />;
    case 'completed':
      return <CheckCircle2 {...iconProps} />;
    case 'failed':
      return <XCircle {...iconProps} />;
    case 'rejected':
      return <Ban {...iconProps} />;
    case 'cancelled':
      return <X {...iconProps} />;
    default:
      return <Clock {...iconProps} />;
  }
};

// Status display labels
const statusLabels: Record<WithdrawalStatus, string> = {
  pending: 'En attente',
  validating: 'Validation',
  approved: 'Approuve',
  queued: 'En file',
  processing: 'Traitement',
  sent: 'Envoye',
  completed: 'Complete',
  failed: 'Echoue',
  rejected: 'Rejete',
  cancelled: 'Annule',
};

// Statuses that should animate
const animatedStatuses: WithdrawalStatus[] = ['processing', 'validating', 'queued'];

/**
 * WithdrawalStatusBadge - Displays a status badge for withdrawal requests
 *
 * Colors:
 * - pending, validating: yellow/amber
 * - approved, queued, processing, sent: blue (with pulse if processing)
 * - completed: green
 * - failed, rejected: red
 * - cancelled: gray
 */
export const WithdrawalStatusBadge: React.FC<WithdrawalStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  animated = true,
  className,
}) => {
  const colors = statusColors[status];
  const sizes = sizeClasses[size];
  const shouldAnimate = animated && animatedStatuses.includes(status);
  const label = statusLabels[status];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border gap-1.5',
        colors.bg,
        colors.text,
        colors.border,
        sizes.container,
        sizes.text,
        className
      )}
    >
      {/* Pulsing dot for animated statuses */}
      {shouldAnimate && (
        <span className="relative flex">
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

      {/* Status icon */}
      {showIcon && !shouldAnimate && (
        <StatusIcon
          status={status}
          className={cn(sizes.icon, colors.iconColor)}
        />
      )}

      {/* Label */}
      <span>{label}</span>
    </span>
  );
};

// Export status labels for external use
export { statusLabels as withdrawalStatusLabels };

// Helper to check if status is terminal
export const isTerminalWithdrawalStatus = (status: WithdrawalStatus): boolean => {
  return ['completed', 'failed', 'rejected', 'cancelled'].includes(status);
};

// Helper to check if status indicates success
export const isSuccessWithdrawalStatus = (status: WithdrawalStatus): boolean => {
  return status === 'completed';
};

// Helper to check if status indicates error
export const isErrorWithdrawalStatus = (status: WithdrawalStatus): boolean => {
  return ['failed', 'rejected'].includes(status);
};

export default WithdrawalStatusBadge;
