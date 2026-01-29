/**
 * Wise API Provider for International Bank Transfers
 *
 * This provider handles bank transfers worldwide using Wise (formerly TransferWise).
 * Recipients don't need a Wise account - transfers go directly to their bank.
 *
 * @see https://docs.wise.com/api-docs/api-reference
 *
 * Flow:
 * 1. Create a quote (get exchange rate and fees)
 * 2. Create a recipient (bank account details)
 * 3. Create a transfer (links quote + recipient)
 * 4. Fund the transfer (from our Wise balance)
 * 5. Monitor status via webhooks or polling
 */

import { logger } from 'firebase-functions/v2';
import {
  getWiseApiToken,
  getWiseProfileId,
  getWiseMode,
  WISE_SECRETS,
} from '../../lib/secrets';
import {
  BankTransferDetails,
  ProviderTransactionResult,
} from '../types';

// ============================================================================
// EXPORTS FOR FUNCTION CONFIG
// ============================================================================

/**
 * Export secrets array for Cloud Functions that use this provider.
 * Usage: secrets: [...WISE_PROVIDER_SECRETS]
 */
export { WISE_SECRETS as WISE_PROVIDER_SECRETS };

// ============================================================================
// TYPES - CONFIGURATION
// ============================================================================

/**
 * Configuration for the Wise provider
 */
export interface WiseConfig {
  /** Wise API token (Bearer authentication) */
  apiKey: string;
  /** Business profile ID for the account */
  profileId: string;
  /** Environment: sandbox for testing, live/production for real transfers */
  environment: 'sandbox' | 'live' | 'production';
}

// ============================================================================
// TYPES - QUOTE
// ============================================================================

/**
 * A Wise quote containing exchange rate and fee information
 */
export interface WiseQuote {
  /** Unique quote ID (used when creating a transfer) */
  id: string;
  /** Source currency code (e.g., 'USD') */
  sourceCurrency: string;
  /** Target currency code (e.g., 'EUR') */
  targetCurrency: string;
  /** Amount in source currency */
  sourceAmount: number;
  /** Amount recipient will receive in target currency */
  targetAmount: number;
  /** Exchange rate applied (mid-market rate) */
  rate: number;
  /** Total fees in source currency */
  fee: number;
  /** ISO 8601 estimated delivery date */
  estimatedDelivery: string;
  /** Quote expiration timestamp (ISO 8601) */
  expirationTime: string;
  /** Type of payment (BALANCE, BANK_TRANSFER, etc.) */
  paymentType: string;
}

// ============================================================================
// TYPES - RECIPIENT
// ============================================================================

/**
 * A Wise recipient (bank account that can receive transfers)
 */
export interface WiseRecipient {
  /** Unique recipient ID */
  id: string;
  /** Profile ID this recipient belongs to */
  profileId: string;
  /** Name of the account holder */
  accountHolderName: string;
  /** Currency of the bank account */
  currency: string;
  /** Type of recipient (iban, swift_code, sort_code, aba, etc.) */
  type: string;
  /** Whether the recipient is active */
  active: boolean;
  /** Bank account details (varies by type) */
  details: Record<string, unknown>;
}

// ============================================================================
// TYPES - TRANSFER
// ============================================================================

/**
 * A Wise transfer
 */
export interface WiseTransfer {
  /** Unique transfer ID */
  id: string;
  /** Profile ID that initiated the transfer */
  profileId: string;
  /** Quote ID used for this transfer */
  quoteId: string;
  /** Recipient ID receiving the transfer */
  recipientId: string;
  /** Current status of the transfer */
  status: WiseTransferState;
  /** Reference note for the recipient */
  reference: string;
  /** External ID (our withdrawal ID) */
  externalId: string;
  /** Rate used for the transfer */
  rate: number;
  /** Source amount */
  sourceAmount: number;
  /** Source currency */
  sourceCurrency: string;
  /** Target amount */
  targetAmount: number;
  /** Target currency */
  targetCurrency: string;
  /** Fees charged */
  fee: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** Business days until delivery */
  businessDaysUntilDelivery?: number;
}

/**
 * Possible states of a Wise transfer
 */
export type WiseTransferState =
  | 'incoming_payment_waiting'
  | 'incoming_payment_initiated'
  | 'processing'
  | 'funds_converted'
  | 'outgoing_payment_sent'
  | 'cancelled'
  | 'funds_refunded'
  | 'bounced_back'
  | 'charged_back';

