/**
 * OrganizationSchema Component
 * Generates JSON-LD structured data for Organization with AggregateRating
 * This is essential for Google Rich Snippets (stars in search results)
 *
 * @see https://schema.org/Organization
 * @see https://schema.org/AggregateRating
 * @see https://developers.google.com/search/docs/appearance/structured-data/review-snippet
 */

import React, { useMemo } from 'react';

export interface OrganizationRating {
  ratingValue: number;
  ratingCount: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface SocialProfile {
  platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'tiktok';
  url: string;
}

export interface ContactPoint {
  telephone?: string;
  email?: string;
  contactType: string;
  availableLanguage: string[];
  areaServed?: string[];
}

export interface OrganizationSchemaProps {
  /** Organization name */
  name?: string;
  /** Organization description */
  description?: string;
  /** Legal name (if different from name) */
  legalName?: string;
  /** Organization logo URL */
  logo?: string;
  /** Organization website URL */
  url?: string;
  /** Aggregate rating data - REQUIRED for stars */
  aggregateRating?: OrganizationRating;
  /** Social media profiles */
  sameAs?: string[];
  /** Contact points */
  contactPoints?: ContactPoint[];
  /** Founding date (ISO format) */
  foundingDate?: string;
  /** Area served (countries/regions) */
  areaServed?: string[];
  /** Service types offered */
  serviceTypes?: string[];
  /** Supported languages */
  availableLanguages?: string[];
  /** Include WebSite schema with SearchAction */
  includeWebSite?: boolean;
  /** Include Service schema */
  includeService?: boolean;
}

/**
 * Generates Organization + AggregateRating JSON-LD schema
 * Essential for Google Rich Snippets with stars
 *
 * @example
 * <OrganizationSchema
 *   aggregateRating={{
 *     ratingValue: 4.9,
 *     ratingCount: 127,
 *     reviewCount: 127
 *   }}
 * />
 */
const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  name = 'SOS Expat & Travelers',
  description = 'Assistance juridique et expatriation en urgence - Service d\'aide rapide 24/7 pour expatriés et voyageurs dans 197 pays. Avocats et experts expatriés disponibles immédiatement.',
  legalName = 'SOS Expat & Travelers',
  logo = 'https://sos-expat.com/sos-logo.webp',
  url = 'https://sos-expat.com',
  aggregateRating,
  sameAs = [
    'https://facebook.com/sosexpat',
    'https://twitter.com/sosexpat',
    'https://linkedin.com/company/sosexpat',
    'https://www.instagram.com/sosexpat'
  ],
  contactPoints = [
    {
      contactType: 'customer service',
      availableLanguage: ['French', 'English', 'Spanish', 'German', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Chinese'],
      areaServed: ['Worldwide']
    }
  ],
  foundingDate = '2024',
  areaServed = ['Worldwide'],
  serviceTypes = [
    'Legal Assistance',
    'Immigration Law',
    'Expat Consulting',
    'Emergency Legal Help',
    'Document Translation',
    'Visa Assistance'
  ],
  availableLanguages = ['French', 'English', 'Spanish', 'German', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Chinese'],
  includeWebSite = true,
  includeService = true
}) => {
  const schema = useMemo(() => {
    const baseUrl = url.replace(/\/$/, '');

    // Main Organization schema
    const organizationSchema: Record<string, unknown> = {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name,
      legalName,
      description,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        '@id': `${baseUrl}/#logo`,
        url: logo,
        width: 512,
        height: 512,
        caption: name
      },
      image: logo,
      sameAs,
      foundingDate,

      // Area served
      areaServed: areaServed.map(area => ({
        '@type': area === 'Worldwide' ? 'GeoShape' : 'Country',
        name: area
      })),

      // Contact points
      contactPoint: contactPoints.map(cp => ({
        '@type': 'ContactPoint',
        contactType: cp.contactType,
        availableLanguage: cp.availableLanguage,
        ...(cp.telephone && { telephone: cp.telephone }),
        ...(cp.email && { email: cp.email }),
        ...(cp.areaServed && { areaServed: cp.areaServed })
      })),

      // Languages
      knowsLanguage: availableLanguages.map(lang => ({
        '@type': 'Language',
        name: lang
      })),

      // Opening hours (24/7)
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59'
      }
    };

    // CRITICAL: AggregateRating for Google Stars
    if (aggregateRating && aggregateRating.ratingCount > 0) {
      organizationSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toFixed(1),
        ratingCount: aggregateRating.ratingCount,
        reviewCount: aggregateRating.reviewCount,
        bestRating: aggregateRating.bestRating || 5,
        worstRating: aggregateRating.worstRating || 1
      };
    }

    // Build the @graph array
    const graph: Record<string, unknown>[] = [organizationSchema];

    // WebSite schema with SearchAction (helps with sitelinks search box)
    if (includeWebSite) {
      graph.push({
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name,
        description,
        publisher: {
          '@id': `${baseUrl}/#organization`
        },
        inLanguage: ['fr-FR', 'en-US', 'es-ES', 'de-DE', 'pt-BR', 'ru-RU', 'ar-SA', 'hi-IN', 'zh-CN'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      });
    }

    // Service schema
    if (includeService) {
      graph.push({
        '@type': 'Service',
        '@id': `${baseUrl}/#service`,
        name: 'Services d\'assistance expatriés',
        description: 'Services d\'assistance juridique et conseil pour expatriés et voyageurs - Consultations en ligne avec avocats et experts',
        provider: {
          '@id': `${baseUrl}/#organization`
        },
        serviceType: serviceTypes,
        areaServed: {
          '@type': 'GeoShape',
          name: 'Worldwide'
        },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceType: 'Online consultation',
          availableLanguage: availableLanguages
        },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          lowPrice: '49',
          highPrice: '199',
          offerCount: serviceTypes.length
        },
        // Include rating on service too
        ...(aggregateRating && aggregateRating.ratingCount > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: aggregateRating.ratingValue.toFixed(1),
            ratingCount: aggregateRating.ratingCount,
            reviewCount: aggregateRating.reviewCount,
            bestRating: aggregateRating.bestRating || 5,
            worstRating: aggregateRating.worstRating || 1
          }
        })
      });
    }

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }, [
    name, description, legalName, logo, url, aggregateRating, sameAs,
    contactPoints, foundingDate, areaServed, serviceTypes, availableLanguages,
    includeWebSite, includeService
  ]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
};

export default OrganizationSchema;

/**
 * Standalone function to generate Organization schema object
 * Useful for embedding in other schemas
 */
export const generateOrganizationSchema = (
  props: Partial<OrganizationSchemaProps> = {}
): Record<string, unknown> => {
  const {
    name = 'SOS Expat & Travelers',
    url = 'https://sos-expat.com',
    logo = 'https://sos-expat.com/sos-logo.webp',
    aggregateRating
  } = props;

  const baseUrl = url.replace(/\/$/, '');

  return {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name,
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512
    },
    ...(aggregateRating && aggregateRating.ratingCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toFixed(1),
        ratingCount: aggregateRating.ratingCount,
        reviewCount: aggregateRating.reviewCount,
        bestRating: 5,
        worstRating: 1
      }
    })
  };
};
