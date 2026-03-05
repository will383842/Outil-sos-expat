/**
 * Auto-Indexing Triggers
 * Se déclenche automatiquement quand une nouvelle page est créée
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { submitToIndexNow, generateBlogUrls, generateLandingUrls, generateFaqUrls } from './indexNowService';
import { pingSitemap, pingCustomSitemap } from './sitemapPingService';
import { submitBatchToGoogleIndexing } from './googleIndexingService';
import { invalidateCache } from './dynamicRender';
import * as admin from 'firebase-admin';
import { TELEGRAM_BOT_TOKEN } from '../lib/secrets';
import { sendTelegramMessageDirect } from '../telegram/providers/telegramBot';

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
    cpu: 0.083,
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
    cpu: 0.083,
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
    cpu: 0.083,
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
    cpu: 0.083,
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

      const [indexNowResult, googleResult] = await Promise.all([
        submitToIndexNow(urls),
        submitBatchToGoogleIndexing(urls, 9),
      ]);
      await pingSitemap();
      await logIndexingEvent('blog_published', postId, urls, {
        success: indexNowResult.success,
        urls,
        googleSuccess: googleResult.successCount,
      });

      console.log(`✅ Article ${postId} indexé après publication (Google: ${googleResult.successCount}/${urls.length})`);
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
    cpu: 0.083,
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
    cpu: 0.083,
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
    cpu: 0.083,
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

    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(urls),
      submitBatchToGoogleIndexing(urls, 9),
    ]);
    await pingSitemap();
    await logIndexingEvent('landing', pageId, urls, {
      success: indexNowResult.success,
      urls,
      googleSuccess: googleResult.successCount,
    });

    console.log(`✅ Landing page ${pageId} indexée (Google: ${googleResult.successCount}/${urls.length})`);
  }
);

// ============================================
// 🎯 TRIGGER: Landing page mise à jour (activation)
// ============================================
export const onLandingPageUpdated = onDocumentUpdated(
  {
    document: 'landing_pages/{pageId}',
    region: REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const pageId = event.params.pageId;

    if (!before || !after) return;

    const wasInactive = !before.isActive;
    const isNowActive = after.isActive;

    if (wasInactive && isNowActive) {
      console.log(`🎯 Landing page ${pageId} vient d'être activée`);

      const slug = after.slug || pageId;
      const urls = generateLandingUrls(slug);

      const [indexNowResult, googleResult] = await Promise.all([
        submitToIndexNow(urls),
        submitBatchToGoogleIndexing(urls, 9),
      ]);
      await pingSitemap();
      await logIndexingEvent('landing_activated', pageId, urls, {
        success: indexNowResult.success,
        urls,
        googleSuccess: googleResult.successCount,
      });

      console.log(`✅ Landing page ${pageId} indexée après activation (Google: ${googleResult.successCount}/${urls.length})`);
    }
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
    cpu: 0.083,
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
    cpu: 0.083,
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
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async () => {
    console.log('⏰ Ping sitemap programmé...');

    const db = admin.firestore();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentProfiles = await db.collection('sos_profiles')
      .where('createdAt', '>=', oneDayAgo)
      .limit(1)
      .get();

    if (!recentProfiles.empty) {
      console.log('📊 Nouvelles pages détectées (dernières 24h), ping sitemap...');
      await pingSitemap();
      await pingCustomSitemap('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles');
    } else {
      console.log('📊 Pas de nouvelles pages dans les dernières 24h, ping ignoré');
    }
  }
);

// ============================================
// 🚀 SCHEDULED: Indexation accélérée quotidienne (200 URLs/jour)
// ============================================
export const scheduledBulkIndexing = onSchedule(
  {
    schedule: '0 9 * * *', // 9h Paris tous les jours (1h après ping sitemap)
    region: REGION,
    memory: '512MiB',
    cpu: 0.25,
    timeoutSeconds: 300, // 5 min max (200 URLs × 100ms delay = ~20s)
  },
  async () => {
    console.log('🚀 Indexation accélérée quotidienne...');

    const db = admin.firestore();
    const DAILY_QUOTA = 200;

    // Récupérer le curseur de la dernière exécution
    const stateDoc = await db.collection('admin_config').doc('bulk_indexing_state').get();
    const state = stateDoc.exists ? stateDoc.data() : null;
    const lastProcessedId = state?.lastProcessedId || null;
    const totalSubmitted = state?.totalSubmitted || 0;

    // Récupérer les profils visibles et approuvés pas encore soumis
    let query = db.collection('sos_profiles')
      .where('isVisible', '==', true)
      .where('isApproved', '==', true)
      .where('isActive', '==', true)
      .orderBy('__name__')
      .limit(DAILY_QUOTA);

    if (lastProcessedId) {
      query = query.startAfter(lastProcessedId);
    }

    const snapshot = await query.get();

    let activeDocs = snapshot.docs;
    let isCycleReset = false;

    if (snapshot.empty) {
      // Toutes les pages ont été soumises — recommencer le cycle depuis le début
      console.log(`✅ Cycle d'indexation complet (${totalSubmitted} URLs total). Redémarrage immédiat du cycle.`);
      isCycleReset = true;
      // Relancer depuis le début du cycle (sans filtre startAfter)
      const restartSnapshot = await db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .orderBy('__name__')
        .limit(DAILY_QUOTA)
        .get();

      if (restartSnapshot.empty) {
        console.log('⏭️ Aucun profil indexable trouvé, ping sitemap uniquement.');
        await pingSitemap();
        return;
      }

      activeDocs = restartSnapshot.docs;
    }

    // Collecter toutes les URLs (1 URL FR prioritaire par profil pour maximiser la couverture)
    const urlsToSubmit: string[] = [];
    let lastId = '';

    for (const doc of activeDocs) {
      const profile = doc.data();
      lastId = doc.id;

      // Prioriser l'URL française (la plus importante pour SEO)
      const slugs = profile.slugs as Record<string, string> | undefined;
      if (slugs?.fr) {
        urlsToSubmit.push(`${SITE_URL}/${slugs.fr}`);
      } else if (slugs?.en) {
        urlsToSubmit.push(`${SITE_URL}/${slugs.en}`);
      } else if (profile.slug) {
        urlsToSubmit.push(`${SITE_URL}/${profile.slug}`);
      }

      // Si on a encore du quota, ajouter les autres langues clés
      if (urlsToSubmit.length < DAILY_QUOTA && slugs) {
        for (const lang of ['en', 'es', 'de'] as const) {
          if (slugs[lang] && urlsToSubmit.length < DAILY_QUOTA) {
            const url = `${SITE_URL}/${slugs[lang]}`;
            if (!urlsToSubmit.includes(url)) {
              urlsToSubmit.push(url);
            }
          }
        }
      }
    }

    if (urlsToSubmit.length === 0) {
      console.log('⏭️ Aucune URL à soumettre (profils sans slugs)');
      return;
    }

    console.log(`📤 Soumission de ${urlsToSubmit.length} URLs à Google (quota: ${DAILY_QUOTA}/jour)...`);

    // Soumettre en parallèle à Google et IndexNow
    const [googleResult, indexNowResult] = await Promise.all([
      submitBatchToGoogleIndexing(urlsToSubmit.slice(0, DAILY_QUOTA), DAILY_QUOTA),
      submitToIndexNow(urlsToSubmit), // IndexNow est illimité
    ]);

    // Sauvegarder l'état pour la prochaine exécution
    // Si cycle reset: totalSubmitted repart de 0 pour ce nouveau cycle
    const newTotal = isCycleReset ? urlsToSubmit.length : totalSubmitted + urlsToSubmit.length;
    const stateToSave: Record<string, unknown> = {
      lastProcessedId: lastId,
      totalSubmitted: newTotal,
      lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
      lastBatchSize: urlsToSubmit.length,
      googleSuccess: googleResult.successCount,
      googleErrors: googleResult.errorCount,
      indexNowSuccess: indexNowResult.success,
    };
    if (isCycleReset) {
      stateToSave.cycleResetAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await db.collection('admin_config').doc('bulk_indexing_state').set(stateToSave);

    await logIndexingEvent('bulk_daily', 'scheduled', urlsToSubmit, {
      success: googleResult.successCount > 0,
      googleSuccess: googleResult.successCount,
      googleErrors: googleResult.errorCount,
      indexNowSuccess: indexNowResult.success,
    });

    console.log(`✅ Indexation accélérée: ${googleResult.successCount}/${urlsToSubmit.length} Google, IndexNow: ${indexNowResult.success}`);
    console.log(`📊 Progression totale: ${newTotal} URLs soumises depuis le début du cycle`);
  }
);

// ============================================
// 📊 SCHEDULED: Rapport SEO hebdomadaire (lundi 10h)
// ============================================
export const scheduledSeoHealthCheck = onSchedule(
  {
    schedule: '0 10 * * 1', // Lundi 10h Paris
    region: REGION,
    memory: '512MiB',
    cpu: 0.25,
    timeoutSeconds: 120,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    console.log('📊 Rapport SEO hebdomadaire...');

    const db = admin.firestore();
    const now = Date.now();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // 1. Compter les profils indexables vs total
    const [totalProfiles, indexableProfiles] = await Promise.all([
      db.collection('sos_profiles').count().get(),
      db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .count().get(),
    ]);

    const totalCount = totalProfiles.data().count;
    const indexableCount = indexableProfiles.data().count;

    // 2. Compter les profils SANS slugs (problème SEO)
    const allIndexable = await db.collection('sos_profiles')
      .where('isVisible', '==', true)
      .where('isApproved', '==', true)
      .where('isActive', '==', true)
      .select('slug', 'slugs')
      .get();

    let noSlugCount = 0;
    const noSlugIds: string[] = [];
    allIndexable.docs.forEach(doc => {
      const data = doc.data();
      const hasSlugs = data.slugs && typeof data.slugs === 'object' && Object.keys(data.slugs).length > 0;
      if (!hasSlugs && !data.slug) {
        noSlugCount++;
        if (noSlugIds.length < 5) noSlugIds.push(doc.id);
      }
    });

    // 3. Lire les logs d'indexation de la semaine
    const recentLogs = await db.collection('indexing_logs')
      .where('timestamp', '>=', oneWeekAgo)
      .get();

    let weekSuccessCount = 0;
    let weekErrorCount = 0;
    const errorTypes: Record<string, number> = {};

    recentLogs.docs.forEach(doc => {
      const log = doc.data();
      if (log.indexNowSuccess) weekSuccessCount++;
      else {
        weekErrorCount++;
        const errorKey = log.indexNowError || 'unknown';
        errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
      }
    });

    // 4. Lire l'état du bulk indexing
    const bulkState = await db.collection('admin_config').doc('bulk_indexing_state').get();
    const bulk = bulkState.exists ? bulkState.data() : null;

    // 5. Vérifier les sitemaps dynamiques (HTTP check)
    const sitemapUrls = [
      'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles',
      'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapHelp',
      'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapFaq',
      'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapLanding',
    ];

    const sitemapResults: { name: string; ok: boolean; status: number }[] = [];
    for (const url of sitemapUrls) {
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        const name = url.split('/').pop() || url;
        sitemapResults.push({ name, ok: resp.ok, status: resp.status });
      } catch {
        const name = url.split('/').pop() || url;
        sitemapResults.push({ name, ok: false, status: 0 });
      }
    }

    const sitemapErrors = sitemapResults.filter(s => !s.ok);

    // 6. Construire le message Telegram
    const estimatedUrls = indexableCount * 9; // 9 langues
    const hasProblems = noSlugCount > 0 || weekErrorCount > 3 || sitemapErrors.length > 0;
    const statusEmoji = hasProblems ? '⚠️' : '✅';

    let message = `${statusEmoji} *Rapport SEO Hebdomadaire*\n\n`;
    message += `📄 *Pages indexables:* ${indexableCount} profils (${estimatedUrls} URLs)\n`;
    message += `📊 *Total profils:* ${totalCount} (${totalCount - indexableCount} en attente)\n\n`;

    // Bulk indexing progress
    if (bulk) {
      message += `🚀 *Indexation accélérée:*\n`;
      message += `  Soumises: ${bulk.totalSubmitted || 0} URLs\n`;
      message += `  Dernier batch: ${bulk.googleSuccess || 0}/${bulk.lastBatchSize || 0} Google OK\n\n`;
    }

    // Semaine recap
    message += `📈 *Cette semaine:*\n`;
    message += `  ${weekSuccessCount} soumissions OK, ${weekErrorCount} erreurs\n`;
    if (weekErrorCount > 0) {
      const topErrors = Object.entries(errorTypes).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ');
      message += `  Erreurs: ${topErrors}\n`;
    }
    message += '\n';

    // Sitemaps
    message += `🗺️ *Sitemaps:*\n`;
    sitemapResults.forEach(s => {
      message += `  ${s.ok ? '✅' : '❌'} ${s.name} (${s.status})\n`;
    });
    message += '\n';

    // Problèmes détectés
    if (noSlugCount > 0) {
      message += `⚠️ *${noSlugCount} profils sans slug!*\n`;
      message += `  IDs: ${noSlugIds.join(', ')}${noSlugCount > 5 ? '...' : ''}\n`;
      message += `  → Non indexables par Google\n\n`;
    }

    if (!hasProblems) {
      message += `✅ Aucun problème détecté. SEO OK!`;
    }

    // 7. Envoyer via Telegram
    try {
      const adminConfig = await db.collection('telegram_admin_config').doc('settings').get();
      const adminChatId = adminConfig.exists ? adminConfig.data()?.recipientChatId : null;

      if (adminChatId) {
        await sendTelegramMessageDirect(adminChatId, message, { parseMode: 'Markdown' });
        console.log('✅ Rapport SEO envoyé via Telegram');
      } else {
        console.warn('⚠️ Pas de chat ID admin configuré dans telegram_admin_config/settings');
      }
    } catch (error) {
      console.error('❌ Erreur envoi Telegram:', error);
    }

    // 8. Sauvegarder le rapport dans Firestore
    await db.collection('seo_health_reports').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalProfiles: totalCount,
      indexableProfiles: indexableCount,
      estimatedUrls,
      noSlugCount,
      noSlugIds,
      weekSuccessCount,
      weekErrorCount,
      errorTypes,
      sitemapStatus: sitemapResults,
      bulkIndexingState: bulk || null,
      hasProblems,
    });

    console.log(`📊 Rapport SEO: ${indexableCount} indexables, ${noSlugCount} sans slug, ${weekErrorCount} erreurs`);
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
  // ⚠️ DOIT correspondre exactement aux routes dans localeRoutes.ts (frontend)
  const helpCenterSlugs: Record<string, string> = {
    fr: 'centre-aide',
    en: 'help-center',
    de: 'hilfezentrum',       // localeRoutes.ts: "hilfezentrum"
    es: 'centro-ayuda',
    pt: 'centro-ajuda',
    ru: 'tsentr-pomoshchi',   // localeRoutes.ts: "tsentr-pomoshchi"
    ch: 'bangzhu-zhongxin',
    ar: 'مركز-المساعدة',      // localeRoutes.ts: "مركز-المساعدة"
    hi: 'sahayata-kendra',
  };

  // Utilise le format locale complet (fr-fr, en-us, ...) et non le code court (fr, en, ...)
  const LANGUAGE_TO_COUNTRY_LOCAL: Record<string, string> = {
    fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
  };
  return LANGUAGES.map(lang => {
    const country = LANGUAGE_TO_COUNTRY_LOCAL[lang] || lang;
    const urlLang = lang === 'ch' ? 'zh' : lang;
    const locale = `${urlLang}-${country}`;
    return `${SITE_URL}/${locale}/${helpCenterSlugs[lang] || 'help-center'}/${slug}`;
  });
}

// generateFaqUrls is imported from indexNowService (uses correct locale format)

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
      googleSuccess: result.googleSuccess ?? null,
      googleErrors: result.googleErrors ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Erreur log indexation:', error);
  }
}