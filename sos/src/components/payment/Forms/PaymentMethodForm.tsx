/**
 * PaymentMethodForm Component
 *
 * A reusable form component for configuring payment methods.
 * Supports both bank transfers (via Wise) and mobile money (via Flutterwave).
 *
 * Used by: Chatter, Influencer, and Blogger systems
 *
 * @author Agent #14 (Dev-FE-PaymentForm)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Globe, Building2, Smartphone, ChevronRight, Check, AlertCircle,
  Loader2, ChevronDown, Search, Phone, User, CreditCard, Wallet,
  ArrowLeft, CheckCircle2, Edit3
} from 'lucide-react';
import {
  PaymentDetails, BankTransferDetails, MobileMoneyDetails,
  MobileMoneyProvider, CountryPaymentInfo
} from '@/types/payment';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PaymentMethodFormProps {
  onSubmit: (details: PaymentDetails) => Promise<void>;
  initialCountry?: string;
  initialDetails?: PaymentDetails;
  loading?: boolean;
  error?: string | null;
  isEditMode?: boolean;
}

interface CountryOption {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  currency: string;
  provider: 'wise' | 'flutterwave';
  methodType: 'bank_transfer' | 'mobile_money';
  mobileProviders?: MobileMoneyProvider[];
  bankFields?: BankFieldType[];
}

type BankFieldType = 'iban' | 'accountNumber' | 'routingNumber' | 'sortCode' | 'bsb' | 'ifsc';

interface MobileProviderOption {
  id: MobileMoneyProvider;
  name: string;
  displayName: string;
  countries: string[];
  color: string;
}

type FormStep = 'country' | 'details' | 'confirm';

// ============================================================================
// CONSTANTS
// ============================================================================

// Wise-supported countries (Bank Transfer)
const WISE_COUNTRIES: CountryOption[] = [
  // Europe
  { code: 'FR', name: 'France', nameEn: 'France', flag: '🇫🇷', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'DE', name: 'Allemagne', nameEn: 'Germany', flag: '🇩🇪', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'BE', name: 'Belgique', nameEn: 'Belgium', flag: '🇧🇪', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'ES', name: 'Espagne', nameEn: 'Spain', flag: '🇪🇸', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'IT', name: 'Italie', nameEn: 'Italy', flag: '🇮🇹', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'NL', name: 'Pays-Bas', nameEn: 'Netherlands', flag: '🇳🇱', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'PT', name: 'Portugal', nameEn: 'Portugal', flag: '🇵🇹', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'AT', name: 'Autriche', nameEn: 'Austria', flag: '🇦🇹', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'IE', name: 'Irlande', nameEn: 'Ireland', flag: '🇮🇪', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'FI', name: 'Finlande', nameEn: 'Finland', flag: '🇫🇮', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'GR', name: 'Grece', nameEn: 'Greece', flag: '🇬🇷', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'LU', name: 'Luxembourg', nameEn: 'Luxembourg', flag: '🇱🇺', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'SK', name: 'Slovaquie', nameEn: 'Slovakia', flag: '🇸🇰', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'SI', name: 'Slovenie', nameEn: 'Slovenia', flag: '🇸🇮', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'EE', name: 'Estonie', nameEn: 'Estonia', flag: '🇪🇪', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'LV', name: 'Lettonie', nameEn: 'Latvia', flag: '🇱🇻', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'LT', name: 'Lituanie', nameEn: 'Lithuania', flag: '🇱🇹', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'MT', name: 'Malte', nameEn: 'Malta', flag: '🇲🇹', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'CY', name: 'Chypre', nameEn: 'Cyprus', flag: '🇨🇾', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'CH', name: 'Suisse', nameEn: 'Switzerland', flag: '🇨🇭', currency: 'CHF', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'PL', name: 'Pologne', nameEn: 'Poland', flag: '🇵🇱', currency: 'PLN', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'CZ', name: 'Tchequie', nameEn: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'HU', name: 'Hongrie', nameEn: 'Hungary', flag: '🇭🇺', currency: 'HUF', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'RO', name: 'Roumanie', nameEn: 'Romania', flag: '🇷🇴', currency: 'RON', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'BG', name: 'Bulgarie', nameEn: 'Bulgaria', flag: '🇧🇬', currency: 'BGN', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'HR', name: 'Croatie', nameEn: 'Croatia', flag: '🇭🇷', currency: 'EUR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'DK', name: 'Danemark', nameEn: 'Denmark', flag: '🇩🇰', currency: 'DKK', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'SE', name: 'Suede', nameEn: 'Sweden', flag: '🇸🇪', currency: 'SEK', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'NO', name: 'Norvege', nameEn: 'Norway', flag: '🇳🇴', currency: 'NOK', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  // UK
  { code: 'GB', name: 'Royaume-Uni', nameEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber', 'sortCode'] },
  // Americas
  { code: 'US', name: 'Etats-Unis', nameEn: 'United States', flag: '🇺🇸', currency: 'USD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber', 'routingNumber'] },
  { code: 'CA', name: 'Canada', nameEn: 'Canada', flag: '🇨🇦', currency: 'CAD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber', 'routingNumber'] },
  { code: 'MX', name: 'Mexique', nameEn: 'Mexico', flag: '🇲🇽', currency: 'MXN', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'BR', name: 'Bresil', nameEn: 'Brazil', flag: '🇧🇷', currency: 'BRL', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  // Asia Pacific
  { code: 'AU', name: 'Australie', nameEn: 'Australia', flag: '🇦🇺', currency: 'AUD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber', 'bsb'] },
  { code: 'NZ', name: 'Nouvelle-Zelande', nameEn: 'New Zealand', flag: '🇳🇿', currency: 'NZD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'JP', name: 'Japon', nameEn: 'Japan', flag: '🇯🇵', currency: 'JPY', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'SG', name: 'Singapour', nameEn: 'Singapore', flag: '🇸🇬', currency: 'SGD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'HK', name: 'Hong Kong', nameEn: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'IN', name: 'Inde', nameEn: 'India', flag: '🇮🇳', currency: 'INR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber', 'ifsc'] },
  { code: 'MY', name: 'Malaisie', nameEn: 'Malaysia', flag: '🇲🇾', currency: 'MYR', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  { code: 'TH', name: 'Thailande', nameEn: 'Thailand', flag: '🇹🇭', currency: 'THB', provider: 'wise', methodType: 'bank_transfer', bankFields: ['accountNumber'] },
  // Middle East
  { code: 'AE', name: 'Emirats Arabes Unis', nameEn: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
  { code: 'IL', name: 'Israel', nameEn: 'Israel', flag: '🇮🇱', currency: 'ILS', provider: 'wise', methodType: 'bank_transfer', bankFields: ['iban'] },
];

// Flutterwave-supported African countries (Mobile Money)
const FLUTTERWAVE_COUNTRIES: CountryOption[] = [
  { code: 'SN', name: 'Senegal', nameEn: 'Senegal', flag: '🇸🇳', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'wave', 'free_money'] },
  { code: 'CI', name: 'Cote d\'Ivoire', nameEn: 'Ivory Coast', flag: '🇨🇮', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'wave', 'mtn_momo', 'moov_money'] },
  { code: 'ML', name: 'Mali', nameEn: 'Mali', flag: '🇲🇱', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'moov_money'] },
  { code: 'BF', name: 'Burkina Faso', nameEn: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'moov_money'] },
  { code: 'NE', name: 'Niger', nameEn: 'Niger', flag: '🇳🇪', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'airtel_money', 'moov_money'] },
  { code: 'TG', name: 'Togo', nameEn: 'Togo', flag: '🇹🇬', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['t_money', 'flooz', 'moov_money'] },
  { code: 'BJ', name: 'Benin', nameEn: 'Benin', flag: '🇧🇯', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mtn_momo', 'moov_money'] },
  { code: 'GW', name: 'Guinee-Bissau', nameEn: 'Guinea-Bissau', flag: '🇬🇼', currency: 'XOF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money'] },
  { code: 'CM', name: 'Cameroun', nameEn: 'Cameroon', flag: '🇨🇲', currency: 'XAF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'mtn_momo'] },
  { code: 'GA', name: 'Gabon', nameEn: 'Gabon', flag: '🇬🇦', currency: 'XAF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['airtel_money', 'moov_money'] },
  { code: 'CG', name: 'Congo', nameEn: 'Congo', flag: '🇨🇬', currency: 'XAF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['airtel_money', 'mtn_momo'] },
  { code: 'CD', name: 'RD Congo', nameEn: 'DR Congo', flag: '🇨🇩', currency: 'CDF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'airtel_money', 'mpesa'] },
  { code: 'GN', name: 'Guinee', nameEn: 'Guinea', flag: '🇬🇳', currency: 'GNF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'mtn_momo'] },
  { code: 'MR', name: 'Mauritanie', nameEn: 'Mauritania', flag: '🇲🇷', currency: 'MRU', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['moov_money'] },
  { code: 'TD', name: 'Tchad', nameEn: 'Chad', flag: '🇹🇩', currency: 'XAF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['airtel_money', 'moov_money'] },
  { code: 'CF', name: 'Centrafrique', nameEn: 'Central African Republic', flag: '🇨🇫', currency: 'XAF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money'] },
  { code: 'GH', name: 'Ghana', nameEn: 'Ghana', flag: '🇬🇭', currency: 'GHS', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mtn_momo', 'airtel_money', 'vodafone'] as MobileMoneyProvider[] },
  { code: 'NG', name: 'Nigeria', nameEn: 'Nigeria', flag: '🇳🇬', currency: 'NGN', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mtn_momo', 'airtel_money'] },
  { code: 'KE', name: 'Kenya', nameEn: 'Kenya', flag: '🇰🇪', currency: 'KES', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mpesa', 'airtel_money'] },
  { code: 'TZ', name: 'Tanzanie', nameEn: 'Tanzania', flag: '🇹🇿', currency: 'TZS', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mpesa', 'airtel_money'] },
  { code: 'UG', name: 'Ouganda', nameEn: 'Uganda', flag: '🇺🇬', currency: 'UGX', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mtn_momo', 'airtel_money'] },
  { code: 'RW', name: 'Rwanda', nameEn: 'Rwanda', flag: '🇷🇼', currency: 'RWF', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mtn_momo', 'airtel_money'] },
  { code: 'ZA', name: 'Afrique du Sud', nameEn: 'South Africa', flag: '🇿🇦', currency: 'ZAR', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['vodacom'] as MobileMoneyProvider[] },
  { code: 'MA', name: 'Maroc', nameEn: 'Morocco', flag: '🇲🇦', currency: 'MAD', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money'] },
  { code: 'TN', name: 'Tunisie', nameEn: 'Tunisia', flag: '🇹🇳', currency: 'TND', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money'] },
  { code: 'DZ', name: 'Algerie', nameEn: 'Algeria', flag: '🇩🇿', currency: 'DZD', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['mobilis'] as MobileMoneyProvider[] },
  { code: 'MG', name: 'Madagascar', nameEn: 'Madagascar', flag: '🇲🇬', currency: 'MGA', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money', 'airtel_money'] },
  { code: 'MU', name: 'Maurice', nameEn: 'Mauritius', flag: '🇲🇺', currency: 'MUR', provider: 'flutterwave', methodType: 'mobile_money', mobileProviders: ['orange_money'] },
];

// All countries combined
const ALL_COUNTRIES: CountryOption[] = [...WISE_COUNTRIES, ...FLUTTERWAVE_COUNTRIES];

// Mobile Money providers info
const MOBILE_PROVIDERS: MobileProviderOption[] = [
  { id: 'orange_money', name: 'Orange Money', displayName: 'Orange Money', countries: ['SN', 'CI', 'ML', 'BF', 'NE', 'CM', 'GN', 'CD', 'MG', 'MA', 'TN', 'MU', 'GW', 'CF'], color: '#FF6600' },
  { id: 'wave', name: 'Wave', displayName: 'Wave', countries: ['SN', 'CI'], color: '#00D4FF' },
  { id: 'mtn_momo', name: 'MTN MoMo', displayName: 'MTN Mobile Money', countries: ['CI', 'BJ', 'CM', 'GH', 'NG', 'UG', 'RW', 'GN', 'CG'], color: '#FFCC00' },
  { id: 'moov_money', name: 'Moov Money', displayName: 'Moov Money', countries: ['CI', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GA', 'TD', 'MR'], color: '#0066CC' },
  { id: 'airtel_money', name: 'Airtel Money', displayName: 'Airtel Money', countries: ['NE', 'GA', 'CG', 'CD', 'GH', 'NG', 'KE', 'TZ', 'UG', 'RW', 'TD', 'MG'], color: '#FF0000' },
  { id: 'mpesa', name: 'M-Pesa', displayName: 'M-Pesa', countries: ['CD', 'KE', 'TZ'], color: '#00A650' },
  { id: 'free_money', name: 'Free Money', displayName: 'Free Money', countries: ['SN'], color: '#FF3366' },
  { id: 't_money', name: 'T-Money', displayName: 'T-Money (Togocel)', countries: ['TG'], color: '#339933' },
  { id: 'flooz', name: 'Flooz', displayName: 'Flooz (Moov)', countries: ['TG'], color: '#FF6699' },
];

// Phone country codes
const PHONE_COUNTRY_CODES: Record<string, string> = {
  'SN': '+221', 'CI': '+225', 'ML': '+223', 'BF': '+226', 'NE': '+227',
  'TG': '+228', 'BJ': '+229', 'CM': '+237', 'GA': '+241', 'CG': '+242',
  'CD': '+243', 'GN': '+224', 'MR': '+222', 'TD': '+235', 'CF': '+236',
  'GH': '+233', 'NG': '+234', 'KE': '+254', 'TZ': '+255', 'UG': '+256',
  'RW': '+250', 'ZA': '+27', 'MA': '+212', 'TN': '+216', 'DZ': '+213',
  'MG': '+261', 'MU': '+230', 'GW': '+245',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const formatIBAN = (value: string): string => {
  // Remove all non-alphanumeric characters
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Add spaces every 4 characters
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

const validateIBAN = (iban: string): boolean => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  // Basic country code check
  const countryCode = cleaned.substring(0, 2);
  return /^[A-Z]{2}/.test(countryCode);
};

const formatPhoneNumber = (value: string, countryCode: string): string => {
  // Remove all non-numeric characters except +
  const cleaned = value.replace(/[^\d+]/g, '');
  const prefix = PHONE_COUNTRY_CODES[countryCode] || '';

  // If starts with prefix, format nicely
  if (cleaned.startsWith(prefix.replace('+', ''))) {
    const numberPart = cleaned.substring(prefix.length - 1);
    return prefix + ' ' + numberPart.replace(/(\d{2})/g, '$1 ').trim();
  }

  // If starts with +, keep as is
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/(\+\d{3})(\d{2})/g, '$1 $2 ').replace(/(\d{2})/g, '$1 ').trim();
  }

  // Otherwise, add prefix
  return prefix + ' ' + cleaned.replace(/(\d{2})/g, '$1 ').trim();
};

const validatePhoneNumber = (phone: string, countryCode: string): boolean => {
  const cleaned = phone.replace(/\s/g, '');
  const prefix = PHONE_COUNTRY_CODES[countryCode];
  if (!prefix) return cleaned.length >= 8;

  // Check if starts with correct prefix and has valid length
  const cleanedPrefix = prefix.replace('+', '');
  const phoneWithoutPrefix = cleaned.startsWith('+')
    ? cleaned.substring(cleanedPrefix.length + 1)
    : cleaned.startsWith(cleanedPrefix)
      ? cleaned.substring(cleanedPrefix.length)
      : cleaned;

  return phoneWithoutPrefix.length >= 8 && phoneWithoutPrefix.length <= 12;
};

// ============================================================================
// COMPONENT
// ============================================================================

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  onSubmit,
  initialCountry,
  initialDetails,
  loading = false,
  error,
  isEditMode = false,
}) => {
  const intl = useIntl();

  // Form state
  const [step, setStep] = useState<FormStep>(initialCountry ? 'details' : 'country');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(
    initialCountry ? ALL_COUNTRIES.find(c => c.code === initialCountry) || null : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Bank transfer fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [bsb, setBsb] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [currency, setCurrency] = useState('');

  // Mobile money fields
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Initialize from existing details
  useEffect(() => {
    if (initialDetails) {
      if (initialDetails.type === 'bank_transfer') {
        setAccountHolderName(initialDetails.accountHolderName || '');
        setIban(initialDetails.iban || '');
        setAccountNumber(initialDetails.accountNumber || '');
        setRoutingNumber(initialDetails.routingNumber || '');
        setSortCode(initialDetails.sortCode || '');
        setBsb(initialDetails.bsb || '');
        setIfsc(initialDetails.ifsc || '');
        setSwiftBic(initialDetails.swiftBic || '');
        setBankName(initialDetails.bankName || '');
        setCurrency(initialDetails.currency || '');
      } else if (initialDetails.type === 'mobile_money') {
        setSelectedProvider(initialDetails.provider);
        setPhoneNumber(initialDetails.phoneNumber || '');
        setAccountName(initialDetails.accountName || '');
        setCurrency(initialDetails.currency || '');
      }
    }
  }, [initialDetails]);

  // Set currency when country changes
  useEffect(() => {
    if (selectedCountry && !currency) {
      setCurrency(selectedCountry.currency);
    }
  }, [selectedCountry, currency]);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return ALL_COUNTRIES;
    const query = searchQuery.toLowerCase();
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(query) ||
           c.nameEn.toLowerCase().includes(query) ||
           c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Available mobile providers for selected country
  const availableProviders = useMemo(() => {
    if (!selectedCountry?.mobileProviders) return [];
    return MOBILE_PROVIDERS.filter(p =>
      selectedCountry.mobileProviders?.includes(p.id)
    );
  }, [selectedCountry]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (selectedCountry?.methodType === 'bank_transfer') {
      if (!accountHolderName.trim()) {
        errors.accountHolderName = intl.formatMessage({
          id: 'payment.form.error.holderRequired',
          defaultMessage: 'Le nom du titulaire est requis'
        });
      }

      if (selectedCountry.bankFields?.includes('iban')) {
        if (!iban.trim()) {
          errors.iban = intl.formatMessage({
            id: 'payment.form.error.ibanRequired',
            defaultMessage: 'L\'IBAN est requis'
          });
        } else if (!validateIBAN(iban)) {
          errors.iban = intl.formatMessage({
            id: 'payment.form.error.ibanInvalid',
            defaultMessage: 'L\'IBAN n\'est pas valide'
          });
        }
      }

      if (selectedCountry.bankFields?.includes('accountNumber') && !accountNumber.trim()) {
        errors.accountNumber = intl.formatMessage({
          id: 'payment.form.error.accountRequired',
          defaultMessage: 'Le numero de compte est requis'
        });
      }

      if (selectedCountry.bankFields?.includes('routingNumber') && !routingNumber.trim()) {
        errors.routingNumber = intl.formatMessage({
          id: 'payment.form.error.routingRequired',
          defaultMessage: 'Le numero de routage est requis'
        });
      }

      if (selectedCountry.bankFields?.includes('sortCode') && !sortCode.trim()) {
        errors.sortCode = intl.formatMessage({
          id: 'payment.form.error.sortCodeRequired',
          defaultMessage: 'Le sort code est requis'
        });
      }

      if (selectedCountry.bankFields?.includes('bsb') && !bsb.trim()) {
        errors.bsb = intl.formatMessage({
          id: 'payment.form.error.bsbRequired',
          defaultMessage: 'Le BSB est requis'
        });
      }

      if (selectedCountry.bankFields?.includes('ifsc') && !ifsc.trim()) {
        errors.ifsc = intl.formatMessage({
          id: 'payment.form.error.ifscRequired',
          defaultMessage: 'Le code IFSC est requis'
        });
      }
    } else if (selectedCountry?.methodType === 'mobile_money') {
      if (!selectedProvider) {
        errors.provider = intl.formatMessage({
          id: 'payment.form.error.providerRequired',
          defaultMessage: 'Veuillez selectionner un operateur'
        });
      }

      if (!phoneNumber.trim()) {
        errors.phoneNumber = intl.formatMessage({
          id: 'payment.form.error.phoneRequired',
          defaultMessage: 'Le numero de telephone est requis'
        });
      } else if (!validatePhoneNumber(phoneNumber, selectedCountry.code)) {
        errors.phoneNumber = intl.formatMessage({
          id: 'payment.form.error.phoneInvalid',
          defaultMessage: 'Le numero de telephone n\'est pas valide'
        });
      }

      if (!accountName.trim()) {
        errors.accountName = intl.formatMessage({
          id: 'payment.form.error.accountNameRequired',
          defaultMessage: 'Le nom du compte est requis'
        });
      }
    }

    return errors;
  }, [
    selectedCountry, accountHolderName, iban, accountNumber, routingNumber,
    sortCode, bsb, ifsc, selectedProvider, phoneNumber, accountName, intl
  ]);

  const isFormValid = Object.keys(validationErrors).length === 0;

  // Handlers
  const handleCountrySelect = useCallback((country: CountryOption) => {
    setSelectedCountry(country);
    setCurrency(country.currency);
    setSelectedProvider(null);
    setStep('details');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'details') {
      setStep('country');
    } else if (step === 'confirm') {
      setStep('details');
    }
  }, [step]);

  const handleFieldBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched
    const allFields = ['accountHolderName', 'iban', 'accountNumber', 'routingNumber',
      'sortCode', 'bsb', 'ifsc', 'provider', 'phoneNumber', 'accountName'];
    setTouched(Object.fromEntries(allFields.map(f => [f, true])));

    if (!isFormValid || !selectedCountry) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      let details: PaymentDetails;

      if (selectedCountry.methodType === 'bank_transfer') {
        details = {
          type: 'bank_transfer',
          accountHolderName: accountHolderName.trim(),
          country: selectedCountry.code,
          currency: currency || selectedCountry.currency,
          ...(iban && { iban: iban.replace(/\s/g, '') }),
          ...(accountNumber && { accountNumber: accountNumber.trim() }),
          ...(routingNumber && { routingNumber: routingNumber.trim() }),
          ...(sortCode && { sortCode: sortCode.trim() }),
          ...(bsb && { bsb: bsb.trim() }),
          ...(ifsc && { ifsc: ifsc.trim() }),
          ...(swiftBic && { swiftBic: swiftBic.trim() }),
          ...(bankName && { bankName: bankName.trim() }),
        };
      } else {
        details = {
          type: 'mobile_money',
          provider: selectedProvider!,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
          country: selectedCountry.code,
          accountName: accountName.trim(),
          currency: currency || selectedCountry.currency,
        };
      }

      await onSubmit(details);
      setSubmitSuccess(true);
      setStep('confirm');
    } catch (err) {
      // Error is handled by parent component via error prop
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid, selectedCountry, accountHolderName, currency, iban,
    accountNumber, routingNumber, sortCode, bsb, ifsc, swiftBic,
    bankName, selectedProvider, phoneNumber, accountName, onSubmit
  ]);

  // Render helpers
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {['country', 'details', 'confirm'].map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              transition-all duration-300
              ${step === s
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                : i < ['country', 'details', 'confirm'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {i < ['country', 'details', 'confirm'].indexOf(step)
              ? <Check className="w-4 h-4" />
              : i + 1
            }
          </div>
          {i < 2 && (
            <div
              className={`
                w-12 h-1 rounded-full transition-all duration-300
                ${i < ['country', 'details', 'confirm'].indexOf(step)
                  ? 'bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderCountryStep = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-6">
        <Globe className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage
            id="payment.form.selectCountry"
            defaultMessage="Selectionnez votre pays"
          />
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          <FormattedMessage
            id="payment.form.selectCountryDesc"
            defaultMessage="Le mode de paiement sera determine automatiquement"
          />
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder={intl.formatMessage({
            id: 'payment.form.searchCountry',
            defaultMessage: 'Rechercher un pays...'
          })}
          className={`
            w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
            text-gray-900 dark:text-white placeholder-gray-400
            transition-all duration-200 outline-none
            ${isSearchFocused
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }
          `}
        />
      </div>

      {/* Country list */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredCountries.map((country) => (
          <button
            key={country.code}
            onClick={() => handleCountrySelect(country)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-xl border-2
              transition-all duration-200 text-left
              hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20
              ${selectedCountry?.code === country.code
                ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }
            `}
          >
            <span className="text-2xl">{country.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {country.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {country.currency} - {country.methodType === 'bank_transfer'
                  ? intl.formatMessage({ id: 'payment.form.bankTransfer', defaultMessage: 'Virement bancaire' })
                  : intl.formatMessage({ id: 'payment.form.mobileMoney', defaultMessage: 'Mobile Money' })
                }
              </p>
            </div>
            {country.methodType === 'bank_transfer'
              ? <Building2 className="w-5 h-5 text-gray-400" />
              : <Smartphone className="w-5 h-5 text-gray-400" />
            }
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}

        {filteredCountries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FormattedMessage
              id="payment.form.noCountryFound"
              defaultMessage="Aucun pays trouve"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderBankTransferForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <p className="font-medium text-blue-900 dark:text-blue-100">
            <FormattedMessage id="payment.form.bankTransfer" defaultMessage="Virement bancaire" />
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <FormattedMessage
              id="payment.form.viaWise"
              defaultMessage="Via Wise (TransferWise)"
            />
          </p>
        </div>
      </div>

      {/* Account Holder Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.accountHolder" defaultMessage="Nom du titulaire" />
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            onBlur={() => handleFieldBlur('accountHolderName')}
            placeholder={intl.formatMessage({
              id: 'payment.form.accountHolderPlaceholder',
              defaultMessage: 'Jean Dupont'
            })}
            className={`
              w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400
              transition-all duration-200 outline-none
              ${touched.accountHolderName && validationErrors.accountHolderName
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
        </div>
        {touched.accountHolderName && validationErrors.accountHolderName && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationErrors.accountHolderName}
          </p>
        )}
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.currency" defaultMessage="Devise" />
        </label>
        <div className="relative">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              transition-all duration-200 outline-none appearance-none cursor-pointer
              focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          >
            <option value={selectedCountry?.currency}>{selectedCountry?.currency}</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* IBAN (for European countries) */}
      {selectedCountry?.bankFields?.includes('iban') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            IBAN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(formatIBAN(e.target.value))}
              onBlur={() => handleFieldBlur('iban')}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              maxLength={42}
              className={`
                w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
                text-gray-900 dark:text-white placeholder-gray-400 font-mono
                transition-all duration-200 outline-none
                ${touched.iban && validationErrors.iban
                  ? 'border-red-500 ring-2 ring-red-500/20'
                  : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                }
              `}
            />
          </div>
          {touched.iban && validationErrors.iban && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.iban}
            </p>
          )}
        </div>
      )}

      {/* Account Number */}
      {selectedCountry?.bankFields?.includes('accountNumber') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FormattedMessage id="payment.form.accountNumber" defaultMessage="Numero de compte" />
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            onBlur={() => handleFieldBlur('accountNumber')}
            placeholder="12345678"
            className={`
              w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.accountNumber && validationErrors.accountNumber
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
          {touched.accountNumber && validationErrors.accountNumber && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.accountNumber}
            </p>
          )}
        </div>
      )}

      {/* Sort Code (UK) */}
      {selectedCountry?.bankFields?.includes('sortCode') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={sortCode}
            onChange={(e) => setSortCode(e.target.value.replace(/[^0-9-]/g, ''))}
            onBlur={() => handleFieldBlur('sortCode')}
            placeholder="12-34-56"
            maxLength={8}
            className={`
              w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.sortCode && validationErrors.sortCode
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
          {touched.sortCode && validationErrors.sortCode && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.sortCode}
            </p>
          )}
        </div>
      )}

      {/* Routing Number (US/CA) */}
      {selectedCountry?.bankFields?.includes('routingNumber') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FormattedMessage id="payment.form.routingNumber" defaultMessage="Numero de routage (ABA/ACH)" />
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => handleFieldBlur('routingNumber')}
            placeholder="021000021"
            maxLength={9}
            className={`
              w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.routingNumber && validationErrors.routingNumber
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
          {touched.routingNumber && validationErrors.routingNumber && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.routingNumber}
            </p>
          )}
        </div>
      )}

      {/* BSB (Australia) */}
      {selectedCountry?.bankFields?.includes('bsb') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            BSB <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bsb}
            onChange={(e) => setBsb(e.target.value.replace(/[^0-9-]/g, ''))}
            onBlur={() => handleFieldBlur('bsb')}
            placeholder="123-456"
            maxLength={7}
            className={`
              w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.bsb && validationErrors.bsb
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
          {touched.bsb && validationErrors.bsb && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.bsb}
            </p>
          )}
        </div>
      )}

      {/* IFSC (India) */}
      {selectedCountry?.bankFields?.includes('ifsc') && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            onBlur={() => handleFieldBlur('ifsc')}
            placeholder="SBIN0001234"
            maxLength={11}
            className={`
              w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.ifsc && validationErrors.ifsc
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              }
            `}
          />
          {touched.ifsc && validationErrors.ifsc && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.ifsc}
            </p>
          )}
        </div>
      )}

      {/* SWIFT/BIC (Optional) */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          SWIFT/BIC <span className="text-gray-400 text-xs">({intl.formatMessage({ id: 'payment.form.optional', defaultMessage: 'optionnel' })})</span>
        </label>
        <input
          type="text"
          value={swiftBic}
          onChange={(e) => setSwiftBic(e.target.value.toUpperCase())}
          placeholder="BNPAFRPP"
          maxLength={11}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 font-mono
            transition-all duration-200 outline-none
            focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
      </div>

      {/* Bank Name (Optional) */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.bankName" defaultMessage="Nom de la banque" />
          <span className="text-gray-400 text-xs ml-1">({intl.formatMessage({ id: 'payment.form.optional', defaultMessage: 'optionnel' })})</span>
        </label>
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder={intl.formatMessage({ id: 'payment.form.bankNamePlaceholder', defaultMessage: 'BNP Paribas' })}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
            transition-all duration-200 outline-none
            focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
      </div>
    </div>
  );

  const renderMobileMoneyForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
        <Smartphone className="w-6 h-6 text-green-600" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">
            Mobile Money
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            <FormattedMessage
              id="payment.form.viaFlutterwave"
              defaultMessage="Via Flutterwave"
            />
          </p>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.selectOperator" defaultMessage="Operateur" />
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProvider(provider.id)}
              className={`
                flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200
                ${selectedProvider === provider.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300'
                }
              `}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: provider.color }}
              >
                {provider.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {provider.displayName}
              </span>
              {selectedProvider === provider.id && (
                <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {touched.provider && validationErrors.provider && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationErrors.provider}
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.phoneNumber" defaultMessage="Numero de telephone" />
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value, selectedCountry?.code || ''))}
            onBlur={() => handleFieldBlur('phoneNumber')}
            placeholder={`${PHONE_COUNTRY_CODES[selectedCountry?.code || ''] || ''} 77 123 45 67`}
            className={`
              w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400 font-mono
              transition-all duration-200 outline-none
              ${touched.phoneNumber && validationErrors.phoneNumber
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
              }
            `}
          />
        </div>
        {touched.phoneNumber && validationErrors.phoneNumber && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationErrors.phoneNumber}
          </p>
        )}
      </div>

      {/* Account Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FormattedMessage id="payment.form.accountName" defaultMessage="Nom du compte" />
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            onBlur={() => handleFieldBlur('accountName')}
            placeholder={intl.formatMessage({
              id: 'payment.form.accountNamePlaceholder',
              defaultMessage: 'Nom associe au compte mobile'
            })}
            className={`
              w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800
              text-gray-900 dark:text-white placeholder-gray-400
              transition-all duration-200 outline-none
              ${touched.accountName && validationErrors.accountName
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
              }
            `}
          />
        </div>
        {touched.accountName && validationErrors.accountName && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationErrors.accountName}
          </p>
        )}
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Selected country header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedCountry?.flag}</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedCountry?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCountry?.currency}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
        >
          <Edit3 className="w-4 h-4" />
          <FormattedMessage id="payment.form.change" defaultMessage="Modifier" />
        </button>
      </div>

      {/* Form based on payment type */}
      {selectedCountry?.methodType === 'bank_transfer'
        ? renderBankTransferForm()
        : renderMobileMoneyForm()
      }
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage
            id="payment.form.success"
            defaultMessage="Methode de paiement enregistree"
          />
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          <FormattedMessage
            id="payment.form.successDesc"
            defaultMessage="Vous pourrez recevoir vos paiements sur ce compte."
          />
        </p>
      </div>

      {/* Summary card */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedCountry?.flag}</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedCountry?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCountry?.methodType === 'bank_transfer'
                ? intl.formatMessage({ id: 'payment.form.bankTransfer', defaultMessage: 'Virement bancaire' })
                : intl.formatMessage({ id: 'payment.form.mobileMoney', defaultMessage: 'Mobile Money' })
              }
            </p>
          </div>
        </div>

        {selectedCountry?.methodType === 'bank_transfer' ? (
          <div className="text-sm space-y-1">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{accountHolderName}</span>
            </p>
            {iban && (
              <p className="text-gray-500 dark:text-gray-500 font-mono text-xs">
                {iban.substring(0, 8)}...{iban.slice(-4)}
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{accountName}</span>
            </p>
            <p className="text-gray-500 dark:text-gray-500 font-mono text-xs">
              {phoneNumber}
            </p>
            {selectedProvider && (
              <p className="text-gray-500 dark:text-gray-500 text-xs">
                {MOBILE_PROVIDERS.find(p => p.id === selectedProvider)?.displayName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form content based on step */}
      {step === 'country' && renderCountryStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'confirm' && renderConfirmStep()}

      {/* Action buttons */}
      {step === 'details' && (
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={loading || isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300 font-semibold
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="payment.form.back" defaultMessage="Retour" />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || isSubmitting || !isFormValid}
            className={`
              flex-1 py-3 px-4 rounded-xl font-semibold text-white
              transition-all duration-200 flex items-center justify-center gap-2
              ${loading || isSubmitting || !isFormValid
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/30'
              }
            `}
          >
            {(loading || isSubmitting) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <FormattedMessage id="payment.form.saving" defaultMessage="Enregistrement..." />
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <FormattedMessage id="payment.form.save" defaultMessage="Enregistrer" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEditMode && step !== 'confirm' && (
        <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
            <FormattedMessage
              id="payment.form.editModeHint"
              defaultMessage="Vous modifiez une methode de paiement existante"
            />
          </p>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-right-4 {
          from { transform: translateX(1rem); }
          to { transform: translateX(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, slide-in-from-right-4 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PaymentMethodForm;
