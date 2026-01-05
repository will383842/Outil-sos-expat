// src/components/admin/finance/CostAlertCard.tsx
import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntl } from 'react-intl';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CostAlert {
  /** Unique identifier for the alert */
  id: string;
  /** Alert type determining the icon and color scheme */
  type: AlertSeverity;
  /** Title of the alert */
  title: string;
  /** Detailed message */
  message: string;
  /** Timestamp when the alert was created */
  timestamp: Date | string;
  /** Whether the alert has been read/acknowledged */
  isRead?: boolean;
  /** Optional metadata (e.g., threshold, current value, etc.) */
  metadata?: Record<string, unknown>;
}

export interface CostAlertCardProps {
  /** The alert data to display */
  alert: CostAlert;
  /** Callback when marking alert as read */
  onMarkAsRead?: (alertId: string) => void;
  /** Callback when dismissing the alert */
  onDismiss?: (alertId: string) => void;
  /** Optional click handler for the entire card */
  onClick?: (alert: CostAlert) => void;
  /** Loading state for the mark as read action */
  isMarkingAsRead?: boolean;
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const severityConfig: Record<
  AlertSeverity,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
  }
> = {
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    badgeLabel: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeLabel: 'Warning',
  },
  critical: {
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    badgeLabel: 'Critical',
  },
};

export const CostAlertCard: React.FC<CostAlertCardProps> = ({
  alert,
  onMarkAsRead,
  onDismiss,
  onClick,
  isMarkingAsRead = false,
  compact = false,
  className,
}) => {
  const intl = useIntl();
  const config = severityConfig[alert.type];
  const IconComponent = config.icon;

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkAsRead && !alert.isRead && !isMarkingAsRead) {
      onMarkAsRead(alert.id);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(alert.id);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(alert);
    }
  };

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return intl.formatMessage({
        id: 'finance.alerts.justNow',
        defaultMessage: 'Just now'
      });
    }
    if (diffMinutes < 60) {
      return intl.formatMessage(
        { id: 'finance.alerts.minutesAgo', defaultMessage: '{minutes}m ago' },
        { minutes: diffMinutes }
      );
    }
    if (diffHours < 24) {
      return intl.formatMessage(
        { id: 'finance.alerts.hoursAgo', defaultMessage: '{hours}h ago' },
        { hours: diffHours }
      );
    }
    if (diffDays < 7) {
      return intl.formatMessage(
        { id: 'finance.alerts.daysAgo', defaultMessage: '{days}d ago' },
        { days: diffDays }
      );
    }

    return intl.formatDate(date, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isClickable = !!onClick;

  return (
    <div
      onClick={isClickable ? handleCardClick : undefined}
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 transition-all duration-200',
        config.borderColor,
        alert.isRead && 'opacity-60',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-gray-300',
        compact ? 'p-3' : 'p-4',
        className
      )}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
      aria-label={`${config.badgeLabel} alert: ${alert.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 rounded-full flex items-center justify-center',
            config.iconBg,
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}
        >
          <IconComponent
            className={cn(
              config.iconColor,
              compact ? 'w-4 h-4' : 'w-5 h-5'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row with title and badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={cn(
                  'font-semibold text-gray-900',
                  compact ? 'text-sm' : 'text-base'
                )}
              >
                {alert.title}
              </h4>
              {/* Severity Badge */}
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  config.badgeBg,
                  config.badgeText
                )}
              >
                {config.badgeLabel}
              </span>
            </div>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label={intl.formatMessage({
                  id: 'finance.alerts.dismiss',
                  defaultMessage: 'Dismiss alert'
                })}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Message */}
          <p
            className={cn(
              'text-gray-600 mt-1',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {alert.message}
          </p>

          {/* Footer row with timestamp and actions */}
          <div
            className={cn(
              'flex items-center justify-between gap-4 flex-wrap',
              compact ? 'mt-2' : 'mt-3'
            )}
          >
            {/* Timestamp */}
            <div className="flex items-center text-gray-400 text-xs">
              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>{formatTimestamp(alert.timestamp)}</span>
            </div>

            {/* Mark as read button */}
            {onMarkAsRead && !alert.isRead && (
              <button
                onClick={handleMarkAsRead}
                disabled={isMarkingAsRead}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium transition-colors',
                  isMarkingAsRead
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700'
                )}
                aria-label={intl.formatMessage({
                  id: 'finance.alerts.markAsRead',
                  defaultMessage: 'Mark as read'
                })}
              >
                {isMarkingAsRead ? (
                  <>
                    <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    <span>
                      {intl.formatMessage({
                        id: 'finance.alerts.marking',
                        defaultMessage: 'Marking...'
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>
                      {intl.formatMessage({
                        id: 'finance.alerts.markAsRead',
                        defaultMessage: 'Mark as read'
                      })}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Read indicator */}
            {alert.isRead && (
              <span className="inline-flex items-center text-xs text-gray-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                {intl.formatMessage({
                  id: 'finance.alerts.read',
                  defaultMessage: 'Read'
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton loader for CostAlertCard
export const CostAlertCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={cn(
      'bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-gray-200 animate-pulse',
      compact ? 'p-3' : 'p-4'
    )}
  >
    <div className="flex items-start gap-3">
      {/* Icon skeleton */}
      <div
        className={cn(
          'flex-shrink-0 rounded-full bg-gray-200',
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}
      />

      {/* Content skeleton */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-full mb-1" />
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  </div>
);

export default CostAlertCard;
