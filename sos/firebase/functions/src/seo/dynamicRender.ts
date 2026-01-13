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
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import type { Request, Response } from 'express';

// Define secret for cache invalidation authentication
const CACHE_INVALIDATION_KEY = defineSecret('CACHE_INVALIDATION_KEY');

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
    memory: '2GiB',
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

    // Check cache first
    const cachedHtml = getCachedHtml(requestPath);
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
 * Invalidate cache for specific paths or patterns
 * Used when content is updated (profile, blog, etc.)
 */
export function invalidateCache(pathPattern?: string): number {
  if (!pathPattern) {
    // Clear all cache
    const size = htmlCache.size;
    htmlCache.clear();
    logger.info('Cache cleared completely', { entriesRemoved: size });
    return size;
  }

  // Clear entries matching pattern
  let removed = 0;
  for (const [path] of htmlCache) {
    if (path.includes(pathPattern)) {
      htmlCache.delete(path);
      removed++;
    }
  }
  logger.info('Cache invalidated for pattern', { pattern: pathPattern, entriesRemoved: removed });
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
      for (const path of paths) {
        if (htmlCache.has(path)) {
          htmlCache.delete(path);
          totalRemoved++;
        }
      }
    }

    logger.info('Cache invalidation completed', { totalRemoved, paths, pattern, clearAll });
    res.json({ success: true, entriesRemoved: totalRemoved });
  }
);