// ============================================================================
// TYPES - TRANSFER STATUS
// ============================================================================

/**
 * Detailed transfer status information
 */
export interface WiseTransferStatus {
  /** Transfer ID */
  id: string;
  /** Current status */
  status: WiseTransferState;
  /** Whether the transfer is complete */
  isComplete: boolean;
  /** Whether the transfer failed */
  isFailed: boolean;
  /** Whether the transfer is still in progress */
  isInProgress: boolean;
  /** Human-readable status message */
  statusMessage: string;
  /** Estimated delivery date (ISO 8601) */
  estimatedDelivery?: string;
  /** Last status update timestamp (ISO 8601) */
  updatedAt?: string;
  /** Issues if any (for failed transfers) */
  issues?: WiseTransferIssue[];
}

/**
 * Issue reported by Wise for a transfer
 */
export interface WiseTransferIssue {
  /** Issue type */
  type: string;
  /** Issue description */
  description: string;
}

// ============================================================================
// TYPES - BALANCE
// ============================================================================

/**
 * Wise account balance for a specific currency
 */
export interface WiseBalance {
  /** Balance ID */
  id: string;
  /** Currency code */
  currency: string;
  /** Available balance amount */
  amount: number;
  /** Reserved balance amount (pending transactions) */
  reservedAmount: number;
  /** Total balance (available + reserved) */
  totalAmount: number;
}

// ============================================================================
// TYPES - FUNDING
// ============================================================================

/**
 * Result of funding a transfer
 */
export interface WiseFundResult {
  /** Whether funding was successful */
  success: boolean;
  /** Transfer status after funding */
  status: WiseTransferState;
  /** Error message if funding failed */
  errorMessage?: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Error codes specific to Wise API
 */
export enum WiseErrorCode {
  // Authentication & Authorization
  INVALID_API_KEY = 'INVALID_API_KEY',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Rate Limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Balance Issues
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  INVALID_QUOTE = 'INVALID_QUOTE',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',

  // Transfer Issues
  TRANSFER_NOT_FOUND = 'TRANSFER_NOT_FOUND',
  TRANSFER_CANNOT_BE_CANCELLED = 'TRANSFER_CANNOT_BE_CANCELLED',
  TRANSFER_ALREADY_FUNDED = 'TRANSFER_ALREADY_FUNDED',

  // Network Issues
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for Wise API errors
 */
export class WiseError extends Error {
  /** Error code for programmatic handling */
  code: WiseErrorCode;
  /** HTTP status code from API (if applicable) */
  httpStatus?: number;
  /** Original error details from Wise API */
  apiError?: Record<string, unknown>;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number;

  constructor(
    message: string,
    code: WiseErrorCode,
    options?: {
      httpStatus?: number;
      apiError?: Record<string, unknown>;
      retryable?: boolean;
      retryAfterMs?: number;
    }
  ) {
    super(message);
    this.name = 'WiseError';
    this.code = code;
    this.httpStatus = options?.httpStatus;
    this.apiError = options?.apiError;
    this.retryable = options?.retryable ?? false;
    this.retryAfterMs = options?.retryAfterMs;
  }

  /**
   * Create error from HTTP response
   */
  static async fromResponse(
    response: Response,
    context: string
  ): Promise<WiseError> {
    const status = response.status;
    let body: Record<string, unknown> | null = null;

    try {
      body = await response.json() as Record<string, unknown>;
    } catch {
      // Body is not JSON
    }

    // Map HTTP status to error code
    let code: WiseErrorCode;
    let retryable = false;
    let retryAfterMs: number | undefined;

    switch (status) {
      case 401:
        code = WiseErrorCode.UNAUTHORIZED;
        break;
      case 403:
        code = WiseErrorCode.FORBIDDEN;
        break;
      case 404:
        code = WiseErrorCode.TRANSFER_NOT_FOUND;
        break;
      case 422:
        // Validation error - check for specific issues
        code = WiseErrorCode.VALIDATION_ERROR;
        if (body?.errors) {
          const errors = body.errors as Array<{ code?: string }>;
          for (const err of errors) {
            if (err.code === 'INSUFFICIENT_FUNDS') {
              code = WiseErrorCode.INSUFFICIENT_BALANCE;
            } else if (err.code === 'QUOTE_EXPIRED') {
              code = WiseErrorCode.QUOTE_EXPIRED;
            }
          }
        }
        break;
      case 429:
        code = WiseErrorCode.RATE_LIMITED;
        retryable = true;
        // Parse Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          retryAfterMs = parseInt(retryAfter, 10) * 1000;
        } else {
          retryAfterMs = 60000; // Default 60 seconds
        }
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = WiseErrorCode.NETWORK_ERROR;
        retryable = true;
        retryAfterMs = 5000; // Retry after 5 seconds
        break;
      default:
        code = WiseErrorCode.UNKNOWN_ERROR;
    }

