/**
 * Tax Calculation Engine for SOS-Expat
 *
 * Handles VAT/GST calculation for international B2B/B2C transactions
 * Seller: SOS-Expat OU (Estonia, EE)
 * VAT EE: 22%
 * OSS registered for intra-EU B2C sales
 *
 * @module tax/calculateTax
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { db, FieldValue } from '../utils/firebase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TaxCalculationInput {
  sellerCountry: string;      // Always 'EE' for SOS-Expat
  buyerCountry: string;       // ISO country code
  buyerType: 'B2B' | 'B2C';
  vatNumber?: string;         // If B2B
  amount: number;             // Amount excluding tax in EUR
  currency: string;
  serviceType: 'LEGAL' | 'CONSULTING' | 'DIGITAL' | 'OTHER';
  transactionDate: Date | string;
  buyerId?: string;           // Optional: for tracking
  transactionId?: string;     // Optional: for tracking
}

export interface TaxCalculationResult {
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  taxCountry: string;
  taxType: 'VAT' | 'GST' | 'SALES_TAX' | 'NONE';
  declarationType: 'VAT_EE' | 'OSS' | 'DES' | 'UK_VAT' | 'CH_VAT' | 'LOCAL' | 'NONE';
  reverseCharge: boolean;
  invoiceMentions: string[];
  vatValidated?: boolean;
  vatValidationDetails?: {
    valid: boolean;
    requestDate: string;
    countryCode: string;
    vatNumber: string;
    name?: string;
    address?: string;
  };
  ossThresholdStatus: {
    currentYearTotal: number;
    thresholdAmount: number;
    percentageUsed: number;
    isAboveThreshold: boolean;
  };
  calculationDetails: {
    rule: string;
    appliedRegime: string;
    timestamp: string;
  };
}

interface ThresholdConfig {
  country: string;
  thresholdAmount: number;
  currency: string;
  requiresRegistration: boolean;
  taxRate: number;
  notes?: string;
}

interface OSSThresholdData {
  year: number;
  totalB2CIntraEU: number;
  byCountry: Record<string, number>;
  lastUpdated: admin.firestore.Timestamp;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SELLER_COUNTRY = 'EE';
const SELLER_VAT_RATE = 22;
const OSS_THRESHOLD_EUR = 10000;

// EU Countries (27 members as of 2024)
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
] as const;

// EU VAT Rates (standard rate as of 2024)
const EU_VAT_RATES: Record<string, number> = {
  AT: 20,  // Austria
  BE: 21,  // Belgium
  BG: 20,  // Bulgaria
  HR: 25,  // Croatia
  CY: 19,  // Cyprus
  CZ: 21,  // Czech Republic
  DK: 25,  // Denmark
  EE: 22,  // Estonia
  FI: 24,  // Finland
  FR: 20,  // France
  DE: 19,  // Germany
  GR: 24,  // Greece
  HU: 27,  // Hungary
  IE: 23,  // Ireland
  IT: 22,  // Italy
  LV: 21,  // Latvia
  LT: 21,  // Lithuania
  LU: 17,  // Luxembourg
  MT: 18,  // Malta
  NL: 21,  // Netherlands
  PL: 23,  // Poland
  PT: 23,  // Portugal
  RO: 19,  // Romania
  SK: 20,  // Slovakia
  SI: 22,  // Slovenia
  ES: 21,  // Spain
  SE: 25,  // Sweden
};

// Non-EU country thresholds
const COUNTRY_THRESHOLDS: Record<string, ThresholdConfig> = {
  GB: {
    country: 'GB',
    thresholdAmount: 0, // No threshold for digital services from 2021
    currency: 'GBP',
    requiresRegistration: true, // Always required for B2C
    taxRate: 20,
    notes: 'UK VAT registration required from first sale for B2C digital/professional services'
  },
  CH: {
    country: 'CH',
    thresholdAmount: 100000,
    currency: 'CHF',
    requiresRegistration: false,
    taxRate: 8.1,
    notes: 'Swiss VAT registration required if turnover exceeds CHF 100,000/year from Swiss customers'
  },
  NO: {
    country: 'NO',
    thresholdAmount: 50000,
    currency: 'NOK',
    requiresRegistration: false,
    taxRate: 25,
    notes: 'Norway VOEC registration for B2C digital services'
  },
  AU: {
    country: 'AU',
    thresholdAmount: 75000,
    currency: 'AUD',
    requiresRegistration: false,
    taxRate: 10,
    notes: 'Australia GST registration threshold'
  },
  NZ: {
    country: 'NZ',
    thresholdAmount: 60000,
    currency: 'NZD',
    requiresRegistration: false,
    taxRate: 15,
    notes: 'New Zealand GST registration threshold'
  },
  CA: {
    country: 'CA',
    thresholdAmount: 30000,
    currency: 'CAD',
    requiresRegistration: false,
    taxRate: 5, // Federal GST only, provinces vary
    notes: 'Canada GST/HST - Federal rate only, provincial rates vary'
  },
  JP: {
    country: 'JP',
    thresholdAmount: 10000000, // 10M JPY
    currency: 'JPY',
    requiresRegistration: false,
    taxRate: 10,
    notes: 'Japan Consumption Tax for digital services'
  },
  SG: {
    country: 'SG',
    thresholdAmount: 100000,
    currency: 'SGD',
    requiresRegistration: false,
    taxRate: 9,
    notes: 'Singapore GST registration threshold'
  },
  IN: {
    country: 'IN',
    thresholdAmount: 2000000, // 20 Lakh INR
    currency: 'INR',
    requiresRegistration: false,
    taxRate: 18,
    notes: 'India GST for OIDAR services'
  },
};

// US Sales Tax Nexus states (simplified - professional services often exempt)
// Note: Most US states exempt professional/legal services from sales tax
// This list is maintained for future use if nexus rules change
export const US_STATES_WITH_NEXUS: string[] = [
  // Only a few states tax some professional services (currently none applicable)
];

// Invoice mentions by scenario
const INVOICE_MENTIONS = {
  REVERSE_CHARGE_EU: 'Autoliquidation de la TVA - Art. 196 Directive 2006/112/CE',
  REVERSE_CHARGE_EU_EN: 'Reverse charge - VAT to be accounted for by the recipient pursuant to Art. 196 of Council Directive 2006/112/EC',
  OSS_REGIME: 'TVA declaree sous le regime OSS (One-Stop Shop) - Regime UE',
  OSS_REGIME_EN: 'VAT declared under OSS (One-Stop Shop) regime - EU scheme',
  UK_B2B: 'Service hors champ TVA UK - Client professionnel',
  UK_B2B_EN: 'Outside scope of UK VAT - Business customer',
  UK_B2C: 'UK VAT applicable',
  CH_BELOW_THRESHOLD: 'TVA suisse non applicable - Seuil CHF 100,000 non atteint',
  CH_BELOW_THRESHOLD_EN: 'Swiss VAT not applicable - Threshold CHF 100,000 not reached',
  CH_VAT: 'TVA suisse applicable',
  EXPORT_SERVICE: 'Exportation de services - Exonere de TVA',
  EXPORT_SERVICE_EN: 'Export of services - VAT exempt',
  US_EXEMPT: 'Services professionnels exemptes de Sales Tax US',
  US_EXEMPT_EN: 'Professional services exempt from US Sales Tax',
  SELLER_INFO: 'SOS-Expat OU - N° TVA: EE102318877 - Estonie',
};

// ============================================================================
// VIES VAT VALIDATION
// ============================================================================

interface VIESResponse {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  name?: string;
  address?: string;
}

/**
 * Validate EU VAT number via VIES (simulated - in production use SOAP service)
 *
 * Production implementation should use:
 * https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
 */
