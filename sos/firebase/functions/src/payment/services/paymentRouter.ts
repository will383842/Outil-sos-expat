/**
 * Payment Router Service
 *
 * Intelligent routing of payments to the correct provider (Wise or Flutterwave)
 * based on recipient country, payment method type, and provider availability.
 *
 * Provider Selection Logic:
 * - Flutterwave: Mobile Money in Africa (FCFA zone + other African countries)
 * - Wise: Bank transfers worldwide (Europe, Americas, Asia, Middle East, Oceania)
 *
 * @module payment/services/paymentRouter
 */

import { logger } from 'firebase-functions/v2';
import {
  PaymentProvider,
  PaymentMethodType,
  BankTransferDetails,
  MobileMoneyDetails,
  ProviderTransactionResult,
} from '../types';
import { WiseProvider } from '../providers/wiseProvider';
import { FlutterwaveProvider, createFlutterwaveProvider } from '../providers/flutterwaveProvider';
import {
  getProviderForCountry,
  isCountrySupported,
  getAvailableMethodsForCountry,
  getCountryConfig,
  getAllSupportedCountries,
  getMethodTypeForCountry,
  isCountrySanctioned,
  getCurrencyForCountry,
} from '../config/countriesConfig';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for the Payment Router
 */
export interface PaymentRouterConfig {
  /** Whether Wise (bank transfers) is enabled */
  wiseEnabled: boolean;
  /** Whether Flutterwave (mobile money) is enabled */
  flutterwaveEnabled: boolean;
}

/**
 * Result of determining which provider to use
 */
interface ProviderDeterminationResult {
  /** The determined provider */
  provider: PaymentProvider;
  /** Whether the payment is supported */
  supported: boolean;
  /** Reason if not supported */
  reason?: string;
}

/**
 * Result of payment details validation
 */
interface ValidationResult {
  /** Whether the details are valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Result of getting transaction status
 */
interface TransactionStatusResult {
  /** Current status string */
  status: string;
  /** Additional details from provider */
  details: Record<string, unknown>;
}

/**
 * Result of getting provider balance
 */
interface ProviderBalanceResult {
  /** Available balance */
  available: number;
  /** Currency code */
  currency: string;
}

/**
 * Provider info for a specific country
 */
interface CountryProviderInfo {
  /** Primary provider for this country */
  provider: PaymentProvider | null;
  /** Primary payment method type */
  methodType: PaymentMethodType | null;
  /** Available mobile money methods (if applicable) */
  availableMethods: string[];
  /** Whether the country is supported */
  supported: boolean;
}

/**
 * Parameters for processing a payment
 */
interface ProcessPaymentParams {
  /** Internal withdrawal ID for tracking */
  withdrawalId: string;
  /** Amount in cents (smallest currency unit) */
  amount: number;
  /** Source currency (usually 'USD') */
  sourceCurrency: string;
  /** Target currency for recipient */
  targetCurrency: string;
  /** ISO 3166-1 alpha-2 country code of recipient */
  countryCode: string;
  /** Type of payment method */
  methodType: PaymentMethodType;
  /** Payment method details (bank or mobile money) */
  details: BankTransferDetails | MobileMoneyDetails;
  /** Reference note for the payment */
  reference: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_ROUTER_CONFIG: PaymentRouterConfig = {
  wiseEnabled: true,
  flutterwaveEnabled: true,
};

// ============================================================================
// PAYMENT ROUTER CLASS
// ============================================================================

/**
 * Payment Router - Routes payments to the appropriate provider
 *
 * This service acts as a facade over the Wise and Flutterwave providers,
 * intelligently routing payments based on country and payment method type.
 *
 * @example
 * ```typescript
 * const router = createPaymentRouter();
 *
 * // Determine provider for a country
 * const { provider, supported } = router.determineProvider('SN', 'mobile_money');
 *
 * // Process a payment
 * const result = await router.processPayment({
 *   withdrawalId: 'wd_123',
 *   amount: 10000,
 *   sourceCurrency: 'USD',
 *   targetCurrency: 'XOF',
 *   countryCode: 'SN',
 *   methodType: 'mobile_money',
 *   details: mobileMoneyDetails,
 *   reference: 'SOS-Expat Payout',
 * });
 * ```
 */
export class PaymentRouter {
  private wiseProvider: WiseProvider | null = null;
  private flutterwaveProvider: FlutterwaveProvider | null = null;
  private config: PaymentRouterConfig;

