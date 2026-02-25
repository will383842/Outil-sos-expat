/**
 * Admin Callable: Approve Withdrawal
 *
 * Approves a withdrawal request for processing.
 * Used in manual and hybrid payment modes.
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
 * Input for approving a withdrawal
 */
interface ApproveWithdrawalInput {
  withdrawalId: string;
  note?: string;
}

/**
 * Approve Withdrawal
 *
 * Approves a pending withdrawal for processing.
 * The withdrawal status changes from 'pending' or 'validating' to 'approved'.
 */
export const adminApproveWithdrawal = onCall(
  { ...adminConfig, memory: '128MiB', timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string; withdrawal: WithdrawalRequest }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as ApproveWithdrawalInput;

    if (!input?.withdrawalId) {
      throw new HttpsError('invalid-argument', 'Withdrawal ID is required');
    }

    const { withdrawalId, note } = input;

    try {
      logger.info('[adminApproveWithdrawal] Approving withdrawal', {
        adminId,
        withdrawalId,
      });

      const withdrawalRef = db.collection('payment_withdrawals').doc(withdrawalId);

      // Use transaction to prevent TOCTOU race conditions
      const updatedWithdrawal = await db.runTransaction(async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);

        if (!withdrawalDoc.exists) {
          throw new HttpsError('not-found', 'Withdrawal not found');
        }

        const withdrawal = withdrawalDoc.data() as WithdrawalRequest;

        // Validate current status
        const approvableStatuses: WithdrawalStatus[] = ['pending', 'validating'];
        if (!approvableStatuses.includes(withdrawal.status)) {
          throw new HttpsError(
            'failed-precondition',
            `Cannot approve withdrawal with status: ${withdrawal.status}. Expected: ${approvableStatuses.join(', ')}`
          );
        }

        // Create status history entry
        const historyEntry: StatusHistoryEntry = {
          status: 'approved',
          timestamp: new Date().toISOString(),
          actor: adminId,
          actorType: 'admin',
          note: note || 'Approved by admin',
        };

        // Update withdrawal
        const now = new Date().toISOString();
        const updates: Partial<WithdrawalRequest> = {
          status: 'approved',
          approvedAt: now,
          processedBy: adminId,
          approvedBy: adminId,
          approvalNote: note || null,
          statusHistory: [...withdrawal.statusHistory, historyEntry],
        } as Partial<WithdrawalRequest>;

        transaction.update(withdrawalRef, updates);

        // Create audit log
        const auditRef = db.collection('payment_audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'withdrawal_approved',
          actorId: adminId,
          actorType: 'admin',
          targetId: withdrawalId,
          targetType: 'withdrawal',
          timestamp: Timestamp.now(),
          details: {
            previousStatus: withdrawal.status,
            newStatus: 'approved',
            amount: withdrawal.amount,
            userId: withdrawal.userId,
            userType: withdrawal.userType,
            note,
            approvedBy: adminId,
            approvalNote: note || null,
          },
        });

        return {
          ...withdrawal,
          ...updates,
          id: withdrawalDoc.id,
        } as WithdrawalRequest;
      });

      logger.info('[adminApproveWithdrawal] Withdrawal approved', {
        adminId,
        withdrawalId,
        userId: updatedWithdrawal.userId,
        amount: updatedWithdrawal.amount,
      });

      return {
        success: true,
        message: 'Withdrawal approved successfully',
        withdrawal: updatedWithdrawal,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminApproveWithdrawal] Error', {
        adminId,
        withdrawalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to approve withdrawal');
    }
  }
);
