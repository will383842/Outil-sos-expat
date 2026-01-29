/**
 * Payment Admin Callables Index
 *
 * Admin-only Cloud Functions for managing the centralized payment system.
 * All functions require admin authentication and log audit trails.
 *
 * Functions:
 * - adminGetPaymentConfig: Get current payment configuration
 * - adminUpdatePaymentConfig: Update payment settings
 * - adminGetPendingWithdrawals: Get withdrawals awaiting action
 * - adminApproveWithdrawal: Approve a withdrawal for processing
 * - adminRejectWithdrawal: Reject a withdrawal with reason
 * - adminProcessWithdrawal: Trigger actual payment via provider
 * - adminGetPaymentStats: Dashboard statistics
 * - adminGetAuditLogs: Full audit trail
 * - adminGetAuditLogActions: List of audit log action types
 * - adminExportWithdrawals: Export to CSV/JSON
 */

// Configuration
export { adminGetPaymentConfig } from './getPaymentConfig';
export { adminUpdatePaymentConfig } from './updatePaymentConfig';

// Withdrawal Management
export { adminGetPendingWithdrawals } from './getPendingWithdrawals';
export { adminApproveWithdrawal } from './approveWithdrawal';
export { adminRejectWithdrawal } from './rejectWithdrawal';
export { adminProcessWithdrawal } from './processWithdrawal';

// Statistics & Reporting
export { adminGetPaymentStats } from './getPaymentStats';
export { adminGetAuditLogs, adminGetAuditLogActions } from './getAuditLogs';
export { adminExportWithdrawals } from './exportWithdrawals';
