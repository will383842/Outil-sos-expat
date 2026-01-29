/**
 * Admin Callable: Get Pending Withdrawals
 *
 * Retrieves all withdrawals awaiting admin action.
 * Supports filtering by user type and pagination.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { WithdrawalRequest, PaymentUserType, WithdrawalStatus } from '../../types';

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
 * Input for getting pending withdrawals
 */
interface GetPendingWithdrawalsInput {
  userType?: PaymentUserType;
  status?: WithdrawalStatus | WithdrawalStatus[];
  limit?: number;
  offset?: number;
}

/**
 * Response for pending withdrawals
 */
interface GetPendingWithdrawalsResponse {
  withdrawals: WithdrawalRequest[];
  total: number;
  hasMore: boolean;
  summary: {
    pendingCount: number;
    pendingAmount: number;
    validatingCount: number;
    approvedCount: number;
    processingCount: number;
  };
}

/**
 * Get Pending Withdrawals
 *
 * Returns all withdrawals that require admin attention, including:
 * - pending: New requests awaiting validation
 * - validating: Being validated
 * - approved: Approved but not yet processed
 * - queued: Ready for processing
 * - processing: Currently being processed
 * - failed: Failed and may need attention
 */
export const adminGetPendingWithdrawals = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<GetPendingWithdrawalsResponse> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = (request.data as GetPendingWithdrawalsInput) || {};

    const {
      userType,
      status,
      limit = 50,
      offset = 0,
    } = input;

    try {
      logger.info('[adminGetPendingWithdrawals] Fetching pending withdrawals', {
        adminId,
        userType,
        status,
        limit,
        offset,
      });

      // Default statuses to fetch (pending action)
      const defaultStatuses: WithdrawalStatus[] = [
        'pending',
        'validating',
        'approved',
        'queued',
        'processing',
        'failed',
      ];

      const statusFilter = status
        ? Array.isArray(status) ? status : [status]
        : defaultStatuses;

      // Build query
      let query = db.collection('withdrawals') as FirebaseFirestore.Query;

      // Filter by status
      query = query.where('status', 'in', statusFilter);

      // Filter by user type if specified
      if (userType) {
        query = query.where('userType', '==', userType);
      }

      // Order by request date (oldest first for FIFO processing)
      query = query.orderBy('requestedAt', 'asc');

      // Get total count first
      const countSnapshot = await db
        .collection('withdrawals')
        .where('status', 'in', statusFilter)
        .count()
        .get();
      const total = countSnapshot.data().count;

      // Apply pagination
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();

      const withdrawals = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as WithdrawalRequest[];

      // Calculate summary statistics
      const allPendingSnapshot = await db
        .collection('withdrawals')
        .where('status', 'in', defaultStatuses)
        .get();

      const summary = {
        pendingCount: 0,
        pendingAmount: 0,
        validatingCount: 0,
        approvedCount: 0,
        processingCount: 0,
      };

      allPendingSnapshot.docs.forEach((doc) => {
        const withdrawal = doc.data() as WithdrawalRequest;
        switch (withdrawal.status) {
          case 'pending':
            summary.pendingCount++;
            summary.pendingAmount += withdrawal.amount;
            break;
          case 'validating':
            summary.validatingCount++;
            summary.pendingAmount += withdrawal.amount;
            break;
          case 'approved':
          case 'queued':
            summary.approvedCount++;
            summary.pendingAmount += withdrawal.amount;
            break;
          case 'processing':
            summary.processingCount++;
            break;
        }
      });

      logger.info('[adminGetPendingWithdrawals] Fetched successfully', {
        adminId,
        returnedCount: withdrawals.length,
        total,
        summary,
      });

      return {
        withdrawals,
        total,
        hasMore: offset + withdrawals.length < total,
        summary,
      };
    } catch (error) {
      logger.error('[adminGetPendingWithdrawals] Error', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to fetch pending withdrawals');
    }
  }
);
