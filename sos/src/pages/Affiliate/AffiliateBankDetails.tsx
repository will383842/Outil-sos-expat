/**
 * AffiliateBankDetails - Payment details management page
 * Allows users to add or update their payment details for withdrawals
 * Supports: Bank Transfer (IBAN/SWIFT/local), Mobile Money, Other (PayPal, Wise, etc.)
 */

import React, { useState, useMemo, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Building2,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Globe,
  CreditCard,
  User,
  MapPin,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { BankDetailsInput, BankAccountType } from "@/types/affiliate";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate IBAN using Modulo 97 (ISO 13616)
 */
function validateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numStr = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return BigInt(numStr) % 97n === 1n;
}

/**
 * Validate SWIFT/BIC code format
 */
function validateSWIFT(swift: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.toUpperCase());
}

// ============================================================================
// COUNTRY-BASED SMART DEFAULTS
// ============================================================================

/**
 * Countries where Wise supports bank transfers (as of 2026)
 * XOF (Senegal, Ivory Coast, etc.) is NOT supported by Wise
 */
const WISE_SUPPORTED_COUNTRIES = new Set([
  // Europe
  'FR', 'DE', 'ES', 'IT', 'BE', 'NL', 'PT', 'AT', 'LU', 'MC', 'AD', 'LI', 'SM', 'VA',
  'IE', 'SE', 'NO', 'DK', 'FI', 'IS', 'GR', 'CY', 'MT', 'CH', 'GB',
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'SI', 'HR', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK',
  'EE', 'LV', 'LT', 'UA', 'MD', 'GE', 'AM', 'AZ',
  // North America
  'US', 'CA',
  // Asia-Pacific
  'AU', 'NZ', 'JP', 'KR', 'CN', 'HK', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH',
  'IN', 'PK', 'BD', 'LK', 'NP',
  // Middle East / North Africa
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'JO', 'LB', 'IQ', 'TR',
  'EG', 'MA', 'DZ', 'TN',
  // Africa (only countries where Wise sends money)
  'NG', 'GH', 'KE', 'TZ', 'UG', 'ZA',
  // Latin America
  'BR', 'MX', 'CL', 'CO', 'PE', 'AR', 'UY',
]);

/**
 * FCFA zone + other African countries NOT supported by Wise
 * These need Mobile Money (via Sendwave, WorldRemit, LemFi from France)
 */
const MOBILE_MONEY_COUNTRIES = new Set([
  // West Africa FCFA (XOF) - NOT supported by Wise
  'SN', 'CI', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW', 'GN',
  // Central Africa FCFA (XAF) - NOT supported by Wise
  'CM', 'GA', 'CG', 'TD', 'CF', 'GQ',
  // Other African countries with strong Mobile Money
  'RW', 'MW', 'ZM', 'MZ', 'MG', 'CD', 'BW', 'NA', 'SZ', 'LS',
  'ET', 'DJ', 'SO', 'SS', 'AO', 'SL', 'LR', 'GM', 'CV', 'MR',
  'ZW', 'ER',
]);

/**
 * Get the recommended payment method for a country
 */
function getRecommendedPaymentTab(countryCode: string): PaymentTab {
  const code = countryCode.toUpperCase();
  if (MOBILE_MONEY_COUNTRIES.has(code)) return 'mobile_money';
  if (WISE_SUPPORTED_COUNTRIES.has(code)) return 'bank_transfer';
  return 'other_payment';
}

/** IBAN countries (Europe, Middle East, North Africa, and more) */
const IBAN_COUNTRIES = new Set([
  // EU / EEA / SEPA
  'FR', 'DE', 'ES', 'IT', 'BE', 'NL', 'PT', 'AT', 'LU', 'MC', 'AD', 'LI', 'SM', 'VA',
  'IE', 'SE', 'NO', 'DK', 'FI', 'IS', 'GR', 'CY', 'MT',
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'SI', 'HR', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK',
  'EE', 'LV', 'LT', 'UA', 'MD', 'GE', 'AM', 'AZ', 'CH',
  // Middle East / North Africa
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'JO', 'LB', 'IQ', 'TR',
  'EG', 'MA', 'DZ', 'TN', 'LY',
  // Others using IBAN
  'BR', 'MU', 'SC', 'TL', 'PK',
]);

/**
 * Returns the default bank account type based on user country
 */
function getDefaultAccountType(countryCode: string): BankAccountType {
  const code = countryCode.toUpperCase();
  if (code === 'GB') return 'uk_sort_code';
  if (code === 'US' || code === 'CA') return 'us_aba';
  if (code === 'AU') return 'other'; // BSB - handled via "other" with specific fields
  if (code === 'IN') return 'other'; // IFSC - handled via "other" with specific fields
  if (IBAN_COUNTRIES.has(code)) return 'iban';
  return 'other';
}

