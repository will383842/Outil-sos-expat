/**
 * SOS Expat - Cloudflare Worker for Bot Detection and SSR Redirect
 *
 * This worker intercepts requests and:
 * 1. Detects bot user-agents (search engines, social media crawlers, AI bots)
 * 2. For bots visiting provider profile URLs, redirects to Firebase Cloud Function for SSR
 * 3. For regular users, passes the request through to the origin (Digital Ocean)
 */

// Firebase Cloud Function URL for server-side rendering
const SSR_FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2';

// Comprehensive list of bot user-agents to detect
const BOT_USER_AGENTS = [
  // Search Engine Crawlers
  'googlebot',
  'google-inspectiontool',
  'google-safety',
  'googleother',
  'google-extended',
  'bingbot',
  'bingpreview',
  'msnbot',
  'yandexbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',           // Yahoo
  'sogou',
  'exabot',
  'ia_archiver',     // Alexa
  'archive.org_bot',
  'qwantify',
  'ecosia',
  'petalbot',        // Huawei/Aspiegel
  'seznam',
  'naver',
  'coccoc',
  'applebot',

  // Social Media Crawlers
  'facebookexternalhit',
  'facebookcatalog',
  'facebook',
  'twitterbot',
  'linkedinbot',
  'linkedin',
  'pinterest',
  'pinterestbot',
  'slackbot',
  'slack-imgproxy',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'viber',
  'line-poker',
  'snapchat',
  'redditbot',
  'tumblr',
  'skypeuripreview',

  // AI/LLM Crawlers
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'gemini',
  'bard',
  'meta-externalagent',
  'meta-externalfetcher',
  'bytespider',      // TikTok/ByteDance
  'amazonbot',
  'ccbot',           // Common Crawl (used for AI training)
  'diffbot',
  'omgili',
  'omgilibot',

  // SEO/Analytics Tools
  'ahrefs',
  'ahrefsbot',
  'semrush',
  'semrushbot',
  'mj12bot',         // Majestic
  'dotbot',          // Moz
  'rogerbot',        // Moz
  'screaming frog',
  'seokicks',
  'sistrix',
  'blexbot',
  'megaindex',
  'serpstatbot',
  'dataforseo',
  'zoominfobot',

  // Preview/Rendering Bots
  'prerender',
  'headlesschrome',
  'chrome-lighthouse',
  'lighthouse',
  'pagespeed',
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'site24x7',

  // RSS/Feed Readers
  'feedfetcher',
  'feedly',
  'newsblur',
  'inoreader',

  // Other Bots
  'bot',
  'crawler',
  'spider',
  'scraper',
  'wget',
  'curl',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'java/',
  'apache-httpclient',
  'libwww-perl',
  'php/',
  'ruby',
  'node-fetch',
  'axios',
];

// URL patterns that need SSR/Prerendering for bots
// Includes: provider profiles, blog/help articles, landing pages, key static pages

// Blog/Help Center patterns (all 9 languages)
const BLOG_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+$/i,      // French
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+$/i,      // English
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfe-center\/[^\/]+$/i,     // German
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/[^\/]+$/i,     // German alt
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/[^\/]+$/i,     // Spanish
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/[^\/]+$/i,     // Portuguese
  /^\/[a-z]{2}(-[a-z]{2})?\/centr-pomoshi\/[^\/]+$/i,    // Russian
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/[^\/]+$/i, // Chinese
  /^\/[a-z]{2}(-[a-z]{2})?\/markaz-almusaeada\/[^\/]+$/i,// Arabic
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/[^\/]+$/i,  // Hindi
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+$/i,             // Generic blog
];

