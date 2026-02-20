/**
 * Callable: deletePaymentMethod
 *
 * Deletes a payment method for the authenticated user.
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
import { PAYMENT_FUNCTIONS_REGION } from '../../configs/callRegion';
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface DeletePaymentMethodInput {
  paymentMethodId: string;
}

interface DeletePaymentMethodOutput {
  success: true;
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Delete Payment Method
 *
 * Input:
 * - paymentMethodId: string
 *
 * Output:
 * - success: true
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - invalid-argument: Missing payment method ID
 * - not-found: Payment method not found
 * - permission-denied: User doesn't own this payment method
 * - internal: Server error
 */
export const deletePaymentMethod = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request: CallableRequest<DeletePaymentMethodInput>): Promise<DeletePaymentMethodOutput> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;
    const { paymentMethodId } = request.data || {};

    // 2. Validate input
    if (!paymentMethodId?.trim()) {
      throw new HttpsError('invalid-argument', 'Payment method ID is required');
    }

    try {
      const db = getFirestore();

      // 3. Check for pending withdrawals using this method (pre-check for UX)
      const pendingWithdrawals = await db
        .collection('payment_withdrawals')
        .where('paymentMethodId', '==', paymentMethodId)
        .where('status', 'in', ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'])
        .limit(1)
        .get();

      if (!pendingWithdrawals.empty) {
        throw new HttpsError(
          'failed-precondition',
          'Cannot delete payment method with pending withdrawals. Please wait for the withdrawal to complete.'
        );
      }

      // 4. Delete the payment method using service (atomic: read + verify + delete in transaction)
      const service = getPaymentService();
      await service.deletePaymentMethod(userId, paymentMethodId);

      logger.info('[deletePaymentMethod] Payment method deleted', {
        userId,
        paymentMethodId,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[deletePaymentMethod] Error', {
        userId,
        paymentMethodId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to delete payment method');
    }
  }
);
