/**
 * Flutterwave Payment Provider for Mobile Money in Africa
 *
 * This module provides integration with Flutterwave's API for:
 * - Mobile Money transfers (payouts/disbursements)
 * - Support for: Orange Money, Wave, MTN MoMo, M-Pesa, Airtel Money, etc.
 *
 * API Documentation: https://developer.flutterwave.com/docs
 *
 * Supported countries and currencies:
 * - Senegal (XOF): Orange Money, Wave, Free Money
 * - Ivory Coast (XOF): Orange Money, Wave, MTN MoMo, Moov Money
 * - Mali (XOF): Orange Money
 * - Cameroon (XAF): Orange Money, MTN MoMo
 * - Ghana (GHS): MTN MoMo, Vodafone Cash, AirtelTigo
 * - Kenya (KES): M-Pesa, Airtel Money
 * - Uganda (UGX): MTN MoMo, Airtel Money
 * - Tanzania (TZS): M-Pesa, Airtel Money, Tigo Pesa
 * - Rwanda (RWF): MTN MoMo, Airtel Money
 * - Benin (XOF): Moov Money, MTN MoMo
 * - Togo (XOF): T-Money, Flooz
 */

import * as crypto from 'crypto';
import {
  MobileMoneyProvider,
  MobileMoneyDetails,
  ProviderTransactionResult,
} from '../types';
import {
  getFlutterwaveSecretKey,
  getFlutterwavePublicKey,
  getFlutterwaveWebhookSecret,
  getFlutterwaveMode,
  getFlutterwaveBaseUrl,
} from '../../lib/secrets';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Flutterwave provider configuration
 */
export interface FlutterwaveConfig {
  /** Flutterwave secret key */
  secretKey: string;
  /** Flutterwave public key */
  publicKey: string;
  /** Environment: sandbox for testing, production for live */
  environment: 'sandbox' | 'production';
  /** Secret for verifying webhooks */
  webhookSecret: string;
}

/**
 * Flutterwave transfer status values
 */
export type FlutterwaveTransferStatusValue =
  | 'NEW'
  | 'PENDING'
  | 'SUCCESSFUL'
  | 'FAILED';

/**
 * Flutterwave transfer response
 */
export interface FlutterwaveTransfer {
  /** Unique transfer ID from Flutterwave */
  id: number;
  /** Current status of the transfer */
  status: FlutterwaveTransferStatusValue;
  /** Our reference for the transfer */
  reference: string;
  /** Amount transferred */
  amount: number;
  /** Currency code (e.g., XOF, GHS, KES) */
  currency: string;
  /** Fee charged by Flutterwave */
  fee: number;
  /** Description/narration */
  narration: string;
  /** Full name of the beneficiary */
  fullName: string;
  /** Phone number of the beneficiary */
  phoneNumber: string;
  /** Bank/Mobile money code */
  bankCode: string;
  /** Account number or phone number */
  accountNumber: string;
  /** Debit currency */
  debitCurrency: string;
  /** Completion message */
  completeMessage?: string;
  /** Whether retries are available */
  requiresApproval: number;
  /** Indicates if transfer is approved */
  isApproved: number;
  /** Bank name */
  bankName: string;
  /** Date created */
  createdAt: string;
  /** Flutterwave meta data */
  meta?: Record<string, unknown>;
}

/**
 * Flutterwave transfer status response
 */
export interface FlutterwaveTransferStatus {
  /** Transfer ID */
  id: number;
  /** Account number */
  accountNumber: string;
  /** Bank code */
  bankCode: string;
  /** Full name */
  fullName: string;
  /** Date created */
  dateCreated: string;
  /** Currency */
  currency: string;
  /** Debit currency */
  debitCurrency: string;
  /** Amount */
  amount: number;
  /** Fee */
  fee: number;
  /** Status */
  status: FlutterwaveTransferStatusValue;
  /** Reference */
  reference: string;
  /** Meta */
  meta?: Record<string, unknown>;
  /** Narration */
  narration: string;
  /** Approval URL */
  approvalUrl?: string;
  /** Complete message */
  completeMessage?: string;
  /** Number of retries */
  requiresApproval: number;
  /** Is approved */
  isApproved: number;
  /** Bank name */
  bankName: string;
}

