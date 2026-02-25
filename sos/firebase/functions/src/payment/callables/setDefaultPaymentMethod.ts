/**
 * Callable: setDefaultPaymentMethod
 *
 * Sets a payment method as the default for the authenticated user.
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { UserPaymentMethod, PaymentUserType } from '../types';
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

interface SetDefaultPaymentMethodInput {
  paymentMethodId: string;
}

interface SetDefaultPaymentMethodOutput {
  success: true;
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Set Default Payment Method
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
export const setDefaultPaymentMethod = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request: CallableRequest<SetDefaultPaymentMethodInput>): Promise<SetDefaultPaymentMethodOutput> => {
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

    const db = getFirestore();

    try {
      // 3. Check if payment method exists and belongs to user
      const methodDoc = await db.collection('payment_methods').doc(paymentMethodId).get();

      if (!methodDoc.exists) {
        throw new HttpsError('not-found', 'Payment method not found');
      }

      const methodData = methodDoc.data() as UserPaymentMethod;
      if (methodData.userId !== userId) {
        throw new HttpsError('permission-denied', 'You do not have permission to modify this payment method');
      }

      const userType = methodData.userType as PaymentUserType;
      const now = new Date().toISOString();

      // 4. Use transaction to atomically update defaults
      await db.runTransaction(async (transaction) => {
        // Unset any existing defaults for this user
        const existingDefaults = await db
          .collection('payment_methods')
          .where('userId', '==', userId)
          .where('userType', '==', userType)
          .where('isDefault', '==', true)
          .get();

        for (const doc of existingDefaults.docs) {
          if (doc.id !== paymentMethodId) {
            transaction.update(doc.ref, {
              isDefault: false,
              updatedAt: now,
            });
          }
        }

        // Set the new default
        transaction.update(methodDoc.ref, {
          isDefault: true,
          updatedAt: now,
        });
      });

      logger.info('[setDefaultPaymentMethod] Default payment method updated', {
        userId,
        paymentMethodId,
        userType,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[setDefaultPaymentMethod] Error', {
        userId,
        paymentMethodId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to set default payment method');
    }
  }
);
