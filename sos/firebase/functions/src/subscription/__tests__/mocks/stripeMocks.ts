/**
 * Stripe Mocks for Subscription Tests
 *
 * Mock objects and factories for testing Stripe subscription webhooks
 * and related functions.
 */

import Stripe from 'stripe';

// ============================================================================
// MOCK STRIPE SUBSCRIPTION
// ============================================================================

/**
 * Create a mock Stripe subscription object
 */
export function createMockStripeSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + 30 * 24 * 60 * 60; // 30 days from now

  return {
    id: 'sub_test123',
    object: 'subscription',
    application: null,
    application_fee_percent: null,
    automatic_tax: { enabled: false, liability: null },
    billing_cycle_anchor: now,
    billing_cycle_anchor_config: null,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: { comment: null, feedback: null, reason: null },
    collection_method: 'charge_automatically',
    created: now,
    currency: 'eur',
    current_period_end: periodEnd,
    current_period_start: now,
    customer: 'cus_test123',
    days_until_due: null,
    default_payment_method: 'pm_test123',
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    ended_at: null,
    invoice_settings: { account_tax_ids: null, issuer: { type: 'self' } },
    items: {
      object: 'list',
      data: [{
        id: 'si_test123',
        object: 'subscription_item',
        billing_thresholds: null,
        created: now,
        discounts: [],
        metadata: {},
        plan: {
          id: 'plan_test123',
          object: 'plan',
          active: true,
          aggregate_usage: null,
          amount: 2900,
          amount_decimal: '2900',
          billing_scheme: 'per_unit',
          created: now,
          currency: 'eur',
          interval: 'month',
          interval_count: 1,
          livemode: false,
          metadata: {},
          meter: null,
          nickname: null,
          product: 'prod_test123',
          tiers_mode: null,
          transform_usage: null,
          trial_period_days: null,
          usage_type: 'licensed',
        },
        price: {
          id: 'price_test123',
          object: 'price',
          active: true,
          billing_scheme: 'per_unit',
          created: now,
          currency: 'eur',
          custom_unit_amount: null,
          livemode: false,
          lookup_key: null,
          metadata: {},
          nickname: null,
          product: 'prod_test123',
          recurring: {
            aggregate_usage: null,
            interval: 'month',
            interval_count: 1,
            meter: null,
            trial_period_days: null,
            usage_type: 'licensed',
          },
          tax_behavior: 'unspecified',
          tiers_mode: null,
          transform_quantity: null,
          type: 'recurring',
          unit_amount: 2900,
          unit_amount_decimal: '2900',
        },
        quantity: 1,
        subscription: 'sub_test123',
        tax_rates: [],
      }],
      has_more: false,
      url: '/v1/subscription_items?subscription=sub_test123',
    },
    latest_invoice: 'in_test123',
    livemode: false,
    metadata: {
      providerId: 'provider123',
      planId: 'lawyer_pro',
    },
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: {
      payment_method_options: null,
      payment_method_types: null,
      save_default_payment_method: 'on_subscription',
    },
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: now,
    status: 'active',
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } },
    trial_start: null,
    ...overrides,
  } as Stripe.Subscription;
}

// ============================================================================
// MOCK STRIPE INVOICE
// ============================================================================

/**
 * Create a mock Stripe invoice object
 */
