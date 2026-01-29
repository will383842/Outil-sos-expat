/**
 * Payment Types - Frontend
 * Centralized payment system types for Chatter, Influencer, and Blogger
 *
 * These types mirror the backend types but are simplified for frontend use.
 * Used by React components and hooks.
 * Must be compatible with what the callables return.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type PaymentProvider = 'wise' | 'flutterwave';
export type PaymentMethodType = 'bank_transfer' | 'mobile_money';
export type PaymentUserType = 'chatter' | 'influencer' | 'blogger';

export type WithdrawalStatus =
  | 'pending'
  | 'validating'
  | 'approved'
  | 'queued'
  | 'processing'
  | 'sent'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export type MobileMoneyProvider =
  | 'orange_money'
  | 'wave'
  | 'mtn_momo'
  | 'moov_money'
  | 'airtel_money'
  | 'mpesa'
  | 'free_money'
  | 't_money'
  | 'flooz';

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

export interface BankTransferDetails {
  type: 'bank_transfer';
  accountHolderName: string;
  country: string;
  currency: string;
  iban?: string;
  accountNumber?: string;
  routingNumber?: string;
  sortCode?: string;
  bsb?: string;
  ifsc?: string;
  swiftBic?: string;
  bankName?: string;
}

export interface MobileMoneyDetails {
  type: 'mobile_money';
  provider: MobileMoneyProvider;
  phoneNumber: string;
  country: string;
  accountName: string;
  currency: string;
}

export type PaymentDetails = BankTransferDetails | MobileMoneyDetails;

// ============================================================================
// USER PAYMENT METHOD
// ============================================================================

export interface UserPaymentMethod {
  id: string;
  provider: PaymentProvider;
  methodType: PaymentMethodType;
  details: PaymentDetails;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  // Display helpers
  displayName: string; // e.g., "Compte bancaire - FR** **** 4532"
  displayIcon: string; // Icon name
}

// ============================================================================
// WITHDRAWAL
// ============================================================================

export interface WithdrawalRequest {
  id: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  fees?: number;
  netAmount?: number;
  provider: PaymentProvider;
  methodType: PaymentMethodType;
  status: WithdrawalStatus;
  statusHistory: StatusHistoryEntry[];
  errorMessage?: string;
  requestedAt: string;
  completedAt?: string;
}

export interface StatusHistoryEntry {
  status: WithdrawalStatus;
  timestamp: string;
  note?: string;
}

// ============================================================================
// TRACKING
// ============================================================================

export interface PaymentTrackingSummary {
  withdrawalId: string;
  currentStatus: WithdrawalStatus;
  statusLabel: string;
  statusDescription: string;
  progress: number;
  estimatedCompletion?: string;
  timeline: TrackingTimelineItem[];
}

export interface TrackingTimelineItem {
  step: number;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  timestamp?: string;
}

// ============================================================================
// COUNTRY & PROVIDER CONFIG (for forms)
// ============================================================================

export interface CountryPaymentInfo {
  countryCode: string;
  countryName: string;
  provider: PaymentProvider;
  methodType: PaymentMethodType;
  currency: string;
  availableMobileProviders?: MobileMoneyProvider[];
}

export interface MobileMoneyProviderInfo {
  id: MobileMoneyProvider;
  name: string;
  displayName: string;
  logo?: string;
}

// ============================================================================
// INPUT TYPES (for forms)
// ============================================================================

export interface SavePaymentMethodInput {
  details: PaymentDetails;
  setAsDefault?: boolean;
}

export interface RequestWithdrawalInput {
  amount?: number; // Optional = withdraw all
  paymentMethodId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

// Status colors for UI
export const STATUS_COLORS: Record<WithdrawalStatus, string> = {
  pending: 'yellow',
  validating: 'yellow',
  approved: 'blue',
  queued: 'blue',
  processing: 'blue',
  sent: 'indigo',
  completed: 'green',
  failed: 'red',
  rejected: 'red',
  cancelled: 'gray',
};

// Status icons
export const STATUS_ICONS: Record<WithdrawalStatus, string> = {
  pending: 'Clock',
  validating: 'Search',
  approved: 'CheckCircle',
  queued: 'ListOrdered',
  processing: 'Loader',
  sent: 'Send',
  completed: 'CheckCircle2',
  failed: 'XCircle',
  rejected: 'Ban',
  cancelled: 'X',
};

/**
 * Check if status is terminal (no more state changes expected)
 */
export function isTerminalStatus(status: WithdrawalStatus): boolean {
  return ['completed', 'failed', 'rejected', 'cancelled'].includes(status);
}

/**
 * Check if status is successful
 */
export function isSuccessStatus(status: WithdrawalStatus): boolean {
  return status === 'completed';
}

/**
 * Check if status is error
 */
export function isErrorStatus(status: WithdrawalStatus): boolean {
  return ['failed', 'rejected'].includes(status);
}

/**
 * Check if withdrawal can be cancelled by the user
 */
export function canCancelWithdrawal(status: WithdrawalStatus): boolean {
  return ['pending', 'validating', 'approved', 'queued'].includes(status);
}
