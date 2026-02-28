/* eslint-disable @typescript-eslint/no-explicit-any */
// AUDIT FIX 2026-02-28: Removed file-wide @ts-nocheck. Localized @ts-ignore on v1 functions instead.
/**
 * SOS-Expat Subscription Cloud Functions
 * Gestion des abonnements IA pour prestataires
 */

import * as functions from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import {
  getStripeSecretKey,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
} from '../lib/secrets';
import { APP_URLS } from './constants';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

// Lazy initialization pattern to prevent deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Initialize Stripe (lazy)
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  ensureInitialized();
  if (!stripe) {
    // Use centralized secrets system
    const secretKey = getStripeSecretKey();
    if (!secretKey || !secretKey.startsWith('sk_')) {
      throw new Error('Stripe secret key not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripe;
}

// Lazy db initialization
const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

// ============================================================================
// COST OPTIMIZATION: IN-MEMORY CACHING
// Reduces Firestore reads by ~40% for frequently accessed data
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache TTL constants
const CACHE_TTL = {
  SUBSCRIPTION_PLAN: 5 * 60 * 1000,    // 5 minutes - plans change rarely
  TRIAL_CONFIG: 10 * 60 * 1000,        // 10 minutes - config changes very rarely
  RATE_LIMIT: 60 * 1000,               // 1 minute - short TTL for rate limits
  STRIPE_PRICE_MAPPING: 30 * 60 * 1000 // 30 minutes - price mappings are static
};

// In-memory caches
const subscriptionPlanCache = new Map<string, CacheEntry<SubscriptionPlan>>();
const trialConfigCache: { entry: CacheEntry<TrialConfig> | null } = { entry: null };
const stripePriceMappingCache = new Map<string, CacheEntry<string>>(); // priceId -> planId
const rateLimitCache = new Map<string, { count: number; windowStart: number }>();

// Cache stats for monitoring
let cacheStats = {
  planHits: 0,
  planMisses: 0,
  trialConfigHits: 0,
  trialConfigMisses: 0,
  rateLimitHits: 0,
  rateLimitMisses: 0
};

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getCacheStats() {
  return { ...cacheStats };
}

/**
 * Clear all caches (useful for testing or after admin updates)
 */
export function clearAllCaches(): void {
  subscriptionPlanCache.clear();
  trialConfigCache.entry = null;
  stripePriceMappingCache.clear();
  rateLimitCache.clear();
  console.log('[CACHE] All caches cleared');
}

/**
 * Clear subscription plan cache (call after admin updates plans)
 */
export function clearPlanCache(): void {
  subscriptionPlanCache.clear();
  stripePriceMappingCache.clear();
  console.log('[CACHE] Plan and price mapping caches cleared');
}

// ============================================================================
// TYPES
// ============================================================================

type ProviderType = 'lawyer' | 'expat_aidant';
type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused' | 'suspended';
type Currency = 'EUR' | 'USD';
type BillingPeriod = 'monthly' | 'yearly';

// Remise annuelle par défaut (20%)
const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 20;

interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  providerType: ProviderType;
  pricing: { EUR: number; USD: number };
  annualPricing?: { EUR: number; USD: number };
  annualDiscountPercent?: number;
  aiCallsLimit: number;
  stripePriceId: { EUR: string; USD: string };
  stripePriceIdAnnual?: { EUR: string; USD: string };
  isActive: boolean;
}

// Helper pour calculer le prix annuel
function calculateAnnualPrice(monthlyPrice: number, discountPercent: number = DEFAULT_ANNUAL_DISCOUNT_PERCENT): number {
  const yearlyTotal = monthlyPrice * 12;
  const discount = yearlyTotal * (discountPercent / 100);
  return Math.round((yearlyTotal - discount) * 100) / 100;
}

interface TrialConfig {
  durationDays: number;
  maxAiCalls: number;
  isEnabled: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get trial configuration with caching
 * COST OPTIMIZATION: Reduces reads from ~1000/day to ~100/day
 */
async function getTrialConfig(): Promise<TrialConfig> {
  const now = Date.now();

  // Check cache first
  if (trialConfigCache.entry && trialConfigCache.entry.expiresAt > now) {
    cacheStats.trialConfigHits++;
    return trialConfigCache.entry.data;
  }

  cacheStats.trialConfigMisses++;

  // Fetch from Firestore
  const settingsDoc = await getDb().doc('settings/subscription').get();
  const config: TrialConfig = (!settingsDoc.exists || !settingsDoc.data()?.trial)
    ? { durationDays: 30, maxAiCalls: 3, isEnabled: true }
    : settingsDoc.data()!.trial;

  // Update cache
  trialConfigCache.entry = {
    data: config,
    expiresAt: now + CACHE_TTL.TRIAL_CONFIG
  };

  return config;
}

// ============================================================================
// IDEMPOTENCE HELPERS
// ============================================================================

// Idempotency helpers (isEventAlreadyProcessed, markEventAsProcessed,
// tryClaimEventProcessing, markEventProcessingComplete, unclaimEventProcessing)
// removed — now handled in ./webhooks.ts

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  checkAiQuota: { maxRequests: 60, windowMs: 60000 },      // 60/min (DEPRECATED - use processAiCall)
  recordAiCall: { maxRequests: 30, windowMs: 60000 },      // 30/min (DEPRECATED - use processAiCall)
  processAiCall: { maxRequests: 60, windowMs: 60000 },     // 60/min - Combined check+record
  createSubscription: { maxRequests: 5, windowMs: 3600000 }, // 5/hour
  updateSubscription: { maxRequests: 10, windowMs: 3600000 }, // 10/hour
  default: { maxRequests: 100, windowMs: 60000 }           // 100/min
};

/**
 * Check rate limit for a user/function combination (IN-MEMORY)
 * COST OPTIMIZATION: Reduces Firestore reads/writes to ZERO
 * Note: Rate limits are per-instance, which is fine for Cloud Functions
 * as requests are typically distributed across instances anyway.
 *
 * For strict cross-instance rate limiting, use Firestore (uncomment legacy code below)
 */
function checkRateLimitInMemory(userId: string, functionName: string): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[functionName] || RATE_LIMITS.default;
  const now = Date.now();
  const key = `${userId}_${functionName}`;

  const cached = rateLimitCache.get(key);

  // If no record or window expired, reset
  if (!cached || now - cached.windowStart > config.windowMs) {
    rateLimitCache.set(key, { count: 1, windowStart: now });
    cacheStats.rateLimitMisses++;
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }

  cacheStats.rateLimitHits++;

  // Check if over limit
  if (cached.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: cached.windowStart + config.windowMs
    };
  }

  // Increment counter
  cached.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - cached.count,
    resetAt: cached.windowStart + config.windowMs
  };
}

/**
 * Check rate limit - wrapper that uses in-memory cache
 * COST OPTIMIZATION: No Firestore reads/writes
 */
async function checkRateLimit(userId: string, functionName: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return checkRateLimitInMemory(userId, functionName);
}

/**
 * LEGACY: Firestore-based rate limiting (kept for reference)
 * Uncomment if you need strict cross-instance rate limiting
 */
/*
async function checkRateLimitFirestore(userId: string, functionName: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[functionName] || RATE_LIMITS.default;
  const windowStart = Date.now() - config.windowMs;
  const rateLimitRef = getDb().collection('rate_limits').doc(`${userId}_${functionName}`);

  const doc = await rateLimitRef.get();
  const data = doc.data();

  if (!data || data.windowStart < windowStart) {
    await rateLimitRef.set({
      userId,
      functionName,
      count: 1,
      windowStart: Date.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: Date.now() + config.windowMs };
  }

  if (data.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: data.windowStart + config.windowMs };
  }

  await rateLimitRef.update({
    count: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.Timestamp.now()
  });

  return {
    allowed: true,
    remaining: config.maxRequests - data.count - 1,
    resetAt: data.windowStart + config.windowMs
  };
}
*/

// ============================================================================
// AUDIT LOGGING HELPERS
// ============================================================================

interface AuditLogEntry {
  action: string;
  adminId: string;
  adminEmail?: string;
  targetId?: string;
  targetType?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Log an admin action for audit purposes
 */
async function logAdminAction(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  await getDb().collection('admin_audit_logs').add({
    ...entry,
    timestamp: admin.firestore.Timestamp.now()
  });
  console.log(`[AUDIT] ${entry.action} by ${entry.adminId} on ${entry.targetType}/${entry.targetId}`);
}

/**
 * Get subscription plan with caching
 * COST OPTIMIZATION: Reduces reads by ~90% for plan lookups
 */
async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const now = Date.now();

  // Check cache first
  const cached = subscriptionPlanCache.get(planId);
  if (cached && cached.expiresAt > now) {
    cacheStats.planHits++;
    return cached.data;
  }

  cacheStats.planMisses++;

