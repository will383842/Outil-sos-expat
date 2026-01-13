// Test patterns from worker.js
const BLOG_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/articles\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/actualites\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/news\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/guides\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/ressources\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+\/[^\/]+$/i,
];

const LANDING_PATTERNS = [
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(assets|api|admin|dashboard|inscription|register|connexion|login|tableau-de-bord|_next))[a-z][a-z0-9-]+\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/services\/[^\/]+\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/pays\/[^\/]+\/?$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/promo\/[^\/]+\/?$/i,
];

function testBlog(path) {
  return BLOG_PATTERNS.some(p => p.test(path));
}

function testLanding(path) {
  return LANDING_PATTERNS.some(p => p.test(path));
}

// Test blog articles
console.log('=== BLOG ARTICLES ===');
console.log('/fr-fr/blog/nouvel-article:', testBlog('/fr-fr/blog/nouvel-article'));
console.log('/en-us/help-center/new-article:', testBlog('/en-us/help-center/new-article'));
console.log('/fr-fr/actualites/news-2024:', testBlog('/fr-fr/actualites/news-2024'));
console.log('/de-de/guides/guide-expat:', testBlog('/de-de/guides/guide-expat'));
console.log('/fr-fr/blog/category/article:', testBlog('/fr-fr/blog/category/article'));

console.log('');
console.log('=== LANDING PAGES ===');
console.log('/fr-fr/nouvelle-landing-page:', testLanding('/fr-fr/nouvelle-landing-page'));
console.log('/en-us/new-campaign-2024:', testLanding('/en-us/new-campaign-2024'));
console.log('/fr-fr/services/avocat-expatriation:', testLanding('/fr-fr/services/avocat-expatriation'));
console.log('/fr-fr/pays/thailande:', testLanding('/fr-fr/pays/thailande'));
console.log('/fr-fr/promo/black-friday:', testLanding('/fr-fr/promo/black-friday'));

console.log('');
console.log('=== EXCLUDED (should be false) ===');
console.log('/fr-fr/admin:', testLanding('/fr-fr/admin'));
console.log('/fr-fr/dashboard:', testLanding('/fr-fr/dashboard'));
console.log('/fr-fr/api:', testLanding('/fr-fr/api'));
console.log('/fr-fr/inscription:', testLanding('/fr-fr/inscription'));
console.log('/fr-fr/login:', testLanding('/fr-fr/login'));
