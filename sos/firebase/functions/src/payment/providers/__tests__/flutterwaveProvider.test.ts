/**
 * Flutterwave Provider Unit Tests
 *
 * Comprehensive test suite for the Flutterwave payment provider (Mobile Money Africa).
 * Tests all API methods, mobile money providers, and the complete payment flow.
 *
 * Test Coverage:
 * - Transfer creation (all mobile money providers: Orange Money, Wave, MTN, M-Pesa, etc.)
 * - Transfer status monitoring (NEW, PENDING, SUCCESSFUL, FAILED)
 * - Transfer retry logic
 * - Balance queries (USD debit currency)
 * - Fee calculation
 * - Complete payment flow (end-to-end)
 * - Error handling (HTTP statuses, insufficient balance, network errors)
 * - Phone number validation (all African countries)
 * - Provider mapping (country-specific bank codes and network codes)
 * - Webhook verification (simple hash + HMAC SHA-256)
 * - Security (idempotency, authentication)
 */

// ============================================================================
// Mock Setup
// ============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

global.console = {
  ...console,
  log: mockConsoleLog,
  error: mockConsoleError,
  warn: mockConsoleWarn,
};

// Mock secrets
const mockGetFlutterwaveSecretKey = jest.fn(() => 'test-secret-key');
const mockGetFlutterwavePublicKey = jest.fn(() => 'test-public-key');
const mockGetFlutterwaveMode = jest.fn(() => 'sandbox' as 'sandbox' | 'production');
const mockGetFlutterwaveWebhookSecret = jest.fn(() => 'test-webhook-secret');
const mockGetFlutterwaveBaseUrl = jest.fn(() => 'https://api.flutterwave.com/v3');

jest.mock('../../../lib/secrets', () => ({
  getFlutterwaveSecretKey: mockGetFlutterwaveSecretKey,
  getFlutterwavePublicKey: mockGetFlutterwavePublicKey,
  getFlutterwaveMode: mockGetFlutterwaveMode,
  getFlutterwaveWebhookSecret: mockGetFlutterwaveWebhookSecret,
  getFlutterwaveBaseUrl: mockGetFlutterwaveBaseUrl,
}));

import {
  FlutterwaveProvider,
  FlutterwaveError,
  createFlutterwaveProvider,
  getFlutterwaveBankCode,
  getFlutterwaveNetworkCode,
  validateMobileMoneyPhone,
  getSupportedMobileMonneyCurrencies,
  isSupportedMobileMonneyCurrency,
  getSupportedCountriesForProvider,
  type FlutterwaveTransfer,
  type FlutterwaveTransferStatus,
  type FlutterwaveBalance,
  type FlutterwaveFees,
} from '../flutterwaveProvider';
import type { MobileMoneyDetails, MobileMoneyProvider } from '../../types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock Flutterwave API response
 */
function createMockFlutterwaveResponse<T>(data: T): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'success',
      message: 'Request successful',
      data,
    }),
    text: async () => JSON.stringify({
      status: 'success',
      message: 'Request successful',
      data,
    }),
    headers: new Headers(),
  } as Response;
}

/**
 * Create a mock error response
 */
