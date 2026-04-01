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

    // AAA profiles are real providers — index them normally

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

    // ✅ Prioriser FR + EN pour Google API (quota limité à 10 URLs)
    // IndexNow reçoit TOUTES les langues (illimité)
    const slugs = profile.slugs as Record<string, string> | undefined;
    const priorityUrls: string[] = [];
    if (slugs?.fr) priorityUrls.push(`${SITE_URL}/${slugs.fr}`);
    if (slugs?.en) priorityUrls.push(`${SITE_URL}/${slugs.en}`);
    // Compléter avec les autres langues jusqu'à 10
    const remainingUrls = urls.filter(u => !priorityUrls.includes(u));
    const googleUrls = [...priorityUrls, ...remainingUrls].slice(0, 10);

    console.log(`🔗 URLs à indexer: ${urls.length} (Google priorité: FR+EN first)`);

    // 1. Soumettre à IndexNow (Bing/Yandex) - instantané, TOUTES les langues
    const indexNowResult = await submitToIndexNow(urls);

    // 2. Soumettre à Google Indexing API (max 10 URLs, FR+EN prioritaires)
    const googleResult = await submitBatchToGoogleIndexing(googleUrls, 10);

    // 3. Ping sitemap (Google fallback) - rapide
    await pingSitemap();

    // 4. Logger le résultat
    await logIndexingEvent('profile', profileId, urls, {
      ...indexNowResult,
      googleSuccess: googleResult.successCount,
      googleErrors: googleResult.errorCount,
    });

    console.log(`✅ Indexation lancée pour profil ${profileId} (IndexNow: ${indexNowResult.success}, Google: ${googleResult.successCount}/${urls.slice(0, 10).length})`);

    // 5. Soumettre les URLs de listing pays
    await submitCountryListingUrls(profile, profileId, 'profile_country');

    // NOTE: AI SEO generation (generateProviderSEOCallable) is triggered manually by admin
    // Auto-trigger via Cloud Tasks can be added in phase 2 when the system is validated
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

    // AAA profiles are real providers — index them normally

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

        // Soumettre les URLs de listing pays
        await submitCountryListingUrls(after, profileId, 'profile_published_country');
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

    // Invalider le cache SSR si le contenu a changé (même sans transition de publication)
    const slug = after.slug || postId;
    if (slug) {
      invalidateCache(slug);
      console.log(`🗑️ Cache SSR invalidé pour blog ${postId}`);
    }

    if (wasUnpublished && isNowPublished) {
      console.log(`📝 Article ${postId} vient d'être publié`);

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

    // Invalider le cache SSR si le contenu a changé
    const slug = after.slug || articleId;
    if (slug) {
      invalidateCache(slug);
      console.log(`🗑️ Cache SSR invalidé pour help article ${articleId}`);
    }

    const wasUnpublished = !before.isPublished && before.status !== 'published';
    const isNowPublished = after.isPublished || after.status === 'published';

    if (wasUnpublished && isNowPublished) {
      console.log(`📚 Article centre d'aide ${articleId} vient d'être publié`);

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

    // Invalider le cache SSR si le contenu a changé
    const slug = after.slug || pageId;
    if (slug) {
      invalidateCache(slug);
      console.log(`🗑️ Cache SSR invalidé pour landing ${pageId}`);
    }

    const wasInactive = !before.isActive;
    const isNowActive = after.isActive;

    if (wasInactive && isNowActive) {
      console.log(`🎯 Landing page ${pageId} vient d'être activée`);

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

    // Invalider le cache SSR si le contenu a changé
    const faqSlug = typeof after.slug === 'object' ? (after.slug?.fr || after.slug?.en || faqId) : (after.slug || faqId);
    if (faqSlug) {
      invalidateCache(faqSlug);
      console.log(`🗑️ Cache SSR invalidé pour FAQ ${faqId}`);
    }

    const wasInactive = !before.isActive;
    const isNowActive = after.isActive;

    if (wasInactive && isNowActive) {
      console.log(`❓ FAQ ${faqId} vient d'être activé`);

      const urls = generateFaqUrls(faqSlug);

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

    // Ping tous les sitemaps dynamiques quotidiennement (inconditionnellement)
    // Note: Google a supprimé /ping?sitemap= en juin 2023, Bing reste actif
    await Promise.all([
      pingSitemap(),
      pingCustomSitemap('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles'),
      pingCustomSitemap('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapHelp'),
      pingCustomSitemap('https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapFaq'),
    ]);
    console.log('✅ Ping sitemaps terminé');
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

    // ✅ Sort profiles by quality score (best first) for optimal quota usage
    // High-quality profiles get indexed first in each cycle
    const sortedDocs = [...activeDocs].sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      // Simple score: reviews × rating + description length bonus
      const scoreA = (Number(aData.reviewCount ?? aData.realReviewsCount ?? 0) * Number(aData.averageRating ?? 0))
        + (String(aData.description ?? '').length > 200 ? 10 : 0);
      const scoreB = (Number(bData.reviewCount ?? bData.realReviewsCount ?? 0) * Number(bData.averageRating ?? 0))
        + (String(bData.description ?? '').length > 200 ? 10 : 0);
      return scoreB - scoreA; // DESC
    });

    // Collecter toutes les URLs (FR prioritaire par profil, puis autres langues)
    const urlsToSubmit: string[] = [];
    let lastId = '';

    for (const doc of sortedDocs) {
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

      // Si on a encore du quota, ajouter TOUTES les langues (9 au total)
      if (urlsToSubmit.length < DAILY_QUOTA && slugs) {
        for (const lang of ['en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'] as const) {
          if (slugs[lang] && urlsToSubmit.length < DAILY_QUOTA) {
            const url = `${SITE_URL}/${slugs[lang]}`;
            if (!urlsToSubmit.includes(url)) {
              urlsToSubmit.push(url);
            }
          }
        }
      }
    }

    // Also include help articles if we have remaining quota
    if (urlsToSubmit.length < DAILY_QUOTA) {
      const helpSnap = await db.collection('help_articles')
        .where('isPublished', '==', true)
        .limit(DAILY_QUOTA - urlsToSubmit.length)
        .get();

      const helpSegments: Record<string, string> = {
        fr: 'centre-aide', en: 'help-center', es: 'centro-ayuda', de: 'hilfezentrum',
        pt: 'centro-ajuda', ru: 'tsentr-pomoshchi', ch: 'bangzhu-zhongxin',
        hi: 'sahayata-kendra', ar: 'markaz-almusaeada',
      };
      const defaultCountries: Record<string, string> = {
        fr: 'fr', en: 'us', es: 'es', de: 'de', pt: 'pt', ru: 'ru', ch: 'cn', hi: 'in', ar: 'sa',
      };

      for (const doc of helpSnap.docs) {
        if (urlsToSubmit.length >= DAILY_QUOTA) break;
        const article = doc.data();
        const slugs = article.slugs as Record<string, string> | undefined;
        if (slugs) {
          for (const [lang, slug] of Object.entries(slugs)) {
            if (slug && urlsToSubmit.length < DAILY_QUOTA && helpSegments[lang]) {
              const urlLang = lang === 'ch' ? 'zh' : lang;
              urlsToSubmit.push(`${SITE_URL}/${urlLang}-${defaultCountries[lang]}/${helpSegments[lang]}/${slug}`);
            }
          }
        } else if (article.slug) {
          // Single slug — submit for FR only
          urlsToSubmit.push(`${SITE_URL}/fr-fr/centre-aide/${article.slug}`);
        }
      }
      console.log(`📚 Ajout articles aide: total ${urlsToSubmit.length} URLs`);
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
      // sitemapLanding supprimé — landing_pages collection vide, MC publie sur le blog
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

// ============================================
// 🌍 HELPERS: Country listing URL generation
// ============================================

/** Role path translations for country listing pages */
const ROLE_PATHS: Record<string, Record<string, string>> = {
  lawyer: { fr: 'avocats', en: 'lawyers', es: 'abogados', de: 'anwaelte', pt: 'advogados', ru: 'advokaty', zh: 'lushi', ar: 'محامون', hi: 'vakil' },
  expat: { fr: 'expatries', en: 'expats', es: 'expatriados', de: 'expats', pt: 'expatriados', ru: 'expaty', zh: 'haiwai', ar: 'مغتربون', hi: 'videshi' },
};

/** Default locale suffixes per language */
const DEFAULT_LOCALES: Record<string, string> = {
  fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', pt: 'pt-pt', ru: 'ru-ru', zh: 'zh-cn', ar: 'ar-sa', hi: 'hi-in',
};

/** Top 30 country slug translations (inline to avoid frontend imports in backend) */
const COUNTRY_SLUGS: Record<string, Record<string, string>> = {
  AE: { fr: 'emirats-arabes-unis', en: 'united-arab-emirates', es: 'emiratos-arabes', de: 'vae', pt: 'emirados-arabes', ru: 'oae', zh: 'alianqiu', ar: 'al-imarat', hi: 'sanyukt-arab' },
  AU: { fr: 'australie', en: 'australia', es: 'australia', de: 'australien', pt: 'australia', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia' },
  BE: { fr: 'belgique', en: 'belgium', es: 'belgica', de: 'belgien', pt: 'belgica', ru: 'belgiya', zh: 'bilishi', ar: 'beljika', hi: 'beljiyam' },
  BR: { fr: 'bresil', en: 'brazil', es: 'brasil', de: 'brasilien', pt: 'brasil', ru: 'braziliya', zh: 'baxi', ar: 'al-brazil', hi: 'brazil' },
  CA: { fr: 'canada', en: 'canada', es: 'canada', de: 'kanada', pt: 'canada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'kanada' },
  CH: { fr: 'suisse', en: 'switzerland', es: 'suiza', de: 'schweiz', pt: 'suica', ru: 'shveytsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  CI: { fr: 'cote-d-ivoire', en: 'ivory-coast', es: 'costa-de-marfil', de: 'elfenbeinkueste', pt: 'costa-do-marfim', ru: 'kot-divuar', zh: 'ketediwa', ar: 'kot-difuar', hi: 'ivory-coast' },
  CM: { fr: 'cameroun', en: 'cameroon', es: 'camerun', de: 'kamerun', pt: 'camaroes', ru: 'kamerun', zh: 'kamailong', ar: 'al-kamirun', hi: 'kamerun' },
  DE: { fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland', pt: 'alemanha', ru: 'germaniya', zh: 'deguo', ar: 'almanya', hi: 'jarmani' },
  EG: { fr: 'egypte', en: 'egypt', es: 'egipto', de: 'aegypten', pt: 'egito', ru: 'yegipet', zh: 'aiji', ar: 'misr', hi: 'misr' },
  ES: { fr: 'espagne', en: 'spain', es: 'espana', de: 'spanien', pt: 'espanha', ru: 'ispaniya', zh: 'xibanya', ar: 'isbanya', hi: 'spain' },
  FR: { fr: 'france', en: 'france', es: 'francia', de: 'frankreich', pt: 'franca', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'phrans' },
  GB: { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', de: 'vereinigtes-koenigreich', pt: 'reino-unido', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britaniya', hi: 'britain' },
  IL: { fr: 'israel', en: 'israel', es: 'israel', de: 'israel', pt: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  IN: { fr: 'inde', en: 'india', es: 'india', de: 'indien', pt: 'india', ru: 'indiya', zh: 'yindu', ar: 'al-hind', hi: 'bharat' },
  IT: { fr: 'italie', en: 'italy', es: 'italia', de: 'italien', pt: 'italia', ru: 'italiya', zh: 'yidali', ar: 'italiya', hi: 'italy' },
  JP: { fr: 'japon', en: 'japan', es: 'japon', de: 'japan', pt: 'japao', ru: 'yaponiya', zh: 'riben', ar: 'al-yaban', hi: 'japan' },
  KH: { fr: 'cambodge', en: 'cambodia', es: 'camboya', de: 'kambodscha', pt: 'camboja', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambodya', hi: 'kambodia' },
  MA: { fr: 'maroc', en: 'morocco', es: 'marruecos', de: 'marokko', pt: 'marrocos', ru: 'marokko', zh: 'moluoge', ar: 'al-maghrib', hi: 'morocco' },
  MX: { fr: 'mexique', en: 'mexico', es: 'mexico', de: 'mexiko', pt: 'mexico', ru: 'meksika', zh: 'moxige', ar: 'al-maksik', hi: 'mexico' },
  NL: { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', de: 'niederlande', pt: 'paises-baixos', ru: 'niderlandy', zh: 'helan', ar: 'hulanda', hi: 'netherlands' },
  PL: { fr: 'pologne', en: 'poland', es: 'polonia', de: 'polen', pt: 'polonia', ru: 'polsha', zh: 'bolan', ar: 'bulanda', hi: 'poland' },
  PT: { fr: 'portugal', en: 'portugal', es: 'portugal', de: 'portugal', pt: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'al-burtughal', hi: 'portugal' },
  SA: { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', de: 'saudi-arabien', pt: 'arabia-saudita', ru: 'saud-araviya', zh: 'shate', ar: 'as-saudiya', hi: 'saudi-arab' },
  SG: { fr: 'singapour', en: 'singapore', es: 'singapur', de: 'singapur', pt: 'singapura', ru: 'singapur', zh: 'xinjiapo', ar: 'singhafura', hi: 'singapore' },
  SN: { fr: 'senegal', en: 'senegal', es: 'senegal', de: 'senegal', pt: 'senegal', ru: 'senegal', zh: 'saineijiaer', ar: 'as-sinighal', hi: 'senegal' },
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand', pt: 'tailandia', ru: 'tailand', zh: 'taiguo', ar: 'tailand', hi: 'thailand' },
  TR: { fr: 'turquie', en: 'turkey', es: 'turquia', de: 'tuerkei', pt: 'turquia', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkiya', hi: 'turkey' },
  US: { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', de: 'usa', pt: 'estados-unidos', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'america' },
  ZA: { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', de: 'suedafrika', pt: 'africa-do-sul', ru: 'yuar', zh: 'nanfei', ar: 'janub-ifriqya', hi: 'dakshin-africa' },
};

/** All supported language codes for URL generation */
const LANG_CODES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'] as const;

/**
 * Get the country slug for a given ISO code and language.
 * Falls back to lowercase ISO code if not in the top 30 mapping.
 */
function getCountrySlug(isoCode: string, lang: string): string {
  const upper = isoCode.toUpperCase();
  return COUNTRY_SLUGS[upper]?.[lang] || isoCode.toLowerCase();
}

/**
 * Generate country listing URLs for a provider and submit them to IndexNow + Google.
 * Collects all countries from `country` and `operatingCountries`, generates 9 language URLs
 * per country per role, and submits up to 20 URLs total.
 */
async function submitCountryListingUrls(
  profile: any,
  profileId: string,
  eventType: string,
): Promise<void> {
  try {
    // Determine the provider role
    const role = (profile.role || profile.type || '').toLowerCase();
    const normalizedRole = role === 'lawyer' || role === 'avocat' ? 'lawyer' : 'expat';
    const rolePaths = ROLE_PATHS[normalizedRole];
    if (!rolePaths) {
      console.log(`⏭️ Country listing: rôle inconnu "${role}", pas d'URLs pays`);
      return;
    }

    // Collect unique country ISO codes from country + operatingCountries
    const countryCodes = new Set<string>();

    const mainCountry = (profile.country || profile.countryCode || '') as string;
    if (mainCountry) {
      countryCodes.add(mainCountry.toUpperCase());
    }

    const operatingCountries = profile.operatingCountries as string[] | undefined;
    if (Array.isArray(operatingCountries)) {
      for (const c of operatingCountries) {
        if (c) countryCodes.add(c.toUpperCase());
      }
    }

    if (countryCodes.size === 0) {
      console.log(`⏭️ Country listing: aucun pays trouvé pour profil ${profileId}`);
      return;
    }

    // Generate URLs: /{locale}/{rolePath}/{countrySlug} for each country × language
    const MAX_COUNTRY_URLS = 20;
    const countryUrls: string[] = [];
    const countryArray = Array.from(countryCodes);

    for (const countryCode of countryArray) {
      for (const lang of LANG_CODES) {
        if (countryUrls.length >= MAX_COUNTRY_URLS) break;

        const locale = DEFAULT_LOCALES[lang];
        const rolePath = rolePaths[lang];
        const countrySlug = getCountrySlug(countryCode, lang);

        if (locale && rolePath && countrySlug) {
          countryUrls.push(`${SITE_URL}/${locale}/${rolePath}/${countrySlug}`);
        }
      }
      if (countryUrls.length >= MAX_COUNTRY_URLS) break;
    }

    if (countryUrls.length === 0) {
      console.log(`⏭️ Country listing: aucune URL générée pour profil ${profileId}`);
      return;
    }

    console.log(`🌍 Country listing URLs à indexer pour ${profileId}: ${countryUrls.length}`);
    countryUrls.forEach(url => console.log(`   → ${url}`));

    // Submit to IndexNow and Google in parallel
    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(countryUrls),
      submitBatchToGoogleIndexing(countryUrls.slice(0, 10), 10),
    ]);

    await logIndexingEvent(eventType, profileId, countryUrls, {
      success: indexNowResult.success,
      urls: countryUrls,
      googleSuccess: googleResult.successCount,
      googleErrors: googleResult.errorCount,
    });

    console.log(`✅ Country listing indexé pour ${profileId}: IndexNow=${indexNowResult.success}, Google=${googleResult.successCount}/${countryUrls.slice(0, 10).length}`);
  } catch (error) {
    console.error(`❌ Erreur soumission country listing pour ${profileId}:`, error);
  }
}

// ============================================
// 🔥 CRON: Préchauffage cache SSR toutes les 20h
// Évite les cold starts Puppeteer qui font échouer les crawls SEO
// ============================================
const SSR_FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2';

const SSR_PRIORITY_PATHS = [
  // Homepages — 9 locales
  '/fr-fr', '/en-us', '/es-es', '/de-de', '/pt-pt', '/ru-ru', '/zh-cn', '/ar-sa', '/hi-in',
  // FR — pages clés
  '/fr-fr/comment-ca-marche', '/fr-fr/tarifs', '/fr-fr/centre-aide', '/fr-fr/contact',
  '/fr-fr/sos-appel', '/fr-fr/prestataires', '/fr-fr/temoignages', '/fr-fr/devenir-chatter',
  '/fr-fr/devenir-influenceur', '/fr-fr/devenir-blogueur', '/fr-fr/devenir-admin-groupe',
  '/fr-fr/devenir-partenaire', '/fr-fr/consommateurs', '/fr-fr/politique-confidentialite',
  '/fr-fr/cgu-clients', '/fr-fr/nos-chatters', '/fr-fr/nos-influenceurs', '/fr-fr/nos-blogueurs',
  // EN — key pages
  '/en-us/how-it-works', '/en-us/pricing', '/en-us/help-center', '/en-us/contact',
  '/en-us/emergency-call', '/en-us/providers', '/en-us/testimonials', '/en-us/become-chatter',
  '/en-us/become-influencer', '/en-us/become-blogger', '/en-us/become-group-admin',
  '/en-us/become-partner', '/en-us/consumers', '/en-us/privacy-policy',
  '/en-us/our-chatters', '/en-us/our-influencers', '/en-us/our-bloggers',
  // Other locales — homepages + chatter landing (high traffic)
  '/de-de/chatter-werden', '/es-es/ser-chatter', '/pt-pt/tornar-se-chatter',
  '/ru-ru/stat-chatterom', '/hi-in/chatter-bane', '/zh-cn/chengwei-chatter',
];

export const scheduledWarmSsrCache = onSchedule(
  {
    // Toutes les 20h — cache SSR dure 24h, on précauffe avant expiration
    schedule: '0 */20 * * *',
    region: REGION,
    memory: '512MiB',
    cpu: 0.25,
    timeoutSeconds: 540, // 9 min — ~45 pages × 10s max chacune
  },
  async () => {
    console.log(`[SSR Warm] Démarrage préchauffage — ${SSR_PRIORITY_PATHS.length} pages`);
    let success = 0;
    let errors = 0;

    for (const path of SSR_PRIORITY_PATHS) {
      try {
        const url = new URL(SSR_FUNCTION_URL);
        url.searchParams.set('path', path);
        url.searchParams.set('url', `https://sos-expat.com${path}`);
        url.searchParams.set('bot', 'googlebot');

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout par page

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Googlebot/2.1',
            'Accept': 'text/html',
          },
        });
        clearTimeout(timer);

        if (res.ok) {
          success++;
          console.log(`[SSR Warm] ✅ ${path} (${res.status})`);
        } else {
          errors++;
          console.warn(`[SSR Warm] ⚠️ ${path} → ${res.status}`);
        }
      } catch (err: any) {
        errors++;
        console.error(`[SSR Warm] ❌ ${path} → ${err.message}`);
      }

      // 2s entre chaque requête pour éviter de surcharger renderForBotsV2
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[SSR Warm] Terminé — ${success} OK, ${errors} erreurs`);
  }
);

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