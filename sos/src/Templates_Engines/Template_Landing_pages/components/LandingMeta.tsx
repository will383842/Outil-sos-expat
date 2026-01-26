/**
 * ============================================================================
 * LANDING META - Meta tags SEO
 * ============================================================================
 *
 * Génère tous les meta tags nécessaires :
 * - Title, description, keywords
 * - Open Graph
 * - Twitter Cards
 * - Hreflang
 * - Canonical
 */

import React, { memo, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import type { LandingData } from '../types';
import { SEO } from '../lib/constants';

export interface LandingMetaProps {
  data: LandingData;
}

// Mapping langue -> locale OG
const OG_LOCALES: Record<string, string> = {
  fr: 'fr_FR',
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  pt: 'pt_BR',
  ru: 'ru_RU',
  zh: 'zh_CN',
  ar: 'ar_SA',
  hi: 'hi_IN',
};

/**
 * Composant pour injecter les meta tags SEO
 */
export const LandingMeta = memo<LandingMetaProps>(({ data }) => {
  const { seo, routing, targeting, timestamps } = data;

  const ogLocale = useMemo(() =>
    OG_LOCALES[routing.language] || 'en_US',
    [routing.language]
  );

  const direction = targeting?.language?.direction || 'ltr';

  return (
    <Helmet>
      {/* HTML attributes */}
      <html lang={routing.language} dir={direction} />

      {/* Primary Meta Tags */}
      <title>{seo.metaTitle}</title>
      <meta name="title" content={seo.metaTitle} />
      <meta name="description" content={seo.metaDescription} />
      <meta name="keywords" content={seo.keywords?.join(', ')} />
      <meta name="author" content={SEO.siteName} />

      {/* Robots */}
      <meta name="robots" content={seo.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      <meta name="googlebot" content={seo.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />

      {/* Language & Locale */}
      <meta name="language" content={routing.language} />
      <meta httpEquiv="Content-Language" content={routing.locale} />

      {/* Canonical */}
      <link rel="canonical" href={routing.canonicalUrl} />

      {/* Hreflang */}
      {routing.hreflang?.map((entry) => (
        <link
          key={entry.lang}
          rel="alternate"
          hrefLang={entry.lang}
          href={entry.url}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={SEO.baseUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={seo.ogType || 'website'} />
      <meta property="og:url" content={seo.ogUrl || routing.canonicalUrl} />
      <meta property="og:site_name" content={SEO.siteName} />
      <meta property="og:title" content={seo.ogTitle || seo.metaTitle} />
      <meta property="og:description" content={seo.ogDescription || seo.metaDescription} />
      <meta property="og:image" content={seo.ogImage || SEO.ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={seo.ogTitle || seo.metaTitle} />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={seo.twitterCard || 'summary_large_image'} />
      <meta name="twitter:url" content={routing.canonicalUrl} />
      <meta name="twitter:title" content={seo.twitterTitle || seo.metaTitle} />
      <meta name="twitter:description" content={seo.twitterDescription || seo.metaDescription} />
      <meta name="twitter:image" content={seo.twitterImage || seo.ogImage || SEO.ogImageUrl} />
      <meta name="twitter:site" content={SEO.twitterHandle} />
      <meta name="twitter:creator" content={SEO.twitterHandle} />

      {/* Additional Meta */}
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Dates */}
      {timestamps?.publishedAt && (
        <meta property="article:published_time" content={timestamps.publishedAt} />
      )}
      {timestamps?.updatedAt && (
        <meta property="article:modified_time" content={timestamps.updatedAt} />
      )}

      {/* Geographic */}
      {targeting?.country && (
        <>
          <meta name="geo.region" content={targeting.country.code?.toUpperCase()} />
          <meta name="geo.placename" content={targeting.country.nameEn || targeting.country.nameFr} />
        </>
      )}

      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
    </Helmet>
  );
});

LandingMeta.displayName = 'LandingMeta';
