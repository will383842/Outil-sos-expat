/**
 * Country Landing Defaults & Utilities
 *
 * Region-based presets extracted from current hard-coded values.
 * Used as fallback when no Firestore config exists for a country.
 */

import type {
  GeoRegion,
  RegionPreset,
  CurrencyConfig,
  PaymentMethodConfig,
  TestimonialConfig,
  CountryInfo,
  ResolvedLandingConfig,
} from './types';

// ============================================================================
// REGION PRESETS
// ============================================================================

// Payment methods reflect what's ACTUALLY implemented:
// - Wise: bank transfers worldwide (150+ countries)
// - Flutterwave: Mobile Money Africa (Orange Money, Wave, M-Pesa, MTN MoMo, Airtel Money, etc.)
// NO PayPal, NO Stripe, NO standalone "Bank" for withdrawals.

export const REGION_PRESETS: RegionPreset[] = [
  {
    region: 'west_africa',
    label: 'Afrique de l\'Ouest',
    countries: ['SN', 'CI', 'ML', 'BF', 'GN', 'TG', 'BJ', 'NE', 'CM', 'GA'],
    currency: { code: 'XOF', symbol: 'FCFA', exchangeRate: 600, displayLocale: 'fr-SN' },
    paymentMethods: [
      { name: 'Orange Money', emoji: '🟠', priority: 1 },
      { name: 'Wave', emoji: '🌊', priority: 2 },
      { name: 'MTN MoMo', emoji: '💛', priority: 3 },
      { name: 'Free Money', emoji: '📱', priority: 4 },
      { name: 'Wise', emoji: '🌐', priority: 5 },
    ],
  },
  {
    region: 'east_africa',
    label: 'Afrique de l\'Est',
    countries: ['KE', 'TZ', 'UG', 'RW', 'ET'],
    currency: { code: 'KES', symbol: 'KSh', exchangeRate: 150, displayLocale: 'en-KE' },
    paymentMethods: [
      { name: 'M-Pesa', emoji: '💚', priority: 1 },
      { name: 'MTN MoMo', emoji: '💛', priority: 2 },
      { name: 'Airtel Money', emoji: '📱', priority: 3 },
      { name: 'Wise', emoji: '🌐', priority: 4 },
    ],
  },
  {
    region: 'north_africa',
    label: 'Afrique du Nord',
    countries: ['MA', 'DZ', 'TN', 'EG', 'LY'],
    currency: { code: 'MAD', symbol: 'MAD', exchangeRate: 10, displayLocale: 'fr-MA' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'southern_africa',
    label: 'Afrique Australe',
    countries: ['ZA', 'MZ', 'ZW', 'BW', 'NA'],
    currency: { code: 'ZAR', symbol: 'R', exchangeRate: 18, displayLocale: 'en-ZA' },
    paymentMethods: [
      { name: 'Vodacom', emoji: '📱', priority: 1 },
      { name: 'Wise', emoji: '🌐', priority: 2 },
    ],
  },
  {
    region: 'europe',
    label: 'Europe',
    countries: ['FR', 'DE', 'ES', 'IT', 'PT', 'BE', 'CH', 'NL', 'GB', 'PL', 'RO', 'SE', 'AT', 'IE'],
    currency: { code: 'EUR', symbol: '€', exchangeRate: 0.92, displayLocale: 'fr-FR' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'north_america',
    label: 'Amérique du Nord',
    countries: ['US', 'CA'],
    currency: { code: 'USD', symbol: '$', exchangeRate: 1, displayLocale: 'en-US' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'latin_america',
    label: 'Amérique Latine',
    countries: ['MX', 'BR', 'CO', 'AR', 'PE', 'CL', 'EC', 'VE', 'DO', 'GT'],
    currency: { code: 'USD', symbol: '$', exchangeRate: 1, displayLocale: 'es-MX' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'middle_east',
    label: 'Moyen-Orient',
    countries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB'],
    currency: { code: 'USD', symbol: '$', exchangeRate: 1, displayLocale: 'ar-SA' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'south_asia',
    label: 'Asie du Sud',
    countries: ['IN', 'PK', 'BD', 'LK', 'NP'],
    currency: { code: 'INR', symbol: '₹', exchangeRate: 83, displayLocale: 'hi-IN' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'southeast_asia',
    label: 'Asie du Sud-Est',
    countries: ['TH', 'VN', 'PH', 'ID', 'MY', 'SG'],
    currency: { code: 'USD', symbol: '$', exchangeRate: 1, displayLocale: 'en-SG' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'east_asia',
    label: 'Asie de l\'Est',
    countries: ['CN', 'JP', 'KR'],
    currency: { code: 'USD', symbol: '$', exchangeRate: 1, displayLocale: 'zh-CN' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
  {
    region: 'oceania',
    label: 'Océanie',
    countries: ['AU', 'NZ'],
    currency: { code: 'AUD', symbol: 'A$', exchangeRate: 1.5, displayLocale: 'en-AU' },
    paymentMethods: [
      { name: 'Wise', emoji: '🌐', priority: 1 },
    ],
  },
];

// ============================================================================
// DEFAULT CONFIG (universal fallback — matches current hard-coded values)
// ============================================================================

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: 'USD',
  symbol: '$',
  exchangeRate: 1,
  displayLocale: 'en-US',
};

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { name: 'Wise', emoji: '🌐', priority: 1 },
  { name: 'Mobile Money', emoji: '📱', priority: 2 },
];

export const DEFAULT_TESTIMONIALS: TestimonialConfig[] = [
  { name: 'Marie L.', earningsDisplay: '5 300$', earningsUSD: 5300, rank: 1 },
  { name: 'Fatou S.', earningsDisplay: '3 850$', earningsUSD: 3850, rank: 2 },
  { name: 'Kwame O.', earningsDisplay: '2 940$', earningsUSD: 2940, rank: 3 },
];

// ============================================================================
// COUNTRY → REGION LOOKUP
// ============================================================================

/** Find the region for a country code */
export function getRegionForCountry(countryCode: string): GeoRegion {
  const upper = countryCode.toUpperCase();
  for (const preset of REGION_PRESETS) {
    if (preset.countries.includes(upper)) {
      return preset.region;
    }
  }
  return 'default';
}

/** Get the region preset for a country */
export function getPresetForCountry(countryCode: string): RegionPreset | null {
  const upper = countryCode.toUpperCase();
  return REGION_PRESETS.find(p => p.countries.includes(upper)) ?? null;
}

// ============================================================================
// RESOLVED CONFIG BUILDER
// ============================================================================

/** Build a ResolvedLandingConfig from defaults for a given country */
export function getDefaultConfigForCountry(countryCode: string | null): ResolvedLandingConfig {
  if (!countryCode) {
    return {
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      currency: DEFAULT_CURRENCY,
      testimonials: DEFAULT_TESTIMONIALS,
      seoOverrides: {},
      isActive: true,
      countryCode: null,
      source: 'defaults',
    };
  }

  const preset = getPresetForCountry(countryCode);
  if (!preset) {
    return {
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      currency: DEFAULT_CURRENCY,
      testimonials: DEFAULT_TESTIMONIALS,
      seoOverrides: {},
      isActive: true,
      countryCode,
      source: 'defaults',
    };
  }

  // Build testimonials with local currency equivalents
  const testimonials = DEFAULT_TESTIMONIALS.map(t => ({
    ...t,
    earningsDisplay: preset.currency.exchangeRate !== 1
      ? `${formatAmount(t.earningsUSD * preset.currency.exchangeRate, preset.currency)} (${t.earningsUSD}$)`
      : t.earningsDisplay,
  }));

  return {
    paymentMethods: preset.paymentMethods,
    currency: preset.currency,
    testimonials,
    seoOverrides: {},
    isActive: true,
    countryCode,
    source: 'defaults',
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/** Build Firestore document ID: {role}_{countryCode}_{lang} */
export function buildDocumentId(role: string, countryCode: string, lang: string): string {
  return `${role}_${countryCode.toUpperCase()}_${lang}`;
}

/** Format an amount with the given currency config */
export function formatAmount(amount: number, currency: CurrencyConfig): string {
  try {
    return new Intl.NumberFormat(currency.displayLocale, {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + ' ' + currency.symbol;
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency.symbol}`;
  }
}

/** Convert USD to local currency display string, returns null if USD */
export function convertToLocal(amountUSD: number, currency: CurrencyConfig): string | null {
  if (currency.code === 'USD') return null;
  return formatAmount(amountUSD * currency.exchangeRate, currency);
}

/** Format a payment methods array into display strings: "🟠 Orange Money" */
export function formatPaymentMethodDisplay(methods: PaymentMethodConfig[]): string[] {
  return [...methods]
    .sort((a, b) => a.priority - b.priority)
    .map(m => `${m.emoji} ${m.name}`);
}

// ============================================================================
// COUNTRIES CATALOG (for admin dashboard)
// ============================================================================

export const COUNTRIES_CATALOG: CountryInfo[] = [
  // Afrique de l'Ouest
  { code: 'SN', name: 'Sénégal', region: 'west_africa', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', region: 'west_africa', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', region: 'west_africa', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', region: 'west_africa', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', region: 'west_africa', flag: '🇬🇳' },
  { code: 'TG', name: 'Togo', region: 'west_africa', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', region: 'west_africa', flag: '🇧🇯' },
  { code: 'NE', name: 'Niger', region: 'west_africa', flag: '🇳🇪' },
  { code: 'CM', name: 'Cameroun', region: 'west_africa', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', region: 'west_africa', flag: '🇬🇦' },
  // Afrique de l'Est
  { code: 'KE', name: 'Kenya', region: 'east_africa', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', region: 'east_africa', flag: '🇹🇿' },
  { code: 'UG', name: 'Ouganda', region: 'east_africa', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', region: 'east_africa', flag: '🇷🇼' },
  { code: 'ET', name: 'Éthiopie', region: 'east_africa', flag: '🇪🇹' },
  // Afrique du Nord
  { code: 'MA', name: 'Maroc', region: 'north_africa', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', region: 'north_africa', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', region: 'north_africa', flag: '🇹🇳' },
  { code: 'EG', name: 'Égypte', region: 'north_africa', flag: '🇪🇬' },
  // Afrique Australe
  { code: 'ZA', name: 'Afrique du Sud', region: 'southern_africa', flag: '🇿🇦' },
  { code: 'MZ', name: 'Mozambique', region: 'southern_africa', flag: '🇲🇿' },
  // Europe
  { code: 'FR', name: 'France', region: 'europe', flag: '🇫🇷' },
  { code: 'DE', name: 'Allemagne', region: 'europe', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', region: 'europe', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', region: 'europe', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', region: 'europe', flag: '🇵🇹' },
  { code: 'BE', name: 'Belgique', region: 'europe', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', region: 'europe', flag: '🇨🇭' },
  { code: 'GB', name: 'Royaume-Uni', region: 'europe', flag: '🇬🇧' },
  // Amérique du Nord
  { code: 'US', name: 'États-Unis', region: 'north_america', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', region: 'north_america', flag: '🇨🇦' },
  // Amérique Latine
  { code: 'MX', name: 'Mexique', region: 'latin_america', flag: '🇲🇽' },
  { code: 'BR', name: 'Brésil', region: 'latin_america', flag: '🇧🇷' },
  { code: 'CO', name: 'Colombie', region: 'latin_america', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentine', region: 'latin_america', flag: '🇦🇷' },
  // Moyen-Orient
  { code: 'SA', name: 'Arabie Saoudite', region: 'middle_east', flag: '🇸🇦' },
  { code: 'AE', name: 'Émirats', region: 'middle_east', flag: '🇦🇪' },
  { code: 'LB', name: 'Liban', region: 'middle_east', flag: '🇱🇧' },
  // Asie du Sud
  { code: 'IN', name: 'Inde', region: 'south_asia', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', region: 'south_asia', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', region: 'south_asia', flag: '🇧🇩' },
  // Asie du Sud-Est
  { code: 'TH', name: 'Thaïlande', region: 'southeast_asia', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', region: 'southeast_asia', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', region: 'southeast_asia', flag: '🇵🇭' },
  // Océanie
  { code: 'AU', name: 'Australie', region: 'oceania', flag: '🇦🇺' },
];

/** Region labels for display */
export const REGION_LABELS: Record<GeoRegion, string> = {
  west_africa: 'Afrique de l\'Ouest',
  east_africa: 'Afrique de l\'Est',
  north_africa: 'Afrique du Nord',
  southern_africa: 'Afrique Australe',
  europe: 'Europe',
  north_america: 'Amérique du Nord',
  latin_america: 'Amérique Latine',
  middle_east: 'Moyen-Orient',
  south_asia: 'Asie du Sud',
  southeast_asia: 'Asie du Sud-Est',
  east_asia: 'Asie de l\'Est',
  oceania: 'Océanie',
  default: 'Autre',
};