  // Fetch from Firestore
  const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!planDoc.exists) return null;

  const plan = { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;

  // Update cache
  subscriptionPlanCache.set(planId, {
    data: plan,
    expiresAt: now + CACHE_TTL.SUBSCRIPTION_PLAN
  });

  // Also cache the price mappings for reverse lookups
  if (plan.stripePriceId?.EUR) {
    stripePriceMappingCache.set(plan.stripePriceId.EUR, {
      data: planId,
      expiresAt: now + CACHE_TTL.STRIPE_PRICE_MAPPING
    });
  }
  if (plan.stripePriceId?.USD) {
    stripePriceMappingCache.set(plan.stripePriceId.USD, {
      data: planId,
      expiresAt: now + CACHE_TTL.STRIPE_PRICE_MAPPING
    });
  }
  if (plan.stripePriceIdAnnual?.EUR) {
    stripePriceMappingCache.set(plan.stripePriceIdAnnual.EUR, {
      data: planId,
      expiresAt: now + CACHE_TTL.STRIPE_PRICE_MAPPING
    });
  }
  if (plan.stripePriceIdAnnual?.USD) {
    stripePriceMappingCache.set(plan.stripePriceIdAnnual.USD, {
      data: planId,
      expiresAt: now + CACHE_TTL.STRIPE_PRICE_MAPPING
    });
  }

  return plan;
}

/**
 * Get subscription plan by Stripe price ID (optimized)
 * COST OPTIMIZATION: Uses cache to avoid 4 sequential queries
 * Reduces from 4 reads to 1 read (or 0 if cached)
 */
// @ts-ignore - Cached helper, used indirectly
async function _getSubscriptionPlanByPriceId(priceId: string): Promise<SubscriptionPlan | null> {
  const now = Date.now();

  // Check price mapping cache first
  const cachedPlanId = stripePriceMappingCache.get(priceId);
  if (cachedPlanId && cachedPlanId.expiresAt > now) {
    return getSubscriptionPlan(cachedPlanId.data);
  }

  // If not in cache, we need to search - but do it more efficiently
  // Load all active plans once and cache them
  const plansSnapshot = await getDb()
    .collection('subscription_plans')
    .where('isActive', '==', true)
    .get();

  for (const doc of plansSnapshot.docs) {
    const plan = { id: doc.id, ...doc.data() } as SubscriptionPlan;

    // Cache this plan
    subscriptionPlanCache.set(plan.id, {
      data: plan,
      expiresAt: now + CACHE_TTL.SUBSCRIPTION_PLAN
    });

    // Cache all its price mappings
    const priceIds = [
      plan.stripePriceId?.EUR,
      plan.stripePriceId?.USD,
      plan.stripePriceIdAnnual?.EUR,
      plan.stripePriceIdAnnual?.USD
    ].filter(Boolean);

    for (const pid of priceIds) {
      stripePriceMappingCache.set(pid!, {
        data: plan.id,
        expiresAt: now + CACHE_TTL.STRIPE_PRICE_MAPPING
      });

      // If this is the price we're looking for, return it
      if (pid === priceId) {
        return plan;
      }
    }
  }

  return null;
}

/**
 * Initialize a trial subscription for a new provider
 * Called when a provider first registers
 */
export async function initializeTrial(providerId: string): Promise<{
  success: boolean;
  trialEndsAt?: Date;
  maxAiCalls?: number;
  error?: string;
}> {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Get trial config
    const trialConfig = await getTrialConfig();

    if (!trialConfig.isEnabled) {
      return {
        success: false,
        error: 'Trial is currently disabled'
      };
    }

    // Check if user already has a subscription
    const existingSubDoc = await db.doc(`subscriptions/${providerId}`).get();
    if (existingSubDoc.exists) {
      const existingData = existingSubDoc.data();
      // If already trialing or has active subscription, skip
      if (existingData?.status === 'trialing' || existingData?.status === 'active') {
        return {
          success: true,
          trialEndsAt: existingData.trialEndsAt?.toDate(),
          maxAiCalls: trialConfig.maxAiCalls,
          error: 'User already has an active subscription or trial'
        };
      }
    }

    // AUDIT-FIX TRIAL: durationDays=0 signifie pas de limite de temps
    // Les 3 appels gratuits sont disponibles à vie
    const hasTimeLimit = trialConfig.durationDays > 0;
    const trialEndsAt = hasTimeLimit ? new Date() : null;
    if (trialEndsAt) {
      trialEndsAt.setDate(trialEndsAt.getDate() + trialConfig.durationDays);
    }

    const trialEndsAtTimestamp = trialEndsAt
      ? admin.firestore.Timestamp.fromDate(trialEndsAt)
      : null;

    // Create subscription document for trial
    const subscriptionData = {
      providerId,
      planId: 'trial',
      tier: 'trial' as SubscriptionTier,
      status: 'trialing' as SubscriptionStatus,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currency: 'EUR' as Currency,
      billingPeriod: null,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAtTimestamp, // null = pas de fin
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialStartedAt: now,
      trialEndsAt: trialEndsAtTimestamp, // null = pas de limite de temps
      aiCallsLimit: trialConfig.maxAiCalls,
      aiAccessEnabled: true,
      createdAt: now,
      updatedAt: now
    };

    await db.doc(`subscriptions/${providerId}`).set(subscriptionData);

    // Initialize AI usage tracking
    const aiUsageData = {
      providerId,
      subscriptionId: providerId,
      currentPeriodCalls: 0,
      trialCallsUsed: 0,
      totalCallsAllTime: 0,
      aiCallsLimit: trialConfig.maxAiCalls,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAtTimestamp, // null = pas de fin
      createdAt: now,
      updatedAt: now
    };

    await db.doc(`ai_usage/${providerId}`).set(aiUsageData);

    console.log(`✅ Trial initialized for provider ${providerId}${trialEndsAt ? ` - ends on ${trialEndsAt.toISOString()}` : ' - no time limit (3 free calls)'}`);

    return {
      success: true,
      trialEndsAt: trialEndsAt || undefined,
      maxAiCalls: trialConfig.maxAiCalls
    };
  } catch (error: unknown) {
    console.error(`❌ Error initializing trial for ${providerId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize trial'
    };
  }
}

async function getOrCreateStripeCustomer(
  providerId: string,
  email: string,
  name: string
): Promise<string> {
  // Check if customer already exists
  const subscriptionDoc = await getDb().doc(`subscriptions/${providerId}`).get();
  if (subscriptionDoc.exists && subscriptionDoc.data()?.stripeCustomerId) {
    return subscriptionDoc.data()!.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    name,
    metadata: {
      providerId,
      source: 'sos-expat'
    }
  });

  return customer.id;
}

// ============================================================================
// CREATE SUBSCRIPTION
// ============================================================================

// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const createSubscription = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    // Rate limiting check (strict: 5 per hour)
    const rateLimit = await checkRateLimit(providerId, 'createSubscription');
    if (!rateLimit.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Too many subscription attempts. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 60000)} minutes`
      );
    }

    const { planId, currency, billingPeriod = 'monthly', paymentMethodId, promotionCode } = data as {
      planId: string;
      currency: Currency;
      billingPeriod?: BillingPeriod;
      paymentMethodId?: string;
      promotionCode?: string;
    };

    try {
      // Get the plan
      const plan = await getSubscriptionPlan(planId);
      if (!plan || !plan.isActive) {
        throw new HttpsError('not-found', 'Plan not found or inactive');
      }

      // Get provider info — cascade lookup: sos_profiles → users → providers
      let providerDoc = await getDb().doc(`sos_profiles/${providerId}`).get();
      if (!providerDoc.exists) {
        providerDoc = await getDb().doc(`users/${providerId}`).get();
      }
      if (!providerDoc.exists) {
        providerDoc = await getDb().doc(`providers/${providerId}`).get();
      }
      if (!providerDoc.exists) {
        throw new HttpsError('not-found', 'Provider not found');
      }
      const providerData = providerDoc.data()!;

      // SECURITY: Determine and validate provider type
      const userRole = providerData.type || providerData.role || '';

      // SECURITY: Block clients from accessing subscriptions
      if (userRole === 'client' || userRole === 'user') {
        console.error(`[createSubscription] Client ${providerId} attempted to access subscription`);
        throw new HttpsError(
          'permission-denied',
          'Seuls les prestataires (avocats et expatriés aidants) peuvent souscrire à un abonnement'
        );
      }

      const userProviderType: ProviderType = userRole === 'lawyer' ? 'lawyer' : 'expat_aidant';

      // SECURITY: Validate that plan's providerType matches user's providerType
      if (plan.providerType !== userProviderType) {
        console.error(`[createSubscription] Provider type mismatch: user=${userProviderType}, plan=${plan.providerType}`);
        throw new HttpsError(
          'permission-denied',
          `Ce plan n'est pas disponible pour votre profil. Vous êtes "${userProviderType === 'lawyer' ? 'avocat' : 'expatrié aidant'}" mais ce plan est réservé aux "${plan.providerType === 'lawyer' ? 'avocats' : 'expatriés aidants'}".`
        );
      }

      console.log(`[createSubscription] Provider ${providerId} validated: type=${userProviderType}, plan=${planId}`);

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(
        providerId,
        providerData.email,
        providerData.displayName || providerData.firstName + ' ' + providerData.lastName
      );

      // Attach payment method if provided
      if (paymentMethodId) {
        await getStripe().paymentMethods.attach(paymentMethodId, {
          customer: customerId
        });

        await getStripe().customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      // Get the correct Stripe price ID (monthly or annual)
      let priceId: string;
      let periodAmount: number;

      if (billingPeriod === 'yearly') {
        priceId = plan.stripePriceIdAnnual?.[currency] || '';
        // Calculate annual price if not set
        periodAmount = plan.annualPricing?.[currency]
          ?? calculateAnnualPrice(plan.pricing[currency], plan.annualDiscountPercent);

        if (!priceId) {
          throw new HttpsError('invalid-argument', `No annual price configured for ${currency}. Please contact support.`);
        }
      } else {
        priceId = plan.stripePriceId[currency];
        periodAmount = plan.pricing[currency];

        if (!priceId) {
          throw new HttpsError('invalid-argument', `No monthly price configured for ${currency}`);
        }
      }

      // Check for existing subscription
      const existingSubDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      let stripeSubscription: Stripe.Subscription;

      if (existingSubDoc.exists && existingSubDoc.data()?.stripeSubscriptionId) {
        // Update existing subscription
        stripeSubscription = await getStripe().subscriptions.update(
          existingSubDoc.data()!.stripeSubscriptionId,
          {
            items: [{ price: priceId }],
            proration_behavior: 'create_prorations',
            ...(promotionCode ? { promotion_code: promotionCode } : {})
          }
        );
      } else {
        // Create new subscription
        const subscriptionParams: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            providerId,
            planId,
            providerType: plan.providerType,
            billingPeriod,
            currency
          }
        };

        if (promotionCode) {
          subscriptionParams.promotion_code = promotionCode;
        }

        stripeSubscription = await getStripe().subscriptions.create(subscriptionParams);
      }

      // Get client secret for payment confirmation (if needed)
      let clientSecret: string | undefined;
      if (stripeSubscription.status === 'incomplete') {
        const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent?.client_secret || undefined;
      }

      // Update Firestore subscription document
      const now = admin.firestore.Timestamp.now();
      await getDb().doc(`subscriptions/${providerId}`).set({
        providerId,
        providerType: plan.providerType,
        planId,
        tier: plan.tier,
        status: mapStripeStatus(stripeSubscription.status),
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        currency,
        billingPeriod,
        currentPeriodAmount: periodAmount,
        currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: null,
        trialStartedAt: null,
        trialEndsAt: null,
        createdAt: existingSubDoc.exists ? existingSubDoc.data()!.createdAt : now,
        updatedAt: now
      }, { merge: true });

      // Reset usage for new period
      await getDb().doc(`ai_usage/${providerId}`).set({
        providerId,
        subscriptionId: providerId,
        currentPeriodCalls: 0,
        currentPeriodStart: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(stripeSubscription.current_period_end * 1000),
        updatedAt: now
      }, { merge: true });

      return {
        success: true,
        subscriptionId: stripeSubscription.id,
        status: mapStripeStatus(stripeSubscription.status),
        clientSecret
      };
    } catch (error: unknown) {
      console.error('Error creating subscription:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to create subscription');
    }
  });

