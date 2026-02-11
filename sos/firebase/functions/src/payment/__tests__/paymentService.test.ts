/**
 * PaymentService Unit Tests
 *
 * Tests for withdrawal race conditions, balance atomicity, and validation logic.
 *
 * Critical scenarios tested:
 * - Concurrent withdrawal requests (race condition via double-pending check)
 * - Insufficient balance detected inside transaction
 * - Balance deduction atomicity
 * - Withdrawal cancellation with atomic refund
 * - Status validation for cancel/approve/reject operations
 */

// ============================================================================
// Mock Setup
// ============================================================================

const mockRunTransaction = jest.fn();
const mockCollectionDoc = jest.fn();
const mockCollectionWhere = jest.fn();
const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocSet = jest.fn();
const mockQueryGet = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockTransactionSet = jest.fn();

// Chain mocks for Firestore queries
const mockLimit = jest.fn(() => ({ get: mockQueryGet }));
const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
const mockWhereChain: jest.Mock = jest.fn(() => ({
  where: mockWhereChain,
  limit: mockLimit,
  orderBy: mockOrderBy,
  get: mockQueryGet,
}));

const mockDocRef = {
  id: 'withdrawal-test-123',
  get: mockDocGet,
  update: mockDocUpdate,
  set: mockDocSet,
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => ({
      doc: jest.fn((id?: string) => ({
        ...mockDocRef,
        id: id || 'withdrawal-test-123',
      })),
      where: mockWhereChain,
      orderBy: mockOrderBy,
    })),
    runTransaction: mockRunTransaction,
  })),
  FieldValue: {
    arrayUnion: jest.fn((...args: unknown[]) => args),
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
}));

jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../types', () => ({
  ...jest.requireActual('../types'),
  DEFAULT_PAYMENT_CONFIG: {
    id: 'payment_config',
    paymentMode: 'manual',
    minimumWithdrawal: 1000,
    maximumWithdrawal: 100000,
    autoPaymentThreshold: 5000,
    maxRetries: 3,
    wiseEnabled: true,
    flutterwaveEnabled: true,
  },
}));

jest.mock('../services/paymentRouter', () => ({
  createPaymentRouter: jest.fn(() => ({
    processPayment: jest.fn().mockResolvedValue({ success: true, status: 'sent' }),
  })),
}));

import { PaymentService, COLLECTIONS } from '../services/paymentService';

