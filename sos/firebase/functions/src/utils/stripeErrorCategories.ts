/**
 * P2 FIX: Stripe Error Categorization Utility
 *
 * Provides structured error handling for Stripe API errors with:
 * - Error categorization (card, authentication, rate limit, etc.)
 * - User-friendly messages in multiple languages
 * - Retry recommendations
 * - Logging helpers
 *
 * @see https://stripe.com/docs/error-codes
 */

import Stripe from 'stripe';

// ============================================================================
// ERROR CATEGORIES
// ============================================================================

export type StripeErrorCategory =
  | 'card_error'           // Card was declined
  | 'authentication_error' // 3D Secure / SCA required
  | 'rate_limit_error'     // Too many requests
  | 'validation_error'     // Invalid parameters
  | 'api_error'            // Stripe API issue
  | 'idempotency_error'    // Duplicate request
  | 'invalid_request'      // Malformed request
  | 'connection_error'     // Network issue
  | 'unknown_error';       // Catch-all

export type StripeErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CategorizedStripeError {
  category: StripeErrorCategory;
  severity: StripeErrorSeverity;
  code: string;
  message: string;
  /** Clé i18n pour traduction frontend (9 langues supportées) */
  i18nKey: string;
  /** @deprecated Utiliser i18nKey pour traduction multi-langues */
  userMessage: {
    fr: string;
    en: string;
  };
  retryable: boolean;
  retryAfterMs?: number;
  requiresUserAction: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  originalError?: Stripe.StripeRawError;
}

// ============================================================================
// ERROR CODE MAPPINGS
// ============================================================================

/**
 * Stripe error codes mapped to i18n keys (9 languages supported)
 * Frontend uses these keys to display translated messages
 * @see https://stripe.com/docs/declines/codes
 */
const STRIPE_ERROR_I18N_KEYS: Record<string, string> = {
  // Card issues
  'card_declined': 'checkout.err.stripe.card_declined',
  'insufficient_funds': 'checkout.err.stripe.insufficient_funds',
  'lost_card': 'checkout.err.stripe.lost_card',
  'stolen_card': 'checkout.err.stripe.stolen_card',
  'expired_card': 'checkout.err.stripe.expired_card',
  'incorrect_cvc': 'checkout.err.stripe.incorrect_cvc',
  'incorrect_number': 'checkout.err.stripe.incorrect_number',
  'incorrect_zip': 'checkout.err.stripe.incorrect_zip',
  'invalid_expiry_month': 'checkout.err.stripe.invalid_expiry_month',
  'invalid_expiry_year': 'checkout.err.stripe.invalid_expiry_year',
  'processing_error': 'checkout.err.stripe.processing_error',
  'do_not_honor': 'checkout.err.stripe.do_not_honor',
  'transaction_not_allowed': 'checkout.err.stripe.transaction_not_allowed',
  'generic_decline': 'checkout.err.stripe.generic_decline',
  'fraudulent': 'checkout.err.stripe.fraudulent',
  'try_again_later': 'checkout.err.stripe.try_again_later',
  // Authentication
  'authentication_required': 'checkout.err.stripe.authentication_required',
  // Limits
  'card_velocity_exceeded': 'checkout.err.stripe.card_velocity_exceeded',
  'withdrawal_count_limit_exceeded': 'checkout.err.stripe.withdrawal_count_limit_exceeded',
  // Category-based keys
  '3ds_required': 'checkout.err.stripe.3ds_required',
  'rate_limit': 'checkout.err.stripe.rate_limit',
  'validation_error': 'checkout.err.stripe.validation_error',
  'api_error': 'checkout.err.stripe.api_error',
  'idempotency_error': 'checkout.err.stripe.idempotency_error',
  'network_error': 'checkout.err.stripe.network_error',
  'unknown': 'checkout.err.stripe.unknown',
};

