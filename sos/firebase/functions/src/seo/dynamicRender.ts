/**
 * Dynamic Rendering Cloud Function for SEO
 *
 * Renders pages dynamically for search engine bots (Google, Bing, AI bots)
 * using Puppeteer. Used for dynamic content pages like provider profiles.
 *
 * @author SOS Expat Team
 * @version 1.0.0
 */

import * as functions from 'firebase-functions/v1';
import type { Request, Response } from 'express';
import type { Change } from 'firebase-functions';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

// Lazy-loaded modules to avoid deployment timeout
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any = null;

// Configuration
const SITE_URL = 'https://sos-expat.com';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RENDER_TIMEOUT_MS = 30000; // 30 seconds for page load
const WAIT_FOR_READY_TIMEOUT_MS = 10000; // 10 seconds to wait for React

// In-memory cache for rendered HTML
const htmlCache = new Map<string, { html: string; timestamp: number }>();

/**
 * List of bot user-agents to detect
 * Includes search engines and AI crawlers
 */
const BOT_USER_AGENTS = [
  // Search engine bots
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',           // Yahoo
  'sogou',
  'exabot',
  'facebot',
  'ia_archiver',     // Internet Archive

  // Social media bots
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'pinterestbot',

  // AI/LLM bots
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'anthropic-ai',
  'perplexitybot',
  'cohere-ai',
  'youbot',
  'amazonbot',

  // SEO tools
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'screaming frog',

  // Other
  'applebot',
  'ccbot',
  'petalbot',
];

/**
 * Check if the user-agent belongs to a bot
 */
function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

/**
 * Get cached HTML if available and not expired
 */
function getCachedHtml(path: string): string | null {
  const cached = htmlCache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.html;
  }
  return null;
}

/**
 * Store HTML in cache
 */
