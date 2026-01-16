/**
 * Auto-Indexing Triggers
 * Se déclenche automatiquement quand une nouvelle page est créée
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { submitToIndexNow, generateBlogUrls, generateLandingUrls } from './indexNowService';
import { pingSitemap, pingCustomSitemap } from './sitemapPingService';
import { submitBatchToGoogleIndexing } from './googleIndexingService';
import { invalidateCache } from './dynamicRender';
import * as admin from 'firebase-admin';

const REGION = 'europe-west1';
const SITE_URL = 'https://sos-expat.com';
const LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'];

// ============================================
// 🧑‍⚖️ TRIGGER: Nouveau profil prestataire créé
// ============================================
export const onProfileCreated = onDocumentCreated(
  {
    document: 'sos_profiles/{profileId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('❌ Pas de données dans le snapshot');
      return;
    }

    const profile = snapshot.data();
    const profileId = event.params.profileId;

    console.log(`📤 Nouveau profil détecté: ${profileId}`);
    console.log(`   Type: ${profile.role || profile.type}`);
    console.log(`   Slug: ${profile.slug}`);
    console.log(`   Visible: ${profile.isVisible}`);
    console.log(`   Approuvé: ${profile.isApproved}`);

    // Vérifier que le profil est visible et approuvé
    if (!profile.isVisible || !profile.isApproved) {
      console.log('⏭️ Profil non visible ou non approuvé, indexation différée');
      return;
    }

    // Construire les URLs pour toutes les langues
    const urls = generateProfileUrlsFromData(profile);
    
    if (urls.length === 0) {
      console.log('❌ Impossible de générer les URLs (slug manquant?)');
      return;
    }

    console.log(`🔗 URLs à indexer: ${urls.length}`);

    // 1. Soumettre à IndexNow (Bing/Yandex) - instantané
    const indexNowResult = await submitToIndexNow(urls);

    // 2. Soumettre à Google Indexing API (max 10 URLs pour préserver quota)
    const googleResult = await submitBatchToGoogleIndexing(urls.slice(0, 10), 10);

    // 3. Ping sitemap (Google fallback) - rapide
    await pingSitemap();

    // 4. Logger le résultat
    await logIndexingEvent('profile', profileId, urls, {
      ...indexNowResult,
      googleSuccess: googleResult.successCount,
      googleErrors: googleResult.errorCount,
    });

    console.log(`✅ Indexation lancée pour profil ${profileId} (IndexNow: ${indexNowResult.success}, Google: ${googleResult.successCount}/${urls.slice(0, 10).length})`);
  }
);

// ============================================
// 🧑‍⚖️ TRIGGER: Profil prestataire mis à jour
// ============================================
export const onProfileUpdated = onDocumentUpdated(
  {
    document: 'sos_profiles/{profileId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const profileId = event.params.profileId;

    if (!before || !after) return;

    // Invalider le cache SSR pour ce profil (toutes les langues)
    const slugs = after.slugs as Record<string, string> | undefined;
    if (slugs) {
      Object.values(slugs).forEach(slug => {
        if (slug) invalidateCache(slug);
      });
      console.log(`🗑️ Cache SSR invalidé pour profil ${profileId}`);
    } else if (after.slug) {
      invalidateCache(after.slug as string);
      console.log(`🗑️ Cache SSR invalidé pour profil ${profileId} (legacy slug)`);
    }

    // Vérifier si le profil vient d'être publié
    const wasHidden = !before.isVisible || !before.isApproved;
    const isNowPublic = after.isVisible && after.isApproved;

    if (wasHidden && isNowPublic) {
      console.log(`📤 Profil ${profileId} vient d'être publié, indexation...`);

      const urls = generateProfileUrlsFromData(after);

      if (urls.length > 0) {
        // Soumettre en parallèle à IndexNow et Google
        const [indexNowResult, googleResult] = await Promise.all([
          submitToIndexNow(urls),
          submitBatchToGoogleIndexing(urls.slice(0, 10), 10),
        ]);
        await pingSitemap();
        await logIndexingEvent('profile_published', profileId, urls, {
          success: indexNowResult.success,
          urls,
          googleSuccess: googleResult.successCount,
        });
      }
    }
  }
);

// ============================================
// 📝 TRIGGER: Nouvel article de blog créé
// ============================================
export const onBlogPostCreated = onDocumentCreated(
  {
    document: 'blog_posts/{postId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const post = snapshot.data();
    const postId = event.params.postId;

    console.log(`📝 Nouvel article de blog: ${postId}`);

    // Vérifier que l'article est publié
    if (post.status !== 'published' && !post.isPublished) {
      console.log('⏭️ Article non publié, indexation différée');
      return;
    }

    const slug = post.slug || postId;
    const urls = generateBlogUrls(slug);

    console.log(`🔗 URLs blog à indexer: ${urls.length}`);

    // Soumettre en parallèle à IndexNow et Google
    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(urls),
      submitBatchToGoogleIndexing(urls, 9), // 9 langues = 9 URLs max
    ]);
    await pingSitemap();
    await logIndexingEvent('blog', postId, urls, {
      success: indexNowResult.success,
      urls,
      googleSuccess: googleResult.successCount,
    });

    console.log(`✅ Article de blog ${postId} indexé (Google: ${googleResult.successCount}/${urls.length})`);
  }
);

// ============================================
// 📝 TRIGGER: Article de blog publié
// ============================================
export const onBlogPostUpdated = onDocumentUpdated(
  {
    document: 'blog_posts/{postId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const postId = event.params.postId;

    if (!before || !after) return;

    const wasUnpublished = before.status !== 'published' && !before.isPublished;
    const isNowPublished = after.status === 'published' || after.isPublished;

    if (wasUnpublished && isNowPublished) {
      console.log(`📝 Article ${postId} vient d'être publié`);

      const slug = after.slug || postId;
      const urls = generateBlogUrls(slug);

      await submitToIndexNow(urls);
      await pingSitemap();
      await logIndexingEvent('blog_published', postId, urls, { success: true, urls });
    }
  }
);

// ============================================
// 📚 TRIGGER: Nouvel article du Centre d'aide créé
// ============================================
export const onHelpArticleCreated = onDocumentCreated(
  {
    document: 'help_articles/{articleId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const article = snapshot.data();
    const articleId = event.params.articleId;

    console.log(`📚 Nouvel article centre d'aide: ${articleId}`);

    // Vérifier que l'article est publié
    if (!article.isPublished && article.status !== 'published') {
      console.log('⏭️ Article non publié, indexation différée');
      return;
    }

    const slug = article.slug || articleId;
    const urls = generateHelpCenterUrls(slug);

    console.log(`🔗 URLs help center à indexer: ${urls.length}`);

    // Soumettre en parallèle à IndexNow et Google
    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(urls),
      submitBatchToGoogleIndexing(urls, 9),
    ]);
    await pingSitemap();
    await logIndexingEvent('help_article', articleId, urls, {
      success: indexNowResult.success,
      urls,
      googleSuccess: googleResult.successCount,
    });

    console.log(`✅ Article centre d'aide ${articleId} indexé (Google: ${googleResult.successCount}/${urls.length})`);
  }
);

// ============================================
// 📚 TRIGGER: Article du Centre d'aide publié
// ============================================
export const onHelpArticleUpdated = onDocumentUpdated(
  {
    document: 'help_articles/{articleId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const articleId = event.params.articleId;

    if (!before || !after) return;

    const wasUnpublished = !before.isPublished && before.status !== 'published';
    const isNowPublished = after.isPublished || after.status === 'published';

    if (wasUnpublished && isNowPublished) {
      console.log(`📚 Article centre d'aide ${articleId} vient d'être publié`);

      const slug = after.slug || articleId;
      const urls = generateHelpCenterUrls(slug);

      const [indexNowResult, googleResult] = await Promise.all([
        submitToIndexNow(urls),
        submitBatchToGoogleIndexing(urls, 9),
      ]);
      await pingSitemap();
      await logIndexingEvent('help_article_published', articleId, urls, {
        success: indexNowResult.success,
        urls,
        googleSuccess: googleResult.successCount,
      });
    }
  }
);

// ============================================
// 🎯 TRIGGER: Nouvelle landing page créée
// ============================================
export const onLandingPageCreated = onDocumentCreated(
  {
    document: 'landing_pages/{pageId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const page = snapshot.data();
    const pageId = event.params.pageId;

    console.log(`🎯 Nouvelle landing page: ${pageId}`);

    if (!page.isActive) {
      console.log('⏭️ Landing page inactive, indexation différée');
      return;
    }

    const slug = page.slug || pageId;
    const urls = generateLandingUrls(slug);

    console.log(`🔗 URLs landing à indexer: ${urls.length}`);

    await submitToIndexNow(urls);
    await pingSitemap();
    await logIndexingEvent('landing', pageId, urls, { success: true, urls });

    console.log(`✅ Landing page ${pageId} indexée`);
  }
);

// ============================================
// ❓ TRIGGER: Nouveau FAQ créé
// ============================================
export const onFaqCreated = onDocumentCreated(
  {
    document: 'faqs/{faqId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const faq = snapshot.data();
    const faqId = event.params.faqId;

    console.log(`❓ Nouveau FAQ: ${faqId}`);

    // Vérifier que le FAQ est actif
    if (!faq.isActive) {
      console.log('⏭️ FAQ inactif, indexation différée');
      return;
    }

    const slug = typeof faq.slug === 'object' ? (faq.slug?.fr || faq.slug?.en || faqId) : (faq.slug || faqId);
    const urls = generateFaqUrls(slug);

    console.log(`🔗 URLs FAQ à indexer: ${urls.length}`);

    // Soumettre en parallèle à IndexNow et Google
    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(urls),
      submitBatchToGoogleIndexing(urls, 9),
    ]);
    await pingSitemap();
    await logIndexingEvent('faq', faqId, urls, {
      success: indexNowResult.success,
      urls,
      googleSuccess: googleResult.successCount,
    });

    console.log(`✅ FAQ ${faqId} indexé (Google: ${googleResult.successCount}/${urls.length})`);
  }
);

// ============================================
// ❓ TRIGGER: FAQ mis à jour (activation)
// ============================================
export const onFaqUpdated = onDocumentUpdated(
  {
    document: 'faqs/{faqId}',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const faqId = event.params.faqId;

    if (!before || !after) return;

    const wasInactive = !before.isActive;
    const isNowActive = after.isActive;

    if (wasInactive && isNowActive) {
      console.log(`❓ FAQ ${faqId} vient d'être activé`);

      const slug = typeof after.slug === 'object' ? (after.slug?.fr || after.slug?.en || faqId) : (after.slug || faqId);
      const urls = generateFaqUrls(slug);

      const [indexNowResult, googleResult] = await Promise.all([
        submitToIndexNow(urls),
        submitBatchToGoogleIndexing(urls, 9),
      ]);
      await pingSitemap();
      await logIndexingEvent('faq_activated', faqId, urls, {
        success: indexNowResult.success,
        urls,
        googleSuccess: googleResult.successCount,
      });

      console.log(`✅ FAQ ${faqId} indexé après activation`);
    }
  }
);

// ============================================
// ⏰ SCHEDULED: Ping sitemap toutes les heures
// ============================================
export const scheduledSitemapPing = onSchedule(
  {
    // 2025-01-16: Réduit à 1×/jour à 8h pour économies maximales (low traffic)
    schedule: '0 8 * * *', // 8h Paris tous les jours
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    console.log('⏰ Ping sitemap programmé...');

    const db = admin.firestore();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentProfiles = await db.collection('sos_profiles')
      .where('createdAt', '>=', oneHourAgo)
      .limit(1)
      .get();

    if (!recentProfiles.empty) {
      console.log('📊 Nouvelles pages détectées, ping sitemap...');
      await pingSitemap();
      await pingCustomSitemap('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles');
    } else {
      console.log('📊 Pas de nouvelles pages, ping ignoré');
    }
  }
);

// ============================================
// 🔧 HELPERS
// ============================================

/**
 * Génère les URLs pour un profil à partir des données Firestore
 * Supporte les slugs multilingues (nouveau format) et le slug simple (legacy)
 */