async function validateVATNumber(countryCode: string, vatNumber: string): Promise<VIESResponse> {
  // Clean VAT number - remove country prefix if present
  let cleanVat = vatNumber.toUpperCase().replace(/\s/g, '');
  if (cleanVat.startsWith(countryCode)) {
    cleanVat = cleanVat.substring(countryCode.length);
  }

  // Basic format validation by country
  const vatFormats: Record<string, RegExp> = {
    AT: /^U\d{8}$/,
    BE: /^0?\d{9,10}$/,
    BG: /^\d{9,10}$/,
    HR: /^\d{11}$/,
    CY: /^\d{8}[A-Z]$/,
    CZ: /^\d{8,10}$/,
    DK: /^\d{8}$/,
    EE: /^\d{9}$/,
    FI: /^\d{8}$/,
    FR: /^[A-Z0-9]{2}\d{9}$/,
    DE: /^\d{9}$/,
    GR: /^\d{9}$/,
    HU: /^\d{8}$/,
    IE: /^\d{7}[A-Z]{1,2}$|^\d[A-Z]\d{5}[A-Z]$/,
    IT: /^\d{11}$/,
    LV: /^\d{11}$/,
    LT: /^\d{9}$|^\d{12}$/,
    LU: /^\d{8}$/,
    MT: /^\d{8}$/,
    NL: /^\d{9}B\d{2}$/,
    PL: /^\d{10}$/,
    PT: /^\d{9}$/,
    RO: /^\d{2,10}$/,
    SK: /^\d{10}$/,
    SI: /^\d{8}$/,
    ES: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/,
    SE: /^\d{12}$/,
  };

  const format = vatFormats[countryCode];
  const isFormatValid = format ? format.test(cleanVat) : true;

  if (!isFormatValid) {
    return {
      valid: false,
      countryCode,
      vatNumber: cleanVat,
      requestDate: new Date().toISOString(),
    };
  }

  // In production, call VIES SOAP API here
  // For now, simulate validation (format check passed)
  // TODO: Implement actual VIES SOAP call

  try {
    // Check cache first
    const cacheRef = db.collection('vies_cache').doc(`${countryCode}${cleanVat}`);
    const cacheDoc = await cacheRef.get();

    if (cacheDoc.exists) {
      const cacheData = cacheDoc.data();
      const cacheAge = Date.now() - (cacheData?.timestamp?.toMillis() || 0);
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < CACHE_TTL) {
        logger.info('VIES cache hit', { countryCode, vatNumber: cleanVat });
        return cacheData?.response as VIESResponse;
      }
    }

    // Simulate VIES call (in production, use actual SOAP API)
    // For demo purposes, we accept format-valid VAT numbers
    const response: VIESResponse = {
      valid: isFormatValid,
      countryCode,
      vatNumber: cleanVat,
      requestDate: new Date().toISOString(),
      name: isFormatValid ? 'Company Name (VIES)' : undefined,
      address: isFormatValid ? 'Company Address (VIES)' : undefined,
    };

    // Cache the response
    await cacheRef.set({
      response,
      timestamp: FieldValue.serverTimestamp(),
    });

    return response;
  } catch (error) {
    logger.error('VIES validation error', { error, countryCode, vatNumber: cleanVat });
    // Return format validation result on error
    return {
      valid: isFormatValid,
      countryCode,
      vatNumber: cleanVat,
      requestDate: new Date().toISOString(),
    };
  }
}

