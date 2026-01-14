/**
 * Stripe Balance Cloud Function
 *
 * Fetches the platform Stripe balance for monitoring purposes.
 * Includes available, pending, and Connect reserved amounts.
 *
 * @version 1.1.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import Stripe from 'stripe';
import {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  getStripeSecretKey,
  getStripeMode,
} from '../lib/stripe';

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

if (!admin.apps.length) {
  admin.initializeApp();
}

// ============================================================================
// TYPES
// ============================================================================

interface BalanceAmount {
  amount: number;
  currency: string;
}

interface StripeBalanceResponse {
  available: BalanceAmount[];
  pending: BalanceAmount[];
  connectReserved: BalanceAmount[];
  timestamp: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verify that the user is an admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.role === 'dev';
  } catch (error) {
    logger.error('[StripeBalance] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Convert Stripe balance amounts to our format
 */
function formatBalanceAmounts(amounts: Stripe.Balance.Available[] | Stripe.Balance.Pending[] | Stripe.Balance.ConnectReserved[] | undefined): BalanceAmount[] {
  if (!amounts || !Array.isArray(amounts)) {
    return [];
  }

  return amounts.map((item) => ({
    amount: item.amount,
    currency: item.currency,
  }));
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getStripeBalance - Cloud Function onCall (admin only)
 *
 * Retrieves the platform Stripe balance including available, pending,
 * and Connect reserved amounts.
 *
 * @returns StripeBalanceResponse - Object containing all balance information
 */
export const getStripeBalance = functions.onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    secrets: [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST],
  },
  async (request): Promise<StripeBalanceResponse> => {
    // Authentication check
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new functions.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    logger.info('[StripeBalance] Fetching Stripe balance', {
      uid: request.auth.uid,
      mode: getStripeMode(),
    });

    try {
      // Get the Stripe secret key
      const stripeSecretKey = getStripeSecretKey();

      if (!stripeSecretKey) {
        logger.error('[StripeBalance] Stripe secret key not found');
        throw new functions.HttpsError(
          'failed-precondition',
          'Stripe configuration not found'
        );
      }

      // Initialize Stripe client
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
      });

      // Fetch balance from Stripe
      const balance = await stripe.balance.retrieve();

      // Format the response
      const response: StripeBalanceResponse = {
        available: formatBalanceAmounts(balance.available),
        pending: formatBalanceAmounts(balance.pending),
        connectReserved: formatBalanceAmounts(balance.connect_reserved),
        timestamp: new Date(),
      };

      logger.info('[StripeBalance] Balance retrieved successfully', {
        availableCurrencies: response.available.length,
        pendingCurrencies: response.pending.length,
        connectReservedCurrencies: response.connectReserved.length,
        mode: getStripeMode(),
      });

      return response;
    } catch (error) {
      logger.error('[StripeBalance] Error fetching balance:', error);

      if (error instanceof Stripe.errors.StripeError) {
        throw new functions.HttpsError(
          'internal',
          `Stripe API error: ${error.message}`
        );
      }

      if (error instanceof functions.HttpsError) {
        throw error;
      }

      throw new functions.HttpsError(
        'internal',
        'Failed to fetch Stripe balance'
      );
    }
  }
);
