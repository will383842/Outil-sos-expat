/**
 * SEO Module Exports
 * Fichier qui exporte toutes les fonctions SEO
 */

// Triggers d'indexation automatique
export {
  onProfileCreated,
  onProfileUpdated,
  onBlogPostCreated,
  onBlogPostUpdated,
  onHelpArticleCreated,
  onHelpArticleUpdated,
  onFaqCreated,
  onFaqUpdated,
  onLandingPageCreated,
  onLandingPageUpdated,
  scheduledSitemapPing,
  scheduledBulkIndexing,
  scheduledSeoHealthCheck,
} from './autoIndexingTriggers';

// Sitemaps dynamiques
export {
  sitemapProfiles,
  sitemapHelp,    // Centre d'aide / Help Center articles
  sitemapFaq,     // FAQ individuels
  // sitemapLanding removed: landing_pages collection is empty, caused GSC errors
  sitemapCountryListings, // Country listing pages (avocats/expatriés par pays)
} from './sitemaps';

// Services (pour usage interne ou API)
export { submitToIndexNow, submitSingleUrl, generateBlogUrls, generateLandingUrls, generateFaqUrls } from './indexNowService';
export { pingSitemap, pingCustomSitemap } from './sitemapPingService';
export { submitToGoogleIndexing, submitBatchToGoogleIndexing, getUrlIndexingStatus } from './googleIndexingService';

// Dynamic rendering for bots (SEO pre-rendering)
export { renderForBotsV2, invalidateCacheEndpoint, invalidateCache } from './dynamicRender';

// Migration and audit tools for profile slugs
export { migrateProfileSlugs, auditProfileSlugs } from './migrateProfileSlugs';

// Diagnostic tool
export { diagnoseProfiles } from './diagnoseProfiles';

// OG Image generation service
export { generateOgImage } from './ogImageService';

// Affiliate OG rendering (lightweight, no Puppeteer)
export { affiliateOgRender, generateAffiliateOgImage } from './affiliateOgRender';

// AI-powered SEO generation for provider profiles
export {
  generateProviderSEOCallable,
  batchGenerateSEO,
  processSEOTask,
} from './generateProviderSEO';

// Daily SEO & AEO health check (8h Paris)
export { seoHealthCheck } from './seoHealthCheck';