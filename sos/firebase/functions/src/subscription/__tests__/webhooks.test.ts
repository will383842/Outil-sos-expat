/**
 * Webhook Handler Tests
 *
 * Tests for Stripe webhook handlers:
 * - handleSubscriptionCreated
 * - handleSubscriptionUpdated
 * - handleSubscriptionDeleted
 * - handleTrialWillEnd
 * - handleInvoicePaid
 * - handleInvoicePaymentFailed
 */

import {
  createMockStripeSubscription,
  createMockStripeInvoice,
  mockFirestoreSubscription,
  mockFirestoreAiUsage,
  mockSubscriptionPlan,
  mockUserDocument,
  mockTrialConfig,
  createMockDocSnapshot,
  createMockQuerySnapshot,
  createMockTimestamp,
} from './mocks/stripeMocks';

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockFirestoreDoc = jest.fn();
const mockFirestoreCollection = jest.fn();
const mockFirestoreSet = jest.fn().mockResolvedValue(undefined);
const mockFirestoreUpdate = jest.fn().mockResolvedValue(undefined);
const mockFirestoreAdd = jest.fn().mockResolvedValue({ id: 'new_doc_id' });

jest.mock('firebase-admin', () => {
  const mockTimestamp = {
    now: () => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
    }),
    fromMillis: (ms: number) => ({
      toDate: () => new Date(ms),
      seconds: Math.floor(ms / 1000),
    }),
    fromDate: (date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
    }),
  };

  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: Object.assign(
      jest.fn(() => ({
        doc: mockFirestoreDoc,
        collection: mockFirestoreCollection,
      })),
      {
        FieldValue: {
          serverTimestamp: jest.fn(() => 'server-timestamp'),
          increment: jest.fn((n: number) => n),
          delete: jest.fn(() => 'field-delete'),
        },
        Timestamp: mockTimestamp,
      }
    ),
  };
});

// Mock firebase-functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Setup mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockFirestoreDoc.mockImplementation((path: string) => ({
    get: () => {
      if (path.includes('settings/subscription')) {
        return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
      }
      if (path.includes('subscription_plans/')) {
        return Promise.resolve(createMockDocSnapshot(mockSubscriptionPlan, 'lawyer_pro'));
      }
      if (path.includes('subscriptions/')) {
        return Promise.resolve(createMockDocSnapshot(mockFirestoreSubscription, 'provider123'));
      }
      if (path.includes('ai_usage/')) {
        return Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123'));
      }
      if (path.includes('users/') || path.includes('providers/')) {
        return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
      }
      return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
    },
    set: mockFirestoreSet,
    update: mockFirestoreUpdate,
  }));

  mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
    doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
    add: mockFirestoreAdd,
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve(createMockQuerySnapshot([
            { id: 'provider123', data: mockFirestoreSubscription },
          ])),
        })),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: () => Promise.resolve(createMockQuerySnapshot([])),
          })),
        })),
      })),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve(createMockQuerySnapshot([])),
        })),
      })),
      limit: jest.fn(() => ({
        get: () => Promise.resolve(createMockQuerySnapshot([
          { id: 'provider123', data: mockFirestoreSubscription },
        ])),
      })),
    })),
  }));
});

// ============================================================================
// TEST SUITE: handleSubscriptionCreated
// ============================================================================

