/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck - Temporary: TypeScript strict mode disabled for v1/v2 API compatibility
/**
 * SOS-Expat Subscription Cloud Functions
 * Gestion des abonnements IA pour prestataires
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { MailwizzAPI } from '../emailMarketing/utils/mailwizz';
import { getLanguageCode } from '../emailMarketing/config';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Stripe (lazy)
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    // Migration: functions.config() deprecated - using env vars only (set via defineSecret)
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripe;
}

// Lazy db initialization
const getDb = () => admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

type ProviderType = 'lawyer' | 'expat_aidant';
type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';
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

async function getTrialConfig(): Promise<TrialConfig> {
  const settingsDoc = await getDb().doc('settings/subscription').get();
  if (!settingsDoc.exists || !settingsDoc.data()?.trial) {
    return { durationDays: 30, maxAiCalls: 3, isEnabled: true };
  }
  return settingsDoc.data()!.trial;
}

async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!planDoc.exists) return null;
  return { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;
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

export const createSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
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
        throw new functions.https.HttpsError('not-found', 'Plan not found or inactive');
      }

      // Get provider info
      const providerDoc = await getDb().doc(`providers/${providerId}`).get();
      if (!providerDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Provider not found');
      }
      const providerData = providerDoc.data()!;

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
          throw new functions.https.HttpsError('invalid-argument', `No annual price configured for ${currency}. Please contact support.`);
        }
      } else {
        priceId = plan.stripePriceId[currency];
        periodAmount = plan.pricing[currency];

        if (!priceId) {
          throw new functions.https.HttpsError('invalid-argument', `No monthly price configured for ${currency}`);
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
            providerType: plan.providerType
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
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to create subscription');
    }
  });

// ============================================================================
// UPDATE SUBSCRIPTION (Upgrade/Downgrade)
// ============================================================================

export const updateSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
    const { newPlanId } = data as { newPlanId: string };

    try {
      // Get current subscription
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      const subData = subDoc.data()!;
      const currency = subData.currency as Currency;

      // Get new plan
      const newPlan = await getSubscriptionPlan(newPlanId);
      if (!newPlan || !newPlan.isActive) {
        throw new functions.https.HttpsError('not-found', 'New plan not found or inactive');
      }

      // Get Stripe subscription to find item ID
      const stripeSubscription = await getStripe().subscriptions.retrieve(subData.stripeSubscriptionId);
      const subscriptionItemId = stripeSubscription.items.data[0].id;

      // Update subscription in Stripe
      const updatedSubscription = await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          items: [{
            id: subscriptionItemId,
            price: newPlan.stripePriceId[currency]
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            planId: newPlanId,
            providerType: newPlan.providerType
          }
        }
      );

      // Update Firestore
      await getDb().doc(`subscriptions/${providerId}`).update({
        planId: newPlanId,
        tier: newPlan.tier,
        stripePriceId: newPlan.stripePriceId[currency],
        currentPeriodAmount: newPlan.pricing[currency],
        updatedAt: admin.firestore.Timestamp.now()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to update subscription');
    }
  });

// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================

export const cancelSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
    const { cancelAtPeriodEnd = true, reason } = data as {
      cancelAtPeriodEnd?: boolean;
      reason?: string;
    };

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      const stripeSubscriptionId = subDoc.data()!.stripeSubscriptionId;

      if (cancelAtPeriodEnd) {
        // Cancel at end of billing period
        await getStripe().subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: { cancellation_reason: reason || 'user_requested' }
        });

        await getDb().doc(`subscriptions/${providerId}`).update({
          cancelAtPeriodEnd: true,
          canceledAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        });
      } else {
        // Cancel immediately
        await getStripe().subscriptions.cancel(stripeSubscriptionId);

        await getDb().doc(`subscriptions/${providerId}`).update({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to cancel subscription');
    }
  });

// ============================================================================
// REACTIVATE SUBSCRIPTION
// ============================================================================

export const reactivateSubscription = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data()!;
      if (!subData.cancelAtPeriodEnd) {
        throw new functions.https.HttpsError('failed-precondition', 'Subscription is not scheduled for cancellation');
      }

      // Reactivate in Stripe
      await getStripe().subscriptions.update(subData.stripeSubscriptionId, {
        cancel_at_period_end: false
      });

      // Update Firestore
      await getDb().doc(`subscriptions/${providerId}`).update({
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: 'active',
        updatedAt: admin.firestore.Timestamp.now()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to reactivate subscription');
    }
  });

// ============================================================================
// STRIPE CUSTOMER PORTAL
// ============================================================================

export const createStripePortalSession = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeCustomerId) {
        throw new functions.https.HttpsError('not-found', 'No Stripe customer found');
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: subDoc.data()!.stripeCustomerId,
        return_url: `${process.env.APP_URL || 'https://sos-expat.com'}/dashboard/subscription`
      });

      return { url: session.url };
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to create portal session');
    }
  });

// ============================================================================
// AI QUOTA CHECK (Called before AI requests)
// ============================================================================

export const checkAiQuota = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

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
    } catch (error: any) {
      console.error('Error checking AI quota:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to check quota');
    }
  });

// ============================================================================
// RECORD AI CALL (Called after successful AI request)
// ============================================================================

export const recordAiCall = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
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

    try {
      const batch = getDb().batch();
      const now = admin.firestore.Timestamp.now();

      // Add call log
      const logRef = getDb().collection('ai_call_logs').doc();
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
        createdAt: now
      });

      // Get current subscription to check if in trial
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      const isInTrial = subDoc.exists && subDoc.data()?.status === 'trialing';

      // Update usage counters
      const usageRef = getDb().doc(`ai_usage/${providerId}`);
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
    } catch (error: any) {
      console.error('Error recording AI call:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to record AI call');
    }
  });

// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================

export const stripeWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    // Migration: functions.config() deprecated - using env vars only (set via defineSecret)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await handleTrialEnding(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const providerId = subscription.metadata.providerId;
  if (!providerId) {
    console.error('No providerId in subscription metadata');
    return;
  }

  const now = admin.firestore.Timestamp.now();

  await getDb().doc(`subscriptions/${providerId}`).update({
    status: mapStripeStatus(subscription.status),
    stripePriceId: subscription.items.data[0]?.price.id,
    currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? admin.firestore.Timestamp.fromMillis(subscription.canceled_at * 1000)
      : null,
    updatedAt: now
  });

  // Reset period calls on renewal
  if (subscription.status === 'active') {
    await getDb().doc(`ai_usage/${providerId}`).update({
      currentPeriodCalls: 0,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      updatedAt: now
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const providerId = subscription.metadata.providerId;
  if (!providerId) return;

  await getDb().doc(`subscriptions/${providerId}`).update({
    status: 'expired',
    canceledAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string);
  const providerId = subscription.metadata.providerId;
  if (!providerId) return;

  const now = admin.firestore.Timestamp.now();

  // Store invoice in Firestore
  await getDb().collection('invoices').doc(invoice.id).set({
    stripeInvoiceId: invoice.id,
    providerId,
    subscriptionId: providerId,
    amountDue: invoice.amount_due / 100,
    amountPaid: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: 'paid',
    periodStart: admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
    periodEnd: admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000),
    dueDate: invoice.due_date ? admin.firestore.Timestamp.fromMillis(invoice.due_date * 1000) : null,
    paidAt: now,
    invoicePdfUrl: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    createdAt: now
  });

  // Update subscription status
  await getDb().doc(`subscriptions/${providerId}`).update({
    status: 'active',
    updatedAt: now
  });

  // Mark dunning as recovered if it exists
  if (invoice.id) {
    try {
      const { markDunningRecovered } = await import('../subscriptions/dunning');
      await markDunningRecovered(invoice.id);
      console.log(`✅ Dunning recovered for invoice: ${invoice.id}`);
    } catch (dunningError) {
      // Not all invoices will have dunning records, so this is expected
      console.log(`ℹ️ No dunning record found for invoice: ${invoice.id}`);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string);
  const providerId = subscription.metadata.providerId;
  if (!providerId) return;

  await getDb().doc(`subscriptions/${providerId}`).update({
    status: 'past_due',
    updatedAt: admin.firestore.Timestamp.now()
  });

  // Create dunning record for automatic retry
  if (invoice.id) {
    try {
      const { createDunningRecord } = await import('../subscriptions/dunning');
      await createDunningRecord(
        providerId,
        invoice.subscription as string,
        invoice.id
      );
      console.log(`✅ Dunning record created for provider: ${providerId}`);
    } catch (dunningError) {
      console.error(`❌ Failed to create dunning record for provider ${providerId}:`, dunningError);
    }
  }

  // Send notification email to provider about failed payment
  try {
    const providerDoc = await getDb().collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      console.warn(`⚠️ Provider not found for subscription payment failure: ${providerId}`);
      return;
    }

    const provider = providerDoc.data();
    const lang = getLanguageCode(
      provider?.language || provider?.preferredLanguage || provider?.lang || 'en'
    );

    const mailwizz = new MailwizzAPI();
    await mailwizz.sendTransactional({
      to: provider?.email || '',
      template: `TR_PRV_subscription-payment-failed_${lang}`,
      customFields: {
        FNAME: provider?.firstName || provider?.name || '',
        AMOUNT: ((invoice.amount_due || 0) / 100).toString(),
        CURRENCY: (invoice.currency || 'eur').toUpperCase(),
        INVOICE_URL: invoice.hosted_invoice_url || '',
        RETRY_URL: 'https://sos-expat.com/dashboard/subscription',
        DUE_DATE: invoice.due_date
          ? new Date(invoice.due_date * 1000).toLocaleDateString()
          : '',
      },
    });

    console.log(`✅ Subscription payment failed email sent to provider: ${providerId}`);
  } catch (emailError) {
    console.error(`❌ Failed to send payment failed email to provider ${providerId}:`, emailError);
  }
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  const providerId = subscription.metadata.providerId;
  if (!providerId) return;

  // Send notification email about trial ending soon
  try {
    const providerDoc = await getDb().collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      console.warn(`⚠️ Provider not found for trial ending notification: ${providerId}`);
      return;
    }

    const provider = providerDoc.data();
    const lang = getLanguageCode(
      provider?.language || provider?.preferredLanguage || provider?.lang || 'en'
    );

    // Calculate days remaining
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : new Date();
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Get subscription plan details
    const subDoc = await getDb().collection('subscriptions').doc(providerId).get();
    const subData = subDoc.data();
    const planName = subData?.planId || 'Trial';

    const mailwizz = new MailwizzAPI();
    await mailwizz.sendTransactional({
      to: provider?.email || '',
      template: `TR_PRV_trial-ending_${lang}`,
      customFields: {
        FNAME: provider?.firstName || provider?.name || '',
        DAYS_REMAINING: daysRemaining.toString(),
        TRIAL_END_DATE: trialEnd.toLocaleDateString(),
        PLAN_NAME: planName,
        UPGRADE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
        AI_CALLS_USED: (subData?.currentPeriodUsage || 0).toString(),
        AI_CALLS_LIMIT: (subData?.aiCallsLimit || 10).toString(),
      },
    });

    console.log(`✅ Trial ending notification sent to provider: ${providerId} (${daysRemaining} days remaining)`);
  } catch (emailError) {
    console.error(`❌ Failed to send trial ending email to provider ${providerId}:`, emailError);
  }
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Helper: Check if user is admin (via custom claims OR Firestore role)
 */
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
 * Update trial configuration (Admin only)
 */
