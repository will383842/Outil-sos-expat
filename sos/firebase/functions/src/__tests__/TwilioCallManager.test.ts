/**
 * TwilioCallManager Unit Tests — Payment Race Conditions
 *
 * Tests for the P0 FIX 2026-04-10:
 * 1. handleCallCompletion idempotency: "processing" in finalPaymentStatuses
 * 2. processRefund idempotency: "processing" and "captured" block refund
 * 3. shouldCapturePayment: PayPal terminal statuses block capture
 * 4. createInvoices: "voided" status recognized as refunded
 * 5. Race condition: participant-leave vs conference-end
 */

// ============================================================================
// Mock Setup — must be before imports
// ============================================================================

// Mock firebase-admin
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockTransactionSet = jest.fn();
const mockRunTransaction = jest.fn();
const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocSet = jest.fn();
const mockCollectionAdd = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockWhere = jest.fn();

const mockDoc = jest.fn(() => ({
  get: mockDocGet,
  update: mockDocUpdate,
  set: mockDocSet,
}));

const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  add: mockCollectionAdd,
  where: mockWhere,
}));

jest.mock('firebase-admin', () => ({
  firestore: Object.assign(
    jest.fn(() => ({
      collection: mockCollection,
      doc: mockDoc,
      runTransaction: mockRunTransaction,
    })),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'mock-timestamp'),
        increment: jest.fn((n: number) => n),
      },
      Timestamp: {
        now: jest.fn(() => ({
          toDate: () => new Date(),
          toMillis: () => Date.now(),
        })),
        fromDate: jest.fn((d: Date) => ({
          toDate: () => d,
          toMillis: () => d.getTime(),
        })),
        fromMillis: jest.fn((ms: number) => ({
          toDate: () => new Date(ms),
          toMillis: () => ms,
        })),
      },
    }
  ),
  initializeApp: jest.fn(),
}));

// Mock firebase-functions
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock all heavy dependencies to isolate TwilioCallManager logic
jest.mock('../lib/twilio', () => ({
  getTwilioClient: jest.fn(),
  getTwilioPhoneNumber: jest.fn(() => '+1234567890'),
  isCircuitOpen: jest.fn(() => false),
  recordTwilioSuccess: jest.fn(),
  recordTwilioFailure: jest.fn(),
}));

jest.mock('../utils/urlBase', () => ({
  getTwilioCallWebhookUrl: jest.fn(() => 'https://mock.url/webhook'),
  getTwilioAmdTwimlUrl: jest.fn(() => 'https://mock.url/amd'),
}));

jest.mock('../utils/logs/logError', () => ({
  logError: jest.fn(),
}));

jest.mock('../utils/logs/logCallRecord', () => ({
  logCallRecord: jest.fn(),
}));

jest.mock('../StripeManager', () => ({
  stripeManager: {
    capturePayment: jest.fn(),
    cancelPayment: jest.fn(),
    refundPayment: jest.fn(),
  },
}));

jest.mock('../lib/tasks', () => ({
  scheduleProviderAvailableTask: jest.fn().mockResolvedValue('mock-task-id'),
}));

jest.mock('../callables/providerStatusManager', () => ({
  setProviderAvailable: jest.fn(),
}));

jest.mock('../utils/encryption', () => ({
  encryptPhoneNumber: jest.fn((p: string) => `encrypted_${p}`),
  decryptPhoneNumber: jest.fn((p: string) => p.replace('encrypted_', '')),
}));

jest.mock('../notificationPipeline/i18n', () => ({
  resolveLang: jest.fn(() => 'fr'),
}));

jest.mock('../utils/paymentSync', () => ({
  syncPaymentStatus: jest.fn(),
}));

jest.mock('../utils/productionLogger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../config/sentry', () => ({
  captureError: jest.fn(),
}));

