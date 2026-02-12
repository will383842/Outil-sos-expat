/**
 * Wise Provider Unit Tests
 *
 * Comprehensive test suite for the Wise payment provider.
 * Tests all API methods, error handling, and the complete payment flow.
 *
 * Test Coverage:
 * - Quote creation (exchange rates, fees)
 * - Recipient creation (all account types: IBAN, SWIFT, ABA, etc.)
 * - Transfer creation with idempotency
 * - Transfer funding (balance checks, insufficient funds)
 * - Transfer status monitoring (all states)
 * - Transfer cancellation
 * - Balance queries
 * - Complete payment flow (end-to-end)
 * - Error handling (HTTP statuses, retryable errors, rate limits)
 * - Security (signature verification, authentication)
 */

// ============================================================================
// Mock Setup
// ============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));

// Mock secrets with proper value() function
const mockGetWiseApiToken = jest.fn(() => 'test-api-token');
const mockGetWiseProfileId = jest.fn(() => '12345');
const mockGetWiseMode = jest.fn(() => 'sandbox' as 'sandbox' | 'live' | 'production');

jest.mock('../../../lib/secrets', () => ({
  getWiseApiToken: mockGetWiseApiToken,
  getWiseProfileId: mockGetWiseProfileId,
  getWiseMode: mockGetWiseMode,
  WISE_SECRETS: [],
}));

import {
  WiseProvider,
  WiseError,
  WiseErrorCode,
  type WiseQuote,
  type WiseRecipient,
  type WiseTransfer,
  type WiseTransferStatus,
  type WiseBalance,
} from '../wiseProvider';
import type { BankTransferDetails } from '../../types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock HTTP response
 */
function createMockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as Response;
}

/**
 * Create a mock rate-limited response (429)
 */