// ============================================================================
// UPDATE SUBSCRIPTION (Upgrade/Downgrade)
// ============================================================================

// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const updateSubscription = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
    const { newPlanId } = data as { newPlanId: string };

    try {
      // Get current subscription
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new HttpsError('not-found', 'No active subscription found');
      }

      const subData = subDoc.data()!;
      const currency = subData.currency as Currency;
      const currentBillingPeriod = subData.billingPeriod || 'monthly';

      // Get new plan
      const newPlan = await getSubscriptionPlan(newPlanId);
      if (!newPlan || !newPlan.isActive) {
        throw new HttpsError('not-found', 'New plan not found or inactive');
      }

      // Select the correct Stripe price ID based on current billing period
      const stripePriceId = currentBillingPeriod === 'yearly'
        ? (newPlan.stripePriceIdAnnual?.[currency] || newPlan.stripePriceId[currency])
        : newPlan.stripePriceId[currency];

      // Calculate the correct amount for the current billing period
      const currentPeriodAmount = currentBillingPeriod === 'yearly'
        ? (newPlan.annualPricing?.[currency] ?? calculateAnnualPrice(newPlan.pricing[currency], newPlan.annualDiscountPercent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT))
        : newPlan.pricing[currency];

      // Get Stripe subscription to find item ID
      const stripeSubscription = await getStripe().subscriptions.retrieve(subData.stripeSubscriptionId);
      const subscriptionItemId = stripeSubscription.items.data[0].id;

      // Update subscription in Stripe
      await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          items: [{
            id: subscriptionItemId,
            price: stripePriceId
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            planId: newPlanId,
            providerType: newPlan.providerType,
            billingPeriod: currentBillingPeriod
          }
        }
      );

      // Update Firestore
      await getDb().doc(`subscriptions/${providerId}`).update({
        planId: newPlanId,
        tier: newPlan.tier,
        stripePriceId: stripePriceId,
        currentPeriodAmount: currentPeriodAmount,
        updatedAt: admin.firestore.Timestamp.now()
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('Error updating subscription:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to update subscription');
    }
  });

// ============================================================================
// CANCEL SUBSCRIPTION & REACTIVATE SUBSCRIPTION
// Enhanced version with i18n email notifications (9 languages)
// ============================================================================

// Re-export enhanced cancel and reactivate functions from dedicated module
export {
  cancelSubscription,
  reactivateSubscription,
  pauseSubscription,
  resumeSubscription,
  CANCELLATION_EMAIL_TEMPLATES,
  REACTIVATION_EMAIL_TEMPLATES,
  sendCancellationEmail,
  sendReactivationEmail,
  logSubscriptionAction
} from './cancelSubscription';

// ============================================================================
// STRIPE CUSTOMER PORTAL
// ============================================================================

// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const createStripePortalSession = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeCustomerId) {
        throw new HttpsError('not-found', 'No Stripe customer found');
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: subDoc.data()!.stripeCustomerId,
        return_url: APP_URLS.SUBSCRIPTION_DASHBOARD
      });

      return { url: session.url };
    } catch (error: unknown) {
      console.error('Error creating portal session:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to create portal session');
    }
  });

// ============================================================================
// AI QUOTA CHECK (Called before AI requests)
// ============================================================================

// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const checkAiQuota = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    // Rate limiting check
    const rateLimit = await checkRateLimit(providerId, 'checkAiQuota');
    if (!rateLimit.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`
      );
    }

    try {
      const [subDoc, usageDoc, trialConfig, userDoc] = await Promise.all([
        getDb().doc(`subscriptions/${providerId}`).get(),
        getDb().doc(`ai_usage/${providerId}`).get(),
        getTrialConfig(),
        getDb().doc(`users/${providerId}`).get()
      ]);

      // Check for admin-granted free access (bypass)
      const userData = userDoc.exists ? userDoc.data() : null;
      if (userData?.forceAiAccess === true) {
        const usage = usageDoc.exists ? usageDoc.data()! : { currentPeriodCalls: 0 };
        return {
          allowed: true,
          currentUsage: usage.currentPeriodCalls || 0,
          limit: -1, // unlimited
          remaining: -1,
          isInTrial: false,
          isFreeAccess: true,
          freeAccessGrantedBy: userData.freeAccessGrantedBy || 'admin',
          freeAccessNote: userData.freeAccessNote || 'Accès gratuit accordé par administrateur'
        };
      }

      if (!subDoc.exists) {
        return {
          allowed: false,
          reason: 'no_subscription',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isInTrial: false
        };
      }

      const subscription = subDoc.data()!;
      const usage = usageDoc.exists ? usageDoc.data()! : { trialCallsUsed: 0, currentPeriodCalls: 0 };
      const now = new Date();

      // Trial check
      if (subscription.status === 'trialing') {
        const trialEndsAt = subscription.trialEndsAt?.toDate();
        const trialExpired = trialEndsAt && now > trialEndsAt;
        const trialCallsExhausted = usage.trialCallsUsed >= trialConfig.maxAiCalls;

        if (trialExpired || trialCallsExhausted) {
          return {
            allowed: false,
            reason: trialExpired ? 'trial_expired' : 'trial_calls_exhausted',
            currentUsage: usage.trialCallsUsed,
            limit: trialConfig.maxAiCalls,
            remaining: 0,
            isInTrial: true,
            trialDaysRemaining: trialExpired ? 0 : Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            trialCallsRemaining: 0
          };
        }

        return {
          allowed: true,
          currentUsage: usage.trialCallsUsed,
          limit: trialConfig.maxAiCalls,
          remaining: trialConfig.maxAiCalls - usage.trialCallsUsed,
          isInTrial: true,
          trialDaysRemaining: trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0,
          trialCallsRemaining: trialConfig.maxAiCalls - usage.trialCallsUsed
        };
      }

      // Active subscription check
      if (subscription.status !== 'active') {
        return {
          allowed: false,
          reason: subscription.status === 'past_due' ? 'payment_failed' : 'subscription_' + subscription.status,
          currentUsage: usage.currentPeriodCalls,
          limit: 0,
          remaining: 0,
          isInTrial: false
        };
      }

      // Get plan limits
      const plan = await getSubscriptionPlan(subscription.planId);
      const limit = plan?.aiCallsLimit ?? 0;

      // Unlimited plan
      if (limit === -1) {
        const fairUseLimit = 500;
        return {
          allowed: usage.currentPeriodCalls < fairUseLimit,
          currentUsage: usage.currentPeriodCalls,
          limit: -1,
          remaining: -1,
          isInTrial: false
        };
      }

      // Check quota
      if (usage.currentPeriodCalls >= limit) {
        return {
          allowed: false,
          reason: 'quota_exhausted',
          currentUsage: usage.currentPeriodCalls,
          limit,
          remaining: 0,
          isInTrial: false
        };
      }

      return {
        allowed: true,
        currentUsage: usage.currentPeriodCalls,
        limit,
        remaining: limit - usage.currentPeriodCalls,
        isInTrial: false
      };
    } catch (error: unknown) {
      console.error('Error checking AI quota:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to check quota');
    }
  });

// ============================================================================
// RECORD AI CALL (Called after successful AI request)
// ============================================================================

// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const recordAiCall = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    // Rate limiting check
    const rateLimit = await checkRateLimit(providerId, 'recordAiCall');
    if (!rateLimit.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`
      );
    }

    const {
      callType,
      provider,
      model,
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = 0,
      success = true,
      errorMessage,
      durationMs = 0,
      bookingId,
      conversationId
    } = data;

    // Validate required fields
    if (!callType || typeof callType !== 'string') {
      throw new HttpsError('invalid-argument', 'callType is required and must be a string');
    }

    try {
      const db = getDb();
      const now = admin.firestore.Timestamp.now();

      // SERVER-SIDE VALIDATION: Check if user has active subscription/quota
      const [subDoc, usageDoc, userDoc, trialConfig] = await Promise.all([
        db.doc(`subscriptions/${providerId}`).get(),
        db.doc(`ai_usage/${providerId}`).get(),
        db.doc(`users/${providerId}`).get(),
        getTrialConfig()
      ]);

      // Check for admin-granted free access (bypass quota check)
      const userData = userDoc.exists ? userDoc.data() : null;
      const hasFreeAccess = userData?.forceAiAccess === true;

      if (!hasFreeAccess) {
        // Validate subscription status
        if (!subDoc.exists) {
          throw new HttpsError('permission-denied', 'No active subscription found');
        }

        const subscription = subDoc.data()!;
        const usage = usageDoc.exists ? usageDoc.data()! : { trialCallsUsed: 0, currentPeriodCalls: 0 };
        const isInTrial = subscription.status === 'trialing';

        // Check subscription status
        if (!['active', 'trialing'].includes(subscription.status)) {
          throw new HttpsError(
            'permission-denied',
            `Subscription status "${subscription.status}" does not allow AI calls`
          );
        }

        // Check AI access flag
        if (subscription.aiAccessEnabled === false) {
          throw new HttpsError('permission-denied', 'AI access is disabled for this subscription');
        }

        // Check quota based on subscription type
        if (isInTrial) {
          const trialEndsAt = subscription.trialEndsAt?.toDate();
          if (trialEndsAt && new Date() > trialEndsAt) {
            throw new HttpsError('permission-denied', 'Trial period has expired');
          }
          if (usage.trialCallsUsed >= trialConfig.maxAiCalls) {
            throw new HttpsError('permission-denied', 'Trial AI calls exhausted');
          }
        } else {
          // Get plan limits for active subscription
          const plan = await getSubscriptionPlan(subscription.planId);
          const limit = plan?.aiCallsLimit ?? 0;

          // Only check if not unlimited (-1)
          if (limit !== -1 && usage.currentPeriodCalls >= limit) {
            throw new HttpsError('permission-denied', 'Monthly AI quota exhausted');
          }
        }
      }

      // All validations passed - proceed with recording
      const batch = db.batch();

      // Add call log
      const logRef = db.collection('ai_call_logs').doc();
      batch.set(logRef, {
        providerId,
        subscriptionId: providerId,
        callType,
        provider,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        success,
        errorMessage: errorMessage || null,
        durationMs,
        bookingId: bookingId || null,
        conversationId: conversationId || null,
        validatedServerSide: true, // Flag to indicate server validation passed
        createdAt: now
      });

      // Get subscription status for counter update
      const isInTrial = subDoc.exists && subDoc.data()?.status === 'trialing';

      // Update usage counters
      const usageRef = db.doc(`ai_usage/${providerId}`);
      if (isInTrial) {
        batch.update(usageRef, {
          trialCallsUsed: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });
      } else {
        batch.update(usageRef, {
          currentPeriodCalls: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });
      }

      await batch.commit();
      return { success: true };
    } catch (error: unknown) {
      console.error('Error recording AI call:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to record AI call');
    }
  });

// ============================================================================
// PROCESS AI CALL (OPTIMIZED - Combines check + record in ONE call)
// COST OPTIMIZATION: Reduces from 8 reads to 4 reads per AI call
// ============================================================================

