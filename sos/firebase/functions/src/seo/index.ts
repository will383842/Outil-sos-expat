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
  scheduledSitemapPing,
} from './autoIndexingTriggers';

// Sitemaps dynamiques
export {
  sitemapProfiles,
  sitemapHelp,    // Centre d'aide / Help Center articles
  sitemapFaq,     // FAQ individuels
  sitemapLanding,
} from './sitemaps';

// Services (pour usage interne ou API)
export { submitToIndexNow, submitSingleUrl } from './indexNowService';
export { pingSitemap, pingCustomSitemap } from './sitemapPingService';
export { submitToGoogleIndexing, submitBatchToGoogleIndexing, getUrlIndexingStatus } from './googleIndexingService';

// Dynamic rendering for bots (SEO pre-rendering)
export { renderForBotsV2, invalidateCacheEndpoint, invalidateCache } from './dynamicRender';

// Migration tool for fixing profile slugs
export { migrateProfileSlugs } from './migrateProfileSlugs';

// Diagnostic tool
export { diagnoseProfiles } from './diagnoseProfiles';