// ============================================================================
// Test Suite
// ============================================================================

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService();

    // Default: config doc exists with valid config
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        paymentMode: 'manual',
        minimumWithdrawal: 1000,
        maximumWithdrawal: 100000,
        autoPaymentThreshold: 5000,
        maxRetries: 3,
        wiseEnabled: true,
        flutterwaveEnabled: true,
          }),
    });
  });

  // ==========================================================================
  // createWithdrawalRequest - Race Condition Tests
  // ==========================================================================

  describe('createWithdrawalRequest - Race Conditions', () => {
    const baseParams = {
      userId: 'user-123',
      userType: 'chatter' as const,
      userEmail: 'test@example.com',
      userName: 'Test User',
      amount: 5000,
      paymentMethodId: 'pm-456',
    };

    it('should throw if a pending withdrawal exists (inside transaction)', async () => {
      // Chain mockDocGet for sequential calls:
      // 1. getConfig() → payment config doc
      // 2. getUserAvailableBalance() → user doc with sufficient balance
      // 3. payment method doc
      // 4. getConfig() again (for processing mode)
      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            paymentMode: 'manual', minimumWithdrawal: 1000, maximumWithdrawal: 100000,
            autoPaymentThreshold: 5000, maxRetries: 3, wiseEnabled: true, flutterwaveEnabled: true,
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ availableBalance: 50000 }), // Sufficient balance
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: 'user-123', userType: 'chatter', provider: 'wise', methodType: 'bank_transfer',
            details: { type: 'bank_transfer', accountHolderName: 'Test', country: 'FR', currency: 'EUR', iban: 'FR7630006000011234567890189' },
          }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            paymentMode: 'manual', minimumWithdrawal: 1000, maximumWithdrawal: 100000,
            autoPaymentThreshold: 5000, maxRetries: 3, wiseEnabled: true, flutterwaveEnabled: true,
          }),
        });

      // Pre-check for pending withdrawals passes (validateWithdrawalRequest)
      mockQueryGet.mockResolvedValueOnce({ empty: true });

      mockRunTransaction.mockImplementation(async (fn: Function) => {
        // Inside transaction, the pending check finds an existing withdrawal
        mockQueryGet.mockResolvedValueOnce({
          empty: false,
          docs: [{ data: () => ({ status: 'pending' }) }],
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await expect(service.createWithdrawalRequest(baseParams))
        .rejects.toThrow('already pending');
    });

    it('should throw if balance is insufficient inside transaction', async () => {
      // Pre-checks pass
      mockQueryGet.mockResolvedValue({ empty: true });

      // Payment method exists and belongs to user
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          userId: 'user-123',
          userType: 'chatter',
          provider: 'wise',
          methodType: 'bank_transfer',
          details: { type: 'bank_transfer', accountHolderName: 'Test', country: 'FR', currency: 'EUR', iban: 'FR7630006000011234567890189' },
        }),
      });

      mockRunTransaction.mockImplementation(async (fn: Function) => {
        // Inside transaction: no pending withdrawal
        mockQueryGet.mockResolvedValueOnce({ empty: true });

        // But balance is insufficient
        mockTransactionGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ availableBalance: 1000 }), // Only $10, requesting $50
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await expect(service.createWithdrawalRequest(baseParams))
        .rejects.toThrow('Insufficient balance');
    });
  });

  // ==========================================================================
  // cancelWithdrawal - Atomic Refund Tests
  // ==========================================================================

  describe('cancelWithdrawal - Atomic Refund', () => {
    it('should reject cancellation if withdrawal is not pending', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: 'user-123',
            status: 'processing', // Not cancellable
            amount: 5000,
            userType: 'chatter',
          }),
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await expect(service.cancelWithdrawal('wd-123', 'user-123'))
        .rejects.toThrow('Cannot cancel withdrawal with status: processing');
    });

    it('should reject cancellation by wrong user', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: 'user-456', // Different user
            status: 'pending',
            amount: 5000,
            userType: 'chatter',
          }),
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await expect(service.cancelWithdrawal('wd-123', 'user-123'))
        .rejects.toThrow('Not authorized to cancel this withdrawal');
    });

    it('should atomically cancel and refund balance', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        const transaction = {
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        };

        // First get: withdrawal doc
        mockTransactionGet
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              userId: 'user-123',
              status: 'pending',
              amount: 5000,
              userType: 'chatter',
            }),
          })
          // Second get: user doc for balance refund
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              availableBalance: 3000,
            }),
          });

        await fn(transaction);
      });

      await service.cancelWithdrawal('wd-123', 'user-123', 'Changed my mind');

      // Verify two updates happened in the transaction
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);

      // First update: withdrawal status → cancelled
      expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ status: 'cancelled' })
      );

      // Second update: balance refund (3000 + 5000 = 8000)
      expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ availableBalance: 8000 })
      );
    });
  });

  // ==========================================================================
  // rejectWithdrawal - Atomic Refund Tests
  // ==========================================================================

  describe('rejectWithdrawal - Atomic Refund', () => {
    it('should reject non-pending/non-validating withdrawals', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: 'user-123',
            status: 'completed',
            amount: 5000,
            userType: 'chatter',
          }),
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await expect(service.rejectWithdrawal('wd-123', 'admin-1', 'Fraud'))
        .rejects.toThrow('Cannot reject withdrawal with status: completed');
    });

    it('should atomically reject and refund balance', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              userId: 'user-123',
              status: 'pending',
              amount: 10000,
              userType: 'influencer',
            }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              availableBalance: 5000,
            }),
          });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await service.rejectWithdrawal('wd-123', 'admin-1', 'Suspicious activity');

      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);

      // Withdrawal status → rejected
      expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ status: 'rejected' })
      );

      // Balance refund (5000 + 10000 = 15000)
      expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ availableBalance: 15000 })
      );
    });
  });

  // ==========================================================================
  // failWithdrawal - Retry & Refund Tests
  // ==========================================================================

  describe('failWithdrawal - Retry & Refund', () => {
    it('should NOT refund balance if retries remain', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              userId: 'user-123',
              status: 'processing',
              amount: 5000,
              userType: 'chatter',
              retryCount: 0,
              maxRetries: 3,
            }),
          });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await service.failWithdrawal('wd-123', 'PROVIDER_ERROR', 'Connection timeout');

      // Only 1 update: withdrawal status. No balance refund.
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(1);
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed',
          retryCount: 1,
        })
      );
    });

    it('should refund balance when max retries exceeded', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              userId: 'user-123',
              status: 'processing',
              amount: 5000,
              userType: 'chatter',
              retryCount: 2, // This will be the 3rd failure
              maxRetries: 3,
            }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              availableBalance: 0,
            }),
          });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
        });
      });

      await service.failWithdrawal('wd-123', 'PROVIDER_ERROR', 'Max retries');

      // 2 updates: withdrawal status + balance refund
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);

      // Balance refund (0 + 5000 = 5000)
      expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({ availableBalance: 5000 })
      );
    });
  });

  // ==========================================================================
  // deletePaymentMethod - TOCTOU Prevention
  // ==========================================================================

  describe('deletePaymentMethod', () => {
    it('should reject deletion by wrong user', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            userId: 'other-user',
            userType: 'chatter',
          }),
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
          delete: jest.fn(),
        });
      });

      await expect(service.deletePaymentMethod('user-123', 'pm-456'))
        .rejects.toThrow('Not authorized to delete this payment method');
    });

    it('should reject deletion of non-existent method', async () => {
      mockRunTransaction.mockImplementation(async (fn: Function) => {
        mockTransactionGet.mockResolvedValueOnce({
          exists: false,
        });

        await fn({
          get: mockTransactionGet,
          update: mockTransactionUpdate,
          set: mockTransactionSet,
          delete: jest.fn(),
        });
      });

      await expect(service.deletePaymentMethod('user-123', 'pm-456'))
        .rejects.toThrow('Payment method not found');
    });
  });

  // ==========================================================================
  // getUserCollectionName mapping
  // ==========================================================================

  describe('Collection name mapping', () => {
    it('should map userType to correct Firestore collection', () => {
      expect(COLLECTIONS.CHATTERS).toBe('chatters');
      expect(COLLECTIONS.INFLUENCERS).toBe('influencers');
      expect(COLLECTIONS.BLOGGERS).toBe('bloggers');
      expect(COLLECTIONS.GROUP_ADMINS).toBe('group_admins');
    });
  });
});
