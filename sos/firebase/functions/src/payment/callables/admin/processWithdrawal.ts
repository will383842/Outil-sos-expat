/**
 * Admin Callable: Process Withdrawal
 *
 * Triggers the actual payment processing via Wise or Flutterwave.
 * This function calls the payment provider API to initiate the transfer.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { adminConfig } from '../../../lib/functionConfigs';
import { checkRateLimit, RATE_LIMITS } from '../../../lib/rateLimiter';
import {
  WithdrawalRequest,
  WithdrawalStatus,
  StatusHistoryEntry,
  BankTransferDetails,
  MobileMoneyDetails,
  ProviderTransactionResult,
  PaymentConfig,
  DEFAULT_PAYMENT_CONFIG,
} from '../../types';
import { WiseProvider, WISE_PROVIDER_SECRETS } from '../../providers/wiseProvider';
import { createFlutterwaveProvider } from '../../providers/flutterwaveProvider';
import { FLUTTERWAVE_PAYOUT_SECRETS } from '../../../lib/secrets';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify that the request is from an admin user
 */
async function verifyAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const uid = request.auth.uid;

  // Check custom claims first (faster)
  const role = request.auth.token?.role as string | undefined;
  if (role === 'admin') {
    return uid;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return uid;
}

/**
 * Input for processing a withdrawal
 */
interface ProcessWithdrawalInput {
  withdrawalId: string;
  note?: string;
  approvalNote?: string;
}

/**
 * Process a withdrawal via Wise (bank transfer)
 */
async function processWisePayment(
  withdrawal: WithdrawalRequest
): Promise<ProviderTransactionResult> {
  const wise = WiseProvider.fromSecrets();

  const bankDetails = withdrawal.paymentDetails as BankTransferDetails;

  return wise.processPayment({
    withdrawalId: withdrawal.id,
    amount: withdrawal.amount,
    sourceCurrency: withdrawal.sourceCurrency,
    targetCurrency: withdrawal.targetCurrency,
    recipient: bankDetails,
    reference: `SOS-Expat ${withdrawal.userType} payout`,
  });
}

/**
 * Process a withdrawal via Flutterwave (mobile money)
 */
async function processFlutterwavePayment(
  withdrawal: WithdrawalRequest
): Promise<ProviderTransactionResult> {
  const flutterwave = createFlutterwaveProvider();

  const mobileDetails = withdrawal.paymentDetails as MobileMoneyDetails;

  return flutterwave.processPayment({
    withdrawalId: withdrawal.id,
    amount: withdrawal.amount / 100, // Flutterwave expects full currency units
    currency: withdrawal.targetCurrency,
    recipient: mobileDetails,
    reference: `SOS-${withdrawal.id.substring(0, 8)}`,
    narration: `SOS-Expat ${withdrawal.userType} payout`,
  });
}

/**
 * Process Withdrawal
 *
 * Initiates the actual payment via the appropriate provider (Wise or Flutterwave).
 * The withdrawal must be in 'approved' or 'queued' status.
 */
