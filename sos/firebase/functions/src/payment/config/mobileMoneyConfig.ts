/**
 * Mobile Money Providers Configuration
 *
 * Comprehensive configuration for all supported mobile money providers
 * across Africa, used by the centralized payment system via Flutterwave.
 *
 * This module provides:
 * - Detailed provider configurations (fees, limits, countries, etc.)
 * - Country-to-provider mappings
 * - Helper functions for validation and display
 */

import { MobileMoneyProvider } from '../types';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Complete configuration for a mobile money provider
 */
export interface MobileMoneyProviderConfig {
  /** Unique identifier matching the MobileMoneyProvider type */
  id: MobileMoneyProvider;

  /** Internal name (snake_case) */
  name: string;

  /** User-friendly display name */
  displayName: string;

  /** Path to provider logo (optional) */
  logo?: string;

  /** ISO 3166-1 alpha-2 country codes where provider operates */
  countries: string[];

  /** ISO 4217 currency codes supported by provider */
  currencies: string[];

  /** Map of country code to phone prefix (e.g., 'SN' -> '+221') */
  phonePrefix: Record<string, string>;

  /** Regex pattern for validating phone numbers (after removing prefix) */
  phoneRegex: string;

  /** Minimum transaction amount in USD cents */
  minAmount: number;

  /** Maximum transaction amount in USD cents */
  maxAmount: number;

  /** Human-readable processing time description */
  processingTime: string;

  /** Fee structure for this provider */
  fees: {
    /** Fixed fee in USD cents */
    fixed: number;
    /** Percentage fee (e.g., 1.5 for 1.5%) */
    percentage: number;
  };

  /** Provider-specific notes or requirements */
  notes?: string;
}

/**
 * Display information for UI rendering
 */
export interface ProviderDisplayInfo {
  id: MobileMoneyProvider;
  displayName: string;
  logo?: string;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  feesDescription: string;
}

/**
 * Result of phone number validation
 */
export interface PhoneValidationResult {
  isValid: boolean;
  normalizedNumber?: string;
  errorMessage?: string;
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

/**
 * Orange Money Configuration
 * Major provider in Francophone Africa
 */
const ORANGE_MONEY_CONFIG: MobileMoneyProviderConfig = {
  id: 'orange_money',
  name: 'orange_money',
  displayName: 'Orange Money',
  logo: '/assets/logos/orange-money.png',
  countries: ['SN', 'CI', 'ML', 'BF', 'GN', 'CM', 'NE'],
  currencies: ['XOF', 'XAF', 'GNF'],
  phonePrefix: {
    SN: '+221', // Senegal
    CI: '+225', // Ivory Coast
    ML: '+223', // Mali
    BF: '+226', // Burkina Faso
    GN: '+224', // Guinea
    CM: '+237', // Cameroon
    NE: '+227', // Niger
  },
  phoneRegex: '^[0-9]{8,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 100000, // $1,000 maximum
  processingTime: 'Instant to 24 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.0,
  },
  notes: 'Requires valid Orange Money account linked to phone number',
};

/**
 * Wave Configuration
 * Fast-growing mobile money in West Africa with low fees
 */
const WAVE_CONFIG: MobileMoneyProviderConfig = {
  id: 'wave',
  name: 'wave',
  displayName: 'Wave',
  logo: '/assets/logos/wave.png',
  countries: ['SN', 'CI', 'ML', 'BF'],
  currencies: ['XOF'],
  phonePrefix: {
    SN: '+221', // Senegal
    CI: '+225', // Ivory Coast
    ML: '+223', // Mali
    BF: '+226', // Burkina Faso
  },
  phoneRegex: '^[0-9]{8,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 200000, // $2,000 maximum
  processingTime: 'Instant',
  fees: {
    fixed: 0, // No fixed fee
    percentage: 1.0, // Lower fees than competitors
  },
  notes: 'Wave offers some of the lowest fees in West Africa',
};

/**
 * MTN Mobile Money Configuration
 * Largest telecom in Africa, widely used across multiple countries
 */