/**
 * @deprecated Utiliser STRIPE_ERROR_I18N_KEYS pour traduction multi-langues
 * Stripe decline codes mapped to user-friendly messages (fallback FR/EN)
 * @see https://stripe.com/docs/declines/codes
 */
const DECLINE_CODE_MESSAGES: Record<string, { fr: string; en: string }> = {
  // Card issues
  'card_declined': {
    fr: 'Votre carte a été refusée. Veuillez utiliser une autre carte.',
    en: 'Your card was declined. Please use a different card.',
  },
  'insufficient_funds': {
    fr: 'Fonds insuffisants. Veuillez utiliser une autre carte.',
    en: 'Insufficient funds. Please use a different card.',
  },
  'lost_card': {
    fr: 'Cette carte a été signalée perdue. Veuillez utiliser une autre carte.',
    en: 'This card has been reported lost. Please use a different card.',
  },
  'stolen_card': {
    fr: 'Cette carte a été signalée volée. Veuillez utiliser une autre carte.',
    en: 'This card has been reported stolen. Please use a different card.',
  },
  'expired_card': {
    fr: 'Votre carte a expiré. Veuillez utiliser une autre carte.',
    en: 'Your card has expired. Please use a different card.',
  },
  'incorrect_cvc': {
    fr: 'Le code CVC est incorrect. Veuillez vérifier et réessayer.',
    en: 'The CVC code is incorrect. Please check and try again.',
  },
  'incorrect_number': {
    fr: 'Le numéro de carte est incorrect. Veuillez vérifier et réessayer.',
    en: 'The card number is incorrect. Please check and try again.',
  },
  'incorrect_zip': {
    fr: 'Le code postal est incorrect. Veuillez vérifier et réessayer.',
    en: 'The postal code is incorrect. Please check and try again.',
  },
  'invalid_expiry_month': {
    fr: 'Le mois d\'expiration est invalide.',
    en: 'The expiry month is invalid.',
  },
  'invalid_expiry_year': {
    fr: 'L\'année d\'expiration est invalide.',
    en: 'The expiry year is invalid.',
  },
  'processing_error': {
    fr: 'Erreur de traitement. Veuillez réessayer.',
    en: 'Processing error. Please try again.',
  },
  'do_not_honor': {
    fr: 'Votre banque a refusé la transaction. Contactez votre banque ou utilisez une autre carte.',
    en: 'Your bank declined the transaction. Contact your bank or use a different card.',
  },
  'transaction_not_allowed': {
    fr: 'Cette transaction n\'est pas autorisée. Contactez votre banque.',
    en: 'This transaction is not allowed. Contact your bank.',
  },
  'generic_decline': {
    fr: 'Votre carte a été refusée. Veuillez utiliser une autre carte.',
    en: 'Your card was declined. Please use a different card.',
  },
  'fraudulent': {
    fr: 'Transaction suspectée frauduleuse. Contactez votre banque.',
    en: 'Transaction suspected as fraudulent. Contact your bank.',
  },
  'try_again_later': {
    fr: 'Veuillez réessayer plus tard.',
    en: 'Please try again later.',
  },

  // Authentication
  'authentication_required': {
    fr: 'Authentification requise. Veuillez confirmer le paiement.',
    en: 'Authentication required. Please confirm the payment.',
  },

  // Limits
  'card_velocity_exceeded': {
    fr: 'Trop de transactions récentes. Veuillez réessayer plus tard.',
    en: 'Too many recent transactions. Please try again later.',
  },
  'withdrawal_count_limit_exceeded': {
    fr: 'Limite de retraits atteinte. Veuillez réessayer demain.',
    en: 'Withdrawal limit reached. Please try again tomorrow.',
  },
};

/**
 * Stripe error types mapped to categories
 */
