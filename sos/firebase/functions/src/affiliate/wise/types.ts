/**
 * Wise API Types
 *
 * Type definitions for Wise (TransferWise) API integration.
 */

// ============================================================================
// RECIPIENT TYPES
// ============================================================================

export interface WiseRecipientRequest {
  currency: string;
  type: "iban" | "sort_code" | "aba" | "email";
  profile: number;
  accountHolderName: string;
  ownedByCustomer: boolean;
  details: WiseRecipientDetails;
}

export interface WiseRecipientDetails {
  // IBAN (Europe)
  iban?: string;

  // UK Sort Code
  sortCode?: string;
  accountNumber?: string;

  // USA ABA
  abartn?: string; // Routing number
  accountType?: "CHECKING" | "SAVINGS";

  // Address (required for some countries)
  address?: {
    country: string;
    city: string;
    postCode: string;
    firstLine: string;
  };

  // Legal type
  legalType?: "PRIVATE" | "BUSINESS";
}

export interface WiseRecipient {
  id: number;
  profile: number;
  accountHolderName: string;
  type: string;
  country: string;
  currency: string;
  details: WiseRecipientDetails;
  isActive: boolean;
  ownedByCustomer: boolean;
}

// ============================================================================
// QUOTE TYPES
// ============================================================================

export interface WiseQuoteRequest {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  profile: number;
  payOut?: "BALANCE" | "BANK_TRANSFER";
}

export interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  deliveryEstimate: string;
  expirationTime: string;
  paymentOptions: WisePaymentOption[];
}

export interface WisePaymentOption {
  payIn: string;
  payOut: string;
  fee: {
    transferwise: number;
    payIn: number;
    total: number;
  };
  sourceAmount: number;
  targetAmount: number;
  estimatedDelivery: string;
}

// ============================================================================
// TRANSFER TYPES
// ============================================================================

export interface WiseTransferRequest {
  targetAccount: number; // Recipient ID
  quoteUuid: string;
  customerTransactionId: string; // Unique reference (payout ID)
  details?: {
    reference?: string;
    transferPurpose?: string;
    sourceOfFunds?: string;
  };
}

export interface WiseTransfer {
  id: number;
  user: number;
  targetAccount: number;
  sourceAccount: number | null;
  quote: string;
  quoteUuid: string;
  status: WiseTransferStatus;
  rate: number;
  reference: string;
  sourceCurrency: string;
  sourceValue: number;
  targetCurrency: string;
  targetValue: number;
  business: number;
  created: string;
  customerTransactionId: string;
  details: {
    reference?: string;
  };
  hasActiveIssues: boolean;
  user_id?: number;
}

export type WiseTransferStatus =
  | "incoming_payment_waiting"
  | "incoming_payment_initiated"
  | "processing"
  | "funds_converted"
  | "outgoing_payment_sent"
  | "cancelled"
  | "funds_refunded"
  | "bounced_back";

// ============================================================================
// FUNDING TYPES
// ============================================================================

export interface WiseFundTransferRequest {
  type: "BALANCE";
}

export interface WiseFundTransferResponse {
  type: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  balanceTransactionId: number | null;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface WiseWebhookEvent {
  data: {
    resource: {
      id: number;
      profile_id: number;
      account_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: WiseWebhookEventType;
  schema_version: string;
  sent_at: string;
}

export type WiseWebhookEventType =
  | "transfers#state-change"
  | "transfers#active-cases"
  | "balances#credit"
  | "balances#update";

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface WiseError {
  error: string;
  error_description?: string;
  errors?: Array<{
    code: string;
    message: string;
    path?: string;
    arguments?: unknown[];
  }>;
}

// ============================================================================
// BALANCE TYPES
// ============================================================================

export interface WiseBalance {
  id: number;
  currency: string;
  amount: {
    value: number;
    currency: string;
  };
  reservedAmount: {
    value: number;
    currency: string;
  };
  cashAmount: {
    value: number;
    currency: string;
  };
  totalWorth: {
    value: number;
    currency: string;
  };
}