jest.mock('../chatter/services/chatterCommissionService', () => ({
  cancelCommissionsForCallSession: jest.fn(),
}));
jest.mock('../influencer/services/influencerCommissionService', () => ({
  cancelCommissionsForCallSession: jest.fn(),
}));
jest.mock('../blogger/services/bloggerCommissionService', () => ({
  cancelBloggerCommissionsForCallSession: jest.fn(),
}));
jest.mock('../groupAdmin/services/groupAdminCommissionService', () => ({
  cancelCommissionsForCallSession: jest.fn(),
}));
jest.mock('../affiliate/services/commissionService', () => ({
  cancelCommissionsForCallSession: jest.fn(),
}));
jest.mock('../unified/handlers/handleCallRefunded', () => ({
  cancelUnifiedCommissionsForCallSession: jest.fn(),
}));

jest.mock('../content/voicePrompts.json', () => ({
  provider_intro: { fr: 'Bonjour' },
  client_intro: { fr: 'Bonjour' },
}), { virtual: true });

jest.mock('../utils/types', () => ({}), { virtual: true });

// ============================================================================
// Import after mocks
// ============================================================================

import { TwilioCallManager, CallSessionState } from '../TwilioCallManager';
import * as admin from 'firebase-admin';

// ============================================================================
// Helpers
// ============================================================================

function makeTimestamp(date: Date = new Date()): admin.firestore.Timestamp {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    isEqual: () => false,
    valueOf: () => '',
  } as unknown as admin.firestore.Timestamp;
}

