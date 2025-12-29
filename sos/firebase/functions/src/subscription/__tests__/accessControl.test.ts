/**
 * Access Control Tests
 *
 * Tests for AI access control functions:
 * - checkAiAccess with different statuses
 * - Quota exhausted scenarios
 * - Forced access bypass
 * - Trial expiry handling
 */

import {
  mockFirestoreSubscription,
  mockFirestoreAiUsage,
  mockSubscriptionPlan,
  mockUserDocument,
  mockTrialConfig,
  createMockDocSnapshot,
  createMockTimestamp,
} from './mocks/stripeMocks';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock Firebase Admin
const mockFirestoreGet = jest.fn();
const mockFirestoreDoc = jest.fn();
const mockFirestoreCollection = jest.fn();

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    doc: mockFirestoreDoc,
    collection: mockFirestoreCollection,
  })),
}));

// Mock Firestore Timestamp
const mockTimestampNow = jest.fn();
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    increment: jest.fn((n: number) => n),
  },
  Timestamp: {
    now: mockTimestampNow,
    fromMillis: jest.fn((ms: number) => ({
      toDate: () => new Date(ms),
      seconds: Math.floor(ms / 1000),
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
    })),
  },
}));

// Mock firebase-functions
jest.mock('firebase-functions/v1', () => ({
  region: jest.fn(() => ({
    https: {
      onCall: jest.fn((handler) => handler),
    },
  })),
  https: {
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

// Setup mock implementations
beforeEach(() => {
  jest.clearAllMocks();

  mockTimestampNow.mockReturnValue({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
  });

  // Default mock for doc().get()
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
      if (path.includes('users/')) {
        return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
      }
      return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
    },
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  }));
});

// ============================================================================
// TEST SUITE: checkAiAccess with different statuses
// ============================================================================

describe('checkAiAccess', () => {
  // Import after mocks are set up
  let checkAiAccessInternal: typeof import('../accessControl').checkAiAccessInternal;

  beforeAll(async () => {
    const accessControl = await import('../accessControl');
    checkAiAccessInternal = accessControl.checkAiAccessInternal;
  });

  describe('with active subscription', () => {
    it('should allow access when subscription is active and quota not exhausted', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'active',
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              currentPeriodCalls: 10,
            }, 'provider123'));
          }
          if (path.includes('subscription_plans/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockSubscriptionPlan,
              aiCallsLimit: 50,
            }, 'lawyer_pro'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.subscriptionStatus).toBe('active');
      expect(result.currentUsage).toBe(10);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(40);
      expect(result.isInTrial).toBe(false);
    });

    it('should deny access when quota is exhausted', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'active',
              planId: 'lawyer_pro',
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              currentPeriodCalls: 50, // At limit
            }, 'provider123'));
          }
          if (path.includes('subscription_plans/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockSubscriptionPlan,
              aiCallsLimit: 50,
            }, 'lawyer_pro'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exhausted');
      expect(result.currentUsage).toBe(50);
      expect(result.remaining).toBe(0);
    });
  });

  describe('with trialing subscription', () => {
    it('should allow access when trial is valid and calls remain', async () => {
      // Arrange
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 20); // 20 days remaining

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'trialing',
              trialEndsAt: createMockTimestamp(trialEnd),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              trialCallsUsed: 1,
            }, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.isInTrial).toBe(true);
      expect(result.subscriptionStatus).toBe('trialing');
      expect(result.trialCallsRemaining).toBe(2); // 3 - 1
      expect(result.trialDaysRemaining).toBeGreaterThan(15);
    });

    it('should deny access when trial is expired', async () => {
      // Arrange
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() - 5); // Expired 5 days ago

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'trialing',
              trialEndsAt: createMockTimestamp(trialEnd),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              trialCallsUsed: 1,
            }, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('trial_expired');
      expect(result.isInTrial).toBe(true);
      expect(result.canUpgrade).toBe(true);
    });

    it('should deny access when trial calls are exhausted', async () => {
      // Arrange
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 20); // Still valid

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'trialing',
              trialEndsAt: createMockTimestamp(trialEnd),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              trialCallsUsed: 3, // All 3 used
            }, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('trial_calls_exhausted');
      expect(result.isInTrial).toBe(true);
      expect(result.trialCallsRemaining).toBe(0);
    });
  });

  describe('with forced access', () => {
    it('should allow access when forcedAiAccess is true', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockUserDocument,
              forcedAiAccess: true,
              freeAccessGrantedBy: 'admin123',
              freeAccessNote: 'VIP customer',
            }, 'provider123'));
          }
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot(null, 'provider123')); // No subscription
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              currentPeriodCalls: 100,
            }, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.isForcedAccess).toBe(true);
      expect(result.forcedAccessNote).toBe('VIP customer');
      expect(result.limit).toBe(-1); // Unlimited
      expect(result.subscriptionStatus).toBe('forced_access');
    });

    it('should allow access with freeTrialUntil date in future', async () => {
      // Arrange
      const freeUntil = new Date();
      freeUntil.setDate(freeUntil.getDate() + 30);

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockUserDocument,
              freeTrialUntil: createMockTimestamp(freeUntil),
              freeTrialGrantedBy: 'admin123',
            }, 'provider123'));
          }
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot(null, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              currentPeriodCalls: 50,
            }, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.isForcedAccess).toBe(true);
    });
  });

  describe('with past_due subscription', () => {
    it('should allow access within grace period (< 7 days)', async () => {
      // Arrange
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 3); // 3 days past due

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'past_due',
              updatedAt: createMockTimestamp(pastDueDate),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              currentPeriodCalls: 10,
            }, 'provider123'));
          }
          if (path.includes('subscription_plans/')) {
            return Promise.resolve(createMockDocSnapshot(mockSubscriptionPlan, 'lawyer_pro'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.subscriptionStatus).toBe('past_due');
      expect(result.canUpgrade).toBe(false); // Must fix payment first
    });

    it('should deny access after grace period expires (> 7 days)', async () => {
      // Arrange
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 10); // 10 days past due

      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'past_due',
              updatedAt: createMockTimestamp(pastDueDate),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('payment_failed');
      expect(result.subscriptionStatus).toBe('past_due');
    });
  });

  describe('with canceled subscription', () => {
    it('should deny access after cancelation', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'canceled',
              canceledAt: createMockTimestamp(new Date()),
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('subscription_canceled');
      expect(result.canUpgrade).toBe(true);
    });
  });

  describe('with no subscription', () => {
    it('should deny access when no subscription exists', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot(null, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot(null, 'provider123'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('no_subscription');
      expect(result.subscriptionStatus).toBe('none');
      expect(result.canUpgrade).toBe(true);
    });
  });

  describe('with unlimited plan', () => {
    it('should enforce fair use limit of 500 calls', async () => {
      // Arrange
      mockFirestoreDoc.mockImplementation((path: string) => ({
        get: () => {
          if (path.includes('subscriptions/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreSubscription,
              status: 'active',
              tier: 'unlimited',
            }, 'provider123'));
          }
          if (path.includes('ai_usage/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockFirestoreAiUsage,
              currentPeriodCalls: 500, // At fair use limit
            }, 'provider123'));
          }
          if (path.includes('subscription_plans/')) {
            return Promise.resolve(createMockDocSnapshot({
              ...mockSubscriptionPlan,
              aiCallsLimit: -1, // Unlimited
            }, 'lawyer_unlimited'));
          }
          if (path.includes('users/')) {
            return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
          }
          if (path.includes('settings/subscription')) {
            return Promise.resolve(createMockDocSnapshot({ trial: mockTrialConfig }, 'subscription'));
          }
          return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
        },
      }));

      // Act
      const result = await checkAiAccessInternal('provider123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exhausted');
      expect(result.limit).toBe(-1); // Still shows unlimited
    });
  });
});

