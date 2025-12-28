/**
 * Level 2 Sitemap Generator
 * Generates sitemaps by country (all languages for that country)
 */

import { SitemapUrl } from '../types';
import { STATIC_ROUTES, LANGUAGES } from '../constants';
import { generateRouteUrl, generateProviderUrl, generateSitemapXml, countryToSlug } from '../utils';
import { ProviderData } from '../language-country/generator';

/**
 * Generate Level 2 sitemap (by country, all languages)
 */
export function generateLevel2Sitemap(
  countryName: string,
  providers: ProviderData[]
): string {
  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Add static routes for all languages
  for (const lang of LANGUAGES) {
    for (const route of STATIC_ROUTES) {
      const url = generateRouteUrl(route, lang.code, lang.country);
      urls.push({
        loc: url,
        lastmod: now,
        changefreq: route.changefreq,
        priority: route.priority,
      });
    }
  }
  
  // Add provider profiles for all languages
  const countrySlug = countryToSlug(countryName);
  const countryProviders = providers.filter(p => {
    return countryToSlug(p.country || '') === countrySlug;
  });
  
  for (const provider of countryProviders) {
    for (const lang of LANGUAGES) {
      const url = generateProviderUrl(provider, lang.code, lang.country);
      const updatedAt = provider.updatedAt instanceof Date 
        ? provider.updatedAt 
        : provider.updatedAt?.toDate?.() || new Date();
      
      urls.push({
        loc: url,
        lastmod: updatedAt.toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7,
      });
    }
  }
  
  return generateSitemapXml(urls);
}

/**
 * Generate filename for Level 2 sitemap
 */
export function getLevel2Filename(countryName: string): string {
  const countrySlug = countryToSlug(countryName);
  return `sitemap-country-${countrySlug}.xml.gz`;
}

/**
 * Get path for Level 2 sitemap in dist folder
 */
export function getLevel2Path(countryName: string): string {
  return `country/${getLevel2Filename(countryName)}`;
}