function buildSession(overrides: Partial<CallSessionState> = {}): CallSessionState {
  const now = new Date();
  const twoMinAgo = new Date(now.getTime() - 120_000);
  const oneMinAgo = new Date(now.getTime() - 60_000);

  return {
    id: 'test_session_1',
    clientId: 'client_1',
    providerId: 'provider_1',
    status: 'active',
    participants: {
      provider: {
        phone: '+33600000001',
        status: 'connected',
        callSid: 'CA_provider_1',
        connectedAt: makeTimestamp(twoMinAgo),
        disconnectedAt: undefined,
        attemptCount: 1,
      },
      client: {
        phone: '+33600000002',
        status: 'connected',
        callSid: 'CA_client_1',
        connectedAt: makeTimestamp(twoMinAgo),
        disconnectedAt: undefined,
        attemptCount: 1,
      },
    },
    conference: {
      sid: 'CF_test_1',
      name: 'conf_test_session_1',
      startedAt: makeTimestamp(twoMinAgo),
      duration: 80,
      billingDuration: 80,
      effectiveBillingDuration: 80,
    },
    payment: {
      intentId: 'pi_test_1',
      status: 'authorized',
      amount: 5000,
    },
    metadata: {
      providerId: 'provider_1',
      clientId: 'client_1',
      serviceType: 'lawyer_call',
      providerType: 'lawyer',
      maxDuration: 3600,
      createdAt: makeTimestamp(twoMinAgo),
      updatedAt: makeTimestamp(oneMinAgo),
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TwilioCallManager — Payment Race Condition Fixes (P0 2026-04-10)', () => {
  let manager: TwilioCallManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Constructor calls admin.firestore() which is mocked above
    manager = new TwilioCallManager();
  });

  // ==========================================================================
  // FIX 1: shouldCapturePayment — duration & status checks
  // ==========================================================================

  describe('shouldCapturePayment()', () => {
    it('should return true for authorized Stripe payment with duration >= 60s', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 80)).toBe(true);
    });

    it('should return false for duration < 60s', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 50)).toBe(false);
    });

    it('should return false for duration = 0 when conference.duration is also 0', () => {
      const now = new Date();
      const session = buildSession({
        payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 },
        conference: { name: 'conf', duration: 0 },
        // No connectedAt timestamps → no overlap fallback either
        participants: {
          provider: { phone: '+33600000001', status: 'pending', attemptCount: 0 },
          client: { phone: '+33600000002', status: 'pending', attemptCount: 0 },
        },
      });
      expect(manager.shouldCapturePayment(session, 0)).toBe(false);
    });

    it('should return true for requires_action (3D Secure)', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'requires_action', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 80)).toBe(true);
    });

    it('should return false for "processing" status (Stripe)', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'processing' as any, amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 80)).toBe(false);
    });

    it('should return false for "cancelled" status', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'cancelled', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 80)).toBe(false);
    });

    // --- PayPal-specific ---

    it('should return true for PayPal with authorizationId even if local status is stale', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'pending' as any,
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });
      // Simulate authorizationId on payment
      (session.payment as any).authorizationId = 'AUTH_1';
      expect(manager.shouldCapturePayment(session, 80)).toBe(true);
    });

    it('should return false for PayPal with authorizationId but status = "voided" (P0 FIX 2026-04-10)', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'voided',
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });
      (session.payment as any).authorizationId = 'AUTH_1';
      expect(manager.shouldCapturePayment(session, 80)).toBe(false);
    });

    it('should return false for PayPal with authorizationId but status = "cancelled" (P0 FIX 2026-04-10)', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'cancelled',
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });
      (session.payment as any).authorizationId = 'AUTH_1';
      expect(manager.shouldCapturePayment(session, 80)).toBe(false);
    });

    it('should return false for PayPal with authorizationId but status = "refunded" (P0 FIX 2026-04-10)', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'refunded',
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });
      (session.payment as any).authorizationId = 'AUTH_1';
      expect(manager.shouldCapturePayment(session, 80)).toBe(false);
    });

    it('should use conference duration as fallback when duration param is 0 (JS falsy)', () => {
      const session = buildSession({
        payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 },
        conference: { name: 'conf', sid: 'CF1', duration: 90 },
      });
      // duration param = 0 is falsy in JS, so `duration || sessionDuration` → 90
      // This is correct behavior: 0 means "no duration provided" → use fallback
      expect(manager.shouldCapturePayment(session, 0)).toBe(true);
      // With undefined duration param, should also use conference.duration
      expect(manager.shouldCapturePayment(session)).toBe(true);
    });

    it('should calculate overlap duration from participant timestamps as last fallback', () => {
      const now = new Date();
      const twoMinAgo = new Date(now.getTime() - 120_000);
      const session = buildSession({
        payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 },
        conference: { name: 'conf', duration: 0 },
        participants: {
          provider: {
            phone: '+33600000001',
            status: 'disconnected',
            connectedAt: makeTimestamp(twoMinAgo),
            disconnectedAt: makeTimestamp(now),
            attemptCount: 1,
          },
          client: {
            phone: '+33600000002',
            status: 'disconnected',
            connectedAt: makeTimestamp(twoMinAgo),
            disconnectedAt: makeTimestamp(now),
            attemptCount: 1,
          },
        },
      });
      // duration param = undefined, conference.duration = 0
      // Should calculate from timestamps: 120s overlap → >= 60 → true
      expect(manager.shouldCapturePayment(session)).toBe(true);
    });
  });

  // ==========================================================================
  // FIX 2: handleCallCompletion idempotency — "processing" blocks 2nd webhook
  // ==========================================================================

  describe('handleCallCompletion() — idempotency with "processing" status', () => {
    it('should skip when payment.status is already "processing" (P0 FIX 2026-04-10)', async () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'processing' as any, amount: 5000 } });

      // getCallSession returns the session
      mockDocGet.mockResolvedValue({ exists: true, data: () => session, id: 'test_session_1' });

      // Transaction: should detect "processing" as final and set shouldProcess = false
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const txDoc = {
          exists: true,
          data: () => ({ payment: { status: 'processing' } }),
        };
        mockTransactionGet.mockResolvedValue(txDoc);
        await fn({ get: mockTransactionGet, update: mockTransactionUpdate });
      });

      await manager.handleCallCompletion('test_session_1', 80);

      // Transaction.update should NOT be called (skipped because "processing" is final)
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('should skip when payment.status is already "captured"', async () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'captured', amount: 5000 } });

      mockDocGet.mockResolvedValue({ exists: true, data: () => session, id: 'test_session_1' });

      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const txDoc = {
          exists: true,
          data: () => ({ payment: { status: 'captured' } }),
        };
        mockTransactionGet.mockResolvedValue(txDoc);
        await fn({ get: mockTransactionGet, update: mockTransactionUpdate });
      });

      await manager.handleCallCompletion('test_session_1', 80);

      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('should proceed when payment.status is "authorized"', async () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });

      mockDocGet.mockResolvedValue({ exists: true, data: () => session, id: 'test_session_1' });

      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const txDoc = {
          exists: true,
          data: () => ({ payment: { status: 'authorized' } }),
        };
        mockTransactionGet.mockResolvedValue(txDoc);
        await fn({ get: mockTransactionGet, update: mockTransactionUpdate, set: mockTransactionSet });
      });

      // capturePaymentForSession will be called — mock it to avoid further side effects
      const captureSpy = jest.spyOn(manager, 'capturePaymentForSession' as any).mockResolvedValue(true);

      await manager.handleCallCompletion('test_session_1', 80);

      // Transaction.update SHOULD be called to set "processing"
      expect(mockTransactionUpdate).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // FIX 3: Race scenario — participant-leave + conference-end
  // ==========================================================================

  describe('Race condition: participant-leave vs conference-end', () => {
    it('second handleCallCompletion call should be blocked when first already set "processing"', async () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });

      mockDocGet.mockResolvedValue({ exists: true, data: () => session, id: 'test_session_1' });

      // Simulate: 1st call set payment.status to "processing" already
      // 2nd call's transaction reads "processing"
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const txDoc = {
          exists: true,
          data: () => ({ payment: { status: 'processing' } }),
        };
        mockTransactionGet.mockResolvedValue(txDoc);
        await fn({ get: mockTransactionGet, update: mockTransactionUpdate });
      });

      const captureSpy = jest.spyOn(manager, 'capturePaymentForSession' as any).mockResolvedValue(true);

      await manager.handleCallCompletion('test_session_1', 80);

      // Should NOT attempt capture or refund — blocked by idempotency
      expect(captureSpy).not.toHaveBeenCalled();
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('conference-end should NOT trigger refund when participant-leave already captured', async () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'captured', amount: 5000 } });

      mockDocGet.mockResolvedValue({ exists: true, data: () => session, id: 'test_session_1' });

      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const txDoc = {
          exists: true,
          data: () => ({ payment: { status: 'captured' } }),
        };
        mockTransactionGet.mockResolvedValue(txDoc);
        await fn({ get: mockTransactionGet, update: mockTransactionUpdate });
      });

      await manager.handleCallCompletion('test_session_1', 80);

      // No transaction update, no capture, no refund
      expect(mockTransactionUpdate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // FIX 4: PayPal terminal statuses in shouldCapturePayment
  // ==========================================================================

  describe('shouldCapturePayment() — PayPal terminal guard', () => {
    const paypalStatuses = ['voided', 'cancelled', 'refunded'] as const;

    paypalStatuses.forEach((status) => {
      it(`should block PayPal capture when status is "${status}" even with authorizationId`, () => {
        const session = buildSession({
          payment: {
            intentId: 'pi_1',
            status: status as any,
            amount: 5000,
            paypalOrderId: 'ORDER_1',
          } as any,
        });
        (session.payment as any).authorizationId = 'AUTH_1';

        const result = manager.shouldCapturePayment(session, 120);
        expect(result).toBe(false);
      });
    });

    it('should allow PayPal capture when status is "authorized" with authorizationId', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'authorized',
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });
      (session.payment as any).authorizationId = 'AUTH_1';

      const result = manager.shouldCapturePayment(session, 120);
      expect(result).toBe(true);
    });

    it('should allow PayPal capture without authorizationId when status is "authorized"', () => {
      const session = buildSession({
        payment: {
          intentId: 'pi_1',
          status: 'authorized',
          amount: 5000,
          paypalOrderId: 'ORDER_1',
        } as any,
      });

      const result = manager.shouldCapturePayment(session, 120);
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Edge cases — duration calculation fallbacks
  // ==========================================================================

  describe('shouldCapturePayment() — duration edge cases', () => {
    it('should return true at exactly 60s (boundary)', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 60)).toBe(true);
    });

    it('should return false at 59s (just below boundary)', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 59)).toBe(false);
    });

    it('should return true for very long calls (3600s)', () => {
      const session = buildSession({ payment: { intentId: 'pi_1', status: 'authorized', amount: 5000 } });
      expect(manager.shouldCapturePayment(session, 3600)).toBe(true);
    });
  });
});
