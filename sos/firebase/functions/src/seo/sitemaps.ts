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
// ⚠️ CONVENTION: Chinese uses 'ch' internally (Firestore slugs key: profile.slugs['ch'])
// but 'zh' in URLs (zh-cn) and 'zh-Hans' in hreflang (BCP 47).
// Conversion is handled by getLocaleString() and getHreflangCode().
// DO NOT change 'ch' to 'zh' here without migrating all Firestore slugs data.
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
// 📊 SEO SCORING — Calcule la qualité d'un profil pour l'indexation
// Score /100 : ≥ 60 = premium (priority 0.9), 40-59 = standard (0.6), < 40 = exclu
// ============================================
function calculateProfileSEOScore(profile: Record<string, unknown>): number {
  let score = 0;

  // Reviews (25 pts)
  const reviewCount = Number(profile.reviewCount ?? profile.realReviewsCount ?? 0);
  score += reviewCount === 0 ? 0 : reviewCount < 5 ? 12 : 25;

  // Average rating (20 pts)
  const avgRating = Number(profile.averageRating ?? 0);
  score += avgRating < 3.5 ? 0 : avgRating < 4.3 ? 10 : 20;

  // Description length (15 pts)
  const descLen = String(profile.description ?? '').length;
  score += descLen < 100 ? 0 : descLen < 300 ? 8 : 15;

  // Photo (10 pts)
  const photo = String(profile.photoURL ?? '');
  score += photo && !photo.includes('default') && photo.length > 10 ? 10 : 0;

  // Specialties (10 pts)
  const specialties = Array.isArray(profile.specialties) ? profile.specialties.length
    : Array.isArray(profile.helpTypes) ? profile.helpTypes.length : 0;
  score += specialties === 0 ? 0 : specialties < 3 ? 5 : 10;

  // Total calls (10 pts)
  const calls = Number(profile.totalCalls ?? profile.callCount ?? 0);
  score += calls === 0 ? 0 : calls < 10 ? 5 : 10;

  // SEO data available (5 pts) — proxy: has slugs object with multiple keys
  const slugsCount = profile.slugs && typeof profile.slugs === 'object' ? Object.keys(profile.slugs as object).length : 0;
  score += slugsCount >= 5 ? 5 : slugsCount >= 1 ? 3 : 0;

  // Languages spoken (5 pts)
  const langs = Array.isArray(profile.languages) ? profile.languages.length : 0;
  score += langs < 2 ? 1 : langs < 4 ? 3 : 5;

  return score;
}

/** Min SEO score to include in sitemap (below = noindex, excluded) */
const MIN_SEO_SCORE = 40;
/** Score threshold for premium priority */
const PREMIUM_SEO_SCORE = 60;
/** Max URLs per sitemap file — Google recommends < 50K, we use 500 for faster crawl */
const MAX_URLS_PER_SITEMAP = 500;

