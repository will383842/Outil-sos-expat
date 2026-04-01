/**
 * Dynamic Rendering Cloud Function for SEO
 *
 * Renders pages dynamically for search engine bots (Google, Bing, AI bots)
 * using Puppeteer. Used for dynamic content pages like provider profiles.
 *
 * @author SOS Expat Team
 * @version 1.0.0
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { CACHE_INVALIDATION_KEY } from '../lib/secrets';

// Secret for cache invalidation authentication
// Imported from lib/secrets.ts

// Lazy-loaded modules to avoid deployment timeout
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any = null;

// Configuration
const SITE_URL = 'https://sos-expat.com';
const HOLIDAYS_SITE_URL = 'https://sos-holidays.com';
// Cloudflare Pages origin — Puppeteer renders via this to bypass the Cloudflare Worker
// and avoid the Worker→CF→Worker round-trip. Domain is replaced back to SITE_URL in the HTML.
const PAGES_ORIGIN = 'https://sos-expat.pages.dev';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RENDER_TIMEOUT_MS = 45000; // 45 seconds for page load (Firestore SDK cold start can be slow)
const WAIT_FOR_READY_TIMEOUT_MS = 10000; // 10 seconds to wait for React

/**
 * Extract locale from URL path and return the matching Accept-Language header.
 * This ensures Puppeteer renders the page in the correct language,
 * preventing mixed-language meta tags in Google search results.
 */
const LANG_TO_ACCEPT_LANGUAGE: Record<string, string> = {
  fr: 'fr-FR,fr;q=0.9,en;q=0.1',
  en: 'en-US,en;q=0.9',
  es: 'es-ES,es;q=0.9,en;q=0.1',
  de: 'de-DE,de;q=0.9,en;q=0.1',
  pt: 'pt-PT,pt;q=0.9,en;q=0.1',
  ru: 'ru-RU,ru;q=0.9,en;q=0.1',
  zh: 'zh-CN,zh;q=0.9,en;q=0.1',
  ar: 'ar-SA,ar;q=0.9,en;q=0.1',
  hi: 'hi-IN,hi;q=0.9,en;q=0.1',
};

function extractLocaleFromPath(path: string): { lang: string; locale: string } {
  const match = path.match(/^\/([a-z]{2})-([a-z]{2})(\/|$)/);
  if (match) {
    return { lang: match[1], locale: `${match[1]}-${match[2]}` };
  }
  return { lang: 'fr', locale: 'fr-fr' }; // Default fallback
}

// Firestore collection for persistent SSR cache (survives cold starts)
const SSR_CACHE_COLLECTION = 'ssr_cache';

// L1: In-memory cache (fast, same instance — lost on cold start)
const memoryCache = new Map<string, { html: string; timestamp: number }>();

/**
 * List of bot user-agents to detect
 * Includes search engines and AI crawlers
 */
