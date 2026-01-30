/**
 * Test script for Cloudflare Worker URL patterns
 * Verifies SSR coverage for all 9 languages and Unicode characters
 *
 * Run with: node test-all-patterns.js
 */

// ==========================================================================
// PATTERNS (copied from worker.js for testing)
// ==========================================================================

const BLOG_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/tsentr-pomoshchi\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/مركز-المساعدة\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/markaz-almusaeada\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/articles\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/actualites\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/news\/[^\/]+$/i,
  // Catch-all with exclusions for system paths
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(admin|api|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|assets|static|_next|favicon))[a-z-]+\/[a-zA-Z0-9\u0600-\u06FF\u0900-\u097F-]+$/i,
];

const LANDING_PAGE_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/?$/i,
  // Pricing
  /^\/[a-z]{2}(-[a-z]{2})?\/tarifs\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/pricing\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/precios\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/preise\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/tseny\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/precos\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/jiage\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/mulya\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسعار\/?$/i,
  // FAQ
  /^\/[a-z]{2}(-[a-z]{2})?\/faq\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/preguntas-frecuentes\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسئلة-الشائعة\/?$/i,
  // Dynamic patterns (Latin only with exclusions)
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(assets|api|admin|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|_next|static|favicon|profil|profile|perfil))[a-z][a-z0-9-]+\/?$/i,
  // Arabic patterns (must START with Arabic char)
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0600-\u06FF][\u0600-\u06FF\u0020-\u007F\-]+\/?$/i,
  // Hindi/Devanagari patterns (must START with Devanagari char)
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0900-\u097F][\u0900-\u097F\u0020-\u007F\-]+\/?$/i,
];