/**
 * Returns the default currency for a country code
 */
function getDefaultCurrency(countryCode: string): string {
  const CURRENCY_MAP: Record<string, string> = {
    // Europe - Euro zone
    FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', BE: 'EUR', NL: 'EUR', PT: 'EUR',
    AT: 'EUR', LU: 'EUR', MC: 'EUR', AD: 'EUR', SM: 'EUR', VA: 'EUR',
    IE: 'EUR', GR: 'EUR', CY: 'EUR', MT: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR',
    ME: 'EUR', XK: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', FI: 'EUR',
    // Europe - Non-Euro
    GB: 'GBP', CH: 'CHF', LI: 'CHF',
    SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK',
    PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
    RS: 'RSD', BA: 'BAM', MK: 'MKD', AL: 'ALL',
    UA: 'UAH', MD: 'MDL', GE: 'GEL', AM: 'AMD', AZ: 'AZN',
    // North America
    US: 'USD', CA: 'CAD', MX: 'MXN',
    // Latin America
    BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
    EC: 'USD', BO: 'BOB', PY: 'PYG', UY: 'UYU',
    PA: 'USD', CR: 'CRC', NI: 'NIO', HN: 'HNL', SV: 'USD', GT: 'GTQ', BZ: 'BZD',
    VE: 'VES', GY: 'GYD', SR: 'SRD', GF: 'EUR',
    // Caribbean
    JM: 'JMD', TT: 'TTD', DO: 'DOP', HT: 'HTG', BB: 'BBD', BS: 'BSD',
    LC: 'XCD', GD: 'XCD', VC: 'XCD', AG: 'XCD', DM: 'XCD', KN: 'XCD',
    PR: 'USD', CW: 'ANG', AW: 'AWG',
    // West Africa FCFA (XOF)
    SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', BJ: 'XOF', TG: 'XOF', NE: 'XOF', GW: 'XOF',
    // Central Africa FCFA (XAF)
    CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
    // Other Africa
    GN: 'GNF', NG: 'NGN', GH: 'GHS', KE: 'KES', TZ: 'TZS', UG: 'UGX',
    RW: 'RWF', ZM: 'ZMW', ZA: 'ZAR', MW: 'MWK', MZ: 'MZN', ZW: 'ZWL',
    BW: 'BWP', NA: 'NAD', LS: 'LSL', SZ: 'SZL', ET: 'ETB', DJ: 'DJF',
    MU: 'MUR', MG: 'MGA', SC: 'SCR', CV: 'CVE', GM: 'GMD', SL: 'SLL',
    LR: 'LRD', MR: 'MRU', SO: 'SOS', ER: 'ERN', SS: 'SSP', AO: 'AOA', CD: 'CDF',
    // Middle East
    AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    IL: 'ILS', JO: 'JOD', LB: 'LBP', IQ: 'IQD', YE: 'YER', TR: 'TRY',
    EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', LY: 'LYD',
    // Asia
    JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', TW: 'TWD',
    SG: 'SGD', MY: 'MYR', TH: 'THB', VN: 'VND', ID: 'IDR', PH: 'PHP',
    IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
    MM: 'MMK', KH: 'KHR', LA: 'LAK', MN: 'MNT', BN: 'BND',
    MV: 'MVR', BT: 'BTN', TL: 'USD',
    KZ: 'KZT', UZ: 'UZS', TM: 'TMT', KG: 'KGS', TJ: 'TJS', AF: 'AFN',
    // Oceania
    AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK',
    NC: 'XPF', PF: 'XPF', WS: 'WST', TO: 'TOP', VU: 'VUV', SB: 'SBD',
  };
  return CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
}

// ============================================================================
// MOBILE MONEY OPERATORS
// ============================================================================

const MOBILE_MONEY_OPERATORS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'free_money', label: 'Free Money' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'other', label: 'Autre' },
];

// ============================================================================
// OTHER PAYMENT TYPES
// ============================================================================

const OTHER_PAYMENT_TYPES = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise_direct', label: 'Wise (transfert direct)' },
  { value: 'western_union', label: 'Western Union' },
  { value: 'other', label: 'Autre' },
];