/**
 * Process an AI call - checks quota AND records the call in a single operation
 * COST OPTIMIZATION: Combines checkAiQuota + recordAiCall into one function
 * Reduces Firestore reads from 8 to 4 per AI interaction
 *
 * @param data.callType - Type of AI call (required)
 * @param data.provider - AI provider name (optional)
 * @param data.model - AI model name (optional)
 * @param data.inputTokens - Input token count (optional)
 * @param data.outputTokens - Output token count (optional)
 * @param data.durationMs - Call duration in ms (optional)
 * @param data.bookingId - Associated booking ID (optional)
 * @param data.conversationId - Associated conversation ID (optional)
 * @param data.checkOnly - If true, only check quota without recording (default: false)
 *
 * @returns Quota info + success status
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const processAiCall = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    // Rate limiting check (uses in-memory cache, no Firestore reads)
    const rateLimit = await checkRateLimit(providerId, 'processAiCall');
    if (!rateLimit.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`
      );
    }

    const {
      callType,
      provider,
      model,
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = 0,
      success = true,
      errorMessage,
      durationMs = 0,
      bookingId,
      conversationId,
      checkOnly = false // If true, behaves like checkAiQuota (no recording)
    } = data || {};

    // Validate required fields for recording (not needed for checkOnly)
    if (!checkOnly && (!callType || typeof callType !== 'string')) {
      throw new HttpsError('invalid-argument', 'callType is required and must be a string');
    }

    try {
      const db = getDb();
      const now = admin.firestore.Timestamp.now();

      // Fetch all required data in ONE parallel call (4 reads)
      const [subDoc, usageDoc, userDoc, trialConfig] = await Promise.all([
        db.doc(`subscriptions/${providerId}`).get(),
        db.doc(`ai_usage/${providerId}`).get(),
        db.doc(`users/${providerId}`).get(),
        getTrialConfig() // Uses cache, usually 0 reads
      ]);

      const userData = userDoc.exists ? userDoc.data() : null;
      const hasFreeAccess = userData?.forceAiAccess === true;

      // Build quota response
      let quotaInfo: Record<string, unknown> = {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isInTrial: false
      };

      // Check for admin-granted free access (bypass)
      if (hasFreeAccess) {
        const usage = usageDoc.exists ? usageDoc.data()! : { currentPeriodCalls: 0 };
        quotaInfo = {
          allowed: true,
          currentUsage: usage.currentPeriodCalls || 0,
          limit: -1,
          remaining: -1,
          isInTrial: false,
          isFreeAccess: true,
          freeAccessGrantedBy: userData!.freeAccessGrantedBy || 'admin'
        };
      } else if (!subDoc.exists) {
        quotaInfo = {
          allowed: false,
          reason: 'no_subscription',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isInTrial: false
        };
      } else {
        const subscription = subDoc.data()!;
        const usage = usageDoc.exists ? usageDoc.data()! : { trialCallsUsed: 0, currentPeriodCalls: 0 };
        const isInTrial = subscription.status === 'trialing';
        const dateNow = new Date();

        if (isInTrial) {
          // Trial logic
          const trialEndsAt = subscription.trialEndsAt?.toDate();
          const trialExpired = trialEndsAt && dateNow > trialEndsAt;
          const trialCallsExhausted = usage.trialCallsUsed >= trialConfig.maxAiCalls;

          if (trialExpired || trialCallsExhausted) {
            quotaInfo = {
              allowed: false,
              reason: trialExpired ? 'trial_expired' : 'trial_calls_exhausted',
              currentUsage: usage.trialCallsUsed,
              limit: trialConfig.maxAiCalls,
              remaining: 0,
              isInTrial: true,
              trialDaysRemaining: trialExpired ? 0 : Math.ceil((trialEndsAt!.getTime() - dateNow.getTime()) / (24 * 60 * 60 * 1000)),
              trialCallsRemaining: 0
            };
          } else {
            quotaInfo = {
              allowed: true,
              currentUsage: usage.trialCallsUsed,
              limit: trialConfig.maxAiCalls,
              remaining: trialConfig.maxAiCalls - usage.trialCallsUsed,
              isInTrial: true,
              trialDaysRemaining: trialEndsAt ? Math.ceil((trialEndsAt.getTime() - dateNow.getTime()) / (24 * 60 * 60 * 1000)) : 0,
              trialCallsRemaining: trialConfig.maxAiCalls - usage.trialCallsUsed
            };
          }
        } else if (subscription.status !== 'active') {
          // Inactive subscription
          quotaInfo = {
            allowed: false,
            reason: subscription.status === 'past_due' ? 'payment_failed' : 'subscription_' + subscription.status,
            currentUsage: usage.currentPeriodCalls,
            limit: 0,
            remaining: 0,
            isInTrial: false
          };
        } else {
          // Active subscription - check plan limits
          const plan = await getSubscriptionPlan(subscription.planId); // Uses cache
          const limit = plan?.aiCallsLimit ?? 0;

          if (limit === -1) {
            // Unlimited plan
            const fairUseLimit = 500;
            quotaInfo = {
              allowed: usage.currentPeriodCalls < fairUseLimit,
              currentUsage: usage.currentPeriodCalls,
              limit: -1,
              remaining: -1,
              isInTrial: false
            };
          } else if (usage.currentPeriodCalls >= limit) {
            quotaInfo = {
              allowed: false,
              reason: 'quota_exhausted',
              currentUsage: usage.currentPeriodCalls,
              limit,
              remaining: 0,
              isInTrial: false
            };
          } else {
            quotaInfo = {
              allowed: true,
              currentUsage: usage.currentPeriodCalls,
              limit,
              remaining: limit - usage.currentPeriodCalls,
              isInTrial: false
            };
          }
        }
      }

      // If checkOnly mode or not allowed, return quota info without recording
      if (checkOnly || !quotaInfo.allowed) {
        return {
          ...quotaInfo,
          recorded: false
        };
      }

      // Record the AI call
      const batch = db.batch();

      // Add call log
      const logRef = db.collection('ai_call_logs').doc();
      batch.set(logRef, {
        providerId,
        subscriptionId: providerId,
        callType,
        provider: provider || null,
        model: model || null,
        inputTokens,
        outputTokens,
        totalTokens,
        success,
        errorMessage: errorMessage || null,
        durationMs,
        bookingId: bookingId || null,
        conversationId: conversationId || null,
        validatedServerSide: true,
        createdAt: now
      });

      // Update usage counters
      const usageRef = db.doc(`ai_usage/${providerId}`);
      const isInTrial = subDoc.exists && subDoc.data()?.status === 'trialing';

      if (isInTrial) {
        batch.update(usageRef, {
          trialCallsUsed: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });
        // Update quota info with new values
        quotaInfo.currentUsage = (quotaInfo.currentUsage as number) + 1;
        quotaInfo.remaining = Math.max(0, (quotaInfo.remaining as number) - 1);
        if (quotaInfo.trialCallsRemaining !== undefined) {
          quotaInfo.trialCallsRemaining = Math.max(0, (quotaInfo.trialCallsRemaining as number) - 1);
        }
      } else {
        batch.update(usageRef, {
          currentPeriodCalls: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });
        // Update quota info with new values (unless unlimited)
        quotaInfo.currentUsage = (quotaInfo.currentUsage as number) + 1;
        if ((quotaInfo.remaining as number) !== -1) {
          quotaInfo.remaining = Math.max(0, (quotaInfo.remaining as number) - 1);
        }
      }

      await batch.commit();

      return {
        ...quotaInfo,
        recorded: true,
        success: true
      };

    } catch (error: unknown) {
      console.error('Error processing AI call:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to process AI call');
    }
  });

// ============================================================================
// STRIPE WEBHOOKS - DEPRECATED
// ============================================================================
// P0 FIX: This webhook is DISABLED to avoid conflict with the main stripeWebhook in index.ts (line 1814)
// The main webhook handles ALL Stripe events including subscriptions.
// This duplicate webhook was causing:
// - 684 "other errors"
// - 6 HTTP 503 errors
// - 1 timeout
// Because it uses SDK v1 without proper secrets configuration (process.env vs Firebase Secrets)
//
// DO NOT RE-ENABLE THIS WEBHOOK. All subscription events are handled by the main webhook.
// ============================================================================

// DISABLED: export const stripeWebhook = functions
// @ts-ignore - v1 functions.https.onRequest API (disabled function)
export const _stripeWebhook_DISABLED = functions
  .region('europe-west1')
  .runWith({})
  .https.onRequest(async (_req, res) => {
    // P0 FIX: This function is disabled - returning 410 Gone
    console.warn('[DEPRECATED] subscription/stripeWebhook called but is disabled. Use main stripeWebhook instead.');
    res.status(410).send('This webhook endpoint is deprecated. Use the main stripeWebhook endpoint.');
    // Original webhook logic removed — now lives in ./webhooks.ts
  });
// LEGACY WEBHOOK HANDLERS (Deprecated - Now using ./webhooks.ts)
// These handlers are kept for reference but are no longer used.
// The new enhanced handlers in webhooks.ts provide:
// - Better logging and audit trail (subscription_logs collection)
// - Email notifications via notificationPipeline
// - Upgrade/downgrade detection with immediate/scheduled application
// - AI access management with quota reset
// - Trial to free plan conversion on cancellation
// ============================================================================

// NOTE: All handlers below are deprecated. See webhooks.ts for the new implementations:
// - handleSubscriptionCreated: Creates subscription doc, initializes AI usage, sends welcome email
// - handleSubscriptionUpdated: Detects upgrades/downgrades, handles cancel_at_period_end
// - handleSubscriptionDeleted: Sets status to canceled, disables AI access, returns to trial
// - handleTrialWillEnd: Sends 3-day reminder email
// - handleInvoicePaid: Resets monthly quota, sends renewal confirmation
// - handleInvoicePaymentFailed: Sets past_due, creates dunning record, disables access after 7 days

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Helper: Check if user is admin (via custom claims OR Firestore role)
 */
// @ts-ignore - v1 CallableContext type (used by v1 functions above)
async function isAdmin(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth) return false;

  // Check custom claims first (faster)
  if (context.auth.token.admin === true || context.auth.token.role === 'admin') {
    return true;
  }

  // Fallback: check Firestore user document
  try {
    const userDoc = await getDb().collection('users').doc(context.auth.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.role === 'admin' || userData?.isAdmin === true;
    }
  } catch (e) {
    console.error('Error checking admin in Firestore:', e);
  }

  return false;
}

/**
 * Helper: Check if user is admin (V2 API - for onCall v2 functions)
 */
async function isAdminV2(request: { auth?: { uid: string; token: { admin?: boolean; role?: string; email?: string } } }): Promise<boolean> {
  if (!request.auth) return false;

  // Check custom claims first (faster)
  if (request.auth.token.admin === true || request.auth.token.role === 'admin') {
    return true;
  }

  // Fallback: check Firestore user document
  try {
    const userDoc = await getDb().collection('users').doc(request.auth.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.role === 'admin' || userData?.isAdmin === true;
    }
  } catch (e) {
    console.error('Error checking admin in Firestore:', e);
  }

  return false;
}

/**
 * Update trial configuration (Admin only) - V2 with CORS support
 */
export const updateTrialConfig = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdminV2(request)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const data = request.data;
    const { durationDays, maxAiCalls, isEnabled } = data as {
      durationDays?: number;
      maxAiCalls?: number;
      isEnabled?: boolean;
    };

    const updates: any = {
      'trial.updatedAt': admin.firestore.Timestamp.now(),
      'trial.updatedBy': request.auth!.uid
    };

    if (durationDays !== undefined) updates['trial.durationDays'] = durationDays;
    if (maxAiCalls !== undefined) updates['trial.maxAiCalls'] = maxAiCalls;
    if (isEnabled !== undefined) updates['trial.isEnabled'] = isEnabled;

    // Get previous config for audit
    const prevDoc = await getDb().doc('settings/subscription').get();
    const previousValue = prevDoc.exists ? prevDoc.data()?.trial : null;

    await getDb().doc('settings/subscription').set(updates, { merge: true });

    // AUDIT LOG: Track admin action
    await logAdminAction({
      action: 'UPDATE_TRIAL_CONFIG',
      adminId: request.auth!.uid,
      adminEmail: request.auth!.token.email,
      targetId: 'subscription',
      targetType: 'settings',
      previousValue,
      newValue: { durationDays, maxAiCalls, isEnabled }
    });

    return { success: true };
  });

/**
 * Update plan pricing (Admin only) - V2 with CORS support
 */