    const message = body?.message
      ? String(body.message)
      : `Wise API error (${status}): ${context}`;

    return new WiseError(message, code, {
      httpStatus: status,
      apiError: body ?? undefined,
      retryable,
      retryAfterMs,
    });
  }
}

// ============================================================================
// WISE PROVIDER CLASS
// ============================================================================

/**
 * Wise API Provider for processing international bank transfers.
 *
 * This class wraps the Wise API and provides methods for:
 * - Creating quotes (get exchange rates and fees)
 * - Creating recipients (bank accounts)
 * - Creating and funding transfers
 * - Monitoring transfer status
 *
 * @example
 * ```typescript
 * // Using with Firebase Secrets (recommended)
 * const wise = WiseProvider.fromSecrets();
 *
 * // Process a payment
 * const result = await wise.processPayment({
 *   withdrawalId: 'wd_123',
 *   amount: 10000, // $100.00 in cents
 *   sourceCurrency: 'USD',
 *   targetCurrency: 'EUR',
 *   recipient: {
 *     type: 'bank_transfer',
 *     accountHolderName: 'John Doe',
 *     iban: 'DE89370400440532013000',
 *     country: 'DE',
 *     currency: 'EUR',
 *   },
 *   reference: 'SOS-Expat Withdrawal',
 * });
 * ```
 */
export class WiseProvider {
  private apiKey: string;
  private profileId: string;
  private environment: 'sandbox' | 'live' | 'production';
  private baseUrl: string;

  /**
   * Create a new WiseProvider instance
   */
  constructor(config: WiseConfig) {
    this.apiKey = config.apiKey;
    this.profileId = config.profileId;
    this.environment = config.environment;
    // 'live' or 'production' both map to the production API
    this.baseUrl =
      config.environment === 'production' || config.environment === 'live'
        ? 'https://api.wise.com'
        : 'https://api.sandbox.transferwise.tech';
  }

  /**
   * Create a WiseProvider instance using Firebase Secrets.
   * This is the recommended way to instantiate the provider in Cloud Functions.
   *
   * @returns WiseProvider instance configured from secrets
   * @throws WiseError if secrets are not configured
   */
  static fromSecrets(): WiseProvider {
    const apiKey = getWiseApiToken();
    const profileId = getWiseProfileId();
    const mode = getWiseMode();

    if (!apiKey) {
      throw new WiseError(
        'WISE_API_TOKEN secret is not configured',
        WiseErrorCode.INVALID_API_KEY
      );
    }

    if (!profileId) {
      throw new WiseError(
        'WISE_PROFILE_ID secret is not configured',
        WiseErrorCode.INVALID_API_KEY
      );
    }

    logger.info('[WiseProvider] Initialized from secrets', {
      environment: mode,
      profileIdLength: profileId.length,
    });

    return new WiseProvider({
      apiKey,
      profileId,
      environment: mode,
    });
  }

  // ==========================================================================
  // PRIVATE HTTP METHODS
  // ==========================================================================

