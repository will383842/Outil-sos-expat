/**
 * Centralized Payment System Types
 *
 * This module defines all TypeScript types for the payment system
 * that supports Chatter, Influencer, and Blogger withdrawals.
 *
 * Providers: Wise (bank transfers) and Flutterwave (Mobile Money Africa)
 */

// ============================================================================
// ENUMS & BASIC TYPES
// ============================================================================

/**
 * Supported payment providers
 * - wise: International bank transfers worldwide
 * - flutterwave: Mobile Money for Africa
 * - manual: Admin-initiated payment outside automated providers
 */
export type PaymentProvider = 'wise' | 'flutterwave' | 'manual';

/**
 * Types of payment methods available
 * - bank_transfer: Traditional bank account (via Wise)
 * - mobile_money: Mobile money wallets (via Flutterwave)
 */
export type PaymentMethodType = 'bank_transfer' | 'mobile_money' | 'wise';

/**
 * User types that can request withdrawals from the system
 */
export type PaymentUserType = 'chatter' | 'influencer' | 'blogger' | 'group_admin' | 'affiliate';

/**
 * Detailed withdrawal status for professional tracking
 *
 * Flow: pending -> validating -> approved/queued -> processing -> sent -> completed
 * Alternative endings: failed, rejected, cancelled
 */
export type WithdrawalStatus =
  | 'pending'      // Just requested by user
  | 'validating'   // Being validated (fraud checks, balance verification)
  | 'approved'     // Admin approved (manual mode only)
  | 'queued'       // Queued for processing
  | 'processing'   // Being processed by payment provider
  | 'sent'         // Sent by provider, awaiting confirmation
  | 'completed'    // Confirmed received by recipient
  | 'failed'       // Failed (may be retryable)
  | 'rejected'     // Rejected by admin
  | 'cancelled';   // Cancelled by user

/**
 * Supported mobile money providers across Africa
 */
export type MobileMoneyProvider =
  | 'orange_money'  // Senegal, Mali, Ivory Coast, Cameroon, etc.
  | 'wave'          // Senegal, Ivory Coast
  | 'mtn_momo'      // Ghana, Uganda, Cameroon, etc.
  | 'moov_money'    // Benin, Togo, Ivory Coast
  | 'airtel_money'  // Uganda, Kenya, Tanzania, etc.
  | 'mpesa'         // Kenya, Tanzania
  | 'free_money'    // Senegal
  | 't_money'       // Togo
  | 'flooz';        // Togo, Benin

// ============================================================================
// PAYMENT METHOD DETAILS
// ============================================================================

/**
 * Bank transfer details for Wise payments
 * Fields vary based on destination country
 */
export interface BankTransferDetails {
  /** Discriminator for type narrowing */
  type: 'bank_transfer';

  /** Full legal name on the bank account */
  accountHolderName: string;

  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR') */
  country: string;

  /** ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP') */
  currency: string;

  // Country-specific fields (at least one required based on country)

  /** IBAN - International Bank Account Number (Europe, etc.) */
  iban?: string;

  /** Account number (US, UK, etc.) */
  accountNumber?: string;

  /** ABA routing number (US) */
  routingNumber?: string;

  /** Sort code (UK) */
  sortCode?: string;

  /** Bank State Branch code (Australia) */
  bsb?: string;

  /** Indian Financial System Code (India) */
  ifsc?: string;

  /** SWIFT/BIC code for international transfers */
  swiftBic?: string;

  /** Name of the bank */
  bankName?: string;

  /** Full address of the bank branch */
  bankAddress?: string;
}

/**
 * Mobile money details for Flutterwave payments
 */
export interface MobileMoneyDetails {
  /** Discriminator for type narrowing */
  type: 'mobile_money';

  /** Mobile money provider (Orange Money, Wave, MTN, etc.) */
  provider: MobileMoneyProvider;

  /** Phone number with country code (e.g., '+221771234567') */
  phoneNumber: string;

  /** ISO 3166-1 alpha-2 country code */
  country: string;

  /** Name registered on the mobile money account */
  accountName: string;