export const updatePlanPricing = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdminV2(request)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const data = request.data;

    // Type for multilingual text (9 languages)
    type MultilingualText = {
      fr: string;
      en: string;
      es: string;
      de: string;
      pt: string;
      ru: string;
      hi: string;
      ar: string;
      ch: string;
    };

    const { planId, pricing, annualPricing, stripePriceIds, stripePriceIdsAnnual, aiCallsLimit, annualDiscountPercent, name, description } = data as {
      planId: string;
      pricing?: { EUR: number; USD: number };
      annualPricing?: { EUR: number; USD: number } | null;
      stripePriceIds?: { EUR: string; USD: string };
      stripePriceIdsAnnual?: { EUR: string; USD: string };
      aiCallsLimit?: number;
      annualDiscountPercent?: number;
      name?: MultilingualText;
      description?: MultilingualText;
    };

    const updates: any = {
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (pricing) updates.pricing = pricing;
    if (annualPricing !== undefined) {
      if (annualPricing === null) {
        // Supprimer le prix annuel custom (utiliser le calcul automatique)
        updates.annualPricing = admin.firestore.FieldValue.delete();
      } else {
        updates.annualPricing = annualPricing;
      }
    }
    if (stripePriceIds) updates.stripePriceId = stripePriceIds;
    if (stripePriceIdsAnnual) updates.stripePriceIdAnnual = stripePriceIdsAnnual;
    if (aiCallsLimit !== undefined) updates.aiCallsLimit = aiCallsLimit;
    if (annualDiscountPercent !== undefined) updates.annualDiscountPercent = annualDiscountPercent;
    if (name) updates.name = name;
    if (description) updates.description = description;

    // Get previous plan for audit
    const prevDoc = await getDb().doc(`subscription_plans/${planId}`).get();
    const previousValue = prevDoc.exists ? prevDoc.data() : null;

    await getDb().doc(`subscription_plans/${planId}`).update(updates);

    // COST OPTIMIZATION: Invalidate caches after plan update
    clearPlanCache();
    console.log(`[CACHE] Plan cache invalidated after updating plan ${planId}`);

    // AUDIT LOG: Track admin action
    await logAdminAction({
      action: 'UPDATE_PLAN_PRICING',
      adminId: request.auth!.uid,
      adminEmail: request.auth!.token.email,
      targetId: planId,
      targetType: 'subscription_plan',
      previousValue: previousValue ? { pricing: previousValue.pricing, aiCallsLimit: previousValue.aiCallsLimit } : null,
      newValue: { pricing, annualPricing, aiCallsLimit, annualDiscountPercent }
    });

    return { success: true };
  });

/**
 * Update trial configuration (Admin only) - V2 with CORS support
 * DUPLICATE: Exact copy of updateTrialConfig for frontend migration to V2 names
 */
export const updateTrialConfigV2 = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdminV2(request)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const data = request.data;
    const { durationDays, maxAiCalls, isEnabled } = data as {
      durationDays?: number;
      maxAiCalls?: number;
      isEnabled?: boolean;
    };

    const updates: any = {
      'trial.updatedAt': admin.firestore.Timestamp.now(),
      'trial.updatedBy': request.auth!.uid
    };

    if (durationDays !== undefined) updates['trial.durationDays'] = durationDays;
    if (maxAiCalls !== undefined) updates['trial.maxAiCalls'] = maxAiCalls;
    if (isEnabled !== undefined) updates['trial.isEnabled'] = isEnabled;

    // Get previous config for audit
    const prevDoc = await getDb().doc('settings/subscription').get();
    const previousValue = prevDoc.exists ? prevDoc.data()?.trial : null;

    await getDb().doc('settings/subscription').set(updates, { merge: true });

    // AUDIT LOG: Track admin action
    await logAdminAction({
      action: 'UPDATE_TRIAL_CONFIG',
      adminId: request.auth!.uid,
      adminEmail: request.auth!.token.email,
      targetId: 'subscription',
      targetType: 'settings',
      previousValue,
      newValue: { durationDays, maxAiCalls, isEnabled }
    });

    return { success: true };
  });

/**
 * Update plan pricing (Admin only) - V2 with CORS support
 * DUPLICATE: Exact copy of updatePlanPricing for frontend migration to V2 names
 */
export const updatePlanPricingV2 = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdminV2(request)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const data = request.data;

    // Type for multilingual text (9 languages)
    type MultilingualText = {
      fr: string;
      en: string;
      es: string;
      de: string;
      pt: string;
      ru: string;
      hi: string;
      ar: string;
      ch: string;
    };

    const { planId, pricing, annualPricing, stripePriceIds, stripePriceIdsAnnual, aiCallsLimit, annualDiscountPercent, name, description } = data as {
      planId: string;
      pricing?: { EUR: number; USD: number };
      annualPricing?: { EUR: number; USD: number } | null;
      stripePriceIds?: { EUR: string; USD: string };
      stripePriceIdsAnnual?: { EUR: string; USD: string };
      aiCallsLimit?: number;
      annualDiscountPercent?: number;
      name?: MultilingualText;
      description?: MultilingualText;
    };

    const updates: any = {
      updatedAt: admin.firestore.Timestamp.now()
    };

    if (pricing) updates.pricing = pricing;
    if (annualPricing !== undefined) {
      if (annualPricing === null) {
        // Supprimer le prix annuel custom (utiliser le calcul automatique)
        updates.annualPricing = admin.firestore.FieldValue.delete();
      } else {
        updates.annualPricing = annualPricing;
      }
    }
    if (stripePriceIds) updates.stripePriceId = stripePriceIds;
    if (stripePriceIdsAnnual) updates.stripePriceIdAnnual = stripePriceIdsAnnual;
    if (aiCallsLimit !== undefined) updates.aiCallsLimit = aiCallsLimit;
    if (annualDiscountPercent !== undefined) updates.annualDiscountPercent = annualDiscountPercent;
    if (name) updates.name = name;
    if (description) updates.description = description;

    // Get previous plan for audit
    const prevDoc = await getDb().doc(`subscription_plans/${planId}`).get();
    const previousValue = prevDoc.exists ? prevDoc.data() : null;

    await getDb().doc(`subscription_plans/${planId}`).update(updates);

    // COST OPTIMIZATION: Invalidate caches after plan update
    clearPlanCache();
    console.log(`[CACHE] Plan cache invalidated after updating plan ${planId}`);

    // AUDIT LOG: Track admin action
    await logAdminAction({
      action: 'UPDATE_PLAN_PRICING',
      adminId: request.auth!.uid,
      adminEmail: request.auth!.token.email,
      targetId: planId,
      targetType: 'subscription_plan',
      previousValue: previousValue ? { pricing: previousValue.pricing, aiCallsLimit: previousValue.aiCallsLimit } : null,
      newValue: { pricing, annualPricing, aiCallsLimit, annualDiscountPercent }
    });

    return { success: true };
  });