const ERROR_TYPE_CATEGORIES: Record<string, StripeErrorCategory> = {
  'card_error': 'card_error',
  'invalid_request_error': 'invalid_request',
  'api_error': 'api_error',
  'authentication_error': 'authentication_error',
  'rate_limit_error': 'rate_limit_error',
  'idempotency_error': 'idempotency_error',
  'validation_error': 'validation_error',
};

// ============================================================================
// MAIN CATEGORIZATION FUNCTION
// ============================================================================

/**
 * Categorize a Stripe error into a structured format
 *
 * @param error - The error from Stripe API
 * @returns Categorized error with user messages and retry info
 */
export function categorizeStripeError(error: unknown): CategorizedStripeError {
  // Default error for non-Stripe errors
  const defaultError: CategorizedStripeError = {
    category: 'unknown_error',
    severity: 'high',
    code: 'unknown',
    message: 'An unexpected error occurred',
    i18nKey: STRIPE_ERROR_I18N_KEYS['unknown'],
    userMessage: {
      fr: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
      en: 'An unexpected error occurred. Please try again.',
    },
    retryable: true,
    retryAfterMs: 5000,
    requiresUserAction: false,
    logLevel: 'error',
  };

  // Check if it's a Stripe error
  if (!isStripeError(error)) {
    // Network/connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('network')) {
        return {
          ...defaultError,
          category: 'connection_error',
          code: 'network_error',
          message: error.message,
          i18nKey: STRIPE_ERROR_I18N_KEYS['network_error'],
          userMessage: {
            fr: 'Problème de connexion. Veuillez vérifier votre connexion internet et réessayer.',
            en: 'Connection problem. Please check your internet connection and try again.',
          },
          retryable: true,
          retryAfterMs: 3000,
          logLevel: 'warn',
        };
      }
      return {
        ...defaultError,
        message: error.message,
      };
    }
    return defaultError;
  }

  const stripeError = error as Stripe.errors.StripeError;
  const rawError = stripeError.raw as Stripe.StripeRawError | undefined;
  const errorType = stripeError.type || 'unknown';
  const errorCode = stripeError.code || rawError?.code || 'unknown';
  const declineCode = rawError?.decline_code;

  // Determine category
  const category: StripeErrorCategory =
    ERROR_TYPE_CATEGORIES[errorType] || 'unknown_error';

  // Get i18n key (prioritize decline code, then error code, then default)
  let i18nKey = STRIPE_ERROR_I18N_KEYS[declineCode || ''] ||
                STRIPE_ERROR_I18N_KEYS[errorCode] ||
                STRIPE_ERROR_I18N_KEYS['unknown'];

  // Get user message (fallback for backwards compatibility)
  let userMessage = DECLINE_CODE_MESSAGES[declineCode || ''] ||
                    DECLINE_CODE_MESSAGES[errorCode] ||
                    defaultError.userMessage;

  // Determine severity and retry info based on category
  let severity: StripeErrorSeverity = 'medium';
  let retryable = true;
  let retryAfterMs: number | undefined = 5000;
  let requiresUserAction = false;
  let logLevel: 'debug' | 'info' | 'warn' | 'error' = 'warn';

  switch (category) {
    case 'card_error':
      severity = 'low'; // Expected in normal operation
      retryable = false; // User needs to change card
      requiresUserAction = true;
      logLevel = 'info';
      break;

    case 'authentication_error':
      severity = 'low';
      retryable = true;
      requiresUserAction = true;
      logLevel = 'info';
      i18nKey = STRIPE_ERROR_I18N_KEYS['3ds_required'];
      userMessage = {
        fr: 'Authentification 3D Secure requise. Veuillez confirmer le paiement.',
        en: '3D Secure authentication required. Please confirm the payment.',
      };
      break;

    case 'rate_limit_error':
      severity = 'medium';
      retryable = true;
      retryAfterMs = 60000; // Wait 1 minute
      logLevel = 'warn';
      i18nKey = STRIPE_ERROR_I18N_KEYS['rate_limit'];
      userMessage = {
        fr: 'Trop de requêtes. Veuillez patienter un moment et réessayer.',
        en: 'Too many requests. Please wait a moment and try again.',
      };
      break;

    case 'validation_error':
    case 'invalid_request':
      severity = 'medium';
      retryable = false; // Bad request won't succeed on retry
      logLevel = 'error';
      i18nKey = STRIPE_ERROR_I18N_KEYS['validation_error'];
      userMessage = {
        fr: 'Données de paiement invalides. Veuillez vérifier vos informations.',
        en: 'Invalid payment data. Please check your information.',
      };
      break;

    case 'api_error':
      severity = 'high';
      retryable = true;
      retryAfterMs = 10000;
      logLevel = 'error';
      i18nKey = STRIPE_ERROR_I18N_KEYS['api_error'];
      userMessage = {
        fr: 'Erreur du service de paiement. Veuillez réessayer dans quelques instants.',
        en: 'Payment service error. Please try again in a moment.',
      };
      break;

    case 'idempotency_error':
      severity = 'low';
      retryable = false; // Duplicate request
      logLevel = 'info';
      i18nKey = STRIPE_ERROR_I18N_KEYS['idempotency_error'];
      userMessage = {
        fr: 'Cette transaction a déjà été traitée.',
        en: 'This transaction has already been processed.',
      };
      break;

    default:
      severity = 'high';
      logLevel = 'error';
  }

  return {
    category,
    severity,
    code: errorCode,
    message: stripeError.message,
    i18nKey,
    userMessage,
    retryable,
    retryAfterMs: retryable ? retryAfterMs : undefined,
    requiresUserAction,
    logLevel,
    originalError: rawError,
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if an error is a Stripe error
 */
export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string' &&
    (error as { type: string }).type.includes('error')
  );
}