function cacheHtml(path: string, html: string): void {
  htmlCache.set(path, { html, timestamp: Date.now() });

  // Clean old entries (keep cache under 100 entries)
  if (htmlCache.size > 100) {
    const entries = Array.from(htmlCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20 entries
    for (let i = 0; i < 20; i++) {
      htmlCache.delete(entries[i][0]);
    }
  }
}

/**
 * Render a page using Puppeteer
 */
async function renderPage(url: string): Promise<string> {
  // Lazy load puppeteer and chromium to avoid deployment timeout
  if (!puppeteer) {
    puppeteer = await import('puppeteer-core');
  }
  if (!chromium) {
    const chromiumModule = await import('@sparticuz/chromium');
    chromium = chromiumModule.default;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

  try {
    // Launch browser with chromium binary
    const execPath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: execPath,
      headless: true,
    });

    const page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: RENDER_TIMEOUT_MS,
    });

    // Wait for React to finish rendering
    try {
      await page.waitForSelector('[data-react-snap-ready="true"]', {
        timeout: WAIT_FOR_READY_TIMEOUT_MS,
      });
    } catch {
      // If the selector doesn't appear, wait a bit more
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Get the rendered HTML
    const html = await page.content();

    return html;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main Cloud Function for dynamic rendering
 *
 * This function:
 * 1. Detects if the request is from a bot
 * 2. If not a bot, redirects to the normal SPA
 * 3. If a bot, renders the page with Puppeteer and returns the HTML
 * 4. Caches rendered HTML for 24 hours
 */
export const renderForBots = functions
  .region('europe-west1')
  .runWith({
    memory: '1GB',
    timeoutSeconds: 60,
  })
  .https.onRequest(async (req: Request, res: Response) => {
    // Helper to get first value from header (can be string or string[])
    const getHeader = (name: string): string => {
      const val = req.headers[name];
      return Array.isArray(val) ? val[0] : (val || '');
    };
    const getQuery = (name: string): string => {
      const val = req.query[name];
      if (Array.isArray(val)) return String(val[0] || '');
      if (typeof val === 'object') return '';
      return val || '';
    };

    const userAgent = getHeader('user-agent') || getHeader('x-original-ua');
    // Support both query params (from Cloudflare Worker) and direct path
    const requestPath = getQuery('path') || req.path || '/';
    const fullUrl = getQuery('url') || `${SITE_URL}${requestPath}`;
    const botName = getHeader('x-bot-name') || getQuery('bot');

    // Determine if request is from a bot (via UA or explicit header from Worker)
    const isBotRequest = isBot(userAgent) || !!botName;

    // Log for debugging
    functions.logger.info('Dynamic render request', {
      path: requestPath,
      fullUrl,
      userAgent: userAgent.substring(0, 100),
      botName,
      isBot: isBotRequest,
    });

    // If not a bot, redirect to the normal site
    if (!isBotRequest) {
      res.redirect(302, fullUrl);
      return;
    }

    // Check cache first
    const cachedHtml = getCachedHtml(requestPath);
    if (cachedHtml) {
      functions.logger.info('Serving cached HTML', { path: requestPath });
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('X-Prerender-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.send(cachedHtml);
      return;
    }

    try {
      // Render the page
      functions.logger.info('Rendering page with Puppeteer', { url: fullUrl });
      const html = await renderPage(fullUrl);

      // Cache the result
      cacheHtml(requestPath, html);

      // Return the rendered HTML
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('X-Prerender-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.send(html);

      functions.logger.info('Page rendered successfully', { path: requestPath });
    } catch (error) {
      functions.logger.error('Error rendering page', { path: requestPath, error });

      // On error, redirect to the normal site
      // Bots will see the JS-rendered version which is better than nothing
      res.redirect(302, fullUrl);
    }
  });

/**
 * Invalidate cache when a provider profile is updated
 *
 * This trigger clears the cache for all language versions of a provider's profile
 * when their data changes in Firestore.
 */
export const invalidateProviderCache = functions
  .region('europe-west1')
  .firestore.document('providers/{providerId}')
  .onUpdate(async (change: Change<DocumentSnapshot>) => {
    const afterData = change.after.data();
    const slug = afterData?.slug;

    if (!slug) {
      return;
    }

    // List of all locale prefixes to invalidate
    const locales = [
      'fr-fr', 'fr-be', 'fr-ch', 'fr-ca', 'fr-ma',
      'en-us', 'en-gb', 'en-au', 'en-ca',
      'es-es', 'es-mx', 'es-ar',
      'de-de', 'de-at', 'de-ch',
      'pt-pt', 'pt-br',
      'ru-ru',
      'zh-cn', 'zh-tw',
      'ar-sa', 'ar-ae',
      'hi-in',
    ];

    // Clear cache for all locale versions
    let clearedCount = 0;
    for (const locale of locales) {
      // Try common patterns for provider URLs
      const patterns = [
        `/${locale}/avocat/${slug}`,
        `/${locale}/lawyers/${slug}`,
        `/${locale}/expat/${slug}`,
        `/${locale}/expats/${slug}`,
        `/${locale}/abogados/${slug}`,
        `/${locale}/advogados/${slug}`,
        `/${locale}/anwaelte/${slug}`,
      ];

      for (const pattern of patterns) {
        if (htmlCache.has(pattern)) {
          htmlCache.delete(pattern);
          clearedCount++;
        }
      }
    }

    if (clearedCount > 0) {
      functions.logger.info('Invalidated provider cache', {
        providerId: change.after.id,
        slug,
        clearedEntries: clearedCount,
      });
    }
  });

/**
 * Manual cache invalidation endpoint
 *
 * Use this to clear specific paths from the cache.
 * Protected by Firebase Functions admin authentication.
 */
export const invalidateCache = functions
  .region('europe-west1')
  .https.onCall(async (data: { path?: string; clearAll?: boolean }, context: functions.https.CallableContext) => {
    // Require admin authentication
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can invalidate cache'
      );
    }

    const { path, clearAll } = data;

    if (clearAll) {
      const size = htmlCache.size;
      htmlCache.clear();
      return { success: true, message: `Cleared all ${size} cache entries` };
    }

    if (path) {
      const deleted = htmlCache.delete(path);
      return {
        success: true,
        message: deleted
          ? `Cleared cache for ${path}`
          : `No cache entry found for ${path}`,
      };
    }

    return { success: false, message: 'Provide either path or clearAll=true' };
  });