// ============================================================================
// CURRENCY LIST (extended)
// ============================================================================

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'CHF', label: 'CHF' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'SEK', label: 'SEK' },
  { value: 'NOK', label: 'NOK' },
  { value: 'DKK', label: 'DKK' },
  { value: 'PLN', label: 'PLN' },
  { value: 'CZK', label: 'CZK' },
  { value: 'HUF', label: 'HUF' },
  { value: 'RON', label: 'RON' },
  { value: 'BGN', label: 'BGN' },
  { value: 'TRY', label: 'TRY' },
  { value: 'XOF', label: 'XOF (FCFA)' },
  { value: 'XAF', label: 'XAF (FCFA)' },
  { value: 'NGN', label: 'NGN (\u20A6)' },
  { value: 'GHS', label: 'GHS' },
  { value: 'KES', label: 'KES' },
  { value: 'TZS', label: 'TZS' },
  { value: 'UGX', label: 'UGX' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'MAD', label: 'MAD' },
  { value: 'EGP', label: 'EGP' },
  { value: 'INR', label: 'INR (\u20B9)' },
  { value: 'JPY', label: 'JPY (\u00A5)' },
  { value: 'CNY', label: 'CNY (\u00A5)' },
  { value: 'BRL', label: 'BRL (R$)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'AED', label: 'AED' },
  { value: 'SAR', label: 'SAR' },
  { value: 'NZD', label: 'NZD ($)' },
  { value: 'MGA', label: 'MGA' },
  { value: 'CDF', label: 'CDF' },
  { value: 'RWF', label: 'RWF' },
  { value: 'ETB', label: 'ETB' },
  { value: 'PKR', label: 'PKR' },
  { value: 'BDT', label: 'BDT' },
  { value: 'PHP', label: 'PHP' },
  { value: 'IDR', label: 'IDR' },
  { value: 'THB', label: 'THB' },
  { value: 'VND', label: 'VND' },
  { value: 'MYR', label: 'MYR' },
  { value: 'SGD', label: 'SGD ($)' },
  { value: 'HKD', label: 'HKD ($)' },
  { value: 'KRW', label: 'KRW' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'PEN', label: 'PEN' },
  { value: 'ARS', label: 'ARS ($)' },
  { value: 'CLP', label: 'CLP ($)' },
];

// ============================================================================
// PAYMENT METHOD TABS
// ============================================================================

type PaymentTab = 'bank_transfer' | 'mobile_money' | 'other_payment';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
  error: "text-xs text-red-500 dark:text-red-400 mt-1",
} as const;

const bankAccountTypes: { value: BankAccountType; labelId: string }[] = [
  { value: "iban", labelId: "affiliate.bankDetails.type.iban" },
  { value: "uk_sort_code", labelId: "affiliate.bankDetails.type.uk" },
  { value: "us_aba", labelId: "affiliate.bankDetails.type.us" },
  { value: "other", labelId: "affiliate.bankDetails.type.other" },
];

interface FormErrors {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  country?: string;
  currency?: string;
  swiftBic?: string;
  mobileMoneyOperator?: string;
  mobileMoneyPhone?: string;
  otherPaymentType?: string;
  otherPaymentEmail?: string;
}