// ============================================================================
// OSS THRESHOLD TRACKING
// ============================================================================

/**
 * Get current year's OSS threshold status
 */
async function getOSSThresholdStatus(): Promise<{
  currentYearTotal: number;
  thresholdAmount: number;
  percentageUsed: number;
  isAboveThreshold: boolean;
  byCountry: Record<string, number>;
}> {
  const currentYear = new Date().getFullYear();
  const docRef = db.collection('tax_thresholds').doc(`oss_${currentYear}`);

  try {
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data() as OSSThresholdData;
      const percentageUsed = (data.totalB2CIntraEU / OSS_THRESHOLD_EUR) * 100;

      return {
        currentYearTotal: data.totalB2CIntraEU,
        thresholdAmount: OSS_THRESHOLD_EUR,
        percentageUsed: Math.min(percentageUsed, 100),
        isAboveThreshold: data.totalB2CIntraEU >= OSS_THRESHOLD_EUR,
        byCountry: data.byCountry || {},
      };
    }

    // Initialize if doesn't exist
    const initialData: OSSThresholdData = {
      year: currentYear,
      totalB2CIntraEU: 0,
      byCountry: {},
      lastUpdated: admin.firestore.Timestamp.now(),
    };

    await docRef.set(initialData);

    return {
      currentYearTotal: 0,
      thresholdAmount: OSS_THRESHOLD_EUR,
      percentageUsed: 0,
      isAboveThreshold: false,
      byCountry: {},
    };
  } catch (error) {
    logger.error('Error getting OSS threshold status', { error });
    return {
      currentYearTotal: 0,
      thresholdAmount: OSS_THRESHOLD_EUR,
      percentageUsed: 0,
      isAboveThreshold: false,
      byCountry: {},
    };
  }
}