  /**
   * Create a new PaymentRouter instance
   *
   * @param config Router configuration
   */
  constructor(config: PaymentRouterConfig) {
    this.config = config;

    logger.info('[PaymentRouter] Initialized', {
      wiseEnabled: config.wiseEnabled,
      flutterwaveEnabled: config.flutterwaveEnabled,
    });
  }

  // ==========================================================================
  // PROVIDER INITIALIZATION (Lazy Loading)
  // ==========================================================================

  /**
   * Get or initialize the Wise provider (lazy loading)
   *
   * @returns WiseProvider instance
   * @throws Error if Wise is not enabled
   */
  private getWiseProvider(): WiseProvider {
    if (!this.config.wiseEnabled) {
      throw new Error('Wise provider is not enabled');
    }

    if (!this.wiseProvider) {
      logger.info('[PaymentRouter] Initializing Wise provider');
      this.wiseProvider = WiseProvider.fromSecrets();
    }

    return this.wiseProvider;
  }

  /**
   * Get or initialize the Flutterwave provider (lazy loading)
   *
   * @returns FlutterwaveProvider instance
   * @throws Error if Flutterwave is not enabled
   */
  private getFlutterwaveProvider(): FlutterwaveProvider {
    if (!this.config.flutterwaveEnabled) {
      throw new Error('Flutterwave provider is not enabled');
    }

    if (!this.flutterwaveProvider) {
      logger.info('[PaymentRouter] Initializing Flutterwave provider');
      this.flutterwaveProvider = createFlutterwaveProvider();
    }

    return this.flutterwaveProvider;
  }

  // ==========================================================================
  // PROVIDER DETERMINATION
  // ==========================================================================

