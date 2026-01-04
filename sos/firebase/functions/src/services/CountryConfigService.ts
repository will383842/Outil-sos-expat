/**
 * Country Config Service
 *
 * Service for reading country and subdivision configurations from Firestore
 * with in-memory caching to minimize Firestore reads.
 *
 * Collections:
 * - country_fiscal_configs: 197+ countries with VAT/GST/Sales Tax info
 * - country_subdivisions: US states (51) + Canada provinces (13)
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../utils/firebase';
import type { CountryFiscalConfig, Region } from '../seeds/seedCountryConfigs';
import type { SubdivisionConfig } from '../seeds/seedSubdivisionConfigs';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CountryCache {
  byCode: Map<string, CacheEntry<CountryFiscalConfig>>;
  all: CacheEntry<CountryFiscalConfig[]> | null;
  byRegion: Map<string, CacheEntry<CountryFiscalConfig[]>>;
}

interface SubdivisionCache {
  byId: Map<string, CacheEntry<SubdivisionConfig>>;
  byCountry: Map<string, CacheEntry<SubdivisionConfig[]>>;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const COLLECTION_COUNTRIES = 'country_fiscal_configs';
const COLLECTION_SUBDIVISIONS = 'country_subdivisions';

// ============================================================================
// SERVICE CLASS
// ============================================================================

class CountryConfigServiceClass {
  private countryCache: CountryCache = {
    byCode: new Map(),
    all: null,
    byRegion: new Map()
  };

  private subdivisionCache: SubdivisionCache = {
    byId: new Map(),
    byCountry: new Map()
  };

  // ==========================================================================
  // COUNTRY METHODS
  // ==========================================================================

  /**
   * Get country config by country code (e.g., "FR", "US", "JP")
   */
  async getCountry(countryCode: string): Promise<CountryFiscalConfig | null> {
    const code = countryCode.toUpperCase();

    // Check cache
    const cached = this.countryCache.byCode.get(code);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from Firestore
    try {
      const doc = await db.collection(COLLECTION_COUNTRIES).doc(code).get();
      if (!doc.exists) {
        logger.warn(`Country config not found: ${code}`);
        return null;
      }

      const data = doc.data() as CountryFiscalConfig;
      this.countryCache.byCode.set(code, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error(`Error fetching country config: ${code}`, { error });
      throw error;
    }
  }

  /**
   * Get all active countries
   */
  async getAllActiveCountries(): Promise<CountryFiscalConfig[]> {
    // Check cache
    if (this.countryCache.all && this.isCacheValid(this.countryCache.all.timestamp)) {
      return this.countryCache.all.data.filter(c => c.isActive);
    }

    // Fetch from Firestore
    try {
      const snapshot = await db.collection(COLLECTION_COUNTRIES)
        .where('isActive', '==', true)
        .get();

      const countries = snapshot.docs.map(doc => doc.data() as CountryFiscalConfig);

      // Cache all data
      this.countryCache.all = {
        data: countries,
        timestamp: Date.now()
      };

      // Also populate byCode cache
      for (const country of countries) {
        this.countryCache.byCode.set(country.countryCode, {
          data: country,
          timestamp: Date.now()
        });
      }

      return countries;
    } catch (error) {
      logger.error('Error fetching all active countries', { error });
      throw error;
    }
  }

  /**
   * Get countries by region
   */
  async getCountriesByRegion(region: Region): Promise<CountryFiscalConfig[]> {
    // Check cache
    const cached = this.countryCache.byRegion.get(region);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from Firestore
    try {
      const snapshot = await db.collection(COLLECTION_COUNTRIES)
        .where('region', '==', region)
        .where('isActive', '==', true)
        .get();

      const countries = snapshot.docs.map(doc => doc.data() as CountryFiscalConfig);

      this.countryCache.byRegion.set(region, {
        data: countries,
        timestamp: Date.now()
      });

      return countries;
    } catch (error) {
      logger.error(`Error fetching countries by region: ${region}`, { error });
      throw error;
    }
  }

  /**
   * Get countries that support Stripe payments
   */
  async getStripeCountries(): Promise<CountryFiscalConfig[]> {
    const allCountries = await this.getAllActiveCountries();
    return allCountries.filter(c => c.stripeSupported);
  }

  /**
   * Get countries that support PayPal payments
   */
  async getPayPalCountries(): Promise<CountryFiscalConfig[]> {
    const allCountries = await this.getAllActiveCountries();
    return allCountries.filter(c => c.paypalSupported);
  }

  /**
   * Get VAT rate for a country
   */
  async getVatRate(countryCode: string): Promise<number> {
    const country = await this.getCountry(countryCode);
    if (!country) {
      logger.warn(`Country not found for VAT rate: ${countryCode}, defaulting to 0`);
      return 0;
    }
    return country.standardVatRate;
  }

  /**
   * Get digital services tax rate for a country
   */
  async getDigitalServicesTaxRate(countryCode: string): Promise<number | null> {
    const country = await this.getCountry(countryCode);
    if (!country || !country.digitalServicesRules.applicable) {
      return null;
    }
    return country.digitalServicesRules.rate || country.standardVatRate;
  }

  /**
   * Check if a country requires VAT registration for digital services
   */
  async requiresDigitalServicesRegistration(countryCode: string): Promise<boolean> {
    const country = await this.getCountry(countryCode);
    if (!country) return false;
    return country.digitalServicesRules.requiresRegistration;
  }

  // ==========================================================================
  // SUBDIVISION METHODS (USA States, Canada Provinces)
  // ==========================================================================

  /**
   * Get subdivision config by ID (e.g., "US_CA", "CA_QC")
   */
  async getSubdivision(subdivisionId: string): Promise<SubdivisionConfig | null> {
    const id = subdivisionId.toUpperCase();

    // Check cache
    const cached = this.subdivisionCache.byId.get(id);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from Firestore
    try {
      const doc = await db.collection(COLLECTION_SUBDIVISIONS).doc(id).get();
      if (!doc.exists) {
        logger.warn(`Subdivision config not found: ${id}`);
        return null;
      }

      const data = doc.data() as SubdivisionConfig;
      this.subdivisionCache.byId.set(id, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error(`Error fetching subdivision config: ${id}`, { error });
      throw error;
    }
  }

  /**
   * Get all subdivisions for a country (e.g., all US states)
   */
  async getSubdivisionsByCountry(countryCode: string): Promise<SubdivisionConfig[]> {
    const code = countryCode.toUpperCase();

    // Check cache
    const cached = this.subdivisionCache.byCountry.get(code);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from Firestore
    try {
      const snapshot = await db.collection(COLLECTION_SUBDIVISIONS)
        .where('countryCode', '==', code)
        .where('isActive', '==', true)
        .get();

      const subdivisions = snapshot.docs.map(doc => doc.data() as SubdivisionConfig);

      this.subdivisionCache.byCountry.set(code, {
        data: subdivisions,
        timestamp: Date.now()
      });

      return subdivisions;
    } catch (error) {
      logger.error(`Error fetching subdivisions for country: ${code}`, { error });
      throw error;
    }
  }

  /**
   * Get USA state by state code (e.g., "CA", "NY")
   */
  async getUSAState(stateCode: string): Promise<SubdivisionConfig | null> {
    return this.getSubdivision(`US_${stateCode.toUpperCase()}`);
  }

  /**
   * Get Canada province by province code (e.g., "QC", "ON")
   */
  async getCanadaProvince(provinceCode: string): Promise<SubdivisionConfig | null> {
    return this.getSubdivision(`CA_${provinceCode.toUpperCase()}`);
  }

  /**
   * Get combined tax rate for a subdivision
   */
  async getSubdivisionTaxRate(subdivisionId: string): Promise<number> {
    const subdivision = await this.getSubdivision(subdivisionId);
    if (!subdivision) {
      logger.warn(`Subdivision not found for tax rate: ${subdivisionId}, defaulting to 0`);
      return 0;
    }
    return subdivision.combinedTaxRate;
  }

  /**
   * Check if professional services are tax-exempt in a subdivision
   * (Important for SOS-Expat legal consulting services)
   */
  async isProfessionalServicesExempt(subdivisionId: string): Promise<boolean> {
    const subdivision = await this.getSubdivision(subdivisionId);
    if (!subdivision) return true; // Default to exempt if not found
    return subdivision.professionalServicesExempt;
  }

  // ==========================================================================
  // TAX CALCULATION HELPERS
  // ==========================================================================

  /**
   * Get the applicable tax rate for a transaction
   * Considers country, subdivision (if applicable), and service type
   */
  async getApplicableTaxRate(
    countryCode: string,
    subdivisionCode?: string,
    isProfessionalService: boolean = true
  ): Promise<{
    rate: number;
    taxType: string;
    details: string;
  }> {
    const country = await this.getCountry(countryCode);
    if (!country) {
      return { rate: 0, taxType: 'NONE', details: 'Country not found' };
    }

    // For USA and Canada, check subdivision-specific rules
    if ((countryCode === 'US' || countryCode === 'CA') && subdivisionCode) {
      const subdivisionId = `${countryCode}_${subdivisionCode}`;
      const subdivision = await this.getSubdivision(subdivisionId);

      if (subdivision) {
        // Check professional services exemption
        if (isProfessionalService && subdivision.professionalServicesExempt) {
          return {
            rate: 0,
            taxType: 'EXEMPT',
            details: `Professional services exempt in ${subdivision.subdivisionName.en}`
          };
        }

        return {
          rate: subdivision.combinedTaxRate,
          taxType: subdivision.taxes.map(t => t.type).join(' + '),
          details: subdivision.taxes.map(t => `${t.name}: ${t.rate}%`).join(', ')
        };
      }
    }

    // For other countries, use country-level tax
    if (!country.vatEnabled) {
      return { rate: 0, taxType: 'NONE', details: 'No VAT/GST in this country' };
    }

    // Check digital services rules
    if (country.digitalServicesRules.applicable) {
      return {
        rate: country.digitalServicesRules.rate || country.standardVatRate,
        taxType: country.taxType,
        details: `Digital services ${country.taxType} ${country.digitalServicesRules.regime || 'LOCAL'}`
      };
    }

    return {
      rate: country.standardVatRate,
      taxType: country.taxType,
      details: `Standard ${country.taxType} rate`
    };
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.countryCache = {
      byCode: new Map(),
      all: null,
      byRegion: new Map()
    };
    this.subdivisionCache = {
      byId: new Map(),
      byCountry: new Map()
    };
    logger.info('Country config cache cleared');
  }

  /**
   * Pre-warm cache by loading all data
   */
  async warmCache(): Promise<void> {
    logger.info('Warming country config cache...');
    await this.getAllActiveCountries();
    await this.getSubdivisionsByCountry('US');
    await this.getSubdivisionsByCountry('CA');
    logger.info('Country config cache warmed');
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_TTL_MS;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const CountryConfigService = new CountryConfigServiceClass();