const MTN_MOMO_CONFIG: MobileMoneyProviderConfig = {
  id: 'mtn_momo',
  name: 'mtn_momo',
  displayName: 'MTN Mobile Money',
  logo: '/assets/logos/mtn-momo.png',
  countries: ['CM', 'CI', 'BJ', 'GH', 'NG', 'UG', 'RW'],
  currencies: ['XAF', 'XOF', 'GHS', 'NGN', 'UGX', 'RWF'],
  phonePrefix: {
    CM: '+237', // Cameroon
    CI: '+225', // Ivory Coast
    BJ: '+229', // Benin
    GH: '+233', // Ghana
    NG: '+234', // Nigeria
    UG: '+256', // Uganda
    RW: '+250', // Rwanda
  },
  phoneRegex: '^[0-9]{8,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 150000, // $1,500 maximum
  processingTime: 'Instant to 2 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 1.8,
  },
  notes: 'MTN MoMo is the most widely accepted mobile money in Africa',
};

/**
 * Moov Money Configuration
 * Part of Moov Africa (formerly Etisalat/Maroc Telecom subsidiary)
 */
const MOOV_MONEY_CONFIG: MobileMoneyProviderConfig = {
  id: 'moov_money',
  name: 'moov_money',
  displayName: 'Moov Money',
  logo: '/assets/logos/moov-money.png',
  countries: ['CI', 'BJ', 'TG', 'BF'],
  currencies: ['XOF'],
  phonePrefix: {
    CI: '+225', // Ivory Coast
    BJ: '+229', // Benin
    TG: '+228', // Togo
    BF: '+226', // Burkina Faso
  },
  phoneRegex: '^[0-9]{8,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 100000, // $1,000 maximum
  processingTime: 'Instant to 4 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.0,
  },
  notes: 'Moov Money is part of the Moov Africa network',
};

/**
 * Airtel Money Configuration
 * Major presence in East and Central Africa
 */
const AIRTEL_MONEY_CONFIG: MobileMoneyProviderConfig = {
  id: 'airtel_money',
  name: 'airtel_money',
  displayName: 'Airtel Money',
  logo: '/assets/logos/airtel-money.png',
  countries: ['GA', 'CG', 'TD', 'KE', 'TZ', 'UG'],
  currencies: ['XAF', 'KES', 'TZS', 'UGX'],
  phonePrefix: {
    GA: '+241', // Gabon
    CG: '+242', // Congo (Brazzaville)
    TD: '+235', // Chad
    KE: '+254', // Kenya
    TZ: '+255', // Tanzania
    UG: '+256', // Uganda
  },
  phoneRegex: '^[0-9]{8,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 100000, // $1,000 maximum
  processingTime: 'Instant to 4 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.0,
  },
  notes: 'Airtel Money serves both East and Central Africa',
};

/**
 * M-Pesa Configuration
 * The original and most successful mobile money in Africa
 */
const MPESA_CONFIG: MobileMoneyProviderConfig = {
  id: 'mpesa',
  name: 'mpesa',
  displayName: 'M-Pesa',
  logo: '/assets/logos/mpesa.png',
  countries: ['KE', 'TZ', 'GH'],
  currencies: ['KES', 'TZS', 'GHS'],
  phonePrefix: {
    KE: '+254', // Kenya
    TZ: '+255', // Tanzania
    GH: '+233', // Ghana
  },
  phoneRegex: '^[0-9]{9,10}$',
  minAmount: 100, // $1 minimum
  maxAmount: 300000, // $3,000 maximum (higher limits in Kenya)
  processingTime: 'Instant',
  fees: {
    fixed: 30, // $0.30
    percentage: 1.5,
  },
  notes: 'M-Pesa pioneered mobile money and has the highest penetration in Kenya',
};

/**
 * Free Money Configuration
 * Senegal-specific provider from Free Telecom
 */
const FREE_MONEY_CONFIG: MobileMoneyProviderConfig = {
  id: 'free_money',
  name: 'free_money',
  displayName: 'Free Money',
  logo: '/assets/logos/free-money.png',
  countries: ['SN'],
  currencies: ['XOF'],
  phonePrefix: {
    SN: '+221', // Senegal
  },
  phoneRegex: '^[0-9]{9}$',
  minAmount: 100, // $1 minimum
  maxAmount: 50000, // $500 maximum
  processingTime: 'Instant to 2 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.0,
  },
  notes: 'Free Money is available exclusively in Senegal via Free Telecom',
};

