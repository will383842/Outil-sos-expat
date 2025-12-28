/**
 * Level 1 Sitemap Generator
 * Generates sitemaps by language-country (e.g., sitemap-fr-fr.xml, sitemap-en-us.xml)
 */

import { SitemapUrl, StaticRoute } from '../types';
import { STATIC_ROUTES, LANGUAGES } from '../constants';
import { generateRouteUrl, generateProviderUrl, generateSitemapXml } from '../utils';

export interface ProviderData {
  id: string;
  type?: string;
  country?: string;
  languages?: string[];
  fullName?: string;
  name?: string;
  updatedAt?: Date | { toDate?: () => Date };
}

/**
 * Generate Level 1 sitemap (by language-country)
 */
export function generateLevel1Sitemap(
  lang: string,
  country: string,
  providers: ProviderData[]
): string {
  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Add static routes
  for (const route of STATIC_ROUTES) {
    const url = generateRouteUrl(route, lang, country);
    urls.push({
      loc: url,
      lastmod: now,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }
  
  // Add provider profiles
  for (const provider of providers) {
    const url = generateProviderUrl(provider, lang, country);
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
  
  return generateSitemapXml(urls);
}

/**
 * Generate filename for Level 1 sitemap
 */
export function getLevel1Filename(lang: string, country: string): string {
  return `sitemap-${lang}-${country}.xml.gz`;
}

/**
 * Get path for Level 1 sitemap in dist folder
 */
export function getLevel1Path(lang: string, country: string): string {
  return `language-country/${getLevel1Filename(lang, country)}`;
}