  /**
   * Make an authenticated HTTP request to Wise API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add idempotency key for POST requests (prevents duplicate transfers)
    if (idempotencyKey && method === 'POST') {
      headers['X-idempotency-uuid'] = idempotencyKey;
    }

    // Log request (without sensitive data)
    logger.info('[WiseProvider] API Request', {
      method,
      path,
      hasBody: !!body,
      environment: this.environment,
    });

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw await WiseError.fromResponse(response, `${method} ${path}`);
      }

      // Handle empty response (some DELETE endpoints)
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      const data = JSON.parse(text) as T;

      logger.info('[WiseProvider] API Response', {
        method,
        path,
        status: response.status,
      });

      return data;
    } catch (error) {
      if (error instanceof WiseError) {
        throw error;
      }

      // Network or parsing error
      logger.error('[WiseProvider] Request failed', {
        method,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new WiseError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        WiseErrorCode.NETWORK_ERROR,
        { retryable: true, retryAfterMs: 5000 }
      );
    }
  }

  // ==========================================================================
  // QUOTE METHODS
  // ==========================================================================

  /**
   * Create a quote for a transfer.
   * The quote contains the exchange rate, fees, and estimated delivery time.
   *
   * @param params Quote parameters
   * @param params.sourceCurrency Source currency (e.g., 'USD')
   * @param params.targetCurrency Target currency (e.g., 'EUR')
   * @param params.sourceAmount Amount in source currency (optional if targetAmount is provided)
   * @param params.targetAmount Amount in target currency (optional if sourceAmount is provided)
   * @returns Quote with rate and fee information
   */
  async createQuote(params: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount?: number;
    targetAmount?: number;
  }): Promise<WiseQuote> {
    if (!params.sourceAmount && !params.targetAmount) {
      throw new WiseError(
        'Either sourceAmount or targetAmount is required',
        WiseErrorCode.VALIDATION_ERROR
      );
    }

    logger.info('[WiseProvider] Creating quote', {
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      sourceAmount: params.sourceAmount,
      targetAmount: params.targetAmount,
    });

    const response = await this.request<{
      id: string;
      sourceCurrency: string;
      targetCurrency: string;
      sourceAmount: number;
      targetAmount: number;
      rate: number;
      fee: number;
      deliveryEstimate: string;
      expirationTime: string;
      payIn: string;
    }>('POST', '/v3/profiles/' + this.profileId + '/quotes', {
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      sourceAmount: params.sourceAmount,
      targetAmount: params.targetAmount,
      payOut: 'BANK_TRANSFER',
      preferredPayIn: 'BALANCE',
    });

    return {
      id: response.id,
      sourceCurrency: response.sourceCurrency,
      targetCurrency: response.targetCurrency,
      sourceAmount: response.sourceAmount,
      targetAmount: response.targetAmount,
      rate: response.rate,
      fee: response.fee,
      estimatedDelivery: response.deliveryEstimate,
      expirationTime: response.expirationTime,
      paymentType: response.payIn || 'BALANCE',
    };
  }

  // ==========================================================================
  // RECIPIENT METHODS
  // ==========================================================================

  /**
   * Create a recipient (bank account) that can receive transfers.
   * The recipient type and required details vary by country.
   *
   * @param params Recipient parameters
   * @param params.currency Currency of the bank account
   * @param params.type Type of account (iban, swift_code, sort_code, aba, etc.)
   * @param params.details Bank account details
   * @returns Created recipient
   */
  async createRecipient(params: {
    currency: string;
    type: string;
    details: BankTransferDetails;
  }): Promise<WiseRecipient> {
    // Build account details based on type
    const accountDetails = this.buildRecipientDetails(params.type, params.details);

    logger.info('[WiseProvider] Creating recipient', {
      currency: params.currency,
      type: params.type,
      country: params.details.country,
      // Don't log sensitive bank details
    });

    const response = await this.request<{
      id: number;
      profile: number;
      accountHolderName: string;
      currency: string;
      type: string;
      active: boolean;
      details: Record<string, unknown>;
    }>('POST', '/v1/accounts', {
      profile: parseInt(this.profileId, 10),
      accountHolderName: params.details.accountHolderName,
      currency: params.currency,
      type: params.type,
      details: accountDetails,
    });

    return {
      id: response.id.toString(),
      profileId: response.profile.toString(),
      accountHolderName: response.accountHolderName,
      currency: response.currency,
      type: response.type,
      active: response.active,
      details: response.details,
    };
  }

  /**
   * Build recipient details object based on account type
   */
  private buildRecipientDetails(
    type: string,
    details: BankTransferDetails
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      legalType: 'PRIVATE', // Personal account
    };

    switch (type) {
      case 'iban':
        result.IBAN = details.iban;
        break;

      case 'swift_code':
        result.swiftCode = details.swiftBic;
        result.accountNumber = details.accountNumber;
        break;

      case 'sort_code':
        result.sortCode = details.sortCode;
        result.accountNumber = details.accountNumber;
        break;

      case 'aba':
        result.abartn = details.routingNumber;
        result.accountNumber = details.accountNumber;
        result.accountType = 'CHECKING';
        break;

      case 'bsb_code':
        result.bsbCode = details.bsb;
        result.accountNumber = details.accountNumber;
        break;

      case 'ifsc_code':
        result.ifscCode = details.ifsc;
        result.accountNumber = details.accountNumber;
        break;

      default:
        // Generic - include all available details
        if (details.iban) result.IBAN = details.iban;
        if (details.accountNumber) result.accountNumber = details.accountNumber;
        if (details.swiftBic) result.swiftCode = details.swiftBic;
        if (details.routingNumber) result.abartn = details.routingNumber;
        if (details.sortCode) result.sortCode = details.sortCode;
        if (details.bsb) result.bsbCode = details.bsb;
        if (details.ifsc) result.ifscCode = details.ifsc;
    }

