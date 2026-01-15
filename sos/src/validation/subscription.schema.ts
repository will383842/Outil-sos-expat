/**
 * SOS-Expat Subscription Validation Schemas
 *
 * Schemas de validation Zod pour le systeme d'abonnement IA
 * Utilises cote frontend et dans les Cloud Functions
 */

import { z } from 'zod';

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

export const CURRENCY = ['EUR', 'USD'] as const;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/** Status d'abonnement */
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUS);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

/** Tier d'abonnement */
export const subscriptionTierSchema = z.enum(SUBSCRIPTION_TIER);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

/** Periode de facturation */
export const billingPeriodSchema = z.enum(BILLING_PERIOD);
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

/** Type de prestataire */
export const providerTypeSchema = z.enum(PROVIDER_TYPE);
export type ProviderType = z.infer<typeof providerTypeSchema>;

/** Devise */
export const currencySchema = z.enum(CURRENCY);
export type Currency = z.infer<typeof currencySchema>;

// ============================================================================
// CHECKOUT SCHEMAS
// ============================================================================

// Allowed domains for redirect URLs (security)
const ALLOWED_REDIRECT_DOMAINS = [
  'sos-expat.com',
  'www.sos-expat.com',
  'ia.sos-expat.com',
  'outil-sos-expat.pages.dev',
  'localhost',
];

// PlanId format regex: provider_tier (e.g., lawyer_pro, expat_aidant_standard)
const PLAN_ID_REGEX = /^(lawyer|expat_aidant)_(trial|basic|standard|pro|unlimited)$/;

// Safe string transformer factory: trim and remove dangerous characters
// Returns a function that creates a safe string schema with optional constraints
const createSafeString = (options?: { min?: number; max?: number }) => {
  let schema = z.string();
  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }
  return schema.transform((val) => val.trim().replace(/[<>]/g, ''));
};

/**
 * Validate redirect URL is in allowed domains
 */
const safeRedirectUrlSchema = z.string().url().refine((url) => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_REDIRECT_DOMAINS.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}, 'Redirect URL domain not allowed');

/**
 * Validation pour la creation d'une session de checkout
 * Utilise lors de la souscription a un nouveau plan
 */
