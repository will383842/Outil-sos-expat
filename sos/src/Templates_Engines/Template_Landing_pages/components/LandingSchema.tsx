/**
 * ============================================================================
 * LANDING SCHEMA - Données structurées Schema.org
 * ============================================================================
 *
 * Génère tous les JSON-LD nécessaires pour le SEO :
 * - WebPage
 * - FAQPage
 * - BreadcrumbList
 * - HowTo
 * - Service
 * - Organization
 * - AggregateRating
 */

import React, { memo, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import type { LandingData } from '../types';
import { SEO } from '../lib/constants';

export interface LandingSchemaProps {
  data: LandingData;
}

/**
 * Composant pour injecter les données structurées Schema.org
 */
export const LandingSchema = memo<LandingSchemaProps>(({ data }) => {
  const {
    seo,
    routing,
    breadcrumbs,
    sections,
    eeat,
    schema: schemaConfig,
    targeting,
  } = data;

  // WebPage Schema
  const webPageSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${routing.canonicalUrl}#webpage`,
    url: routing.canonicalUrl,
    name: seo.metaTitle,
    description: seo.metaDescription,
    inLanguage: routing.language,
    isPartOf: {
      '@id': `${SEO.baseUrl}/#website`,
    },
    about: {
      '@id': `${SEO.baseUrl}/#organization`,
    },
    datePublished: data.timestamps?.publishedAt,
    dateModified: data.timestamps?.updatedAt,
  }), [routing, seo, data.timestamps]);

  // FAQPage Schema (if FAQ section exists)
  const faqSchema = useMemo(() => {
    if (!sections.faq?.items?.length) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: sections.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answerShort || item.answer,
        },
      })),
    };
  }, [sections.faq]);

  // BreadcrumbList Schema
  const breadcrumbSchema = useMemo(() => {
    if (!breadcrumbs?.length) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb) => ({
        '@type': 'ListItem',
        position: crumb.position,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }, [breadcrumbs]);

  // HowTo Schema (if process section exists)
  const howToSchema = useMemo(() => {
    if (!sections.howItWorks?.steps?.length) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: sections.howItWorks.title,
      description: sections.howItWorks.intro || seo.metaDescription,
      totalTime: sections.howItWorks.totalTime,
      step: sections.howItWorks.steps.map((step) => ({
        '@type': 'HowToStep',
        position: step.number,
        name: step.title,
        text: step.description,
      })),
    };
  }, [sections.howItWorks, seo.metaDescription]);

  // Service Schema
  const serviceSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${routing.canonicalUrl}/#service`,
    name: targeting?.specialty?.name || seo.title,
    description: seo.metaDescription,
    url: routing.canonicalUrl,
    provider: {
      '@type': 'Organization',
      '@id': `${SEO.baseUrl}/#organization`,
      name: SEO.siteName,
    },
    areaServed: targeting?.country ? {
      '@type': 'Country',
      name: targeting.country.nameEn || targeting.country.nameFr,
    } : {
      '@type': 'Place',
      name: 'Worldwide',
    },
    ...(sections.testimonials?.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: sections.testimonials.aggregateRating.ratingValue.toFixed(1),
        ratingCount: sections.testimonials.aggregateRating.ratingCount,
        bestRating: sections.testimonials.aggregateRating.bestRating,
        worstRating: sections.testimonials.aggregateRating.worstRating,
      },
    }),
  }), [routing, targeting, seo, sections.testimonials]);

  // Organization Schema
  const organizationSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SEO.baseUrl}/#organization`,
    name: SEO.siteName,
    url: SEO.baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: SEO.logoUrl,
      width: 512,
      height: 512,
    },
    ...(eeat?.experience && {
      foundingDate: new Date().getFullYear() - (eeat.experience.yearsInBusiness || 0),
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: 50,
      },
    }),
  }), [eeat]);

  // Speakable Schema (for voice assistants)
  const speakableSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${routing.canonicalUrl}#speakable`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#hero-title', '[data-speakable="true"]'],
    },
  }), [routing.canonicalUrl]);

  return (
    <Helmet>
      {/* WebPage */}
      <script type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </script>

      {/* FAQ */}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}

      {/* Breadcrumbs */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}

      {/* HowTo */}
      {howToSchema && (
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>
      )}

      {/* Service */}
      <script type="application/ld+json">
        {JSON.stringify(serviceSchema)}
      </script>

      {/* Organization */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>

      {/* Speakable */}
      <script type="application/ld+json">
        {JSON.stringify(speakableSchema)}
      </script>
    </Helmet>
  );
});

LandingSchema.displayName = 'LandingSchema';