function createMockErrorResponse(status: number, message: string, code?: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({
      status: 'error',
      message,
      data: code ? { code, message } : undefined,
    }),
    text: async () => JSON.stringify({
      status: 'error',
      message,
      data: code ? { code, message } : undefined,
    }),
    headers: new Headers(),
  } as Response;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('FlutterwaveProvider', () => {
  let flutterwaveProvider: FlutterwaveProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    flutterwaveProvider = createFlutterwaveProvider();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize successfully with valid config', () => {
      expect(flutterwaveProvider).toBeInstanceOf(FlutterwaveProvider);
      expect(flutterwaveProvider.getEnvironment()).toBe('sandbox');
      expect(flutterwaveProvider.isProduction()).toBe(false);
      expect(flutterwaveProvider.getPublicKey()).toBe('test-public-key');
    });

    it('should throw error if secret key is missing', () => {
      mockGetFlutterwaveSecretKey.mockReturnValueOnce('');
      expect(() => createFlutterwaveProvider()).toThrow(FlutterwaveError);
      expect(() => createFlutterwaveProvider()).toThrow('Flutterwave secret key is required');
    });

    it('should set production mode correctly', () => {
      mockGetFlutterwaveMode.mockReturnValueOnce('production');
      const prodProvider = createFlutterwaveProvider();
      expect(prodProvider.getEnvironment()).toBe('production');
      expect(prodProvider.isProduction()).toBe(true);
    });
  });

  // ==========================================================================
  // TRANSFER CREATION TESTS
  // ==========================================================================

  describe('createTransfer()', () => {
    const mockTransferResponse: FlutterwaveTransfer = {
      id: 12345,
      status: 'PENDING',
      reference: 'ref-123',
      amount: 10000,
      currency: 'XOF',
      fee: 250,
      narration: 'Chatter earnings payout',
      fullName: 'Jean Dupont',
      phoneNumber: '+221771234567',
      bankCode: 'FMM',
      accountNumber: '+221771234567',
      debitCurrency: 'USD',
      requiresApproval: 0,
      isApproved: 1,
      bankName: 'Orange Money',
      createdAt: '2024-02-14T10:00:00Z',
    };

    it('should create Orange Money transfer for Senegal', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      const transfer = await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Jean Dupont',
        beneficiaryPhone: '+221771234567',
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'orange_money',
        reference: 'ref-123',
        narration: 'Chatter earnings payout',
        externalId: 'wd-123',
      });

      expect(transfer.id).toBe(12345);
      expect(transfer.status).toBe('PENDING');
      expect(transfer.currency).toBe('XOF');

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/transfers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-secret-key',
            'Content-Type': 'application/json',
            'Idempotency-Key': 'wd-123',
          }),
        })
      );

      // Verify body contains correct bank code and network code
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.account_bank).toBe('FMM'); // Francophone Mobile Money
      expect(callBody.meta[0].MobileMoneyNetwork).toBe('orange');
    });

    it('should create Wave transfer for Senegal', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      const transfer = await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Jean Dupont',
        beneficiaryPhone: '+221771234567',
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'wave',
        reference: 'ref-123',
        narration: 'Test',
        externalId: 'wd-123',
      });

      expect(transfer.status).toBe('PENDING');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.meta[0].MobileMoneyNetwork).toBe('wave');
    });

    it('should create MTN MoMo transfer for Ghana', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse({
        ...mockTransferResponse,
        currency: 'GHS',
      }));

      await flutterwaveProvider.createTransfer({
        amount: 1000,
        currency: 'GHS',
        beneficiaryName: 'Kwame Osei',
        beneficiaryPhone: '+233241234567',
        beneficiaryCountry: 'GH',
        mobileMoneyProvider: 'mtn_momo',
        reference: 'ref-456',
        narration: 'Payment',
        externalId: 'wd-456',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.account_bank).toBe('MPS'); // Mobile Payment System
      expect(callBody.meta[0].MobileMoneyNetwork).toBe('mtn');
      expect(callBody.currency).toBe('GHS');
    });

    it('should create M-Pesa transfer for Kenya', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse({
        ...mockTransferResponse,
        currency: 'KES',
      }));

      await flutterwaveProvider.createTransfer({
        amount: 5000,
        currency: 'KES',
        beneficiaryName: 'John Kamau',
        beneficiaryPhone: '+254712345678',
        beneficiaryCountry: 'KE',
        mobileMoneyProvider: 'mpesa',
        reference: 'ref-789',
        narration: 'Transfer',
        externalId: 'wd-789',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.account_bank).toBe('MPS');
      expect(callBody.meta[0].MobileMoneyNetwork).toBe('mpesa');
      expect(callBody.currency).toBe('KES');
    });

    it('should format phone number correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Test',
        beneficiaryPhone: '771234567', // Without country code
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'orange_money',
        reference: 'ref-123',
        narration: 'Test',
        externalId: 'wd-123',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.account_number).toMatch(/^\+/); // Should start with +
    });

    it('should use idempotency key from externalId', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Test',
        beneficiaryPhone: '+221771234567',
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'orange_money',
        reference: 'ref-123',
        narration: 'Test',
        externalId: 'unique-withdrawal-id',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'unique-withdrawal-id',
          }),
        })
      );
    });

    it('should include callback URL in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Test',
        beneficiaryPhone: '+221771234567',
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'orange_money',
        reference: 'ref-123',
        narration: 'Test',
        externalId: 'wd-123',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.callback_url).toContain('flutterwaveWebhook');
      expect(callBody.callback_url).toContain('europe-west1-sos-urgently-ac307');
    });

    it('should always debit in USD', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransferResponse));

      await flutterwaveProvider.createTransfer({
        amount: 10000,
        currency: 'XOF',
        beneficiaryName: 'Test',
        beneficiaryPhone: '+221771234567',
        beneficiaryCountry: 'SN',
        mobileMoneyProvider: 'orange_money',
        reference: 'ref-123',
        narration: 'Test',
        externalId: 'wd-123',
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.debit_currency).toBe('USD');
    });
  });

  // ==========================================================================
  // TRANSFER STATUS TESTS
  // ==========================================================================

  describe('getTransferStatus()', () => {
    const mockStatusResponse: FlutterwaveTransferStatus = {
      id: 12345,
      accountNumber: '+221771234567',
      bankCode: 'FMM',
      fullName: 'Jean Dupont',
      dateCreated: '2024-02-14T10:00:00Z',
      currency: 'XOF',
      debitCurrency: 'USD',
      amount: 10000,
      fee: 250,
      status: 'SUCCESSFUL',
      reference: 'ref-123',
      narration: 'Payment',
      requiresApproval: 0,
      isApproved: 1,
      bankName: 'Orange Money',
      completeMessage: 'Transfer successful',
    };

    it('should get transfer status successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockStatusResponse));

      const status = await flutterwaveProvider.getTransferStatus('12345');

      expect(status.id).toBe(12345);
      expect(status.status).toBe('SUCCESSFUL');
      expect(status.completeMessage).toBe('Transfer successful');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/transfers/12345',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-secret-key',
          }),
        })
      );
    });

    it('should return PENDING status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFlutterwaveResponse({
          ...mockStatusResponse,
          status: 'PENDING',
        })
      );

      const status = await flutterwaveProvider.getTransferStatus('12345');
      expect(status.status).toBe('PENDING');
    });

    it('should return FAILED status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFlutterwaveResponse({
          ...mockStatusResponse,
          status: 'FAILED',
          completeMessage: 'Invalid phone number',
        })
      );

      const status = await flutterwaveProvider.getTransferStatus('12345');
      expect(status.status).toBe('FAILED');
      expect(status.completeMessage).toBe('Invalid phone number');
    });

    it('should return NEW status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockFlutterwaveResponse({
          ...mockStatusResponse,
          status: 'NEW',
        })
      );

      const status = await flutterwaveProvider.getTransferStatus('12345');
      expect(status.status).toBe('NEW');
    });
  });

  // ==========================================================================
  // TRANSFER RETRY TESTS
  // ==========================================================================

  describe('retryTransfer()', () => {
    const mockRetryResponse: FlutterwaveTransfer = {
      id: 12345,
      status: 'PENDING',
      reference: 'ref-123',
      amount: 10000,
      currency: 'XOF',
      fee: 250,
      narration: 'Retry payment',
      fullName: 'Jean Dupont',
      phoneNumber: '+221771234567',
      bankCode: 'FMM',
      accountNumber: '+221771234567',
      debitCurrency: 'USD',
      requiresApproval: 0,
      isApproved: 1,
      bankName: 'Orange Money',
      createdAt: '2024-02-14T10:05:00Z',
    };

    it('should retry a failed transfer', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockRetryResponse));

      const transfer = await flutterwaveProvider.retryTransfer('12345');

      expect(transfer.id).toBe(12345);
      expect(transfer.status).toBe('PENDING');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/transfers/12345/retries',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Idempotency-Key': expect.stringContaining('retry-12345-'),
          }),
        })
      );
    });

    it('should use custom idempotency key if provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockRetryResponse));

      await flutterwaveProvider.retryTransfer('12345', 'custom-idempotency-key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'custom-idempotency-key',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // BALANCE TESTS
  // ==========================================================================

  describe('getBalance()', () => {
    const mockBalances: FlutterwaveBalance[] = [
      {
        currency: 'USD',
        availableBalance: 5000.00,
        ledgerBalance: 5100.00,
      },
      {
        currency: 'NGN',
        availableBalance: 1200000.00,
        ledgerBalance: 1250000.00,
      },
    ];

    it('should get balance for USD', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalances));

      const balance = await flutterwaveProvider.getBalance('USD');

      expect(balance.currency).toBe('USD');
      expect(balance.availableBalance).toBe(5000.00);
      expect(balance.ledgerBalance).toBe(5100.00);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/balances',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should get balance for NGN', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalances));

      const balance = await flutterwaveProvider.getBalance('NGN');

      expect(balance.currency).toBe('NGN');
      expect(balance.availableBalance).toBe(1200000.00);
    });

    it('should be case-insensitive for currency', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalances));

      const balance = await flutterwaveProvider.getBalance('usd');

      expect(balance.currency).toBe('USD');
    });

    it('should throw error if currency not found', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalances));

      await expect(
        flutterwaveProvider.getBalance('XOF')
      ).rejects.toThrow(FlutterwaveError);

      await expect(
        flutterwaveProvider.getBalance('XOF')
      ).rejects.toThrow('No balance found for currency: XOF');
    });
  });

  // ==========================================================================
  // FEES TESTS
  // ==========================================================================

  describe('getTransferFees()', () => {
    const mockFees: FlutterwaveFees = {
      currency: 'XOF',
      fee: 250,
      feeType: 'mobile_money',
    };

    it('should get transfer fees', async () => {
      mockFetch.mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees));

      const fees = await flutterwaveProvider.getTransferFees({
        amount: 10000,
        currency: 'XOF',
        type: 'mobilemoney',
      });

      expect(fees.currency).toBe('XOF');
      expect(fees.fee).toBe(250);
      expect(fees.feeType).toBe('mobile_money');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/transfers/fee?amount=10000&currency=XOF&type=mobilemoney',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  // ==========================================================================
  // COMPLETE PAYMENT FLOW TESTS
  // ==========================================================================

  describe('processPayment() - Complete Flow', () => {
    const mockFees: FlutterwaveFees = {
      currency: 'XOF',
      fee: 250,
      feeType: 'mobile_money',
    };

    const mockBalance: FlutterwaveBalance[] = [
      {
        currency: 'USD',
        availableBalance: 10000.00,
        ledgerBalance: 10000.00,
      },
    ];

    const mockTransfer: FlutterwaveTransfer = {
      id: 12345,
      status: 'PENDING',
      reference: 'ref-123',
      amount: 10000,
      currency: 'XOF',
      fee: 250,
      narration: 'Chatter earnings',
      fullName: 'Jean Dupont',
      phoneNumber: '+221771234567',
      bankCode: 'FMM',
      accountNumber: '+221771234567',
      debitCurrency: 'USD',
      requiresApproval: 0,
      isApproved: 1,
      bankName: 'Orange Money',
      createdAt: '2024-02-14T10:00:00Z',
      completeMessage: 'Transfer initiated',
    };

    it('should process complete payment successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees)) // getFees
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalance)) // getBalance
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransfer)); // createTransfer

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Jean Dupont',
        phoneNumber: '+221771234567',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Chatter earnings',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('12345');
      expect(result.status).toBe('processing'); // PENDING maps to 'processing'
      expect(result.fees).toBe(25000); // 250 * 100 cents
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail if insufficient balance', async () => {
      const insufficientBalance: FlutterwaveBalance[] = [
        {
          currency: 'USD',
          availableBalance: 50.00, // Only $50, need more
          ledgerBalance: 50.00,
        },
      ];

      mockFetch
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees))
        .mockResolvedValueOnce(createMockFlutterwaveResponse(insufficientBalance));

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Test',
        phoneNumber: '+221771234567',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Insufficient Flutterwave balance');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Fees + balance, no transfer
    });

    it('should proceed if fee check fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Fee service unavailable')) // getFees fails
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalance)) // getBalance
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransfer)); // createTransfer

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Test',
        phoneNumber: '+221771234567',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Test',
      });

      expect(result.success).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Could not get fees'),
        expect.any(Error)
      );
    });

    it('should proceed if balance check fails', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees))
        .mockRejectedValueOnce(new Error('Balance service unavailable'))
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockTransfer));

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Test',
        phoneNumber: '+221771234567',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Test',
      });

      expect(result.success).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Could not check balance'),
        expect.any(Error)
      );
    });

    it('should handle transfer creation failure', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees))
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalance))
        .mockResolvedValueOnce(
          createMockErrorResponse(422, 'Invalid phone number', 'INVALID_PHONE_NUMBER')
        );

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Test',
        phoneNumber: 'invalid',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Invalid phone number');
    });

    it('should map FAILED status correctly', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockFees))
        .mockResolvedValueOnce(createMockFlutterwaveResponse(mockBalance))
        .mockResolvedValueOnce(
          createMockFlutterwaveResponse({
            ...mockTransfer,
            status: 'FAILED',
            completeMessage: 'Recipient account blocked',
          })
        );

      const recipient: MobileMoneyDetails = {
        type: 'mobile_money',
        accountName: 'Test',
        phoneNumber: '+221771234567',
        provider: 'orange_money',
        country: 'SN',
        currency: 'XOF',
      };

      const result = await flutterwaveProvider.processPayment({
        withdrawalId: 'wd-123',
        amount: 10000,
        currency: 'XOF',
        recipient,
        reference: 'ref-123',
        narration: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Recipient account blocked');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('FlutterwaveError', () => {
    it('should identify retryable errors (500)', () => {
      const error = new FlutterwaveError(
        'Internal server error',
        'INTERNAL_ERROR',
        500
      );
      expect(error.isRetryable).toBe(true);
    });

    it('should identify retryable errors (429)', () => {
      const error = new FlutterwaveError(
        'Rate limit exceeded',
        'RATE_LIMITED',
        429
      );
      expect(error.isRetryable).toBe(true);
    });

    it('should identify non-retryable error (INSUFFICIENT_BALANCE)', () => {
      const error = new FlutterwaveError(
        'Insufficient balance',
        'INSUFFICIENT_BALANCE',
        422
      );
      expect(error.isRetryable).toBe(false);
    });

    it('should identify non-retryable error (INVALID_PHONE_NUMBER)', () => {
      const error = new FlutterwaveError(
        'Invalid phone',
        'INVALID_PHONE_NUMBER',
        422
      );
      expect(error.isRetryable).toBe(false);
    });

    it('should identify non-retryable error (UNAUTHORIZED)', () => {
      const error = new FlutterwaveError(
        'Unauthorized',
        'UNAUTHORIZED',
        401
      );
      expect(error.isRetryable).toBe(false);
    });

    it('should handle 401 errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED')
      );

      await expect(
        flutterwaveProvider.getBalance('USD')
      ).rejects.toThrow(FlutterwaveError);
    });

    it('should handle 422 validation errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(422, 'Validation failed', 'VALIDATION_ERROR')
      );

      await expect(
        flutterwaveProvider.getBalance('USD')
      ).rejects.toThrow(FlutterwaveError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        flutterwaveProvider.getBalance('USD')
      ).rejects.toThrow(FlutterwaveError);
    });

    it('should handle API error status in response', async () => {
      const errorResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          message: 'Invalid request',
          data: null,
        }),
        headers: new Headers(),
      } as Response;

      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(
        flutterwaveProvider.getBalance('USD')
      ).rejects.toThrow(FlutterwaveError);
    });
  });

  // ==========================================================================
  // WEBHOOK VERIFICATION TESTS
  // ==========================================================================

  describe('Webhook Verification', () => {
    it('should verify webhook with simple hash', () => {
      const signature = 'test-webhook-secret';
      const payload = '{"event": "transfer.completed"}';

      const isValid = flutterwaveProvider.verifyWebhook(signature, payload);

      expect(isValid).toBe(true);
    });

    it('should reject invalid simple hash', () => {
      const signature = 'wrong-secret';
      const payload = '{"event": "transfer.completed"}';

      const isValid = flutterwaveProvider.verifyWebhook(signature, payload);

      expect(isValid).toBe(false);
    });

    it('should verify webhook with HMAC SHA-256', () => {
      const payload = '{"event": "transfer.completed"}';
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      const isValid = flutterwaveProvider.verifyWebhookHmac(signature, payload);

      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const payload = '{"event": "transfer.completed"}';
      const signature = 'invalid-signature';

      const isValid = flutterwaveProvider.verifyWebhookHmac(signature, payload);

      expect(isValid).toBe(false);
    });

    it('should reject if webhook secret not configured (simple)', () => {
      mockGetFlutterwaveWebhookSecret.mockReturnValueOnce('');
      const provider = createFlutterwaveProvider();

      const isValid = provider.verifyWebhook('test', 'payload');

      expect(isValid).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[FlutterwaveProvider] Webhook secret not configured'
      );
    });

    it('should reject if webhook secret not configured (HMAC)', () => {
      mockGetFlutterwaveWebhookSecret.mockReturnValueOnce('');
      const provider = createFlutterwaveProvider();

      const isValid = provider.verifyWebhookHmac('test', 'payload');

      expect(isValid).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[FlutterwaveProvider] Webhook secret not configured'
      );
    });
  });

  // ==========================================================================
  // PHONE NUMBER VALIDATION TESTS
  // ==========================================================================

  describe('validateMobileMoneyPhone()', () => {
    it('should validate Senegal phone number', () => {
      const result = validateMobileMoneyPhone('+221771234567', 'SN');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+221771234567');
    });

    it('should add country code if missing', () => {
      const result = validateMobileMoneyPhone('771234567', 'SN');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+221771234567');
    });

    it('should replace leading 0 with country code', () => {
      const result = validateMobileMoneyPhone('0771234567', 'SN');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+221771234567');
    });

    it('should validate Ghana number', () => {
      const result = validateMobileMoneyPhone('+233241234567', 'GH');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+233241234567');
    });

    it('should validate Kenya number', () => {
      const result = validateMobileMoneyPhone('+254712345678', 'KE');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+254712345678');
    });

    it('should reject invalid country code', () => {
      const result = validateMobileMoneyPhone('+221771234567', 'XX');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown country code');
    });

    it('should reject wrong country prefix', () => {
      const result = validateMobileMoneyPhone('+233771234567', 'SN'); // Ghana prefix for Senegal
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must start with +221');
    });

    it('should reject number too short', () => {
      const result = validateMobileMoneyPhone('+22177123', 'SN');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid phone number length');
    });

    it('should reject number too long', () => {
      const result = validateMobileMoneyPhone('+22177123456789012', 'SN');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid phone number length');
    });
  });

  // ==========================================================================
  // PROVIDER MAPPING TESTS
  // ==========================================================================

  describe('Provider Mapping', () => {
    it('should get bank code for Orange Money Senegal', () => {
      const code = getFlutterwaveBankCode('orange_money', 'SN');
      expect(code).toBe('FMM');
    });

    it('should get bank code for MTN Ghana', () => {
      const code = getFlutterwaveBankCode('mtn_momo', 'GH');
      expect(code).toBe('MPS');
    });

    it('should get bank code for M-Pesa Kenya', () => {
      const code = getFlutterwaveBankCode('mpesa', 'KE');
      expect(code).toBe('MPS');
    });

    it('should get network code for Orange Money', () => {
      const code = getFlutterwaveNetworkCode('orange_money', 'SN');
      expect(code).toBe('orange');
    });

    it('should get network code for Wave', () => {
      const code = getFlutterwaveNetworkCode('wave', 'SN');
      expect(code).toBe('wave');
    });

    it('should get network code for MTN', () => {
      const code = getFlutterwaveNetworkCode('mtn_momo', 'GH');
      expect(code).toBe('mtn');
    });

    it('should get network code for M-Pesa Kenya', () => {
      const code = getFlutterwaveNetworkCode('mpesa', 'KE');
      expect(code).toBe('mpesa');
    });

    it('should get network code for M-Pesa Tanzania (Vodacom)', () => {
      const code = getFlutterwaveNetworkCode('mpesa', 'TZ');
      expect(code).toBe('vodacom');
    });

    it('should use default bank code for unknown country', () => {
      const code = getFlutterwaveBankCode('orange_money', 'XX');
      expect(code).toBe('FMM');
    });

    it('should use default network code for unknown provider', () => {
      const code = getFlutterwaveNetworkCode('unknown' as MobileMoneyProvider, 'SN');
      expect(code).toBe('mobilemoney');
    });
  });

  // ==========================================================================
  // UTILITY FUNCTIONS TESTS
  // ==========================================================================

  describe('Utility Functions', () => {
    it('should list supported currencies', () => {
      const currencies = getSupportedMobileMonneyCurrencies();
      expect(currencies).toContain('XOF');
      expect(currencies).toContain('GHS');
      expect(currencies).toContain('KES');
      expect(currencies).toContain('NGN');
    });

    it('should check if currency is supported', () => {
      expect(isSupportedMobileMonneyCurrency('XOF')).toBe(true);
      expect(isSupportedMobileMonneyCurrency('GHS')).toBe(true);
      expect(isSupportedMobileMonneyCurrency('EUR')).toBe(false);
      expect(isSupportedMobileMonneyCurrency('USD')).toBe(false);
    });

    it('should be case-insensitive for currency check', () => {
      expect(isSupportedMobileMonneyCurrency('xof')).toBe(true);
      expect(isSupportedMobileMonneyCurrency('Ghs')).toBe(true);
    });

    it('should get supported countries for Orange Money', () => {
      const countries = getSupportedCountriesForProvider('orange_money');
      expect(countries).toContain('SN');
      expect(countries).toContain('CI');
      expect(countries).toContain('ML');
      expect(countries).toContain('CM');
    });

    it('should get supported countries for Wave', () => {
      const countries = getSupportedCountriesForProvider('wave');
      expect(countries).toContain('SN');
      expect(countries).toContain('CI');
      expect(countries).toHaveLength(2);
    });

    it('should get supported countries for M-Pesa', () => {
      const countries = getSupportedCountriesForProvider('mpesa');
      expect(countries).toContain('KE');
      expect(countries).toContain('TZ');
    });

    it('should return empty array for unknown provider', () => {
      const countries = getSupportedCountriesForProvider('unknown' as MobileMoneyProvider);
      expect(countries).toEqual([]);
    });
  });
});
