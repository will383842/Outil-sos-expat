/**
 * Sitemaps Dynamiques
 * Génère les sitemaps XML pour les profils, blog et landing pages
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Lazy initialization to avoid issues during deployment analysis
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

const SITE_URL = 'https://sos-expat.com';
const LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'];

// Map language to default country code (must match frontend localeRoutes.ts)
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  fr: 'fr',  // French -> France
  en: 'us',  // English -> United States
  es: 'es',  // Spanish -> Spain
  de: 'de',  // German -> Germany
  ru: 'ru',  // Russian -> Russia
  pt: 'pt',  // Portuguese -> Portugal
  ch: 'cn',  // Chinese -> China
  hi: 'in',  // Hindi -> India
  ar: 'sa',  // Arabic -> Saudi Arabia
};

// ✅ WHITELIST: Only CANONICAL locales for sitemaps (one per language = default country)
// Non-canonical variants (fr-be, en-gb, zh-tw, etc.) are 301-redirected in _redirects
// and must NOT appear in sitemaps (Google flags "Page with redirect" error)
const VALID_LOCALES = new Set([
  'fr-fr',
  'en-us',
  'es-es',
  'de-de',
  'pt-pt',
  'ru-ru',
  'zh-cn',
  'ar-sa',
  'hi-in'
]);

/**
 * Valide si une locale est valide (ex: "fr-fr" OK, "es-FR" NOK)
 */
function isValidLocale(locale: string): boolean {
  return VALID_LOCALES.has(locale.toLowerCase());
}

/**
 * Extrait la locale d'un slug (ex: "es-FR/avocat-thailand/..." → "es-FR")
 */