// ============================================================================
// TEST SUITE: checkForcedAccess helper
// ============================================================================

describe('checkForcedAccess', () => {
  let checkForcedAccess: typeof import('../accessControl').checkForcedAccess;

  beforeAll(async () => {
    const accessControl = await import('../accessControl');
    checkForcedAccess = accessControl.checkForcedAccess;
  });

  it('should return hasForcedAccess=false when user does not exist', async () => {
    mockFirestoreDoc.mockImplementation(() => ({
      get: () => Promise.resolve(createMockDocSnapshot(null, 'unknown')),
    }));

    const result = await checkForcedAccess('nonexistent');

    expect(result.hasForcedAccess).toBe(false);
  });

  it('should detect admin_granted forced access', async () => {
    mockFirestoreDoc.mockImplementation(() => ({
      get: () => Promise.resolve(createMockDocSnapshot({
        forcedAiAccess: true,
        forcedAccessGrantedBy: 'admin123',
        forcedAccessNote: 'Test note',
      }, 'provider123')),
    }));

    const result = await checkForcedAccess('provider123');

    expect(result.hasForcedAccess).toBe(true);
    expect(result.reason).toBe('admin_granted');
    expect(result.grantedBy).toBe('admin123');
  });

  it('should detect free_trial_until access', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    mockFirestoreDoc.mockImplementation(() => ({
      get: () => Promise.resolve(createMockDocSnapshot({
        freeTrialUntil: createMockTimestamp(futureDate),
        freeTrialGrantedBy: 'admin456',
      }, 'provider123')),
    }));

    const result = await checkForcedAccess('provider123');

    expect(result.hasForcedAccess).toBe(true);
    expect(result.reason).toBe('free_trial_until');
    expect(result.expiresAt).toBeDefined();
  });

  it('should return false when freeTrialUntil is in the past', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    mockFirestoreDoc.mockImplementation(() => ({
      get: () => Promise.resolve(createMockDocSnapshot({
        freeTrialUntil: createMockTimestamp(pastDate),
      }, 'provider123')),
    }));

    const result = await checkForcedAccess('provider123');

    expect(result.hasForcedAccess).toBe(false);
  });
});