describe('handleSubscriptionCreated', () => {
  let handleSubscriptionCreated: typeof import('../webhooks').handleSubscriptionCreated;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleSubscriptionCreated = webhooks.handleSubscriptionCreated;
  });

  it('should create subscription document in Firestore', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'active',
    });

    // Act
    await handleSubscriptionCreated(mockSubscription, {
      eventId: 'evt_test123',
      eventType: 'customer.subscription.created',
    });

    // Assert
    expect(mockFirestoreSet).toHaveBeenCalled();
    const setCall = mockFirestoreSet.mock.calls[0][0];
    expect(setCall.providerId).toBe('provider123');
    expect(setCall.status).toBe('active');
  });

  it('should initialize ai_usage document with plan quota', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
    });

    // Act
    await handleSubscriptionCreated(mockSubscription);

    // Assert
    // Second set call should be for ai_usage
    expect(mockFirestoreSet).toHaveBeenCalledTimes(2);
    const aiUsageCall = mockFirestoreSet.mock.calls[1][0];
    expect(aiUsageCall.currentPeriodCalls).toBe(0);
    expect(aiUsageCall.trialCallsUsed).toBe(0);
  });

  it('should skip if no providerId in metadata', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: {}, // No providerId
    });

    // Act
    await handleSubscriptionCreated(mockSubscription);

    // Assert
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it('should handle trial subscription correctly', async () => {
    // Arrange
    const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'trialing',
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: trialEnd,
    });

    // Act
    await handleSubscriptionCreated(mockSubscription);

    // Assert
    const setCall = mockFirestoreSet.mock.calls[0][0];
    expect(setCall.status).toBe('trialing');
    expect(setCall.trialStartedAt).toBeDefined();
    expect(setCall.trialEndsAt).toBeDefined();
  });

  it('should log subscription action', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
    });

    // Act
    await handleSubscriptionCreated(mockSubscription, {
      eventId: 'evt_test123',
      eventType: 'customer.subscription.created',
    });

    // Assert - subscription_logs collection should be written to
    expect(mockFirestoreAdd).toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: handleSubscriptionUpdated
// ============================================================================

describe('handleSubscriptionUpdated', () => {
  let handleSubscriptionUpdated: typeof import('../webhooks').handleSubscriptionUpdated;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleSubscriptionUpdated = webhooks.handleSubscriptionUpdated;
  });

  it('should update subscription status in Firestore', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'past_due',
    });

    // Act
    await handleSubscriptionUpdated(mockSubscription);

    // Assert
    expect(mockFirestoreUpdate).toHaveBeenCalled();
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('past_due');
  });

  it('should detect and handle upgrade', async () => {
    // Arrange - Setup previous state as basic tier
    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            tier: 'basic',
            planId: 'lawyer_basic',
          }, 'provider123'));
        }
        if (path.includes('subscription_plans/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockSubscriptionPlan,
            tier: 'pro',
            aiCallsLimit: 100,
          }, 'lawyer_pro'));
        }
        if (path.includes('users/') || path.includes('providers/')) {
          return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
        }
        if (path.includes('settings/subscription')) {
          return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
      update: mockFirestoreUpdate,
    }));

    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'active',
    });

    // Act
    await handleSubscriptionUpdated(mockSubscription);

    // Assert - Should update ai_usage with new quota immediately
    expect(mockFirestoreUpdate).toHaveBeenCalledTimes(3); // subscription, ai_usage x2
  });

  it('should schedule downgrade for end of period', async () => {
    // Arrange - Setup previous state as pro tier
    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            tier: 'pro',
            planId: 'lawyer_pro',
          }, 'provider123'));
        }
        if (path.includes('subscription_plans/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockSubscriptionPlan,
            tier: 'basic',
            aiCallsLimit: 20,
          }, 'lawyer_basic'));
        }
        if (path.includes('users/') || path.includes('providers/')) {
          return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
        }
        if (path.includes('settings/subscription')) {
          return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
      update: mockFirestoreUpdate,
    }));

    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_basic' },
      status: 'active',
    });

    // Act
    await handleSubscriptionUpdated(mockSubscription);

    // Assert - Should have pendingDowngrade field
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.pendingDowngrade).toBeDefined();
    expect(updateCall.pendingDowngrade.tier).toBe('basic');
  });

  it('should handle cancel_at_period_end change', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'active',
      cancel_at_period_end: true,
      canceled_at: Math.floor(Date.now() / 1000),
    });

    // Act
    await handleSubscriptionUpdated(mockSubscription);

    // Assert
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.cancelAtPeriodEnd).toBe(true);
    expect(updateCall.scheduledCancellationAt).toBeDefined();
  });
});

// ============================================================================
// TEST SUITE: handleSubscriptionDeleted
// ============================================================================

