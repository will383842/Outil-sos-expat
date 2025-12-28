/**
 * Auto-Submit Module
 * Automatically submits sitemaps to search engines
 */

import { SITE_URL } from '../constants';

export interface SubmissionResult {
  engine: string;
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Submit sitemap to search engines
 */
export async function submitSitemapToSearchEngines(
  sitemapPath: string
): Promise<SubmissionResult[]> {
  const sitemapUrl = `${SITE_URL}/sitemaps/${sitemapPath}`;
  
  const engines = [
    {
      name: 'Google',
      url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
    {
      name: 'Bing',
      url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
    {
      name: 'Yandex',
      url: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
  ];
  
  const results: SubmissionResult[] = [];
  
  for (const engine of engines) {
    try {
      const response = await fetch(engine.url);
      if (response.ok) {
        results.push({
          engine: engine.name,
          success: true,
          status: response.status,
        });
      } else {
        results.push({
          engine: engine.name,
          success: false,
          status: response.status,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      results.push({
        engine: engine.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  return results;
}


