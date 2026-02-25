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

// ✅ WHITELIST: Locales valides pour SEO (empêche es-FR, zh-HR, etc.)
const VALID_LOCALES = new Set([
  'fr-fr', 'fr-ca', 'fr-be', 'fr-ch',
  'en-us', 'en-gb', 'en-ca', 'en-au',
  'es-es', 'es-mx', 'es-ar',
  'de-de', 'de-at', 'de-ch',
  'pt-pt', 'pt-br',
  'ru-ru',
  'zh-cn', 'zh-tw',
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
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
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

            urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultUrl)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
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
    memory: '128MiB',
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

      // Détecte si un slug a un préfixe de langue interne (ex: "ch-setting-prices" → "ch")
      // Utilisé pour n'indexer les articles non-traduits que dans leur langue native
      const detectSlugLangPrefix = (slug: string): string | null => {
        const match = slug.match(/^([a-z]{2})-/);
        if (match && LANGUAGES.includes(match[1])) {
          return match[1];
        }
        return null;
      };

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
    memory: '128MiB',
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

        LANGUAGES.forEach(lang => {
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
          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/${slug}`)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
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
    memory: '128MiB',
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

        LANGUAGES.forEach(lang => {
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