describe('handleSubscriptionDeleted', () => {
  let handleSubscriptionDeleted: typeof import('../webhooks').handleSubscriptionDeleted;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleSubscriptionDeleted = webhooks.handleSubscriptionDeleted;
  });

  it('should set status to canceled', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
    });

    // Act
    await handleSubscriptionDeleted(mockSubscription);

    // Assert
    expect(mockFirestoreUpdate).toHaveBeenCalled();
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('canceled');
    expect(updateCall.aiAccessEnabled).toBe(false);
  });

  it('should disable AI access', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'canceled',
    });

    // Act
    await handleSubscriptionDeleted(mockSubscription);

    // Assert
    const aiUsageUpdate = mockFirestoreUpdate.mock.calls[1][0];
    expect(aiUsageUpdate.aiCallsLimit).toBe(0);
  });

  it('should store previous subscription info', async () => {
    // Arrange
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'canceled',
      cancellation_details: { reason: 'customer_request' } as any,
    });

    // Act
    await handleSubscriptionDeleted(mockSubscription);

    // Assert
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.previousSubscription).toBeDefined();
    expect(updateCall.previousSubscription.planId).toBe('lawyer_pro');
  });
});

// ============================================================================
// TEST SUITE: handleTrialWillEnd
// ============================================================================

describe('handleTrialWillEnd', () => {
  let handleTrialWillEnd: typeof import('../webhooks').handleTrialWillEnd;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleTrialWillEnd = webhooks.handleTrialWillEnd;
  });

  it('should log trial ending reminder', async () => {
    // Arrange
    const trialEnd = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60; // 3 days from now
    const mockSubscription = createMockStripeSubscription({
      metadata: { providerId: 'provider123', planId: 'lawyer_pro' },
      status: 'trialing',
      trial_end: trialEnd,
    });

    // Act
    await handleTrialWillEnd(mockSubscription, {
      eventId: 'evt_test123',
      eventType: 'customer.subscription.trial_will_end',
    });

    // Assert - Should add a log entry
    expect(mockFirestoreAdd).toHaveBeenCalled();
    const addCall = mockFirestoreAdd.mock.calls[0][0];
    expect(addCall.action).toBe('trial_ending_reminder');
  });
});

// ============================================================================
// TEST SUITE: handleInvoicePaid
// ============================================================================