/**
 * T-Money Configuration
 * Togo-specific provider from Togocom
 */
const T_MONEY_CONFIG: MobileMoneyProviderConfig = {
  id: 't_money',
  name: 't_money',
  displayName: 'T-Money',
  logo: '/assets/logos/t-money.png',
  countries: ['TG'],
  currencies: ['XOF'],
  phonePrefix: {
    TG: '+228', // Togo
  },
  phoneRegex: '^[0-9]{8}$',
  minAmount: 100, // $1 minimum
  maxAmount: 50000, // $500 maximum
  processingTime: 'Instant to 2 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.5,
  },
  notes: 'T-Money is the primary mobile money service in Togo from Togocom',
};

/**
 * Flooz Configuration
 * Togo-specific provider (Moov Togo)
 */
const FLOOZ_CONFIG: MobileMoneyProviderConfig = {
  id: 'flooz',
  name: 'flooz',
  displayName: 'Flooz',
  logo: '/assets/logos/flooz.png',
  countries: ['TG'],
  currencies: ['XOF'],
  phonePrefix: {
    TG: '+228', // Togo
  },
  phoneRegex: '^[0-9]{8}$',
  minAmount: 100, // $1 minimum
  maxAmount: 50000, // $500 maximum
  processingTime: 'Instant to 4 hours',
  fees: {
    fixed: 50, // $0.50
    percentage: 2.5,
  },
  notes: 'Flooz is offered by Moov Togo',
};

// ============================================================================
// PROVIDER MAP
// ============================================================================

/**
 * Map of all provider configurations by provider ID
 */
export const MOBILE_MONEY_PROVIDERS: Record<MobileMoneyProvider, MobileMoneyProviderConfig> = {
  orange_money: ORANGE_MONEY_CONFIG,
  wave: WAVE_CONFIG,
  mtn_momo: MTN_MOMO_CONFIG,
  moov_money: MOOV_MONEY_CONFIG,
  airtel_money: AIRTEL_MONEY_CONFIG,
  mpesa: MPESA_CONFIG,
  free_money: FREE_MONEY_CONFIG,
  t_money: T_MONEY_CONFIG,
  flooz: FLOOZ_CONFIG,
};

// ============================================================================
// COUNTRY MAPPINGS
// ============================================================================

/**
 * Map of country codes to available mobile money providers
 * This is the primary way to look up which providers are available in a country
 */
export const COUNTRY_TO_PROVIDERS: Record<string, MobileMoneyProvider[]> = {
  // West Africa - UEMOA Zone (XOF currency)
  SN: ['orange_money', 'wave', 'free_money'], // Senegal
  CI: ['orange_money', 'wave', 'mtn_momo', 'moov_money'], // Ivory Coast (Cote d'Ivoire)
  ML: ['orange_money', 'wave'], // Mali
  BF: ['orange_money', 'wave', 'moov_money'], // Burkina Faso
  GN: ['orange_money'], // Guinea
  NE: ['orange_money'], // Niger
  BJ: ['mtn_momo', 'moov_money'], // Benin
  TG: ['moov_money', 't_money', 'flooz'], // Togo

  // Central Africa - CEMAC Zone (XAF currency)
  CM: ['orange_money', 'mtn_momo'], // Cameroon
  GA: ['airtel_money'], // Gabon
  CG: ['airtel_money'], // Congo (Brazzaville)
  TD: ['airtel_money'], // Chad

  // West Africa - Non-UEMOA
  GH: ['mtn_momo', 'mpesa'], // Ghana (GHS currency)
  NG: ['mtn_momo'], // Nigeria (NGN currency)

  // East Africa
  KE: ['mpesa', 'airtel_money'], // Kenya (KES currency)
  TZ: ['mpesa', 'airtel_money'], // Tanzania (TZS currency)
  UG: ['mtn_momo', 'airtel_money'], // Uganda (UGX currency)
  RW: ['mtn_momo'], // Rwanda (RWF currency)
};

