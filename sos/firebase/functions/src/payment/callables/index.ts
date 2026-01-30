/**
 * Payment Callables - Main Export Index
 *
 * This module exports all user-facing payment callable functions.
 * These functions handle payment method management and withdrawal operations
 * for chatters, influencers, and bloggers.
 *
 * All functions:
 * - Require authentication
 * - Validate user type (chatter, influencer, blogger)
 * - Use the centralized PaymentService
 * - Are deployed to europe-west1 region
 */

// ============================================================================
// USER CALLABLES
// ============================================================================

// Payment Method Management
export { savePaymentMethod } from './savePaymentMethod';
export { getPaymentMethods } from './getPaymentMethods';
export { deletePaymentMethod } from './deletePaymentMethod';
export { setDefaultPaymentMethod } from './setDefaultPaymentMethod';

// Withdrawal Operations
export { requestWithdrawal } from './requestWithdrawal';
export { cancelWithdrawal } from './cancelWithdrawal';
export { getWithdrawalStatus } from './getWithdrawalStatus';
export { getWithdrawalHistory } from './getWithdrawalHistory';

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

// Re-export all admin callables from admin subfolder
export {
  adminGetPaymentConfig,
  adminUpdatePaymentConfig,
  adminGetPendingWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminProcessWithdrawal,
  adminGetPaymentStats,
  adminGetAuditLogs,
  adminGetAuditLogActions,
  adminExportWithdrawals,
} from './admin';
