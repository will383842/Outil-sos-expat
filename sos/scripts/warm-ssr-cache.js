/**
 * warm-ssr-cache.js
 * Pre-warms the Firestore SSR cache by calling renderForBotsV2 for priority URLs.
 * Run before Google crawls to ensure fast HTML responses (no cold Puppeteer starts).
 *
 * Usage:
 *   node scripts/warm-ssr-cache.js                  # priority pages only (~50 URLs)
 *   node scripts/warm-ssr-cache.js --all            # all static pages from sitemap
 *   node scripts/warm-ssr-cache.js --top-profiles   # priority pages + top 50 provider profiles (FR+EN)
 */

const SSR_FUNCTION_URL =
  'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2';
const SITE_BASE = 'https://sos-expat.com';
const MAX_CONCURRENT = 1;       // Séquentiel — évite le rate limit de renderForBotsV2
const DELAY_BETWEEN_MS = 2000;  // 2s entre chaque requête (~0.5 req/s)
const TIMEOUT_MS = 90_000;
const RETRY_COUNT = 2;

// ─── Priority pages (run without --all) ────────────────────────────────────
const PRIORITY_PATHS = [
  // Homepages — all 9 locales
  '/fr-fr',
  '/en-us',
  '/es-es',
  '/de-de',
  '/pt-pt',
  '/ru-ru',
  '/zh-cn',
  '/ar-sa',
  '/hi-in',

  // FR — key pages
  '/fr-fr/faq',
  '/fr-fr/comment-ca-marche',
  '/fr-fr/tarifs',
  '/fr-fr/centre-aide',
  '/fr-fr/consommateurs',
  '/fr-fr/cgu-expatries',
  '/fr-fr/temoignages',
  '/fr-fr/contact',
  '/fr-fr/sos-appel',
  '/fr-fr/appel-expatrie',

  // EN — key pages
  '/en-us/faq',
  '/en-us/how-it-works',
  '/en-us/pricing',
  '/en-us/help-center',
  '/en-us/testimonials',
  '/en-us/contact',

  // ES — key pages
  '/es-es/preguntas-frecuentes',
  '/es-es/como-funciona',
  '/es-es/precios',
  '/es-es/centro-ayuda',

  // DE — key pages
  '/de-de/faq',
  '/de-de/wie-es-funktioniert',
  '/de-de/preise',
  '/de-de/hilfezentrum',

  // PT — key pages
  '/pt-pt/perguntas-frequentes',
  '/pt-pt/como-funciona',
  '/pt-pt/precos',
  '/pt-pt/centro-ajuda',

  // RU — key pages
  '/ru-ru/voprosy-otvety',
  '/ru-ru/kak-eto-rabotaet',
  '/ru-ru/tseny',
  '/ru-ru/tsentr-pomoshchi',

  // ZH — key pages
  '/zh-cn/changjian-wenti',
  '/zh-cn/ruhe-yunzuo',
  '/zh-cn/jiage',

  // HI — key pages
  '/hi-in/aksar-puche-jaane-wale-sawal',
  '/hi-in/kaise-kaam-karta-hai',

  // Captain landing — all 9 languages (new page, priority warm-up)
  '/fr-fr/devenir-capitaine',
  '/en-us/become-captain',
  '/es-es/ser-capitan',
  '/de-de/kapitaen-werden',
  '/pt-pt/tornar-se-capitao',
  '/ru-ru/stat-kapitanom',
  '/zh-cn/chengwei-duizhang',
  '/ar-sa/كن-قائدا',
  '/hi-in/captain-bane',

  // Chatter landing — all languages (high-traffic affiliate pages)
  '/fr-fr/devenir-chatter',
  '/en-us/become-chatter',
  '/es-es/ser-chatter',
  '/de-de/chatter-werden',
  '/pt-pt/tornar-se-chatter',
  '/ru-ru/stat-chatterom',
  '/zh-cn/chengwei-chatter',
  '/hi-in/chatter-bane',
];

// ─── Top provider profiles (run with --top-profiles) ────────────────────────
// TODO: automatiser via Firestore query sur sos_profiles
//   (e.g. top 50 par totalCalls ou reviewCount, extraire shortId/slug)
//   Exemple de query:
//     db.collection('sos_profiles')
//       .where('isVisible', '==', true)
//       .orderBy('totalCalls', 'desc')
//       .limit(50)
//   Puis générer les paths: /{locale}/avocat/{shortId} ou /{locale}/expatrie/{shortId}
//
// Routes FR: /fr-fr/avocat/{slug}  et  /fr-fr/expatrie/{slug}
// Routes EN: /en-us/lawyers/{slug} et  /en-us/expats/{slug}
//
// IMPORTANT: Remplacer les slugs ci-dessous par les vrais shortId/slug de vos prestataires.
// Vous pouvez les trouver dans Firestore: sos_profiles/{uid}.shortId
const TOP_PROFILE_SLUGS = [
  // { slug: 'short-id-or-slug', type: 'lawyer' },  // type: 'lawyer' or 'expat'
  // Exemple:
  // { slug: 'jean-dupont-abc12', type: 'lawyer' },
  // { slug: 'sarah-martin-def34', type: 'expat' },
];