/**
 * Human-readable country names for display
 */
export const COUNTRY_NAMES: Record<string, string> = {
  SN: 'Senegal',
  CI: "Cote d'Ivoire",
  ML: 'Mali',
  BF: 'Burkina Faso',
  GN: 'Guinea',
  CM: 'Cameroon',
  NE: 'Niger',
  BJ: 'Benin',
  TG: 'Togo',
  GA: 'Gabon',
  CG: 'Congo',
  TD: 'Chad',
  GH: 'Ghana',
  NG: 'Nigeria',
  KE: 'Kenya',
  TZ: 'Tanzania',
  UG: 'Uganda',
  RW: 'Rwanda',
};

/**
 * Currency codes by country
 */
export const COUNTRY_CURRENCIES: Record<string, string> = {
  // XOF - West African CFA Franc (UEMOA)
  SN: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  GN: 'GNF', // Guinea uses Guinean Franc
  NE: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  // XAF - Central African CFA Franc (CEMAC)
  CM: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  TD: 'XAF',
  // Other currencies
  GH: 'GHS',
  NG: 'NGN',
  KE: 'KES',
  TZ: 'TZS',
  UG: 'UGX',
  RW: 'RWF',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the complete configuration for a mobile money provider
 *
 * @param providerId - The provider identifier
 * @returns The provider configuration or undefined if not found
 *
 * @example
 * const config = getProviderConfig('orange_money');
 * console.log(config?.displayName); // "Orange Money"
 */
export function getProviderConfig(
  providerId: MobileMoneyProvider
): MobileMoneyProviderConfig | undefined {
  return MOBILE_MONEY_PROVIDERS[providerId];
}

/**
 * Get all mobile money providers available in a specific country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'SN', 'KE')
 * @returns Array of provider configurations available in the country
 *
 * @example
 * const providers = getProvidersForCountry('SN');
 * // Returns configs for Orange Money, Wave, and Free Money
 */
export function getProvidersForCountry(
  countryCode: string
): MobileMoneyProviderConfig[] {
  const normalizedCode = countryCode.toUpperCase();
  const providerIds = COUNTRY_TO_PROVIDERS[normalizedCode] || [];

  return providerIds
    .map((id) => MOBILE_MONEY_PROVIDERS[id])
    .filter((config): config is MobileMoneyProviderConfig => config !== undefined);
}

/**
 * Validate a phone number for a specific provider and country
 *
 * @param providerId - The mobile money provider
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param phoneNumber - The phone number to validate (with or without prefix)
 * @returns Validation result with normalized number if valid
 *
 * @example
 * const result = validatePhoneNumber('orange_money', 'SN', '771234567');
 * if (result.isValid) {
 *   console.log(result.normalizedNumber); // "+221771234567"
 * }
 */
export function validatePhoneNumber(
  providerId: MobileMoneyProvider,
  countryCode: string,
  phoneNumber: string
): PhoneValidationResult {
  const config = getProviderConfig(providerId);
  const normalizedCountry = countryCode.toUpperCase();

  // Check if provider exists
  if (!config) {
    return {
      isValid: false,
      errorMessage: `Unknown provider: ${providerId}`,
    };
  }

  // Check if provider operates in this country
  if (!config.countries.includes(normalizedCountry)) {
    return {
      isValid: false,
      errorMessage: `${config.displayName} is not available in ${COUNTRY_NAMES[normalizedCountry] || normalizedCountry}`,
    };
  }

  // Get the expected phone prefix
  const expectedPrefix = config.phonePrefix[normalizedCountry];
  if (!expectedPrefix) {
    return {
      isValid: false,
      errorMessage: `Phone prefix not configured for ${normalizedCountry}`,
    };
  }

  // Clean the phone number (remove spaces, dashes, etc.)
  let cleanNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');

  // Remove the prefix if present
  if (cleanNumber.startsWith(expectedPrefix)) {
    cleanNumber = cleanNumber.substring(expectedPrefix.length);
  } else if (cleanNumber.startsWith(expectedPrefix.substring(1))) {
    // Handle case where user entered without the +
    cleanNumber = cleanNumber.substring(expectedPrefix.length - 1);
  } else if (cleanNumber.startsWith('00')) {
    // Handle international format with 00 instead of +
    const countryDialCode = expectedPrefix.substring(1);
    if (cleanNumber.startsWith('00' + countryDialCode)) {
      cleanNumber = cleanNumber.substring(2 + countryDialCode.length);
    }
  }

  // Remove leading zeros that might be local format
  cleanNumber = cleanNumber.replace(/^0+/, '');

  // Validate against the provider's regex
  const regex = new RegExp(config.phoneRegex);
  if (!regex.test(cleanNumber)) {
    return {
      isValid: false,
      errorMessage: `Invalid phone number format for ${config.displayName}. Expected ${config.phoneRegex.replace('^', '').replace('$', '')}`,
    };
  }

  // Return success with normalized number
  return {
    isValid: true,
    normalizedNumber: `${expectedPrefix}${cleanNumber}`,
  };
}

/**
 * Get simplified display information for a provider (for UI rendering)
 *
 * @param providerId - The provider identifier
 * @returns Display information or undefined if provider not found
 *
 * @example
 * const info = getProviderDisplayInfo('wave');
 * // Returns: { id: 'wave', displayName: 'Wave', ... }
 */
export function getProviderDisplayInfo(
  providerId: MobileMoneyProvider
): ProviderDisplayInfo | undefined {
  const config = getProviderConfig(providerId);
  if (!config) {
    return undefined;
  }

  const feesDescription =
    config.fees.fixed > 0
      ? `$${(config.fees.fixed / 100).toFixed(2)} + ${config.fees.percentage}%`
      : `${config.fees.percentage}%`;

  return {
    id: config.id,
    displayName: config.displayName,
    logo: config.logo,
    processingTime: config.processingTime,
    minAmount: config.minAmount,
    maxAmount: config.maxAmount,
    feesDescription,
  };
}

/**
 * Get all providers as display information (for dropdown lists)
 *
 * @returns Array of all providers with display information
 */
export function getAllProvidersDisplayInfo(): ProviderDisplayInfo[] {
  return Object.values(MOBILE_MONEY_PROVIDERS)
    .map((config) => getProviderDisplayInfo(config.id))
    .filter((info): info is ProviderDisplayInfo => info !== undefined);
}

/**
 * Check if a provider supports a specific country
 *
 * @param providerId - The provider identifier
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns true if the provider operates in the country
 */
export function isProviderAvailableInCountry(
  providerId: MobileMoneyProvider,
  countryCode: string
): boolean {
  const config = getProviderConfig(providerId);
  if (!config) return false;
  return config.countries.includes(countryCode.toUpperCase());
}

/**
 * Calculate estimated fees for a transaction
 *
 * @param providerId - The provider identifier
 * @param amountCents - Amount in USD cents
 * @returns Estimated fee in USD cents, or undefined if provider not found
 */
export function calculateProviderFees(
  providerId: MobileMoneyProvider,
  amountCents: number
): number | undefined {
  const config = getProviderConfig(providerId);
  if (!config) return undefined;

  const percentageFee = Math.ceil((amountCents * config.fees.percentage) / 100);
  return config.fees.fixed + percentageFee;
}

/**
 * Get the currency code for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns ISO 4217 currency code or undefined
 */
export function getCurrencyForCountry(countryCode: string): string | undefined {
  return COUNTRY_CURRENCIES[countryCode.toUpperCase()];
}

/**
 * Get the country name for display
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Human-readable country name or the code itself if not found
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get all supported countries as a list
 *
 * @returns Array of objects with country code, name, and currency
 */
export function getAllSupportedCountries(): Array<{
  code: string;
  name: string;
  currency: string;
  providerCount: number;
}> {
  return Object.entries(COUNTRY_TO_PROVIDERS).map(([code, providers]) => ({
    code,
    name: COUNTRY_NAMES[code] || code,
    currency: COUNTRY_CURRENCIES[code] || 'USD',
    providerCount: providers.length,
  }));
}