function createRateLimitResponse(): Response {
  const headers = new Headers();
  headers.set('Retry-After', '60');
  return {
    ok: false,
    status: 429,
    json: async () => ({ message: 'Rate limit exceeded' }),
    text: async () => JSON.stringify({ message: 'Rate limit exceeded' }),
    headers,
  } as Response;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('WiseProvider', () => {
  let wiseProvider: WiseProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    wiseProvider = WiseProvider.fromSecrets();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize from secrets successfully', () => {
      expect(wiseProvider).toBeInstanceOf(WiseProvider);
      expect(wiseProvider.getEnvironment()).toBe('sandbox');
      expect(wiseProvider.getProfileId()).toBe('12345');
      expect(wiseProvider.getBaseUrl()).toBe('https://api.sandbox.transferwise.tech');
    });

    it('should throw error if API token is missing', () => {
      mockGetWiseApiToken.mockReturnValueOnce('');
      expect(() => WiseProvider.fromSecrets()).toThrow(WiseError);
      expect(() => WiseProvider.fromSecrets()).toThrow('WISE_API_TOKEN secret is not configured');
    });

    it('should throw error if profile ID is missing', () => {
      mockGetWiseProfileId.mockReturnValueOnce('');
      expect(() => WiseProvider.fromSecrets()).toThrow(WiseError);
      expect(() => WiseProvider.fromSecrets()).toThrow('WISE_PROFILE_ID secret is not configured');
    });

    it('should use production URL for live mode', () => {
      mockGetWiseMode.mockReturnValueOnce('live');
      const liveProvider = WiseProvider.fromSecrets();
      expect(liveProvider.getBaseUrl()).toBe('https://api.wise.com');
    });

    it('should use production URL for production mode', () => {
      mockGetWiseMode.mockReturnValueOnce('production');
      const prodProvider = WiseProvider.fromSecrets();
      expect(prodProvider.getBaseUrl()).toBe('https://api.wise.com');
    });
  });

  // ==========================================================================
  // QUOTE TESTS
  // ==========================================================================

  describe('createQuote()', () => {
    const mockQuoteResponse = {
      id: 'quote-123',
      sourceCurrency: 'USD',
      targetCurrency: 'EUR',
      sourceAmount: 100,
      targetAmount: 85.5,
      rate: 0.855,
      fee: 2.5,
      deliveryEstimate: '2024-02-15T10:00:00Z',
      expirationTime: '2024-02-14T12:00:00Z',
      payIn: 'BALANCE',
    };

    it('should create a quote with source amount', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockQuoteResponse));

      const quote = await wiseProvider.createQuote({
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        sourceAmount: 100,
      });

      expect(quote).toEqual({
        id: 'quote-123',
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        sourceAmount: 100,
        targetAmount: 85.5,
        rate: 0.855,
        fee: 2.5,
        estimatedDelivery: '2024-02-15T10:00:00Z',
        expirationTime: '2024-02-14T12:00:00Z',
        paymentType: 'BALANCE',
      });

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.transferwise.tech/v3/profiles/12345/quotes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            sourceCurrency: 'USD',
            targetCurrency: 'EUR',
            sourceAmount: 100,
            payOut: 'BANK_TRANSFER',
            preferredPayIn: 'BALANCE',
          }),
        })
      );
    });

    it('should create a quote with target amount', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockQuoteResponse));

      const quote = await wiseProvider.createQuote({
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        targetAmount: 85.5,
      });

      expect(quote).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"targetAmount":85.5'),
        })
      );
    });

    it('should throw validation error if both amounts are missing', async () => {
      await expect(
        wiseProvider.createQuote({
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
        })
      ).rejects.toThrow(WiseError);

      await expect(
        wiseProvider.createQuote({
          sourceCurrency: 'USD',
          targetCurrency: 'EUR',
        })
      ).rejects.toThrow('Either sourceAmount or targetAmount is required');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(422, {
        message: 'Invalid currency pair',
        errors: [{ code: 'INVALID_CURRENCY' }],
      }));

      await expect(
        wiseProvider.createQuote({
          sourceCurrency: 'USD',
          targetCurrency: 'XXX',
          sourceAmount: 100,
        })
      ).rejects.toThrow(WiseError);
    });
  });

  // ==========================================================================
  // RECIPIENT TESTS
  // ==========================================================================

  describe('createRecipient()', () => {
    it('should create IBAN recipient', async () => {
      const mockResponse = {
        id: 1001,
        profile: 12345,
        accountHolderName: 'John Doe',
        currency: 'EUR',
        type: 'iban',
        active: true,
        details: { IBAN: 'DE89370400440532013000', legalType: 'PRIVATE' },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponse));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'John Doe',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      const recipient = await wiseProvider.createRecipient({
        currency: 'EUR',
        type: 'iban',
        details,
      });

      expect(recipient).toEqual({
        id: '1001',
        profileId: '12345',
        accountHolderName: 'John Doe',
        currency: 'EUR',
        type: 'iban',
        active: true,
        details: { IBAN: 'DE89370400440532013000', legalType: 'PRIVATE' },
      });

      // Verify correct body structure
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.transferwise.tech/v1/accounts',
        expect.objectContaining({
          body: expect.stringContaining('"IBAN":"DE89370400440532013000"'),
        })
      );
    });

    it('should create US ABA recipient', async () => {
      const mockResponse = {
        id: 1002,
        profile: 12345,
        accountHolderName: 'Jane Smith',
        currency: 'USD',
        type: 'aba',
        active: true,
        details: {
          abartn: '111000025',
          accountNumber: '123456789',
          accountType: 'CHECKING',
          legalType: 'PRIVATE',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponse));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Jane Smith',
        routingNumber: '111000025',
        accountNumber: '123456789',
        country: 'US',
        currency: 'USD',
      };

      const recipient = await wiseProvider.createRecipient({
        currency: 'USD',
        type: 'aba',
        details,
      });

      expect(recipient.type).toBe('aba');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"abartn":"111000025"'),
        })
      );
    });

    it('should create UK sort_code recipient', async () => {
      const mockResponse = {
        id: 1003,
        profile: 12345,
        accountHolderName: 'Bob Wilson',
        currency: 'GBP',
        type: 'sort_code',
        active: true,
        details: {
          sortCode: '200000',
          accountNumber: '55779911',
          legalType: 'PRIVATE',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponse));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Bob Wilson',
        sortCode: '200000',
        accountNumber: '55779911',
        country: 'GB',
        currency: 'GBP',
      };

      const recipient = await wiseProvider.createRecipient({
        currency: 'GBP',
        type: 'sort_code',
        details,
      });

      expect(recipient.type).toBe('sort_code');
    });

    it('should create SWIFT recipient', async () => {
      const mockResponse = {
        id: 1004,
        profile: 12345,
        accountHolderName: 'Alice Johnson',
        currency: 'USD',
        type: 'swift_code',
        active: true,
        details: {
          swiftCode: 'CHASUS33',
          accountNumber: '987654321',
          legalType: 'PRIVATE',
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponse));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Alice Johnson',
        swiftBic: 'CHASUS33',
        accountNumber: '987654321',
        country: 'US',
        currency: 'USD',
      };

      const recipient = await wiseProvider.createRecipient({
        currency: 'USD',
        type: 'swift_code',
        details,
      });

      expect(recipient.type).toBe('swift_code');
    });
  });

  // ==========================================================================
  // TRANSFER TESTS
  // ==========================================================================

  describe('createTransfer()', () => {
    const mockTransferResponse = {
      id: 5001,
      user: 999,
      targetAccount: 1001,
      quoteUuid: 'quote-123',
      status: 'incoming_payment_waiting',
      reference: 'SOS-Expat Withdrawal',
      customerTransactionId: 'wd-123',
      rate: 0.855,
      sourceValue: 100,
      sourceCurrency: 'USD',
      targetValue: 85.5,
      targetCurrency: 'EUR',
      fee: 2.5,
      created: '2024-02-14T10:00:00Z',
      business: 12345,
    };

    it('should create a transfer with idempotency key', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockTransferResponse));

      const transfer = await wiseProvider.createTransfer({
        quoteId: 'quote-123',
        recipientId: '1001',
        reference: 'SOS-Expat Withdrawal',
        externalId: 'wd-123',
      });

      expect(transfer).toEqual({
        id: '5001',
        profileId: '12345',
        quoteId: 'quote-123',
        recipientId: '1001',
        status: 'incoming_payment_waiting',
        reference: 'SOS-Expat Withdrawal',
        externalId: 'wd-123',
        rate: 0.855,
        sourceAmount: 100,
        sourceCurrency: 'USD',
        targetAmount: 85.5,
        targetCurrency: 'EUR',
        fee: 2.5,
        createdAt: '2024-02-14T10:00:00Z',
      });

      // Verify idempotency key is sent
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.transferwise.tech/v1/transfers',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-idempotency-uuid': 'wd-123',
          }),
        })
      );
    });

    it('should handle duplicate transfer (idempotency)', async () => {
      // Wise returns the existing transfer with same idempotency key
      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockTransferResponse));

      const transfer1 = await wiseProvider.createTransfer({
        quoteId: 'quote-123',
        recipientId: '1001',
        reference: 'Test',
        externalId: 'same-key',
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(200, mockTransferResponse));

      const transfer2 = await wiseProvider.createTransfer({
        quoteId: 'quote-123',
        recipientId: '1001',
        reference: 'Test',
        externalId: 'same-key',
      });

      expect(transfer1.id).toBe(transfer2.id);
    });
  });

  // ==========================================================================
  // FUNDING TESTS
  // ==========================================================================

  describe('fundTransfer()', () => {
    it('should fund transfer from balance successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          type: 'BALANCE',
          status: 'COMPLETED',
        })
      );

      const result = await wiseProvider.fundTransfer('5001');

      expect(result).toEqual({
        success: true,
        status: 'processing',
        errorMessage: undefined,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.transferwise.tech/v3/profiles/12345/transfers/5001/payments',
        expect.objectContaining({
          body: JSON.stringify({ type: 'BALANCE' }),
        })
      );
    });

    it('should handle insufficient balance error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(422, {
          message: 'Insufficient funds',
          errors: [{ code: 'INSUFFICIENT_FUNDS' }],
        })
      );

      const result = await wiseProvider.fundTransfer('5001');

      expect(result).toEqual({
        success: false,
        status: 'incoming_payment_waiting',
        errorMessage: 'Insufficient balance to fund transfer',
      });
    });

    it('should handle funding failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          type: 'BALANCE',
          status: 'REJECTED',
          errorCode: 'BALANCE_NOT_AVAILABLE',
          errorMessage: 'Balance temporarily unavailable',
        })
      );

      const result = await wiseProvider.fundTransfer('5001');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Balance temporarily unavailable');
    });
  });

  // ==========================================================================
  // TRANSFER STATUS TESTS
  // ==========================================================================

  describe('getTransferStatus()', () => {
    it('should return completed status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 5001,
          status: 'outgoing_payment_sent',
          deliveryEstimate: '2024-02-15T10:00:00Z',
          created: '2024-02-14T10:00:00Z',
        })
      );

      const status = await wiseProvider.getTransferStatus('5001');

      expect(status).toEqual({
        id: '5001',
        status: 'outgoing_payment_sent',
        isComplete: true,
        isFailed: false,
        isInProgress: false,
        statusMessage: 'Payment sent to recipient',
        estimatedDelivery: '2024-02-15T10:00:00Z',
        updatedAt: '2024-02-14T10:00:00Z',
        issues: undefined,
      });
    });

    it('should return failed status for cancelled transfer', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 5001,
          status: 'cancelled',
          created: '2024-02-14T10:00:00Z',
        })
      );

      const status = await wiseProvider.getTransferStatus('5001');

      expect(status.status).toBe('cancelled');
      expect(status.isComplete).toBe(false);
      expect(status.isFailed).toBe(true);
      expect(status.isInProgress).toBe(false);
    });

    it('should return in-progress status for processing transfer', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 5001,
          status: 'processing',
          created: '2024-02-14T10:00:00Z',
        })
      );

      const status = await wiseProvider.getTransferStatus('5001');

      expect(status.status).toBe('processing');
      expect(status.isComplete).toBe(false);
      expect(status.isFailed).toBe(false);
      expect(status.isInProgress).toBe(true);
    });

    it('should return issues if present', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 5001,
          status: 'bounced_back',
          created: '2024-02-14T10:00:00Z',
          issues: [
            { type: 'INVALID_IBAN', description: 'Recipient IBAN is invalid' },
          ],
        })
      );

      const status = await wiseProvider.getTransferStatus('5001');

      expect(status.isFailed).toBe(true);
      expect(status.issues).toHaveLength(1);
      expect(status.issues![0].type).toBe('INVALID_IBAN');
    });
  });

  // ==========================================================================
  // BALANCE TESTS
  // ==========================================================================

  describe('getBalance()', () => {
    it('should get balance for existing currency', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, [
          {
            id: 9001,
            currency: 'USD',
            amount: { value: 5000, currency: 'USD' },
            reservedAmount: { value: 100, currency: 'USD' },
            cashAmount: { value: 4900, currency: 'USD' },
            totalWorth: { value: 5000, currency: 'USD' },
          },
          {
            id: 9002,
            currency: 'EUR',
            amount: { value: 2000, currency: 'EUR' },
            reservedAmount: { value: 50, currency: 'EUR' },
            cashAmount: { value: 1950, currency: 'EUR' },
            totalWorth: { value: 2000, currency: 'EUR' },
          },
        ])
      );

      const balance = await wiseProvider.getBalance('USD');

      expect(balance).toEqual({
        id: '9001',
        currency: 'USD',
        amount: 5000,
        reservedAmount: 100,
        totalAmount: 5000,
      });
    });

    it('should return zero balance for non-existent currency', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, []));

      const balance = await wiseProvider.getBalance('JPY');

      expect(balance).toEqual({
        id: '',
        currency: 'JPY',
        amount: 0,
        reservedAmount: 0,
        totalAmount: 0,
      });
    });
  });

  // ==========================================================================
  // CANCEL TRANSFER TESTS
  // ==========================================================================

  describe('cancelTransfer()', () => {
    it('should cancel transfer successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(200, {}));

      const result = await wiseProvider.cancelTransfer('5001');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.transferwise.tech/v1/transfers/5001/cancel',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should return false if transfer cannot be cancelled', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(422, {
          message: 'Transfer has already been sent',
          errors: [{ code: 'TRANSFER_ALREADY_SENT' }],
        })
      );

      const result = await wiseProvider.cancelTransfer('5001');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[WiseProvider] Failed to cancel transfer',
        expect.objectContaining({
          transferId: '5001',
        })
      );
    });
  });

  // ==========================================================================
  // COMPLETE PAYMENT FLOW TESTS
  // ==========================================================================

  describe('processPayment() - Complete Flow', () => {
    const mockQuote = {
      id: 'quote-123',
      sourceCurrency: 'USD',
      targetCurrency: 'EUR',
      sourceAmount: 100,
      targetAmount: 85.5,
      rate: 0.855,
      fee: 2.5,
      deliveryEstimate: '2024-02-15T10:00:00Z',
      expirationTime: '2024-02-14T12:00:00Z',
      payIn: 'BALANCE',
    };

    const mockRecipient = {
      id: 1001,
      profile: 12345,
      accountHolderName: 'John Doe',
      currency: 'EUR',
      type: 'iban',
      active: true,
      details: { IBAN: 'DE89370400440532013000' },
    };

    const mockTransfer = {
      id: 5001,
      user: 999,
      targetAccount: 1001,
      quoteUuid: 'quote-123',
      status: 'incoming_payment_waiting',
      reference: 'SOS-Expat',
      customerTransactionId: 'wd-123',
      rate: 0.855,
      sourceValue: 100,
      sourceCurrency: 'USD',
      targetValue: 85.5,
      targetCurrency: 'EUR',
      fee: 2.5,
      created: '2024-02-14T10:00:00Z',
      business: 12345,
    };

    const mockBalance = [
      {
        id: 9001,
        currency: 'USD',
        amount: { value: 5000, currency: 'USD' },
        reservedAmount: { value: 100, currency: 'USD' },
        cashAmount: { value: 4900, currency: 'USD' },
        totalWorth: { value: 5000, currency: 'USD' },
      },
    ];

    const mockFundingSuccess = {
      type: 'BALANCE',
      status: 'COMPLETED',
    };

    it('should process complete payment flow successfully', async () => {
      // Mock all API calls in sequence
      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, mockQuote)) // createQuote
        .mockResolvedValueOnce(createMockResponse(200, mockBalance)) // getBalance
        .mockResolvedValueOnce(createMockResponse(200, mockRecipient)) // createRecipient
        .mockResolvedValueOnce(createMockResponse(200, mockTransfer)) // createTransfer
        .mockResolvedValueOnce(createMockResponse(200, mockFundingSuccess)); // fundTransfer

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'John Doe',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      const result = await wiseProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000, // $100.00 in cents
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        recipient: details,
        reference: 'SOS-Expat Withdrawal',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('5001');
      expect(result.status).toBe('processing');
      expect(result.fees).toBe(250); // 2.5 * 100 cents
      expect(result.exchangeRate).toBe(0.855);
      expect(result.rawResponse).toHaveProperty('quoteId', 'quote-123');
      expect(result.rawResponse).toHaveProperty('transferId', '5001');

      // Verify all API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should fail if insufficient balance', async () => {
      const insufficientBalance = [
        {
          id: 9001,
          currency: 'USD',
          amount: { value: 50, currency: 'USD' }, // Only $50, need $100
          reservedAmount: { value: 0, currency: 'USD' },
          cashAmount: { value: 50, currency: 'USD' },
          totalWorth: { value: 50, currency: 'USD' },
        },
      ];

      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, mockQuote))
        .mockResolvedValueOnce(createMockResponse(200, insufficientBalance));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'John Doe',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      const result = await wiseProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        recipient: details,
        reference: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Insufficient Wise balance');
      expect(result.message).toContain('Required: 100');
      expect(result.message).toContain('Available: 50');
    });

    it('should handle funding failure after transfer creation', async () => {
      const mockFundingFailure = {
        type: 'BALANCE',
        status: 'REJECTED',
        errorCode: 'BALANCE_LOCKED',
        errorMessage: 'Balance is temporarily locked',
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(200, mockQuote))
        .mockResolvedValueOnce(createMockResponse(200, mockBalance))
        .mockResolvedValueOnce(createMockResponse(200, mockRecipient))
        .mockResolvedValueOnce(createMockResponse(200, mockTransfer))
        .mockResolvedValueOnce(createMockResponse(200, mockFundingFailure));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'John Doe',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      const result = await wiseProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        recipient: details,
        reference: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.transactionId).toBe('5001');
      expect(result.message).toContain('Balance is temporarily locked');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'John Doe',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      const result = await wiseProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        recipient: details,
        reference: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Network');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('WiseError', () => {
    it('should create error from 401 response', async () => {
      const response = createMockResponse(401, {
        message: 'Invalid API token',
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error).toBeInstanceOf(WiseError);
      expect(error.code).toBe(WiseErrorCode.UNAUTHORIZED);
      expect(error.httpStatus).toBe(401);
      expect(error.retryable).toBe(false);
    });

    it('should create error from 403 response', async () => {
      const response = createMockResponse(403, {
        message: 'Access denied',
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.FORBIDDEN);
      expect(error.retryable).toBe(false);
    });

    it('should create error from 404 response', async () => {
      const response = createMockResponse(404, {
        message: 'Transfer not found',
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.TRANSFER_NOT_FOUND);
    });

    it('should detect insufficient balance from 422 response', async () => {
      const response = createMockResponse(422, {
        message: 'Validation failed',
        errors: [{ code: 'INSUFFICIENT_FUNDS' }],
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.INSUFFICIENT_BALANCE);
    });

    it('should detect expired quote from 422 response', async () => {
      const response = createMockResponse(422, {
        message: 'Validation failed',
        errors: [{ code: 'QUOTE_EXPIRED' }],
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.QUOTE_EXPIRED);
    });

    it('should handle 429 rate limit with retry-after', async () => {
      const response = createRateLimitResponse();

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.RATE_LIMITED);
      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(60000); // 60 seconds
    });

    it('should handle 500 server errors as retryable', async () => {
      const response = createMockResponse(500, {
        message: 'Internal server error',
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(5000);
    });

    it('should handle 503 service unavailable as retryable', async () => {
      const response = createMockResponse(503, {
        message: 'Service temporarily unavailable',
      });

      const error = await WiseError.fromResponse(response, 'Test');

      expect(error.code).toBe(WiseErrorCode.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should handle non-JSON response bodies', async () => {
      const response = {
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      } as Response;

      const error = await WiseError.fromResponse(response, 'Test context');

      expect(error).toBeInstanceOf(WiseError);
      expect(error.code).toBe(WiseErrorCode.NETWORK_ERROR);
      expect(error.message).toContain('Test context');
    });
  });

  // ==========================================================================
  // AUTHENTICATION & HEADERS TESTS
  // ==========================================================================

  describe('Authentication & Headers', () => {
    it('should include Authorization header in all requests', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, { id: 'quote-123', sourceCurrency: 'USD' })
      );

      await wiseProvider.createQuote({
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        sourceAmount: 100,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-token',
          }),
        })
      );
    });

    it('should include Content-Type header for POST requests', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, { id: 'quote-123' })
      );

      await wiseProvider.createQuote({
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        sourceAmount: 100,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should add idempotency key for POST requests when provided', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 5001,
          customerTransactionId: 'test-key',
        })
      );

      await wiseProvider.createTransfer({
        quoteId: 'quote-123',
        recipientId: '1001',
        reference: 'Test',
        externalId: 'test-key',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-idempotency-uuid': 'test-key',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // RECIPIENT TYPE DETECTION TESTS
  // ==========================================================================

  describe('Recipient Type Detection', () => {
    it('should detect IBAN type from details', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 1001,
          profile: 12345,
          accountHolderName: 'Test',
          currency: 'EUR',
          type: 'iban',
          active: true,
          details: {},
        })
      );

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Test',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
      };

      await wiseProvider.createRecipient({
        currency: 'EUR',
        type: 'iban',
        details,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"iban"'),
        })
      );
    });

    it('should detect US routing number type', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(200, {
          id: 1002,
          profile: 12345,
          accountHolderName: 'Test',
          currency: 'USD',
          type: 'aba',
          active: true,
          details: {},
        })
      );

      const details: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Test',
        routingNumber: '111000025',
        accountNumber: '123456789',
        country: 'US',
        currency: 'USD',
      };

      await wiseProvider.createRecipient({
        currency: 'USD',
        type: 'aba',
        details,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"aba"'),
        })
      );
    });
  });
});
