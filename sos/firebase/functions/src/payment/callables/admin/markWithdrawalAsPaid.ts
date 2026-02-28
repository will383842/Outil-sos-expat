/**
 * Admin Callable: Mark Withdrawal As Paid (Manual)
 *
 * Allows admin to mark a withdrawal as completed after manually
 * sending the payment (bank transfer, PayPal, etc.) outside of
 * the automated Wise/Flutterwave system.
 *
 * Use case: While Wise/Flutterwave are not yet connected, admin
 * pays the affiliate manually and records it here.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { WithdrawalRequest, WithdrawalStatus, StatusHistoryEntry } from '../../types';
import { adminConfig } from '../../../lib/functionConfigs';

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

interface MarkAsPaidInput {
  withdrawalId: string;
  /** External transfer reference (bank ref, PayPal transaction ID, etc.) */
  externalReference: string;
  /** Optional note about the manual payment */
  note?: string;
}

/**
 * Mark Withdrawal As Paid
 *
 * Marks a pending/approved/failed withdrawal as completed.
 * The balance was already debited at request time — no balance change needed.
 */
export const adminMarkWithdrawalAsPaid = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as MarkAsPaidInput;

    if (!input?.withdrawalId) {
      throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
    }

    if (!input?.externalReference || input.externalReference.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'External reference is required (bank transfer ref, PayPal ID, etc.)');
    }

    const { withdrawalId, externalReference, note } = input;

    try {
      logger.info('[adminMarkWithdrawalAsPaid] Marking withdrawal as paid', {
        adminId,
        withdrawalId,
        externalReference,
      });

      const withdrawalRef = db.collection('payment_withdrawals').doc(withdrawalId);
      const withdrawalDoc = await withdrawalRef.get();

      if (!withdrawalDoc.exists) {
        throw new HttpsError('not-found', 'Withdrawal not found');
      }

      const withdrawal = withdrawalDoc.data() as WithdrawalRequest;

      // Can mark as paid from these statuses
      const allowedStatuses: WithdrawalStatus[] = ['pending', 'validating', 'approved', 'queued', 'processing', 'failed'];
      if (!allowedStatuses.includes(withdrawal.status)) {
        throw new HttpsError(
          'failed-precondition',
          `Cannot mark as paid: withdrawal status is "${withdrawal.status}". Allowed: ${allowedStatuses.join(', ')}`
        );
      }

      const now = new Date().toISOString();

      // Status history entry
      const historyEntry: StatusHistoryEntry = {
        status: 'completed',
        timestamp: now,
        actor: adminId,
        actorType: 'admin',
        note: `Manual payment — ref: ${externalReference}${note ? ` — ${note}` : ''}`,
      };

      // Update withdrawal to completed
      await withdrawalRef.update({
        status: 'completed',
        completedAt: now,
        processedBy: adminId,
        providerTransactionId: externalReference,
        provider: 'manual',
        statusHistory: [...withdrawal.statusHistory, historyEntry],
      });

      // Audit log
      await db.collection('payment_audit_logs').add({
        action: 'withdrawal_marked_paid_manually',
        actorId: adminId,
        actorType: 'admin',
        targetId: withdrawalId,
        targetType: 'withdrawal',
        timestamp: Timestamp.now(),
        details: {
          previousStatus: withdrawal.status,
          newStatus: 'completed',
          amount: withdrawal.amount,
          totalDebited: withdrawal.totalDebited,
          userId: withdrawal.userId,
          userType: withdrawal.userType,
          externalReference,
          note: note || null,
        },
      });

      logger.info('[adminMarkWithdrawalAsPaid] Withdrawal marked as paid', {
        adminId,
        withdrawalId,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        externalReference,
      });

      return {
        success: true,
        message: `Withdrawal marked as paid. Reference: ${externalReference}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminMarkWithdrawalAsPaid] Error', {
        adminId,
        withdrawalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to mark withdrawal as paid');
    }
  }
);