export function createMockStripeInvoice(
  overrides: Partial<Stripe.Invoice> = {}
): Stripe.Invoice {
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + 30 * 24 * 60 * 60;

  return {
    id: 'in_test123',
    object: 'invoice',
    account_country: 'FR',
    account_name: 'SOS Expat',
    account_tax_ids: null,
    amount_due: 2900,
    amount_paid: 2900,
    amount_remaining: 0,
    amount_shipping: 0,
    application: null,
    application_fee_amount: null,
    attempt_count: 1,
    attempted: true,
    auto_advance: false,
    automatic_tax: { enabled: false, liability: null, status: null },
    billing_reason: 'subscription_cycle',
    charge: 'ch_test123',
    collection_method: 'charge_automatically',
    created: now,
    currency: 'eur',
    custom_fields: null,
    customer: 'cus_test123',
    customer_address: null,
    customer_email: 'test@example.com',
    customer_name: 'Test Provider',
    customer_phone: null,
    customer_shipping: null,
    customer_tax_exempt: 'none',
    customer_tax_ids: [],
    default_payment_method: 'pm_test123',
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    due_date: null,
    effective_at: now,
    ending_balance: 0,
    footer: null,
    from_invoice: null,
    hosted_invoice_url: 'https://invoice.stripe.com/i/test123',
    invoice_pdf: 'https://pay.stripe.com/invoice/test123/pdf',
    issuer: { type: 'self' },
    last_finalization_error: null,
    latest_revision: null,
    lines: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/invoices/in_test123/lines',
    },
    livemode: false,
    metadata: {},
    next_payment_attempt: null,
    number: 'INV-001',
    on_behalf_of: null,
    paid: true,
    paid_out_of_band: false,
    payment_intent: 'pi_test123',
    payment_settings: {
      default_mandate: null,
      payment_method_options: null,
      payment_method_types: null,
    },
    period_end: periodEnd,
    period_start: now,
    post_payment_credit_notes_amount: 0,
    pre_payment_credit_notes_amount: 0,
    quote: null,
    receipt_number: null,
    rendering: null,
    rendering_options: null,
    shipping_cost: null,
    shipping_details: null,
    starting_balance: 0,
    statement_descriptor: null,
    status: 'paid',
    status_transitions: {
      finalized_at: now,
      marked_uncollectible_at: null,
      paid_at: now,
      voided_at: null,
    },
    subscription: 'sub_test123',
    subscription_details: {
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
    },
    subscription_proration_date: null,
    subtotal: 2900,
    subtotal_excluding_tax: 2900,
    tax: null,
    test_clock: null,
    total: 2900,
    total_discount_amounts: [],
    total_excluding_tax: 2900,
    total_tax_amounts: [],
    transfer_data: null,
    webhooks_delivered_at: now,
    ...overrides,
  } as unknown as Stripe.Invoice;
}

// ============================================================================
// MOCK STRIPE CUSTOMER
// ============================================================================

/**
 * Create a mock Stripe customer object
 */
