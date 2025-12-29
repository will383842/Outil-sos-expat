/**
 * Utility functions for sitemap generation
 */

import { SitemapUrl, StaticRoute } from './types';
import { SITE_URL, ROUTE_TRANSLATIONS } from './constants';

/**
 * Get translated route slug for a language
 */
export function getTranslatedRouteSlug(routeKey: string, lang: string): string {
  return ROUTE_TRANSLATIONS[routeKey]?.[lang] || routeKey;
}

/**
 * Generate locale string (e.g., "en-us", "fr-fr")
 */
export function getLocaleString(lang: string, country: string): string {
  return `${lang}-${country.toLowerCase()}`;
}

/**
 * Normalize country name to URL slug
 */
export function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate URL for a route in a specific locale
 */
export function generateRouteUrl(route: StaticRoute, lang: string, country: string): string {
  const locale = getLocaleString(lang, country);
  let path = route.path;
  
  if (route.translated) {
    const slug = getTranslatedRouteSlug(route.translated, lang);
    // Replace the first segment with translated slug
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      segments[0] = slug;
      path = '/' + segments.join('/');
    }
  }
  
  return `${SITE_URL}/${locale}${path}`;
}

/**
 * Generate provider profile URL
 */
export function generateProviderUrl(
  providerData: {
    id: string;
    type?: string;
    country?: string;
    languages?: string[];
    fullName?: string;
    name?: string;
    slug?: string;
  },
  lang: string,
  country: string
): string {
  // Get translated route slug based on language
  const routeKey = providerData.type === 'lawyer' ? 'lawyer' : 'expat';
  const type = getTranslatedRouteSlug(routeKey, lang) || (providerData.type === 'lawyer' ? 'avocat' : 'expatrie');
  
  // Use translated slug if available, otherwise generate from name
  const nameSlug = providerData.slug || (providerData.fullName || providerData.name || 'expert')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  
  // Append ID only if slug doesn't already contain it
  const finalSlug = nameSlug.includes(providerData.id) ? nameSlug : `${nameSlug}-${providerData.id}`;
  
  const locale = getLocaleString(lang, country);
  // Simplified URL structure: /{locale}/{type}/{slug}
  return `${SITE_URL}/${locale}/${type}/${finalSlug}`;
}

/**
 * Generate XML for a sitemap
 */
export function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls.map(url => {
    let xml = '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    
    if (url.alternates && url.alternates.length > 0) {
      url.alternates.forEach(alt => {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}" />\n`;
      });
    }
    
    xml += '  </url>\n';
    return xml;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}</urlset>`;
}

/**
 * Generate sitemap index XML
 */
export function generateSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const sitemapEntries = sitemaps.map(sitemap => {
    let xml = '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
    return xml;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}</sitemapindex>`;
}

/**
 * Escape XML special characters
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


