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
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RENDER_TIMEOUT_MS = 30000; // 30 seconds for page load
const WAIT_FOR_READY_TIMEOUT_MS = 10000; // 10 seconds to wait for React

// Firestore collection for persistent SSR cache (survives cold starts)
const SSR_CACHE_COLLECTION = 'ssr_cache';

// L1: In-memory cache (fast, same instance — lost on cold start)
const memoryCache = new Map<string, { html: string; timestamp: number }>();

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
 * Render a page using Puppeteer
 */
async function renderPage(url: string): Promise<string> {
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

    // Navigate to the page - use networkidle2 to wait for async data loading
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: RENDER_TIMEOUT_MS,
    });

    // Wait for React to finish rendering - try multiple selectors
    try {
      // Wait for either the profile content, not-found state, or a ready marker
      await Promise.race([
        page.waitForSelector('[data-react-snap-ready="true"]', { timeout: WAIT_FOR_READY_TIMEOUT_MS }),
        page.waitForSelector('[data-provider-loaded="true"]', { timeout: WAIT_FOR_READY_TIMEOUT_MS }),
        page.waitForSelector('[data-provider-not-found="true"]', { timeout: WAIT_FOR_READY_TIMEOUT_MS }),
        page.waitForSelector('.provider-profile-name', { timeout: WAIT_FOR_READY_TIMEOUT_MS }),
        page.waitForSelector('h1', { timeout: WAIT_FOR_READY_TIMEOUT_MS }),
      ]);
    } catch {
      // If no selector appears, wait longer for dynamic content
      logger.info('No ready selector found, waiting for dynamic content...');
      await new Promise(resolve => setTimeout(resolve, 8000));
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
export const renderForBotsV2 = onRequest(
  {
    region: 'europe-west1',
    memory: '1GiB',  // FIX: Puppeteer uses 525-590 MiB at runtime, 512MiB causes recurrent OOM
    cpu: 0.5,  // memory > 256MiB requires cpu >= 0.5
    timeoutSeconds: 120,
    minInstances: 0,
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
    const cachedHtml = await getCachedHtml(requestPath);
    if (cachedHtml) {
      logger.info('Serving cached HTML', { path: requestPath });
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.set('X-Prerender-Cache', 'HIT');
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.send(cachedHtml);
      return;
    }

    try {
      // Render the page
      logger.info('Rendering page with Puppeteer', { url: fullUrl });
      const html = await renderPage(fullUrl);

      // Cache the result
      cacheHtml(requestPath, html);

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
        // L1
        if (memoryCache.has(p)) {
          memoryCache.delete(p);
          totalRemoved++;
        }
        // L2 (fire-and-forget)
        const docId = pathToDocId(p);
        admin.firestore().collection(SSR_CACHE_COLLECTION).doc(docId).delete().catch(() => {});
      }
    }

    logger.info('Cache invalidation completed', { totalRemoved, paths, pattern, clearAll });
    res.json({ success: true, entriesRemoved: totalRemoved });
  }
);