/**
 * Flutterwave balance response
 */
export interface FlutterwaveBalance {
  /** Currency code */
  currency: string;
  /** Available balance */
  availableBalance: number;
  /** Ledger balance */
  ledgerBalance: number;
}

/**
 * Flutterwave fees response
 */
export interface FlutterwaveFees {
  /** Currency */
  currency: string;
  /** Fee amount */
  fee: number;
  /** Fee type */
  feeType: string;
}

/**
 * Flutterwave API error response
 */
export interface FlutterwaveApiError {
  /** Error status */
  status: 'error';
  /** Error message */
  message: string;
  /** Error data */
  data?: {
    code?: string;
    message?: string;
  };
}

/**
 * Flutterwave API success response wrapper
 */
export interface FlutterwaveApiResponse<T> {
  /** Response status */
  status: 'success' | 'error';
  /** Response message */
  message: string;
  /** Response data */
  data: T;
}

// ============================================================================
// FLUTTERWAVE ERROR CLASS
// ============================================================================

/**
 * Custom error class for Flutterwave API errors
 */
export class FlutterwaveError extends Error {
  /** Error code from Flutterwave */
  public readonly code: string;
  /** HTTP status code */
  public readonly statusCode: number;
  /** Original response data */
  public readonly response?: Record<string, unknown>;
  /** Whether error is retryable */
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    response?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FlutterwaveError';
    this.code = code;
    this.statusCode = statusCode;
    this.response = response;
    this.isRetryable = this.determineRetryable(code, statusCode);
  }

  /**
   * Determine if error is retryable based on code and status
   */
  private determineRetryable(code: string, statusCode: number): boolean {
    // Network/server errors are generally retryable
    if (statusCode >= 500) return true;
    if (statusCode === 429) return true; // Rate limit

    // Specific non-retryable error codes
    const nonRetryableCodes = [
      'INSUFFICIENT_BALANCE',
      'INVALID_PHONE_NUMBER',
      'INVALID_ACCOUNT',
      'INVALID_BANK_CODE',
      'BLOCKED_ACCOUNT',
      'INVALID_AMOUNT',
      'DUPLICATE_TRANSFER',
      'UNAUTHORIZED',
    ];

    return !nonRetryableCodes.includes(code);
  }
}

// ============================================================================
// PROVIDER MAPPING
// ============================================================================

/**
 * Map our internal mobile money provider IDs to Flutterwave bank codes
 * These codes vary by country, so we need country context
 */
export const FLUTTERWAVE_PROVIDER_MAPPING: Record<
  MobileMoneyProvider,
  Record<string, string>
> = {
  // Orange Money - different codes per country
  orange_money: {
    SN: 'FMM', // Senegal - Francophone Mobile Money
    CI: 'FMM', // Ivory Coast
    ML: 'FMM', // Mali
    CM: 'FMM', // Cameroon
    BF: 'FMM', // Burkina Faso
    default: 'FMM',
  },
  // Wave - Senegal & Ivory Coast
  wave: {
    SN: 'FMM', // Wave uses general mobile money code
    CI: 'FMM',
    default: 'FMM',
  },
  // MTN Mobile Money
  mtn_momo: {
    GH: 'MPS', // Ghana - Mobile Payment System
    UG: 'MPS', // Uganda
    CM: 'MPS', // Cameroon
    CI: 'MPS', // Ivory Coast
    RW: 'MPS', // Rwanda
    BJ: 'MPS', // Benin
    default: 'MPS',
  },
  // M-Pesa (Safaricom/Vodacom)
  mpesa: {
    KE: 'MPS', // Kenya
    TZ: 'MPS', // Tanzania
    default: 'MPS',
  },
  // Airtel Money
  airtel_money: {
    KE: 'MPS', // Kenya
    UG: 'MPS', // Uganda
    TZ: 'MPS', // Tanzania
    RW: 'MPS', // Rwanda
    default: 'MPS',
  },
  // Moov Money (Benin, Togo, Ivory Coast)
  moov_money: {
    BJ: 'FMM', // Benin
    TG: 'FMM', // Togo
    CI: 'FMM', // Ivory Coast
    default: 'FMM',
  },
  // Free Money (Senegal)
  free_money: {
    SN: 'FMM',
    default: 'FMM',
  },
  // T-Money (Togo)
  t_money: {
    TG: 'FMM',
    default: 'FMM',
  },
  // Flooz (Togo, Benin)
  flooz: {
    TG: 'FMM',
    BJ: 'FMM',
    default: 'FMM',
  },
};

