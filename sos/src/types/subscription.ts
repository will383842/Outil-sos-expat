/**
 * SOS-Expat Subscription System Types
 * Système d'abonnement IA pour prestataires
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type ProviderType = 'lawyer' | 'expat_aidant';

// Supported languages for translations
export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'hi' | 'ar' | 'ch';

// Multilingual text structure for all 9 languages
export type MultilingualText = {
  [key in SupportedLanguage]: string;
};

export type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';

export type SubscriptionStatus =
  | 'trialing'      // En période d'essai
  | 'active'        // Abonnement actif et payé
  | 'past_due'      // Paiement en retard (grace period 7j)
  | 'canceled'      // Annulé (accès jusqu'à fin période)
  | 'expired'       // Expiré (plus d'accès)
  | 'paused'        // Mis en pause
  | 'suspended';    // P0 FIX: Suspendu (après 7j past_due, accès coupé)

export type Currency = 'EUR' | 'USD';

export type BillingPeriod = 'monthly' | 'yearly';

// ============================================================================
// SUBSCRIPTION PLAN CONFIGURATION
// ============================================================================

export interface PlanPricing {
  EUR: number;
  USD: number;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  providerType: ProviderType;
  name: MultilingualText;
  description: MultilingualText;
  // Prix mensuel
  pricing: PlanPricing;
  // Prix annuel (calculé automatiquement ou override manuel)
  annualPricing?: PlanPricing;
  // Remise annuelle en % (défaut: 20%)
  annualDiscountPercent?: number;
  aiCallsLimit: number; // -1 = unlimited
  features: PlanFeature[];
  // Prix Stripe mensuels
  stripePriceId: {
    EUR: string;
    USD: string;
  };
  // Prix Stripe annuels
  stripePriceIdAnnual?: {
    EUR: string;
    USD: string;
  };
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeature {
  key: string;
  name: MultilingualText;
  included: boolean;
}

// ============================================================================
// TRIAL CONFIGURATION (Admin-configurable)
// ============================================================================

export interface TrialConfig {
  durationDays: number;        // Durée de l'essai en jours (défaut: 30)
  maxAiCalls: number;          // Nombre max d'appels IA (défaut: 3)
  isEnabled: boolean;          // Activer/désactiver l'essai gratuit
  updatedAt: Date;
  updatedBy: string;           // Admin UID who made the change
}

// ============================================================================
// SUBSCRIPTION (User's active subscription)
// ============================================================================

export interface Subscription {
  id: string;
  providerId: string;          // UID du prestataire
  providerType: ProviderType;  // Type de prestataire
  planId: string;              // Référence au plan
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;

  // Dates
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;

  // Billing
  currency: Currency;
  billingPeriod?: BillingPeriod; // Mensuel ou annuel (défaut: monthly)
  currentPeriodAmount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AI USAGE TRACKING
// ============================================================================

export interface AiUsage {
  providerId: string;
  subscriptionId: string;

  // Current period usage
  currentPeriodCalls: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;

  // Trial usage (if applicable)
  trialCallsUsed: number;

  // Lifetime stats
  totalCallsAllTime: number;

  // Last activity
  lastCallAt: Date | null;

  updatedAt: Date;
}

export interface AiCallLog {
  id: string;
  providerId: string;
  subscriptionId: string;

  // Call details
  callType: 'chat' | 'stream' | 'suggestion' | 'translation';
  provider: 'claude' | 'gpt' | 'perplexity';
  model: string;

  // Tokens (for cost tracking)
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  // Context
  bookingId?: string;
  conversationId?: string;

  // Status
  success: boolean;
  errorMessage?: string;

  // Timing
  durationMs: number;
  createdAt: Date;
}

// ============================================================================
// QUOTA CHECK RESULT
// ============================================================================

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: QuotaBlockReason;

  // Current state
  currentUsage: number;
  limit: number;              // -1 = unlimited
  remaining: number;          // -1 = unlimited

  // Trial info (if applicable)
  isInTrial: boolean;
  trialDaysRemaining?: number;
  trialCallsRemaining?: number;

  // Upgrade suggestion
  suggestedUpgrade?: {
    tier: SubscriptionTier;
    planId: string;
  };
}

export type QuotaBlockReason =
  | 'trial_expired'           // Essai terminé (30 jours)
  | 'trial_calls_exhausted'   // 3 appels essai utilisés
  | 'quota_exhausted'         // Quota mensuel atteint
  | 'subscription_expired'    // Abonnement expiré
  | 'subscription_canceled'   // Abonnement annulé
  | 'payment_failed'          // Paiement échoué
  | 'no_subscription';        // Pas d'abonnement

// ============================================================================
// STRIPE WEBHOOK EVENTS
// ============================================================================

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
}

export type StripeEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.payment_action_required'
  | 'customer.created'
  | 'customer.updated'
  | 'payment_method.attached'
  | 'payment_method.detached';

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSubscriptionRequest {
  planId: string;
  currency: Currency;
  billingPeriod?: BillingPeriod; // Mensuel ou annuel (défaut: monthly)
  paymentMethodId?: string;
  promotionCode?: string;
}

export interface CreateSubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;      // For 3D Secure
  status?: SubscriptionStatus;
  error?: string;
}

export interface UpdateSubscriptionRequest {
  newPlanId: string;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd: boolean; // true = cancel at end of period, false = immediate
  reason?: string;
}

export interface GetUsageResponse {
  usage: AiUsage;
  subscription: Subscription;
  plan: SubscriptionPlan;
  quotaCheck: QuotaCheckResult;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface SubscriptionSettings {
  trial: TrialConfig;
  plans: {
    lawyer: Record<SubscriptionTier, SubscriptionPlan>;
    expat_aidant: Record<SubscriptionTier, SubscriptionPlan>;
  };
  updatedAt: Date;
  updatedBy: string;
}

export interface UpdatePlanPricingRequest {
  planId: string;
  pricing: PlanPricing;
  stripePriceIds?: {
    EUR: string;
    USD: string;
  };
}

export interface UpdateTrialConfigRequest {
  durationDays?: number;
  maxAiCalls?: number;
  isEnabled?: boolean;
}

// ============================================================================
// BILLING HISTORY
// ============================================================================

export interface Invoice {
  id: string;
  stripeInvoiceId: string;
  providerId: string;
  subscriptionId: string;

  // Amounts
  amountDue: number;
  amountPaid: number;
  currency: Currency;

  // Status
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

  // Dates
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date | null;
  paidAt: Date | null;

  // PDF
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;

  createdAt: Date;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  durationDays: 30,
  maxAiCalls: 3,
  isEnabled: true,
  updatedAt: new Date(),
  updatedBy: 'system'
};

// Tous les plans donnent accès à l'outil IA uniquement (pas de templates, traductions, APIs, support)
// La seule différence entre les plans est le nombre d'appels IA par mois
export const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  trial: ['ai_access'],
  basic: ['ai_access'],
  standard: ['ai_access'],
  pro: ['ai_access'],
  unlimited: ['ai_access']
};

// ============================================================================
// PRICING CONSTANTS (Defaults - can be overridden in Firestore)
// ============================================================================

export const DEFAULT_LAWYER_PRICING: Record<Exclude<SubscriptionTier, 'trial'>, PlanPricing> = {
  basic: { EUR: 14, USD: 19 },
  standard: { EUR: 39, USD: 49 },
  pro: { EUR: 69, USD: 79 },
  unlimited: { EUR: 119, USD: 139 }
};

export const DEFAULT_EXPAT_PRICING: Record<Exclude<SubscriptionTier, 'trial'>, PlanPricing> = {
  basic: { EUR: 9, USD: 9 },
  standard: { EUR: 14, USD: 17 },
  pro: { EUR: 24, USD: 29 },
  unlimited: { EUR: 39, USD: 49 }
};

export const DEFAULT_AI_CALLS_LIMIT: Record<SubscriptionTier, number> = {
  trial: 3,      // 3 appels max pendant l'essai
  basic: 5,      // 5 appels/mois
  standard: 15,  // 15 appels/mois
  pro: 30,       // 30 appels/mois
  unlimited: -1  // Illimité (fair use: 500/mois)
};

export const UNLIMITED_FAIR_USE_LIMIT = 500; // Fair use pour plan illimité

// Remise annuelle par défaut (20%)
export const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 20;

// Helper pour calculer le prix annuel avec remise
export const calculateAnnualPrice = (monthlyPrice: number, discountPercent: number = DEFAULT_ANNUAL_DISCOUNT_PERCENT): number => {
  const yearlyTotal = monthlyPrice * 12;
  const discount = yearlyTotal * (discountPercent / 100);
  return Math.round((yearlyTotal - discount) * 100) / 100; // Arrondi à 2 décimales
};

// Helper pour calculer le prix mensuel équivalent à partir du prix annuel
export const calculateMonthlyEquivalent = (annualPrice: number): number => {
  return Math.round((annualPrice / 12) * 100) / 100;
};

// Helper pour calculer l'économie annuelle
export const calculateAnnualSavings = (monthlyPrice: number, discountPercent: number = DEFAULT_ANNUAL_DISCOUNT_PERCENT): number => {
  const yearlyTotal = monthlyPrice * 12;
  const annualPrice = calculateAnnualPrice(monthlyPrice, discountPercent);
  return Math.round((yearlyTotal - annualPrice) * 100) / 100;
};