const BOT_USER_AGENTS = [
  // Google bots (complete list)
  'googlebot',
  'googlebot-mobile',
  'googlebot-image',
  'googlebot-news',
  'googlebot-video',
  'adsbot-google',
  'adsbot-google-mobile',
  'mediapartners-google',
  'apis-google',
  'google-inspectiontool',
  'google-safety',
  'storebot-google',
  'googleother',
  'google-extended',
  'feedfetcher-google',

  // Other search engine bots
  'bingbot',
  'bingpreview',
  'msnbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',           // Yahoo
  'sogou',
  'exabot',
  'ia_archiver',     // Internet Archive

  // Social media bots
  'facebookexternalhit',
  'facebot',
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
  'oai-searchbot',
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
 * Encode a URL path into a safe Firestore document ID.
 * Firestore doc IDs cannot contain '/' so we replace them.
 */
function pathToDocId(path: string): string {
  return encodeURIComponent(path).replace(/\./g, '%2E');
}

/**
 * L1+L2 cache read: memory first, then Firestore.
 * Populates L1 from L2 on hit for subsequent fast reads.
 */
async function getCachedHtml(path: string): Promise<string | null> {
  const now = Date.now();

  // L1: Check in-memory cache
  const mem = memoryCache.get(path);
  if (mem && now - mem.timestamp < CACHE_DURATION_MS) {
    return mem.html;
  }

  // L2: Check Firestore persistent cache
  try {
    const docId = pathToDocId(path);
    const doc = await admin.firestore().collection(SSR_CACHE_COLLECTION).doc(docId).get();
    if (doc.exists) {
      const data = doc.data() as { html: string; timestamp: number; path: string } | undefined;
      if (data && now - data.timestamp < CACHE_DURATION_MS) {
        // Promote to L1 for fast subsequent reads
        memoryCache.set(path, { html: data.html, timestamp: data.timestamp });
        return data.html;
      }
    }
  } catch (err) {
    // Firestore read failure is non-fatal — fall through to render
    logger.warn('Firestore cache read failed', { path, error: (err as Error).message });
  }

  return null;
}

/**
 * L1+L2 cache write: store in both memory and Firestore.
 * Firestore write is fire-and-forget (non-blocking).
 */
function cacheHtml(path: string, html: string): void {
  const now = Date.now();

  // L1: In-memory
  memoryCache.set(path, { html, timestamp: now });

  // Evict oldest L1 entries if over limit
  if (memoryCache.size > 100) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 20; i++) {
      memoryCache.delete(entries[i][0]);
    }
  }

  // L2: Firestore (fire-and-forget — don't await)
  const docId = pathToDocId(path);
  admin.firestore().collection(SSR_CACHE_COLLECTION).doc(docId).set({
    path,
    html,
    timestamp: now,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((err) => {
    logger.warn('Firestore cache write failed', { path, error: (err as Error).message });
  });
}

/**
 * Render a page using Puppeteer.
 *
 * Navigates via Cloudflare Pages origin (PAGES_ORIGIN) to bypass the
 * Cloudflare Worker entirely. This avoids:
 *   - Worker→Puppeteer→Worker round-trip (was not a loop, but added latency)
 *   - Any redirect logic in the Worker that could interfere
 *
 * After rendering, all references to the Pages origin domain are replaced
 * with the public SITE_URL so that canonical, og:url, hreflang etc. point
 * to the correct production domain.
 */
async function renderPage(url: string): Promise<{ html: string; is404: boolean }> {
  // Lazy load puppeteer and chromium to avoid deployment timeout
  logger.info('Loading Puppeteer modules...');
  if (!puppeteer) {
    puppeteer = await import('puppeteer-core');
    logger.info('Puppeteer loaded');
  }
  if (!chromium) {
    const chromiumModule = await import('@sparticuz/chromium');
    chromium = chromiumModule.default;
    logger.info('Chromium loaded');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;

  try {
    // Launch browser with chromium binary
    logger.info('Getting Chromium executable path...');
    const execPath = await chromium.executablePath();
    logger.info('Chromium path:', { execPath });

    logger.info('Launching browser...');
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
      executablePath: execPath,
      headless: true,
    });
    logger.info('Browser launched successfully');

    const page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // SEO FIX: Set Accept-Language header based on URL locale.
    // Without this, Puppeteer defaults to English which causes mixed-language
    // meta tags in Google search results (e.g., French title + English description).
    const { lang: urlLang } = extractLocaleFromPath(new URL(url).pathname);
    const acceptLanguage = LANG_TO_ACCEPT_LANGUAGE[urlLang] || LANG_TO_ACCEPT_LANGUAGE['fr'];
    await page.setExtraHTTPHeaders({
      'Accept-Language': acceptLanguage,
    });
    logger.info('Set Puppeteer Accept-Language', { urlLang, acceptLanguage });

    // Block analytics/tracking scripts to prevent false hits from server IP (europe-west1 = Belgium)
    // Without this, every Puppeteer render creates a fake "Belgian visitor" in GA4/Meta
    await page.setRequestInterception(true);
    page.on('request', (req: { url: () => string; abort: () => void; continue: () => void }) => {
      const reqUrl = req.url();
      if (
        reqUrl.includes('google-analytics.com') ||
        reqUrl.includes('googletagmanager.com/gtag') ||
        reqUrl.includes('googletagmanager.com/gtm.js') ||
        reqUrl.includes('facebook.com/tr') ||
        reqUrl.includes('connect.facebook.net') ||
        reqUrl.includes('sentry.io') ||
        reqUrl.includes('googleadservices.com') ||
        reqUrl.includes('doubleclick.net')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate via Pages origin to bypass the Cloudflare Worker.
    // Replace the public domain with the Pages origin domain.
    // For holidays URLs, add ?_holidays=1 so client-side isHolidaysDomain() returns true.
    const isHolidaysUrl = url.includes('sos-holidays.com');
    let renderUrl = isHolidaysUrl
      ? url.replace(HOLIDAYS_SITE_URL, PAGES_ORIGIN)
      : url.replace(SITE_URL, PAGES_ORIGIN);

    if (isHolidaysUrl) {
      const renderUrlObj = new URL(renderUrl);
      renderUrlObj.searchParams.set('_holidays', '1');
      renderUrl = renderUrlObj.toString();
    }
    logger.info('Navigating Puppeteer to Pages origin', { original: url, renderUrl, isHolidaysUrl });

    await page.goto(renderUrl, {
      waitUntil: 'networkidle2', // 2 connections allowed (Firebase WebSocket stays open)
      timeout: RENDER_TIMEOUT_MS,
    });

    // Wait for React to finish rendering - two-phase approach:
    // Phase 1: Wait for app mount (fast, confirms React is running)
    // Phase 2: Wait for page-specific content (provider data, 404 state, or static page)
    try {
      // Phase 1: Wait for React app to mount
      await page.waitForSelector('[data-react-snap-ready="true"]', { timeout: WAIT_FOR_READY_TIMEOUT_MS });

      // Phase 2: Wait for actual page content to load
      // Provider profiles need up to 15s for Firestore data (shortId query + profile data)
      // Static pages have no async data, so we check for provider markers first
      const PHASE2_TIMEOUT = 20000; // 20 seconds for provider data (Firestore SDK cold start)
      try {
        await Promise.race([
          page.waitForSelector('[data-provider-loaded="true"]', { timeout: PHASE2_TIMEOUT }),
          page.waitForSelector('[data-provider-not-found="true"]', { timeout: PHASE2_TIMEOUT }),
          page.waitForSelector('[data-page-not-found="true"]', { timeout: PHASE2_TIMEOUT }),
          page.waitForSelector('[data-article-loaded="true"]', { timeout: PHASE2_TIMEOUT }),
        ]);
      } catch {
        // No provider marker found within 15s — this is a static page or slow-loading profile
        // Wait 1 more second for any remaining React renders
        logger.info('Phase 2: No provider marker found, assuming static page');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch {
      // If no selector appears, wait longer for dynamic content
      logger.info('No ready selector found, waiting for dynamic content...');
      await new Promise(resolve => setTimeout(resolve, 8000));
    }

    // Get the rendered HTML
    let html = await page.content();

    // Detect 404 pages: check for NotFound component or provider-not-found marker
    // Note: page.evaluate runs in browser context where `document` exists
    let is404 = false;
    try {
      is404 = await page.evaluate(`
        !!(
          document.querySelector('[data-page-not-found="true"]') ||
          document.querySelector('[data-provider-not-found="true"]')
        )
      `) as boolean;
    } catch (evalError) {
      logger.warn('404 detection evaluate failed, assuming valid page', {
        error: (evalError as Error).message,
      });
    }

    // Replace Pages origin domain with the correct public domain in ALL rendered output.
    // This ensures canonical, og:url, hreflang, JSON-LD @id, breadcrumbs etc.
    // point to the correct production domain and not pages.dev.
    const targetDomain = isHolidaysUrl ? HOLIDAYS_SITE_URL : SITE_URL;
    html = html.split(PAGES_ORIGIN).join(targetDomain);
    // Remove the _holidays query param from rendered HTML (clean URLs)
    // Handles: ?_holidays=1, ?_holidays=1&foo, ?foo&_holidays=1, ?foo&_holidays=1&bar
    if (isHolidaysUrl) {
      html = html.replace(/([?&])_holidays=1(&?)/g,
        (_match: string, prefix: string, suffix: string) => {
          if (prefix === '?' && !suffix) return '';       // ?_holidays=1 (only param) → remove all
          if (prefix === '?' && suffix === '&') return '?'; // ?_holidays=1&foo → ?foo
          if (prefix === '&') return '';                    // &_holidays=1 or &_holidays=1& → remove
          return '';
        }
      );
    }

    return { html, is404 };
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
export const renderForBotsV2 = onRequest(
  {
    region: 'europe-west1',
    memory: '2GiB',  // FIX: 1GiB caused OOM (1056 MiB used). Puppeteer + Chromium peaks at ~1.0-1.1 GiB
    cpu: 1,  // memory > 1GiB requires cpu >= 1
    timeoutSeconds: 120,
    minInstances: 1,  // Avoid 8-12s Puppeteer cold start for bots
    maxInstances: 10,
  },
  async (req: Request, res: Response) => {
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

    // SECURITY FIX: Whitelist allowed domains to prevent SSRF via ?url= parameter
    const ALLOWED_HOSTS = ['sos-expat.com', 'www.sos-expat.com', 'sos-holidays.com', 'www.sos-holidays.com', 'sos-expat.pages.dev'];
    try {
      const parsedUrl = new URL(fullUrl);
      if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
        logger.warn('Dynamic render SSRF blocked', { fullUrl, hostname: parsedUrl.hostname });
        res.status(400).json({ error: 'Invalid domain' });
        return;
      }
    } catch {
      logger.warn('Dynamic render invalid URL', { fullUrl });
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    const isHolidays = fullUrl.includes('sos-holidays.com');

    // Determine if request is from a bot (via UA or explicit header from Worker)
    const isBotRequest = isBot(userAgent) || !!botName;

    // Log for debugging
    logger.info('Dynamic render request', {
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

    // Check cache first (L1 memory → L2 Firestore)
    // SEO FIX: Partition cache by locale to prevent serving wrong language content.
    // Previously, /fr-fr/tarifs and all other locale variants shared the same cache key,
    // so whichever language was rendered first was served to all bots.
    const { locale: pathLocale } = extractLocaleFromPath(requestPath);
    const cacheKey = isHolidays ? `holidays:${pathLocale}:${requestPath}` : `${pathLocale}:${requestPath}`;

    // x-cache-bypass: 1 → force re-render (used by SSR warming cron after deployments)
    // This ensures stale cached HTML with old Vite asset hashes gets replaced
    const forceRefresh = req.headers['x-cache-bypass'] === '1';

    if (!forceRefresh) {
      const cachedHtml = await getCachedHtml(cacheKey);
      if (cachedHtml) {
        logger.info('Serving cached HTML', { path: requestPath, isHolidays });
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('X-Prerender-Cache', 'HIT');
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
        res.send(cachedHtml);
        return;
      }
    }

    try {
      // Render the page
      logger.info('Rendering page with Puppeteer', { url: fullUrl });
      const { html, is404 } = await renderPage(fullUrl);

      if (is404) {
        // Return HTTP 404 for not-found pages — do NOT cache 404s
        logger.info('404 page detected, returning HTTP 404', { path: requestPath });
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('X-Render-Status', '404');
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour for 404s (shorter than 24h for valid pages)
        res.status(404).send(html);
        return;
      }

      // Cache the result (only for valid pages)
      cacheHtml(cacheKey, html);

      // Return the rendered HTML
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('X-Prerender-Cache', 'MISS');
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.send(html);

      logger.info('Page rendered successfully', { path: requestPath });
    } catch (error) {
      const err = error as Error;
      logger.error('Error rendering page', {
        path: requestPath,
        errorMessage: err.message,
        errorStack: err.stack,
        errorName: err.name,
      });

      // On error, redirect to the normal site
      // Bots will see the JS-rendered version which is better than nothing
      res.redirect(302, fullUrl);
    }
  });

/**
 * Invalidate cache for specific paths or patterns (L1 + L2).
 * L2 Firestore cleanup is async and best-effort.
 */
export function invalidateCache(pathPattern?: string): number {
  if (!pathPattern) {
    // Clear all L1
    const size = memoryCache.size;
    memoryCache.clear();

    // Clear all L2 (fire-and-forget batch delete)
    admin.firestore().collection(SSR_CACHE_COLLECTION).listDocuments()
      .then(async (docs) => {
        const batch = admin.firestore().batch();
        docs.forEach((doc) => batch.delete(doc));
        await batch.commit();
        logger.info('Firestore SSR cache cleared', { entriesRemoved: docs.length });
      })
      .catch((err) => logger.warn('Firestore cache clear failed', { error: (err as Error).message }));

    logger.info('Cache cleared completely', { l1EntriesRemoved: size });
    return size;
  }

  // Clear matching entries from L1
  let removed = 0;
  for (const [path] of memoryCache) {
    if (path.includes(pathPattern)) {
      memoryCache.delete(path);
      removed++;
    }
  }

  // Clear matching entries from L2 (fire-and-forget)
  // Use full collection scan + client-side filter (consistent with L1 includes() logic)
  // Safe: ssr_cache is small (max ~200 entries)
  admin.firestore().collection(SSR_CACHE_COLLECTION).get()
    .then(async (snapshot) => {
      if (snapshot.empty) return;
      const batch = admin.firestore().batch();
      let l2Removed = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as { path?: string };
        if (data.path && data.path.includes(pathPattern)) {
          batch.delete(doc.ref);
          l2Removed++;
        }
      });
      if (l2Removed > 0) {
        await batch.commit();
        logger.info('Firestore SSR cache invalidated', { pattern: pathPattern, entriesRemoved: l2Removed });
      }
    })
    .catch((err) => logger.warn('Firestore cache invalidation failed', { error: (err as Error).message }));

  logger.info('Cache invalidated for pattern', { pattern: pathPattern, l1EntriesRemoved: removed });
  return removed;
}

/**
 * HTTP endpoint to invalidate cache
 * Called by Firestore triggers when content is updated
 */
export const invalidateCacheEndpoint = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 5,
    secrets: [CACHE_INVALIDATION_KEY],
  },
  async (req: Request, res: Response) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Simple auth check via header (should match a secret)
    const authHeader = req.headers['x-cache-invalidation-key'];
    const expectedKey = process.env.CACHE_INVALIDATION_KEY;
    if (!expectedKey) {
      logger.error('[CacheInvalidation] CACHE_INVALIDATION_KEY not configured');
      res.status(500).json({ error: 'Cache invalidation not configured' });
      return;
    }

    if (authHeader !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { paths, pattern, clearAll } = req.body as {
      paths?: string[];
      pattern?: string;
      clearAll?: boolean;
    };

    let totalRemoved = 0;

    if (clearAll) {
      totalRemoved = invalidateCache();
    } else if (pattern) {
      totalRemoved = invalidateCache(pattern);
    } else if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        // Invalidate both expat and holidays cache entries for this path
        const variants = [p, `holidays:${p}`];
        for (const key of variants) {
          // L1
          if (memoryCache.has(key)) {
            memoryCache.delete(key);
            totalRemoved++;
          }
          // L2 (fire-and-forget)
          const docId = pathToDocId(key);
          admin.firestore().collection(SSR_CACHE_COLLECTION).doc(docId).delete().catch(() => {});
        }
      }
    }

    logger.info('Cache invalidation completed', { totalRemoved, paths, pattern, clearAll });
    res.json({ success: true, entriesRemoved: totalRemoved });
  }
);