/**
 * Get Flutterwave bank code for a mobile money provider in a specific country
 */
export function getFlutterwaveBankCode(
  provider: MobileMoneyProvider,
  countryCode: string
): string {
  const providerMap = FLUTTERWAVE_PROVIDER_MAPPING[provider];
  if (!providerMap) {
    return 'FMM'; // Default to Francophone Mobile Money
  }
  return providerMap[countryCode.toUpperCase()] || providerMap.default || 'FMM';
}

/**
 * Mobile money network codes per provider and country
 * Used for specifying the exact network in transfer requests
 */
export const FLUTTERWAVE_NETWORK_CODES: Record<
  MobileMoneyProvider,
  Record<string, string>
> = {
  orange_money: {
    SN: 'orange', // Senegal
    CI: 'orange', // Ivory Coast
    ML: 'orange', // Mali
    CM: 'orange', // Cameroon
    default: 'orange',
  },
  wave: {
    SN: 'wave',
    CI: 'wave',
    default: 'wave',
  },
  mtn_momo: {
    GH: 'mtn',
    UG: 'mtn',
    CM: 'mtn',
    RW: 'mtn',
    BJ: 'mtn',
    CI: 'mtn',
    default: 'mtn',
  },
  mpesa: {
    KE: 'mpesa',
    TZ: 'vodacom', // Vodacom M-Pesa in Tanzania
    default: 'mpesa',
  },
  airtel_money: {
    KE: 'airtel',
    UG: 'airtel',
    TZ: 'airtel',
    RW: 'airtel',
    default: 'airtel',
  },
  moov_money: {
    BJ: 'moov',
    TG: 'moov',
    CI: 'moov',
    default: 'moov',
  },
  free_money: {
    SN: 'free',
    default: 'free',
  },
  t_money: {
    TG: 'tmoney',
    default: 'tmoney',
  },
  flooz: {
    TG: 'flooz',
    BJ: 'flooz',
    default: 'flooz',
  },
};

/**
 * Get network code for mobile money transfer
 */
export function getFlutterwaveNetworkCode(
  provider: MobileMoneyProvider,
  countryCode: string
): string {
  const networkMap = FLUTTERWAVE_NETWORK_CODES[provider];
  if (!networkMap) {
    return 'mobilemoney';
  }
  return (
    networkMap[countryCode.toUpperCase()] || networkMap.default || 'mobilemoney'
  );
}

// ============================================================================
// FLUTTERWAVE PROVIDER CLASS
// ============================================================================

/**
 * Flutterwave Provider for Mobile Money transfers in Africa
 *
 * Usage:
 * ```typescript
 * const provider = new FlutterwaveProvider({
 *   secretKey: getFlutterwaveSecretKey(),
 *   publicKey: getFlutterwavePublicKey(),
 *   environment: getFlutterwaveMode(),
 *   webhookSecret: getFlutterwaveWebhookSecret(),
 * });
 *
 * const result = await provider.processPayment({
 *   withdrawalId: 'wd_123',
 *   amount: 10000, // 100.00 XOF
 *   currency: 'XOF',
 *   recipient: mobileMoneyDetails,
 *   reference: 'ref_123',
 *   narration: 'Chatter earnings payout',
 * });
 * ```
 */
