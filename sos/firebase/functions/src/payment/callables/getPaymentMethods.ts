/**
 * Callable: getPaymentMethods
 *
 * Retrieves all payment methods for the authenticated user.
 * Returns both the list of methods and the default method ID.
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
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

interface GetPaymentMethodsOutput {
  methods: UserPaymentMethod[];
  defaultMethodId?: string;
}

// ============================================================================
// USER TYPE DETECTION
// ============================================================================

/**
 * Determine the user type from their profile in Firestore.
 * Checks chatters, influencers, and bloggers collections.
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
// CALLABLE
// ============================================================================

/**
 * Get Payment Methods
 *
 * Input: none
 *
 * Output:
 * - methods: UserPaymentMethod[] - List of all payment methods
 * - defaultMethodId?: string - ID of the default method (if any)
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - permission-denied: User is not a chatter/influencer/blogger
 * - internal: Server error
 */
export const getPaymentMethods = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    memory: '256MiB',
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request: CallableRequest): Promise<GetPaymentMethodsOutput> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;

    try {
      // 2. Determine user type
      const userType = await getUserType(userId);

      if (!userType) {
        throw new HttpsError(
          'permission-denied',
          'You must be a chatter, influencer, or blogger to access payment methods'
        );
      }

      // 3. Get payment methods using service
      const service = getPaymentService();
      const methods = await service.getUserPaymentMethods(userId, userType);

      // 4. Find default method ID
      const defaultMethod = methods.find((m) => m.isDefault);
      const defaultMethodId = defaultMethod?.id;

      logger.info('[getPaymentMethods] Retrieved payment methods', {
        userId,
        userType,
        count: methods.length,
        hasDefault: !!defaultMethodId,
      });

      return {
        methods,
        defaultMethodId,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[getPaymentMethods] Error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to get payment methods');
    }
  }
);
