/**
 * StripeManager Unit Tests - Destination Charges
 *
 * Tests for the Stripe payment integration with Destination Charges model.
 * These tests verify:
 * - PaymentIntent creation with transfer_data
 * - Payment capture returning transferId
 * - Refund with reverse_transfer
 * - Payment cancellation (before capture)
 */

import Stripe from 'stripe';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Stripe client
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockPaymentIntentsCapture = jest.fn();
const mockPaymentIntentsCancel = jest.fn();
const mockRefundsCreate = jest.fn();
const mockAccountsRetrieve = jest.fn();
const mockTransfersCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
      capture: mockPaymentIntentsCapture,
      cancel: mockPaymentIntentsCancel,
    },
    refunds: {
      create: mockRefundsCreate,
    },
    accounts: {
      retrieve: mockAccountsRetrieve,
    },
    transfers: {
      create: mockTransfersCreate,
    },
  }));
});

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-timestamp'),
      increment: jest.fn((n) => n),
    },
    Timestamp: {
      now: jest.fn(() => ({ toDate: () => new Date() })),
    },
  },
}));

// Mock Firebase utils
const mockDbSet = jest.fn().mockResolvedValue(undefined);
const mockDbUpdate = jest.fn().mockResolvedValue(undefined);
const mockDbGet = jest.fn();
const mockDbAdd = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });

jest.mock('../utils/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: mockDbSet,
        update: mockDbUpdate,
        get: mockDbGet,
      })),
      add: mockDbAdd,
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true }),
          })),
        })),
      })),
    })),
  },
}));

// Mock logError
jest.mock('../utils/logs/logError', () => ({
  logError: jest.fn(),
}));

// Import after mocks
import { StripeManager, toCents } from '../StripeManager';

// ============================================================================
// Test Suite: StripeManager - Destination Charges
// ============================================================================

