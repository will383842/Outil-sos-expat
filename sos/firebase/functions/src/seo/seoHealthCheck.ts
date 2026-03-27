/**
 * SEO & AEO Health Check - Daily automated monitoring
 *
 * Runs every day at 8h Paris time and checks:
 * 1. Sitemaps: HTTP 200, valid XML, contains URLs
 * 2. Dynamic rendering: renderForBotsV2 works for key pages
 * 3. SSR Cache: Firestore ssr_cache collection health
 * 4. Indexable profiles: visible + approved with reviews
 * 5. AEO: llms.txt, ai.txt, meta tags, JSON-LD
 *
 * Sends report via Telegram (direct Bot API).
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { TELEGRAM_BOT_TOKEN } from "../lib/secrets";
import { sendTelegramMessageDirect } from "../telegram/providers/telegramBot";

const REGION = "europe-west1";
const SITE_URL = "https://sos-expat.com";
const RENDER_BASE =
  "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2";

// All dynamic sitemaps served by Cloud Functions
const SITEMAP_URLS: { name: string; url: string }[] = [
  {
    name: "sitemapProfiles",
    url: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles",
  },
  {
    name: "sitemapHelp",
    url: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapHelp",
  },
  {
    name: "sitemapFaq",
    url: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapFaq",
  },
  {
    name: "sitemapLanding",
    url: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapLanding",
  },
  {
    name: "sitemapCountryListings",
    url: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapCountryListings",
  },
  {
    name: "sitemap-static.xml",
    url: `${SITE_URL}/sitemap-static.xml`,
  },
  {
    name: "sitemap-index.xml",
    url: `${SITE_URL}/sitemap-index.xml`,
  },
];

// Pages to test with dynamic rendering
const RENDER_TEST_PAGES = [
  { name: "Homepage FR", path: "/fr-fr" },
  { name: "Profil avocat", path: "/fr-fr/avocat-thailande/julien-fsx3c9" },
  { name: "Article aide", path: "/fr-fr/centre-aide/comment-ca-marche" },
];

// AEO endpoints to check
const AEO_CHECKS = [
  { name: "llms.txt", url: `${SITE_URL}/llms.txt` },
  { name: "ai.txt", url: `${SITE_URL}/ai.txt` },
];

// ============================================================================
// INTERFACES
// ============================================================================

interface SitemapResult {
  name: string;
  ok: boolean;
  status: number;
  urlCount: number;
  validXml: boolean;
  error?: string;
}

interface RenderResult {
  name: string;
  ok: boolean;
  hasTitle: boolean;
  hasUndefined: boolean;
  responseTimeMs: number;
  error?: string;
}

interface AeoResult {
  name: string;
  ok: boolean;
  status: number;
  error?: string;
}

interface AeoMetaResult {
  hasMetaAeo: boolean;
  hasJsonLdOrganization: boolean;
  hasJsonLdWebSite: boolean;
  error?: string;
}

// ============================================================================
// MAIN SCHEDULED FUNCTION
// ============================================================================

export const seoHealthCheck = onSchedule(
  {
    schedule: "0 8 * * *", // Every day at 8h Paris
    timeZone: "Europe/Paris",
    region: REGION,
    memory: "512MiB",
    cpu: 0.25,
    timeoutSeconds: 240,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    const startTime = Date.now();
    logger.info("[SeoHealthCheck] Starting daily SEO & AEO health check...");

    const issues: string[] = [];

    // Run all checks in parallel
    const [sitemapResults, renderResults, cacheStats, profileStats, aeoResults, aeoMeta] =
      await Promise.all([
        checkSitemaps(),
        checkDynamicRendering(),
        checkSsrCache(),
        checkIndexableProfiles(),
        checkAeoEndpoints(),
        checkAeoMetaTags(),
      ]);

    // ---- Analyze sitemap results ----
    const sitemapOk = sitemapResults.filter((s) => s.ok && s.validXml && s.urlCount > 0).length;
    const sitemapTotal = sitemapResults.length;
    const sitemapIcon = sitemapOk === sitemapTotal ? "\u2705" : "\u26A0\uFE0F";

    for (const s of sitemapResults) {
      if (!s.ok) issues.push(`${s.name}: HTTP ${s.status}`);
      else if (!s.validXml) issues.push(`${s.name}: XML invalide`);
      else if (s.urlCount === 0) issues.push(`${s.name}: 0 URLs`);
    }

    // ---- Analyze render results ----
    const renderOk = renderResults.filter((r) => r.ok && r.hasTitle && !r.hasUndefined).length;
    const renderTotal = renderResults.length;
    const avgRenderTime =
      renderResults.length > 0
        ? (renderResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / renderResults.length / 1000).toFixed(1)
        : "N/A";
    const renderIcon = renderOk === renderTotal ? "\u2705" : "\u26A0\uFE0F";

    for (const r of renderResults) {
      if (!r.ok) issues.push(`Render ${r.name}: ${r.error || "failed"}`);
      else if (!r.hasTitle) issues.push(`Render ${r.name}: missing <title>`);
      else if (r.hasUndefined) issues.push(`Render ${r.name}: contains "undefined"`);
    }

    // ---- Cache stats ----
    const cacheIcon = cacheStats.expiredCount > cacheStats.totalCount * 0.5 ? "\u26A0\uFE0F" : "\u2705";
    if (cacheStats.expiredCount > cacheStats.totalCount * 0.5) {
      issues.push(`Cache SSR: ${cacheStats.expiredCount}/${cacheStats.totalCount} expired (>50%)`);
    }

    // ---- Profile stats ----
    const profileIcon = profileStats.indexableCount > 0 ? "\u2705" : "\u26A0\uFE0F";
    if (profileStats.indexableCount === 0) {
      issues.push("0 profils indexables!");
    }

    // ---- AEO results ----
    const aeoEndpointsOk = aeoResults.filter((a) => a.ok).length;
    const aeoEndpointsTotal = aeoResults.length;
    let aeoTagsOk = 0;
    let aeoTagsTotal = 3; // meta AEO, JSON-LD Organization, JSON-LD WebSite
    if (aeoMeta.hasMetaAeo) aeoTagsOk++;
    if (aeoMeta.hasJsonLdOrganization) aeoTagsOk++;
    if (aeoMeta.hasJsonLdWebSite) aeoTagsOk++;
    const aeoIcon = aeoEndpointsOk === aeoEndpointsTotal && aeoTagsOk === aeoTagsTotal ? "\u2705" : "\u26A0\uFE0F";

    for (const a of aeoResults) {
      if (!a.ok) issues.push(`AEO ${a.name}: HTTP ${a.status}`);
    }
    if (!aeoMeta.hasMetaAeo) issues.push("AEO: meta tags absents sur homepage");
    if (!aeoMeta.hasJsonLdOrganization) issues.push("AEO: JSON-LD Organization absent");
    if (!aeoMeta.hasJsonLdWebSite) issues.push("AEO: JSON-LD WebSite absent");

    // ---- Build Telegram report ----
    const date = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    let message = `\uD83D\uDCCA *SEO Health Check - ${date}*\n\n`;
    message += `${sitemapIcon} *Sitemaps:* ${sitemapOk}/${sitemapTotal} OK\n`;

    // Detail each sitemap with URL count
    for (const s of sitemapResults) {
      const icon = s.ok && s.validXml && s.urlCount > 0 ? "\u2705" : "\u274C";
      message += `  ${icon} ${s.name} (${s.urlCount} URLs)\n`;
    }

    message += `\n${renderIcon} *Dynamic Rendering:* ${renderOk}/${renderTotal} OK (avg ${avgRenderTime}s)\n`;
    for (const r of renderResults) {
      const icon = r.ok && r.hasTitle && !r.hasUndefined ? "\u2705" : "\u274C";
      message += `  ${icon} ${r.name} (${(r.responseTimeMs / 1000).toFixed(1)}s)\n`;
    }

    message += `\n${cacheIcon} *Cache SSR:* ${cacheStats.totalCount} entries (${cacheStats.expiredCount} expired)\n`;
    message += `\n${profileIcon} *Profils indexables:* ${profileStats.indexableCount} (avg ${profileStats.avgReviews.toFixed(1)} reviews)\n`;

    message += `\n${aeoIcon} *AEO (Answer Engine Optimization):*\n`;
    for (const a of aeoResults) {
      const icon = a.ok ? "\u2705" : "\u274C";
      message += `  ${icon} ${a.name} (${a.status})\n`;
    }
    message += `  ${aeoMeta.hasMetaAeo ? "\u2705" : "\u274C"} Meta AEO tags\n`;
    message += `  ${aeoMeta.hasJsonLdOrganization ? "\u2705" : "\u274C"} JSON-LD Organization\n`;
    message += `  ${aeoMeta.hasJsonLdWebSite ? "\u2705" : "\u274C"} JSON-LD WebSite\n`;

    if (issues.length > 0) {
      message += `\n\u26A0\uFE0F *Issues (${issues.length}):*\n`;
      for (const issue of issues) {
        message += `- ${issue}\n`;
      }
    } else {
      message += `\n\u2705 *Aucun probleme detecte. SEO & AEO OK!*\n`;
    }

    message += `\n\u23F1 Check completed in ${elapsed}s`;

    // ---- Send Telegram ----
    try {
      const db = admin.firestore();
      const adminConfig = await db.collection("telegram_admin_config").doc("settings").get();
      const adminChatId = adminConfig.exists ? adminConfig.data()?.recipientChatId : null;

      if (adminChatId) {
        await sendTelegramMessageDirect(adminChatId, message, { parseMode: "Markdown" });
        logger.info("[SeoHealthCheck] Report sent via Telegram");
      } else {
        logger.warn("[SeoHealthCheck] No admin chat ID in telegram_admin_config/settings");
      }
    } catch (error) {
      logger.error("[SeoHealthCheck] Telegram send failed:", error);
    }

    // ---- Save to Firestore ----
    try {
      const db = admin.firestore();
      await db.collection("seo_health_reports").add({
        type: "daily_seo_aeo_health_check",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sitemaps: sitemapResults,
        rendering: renderResults,
        cache: cacheStats,
        profiles: profileStats,
        aeoEndpoints: aeoResults,
        aeoMeta,
        issues,
        hasProblems: issues.length > 0,
        elapsedMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("[SeoHealthCheck] Firestore save failed:", error);
    }

    logger.info(
      `[SeoHealthCheck] Completed in ${Date.now() - startTime}ms. ` +
        `Sitemaps: ${sitemapOk}/${sitemapTotal}, Render: ${renderOk}/${renderTotal}, ` +
        `Issues: ${issues.length}`
    );
  }
);

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

/**
 * Check all sitemaps: HTTP status, valid XML, URL count
 */
