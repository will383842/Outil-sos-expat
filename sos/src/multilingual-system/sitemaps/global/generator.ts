/**
 * Level 3 Sitemap Generator
 * Generates the global sitemap index file
 */

import { generateSitemapIndexXml } from '../utils';
import { SITE_URL } from '../constants';

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

/**
 * Generate Level 3 sitemap index
 */

export function generateLevel3SitemapIndex(
  level1Sitemaps: SitemapIndexEntry[],
  level2Sitemaps: SitemapIndexEntry[]
): string {
  const allSitemaps = [...level1Sitemaps, ...level2Sitemaps];
  return generateSitemapIndexXml(allSitemaps);
}

/**
 * Generate filename for Level 3 sitemap index
 */
export function getLevel3Filename(): string {
  return 'sitemap-index.xml.gz';
}

/**
 * Get path for Level 3 sitemap index in dist folder
 */
export function getLevel3Path(): string {
  return `global/${getLevel3Filename()}`;
}

/**
 * Generate sitemap URL for index entry
 */
export function getSitemapUrl(path: string): string {
  return `${SITE_URL}/sitemaps/${path}`;
}