describe('StripeManager - Destination Charges', () => {
  let stripeManager: StripeManager;
  const TEST_SECRET_KEY = 'sk_test_123456789abcdef';

  beforeEach(() => {
    jest.clearAllMocks();
    stripeManager = new StripeManager();

    // Default mock implementations
    mockDbGet.mockResolvedValue({
      exists: true,
      data: () => ({
        email: 'test@example.com',
        status: 'active',
      }),
    });
  });

  // ==========================================================================
  // createPaymentIntent Tests
  // ==========================================================================

  describe('createPaymentIntent', () => {
    const basePaymentData = {
      amount: 49,
      currency: 'eur' as const,
      clientId: 'client-123',
      providerId: 'provider-456',
      serviceType: 'lawyer_call' as const,
      providerType: 'lawyer' as const,
      providerAmount: 30,
      connectionFeeAmount: 19,
      callSessionId: 'session-abc',
    };

    it('should create PaymentIntent with transfer_data when destinationAccountId is provided', async () => {
      // Arrange
      const paymentDataWithDestination = {
        ...basePaymentData,
        destinationAccountId: 'acct_provider123',
      };

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_abc',
        status: 'requires_payment_method',
        amount: 4900,
      };
      mockPaymentIntentsCreate.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await stripeManager.createPaymentIntent(
        paymentDataWithDestination,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test123');
      expect(result.clientSecret).toBe('pi_test123_secret_abc');

      // Verify Stripe was called with correct parameters
      expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
      const createCall = mockPaymentIntentsCreate.mock.calls[0][0];

      expect(createCall.amount).toBe(4900); // 49 EUR in cents
      expect(createCall.currency).toBe('eur');
      expect(createCall.capture_method).toBe('manual');
      expect(createCall.automatic_payment_methods).toEqual({ enabled: true });
    });

    it('should include transfer_data.amount for provider share in cents', async () => {
      // Arrange
      const paymentDataWithDestination = {
        ...basePaymentData,
        destinationAccountId: 'acct_provider123',
      };

      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test456',
        client_secret: 'pi_test456_secret',
        status: 'requires_payment_method',
        amount: 4900,
      });

      // Act
      await stripeManager.createPaymentIntent(
        paymentDataWithDestination,
        TEST_SECRET_KEY
      );

      // Assert - Verify metadata contains provider amount info
      const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
      expect(createCall.metadata.providerAmountCents).toBe('3000'); // 30 EUR = 3000 cents
      expect(createCall.metadata.providerAmountEuros).toBe('30.00');
    });

    it('should create PaymentIntent without transfer_data when no destinationAccountId', async () => {
      // Arrange
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_test789',
        client_secret: 'pi_test789_secret',
        status: 'requires_payment_method',
        amount: 4900,
      });

      // Act
      const result = await stripeManager.createPaymentIntent(
        basePaymentData,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);

      // Verify no transfer_data in the call
      const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
      expect(createCall.transfer_data).toBeUndefined();
    });

    it('should fail if amount is invalid', async () => {
      // Arrange
      const invalidData = {
        ...basePaymentData,
        amount: -10,
      };

      // Act
      const result = await stripeManager.createPaymentIntent(
        invalidData,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Montant');
    });

    it('should fail if amount is below minimum (5 EUR)', async () => {
      // Arrange
      const invalidData = {
        ...basePaymentData,
        amount: 3,
        providerAmount: 2,
        connectionFeeAmount: 1,
      };

      // Act
      const result = await stripeManager.createPaymentIntent(
        invalidData,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('minimum');
    });

    it('should fail if clientId equals providerId', async () => {
      // Arrange
      const invalidData = {
        ...basePaymentData,
        clientId: 'same-id',
        providerId: 'same-id',
      };

      // Act
      const result = await stripeManager.createPaymentIntent(
        invalidData,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('identiques');
    });

    it('should include callSessionId in metadata when provided', async () => {
      // Arrange
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_with_session',
        client_secret: 'secret',
        status: 'requires_payment_method',
        amount: 4900,
      });

      // Act
      await stripeManager.createPaymentIntent(basePaymentData, TEST_SECRET_KEY);

      // Assert
      const createCall = mockPaymentIntentsCreate.mock.calls[0][0];
      expect(createCall.metadata.callSessionId).toBe('session-abc');
    });
  });

  // ==========================================================================
  // capturePayment Tests
  // ==========================================================================

  describe('capturePayment', () => {
    const paymentIntentId = 'pi_capture_test';
    const sessionId = 'session-capture-123';

    it('should successfully capture payment and return success', async () => {
      // Arrange
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: paymentIntentId,
        status: 'requires_capture',
        amount: 4900,
      });

      mockPaymentIntentsCapture.mockResolvedValue({
        id: paymentIntentId,
        status: 'succeeded',
        amount: 4900,
        latest_charge: {
          transfer: {
            id: 'tr_auto_transfer123',
          },
        },
      });

      // Act
      const result = await stripeManager.capturePayment(
        paymentIntentId,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe(paymentIntentId);
      expect(mockPaymentIntentsCapture).toHaveBeenCalledWith(paymentIntentId);
    });

    it('should fail if payment is not in requires_capture status', async () => {
      // Arrange
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: paymentIntentId,
        status: 'succeeded', // Already captured
        amount: 4900,
      });

      // Act
      const result = await stripeManager.capturePayment(
        paymentIntentId,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('capturer');
      expect(mockPaymentIntentsCapture).not.toHaveBeenCalled();
    });

    it('should update Firestore with captured status', async () => {
      // Arrange
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: paymentIntentId,
        status: 'requires_capture',
      });

      mockPaymentIntentsCapture.mockResolvedValue({
        id: paymentIntentId,
        status: 'succeeded',
      });

      // Act
      await stripeManager.capturePayment(paymentIntentId, sessionId, TEST_SECRET_KEY);

      // Assert
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'succeeded',
          sessionId: sessionId,
        })
      );
    });

    it('should handle Stripe errors gracefully', async () => {
      // Arrange
      mockPaymentIntentsRetrieve.mockRejectedValue(
        new Error('Stripe network error')
      );

      // Act
      const result = await stripeManager.capturePayment(
        paymentIntentId,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==========================================================================
  // refundPayment Tests
  // ==========================================================================

  describe('refundPayment', () => {
    const paymentIntentId = 'pi_refund_test';
    const sessionId = 'session-refund-123';
    const refundReason = 'requested_by_customer';

    it('should create refund with reverse_transfer for captured payments', async () => {
      // Arrange
      const mockRefund = {
        id: 'rf_test123',
        amount: 4900,
        status: 'succeeded',
      };
      mockRefundsCreate.mockResolvedValue(mockRefund);

      // Act
      const result = await stripeManager.refundPayment(
        paymentIntentId,
        refundReason,
        sessionId,
        undefined, // full refund
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockRefundsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: paymentIntentId,
          reason: refundReason,
          metadata: expect.objectContaining({
            sessionId: sessionId,
            refundReason: refundReason,
          }),
        })
      );
    });

    it('should support partial refunds with specific amount', async () => {
      // Arrange
      const partialAmount = 20; // 20 EUR
      mockRefundsCreate.mockResolvedValue({
        id: 'rf_partial123',
        amount: 2000,
        status: 'succeeded',
      });

      // Act
      const result = await stripeManager.refundPayment(
        paymentIntentId,
        refundReason,
        sessionId,
        partialAmount,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockRefundsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: paymentIntentId,
          amount: 2000, // 20 EUR in cents
        })
      );
    });

    it('should update Firestore with refund information', async () => {
      // Arrange
      mockRefundsCreate.mockResolvedValue({
        id: 'rf_update_test',
        amount: 4900,
        status: 'succeeded',
      });

      // Act
      await stripeManager.refundPayment(
        paymentIntentId,
        refundReason,
        sessionId,
        undefined,
        TEST_SECRET_KEY
      );

      // Assert
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'refunded',
          refundId: 'rf_update_test',
          refundReason: refundReason,
        })
      );
    });

    it('should handle invalid refund reasons gracefully', async () => {
      // Arrange
      const invalidReason = 'invalid_reason_xyz';
      mockRefundsCreate.mockResolvedValue({
        id: 'rf_invalid_reason',
        amount: 4900,
        status: 'succeeded',
      });

      // Act
      const result = await stripeManager.refundPayment(
        paymentIntentId,
        invalidReason,
        sessionId,
        undefined,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      // Verify invalid reason is stored in metadata but not passed as official reason
      expect(mockRefundsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            refundReason: invalidReason,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // cancelPayment Tests (Before Capture)
  // ==========================================================================

  describe('cancelPayment', () => {
    const paymentIntentId = 'pi_cancel_test';
    const sessionId = 'session-cancel-123';

    it('should cancel uncaptured payment successfully', async () => {
      // Arrange
      const cancelReason = 'abandoned';
      mockPaymentIntentsCancel.mockResolvedValue({
        id: paymentIntentId,
        status: 'canceled',
      });

      // Act
      const result = await stripeManager.cancelPayment(
        paymentIntentId,
        cancelReason,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe(paymentIntentId);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith(
        paymentIntentId,
        expect.objectContaining({
          cancellation_reason: cancelReason,
        })
      );
    });

    it('should handle cancellation with customer request reason', async () => {
      // Arrange
      const cancelReason = 'requested_by_customer';
      mockPaymentIntentsCancel.mockResolvedValue({
        id: paymentIntentId,
        status: 'canceled',
      });

      // Act
      const result = await stripeManager.cancelPayment(
        paymentIntentId,
        cancelReason,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith(
        paymentIntentId,
        { cancellation_reason: cancelReason }
      );
    });

    it('should update Firestore with cancel status and reason', async () => {
      // Arrange
      const cancelReason = 'duplicate';
      mockPaymentIntentsCancel.mockResolvedValue({
        id: paymentIntentId,
        status: 'canceled',
      });

      // Act
      await stripeManager.cancelPayment(
        paymentIntentId,
        cancelReason,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'canceled',
          cancelReason: cancelReason,
          sessionId: sessionId,
        })
      );
    });

    it('should handle Stripe cancel errors gracefully', async () => {
      // Arrange
      mockPaymentIntentsCancel.mockRejectedValue(
        new Error('Cannot cancel: payment already captured')
      );

      // Act
      const result = await stripeManager.cancelPayment(
        paymentIntentId,
        'abandoned',
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid cancel reasons by omitting from Stripe call', async () => {
      // Arrange
      const invalidReason = 'custom_invalid_reason';
      mockPaymentIntentsCancel.mockResolvedValue({
        id: paymentIntentId,
        status: 'canceled',
      });

      // Act
      const result = await stripeManager.cancelPayment(
        paymentIntentId,
        invalidReason,
        sessionId,
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      // Verify cancel was called without the invalid reason
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith(
        paymentIntentId,
        {} // Empty object when reason is invalid
      );
    });
  });

  // ==========================================================================
  // transferToProvider Tests
  // ==========================================================================

  describe('transferToProvider', () => {
    const providerId = 'provider-transfer-123';
    const providerAmount = 30;
    const sessionId = 'session-transfer-456';

    beforeEach(() => {
      mockDbGet.mockImplementation((path: string) => {
        return Promise.resolve({
          exists: true,
          data: () => ({
            stripeAccountId: 'acct_provider_connected',
            email: 'provider@example.com',
            status: 'active',
          }),
        });
      });
    });

    it('should create transfer to provider Stripe account', async () => {
      // Arrange
      mockAccountsRetrieve.mockResolvedValue({
        id: 'acct_provider_connected',
        charges_enabled: true,
      });

      mockTransfersCreate.mockResolvedValue({
        id: 'tr_test123',
        amount: 3000,
        destination: 'acct_provider_connected',
        currency: 'eur',
      });

      // Act
      const result = await stripeManager.transferToProvider(
        providerId,
        providerAmount,
        sessionId,
        { serviceType: 'lawyer_call' },
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.transferId).toBe('tr_test123');
      expect(mockTransfersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 3000, // 30 EUR in cents
          currency: 'eur',
          destination: 'acct_provider_connected',
          transfer_group: sessionId,
        })
      );
    });

    it('should fail if provider has no Stripe account', async () => {
      // Arrange
      mockDbGet.mockResolvedValue({
        exists: true,
        data: () => ({
          email: 'provider@example.com',
          // No stripeAccountId
        }),
      });

      // Act
      const result = await stripeManager.transferToProvider(
        providerId,
        providerAmount,
        sessionId,
        {},
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stripe onboarding');
    });

    it('should fail if provider charges are not enabled', async () => {
      // Arrange
      mockAccountsRetrieve.mockResolvedValue({
        id: 'acct_provider_connected',
        charges_enabled: false, // Not yet verified
      });

      // Act
      const result = await stripeManager.transferToProvider(
        providerId,
        providerAmount,
        sessionId,
        {},
        TEST_SECRET_KEY
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot receive payments');
    });

    it('should save transfer record to Firestore', async () => {
      // Arrange
      mockAccountsRetrieve.mockResolvedValue({
        id: 'acct_provider_connected',
        charges_enabled: true,
      });

      mockTransfersCreate.mockResolvedValue({
        id: 'tr_firestore_test',
        amount: 3000,
        destination: 'acct_provider_connected',
        currency: 'eur',
        object: 'transfer',
        reversed: false,
      });

      // Act
      await stripeManager.transferToProvider(
        providerId,
        providerAmount,
        sessionId,
        {},
        TEST_SECRET_KEY
      );

      // Assert
      expect(mockDbAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          transferId: 'tr_firestore_test',
          providerId: providerId,
          amount: providerAmount,
          amountCents: 3000,
          sessionId: sessionId,
        })
      );
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('toCents utility', () => {
    it('should convert euros to cents correctly', () => {
      expect(toCents(49)).toBe(4900);
      expect(toCents(19)).toBe(1900);
      expect(toCents(30)).toBe(3000);
    });

    it('should handle decimal amounts', () => {
      expect(toCents(49.99)).toBe(4999);
      expect(toCents(19.50)).toBe(1950);
    });

    it('should round correctly for edge cases', () => {
      expect(toCents(49.995)).toBe(5000); // Rounds up
      expect(toCents(49.994)).toBe(4999); // Rounds down
    });

    it('should handle zero', () => {
      expect(toCents(0)).toBe(0);
    });
  });
});
