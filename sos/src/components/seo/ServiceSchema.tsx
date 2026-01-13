/**
 * ServiceSchema Component
 *
 * Generates JSON-LD structured data for Service schema.
 * Used for the pricing page and service descriptions.
 *
 * @see https://schema.org/Service
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface ServiceOffer {
  /** Service name */
  name: string;
  /** Service description */
  description: string;
  /** Price amount */
  price: number;
  /** Currency code (EUR, USD, etc.) */
  priceCurrency: string;
  /** Duration in ISO 8601 format (e.g., "PT20M" for 20 minutes) */
  duration?: string;
  /** Service category */
  category?: string;
}

export interface ServiceSchemaProps {
  /** Main service name */
  serviceName: string;
  /** Main service description */
  serviceDescription: string;
  /** List of service offers */
  offers: ServiceOffer[];
  /** Service URL */
  url?: string;
  /** Image URL */
  image?: string;
}

/**
 * Generate Service schema object
 */
export function generateServiceSchema(props: ServiceSchemaProps): object {
  const {
    serviceName,
    serviceDescription,
    offers,
    url = 'https://sos-expat.com',
    image,
  } = props;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description: serviceDescription,
    provider: {
      '@type': 'Organization',
      name: 'SOS Expat',
      url: 'https://sos-expat.com',
      logo: 'https://sos-expat.com/sos-logo.webp',
    },
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide',
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceType: 'Online and Phone',
      availableLanguage: [
        { '@type': 'Language', name: 'French', alternateName: 'fr' },
        { '@type': 'Language', name: 'English', alternateName: 'en' },
        { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
        { '@type': 'Language', name: 'German', alternateName: 'de' },
        { '@type': 'Language', name: 'Portuguese', alternateName: 'pt' },
        { '@type': 'Language', name: 'Russian', alternateName: 'ru' },
        { '@type': 'Language', name: 'Chinese', alternateName: 'zh' },
        { '@type': 'Language', name: 'Arabic', alternateName: 'ar' },
        { '@type': 'Language', name: 'Hindi', alternateName: 'hi' },
      ],
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services SOS Expat',
      itemListElement: offers.map((offer, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: offer.name,
          description: offer.description,
          ...(offer.category && { serviceType: offer.category }),
        },
        price: offer.price,
        priceCurrency: offer.priceCurrency,
        priceValidUntil: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0],
        availability: 'https://schema.org/InStock',
        ...(offer.duration && { duration: offer.duration }),
      })),
    },
    url: url,
  };

  if (image) {
    schema.image = image;
  }

  return schema;
}

/**
 * ServiceSchema component for pricing and service pages
 */
const ServiceSchema: React.FC<ServiceSchemaProps> = (props) => {
  const schema = generateServiceSchema(props);

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ServiceSchema;