function generateProfileUrlsFromData(profile: any): string[] {
  const urls: string[] = [];

  // Préfère les slugs multilingues si disponibles
  const slugs = profile.slugs as Record<string, string> | undefined;
  const hasSlugs = slugs && typeof slugs === 'object' && Object.keys(slugs).length > 0;

  // Skip si ni slugs multilingues ni slug simple
  if (!hasSlugs && !profile.slug) {
    return urls;
  }

  // Nouveau format avec slugs multilingues
  if (hasSlugs) {
    LANGUAGES.forEach(lang => {
      const slug = slugs[lang];
      if (slug) {
        // Le slug contient déjà le chemin complet avec locale
        // Ex: "fr-fr/avocat-thailand/julien-k7m2p9"
        urls.push(`${SITE_URL}/${slug}`);
      }
    });
  } else if (profile.slug) {
    // Ancien format: slug unique
    const legacySlug = profile.slug as string;

    // Détecter si le slug commence par un code langue valide
    const slugLang = legacySlug.split('/')[0];
    const isValidLang = LANGUAGES.includes(slugLang);

    if (isValidLang) {
      // Le slug commence par une langue, utiliser tel quel
      urls.push(`${SITE_URL}/${legacySlug}`);
    } else {
      // Slug sans préfixe langue, ajouter le préfixe pour chaque langue
      const countryCode = (profile.countryCode || profile.country || 'fr') as string;
      LANGUAGES.forEach(lang => {
        urls.push(`${SITE_URL}/${lang}-${countryCode.toLowerCase()}/${legacySlug}`);
      });
    }
  }

  return urls;
}

