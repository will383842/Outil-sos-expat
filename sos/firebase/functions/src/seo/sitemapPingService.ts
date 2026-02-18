/**
 * Sitemap Ping Service - Notifie Google/Bing du sitemap mis à jour
 * 100% GRATUIT et ILLIMITÉ
 */

// fetch is available natively in Node.js 22 - no import needed

const SITEMAP_URL = 'https://sos-expat.com/sitemap.xml';

interface PingResult {
  engine: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Ping Google avec le sitemap
 */
async function pingGoogle(): Promise<PingResult> {
  try {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(url, { method: 'GET' });
    
    return {
      engine: 'Google',
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      engine: 'Google',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Ping Bing avec le sitemap
 */
async function pingBing(): Promise<PingResult> {
  try {
    const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const response = await fetch(url, { method: 'GET' });
    
    return {
      engine: 'Bing',
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      engine: 'Bing',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Ping tous les moteurs de recherche
 */
export async function pingSitemap(): Promise<PingResult[]> {
  console.log('🔔 Ping Sitemap: Notification des moteurs de recherche...');
  
  const results = await Promise.all([
    pingGoogle(),
    pingBing(),
  ]);

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.engine}: Sitemap ping réussi`);
    } else {
      console.log(`❌ ${result.engine}: Ping échoué - ${result.error || result.statusCode}`);
    }
  });

  return results;
}

/**
 * Ping spécifique pour un sitemap custom
 */
export async function pingCustomSitemap(sitemapUrl: string): Promise<PingResult[]> {
  console.log(`🔔 Ping Sitemap: ${sitemapUrl}`);
  
  const results = await Promise.all([
    (async () => {
      try {
        const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const response = await fetch(url, { method: 'GET' });
        return { engine: 'Google', success: response.ok, statusCode: response.status };
      } catch (error: any) {
        return { engine: 'Google', success: false, error: error.message };
      }
    })(),
    (async () => {
      try {
        const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
        const response = await fetch(url, { method: 'GET' });
        return { engine: 'Bing', success: response.ok, statusCode: response.status };
      } catch (error: any) {
        return { engine: 'Bing', success: false, error: error.message };
      }
    })(),
  ]);

  return results;
}