// Landing pages and key static pages that need prerendering
const LANDING_PAGE_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/?$/i,                        // Homepage per locale
  /^\/[a-z]{2}(-[a-z]{2})?\/tarifs\/?$/i,                // Pricing FR
  /^\/[a-z]{2}(-[a-z]{2})?\/pricing\/?$/i,               // Pricing EN
  /^\/[a-z]{2}(-[a-z]{2})?\/preise\/?$/i,                // Pricing DE
  /^\/[a-z]{2}(-[a-z]{2})?\/precios\/?$/i,               // Pricing ES
  /^\/[a-z]{2}(-[a-z]{2})?\/comment-ca-marche\/?$/i,     // How it works FR
  /^\/[a-z]{2}(-[a-z]{2})?\/how-it-works\/?$/i,          // How it works EN
  /^\/[a-z]{2}(-[a-z]{2})?\/wie-es-funktioniert\/?$/i,   // How it works DE
  /^\/[a-z]{2}(-[a-z]{2})?\/como-funciona\/?$/i,         // How it works ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/faq\/?$/i,                   // FAQ
  /^\/[a-z]{2}(-[a-z]{2})?\/temoignages\/?$/i,           // Testimonials FR
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonials\/?$/i,          // Testimonials EN
  /^\/[a-z]{2}(-[a-z]{2})?\/contact\/?$/i,               // Contact
  /^\/[a-z]{2}(-[a-z]{2})?\/kontakt\/?$/i,               // Contact DE
  /^\/[a-z]{2}(-[a-z]{2})?\/contacto\/?$/i,              // Contact ES
  /^\/[a-z]{2}(-[a-z]{2})?\/contato\/?$/i,               // Contact PT
  /^\/[a-z]{2}(-[a-z]{2})?\/prestataires\/?$/i,          // Providers list FR
  /^\/[a-z]{2}(-[a-z]{2})?\/providers\/?$/i,             // Providers list EN
  /^\/[a-z]{2}(-[a-z]{2})?\/anbieter\/?$/i,              // Providers list DE
  /^\/[a-z]{2}(-[a-z]{2})?\/proveedores\/?$/i,           // Providers list ES
  /^\/[a-z]{2}(-[a-z]{2})?\/sos-appel\/?$/i,             // SOS Call FR
  /^\/[a-z]{2}(-[a-z]{2})?\/emergency-call\/?$/i,        // SOS Call EN
  /^\/[a-z]{2}(-[a-z]{2})?\/notruf\/?$/i,                // SOS Call DE
  // Legal pages (important for SEO)
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-clients\/?$/i,           // Terms clients FR
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-avocats\/?$/i,           // Terms lawyers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-expatries\/?$/i,         // Terms expats FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-clients\/?$/i,         // Terms clients EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-lawyers\/?$/i,         // Terms lawyers EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-expats\/?$/i,          // Terms expats EN
  /^\/[a-z]{2}(-[a-z]{2})?\/politique-confidentialite\/?$/i, // Privacy FR
  /^\/[a-z]{2}(-[a-z]{2})?\/privacy-policy\/?$/i,        // Privacy EN
  /^\/[a-z]{2}(-[a-z]{2})?\/datenschutzrichtlinie\/?$/i, // Privacy DE
  /^\/[a-z]{2}(-[a-z]{2})?\/cookies\/?$/i,               // Cookies all langs
  /^\/[a-z]{2}(-[a-z]{2})?\/consommateurs\/?$/i,         // Consumers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/consumers\/?$/i,             // Consumers EN
];

// URL patterns for provider profile pages
// Matches patterns like:
// - /fr-fr/avocat-thailande/julien-abc123
// - /en-us/lawyer-thailand/john-xyz789
// - /de-de/anwalt-frankreich/hans-def456
// Structure: /{locale}/{role}-{country}/{name-id}
const PROVIDER_PROFILE_PATTERNS = [
  // French patterns (supports: /fr-fr/avocat-thailande/nom-id)
  /^\/[a-z]{2}-[a-z]{2}\/avocat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notaire-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expert-comptable-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/medecin-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologue-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/conseiller-fiscal-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/agent-immobilier-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/traducteur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/assureur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatrie-[a-z]+\/[^\/]+$/i,

  // English patterns
  /^\/[a-z]{2}-[a-z]{2}\/lawyer-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notary-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/accountant-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/doctor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologist-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tax-advisor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/real-estate-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/translator-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/insurance-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expat-[a-z]+\/[^\/]+$/i,

  // Spanish patterns
  /^\/[a-z]{2}-[a-z]{2}\/abogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/contador-[a-z]+\/[^\/]+$/i,

  // German patterns
  /^\/[a-z]{2}-[a-z]{2}\/anwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/rechtsanwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/steuerberater-[a-z]+\/[^\/]+$/i,

  // Portuguese patterns
  /^\/[a-z]{2}-[a-z]{2}\/advogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatriado-[a-z]+\/[^\/]+$/i,

  // Russian patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/advokat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yurist-[a-z]+\/[^\/]+$/i,

  // Chinese patterns (romanized pinyin)
  /^\/[a-z]{2}-[a-z]{2}\/lushi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/haiwai-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/kuaiji-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yisheng-[a-z]+\/[^\/]+$/i,

  // Arabic patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/muhami-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/wafid-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/muhasib-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tabib-[a-z]+\/[^\/]+$/i,

  // Hindi patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/vakil-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/videshi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/lekhaakar-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/chikitsak-[a-z]+\/[^\/]+$/i,

  // Generic pattern for provider profiles with ID
  /^\/[a-z]{2}-[a-z]{2}\/provider\/[a-zA-Z0-9_-]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/prestataire\/[a-zA-Z0-9_-]+$/i,

  // Fallback: catch any profile URL with 3-segment structure (locale/role-country/name)
  /^\/[a-z]{2}-[a-z]{2}\/[a-z]+-[a-z]+\/[^\/]+$/i,
];