/**
 * Génère les URLs pour un article du Centre d'aide (9 langues)
 * Utilise les slugs traduits des routes
 */
function generateHelpCenterUrls(slug: string): string[] {
  const helpCenterSlugs: Record<string, string> = {
    fr: 'centre-aide',
    en: 'help-center',
    de: 'hilfe-center',
    es: 'centro-ayuda',
    pt: 'centro-ajuda',
    ru: 'centr-pomoshi',
    ch: 'bangzhu-zhongxin',
    ar: 'markaz-almusaeada',
    hi: 'sahayata-kendra',
  };

  return LANGUAGES.map(lang =>
    `${SITE_URL}/${lang}/${helpCenterSlugs[lang] || 'help-center'}/${slug}`
  );
}

/**
 * Génère les URLs pour un FAQ (9 langues)
 * Route: /{lang}/faq/{slug}
 */
function generateFaqUrls(slug: string): string[] {
  return LANGUAGES.map(lang => `${SITE_URL}/${lang}/faq/${slug}`);
}

/**
 * Log l'événement d'indexation dans Firestore
 */
async function logIndexingEvent(
  type: string,
  documentId: string,
  urls: string[],
  result: any
): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection('indexing_logs').add({
      type,
      documentId,
      urlsCount: urls.length,
      urls: urls.slice(0, 10),
      indexNowSuccess: result.success,
      indexNowError: result.error || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Erreur log indexation:', error);
  }
}