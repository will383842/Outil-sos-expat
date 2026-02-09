/**
 * Callable: getWithdrawalHistory
 *
 * Gets the withdrawal history for the authenticated user.
 * Supports pagination and filtering by status.
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
import { WithdrawalRequest, WithdrawalStatus, PaymentUserType } from '../types';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface GetWithdrawalHistoryInput {
  limit?: number;
  status?: WithdrawalStatus[];
}

interface GetWithdrawalHistoryOutput {
  withdrawals: WithdrawalRequest[];
}

// ============================================================================
// USER TYPE DETECTION
// ============================================================================

/**
 * Determine the user type from their profile in Firestore.
 */
async function getUserType(userId: string): Promise<PaymentUserType | null> {
  const db = getFirestore();

  // Check chatters
  const chatterDoc = await db.collection('chatters').doc(userId).get();
  if (chatterDoc.exists) {
    return 'chatter';
  }

  // Check influencers
  const influencerDoc = await db.collection('influencers').doc(userId).get();
  if (influencerDoc.exists) {
    return 'influencer';
  }

  // Check bloggers
  const bloggerDoc = await db.collection('bloggers').doc(userId).get();
  if (bloggerDoc.exists) {
    return 'blogger';
  }

  return null;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const VALID_STATUSES: WithdrawalStatus[] = [
  'pending',
  'validating',
  'approved',
  'queued',
  'processing',
  'sent',
  'completed',
  'failed',
  'rejected',
  'cancelled',
];

function validateInput(input: GetWithdrawalHistoryInput): void {
  // Validate limit
  if (input.limit !== undefined) {
    if (typeof input.limit !== 'number' || isNaN(input.limit)) {
      throw new HttpsError('invalid-argument', 'Limit must be a number');
    }

    if (input.limit < 1 || input.limit > 100) {
      throw new HttpsError('invalid-argument', 'Limit must be between 1 and 100');
    }
  }

  // Validate status filter
  if (input.status !== undefined) {
    if (!Array.isArray(input.status)) {
      throw new HttpsError('invalid-argument', 'Status must be an array');
    }

    for (const s of input.status) {
      if (!VALID_STATUSES.includes(s)) {
        throw new HttpsError('invalid-argument', `Invalid status: ${s}`);
      }
    }
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Get Withdrawal History
 *
 * Input:
 * - limit?: number - Maximum number of withdrawals to return (1-100, default 50)
 * - status?: WithdrawalStatus[] - Filter by status (optional)
 *
 * Output:
 * - withdrawals: WithdrawalRequest[] - List of withdrawals
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - permission-denied: User is not a chatter/influencer/blogger
 * - invalid-argument: Invalid input data
 * - internal: Server error
 */
export const getWithdrawalHistory = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request: CallableRequest<GetWithdrawalHistoryInput>): Promise<GetWithdrawalHistoryOutput> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;
    const input = request.data || {};

    // 2. Validate input
    validateInput(input);

    try {
      // 3. Determine user type
      const userType = await getUserType(userId);

      if (!userType) {
        throw new HttpsError(
          'permission-denied',
          'You must be a chatter, influencer, or blogger to view withdrawal history'
        );
      }

      // 4. Get withdrawal history using service
      const service = getPaymentService();
      const withdrawals = await service.getUserWithdrawals(userId, userType, {
        limit: input.limit,
        status: input.status,
      });

      logger.info('[getWithdrawalHistory] History retrieved', {
        userId,
        userType,
        count: withdrawals.length,
        statusFilter: input.status,
        limit: input.limit,
      });

      return {
        withdrawals,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[getWithdrawalHistory] Error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to get withdrawal history');
    }
  }
);
