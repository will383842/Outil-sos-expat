/**
 * BreadcrumbSchema Component
 * Generates JSON-LD structured data for BreadcrumbList
 *
 * @see https://schema.org/BreadcrumbList
 * @see https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 */

import React, { useMemo } from 'react';

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

/**
 * Generates BreadcrumbList JSON-LD schema
 *
 * @example
 * <BreadcrumbSchema
 *   items={[
 *     { name: 'Accueil', url: '/' },
 *     { name: 'FAQ', url: '/faq' },
 *     { name: 'Comment fonctionne SOS-Expat ?' }
 *   ]}
 * />
 */
const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({
  items,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com'
}) => {
  const schema = useMemo(() => {
    if (!items || items.length === 0) return null;

    const itemListElement = items.map((item, index) => {
      const itemUrl = item.url
        ? (item.url.startsWith('http') ? item.url : `${baseUrl}${item.url.startsWith('/') ? item.url : `/${item.url}`}`)
        : undefined;

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(itemUrl && { item: itemUrl })
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement
    };
  }, [items, baseUrl]);

  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default BreadcrumbSchema;

/**
 * Helper function to generate breadcrumb items for common page types
 */
export const generateBreadcrumbs = {
  /**
   * FAQ page breadcrumbs
   */
  faq: (homeLabel: string, faqLabel: string): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: faqLabel }
  ],

  /**
   * FAQ detail page breadcrumbs
   */
  faqDetail: (
    homeLabel: string,
    faqLabel: string,
    questionTitle: string,
    faqSlug?: string
  ): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: faqLabel, url: '/faq' },
    { name: questionTitle, ...(faqSlug && { url: `/faq/${faqSlug}` }) }
  ],

  /**
   * Help article breadcrumbs
   */
  helpArticle: (
    homeLabel: string,
    helpCenterLabel: string,
    categoryName: string,
    articleTitle: string,
    categorySlug?: string
  ): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: helpCenterLabel, url: '/centre-aide' },
    { name: categoryName, ...(categorySlug && { url: `/centre-aide/${categorySlug}` }) },
    { name: articleTitle }
  ],

  /**
   * Blog article breadcrumbs
   */
  blogArticle: (
    homeLabel: string,
    blogLabel: string,
    articleTitle: string
  ): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: blogLabel, url: '/blog' },
    { name: articleTitle }
  ],

  /**
   * Provider profile breadcrumbs
   */
  providerProfile: (
    homeLabel: string,
    sosCallLabel: string,
    providerName: string
  ): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: sosCallLabel, url: '/sos-appel' },
    { name: providerName }
  ],

  /**
   * Country page breadcrumbs
   */
  countryPage: (
    homeLabel: string,
    countryName: string,
    countryCode: string
  ): BreadcrumbItem[] => [
    { name: homeLabel, url: '/' },
    { name: countryName, url: `/${countryCode}` }
  ]
};