/**
 * Initialize default subscription plans (Run once)
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const initializeSubscriptionPlans = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (_data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const batch = getDb().batch();
    const now = admin.firestore.Timestamp.now();

    // Lawyer plans - Tarifs officiels
    const lawyerPlans = [
      { tier: 'basic', pricing: { EUR: 19, USD: 25 }, aiCallsLimit: 5, sortOrder: 1 },
      { tier: 'standard', pricing: { EUR: 49, USD: 59 }, aiCallsLimit: 15, sortOrder: 2 },
      { tier: 'pro', pricing: { EUR: 79, USD: 95 }, aiCallsLimit: 30, sortOrder: 3 },
      { tier: 'unlimited', pricing: { EUR: 119, USD: 145 }, aiCallsLimit: -1, sortOrder: 4 }
    ];

    // Expat plans
    const expatPlans = [
      { tier: 'basic', pricing: { EUR: 9, USD: 9 }, aiCallsLimit: 5, sortOrder: 1 },
      { tier: 'standard', pricing: { EUR: 19, USD: 24 }, aiCallsLimit: 15, sortOrder: 2 },
      { tier: 'pro', pricing: { EUR: 29, USD: 34 }, aiCallsLimit: 30, sortOrder: 3 },
      { tier: 'unlimited', pricing: { EUR: 49, USD: 59 }, aiCallsLimit: -1, sortOrder: 4 }
    ];

    // Plan names in all 9 languages
    const planNames: Record<string, Record<string, string>> = {
      basic: {
        fr: 'Basic', en: 'Basic', es: 'Básico', de: 'Basis',
        pt: 'Básico', ru: 'Базовый', hi: 'बेसिक', ar: 'أساسي', ch: '基础'
      },
      standard: {
        fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard',
        pt: 'Padrão', ru: 'Стандартный', hi: 'स्टैंडर्ड', ar: 'قياسي', ch: '标准'
      },
      pro: {
        fr: 'Pro', en: 'Pro', es: 'Pro', de: 'Pro',
        pt: 'Pro', ru: 'Про', hi: 'प्रो', ar: 'احترافي', ch: '专业'
      },
      unlimited: {
        fr: 'Illimité', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt',
        pt: 'Ilimitado', ru: 'Безлимитный', hi: 'असीमित', ar: 'غير محدود', ch: '无限'
      }
    };

    // Description templates in all 9 languages
    const getDescription = (_tier: string, aiCallsLimit: number) => {
      const isUnlimited = aiCallsLimit === -1;
      return {
        fr: isUnlimited ? 'Appels illimités par mois' : `${aiCallsLimit} appels par mois`,
        en: isUnlimited ? 'Unlimited calls per month' : `${aiCallsLimit} calls per month`,
        es: isUnlimited ? 'Llamadas ilimitadas por mes' : `${aiCallsLimit} llamadas por mes`,
        de: isUnlimited ? 'Unbegrenzte Anrufe pro Monat' : `${aiCallsLimit} Anrufe pro Monat`,
        pt: isUnlimited ? 'Chamadas ilimitadas por mês' : `${aiCallsLimit} chamadas por mês`,
        ru: isUnlimited ? 'Безлимитные звонки в месяц' : `${aiCallsLimit} звонков в месяц`,
        hi: isUnlimited ? 'प्रति माह असीमित कॉल' : `प्रति माह ${aiCallsLimit} कॉल`,
        ar: isUnlimited ? 'مكالمات غير محدودة شهرياً' : `${aiCallsLimit} مكالمات شهرياً`,
        ch: isUnlimited ? '每月无限通话' : `每月${aiCallsLimit}次通话`
      };
    };

    const createPlan = (
      providerType: ProviderType,
      plan: typeof lawyerPlans[0]
    ) => ({
      providerType,
      tier: plan.tier,
      pricing: plan.pricing,
      aiCallsLimit: plan.aiCallsLimit,
      sortOrder: plan.sortOrder,
      stripePriceId: { EUR: '', USD: '' }, // To be filled with Stripe price IDs
      isActive: true,
      name: planNames[plan.tier] || {
        fr: plan.tier, en: plan.tier, es: plan.tier, de: plan.tier,
        pt: plan.tier, ru: plan.tier, hi: plan.tier, ar: plan.tier, ch: plan.tier
      },
      description: getDescription(plan.tier, plan.aiCallsLimit),
      createdAt: now,
      updatedAt: now
    });

    // Create lawyer plans
    for (const plan of lawyerPlans) {
      const planId = `lawyer_${plan.tier}`;
      batch.set(getDb().doc(`subscription_plans/${planId}`), createPlan('lawyer', plan));
    }

    // Create expat plans
    for (const plan of expatPlans) {
      const planId = `expat_aidant_${plan.tier}`;
      batch.set(getDb().doc(`subscription_plans/${planId}`), createPlan('expat_aidant', plan));
    }

    // Initialize trial config
    batch.set(getDb().doc('settings/subscription'), {
      trial: {
        durationDays: 30,
        maxAiCalls: 3,
        isEnabled: true,
        updatedAt: now,
        updatedBy: context.auth!.uid
      }
    }, { merge: true });

    await batch.commit();

    return { success: true, message: 'Subscription plans initialized' };
  });

/**
 * Grant or revoke free AI access for a user (Admin only)
 * This bypasses subscription requirements
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const setFreeAiAccess = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, grant, note } = data as {
      userId: string;
      grant: boolean;
      note?: string;
    };

    if (!userId) {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    try {
      const userRef = getDb().doc(`users/${userId}`);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
      }

      const now = admin.firestore.Timestamp.now();

      const previousValue = userDoc.data()?.forceAiAccess || false;

      if (grant) {
        await userRef.update({
          forceAiAccess: true,
          freeAccessGrantedBy: context.auth!.uid,
          freeAccessGrantedAt: now,
          freeAccessNote: note || 'Accès gratuit accordé par administrateur',
          updatedAt: now
        });

        console.log(`✅ Free AI access granted to user ${userId} by admin ${context.auth!.uid}`);
      } else {
        await userRef.update({
          forceAiAccess: false,
          freeAccessRevokedBy: context.auth!.uid,
          freeAccessRevokedAt: now,
          updatedAt: now
        });

        console.log(`❌ Free AI access revoked from user ${userId} by admin ${context.auth!.uid}`);
      }

      // AUDIT LOG: Track admin action
      await logAdminAction({
        action: grant ? 'GRANT_FREE_AI_ACCESS' : 'REVOKE_FREE_AI_ACCESS',
        adminId: context.auth!.uid,
        adminEmail: context.auth!.token.email,
        targetId: userId,
        targetType: 'user',
        previousValue: { forceAiAccess: previousValue },
        newValue: { forceAiAccess: grant },
        metadata: { note }
      });

      return {
        success: true,
        userId,
        freeAiAccess: grant,
        message: grant ? 'Accès IA gratuit accordé' : 'Accès IA gratuit révoqué'
      };
    } catch (error: unknown) {
      console.error('Error setting free AI access:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to update access');
    }
  });

/**
 * Create annual Stripe prices for all plans (Admin only)
 * This creates the yearly prices in Stripe and updates Firestore
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const createAnnualStripePrices = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // Get global annual discount from settings
      const settingsDoc = await db.doc('settings/subscription').get();
      const globalDiscount = settingsDoc.exists && settingsDoc.data()?.annualDiscountPercent
        ? settingsDoc.data()!.annualDiscountPercent
        : DEFAULT_ANNUAL_DISCOUNT_PERCENT;

      // Get all active plans
      const plansSnapshot = await db.collection('subscription_plans')
        .where('isActive', '==', true)
        .get();

      if (plansSnapshot.empty) {
        return { success: false, message: 'No active plans found' };
      }

      const results: Array<{ planId: string; success: boolean; priceIds?: { EUR: string; USD: string }; error?: string }> = [];

      for (const planDoc of plansSnapshot.docs) {
        const plan = planDoc.data();
        const planId = planDoc.id;

        // Skip if already has annual prices
        if (plan.stripePriceIdAnnual?.EUR && plan.stripePriceIdAnnual?.USD) {
          results.push({ planId, success: true, priceIds: plan.stripePriceIdAnnual, error: 'Already has annual prices' });
          continue;
        }

        try {
          const discount = plan.annualDiscountPercent ?? globalDiscount;
          const annualPriceEUR = plan.annualPricing?.EUR ?? calculateAnnualPrice(plan.pricing.EUR, discount);
          const annualPriceUSD = plan.annualPricing?.USD ?? calculateAnnualPrice(plan.pricing.USD, discount);

          // Create Stripe product if needed (or get existing)
          let productId: string;

          // Try to get product from existing monthly price
          if (plan.stripePriceId?.EUR) {
            try {
              const existingPrice = await stripeClient.prices.retrieve(plan.stripePriceId.EUR);
              productId = existingPrice.product as string;
            } catch {
              // Create new product
              const product = await stripeClient.products.create({
                name: `${plan.name?.fr || planId} - ${plan.providerType === 'lawyer' ? 'Avocat' : 'Expatrié'}`,
                description: plan.description?.fr || `Plan ${plan.tier}`,
                metadata: {
                  planId,
                  providerType: plan.providerType,
                  tier: plan.tier
                }
              });
              productId = product.id;
            }
          } else {
            // Create new product
            const product = await stripeClient.products.create({
              name: `${plan.name?.fr || planId} - ${plan.providerType === 'lawyer' ? 'Avocat' : 'Expatrié'}`,
              description: plan.description?.fr || `Plan ${plan.tier}`,
              metadata: {
                planId,
                providerType: plan.providerType,
                tier: plan.tier
              }
            });
            productId = product.id;
          }

          // Create annual EUR price
          const annualPriceEURStripe = await stripeClient.prices.create({
            product: productId,
            unit_amount: Math.round(annualPriceEUR * 100), // Stripe uses cents
            currency: 'eur',
            recurring: {
              interval: 'year',
              interval_count: 1
            },
            metadata: {
              planId,
              providerType: plan.providerType,
              tier: plan.tier,
              billingPeriod: 'yearly',
              discountPercent: discount.toString()
            },
            nickname: `${plan.name?.fr || planId} - Annuel EUR`
          });

          // Create annual USD price
          const annualPriceUSDStripe = await stripeClient.prices.create({
            product: productId,
            unit_amount: Math.round(annualPriceUSD * 100),
            currency: 'usd',
            recurring: {
              interval: 'year',
              interval_count: 1
            },
            metadata: {
              planId,
              providerType: plan.providerType,
              tier: plan.tier,
              billingPeriod: 'yearly',
              discountPercent: discount.toString()
            },
            nickname: `${plan.name?.fr || planId} - Annuel USD`
          });

          // Update Firestore with new price IDs
          await db.doc(`subscription_plans/${planId}`).update({
            stripePriceIdAnnual: {
              EUR: annualPriceEURStripe.id,
              USD: annualPriceUSDStripe.id
            },
            annualPricing: {
              EUR: annualPriceEUR,
              USD: annualPriceUSD
            },
            annualDiscountPercent: discount,
            updatedAt: admin.firestore.Timestamp.now()
          });

          results.push({
            planId,
            success: true,
            priceIds: {
              EUR: annualPriceEURStripe.id,
              USD: annualPriceUSDStripe.id
            }
          });

          console.log(`✅ Created annual prices for plan ${planId}: EUR=${annualPriceEURStripe.id}, USD=${annualPriceUSDStripe.id}`);
        } catch (planError: any) {
          console.error(`❌ Failed to create annual prices for plan ${planId}:`, planError);
          results.push({
            planId,
            success: false,
            error: planError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return {
        success: failCount === 0,
        message: `Created annual prices for ${successCount} plans. ${failCount} failed.`,
        results
      };
    } catch (error: unknown) {
      console.error('Error creating annual Stripe prices:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to create annual prices');
    }
  });

/**
 * Create monthly Stripe prices for all plans (Admin only)
 * Use this if monthly prices are missing
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const createMonthlyStripePrices = functions
  .runWith({ secrets: [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST] })
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // Get all active plans
      const plansSnapshot = await db.collection('subscription_plans')
        .where('isActive', '==', true)
        .get();

      if (plansSnapshot.empty) {
        return { success: false, message: 'No active plans found' };
      }

      const results: Array<{ planId: string; success: boolean; priceIds?: { EUR: string; USD: string }; error?: string }> = [];

      for (const planDoc of plansSnapshot.docs) {
        const plan = planDoc.data();
        const planId = planDoc.id;

        // Skip if already has monthly prices
        if (plan.stripePriceId?.EUR && plan.stripePriceId?.USD) {
          results.push({ planId, success: true, priceIds: plan.stripePriceId, error: 'Already has monthly prices' });
          continue;
        }

        try {
          // Create Stripe product
          const product = await stripeClient.products.create({
            name: `${plan.name?.fr || planId} - ${plan.providerType === 'lawyer' ? 'Avocat' : 'Expatrié'}`,
            description: plan.description?.fr || `Plan ${plan.tier}`,
            metadata: {
              planId,
              providerType: plan.providerType,
              tier: plan.tier
            }
          });

          // Create monthly EUR price
          const monthlyPriceEUR = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.pricing.EUR * 100),
            currency: 'eur',
            recurring: {
              interval: 'month',
              interval_count: 1
            },
            metadata: {
              planId,
              providerType: plan.providerType,
              tier: plan.tier,
              billingPeriod: 'monthly'
            },
            nickname: `${plan.name?.fr || planId} - Mensuel EUR`
          });

          // Create monthly USD price
          const monthlyPriceUSD = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.pricing.USD * 100),
            currency: 'usd',
            recurring: {
              interval: 'month',
              interval_count: 1
            },
            metadata: {
              planId,
              providerType: plan.providerType,
              tier: plan.tier,
              billingPeriod: 'monthly'
            },
            nickname: `${plan.name?.fr || planId} - Mensuel USD`
          });

          // Update Firestore with new price IDs
          await db.doc(`subscription_plans/${planId}`).update({
            stripePriceId: {
              EUR: monthlyPriceEUR.id,
              USD: monthlyPriceUSD.id
            },
            updatedAt: admin.firestore.Timestamp.now()
          });

          results.push({
            planId,
            success: true,
            priceIds: {
              EUR: monthlyPriceEUR.id,
              USD: monthlyPriceUSD.id
            }
          });

          console.log(`✅ Created monthly prices for plan ${planId}: EUR=${monthlyPriceEUR.id}, USD=${monthlyPriceUSD.id}`);
        } catch (planError: any) {
          console.error(`❌ Failed to create monthly prices for plan ${planId}:`, planError);
          results.push({
            planId,
            success: false,
            error: planError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return {
        success: failCount === 0,
        message: `Created monthly prices for ${successCount} plans. ${failCount} failed.`,
        results
      };
    } catch (error: unknown) {
      console.error('Error creating monthly Stripe prices:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Failed to create monthly prices');
    }
  });

/**
 * Migrate existing plans to 9 languages (Admin only)
 * Run this once to update existing plans with all 9 language translations
 */
