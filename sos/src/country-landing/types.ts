/**
 * Country Landing Config Types
 *
 * Firestore collection: country_landing_configs/{role}_{countryCode}_{lang}
 * Used to customize landing pages per country (payment methods, currency, testimonials, SEO).
 */

import { Timestamp } from 'firebase/firestore';

export type LandingRole = 'chatter' | 'influencer' | 'blogger' | 'groupadmin';
export type ConfigStatus = 'todo' | 'draft' | 'review' | 'published';

export interface PaymentMethodConfig {
  name: string;        // "Orange Money"
  emoji: string;       // "🟠"
  priority: number;    // Display order (lower = first)
}

export interface CurrencyConfig {
  code: string;          // "XOF"
  symbol: string;        // "FCFA"
  exchangeRate: number;  // 1 USD = X local currency (e.g. 600 for XOF)
  displayLocale: string; // "fr-SN" for Intl.NumberFormat
}

export interface TestimonialConfig {
  name: string;            // "Aminata D."
  earningsDisplay: string; // "3 180 000 FCFA"
  earningsUSD: number;     // 5300
  rank: 1 | 2 | 3;
}

export interface SEOOverrides {
  title?: string;
  description?: string;
  keywords?: string;
}

/** Firestore document: country_landing_configs/{role}_{countryCode}_{lang} */
export interface CountryLandingConfig {
  role: LandingRole;
  countryCode: string;    // "SN" (uppercase)
  lang: string;           // "fr"
  status: ConfigStatus;
  notes: string;
  paymentMethods: PaymentMethodConfig[];
  currency: CurrencyConfig;
  testimonials: TestimonialConfig[];
  seoOverrides: SEOOverrides;
  isActive: boolean;
  lastUpdatedAt: Timestamp | null;
  updatedBy: string;
}

/** Resolved config after merging Firestore doc with defaults */
export interface ResolvedLandingConfig {
  paymentMethods: PaymentMethodConfig[];
  currency: CurrencyConfig;
  testimonials: TestimonialConfig[];
  seoOverrides: SEOOverrides;
  isActive: boolean;
  countryCode: string | null;
  source: 'firestore' | 'defaults';
}

// Geographic regions for presets
export type GeoRegion =
  | 'west_africa'
  | 'east_africa'
  | 'north_africa'
  | 'southern_africa'
  | 'europe'
  | 'north_america'
  | 'latin_america'
  | 'middle_east'
  | 'south_asia'
  | 'southeast_asia'
  | 'east_asia'
  | 'oceania'
  | 'default';

export interface RegionPreset {
  region: GeoRegion;
  label: string;
  countries: string[]; // ISO 3166-1 alpha-2 uppercase
  currency: CurrencyConfig;
  paymentMethods: PaymentMethodConfig[];
}

/** For admin dashboard matrix display */
export interface CountryInfo {
  code: string;       // "SN"
  name: string;       // "Sénégal"
  region: GeoRegion;
  flag: string;       // "🇸🇳"
}