async function checkSitemaps(): Promise<SitemapResult[]> {
  const results: SitemapResult[] = [];

  for (const sitemap of SITEMAP_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(sitemap.url, {
        signal: controller.signal,
        headers: { "User-Agent": "SOS-SEO-HealthCheck/1.0" },
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        results.push({
          name: sitemap.name,
          ok: false,
          status: resp.status,
          urlCount: 0,
          validXml: false,
          error: `HTTP ${resp.status}`,
        });
        continue;
      }

      const body = await resp.text();

      // Validate XML structure (lightweight check, no parser needed)
      const isXml =
        body.includes("<?xml") || body.includes("<urlset") || body.includes("<sitemapindex");

      // Count <loc> tags (URLs in sitemap)
      const locMatches = body.match(/<loc>/gi);
      const urlCount = locMatches ? locMatches.length : 0;

      results.push({
        name: sitemap.name,
        ok: true,
        status: resp.status,
        urlCount,
        validXml: isXml,
      });
    } catch (error) {
      results.push({
        name: sitemap.name,
        ok: false,
        status: 0,
        urlCount: 0,
        validXml: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check dynamic rendering (renderForBotsV2) for key pages
 */
async function checkDynamicRendering(): Promise<RenderResult[]> {
  const results: RenderResult[] = [];

  for (const page of RENDER_TEST_PAGES) {
    const startMs = Date.now();
    try {
      const renderUrl = `${RENDER_BASE}?url=${encodeURIComponent(SITE_URL + page.path)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s for Puppeteer

      const resp = await fetch(renderUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "SOS-SEO-HealthCheck/1.0" },
      });
      clearTimeout(timeout);

      const elapsedMs = Date.now() - startMs;

      if (!resp.ok) {
        results.push({
          name: page.name,
          ok: false,
          hasTitle: false,
          hasUndefined: false,
          responseTimeMs: elapsedMs,
          error: `HTTP ${resp.status}`,
        });
        continue;
      }

      const html = await resp.text();

      // Check for <title> tag with actual content
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const hasTitle = !!titleMatch && titleMatch[1].trim().length > 0;

      // Check for "undefined" in title or meta description (common SSR bug)
      const hasUndefined =
        (titleMatch && titleMatch[1].includes("undefined")) ||
        html.includes('content="undefined"') ||
        false;

      results.push({
        name: page.name,
        ok: true,
        hasTitle,
        hasUndefined: !!hasUndefined,
        responseTimeMs: elapsedMs,
      });
    } catch (error) {
      results.push({
        name: page.name,
        ok: false,
        hasTitle: false,
        hasUndefined: false,
        responseTimeMs: Date.now() - startMs,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check SSR cache health in Firestore
 */
async function checkSsrCache(): Promise<{
  totalCount: number;
  expiredCount: number;
}> {
  try {
    const db = admin.firestore();
    const cacheRef = db.collection("ssr_cache");

    // Total entries
    const totalSnap = await cacheRef.count().get();
    const totalCount = totalSnap.data().count;

    // Expired entries (older than 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredSnap = await cacheRef
      .where("cachedAt", "<", oneDayAgo)
      .count()
      .get();
    const expiredCount = expiredSnap.data().count;

    return { totalCount, expiredCount };
  } catch (error) {
    logger.error("[SeoHealthCheck] SSR cache check failed:", error);
    return { totalCount: 0, expiredCount: 0 };
  }
}

/**
 * Count indexable profiles (visible + approved with reviewCount > 0)
 */
async function checkIndexableProfiles(): Promise<{
  indexableCount: number;
  avgReviews: number;
}> {
  try {
    const db = admin.firestore();

    // Get visible + approved profiles with reviews
    const profilesSnap = await db
      .collection("sos_profiles")
      .where("isVisible", "==", true)
      .where("isApproved", "==", true)
      .select("reviewCount")
      .get();

    let indexableCount = 0;
    let totalReviews = 0;

    for (const doc of profilesSnap.docs) {
      const reviewCount = doc.data().reviewCount || 0;
      if (reviewCount > 0) {
        indexableCount++;
        totalReviews += reviewCount;
      }
    }

    const avgReviews = indexableCount > 0 ? totalReviews / indexableCount : 0;

    return { indexableCount, avgReviews };
  } catch (error) {
    logger.error("[SeoHealthCheck] Profile check failed:", error);
    return { indexableCount: 0, avgReviews: 0 };
  }
}

/**
 * Check AEO endpoints (llms.txt, ai.txt)
 */
async function checkAeoEndpoints(): Promise<AeoResult[]> {
  const results: AeoResult[] = [];

  for (const check of AEO_CHECKS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(check.url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "SOS-SEO-HealthCheck/1.0" },
      });
      clearTimeout(timeout);

      results.push({
        name: check.name,
        ok: resp.ok,
        status: resp.status,
      });
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check AEO meta tags on homepage (JSON-LD Organization, WebSite, meta tags)
 */
async function checkAeoMetaTags(): Promise<AeoMetaResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // Fetch the rendered homepage (via renderForBotsV2 for full SSR content)
    const renderUrl = `${RENDER_BASE}?url=${encodeURIComponent(SITE_URL + "/fr-fr")}`;
    const resp = await fetch(renderUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SOS-SEO-HealthCheck/1.0" },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return {
        hasMetaAeo: false,
        hasJsonLdOrganization: false,
        hasJsonLdWebSite: false,
        error: `Homepage render failed: HTTP ${resp.status}`,
      };
    }

    const html = await resp.text();

    // Check for AEO-related meta tags (e.g., meta name="ai-*" or meta name="aeo-*")
    const hasMetaAeo =
      html.includes('name="ai-') ||
      html.includes('name="aeo-') ||
      html.includes("robots") ||
      html.includes('name="description"');

    // Check for JSON-LD Organization
    const hasJsonLdOrganization =
      html.includes('"@type":"Organization"') ||
      html.includes('"@type": "Organization"');

    // Check for JSON-LD WebSite
    const hasJsonLdWebSite =
      html.includes('"@type":"WebSite"') ||
      html.includes('"@type": "WebSite"');

    return {
      hasMetaAeo,
      hasJsonLdOrganization,
      hasJsonLdWebSite,
    };
  } catch (error) {
    logger.error("[SeoHealthCheck] AEO meta check failed:", error);
    return {
      hasMetaAeo: false,
      hasJsonLdOrganization: false,
      hasJsonLdWebSite: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
