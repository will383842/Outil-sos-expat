/**
 * WithdrawalTracker Component
 * Displays detailed withdrawal status with timeline and progress tracking
 *
 * Features:
 * - Status header with animated icon
 * - Progress bar with status-based colors
 * - 6-step timeline (Demande -> Reception)
 * - Estimated completion time
 * - Refresh and cancel actions
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  CreditCard,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Cog,
  Wallet,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PaymentTrackingSummary,
  TrackingTimelineItem,
  WithdrawalStatus,
  isTerminalStatus,
  isErrorStatus,
  isSuccessStatus,
  canCancelWithdrawal
} from '@/types/payment';

// ============================================================================
// TYPES
// ============================================================================

interface WithdrawalTrackerProps {
  tracking: PaymentTrackingSummary;
  onRefresh?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
  isRefreshing?: boolean;
  className?: string;
}

// ============================================================================
// TIMELINE STEP CONFIG
// ============================================================================

const TIMELINE_STEPS = [
  { step: 1, key: 'request', labelKey: 'payment.tracking.step.request', icon: FileCheck },
  { step: 2, key: 'validation', labelKey: 'payment.tracking.step.validation', icon: ShieldCheck },
  { step: 3, key: 'approval', labelKey: 'payment.tracking.step.approval', icon: CheckCircle },
  { step: 4, key: 'processing', labelKey: 'payment.tracking.step.processing', icon: Cog },
  { step: 5, key: 'sending', labelKey: 'payment.tracking.step.sending', icon: Send },
  { step: 6, key: 'reception', labelKey: 'payment.tracking.step.reception', icon: Wallet },
];

// Status to timeline step mapping
const STATUS_TO_STEP: Record<WithdrawalStatus, number> = {
  pending: 1,
  validating: 2,
  approved: 3,
  queued: 3,
  processing: 4,
  sent: 5,
  completed: 6,
  failed: -1,
  rejected: -1,
  cancelled: -1,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusConfig(status: WithdrawalStatus) {
  if (isSuccessStatus(status)) {
    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      progressColor: 'bg-gradient-to-r from-green-400 to-emerald-500',
      progressBg: 'bg-green-100',
    };
  }

  if (isErrorStatus(status)) {
    return {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      progressColor: 'bg-gradient-to-r from-red-400 to-red-500',
      progressBg: 'bg-red-100',
    };
  }

  if (status === 'cancelled') {
    return {
      icon: Ban,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      progressColor: 'bg-gray-400',
      progressBg: 'bg-gray-100',
    };
  }

  // Processing states
  return {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    progressColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    progressBg: 'bg-blue-100',
  };
}

function formatTimestamp(timestamp: string | undefined, intl: ReturnType<typeof useIntl>): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    return intl.formatDate(date, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

function getTimelineItemStatus(
  stepNumber: number,
  currentStep: number,
  status: WithdrawalStatus,
  timelineItems: TrackingTimelineItem[]
): TrackingTimelineItem['status'] {
  // Check if we have explicit status from tracking data
  const item = timelineItems.find(t => t.step === stepNumber);
  if (item) return item.status;

  // Handle terminal error states
  if (isErrorStatus(status) || status === 'cancelled') {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'failed';
    return 'pending';
  }

  // Normal progression
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'current';
  return 'pending';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatusHeaderProps {
  status: WithdrawalStatus;
  statusLabel: string;
  statusDescription: string;
}

const StatusHeader: React.FC<StatusHeaderProps> = ({ status, statusLabel, statusDescription }) => {
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;
  const isAnimated = !isTerminalStatus(status);

  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={cn(
        'flex-shrink-0 p-3 rounded-2xl',
        config.bgColor,
        config.borderColor,
        'border'
      )}>
        <StatusIcon
          className={cn(
            'w-8 h-8',
            config.color,
            isAnimated && 'animate-spin'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn('text-lg font-semibold', config.color)}>
          {statusLabel}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {statusDescription}
        </p>
      </div>
    </div>
  );
};

interface ProgressBarProps {
  progress: number;
  status: WithdrawalStatus;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  const config = getStatusConfig(status);
  const isAnimated = !isTerminalStatus(status);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.tracking.progress" defaultMessage="Progression" />
        </span>
        <span className={cn('text-sm font-semibold', config.color)}>
          {progress}%
        </span>
      </div>
      <div className={cn('h-3 rounded-full overflow-hidden', config.progressBg)}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out relative',
            config.progressColor
          )}
          style={{ width: `${progress}%` }}
        >
          {isAnimated && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TimelineProps {
  status: WithdrawalStatus;
  timeline: TrackingTimelineItem[];
  intl: ReturnType<typeof useIntl>;
}

const Timeline: React.FC<TimelineProps> = ({ status, timeline, intl }) => {
  const currentStep = STATUS_TO_STEP[status] || 1;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
        <FormattedMessage id="payment.tracking.timeline" defaultMessage="Etapes du retrait" />
      </h4>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-4">
          {TIMELINE_STEPS.map((step, index) => {
            const itemStatus = getTimelineItemStatus(step.step, currentStep, status, timeline);
            const timelineItem = timeline.find(t => t.step === step.step);
            const StepIcon = step.icon;

            const isCompleted = itemStatus === 'completed';
            const isCurrent = itemStatus === 'current';
            const isFailed = itemStatus === 'failed';
            const isPending = itemStatus === 'pending';

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Step indicator */}
                <div className={cn(
                  'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900',
                  isFailed && 'bg-red-500 text-white ring-4 ring-red-200 dark:ring-red-900',
                  isPending && 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isFailed ? (
                    <XCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Step content */}
                <div className={cn(
                  'flex-1 min-w-0 pb-4',
                  index === TIMELINE_STEPS.length - 1 && 'pb-0'
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium',
                      isCompleted && 'text-green-700 dark:text-green-400',
                      isCurrent && 'text-blue-700 dark:text-blue-400',
                      isFailed && 'text-red-700 dark:text-red-400',
                      isPending && 'text-gray-500 dark:text-gray-400'
                    )}>
                      <FormattedMessage
                        id={step.labelKey}
                        defaultMessage={step.key.charAt(0).toUpperCase() + step.key.slice(1)}
                      />
                    </span>
                    {timelineItem?.timestamp && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {formatTimestamp(timelineItem.timestamp, intl)}
                      </span>
                    )}
                  </div>
                  {timelineItem?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {timelineItem.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface EstimatedCompletionProps {
  status: WithdrawalStatus;
  estimatedCompletion?: string;
  intl: ReturnType<typeof useIntl>;
}

const EstimatedCompletion: React.FC<EstimatedCompletionProps> = ({
  status,
  estimatedCompletion,
  intl
}) => {
  const config = getStatusConfig(status);

  // Completed state
  if (isSuccessStatus(status) && estimatedCompletion) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-xl',
        'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
      )}>
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        <div>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            <FormattedMessage
              id="payment.tracking.completedOn"
              defaultMessage="Complete le"
            />
          </span>
          <span className="text-sm text-green-600 dark:text-green-400 ml-1">
            {formatTimestamp(estimatedCompletion, intl)}
          </span>
        </div>
      </div>
    );
  }

  // Failed/Rejected state
  if (isErrorStatus(status)) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-xl',
        'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      )}>
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <div>
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            <FormattedMessage
              id="payment.tracking.failed"
              defaultMessage="Echec"
            />
          </span>
          <span className="text-sm text-red-600 dark:text-red-400 block mt-0.5">
            <FormattedMessage
              id="payment.tracking.contactSupport"
              defaultMessage="Veuillez contacter le support pour plus d'informations."
            />
          </span>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (status === 'cancelled') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-xl',
        'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      )}>
        <Ban className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage
            id="payment.tracking.cancelled"
            defaultMessage="Retrait annule"
          />
        </span>
      </div>
    );
  }

  // Processing - show estimated time
  if (estimatedCompletion) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-xl',
        'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
      )}>
        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            <FormattedMessage
              id="payment.tracking.estimatedTime"
              defaultMessage="Temps estime restant"
            />:
          </span>
          <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">
            {estimatedCompletion}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WithdrawalTracker: React.FC<WithdrawalTrackerProps> = ({
  tracking,
  onRefresh,
  onCancel,
  showDetails = true,
  isRefreshing = false,
  className,
}) => {
  const intl = useIntl();

  const {
    currentStatus,
    statusLabel = '',
    statusDescription = '',
    progress = 0,
    estimatedCompletion,
    timeline = [],
  } = tracking;

  const canCancel = useMemo(() => canCancelWithdrawal(currentStatus), [currentStatus]);
  const isTerminal = useMemo(() => isTerminalStatus(currentStatus), [currentStatus]);

  return (
    <div className={cn(
      'bg-white/80 dark:bg-white/5 backdrop-blur-xl',
      'border border-white/20 dark:border-white/10',
      'rounded-2xl shadow-lg p-6',
      className
    )}>
      {/* Status Header */}
      <StatusHeader
        status={currentStatus}
        statusLabel={statusLabel}
        statusDescription={statusDescription}
      />

      {/* Progress Bar */}
      <ProgressBar progress={progress} status={currentStatus} />

      {/* Timeline */}
      {showDetails && (
        <Timeline
          status={currentStatus}
          timeline={timeline}
          intl={intl}
        />
      )}

      {/* Estimated Completion */}
      <EstimatedCompletion
        status={currentStatus}
        estimatedCompletion={estimatedCompletion}
        intl={intl}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        {/* Refresh Button */}
        {onRefresh && !isTerminal && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-3 rounded-xl font-medium text-sm',
              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            <FormattedMessage
              id="payment.tracking.refresh"
              defaultMessage="Actualiser"
            />
          </button>
        )}

        {/* Cancel Button */}
        {onCancel && canCancel && (
          <button
            onClick={onCancel}
            className={cn(
              'flex-1 flex items-center justify-center gap-2',
              'px-4 py-3 rounded-xl font-medium text-sm',
              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
              'hover:bg-red-200 dark:hover:bg-red-900/50',
              'transition-colors duration-200'
            )}
          >
            <XCircle className="w-4 h-4" />
            <FormattedMessage
              id="payment.tracking.cancel"
              defaultMessage="Annuler le retrait"
            />
          </button>
        )}
      </div>

      {/* Withdrawal ID */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <FormattedMessage
            id="payment.tracking.withdrawalId"
            defaultMessage="ID du retrait"
          />: <span className="font-mono">{tracking.withdrawalId}</span>
        </p>
      </div>
    </div>
  );
};

export default WithdrawalTracker;