/**
 * Update OSS threshold tracking after a B2C intra-EU sale
 */
async function updateOSSThreshold(
  buyerCountry: string,
  amount: number
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const docRef = db.collection('tax_thresholds').doc(`oss_${currentYear}`);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (doc.exists) {
        const data = doc.data() as OSSThresholdData;
        const newByCountry = { ...data.byCountry };
        newByCountry[buyerCountry] = (newByCountry[buyerCountry] || 0) + amount;

        transaction.update(docRef, {
          totalB2CIntraEU: FieldValue.increment(amount),
          [`byCountry.${buyerCountry}`]: FieldValue.increment(amount),
          lastUpdated: FieldValue.serverTimestamp(),
        });
      } else {
        const initialData: OSSThresholdData = {
          year: currentYear,
          totalB2CIntraEU: amount,
          byCountry: { [buyerCountry]: amount },
          lastUpdated: admin.firestore.Timestamp.now(),
        };
        transaction.set(docRef, initialData);
      }
    });

    logger.info('OSS threshold updated', { buyerCountry, amount });
  } catch (error) {
    logger.error('Error updating OSS threshold', { error, buyerCountry, amount });
  }
}

/**
 * Get country-specific threshold status (for non-EU countries)
 */
async function getCountryThresholdStatus(
  countryCode: string
): Promise<{
  currentYearTotal: number;
  thresholdAmount: number;
  percentageUsed: number;
  isAboveThreshold: boolean;
  requiresRegistration: boolean;
}> {
  const threshold = COUNTRY_THRESHOLDS[countryCode];

  if (!threshold) {
    return {
      currentYearTotal: 0,
      thresholdAmount: 0,
      percentageUsed: 0,
      isAboveThreshold: false,
      requiresRegistration: false,
    };
  }

  const currentYear = new Date().getFullYear();
  const docRef = db.collection('tax_thresholds').doc(`${countryCode.toLowerCase()}_${currentYear}`);

  try {
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      const total = data?.total || 0;
      const percentageUsed = (total / threshold.thresholdAmount) * 100;

      return {
        currentYearTotal: total,
        thresholdAmount: threshold.thresholdAmount,
        percentageUsed: Math.min(percentageUsed, 100),
        isAboveThreshold: total >= threshold.thresholdAmount,
        requiresRegistration: threshold.requiresRegistration || total >= threshold.thresholdAmount,
      };
    }

    return {
      currentYearTotal: 0,
      thresholdAmount: threshold.thresholdAmount,
      percentageUsed: 0,
      isAboveThreshold: false,
      requiresRegistration: threshold.requiresRegistration,
    };
  } catch (error) {
    logger.error('Error getting country threshold status', { error, countryCode });
    return {
      currentYearTotal: 0,
      thresholdAmount: threshold.thresholdAmount,
      percentageUsed: 0,
      isAboveThreshold: false,
      requiresRegistration: threshold.requiresRegistration,
    };
  }
}