export const updateTrialConfig = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { durationDays, maxAiCalls, isEnabled } = data as {
      durationDays?: number;
      maxAiCalls?: number;
      isEnabled?: boolean;
    };

    const updates: any = {
      'trial.updatedAt': admin.firestore.Timestamp.now(),
      'trial.updatedBy': context.auth.uid
    };

    if (durationDays !== undefined) updates['trial.durationDays'] = durationDays;
    if (maxAiCalls !== undefined) updates['trial.maxAiCalls'] = maxAiCalls;
    if (isEnabled !== undefined) updates['trial.isEnabled'] = isEnabled;

    await getDb().doc('settings/subscription').set(updates, { merge: true });

    return { success: true };
  });

/**
 * Update plan pricing (Admin only)
 */
export const updatePlanPricing = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

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

    await getDb().doc(`subscription_plans/${planId}`).update(updates);

    return { success: true };
  });

/**
 * Initialize default subscription plans (Run once)
 */
export const initializeSubscriptionPlans = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
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
    const getDescription = (tier: string, aiCallsLimit: number) => {
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
        updatedBy: context.auth.uid
      }
    }, { merge: true });

    await batch.commit();

    return { success: true, message: 'Subscription plans initialized' };
  });

/**
 * Grant or revoke free AI access for a user (Admin only)
 * This bypasses subscription requirements
 */