const PROVIDER_PROFILE_PATTERNS = [
  /^\/[a-z]{2}-[a-z]{2}\/avocat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/lawyer-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/abogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/anwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/advokat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/advogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/lushi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/vakil-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/muhami-[a-z]+\/[^\/]+$/i,
  // Arabic native
  /^\/[a-z]{2}-[a-z]{2}\/محامي-[\u0600-\u06FFa-z]+\/[^\/]+$/i,
  // Hindi native
  /^\/[a-z]{2}-[a-z]{2}\/वकील-[\u0900-\u097Fa-z]+\/[^\/]+$/i,
  // Fallbacks
  /^\/[a-z]{2}-[a-z]{2}\/[a-z]+-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/[\u0600-\u06FF]+-[\u0600-\u06FFa-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/[\u0900-\u097F]+-[\u0900-\u097Fa-z]+\/[^\/]+$/i,
];

// ==========================================================================
// TEST FUNCTIONS
// ==========================================================================

function isBlogPath(pathname) {
  return BLOG_PATTERNS.some(pattern => pattern.test(pathname));
}

function isLandingPagePath(pathname) {
  return LANDING_PAGE_PATTERNS.some(pattern => pattern.test(pathname));
}

function isProviderProfilePath(pathname) {
  return PROVIDER_PROFILE_PATTERNS.some(pattern => pattern.test(pathname));
}

function needsPrerendering(pathname) {
  return isProviderProfilePath(pathname) || isBlogPath(pathname) || isLandingPagePath(pathname);
}

// ==========================================================================
// TEST CASES - All 9 Languages + 197 Countries
// ==========================================================================

const testCases = {
  // ========== HOMEPAGES (all locales) ==========
  homepages: [
    { url: '/fr-fr/', expected: true, desc: 'French France' },
    { url: '/en-us/', expected: true, desc: 'English USA' },
    { url: '/es-es/', expected: true, desc: 'Spanish Spain' },
    { url: '/de-de/', expected: true, desc: 'German Germany' },
    { url: '/ru-ru/', expected: true, desc: 'Russian Russia' },
    { url: '/pt-br/', expected: true, desc: 'Portuguese Brazil' },
    { url: '/zh-cn/', expected: true, desc: 'Chinese China' },
    { url: '/hi-in/', expected: true, desc: 'Hindi India' },
    { url: '/ar-sa/', expected: true, desc: 'Arabic Saudi Arabia' },
    { url: '/fr-be/', expected: true, desc: 'French Belgium' },
    { url: '/en-gb/', expected: true, desc: 'English UK' },
    { url: '/es-mx/', expected: true, desc: 'Spanish Mexico' },
    { url: '/ar-eg/', expected: true, desc: 'Arabic Egypt' },
  ],

  // ========== PRICING PAGES (all 9 languages) ==========
  pricing: [
    { url: '/fr-fr/tarifs', expected: true, desc: 'Pricing FR' },
    { url: '/en-us/pricing', expected: true, desc: 'Pricing EN' },
    { url: '/es-es/precios', expected: true, desc: 'Pricing ES' },
    { url: '/de-de/preise', expected: true, desc: 'Pricing DE' },
    { url: '/ru-ru/tseny', expected: true, desc: 'Pricing RU' },
    { url: '/pt-br/precos', expected: true, desc: 'Pricing PT' },
    { url: '/zh-cn/jiage', expected: true, desc: 'Pricing ZH' },
    { url: '/hi-in/mulya', expected: true, desc: 'Pricing HI' },
    { url: '/ar-sa/الأسعار', expected: true, desc: 'Pricing AR (native)' },
  ],

  // ========== FAQ PAGES (all 9 languages) ==========
  faq: [
    { url: '/fr-fr/faq', expected: true, desc: 'FAQ FR' },
    { url: '/en-us/faq', expected: true, desc: 'FAQ EN' },
    { url: '/es-es/preguntas-frecuentes', expected: true, desc: 'FAQ ES' },
    { url: '/de-de/faq', expected: true, desc: 'FAQ DE' },
    { url: '/ru-ru/voprosy-otvety', expected: true, desc: 'FAQ RU' },
    { url: '/pt-br/perguntas-frequentes', expected: true, desc: 'FAQ PT' },
    { url: '/zh-cn/changjian-wenti', expected: true, desc: 'FAQ ZH' },
    { url: '/hi-in/aksar-puche-jaane-wale-sawal', expected: true, desc: 'FAQ HI' },
    { url: '/ar-sa/الأسئلة-الشائعة', expected: true, desc: 'FAQ AR (native)' },
  ],

  // ========== HELP CENTER ARTICLES (all 9 languages) ==========
  helpCenter: [
    { url: '/fr-fr/centre-aide/comment-creer-compte', expected: true, desc: 'Help FR' },
    { url: '/en-us/help-center/how-to-create-account', expected: true, desc: 'Help EN' },
    { url: '/es-es/centro-ayuda/como-crear-cuenta', expected: true, desc: 'Help ES' },
    { url: '/de-de/hilfezentrum/konto-erstellen', expected: true, desc: 'Help DE' },
    { url: '/ru-ru/tsentr-pomoshchi/kak-sozdat-akkaunt', expected: true, desc: 'Help RU' },
    { url: '/pt-br/centro-ajuda/como-criar-conta', expected: true, desc: 'Help PT' },
    { url: '/zh-cn/bangzhu-zhongxin/ruhe-chuangjian-zhanghao', expected: true, desc: 'Help ZH' },
    { url: '/hi-in/sahayata-kendra/khata-kaise-banaye', expected: true, desc: 'Help HI' },
    { url: '/ar-sa/مركز-المساعدة/كيفية-إنشاء-حساب', expected: true, desc: 'Help AR (native)' },
  ],

  // ========== BLOG ARTICLES (catch-all) ==========
  blog: [
    { url: '/fr-fr/blog/nouvel-article-2024', expected: true, desc: 'Blog FR' },
    { url: '/en-us/blog/new-article-2024', expected: true, desc: 'Blog EN' },
    { url: '/ar-sa/blog/مقال-جديد-2024', expected: true, desc: 'Blog AR (native slug)' },
    { url: '/hi-in/blog/नया-लेख-2024', expected: true, desc: 'Blog HI (native slug)' },
  ],

  // ========== PROVIDER PROFILES (all 9 languages) ==========
  providerProfiles: [
    // French
    { url: '/fr-fr/avocat-thailande/jean-dupont-abc123', expected: true, desc: 'Lawyer FR' },
    { url: '/fr-be/avocat-belgique/marc-leroy-def456', expected: true, desc: 'Lawyer FR Belgium' },
    // English
    { url: '/en-us/lawyer-thailand/john-smith-xyz789', expected: true, desc: 'Lawyer EN' },
    { url: '/en-gb/lawyer-uk/james-wilson-ghi012', expected: true, desc: 'Lawyer EN UK' },
    // Spanish
    { url: '/es-es/abogado-espana/carlos-garcia-jkl345', expected: true, desc: 'Lawyer ES' },
    { url: '/es-mx/abogado-mexico/miguel-rodriguez-mno678', expected: true, desc: 'Lawyer ES Mexico' },
    // German
    { url: '/de-de/anwalt-deutschland/hans-mueller-pqr901', expected: true, desc: 'Lawyer DE' },
    // Russian
    { url: '/ru-ru/advokat-rossiya/ivan-petrov-stu234', expected: true, desc: 'Lawyer RU' },
    // Portuguese
    { url: '/pt-br/advogado-brasil/joao-silva-vwx567', expected: true, desc: 'Lawyer PT Brazil' },
    // Chinese (pinyin)
    { url: '/zh-cn/lushi-zhongguo/zhang-wei-yza890', expected: true, desc: 'Lawyer ZH' },
    // Hindi (romanized)
    { url: '/hi-in/vakil-bharat/raj-kumar-bcd123', expected: true, desc: 'Lawyer HI' },
    // Arabic (romanized)
    { url: '/ar-sa/muhami-saudiarabia/ahmad-ali-efg456', expected: true, desc: 'Lawyer AR (romanized)' },
    // Arabic (native script)
    { url: '/ar-sa/محامي-السعودية/أحمد-علي-abc123', expected: true, desc: 'Lawyer AR (native)' },
    // Hindi (native script)
    { url: '/hi-in/वकील-भारत/राज-कुमार-abc123', expected: true, desc: 'Lawyer HI (native)' },
  ],

  // ========== NEW/DYNAMIC LANDING PAGES ==========
  dynamicLandingPages: [
    { url: '/fr-fr/nouvelle-campagne-2024', expected: true, desc: 'New campaign FR' },
    { url: '/en-us/special-offer-january', expected: true, desc: 'New campaign EN' },
    { url: '/ar-sa/حملة-جديدة', expected: true, desc: 'New campaign AR (native)' },
    { url: '/hi-in/नया-अभियान', expected: true, desc: 'New campaign HI (native)' },
  ],

  // ========== EXCLUDED PATHS (should NOT match) ==========
  excludedPaths: [
    { url: '/admin/dashboard', expected: false, desc: 'Admin dashboard' },
    { url: '/fr-fr/admin/users', expected: false, desc: 'Admin FR' },
    { url: '/fr-fr/api/users', expected: false, desc: 'API endpoint' },
    { url: '/fr-fr/assets/image.png', expected: false, desc: 'Static assets' },
    { url: '/fr-fr/tableau-de-bord', expected: false, desc: 'Dashboard FR (excluded)' },
    { url: '/en-us/dashboard', expected: false, desc: 'Dashboard EN (excluded)' },
    { url: '/fr-fr/inscription/avocat', expected: false, desc: 'Registration FR' },
    { url: '/en-us/register/lawyer', expected: false, desc: 'Registration EN' },
    { url: '/fr-fr/connexion', expected: false, desc: 'Login FR' },
    { url: '/en-us/login', expected: false, desc: 'Login EN' },
  ],

  // ========== COUNTRIES (197 countries sample) ==========
  countries: [
    { url: '/fr-fr/pays/thailande', expected: true, desc: 'Country Thailand FR' },
    { url: '/en-us/country/japan', expected: true, desc: 'Country Japan EN' },
    { url: '/es-es/pays/argentina', expected: true, desc: 'Country Argentina ES' },
    { url: '/ar-sa/pays/مصر', expected: true, desc: 'Country Egypt AR' },
  ],
};

// ==========================================================================
// RUN TESTS
// ==========================================================================

console.log('='.repeat(70));
console.log('SOS EXPAT - Cloudflare Worker Pattern Tests');
console.log('Testing SSR coverage for 9 languages + 197 countries');
console.log('='.repeat(70));
console.log('');

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

for (const [category, tests] of Object.entries(testCases)) {
  console.log(`\n${category.toUpperCase()}`);
  console.log('-'.repeat(50));

  for (const test of tests) {
    totalTests++;
    const result = needsPrerendering(test.url);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`  [PASS] ${test.desc}: ${test.url}`);
    } else {
      failed++;
      failures.push({ ...test, result });
      console.log(`  [FAIL] ${test.desc}: ${test.url}`);
      console.log(`         Expected: ${test.expected}, Got: ${result}`);
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passed} (${((passed/totalTests)*100).toFixed(1)}%)`);
console.log(`Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nFAILED TESTS:');
  failures.forEach(f => {
    console.log(`  - ${f.desc}: ${f.url} (expected ${f.expected}, got ${f.result})`);
  });
}

console.log('\n' + '='.repeat(70));
if (failed === 0) {
  console.log('ALL TESTS PASSED - Production Ready!');
} else {
  console.log('SOME TESTS FAILED - Review patterns before deployment');
}
console.log('='.repeat(70));

process.exit(failed > 0 ? 1 : 0);
