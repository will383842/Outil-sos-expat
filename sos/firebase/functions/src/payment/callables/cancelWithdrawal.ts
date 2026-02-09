/**
 * Callable: cancelWithdrawal
 *
 * Cancels a pending withdrawal request for the authenticated user.
 * Only works for withdrawals in 'pending' status.
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface CancelWithdrawalInput {
  withdrawalId: string;
  reason?: string;
}

interface CancelWithdrawalOutput {
  success: true;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateInput(input: CancelWithdrawalInput): void {
  if (!input.withdrawalId?.trim()) {
    throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
  }

  if (input.reason && typeof input.reason !== 'string') {
    throw new HttpsError('invalid-argument', 'Reason must be a string');
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Cancel Withdrawal
 *
 * Input:
 * - withdrawalId: string - ID of the withdrawal to cancel
 * - reason?: string - Optional cancellation reason
 *
 * Output:
 * - success: true
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - invalid-argument: Invalid input data
 * - not-found: Withdrawal not found
 * - permission-denied: Withdrawal does not belong to user
 * - failed-precondition: Withdrawal cannot be cancelled (already processing)
 * - internal: Server error
 */
export const cancelWithdrawal = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request: CallableRequest<CancelWithdrawalInput>): Promise<CancelWithdrawalOutput> => {
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
      // 3. Get the withdrawal to verify ownership
      const service = getPaymentService();
      const withdrawal = await service.getWithdrawal(input.withdrawalId);

      if (!withdrawal) {
        throw new HttpsError('not-found', 'Withdrawal not found');
      }

      // 4. Verify ownership
      if (withdrawal.userId !== userId) {
        throw new HttpsError('permission-denied', 'You can only cancel your own withdrawals');
      }

      // 5. Cancel the withdrawal
      await service.cancelWithdrawal(
        input.withdrawalId,
        userId,
        input.reason
      );

      logger.info('[cancelWithdrawal] Withdrawal cancelled', {
        userId,
        withdrawalId: input.withdrawalId,
        amount: withdrawal.amount,
        reason: input.reason,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('[cancelWithdrawal] Error', {
        userId,
        withdrawalId: input.withdrawalId,
        error: errorMessage,
      });

      // Map common error messages to appropriate HttpsError codes
      if (errorMessage.includes('not found')) {
        throw new HttpsError('not-found', errorMessage);
      }
      if (errorMessage.includes('Not authorized') || errorMessage.includes('does not belong')) {
        throw new HttpsError('permission-denied', errorMessage);
      }
      if (errorMessage.includes('Cannot cancel')) {
        throw new HttpsError('failed-precondition', errorMessage);
      }

      throw new HttpsError('internal', 'Failed to cancel withdrawal');
    }
  }
);
