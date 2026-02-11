/**
 * PaymentRouter Unit Tests
 *
 * Tests for provider determination logic and payment detail validation.
 *
 * Critical scenarios tested:
 * - Provider routing: Wise (bank transfer), Flutterwave (mobile money)
 * - Provider disabled fallback logic
 * - Sanctioned/unsupported country rejection
 * - Payment detail validation (bank transfer, mobile money)
 * - Type mismatch detection
 */

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock provider implementations (they need API keys which we don't have in tests)
jest.mock('../providers/wiseProvider', () => ({
  WiseProvider: {
    fromSecrets: jest.fn(() => ({
      processPayment: jest.fn().mockResolvedValue({ success: true, status: 'sent', transactionId: 'wise-tx-123' }),
      getTransferStatus: jest.fn(),
      cancelTransfer: jest.fn(),
      getBalance: jest.fn(),
    })),
  },
}));

jest.mock('../providers/flutterwaveProvider', () => ({
  createFlutterwaveProvider: jest.fn(() => ({
    processPayment: jest.fn().mockResolvedValue({ success: true, status: 'sent', transactionId: 'fw-tx-456' }),
    getTransferStatus: jest.fn(),
    getBalance: jest.fn(),
  })),
  FlutterwaveProvider: jest.fn(),
}));

// Mock countries config with deterministic test data
jest.mock('../config/countriesConfig', () => ({
  getProviderForCountry: jest.fn((code: string) => {
    const map: Record<string, string> = {
      FR: 'wise', DE: 'wise', US: 'wise', GB: 'wise',
      SN: 'flutterwave', CI: 'flutterwave', CM: 'flutterwave',
    };
    return map[code] || null;
  }),
  isCountrySupported: jest.fn((code: string) => {
    return ['FR', 'DE', 'US', 'GB', 'SN', 'CI', 'CM'].includes(code);
  }),
  getAvailableMethodsForCountry: jest.fn((code: string) => {
    const map: Record<string, string[]> = {
      SN: ['orange_money', 'wave'],
      CI: ['orange_money', 'mtn_momo'],
      CM: ['mtn_momo', 'orange_money'],
    };
    return map[code] || [];
  }),
  getCountryConfig: jest.fn((code: string) => {
    const map: Record<string, unknown> = {
      FR: { provider: 'wise', methodType: 'bank_transfer', availableMethods: [] },
      SN: { provider: 'flutterwave', methodType: 'mobile_money', availableMethods: ['orange_money', 'wave'] },
    };
    return map[code] || null;
  }),
  getAllSupportedCountries: jest.fn(() => ['FR', 'DE', 'US', 'GB', 'SN', 'CI', 'CM']),
  getMethodTypeForCountry: jest.fn((code: string) => {
    const mobileCountries = ['SN', 'CI', 'CM'];
    return mobileCountries.includes(code) ? 'mobile_money' : 'bank_transfer';
  }),
  isCountrySanctioned: jest.fn((code: string) => ['KP', 'IR', 'SY'].includes(code)),
  getCurrencyForCountry: jest.fn((code: string) => {
    const map: Record<string, string> = { FR: 'EUR', US: 'USD', SN: 'XOF' };
    return map[code];
  }),
}));

import { PaymentRouter, createPaymentRouter } from '../services/paymentRouter';
import type { BankTransferDetails, MobileMoneyDetails } from '../types';

// ============================================================================
// Test Suite
// ============================================================================

describe('PaymentRouter', () => {
  // ==========================================================================
  // determineProvider
  // ==========================================================================

  describe('determineProvider', () => {
    it('should route bank transfers in Europe to Wise', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('FR', 'bank_transfer');

      expect(result.provider).toBe('wise');
      expect(result.supported).toBe(true);
    });

    it('should route mobile money in Africa to Flutterwave', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('SN', 'mobile_money');

      expect(result.provider).toBe('flutterwave');
      expect(result.supported).toBe(true);
    });

    it('should reject sanctioned countries', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('KP', 'bank_transfer');

      expect(result.supported).toBe(false);
      expect(result.reason).toContain('sanctions');
    });

    it('should reject unsupported countries', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('ZZ', 'bank_transfer');

      expect(result.supported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should reject mobile money for bank-transfer-only countries', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('FR', 'mobile_money');

      expect(result.supported).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should fall back to Wise for bank transfers in mobile money countries', () => {
      const router = createPaymentRouter({ wiseEnabled: true });
      const result = router.determineProvider('SN', 'bank_transfer');

      expect(result.provider).toBe('wise');
      expect(result.supported).toBe(true);
    });

    it('should handle Flutterwave disabled with Wise fallback for bank transfers', () => {
      const router = createPaymentRouter({
        flutterwaveEnabled: false,
        wiseEnabled: true,
      });
      const result = router.determineProvider('SN', 'bank_transfer');

      expect(result.provider).toBe('wise');
      expect(result.supported).toBe(true);
    });

    it('should be case-insensitive on country code', () => {
      const router = createPaymentRouter();
      const result = router.determineProvider('fr', 'bank_transfer');

      expect(result.provider).toBe('wise');
      expect(result.supported).toBe(true);
    });
  });

  // ==========================================================================
  // validatePaymentDetails - Bank Transfer
  // ==========================================================================

  describe('validatePaymentDetails - Bank Transfer', () => {
    const validBankDetails: BankTransferDetails = {
      type: 'bank_transfer',
      accountHolderName: 'John Doe',
      country: 'FR',
      currency: 'EUR',
      iban: 'FR7630006000011234567890189',
    };

    it('should accept valid bank transfer details', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('wise', validBankDetails);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing account holder name', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('wise', {
        ...validBankDetails,
        accountHolderName: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Account holder name'))).toBe(true);
    });

    it('should reject invalid country code', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('wise', {
        ...validBankDetails,
        country: 'FRA', // 3 letters instead of 2
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('country code'))).toBe(true);
    });

    it('should reject missing bank identifier', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('wise', {
        ...validBankDetails,
        iban: undefined,
        accountNumber: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Bank account identifier'))).toBe(true);
    });

    it('should reject IBAN that is too short', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('wise', {
        ...validBankDetails,
        iban: 'FR76300060000',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('IBAN'))).toBe(true);
    });
  });

  // ==========================================================================
  // validatePaymentDetails - Mobile Money
  // ==========================================================================

  describe('validatePaymentDetails - Mobile Money', () => {
    const validMobileDetails: MobileMoneyDetails = {
      type: 'mobile_money',
      provider: 'orange_money',
      phoneNumber: '+221771234567',
      country: 'SN',
      accountName: 'Amadou Diallo',
      currency: 'XOF',
    };

    it('should accept valid mobile money details', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('flutterwave', validMobileDetails);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing provider', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('flutterwave', {
        ...validMobileDetails,
        provider: '' as unknown as MobileMoneyDetails['provider'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('provider'))).toBe(true);
    });

    it('should reject phone without country code', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('flutterwave', {
        ...validMobileDetails,
        phoneNumber: '771234567',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('country code'))).toBe(true);
    });

    it('should reject unavailable mobile money provider for country', () => {
      const router = createPaymentRouter();
      const result = router.validatePaymentDetails('flutterwave', {
        ...validMobileDetails,
        provider: 'mpesa', // Not available in Senegal
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not available'))).toBe(true);
    });
  });

  // ==========================================================================
  // validatePaymentDetails - Type Mismatch
  // ==========================================================================

  describe('validatePaymentDetails - Type Mismatch', () => {
    it('should reject non-bank-transfer details for Wise', () => {
      const router = createPaymentRouter();
      const mobileDetails: MobileMoneyDetails = {
        type: 'mobile_money',
        provider: 'orange_money',
        phoneNumber: '+221771234567',
        country: 'SN',
        accountName: 'Test',
        currency: 'XOF',
      };

      const result = router.validatePaymentDetails('wise', mobileDetails);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Wise requires bank transfer'))).toBe(true);
    });

    it('should reject non-mobile-money details for Flutterwave', () => {
      const router = createPaymentRouter();
      const bankDetails: BankTransferDetails = {
        type: 'bank_transfer',
        accountHolderName: 'Test',
        country: 'FR',
        currency: 'EUR',
        iban: 'FR7630006000011234567890189',
      };

      const result = router.validatePaymentDetails('flutterwave', bankDetails);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Flutterwave requires mobile money'))).toBe(true);
    });
  });

  // ==========================================================================
  // Factory function
  // ==========================================================================

  describe('createPaymentRouter', () => {
    it('should create router with default config (all enabled)', () => {
      const router = createPaymentRouter();
      const config = router.getConfig();

      expect(config.wiseEnabled).toBe(true);
      expect(config.flutterwaveEnabled).toBe(true);
    });

    it('should respect partial config overrides', () => {
      const router = createPaymentRouter({ wiseEnabled: false });
      const config = router.getConfig();

      expect(config.wiseEnabled).toBe(false);
      expect(config.flutterwaveEnabled).toBe(true);
    });
  });

  // ==========================================================================
  // updateConfig
  // ==========================================================================

  describe('updateConfig', () => {
    it('should update and return new config', () => {
      const router = createPaymentRouter();

      router.updateConfig({ wiseEnabled: false });
      const config = router.getConfig();

      expect(config.wiseEnabled).toBe(false);
      expect(config.flutterwaveEnabled).toBe(true);
    });
  });
});
