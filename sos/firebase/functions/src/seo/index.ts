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
  onLandingPageCreated,
  scheduledSitemapPing,
} from './autoIndexingTriggers';

// Sitemaps dynamiques
export {
  sitemapProfiles,
  sitemapBlog,
  sitemapLanding,
} from './sitemaps';

// Services (pour usage interne ou API)
export { submitToIndexNow, submitSingleUrl } from './indexNowService';
export { pingSitemap, pingCustomSitemap } from './sitemapPingService';