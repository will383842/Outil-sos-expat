/**
 * IndexNow Service - Indexation instantanée Bing/Yandex
 * 100% GRATUIT et ILLIMITÉ
 */

// fetch is available natively in Node.js 22 - no import needed

const INDEXNOW_KEY = 'sosexpat2025indexnowkey';
const SITE_HOST = 'sos-expat.com';
const SITE_URL = `https://${SITE_HOST}`;

// Map language to default country code (must match frontend localeRoutes.ts and sitemaps.ts)
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
};

const LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'];

/**
 * Get locale string in format "lang-country" (e.g., "fr-fr", "hi-in")
 * Chinese: internal code is 'ch' but URL should use 'zh' (ISO 639-1 standard)
 */
function getLocaleString(lang: string): string {
  const country = LANGUAGE_TO_COUNTRY[lang] || lang;
  const urlLang = lang === 'ch' ? 'zh' : lang;
  return `${urlLang}-${country}`;
}

interface IndexNowResult {
  success: boolean;
  urls: string[];
  statusCode?: number;
  error?: string;
}

/**
 * Soumet une ou plusieurs URLs à IndexNow
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return { success: true, urls: [] };
  }

  const batch = urls.slice(0, 10000);

  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: batch,
  };

  try {
    console.log(`🔔 IndexNow: Soumission de ${batch.length} URL(s)...`);

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.status;

    if (statusCode === 200 || statusCode === 202) {
      console.log(`✅ IndexNow: ${batch.length} URL(s) soumise(s) avec succès`);
      return {
        success: true,
        urls: batch,
        statusCode,
      };
    }

    const errorMessages: Record<number, string> = {
      400: 'Format invalide',
      403: 'Clé invalide ou ne correspond pas au host',
      422: 'URLs invalides',
      429: 'Trop de requêtes (rate limited)',
    };

    const error = errorMessages[statusCode] || `HTTP ${statusCode}`;
    console.error(`❌ IndexNow: ${error}`);

    return {
      success: false,
      urls: batch,
      statusCode,
      error,
    };
  } catch (error: any) {
    console.error('❌ IndexNow: Erreur réseau:', error.message);
    return {
      success: false,
      urls: batch,
      error: error.message,
    };
  }
}

/**
 * Soumet une seule URL à IndexNow
 */
export async function submitSingleUrl(url: string): Promise<IndexNowResult> {
  return submitToIndexNow([url]);
}

/**
 * Génère les URLs pour un article de blog (9 langues)
 * Format: /{locale}/blog/{slug} (e.g., /fr-fr/blog/mon-article)
 */
export function generateBlogUrls(slug: string): string[] {
  return LANGUAGES.map(lang => {
    const locale = getLocaleString(lang);
    return `${SITE_URL}/${locale}/blog/${slug}`;
  });
}

/**
 * Génère les URLs pour une landing page (9 langues)
 * Format: /{locale}/{slug} (e.g., /fr-fr/my-landing)
 */
export function generateLandingUrls(slug: string): string[] {
  return LANGUAGES.map(lang => {
    const locale = getLocaleString(lang);
    return `${SITE_URL}/${locale}/${slug}`;
  });
}

/**
 * Génère les URLs pour un FAQ (9 langues)
 * Format: /{locale}/faq/{slug} (e.g., /fr-fr/faq/mon-faq)
 */
export function generateFaqUrls(slug: string): string[] {
  return LANGUAGES.map(lang => {
    const locale = getLocaleString(lang);
    return `${SITE_URL}/${locale}/faq/${slug}`;
  });
}