// Génère les paths FR + EN pour chaque slug
const TOP_PROFILE_PATHS = TOP_PROFILE_SLUGS.flatMap(({ slug, type }) => {
  if (type === 'lawyer') {
    return [`/fr-fr/avocat/${slug}`, `/en-us/lawyers/${slug}`];
  }
  return [`/fr-fr/expatrie/${slug}`, `/en-us/expats/${slug}`];
});

// ─── All static pages (run with --all) ─────────────────────────────────────
// Derived from sitemap-static.xml — one canonical URL per page group
const ALL_PATHS = [
  ...PRIORITY_PATHS,

  // Registration pages
  '/fr-fr/inscription/avocat',
  '/fr-fr/inscription/expatrie',
  '/fr-fr/inscription/client',
  '/en-us/register/lawyer',
  '/en-us/register/expat',
  '/en-us/register/client',
  '/es-es/registro/abogado',
  '/es-es/registro/expatriado',
  '/es-es/registro/cliente',
  '/de-de/registrierung/anwalt',
  '/de-de/registrierung/expatriate',
  '/de-de/registrierung/kunde',
  '/pt-pt/registro/advogado',
  '/pt-pt/registro/expatriado',
  '/pt-pt/registro/cliente',
  '/ru-ru/registratsiya/advokat',
  '/ru-ru/registratsiya/expatriant',
  '/ru-ru/registratsiya/klient',

  // Legal pages
  '/fr-fr/cgu-avocats',
  '/fr-fr/cgu-clients',
  '/fr-fr/politique-confidentialite',
  '/fr-fr/cookies',
  '/en-us/terms-lawyers',
  '/en-us/terms-clients',
  '/en-us/privacy-policy',
  '/en-us/cookies',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function warmUrl(urlPath, index, total) {
  const fullUrl = `${SITE_BASE}${urlPath}`;
  const apiUrl = `${SSR_FUNCTION_URL}?path=${encodeURIComponent(urlPath)}&url=${encodeURIComponent(fullUrl)}&bot=googlebot`;

  for (let attempt = 1; attempt <= RETRY_COUNT + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        console.log(`  ✅ [${index}/${total}] ${urlPath} — HTTP ${res.status}`);
        return { path: urlPath, ok: true };
      } else {
        console.warn(`  ⚠️  [${index}/${total}] ${urlPath} — HTTP ${res.status} (attempt ${attempt})`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError' ? 'timeout' : err.message;
      console.warn(`  ⚠️  [${index}/${total}] ${urlPath} — ${msg} (attempt ${attempt})`);
    }

    if (attempt <= RETRY_COUNT) {
      await new Promise(r => setTimeout(r, 4000 * attempt)); // 4s, 8s entre retries
    }
  }

  console.error(`  ❌ [${index}/${total}] ${urlPath} — failed after ${RETRY_COUNT + 1} attempts`);
  return { path: urlPath, ok: false };
}

async function runWithConcurrency(tasks, maxConcurrent) {
  const results = [];
  let i = 0;

  async function runNext() {
    if (i >= tasks.length) return;
    const current = i++;
    const result = await tasks[current]();
    results.push(result);
    await runNext();
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, runNext);
  await Promise.all(workers);
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const useAll = process.argv.includes('--all');
  const useTopProfiles = process.argv.includes('--top-profiles');

  let paths;
  let modeLabel;
  if (useAll) {
    paths = ALL_PATHS;
    modeLabel = '--all (full sitemap)';
  } else if (useTopProfiles) {
    paths = [...PRIORITY_PATHS, ...TOP_PROFILE_PATHS];
    modeLabel = '--top-profiles (priority + top 50 provider profiles FR+EN)';
  } else {
    paths = PRIORITY_PATHS;
    modeLabel = 'priority pages only';
  }
  const total = paths.length;

  console.log(`\n🔥 SSR Cache Warm-up`);
  console.log(`   Mode      : ${modeLabel}`);
  console.log(`   URLs      : ${total}`);
  console.log(`   Concurrent: ${MAX_CONCURRENT} (séquentiel)`);
  console.log(`   Délai     : ${DELAY_BETWEEN_MS / 1000}s entre chaque requête`);
  console.log(`   Timeout   : ${TIMEOUT_MS / 1000}s par requête\n`);

  const startMs = Date.now();

  const tasks = paths.map((urlPath, idx) => async () => {
    if (idx > 0) await new Promise(r => setTimeout(r, DELAY_BETWEEN_MS));
    return warmUrl(urlPath, idx + 1, total);
  });
  const results = await runWithConcurrency(tasks, MAX_CONCURRENT);

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

  console.log(`\n📊 Results: ${ok}/${total} cached successfully in ${elapsed}s`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed URLs (${failed.length}):`);
    failed.forEach(r => console.log(`   - ${r.path}`));
    process.exit(1);
  } else {
    console.log('✅ All done — cache is warm and ready for Googlebot!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