/**
 * Check if error requires user authentication (3DS)
 */
export function requires3DSecure(error: unknown): boolean {
  if (!isStripeError(error)) return false;
  const code = error.code || (error.raw as Stripe.StripeRawError | undefined)?.code;
  return code === 'authentication_required' ||
         code === 'card_declined' &&
         (error.raw as Stripe.StripeRawError | undefined)?.decline_code === 'authentication_required';
}

/**
 * Check if error is due to card being declined
 */
export function isCardDeclined(error: unknown): boolean {
  if (!isStripeError(error)) return false;
  // StripeCardError type indicates card-related errors (declined, expired, etc.)
  return error.type === 'StripeCardError' || error.code === 'card_declined';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const categorized = categorizeStripeError(error);
  return categorized.retryable;
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Format error for logging (hides sensitive data)
 */
export function formatStripeErrorForLog(error: unknown): Record<string, unknown> {
  const categorized = categorizeStripeError(error);

  return {
    category: categorized.category,
    severity: categorized.severity,
    code: categorized.code,
    message: categorized.message,
    retryable: categorized.retryable,
    requiresUserAction: categorized.requiresUserAction,
    // Don't log sensitive original error details
  };
}

/**
 * Get appropriate HTTP status code for Stripe error
 */
export function getHttpStatusForStripeError(error: unknown): number {
  const categorized = categorizeStripeError(error);

  switch (categorized.category) {
    case 'card_error':
    case 'validation_error':
    case 'invalid_request':
      return 400; // Bad Request
    case 'authentication_error':
      return 401; // Unauthorized
    case 'rate_limit_error':
      return 429; // Too Many Requests
    case 'api_error':
    case 'connection_error':
      return 502; // Bad Gateway
    case 'idempotency_error':
      return 409; // Conflict
    default:
      return 500; // Internal Server Error
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  categorizeStripeError,
  isStripeError,
  requires3DSecure,
  isCardDeclined,
  isRetryableError,
  formatStripeErrorForLog,
  getHttpStatusForStripeError,
  DECLINE_CODE_MESSAGES,
};
