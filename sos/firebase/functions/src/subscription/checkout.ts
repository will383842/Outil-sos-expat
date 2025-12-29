/**
 * SOS-Expat Subscription Checkout Cloud Function
 * Creates Stripe Checkout Sessions for subscription plans
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as logger from 'firebase-functions/logger';
import { createCheckoutSchema, validateInput } from './validation';

// ============================================================================
// SECRETS & PARAMS
// ============================================================================

const STRIPE_SECRET_KEY_TEST = defineSecret('STRIPE_SECRET_KEY_TEST');
const STRIPE_SECRET_KEY_LIVE = defineSecret('STRIPE_SECRET_KEY_LIVE');
const STRIPE_MODE = defineString('STRIPE_MODE', { default: 'test' });

// ============================================================================
// TYPES
// ============================================================================

type Currency = 'EUR' | 'USD';
type BillingPeriod = 'monthly' | 'yearly';
type ProviderType = 'lawyer' | 'expat_aidant';

interface SubscriptionPlan {
  id: string;
  tier: string;
  providerType: ProviderType;
  pricing: { EUR: number; USD: number };
  annualPricing?: { EUR: number; USD: number };
  stripePriceId: { EUR: string; USD: string };
  stripePriceIdAnnual?: { EUR: string; USD: string };
  aiCallsLimit: number;
  isActive: boolean;
  trialDays?: number;
}

interface TrialConfig {
  durationDays: number;
  maxAiCalls: number;
  isEnabled: boolean;
}

interface CheckoutInput {
  planId: string;
  billingPeriod: BillingPeriod;
  /** Devise optionnelle - si non fournie, détectée automatiquement depuis le pays du provider */
  currency?: Currency;
}

interface CheckoutResult {
  sessionId: string;
  url: string;
}

// ============================================================================
// EURO ZONE COUNTRIES
// ============================================================================

/**
 * List of countries in the Eurozone (using EUR currency)
 * ISO 3166-1 alpha-2 country codes
 */
