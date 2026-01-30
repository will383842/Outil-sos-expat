/**
 * Admin Callable: Get Payment Statistics
 *
 * Provides dashboard statistics for payment monitoring.
 * Includes totals, trends, and breakdown by provider/user type.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { WithdrawalRequest, WithdrawalStatus, PaymentUserType, PaymentProvider } from '../../types';
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
 * Input for getting payment stats
 */
interface GetPaymentStatsInput {
  period: 'today' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Statistics breakdown by status
 */
interface StatusBreakdown {
  pending: { count: number; amount: number };
  validating: { count: number; amount: number };
  approved: { count: number; amount: number };
  processing: { count: number; amount: number };
  sent: { count: number; amount: number };
  completed: { count: number; amount: number };
  failed: { count: number; amount: number };
  rejected: { count: number; amount: number };
  cancelled: { count: number; amount: number };
}

/**
 * Statistics response
 */
interface PaymentStatsResponse {
  period: string;
  periodLabel: string;
  summary: {
    totalWithdrawals: number;
    totalAmount: number;
    completedCount: number;
    completedAmount: number;
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    failedAmount: number;
    averageAmount: number;
    totalFees: number;
  };
  byStatus: StatusBreakdown;
  byProvider: {
    wise: { count: number; amount: number };
    flutterwave: { count: number; amount: number };
  };
  byUserType: {
    chatter: { count: number; amount: number };
    influencer: { count: number; amount: number };
    blogger: { count: number; amount: number };
  };
  trends: {
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    amountToday: number;
    amountThisWeek: number;
    amountThisMonth: number;
  };
  recentActivity: Array<{
    id: string;
    userId: string;
    userName: string;
    userType: PaymentUserType;
    amount: number;
    status: WithdrawalStatus;
    provider: PaymentProvider;
    requestedAt: string;
    completedAt?: string;
  }>;
}

/**
 * Get period start date based on period type
 */
function getPeriodStartDate(period: string): Date {
  const now = new Date();

  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToSubtract);
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return new Date(0); // Beginning of time
  }
}

/**
 * Get human-readable period label
 */
function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
  };
  return labels[period] || 'All Time';
}

/**
 * Get Payment Statistics
 *
 * Returns comprehensive statistics about withdrawals for the admin dashboard.
 */
