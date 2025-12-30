/**
 * Auto-Indexing Triggers
 * Se déclenche automatiquement quand une nouvelle page est créée
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { submitToIndexNow, generateBlogUrls, generateLandingUrls } from './indexNowService';
import { pingSitemap, pingCustomSitemap } from './sitemapPingService';
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
    
    // 2. Ping sitemap (Google) - rapide
    await pingSitemap();

    // 3. Logger le résultat
    await logIndexingEvent('profile', profileId, urls, indexNowResult);

    console.log(`✅ Indexation lancée pour profil ${profileId}`);
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

    // Vérifier si le profil vient d'être publié
    const wasHidden = !before.isVisible || !before.isApproved;
    const isNowPublic = after.isVisible && after.isApproved;

    if (wasHidden && isNowPublic) {
      console.log(`📤 Profil ${profileId} vient d'être publié, indexation...`);

      const urls = generateProfileUrlsFromData(after);
      
      if (urls.length > 0) {
        await submitToIndexNow(urls);
        await pingSitemap();
        await logIndexingEvent('profile_published', profileId, urls, { success: true, urls });
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

    await submitToIndexNow(urls);
    await pingSitemap();
    await logIndexingEvent('blog', postId, urls, { success: true, urls });

    console.log(`✅ Article de blog ${postId} indexé`);
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
// ⏰ SCHEDULED: Ping sitemap toutes les heures
// ============================================
export const scheduledSitemapPing = onSchedule(
  {
    // OPTIMIZED: Changed from 1 hour to 2 hours to reduce invocations by 50%
    // Previous: 24 invocations/day → Now: 12 invocations/day
    schedule: 'every 2 hours',
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
 */
function generateProfileUrlsFromData(profile: any): string[] {
  const urls: string[] = [];
  
  if (!profile.slug) {
    return urls;
  }

  // Le slug contient déjà le chemin complet
  // Format: avocat/ca/francais/mark-m-xxx
  LANGUAGES.forEach(lang => {
    const countryCode = profile.countryCode || profile.country || 'fr';
    const url = `${SITE_URL}/${lang}-${countryCode}/${profile.slug}`;
    urls.push(url);
  });

  return urls;
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