const EUROZONE_COUNTRIES = new Set([
  'AT', // Austria
  'BE', // Belgium
  'CY', // Cyprus
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PT', // Portugal
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'HR', // Croatia (joined 2023)
  // Monaco, San Marino, Vatican also use EUR but are not in this list
  // as they're rarely used for provider registration
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines if environment is in live mode
 */
function isLive(): boolean {
  return (STRIPE_MODE.value() || 'test').toLowerCase() === 'live';
}

/**
 * Gets the appropriate Stripe secret key based on mode
 */
function getStripeSecretKey(): string {
  return isLive()
    ? process.env.STRIPE_SECRET_KEY_LIVE || ''
    : process.env.STRIPE_SECRET_KEY_TEST || '';
}

/**
 * Creates a Stripe instance with the correct API key
 */
function createStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();

  if (!secretKey || !secretKey.startsWith('sk_')) {
    throw new HttpsError(
      'failed-precondition',
      `Stripe secret key not configured for mode: ${isLive() ? 'live' : 'test'}`
    );
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Get Firestore instance
 */
function getDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

/**
 * Detects the currency based on provider's country
 * Returns EUR for Eurozone countries, USD for all others
 */
function detectCurrencyFromCountry(countryCode: string | undefined): Currency {
  if (!countryCode) {
    return 'EUR'; // Default to EUR
  }

  const normalizedCode = countryCode.toUpperCase().trim();
  return EUROZONE_COUNTRIES.has(normalizedCode) ? 'EUR' : 'USD';
}

/**
 * Retrieves or creates a Stripe Customer for the provider
 */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  db: admin.firestore.Firestore,
  providerId: string,
  providerData: admin.firestore.DocumentData
): Promise<string> {
  // Check if provider already has a Stripe Customer ID in subscriptions collection
  const subscriptionDoc = await db.doc(`subscriptions/${providerId}`).get();

  if (subscriptionDoc.exists && subscriptionDoc.data()?.stripeCustomerId) {
    const customerId = subscriptionDoc.data()!.stripeCustomerId;
    logger.info('Using existing Stripe Customer', { providerId, customerId });
    return customerId;
  }

  // Check sos_profiles for existing customer ID
  const profileDoc = await db.doc(`sos_profiles/${providerId}`).get();
  if (profileDoc.exists && profileDoc.data()?.stripeCustomerId) {
    const customerId = profileDoc.data()!.stripeCustomerId;
    logger.info('Using existing Stripe Customer from sos_profiles', { providerId, customerId });
    return customerId;
  }

  // Create new Stripe Customer
  const email = providerData.email || '';
  const name = providerData.displayName ||
               providerData.fullName ||
               `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() ||
               'Provider';

  logger.info('Creating new Stripe Customer', { providerId, email, name });

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      providerId,
      source: 'sos-expat-subscription',
      createdAt: new Date().toISOString(),
    },
  });

  // Save the customer ID to subscriptions collection
  await db.doc(`subscriptions/${providerId}`).set(
    { stripeCustomerId: customer.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  logger.info('Stripe Customer created', { providerId, customerId: customer.id });
  return customer.id;
}

/**
 * Fetches the subscription plan from Firestore
 */
async function getSubscriptionPlan(
  db: admin.firestore.Firestore,
  planId: string
): Promise<SubscriptionPlan | null> {
  const planDoc = await db.doc(`subscription_plans/${planId}`).get();

  if (!planDoc.exists) {
    return null;
  }

  return { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;
}

/**
 * Fetches the trial configuration
 */
async function getTrialConfig(db: admin.firestore.Firestore): Promise<TrialConfig> {
  const settingsDoc = await db.doc('settings/subscription').get();

  if (!settingsDoc.exists || !settingsDoc.data()?.trial) {
    return { durationDays: 30, maxAiCalls: 3, isEnabled: true };
  }

  return settingsDoc.data()!.trial;
}

/**
 * Checks if the provider is eligible for a trial
 */
async function isProviderEligibleForTrial(
  db: admin.firestore.Firestore,
  providerId: string
): Promise<boolean> {
  // Check if provider already had a subscription or trial
  const subscriptionDoc = await db.doc(`subscriptions/${providerId}`).get();

  if (!subscriptionDoc.exists) {
    return true; // No previous subscription, eligible for trial
  }

  const subData = subscriptionDoc.data();

  // If they've already used a trial, not eligible
  if (subData?.trialUsed || subData?.trialStartedAt) {
    logger.info('Provider already used trial', { providerId });
    return false;
  }

  // If they have or had an active subscription, not eligible
  if (subData?.status && ['active', 'past_due', 'canceled', 'expired'].includes(subData.status)) {
    logger.info('Provider already had subscription', { providerId, status: subData.status });
    return false;
  }

  return true;
}

/**
 * Domaines autorisés pour les redirections
 */
const ALLOWED_DOMAINS = [
  'sos-expat.com',
  'www.sos-expat.com',
  'outils-sos-expat.web.app',
  'outils-sos-expat.firebaseapp.com',
  'localhost'
];

/**
 * Valide et retourne l'URL de base de l'application
 * Protège contre les injections d'URL malveillantes
 */
function getAppBaseUrl(): string {
  const appUrl = process.env.APP_URL || 'https://sos-expat.com';

  try {
    const url = new URL(appUrl);
    const hostname = url.hostname;

    // Vérifier que le domaine est autorisé
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      logger.warn('APP_URL domain not in whitelist, using default', {
        appUrl,
        hostname
      });
      return 'https://sos-expat.com';
    }

    return appUrl;
  } catch {
    logger.warn('Invalid APP_URL, using default', { appUrl });
    return 'https://sos-expat.com';
  }
}

// ============================================================================
// MAIN CLOUD FUNCTION
// ============================================================================

/**
 * Creates a Stripe Checkout Session for subscription
 *
 * @param planId - The subscription plan ID from Firestore
 * @param billingPeriod - 'monthly' or 'yearly'
 * @returns sessionId and URL for redirect
 */
export const createSubscriptionCheckout = onCall<CheckoutInput, Promise<CheckoutResult>>(
  {
    region: 'europe-west1',
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request): Promise<CheckoutResult> => {
    const startTime = Date.now();

    // ========================================================================
    // 1. Authentication Check
    // ========================================================================

    if (!request.auth) {
      logger.error('Authentication required', { function: 'createSubscriptionCheckout' });
      throw new HttpsError('unauthenticated', 'User must be authenticated to create a subscription checkout');
    }

    const providerId = request.auth.uid;

    // ========================================================================
    // 2. Input Validation with Zod
    // ========================================================================

    const validatedData = validateInput(createCheckoutSchema, request.data);
    const { planId, billingPeriod, currency: requestedCurrency } = validatedData;

    logger.info('createSubscriptionCheckout started', {
      providerId,
      planId,
      billingPeriod,
      mode: isLive() ? 'live' : 'test',
    });

    try {
      const db = getDb();
      const stripe = createStripeClient();

      // ======================================================================
      // 3. Fetch Subscription Plan
      // ======================================================================

      const plan = await getSubscriptionPlan(db, planId);

      if (!plan) {
        logger.error('Plan not found', { providerId, planId });
        throw new HttpsError('not-found', `Subscription plan "${planId}" not found`);
      }

      if (!plan.isActive) {
        logger.error('Plan is inactive', { providerId, planId });
        throw new HttpsError('failed-precondition', 'This subscription plan is no longer available');
      }

      logger.info('Plan retrieved', {
        providerId,
        planId,
        tier: plan.tier,
        providerType: plan.providerType,
      });

      // ======================================================================
      // 4. Fetch Provider Data
      // ======================================================================

      // Try multiple collections to find provider data
      let providerData: admin.firestore.DocumentData | null = null;
      let providerCountry: string | undefined;

      // Check sos_profiles first
      const sosProfileDoc = await db.doc(`sos_profiles/${providerId}`).get();
      if (sosProfileDoc.exists) {
        providerData = sosProfileDoc.data()!;
        providerCountry = providerData.currentCountry || providerData.country;
      }

      // Fallback to users collection
      if (!providerData) {
        const userDoc = await db.doc(`users/${providerId}`).get();
        if (userDoc.exists) {
          providerData = userDoc.data()!;
          providerCountry = providerData.currentCountry || providerData.country;
        }
      }

      // Fallback to providers collection
      if (!providerData) {
        const providerDoc = await db.doc(`providers/${providerId}`).get();
        if (providerDoc.exists) {
          providerData = providerDoc.data()!;
          providerCountry = providerData.currentCountry || providerData.country;
        }
      }

      if (!providerData) {
        logger.error('Provider not found', { providerId });
        throw new HttpsError('not-found', 'Provider profile not found');
      }

      // Determine provider type from data or plan
      const providerType: ProviderType =
        providerData.type === 'lawyer' || providerData.role === 'lawyer'
          ? 'lawyer'
          : 'expat_aidant';

      logger.info('Provider data retrieved', {
        providerId,
        providerCountry,
        providerType,
        email: providerData.email,
      });

      // ======================================================================
      // 5. Detect Currency Based on Country or Use Requested Currency
      // ======================================================================

      // Utiliser la devise demandée si fournie, sinon détecter depuis le pays
      const currency: Currency = requestedCurrency || detectCurrencyFromCountry(providerCountry);

      logger.info('Currency determined', {
        providerId,
        country: providerCountry,
        requestedCurrency,
        currency,
      });

      // ======================================================================
      // 6. Get or Create Stripe Customer
      // ======================================================================

      const customerId = await getOrCreateStripeCustomer(stripe, db, providerId, providerData);

      // ======================================================================
      // 7. Determine Price ID Based on Currency and Billing Period
      // ======================================================================

      let priceId: string;

      if (billingPeriod === 'yearly') {
        priceId = plan.stripePriceIdAnnual?.[currency] || '';

        if (!priceId) {
          logger.error('No annual price configured', { planId, currency });
          throw new HttpsError(
            'failed-precondition',
            `No annual price configured for ${currency}. Please contact support.`
          );
        }
      } else {
        priceId = plan.stripePriceId?.[currency] || '';

        if (!priceId) {
          logger.error('No monthly price configured', { planId, currency });
          throw new HttpsError(
            'failed-precondition',
            `No monthly price configured for ${currency}. Please contact support.`
          );
        }
      }

      logger.info('Price ID determined', {
        providerId,
        planId,
        billingPeriod,
        currency,
        priceId,
      });

      // ======================================================================
      // 8. Check Trial Eligibility
      // ======================================================================

      let trialPeriodDays: number | undefined;

      const trialConfig = await getTrialConfig(db);

      if (trialConfig.isEnabled) {
        const isEligible = await isProviderEligibleForTrial(db, providerId);

        if (isEligible) {
          // Use plan-specific trial days if available, otherwise use global config
          trialPeriodDays = plan.trialDays || trialConfig.durationDays;

          logger.info('Provider eligible for trial', {
            providerId,
            trialPeriodDays,
          });
        } else {
          logger.info('Provider not eligible for trial', { providerId });
        }
      }

      // ======================================================================
      // 9. Build Success and Cancel URLs
      // ======================================================================

      const baseUrl = getAppBaseUrl();
      const successUrl = `${baseUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/dashboard/subscription/plans?canceled=true`;

      // ======================================================================
      // 10. Create Stripe Checkout Session
      // ======================================================================

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        metadata: {
          providerId,
          planId,
          providerType,
          billingPeriod,
          currency,
          source: 'sos-expat-checkout',
        },
        subscription_data: {
          metadata: {
            providerId,
            planId,
            providerType,
          },
        },
      };

      // Add trial period if eligible
      if (trialPeriodDays && trialPeriodDays > 0) {
        sessionParams.subscription_data!.trial_period_days = trialPeriodDays;
      }

      logger.info('Creating Checkout Session', {
        providerId,
        planId,
        priceId,
        customerId,
        hasTrialDays: !!trialPeriodDays,
        trialPeriodDays,
      });

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.id || !session.url) {
        logger.error('Failed to create checkout session - no ID or URL', {
          providerId,
          sessionId: session.id,
        });
        throw new HttpsError('internal', 'Failed to create checkout session');
      }

      // ======================================================================
      // 11. Log Success and Return
      // ======================================================================

      const duration = Date.now() - startTime;

      logger.info('Checkout Session created successfully', {
        providerId,
        planId,
        sessionId: session.id,
        url: session.url,
        currency,
        billingPeriod,
        hasTrialDays: !!trialPeriodDays,
        durationMs: duration,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };

    } catch (error) {
      // ======================================================================
      // Error Handling
      // ======================================================================

      if (error instanceof HttpsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('createSubscriptionCheckout failed', {
        providerId,
        planId,
        billingPeriod,
        error: errorMessage,
        stack: errorStack,
      });

      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new HttpsError(
          'internal',
          `Stripe error: ${error.message}`
        );
      }

      throw new HttpsError(
        'internal',
        `Failed to create subscription checkout: ${errorMessage}`
      );
    }
  }
);
