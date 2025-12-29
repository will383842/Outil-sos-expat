/**
 * SOS-Expat Subscription Validation for Cloud Functions
 *
 * Zod schemas and validation helpers for subscription-related Cloud Functions.
 * Validates input data before processing and returns clear error messages.
 */

import { z } from 'zod';
import * as functions from 'firebase-functions/v1';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const SUBSCRIPTION_STATUS = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
  'paused',
  'suspended'
] as const;

export const SUBSCRIPTION_TIER = [
  'trial',
  'basic',
  'standard',
  'pro',
  'unlimited'
] as const;

export const BILLING_PERIOD = ['monthly', 'yearly'] as const;

export const PROVIDER_TYPE = ['lawyer', 'expat_aidant'] as const;

export const CURRENCY = ['EUR', 'USD', 'eur', 'usd'] as const;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/** Firebase UID validation */
const firebaseUidSchema = z.string()
  .min(1, 'ID is required')
  .max(128, 'ID is too long');

/** Billing period */
const billingPeriodSchema = z.enum(BILLING_PERIOD);

/** Currency (case-insensitive) */
const currencySchema = z.enum(CURRENCY).transform(val => val.toUpperCase() as 'EUR' | 'USD');

// ============================================================================
// CHECKOUT SCHEMAS
// ============================================================================

/**
 * Schema for creating a checkout session
 */
export const createCheckoutSchema = z.object({
  /** ID of the subscription plan */
  planId: z.string().min(1, 'Plan ID is required'),

  /** Billing period (monthly or yearly) */
  billingPeriod: billingPeriodSchema,

  /** Success URL after checkout (optional) */
  successUrl: z.string().url('Invalid success URL').optional(),

  /** Cancel URL (optional) */
  cancelUrl: z.string().url('Invalid cancel URL').optional(),

  /** Promo code to apply (optional) */
  promoCode: z.string().max(50, 'Promo code is too long').optional(),

  /** Preferred currency (optional, defaults to EUR) */
  currency: currencySchema.optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

// ============================================================================
// CANCELLATION SCHEMAS
// ============================================================================

/**
 * Schema for canceling a subscription
 */
export const cancelSubscriptionSchema = z.object({
  /** Reason for cancellation (optional, max 500 chars) */
  reason: z.string()
    .max(500, 'Reason must be at most 500 characters')
    .optional(),

  /** Additional feedback (optional) */
  feedback: z.string().max(1000, 'Feedback is too long').optional(),

  /** Cancel immediately vs at period end */
  immediate: z.boolean().default(false),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Schema for admin forcing AI access
 */
export const adminForceAccessSchema = z.object({
  /** Provider ID to grant/revoke access */
  providerId: firebaseUidSchema,

  /** Enable or disable forced access */
  enabled: z.boolean(),

  /** Duration in days (1-365, optional for unlimited) */
  durationDays: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days')
    .optional(),

  /** Admin note explaining the action */
  note: z.string()
    .max(500, 'Note must be at most 500 characters')
    .optional(),
});

export type AdminForceAccessInput = z.infer<typeof adminForceAccessSchema>;

/**
 * Schema for admin changing a provider's plan
 */
export const adminChangePlanSchema = z.object({
  /** Provider ID */
  providerId: firebaseUidSchema,

  /** New plan ID */
  newPlanId: z.string().min(1, 'New plan ID is required'),

  /** Apply immediately or at end of period */
  immediate: z.boolean(),

  /** Reason for the change (for audit) */
  reason: z.string().max(500, 'Reason is too long').optional(),
});

export type AdminChangePlanInput = z.infer<typeof adminChangePlanSchema>;

/**
 * Schema for admin canceling a subscription
 */
export const adminCancelSubscriptionSchema = z.object({
  /** Provider ID */
  providerId: firebaseUidSchema,

  /** Cancel immediately or at period end */
  immediate: z.boolean().default(false),

  /** Reason for cancellation (required for audit) */
  reason: z.string()
    .min(1, 'Reason is required for admin actions')
    .max(500, 'Reason is too long'),

  /** Whether to refund prorated amount */
  refundProrata: z.boolean().default(true),
});

export type AdminCancelSubscriptionInput = z.infer<typeof adminCancelSubscriptionSchema>;

/**
 * Schema for admin resetting quota
 */
export const adminResetQuotaSchema = z.object({
  /** Provider ID */
  providerId: firebaseUidSchema,

  /** Note explaining the reset */
  note: z.string().max(500, 'Note is too long').optional(),
});

export type AdminResetQuotaInput = z.infer<typeof adminResetQuotaSchema>;

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ path: string; message: string }>;
}

/**
 * Validates input data against a Zod schema
 * Throws HttpsError if validation fails
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  customMessage?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    const errorMessage = customMessage || errors.map(e =>
      e.path ? `${e.path}: ${e.message}` : e.message
    ).join('; ');

    console.error('[Validation Error]', errors);

    throw new functions.https.HttpsError(
      'invalid-argument',
      errorMessage,
      { validationErrors: errors }
    );
  }

  return result.data;
}

/**
 * Safe validation without throwing
 * Returns result object with success flag
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    return {
      success: false,
      error: errors.map(e => e.path ? `${e.path}: ${e.message}` : e.message).join('; '),
      details: errors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Format validation errors for API response
 */
export function formatValidationError(
  errors: Array<{ path: string; message: string }>
): { code: string; message: string; details: typeof errors } {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: errors,
  };
}

// ============================================================================
// WEBHOOK VALIDATION
// ============================================================================

/**
 * Schema for Stripe subscription metadata
 */
export const stripeMetadataSchema = z.object({
  providerId: z.string().min(1, 'providerId is required in metadata'),
  planId: z.string().optional(),
  billingPeriod: billingPeriodSchema.optional(),
});

/**
 * Validate and extract metadata from Stripe subscription
 */
export function validateStripeMetadata(
  metadata: Record<string, string> | null | undefined
): { providerId: string; planId?: string; billingPeriod?: 'monthly' | 'yearly' } | null {
  if (!metadata) return null;

  const result = stripeMetadataSchema.safeParse(metadata);
  if (!result.success) {
    console.warn('[validateStripeMetadata] Invalid metadata:', result.error.errors);
    return null;
  }

  return result.data;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  z,
  firebaseUidSchema,
  billingPeriodSchema,
  currencySchema,
};