describe('handleInvoicePaid', () => {
  let handleInvoicePaid: typeof import('../webhooks').handleInvoicePaid;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleInvoicePaid = webhooks.handleInvoicePaid;
  });

  beforeEach(() => {
    // Setup subscription query mock
    mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
      doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
      add: mockFirestoreAdd,
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve({
            empty: false,
            docs: [{
              id: 'provider123',
              data: () => mockFirestoreSubscription,
            }],
          }),
        })),
      })),
    }));
  });

  it('should update subscription status to active', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      billing_reason: 'subscription_cycle',
      status: 'paid',
    });

    // Act
    await handleInvoicePaid(mockInvoice);

    // Assert
    expect(mockFirestoreUpdate).toHaveBeenCalled();
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('active');
  });

  it('should reset quota for renewal', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      billing_reason: 'subscription_cycle',
      status: 'paid',
    });

    // Act
    await handleInvoicePaid(mockInvoice);

    // Assert
    // Second update should be for ai_usage reset
    expect(mockFirestoreUpdate).toHaveBeenCalledTimes(2);
    const aiUsageUpdate = mockFirestoreUpdate.mock.calls[1][0];
    expect(aiUsageUpdate.currentPeriodCalls).toBe(0);
  });

  it('should store invoice in Firestore', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      id: 'in_test_new',
      billing_reason: 'subscription_cycle',
      status: 'paid',
    });

    // Act
    await handleInvoicePaid(mockInvoice);

    // Assert
    expect(mockFirestoreSet).toHaveBeenCalled();
    const invoiceData = mockFirestoreSet.mock.calls[0][0];
    expect(invoiceData.stripeInvoiceId).toBe('in_test_new');
    expect(invoiceData.status).toBe('paid');
  });

  it('should apply pending downgrade on renewal', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
      doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
      add: mockFirestoreAdd,
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve({
            empty: false,
            docs: [{
              id: 'provider123',
              data: () => ({
                ...mockFirestoreSubscription,
                pendingDowngrade: {
                  planId: 'lawyer_basic',
                  tier: 'basic',
                  aiCallsLimit: 20,
                },
              }),
            }],
          }),
        })),
      })),
    }));

    const mockInvoice = createMockStripeInvoice({
      billing_reason: 'subscription_cycle',
      status: 'paid',
    });

    // Act
    await handleInvoicePaid(mockInvoice);

    // Assert
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.planId).toBe('lawyer_basic');
    expect(updateCall.tier).toBe('basic');
    expect(updateCall.aiCallsLimit).toBe(20);
  });

  it('should skip if no subscription on invoice', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      subscription: null as any,
    });

    // Act
    await handleInvoicePaid(mockInvoice);

    // Assert
    expect(mockFirestoreUpdate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: handleInvoicePaymentFailed
// ============================================================================

describe('handleInvoicePaymentFailed', () => {
  let handleInvoicePaymentFailed: typeof import('../webhooks').handleInvoicePaymentFailed;

  beforeAll(async () => {
    const webhooks = await import('../webhooks');
    handleInvoicePaymentFailed = webhooks.handleInvoicePaymentFailed;
  });

  beforeEach(() => {
    mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
      doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
      add: mockFirestoreAdd,
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve({
            empty: false,
            docs: [{
              id: 'provider123',
              data: () => mockFirestoreSubscription,
            }],
          }),
        })),
      })),
    }));
  });

  it('should set status to past_due', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      status: 'open',
      paid: false,
      attempt_count: 1,
    });

    // Act
    await handleInvoicePaymentFailed(mockInvoice);

    // Assert
    expect(mockFirestoreUpdate).toHaveBeenCalled();
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('past_due');
  });

  it('should record first payment failure date', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
      doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
      add: mockFirestoreAdd,
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve({
            empty: false,
            docs: [{
              id: 'provider123',
              data: () => ({
                ...mockFirestoreSubscription,
                // No firstPaymentFailureAt
              }),
            }],
          }),
        })),
      })),
    }));

    const mockInvoice = createMockStripeInvoice({
      status: 'open',
      paid: false,
    });

    // Act
    await handleInvoicePaymentFailed(mockInvoice);

    // Assert
    const updateCall = mockFirestoreUpdate.mock.calls[0][0];
    expect(updateCall.firstPaymentFailureAt).toBeDefined();
  });

  it('should disable AI access after 7 days', async () => {
    // Arrange - Subscription with first failure 10 days ago
    const firstFailureDate = new Date();
    firstFailureDate.setDate(firstFailureDate.getDate() - 10);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => ({
      doc: (docId: string) => mockFirestoreDoc(`${collectionPath}/${docId}`),
      add: mockFirestoreAdd,
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: () => Promise.resolve({
            empty: false,
            docs: [{
              id: 'provider123',
              data: () => ({
                ...mockFirestoreSubscription,
                firstPaymentFailureAt: createMockTimestamp(firstFailureDate),
              }),
            }],
          }),
        })),
      })),
    }));

    const mockInvoice = createMockStripeInvoice({
      status: 'open',
      paid: false,
      attempt_count: 3,
    });

    // Act
    await handleInvoicePaymentFailed(mockInvoice);

    // Assert
    const subscriptionUpdate = mockFirestoreUpdate.mock.calls[0][0];
    expect(subscriptionUpdate.aiAccessEnabled).toBe(false);

    // ai_usage should also be updated
    const aiUsageUpdate = mockFirestoreUpdate.mock.calls[1][0];
    expect(aiUsageUpdate.aiCallsLimit).toBe(0);
  });

  it('should log payment failure details', async () => {
    // Arrange
    const mockInvoice = createMockStripeInvoice({
      status: 'open',
      paid: false,
      last_finalization_error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      } as any,
    });

    // Act
    await handleInvoicePaymentFailed(mockInvoice);

    // Assert
    expect(mockFirestoreAdd).toHaveBeenCalled();
    const logEntry = mockFirestoreAdd.mock.calls[0][0];
    expect(logEntry.action).toBe('invoice_payment_failed');
  });
});