export const adminProcessWithdrawal = onCall(
  { ...adminConfig, timeoutSeconds: 120, secrets: [...WISE_PROVIDER_SECRETS, ...FLUTTERWAVE_PAYOUT_SECRETS] },
  async (request): Promise<{
    success: boolean;
    message: string;
    withdrawal: WithdrawalRequest;
    transactionResult?: ProviderTransactionResult;
  }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);
    await checkRateLimit(adminId, "processWithdrawal", RATE_LIMITS.WITHDRAWAL);

    const db = getFirestore();
    const input = request.data as ProcessWithdrawalInput;

    if (!input?.withdrawalId) {
      throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
    }

    const { withdrawalId, note, approvalNote } = input;

    try {
      logger.info('[adminProcessWithdrawal] Processing withdrawal', {
        adminId,
        withdrawalId,
        approvalNote,
      });

      // P0 FIX: TOCTOU - Atomic status check + update in transaction to prevent double payouts
      const withdrawalRef = db.collection('payment_withdrawals').doc(withdrawalId);

      let withdrawal!: WithdrawalRequest;
      await db.runTransaction(async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);

        if (!withdrawalDoc.exists) {
          throw new HttpsError('not-found', 'Withdrawal not found');
        }

        const data = withdrawalDoc.data()!;
        const processableStatuses: WithdrawalStatus[] = ['approved', 'queued'];
        if (!processableStatuses.includes(data.status as WithdrawalStatus)) {
          throw new HttpsError(
            'failed-precondition',
            `Cannot process withdrawal with status: ${data.status}. Expected: ${processableStatuses.join(', ')}`
          );
        }

        withdrawal = { ...data, id: withdrawalDoc.id } as WithdrawalRequest;

        const now = new Date().toISOString();
        const processingHistory: StatusHistoryEntry = {
          status: 'processing',
          timestamp: now,
          actor: adminId,
          actorType: 'admin',
          note: note || 'Processing initiated by admin',
        };

        transaction.update(withdrawalRef, {
          status: 'processing',
          processedAt: now,
          processedBy: adminId,
          approvedBy: adminId,
          approvalNote: approvalNote || note || null,
          statusHistory: [...(data.statusHistory || []), processingHistory],
        });
      });

      // Check if provider is enabled (after transaction - read-only check)
      const configDoc = await db.collection('config').doc('payment_config').get();
      const config = configDoc.exists
        ? (configDoc.data() as PaymentConfig)
        : { ...DEFAULT_PAYMENT_CONFIG, updatedAt: '', updatedBy: '' };

      if (withdrawal!.provider === 'wise' && !config.wiseEnabled) {
        throw new HttpsError('failed-precondition', 'Wise payments are currently disabled');
      }

      if (withdrawal!.provider === 'flutterwave' && !config.flutterwaveEnabled) {
        throw new HttpsError('failed-precondition', 'Flutterwave payments are currently disabled');
      }

      // Process payment via appropriate provider
      let result: ProviderTransactionResult;

      try {
        if (withdrawal.provider === 'wise') {
          result = await processWisePayment(withdrawal);
        } else if (withdrawal.provider === 'flutterwave') {
          result = await processFlutterwavePayment(withdrawal);
        } else {
          throw new Error(`Unknown provider: ${withdrawal.provider}`);
        }
      } catch (providerError) {
        // Payment provider error - mark as failed
        logger.error('[adminProcessWithdrawal] Provider error', {
          adminId,
          withdrawalId,
          provider: withdrawal.provider,
          error: providerError instanceof Error ? providerError.message : 'Unknown error',
        });

        const failedHistory: StatusHistoryEntry = {
          status: 'failed',
          timestamp: new Date().toISOString(),
          actor: adminId,
          actorType: 'admin',
          note: `Provider error: ${providerError instanceof Error ? providerError.message : 'Unknown error'}`,
        };

        await withdrawalRef.update({
          status: 'failed',
          failedAt: new Date().toISOString(),
          errorCode: 'PROVIDER_ERROR',
          errorMessage: providerError instanceof Error ? providerError.message : 'Unknown error',
          retryCount: withdrawal.retryCount + 1,
          lastRetryAt: new Date().toISOString(),
          statusHistory: FieldValue.arrayUnion(failedHistory),
        });

        throw new HttpsError(
          'internal',
          `Payment provider error: ${providerError instanceof Error ? providerError.message : 'Unknown error'}`
        );
      }

      // Update withdrawal with result
      let newStatus: WithdrawalStatus;
      let newHistory: StatusHistoryEntry;

      if (result.success) {
        newStatus = 'sent';
        newHistory = {
          status: 'sent',
          timestamp: new Date().toISOString(),
          actorType: 'system',
          note: `Payment sent via ${withdrawal.provider}`,
          metadata: {
            transactionId: result.transactionId,
            fees: result.fees,
            exchangeRate: result.exchangeRate,
          },
        };
      } else {
        newStatus = 'failed';
        newHistory = {
          status: 'failed',
          timestamp: new Date().toISOString(),
          actorType: 'system',
          note: result.message || 'Payment failed',
        };
      }

      await withdrawalRef.update({
        status: newStatus,
        providerTransactionId: result.transactionId || null,
        providerStatus: result.status,
        providerResponse: result.rawResponse || null,
        fees: result.fees || null,
        exchangeRate: result.exchangeRate || null,
        sentAt: result.success ? new Date().toISOString() : null,
        failedAt: !result.success ? new Date().toISOString() : null,
        errorMessage: !result.success ? result.message : null,
        retryCount: !result.success ? withdrawal.retryCount + 1 : withdrawal.retryCount,
        lastRetryAt: !result.success ? new Date().toISOString() : withdrawal.lastRetryAt,
        statusHistory: FieldValue.arrayUnion(newHistory),
      });

      // Create audit log
      const auditRef = db.collection('payment_audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        action: result.success ? 'withdrawal_sent' : 'withdrawal_failed',
        actorId: adminId,
        actorType: 'admin',
        targetId: withdrawalId,
        targetType: 'withdrawal',
        timestamp: Timestamp.now(),
        details: {
          provider: withdrawal.provider,
          previousStatus: withdrawal.status,
          newStatus,
          amount: withdrawal.amount,
          userId: withdrawal.userId,
          userType: withdrawal.userType,
          transactionId: result.transactionId,
          fees: result.fees,
          exchangeRate: result.exchangeRate,
          message: result.message,
          note,
          approvedBy: adminId,
          approvalNote: approvalNote || note || null,
        },
      });

      // Get updated withdrawal
      const updatedDoc = await withdrawalRef.get();
      const updatedWithdrawal = {
        ...updatedDoc.data(),
        id: updatedDoc.id,
      } as WithdrawalRequest;

      logger.info('[adminProcessWithdrawal] Withdrawal processed', {
        adminId,
        withdrawalId,
        provider: withdrawal.provider,
        success: result.success,
        transactionId: result.transactionId,
        auditLogId: auditRef.id,
      });

      return {
        success: result.success,
        message: result.success
          ? 'Payment sent successfully'
          : `Payment failed: ${result.message}`,
        withdrawal: updatedWithdrawal,
        transactionResult: result,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminProcessWithdrawal] Error', {
        adminId,
        withdrawalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to process withdrawal');
    }
  }
);