export function createMockStripeCustomer(
  overrides: Partial<Stripe.Customer> = {}
): Stripe.Customer {
  const now = Math.floor(Date.now() / 1000);

  return {
    id: 'cus_test123',
    object: 'customer',
    address: null,
    balance: 0,
    created: now,
    currency: 'eur',
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    email: 'test@example.com',
    invoice_prefix: 'TEST',
    invoice_settings: {
      custom_fields: null,
      default_payment_method: 'pm_test123',
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: { providerId: 'provider123' },
    name: 'Test Provider',
    phone: null,
    preferred_locales: ['fr'],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
    ...overrides,
  } as unknown as Stripe.Customer;
}

// ============================================================================
// MOCK SUBSCRIPTION DATA VARIATIONS
// ============================================================================

/**
 * Active subscription with no trial
 */
export const mockActiveSubscription = createMockStripeSubscription({
  status: 'active',
  trial_start: null,
  trial_end: null,
});

/**
 * Subscription in trial period
 */
export const mockTrialingSubscription = createMockStripeSubscription({
  status: 'trialing',
  trial_start: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // 7 days ago
  trial_end: Math.floor(Date.now() / 1000) + 23 * 24 * 60 * 60, // 23 days from now
});

/**
 * Past due subscription
 */
export const mockPastDueSubscription = createMockStripeSubscription({
  status: 'past_due',
});

/**
 * Canceled subscription (at period end)
 */
export const mockCanceledAtPeriodEndSubscription = createMockStripeSubscription({
  status: 'active',
  cancel_at_period_end: true,
  canceled_at: Math.floor(Date.now() / 1000),
});

/**
 * Fully canceled subscription
 */
export const mockCanceledSubscription = createMockStripeSubscription({
  status: 'canceled',
  canceled_at: Math.floor(Date.now() / 1000),
  ended_at: Math.floor(Date.now() / 1000),
});

// ============================================================================
// MOCK INVOICE DATA VARIATIONS
// ============================================================================

/**
 * Paid invoice for subscription renewal
 */
export const mockPaidRenewalInvoice = createMockStripeInvoice({
  billing_reason: 'subscription_cycle',
  status: 'paid',
  paid: true,
});

/**
 * Failed payment invoice
 */
export const mockFailedInvoice = createMockStripeInvoice({
  billing_reason: 'subscription_cycle',
  status: 'open',
  paid: false,
  amount_remaining: 2900,
  attempt_count: 2,
  last_finalization_error: {
    code: 'card_declined',
    doc_url: 'https://stripe.com/docs/error-codes/card-declined',
    message: 'Your card was declined.',
    type: 'card_error',
  } as any,
});

/**
 * First invoice (new subscription)
 */
export const mockFirstInvoice = createMockStripeInvoice({
  billing_reason: 'subscription_create',
  status: 'paid',
  paid: true,
});

// ============================================================================
// MOCK FIRESTORE DATA
// ============================================================================

/**
 * Mock subscription document in Firestore
 */
export const mockFirestoreSubscription = {
  providerId: 'provider123',
  planId: 'lawyer_pro',
  tier: 'pro',
  status: 'active',
  stripeCustomerId: 'cus_test123',
  stripeSubscriptionId: 'sub_test123',
  stripePriceId: 'price_test123',
  currency: 'EUR',
  billingPeriod: 'monthly',
  currentPeriodStart: { toDate: () => new Date() },
  currentPeriodEnd: { toDate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  cancelAtPeriodEnd: false,
  canceledAt: null,
  aiCallsLimit: 50,
  aiAccessEnabled: true,
  createdAt: { toDate: () => new Date() },
  updatedAt: { toDate: () => new Date() },
};

/**
 * Mock AI usage document in Firestore
 */
export const mockFirestoreAiUsage = {
  providerId: 'provider123',
  subscriptionId: 'provider123',
  currentPeriodCalls: 15,
  trialCallsUsed: 0,
  totalCallsAllTime: 150,
  aiCallsLimit: 50,
  currentPeriodStart: { toDate: () => new Date() },
  currentPeriodEnd: { toDate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  createdAt: { toDate: () => new Date() },
  updatedAt: { toDate: () => new Date() },
};

/**
 * Mock subscription plan document
 */
export const mockSubscriptionPlan = {
  id: 'lawyer_pro',
  tier: 'pro',
  providerType: 'lawyer',
  aiCallsLimit: 50,
  pricing: { EUR: 29, USD: 32 },
  annualPricing: { EUR: 278, USD: 307 },
  stripePriceId: { EUR: 'price_eur_monthly', USD: 'price_usd_monthly' },
  stripePriceIdAnnual: { EUR: 'price_eur_annual', USD: 'price_usd_annual' },
  isActive: true,
  name: { fr: 'Plan Pro', en: 'Pro Plan' },
};

/**
 * Mock user/provider document
 */
export const mockUserDocument = {
  email: 'provider@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  displayName: 'Jean Dupont',
  language: 'fr',
  role: 'provider',
  providerType: 'lawyer',
  forcedAiAccess: false,
};

/**
 * Mock trial config from settings
 */
export const mockTrialConfig = {
  durationDays: 30,
  maxAiCalls: 3,
  isEnabled: true,
};

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Create mock Firestore document snapshot
 */
export function createMockDocSnapshot<T>(
  data: T | null,
  id: string = 'doc_id'
): { exists: boolean; id: string; data: () => T | null } {
  return {
    exists: data !== null,
    id,
    data: () => data,
  };
}

/**
 * Create mock Firestore query snapshot
 */
export function createMockQuerySnapshot<T>(
  docs: Array<{ id: string; data: T }>
): { empty: boolean; size: number; docs: Array<{ id: string; data: () => T }> } {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc.data,
    })),
  };
}

/**
 * Create timestamp mock with specific date
 */
export function createMockTimestamp(date: Date = new Date()) {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}