// ============================================
// 🧑‍⚖️ SITEMAP: Profils prestataires
// Supports ?lang=fr to filter by language (optional, backward compatible)
// Without ?lang, returns ALL languages (legacy behavior)
// ============================================
export const sitemapProfiles = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.5,
    timeoutSeconds: 120,
    maxInstances: 5,
    minInstances: 1,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (req, res) => {
    ensureInitialized();
    try {
      const db = admin.firestore();

      // ✅ Optional language filter: ?lang=fr returns only French URLs
      // Without ?lang, returns all languages (backward compatible)
      const filterLang = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : null;
      // Validate filter lang is a known language
      if (filterLang && !LANGUAGES.includes(filterLang) && filterLang !== 'zh') {
        res.status(400).send(`Invalid lang parameter: ${filterLang}. Valid: ${LANGUAGES.join(', ')}, zh`);
        return;
      }
      // Map 'zh' URL param to 'ch' internal code
      const internalFilterLang = filterLang === 'zh' ? 'ch' : filterLang;

      // ✅ Optional pagination: ?page=1 (1-indexed). Without ?page, returns all URLs.
      // When used with ?lang=, splits large sitemaps into 500-URL pages.
      const pageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : null;
      const pageNum = pageParam && pageParam >= 1 ? pageParam : null;

      // ✅ Utilise sos_profiles (pas users)
      // Filtre les prestataires visibles, approuvés ET actifs
      const snapshot = await db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .get();

      const today = new Date().toISOString().split('T')[0];
      const languagesToGenerate = internalFilterLang ? [internalFilterLang] : LANGUAGES;

      // OPTIMISÉ: Utilise array.join() au lieu de += pour éviter O(n²)
      const allUrlBlocks: string[] = [];
      let includedCount = 0;
      let excludedByScore = 0;

      snapshot.docs.forEach(doc => {
        const profile = doc.data();

        // Skip profiles without a valid name (frontend will show 404 for these)
        const name = profile.fullName || profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        if (!name) return;

        // ✅ SEO SCORING: Calculate quality score and exclude low-quality profiles
        const seoScore = calculateProfileSEOScore(profile);
        if (seoScore < MIN_SEO_SCORE) {
          excludedByScore++;
          return; // Exclude from sitemap — will be noindex on frontend
        }

        // Dynamic priority based on score
        const priority = seoScore >= PREMIUM_SEO_SCORE ? '0.9' : '0.6';

        // Image tag for Google Images indexing — included in every language variant of the URL
        const photoUrl = (profile.photoURL as string | undefined) || (profile.profilePhoto as string | undefined) || '';
        const imageTag = photoUrl && photoUrl.startsWith('http') && !photoUrl.includes('default-avatar')
          ? `\n    <image:image>\n      <image:loc>${escapeXml(photoUrl)}</image:loc>\n      <image:title>${escapeXml(name)}</image:title>\n    </image:image>`
          : '';

        // Utilise les slugs multilingues si disponibles
        const slugs = profile.slugs as Record<string, string> | undefined;
        const hasSlugs = slugs && typeof slugs === 'object' && Object.keys(slugs).length > 0;

        // Skip si pas de slugs multilingues ET pas de slug simple
        if (!hasSlugs && !profile.slug) return;

        // Pour les profils avec slugs multilingues (nouveau format)
        if (hasSlugs) {
          languagesToGenerate.forEach(lang => {
            const slug = slugs[lang];
            if (!slug) return;

            // ✅ VALIDATION: Vérifier que le slug a une locale valide
            const slugLocale = extractLocaleFromSlug(slug);
            if (!slugLocale || !isValidLocale(slugLocale)) {
              console.warn(`⚠️ Slug invalide ignoré (${doc.id}, ${lang}): ${slug} (locale: ${slugLocale || 'none'})`);
              return;
            }

            // ✅ VALIDATION: Vérifier que la locale du slug correspond à la langue
            const expectedUrlLang = lang === 'ch' ? 'zh' : lang;
            const slugLangPart = slugLocale.split('-')[0];
            if (slugLangPart !== expectedUrlLang) {
              console.warn(`⚠️ Slug cross-langue ignoré (${doc.id}, ${lang}): locale ${slugLocale} != expected ${expectedUrlLang}`);
              return;
            }

            const url = `${SITE_URL}/${slug}`;

            // Génère les hreflang pour TOUTES les langues du profil (même si filtré par langue)
            // Google a besoin de la réciprocité complète
            const hreflangs = LANGUAGES.map(hrefLang => {
              const hrefSlug = slugs[hrefLang];
              if (!hrefSlug) return null;
              const hrefLocale = extractLocaleFromSlug(hrefSlug);
              if (!hrefLocale || !isValidLocale(hrefLocale)) return null;
              return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefSlug}`)}"/>`;
            }).filter(Boolean).join('\n');

            // x-default = français (si disponible et valide)
            let xDefaultSlug = slugs['fr'] || slug;
            const xDefaultLocale = extractLocaleFromSlug(xDefaultSlug);
            if (!xDefaultLocale || !isValidLocale(xDefaultLocale)) {
              xDefaultSlug = slug;
            }
            const xDefaultUrl = `${SITE_URL}/${xDefaultSlug}`;

            const profileLastmod = profile.updatedAt?.toDate?.()
              ? profile.updatedAt.toDate().toISOString().split('T')[0]
              : today;

            allUrlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultUrl)}"/>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
    <lastmod>${profileLastmod}</lastmod>${imageTag}
  </url>`);
            includedCount++;
          });
        } else if (profile.slug) {
          // Ancien format: slug unique (ex: "fr/expatrie-norvege/melissa-...")
          const legacySlug = profile.slug as string;
          const slugLang = legacySlug.split('/')[0];
          const isValidLang = LANGUAGES.includes(slugLang);

          if (isValidLang) {
            // Skip if filtering by language and this legacy slug doesn't match
            if (internalFilterLang && slugLang !== internalFilterLang) return;

            const url = `${SITE_URL}/${legacySlug}`;
            allUrlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
    <xhtml:link rel="alternate" hreflang="${getHreflangCode(slugLang)}" href="${escapeXml(url)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
    <lastmod>${today}</lastmod>${imageTag}
  </url>`);
            includedCount++;
          } else {
            // Slug sans préfixe langue (très ancien format)
            languagesToGenerate.forEach(lang => {
              const locale = getLocaleString(lang);
              const url = `${SITE_URL}/${locale}/${legacySlug}`;

              const hreflangs = LANGUAGES.map(hrefLang => {
                const hrefLocale = getLocaleString(hrefLang);
                return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${legacySlug}`)}"/>`;
              }).join('\n');

              const defaultLocale = getLocaleString('fr');
              allUrlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/${defaultLocale}/${legacySlug}`)}"/>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <lastmod>${today}</lastmod>${imageTag}
  </url>`);
              includedCount++;
            });
          }
        }
      });

      // ✅ PAGINATION: Slice to requested page (500 URLs max per page)
      let urlBlocksPage = allUrlBlocks;
      let totalPages = 1;
      if (pageNum && allUrlBlocks.length > MAX_URLS_PER_SITEMAP) {
        totalPages = Math.ceil(allUrlBlocks.length / MAX_URLS_PER_SITEMAP);
        const start = (pageNum - 1) * MAX_URLS_PER_SITEMAP;
        const end = start + MAX_URLS_PER_SITEMAP;
        urlBlocksPage = allUrlBlocks.slice(start, end);
        if (urlBlocksPage.length === 0) {
          // Page out of range — return empty valid sitemap
          res.set('Content-Type', 'application/xml; charset=utf-8');
          res.set('Cache-Control', 'public, max-age=3600');
          res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
          return;
        }
      } else if (!pageNum && allUrlBlocks.length > MAX_URLS_PER_SITEMAP && filterLang) {
        // Auto-truncate to first page if no page param but lang is set (avoid giant sitemaps)
        totalPages = Math.ceil(allUrlBlocks.length / MAX_URLS_PER_SITEMAP);
        urlBlocksPage = allUrlBlocks.slice(0, MAX_URLS_PER_SITEMAP);
      }

      const xmlParts = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
        `        xmlns:xhtml="http://www.w3.org/1999/xhtml"`,
        `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
        ...urlBlocksPage,
        `</urlset>`
      ];
      const xml = xmlParts.join('\n');

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      if (totalPages > 1) {
        res.set('X-Sitemap-Total-Pages', String(totalPages));
        res.set('X-Sitemap-Total-URLs', String(allUrlBlocks.length));
      }
      res.status(200).send(xml);

      const langLabel = filterLang ? ` (lang=${filterLang})` : ' (all langs)';
      const pageLabel = totalPages > 1 ? ` (page ${pageNum || 1}/${totalPages})` : '';
      console.log(`✅ Sitemap profils${langLabel}${pageLabel}: ${snapshot.docs.length} profils, ${includedCount} URLs included, ${excludedByScore} excluded by score < ${MIN_SEO_SCORE}`);

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
    minInstances: 1,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (req, res) => {
    ensureInitialized();
    try {
      console.log('🔄 Début génération sitemap help articles...');

      // ✅ Optional language filter: ?lang=fr
      const filterLang = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : null;
      if (filterLang && !LANGUAGES.includes(filterLang) && filterLang !== 'zh') {
        res.status(400).send(`Invalid lang parameter: ${filterLang}`);
        return;
      }
      const internalFilterLang = filterLang === 'zh' ? 'ch' : filterLang;

      const db = admin.firestore();
      console.log('✅ Firestore initialisé');

      console.log('📥 Récupération des help_articles...');
      // ✅ Optional pagination: ?page=1
      const helpPageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : null;
      const helpPageNum = helpPageParam && helpPageParam >= 1 ? helpPageParam : null;

      const snapshot = await db.collection('help_articles')
        .where('isPublished', '==', true)
        .limit(5000)
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
        ar: 'markaz-almusaeada',   // romanized (was Arabic script "مركز-المساعدة")
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

        // ✅ Use filtered languages if ?lang= provided, otherwise all
        const helpLanguagesToGenerate = internalFilterLang ? [internalFilterLang] : LANGUAGES;

        helpLanguagesToGenerate.forEach(lang => {
          // Si le slug a un préfixe de langue (ex: "ch-"), n'inclure que pour cette langue
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

      // ✅ Toujours retourner un urlset (jamais un sitemapindex)
      // Raison: sitemap.xml est lui-même un sitemapindex — Google interdit les sitemapindex imbriqués.
      // La limite Google est 50K URLs/fichier, largement au-dessus du volume help actuel.
      const helpPage = urlBlocks;

      const helpXml = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`, `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`, ...helpPage, `</urlset>`].join('\n');
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(helpXml);

      console.log(`✅ Sitemap help: ${publishedDocs.length} articles, ${urlBlocks.length} URLs`);

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
    minInstances: 1,
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
    minInstances: 1,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (req, res) => {
    ensureInitialized();
    try {
      console.log('🔄 Début génération sitemap FAQ...');

      // ✅ Optional language filter: ?lang=fr
      const faqFilterLang = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : null;
      const faqInternalFilterLang = faqFilterLang === 'zh' ? 'ch' : faqFilterLang;

      const db = admin.firestore();

      // Récupère les FAQ actives (collection app_faq, même que la SPA FAQ.tsx)
      const snapshot = await db.collection('app_faq')
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

        const faqLanguagesToGenerate = faqInternalFilterLang ? [faqInternalFilterLang] : LANGUAGES;

        faqLanguagesToGenerate.forEach(lang => {
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
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand', pt: 'tailandia', ru: 'tailand', zh: 'taiguo', ar: 'tailand', hi: 'thailand' },
  FR: { fr: 'france', en: 'france', es: 'francia', de: 'frankreich', pt: 'franca', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'france' },
  US: { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', de: 'vereinigte-staaten', pt: 'estados-unidos', ru: 'ssha', zh: 'meiguo', ar: 'al-wilayat-al-muttahida', hi: 'america' },
  GB: { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', de: 'vereinigtes-koenigreich', pt: 'reino-unido', ru: 'velikobritaniya', zh: 'yingguo', ar: 'al-mamlaka-al-muttahida', hi: 'britain' },
  DE: { fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland', pt: 'alemanha', ru: 'germaniya', zh: 'deguo', ar: 'almanya', hi: 'germany' },
  ES: { fr: 'espagne', en: 'spain', es: 'espana', de: 'spanien', pt: 'espanha', ru: 'ispaniya', zh: 'xibanya', ar: 'isbanya', hi: 'spain' },
  IT: { fr: 'italie', en: 'italy', es: 'italia', de: 'italien', pt: 'italia', ru: 'italiya', zh: 'yidali', ar: 'italya', hi: 'italy' },
  PT: { fr: 'portugal', en: 'portugal', es: 'portugal', de: 'portugal', pt: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'al-burtughal', hi: 'portugal' },
  BR: { fr: 'bresil', en: 'brazil', es: 'brasil', de: 'brasilien', pt: 'brasil', ru: 'braziliya', zh: 'baxi', ar: 'al-brazil', hi: 'brazil' },
  CA: { fr: 'canada', en: 'canada', es: 'canada', de: 'kanada', pt: 'canada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'canada' },
  AU: { fr: 'australie', en: 'australia', es: 'australia', de: 'australien', pt: 'australia', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralya', hi: 'australia' },
  JP: { fr: 'japon', en: 'japan', es: 'japon', de: 'japan', pt: 'japao', ru: 'yaponiya', zh: 'riben', ar: 'al-yaban', hi: 'japan' },
  CN: { fr: 'chine', en: 'china', es: 'china', de: 'china', pt: 'china', ru: 'kitay', zh: 'zhongguo', ar: 'al-sin', hi: 'china' },
  IN: { fr: 'inde', en: 'india', es: 'india', de: 'indien', pt: 'india', ru: 'indiya', zh: 'yindu', ar: 'al-hind', hi: 'bharat' },
  MA: { fr: 'maroc', en: 'morocco', es: 'marruecos', de: 'marokko', pt: 'marrocos', ru: 'marokko', zh: 'moluoge', ar: 'al-maghrib', hi: 'morocco' },
  DZ: { fr: 'algerie', en: 'algeria', es: 'argelia', de: 'algerien', pt: 'argelia', ru: 'alzhir', zh: 'aerjiliya', ar: 'al-jazair', hi: 'algeria' },
  TN: { fr: 'tunisie', en: 'tunisia', es: 'tunez', de: 'tunesien', pt: 'tunisia', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia' },
  SN: { fr: 'senegal', en: 'senegal', es: 'senegal', de: 'senegal', pt: 'senegal', ru: 'senegal', zh: 'saineijiaer', ar: 'al-sinighal', hi: 'senegal' },
  CI: { fr: 'cote-d-ivoire', en: 'ivory-coast', es: 'costa-de-marfil', de: 'elfenbeinkueste', pt: 'costa-do-marfim', ru: 'kot-divuar', zh: 'ketediwa', ar: 'sahil-al-aaj', hi: 'ivory-coast' },
  CM: { fr: 'cameroun', en: 'cameroon', es: 'camerun', de: 'kamerun', pt: 'camaroes', ru: 'kamerun', zh: 'kamailong', ar: 'al-kamirun', hi: 'cameroon' },
  BE: { fr: 'belgique', en: 'belgium', es: 'belgica', de: 'belgien', pt: 'belgica', ru: 'belgiya', zh: 'bilishi', ar: 'beljika', hi: 'belgium' },
  CH: { fr: 'suisse', en: 'switzerland', es: 'suiza', de: 'schweiz', pt: 'suica', ru: 'shveytsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  NL: { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', de: 'niederlande', pt: 'paises-baixos', ru: 'niderlandy', zh: 'helan', ar: 'hulanda', hi: 'netherlands' },
  MX: { fr: 'mexique', en: 'mexico', es: 'mexico', de: 'mexiko', pt: 'mexico', ru: 'meksika', zh: 'moxige', ar: 'al-maksik', hi: 'mexico' },
  AE: { fr: 'emirats-arabes-unis', en: 'united-arab-emirates', es: 'emiratos-arabes-unidos', de: 'vereinigte-arabische-emirate', pt: 'emirados-arabes-unidos', ru: 'oae', zh: 'alianqiu', ar: 'al-imarat', hi: 'uae' },
  SA: { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', de: 'saudi-arabien', pt: 'arabia-saudita', ru: 'saudovskaya-araviya', zh: 'shate', ar: 'al-saudiya', hi: 'saudi-arabia' },
  EG: { fr: 'egypte', en: 'egypt', es: 'egipto', de: 'aegypten', pt: 'egito', ru: 'yegipet', zh: 'aiji', ar: 'misr', hi: 'egypt' },
  RU: { fr: 'russie', en: 'russia', es: 'rusia', de: 'russland', pt: 'russia', ru: 'rossiya', zh: 'eluosi', ar: 'rusya', hi: 'russia' },
  TR: { fr: 'turquie', en: 'turkey', es: 'turquia', de: 'tuerkei', pt: 'turquia', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkya', hi: 'turkey' },
  PH: { fr: 'philippines', en: 'philippines', es: 'filipinas', de: 'philippinen', pt: 'filipinas', ru: 'filippiny', zh: 'feilvbin', ar: 'al-filibin', hi: 'philippines' },
  ID: { fr: 'indonesie', en: 'indonesia', es: 'indonesia', de: 'indonesien', pt: 'indonesia', ru: 'indoneziya', zh: 'yindunixiya', ar: 'indunisya', hi: 'indonesia' },
  VN: { fr: 'vietnam', en: 'vietnam', es: 'vietnam', de: 'vietnam', pt: 'vietna', ru: 'vyetnam', zh: 'yuenan', ar: 'fitnam', hi: 'vietnam' },
  KH: { fr: 'cambodge', en: 'cambodia', es: 'camboya', de: 'kambodscha', pt: 'camboja', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambodya', hi: 'cambodia' },
  SG: { fr: 'singapour', en: 'singapore', es: 'singapur', de: 'singapur', pt: 'singapura', ru: 'singapur', zh: 'xinjiapo', ar: 'singhafura', hi: 'singapore' },
  MY: { fr: 'malaisie', en: 'malaysia', es: 'malasia', de: 'malaysia', pt: 'malasia', ru: 'malayziya', zh: 'malaixiya', ar: 'malizya', hi: 'malaysia' },
  KR: { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', de: 'suedkorea', pt: 'coreia-do-sul', ru: 'yuzhnaya-koreya', zh: 'hanguo', ar: 'kurya-al-janubiya', hi: 'south-korea' },
  SE: { fr: 'suede', en: 'sweden', es: 'suecia', de: 'schweden', pt: 'suecia', ru: 'shvetsiya', zh: 'ruidian', ar: 'al-swid', hi: 'sweden' },
  NO: { fr: 'norvege', en: 'norway', es: 'noruega', de: 'norwegen', pt: 'noruega', ru: 'norvegiya', zh: 'nuowei', ar: 'al-nurwij', hi: 'norway' },
  DK: { fr: 'danemark', en: 'denmark', es: 'dinamarca', de: 'daenemark', pt: 'dinamarca', ru: 'daniya', zh: 'danmai', ar: 'al-danimark', hi: 'denmark' },
  FI: { fr: 'finlande', en: 'finland', es: 'finlandia', de: 'finnland', pt: 'finlandia', ru: 'finlyandiya', zh: 'fenlan', ar: 'finlanda', hi: 'finland' },
  PL: { fr: 'pologne', en: 'poland', es: 'polonia', de: 'polen', pt: 'polonia', ru: 'polsha', zh: 'bolan', ar: 'bulanda', hi: 'poland' },
  CZ: { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', de: 'tschechien', pt: 'republica-checa', ru: 'chekhiya', zh: 'jieke', ar: 'al-tshik', hi: 'czech-republic' },
  GR: { fr: 'grece', en: 'greece', es: 'grecia', de: 'griechenland', pt: 'grecia', ru: 'gretsiya', zh: 'xila', ar: 'al-yunan', hi: 'greece' },
  HU: { fr: 'hongrie', en: 'hungary', es: 'hungria', de: 'ungarn', pt: 'hungria', ru: 'vengriya', zh: 'xiongyali', ar: 'al-majar', hi: 'hungary' },
  RO: { fr: 'roumanie', en: 'romania', es: 'rumania', de: 'rumaenien', pt: 'romenia', ru: 'rumyniya', zh: 'luomaniya', ar: 'rumaniya', hi: 'romania' },
  AT: { fr: 'autriche', en: 'austria', es: 'austria', de: 'oesterreich', pt: 'austria', ru: 'avstriya', zh: 'aodili', ar: 'al-namsa', hi: 'austria' },
  IE: { fr: 'irlande', en: 'ireland', es: 'irlanda', de: 'irland', pt: 'irlanda', ru: 'irlandiya', zh: 'aierlan', ar: 'irlanda', hi: 'ireland' },
  NZ: { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', de: 'neuseeland', pt: 'nova-zelandia', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'nyuzilnda', hi: 'new-zealand' },
  IL: { fr: 'israel', en: 'israel', es: 'israel', de: 'israel', pt: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  LB: { fr: 'liban', en: 'lebanon', es: 'libano', de: 'libanon', pt: 'libano', ru: 'livan', zh: 'libanen', ar: 'lubnan', hi: 'lebanon' },
  QA: { fr: 'qatar', en: 'qatar', es: 'catar', de: 'katar', pt: 'catar', ru: 'katar', zh: 'kataer', ar: 'qatar', hi: 'qatar' },
  CO: { fr: 'colombie', en: 'colombia', es: 'colombia', de: 'kolumbien', pt: 'colombia', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kulumbya', hi: 'colombia' },
  AR: { fr: 'argentine', en: 'argentina', es: 'argentina', de: 'argentinien', pt: 'argentina', ru: 'argentina', zh: 'agenting', ar: 'al-arjantin', hi: 'argentina' },
  CL: { fr: 'chili', en: 'chile', es: 'chile', de: 'chile', pt: 'chile', ru: 'chili', zh: 'zhili', ar: 'tshili', hi: 'chile' },
  PE: { fr: 'perou', en: 'peru', es: 'peru', de: 'peru', pt: 'peru', ru: 'peru', zh: 'bilu', ar: 'biru', hi: 'peru' },
  KE: { fr: 'kenya', en: 'kenya', es: 'kenia', de: 'kenia', pt: 'quenia', ru: 'keniya', zh: 'kenniya', ar: 'kinya', hi: 'kenya' },
  MG: { fr: 'madagascar', en: 'madagascar', es: 'madagascar', de: 'madagaskar', pt: 'madagascar', ru: 'madagaskar', zh: 'madajiasijia', ar: 'madaghashqar', hi: 'madagascar' },
  LU: { fr: 'luxembourg', en: 'luxembourg', es: 'luxemburgo', de: 'luxemburg', pt: 'luxemburgo', ru: 'lyuksemburg', zh: 'lusenbao', ar: 'luksumburgh', hi: 'luxembourg' },
  HR: { fr: 'croatie', en: 'croatia', es: 'croacia', de: 'kroatien', pt: 'croacia', ru: 'khorvatiya', zh: 'keluodiya', ar: 'kurwatya', hi: 'croatia' },
  PA: { fr: 'panama', en: 'panama', es: 'panama', de: 'panama', pt: 'panama', ru: 'panama', zh: 'banama', ar: 'banama', hi: 'panama' },
  CR: { fr: 'costa-rica', en: 'costa-rica', es: 'costa-rica', de: 'costa-rica', pt: 'costa-rica', ru: 'kosta-rika', zh: 'gesidalijia', ar: 'kustarika', hi: 'costa-rica' },
  EC: { fr: 'equateur', en: 'ecuador', es: 'ecuador', de: 'ecuador', pt: 'equador', ru: 'ekvador', zh: 'eguaduoer', ar: 'al-ikwadur', hi: 'ecuador' },
  LK: { fr: 'sri-lanka', en: 'sri-lanka', es: 'sri-lanka', de: 'sri-lanka', pt: 'sri-lanka', ru: 'shri-lanka', zh: 'sililanka', ar: 'sirilanka', hi: 'sri-lanka' },
  UA: { fr: 'ukraine', en: 'ukraine', es: 'ucrania', de: 'ukraine', pt: 'ucrania', ru: 'ukraina', zh: 'wukelan', ar: 'ukranya', hi: 'ukraine' },
};

/** Role paths per language for lawyers */
const LAWYER_PATHS: Record<string, string> = {
  fr: 'avocats', en: 'lawyers', es: 'abogados', de: 'anwaelte',
  pt: 'advogados', ru: 'advokaty', ch: 'lushi', ar: 'muhamun', hi: 'vakil',
};

/** Role paths per language for expats */
const EXPAT_PATHS: Record<string, string> = {
  fr: 'expatries', en: 'expats', es: 'expatriados', de: 'expats',
  pt: 'expatriados', ru: 'expaty', ch: 'haiwai', ar: 'mughtaribun', hi: 'videshi',
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

/** Min number of qualified providers (score ≥ MIN_SEO_SCORE) for a country page to be in sitemap */
const MIN_PROVIDERS_FOR_COUNTRY = 1;

export const sitemapCountryListings = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
    maxInstances: 5,
    minInstances: 1,
    invoker: 'public',
    cors: true,
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (req, res) => {
    ensureInitialized();
    try {
      const db = admin.firestore();

      // ✅ Optional language filter: ?lang=fr returns only French URLs
      const filterLang = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : null;
      if (filterLang && !LANGUAGES.includes(filterLang) && filterLang !== 'zh') {
        res.status(400).send(`Invalid lang parameter: ${filterLang}`);
        return;
      }
      const internalFilterLang = filterLang === 'zh' ? 'ch' : filterLang;

      // ✅ Optional min providers override (default: 3)
      const minProviders = Number(req.query.min) || MIN_PROVIDERS_FOR_COUNTRY;

      // Query active, visible, approved providers
      const snapshot = await db.collection('sos_profiles')
        .where('isVisible', '==', true)
        .where('isApproved', '==', true)
        .where('isActive', '==', true)
        .get();

      // Build country×type matrix with COUNTS of qualified providers
      const countryTypeCounts = new Map<string, number>();

      snapshot.docs.forEach(doc => {
        const profile = doc.data();
        const providerType = profile.type as string | undefined;
        if (!providerType || (providerType !== 'lawyer' && providerType !== 'expat')) return;

        // ✅ Only count providers with sufficient SEO score
        const seoScore = calculateProfileSEOScore(profile);
        if (seoScore < MIN_SEO_SCORE) return;

        const countries: string[] = [];
        if (profile.country) {
          const iso = normalizeCountryToISO(profile.country as string);
          if (iso) countries.push(iso);
        }
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

        const uniqueCountries = Array.from(new Set(countries));
        for (const iso of uniqueCountries) {
          const key = `${iso}_${providerType}`;
          countryTypeCounts.set(key, (countryTypeCounts.get(key) || 0) + 1);
        }
      });

      const today = new Date().toISOString().split('T')[0];
      const urlBlocks: string[] = [];
      const languagesToGenerate = internalFilterLang ? [internalFilterLang] : LANGUAGES;

      urlBlocks.push(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`);

      // ✅ Filter: only country×type combos with ≥ minProviders qualified providers
      const qualifiedEntries = Array.from(countryTypeCounts.entries())
        .filter(([, count]) => count >= minProviders)
        .sort((a, b) => a[0].localeCompare(b[0]));

      let urlCount = 0;
      const excludedByThreshold = countryTypeCounts.size - qualifiedEntries.length;

      qualifiedEntries.forEach(([entry, providerCount]) => {
        const [isoCode, type] = entry.split('_');
        const rolePaths = type === 'lawyer' ? LAWYER_PATHS : EXPAT_PATHS;

        // Dynamic priority based on provider count
        const priority = providerCount >= 5 ? '0.9' : '0.7';

        languagesToGenerate.forEach(lang => {
          const locale = getLocaleString(lang);
          const rolePath = rolePaths[lang] || rolePaths['en'];
          const countrySlug = getCountrySlug(isoCode, lang);
          const url = `${SITE_URL}/${locale}/${rolePath}/${countrySlug}`;

          // Generate hreflang for ALL languages (reciprocity required by Google)
          const hreflangs = LANGUAGES.map(hrefLang => {
            const hrefLocale = getLocaleString(hrefLang);
            const hrefRolePath = rolePaths[hrefLang] || rolePaths['en'];
            const hrefCountrySlug = getCountrySlug(isoCode, hrefLang);
            return `    <xhtml:link rel="alternate" hreflang="${getHreflangCode(hrefLang)}" href="${escapeXml(`${SITE_URL}/${hrefLocale}/${hrefRolePath}/${hrefCountrySlug}`)}"/>`;
          }).join('\n');

          const defaultLocale = getLocaleString('fr');
          const defaultRolePath = rolePaths['fr'] || rolePaths['en'];
          const defaultCountrySlug = getCountrySlug(isoCode, 'fr');
          const xDefaultUrl = `${SITE_URL}/${defaultLocale}/${defaultRolePath}/${defaultCountrySlug}`;

          urlBlocks.push(`  <url>
    <loc>${escapeXml(url)}</loc>
${hreflangs}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefaultUrl)}"/>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
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

      const langLabel = filterLang ? ` (lang=${filterLang})` : ' (all langs)';
      console.log(`✅ Sitemap country listings${langLabel}: ${qualifiedEntries.length} qualified combos (${excludedByThreshold} excluded, min ${minProviders} providers), ${urlCount} URLs from ${snapshot.docs.length} providers`);

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

// ============================================
// 📋 SITEMAP INDEX — Dynamic index listing all segmented sitemaps
// Returns a sitemapindex XML listing per-language sitemaps
// Replaces the static sitemap.xml for better crawl targeting
// ============================================
export const sitemapIndex = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.5,
    timeoutSeconds: 60,
    maxInstances: 3,
    minInstances: 1,
    invoker: 'public',
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // All language codes used in sitemap file names (URL-safe)
      const LANG_CODES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

      const sitemaps: string[] = [];

      // Static pages (single file, all languages)
      sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

      // Per-language sitemaps: profiles, countries, help
      for (const lang of LANG_CODES) {
        sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/profiles-${lang}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      }

      // "listings" (not "countries") to avoid conflict with blog countries-{lang}.xml
      for (const lang of LANG_CODES) {
        sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/listings-${lang}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      }

      for (const lang of LANG_CODES) {
        sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/help-${lang}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      }

      // FAQ (single sitemap, small enough)
      sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/faq.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

      // Blog sitemaps (generated by Laravel, 4 types × 9 languages)
      const blogTypes = ['articles', 'categories', 'tags', 'countries'];
      for (const type of blogTypes) {
        for (const lang of LANG_CODES) {
          sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/${type}-${lang}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
        }
      }

      // Legacy sitemaps (kept for transition — Google still references them)
      // These return the same data as the per-language versions combined
      sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/profiles.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/country-listings.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      sitemaps.push(`  <sitemap>
    <loc>${SITE_URL}/sitemaps/help.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);

      console.log(`✅ Sitemap index: ${sitemaps.length} sitemaps listed`);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur sitemap index:', err.message);
      res.status(500).send(`Error generating sitemap index: ${err.message}`);
    }
  }
);