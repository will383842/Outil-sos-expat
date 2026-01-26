/**
 * LocalBusinessSchema Component
 * Generates JSON-LD structured data for LocalBusiness with AggregateRating
 * Optimized for Google Rich Snippets with stars
 *
 * @see https://schema.org/LocalBusiness
 * @see https://developers.google.com/search/docs/appearance/structured-data/local-business
 */

import React, { useMemo } from 'react';

export interface LocalBusinessRating {
  ratingValue: number;
  ratingCount: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface LocalBusinessReview {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
}

export interface LocalBusinessSchemaProps {
  /** Business name */
  name?: string;
  /** Business description */
  description?: string;
  /** Business type (default: ProfessionalService) */
  businessType?: 'LocalBusiness' | 'ProfessionalService' | 'LegalService' | 'ConsultingBusiness';
  /** Business URL */
  url?: string;
  /** Business logo URL */
  logo?: string;
  /** Business image URL */
  image?: string;
  /** Telephone number */
  telephone?: string;
  /** Email address */
  email?: string;
  /** Price range indicator */
  priceRange?: string;
  /** Aggregate rating data - CRITICAL for stars */
  aggregateRating?: LocalBusinessRating;
  /** Recent reviews - helps with rich snippets */
  reviews?: LocalBusinessReview[];
  /** Opening hours specification */
  openingHours?: string[];
  /** Is open 24/7 */
  is24x7?: boolean;
  /** Supported payment methods */
  paymentAccepted?: string[];
  /** Currencies accepted */
  currenciesAccepted?: string[];
  /** Languages spoken */
  availableLanguages?: string[];
  /** Service area */
  areaServed?: string[];
  /** Founding date */
  foundingDate?: string;
  /** Social media profiles */
  sameAs?: string[];
}

/**
 * Generates LocalBusiness JSON-LD schema with AggregateRating
 * Essential for Google Rich Snippets with stars
 *
 * @example
 * <LocalBusinessSchema
 *   aggregateRating={{
 *     ratingValue: 4.9,
 *     ratingCount: 127,
 *     reviewCount: 127
 *   }}
 * />
 */
const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({
  name = 'SOS Expat & Travelers',
  description = 'Service d\'assistance juridique et conseil pour expatriés et voyageurs - Consultations en ligne avec avocats et experts dans 197 pays. Disponible 24/7.',
  businessType = 'ProfessionalService',
  url = 'https://sos-expat.com',
  logo = 'https://sos-expat.com/sos-logo.webp',
  image = 'https://sos-expat.com/og-image.jpg',
  telephone,
  email = '',
  priceRange = '€€',
  aggregateRating,
  reviews = [],
  openingHours,
  is24x7 = true,
  paymentAccepted = ['Credit Card', 'Debit Card', 'PayPal', 'Stripe'],
  currenciesAccepted = ['EUR', 'USD', 'GBP'],
  availableLanguages = ['French', 'English', 'Spanish', 'German', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Chinese'],
  areaServed = ['Worldwide'],
  foundingDate = '2024',
  sameAs = [
    'https://facebook.com/sosexpat',
    'https://twitter.com/sosexpat',
    'https://linkedin.com/company/sosexpat',
    'https://www.instagram.com/sosexpat'
  ]
}) => {
  const schema = useMemo(() => {
    const baseUrl = url.replace(/\/$/, '');

    const localBusinessSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': businessType,
      '@id': `${baseUrl}/#localbusiness`,
      name,
      description,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: logo,
        width: 512,
        height: 512
      },
      image,
      priceRange,
      foundingDate,
      sameAs,

      // Contact information
      ...(telephone && { telephone }),
      ...(email && { email }),

      // Area served
      areaServed: areaServed.map(area => ({
        '@type': area === 'Worldwide' ? 'GeoShape' : 'Country',
        name: area
      })),

      // Service languages
      availableLanguage: availableLanguages.map(lang => ({
        '@type': 'Language',
        name: lang
      })),

      // Payment methods
      paymentAccepted,
      currenciesAccepted,

      // Opening hours
      openingHoursSpecification: is24x7
        ? {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '00:00',
            closes: '23:59'
          }
        : openingHours?.map(hours => {
            const [day, time] = hours.split(' ');
            const [opens, closes] = time?.split('-') || ['09:00', '18:00'];
            return {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: day,
              opens,
              closes
            };
          }),

      // Contact points
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: availableLanguages,
          ...(email && { email }),
          ...(telephone && { telephone })
        }
      ],

      // Knows about (expertise)
      knowsAbout: [
        'Expatriation',
        'Legal assistance',
        'Immigration law',
        'International relocation',
        'Visa assistance',
        'Document translation',
        'Emergency legal help'
      ]
    };

    // CRITICAL: Add AggregateRating for Google Stars
    // Both ratingCount AND reviewCount must be > 0 (Google requirement)
    if (aggregateRating && aggregateRating.ratingCount > 0 && aggregateRating.reviewCount > 0) {
      localBusinessSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toFixed(1),
        ratingCount: aggregateRating.ratingCount,
        reviewCount: aggregateRating.reviewCount,
        bestRating: aggregateRating.bestRating || 5,
        worstRating: aggregateRating.worstRating || 1
      };
    }

    // Add recent reviews if available
    if (reviews && reviews.length > 0) {
      localBusinessSchema.review = reviews.slice(0, 10).map(review => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: review.author
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1
        },
        reviewBody: review.reviewBody,
        datePublished: review.datePublished
      }));
    }

    return localBusinessSchema;
  }, [
    name, description, businessType, url, logo, image, telephone, email,
    priceRange, aggregateRating, reviews, openingHours, is24x7,
    paymentAccepted, currenciesAccepted, availableLanguages, areaServed,
    foundingDate, sameAs
  ]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
};

export default LocalBusinessSchema;

/**
 * Generate LocalBusiness schema object for embedding
 */
export const generateLocalBusinessSchema = (
  props: Partial<LocalBusinessSchemaProps> = {}
): Record<string, unknown> => {
  const {
    name = 'SOS Expat & Travelers',
    url = 'https://sos-expat.com',
    logo = 'https://sos-expat.com/sos-logo.webp',
    aggregateRating,
    reviews = []
  } = props;

  const baseUrl = url.replace(/\/$/, '');

  return {
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#localbusiness`,
    name,
    url: baseUrl,
    logo,
    // Both ratingCount AND reviewCount must be > 0 (Google requirement)
    ...(aggregateRating && aggregateRating.ratingCount > 0 && aggregateRating.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue.toFixed(1),
        ratingCount: aggregateRating.ratingCount,
        reviewCount: aggregateRating.reviewCount,
        bestRating: 5,
        worstRating: 1
      }
    }),
    ...(reviews.length > 0 && {
      review: reviews.slice(0, 5).map(r => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.reviewBody,
        datePublished: r.datePublished
      }))
    })
  };
};