const AffiliateBankDetails: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

  const { user } = useAuth();
  const { affiliateData, isLoading, updateBankDetails } = useAffiliate();

  const userCountry = (user?.country || '').toUpperCase();

  // Active payment tab
  const [activeTab, setActiveTab] = useState<PaymentTab>('bank_transfer');

  const [formData, setFormData] = useState<BankDetailsInput>({
    accountType: "iban",
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    country: "",
    currency: "EUR",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Translated routes
  const routes = useMemo(
    () => ({
      dashboard: `/${getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode)}`,
      withdraw: `/${getTranslatedRouteSlug("affiliate-withdraw" as RouteKey, langCode)}`,
    }),
    [langCode]
  );

  // Auto-set defaults based on user country
  useEffect(() => {
    if (userCountry && !formData.country) {
      const defaultAccountType = getDefaultAccountType(userCountry);
      const defaultCurrency = getDefaultCurrency(userCountry);
      const recommendedTab = getRecommendedPaymentTab(userCountry);
      setActiveTab(recommendedTab);
      setFormData((prev) => ({
        ...prev,
        accountType: defaultAccountType,
        currency: defaultCurrency,
        country: userCountry,
      }));
    }
  }, [userCountry]);

  // Pre-fill form if bank details exist
  useEffect(() => {
    if (affiliateData?.maskedBankAccount) {
      setFormData((prev) => ({
        ...prev,
        accountType: affiliateData.bankAccountType || "iban",
        currency: affiliateData.bankCurrency || "EUR",
      }));
    }
  }, [affiliateData]);

  // Validate form based on active tab
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (activeTab === 'bank_transfer') {
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = intl.formatMessage({
          id: "affiliate.bankDetails.error.accountHolderName",
          defaultMessage: "Le nom du titulaire est requis",
        });
      }

      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = intl.formatMessage({
          id: "affiliate.bankDetails.error.accountNumber",
          defaultMessage: "Le num\u00E9ro de compte est requis",
        });
      } else if (formData.accountType === "iban") {
        if (!validateIBAN(formData.accountNumber)) {
          newErrors.accountNumber = intl.formatMessage({
            id: "affiliate.bankDetails.error.invalidIban",
            defaultMessage: "Format IBAN invalide (v\u00E9rification Modulo 97 \u00E9chou\u00E9e)",
          });
        }
      } else if (formData.accountType === "uk_sort_code") {
        if (!formData.sortCode?.match(/^\d{6}$/)) {
          newErrors.accountNumber = intl.formatMessage({
            id: "affiliate.bankDetails.error.invalidSortCode",
            defaultMessage: "Sort code invalide (6 chiffres)",
          });
        }
      }

      // Validate SWIFT/BIC if provided
      if (formData.swiftBic && formData.swiftBic.trim()) {
        if (!validateSWIFT(formData.swiftBic)) {
          newErrors.swiftBic = intl.formatMessage({
            id: "affiliate.bankDetails.error.invalidSwift",
            defaultMessage: "Format SWIFT/BIC invalide (ex: BNPAFRPP)",
          });
        }
      }

      if (!formData.bankName.trim()) {
        newErrors.bankName = intl.formatMessage({
          id: "affiliate.bankDetails.error.bankName",
          defaultMessage: "Le nom de la banque est requis",
        });
      }

      if (!formData.country.trim()) {
        newErrors.country = intl.formatMessage({
          id: "affiliate.bankDetails.error.country",
          defaultMessage: "Le pays est requis",
        });
      }

      if (!formData.currency.trim()) {
        newErrors.currency = intl.formatMessage({
          id: "affiliate.bankDetails.error.currency",
          defaultMessage: "La devise est requise",
        });
      }
    } else if (activeTab === 'mobile_money') {
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = intl.formatMessage({
          id: "affiliate.bankDetails.error.accountHolderName",
          defaultMessage: "Le nom du titulaire est requis",
        });
      }
      if (!formData.mobileMoneyOperator) {
        newErrors.mobileMoneyOperator = intl.formatMessage({
          id: "affiliate.bankDetails.error.mobileMoneyOperator",
          defaultMessage: "Choisissez un op\u00E9rateur",
        });
      }
      if (!formData.mobileMoneyPhone?.trim()) {
        newErrors.mobileMoneyPhone = intl.formatMessage({
          id: "affiliate.bankDetails.error.mobileMoneyPhone",
          defaultMessage: "Le num\u00E9ro de t\u00E9l\u00E9phone est requis",
        });
      }
    } else if (activeTab === 'other_payment') {
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = intl.formatMessage({
          id: "affiliate.bankDetails.error.accountHolderName",
          defaultMessage: "Le nom du titulaire est requis",
        });
      }
      if (!formData.otherPaymentType) {
        newErrors.otherPaymentType = intl.formatMessage({
          id: "affiliate.bankDetails.error.otherPaymentType",
          defaultMessage: "Choisissez un type de paiement",
        });
      }
      if (!formData.otherPaymentEmail?.trim()) {
        newErrors.otherPaymentEmail = intl.formatMessage({
          id: "affiliate.bankDetails.error.otherPaymentEmail",
          defaultMessage: "L'email ou les instructions sont requises",
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Set the right accountType based on active tab
      const submitData: BankDetailsInput = { ...formData };
      if (activeTab === 'mobile_money') {
        submitData.accountType = 'mobile_money';
        submitData.accountNumber = submitData.mobileMoneyPhone || '';
      } else if (activeTab === 'other_payment') {
        submitData.accountType = 'other_payment';
        submitData.accountNumber = submitData.otherPaymentEmail || '';
      }

      const result = await updateBankDetails(submitData);
      if (result.success) {
        setSuccess(true);
      } else {
        setSubmitError(result.message);
      }
    } catch (err) {
      console.error("Bank details update error:", err);
      const errorCode = err instanceof Error ? err.message : "";
      if (errorCode.includes("pending")) {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.pending", defaultMessage: "Impossible de modifier pendant un retrait en cours." }));
      } else if (errorCode.includes("Invalid bank details")) {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.invalid", defaultMessage: "Les coordonn\u00E9es bancaires sont invalides. V\u00E9rifiez et r\u00E9essayez." }));
      } else {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.generic", defaultMessage: "Erreur lors de la mise \u00E0 jour. Veuillez r\u00E9essayer." }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (field: keyof BankDetailsInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Success state
  if (success) {
    return (
      <DashboardLayout activeKey="affiliate-bank-details">
        <div className="max-w-lg mx-auto py-12">
          <div className={`${UI.card} p-8 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="affiliate.bankDetails.success.title" defaultMessage="Coordonn\u00E9es enregistr\u00E9es !" />
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="affiliate.bankDetails.success.description"
                defaultMessage="Vos coordonn\u00E9es de paiement ont \u00E9t\u00E9 enregistr\u00E9es de mani\u00E8re s\u00E9curis\u00E9e."
              />
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(routes.dashboard)}
                className={`${UI.button.secondary} px-6 py-3 flex-1`}
              >
                <FormattedMessage id="affiliate.bankDetails.backToDashboard" defaultMessage="Tableau de bord" />
              </button>
              <button
                onClick={() => navigate(routes.withdraw)}
                className={`${UI.button.primary} px-6 py-3 flex-1`}
              >
                <FormattedMessage id="affiliate.bankDetails.goToWithdraw" defaultMessage="Faire un retrait" />
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Tab button renderer
  const renderTabButton = (tab: PaymentTab, icon: React.ReactNode, titleId: string, defaultTitle: string, subtitleId: string, defaultSubtitle: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left w-full ${
        activeTab === tab
          ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600"
          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
      }`}
    >
      <div className={`p-2 rounded-lg ${
        activeTab === tab
          ? "bg-indigo-100 dark:bg-indigo-800/50"
          : "bg-gray-100 dark:bg-gray-800"
      }`}>
        {icon}
      </div>
      <div>
        <p className={`font-semibold text-sm ${
          activeTab === tab
            ? "text-indigo-700 dark:text-indigo-300"
            : "text-gray-700 dark:text-gray-300"
        }`}>
          <FormattedMessage id={titleId} defaultMessage={defaultTitle} />
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id={subtitleId} defaultMessage={defaultSubtitle} />
        </p>
      </div>
    </button>
  );

  return (
    <DashboardLayout activeKey="affiliate-bank-details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(routes.dashboard)} className={`${UI.button.ghost} p-2`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="affiliate.bankDetails.title" defaultMessage="Coordonn\u00E9es de paiement" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="affiliate.bankDetails.subtitle" defaultMessage="Pour recevoir vos paiements - 197 pays support\u00E9s" />
            </p>
          </div>
        </div>

        {/* Recommended method banner */}
        {userCountry && MOBILE_MONEY_COUNTRIES.has(userCountry) && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              <FormattedMessage
                id="affiliate.bankDetails.recommended.mobileMoney"
                defaultMessage="📱 Pour votre pays, nous recommandons Mobile Money (Orange Money, Wave...). Le paiement sera envoyé via Sendwave, WorldRemit ou LemFi depuis la France."
              />
            </p>
          </div>
        )}
        {userCountry && !MOBILE_MONEY_COUNTRIES.has(userCountry) && WISE_SUPPORTED_COUNTRIES.has(userCountry) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              <FormattedMessage
                id="affiliate.bankDetails.recommended.bankTransfer"
                defaultMessage="🏦 Pour votre pays, nous recommandons le virement bancaire. Le paiement sera envoyé via Wise."
              />
            </p>
          </div>
        )}

        {/* Payment Method Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {renderTabButton(
            'bank_transfer',
            <Building2 className={`w-5 h-5 ${activeTab === 'bank_transfer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />,
            'affiliate.bankDetails.tab.bankTransfer',
            'Virement bancaire',
            'affiliate.bankDetails.tab.bankTransfer.subtitle',
            'Via Wise — IBAN, SWIFT, Sort Code...'
          )}
          {renderTabButton(
            'mobile_money',
            <Smartphone className={`w-5 h-5 ${activeTab === 'mobile_money' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />,
            'affiliate.bankDetails.tab.mobileMoney',
            'Mobile Money',
            'affiliate.bankDetails.tab.mobileMoney.subtitle',
            'Via Sendwave/WorldRemit — Orange, Wave, MTN...'
          )}
          {renderTabButton(
            'other_payment',
            <Wallet className={`w-5 h-5 ${activeTab === 'other_payment' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />,
            'affiliate.bankDetails.tab.otherPayment',
            'Autre m\u00E9thode',
            'affiliate.bankDetails.tab.otherPayment.subtitle',
            'PayPal, Western Union...'
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className={`${UI.card} p-6`}>
              {/* Current status */}
              {affiliateData?.hasBankDetails && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">
                        <FormattedMessage id="affiliate.bankDetails.existing" defaultMessage="Coordonn\u00E9es enregistr\u00E9es" />
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        <FormattedMessage
                          id="affiliate.bankDetails.existingAccount"
                          defaultMessage="Compte : {account}"
                          values={{ account: affiliateData.maskedBankAccount || "****" }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* BANK TRANSFER FORM */}
              {/* ============================================================ */}
              {activeTab === 'bank_transfer' && (
                <>
                  {/* Account Type Selector */}
                  <div className="mb-6">
                    <label className={UI.label}>
                      <FormattedMessage id="affiliate.bankDetails.accountType" defaultMessage="Type de compte" />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {bankAccountTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleChange("accountType", type.value)}
                          className={`px-4 py-3 text-sm rounded-xl border transition-all ${
                            formData.accountType === type.value
                              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                        >
                          <FormattedMessage id={type.labelId} defaultMessage={type.value} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Holder Name */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <User className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.accountHolderName" defaultMessage="Nom du titulaire" />
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => handleChange("accountHolderName", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.accountHolderName.placeholder",
                        defaultMessage: "Jean Dupont",
                      })}
                      className={`${UI.input} ${errors.accountHolderName ? "border-red-500" : ""}`}
                    />
                    {errors.accountHolderName && <p className={UI.error}>{errors.accountHolderName}</p>}
                  </div>

                  {/* Account Number / IBAN */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <CreditCard className="w-4 h-4 inline mr-1.5" />
                      {formData.accountType === "iban" ? (
                        <FormattedMessage id="affiliate.bankDetails.iban" defaultMessage="IBAN" />
                      ) : (
                        <FormattedMessage id="affiliate.bankDetails.accountNumber" defaultMessage="Num\u00E9ro de compte" />
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange("accountNumber", e.target.value.toUpperCase())}
                      placeholder={
                        formData.accountType === "iban"
                          ? "FR76 1234 5678 9012 3456 7890 123"
                          : "12345678"
                      }
                      className={`${UI.input} font-mono ${errors.accountNumber ? "border-red-500" : ""}`}
                    />
                    {errors.accountNumber && <p className={UI.error}>{errors.accountNumber}</p>}
                  </div>

                  {/* UK Sort Code */}
                  {formData.accountType === "uk_sort_code" && (
                    <div className="mb-4">
                      <label className={UI.label}>
                        <FormattedMessage id="affiliate.bankDetails.sortCode" defaultMessage="Sort Code" />
                      </label>
                      <input
                        type="text"
                        value={formData.sortCode || ""}
                        onChange={(e) => handleChange("sortCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className={`${UI.input} font-mono`}
                      />
                    </div>
                  )}

                  {/* US Routing Number */}
                  {formData.accountType === "us_aba" && (
                    <div className="mb-4">
                      <label className={UI.label}>
                        <FormattedMessage id="affiliate.bankDetails.routingNumber" defaultMessage="Routing Number (ABA)" />
                      </label>
                      <input
                        type="text"
                        value={formData.routingNumber || ""}
                        onChange={(e) => handleChange("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                        placeholder="123456789"
                        maxLength={9}
                        className={`${UI.input} font-mono`}
                      />
                    </div>
                  )}

                  {/* BSB Number (Australia) */}
                  {formData.accountType === "other" && userCountry === "AU" && (
                    <div className="mb-4">
                      <label className={UI.label}>
                        <FormattedMessage id="affiliate.bankDetails.bsbNumber" defaultMessage="BSB Number" />
                      </label>
                      <input
                        type="text"
                        value={formData.bsbNumber || ""}
                        onChange={(e) => handleChange("bsbNumber", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className={`${UI.input} font-mono`}
                      />
                    </div>
                  )}

                  {/* IFSC Code (India) */}
                  {formData.accountType === "other" && userCountry === "IN" && (
                    <div className="mb-4">
                      <label className={UI.label}>
                        <FormattedMessage id="affiliate.bankDetails.ifscCode" defaultMessage="IFSC Code" />
                      </label>
                      <input
                        type="text"
                        value={formData.ifscCode || ""}
                        onChange={(e) => handleChange("ifscCode", e.target.value.toUpperCase().slice(0, 11))}
                        placeholder="SBIN0001234"
                        maxLength={11}
                        className={`${UI.input} font-mono`}
                      />
                    </div>
                  )}

                  {/* BIC/SWIFT */}
                  {(formData.accountType === "iban" || formData.accountType === "other") && (
                    <div className="mb-4">
                      <label className={UI.label}>
                        <FormattedMessage
                          id="affiliate.bankDetails.bic"
                          defaultMessage={formData.accountType === "iban" ? "BIC / SWIFT (optionnel)" : "SWIFT / BIC"}
                        />
                      </label>
                      <input
                        type="text"
                        value={formData.swiftBic || ""}
                        onChange={(e) => handleChange("swiftBic", e.target.value.toUpperCase())}
                        placeholder="BNPAFRPP"
                        className={`${UI.input} font-mono ${errors.swiftBic ? "border-red-500" : ""}`}
                      />
                      {errors.swiftBic && <p className={UI.error}>{errors.swiftBic}</p>}
                    </div>
                  )}

                  {/* Bank Name */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <Building2 className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.bankName" defaultMessage="Nom de la banque" />
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.bankName.placeholder",
                        defaultMessage: "BNP Paribas",
                      })}
                      className={`${UI.input} ${errors.bankName ? "border-red-500" : ""}`}
                    />
                    {errors.bankName && <p className={UI.error}>{errors.bankName}</p>}
                  </div>

                  {/* Country & Currency */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={UI.label}>
                        <MapPin className="w-4 h-4 inline mr-1.5" />
                        <FormattedMessage id="affiliate.bankDetails.country" defaultMessage="Pays" />
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange("country", e.target.value)}
                        placeholder="France"
                        className={`${UI.input} ${errors.country ? "border-red-500" : ""}`}
                      />
                      {errors.country && <p className={UI.error}>{errors.country}</p>}
                    </div>
                    <div>
                      <label className={UI.label}>
                        <Globe className="w-4 h-4 inline mr-1.5" />
                        <FormattedMessage id="affiliate.bankDetails.currency" defaultMessage="Devise" />
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => handleChange("currency", e.target.value)}
                        className={UI.input}
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ============================================================ */}
              {/* MOBILE MONEY FORM */}
              {/* ============================================================ */}
              {activeTab === 'mobile_money' && (
                <>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <FormattedMessage
                        id="affiliate.bankDetails.mobileMoney.info"
                        defaultMessage="Votre paiement sera envoyé via Sendwave, WorldRemit ou LemFi directement sur votre portefeuille Mobile Money. Traitement sous 24-48h ouvrables."
                      />
                    </p>
                  </div>
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <FormattedMessage
                        id="affiliate.bankDetails.mobileMoney.tip"
                        defaultMessage="💡 Si vous avez aussi un compte bancaire (RIB/IBAN), choisissez plutôt « Virement bancaire » pour un traitement plus rapide via Wise."
                      />
                    </p>
                  </div>

                  {/* Account Holder Name */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <User className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.accountHolderName" defaultMessage="Nom du titulaire" />
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => handleChange("accountHolderName", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.accountHolderName.placeholder",
                        defaultMessage: "Jean Dupont",
                      })}
                      className={`${UI.input} ${errors.accountHolderName ? "border-red-500" : ""}`}
                    />
                    {errors.accountHolderName && <p className={UI.error}>{errors.accountHolderName}</p>}
                  </div>

                  {/* Mobile Money Operator */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <Smartphone className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.mobileMoney.operator" defaultMessage="Op\u00E9rateur" />
                    </label>
                    <select
                      value={formData.mobileMoneyOperator || ""}
                      onChange={(e) => handleChange("mobileMoneyOperator", e.target.value)}
                      className={`${UI.input} ${errors.mobileMoneyOperator ? "border-red-500" : ""}`}
                    >
                      <option value="">
                        {intl.formatMessage({ id: "affiliate.bankDetails.mobileMoney.selectOperator", defaultMessage: "-- Choisir un op\u00E9rateur --" })}
                      </option>
                      {MOBILE_MONEY_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {errors.mobileMoneyOperator && <p className={UI.error}>{errors.mobileMoneyOperator}</p>}
                  </div>

                  {/* Phone Number */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <FormattedMessage id="affiliate.bankDetails.mobileMoney.phone" defaultMessage="Num\u00E9ro de t\u00E9l\u00E9phone (avec indicatif pays)" />
                    </label>
                    <input
                      type="tel"
                      value={formData.mobileMoneyPhone || ""}
                      onChange={(e) => handleChange("mobileMoneyPhone", e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className={`${UI.input} font-mono ${errors.mobileMoneyPhone ? "border-red-500" : ""}`}
                    />
                    {errors.mobileMoneyPhone && <p className={UI.error}>{errors.mobileMoneyPhone}</p>}
                  </div>

                  {/* Currency for Mobile Money */}
                  <div className="mb-6">
                    <label className={UI.label}>
                      <Globe className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.currency" defaultMessage="Devise" />
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={UI.input}
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ============================================================ */}
              {/* OTHER PAYMENT METHOD FORM */}
              {/* ============================================================ */}
              {activeTab === 'other_payment' && (
                <>
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <FormattedMessage
                        id="affiliate.bankDetails.otherPayment.info"
                        defaultMessage="Notre \u00E9quipe vous contactera pour organiser le transfert. Les paiements sont trait\u00E9s manuellement sous 24-48h ouvrables."
                      />
                    </p>
                  </div>

                  {/* Account Holder Name */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <User className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.accountHolderName" defaultMessage="Nom du titulaire" />
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => handleChange("accountHolderName", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.accountHolderName.placeholder",
                        defaultMessage: "Jean Dupont",
                      })}
                      className={`${UI.input} ${errors.accountHolderName ? "border-red-500" : ""}`}
                    />
                    {errors.accountHolderName && <p className={UI.error}>{errors.accountHolderName}</p>}
                  </div>

                  {/* Payment Type */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <Wallet className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.otherPayment.type" defaultMessage="Type de paiement" />
                    </label>
                    <select
                      value={formData.otherPaymentType || ""}
                      onChange={(e) => handleChange("otherPaymentType", e.target.value)}
                      className={`${UI.input} ${errors.otherPaymentType ? "border-red-500" : ""}`}
                    >
                      <option value="">
                        {intl.formatMessage({ id: "affiliate.bankDetails.otherPayment.selectType", defaultMessage: "-- Choisir un type --" })}
                      </option>
                      {OTHER_PAYMENT_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>
                    {errors.otherPaymentType && <p className={UI.error}>{errors.otherPaymentType}</p>}
                  </div>

                  {/* Email / Instructions */}
                  <div className="mb-4">
                    <label className={UI.label}>
                      <FormattedMessage
                        id="affiliate.bankDetails.otherPayment.emailOrInstructions"
                        defaultMessage="Email ou instructions de paiement"
                      />
                    </label>
                    <textarea
                      value={formData.otherPaymentEmail || ""}
                      onChange={(e) => handleChange("otherPaymentEmail", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.otherPayment.emailPlaceholder",
                        defaultMessage: "ex: moncompte@paypal.com ou instructions sp\u00E9cifiques",
                      })}
                      rows={3}
                      className={`${UI.input} ${errors.otherPaymentEmail ? "border-red-500" : ""}`}
                    />
                    {errors.otherPaymentEmail && <p className={UI.error}>{errors.otherPaymentEmail}</p>}
                  </div>

                  {/* Additional Instructions */}
                  <div className="mb-6">
                    <label className={UI.label}>
                      <FormattedMessage
                        id="affiliate.bankDetails.otherPayment.additionalInstructions"
                        defaultMessage="Instructions suppl\u00E9mentaires (optionnel)"
                      />
                    </label>
                    <textarea
                      value={formData.otherPaymentInstructions || ""}
                      onChange={(e) => handleChange("otherPaymentInstructions", e.target.value)}
                      placeholder={intl.formatMessage({
                        id: "affiliate.bankDetails.otherPayment.instructionsPlaceholder",
                        defaultMessage: "Toute information utile pour le transfert...",
                      })}
                      rows={2}
                      className={UI.input}
                    />
                  </div>

                  {/* Currency */}
                  <div className="mb-6">
                    <label className={UI.label}>
                      <Globe className="w-4 h-4 inline mr-1.5" />
                      <FormattedMessage id="affiliate.bankDetails.currency" defaultMessage="Devise pr\u00E9f\u00E9r\u00E9e" />
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={UI.input}
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <FormattedMessage id="affiliate.bankDetails.saving" defaultMessage="Enregistrement..." />
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="affiliate.bankDetails.save" defaultMessage="Enregistrer les coordonn\u00E9es" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column - Security Info */}
          <div className="space-y-6">
            {/* Security Card */}
            <div className={`${UI.card} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="affiliate.bankDetails.security.title" defaultMessage="S\u00E9curit\u00E9" />
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.encrypted"
                    defaultMessage="Donn\u00E9es chiffr\u00E9es avec AES-256"
                  />
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.pci"
                    defaultMessage="Conforme aux normes PCI-DSS"
                  />
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.manual"
                    defaultMessage="Retraits v\u00E9rifi\u00E9s manuellement par notre \u00E9quipe"
                  />
                </p>
              </div>
            </div>

            {/* Supported Methods Info */}
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="affiliate.bankDetails.supported.title" defaultMessage="Comment vous serez payé" />
              </h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="affiliate.bankDetails.supported.bankTransfer" defaultMessage="Virement bancaire" />
                    </p>
                    <p className="text-xs">Via Wise — Europe, USA, UK, Australie, Inde, Nigeria, Ghana, Kenya, Afrique du Sud...</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Frais les plus bas</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Mobile Money</p>
                    <p className="text-xs">Via Sendwave / LemFi — Sénégal, Côte d'Ivoire, Cameroun, Mali, Burkina, Togo, Bénin...</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Frais faibles, reçu en minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="affiliate.bankDetails.supported.other" defaultMessage="Autres" />
                    </p>
                    <p className="text-xs">PayPal, Western Union — tous les autres pays</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="affiliate.bankDetails.supported.countries"
                    defaultMessage="190+ pays supportés. Tous les paiements sont vérifiés et traités manuellement par notre équipe."
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateBankDetails;
