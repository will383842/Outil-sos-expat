/**
 * Payment Module - Main Export
 *
 * Centralized payment system for Chatter, Influencer, and Blogger
 * Supports: Wise (bank transfers) and Flutterwave (Mobile Money)
 *
 * This module provides:
 * - User-facing functions for payment method management and withdrawals
 * - Admin functions for payment configuration and withdrawal management
 * - Triggers for automated payment processing
 * - Services for use by other modules
 */

// ============================================================================
// USER CALLABLES
// ============================================================================

export {
  savePaymentMethod as paymentSaveMethod,
  getPaymentMethods as paymentGetMethods,
  deletePaymentMethod as paymentDeleteMethod,
  setDefaultPaymentMethod as paymentSetDefault,
  requestWithdrawal as paymentRequestWithdrawal,
  cancelWithdrawal as paymentCancelWithdrawal,
  getWithdrawalStatus as paymentGetStatus,
  getWithdrawalHistory as paymentGetHistory,
} from './callables';

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

export {
  adminGetPaymentConfig as paymentAdminGetConfig,
  adminUpdatePaymentConfig as paymentAdminUpdateConfig,
  adminGetPendingWithdrawals as paymentAdminGetPending,
  adminApproveWithdrawal as paymentAdminApprove,
  adminRejectWithdrawal as paymentAdminReject,
  adminProcessWithdrawal as paymentAdminProcess,
  adminGetPaymentStats as paymentAdminGetStats,
  adminGetAuditLogs as paymentAdminGetLogs,
  adminGetAuditLogActions as paymentAdminGetLogActions,
  adminExportWithdrawals as paymentAdminExport,
} from './callables/admin';

// ============================================================================
// TRIGGERS
// ============================================================================

export {
  paymentOnWithdrawalCreated,
  paymentOnWithdrawalStatusChanged,
  paymentProcessAutomaticPayments,
  paymentWebhookWise,
  paymentWebhookFlutterwave,
} from './triggers';

// ============================================================================
// TYPES (for use by other modules)
// ============================================================================

export type {
  PaymentProvider,
  PaymentMethodType,
  PaymentUserType,
  WithdrawalStatus,
  MobileMoneyProvider,
  BankTransferDetails,
  MobileMoneyDetails,
  PaymentMethodDetails,
  UserPaymentMethod,
  WithdrawalRequest,
  PaymentConfig,
  ProviderTransactionResult,
  StatusHistoryEntry,
  PaymentTrackingSummary,
  TrackingTimelineItem,
  CreateWithdrawalInput,
  UpdateWithdrawalStatusInput,
  WithdrawalStats,
  UserWithdrawalSummary,
} from './types';

export { DEFAULT_PAYMENT_CONFIG } from './types';

// ============================================================================
// SERVICES (for use by other modules)
// ============================================================================

export { getPaymentService, PaymentService, COLLECTIONS } from './services/paymentService';
export { getTrackingService, TrackingService } from './services/trackingService';
export { createPaymentRouter, PaymentRouter } from './services/paymentRouter';

// ============================================================================
// PROVIDERS (for direct access if needed)
// ============================================================================

export { WiseProvider } from './providers/wiseProvider';
export { FlutterwaveProvider, createFlutterwaveProvider } from './providers/flutterwaveProvider';

// ============================================================================
// CONFIG HELPERS (for use by other modules)
// ============================================================================

export {
  getProviderForCountry,
  isCountrySupported,
  getAvailableMethodsForCountry,
  getCountryConfig,
  getAllSupportedCountries,
  getMethodTypeForCountry,
  isCountrySanctioned,
  getCurrencyForCountry,
} from './config/countriesConfig';

export {
  getProviderConfig as getMobileMoneyProviderConfig,
  getProvidersForCountry as getMobileMoneyProvidersForCountry,
  isProviderAvailableInCountry as isMobileMoneyProviderAvailable,
  getAllProvidersDisplayInfo as getMobileMoneyProviders,
  validatePhoneNumber as validateMobileMoneyPhoneNumber,
  MOBILE_MONEY_PROVIDERS,
  COUNTRY_TO_PROVIDERS,
  COUNTRY_CURRENCIES,
} from './config/mobileMoneyConfig';