  /** Local currency code (e.g., 'XOF', 'GHS', 'KES') */
  currency: string;
}

/**
 * Union type for all payment method details
 */
export type PaymentMethodDetails = BankTransferDetails | MobileMoneyDetails;

// ============================================================================
// USER PAYMENT METHOD
// ============================================================================

/**
 * A user's saved payment method
 * Stored in Firestore under: paymentMethods/{methodId}
 */
export interface UserPaymentMethod {
  /** Unique identifier for this payment method */
  id: string;

  /** User ID who owns this payment method */
  userId: string;

  /** Type of user (chatter, influencer, blogger) */
  userType: PaymentUserType;

  /** Payment provider (wise or flutterwave) */
  provider: PaymentProvider;

  /** Type of payment method */
  methodType: PaymentMethodType;

  /** Full payment details */
  details: PaymentMethodDetails;

  /** Whether this is the user's default payment method */
  isDefault: boolean;

  /** Whether this method has been verified */
  isVerified: boolean;

  /** ISO 8601 timestamp when created */
  createdAt: string;

  /** ISO 8601 timestamp when last updated */
  updatedAt: string;
}

// ============================================================================
// STATUS TRACKING
// ============================================================================

/**
 * A single entry in the status history for audit trail
 */
export interface StatusHistoryEntry {
  /** The status at this point */
  status: WithdrawalStatus;

  /** ISO 8601 timestamp when status changed */
  timestamp: string;

  /** ID of the user/admin who triggered this change, or undefined for system */
  actor?: string;

  /** Type of actor that triggered this change */
  actorType: 'user' | 'admin' | 'system';

  /** Optional note explaining the status change */
  note?: string;

  /** Additional metadata for this status change */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// WITHDRAWAL REQUEST
// ============================================================================

/**
 * A withdrawal request from a user
 * Stored in Firestore under: withdrawals/{withdrawalId}
 *
 * This is the main document that tracks the entire lifecycle
 * of a payment from request to completion.
 */
export interface WithdrawalRequest {
  /** Unique identifier for this withdrawal */
  id: string;

  // -------------------------
  // User Information
  // -------------------------

  /** ID of the user requesting the withdrawal */
  userId: string;

  /** Type of user making the request */
  userType: PaymentUserType;

  /** User's email for notifications */
  userEmail: string;

  /** User's display name */
  userName: string;

  // -------------------------
  // Amount Information
  // -------------------------

  /** Amount in cents (smallest currency unit) — what user receives */
  amount: number;

  /** SOS-Expat withdrawal fee in cents (e.g., 300 = $3) */
  withdrawalFee?: number;

  /** Total debited from balance: amount + withdrawalFee */
  totalDebited?: number;

  /** Source currency (always USD in our system) */
  sourceCurrency: 'USD';

  /** Target currency for the recipient */
  targetCurrency: string;

  /** Exchange rate applied (1 USD = X target currency) */
  exchangeRate?: number;

  /** Amount in target currency after conversion */
  convertedAmount?: number;

  /** Fees charged by provider (in cents USD) */
  fees?: number;

  /** Net amount recipient receives (in target currency) */
  netAmount?: number;

  // -------------------------
  // Payment Method
  // -------------------------

  /** ID of the UserPaymentMethod used */
  paymentMethodId: string;

  /** Payment provider handling this withdrawal */
  provider: PaymentProvider;

  /** Type of payment method */
  methodType: PaymentMethodType;

  /** Snapshot of payment details at time of request */
  paymentDetails: PaymentMethodDetails;

  // -------------------------
  // Status & Tracking
  // -------------------------

  /** Current status of the withdrawal */
  status: WithdrawalStatus;

  /** Complete history of status changes for audit */
  statusHistory: StatusHistoryEntry[];

  // -------------------------
  // Provider Response
  // -------------------------

  /** Transaction ID from the payment provider */
  providerTransactionId?: string;

  /** Status string from the provider */
  providerStatus?: string;

  /** Raw response from provider API */
  providerResponse?: Record<string, unknown>;

