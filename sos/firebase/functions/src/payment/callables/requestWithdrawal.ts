/**
 * Callable: requestWithdrawal
 *
 * Creates a new withdrawal request for the authenticated user.
 * Validates balance, payment method, and creates the withdrawal request.
 *
 * User types: chatter, influencer, blogger
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { getPaymentService } from '../services/paymentService';
import { PaymentUserType, WithdrawalStatus } from '../types';
import { PAYMENT_FUNCTIONS_REGION } from '../../configs/callRegion';
import { sendWithdrawalConfirmation, WithdrawalConfirmationRole } from '../../telegram/withdrawalConfirmation';
import { TELEGRAM_SECRETS } from '../../lib/secrets';
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

interface RequestWithdrawalInput {
  amount?: number; // Optional - will use full available balance if not specified
  paymentMethodId: string;
}

interface RequestWithdrawalOutput {
  success: true;
  withdrawalId: string;
  status: WithdrawalStatus;
  telegramConfirmationRequired?: boolean;
}

// ============================================================================
// USER TYPE DETECTION
// ============================================================================

/**
 * Determine the user type and get their profile data.
 */
async function getUserTypeAndProfile(
  userId: string
): Promise<{ userType: PaymentUserType; email: string; displayName: string; status: string } | null> {
  const db = getFirestore();

  // Check chatters
  const chatterDoc = await db.collection('chatters').doc(userId).get();
  if (chatterDoc.exists) {
    const data = chatterDoc.data()!;
    return {
      userType: 'chatter',
      email: data.email || '',
      displayName: data.displayName || data.name || 'Unknown',
      status: data.status || 'inactive',
    };
  }

  // Check influencers
  const influencerDoc = await db.collection('influencers').doc(userId).get();
  if (influencerDoc.exists) {
    const data = influencerDoc.data()!;
    return {
      userType: 'influencer',
      email: data.email || '',
      displayName: data.displayName || data.name || 'Unknown',
      status: data.status || 'inactive',
    };
  }

  // Check bloggers
  const bloggerDoc = await db.collection('bloggers').doc(userId).get();
  if (bloggerDoc.exists) {
    const data = bloggerDoc.data()!;
    return {
      userType: 'blogger',
      email: data.email || '',
      displayName: data.displayName || data.name || 'Unknown',
      status: data.status || 'inactive',
    };
  }

  return null;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateInput(input: RequestWithdrawalInput): void {
  if (!input.paymentMethodId?.trim()) {
    throw new HttpsError('invalid-argument', 'Payment method ID is required');
  }

  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number' || isNaN(input.amount)) {
      throw new HttpsError('invalid-argument', 'Amount must be a valid number');
    }

    if (input.amount <= 0) {
      throw new HttpsError('invalid-argument', 'Amount must be positive');
    }
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

/**
 * Request Withdrawal
 *
 * Input:
 * - amount?: number - Amount in cents (optional, defaults to full balance)
 * - paymentMethodId: string - ID of the payment method to use
 *
 * Output:
 * - success: true
 * - withdrawalId: string
 * - status: WithdrawalStatus
 *
 * Errors:
 * - unauthenticated: User not logged in
 * - permission-denied: User is not a chatter/influencer/blogger or account is not active
 * - invalid-argument: Invalid input data
 * - failed-precondition: Insufficient balance, minimum not met, or pending withdrawal exists
 * - not-found: Payment method not found
 * - internal: Server error
 */
export const requestWithdrawal = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
    secrets: [...TELEGRAM_SECRETS],
  },
  async (request: CallableRequest<RequestWithdrawalInput>): Promise<RequestWithdrawalOutput> => {
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
      // 3. Determine user type and get profile
      const userProfile = await getUserTypeAndProfile(userId);

      if (!userProfile) {
        throw new HttpsError(
          'permission-denied',
          'You must be a chatter, influencer, or blogger to request withdrawals'
        );
      }

      // 4. Check user status
      if (userProfile.status !== 'active') {
        throw new HttpsError(
          'permission-denied',
          `Your account is ${userProfile.status}. Cannot request withdrawal.`
        );
      }

      // 5. Check telegramId BEFORE creating withdrawal (critical: avoid orphaned withdrawals)
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      const telegramId = userDoc.data()?.telegramId as number | undefined;

      if (!telegramId) {
        throw new HttpsError('failed-precondition', 'TELEGRAM_REQUIRED');
      }

      // 6. Create withdrawal request using service
      const service = getPaymentService();
      const withdrawal = await service.createWithdrawalRequest({
        userId,
        userType: userProfile.userType,
        userEmail: userProfile.email,
        userName: userProfile.displayName,
        amount: input.amount || 0, // Service will use full balance if 0
        paymentMethodId: input.paymentMethodId,
      });

      logger.info('[requestWithdrawal] Withdrawal requested', {
        userId,
        userType: userProfile.userType,
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        isAutomatic: withdrawal.isAutomatic,
      });

      // 7. Send Telegram confirmation
      const roleMap: Record<string, WithdrawalConfirmationRole> = {
        chatter: 'chatter',
        influencer: 'influencer',
        blogger: 'blogger',
      };

      // Resolve human-readable payment method label
      const methodTypeLabels: Record<string, string> = {
        bank_transfer: 'Virement bancaire',
        mobile_money: 'Mobile Money',
        wise: 'Wise',
      };
      const paymentMethodLabel = methodTypeLabels[withdrawal.methodType] || withdrawal.methodType || input.paymentMethodId;

      const confirmResult = await sendWithdrawalConfirmation({
        withdrawalId: withdrawal.id,
        userId,
        role: roleMap[userProfile.userType] || 'chatter',
        collection: 'payment_withdrawals',
        amount: withdrawal.amount,
        paymentMethod: paymentMethodLabel,
        telegramId,
      });

      // If Telegram message failed to send, cancel the withdrawal to avoid orphaned state
      if (!confirmResult.success) {
        logger.warn('[requestWithdrawal] Telegram confirmation failed, cancelling withdrawal', {
          withdrawalId: withdrawal.id, userId,
        });
        try {
          const service2 = getPaymentService();
          await service2.cancelWithdrawal(withdrawal.id, userId, 'Telegram confirmation failed to send');
        } catch (cancelErr) {
          logger.error('[requestWithdrawal] Failed to auto-cancel after Telegram failure', {
            withdrawalId: withdrawal.id, error: cancelErr,
          });
        }
        throw new HttpsError('unavailable', 'TELEGRAM_SEND_FAILED');
      }

      return {
        success: true,
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        telegramConfirmationRequired: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('[requestWithdrawal] Error', {
        userId,
        error: errorMessage,
      });

      // Map common error messages to appropriate HttpsError codes
      if (errorMessage.includes('Payment method not found')) {
        throw new HttpsError('not-found', errorMessage);
      }
      if (errorMessage.includes('Insufficient balance') || errorMessage.includes('Minimum withdrawal')) {
        throw new HttpsError('failed-precondition', errorMessage);
      }
      if (errorMessage.includes('already pending')) {
        throw new HttpsError('failed-precondition', errorMessage);
      }
      if (errorMessage.includes('does not belong')) {
        throw new HttpsError('permission-denied', errorMessage);
      }

      throw new HttpsError('internal', 'Failed to request withdrawal');
    }
  }
);
