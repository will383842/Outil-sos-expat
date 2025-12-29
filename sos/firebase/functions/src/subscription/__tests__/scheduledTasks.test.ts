/**
 * Scheduled Tasks Tests
 *
 * Tests for scheduled subscription management tasks:
 * - resetMonthlyQuotas
 * - checkPastDueSubscriptions
 * - sendQuotaAlerts
 * - cleanupExpiredTrials
 */

import {
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
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

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
        batch: () => ({
          set: mockBatchSet,
          update: mockBatchUpdate,
          commit: mockBatchCommit,
        }),
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

// Mock firebase-functions/v2/scheduler
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((config, handler) => handler),
}));

// Mock firebase-functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock firebase-functions/params
jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn(() => ({})),
}));

// Mock emailMarketing modules
jest.mock('../../emailMarketing/utils/mailwizz', () => ({
  MailwizzAPI: jest.fn().mockImplementation(() => ({
    sendTransactional: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

jest.mock('../../emailMarketing/config', () => ({
  getLanguageCode: jest.fn((lang) => lang || 'en'),
  MAILWIZZ_API_KEY_SECRET: {},
}));

// Setup mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockFirestoreDoc.mockImplementation((path: string) => ({
    get: () => {
      if (path.includes('subscription_plans/')) {
        return Promise.resolve(createMockDocSnapshot(mockSubscriptionPlan, 'lawyer_pro'));
      }
      if (path.includes('users/') || path.includes('providers/')) {
        return Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123'));
      }
      return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
    },
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  }));
});

// ============================================================================
// TEST SUITE: resetMonthlyQuotas
// ============================================================================

describe('resetMonthlyQuotas', () => {
  it('should reset quota for active subscriptions', async () => {
    // Arrange
    const pastPeriodEnd = new Date();
    pastPeriodEnd.setMonth(pastPeriodEnd.getMonth() - 1);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: false,
              size: 2,
              docs: [
                {
                  id: 'provider123',
                  ref: { path: 'ai_usage/provider123' },
                  data: () => ({
                    ...mockFirestoreAiUsage,
                    providerId: 'provider123',
                    currentPeriodCalls: 25,
                    currentPeriodEnd: createMockTimestamp(pastPeriodEnd),
                  }),
                },
                {
                  id: 'provider456',
                  ref: { path: 'ai_usage/provider456' },
                  data: () => ({
                    ...mockFirestoreAiUsage,
                    providerId: 'provider456',
                    currentPeriodCalls: 40,
                    currentPeriodEnd: createMockTimestamp(pastPeriodEnd),
                  }),
                },
              ],
            }),
          })),
        };
      }
      if (collectionPath === 'quota_reset_logs') {
        return {
          doc: jest.fn(() => ({ path: 'quota_reset_logs/new_doc' })),
        };
      }
      return {
        doc: mockFirestoreDoc,
      };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            status: 'active',
          }, 'provider123'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    // Import after mocks
    const { resetMonthlyQuotas } = await import('../scheduledTasks');

    // Act
    await resetMonthlyQuotas({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    expect(mockBatchSet).toHaveBeenCalled(); // For logs
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('should skip inactive subscriptions', async () => {
    // Arrange
    const pastPeriodEnd = new Date();
    pastPeriodEnd.setMonth(pastPeriodEnd.getMonth() - 1);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: false,
              size: 1,
              docs: [
                {
                  id: 'provider123',
                  ref: { path: 'ai_usage/provider123' },
                  data: () => ({
                    ...mockFirestoreAiUsage,
                    providerId: 'provider123',
                    currentPeriodEnd: createMockTimestamp(pastPeriodEnd),
                  }),
                },
              ],
            }),
          })),
        };
      }
      return {
        doc: mockFirestoreDoc,
      };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            status: 'canceled', // Inactive
          }, 'provider123'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { resetMonthlyQuotas } = await import('../scheduledTasks');

    // Act
    await resetMonthlyQuotas({ scheduleTime: new Date().toISOString() } as any);

    // Assert - No updates should be made for canceled subscription
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('should handle empty ai_usage collection', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: true,
              size: 0,
              docs: [],
            }),
          })),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    const { resetMonthlyQuotas } = await import('../scheduledTasks');

    // Act
    await resetMonthlyQuotas({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: checkPastDueSubscriptions
// ============================================================================

describe('checkPastDueSubscriptions', () => {
  it('should send reminder for subscriptions past_due 3+ days', async () => {
    // Arrange
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: false,
              size: 1,
              docs: [
                {
                  id: 'provider123',
                  ref: { path: 'subscriptions/provider123' },
                  data: () => ({
                    ...mockFirestoreSubscription,
                    status: 'past_due',
                    providerId: 'provider123',
                    pastDueSince: createMockTimestamp(threeDaysAgo),
                    reminderSent3Days: false,
                  }),
                },
              ],
            }),
          })),
        };
      }
      if (collectionPath === 'users' || collectionPath === 'providers') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    const { checkPastDueSubscriptions } = await import('../scheduledTasks');

    // Act
    await checkPastDueSubscriptions({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const reminderUpdate = updateCalls.find((call: any[]) => call[0]?.reminderSent3Days);
    expect(reminderUpdate).toBeDefined();
  });

  it('should suspend subscriptions past_due 7+ days', async () => {
    // Arrange
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: false,
              size: 1,
              docs: [
                {
                  id: 'provider123',
                  ref: { path: 'subscriptions/provider123' },
                  data: () => ({
                    ...mockFirestoreSubscription,
                    status: 'past_due',
                    providerId: 'provider123',
                    pastDueSince: createMockTimestamp(tenDaysAgo),
                    updatedAt: createMockTimestamp(tenDaysAgo),
                  }),
                },
              ],
            }),
          })),
        };
      }
      if (collectionPath === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123')),
    }));

    const { checkPastDueSubscriptions } = await import('../scheduledTasks');

    // Act
    await checkPastDueSubscriptions({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const suspendUpdate = updateCalls.find((call: any[]) => call[0]?.status === 'suspended');
    expect(suspendUpdate).toBeDefined();
  });

  it('should handle empty past_due list', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            get: () => Promise.resolve({
              empty: true,
              size: 0,
              docs: [],
            }),
          })),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    const { checkPastDueSubscriptions } = await import('../scheduledTasks');

    // Act
    await checkPastDueSubscriptions({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: sendQuotaAlerts
// ============================================================================

describe('sendQuotaAlerts', () => {
  it('should send 80% quota alert', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          get: () => Promise.resolve({
            empty: false,
            size: 1,
            docs: [
              {
                id: 'provider123',
                ref: { path: 'ai_usage/provider123' },
                data: () => ({
                  ...mockFirestoreAiUsage,
                  providerId: 'provider123',
                  currentPeriodCalls: 42, // 84% of 50
                  quotaAlert80Sent: false,
                  quotaAlert100Sent: false,
                }),
              },
            ],
          }),
        };
      }
      if (collectionPath === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            status: 'active',
            planId: 'lawyer_pro',
          }, 'provider123'));
        }
        if (path.includes('subscription_plans/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockSubscriptionPlan,
            aiCallsLimit: 50,
          }, 'lawyer_pro'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { sendQuotaAlerts } = await import('../scheduledTasks');

    // Act
    await sendQuotaAlerts({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const quotaAlertUpdate = updateCalls.find((call: any[]) => call[0]?.quotaAlert80Sent);
    expect(quotaAlertUpdate).toBeDefined();
  });

  it('should send 100% quota exhausted alert', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          get: () => Promise.resolve({
            empty: false,
            size: 1,
            docs: [
              {
                id: 'provider123',
                ref: { path: 'ai_usage/provider123' },
                data: () => ({
                  ...mockFirestoreAiUsage,
                  providerId: 'provider123',
                  currentPeriodCalls: 50, // 100% of 50
                  quotaAlert80Sent: true,
                  quotaAlert100Sent: false,
                }),
              },
            ],
          }),
        };
      }
      if (collectionPath === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            status: 'active',
            planId: 'lawyer_pro',
          }, 'provider123'));
        }
        if (path.includes('subscription_plans/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockSubscriptionPlan,
            aiCallsLimit: 50,
          }, 'lawyer_pro'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { sendQuotaAlerts } = await import('../scheduledTasks');

    // Act
    await sendQuotaAlerts({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const quotaExhaustedUpdate = updateCalls.find((call: any[]) => call[0]?.quotaAlert100Sent);
    expect(quotaExhaustedUpdate).toBeDefined();
  });

  it('should skip unlimited plans', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'ai_usage') {
        return {
          get: () => Promise.resolve({
            empty: false,
            size: 1,
            docs: [
              {
                id: 'provider123',
                ref: { path: 'ai_usage/provider123' },
                data: () => ({
                  ...mockFirestoreAiUsage,
                  providerId: 'provider123',
                  currentPeriodCalls: 200,
                }),
              },
            ],
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('subscriptions/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockFirestoreSubscription,
            status: 'active',
            planId: 'lawyer_unlimited',
          }, 'provider123'));
        }
        if (path.includes('subscription_plans/')) {
          return Promise.resolve(createMockDocSnapshot({
            ...mockSubscriptionPlan,
            aiCallsLimit: -1, // Unlimited
          }, 'lawyer_unlimited'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { sendQuotaAlerts } = await import('../scheduledTasks');

    // Act
    await sendQuotaAlerts({ scheduleTime: new Date().toISOString() } as any);

    // Assert - No updates for unlimited plans
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: cleanupExpiredTrials
// ============================================================================

describe('cleanupExpiredTrials', () => {
  it('should expire trials past their end date', async () => {
    // Arrange
    const expiredTrialDate = new Date();
    expiredTrialDate.setDate(expiredTrialDate.getDate() - 5);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: () => Promise.resolve({
                empty: false,
                size: 1,
                docs: [
                  {
                    id: 'provider123',
                    ref: { path: 'subscriptions/provider123' },
                    data: () => ({
                      ...mockFirestoreSubscription,
                      status: 'trialing',
                      providerId: 'provider123',
                      trialEndsAt: createMockTimestamp(expiredTrialDate),
                      trialCallsUsed: 2,
                    }),
                  },
                ],
              }),
            })),
          })),
        };
      }
      if (collectionPath === 'invoices') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: () => Promise.resolve({
                  empty: true, // No paid invoices
                  docs: [],
                }),
              })),
            })),
          })),
        };
      }
      if (collectionPath === 'trial_expiration_logs') {
        return {
          doc: jest.fn(() => ({ path: 'trial_expiration_logs/new' })),
        };
      }
      if (collectionPath === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('ai_usage/')) {
          return Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { cleanupExpiredTrials } = await import('../scheduledTasks');

    // Act
    await cleanupExpiredTrials({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const expireUpdate = updateCalls.find((call: any[]) => call[0]?.status === 'expired');
    expect(expireUpdate).toBeDefined();
  });

  it('should convert to active if paid invoice exists', async () => {
    // Arrange
    const expiredTrialDate = new Date();
    expiredTrialDate.setDate(expiredTrialDate.getDate() - 5);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: () => Promise.resolve({
                empty: false,
                size: 1,
                docs: [
                  {
                    id: 'provider123',
                    ref: { path: 'subscriptions/provider123' },
                    data: () => ({
                      ...mockFirestoreSubscription,
                      status: 'trialing',
                      providerId: 'provider123',
                      trialEndsAt: createMockTimestamp(expiredTrialDate),
                    }),
                  },
                ],
              }),
            })),
          })),
        };
      }
      if (collectionPath === 'invoices') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: () => Promise.resolve({
                  empty: false, // Has paid invoice
                  docs: [{ id: 'in_paid123' }],
                }),
              })),
            })),
          })),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    const { cleanupExpiredTrials } = await import('../scheduledTasks');

    // Act
    await cleanupExpiredTrials({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const activeUpdate = updateCalls.find((call: any[]) => call[0]?.status === 'active');
    expect(activeUpdate).toBeDefined();
  });

  it('should handle empty expired trials list', async () => {
    // Arrange
    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: () => Promise.resolve({
                empty: true,
                size: 0,
                docs: [],
              }),
            })),
          })),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    const { cleanupExpiredTrials } = await import('../scheduledTasks');

    // Act
    await cleanupExpiredTrials({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('should cut AI access for expired trials', async () => {
    // Arrange
    const expiredTrialDate = new Date();
    expiredTrialDate.setDate(expiredTrialDate.getDate() - 5);

    mockFirestoreCollection.mockImplementation((collectionPath: string) => {
      if (collectionPath === 'subscriptions') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: () => Promise.resolve({
                empty: false,
                size: 1,
                docs: [
                  {
                    id: 'provider123',
                    ref: { path: 'subscriptions/provider123' },
                    data: () => ({
                      ...mockFirestoreSubscription,
                      status: 'trialing',
                      providerId: 'provider123',
                      trialEndsAt: createMockTimestamp(expiredTrialDate),
                    }),
                  },
                ],
              }),
            })),
          })),
        };
      }
      if (collectionPath === 'invoices') {
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: () => Promise.resolve({ empty: true, docs: [] }),
              })),
            })),
          })),
        };
      }
      if (collectionPath === 'trial_expiration_logs') {
        return { doc: jest.fn(() => ({ path: 'trial_expiration_logs/new' })) };
      }
      if (collectionPath === 'users') {
        return {
          doc: () => ({
            get: () => Promise.resolve(createMockDocSnapshot(mockUserDocument, 'provider123')),
          }),
        };
      }
      return { doc: mockFirestoreDoc };
    });

    mockFirestoreDoc.mockImplementation((path: string) => ({
      get: () => {
        if (path.includes('ai_usage/')) {
          return Promise.resolve(createMockDocSnapshot(mockFirestoreAiUsage, 'provider123'));
        }
        return Promise.resolve(createMockDocSnapshot(null, 'unknown'));
      },
    }));

    const { cleanupExpiredTrials } = await import('../scheduledTasks');

    // Act
    await cleanupExpiredTrials({ scheduleTime: new Date().toISOString() } as any);

    // Assert
    expect(mockBatchUpdate).toHaveBeenCalled();
    const updateCalls = mockBatchUpdate.mock.calls;
    const aiAccessSuspended = updateCalls.find((call: any[]) => call[0]?.aiAccessSuspended === true);
    expect(aiAccessSuspended).toBeDefined();
  });
});