export const createCheckoutSchema = z.object({
  /** ID du plan d'abonnement (ex: 'lawyer_pro', 'expat_standard') */
  planId: z.string()
    .min(1, 'Plan ID is required')
    .max(50, 'Plan ID is too long')
    .regex(PLAN_ID_REGEX, 'Invalid plan ID format. Expected: provider_tier'),

  /** Periode de facturation */
  billingPeriod: billingPeriodSchema,

  /** URL de retour apres succes (optionnel, defaut: dashboard) */
  successUrl: safeRedirectUrlSchema.optional(),

  /** URL de retour apres annulation (optionnel) */
  cancelUrl: safeRedirectUrlSchema.optional(),

  /** Code promo a appliquer (optionnel) */
  promoCode: createSafeString({ max: 50 }).optional(),

  /** Devise preferee (optionnel, defaut: EUR) */
  currency: currencySchema.optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

/**
 * Validation pour le changement de plan
 */
export const changePlanSchema = z.object({
  /** ID du nouveau plan */
  newPlanId: z.string()
    .min(1, 'New plan ID is required')
    .max(50, 'Plan ID is too long')
    .regex(PLAN_ID_REGEX, 'Invalid plan ID format. Expected: provider_tier'),

  /** Periode de facturation pour le nouveau plan */
  billingPeriod: billingPeriodSchema.optional(),

  /** Si true, prorata applique immediatement. Si false, a la fin de la periode */
  immediate: z.boolean().default(true),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

// ============================================================================
// CANCELLATION SCHEMAS
// ============================================================================

/**
 * Validation pour l'annulation d'abonnement par l'utilisateur
 */
export const cancelSubscriptionSchema = z.object({
  /** Raison de l'annulation (optionnel, max 500 caracteres) */
  reason: createSafeString({ max: 500 }).optional(),

  /** Feedback supplementaire pour amelioration */
  feedback: createSafeString({ max: 1000 }).optional(),

  /** Si true, annulation immediate. Si false, a la fin de la periode (defaut) */
  immediate: z.boolean().default(false),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

/**
 * Raisons predefinies d'annulation
 */
export const CANCELLATION_REASONS = [
  'too_expensive',
  'not_using_enough',
  'found_alternative',
  'missing_features',
  'technical_issues',
  'temporary_break',
  'other'
] as const;

export const cancellationReasonSchema = z.enum(CANCELLATION_REASONS);
export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

// Firebase UID format regex (alphanumeric, 20-128 chars)
const FIREBASE_UID_REGEX = /^[a-zA-Z0-9]{20,128}$/;

/**
 * Validation pour forcer l'acces IA d'un provider (admin only)
 * Permet de bypasser les restrictions d'abonnement
 */
export const adminForceAccessSchema = z.object({
  /** ID du provider */
  providerId: z.string()
    .min(20, 'Provider ID is required')
    .max(128, 'Provider ID is too long')
    .regex(FIREBASE_UID_REGEX, 'Invalid provider ID format'),

  /** Activer ou desactiver l'acces force */
  enabled: z.boolean(),

  /** Duree en jours (1-365). Si non specifie: acces illimite */
  durationDays: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days')
    .optional(),

  /** Note interne pour expliquer pourquoi l'acces est accorde/revoque */
  note: createSafeString({ max: 500 }).optional(),
});

export type AdminForceAccessInput = z.infer<typeof adminForceAccessSchema>;

/**
 * Validation pour le changement de plan par admin
 */
export const adminChangePlanSchema = z.object({
  /** ID du provider */
  providerId: z.string()
    .min(20, 'Provider ID is required')
    .max(128, 'Provider ID is too long')
    .regex(FIREBASE_UID_REGEX, 'Invalid provider ID format'),

  /** ID du nouveau plan */
  newPlanId: z.string()
    .min(1, 'New plan ID is required')
    .max(50, 'Plan ID is too long')
    .regex(PLAN_ID_REGEX, 'Invalid plan ID format. Expected: provider_tier'),

  /** Si true, changement immediat avec prorata. Si false, a la fin de la periode */
  immediate: z.boolean(),

  /** Raison du changement (pour audit) */
  reason: createSafeString({ max: 500 }).optional(),
});

export type AdminChangePlanInput = z.infer<typeof adminChangePlanSchema>;

/**
 * Validation pour l'annulation forcee par admin
 */
export const adminCancelSubscriptionSchema = z.object({
  /** ID du provider */
  providerId: z.string()
    .min(20, 'Provider ID is required')
    .max(128, 'Provider ID is too long')
    .regex(FIREBASE_UID_REGEX, 'Invalid provider ID format'),

  /** Si true, annulation immediate. Si false, a la fin de la periode */
  immediate: z.boolean().default(false),

  /** Raison de l'annulation (obligatoire pour audit) */
  reason: createSafeString({ min: 1, max: 500 }),

  /** Rembourser le prorata si annulation immediate */
  refundProrata: z.boolean().default(true),
});

export type AdminCancelSubscriptionInput = z.infer<typeof adminCancelSubscriptionSchema>;

/**
 * Validation pour le reset de quota par admin
 */
export const adminResetQuotaSchema = z.object({
  /** ID du provider */
  providerId: z.string()
    .min(20, 'Provider ID is required')
    .max(128, 'Provider ID is too long')
    .regex(FIREBASE_UID_REGEX, 'Invalid provider ID format'),

  /** Note explicative */
  note: createSafeString({ max: 500 }).optional(),
});

export type AdminResetQuotaInput = z.infer<typeof adminResetQuotaSchema>;

// ============================================================================
// SUBSCRIPTION PLAN SCHEMAS
// ============================================================================

/**
 * Schema pour la creation/modification d'un plan d'abonnement
 */
export const subscriptionPlanSchema = z.object({
  /** Identifiant unique du plan (ex: 'lawyer_pro') */
  id: z.string().min(1).max(50),

  /** Tier du plan */
  tier: subscriptionTierSchema,

  /** Type de prestataire cible */
  providerType: providerTypeSchema,

  /** Limite d'appels IA par mois (-1 = illimite) */
  aiCallsLimit: z.number().int().min(-1),

  /** Prix mensuel par devise */
  pricing: z.object({
    EUR: z.number().min(0),
    USD: z.number().min(0),
  }),

  /** Prix annuel par devise (optionnel) */
  annualPricing: z.object({
    EUR: z.number().min(0),
    USD: z.number().min(0),
  }).optional(),

  /** Pourcentage de reduction annuelle (defaut: 20%) */
  annualDiscountPercent: z.number().min(0).max(100).default(20),

  /** IDs des prix Stripe mensuels */
  stripePriceId: z.object({
    EUR: z.string(),
    USD: z.string(),
  }).optional(),

  /** IDs des prix Stripe annuels */
  stripePriceIdAnnual: z.object({
    EUR: z.string(),
    USD: z.string(),
  }).optional(),

  /** Nom du plan par langue */
  name: z.record(z.string(), z.string()).optional(),

  /** Description par langue */
  description: z.record(z.string(), z.string()).optional(),

  /** Fonctionnalites incluses */
  features: z.array(z.string()).optional(),

  /** Plan actif et disponible a la vente */
  isActive: z.boolean().default(true),

  /** Ordre d'affichage */
  displayOrder: z.number().int().min(0).default(0),
});

export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanSchema>;

// ============================================================================
// AI USAGE SCHEMAS
// ============================================================================

/**
 * Schema pour les donnees d'utilisation IA
 */
export const aiUsageSchema = z.object({
  /** ID du provider */
  providerId: z.string(),

  /** Appels effectues dans la periode courante */
  currentPeriodCalls: z.number().int().min(0),

  /** Appels effectues pendant le trial */
  trialCallsUsed: z.number().int().min(0).optional(),

  /** Total des appels depuis le debut */
  totalCallsAllTime: z.number().int().min(0).optional(),

  /** Limite d'appels du plan actuel */
  aiCallsLimit: z.number().int(),

  /** Debut de la periode courante */
  currentPeriodStart: z.date().optional(),

  /** Fin de la periode courante */
  currentPeriodEnd: z.date().optional(),
});

export type AiUsageData = z.infer<typeof aiUsageSchema>;

// ============================================================================
// WEBHOOK VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema pour valider les metadata Stripe dans les webhooks
 */
export const stripeSubscriptionMetadataSchema = z.object({
  providerId: z.string().min(1),
  planId: z.string().optional(),
  billingPeriod: billingPeriodSchema.optional(),
});

export type StripeSubscriptionMetadata = z.infer<typeof stripeSubscriptionMetadataSchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Valide les donnees de creation de checkout
 * @returns Object avec success, data (si valide), ou errors (si invalide)
 */
export function validateCreateCheckout(input: unknown) {
  const result = createCheckoutSchema.safeParse(input);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Valide les donnees d'annulation
 */
export function validateCancelSubscription(input: unknown) {
  const result = cancelSubscriptionSchema.safeParse(input);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Valide les donnees admin force access
 */
export function validateAdminForceAccess(input: unknown) {
  const result = adminForceAccessSchema.safeParse(input);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Valide les donnees admin change plan
 */
export function validateAdminChangePlan(input: unknown) {
  const result = adminChangePlanSchema.safeParse(input);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Formate les erreurs de validation pour retour API
 */
export function formatValidationErrors(errors: Array<{ path: string; message: string }>) {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: errors,
  };
}