/**
 * Check if the user-agent belongs to a bot
 * @param {string} userAgent - The User-Agent header value
 * @returns {boolean} - True if the request is from a bot
 */
function isBot(userAgent) {
  if (!userAgent) return false;

  const lowerUA = userAgent.toLowerCase();

  return BOT_USER_AGENTS.some(bot => lowerUA.includes(bot.toLowerCase()));
}

/**
 * Check if the URL path matches a provider profile pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a provider profile pattern
 */
function isProviderProfilePath(pathname) {
  return PROVIDER_PROFILE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a blog/help article pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a blog pattern
 */
function isBlogPath(pathname) {
  return BLOG_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a landing page pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a landing page pattern
 */
function isLandingPagePath(pathname) {
  return LANDING_PAGE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path needs SSR/Prerendering
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path needs prerendering for bots
 */
function needsPrerendering(pathname) {
  return isProviderProfilePath(pathname) || isBlogPath(pathname) || isLandingPagePath(pathname);
}

/**
 * Extract bot name from user-agent for logging
 * @param {string} userAgent - The User-Agent header value
 * @returns {string} - The detected bot name or 'unknown'
 */
function getBotName(userAgent) {
  if (!userAgent) return 'unknown';

  const lowerUA = userAgent.toLowerCase();

  for (const bot of BOT_USER_AGENTS) {
    if (lowerUA.includes(bot.toLowerCase())) {
      return bot;
    }
  }

  return 'unknown';
}

/**
 * Main request handler
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>} - The response
 */
async function handleRequest(request, env, ctx) {
  // Force log to confirm Worker is running
  console.log(`[WORKER ENTRY] Request received: ${request.url}`);

  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const pathname = url.pathname;

  console.log(`[WORKER DEBUG] UA: ${userAgent.substring(0, 50)}, Path: ${pathname}`);

  // Check if this is a bot AND visiting a page that needs prerendering
  const botDetected = isBot(userAgent);
  const needsSSR = needsPrerendering(pathname);

  if (botDetected && needsSSR) {
    const botName = getBotName(userAgent);

    console.log(`[SOS Expat Bot Detection] Bot: ${botName}, Path: ${pathname}`);

    try {
      // Build the SSR URL with the original path
      const ssrUrl = new URL(SSR_FUNCTION_URL);
      ssrUrl.searchParams.set('path', pathname);
      ssrUrl.searchParams.set('url', request.url);
      ssrUrl.searchParams.set('bot', botName);

      // Fetch from the Cloud Function
      const ssrResponse = await fetch(ssrUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'X-Original-URL': request.url,
          'X-Bot-Name': botName,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': url.protocol.replace(':', ''),
          'X-Forwarded-Host': url.host,
          'Accept': 'text/html',
          'Accept-Language': request.headers.get('Accept-Language') || 'en',
        },
      });

      // Clone the response and add custom headers
      const newHeaders = new Headers(ssrResponse.headers);
      newHeaders.set('X-Rendered-By', 'sos-expat-ssr');
      newHeaders.set('X-Bot-Detected', botName);

      // Ensure proper caching headers for bots
      if (!newHeaders.has('Cache-Control')) {
        newHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      }

      return new Response(ssrResponse.body, {
        status: ssrResponse.status,
        statusText: ssrResponse.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      console.error(`[SOS Expat Bot Detection] Error fetching SSR: ${error.message}`);

      // On error, fall back to origin
      return fetch(request);
    }
  }

  // For non-bots or non-SSR pages, pass through to origin
  const originResponse = await fetch(request);
  const newHeaders = new Headers(originResponse.headers);
  newHeaders.set('X-Worker-Active', 'true');
  newHeaders.set('X-Worker-Bot-Detected', botDetected ? 'true' : 'false');
  newHeaders.set('X-Worker-SSR-Match', needsSSR ? 'true' : 'false');
  newHeaders.set('X-Worker-Path', pathname);

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: newHeaders,
  });
}

// Export for Cloudflare Workers
export default {
  fetch: handleRequest,
};

// Also export for module workers format
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, {}, {}));
});
