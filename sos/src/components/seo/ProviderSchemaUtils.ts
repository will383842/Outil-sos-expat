/**
 * Provider Schema Utilities
 *
 * Centralized utilities for generating Google-compliant structured data for providers.
 *
 * IMPORTANT: Google only allows aggregateRating on specific types:
 * - Organization, LocalBusiness, Product, Service
 * - LegalService, ProfessionalService (subtypes of LocalBusiness)
 * - Book, Course, Event, Game, HowTo, Movie, Recipe, SoftwareApplication
 *
 * INVALID types for aggregateRating:
 * - Person, Attorney (subtypes of Person)
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/review-snippet
 */

export interface ProviderForSchema {
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
  country: string;
  city?: string;
  languages: string[];
  specialties?: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience?: number;
  price?: number;
  avatar?: string;
  description?: string;
}

export interface ProviderSchemaOptions {
  baseUrl?: string;
  includeAggregateRating?: boolean;
  includeOffers?: boolean;
  locale?: string;
}

/**
 * Get the correct schema.org @type for a provider
 * Uses LegalService for lawyers and ProfessionalService for expat consultants
 * This ensures aggregateRating is valid (not allowed on Person/Attorney types)
 */
export function getProviderSchemaType(providerType: 'lawyer' | 'expat'): string {
  return providerType === 'lawyer' ? 'LegalService' : 'ProfessionalService';
}

/**
 * Generate a Google-compliant schema for a provider
 * Uses LegalService/ProfessionalService to support aggregateRating
 *
 * @example
 * const schema = generateProviderItemSchema(provider, {
 *   baseUrl: 'https://sos-expat.com',
 *   includeAggregateRating: true
 * });
 */
export function generateProviderItemSchema(
  provider: ProviderForSchema,
  options: ProviderSchemaOptions = {}
): Record<string, unknown> {
  const {
    baseUrl = 'https://sos-expat.com',
    includeAggregateRating = true,
    includeOffers = false,
    locale = 'fr'
  } = options;

  const schemaType = getProviderSchemaType(provider.type);

  const schema: Record<string, unknown> = {
    '@type': schemaType,
    '@id': `${baseUrl}/prestataire/${provider.id}`,
    name: provider.name,
    description: provider.description || (
      provider.type === 'lawyer'
        ? 'Service juridique professionnel'
        : 'Service de conseil pour expatriés'
    ),
    image: provider.avatar || `${baseUrl}/default-avatar.png`,
    provider: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'SOS Expat & Travelers',
    },
    areaServed: {
      '@type': 'Place',
      name: provider.country,
    },
    availableLanguage: provider.languages,
  };

  // Only include aggregateRating if there are actual reviews
  // This is compliant with Google guidelines
  if (includeAggregateRating && provider.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: provider.rating.toFixed(1),
      reviewCount: provider.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Include pricing information if requested
  if (includeOffers && provider.price) {
    schema.offers = {
      '@type': 'Offer',
      price: provider.price.toString(),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    };
  }

  return schema;
}

/**
 * Generate a ListItem schema for use in ItemList
 * Wraps the provider schema in a ListItem structure
 */
export function generateProviderListItemSchema(
  provider: ProviderForSchema,
  position: number,
  options: ProviderSchemaOptions = {}
): Record<string, unknown> {
  return {
    '@type': 'ListItem',
    position,
    item: generateProviderItemSchema(provider, options),
  };
}

/**
 * Generate an ItemList schema for a list of providers
 *
 * @example
 * const schema = generateProvidersListSchema(providers, {
 *   name: 'Liste des avocats',
 *   description: 'Nos experts juridiques',
 *   baseUrl: 'https://sos-expat.com'
 * });
 */
export function generateProvidersListSchema(
  providers: ProviderForSchema[],
  options: {
    name: string;
    description: string;
    maxItems?: number;
  } & ProviderSchemaOptions
): Record<string, unknown> | null {
  if (!providers || providers.length === 0) return null;

  const { name, description, maxItems = 10, ...providerOptions } = options;
  const baseUrl = providerOptions.baseUrl || 'https://sos-expat.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${baseUrl}/#providers-list`,
    name,
    description,
    numberOfItems: providers.length,
    itemListElement: providers.slice(0, maxItems).map((provider, index) =>
      generateProviderListItemSchema(provider, index + 1, providerOptions)
    ),
  };
}

/**
 * VALID schema.org types that support aggregateRating
 * Use this for reference when building structured data
 */
export const AGGREGATE_RATING_VALID_TYPES = [
  'Book',
  'Course',
  'CreativeWorkSeason',
  'CreativeWorkSeries',
  'Episode',
  'Event',
  'Game',
  'HowTo',
  'LocalBusiness',
  'LegalService',
  'ProfessionalService',
  'MediaObject',
  'Movie',
  'MusicPlaylist',
  'MusicRecording',
  'Organization',
  'Product',
  'Recipe',
  'SoftwareApplication',
] as const;

/**
 * INVALID schema.org types for aggregateRating
 * These will cause Google Search Console errors
 */
export const AGGREGATE_RATING_INVALID_TYPES = [
  'Person',
  'Attorney', // Subtype of Person
  'Physician', // Subtype of Person
] as const;

/**
 * Check if a schema type supports aggregateRating
 */
export function supportsAggregateRating(schemaType: string): boolean {
  return AGGREGATE_RATING_VALID_TYPES.includes(schemaType as any);
}
