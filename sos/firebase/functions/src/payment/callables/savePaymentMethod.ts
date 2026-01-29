/**
 * Callable: savePaymentMethod
 *
 * Saves a new payment method for the authenticated user.
 * Supports bank transfers (Wise) and mobile money (Flutterwave).
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
import {
  BankTransferDetails,
  MobileMoneyDetails,
  PaymentUserType,
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

interface SavePaymentMethodInput {
  details: BankTransferDetails | MobileMoneyDetails;
  setAsDefault?: boolean;
}

interface SavePaymentMethodOutput {
  success: true;
  paymentMethodId: string;
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
  if (chatterDoc.exists && chatterDoc.data()?.status === 'active') {
    return 'chatter';
  }

  // Check influencers
  const influencerDoc = await db.collection('influencers').doc(userId).get();
  if (influencerDoc.exists && influencerDoc.data()?.status === 'active') {
    return 'influencer';
  }

  // Check bloggers
  const bloggerDoc = await db.collection('bloggers').doc(userId).get();
  if (bloggerDoc.exists && bloggerDoc.data()?.status === 'active') {
    return 'blogger';
  }

  return null;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateInput(input: SavePaymentMethodInput): void {
  if (!input.details) {
    throw new HttpsError('invalid-argument', 'Payment details are required');
  }

  const { details } = input;

  if (details.type === 'bank_transfer') {
    validateBankTransferDetails(details as BankTransferDetails);
  } else if (details.type === 'mobile_money') {
    validateMobileMoneyDetails(details as MobileMoneyDetails);
  } else {
    throw new HttpsError('invalid-argument', `Invalid payment method type: ${(details as { type: string }).type}`);
  }
}

function validateBankTransferDetails(details: BankTransferDetails): void {
  if (!details.accountHolderName?.trim()) {
    throw new HttpsError('invalid-argument', 'Account holder name is required');
  }

  if (!details.country?.trim()) {
    throw new HttpsError('invalid-argument', 'Country is required');
  }

  if (!details.currency?.trim()) {
    throw new HttpsError('invalid-argument', 'Currency is required');
  }

  // At least one bank identifier is required
  const hasIdentifier =
    details.iban ||
    details.accountNumber ||
    (details.routingNumber && details.accountNumber) ||
    (details.sortCode && details.accountNumber);

  if (!hasIdentifier) {
    throw new HttpsError(
      'invalid-argument',
      'Bank account details are required (IBAN, account number, routing number, etc.)'
    );
  }
}

function validateMobileMoneyDetails(details: MobileMoneyDetails): void {
  if (!details.provider) {
    throw new HttpsError('invalid-argument', 'Mobile money provider is required');
  }

  if (!details.phoneNumber?.trim()) {
    throw new HttpsError('invalid-argument', 'Phone number is required');
  }

  if (!details.country?.trim()) {
    throw new HttpsError('invalid-argument', 'Country is required');
  }

  if (!details.accountName?.trim()) {
    throw new HttpsError('invalid-argument', 'Account name is required');
  }

  if (!details.currency?.trim()) {
    throw new HttpsError('invalid-argument', 'Currency is required');
  }

  // Basic phone number validation
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  const cleanedPhone = details.phoneNumber.replace(/\s/g, '');
  if (!phoneRegex.test(cleanedPhone)) {
    throw new HttpsError('invalid-argument', 'Invalid phone number format');
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Save Payment Method
 *
 * Input:
 * - details: BankTransferDetails | MobileMoneyDetails
 * - setAsDefault?: boolean
 *
 * Output:
 * - success: true
 * - paymentMethodId: string
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - permission-denied: User is not a chatter/influencer/blogger
 * - invalid-argument: Invalid input data
 * - internal: Server error
 */
export const savePaymentMethod = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<SavePaymentMethodInput>): Promise<SavePaymentMethodOutput> => {
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
      // 3. Determine user type
      const userType = await getUserType(userId);

      if (!userType) {
        throw new HttpsError(
          'permission-denied',
          'You must be an active chatter, influencer, or blogger to save payment methods'
        );
      }

      // 4. Save payment method using service
      const service = getPaymentService();
      const paymentMethod = await service.savePaymentMethod({
        userId,
        userType,
        details: input.details,
        setAsDefault: input.setAsDefault,
      });

      logger.info('[savePaymentMethod] Payment method saved', {
        userId,
        userType,
        methodId: paymentMethod.id,
        type: input.details.type,
        isDefault: paymentMethod.isDefault,
      });

      return {
        success: true,
        paymentMethodId: paymentMethod.id,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('[savePaymentMethod] Error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Failed to save payment method');
    }
  }
);