export const setFreeAiAccess = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify admin (via custom claims or Firestore)
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, grant, note } = data as {
      userId: string;
      grant: boolean;
      note?: string;
    };

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    try {
      const userRef = getDb().doc(`users/${userId}`);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const now = admin.firestore.Timestamp.now();

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

      return {
        success: true,
        userId,
        freeAiAccess: grant,
        message: grant ? 'Accès IA gratuit accordé' : 'Accès IA gratuit révoqué'
      };
    } catch (error: any) {
      console.error('Error setting free AI access:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to update access');
    }
  });

/**
 * Create annual Stripe prices for all plans (Admin only)
 * This creates the yearly prices in Stripe and updates Firestore
 */
export const createAnnualStripePrices = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
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
    } catch (error: any) {
      console.error('Error creating annual Stripe prices:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to create annual prices');
    }
  });

/**
 * Create monthly Stripe prices for all plans (Admin only)
 * Use this if monthly prices are missing
 */
export const createMonthlyStripePrices = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
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
    } catch (error: any) {
      console.error('Error creating monthly Stripe prices:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to create monthly prices');
    }
  });

/**
 * Migrate existing plans to 9 languages (Admin only)
 * Run this once to update existing plans with all 9 language translations
 */
export const migrateSubscriptionPlansTo9Languages = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
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
    } catch (error: any) {
      console.error('Error migrating plans:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Migration failed');
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
      return 'canceled';
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

/**
 * Reset monthly AI quotas for all providers
 * Runs on the 1st of each month at 00:00 Paris time
 */
export const resetMonthlyAiQuotas = functions
  .region('europe-west1')
  .pubsub.schedule('0 0 1 * *')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    const db = getDb();
    const usageRef = db.collection('ai_usage');
    const snapshot = await usageRef.get();

    if (snapshot.empty) {
      console.log('No ai_usage documents to reset');
      return null;
    }

    const now = admin.firestore.Timestamp.now();

    // Calculate next month's end date
    const nextMonthEnd = new Date();
    nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
    nextMonthEnd.setDate(1);
    nextMonthEnd.setHours(0, 0, 0, 0);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    const docs = snapshot.docs;
    let processedCount = 0;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach(doc => {
        batch.update(doc.ref, {
          currentPeriodCalls: 0,
          currentPeriodStart: now,
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonthEnd),
          updatedAt: now
        });
      });

      await batch.commit();
      processedCount += chunk.length;
    }

    console.log(`Monthly quota reset completed for ${processedCount} providers`);
    return null;
  });