// ============================================================================
// MAIN TAX CALCULATION LOGIC
// ============================================================================

/**
 * Calculate applicable tax for a transaction
 */
export async function calculateTaxForTransaction(
  input: TaxCalculationInput
): Promise<TaxCalculationResult> {
  const {
    sellerCountry: _sellerCountry = SELLER_COUNTRY, // Currently always EE
    buyerCountry,
    buyerType,
    vatNumber,
    amount,
    currency: _currency, // Stored for future multi-currency support
    serviceType: _serviceType, // Stored for service-specific tax rules
    transactionDate: _transactionDate, // Stored for historical rate lookup
  } = input;

  // Log unused parameters for future implementation
  void _sellerCountry;
  void _currency;
  void _serviceType;
  void _transactionDate;

  // Validate inputs
  if (!buyerCountry || buyerCountry.length !== 2) {
    throw new HttpsError('invalid-argument', 'Invalid buyer country code');
  }
  if (!['B2B', 'B2C'].includes(buyerType)) {
    throw new HttpsError('invalid-argument', 'Invalid buyer type. Must be B2B or B2C');
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Invalid amount. Must be a positive number');
  }

  const normalizedBuyerCountry = buyerCountry.toUpperCase();
  const isEU = EU_COUNTRIES.includes(normalizedBuyerCountry as typeof EU_COUNTRIES[number]);
  const isEstonia = normalizedBuyerCountry === 'EE';
  const isUK = normalizedBuyerCountry === 'GB';
  const isSwitzerland = normalizedBuyerCountry === 'CH';
  const isUSA = normalizedBuyerCountry === 'US';

  let result: TaxCalculationResult;

  // ============================================================================
  // CASE 1: BUYER IN ESTONIA (EE)
  // ============================================================================
  if (isEstonia) {
    result = {
      taxableAmount: amount,
      taxRate: SELLER_VAT_RATE,
      taxAmount: roundToTwoDecimals(amount * (SELLER_VAT_RATE / 100)),
      totalAmount: roundToTwoDecimals(amount * (1 + SELLER_VAT_RATE / 100)),
      taxCountry: 'EE',
      taxType: 'VAT',
      declarationType: 'VAT_EE',
      reverseCharge: false,
      invoiceMentions: [
        INVOICE_MENTIONS.SELLER_INFO,
        `TVA Estonie ${SELLER_VAT_RATE}%`,
      ],
      ossThresholdStatus: await getOSSThresholdStatus(),
      calculationDetails: {
        rule: 'DOMESTIC_SALE',
        appliedRegime: 'Standard Estonian VAT',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // CASE 2: BUYER IN EU (not Estonia)
  // ============================================================================
  else if (isEU) {
    if (buyerType === 'B2B' && vatNumber) {
      // B2B with VAT number - Reverse charge
      const viesResult = await validateVATNumber(normalizedBuyerCountry, vatNumber);

      result = {
        taxableAmount: amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amount,
        taxCountry: normalizedBuyerCountry,
        taxType: 'VAT',
        declarationType: 'DES', // Declaration Europeenne de Services
        reverseCharge: true,
        vatValidated: viesResult.valid,
        vatValidationDetails: viesResult,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.REVERSE_CHARGE_EU,
          INVOICE_MENTIONS.REVERSE_CHARGE_EU_EN,
          `N° TVA client: ${normalizedBuyerCountry}${viesResult.vatNumber}`,
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'EU_B2B_REVERSE_CHARGE',
          appliedRegime: 'Intra-EU B2B - Reverse Charge (Art. 196)',
          timestamp: new Date().toISOString(),
        },
      };

      if (!viesResult.valid) {
        result.invoiceMentions.push('ATTENTION: N° TVA non valide dans VIES - Verification requise');
      }
    } else {
      // B2C - Check OSS threshold
      const ossStatus = await getOSSThresholdStatus();
      let applicableTaxRate: number;
      let declarationType: TaxCalculationResult['declarationType'];
      let mentions: string[] = [INVOICE_MENTIONS.SELLER_INFO];

      if (ossStatus.isAboveThreshold) {
        // Above OSS threshold - apply destination country VAT
        applicableTaxRate = EU_VAT_RATES[normalizedBuyerCountry] || 20;
        declarationType = 'OSS';
        mentions.push(
          INVOICE_MENTIONS.OSS_REGIME,
          INVOICE_MENTIONS.OSS_REGIME_EN,
          `TVA ${normalizedBuyerCountry} ${applicableTaxRate}%`
        );
      } else {
        // Below OSS threshold - can still choose to apply destination VAT or EE VAT
        // Best practice: Apply destination country VAT for consistency
        applicableTaxRate = EU_VAT_RATES[normalizedBuyerCountry] || 20;
        declarationType = 'OSS';
        mentions.push(
          INVOICE_MENTIONS.OSS_REGIME,
          `TVA ${normalizedBuyerCountry} ${applicableTaxRate}%`
        );
      }

      result = {
        taxableAmount: amount,
        taxRate: applicableTaxRate,
        taxAmount: roundToTwoDecimals(amount * (applicableTaxRate / 100)),
        totalAmount: roundToTwoDecimals(amount * (1 + applicableTaxRate / 100)),
        taxCountry: normalizedBuyerCountry,
        taxType: 'VAT',
        declarationType,
        reverseCharge: false,
        invoiceMentions: mentions,
        ossThresholdStatus: ossStatus,
        calculationDetails: {
          rule: 'EU_B2C_OSS',
          appliedRegime: `OSS - ${normalizedBuyerCountry} VAT Rate`,
          timestamp: new Date().toISOString(),
        },
      };

      // Update OSS threshold tracking
      await updateOSSThreshold(normalizedBuyerCountry, amount);
    }
  }

  // ============================================================================
  // CASE 3: BUYER IN UK
  // ============================================================================
  else if (isUK) {
    if (buyerType === 'B2B') {
      // UK B2B - Outside scope of UK VAT
      result = {
        taxableAmount: amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amount,
        taxCountry: 'GB',
        taxType: 'NONE',
        declarationType: 'NONE',
        reverseCharge: false,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.UK_B2B,
          INVOICE_MENTIONS.UK_B2B_EN,
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'UK_B2B_OUTSIDE_SCOPE',
          appliedRegime: 'Outside scope of UK VAT - B2B',
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // UK B2C - UK VAT 20% (registration required from first sale)
      const ukVatRate = 20;
      result = {
        taxableAmount: amount,
        taxRate: ukVatRate,
        taxAmount: roundToTwoDecimals(amount * (ukVatRate / 100)),
        totalAmount: roundToTwoDecimals(amount * (1 + ukVatRate / 100)),
        taxCountry: 'GB',
        taxType: 'VAT',
        declarationType: 'UK_VAT',
        reverseCharge: false,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.UK_B2C,
          `UK VAT ${ukVatRate}%`,
          'ATTENTION: Enregistrement UK VAT obligatoire pour ventes B2C',
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'UK_B2C_VAT',
          appliedRegime: 'UK VAT - B2C Digital/Professional Services',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ============================================================================
  // CASE 4: BUYER IN SWITZERLAND
  // ============================================================================
  else if (isSwitzerland) {
    const chThresholdStatus = await getCountryThresholdStatus('CH');

    if (chThresholdStatus.isAboveThreshold) {
      // Above CHF 100k threshold - Swiss VAT applies
      const chVatRate = 8.1;
      result = {
        taxableAmount: amount,
        taxRate: chVatRate,
        taxAmount: roundToTwoDecimals(amount * (chVatRate / 100)),
        totalAmount: roundToTwoDecimals(amount * (1 + chVatRate / 100)),
        taxCountry: 'CH',
        taxType: 'VAT',
        declarationType: 'CH_VAT',
        reverseCharge: false,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.CH_VAT,
          `TVA Suisse ${chVatRate}%`,
          'Enregistrement TVA suisse requis',
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'CH_ABOVE_THRESHOLD',
          appliedRegime: 'Swiss VAT - Above CHF 100k threshold',
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // Below threshold - No Swiss VAT
      result = {
        taxableAmount: amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amount,
        taxCountry: 'CH',
        taxType: 'NONE',
        declarationType: 'NONE',
        reverseCharge: false,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.CH_BELOW_THRESHOLD,
          INVOICE_MENTIONS.CH_BELOW_THRESHOLD_EN,
          `Seuil actuel: ${chThresholdStatus.percentageUsed.toFixed(1)}% de CHF 100,000`,
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'CH_BELOW_THRESHOLD',
          appliedRegime: 'No Swiss VAT - Below threshold',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ============================================================================
  // CASE 5: BUYER IN USA
  // ============================================================================
  else if (isUSA) {
    // Professional/Legal/Consulting services are generally exempt from US Sales Tax
    result = {
      taxableAmount: amount,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: amount,
      taxCountry: 'US',
      taxType: 'NONE',
      declarationType: 'NONE',
      reverseCharge: false,
      invoiceMentions: [
        INVOICE_MENTIONS.SELLER_INFO,
        INVOICE_MENTIONS.US_EXEMPT,
        INVOICE_MENTIONS.US_EXEMPT_EN,
        'Services professionnels - Pas de nexus fiscal etabli',
      ],
      ossThresholdStatus: await getOSSThresholdStatus(),
      calculationDetails: {
        rule: 'US_SERVICE_EXEMPT',
        appliedRegime: 'US - Professional services exempt from Sales Tax',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // CASE 6: REST OF THE WORLD
  // ============================================================================
  else {
    // Check if country has threshold requirements
    const countryThreshold = COUNTRY_THRESHOLDS[normalizedBuyerCountry];

    if (countryThreshold) {
      const thresholdStatus = await getCountryThresholdStatus(normalizedBuyerCountry);

      if (thresholdStatus.isAboveThreshold || countryThreshold.requiresRegistration) {
        // Above threshold or registration always required
        result = {
          taxableAmount: amount,
          taxRate: countryThreshold.taxRate,
          taxAmount: roundToTwoDecimals(amount * (countryThreshold.taxRate / 100)),
          totalAmount: roundToTwoDecimals(amount * (1 + countryThreshold.taxRate / 100)),
          taxCountry: normalizedBuyerCountry,
          taxType: countryThreshold.taxRate > 0 ? 'GST' : 'NONE',
          declarationType: 'LOCAL',
          reverseCharge: false,
          invoiceMentions: [
            INVOICE_MENTIONS.SELLER_INFO,
            `${countryThreshold.notes}`,
            `Taxe locale: ${countryThreshold.taxRate}%`,
          ],
          ossThresholdStatus: await getOSSThresholdStatus(),
          calculationDetails: {
            rule: 'COUNTRY_SPECIFIC_TAX',
            appliedRegime: `${normalizedBuyerCountry} - Local tax regime`,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        // Below threshold - No local tax
        result = {
          taxableAmount: amount,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: amount,
          taxCountry: normalizedBuyerCountry,
          taxType: 'NONE',
          declarationType: 'NONE',
          reverseCharge: false,
          invoiceMentions: [
            INVOICE_MENTIONS.SELLER_INFO,
            INVOICE_MENTIONS.EXPORT_SERVICE,
            INVOICE_MENTIONS.EXPORT_SERVICE_EN,
          ],
          ossThresholdStatus: await getOSSThresholdStatus(),
          calculationDetails: {
            rule: 'EXPORT_BELOW_THRESHOLD',
            appliedRegime: 'Export - Below registration threshold',
            timestamp: new Date().toISOString(),
          },
        };
      }
    } else {
      // No specific rules - Export service exempt
      result = {
        taxableAmount: amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: amount,
        taxCountry: normalizedBuyerCountry,
        taxType: 'NONE',
        declarationType: 'NONE',
        reverseCharge: false,
        invoiceMentions: [
          INVOICE_MENTIONS.SELLER_INFO,
          INVOICE_MENTIONS.EXPORT_SERVICE,
          INVOICE_MENTIONS.EXPORT_SERVICE_EN,
        ],
        ossThresholdStatus: await getOSSThresholdStatus(),
        calculationDetails: {
          rule: 'EXPORT_SERVICE',
          appliedRegime: 'Export of services - VAT exempt',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Log the calculation for audit
  await logTaxCalculation(input, result);

  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Log tax calculation for audit trail
 */
async function logTaxCalculation(
  input: TaxCalculationInput,
  result: TaxCalculationResult
): Promise<void> {
  try {
    await db.collection('tax_calculations_log').add({
      input: {
        ...input,
        transactionDate: input.transactionDate instanceof Date
          ? input.transactionDate.toISOString()
          : input.transactionDate,
      },
      result,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error logging tax calculation', { error });
  }
}

// ============================================================================
// CLOUD FUNCTION EXPORT
// ============================================================================

export const calculateTax = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
  },
  async (request) => {
    try {
      const data = request.data as TaxCalculationInput;

      // Validate authentication if needed
      // if (!request.auth) {
      //   throw new HttpsError('unauthenticated', 'Authentication required');
      // }

      logger.info('Tax calculation requested', {
        buyerCountry: data.buyerCountry,
        buyerType: data.buyerType,
        amount: data.amount,
      });

      const result = await calculateTaxForTransaction(data);

      logger.info('Tax calculation completed', {
        taxRate: result.taxRate,
        taxAmount: result.taxAmount,
        declarationType: result.declarationType,
      });

      return result;
    } catch (error) {
      logger.error('Tax calculation error', { error });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Tax calculation failed');
    }
  }
);

/**
 * HTTP endpoint for tax calculation (for external integrations)
 */
export { calculateTax as calculateTaxCallable };

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get current threshold status for all tracked countries
 */
export const getTaxThresholdStatus = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    // Require admin authentication (check both claim formats for compatibility)
    const claims = request.auth?.token;
    const isAdmin = claims?.admin === true || claims?.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const ossStatus = await getOSSThresholdStatus();
    const countryStatuses: Record<string, Awaited<ReturnType<typeof getCountryThresholdStatus>>> = {};

    for (const countryCode of Object.keys(COUNTRY_THRESHOLDS)) {
      countryStatuses[countryCode] = await getCountryThresholdStatus(countryCode);
    }

    return {
      oss: ossStatus,
      countries: countryStatuses,
      lastUpdated: new Date().toISOString(),
    };
  }
);

/**
 * Validate a VAT number manually
 */
export const validateVAT = onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { countryCode, vatNumber } = request.data as {
      countryCode: string;
      vatNumber: string;
    };

    if (!countryCode || !vatNumber) {
      throw new HttpsError('invalid-argument', 'Country code and VAT number required');
    }

    return await validateVATNumber(countryCode.toUpperCase(), vatNumber);
  }
);

// ============================================================================
// CONSTANTS EXPORTS (for use in other modules)
// ============================================================================

export {
  EU_COUNTRIES,
  EU_VAT_RATES,
  COUNTRY_THRESHOLDS,
  OSS_THRESHOLD_EUR,
  INVOICE_MENTIONS,
  SELLER_COUNTRY,
  SELLER_VAT_RATE,
};
