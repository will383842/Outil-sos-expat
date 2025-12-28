/**
 * ProfessionalServiceSchema Component
 * Generates JSON-LD structured data for legal/consulting services
 *
 * @see https://schema.org/ProfessionalService
 * @see https://schema.org/LegalService
 * @see https://developers.google.com/search/docs/appearance/structured-data/local-business
 */

import React, { useMemo } from 'react';

export interface ServiceProvider {
  name: string;
  description?: string;
  image?: string;
  country: string;
  city?: string;
  role: 'lawyer' | 'expat' | string;
  specialties?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
}

interface ProfessionalServiceSchemaProps {
  provider: ServiceProvider;
  baseUrl?: string;
}

/**
 * Generates ProfessionalService/LegalService JSON-LD schema
 *
 * @example
 * <ProfessionalServiceSchema
 *   provider={{
 *     name: 'Jean Dupont',
 *     role: 'lawyer',
 *     country: 'France',
 *     city: 'Paris',
 *     specialties: ['Immigration', 'Droit des affaires'],
 *     rating: 4.8,
 *     reviewCount: 25
 *   }}
 * />
 */
const ProfessionalServiceSchema: React.FC<ProfessionalServiceSchemaProps> = ({
  provider,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com'
}) => {
  const schema = useMemo(() => {
    const isLawyer = provider.role === 'lawyer';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : `${baseUrl}`;

    // Determine the appropriate schema type
    const schemaType = isLawyer ? 'LegalService' : 'ProfessionalService';

    const serviceSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      '@id': currentUrl,
      name: provider.name,
      description: provider.description,
      url: provider.url || currentUrl,

      // Location
      address: {
        '@type': 'PostalAddress',
        addressCountry: provider.country,
        ...(provider.city && { addressLocality: provider.city })
      },

      // Area served (international service)
      areaServed: {
        '@type': 'Country',
        name: provider.country
      },

      // Image
      ...(provider.image && {
        image: {
          '@type': 'ImageObject',
          url: provider.image,
          width: 400,
          height: 400
        }
      }),

      // Price range indicator
      priceRange: provider.priceRange || '€€-€€€',

      // Service types
      ...(provider.specialties && provider.specialties.length > 0 && {
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: isLawyer ? 'Services juridiques' : 'Services de conseil',
          itemListElement: provider.specialties.map((specialty, index) => ({
            '@type': 'Offer',
            '@id': `${currentUrl}#service-${index}`,
            itemOffered: {
              '@type': 'Service',
              name: specialty,
              provider: {
                '@type': 'Person',
                name: provider.name
              }
            }
          }))
        }
      }),

      // Languages
      ...(provider.languages && provider.languages.length > 0 && {
        knowsLanguage: provider.languages.map(lang => ({
          '@type': 'Language',
          name: lang
        }))
      }),

      // Aggregate rating
      ...(provider.rating && provider.reviewCount && provider.reviewCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: provider.rating,
          reviewCount: provider.reviewCount,
          bestRating: 5,
          worstRating: 1
        }
      }),

      // Provider organization
      parentOrganization: {
        '@type': 'Organization',
        name: 'SOS Expat & Travelers',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`
      },

      // Opening hours (24/7 for online services)
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday', 'Sunday'
        ],
        opens: '00:00',
        closes: '23:59'
      },

      // Contact
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: provider.languages || ['French', 'English']
      }
    };

    // Add experience if available
    if (provider.yearsOfExperience) {
      serviceSchema.foundingDate = new Date(
        new Date().getFullYear() - provider.yearsOfExperience,
        0,
        1
      ).toISOString().split('T')[0];
    }

    return serviceSchema;
  }, [provider, baseUrl]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default ProfessionalServiceSchema;

/**
 * Generates a combined schema with Person + ProfessionalService
 * for richer search results
 */
export const generateProviderSchema = (
  provider: ServiceProvider,
  baseUrl: string = 'https://sos-expat.com'
): Record<string, unknown> => {
  const isLawyer = provider.role === 'lawyer';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // Person schema
      {
        '@type': isLawyer ? 'Attorney' : 'Person',
        '@id': `${currentUrl}#person`,
        name: provider.name,
        description: provider.description,
        image: provider.image,
        jobTitle: isLawyer ? 'Avocat' : 'Consultant',
        ...(provider.specialties && {
          knowsAbout: provider.specialties
        }),
        ...(provider.languages && {
          knowsLanguage: provider.languages
        }),
        worksFor: {
          '@id': `${baseUrl}#organization`
        }
      },
      // ProfessionalService schema
      {
        '@type': isLawyer ? 'LegalService' : 'ProfessionalService',
        '@id': `${currentUrl}#service`,
        name: `${provider.name} - ${isLawyer ? 'Services juridiques' : 'Services de conseil'}`,
        provider: {
          '@id': `${currentUrl}#person`
        },
        areaServed: provider.country,
        priceRange: provider.priceRange || '€€-€€€',
        ...(provider.rating && provider.reviewCount && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: provider.rating,
            reviewCount: provider.reviewCount,
            bestRating: 5,
            worstRating: 1
          }
        })
      },
      // Organization schema
      {
        '@type': 'Organization',
        '@id': `${baseUrl}#organization`,
        name: 'SOS Expat & Travelers',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`
      }
    ]
  };
};