export class FlutterwaveProvider {
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly environment: 'sandbox' | 'production';
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(config: FlutterwaveConfig) {
    this.secretKey = config.secretKey;
    // Public key stored for potential future use (e.g., frontend initialization)
    this.publicKey = config.publicKey;
    this.environment = config.environment;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = getFlutterwaveBaseUrl();

    if (!this.secretKey) {
      throw new FlutterwaveError(
        'Flutterwave secret key is required',
        'MISSING_SECRET_KEY',
        400
      );
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Make authenticated API request to Flutterwave
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey && method === 'POST') {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    console.log(`[FlutterwaveProvider] ${method} ${endpoint}`, {
      environment: this.environment,
      hasBody: !!body,
    });

    try {
      const response = await fetch(url, fetchOptions);
      const responseData = await response.json();

      if (!response.ok) {
        const errorData = responseData as FlutterwaveApiError;
        const errorCode =
          errorData.data?.code || `HTTP_${response.status}`;
        const errorMessage =
          errorData.message || errorData.data?.message || 'Unknown error';

        console.error(`[FlutterwaveProvider] API error:`, {
          status: response.status,
          code: errorCode,
          message: errorMessage,
        });

        throw new FlutterwaveError(
          errorMessage,
          errorCode,
          response.status,
          responseData as Record<string, unknown>
        );
      }

      const successData = responseData as FlutterwaveApiResponse<T>;

      if (successData.status === 'error') {
        throw new FlutterwaveError(
          successData.message || 'API returned error status',
          'API_ERROR',
          400,
          responseData as Record<string, unknown>
        );
      }

      return successData.data;
    } catch (error) {
      if (error instanceof FlutterwaveError) {
        throw error;
      }

      // Network or parsing error
      console.error(`[FlutterwaveProvider] Request failed:`, error);
      throw new FlutterwaveError(
        error instanceof Error ? error.message : 'Request failed',
        'NETWORK_ERROR',
        500
      );
    }
  }

  /**
   * Format phone number for Flutterwave (without country code prefix for some countries)
   */
  private formatPhoneNumber(phone: string, _countryCode: string): string {
    // Remove all non-digit characters except leading +
    let formatted = phone.replace(/[^\d+]/g, '');

    // Flutterwave expects the phone number with country code
    // For example: +221771234567 for Senegal
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------

  /**
   * Create a mobile money transfer
   *
   * @param params Transfer parameters
   * @returns FlutterwaveTransfer object
   */
  async createTransfer(params: {
    amount: number;
    currency: string;
    beneficiaryName: string;
    beneficiaryPhone: string;
    beneficiaryCountry: string;
    mobileMoneyProvider: MobileMoneyProvider;
    reference: string;
    narration: string;
    externalId: string;
  }): Promise<FlutterwaveTransfer> {
    const bankCode = getFlutterwaveBankCode(
      params.mobileMoneyProvider,
      params.beneficiaryCountry
    );
    const networkCode = getFlutterwaveNetworkCode(
      params.mobileMoneyProvider,
      params.beneficiaryCountry
    );

    const formattedPhone = this.formatPhoneNumber(
      params.beneficiaryPhone,
      params.beneficiaryCountry
    );

    const requestBody = {
      account_bank: bankCode,
      account_number: formattedPhone,
      amount: params.amount,
      narration: params.narration,
      currency: params.currency,
      reference: params.reference,
      beneficiary_name: params.beneficiaryName,
      // Mobile money specific fields
      meta: [
        {
          MobileMoneyNetwork: networkCode,
          sender: 'SOS Expat',
          sender_country: 'FR', // Our company country
          mobile_number: formattedPhone,
        },
      ],
      // Additional tracking
      callback_url: this.getCallbackUrl(),
      debit_currency: 'USD', // We always debit in USD and Flutterwave converts
    };

    console.log(`[FlutterwaveProvider] Creating transfer:`, {
      reference: params.reference,
      externalId: params.externalId,
      amount: params.amount,
      currency: params.currency,
      provider: params.mobileMoneyProvider,
      country: params.beneficiaryCountry,
      bankCode,
      networkCode,
    });

    const transfer = await this.request<FlutterwaveTransfer>(
      'POST',
      '/transfers',
      requestBody,
      params.externalId // idempotency key = withdrawalId
    );

    console.log(`[FlutterwaveProvider] Transfer created:`, {
      id: transfer.id,
      status: transfer.status,
      reference: transfer.reference,
    });

    return transfer;
  }

  /**
   * Get transfer status by ID
   *
   * @param transferId Flutterwave transfer ID
   * @returns FlutterwaveTransferStatus
   */
  async getTransferStatus(transferId: string): Promise<FlutterwaveTransferStatus> {
    console.log(`[FlutterwaveProvider] Getting transfer status: ${transferId}`);

    const status = await this.request<FlutterwaveTransferStatus>(
      'GET',
      `/transfers/${transferId}`
    );

    console.log(`[FlutterwaveProvider] Transfer status:`, {
      id: status.id,
      status: status.status,
      completeMessage: status.completeMessage,
    });

    return status;
  }

  /**
   * Retry a failed transfer
   *
   * @param transferId Flutterwave transfer ID
   * @returns FlutterwaveTransfer
   */
  async retryTransfer(transferId: string, idempotencyKey?: string): Promise<FlutterwaveTransfer> {
    console.log(`[FlutterwaveProvider] Retrying transfer: ${transferId}`);

    const transfer = await this.request<FlutterwaveTransfer>(
      'POST',
      `/transfers/${transferId}/retries`,
      undefined,
      idempotencyKey || `retry-${transferId}-${Date.now()}`
    );

    console.log(`[FlutterwaveProvider] Transfer retry initiated:`, {
      id: transfer.id,
      status: transfer.status,
    });

    return transfer;
  }

  /**
   * Get account balance for a specific currency
   *
   * @param currency Currency code (e.g., 'USD', 'NGN', 'XOF')
   * @returns FlutterwaveBalance
   */
  async getBalance(currency: string): Promise<FlutterwaveBalance> {
    console.log(`[FlutterwaveProvider] Getting balance for: ${currency}`);

    // Flutterwave returns all balances, we filter for the requested currency
    const balances = await this.request<FlutterwaveBalance[]>(
      'GET',
      '/balances'
    );

    const balance = balances.find(
      (b) => b.currency.toUpperCase() === currency.toUpperCase()
    );

    if (!balance) {
      throw new FlutterwaveError(
        `No balance found for currency: ${currency}`,
        'BALANCE_NOT_FOUND',
        404
      );
    }

    console.log(`[FlutterwaveProvider] Balance for ${currency}:`, {
      available: balance.availableBalance,
      ledger: balance.ledgerBalance,
    });

    return balance;
  }

  /**
   * Get transfer fees for a specific transfer
   *
   * @param params Fee calculation parameters
   * @returns FlutterwaveFees
   */
  async getTransferFees(params: {
    amount: number;
    currency: string;
    type: 'mobilemoney';
  }): Promise<FlutterwaveFees> {
    console.log(`[FlutterwaveProvider] Getting transfer fees:`, params);

    const fees = await this.request<FlutterwaveFees>(
      'GET',
      `/transfers/fee?amount=${params.amount}&currency=${params.currency}&type=${params.type}`
    );

    console.log(`[FlutterwaveProvider] Transfer fees:`, {
      currency: fees.currency,
      fee: fees.fee,
      feeType: fees.feeType,
    });

    return fees;
  }

  /**
   * Process a complete payment flow
   *
   * This method handles the full payment lifecycle:
   * 1. Validates the recipient details
   * 2. Creates the transfer
   * 3. Returns standardized result
   *
   * @param params Payment parameters
   * @returns ProviderTransactionResult
   */
  async processPayment(params: {
    withdrawalId: string;
    amount: number;
    currency: string;
    recipient: MobileMoneyDetails;
    reference: string;
    narration: string;
  }): Promise<ProviderTransactionResult> {
    console.log(`[FlutterwaveProvider] Processing payment:`, {
      withdrawalId: params.withdrawalId,
      amount: params.amount,
      currency: params.currency,
      provider: params.recipient.provider,
      country: params.recipient.country,
    });

    try {
      // Step 1: Get fees for the transfer
      let fees: FlutterwaveFees | undefined;
      try {
        fees = await this.getTransferFees({
          amount: params.amount,
          currency: params.currency,
          type: 'mobilemoney',
        });
      } catch (feeError) {
        console.warn(
          `[FlutterwaveProvider] Could not get fees, proceeding without:`,
          feeError
        );
      }

      // Step 1b: Check balance before transfer (debit in USD)
      try {
        const balance = await this.getBalance('USD');
        const totalNeeded = params.amount + (fees ? fees.fee : 0);
        if (balance.availableBalance < totalNeeded) {
          console.error(`[FlutterwaveProvider] Insufficient balance`, {
            available: balance.availableBalance,
            needed: totalNeeded,
            withdrawalId: params.withdrawalId,
          });
          return {
            success: false,
            status: 'failed',
            message: `Insufficient Flutterwave balance: $${balance.availableBalance.toFixed(2)} available, $${totalNeeded.toFixed(2)} needed`,
          };
        }
      } catch (balanceError) {
        console.warn(
          `[FlutterwaveProvider] Could not check balance, proceeding:`,
          balanceError
        );
      }

      // Step 2: Create the transfer
      const transfer = await this.createTransfer({
        amount: params.amount,
        currency: params.currency,
        beneficiaryName: params.recipient.accountName,
        beneficiaryPhone: params.recipient.phoneNumber,
        beneficiaryCountry: params.recipient.country,
        mobileMoneyProvider: params.recipient.provider,
        reference: params.reference,
        narration: params.narration,
        externalId: params.withdrawalId,
      });

      // Step 3: Build result
      const result: ProviderTransactionResult = {
        success: transfer.status !== 'FAILED',
        transactionId: String(transfer.id),
        status: this.mapFlutterwaveStatus(transfer.status),
        message: transfer.completeMessage || `Transfer ${transfer.status.toLowerCase()}`,
        fees: fees ? Math.round(fees.fee * 100) : transfer.fee * 100, // Convert to cents
        rawResponse: transfer as unknown as Record<string, unknown>,
      };

      console.log(`[FlutterwaveProvider] Payment processed:`, {
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
      });

      return result;
    } catch (error) {
      console.error(`[FlutterwaveProvider] Payment failed:`, error);

      if (error instanceof FlutterwaveError) {
        return {
          success: false,
          status: 'failed',
          message: error.message,
          rawResponse: error.response,
        };
      }

      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature
   *
   * Flutterwave sends a hash in the 'verif-hash' header that should
   * match the secret hash you set in your dashboard.
   *
   * @param signature The verif-hash header value
   * @param _payload The raw request body (unused for Flutterwave simple verification)
   * @returns boolean indicating if signature is valid
   */
  verifyWebhook(signature: string, _payload: string): boolean {
    if (!this.webhookSecret) {
      console.error('[FlutterwaveProvider] Webhook secret not configured');
      return false;
    }

    // Flutterwave uses a simple secret hash comparison
    // The verif-hash header should match your webhook secret
    const isValid = signature === this.webhookSecret;

    console.log(`[FlutterwaveProvider] Webhook verification:`, {
      isValid,
      signatureLength: signature?.length || 0,
    });

    return isValid;
  }

  /**
   * Verify webhook with HMAC signature (alternative method)
   *
   * Some Flutterwave webhook implementations use HMAC-SHA256
   *
   * @param signature The signature header value
   * @param payload The raw request body
   * @returns boolean indicating if signature is valid
   */
  verifyWebhookHmac(signature: string, payload: string): boolean {
    if (!this.webhookSecret) {
      console.error('[FlutterwaveProvider] Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    console.log(`[FlutterwaveProvider] HMAC webhook verification:`, {
      isValid,
    });

    return isValid;
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Map Flutterwave status to our internal status string
   */
  private mapFlutterwaveStatus(status: FlutterwaveTransferStatusValue): string {
    const statusMap: Record<FlutterwaveTransferStatusValue, string> = {
      NEW: 'pending',
      PENDING: 'processing',
      SUCCESSFUL: 'completed',
      FAILED: 'failed',
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * Get callback URL for transfer notifications
   */
  private getCallbackUrl(): string {
    // P0 FIX: Correct project ID (sos-urgently-ac307) and region (europe-west1)
    const baseUrl = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net';
    return `${baseUrl}/flutterwaveWebhook`;
  }

  /**
   * Get the current environment
   */
  getEnvironment(): 'sandbox' | 'production' {
    return this.environment;
  }

  /**
   * Check if provider is configured for production
   */
  isProduction(): boolean {
    return this.environment === 'production';
  }

  /**
   * Get the public key (useful for frontend initialization)
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a FlutterwaveProvider instance with secrets from Firebase
 *
 * Usage:
 * ```typescript
 * const provider = createFlutterwaveProvider();
 * const result = await provider.processPayment({ ... });
 * ```
 */
export function createFlutterwaveProvider(): FlutterwaveProvider {
  return new FlutterwaveProvider({
    secretKey: getFlutterwaveSecretKey(),
    publicKey: getFlutterwavePublicKey(),
    environment: getFlutterwaveMode(),
    webhookSecret: getFlutterwaveWebhookSecret(),
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate a phone number format for mobile money
 *
 * @param phoneNumber Phone number to validate
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Object with isValid and formatted number
 */
export function validateMobileMoneyPhone(
  phoneNumber: string,
  countryCode: string
): { isValid: boolean; formatted: string; error?: string } {
  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Country code prefixes
  const countryPrefixes: Record<string, string> = {
    SN: '+221', // Senegal
    CI: '+225', // Ivory Coast
    ML: '+223', // Mali
    CM: '+237', // Cameroon
    GH: '+233', // Ghana
    KE: '+254', // Kenya
    UG: '+256', // Uganda
    TZ: '+255', // Tanzania
    RW: '+250', // Rwanda
    BJ: '+229', // Benin
    TG: '+228', // Togo
    BF: '+226', // Burkina Faso
  };

  const expectedPrefix = countryPrefixes[countryCode.toUpperCase()];
  if (!expectedPrefix) {
    return {
      isValid: false,
      formatted: cleaned,
      error: `Unknown country code: ${countryCode}`,
    };
  }

  let formatted = cleaned;

  // Add country prefix if missing
  if (!formatted.startsWith('+')) {
    if (formatted.startsWith('0')) {
      // Replace leading 0 with country code
      formatted = expectedPrefix + formatted.substring(1);
    } else {
      formatted = expectedPrefix + formatted;
    }
  }

  // Validate it starts with the expected prefix
  if (!formatted.startsWith(expectedPrefix)) {
    return {
      isValid: false,
      formatted,
      error: `Phone number must start with ${expectedPrefix} for ${countryCode}`,
    };
  }

  // Check length (most African numbers are 8-9 digits after country code)
  const localNumber = formatted.substring(expectedPrefix.length);
  if (localNumber.length < 7 || localNumber.length > 10) {
    return {
      isValid: false,
      formatted,
      error: `Invalid phone number length for ${countryCode}`,
    };
  }

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Get supported currencies for mobile money transfers
 */
export function getSupportedMobileMonneyCurrencies(): string[] {
  return [
    'XOF', // West African CFA franc (Senegal, Ivory Coast, Mali, Benin, Togo, Burkina Faso)
    'XAF', // Central African CFA franc (Cameroon)
    'GHS', // Ghanaian cedi
    'KES', // Kenyan shilling
    'UGX', // Ugandan shilling
    'TZS', // Tanzanian shilling
    'RWF', // Rwandan franc
    'NGN', // Nigerian naira
  ];
}

/**
 * Check if a currency is supported for mobile money
 */
export function isSupportedMobileMonneyCurrency(currency: string): boolean {
  return getSupportedMobileMonneyCurrencies().includes(currency.toUpperCase());
}

/**
 * Get supported countries for a mobile money provider
 */
export function getSupportedCountriesForProvider(
  provider: MobileMoneyProvider
): string[] {
  const countryMap: Record<MobileMoneyProvider, string[]> = {
    orange_money: ['SN', 'CI', 'ML', 'CM', 'BF'],
    wave: ['SN', 'CI'],
    mtn_momo: ['GH', 'UG', 'CM', 'CI', 'RW', 'BJ'],
    mpesa: ['KE', 'TZ'],
    airtel_money: ['KE', 'UG', 'TZ', 'RW'],
    moov_money: ['BJ', 'TG', 'CI'],
    free_money: ['SN'],
    t_money: ['TG'],
    flooz: ['TG', 'BJ'],
  };

  return countryMap[provider] || [];
}
