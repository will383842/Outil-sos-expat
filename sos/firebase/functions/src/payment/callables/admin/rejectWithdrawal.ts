/**
 * Admin Callable: Reject Withdrawal
 *
 * Rejects a withdrawal request with a reason.
 * The user's balance is restored.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { WithdrawalRequest, WithdrawalStatus, StatusHistoryEntry, PaymentUserType } from '../../types';

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
  if (role === 'admin' || role === 'dev') {
    return uid;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || !['admin', 'dev'].includes(userDoc.data()?.role)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return uid;
}

/**
 * Input for rejecting a withdrawal
 */
interface RejectWithdrawalInput {
  withdrawalId: string;
  reason: string;
}

/**
 * Get the collection name for a user type
 */
function getUserCollectionName(userType: PaymentUserType): string {
  switch (userType) {
    case 'chatter':
      return 'chatters';
    case 'influencer':
      return 'influencers';
    case 'blogger':
      return 'bloggers';
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }
}

/**
 * Reject Withdrawal
 *
 * Rejects a pending withdrawal request.
 * The withdrawal amount is returned to the user's available balance.
 */
export const adminRejectWithdrawal = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; message: string; withdrawal: WithdrawalRequest }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as RejectWithdrawalInput;

    if (!input?.withdrawalId) {
      throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
    }

    if (!input?.reason || input.reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Reason is required for rejection');
    }

    const { withdrawalId, reason } = input;

    try {
      logger.info('[adminRejectWithdrawal] Rejecting withdrawal', {
        adminId,
        withdrawalId,
        reason,
      });

      // Run in a transaction to ensure balance is restored atomically
      const result = await db.runTransaction(async (transaction) => {
        const withdrawalRef = db.collection('payment_withdrawals').doc(withdrawalId);
        const withdrawalDoc = await transaction.get(withdrawalRef);

        if (!withdrawalDoc.exists) {
          throw new HttpsError('not-found', 'Withdrawal not found');
        }

        const withdrawal = withdrawalDoc.data() as WithdrawalRequest;

        // Validate current status - can reject pending, validating, approved, or failed
        const rejectableStatuses: WithdrawalStatus[] = ['pending', 'validating', 'approved', 'queued', 'failed'];
        if (!rejectableStatuses.includes(withdrawal.status)) {
          throw new HttpsError(
            'failed-precondition',
            `Cannot reject withdrawal with status: ${withdrawal.status}. Expected: ${rejectableStatuses.join(', ')}`
          );
        }

        // Create status history entry
        const historyEntry: StatusHistoryEntry = {
          status: 'rejected',
          timestamp: new Date().toISOString(),
          actor: adminId,
          actorType: 'admin',
          note: reason,
        };

        // Update withdrawal
        const now = new Date().toISOString();
        const updates: Partial<WithdrawalRequest> = {
          status: 'rejected',
          rejectedAt: now,
          processedBy: adminId,
          errorMessage: reason,
          statusHistory: [...withdrawal.statusHistory, historyEntry],
        };

        transaction.update(withdrawalRef, updates);

        // Restore user's balance
        const userCollection = getUserCollectionName(withdrawal.userType);
        const userRef = db.collection(userCollection).doc(withdrawal.userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          // Restore the pending amount to available balance
          transaction.update(userRef, {
            availableBalance: FieldValue.increment(withdrawal.amount),
            pendingWithdrawal: FieldValue.increment(-withdrawal.amount),
            updatedAt: Timestamp.now(),
          });
        }

        return withdrawal;
      });

      // Create audit log (outside transaction for performance)
      const auditRef = db.collection('payment_audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        action: 'withdrawal_rejected',
        actorId: adminId,
        actorType: 'admin',
        targetId: withdrawalId,
        targetType: 'withdrawal',
        timestamp: Timestamp.now(),
        details: {
          previousStatus: result.status,
          newStatus: 'rejected',
          amount: result.amount,
          userId: result.userId,
          userType: result.userType,
          reason,
        },
      });

      // Get updated withdrawal
      const updatedDoc = await db.collection('payment_withdrawals').doc(withdrawalId).get();
      const updatedWithdrawal = {
        ...updatedDoc.data(),
        id: updatedDoc.id,
      } as WithdrawalRequest;

      logger.info('[adminRejectWithdrawal] Withdrawal rejected', {
        adminId,
        withdrawalId,
        userId: result.userId,
        amount: result.amount,
        reason,
        auditLogId: auditRef.id,
      });

      return {
        success: true,
        message: 'Withdrawal rejected. Balance has been restored.',
        withdrawal: updatedWithdrawal,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminRejectWithdrawal] Error', {
        adminId,
        withdrawalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to reject withdrawal');
    }
  }
);