function extractLocaleFromSlug(slug: string): string | null {
  const match = slug.match(/^([a-z]{2}-[a-z]{2})\//i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Get locale string in format "lang-country" (e.g., "hi-in", "fr-fr")
 * This must match the format expected by the frontend LocaleRouter
 * Special case: Chinese uses 'zh' as URL prefix (ISO standard) instead of 'ch' (internal code)
 */
function getLocaleString(lang: string): string {
  const country = LANGUAGE_TO_COUNTRY[lang] || lang;
  // Chinese: internal code is 'ch' but URL should use 'zh' (ISO 639-1 standard)
  const urlLang = lang === 'ch' ? 'zh' : lang;
  return `${urlLang}-${country}`;
}

// Convertit le code de langue interne vers le code hreflang standard
function getHreflangCode(lang: string): string {
  // 'ch' (convention interne) devient 'zh-Hans' pour le chinois simplifié
  return lang === 'ch' ? 'zh-Hans' : lang;
}

/**
 * Détecte si un slug a un préfixe de langue interne (ex: "ch-setting-prices" -> "ch")
 * Utilisé pour n'indexer les articles non-traduits que dans leur langue native
 */
function detectSlugLangPrefix(slug: string): string | null {
  const match = slug.match(/^([a-z]{2})-/);
  if (match && LANGUAGES.includes(match[1])) {
    return match[1];
  }
  return null;
}

/**
 * Escape les caractères spéciaux XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================
// 🧑‍⚖️ SITEMAP: Profils prestataires
// ============================================
export const sitemapProfiles = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.5,
    timeoutSeconds: 120,
    maxInstances: 5,
    minInstances: 0,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    ensureInitialized();
    try {
      const db = admin.firestore();

      // ✅ Utilise sos_profiles (pas users)
      // Filtre les prestataires visibles, approuvés ET actifs
      const snapshot = await db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .get();

      const today = new Date().toISOString().split('T')[0];

      // OPTIMISÉ: Utilise array.join() au lieu de += pour éviter O(n²)
      const urlBlocks: string[] = [];

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      snapshot.docs.forEach(doc => {
        const profile = doc.data();

        // Skip profiles without a valid name (frontend will show 404 for these)
        const name = profile.fullName || profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        if (!name) return;

        // Utilise les slugs multilingues si disponibles
        const slugs = profile.slugs as Record<string, string> | undefined;
        const hasSlugs = slugs && typeof slugs === 'object' && Object.keys(slugs).length > 0;

        // Skip si pas de slugs multilingues ET pas de slug simple
        if (!hasSlugs && !profile.slug) return;

        // Pour les profils avec slugs multilingues (nouveau format)
        if (hasSlugs) {
          LANGUAGES.forEach(lang => {
            const slug = slugs[lang];
            if (!slug) return;

            // ✅ VALIDATION: Vérifier que le slug a une locale valide
            const slugLocale = extractLocaleFromSlug(slug);
            if (!slugLocale || !isValidLocale(slugLocale)) {
              // ❌ Locale invalide détectée (ex: es-FR, zh-HR)
              console.warn(`⚠️ Slug invalide ignoré (${doc.id}, ${lang}): ${slug} (locale: ${slugLocale || 'none'})`);
              return; // Exclure du sitemap
            }

            // ✅ VALIDATION: Vérifier que la locale du slug correspond à la langue
            // Ex: slugs['en'] ne doit pas contenir "fr-fr/avocat/..." (contamination cross-langue)
            const expectedUrlLang = lang === 'ch' ? 'zh' : lang;
            const slugLangPart = slugLocale.split('-')[0];
            if (slugLangPart !== expectedUrlLang) {
              console.warn(`⚠️ Slug cross-langue ignoré (${doc.id}, ${lang}): locale ${slugLocale} != expected ${expectedUrlLang}`);
              return;
            }

            // Le slug contient déjà le chemin complet avec locale
            // Ex: "fr-fr/avocat-thailand/julien-k7m2p9"
            const url = `${SITE_URL}/${slug}`;

            // Génère tous les hreflang (uniquement pour slugs valides)
            const hreflangs = LANGUAGES.map(hrefLang => {
              const hrefSlug = slugs[hrefLang];
              if (!hrefSlug) return null;

              // Vérifier aussi que le hreflang slug est valide
              const hrefLocale = extractLocaleFromSlug(hrefSlug);
              if (!hrefLocale || !isValidLocale(hrefLocale)) return null;

              return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefSlug}`)}"/>`;
            }).filter(Boolean).join('\n');

            // x-default = français (si disponible et valide)
            let xDefaultSlug = slugs['fr'] || slug;
            const xDefaultLocale = extractLocaleFromSlug(xDefaultSlug);
            if (!xDefaultLocale || !isValidLocale(xDefaultLocale)) {
              xDefaultSlug = slug; // Fallback vers le slug actuel s'il est valide
            }
            const xDefaultUrl = `${SITE_URL}/${xDefaultSlug}`;

            // Use profile's updatedAt if available, fallback to today
            const profileLastmod = profile.updatedAt?.toDate?.()
              ? profile.updatedAt.toDate().toISOString().split('T')[0]
              : today;

            urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultUrl)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${profileLastmod}</lastmod>
  </url>`);
          });
        } else if (profile.slug) {
          // Ancien format: slug unique (ex: "fr/expatrie-norvege/melissa-...")
          // Le slug commence déjà par le code langue, utiliser tel quel
          const legacySlug = profile.slug as string;

          // Détecter la langue du slug (premier segment avant /)
          const slugLang = legacySlug.split('/')[0];
          const isValidLang = LANGUAGES.includes(slugLang);

          if (isValidLang) {
            // Le slug commence par une langue valide, utiliser tel quel
            const url = `${SITE_URL}/${legacySlug}`;

            // Pour les legacy slugs, on génère une seule URL avec hreflang pointant vers elle-même
            urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
    <xhtml:link rel="alternate" hreflang="${getHreflangCode(slugLang)}" href="${escapeXml(url)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${today}</lastmod>
  </url>`);
          } else {
            // Slug sans préfixe langue (très ancien format), use default locale per language
            LANGUAGES.forEach(lang => {
              const locale = getLocaleString(lang);
              const url = `${SITE_URL}/${locale}/${legacySlug}`;

              const hreflangs = LANGUAGES.map(hrefLang => {
                const hrefLocale = getLocaleString(hrefLang);
                return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${legacySlug}`)}"/>`;
              }).join('\n');

              const defaultLocale = getLocaleString('fr');
              urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/${legacySlug}`)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <lastmod>${today}</lastmod>
  </url>`);
            });
          }
        }
      });

      urlBlocks.push(`</urlset>`);
      const xml = urlBlocks.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);
      
      console.log(`✅ Sitemap profils: ${snapshot.docs.length} profils (${snapshot.docs.length * LANGUAGES.length} URLs)`);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur sitemap profils:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      res.status(500).send(`Error generating sitemap: ${err.message}`);
    }
  }
);

// ============================================
// 📚 SITEMAP: Articles du Centre d'Aide / Help Center
// ============================================
export const sitemapHelp = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.5,
    timeoutSeconds: 120,
    maxInstances: 3,
    minInstances: 0,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    ensureInitialized();
    try {
      console.log('🔄 Début génération sitemap help articles...');

      const db = admin.firestore();
      console.log('✅ Firestore initialisé');

      // ✅ CORRIGÉ: Utilise help_articles au lieu de blog_posts
      // OPTIMIZED: Added limit(1000) and where clause to avoid full collection scan
      // Previous: Read ALL documents → Now: Read max 1000 published articles
      console.log('📥 Récupération des help_articles...');
      const snapshot = await db.collection('help_articles')
        .where('isPublished', '==', true)
        .limit(1000)
        .get();
      console.log(`📄 ${snapshot.docs.length} documents trouvés`);

      // Filtre les articles publiés (isPublished peut ne pas exister sur tous les docs)
      const publishedDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.isPublished === true || data.status === 'published';
      });

      console.log(`📊 Sitemap blog: ${snapshot.docs.length} total, ${publishedDocs.length} publiés`);

      const today = new Date().toISOString().split('T')[0];

      // Mapping des slugs de routes par langue
      // ⚠️ DOIT correspondre exactement aux routes dans localeRoutes.ts (frontend)
      const helpCenterSlug: Record<string, string> = {
        fr: 'centre-aide',
        en: 'help-center',
        de: 'hilfezentrum',        // localeRoutes.ts: "hilfezentrum" (pas "hilfe-center")
        es: 'centro-ayuda',
        pt: 'centro-ajuda',
        ru: 'tsentr-pomoshchi',    // localeRoutes.ts: "tsentr-pomoshchi" (pas "centr-pomoshi")
        ch: 'bangzhu-zhongxin',
        ar: 'مركز-المساعدة',       // localeRoutes.ts: "مركز-المساعدة" (pas "markaz-almusaeada")
        hi: 'sahayata-kendra',
      };

      // Si aucun article, retourne un sitemap vide mais valide
      if (publishedDocs.length === 0) {
        const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`;
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=3600');
        res.status(200).send(emptyXml);
        console.log(`⚠️ Sitemap help articles: 0 articles publiés`);
        return;
      }

      // OPTIMISÉ: Utilise array.join() au lieu de += pour éviter O(n²)
      const urlBlocks: string[] = [];

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      // Évite les URLs dupliquées dans le sitemap
      const seenUrls = new Set<string>();

      publishedDocs.forEach(doc => {
        const article = doc.data();
        const isMultilingualSlug = article.slug && typeof article.slug === 'object' && Object.keys(article.slug).length > 0;

        // Le slug peut être un string ou un objet multilingue
        const getSlug = (lang: string): string => {
          if (typeof article.slug === 'string') {
            return article.slug;
          }
          if (isMultilingualSlug) {
            return article.slug[lang] || article.slug['fr'] || article.slug['en'] || doc.id;
          }
          return doc.id;
        };

        // Pour les slugs string unique (non traduits), détecter la langue native via le préfixe
        const baseSlug = typeof article.slug === 'string' ? article.slug : null;
        const nativeLang = baseSlug ? detectSlugLangPrefix(baseSlug) : null;

        LANGUAGES.forEach(lang => {
          // Si le slug a un préfixe de langue (ex: "ch-"), n'inclure que pour cette langue
          // Évite d'indexer /fr-fr/centre-aide/ch-guide avec un slug chinois
          if (nativeLang && nativeLang !== lang) return;

          // FIX: Pour les slugs multilingues, vérifier que le slug résolu
          // n'a pas un préfixe de langue différent (contamination cross-langue)
          // Ex: slug objet { fr: "ch-response-times-...", en: "ch-response-times-..." }
          // → le slug "ch-response-times" ne doit apparaître que sous la langue "ch"
          if (!nativeLang && isMultilingualSlug) {
            const resolvedSlug = getSlug(lang);
            const resolvedLangPrefix = detectSlugLangPrefix(resolvedSlug);
            if (resolvedLangPrefix && resolvedLangPrefix !== lang) return;
          }

          const slug = getSlug(lang);
          const routeSlug = helpCenterSlug[lang] || 'help-center';
          // Use locale format: lang-country (e.g., "hi-in", "fr-fr")
          const locale = getLocaleString(lang);
          const url = `${SITE_URL}/${locale}/${routeSlug}/${slug}`;

          // Déduplique les URLs (évite de lister deux fois la même URL si slugs identiques)
          if (seenUrls.has(url)) return;
          seenUrls.add(url);

          // Pour les slugs multilingues, générer les hreflang pour toutes les langues
          // Pour les slugs non traduits avec préfixe de langue, un seul hreflang
          const hreflangs = (isMultilingualSlug ? LANGUAGES : [lang]).map(hrefLang => {
            const hrefSlug = getSlug(hrefLang);
            const hrefRouteSlug = helpCenterSlug[hrefLang] || 'help-center';
            const hrefLocale = getLocaleString(hrefLang);
            return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${hrefRouteSlug}/${hrefSlug}`)}"/>`;
          }).join('\n');

          // x-default: français si multilingue, sinon la langue native du slug
          const xDefaultLang = isMultilingualSlug ? 'fr' : lang;
          const defaultLocale = getLocaleString(xDefaultLang);
          const xDefaultSlug = getSlug(xDefaultLang);
          const xDefaultRouteSlug = helpCenterSlug[xDefaultLang] || 'help-center';

          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/${xDefaultRouteSlug}/${xDefaultSlug}`)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${article.updatedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || today}</lastmod>
  </url>`);
        });
      });

      urlBlocks.push(`</urlset>`);
      const xml = urlBlocks.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);

      console.log(`✅ Sitemap help articles: ${publishedDocs.length} articles (${publishedDocs.length * LANGUAGES.length} URLs)`);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur sitemap help articles:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      res.status(500).send(`Error generating help articles sitemap: ${err.message}`);
    }
  }
);

// ============================================
// 🎯 SITEMAP: Landing pages
// ============================================
export const sitemapLanding = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 3,
    minInstances: 0,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    ensureInitialized();
    try {
      const db = admin.firestore();

      const snapshot = await db.collection('landing_pages')
        .where('isActive', '==', true)
        .get();

      const today = new Date().toISOString().split('T')[0];

      // OPTIMISÉ: Utilise array.join() au lieu de += pour éviter O(n²)
      const urlBlocks: string[] = [];

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      snapshot.docs.forEach(doc => {
        const page = doc.data();
        const slug = page.slug || doc.id;

        // Détecter si le slug a un préfixe de langue (ex: "en-guide-...")
        const slugNativeLang = detectSlugLangPrefix(slug);

        LANGUAGES.forEach(lang => {
          // Si le slug a un préfixe de langue, n'inclure que pour cette langue
          if (slugNativeLang && slugNativeLang !== lang) return;

          // Use locale format: lang-country (e.g., "hi-in", "fr-fr")
          const locale = getLocaleString(lang);
          const url = `${SITE_URL}/${locale}/${slug}`;

          // Génère tous les hreflang en une seule opération
          const hreflangs = LANGUAGES.map(hrefLang => {
            const hrefLocale = getLocaleString(hrefLang);
            return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${slug}`)}"/>`;
          }).join('\n');

          // x-default uses French locale
          const defaultLocale = getLocaleString('fr');
          // Use page's updatedAt if available, fallback to today
          const pageLastmod = page.updatedAt?.toDate?.()
            ? page.updatedAt.toDate().toISOString().split('T')[0]
            : today;

          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/${slug}`)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${pageLastmod}</lastmod>
  </url>`);
        });
      });

      urlBlocks.push(`</urlset>`);
      const xml = urlBlocks.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);

      console.log(`✅ Sitemap landing: ${snapshot.docs.length} pages`);
      
    } catch (error) {
      console.error('❌ Erreur sitemap landing:', error);
      res.status(500).send('Error generating landing sitemap');
    }
  }
);

// ============================================
// ❓ SITEMAP: FAQ individuels
// ============================================
export const sitemapFaq = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 3,
    minInstances: 0,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    ensureInitialized();
    try {
      console.log('🔄 Début génération sitemap FAQ...');

      const db = admin.firestore();

      // Récupère les FAQ actives
      const snapshot = await db.collection('faqs')
        .where('isActive', '==', true)
        .limit(500)
        .get();

      console.log(`📄 ${snapshot.docs.length} FAQs trouvées`);

      const today = new Date().toISOString().split('T')[0];

      // Si aucun FAQ, retourne un sitemap vide mais valide
      if (snapshot.docs.length === 0) {
        const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`;
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=3600');
        res.status(200).send(emptyXml);
        console.log(`⚠️ Sitemap FAQ: 0 FAQs actives`);
        return;
      }

      const urlBlocks: string[] = [];

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      snapshot.docs.forEach(doc => {
        const faq = doc.data();

        // Le slug peut être un objet multilingue ou un string
        const slugs = faq.slug as Record<string, string> | string | undefined;
        const hasSlugs = slugs && typeof slugs === 'object' && Object.keys(slugs).length > 0;

        // Si pas de slug, utiliser l'ID du document
        const getSlug = (lang: string): string => {
          if (typeof slugs === 'string') return slugs;
          if (hasSlugs) return (slugs as Record<string, string>)[lang] || (slugs as Record<string, string>)['fr'] || doc.id;
          return doc.id;
        };

        // Pour les slugs string unique, détecter la langue native
        const baseSlugFaq = typeof slugs === 'string' ? slugs : null;
        const nativeLangFaq = baseSlugFaq ? detectSlugLangPrefix(baseSlugFaq) : null;

        LANGUAGES.forEach(lang => {
          // Si slug string avec préfixe de langue, n'inclure que pour cette langue
          if (nativeLangFaq && nativeLangFaq !== lang) return;

          // FIX: Pour les slugs multilingues, vérifier la contamination cross-langue
          // Ex: FAQ avec slug { fr: "cuales-son-las-tarifas", zh: "cuales-son-las-tarifas" }
          // → slug espagnol ne doit pas apparaître sous locale chinoise
          if (!nativeLangFaq && hasSlugs) {
            const resolvedSlug = getSlug(lang);
            const resolvedLangPrefix = detectSlugLangPrefix(resolvedSlug);
            if (resolvedLangPrefix && resolvedLangPrefix !== lang) return;
          }

          const slug = getSlug(lang);
          // Use locale format: lang-country (e.g., "hi-in", "fr-fr")
          const locale = getLocaleString(lang);
          const url = `${SITE_URL}/${locale}/faq/${slug}`;

          // Génère tous les hreflang
          const hreflangs = LANGUAGES.map(hrefLang => {
            const hrefSlug = getSlug(hrefLang);
            const hrefLocale = getLocaleString(hrefLang);
            return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/faq/${hrefSlug}`)}"/>`;
          }).join('\n');

          // x-default uses French locale
          const defaultLocale = getLocaleString('fr');
          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/faq/${getSlug('fr')}`)}"/>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <lastmod>${faq.updatedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || today}</lastmod>
  </url>`);
        });
      });

      urlBlocks.push(`</urlset>`);
      const xml = urlBlocks.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);

      console.log(`✅ Sitemap FAQ: ${snapshot.docs.length} FAQs (${snapshot.docs.length * LANGUAGES.length} URLs)`);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur sitemap FAQ:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      res.status(500).send(`Error generating FAQ sitemap: ${err.message}`);
    }
  }
);

// ============================================
// 🌍 SITEMAP: Country Listing Pages (avocats/expatriés par pays)
// ============================================

/** Normalize country names (French or other) to ISO 2-letter codes */
const NAME_TO_ISO: Record<string, string> = {
  // French names
  'Thaïlande': 'TH', 'Algérie': 'DZ', 'Allemagne': 'DE', 'Angleterre': 'GB',
  'Arabie Saoudite': 'SA', 'Argentine': 'AR', 'Australie': 'AU', 'Autriche': 'AT',
  'Belgique': 'BE', 'Brésil': 'BR', 'Bulgarie': 'BG', 'Cambodge': 'KH',
  'Cameroun': 'CM', 'Canada': 'CA', 'Chili': 'CL', 'Chine': 'CN',
  'Chypre': 'CY', 'Colombie': 'CO', 'Corée du Sud': 'KR', 'Costa Rica': 'CR',
  'Croatie': 'HR', 'Côte d\'Ivoire': 'CI', 'Danemark': 'DK', 'Égypte': 'EG',
  'Émirats Arabes Unis': 'AE', 'Équateur': 'EC', 'Espagne': 'ES', 'Estonie': 'EE',
  'États-Unis': 'US', 'Finlande': 'FI', 'France': 'FR', 'Grèce': 'GR',
  'Guatemala': 'GT', 'Hongrie': 'HU', 'Inde': 'IN', 'Indonésie': 'ID',
  'Irlande': 'IE', 'Israël': 'IL', 'Italie': 'IT', 'Japon': 'JP',
  'Jordanie': 'JO', 'Kenya': 'KE', 'Liban': 'LB', 'Luxembourg': 'LU',
  'Madagascar': 'MG', 'Malaisie': 'MY', 'Malte': 'MT', 'Maroc': 'MA',
  'Maurice': 'MU', 'Mexique': 'MX', 'Monaco': 'MC', 'Norvège': 'NO',
  'Nouvelle-Zélande': 'NZ', 'Ouganda': 'UG', 'Pakistan': 'PK', 'Panama': 'PA',
  'Pays-Bas': 'NL', 'Pérou': 'PE', 'Philippines': 'PH', 'Pologne': 'PL',
  'Portugal': 'PT', 'Qatar': 'QA', 'République Dominicaine': 'DO',
  'République Tchèque': 'CZ', 'Roumanie': 'RO', 'Royaume-Uni': 'GB',
  'Russie': 'RU', 'Rwanda': 'RW', 'Sénégal': 'SN', 'Singapour': 'SG',
  'Slovaquie': 'SK', 'Slovénie': 'SI', 'Sri Lanka': 'LK', 'Suède': 'SE',
  'Suisse': 'CH', 'Taïwan': 'TW', 'Tanzanie': 'TZ', 'Tunisie': 'TN',
  'Turquie': 'TR', 'Ukraine': 'UA', 'Uruguay': 'UY', 'Vietnam': 'VN',
  // English names (only those different from French)
  'Thailand': 'TH', 'Algeria': 'DZ', 'Germany': 'DE', 'England': 'GB',
  'Saudi Arabia': 'SA', 'Austria': 'AT', 'Belgium': 'BE', 'Brazil': 'BR',
  'Bulgaria': 'BG', 'Cambodia': 'KH', 'Cameroon': 'CM', 'Chile': 'CL',
  'China': 'CN', 'Cyprus': 'CY', 'Colombia': 'CO', 'South Korea': 'KR',
  'Croatia': 'HR', 'Ivory Coast': 'CI', 'Denmark': 'DK', 'Egypt': 'EG',
  'United Arab Emirates': 'AE', 'Ecuador': 'EC', 'Spain': 'ES', 'Estonia': 'EE',
  'United States': 'US', 'Finland': 'FI', 'Greece': 'GR', 'Hungary': 'HU',
  'India': 'IN', 'Indonesia': 'ID', 'Ireland': 'IE', 'Israel': 'IL',
  'Italy': 'IT', 'Japan': 'JP', 'Jordan': 'JO', 'Lebanon': 'LB',
  'Malaysia': 'MY', 'Malta': 'MT', 'Morocco': 'MA', 'Mauritius': 'MU',
  'Mexico': 'MX', 'Norway': 'NO', 'New Zealand': 'NZ', 'Uganda': 'UG',
  'Netherlands': 'NL', 'Peru': 'PE', 'Poland': 'PL',
  'Dominican Republic': 'DO', 'Czech Republic': 'CZ', 'Romania': 'RO',
  'United Kingdom': 'GB', 'Russia': 'RU', 'Senegal': 'SN', 'Singapore': 'SG',
  'Slovakia': 'SK', 'Slovenia': 'SI', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Taiwan': 'TW', 'Tanzania': 'TZ', 'Tunisia': 'TN', 'Turkey': 'TR',
};

/** Country slug per language for the most common countries */
const COUNTRY_SLUGS: Record<string, Record<string, string>> = {
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand', pt: 'tailandia', ru: 'tailand', zh: 'taiguo', ar: 'تايلاند', hi: 'thailand' },
  FR: { fr: 'france', en: 'france', es: 'francia', de: 'frankreich', pt: 'franca', ru: 'frantsiya', zh: 'faguo', ar: 'فرنسا', hi: 'france' },
  US: { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', de: 'vereinigte-staaten', pt: 'estados-unidos', ru: 'ssha', zh: 'meiguo', ar: 'الولايات-المتحدة', hi: 'america' },
  GB: { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', de: 'vereinigtes-koenigreich', pt: 'reino-unido', ru: 'velikobritaniya', zh: 'yingguo', ar: 'المملكة-المتحدة', hi: 'britain' },
  DE: { fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland', pt: 'alemanha', ru: 'germaniya', zh: 'deguo', ar: 'ألمانيا', hi: 'germany' },
  ES: { fr: 'espagne', en: 'spain', es: 'espana', de: 'spanien', pt: 'espanha', ru: 'ispaniya', zh: 'xibanya', ar: 'إسبانيا', hi: 'spain' },
  IT: { fr: 'italie', en: 'italy', es: 'italia', de: 'italien', pt: 'italia', ru: 'italiya', zh: 'yidali', ar: 'إيطاليا', hi: 'italy' },
  PT: { fr: 'portugal', en: 'portugal', es: 'portugal', de: 'portugal', pt: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'البرتغال', hi: 'portugal' },
  BR: { fr: 'bresil', en: 'brazil', es: 'brasil', de: 'brasilien', pt: 'brasil', ru: 'braziliya', zh: 'baxi', ar: 'البرازيل', hi: 'brazil' },
  CA: { fr: 'canada', en: 'canada', es: 'canada', de: 'kanada', pt: 'canada', ru: 'kanada', zh: 'jianada', ar: 'كندا', hi: 'canada' },
  AU: { fr: 'australie', en: 'australia', es: 'australia', de: 'australien', pt: 'australia', ru: 'avstraliya', zh: 'aodaliya', ar: 'أستراليا', hi: 'australia' },
  JP: { fr: 'japon', en: 'japan', es: 'japon', de: 'japan', pt: 'japao', ru: 'yaponiya', zh: 'riben', ar: 'اليابان', hi: 'japan' },
  CN: { fr: 'chine', en: 'china', es: 'china', de: 'china', pt: 'china', ru: 'kitay', zh: 'zhongguo', ar: 'الصين', hi: 'china' },
  IN: { fr: 'inde', en: 'india', es: 'india', de: 'indien', pt: 'india', ru: 'indiya', zh: 'yindu', ar: 'الهند', hi: 'bharat' },
  MA: { fr: 'maroc', en: 'morocco', es: 'marruecos', de: 'marokko', pt: 'marrocos', ru: 'marokko', zh: 'moluoge', ar: 'المغرب', hi: 'morocco' },
  DZ: { fr: 'algerie', en: 'algeria', es: 'argelia', de: 'algerien', pt: 'argelia', ru: 'alzhir', zh: 'aerjiliya', ar: 'الجزائر', hi: 'algeria' },
  TN: { fr: 'tunisie', en: 'tunisia', es: 'tunez', de: 'tunesien', pt: 'tunisia', ru: 'tunis', zh: 'tunisi', ar: 'تونس', hi: 'tunisia' },
  SN: { fr: 'senegal', en: 'senegal', es: 'senegal', de: 'senegal', pt: 'senegal', ru: 'senegal', zh: 'saineijiaer', ar: 'السنغال', hi: 'senegal' },
  CI: { fr: 'cote-d-ivoire', en: 'ivory-coast', es: 'costa-de-marfil', de: 'elfenbeinkueste', pt: 'costa-do-marfim', ru: 'kot-divuar', zh: 'ketediwa', ar: 'ساحل-العاج', hi: 'ivory-coast' },
  CM: { fr: 'cameroun', en: 'cameroon', es: 'camerun', de: 'kamerun', pt: 'camaroes', ru: 'kamerun', zh: 'kamailong', ar: 'الكاميرون', hi: 'cameroon' },
  BE: { fr: 'belgique', en: 'belgium', es: 'belgica', de: 'belgien', pt: 'belgica', ru: 'belgiya', zh: 'bilishi', ar: 'بلجيكا', hi: 'belgium' },
  CH: { fr: 'suisse', en: 'switzerland', es: 'suiza', de: 'schweiz', pt: 'suica', ru: 'shveytsariya', zh: 'ruishi', ar: 'سويسرا', hi: 'switzerland' },
  NL: { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', de: 'niederlande', pt: 'paises-baixos', ru: 'niderlandy', zh: 'helan', ar: 'هولندا', hi: 'netherlands' },
  MX: { fr: 'mexique', en: 'mexico', es: 'mexico', de: 'mexiko', pt: 'mexico', ru: 'meksika', zh: 'moxige', ar: 'المكسيك', hi: 'mexico' },
  AE: { fr: 'emirats-arabes-unis', en: 'united-arab-emirates', es: 'emiratos-arabes-unidos', de: 'vereinigte-arabische-emirate', pt: 'emirados-arabes-unidos', ru: 'oae', zh: 'alianqiu', ar: 'الإمارات', hi: 'uae' },
  SA: { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', de: 'saudi-arabien', pt: 'arabia-saudita', ru: 'saudovskaya-araviya', zh: 'shate', ar: 'السعودية', hi: 'saudi-arabia' },
  EG: { fr: 'egypte', en: 'egypt', es: 'egipto', de: 'aegypten', pt: 'egito', ru: 'yegipet', zh: 'aiji', ar: 'مصر', hi: 'egypt' },
  RU: { fr: 'russie', en: 'russia', es: 'rusia', de: 'russland', pt: 'russia', ru: 'rossiya', zh: 'eluosi', ar: 'روسيا', hi: 'russia' },
  TR: { fr: 'turquie', en: 'turkey', es: 'turquia', de: 'tuerkei', pt: 'turquia', ru: 'turtsiya', zh: 'tuerqi', ar: 'تركيا', hi: 'turkey' },
  PH: { fr: 'philippines', en: 'philippines', es: 'filipinas', de: 'philippinen', pt: 'filipinas', ru: 'filippiny', zh: 'feilvbin', ar: 'الفلبين', hi: 'philippines' },
  ID: { fr: 'indonesie', en: 'indonesia', es: 'indonesia', de: 'indonesien', pt: 'indonesia', ru: 'indoneziya', zh: 'yindunixiya', ar: 'إندونيسيا', hi: 'indonesia' },
  VN: { fr: 'vietnam', en: 'vietnam', es: 'vietnam', de: 'vietnam', pt: 'vietna', ru: 'vyetnam', zh: 'yuenan', ar: 'فيتنام', hi: 'vietnam' },
  KH: { fr: 'cambodge', en: 'cambodia', es: 'camboya', de: 'kambodscha', pt: 'camboja', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'كمبوديا', hi: 'cambodia' },
  SG: { fr: 'singapour', en: 'singapore', es: 'singapur', de: 'singapur', pt: 'singapura', ru: 'singapur', zh: 'xinjiapo', ar: 'سنغافورة', hi: 'singapore' },
  MY: { fr: 'malaisie', en: 'malaysia', es: 'malasia', de: 'malaysia', pt: 'malasia', ru: 'malayziya', zh: 'malaixiya', ar: 'ماليزيا', hi: 'malaysia' },
  KR: { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', de: 'suedkorea', pt: 'coreia-do-sul', ru: 'yuzhnaya-koreya', zh: 'hanguo', ar: 'كوريا-الجنوبية', hi: 'south-korea' },
  SE: { fr: 'suede', en: 'sweden', es: 'suecia', de: 'schweden', pt: 'suecia', ru: 'shvetsiya', zh: 'ruidian', ar: 'السويد', hi: 'sweden' },
  NO: { fr: 'norvege', en: 'norway', es: 'noruega', de: 'norwegen', pt: 'noruega', ru: 'norvegiya', zh: 'nuowei', ar: 'النرويج', hi: 'norway' },
  DK: { fr: 'danemark', en: 'denmark', es: 'dinamarca', de: 'daenemark', pt: 'dinamarca', ru: 'daniya', zh: 'danmai', ar: 'الدنمارك', hi: 'denmark' },
  FI: { fr: 'finlande', en: 'finland', es: 'finlandia', de: 'finnland', pt: 'finlandia', ru: 'finlyandiya', zh: 'fenlan', ar: 'فنلندا', hi: 'finland' },
  PL: { fr: 'pologne', en: 'poland', es: 'polonia', de: 'polen', pt: 'polonia', ru: 'polsha', zh: 'bolan', ar: 'بولندا', hi: 'poland' },
  CZ: { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', de: 'tschechien', pt: 'republica-checa', ru: 'chekhiya', zh: 'jieke', ar: 'التشيك', hi: 'czech-republic' },
  GR: { fr: 'grece', en: 'greece', es: 'grecia', de: 'griechenland', pt: 'grecia', ru: 'gretsiya', zh: 'xila', ar: 'اليونان', hi: 'greece' },
  HU: { fr: 'hongrie', en: 'hungary', es: 'hungria', de: 'ungarn', pt: 'hungria', ru: 'vengriya', zh: 'xiongyali', ar: 'المجر', hi: 'hungary' },
  RO: { fr: 'roumanie', en: 'romania', es: 'rumania', de: 'rumaenien', pt: 'romenia', ru: 'rumyniya', zh: 'luomaniya', ar: 'رومانيا', hi: 'romania' },
  AT: { fr: 'autriche', en: 'austria', es: 'austria', de: 'oesterreich', pt: 'austria', ru: 'avstriya', zh: 'aodili', ar: 'النمسا', hi: 'austria' },
  IE: { fr: 'irlande', en: 'ireland', es: 'irlanda', de: 'irland', pt: 'irlanda', ru: 'irlandiya', zh: 'aierlan', ar: 'أيرلندا', hi: 'ireland' },
  NZ: { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', de: 'neuseeland', pt: 'nova-zelandia', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'نيوزيلندا', hi: 'new-zealand' },
  IL: { fr: 'israel', en: 'israel', es: 'israel', de: 'israel', pt: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'إسرائيل', hi: 'israel' },
  LB: { fr: 'liban', en: 'lebanon', es: 'libano', de: 'libanon', pt: 'libano', ru: 'livan', zh: 'libanen', ar: 'لبنان', hi: 'lebanon' },
  QA: { fr: 'qatar', en: 'qatar', es: 'catar', de: 'katar', pt: 'catar', ru: 'katar', zh: 'kataer', ar: 'قطر', hi: 'qatar' },
  CO: { fr: 'colombie', en: 'colombia', es: 'colombia', de: 'kolumbien', pt: 'colombia', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'كولومبيا', hi: 'colombia' },
  AR: { fr: 'argentine', en: 'argentina', es: 'argentina', de: 'argentinien', pt: 'argentina', ru: 'argentina', zh: 'agenting', ar: 'الأرجنتين', hi: 'argentina' },
  CL: { fr: 'chili', en: 'chile', es: 'chile', de: 'chile', pt: 'chile', ru: 'chili', zh: 'zhili', ar: 'تشيلي', hi: 'chile' },
  PE: { fr: 'perou', en: 'peru', es: 'peru', de: 'peru', pt: 'peru', ru: 'peru', zh: 'bilu', ar: 'بيرو', hi: 'peru' },
  KE: { fr: 'kenya', en: 'kenya', es: 'kenia', de: 'kenia', pt: 'quenia', ru: 'keniya', zh: 'kenniya', ar: 'كينيا', hi: 'kenya' },
  MG: { fr: 'madagascar', en: 'madagascar', es: 'madagascar', de: 'madagaskar', pt: 'madagascar', ru: 'madagaskar', zh: 'madajiasijia', ar: 'مدغشقر', hi: 'madagascar' },
  LU: { fr: 'luxembourg', en: 'luxembourg', es: 'luxemburgo', de: 'luxemburg', pt: 'luxemburgo', ru: 'lyuksemburg', zh: 'lusenbao', ar: 'لوكسمبورغ', hi: 'luxembourg' },
  HR: { fr: 'croatie', en: 'croatia', es: 'croacia', de: 'kroatien', pt: 'croacia', ru: 'khorvatiya', zh: 'keluodiya', ar: 'كرواتيا', hi: 'croatia' },
  PA: { fr: 'panama', en: 'panama', es: 'panama', de: 'panama', pt: 'panama', ru: 'panama', zh: 'banama', ar: 'بنما', hi: 'panama' },
  CR: { fr: 'costa-rica', en: 'costa-rica', es: 'costa-rica', de: 'costa-rica', pt: 'costa-rica', ru: 'kosta-rika', zh: 'gesidalijia', ar: 'كوستاريكا', hi: 'costa-rica' },
  EC: { fr: 'equateur', en: 'ecuador', es: 'ecuador', de: 'ecuador', pt: 'equador', ru: 'ekvador', zh: 'eguaduoer', ar: 'الإكوادور', hi: 'ecuador' },
  LK: { fr: 'sri-lanka', en: 'sri-lanka', es: 'sri-lanka', de: 'sri-lanka', pt: 'sri-lanka', ru: 'shri-lanka', zh: 'sililanka', ar: 'سريلانكا', hi: 'sri-lanka' },
  UA: { fr: 'ukraine', en: 'ukraine', es: 'ucrania', de: 'ukraine', pt: 'ucrania', ru: 'ukraina', zh: 'wukelan', ar: 'أوكرانيا', hi: 'ukraine' },
};

/** Role paths per language for lawyers */
const LAWYER_PATHS: Record<string, string> = {
  fr: 'avocats', en: 'lawyers', es: 'abogados', de: 'anwaelte',
  pt: 'advogados', ru: 'advokaty', ch: 'lushi', ar: 'محامون', hi: 'vakil',
};

/** Role paths per language for expats */
const EXPAT_PATHS: Record<string, string> = {
  fr: 'expatries', en: 'expats', es: 'expatriados', de: 'expats',
  pt: 'expatriados', ru: 'expaty', ch: 'haiwai', ar: 'مغتربون', hi: 'videshi',
};

/**
 * Normalize a country value to ISO 2-letter code.
 * Accepts ISO codes directly (2 letters) or full country names.
 */
function normalizeCountryToISO(country: string): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  // Already an ISO code (2 uppercase letters)
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  // Try uppercase version
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  // Lookup in NAME_TO_ISO
  return NAME_TO_ISO[trimmed] || null;
}

/**
 * Get the country slug for a given ISO code and language.
 * Falls back to lowercase ISO code if no specific slug exists.
 */
function getCountrySlug(isoCode: string, lang: string): string {
  const slugs = COUNTRY_SLUGS[isoCode];
  // Chinese: internal code is 'ch' but COUNTRY_SLUGS uses 'zh' key
  const slugLang = lang === 'ch' ? 'zh' : lang;
  if (slugs && slugs[slugLang]) return slugs[slugLang];
  // Fallback: lowercase ISO code
  return isoCode.toLowerCase();
}

export const sitemapCountryListings = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 5,
    minInstances: 0,
    invoker: 'public',
    cors: true,
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    ensureInitialized();
    try {
      const db = admin.firestore();

      // Query active, visible, approved providers
      const snapshot = await db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .get();

      // Build country×type matrix: { "TH_lawyer": true, "FR_expat": true, ... }
      const countryTypeSet = new Set<string>();

      snapshot.docs.forEach(doc => {
        const profile = doc.data();
        const providerType = profile.type as string | undefined; // 'lawyer' or 'expat'
        if (!providerType || (providerType !== 'lawyer' && providerType !== 'expat')) return;

        // Collect all countries for this provider
        const countries: string[] = [];

        // Primary country
        if (profile.country) {
          const iso = normalizeCountryToISO(profile.country as string);
          if (iso) countries.push(iso);
        }

        // All country array fields (different field names used across profiles)
        const countryArrayFields = ['operatingCountries', 'interventionCountries', 'practiceCountries'];
        for (const field of countryArrayFields) {
          const arr = profile[field];
          if (Array.isArray(arr)) {
            for (const c of arr) {
              if (typeof c === 'string' && c.trim()) {
                const iso = normalizeCountryToISO(c);
                if (iso) countries.push(iso);
              }
            }
          }
        }

        // Deduplicate and add to set
        const uniqueCountries = Array.from(new Set(countries));
        for (const iso of uniqueCountries) {
          countryTypeSet.add(`${iso}_${providerType}`);
        }
      });

      const today = new Date().toISOString().split('T')[0];
      const urlBlocks: string[] = [];

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      // For each country×type combination, generate URLs for all 9 languages
      const entries = Array.from(countryTypeSet).sort();
      let urlCount = 0;

      entries.forEach(entry => {
        const [isoCode, type] = entry.split('_');
        const rolePaths = type === 'lawyer' ? LAWYER_PATHS : EXPAT_PATHS;

        LANGUAGES.forEach(lang => {
          const locale = getLocaleString(lang);
          const rolePath = rolePaths[lang] || rolePaths['en'];
          const countrySlug = getCountrySlug(isoCode, lang);
          const url = `${SITE_URL}/${locale}/${rolePath}/${countrySlug}`;

          // Generate hreflang alternates for all 9 languages
          const hreflangs = LANGUAGES.map(hrefLang => {
            const hrefLocale = getLocaleString(hrefLang);
            const hrefRolePath = rolePaths[hrefLang] || rolePaths['en'];
            const hrefCountrySlug = getCountrySlug(isoCode, hrefLang);
            return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${hrefRolePath}/${hrefCountrySlug}`)}"/>`;
          }).join('\n');

          // x-default = French
          const defaultLocale = getLocaleString('fr');
          const defaultRolePath = rolePaths['fr'] || rolePaths['en'];
          const defaultCountrySlug = getCountrySlug(isoCode, 'fr');
          const xDefaultUrl = `${SITE_URL}/${defaultLocale}/${defaultRolePath}/${defaultCountrySlug}`;

          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultUrl)}"/>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>`);

          urlCount++;
        });
      });

      urlBlocks.push(`</urlset>`);
      const xml = urlBlocks.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);

      console.log(`✅ Sitemap country listings: ${entries.length} country×type combos, ${urlCount} URLs generated from ${snapshot.docs.length} providers`);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur sitemap country listings:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      res.status(500).send(`Error generating country listings sitemap: ${err.message}`);
    }
  }
);