  /**
   * Determine which payment provider to use for a country and method type
   *
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @param methodType Type of payment method (bank_transfer or mobile_money)
   * @returns Provider determination result
   */
  determineProvider(
    countryCode: string,
    methodType: PaymentMethodType
  ): ProviderDeterminationResult {
    // Normalize 'wise' to 'bank_transfer' for routing purposes
    const effectiveMethodType: PaymentMethodType = methodType === 'wise' ? 'bank_transfer' : methodType;
    const upperCountryCode = countryCode.toUpperCase();

    logger.info('[PaymentRouter] Determining provider', {
      countryCode: upperCountryCode,
      methodType,
      effectiveMethodType,
    });

    // Check if country is sanctioned
    if (isCountrySanctioned(upperCountryCode)) {
      logger.warn('[PaymentRouter] Country is sanctioned', { countryCode: upperCountryCode });
      return {
        provider: 'wise', // Default, but not supported
        supported: false,
        reason: `Country ${upperCountryCode} is not supported due to sanctions or restrictions`,
      };
    }

    // Check if country is supported at all
    if (!isCountrySupported(upperCountryCode)) {
      logger.warn('[PaymentRouter] Country not supported', { countryCode: upperCountryCode });
      return {
        provider: 'wise', // Default
        supported: false,
        reason: `Country ${upperCountryCode} is not supported`,
      };
    }

    // Get the recommended provider for this country
    const recommendedProvider = getProviderForCountry(upperCountryCode);
    const countryMethodType = getMethodTypeForCountry(upperCountryCode);

    if (!recommendedProvider) {
      return {
        provider: 'wise',
        supported: false,
        reason: `No provider configured for country ${upperCountryCode}`,
      };
    }

    // Check if the requested method type matches what's available
    if (effectiveMethodType !== countryMethodType) {
      // Allow bank transfers via Wise for countries that have mobile money as primary
      if (effectiveMethodType === 'bank_transfer' && this.config.wiseEnabled) {
        // Wise can handle bank transfers in most countries
        return {
          provider: 'wise',
          supported: true,
        };
      }

      // Mobile money requested for a bank transfer country
      if (effectiveMethodType === 'mobile_money' && recommendedProvider === 'wise') {
        return {
          provider: 'wise',
          supported: false,
          reason: `Mobile money is not available in ${upperCountryCode}. Use bank transfer instead.`,
        };
      }
    }

    // Check if the determined provider is enabled
    if (recommendedProvider === 'wise' && !this.config.wiseEnabled) {
      return {
        provider: 'wise',
        supported: false,
        reason: 'Wise provider is currently disabled',
      };
    }

    if (recommendedProvider === 'flutterwave' && !this.config.flutterwaveEnabled) {
      // Try to fall back to Wise for bank transfers
      if (effectiveMethodType === 'bank_transfer' && this.config.wiseEnabled) {
        return {
          provider: 'wise',
          supported: true,
        };
      }

      return {
        provider: 'flutterwave',
        supported: false,
        reason: 'Flutterwave provider is currently disabled',
      };
    }

    logger.info('[PaymentRouter] Provider determined', {
      countryCode: upperCountryCode,
      provider: recommendedProvider,
      methodType,
    });

    return {
      provider: recommendedProvider,
      supported: true,
    };
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate payment details for a specific provider
   *
   * @param provider The payment provider
   * @param details The payment method details
   * @returns Validation result with any errors
   */
  validatePaymentDetails(
    provider: PaymentProvider,
    details: BankTransferDetails | MobileMoneyDetails
  ): ValidationResult {
    const errors: string[] = [];

    logger.info('[PaymentRouter] Validating payment details', {
      provider,
      detailsType: details.type,
    });

    if (provider === 'wise' && details.type === 'bank_transfer') {
      // Validate bank transfer details
      const bankDetails = details as BankTransferDetails;

      if (!bankDetails.accountHolderName || bankDetails.accountHolderName.trim().length < 2) {
        errors.push('Account holder name is required and must be at least 2 characters');
      }

      if (!bankDetails.country || bankDetails.country.length !== 2) {
        errors.push('Valid 2-letter country code is required');
      }

      if (!bankDetails.currency || bankDetails.currency.length !== 3) {
        errors.push('Valid 3-letter currency code is required');
      }

      // Check that at least one bank identifier is provided
      const hasIdentifier =
        bankDetails.iban ||
        bankDetails.accountNumber ||
        (bankDetails.routingNumber && bankDetails.accountNumber) ||
        (bankDetails.sortCode && bankDetails.accountNumber) ||
        (bankDetails.bsb && bankDetails.accountNumber) ||
        (bankDetails.ifsc && bankDetails.accountNumber) ||
        (bankDetails.swiftBic && bankDetails.accountNumber);

      if (!hasIdentifier) {
        errors.push(
          'Bank account identifier is required (IBAN, account number with routing/sort code/BSB/IFSC, or SWIFT/BIC)'
        );
      }

      // Validate IBAN format if provided
      if (bankDetails.iban) {
        const ibanClean = bankDetails.iban.replace(/\s/g, '').toUpperCase();
        if (ibanClean.length < 15 || ibanClean.length > 34) {
          errors.push('IBAN must be between 15 and 34 characters');
        }
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(ibanClean)) {
          errors.push('IBAN format is invalid');
        }
      }
    } else if (provider === 'flutterwave' && details.type === 'mobile_money') {
      // Validate mobile money details
      const mobileDetails = details as MobileMoneyDetails;

      if (!mobileDetails.provider) {
        errors.push('Mobile money provider is required');
      }

      if (!mobileDetails.phoneNumber || mobileDetails.phoneNumber.trim().length < 8) {
        errors.push('Valid phone number is required');
      }

      // Validate phone number format
      const cleanPhone = mobileDetails.phoneNumber.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('00')) {
        errors.push('Phone number should include country code (e.g., +221)');
      }

      if (!mobileDetails.country || mobileDetails.country.length !== 2) {
        errors.push('Valid 2-letter country code is required');
      }

      if (!mobileDetails.accountName || mobileDetails.accountName.trim().length < 2) {
        errors.push('Account name is required and must be at least 2 characters');
      }

      if (!mobileDetails.currency || mobileDetails.currency.length !== 3) {
        errors.push('Valid 3-letter currency code is required');
      }

      // Check if the mobile money provider is available in the country
      if (mobileDetails.country && mobileDetails.provider) {
        const availableMethods = getAvailableMethodsForCountry(mobileDetails.country);
        if (
          availableMethods.length > 0 &&
          !availableMethods.includes(mobileDetails.provider)
        ) {
          errors.push(
            `${mobileDetails.provider} is not available in ${mobileDetails.country}. Available options: ${availableMethods.join(', ')}`
          );
        }
      }
    } else {
      // Type mismatch
      if (provider === 'wise' && details.type !== 'bank_transfer') {
        errors.push('Wise requires bank transfer details, but other details type was provided');
      }
      if (provider === 'flutterwave' && details.type !== 'mobile_money') {
        errors.push('Flutterwave requires mobile money details, but other details type was provided');
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    if (!result.valid) {
      logger.warn('[PaymentRouter] Validation failed', {
        provider,
        errors,
      });
    }

    return result;
  }

  // ==========================================================================
  // PAYMENT PROCESSING
  // ==========================================================================

  /**
   * Route and process a payment through the appropriate provider
   *
   * This method:
   * 1. Determines the correct provider
   * 2. Validates the payment details
   * 3. Routes to the appropriate provider
   * 4. Returns standardized result
   *
   * @param params Payment parameters
   * @returns Provider transaction result
   */
  async processPayment(params: ProcessPaymentParams): Promise<ProviderTransactionResult> {
    const {
      withdrawalId,
      amount,
      sourceCurrency,
      targetCurrency,
      countryCode,
      methodType,
      details,
      reference,
    } = params;

    logger.info('[PaymentRouter] Processing payment', {
      withdrawalId,
      amount,
      sourceCurrency,
      targetCurrency,
      countryCode,
      methodType,
    });

    try {
      // Step 1: Determine provider (normalize 'wise' → 'bank_transfer' for routing)
      const effectiveMethodType: PaymentMethodType = methodType === 'wise' ? 'bank_transfer' : methodType;
      const determination = this.determineProvider(countryCode, effectiveMethodType);

      if (!determination.supported) {
        logger.error('[PaymentRouter] Payment not supported', {
          withdrawalId,
          reason: determination.reason,
        });

        return {
          success: false,
          status: 'failed',
          message: determination.reason || 'Payment method not supported for this country',
        };
      }

      const provider = determination.provider;

      // Step 2: Validate payment details
      const validation = this.validatePaymentDetails(provider, details);

      if (!validation.valid) {
        logger.error('[PaymentRouter] Payment validation failed', {
          withdrawalId,
          errors: validation.errors,
        });

        return {
          success: false,
          status: 'failed',
          message: `Validation failed: ${validation.errors.join('; ')}`,
        };
      }

      // Step 3: Route to appropriate provider
      let result: ProviderTransactionResult;

      if (provider === 'wise') {
        result = await this.processWisePayment({
          withdrawalId,
          amount,
          sourceCurrency,
          targetCurrency,
          details: details as BankTransferDetails,
          reference,
        });
      } else {
        result = await this.processFlutterwavePayment({
          withdrawalId,
          amount,
          currency: targetCurrency,
          details: details as MobileMoneyDetails,
          reference,
        });
      }

      logger.info('[PaymentRouter] Payment processed', {
        withdrawalId,
        provider,
        success: result.success,
        transactionId: result.transactionId,
        status: result.status,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('[PaymentRouter] Payment processing failed', {
        withdrawalId,
        error: errorMessage,
      });

      return {
        success: false,
        status: 'failed',
        message: `Payment processing failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Process payment through Wise provider
   */
  private async processWisePayment(params: {
    withdrawalId: string;
    amount: number;
    sourceCurrency: string;
    targetCurrency: string;
    details: BankTransferDetails;
    reference: string;
  }): Promise<ProviderTransactionResult> {
    const wise = this.getWiseProvider();

    return wise.processPayment({
      withdrawalId: params.withdrawalId,
      amount: params.amount,
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      recipient: params.details,
      reference: params.reference,
    });
  }

  /**
   * Process payment through Flutterwave provider
   */
  private async processFlutterwavePayment(params: {
    withdrawalId: string;
    amount: number;
    currency: string;
    details: MobileMoneyDetails;
    reference: string;
  }): Promise<ProviderTransactionResult> {
    const flutterwave = this.getFlutterwaveProvider();

    // Convert amount from cents to currency units
    const amountInCurrency = params.amount / 100;

    return flutterwave.processPayment({
      withdrawalId: params.withdrawalId,
      amount: amountInCurrency,
      currency: params.currency,
      recipient: params.details,
      reference: params.reference,
      narration: `SOS-Expat Payout - ${params.withdrawalId}`,
    });
  }

  // ==========================================================================
  // STATUS & OPERATIONS
  // ==========================================================================

  /**
   * Get transaction status from the correct provider
   *
   * @param provider The payment provider
   * @param transactionId The provider's transaction ID
   * @returns Transaction status
   */
  async getTransactionStatus(
    provider: PaymentProvider,
    transactionId: string
  ): Promise<TransactionStatusResult> {
    logger.info('[PaymentRouter] Getting transaction status', {
      provider,
      transactionId,
    });

    try {
      if (provider === 'wise') {
        const wise = this.getWiseProvider();
        const status = await wise.getTransferStatus(transactionId);

        return {
          status: status.status,
          details: {
            isComplete: status.isComplete,
            isFailed: status.isFailed,
            isInProgress: status.isInProgress,
            statusMessage: status.statusMessage,
            estimatedDelivery: status.estimatedDelivery,
            issues: status.issues,
          },
        };
      } else {
        const flutterwave = this.getFlutterwaveProvider();
        const status = await flutterwave.getTransferStatus(transactionId);

        return {
          status: status.status,
          details: {
            id: status.id,
            reference: status.reference,
            amount: status.amount,
            currency: status.currency,
            completeMessage: status.completeMessage,
            bankName: status.bankName,
          },
        };
      }
    } catch (error) {
      logger.error('[PaymentRouter] Failed to get transaction status', {
        provider,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Cancel a transaction on the correct provider
   *
   * @param provider The payment provider
   * @param transactionId The provider's transaction ID
   * @returns True if successfully cancelled
   */
  async cancelTransaction(
    provider: PaymentProvider,
    transactionId: string
  ): Promise<boolean> {
    logger.info('[PaymentRouter] Cancelling transaction', {
      provider,
      transactionId,
    });

    try {
      if (provider === 'wise') {
        const wise = this.getWiseProvider();
        return await wise.cancelTransfer(transactionId);
      } else {
        // Flutterwave doesn't have a direct cancel API
        // Transfers are processed immediately or fail
        logger.warn('[PaymentRouter] Flutterwave transfers cannot be cancelled after submission');
        return false;
      }
    } catch (error) {
      logger.error('[PaymentRouter] Failed to cancel transaction', {
        provider,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Get account balance from a provider
   *
   * @param provider The payment provider
   * @param currency Currency code
   * @returns Balance information
   */
  async getProviderBalance(
    provider: PaymentProvider,
    currency: string
  ): Promise<ProviderBalanceResult> {
    logger.info('[PaymentRouter] Getting provider balance', {
      provider,
      currency,
    });

    try {
      if (provider === 'wise') {
        const wise = this.getWiseProvider();
        const balance = await wise.getBalance(currency);

        return {
          available: balance.amount,
          currency: balance.currency,
        };
      } else {
        const flutterwave = this.getFlutterwaveProvider();
        const balance = await flutterwave.getBalance(currency);

        return {
          available: balance.availableBalance,
          currency: balance.currency,
        };
      }
    } catch (error) {
      logger.error('[PaymentRouter] Failed to get provider balance', {
        provider,
        currency,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ==========================================================================
  // AVAILABILITY & INFO
  // ==========================================================================

  /**
   * Check if a provider is available (enabled and can be initialized)
   *
   * @param provider The payment provider to check
   * @returns True if provider is available
   */
  isProviderAvailable(provider: PaymentProvider): boolean {
    if (provider === 'wise') {
      if (!this.config.wiseEnabled) return false;

      try {
        this.getWiseProvider();
        return true;
      } catch {
        logger.warn('[PaymentRouter] Wise provider not available - initialization failed');
        return false;
      }
    } else {
      if (!this.config.flutterwaveEnabled) return false;

      try {
        this.getFlutterwaveProvider();
        return true;
      } catch {
        logger.warn('[PaymentRouter] Flutterwave provider not available - initialization failed');
        return false;
      }
    }
  }

  /**
   * Get all supported country codes
   *
   * @returns Array of supported ISO country codes
   */
  getSupportedCountries(): string[] {
    return getAllSupportedCountries().filter((countryCode) => {
      const config = getCountryConfig(countryCode);
      if (!config) return false;

      // Filter based on enabled providers
      if (config.provider === 'wise' && !this.config.wiseEnabled) {
        return false;
      }
      if (config.provider === 'flutterwave' && !this.config.flutterwaveEnabled) {
        // Allow if Wise is enabled and can handle bank transfers
        return this.config.wiseEnabled;
      }

      return true;
    });
  }

  /**
   * Get provider information for a specific country
   *
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @returns Provider info for the country
   */
  getProviderInfoForCountry(countryCode: string): CountryProviderInfo {
    const upperCode = countryCode.toUpperCase();

    if (!isCountrySupported(upperCode)) {
      return {
        provider: null,
        methodType: null,
        availableMethods: [],
        supported: false,
      };
    }

    const config = getCountryConfig(upperCode);

    if (!config) {
      return {
        provider: null,
        methodType: null,
        availableMethods: [],
        supported: false,
      };
    }

    // Check if the primary provider is enabled
    let isSupported = true;
    if (config.provider === 'wise' && !this.config.wiseEnabled) {
      isSupported = false;
    }
    if (config.provider === 'flutterwave' && !this.config.flutterwaveEnabled) {
      // May still be supported via Wise for bank transfers
      isSupported = this.config.wiseEnabled;
    }

    return {
      provider: config.provider,
      methodType: config.methodType,
      availableMethods: config.availableMethods.map((m) => m.toString()),
      supported: isSupported,
    };
  }

  /**
   * Get currency for a country
   *
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @returns Currency code or undefined if not supported
   */
  getCurrencyForCountry(countryCode: string): string | undefined {
    return getCurrencyForCountry(countryCode);
  }

  /**
   * Get current configuration
   *
   * @returns Current router configuration
   */
  getConfig(): PaymentRouterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   *
   * @param newConfig Partial configuration to update
   */
  updateConfig(newConfig: Partial<PaymentRouterConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Reset providers if their enabled state changed
    if (newConfig.wiseEnabled === false) {
      this.wiseProvider = null;
    }
    if (newConfig.flutterwaveEnabled === false) {
      this.flutterwaveProvider = null;
    }

    logger.info('[PaymentRouter] Configuration updated', this.config);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a PaymentRouter instance with optional configuration
 *
 * @param config Optional partial configuration (defaults will be applied)
 * @returns PaymentRouter instance
 *
 * @example
 * ```typescript
 * // Create with defaults (both providers enabled)
 * const router = createPaymentRouter();
 *
 * // Create with specific config
 * const router = createPaymentRouter({
 *   wiseEnabled: true,
 *   flutterwaveEnabled: false,
 * });
 * ```
 */
export function createPaymentRouter(
  config?: Partial<PaymentRouterConfig>
): PaymentRouter {
  const fullConfig: PaymentRouterConfig = {
    ...DEFAULT_ROUTER_CONFIG,
    ...config,
  };

  return new PaymentRouter(fullConfig);
}