// @ts-ignore - v1 functions.https.onCall API (planned migration to v2)
export const migrateSubscriptionPlansTo9Languages = functions
  .region('europe-west1')
  .runWith({})
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    // Plan names in all 9 languages
    const planNames: Record<string, Record<string, string>> = {
      basic: {
        fr: 'Basic', en: 'Basic', es: 'Básico', de: 'Basis',
        pt: 'Básico', ru: 'Базовый', hi: 'बेसिक', ar: 'أساسي', ch: '基础'
      },
      standard: {
        fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard',
        pt: 'Padrão', ru: 'Стандартный', hi: 'स्टैंडर्ड', ar: 'قياسي', ch: '标准'
      },
      pro: {
        fr: 'Pro', en: 'Pro', es: 'Pro', de: 'Pro',
        pt: 'Pro', ru: 'Про', hi: 'प्रो', ar: 'احترافي', ch: '专业'
      },
      unlimited: {
        fr: 'Illimité', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt',
        pt: 'Ilimitado', ru: 'Безлимитный', hi: 'असीमित', ar: 'غير محدود', ch: '无限'
      }
    };

    // Description templates
    const getDescription = (aiCallsLimit: number) => {
      const isUnlimited = aiCallsLimit === -1;
      return {
        fr: isUnlimited ? 'Appels illimités par mois' : `${aiCallsLimit} appels par mois`,
        en: isUnlimited ? 'Unlimited calls per month' : `${aiCallsLimit} calls per month`,
        es: isUnlimited ? 'Llamadas ilimitadas por mes' : `${aiCallsLimit} llamadas por mes`,
        de: isUnlimited ? 'Unbegrenzte Anrufe pro Monat' : `${aiCallsLimit} Anrufe pro Monat`,
        pt: isUnlimited ? 'Chamadas ilimitadas por mês' : `${aiCallsLimit} chamadas por mês`,
        ru: isUnlimited ? 'Безлимитные звонки в месяц' : `${aiCallsLimit} звонков в месяц`,
        hi: isUnlimited ? 'प्रति माह असीमित कॉल' : `प्रति माह ${aiCallsLimit} कॉल`,
        ar: isUnlimited ? 'مكالمات غير محدودة شهرياً' : `${aiCallsLimit} مكالمات شهرياً`,
        ch: isUnlimited ? '每月无限通话' : `每月${aiCallsLimit}次通话`
      };
    };

    try {
      const plansSnapshot = await getDb().collection('subscription_plans').get();
      const batch = getDb().batch();
      let updatedCount = 0;

      for (const doc of plansSnapshot.docs) {
        const plan = doc.data();
        const tier = (plan.tier as string) || 'basic';
        const aiCallsLimit = plan.aiCallsLimit as number || 5;

        // Skip plans without a valid tier
        if (!tier || typeof tier !== 'string') {
          console.warn(`Skipping plan ${doc.id} - no valid tier`);
          continue;
        }

        // Handle case where plan.name might be a string or undefined
        const existingName = typeof plan.name === 'object' && plan.name !== null ? plan.name : {};
        const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1);

        // Get 9-language name - use predefined names or build from existing
        const name = planNames[tier] || {
          fr: existingName.fr || tierCapitalized,
          en: existingName.en || tierCapitalized,
          es: existingName.es || existingName.fr || tierCapitalized,
          de: existingName.de || existingName.en || tierCapitalized,
          pt: existingName.pt || existingName.fr || tierCapitalized,
          ru: existingName.ru || existingName.en || tierCapitalized,
          hi: existingName.hi || existingName.en || tierCapitalized,
          ar: existingName.ar || existingName.en || tierCapitalized,
          ch: existingName.ch || existingName.en || tierCapitalized
        };

        // Get 9-language description
        const description = getDescription(aiCallsLimit);

        batch.update(doc.ref, {
          name,
          description,
          updatedAt: admin.firestore.Timestamp.now()
        });

        updatedCount++;
      }

      await batch.commit();

      return {
        success: true,
        message: `Migrated ${updatedCount} plans to 9 languages`
      };
    } catch (error: unknown) {
      console.error('Error migrating plans:', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'Migration failed');
    }
  });

// ============================================================================
// HELPER: Map Stripe status to our status
// ============================================================================

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired';
    case 'paused':
      return 'paused';
    default:
      return 'expired';
  }
}

// ============================================================================
// SCHEDULED: Monthly Quota Reset
// ============================================================================
// P1 FIX: REMOVED - Duplicate function!
// Use resetMonthlyQuotas from scheduledTasks.ts instead (v2 with better error handling)

// ============================================================================
// ADMIN FUNCTIONS (Subscription Management)
// ============================================================================

export {
  adminForceAiAccess,
  adminResetQuota,
  adminChangePlan,
  adminCancelSubscription,
  adminGetSubscriptionStats,
  adminSyncStripePrices,
  adminGetProviderSubscriptionHistory,
  // P0 FIX: Export new pause/resume functions for admin
  adminPauseSubscription,
  adminResumeSubscription,
} from './adminFunctions';


// ============================================================================
// BILLING PORTAL (Facturation)
// ============================================================================

export { getBillingPortalUrl, detectStripeLocale } from './billingPortal';

// ============================================================================
// STRIPE SYNC (Synchronisation des plans avec Stripe)
// ============================================================================

export {
  syncSubscriptionPlansToStripe,
  updateStripePrices,
  deactivateStripePlan,
  reactivateStripePlan,
  // Trigger automatique: sync prix Firestore -> Stripe
  onSubscriptionPlanPricingUpdate,
} from './stripeSync';

// ============================================================================
// WEBHOOK HANDLERS (Exported for testing and direct use)
// ============================================================================

export {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionPaused,
  handleSubscriptionResumed,
  handleTrialWillEnd,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoiceCreated,
  handlePaymentMethodUpdated,
  handleChargeRefunded,
  handleTransferUpdated,
  handleTransferFailed,
  webhookHandlers,
} from './webhooks';

// Dead Letter Queue exports
export {
  addToDeadLetterQueue,
  markAsResolved,
  getEventsToRetry,
  getDLQStats,
  forceRetry,
  cleanupOldEntries
} from './deadLetterQueue';

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

export {
  sendSubscriptionEmail,
  notifySubscriptionCreated,
  notifySubscriptionRenewed,
  notifyQuotaAlert,
  notifyPaymentFailed,
  notifySubscriptionCanceled,
  notifyTrialEnding,
  notifySubscriptionExpired,
  notifySubscriptionUpgraded,
  notifySubscriptionDowngradeScheduled,
  notifySubscriptionReactivated,
  notifyAccountSuspended,
  subscriptionEmailNotifications,
} from './emailNotifications';