  // -------------------------
  // Processing Info
  // -------------------------

  /** Whether this was processed automatically or manually */
  isAutomatic: boolean;

  /** Admin ID if manually processed/approved */
  processedBy?: string;

  /** Admin UID who approved the withdrawal */
  approvedBy?: string;

  /** Optional note from the admin who approved the withdrawal */
  approvalNote?: string;

  // -------------------------
  // Error Handling
  // -------------------------

  /** Error code if failed */
  errorCode?: string;

  /** Human-readable error message */
  errorMessage?: string;

  /** Number of retry attempts made */
  retryCount: number;

  /** Maximum retries allowed */
  maxRetries: number;

  /** ISO 8601 timestamp of last retry attempt */
  lastRetryAt?: string;

  // -------------------------
  // Timestamps
  // -------------------------

  /** When the user submitted the request */
  requestedAt: string;

  /** When admin approved (manual mode) */
  approvedAt?: string;

  /** When processing started */
  processedAt?: string;

  /** When provider confirmed sent */
  sentAt?: string;

  /** When confirmed completed */
  completedAt?: string;

  /** When it failed */
  failedAt?: string;

  /** When admin rejected */
  rejectedAt?: string;

  /** When user cancelled */
  cancelledAt?: string;
}

// ============================================================================
// UI TRACKING TYPES
// ============================================================================

/**
 * Simplified tracking summary for user-facing UI
 */
export interface PaymentTrackingSummary {
  /** The withdrawal ID being tracked */
  withdrawalId: string;

  /** Current status */
  currentStatus: WithdrawalStatus;

  /** Human-readable status label (e.g., "Processing") */
  statusLabel: string;

  /** Detailed description of current status */
  statusDescription: string;

  /** Progress percentage (0-100) */
  progress: number;

  /** Estimated completion time (ISO 8601) */
  estimatedCompletion?: string;

  /** Visual timeline for step-by-step tracking */
  timeline: TrackingTimelineItem[];
}

/**
 * A single step in the tracking timeline
 */
export interface TrackingTimelineItem {
  /** Step number (1, 2, 3, etc.) */
  step: number;

  /** Short label (e.g., "Request Submitted") */
  label: string;

  /** Detailed description */
  description: string;

  /** Status of this step */
  status: 'completed' | 'current' | 'pending' | 'failed';

  /** When this step was completed (ISO 8601) */
  timestamp?: string;
}

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

/**
 * Admin-configurable payment system settings
 * Stored in Firestore under: config/payment_config
 */
export interface PaymentConfig {
  /** Document ID (always 'payment_config') */
  id: 'payment_config';

  // -------------------------
  // Mode Settings
  // -------------------------

  /**
   * Payment processing mode:
   * - manual: All withdrawals require admin approval
   * - automatic: All withdrawals processed automatically
   * - hybrid: Auto below threshold, manual above
   */
  paymentMode: 'manual' | 'automatic' | 'hybrid';

  /** Threshold for hybrid mode (cents). Above this requires manual approval */
  autoPaymentThreshold: number;

  // -------------------------
  // Limits
  // -------------------------

  /** Minimum withdrawal amount (cents) */
  minimumWithdrawal: number;

  /** Maximum single withdrawal amount (cents) */
  maximumWithdrawal: number;

  /** Maximum withdrawals per user per day (cents) */
  dailyLimit: number;

  /** Maximum withdrawals per user per month (cents) */
  monthlyLimit: number;

  // -------------------------
  // Timing
  // -------------------------

  /** Days to wait before allowing new user withdrawals (fraud prevention) */
  validationPeriodDays: number;

  /** Hours to wait before processing automatic payments */
  autoPaymentDelayHours: number;

  // -------------------------
  // Retry Settings
  // -------------------------

  /** Maximum number of retry attempts for failed payments */
  maxRetries: number;

  /** Minutes to wait between retry attempts */
  retryDelayMinutes: number;

  // -------------------------
  // Notifications
  // -------------------------

  /** Send notification when withdrawal is requested */
  notifyOnRequest: boolean;

