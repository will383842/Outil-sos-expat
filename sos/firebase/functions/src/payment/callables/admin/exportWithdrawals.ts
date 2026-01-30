/**
 * Admin Callable: Export Withdrawals
 *
 * Exports withdrawal data to CSV format for reporting and compliance.
 * Supports filtering by date range, status, and user type.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { WithdrawalRequest, WithdrawalStatus, PaymentUserType } from '../../types';
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
 * Input for exporting withdrawals
 */
interface ExportWithdrawalsInput {
  fromDate: string;
  toDate: string;
  status?: WithdrawalStatus | WithdrawalStatus[];
  userType?: PaymentUserType | PaymentUserType[];
  format?: 'csv' | 'json';
  includeDetails?: boolean;
}

/**
 * Response for export
 */
interface ExportWithdrawalsResponse {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
  exportedAt: string;
}

/**
 * Escape CSV value
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format amount from cents to currency
 */
function formatAmount(amountInCents: number): string {
  return (amountInCents / 100).toFixed(2);
}

/**
 * Export Withdrawals
 *
 * Exports withdrawal data for the specified criteria.
 * Returns data in CSV or JSON format.
 */
export const adminExportWithdrawals = onCall(
  { ...adminConfig, memory: '1GiB', timeoutSeconds: 120 },
  async (request): Promise<ExportWithdrawalsResponse> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as ExportWithdrawalsInput;

    // Validate required fields
    if (!input?.fromDate || !input?.toDate) {
      throw new HttpsError('invalid-argument', 'fromDate and toDate are required');
    }

    const {
      fromDate,
      toDate,
      status,
      userType,
      format = 'csv',
      includeDetails = false,
    } = input;

    try {
      logger.info('[adminExportWithdrawals] Exporting withdrawals', {
        adminId,
        fromDate,
        toDate,
        status,
        userType,
        format,
      });

      // Validate date range
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid date format');
      }

      if (startDate > endDate) {
        throw new HttpsError('invalid-argument', 'fromDate must be before toDate');
      }

      // Limit date range to 1 year for performance
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (endDate.getTime() - startDate.getTime() > oneYearMs) {
        throw new HttpsError('invalid-argument', 'Date range cannot exceed 1 year');
      }

      // Build query
      let query = db.collection('payment_withdrawals') as FirebaseFirestore.Query;

      // Filter by date range
      query = query
        .where('requestedAt', '>=', fromDate)
        .where('requestedAt', '<=', toDate);

      // Filter by status
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        if (statuses.length === 1) {
          query = query.where('status', '==', statuses[0]);
        } else if (statuses.length <= 10) {
          query = query.where('status', 'in', statuses);
        }
      }

      // Order by request date
      query = query.orderBy('requestedAt', 'asc');

      // Execute query
      const snapshot = await query.get();

      // Filter by user type in memory (Firestore limitation with multiple 'in' queries)
      let withdrawals = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as WithdrawalRequest[];

      if (userType) {
        const userTypes = Array.isArray(userType) ? userType : [userType];
        withdrawals = withdrawals.filter((w) => userTypes.includes(w.userType));
      }

      // Generate output
      let data: string;
      let mimeType: string;
      let filename: string;

      if (format === 'json') {
        // JSON export
        const jsonData = withdrawals.map((w) => ({
          id: w.id,
          userId: w.userId,
          userEmail: w.userEmail,
          userName: w.userName,
          userType: w.userType,
          amount: formatAmount(w.amount),
          amountCents: w.amount,
          sourceCurrency: w.sourceCurrency,
          targetCurrency: w.targetCurrency,
          convertedAmount: w.convertedAmount ? formatAmount(w.convertedAmount) : null,
          fees: w.fees ? formatAmount(w.fees) : null,
          netAmount: w.netAmount ? formatAmount(w.netAmount) : null,
          exchangeRate: w.exchangeRate,
          provider: w.provider,
          methodType: w.methodType,
          status: w.status,
          isAutomatic: w.isAutomatic,
          providerTransactionId: w.providerTransactionId,
          requestedAt: w.requestedAt,
          approvedAt: w.approvedAt,
          processedAt: w.processedAt,
          completedAt: w.completedAt,
          failedAt: w.failedAt,
          rejectedAt: w.rejectedAt,
          errorMessage: w.errorMessage,
          ...(includeDetails && {
            paymentDetails: w.paymentDetails,
            statusHistory: w.statusHistory,
          }),
        }));

        data = JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json';
        filename = `withdrawals_${fromDate}_${toDate}.json`;
      } else {
        // CSV export
        const headers = [
          'ID',
          'User ID',
          'User Email',
          'User Name',
          'User Type',
          'Amount (USD)',
          'Amount (Cents)',
          'Source Currency',
          'Target Currency',
          'Converted Amount',
          'Fees',
          'Net Amount',
          'Exchange Rate',
          'Provider',
          'Method Type',
          'Status',
          'Is Automatic',
          'Provider Transaction ID',
          'Requested At',
          'Approved At',
          'Processed At',
          'Completed At',
          'Failed At',
          'Rejected At',
          'Error Message',
        ];

        const rows = withdrawals.map((w) => [
          w.id,
          w.userId,
          w.userEmail,
          w.userName,
          w.userType,
          formatAmount(w.amount),
          w.amount,
          w.sourceCurrency,
          w.targetCurrency,
          w.convertedAmount ? formatAmount(w.convertedAmount) : '',
          w.fees ? formatAmount(w.fees) : '',
          w.netAmount ? formatAmount(w.netAmount) : '',
          w.exchangeRate || '',
          w.provider,
          w.methodType,
          w.status,
          w.isAutomatic ? 'Yes' : 'No',
          w.providerTransactionId || '',
          w.requestedAt,
          w.approvedAt || '',
          w.processedAt || '',
          w.completedAt || '',
          w.failedAt || '',
          w.rejectedAt || '',
          w.errorMessage || '',
        ]);

        // Build CSV
        const csvLines = [
          headers.map(escapeCSV).join(','),
          ...rows.map((row) => row.map(escapeCSV).join(',')),
        ];

        data = csvLines.join('\n');
        mimeType = 'text/csv';
        filename = `withdrawals_${fromDate}_${toDate}.csv`;
      }

      // Log audit entry
      const auditRef = db.collection('payment_audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        action: 'withdrawals_exported',
        actorId: adminId,
        actorType: 'admin',
        timestamp: Timestamp.now(),
        details: {
          fromDate,
          toDate,
          status,
          userType,
          format,
          recordCount: withdrawals.length,
        },
      });

      logger.info('[adminExportWithdrawals] Export completed', {
        adminId,
        recordCount: withdrawals.length,
        format,
        filename,
        auditLogId: auditRef.id,
      });

      return {
        data,
        filename,
        mimeType,
        recordCount: withdrawals.length,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminExportWithdrawals] Error', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to export withdrawals');
    }
  }
);