    return result;
  }

  // ==========================================================================
  // TRANSFER METHODS
  // ==========================================================================

  /**
   * Create a transfer using an existing quote and recipient.
   *
   * @param params Transfer parameters
   * @param params.quoteId ID of the quote to use
   * @param params.recipientId ID of the recipient to send to
   * @param params.reference Reference note visible to recipient
   * @param params.externalId Our internal withdrawal ID (for tracking)
   * @returns Created transfer
   */
  async createTransfer(params: {
    quoteId: string;
    recipientId: string;
    reference: string;
    externalId: string;
  }): Promise<WiseTransfer> {
    logger.info('[WiseProvider] Creating transfer', {
      quoteId: params.quoteId,
      recipientId: params.recipientId,
      externalId: params.externalId,
    });

    const response = await this.request<{
      id: number;
      user: number;
      targetAccount: number;
      quoteUuid: string;
      status: WiseTransferState;
      reference: string;
      customerTransactionId: string;
      rate: number;
      sourceValue: number;
      sourceCurrency: string;
      targetValue: number;
      targetCurrency: string;
      fee: number;
      created: string;
      business: number;
    }>(
      'POST',
      '/v1/transfers',
      {
        targetAccount: parseInt(params.recipientId, 10),
        quoteUuid: params.quoteId,
        customerTransactionId: params.externalId,
        details: {
          reference: params.reference,
          transferPurpose: 'verification.transfers.purpose.pay.bills',
        },
      },
      // Use externalId as idempotency key to prevent duplicate transfers
      params.externalId
    );

    return {
      id: response.id.toString(),
      profileId: response.business?.toString() || this.profileId,
      quoteId: response.quoteUuid,
      recipientId: response.targetAccount.toString(),
      status: response.status,
      reference: response.reference,
      externalId: response.customerTransactionId,
      rate: response.rate,
      sourceAmount: response.sourceValue,
      sourceCurrency: response.sourceCurrency,
      targetAmount: response.targetValue,
      targetCurrency: response.targetCurrency,
      fee: response.fee,
      createdAt: response.created,
    };
  }

  /**
   * Fund a transfer from our Wise balance.
   * This initiates the actual money movement.
   *
   * @param transferId ID of the transfer to fund
   * @returns Funding result
   */
  async fundTransfer(transferId: string): Promise<WiseFundResult> {
    logger.info('[WiseProvider] Funding transfer', { transferId });

    try {
      const response = await this.request<{
        type: string;
        status: string;
        errorCode?: string;
        errorMessage?: string;
      }>(
        'POST',
        `/v3/profiles/${this.profileId}/transfers/${transferId}/payments`,
        {
          type: 'BALANCE',
        }
      );

      const success = response.status === 'COMPLETED' || !response.errorCode;

      if (!success) {
        logger.warn('[WiseProvider] Funding failed', {
          transferId,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
        });
      }

      return {
        success,
        status: success ? 'processing' : 'incoming_payment_waiting',
        errorMessage: response.errorMessage,
      };
    } catch (error) {
      if (
        error instanceof WiseError &&
        error.code === WiseErrorCode.INSUFFICIENT_BALANCE
      ) {
        return {
          success: false,
          status: 'incoming_payment_waiting',
          errorMessage: 'Insufficient balance to fund transfer',
        };
      }
      throw error;
    }
  }

  /**
   * Get the current status of a transfer.
   *
   * @param transferId ID of the transfer to check
   * @returns Current transfer status
   */
  async getTransferStatus(transferId: string): Promise<WiseTransferStatus> {
    logger.info('[WiseProvider] Getting transfer status', { transferId });

    const response = await this.request<{
      id: number;
      status: WiseTransferState;
      deliveryEstimate?: string;
      created: string;
      issues?: Array<{ type: string; description: string }>;
    }>('GET', `/v1/transfers/${transferId}`);

    const status = response.status;
    const isComplete = status === 'outgoing_payment_sent';
    const isFailed = ['cancelled', 'funds_refunded', 'bounced_back', 'charged_back'].includes(
      status
    );
    const isInProgress = !isComplete && !isFailed;

    return {
      id: response.id.toString(),
      status,
      isComplete,
      isFailed,
      isInProgress,
      statusMessage: this.getStatusMessage(status),
      estimatedDelivery: response.deliveryEstimate,
      updatedAt: response.created,
      issues: response.issues,
    };
  }

  /**
   * Get human-readable status message
   */
  private getStatusMessage(status: WiseTransferState): string {
    const messages: Record<WiseTransferState, string> = {
      incoming_payment_waiting: 'Waiting for funds',
      incoming_payment_initiated: 'Payment received, processing',
      processing: 'Transfer is being processed',
      funds_converted: 'Funds converted, sending to recipient',
      outgoing_payment_sent: 'Payment sent to recipient',
      cancelled: 'Transfer was cancelled',
      funds_refunded: 'Funds have been refunded',
      bounced_back: 'Transfer bounced back - invalid recipient details',
      charged_back: 'Transfer was charged back',
    };
    return messages[status] || 'Unknown status';
  }

  /**
   * Cancel a transfer (only possible if not yet sent).
   *
   * @param transferId ID of the transfer to cancel
   * @returns True if successfully cancelled
   */
  async cancelTransfer(transferId: string): Promise<boolean> {
    logger.info('[WiseProvider] Cancelling transfer', { transferId });

    try {
      await this.request<void>(
        'PUT',
        `/v1/transfers/${transferId}/cancel`,
        {}
      );
      return true;
    } catch (error) {
      if (error instanceof WiseError) {
        logger.warn('[WiseProvider] Failed to cancel transfer', {
          transferId,
          error: error.message,
        });
        return false;
      }
      throw error;
    }
  }

  // ==========================================================================
  // BALANCE METHODS
  // ==========================================================================

  /**
   * Get account balance for a specific currency.
   *
   * @param currency Currency code (e.g., 'USD', 'EUR')
   * @returns Balance information
   */
  async getBalance(currency: string): Promise<WiseBalance> {
    logger.info('[WiseProvider] Getting balance', { currency });

    const response = await this.request<
      Array<{
        id: number;
        currency: string;
        amount: { value: number; currency: string };
        reservedAmount: { value: number; currency: string };
        cashAmount: { value: number; currency: string };
        totalWorth: { value: number; currency: string };
      }>
    >('GET', `/v4/profiles/${this.profileId}/balances?types=STANDARD`);

    // Find balance for requested currency
    const balance = response.find((b) => b.currency === currency);

    if (!balance) {
      return {
        id: '',
        currency,
        amount: 0,
        reservedAmount: 0,
        totalAmount: 0,
      };
    }

    return {
      id: balance.id.toString(),
      currency: balance.currency,
      amount: balance.amount.value,
      reservedAmount: balance.reservedAmount.value,
      totalAmount: balance.totalWorth.value,
    };
  }

  // ==========================================================================
  // HIGH-LEVEL PAYMENT FLOW
  // ==========================================================================

  /**
   * Process a complete payment from start to finish.
   * This combines quote creation, recipient creation, transfer creation, and funding.
   *
   * @param params Payment parameters
   * @param params.withdrawalId Our internal withdrawal ID for tracking
   * @param params.amount Amount in cents (smallest currency unit)
   * @param params.sourceCurrency Source currency code (e.g., 'USD')
   * @param params.targetCurrency Target currency code
   * @param params.recipient Bank account details of the recipient
   * @param params.reference Reference note visible to recipient
   * @returns Transaction result
   */
  async processPayment(params: {
    withdrawalId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    recipient: BankTransferDetails;
    reference: string;
  }): Promise<ProviderTransactionResult> {
    logger.info('[WiseProvider] Processing payment', {
      withdrawalId: params.withdrawalId,
      amount: params.amount,
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      recipientCountry: params.recipient.country,
    });

    try {
      // Step 1: Create a quote
      // Convert cents to whole currency units
      const sourceAmount = params.amount / 100;

      const quote = await this.createQuote({
        sourceCurrency: params.sourceCurrency,
        targetCurrency: params.targetCurrency,
        sourceAmount,
      });

      logger.info('[WiseProvider] Quote created', {
        quoteId: quote.id,
        rate: quote.rate,
        fee: quote.fee,
        targetAmount: quote.targetAmount,
      });

      // Step 2: Check if we have sufficient balance
      const balance = await this.getBalance(params.sourceCurrency);
      if (balance.amount < sourceAmount) {
        logger.error('[WiseProvider] Insufficient balance', {
          required: sourceAmount,
          available: balance.amount,
        });

        return {
          success: false,
          status: 'failed',
          message: `Insufficient Wise balance. Required: ${sourceAmount} ${params.sourceCurrency}, Available: ${balance.amount} ${params.sourceCurrency}`,
        };
      }

      // Step 3: Determine recipient type from bank details
      const recipientType = this.determineRecipientType(params.recipient);

      // Step 4: Create recipient
      const recipient = await this.createRecipient({
        currency: params.targetCurrency,
        type: recipientType,
        details: params.recipient,
      });

      logger.info('[WiseProvider] Recipient created', {
        recipientId: recipient.id,
        type: recipient.type,
      });

      // Step 5: Create transfer
      const transfer = await this.createTransfer({
        quoteId: quote.id,
        recipientId: recipient.id,
        reference: params.reference,
        externalId: params.withdrawalId,
      });

      logger.info('[WiseProvider] Transfer created', {
        transferId: transfer.id,
        status: transfer.status,
      });

      // Step 6: Fund the transfer
      const fundResult = await this.fundTransfer(transfer.id);

      if (!fundResult.success) {
        logger.error('[WiseProvider] Funding failed', {
          transferId: transfer.id,
          error: fundResult.errorMessage,
        });

        return {
          success: false,
          transactionId: transfer.id,
          status: 'failed',
          message: fundResult.errorMessage || 'Failed to fund transfer',
          rawResponse: {
            quoteId: quote.id,
            recipientId: recipient.id,
            transferId: transfer.id,
            fundingError: fundResult.errorMessage,
          },
        };
      }

      logger.info('[WiseProvider] Payment processed successfully', {
        transferId: transfer.id,
        quoteId: quote.id,
        recipientId: recipient.id,
      });

      return {
        success: true,
        transactionId: transfer.id,
        status: 'processing',
        message: 'Transfer created and funded successfully',
        fees: Math.round(quote.fee * 100), // Convert to cents
        exchangeRate: quote.rate,
        estimatedDelivery: quote.estimatedDelivery,
        rawResponse: {
          quoteId: quote.id,
          recipientId: recipient.id,
          transferId: transfer.id,
          sourceAmount: quote.sourceAmount,
          targetAmount: quote.targetAmount,
          rate: quote.rate,
          fee: quote.fee,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error instanceof WiseError ? error.code : WiseErrorCode.UNKNOWN_ERROR;

      logger.error('[WiseProvider] Payment failed', {
        withdrawalId: params.withdrawalId,
        error: errorMessage,
        code: errorCode,
      });

      return {
        success: false,
        status: 'failed',
        message: errorMessage,
        rawResponse: {
          errorCode,
          retryable: error instanceof WiseError ? error.retryable : false,
        },
      };
    }
  }

  /**
   * Determine the recipient type based on available bank details
   */
  private determineRecipientType(details: BankTransferDetails): string {
    // IBAN takes priority for European transfers
    if (details.iban) {
      return 'iban';
    }

    // US routing number
    if (details.routingNumber && details.accountNumber) {
      return 'aba';
    }

    // UK sort code
    if (details.sortCode && details.accountNumber) {
      return 'sort_code';
    }

    // Australian BSB
    if (details.bsb && details.accountNumber) {
      return 'bsb_code';
    }

    // Indian IFSC
    if (details.ifsc && details.accountNumber) {
      return 'ifsc_code';
    }

    // SWIFT/BIC for international
    if (details.swiftBic && details.accountNumber) {
      return 'swift_code';
    }

    // Default to SWIFT if we have account number
    if (details.accountNumber) {
      return 'swift_code';
    }

    throw new WiseError(
      'Unable to determine recipient type from bank details. Please provide IBAN, routing number, sort code, or SWIFT/BIC.',
      WiseErrorCode.INVALID_RECIPIENT
    );
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get the current environment (sandbox, live, or production)
   */
  getEnvironment(): 'sandbox' | 'live' | 'production' {
    return this.environment;
  }

  /**
   * Get the API base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the profile ID
   */
  getProfileId(): string {
    return this.profileId;
  }
}