  /** Send notification when withdrawal is completed */
  notifyOnCompletion: boolean;

  /** Send notification when withdrawal fails */
  notifyOnFailure: boolean;

  /** Admin email addresses for notifications */
  adminEmails: string[];

  // -------------------------
  // Provider Settings
  // -------------------------

  /** Whether Wise (bank transfers) is enabled */
  wiseEnabled: boolean;

  /** Whether Flutterwave (mobile money) is enabled */
  flutterwaveEnabled: boolean;

  // -------------------------
  // Audit
  // -------------------------

  /** ISO 8601 timestamp of last update */
  updatedAt: string;

  /** Admin ID who last updated */
  updatedBy: string;
}

/**
 * Default payment configuration with sensible production defaults
 */
export const DEFAULT_PAYMENT_CONFIG: Omit<PaymentConfig, 'updatedAt' | 'updatedBy'> = {
  id: 'payment_config',

  // Mode: Start with manual for safety
  paymentMode: 'hybrid',
  autoPaymentThreshold: 50000, // $500 - auto below, manual above

  // Limits (in cents)
  minimumWithdrawal: 3000,     // $30 minimum
  maximumWithdrawal: 500000,   // $5,000 maximum per withdrawal
  dailyLimit: 500000,          // $5,000 per day
  monthlyLimit: 2000000,       // $20,000 per month

  // Timing
  validationPeriodDays: 7,     // New users wait 7 days
  autoPaymentDelayHours: 24,   // 24h delay for auto payments (fraud window)

  // Retry
  maxRetries: 3,
  retryDelayMinutes: 60,       // 1 hour between retries

  // Notifications
  notifyOnRequest: true,
  notifyOnCompletion: true,
  notifyOnFailure: true,
  adminEmails: [],

  // Providers - all enabled by default
  wiseEnabled: true,
  flutterwaveEnabled: true,
};

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Result from a payment provider transaction attempt
 */
export interface ProviderTransactionResult {
  /** Whether the transaction was successful */
  success: boolean;

  /** Transaction ID from the provider */
  transactionId?: string;

  /** Status string from the provider */
  status: string;

  /** Human-readable message */
  message?: string;

  /** Fees charged (in cents of source currency) */
  fees?: number;

  /** Exchange rate applied */
  exchangeRate?: number;

  /** Estimated delivery time (ISO 8601) */
  estimatedDelivery?: string;

  /** Raw API response for debugging */
  rawResponse?: Record<string, unknown>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Input for creating a new withdrawal request
 */
export interface CreateWithdrawalInput {
  userId: string;
  userType: PaymentUserType;
  userEmail: string;
  userName: string;
  amount: number;
  paymentMethodId: string;
}

/**
 * Input for updating withdrawal status
 */
export interface UpdateWithdrawalStatusInput {
  withdrawalId: string;
  newStatus: WithdrawalStatus;
  actor?: string;
  actorType: 'user' | 'admin' | 'system';
  note?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Withdrawal statistics for admin dashboard
 */
export interface WithdrawalStats {
  /** Total pending withdrawals count */
  pendingCount: number;

  /** Total pending amount (cents) */
  pendingAmount: number;

  /** Withdrawals processed today */
  processedToday: number;

  /** Amount processed today (cents) */
  processedAmountToday: number;

  /** Withdrawals this month */
  processedThisMonth: number;

  /** Amount this month (cents) */
  processedAmountThisMonth: number;

  /** Failed withdrawals requiring attention */
  failedCount: number;

  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * User's withdrawal history summary
 */
export interface UserWithdrawalSummary {
  /** User ID */
  userId: string;

  /** Total lifetime withdrawals (cents) */
  totalWithdrawn: number;

  /** Number of successful withdrawals */
  withdrawalCount: number;

  /** Amount pending (cents) */
  pendingAmount: number;

  /** Last withdrawal date */
  lastWithdrawalAt?: string;

  /** Whether user is eligible for auto-payment */
  isAutoPaymentEligible: boolean;

  /** Date when user became eligible for withdrawals */
  eligibleSince?: string;
}
