/**
 * Callable: getWithdrawalStatus
 *
 * Gets detailed status and tracking information for a specific withdrawal.
 * Returns a comprehensive tracking summary including timeline.
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
import {
  PaymentTrackingSummary,
  WithdrawalRequest,
  TrackingTimelineItem,
  WithdrawalStatus,
} from '../types';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface GetWithdrawalStatusInput {
  withdrawalId: string;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateInput(input: GetWithdrawalStatusInput): void {
  if (!input.withdrawalId?.trim()) {
    throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
  }
}

// ============================================================================
// STATUS TRACKING HELPERS
// ============================================================================

/**
 * Build a tracking summary from a withdrawal request
 */
function buildTrackingSummary(withdrawal: WithdrawalRequest): PaymentTrackingSummary {
  const timeline = buildTimeline(withdrawal);
  const { label, description, progress } = getStatusInfo(withdrawal.status);

  return {
    withdrawalId: withdrawal.id,
    currentStatus: withdrawal.status,
    statusLabel: label,
    statusDescription: description,
    progress,
    estimatedCompletion: getEstimatedCompletion(withdrawal),
    timeline,
  };
}

/**
 * Build timeline items from withdrawal history
 */
function buildTimeline(withdrawal: WithdrawalRequest): TrackingTimelineItem[] {
  const steps: TrackingTimelineItem[] = [
    {
      step: 1,
      label: 'Request Submitted',
      description: 'Your withdrawal request has been received',
      status: 'completed',
      timestamp: withdrawal.requestedAt,
    },
    {
      step: 2,
      label: 'Validation',
      description: 'Verifying your account and payment details',
      status: getStepStatus(withdrawal.status, ['validating', 'approved', 'queued', 'processing', 'sent', 'completed']),
      timestamp: getTimestampForStatus(withdrawal, 'validating'),
    },
    {
      step: 3,
      label: 'Processing',
      description: 'Payment is being processed by our provider',
      status: getStepStatus(withdrawal.status, ['processing', 'sent', 'completed']),
      timestamp: withdrawal.processedAt,
    },
    {
      step: 4,
      label: 'Sent',
      description: 'Payment has been sent to your account',
      status: getStepStatus(withdrawal.status, ['sent', 'completed']),
      timestamp: withdrawal.sentAt,
    },
    {
      step: 5,
      label: 'Completed',
      description: 'Payment confirmed received',
      status: getStepStatus(withdrawal.status, ['completed']),
      timestamp: withdrawal.completedAt,
    },
  ];

  // Handle failed/rejected/cancelled states
  if (['failed', 'rejected', 'cancelled'].includes(withdrawal.status)) {
    const failedStep: TrackingTimelineItem = {
      step: steps.length + 1,
      label: withdrawal.status === 'cancelled' ? 'Cancelled' : withdrawal.status === 'rejected' ? 'Rejected' : 'Failed',
      description: withdrawal.errorMessage || `Withdrawal ${withdrawal.status}`,
      status: 'failed',
      timestamp: withdrawal.failedAt || withdrawal.rejectedAt || withdrawal.cancelledAt,
    };
    steps.push(failedStep);
  }

  return steps;
}

/**
 * Get step status based on current withdrawal status
 */
function getStepStatus(
  currentStatus: WithdrawalStatus,
  completedIfIn: WithdrawalStatus[]
): 'completed' | 'current' | 'pending' | 'failed' {
  if (['failed', 'rejected', 'cancelled'].includes(currentStatus)) {
    return 'failed';
  }

  const statusOrder: WithdrawalStatus[] = [
    'pending', 'validating', 'approved', 'queued', 'processing', 'sent', 'completed'
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const completedIndices = completedIfIn.map((s) => statusOrder.indexOf(s));
  const minCompletedIndex = Math.min(...completedIndices.filter((i) => i >= 0));

  if (currentIndex >= minCompletedIndex) {
    return 'completed';
  }
  if (currentIndex === minCompletedIndex - 1) {
    return 'current';
  }
  return 'pending';
}

/**
 * Get timestamp for a specific status from history
 */
function getTimestampForStatus(
  withdrawal: WithdrawalRequest,
  status: WithdrawalStatus
): string | undefined {
  const entry = withdrawal.statusHistory.find((h) => h.status === status);
  return entry?.timestamp;
}

/**
 * Get status display information
 */
function getStatusInfo(status: WithdrawalStatus): {
  label: string;
  description: string;
  progress: number;
} {
  const statusMap: Record<WithdrawalStatus, { label: string; description: string; progress: number }> = {
    pending: { label: 'Pending', description: 'Your withdrawal request is being reviewed', progress: 10 },
    validating: { label: 'Validating', description: 'Verifying your account details', progress: 25 },
    approved: { label: 'Approved', description: 'Your withdrawal has been approved', progress: 40 },
    queued: { label: 'Queued', description: 'Withdrawal is queued for processing', progress: 50 },
    processing: { label: 'Processing', description: 'Payment is being processed', progress: 70 },
    sent: { label: 'Sent', description: 'Payment has been sent to your account', progress: 90 },
    completed: { label: 'Completed', description: 'Payment confirmed received', progress: 100 },
    failed: { label: 'Failed', description: 'Payment failed. We will retry or contact you.', progress: 0 },
    rejected: { label: 'Rejected', description: 'Withdrawal was rejected. Please check your details.', progress: 0 },
    cancelled: { label: 'Cancelled', description: 'Withdrawal was cancelled', progress: 0 },
  };

  return statusMap[status] || { label: status, description: '', progress: 0 };
}

/**
 * Get estimated completion time
 */
function getEstimatedCompletion(withdrawal: WithdrawalRequest): string | undefined {
  if (['completed', 'failed', 'rejected', 'cancelled'].includes(withdrawal.status)) {
    return undefined;
  }

  // Estimate based on provider
  const daysToAdd = withdrawal.provider === 'wise' ? 3 : 1; // Wise: 1-3 days, Mobile Money: instant to 1 day
  const requestDate = new Date(withdrawal.requestedAt);
  requestDate.setDate(requestDate.getDate() + daysToAdd);

  return requestDate.toISOString();
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Get Withdrawal Status
 *
 * Input:
 * - withdrawalId: string - ID of the withdrawal to check
 *
 * Output:
 * - PaymentTrackingSummary with full tracking details
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - invalid-argument: Invalid input data
 * - not-found: Withdrawal not found
 * - permission-denied: Withdrawal does not belong to user
 * - internal: Server error
 */
export const getWithdrawalStatus = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request: CallableRequest<GetWithdrawalStatusInput>): Promise<PaymentTrackingSummary> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;
    const input = request.data;

    // 2. Validate input
    validateInput(input);

    try {
      // 3. Get the withdrawal
      const service = getPaymentService();
      const withdrawal = await service.getWithdrawal(input.withdrawalId);

      if (!withdrawal) {
        throw new HttpsError('not-found', 'Withdrawal not found');
      }

      // 4. Verify ownership
      if (withdrawal.userId !== userId) {
        throw new HttpsError('permission-denied', 'You can only view your own withdrawals');
      }

      // 5. Build and return tracking summary
      const trackingSummary = buildTrackingSummary(withdrawal);

      logger.info('[getWithdrawalStatus] Status retrieved', {
        userId,
        withdrawalId: input.withdrawalId,
        status: withdrawal.status,
      });

      return trackingSummary;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[getWithdrawalStatus] Error', {
        userId,
        withdrawalId: input.withdrawalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to get withdrawal status');
    }
  }
);