export const adminGetPaymentStats = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request): Promise<PaymentStatsResponse> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = (request.data as GetPaymentStatsInput) || { period: 'month' };
    const { period = 'month' } = input;

    try {
      logger.info('[adminGetPaymentStats] Fetching stats', {
        adminId,
        period,
      });

      const periodStart = getPeriodStartDate(period);
      // Note: periodTimestamp kept for potential future use with Firestore Timestamp queries
      void Timestamp.fromDate(periodStart);

      // Build query based on period
      let query = db.collection('payment_withdrawals') as FirebaseFirestore.Query;

      if (period !== 'all') {
        query = query.where('requestedAt', '>=', periodStart.toISOString());
      }

      const snapshot = await query.get();

      // Initialize counters
      const byStatus: StatusBreakdown = {
        pending: { count: 0, amount: 0 },
        validating: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        processing: { count: 0, amount: 0 },
        sent: { count: 0, amount: 0 },
        completed: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        rejected: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      };

      const byProvider = {
        wise: { count: 0, amount: 0 },
        flutterwave: { count: 0, amount: 0 },
      };

      const byUserType = {
        chatter: { count: 0, amount: 0 },
        influencer: { count: 0, amount: 0 },
        blogger: { count: 0, amount: 0 },
      };

      let totalAmount = 0;
      let completedAmount = 0;
      let completedCount = 0;
      let pendingAmount = 0;
      let pendingCount = 0;
      let failedAmount = 0;
      let failedCount = 0;
      let totalFees = 0;

      const recentWithdrawals: WithdrawalRequest[] = [];

      // Process each withdrawal
      snapshot.docs.forEach((doc) => {
        const withdrawal = doc.data() as WithdrawalRequest;

        // Count by status
        if (byStatus[withdrawal.status as keyof StatusBreakdown]) {
          byStatus[withdrawal.status as keyof StatusBreakdown].count++;
          byStatus[withdrawal.status as keyof StatusBreakdown].amount += withdrawal.amount;
        }

        // Count by provider
        if (byProvider[withdrawal.provider]) {
          byProvider[withdrawal.provider].count++;
          byProvider[withdrawal.provider].amount += withdrawal.amount;
        }

        // Count by user type
        if (byUserType[withdrawal.userType]) {
          byUserType[withdrawal.userType].count++;
          byUserType[withdrawal.userType].amount += withdrawal.amount;
        }

        // Calculate totals
        totalAmount += withdrawal.amount;

        if (withdrawal.status === 'completed' || withdrawal.status === 'sent') {
          completedCount++;
          completedAmount += withdrawal.amount;
          if (withdrawal.fees) {
            totalFees += withdrawal.fees;
          }
        }

        if (['pending', 'validating', 'approved', 'queued', 'processing'].includes(withdrawal.status)) {
          pendingCount++;
          pendingAmount += withdrawal.amount;
        }

        if (withdrawal.status === 'failed') {
          failedCount++;
          failedAmount += withdrawal.amount;
        }

        // Collect recent withdrawals
        recentWithdrawals.push({ ...withdrawal, id: doc.id });
      });

      // Sort and limit recent activity
      recentWithdrawals.sort((a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      const recentActivity = recentWithdrawals.slice(0, 10).map((w) => ({
        id: w.id,
        userId: w.userId,
        userName: w.userName,
        userType: w.userType,
        amount: w.amount,
        status: w.status,
        provider: w.provider,
        requestedAt: w.requestedAt,
        completedAt: w.completedAt,
      }));

      // Calculate trends (always get fresh data for trends)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - todayStart.getDay() + 1);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let completedToday = 0;
      let completedThisWeek = 0;
      let completedThisMonth = 0;
      let amountToday = 0;
      let amountThisWeek = 0;
      let amountThisMonth = 0;

      // Get all completed withdrawals for trends
      const completedSnapshot = await db
        .collection('payment_withdrawals')
        .where('status', 'in', ['completed', 'sent'])
        .where('completedAt', '>=', monthStart.toISOString())
        .get();

      completedSnapshot.docs.forEach((doc) => {
        const withdrawal = doc.data() as WithdrawalRequest;
        const completedDate = new Date(withdrawal.completedAt || withdrawal.sentAt || withdrawal.requestedAt);

        if (completedDate >= todayStart) {
          completedToday++;
          amountToday += withdrawal.amount;
        }
        if (completedDate >= weekStart) {
          completedThisWeek++;
          amountThisWeek += withdrawal.amount;
        }
        if (completedDate >= monthStart) {
          completedThisMonth++;
          amountThisMonth += withdrawal.amount;
        }
      });

      const totalWithdrawals = snapshot.docs.length;
      const averageAmount = totalWithdrawals > 0 ? Math.round(totalAmount / totalWithdrawals) : 0;

      const response: PaymentStatsResponse = {
        period,
        periodLabel: getPeriodLabel(period),
        summary: {
          totalWithdrawals,
          totalAmount,
          completedCount,
          completedAmount,
          pendingCount,
          pendingAmount,
          failedCount,
          failedAmount,
          averageAmount,
          totalFees,
        },
        byStatus,
        byProvider,
        byUserType,
        trends: {
          completedToday,
          completedThisWeek,
          completedThisMonth,
          amountToday,
          amountThisWeek,
          amountThisMonth,
        },
        recentActivity,
      };

      logger.info('[adminGetPaymentStats] Stats fetched', {
        adminId,
        period,
        totalWithdrawals,
        completedCount,
        pendingCount,
      });

      return response;
    } catch (error) {
      logger.error('[adminGetPaymentStats] Error', {
        adminId,
        period,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to fetch payment statistics');
    }
  }
);
