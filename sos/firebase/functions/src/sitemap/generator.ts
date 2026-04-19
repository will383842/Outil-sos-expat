/**
 * Sitemap Generator
 * Generates 3-level sitemap structure:
 * - Level 1: By Language-Country (1773 files)
 * - Level 2: By Country (197 files)
 * - Level 3: Global Index (1 file)
 */

import * as admin from 'firebase-admin';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as countriesConfig from './countries.json';

const gzip = promisify(zlib.gzip);

export interface SitemapFile {
  path: string; // relative path in dist/sitemaps/
  filename: string;
  content: string; // XML content (not gzipped, will be gzipped when saved)
  size: number; // size in bytes (gzipped)
}

// Parse language-country combinations from config
// This generates 1 sitemap per language-country (9 languages × 197 countries = 1773 sitemaps)
const LANGUAGE_COUNTRY_COMBINATIONS: Array<{ code: string; country: string }> = 
  countriesConfig.languages.flatMap((locale: string) => {
    const [lang] = locale.split('-');
    // For each language, create combinations with all countries
    return countriesConfig.countries.map((country: string) => ({
      code: lang,
      country: country.toLowerCase(),
    }));
  });

// Also keep the original for backward compatibility (default language-country pairs)
const LANGUAGES: Array<{ code: string; country: string }> = 
  countriesConfig.languages.map((locale: string) => {
    const [lang, country] = locale.split('-');
    return { code: lang, country: country.toLowerCase() };
  });

// All unique countries from config
const COUNTRIES: string[] = countriesConfig.countries.map((c: string) => c.toLowerCase());

const SITE_URL = 'https://sos-expat.com';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ hreflang: string; href: string }>;
}

interface StaticRoute {
  path: string;
  translated?: string;
  priority: number;
  changefreq: SitemapUrl['changefreq'];
}

// Static public routes (exclude protected routes)
const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/login', translated: 'login', priority: 0.5, changefreq: 'monthly' },
  { path: '/register', translated: 'register', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/client', translated: 'register-client', priority: 0.5, changefreq: 'monthly' },
  { path: '/register/lawyer', translated: 'register-lawyer', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/expat', translated: 'register-expat', priority: 0.6, changefreq: 'monthly' },
  { path: '/password-reset', translated: 'password-reset', priority: 0.3, changefreq: 'yearly' },
  { path: '/tarifs', translated: 'pricing', priority: 0.8, changefreq: 'monthly' },
  { path: '/contact', translated: 'contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/how-it-works', translated: 'how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/faq', translated: 'faq', priority: 0.7, changefreq: 'weekly' },
  { path: '/centre-aide', translated: 'help-center', priority: 0.6, changefreq: 'weekly' },
  { path: '/testimonials', translated: 'testimonials', priority: 0.7, changefreq: 'weekly' },
  { path: '/terms-clients', translated: 'terms-clients', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-lawyers', translated: 'terms-lawyers', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-expats', translated: 'terms-expats', priority: 0.4, changefreq: 'yearly' },
  { path: '/privacy-policy', translated: 'privacy-policy', priority: 0.5, changefreq: 'yearly' },
  { path: '/cookies', translated: 'cookies', priority: 0.3, changefreq: 'yearly' },
  { path: '/consumers', translated: 'consumers', priority: 0.5, changefreq: 'monthly' },
  { path: '/statut-service', translated: 'service-status', priority: 0.6, changefreq: 'daily' },
  { path: '/seo', translated: 'seo', priority: 0.5, changefreq: 'monthly' },
  { path: '/sos-appel', translated: 'sos-call', priority: 0.9, changefreq: 'daily' },
  { path: '/appel-expatrie', translated: 'expat-call', priority: 0.9, changefreq: 'daily' },
  { path: '/providers', translated: 'providers', priority: 0.8, changefreq: 'daily' },
];

// Route translations mapping (from localeRoutes.ts)
// IMPORTANT: All slugs MUST be romanized ASCII — matches localeRoutes.ts and sitemaps/constants.ts
const ROUTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'login': { fr: 'connexion', en: 'login', es: 'iniciar-sesion', ru: 'vkhod', de: 'anmeldung', hi: 'login', pt: 'entrar', ch: 'denglu', ar: 'tasjil-al-dakhul' },
  'register': { fr: 'inscription', en: 'register', es: 'registro', ru: 'registratsiya', de: 'registrierung', hi: 'panjikaran', pt: 'cadastro', ch: 'zhuce', ar: 'al-tasjil' },
  'register-client': { fr: 'inscription/client', en: 'register/client', es: 'registro/cliente', ru: 'registratsiya/klient', de: 'registrierung/kunde', hi: 'panjikaran/grahak', pt: 'registro/cliente', ch: 'zhuce/kehu', ar: 'tasjil/amil' },
  'register-lawyer': { fr: 'inscription/avocat', en: 'register/lawyer', es: 'registro/abogado', ru: 'registratsiya/advokat', de: 'registrierung/anwalt', hi: 'panjikaran/vakil', pt: 'registro/advogado', ch: 'zhuce/lushi', ar: 'tasjil/muhami' },
  'register-expat': { fr: 'inscription/expatrie', en: 'register/expat', es: 'registro/expatriado', ru: 'registratsiya/expatriant', de: 'registrierung/expatriate', hi: 'panjikaran/pravasi', pt: 'registro/expatriado', ch: 'zhuce/waipai', ar: 'tasjil/mugtarib' },
  'password-reset': { fr: 'reinitialisation-mot-de-passe', en: 'password-reset', es: 'restablecer-contrasena', ru: 'sbros-parolya', de: 'passwort-zurucksetzen', hi: 'password-reset', pt: 'redefinir-senha', ch: 'chongzhi-mima', ar: 'iadat-tayin-kalimat-al-murur' },
  'pricing': { fr: 'tarifs', en: 'pricing', es: 'precios', ru: 'tseny', de: 'preise', hi: 'mulya', pt: 'precos', ch: 'jiage', ar: 'al-asaar' },
  'contact': { fr: 'contact', en: 'contact', es: 'contacto', ru: 'kontakt', de: 'kontakt', hi: 'sampark', pt: 'contato', ch: 'lianxi', ar: 'ittasil-bina' },
  'how-it-works': { fr: 'comment-ca-marche', en: 'how-it-works', es: 'como-funciona', ru: 'kak-eto-rabotaet', de: 'wie-es-funktioniert', hi: 'kaise-kaam-karta-hai', pt: 'como-funciona', ch: 'ruhe-yunzuo', ar: 'kayfa-yamal' },
  'faq': { fr: 'faq', en: 'faq', es: 'preguntas-frecuentes', ru: 'voprosy-otvety', de: 'faq', hi: 'aksar-puche-jaane-wale-sawal', pt: 'perguntas-frequentes', ch: 'changjian-wenti', ar: 'al-asila-al-shaiya' },
  'help-center': { fr: 'centre-aide', en: 'help-center', es: 'centro-ayuda', ru: 'tsentr-pomoshchi', de: 'hilfezentrum', hi: 'sahayata-kendra', pt: 'centro-ajuda', ch: 'bangzhu-zhongxin', ar: 'markaz-almosaada' },
  'testimonials': { fr: 'temoignages', en: 'testimonials', es: 'testimonios', ru: 'otzyvy', de: 'testimonials', hi: 'prashansapatra', pt: 'depoimentos', ch: 'yonghu-pingjia', ar: 'al-shahdat' },
  'terms-clients': { fr: 'cgu-clients', en: 'terms-clients', es: 'terminos-clientes', ru: 'usloviya-klienty', de: 'agb-kunden', hi: 'shartein-grahak', pt: 'termos-clientes', ch: 'tiaokuan-kehu', ar: 'shurut-al-umala' },
  'terms-lawyers': { fr: 'cgu-avocats', en: 'terms-lawyers', es: 'terminos-abogados', ru: 'usloviya-advokaty', de: 'agb-anwaelte', hi: 'shartein-vakil', pt: 'termos-advogados', ch: 'tiaokuan-lushi', ar: 'shurut-al-muhamin' },
  'terms-expats': { fr: 'cgu-expatries', en: 'terms-expats', es: 'terminos-expatriados', ru: 'usloviya-expatrianty', de: 'agb-expatriates', hi: 'shartein-pravasi', pt: 'termos-expatriados', ch: 'tiaokuan-waipai', ar: 'shurut-al-mugtaribin' },
  'privacy-policy': { fr: 'politique-confidentialite', en: 'privacy-policy', es: 'politica-privacidad', ru: 'politika-konfidentsialnosti', de: 'datenschutzrichtlinie', hi: 'gopaniyata-niti', pt: 'politica-privacidade', ch: 'yinsi-zhengce', ar: 'siyasat-al-khususiya' },
  'cookies': { fr: 'cookies', en: 'cookies', es: 'cookies', ru: 'cookies', de: 'cookies', hi: 'cookies', pt: 'cookies', ch: 'cookies', ar: 'milafat-al-tarif' },
  'consumers': { fr: 'consommateurs', en: 'consumers', es: 'consumidores', ru: 'potrebiteli', de: 'verbraucher', hi: 'upbhokta', pt: 'consumidores', ch: 'xiaofeizhe', ar: 'al-mustahlikin' },
  'service-status': { fr: 'statut-service', en: 'service-status', es: 'estado-servicio', ru: 'status-servisa', de: 'dienststatus', hi: 'seva-sthiti', pt: 'status-servico', ch: 'fuwu-zhuangtai', ar: 'halat-al-khidma' },
  'seo': { fr: 'referencement', en: 'seo', es: 'seo', ru: 'seo', de: 'seo', hi: 'seo', pt: 'seo', ch: 'seo', ar: 'tahsin-muharrikat-al-bahth' },
  'sos-call': { fr: 'sos-appel', en: 'emergency-call', es: 'llamada-emergencia', ru: 'ekstrenniy-zvonok', de: 'notruf', hi: 'aapatkaalin-call', pt: 'chamada-emergencia', ch: 'jinji-dianhua', ar: 'mukalama-tawariy' },
  'expat-call': { fr: 'appel-expatrie', en: 'expat-call', es: 'llamada-expatriado', ru: 'zvonok-expatriantu', de: 'expatriate-anruf', hi: 'pravasi-call', pt: 'chamada-expatriado', ch: 'waipai-dianhua', ar: 'mukalama-al-mugtarib' },
  'providers': { fr: 'prestataires', en: 'providers', es: 'proveedores', ru: 'postavshchiki', de: 'anbieter', hi: 'seva-pradaata', pt: 'prestadores', ch: 'fuwu-tigongzhe', ar: 'muqadimi-al-khidmat' },
};

/**
 * Get translated route slug for a language.
 *
 * Internal normalization: `ROUTE_TRANSLATIONS` and `localeRoutes.ts` both use
 * `ch` as the historical key for Chinese, but URL locales emitted by this
 * sitemap (and served by the SPA / Cloudflare Worker) use `zh-cn` (lang=`zh`).
 * Without this alias the sitemap emits untranslated English slugs under the
 * Chinese locale (e.g. /zh-cn/how-it-works) which the Worker then 301-redirects
 * to the translated slug (/zh-cn/ruhe-yunzuo), triggering GSC's "Page avec
 * redirection" warning on the sitemap entry itself.
 */
function getTranslatedRouteSlug(routeKey: string, lang: string): string {
  const normalizedLang = lang === 'zh' ? 'ch' : lang;
  return ROUTE_TRANSLATIONS[routeKey]?.[normalizedLang] || routeKey;
}

/**
 * Generate locale string (e.g., "en-us", "fr-fr")
 **/

function getLocaleString(lang: string, country: string): string {
  return `${lang}-${country.toLowerCase()}`;
}

/**
 ** Normalize country name to URL slug
 **/
function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert country name (in any language) to ISO country code
 * Handles: "Canada", "France", "Espagne", "Afghanistan", etc.
 */
function countryNameToCode(countryName: string): string {
  if (!countryName) return '';
  
  // If it's already a 2-letter code, return it lowercase
  if (countryName.length === 2) {
    return countryName.toLowerCase();
  }
  
  // Normalize: lowercase, remove accents, trim
  const normalized = countryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  // Comprehensive mapping of country names (all languages) to ISO codes
  const countryMap: Record<string, string> = {
    // English
    'afghanistan': 'af',
    'albania': 'al',
    'algeria': 'dz',
    'andorra': 'ad',
    'angola': 'ao',
    'argentina': 'ar',
    'armenia': 'am',
    'australia': 'au',
    'austria': 'at',
    'azerbaijan': 'az',
    'bahamas': 'bs',
    'bahrain': 'bh',
    'bangladesh': 'bd',
    'barbados': 'bb',
    'belarus': 'by',
    'belgium': 'be',
    'belize': 'bz',
    'benin': 'bj',
    'bhutan': 'bt',
    'bolivia': 'bo',
    'bosnia and herzegovina': 'ba',
    'bosnia': 'ba',
    'botswana': 'bw',
    'brazil': 'br',
    'brunei': 'bn',
    'bulgaria': 'bg',
    'burkina faso': 'bf',
    'burundi': 'bi',
    'cambodia': 'kh',
    'cameroon': 'cm',
    'canada': 'ca',
    'cape verde': 'cv',
    'chile': 'cl',
    'china': 'cn',
    'colombia': 'co',
    'comoros': 'km',
    'congo': 'cg',
    'costa rica': 'cr',
    'croatia': 'hr',
    'cuba': 'cu',
    'cyprus': 'cy',
    'czech republic': 'cz',
    'denmark': 'dk',
    'djibouti': 'dj',
    'dominica': 'dm',
    'dominican republic': 'do',
    'ecuador': 'ec',
    'egypt': 'eg',
    'el salvador': 'sv',
    'equatorial guinea': 'gq',
    'eritrea': 'er',
    'estonia': 'ee',
    'ethiopia': 'et',
    'fiji': 'fj',
    'finland': 'fi',
    'france': 'fr',
    'gabon': 'ga',
    'gambia': 'gm',
    'georgia': 'ge',
    'germany': 'de',
    'ghana': 'gh',
    'greece': 'gr',
    'grenada': 'gd',
    'guatemala': 'gt',
    'guinea': 'gn',
    'guinea-bissau': 'gw',
    'guyana': 'gy',
    'haiti': 'ht',
    'honduras': 'hn',
    'hungary': 'hu',
    'iceland': 'is',
    'india': 'in',
    'indonesia': 'id',
    'iran': 'ir',
    'iraq': 'iq',
    'ireland': 'ie',
    'israel': 'il',
    'italy': 'it',
    'ivory coast': 'ci',
    'jamaica': 'jm',
    'japan': 'jp',
    'jordan': 'jo',
    'kazakhstan': 'kz',
    'kenya': 'ke',
    'kiribati': 'ki',
    'north korea': 'kp',
    'south korea': 'kr',
    'kuwait': 'kw',
    'kyrgyzstan': 'kg',
    'laos': 'la',
    'latvia': 'lv',
    'lebanon': 'lb',
    'lesotho': 'ls',
    'liberia': 'lr',
    'libya': 'ly',
    'liechtenstein': 'li',
    'lithuania': 'lt',
    'luxembourg': 'lu',
    'madagascar': 'mg',
    'malawi': 'mw',
    'malaysia': 'my',
    'maldives': 'mv',
    'mali': 'ml',
    'malta': 'mt',
    'marshall islands': 'mh',
    'mauritania': 'mr',
    'mauritius': 'mu',
    'mexico': 'mx',
    'micronesia': 'fm',
    'moldova': 'md',
    'monaco': 'mc',
    'mongolia': 'mn',
    'montenegro': 'me',
    'morocco': 'ma',
    'mozambique': 'mz',
    'myanmar': 'mm',
    'namibia': 'na',
    'nauru': 'nr',
    'nepal': 'np',
    'netherlands': 'nl',
    'new zealand': 'nz',
    'nicaragua': 'ni',
    'niger': 'ne',
    'nigeria': 'ng',
    'north macedonia': 'mk',
    'norway': 'no',
    'oman': 'om',
    'pakistan': 'pk',
    'palau': 'pw',
    'palestine': 'ps',
    'panama': 'pa',
    'papua new guinea': 'pg',
    'paraguay': 'py',
    'peru': 'pe',
    'philippines': 'ph',
    'poland': 'pl',
    'portugal': 'pt',
    'qatar': 'qa',
    'romania': 'ro',
    'russia': 'ru',
    'rwanda': 'rw',
    'saint kitts and nevis': 'kn',
    'saint lucia': 'lc',
    'saint vincent and the grenadines': 'vc',
    'samoa': 'ws',
    'san marino': 'sm',
    'sao tome and principe': 'st',
    'saudi arabia': 'sa',
    'senegal': 'sn',
    'serbia': 'rs',
    'seychelles': 'sc',
    'sierra leone': 'sl',
    'singapore': 'sg',
    'slovakia': 'sk',
    'slovenia': 'si',
    'solomon islands': 'sb',
    'somalia': 'so',
    'south africa': 'za',
    'south sudan': 'ss',
    'sri lanka': 'lk',
    'sudan': 'sd',
    'suriname': 'sr',
    'sweden': 'se',
    'switzerland': 'ch',
    'syria': 'sy',
    'tajikistan': 'tj',
    'tanzania': 'tz',
    'thailand': 'th',
    'timor-leste': 'tl',
    'togo': 'tg',
    'tonga': 'to',
    'trinidad and tobago': 'tt',
    'tunisia': 'tn',
    'turkey': 'tr',
    'turkmenistan': 'tm',
    'tuvalu': 'tv',
    'uganda': 'ug',
    'ukraine': 'ua',
    'united arab emirates': 'ae',
    'uae': 'ae',
    'united kingdom': 'gb',
    'uk': 'gb',
    'united states': 'us',
    'usa': 'us',
    'uruguay': 'uy',
    'uzbekistan': 'uz',
    'vanuatu': 'vu',
    'vatican city': 'va',
    'venezuela': 've',
    'vietnam': 'vn',
    'yemen': 'ye',
    'zambia': 'zm',
    'zimbabwe': 'zw',
    
    // French names (only unique ones not in English)
    'afrique du sud': 'za',
    'albanie': 'al',
    'algerie': 'dz',
    'allemagne': 'de',
    'andorre': 'ad',
    'arabie saoudite': 'sa',
    'argentine': 'ar',
    'armenie': 'am',
    'australie': 'au',
    'autriche': 'at',
    'azerbaidjan': 'az',
    'bahrein': 'bh',
    'barbade': 'bb',
    'belgique': 'be',
    'bhoutan': 'bt',
    'bielorussie': 'by',
    'birmanie': 'mm',
    'bolivie': 'bo',
    'bosnie-herzegovine': 'ba',
    'bresil': 'br',
    'bulgarie': 'bg',
    'cambodge': 'kh',
    'cameroun': 'cm',
    'cap-vert': 'cv',
    'chili': 'cl',
    'chine': 'cn',
    'chypre': 'cy',
    'colombie': 'co',
    'comores': 'km',
    'coree du nord': 'kp',
    'coree du sud': 'kr',
    'cote divoire': 'ci',
    'croatie': 'hr',
    'danemark': 'dk',
    'dominique': 'dm',
    'egypte': 'eg',
    'emirats arabes unis': 'ae',
    'equateur': 'ec',
    'erythree': 'er',
    'espagne': 'es',
    'estonie': 'ee',
    'etats-unis': 'us',
    'ethiopie': 'et',
    'fidji': 'fj',
    'finlande': 'fi',
    'gambie': 'gm',
    'georgie': 'ge',
    'grece': 'gr',
    'grenade': 'gd',
    'guinee': 'gn',
    'guinee-bissau': 'gw',
    'guyane': 'gy',
    'hongrie': 'hu',
    'islande': 'is',
    'inde': 'in',
    'indonesie': 'id',
    'irak': 'iq',
    'irlande': 'ie',
    'italie': 'it',
    'jamaique': 'jm',
    'japon': 'jp',
    'jordanie': 'jo',
    'koweit': 'kw',
    'kirghizistan': 'kg',
    'lettonie': 'lv',
    'liban': 'lb',
    'libye': 'ly',
    'lituanie': 'lt',
    'malaisie': 'my',
    'malte': 'mt',
    'marshall': 'mh',
    'mauritanie': 'mr',
    'maurice': 'mu',
    'mexique': 'mx',
    'micronesie': 'fm',
    'moldavie': 'md',
    'mongolie': 'mn',
    'maroc': 'ma',
    'namibie': 'na',
    'pays-bas': 'nl',
    'nouvelle-zelande': 'nz',
    'macedoine du nord': 'mk',
    'norvege': 'no',
    'palaos': 'pw',
    'papouasie-nouvelle-guinee': 'pg',
    'perou': 'pe',
    'pologne': 'pl',
    'roumanie': 'ro',
    'russie': 'ru',
    'saint-kitts-et-nevis': 'kn',
    'sainte-lucie': 'lc',
    'saint-vincent-et-les-grenadines': 'vc',
    'saint-marin': 'sm',
    'sao tome-et-principe': 'st',
    'serbie': 'rs',
    'singapour': 'sg',
    'slovaquie': 'sk',
    'slovenie': 'si',
    'iles salomon': 'sb',
    'somalie': 'so',
    'soudan': 'sd',
    'suede': 'se',
    'suisse': 'ch',
    'syrie': 'sy',
    'tadjikistan': 'tj',
    'tanzanie': 'tz',
    'thailande': 'th',
    'timor oriental': 'tl',
    'trinite-et-tobago': 'tt',
    'tunisie': 'tn',
    'turquie': 'tr',
    'ouganda': 'ug',
    'ouzbekistan': 'uz',
    'vatican': 'va',
    'zambie': 'zm',
  };
  
  // Try exact match first
  if (countryMap[normalized]) {
    return countryMap[normalized];
  }
  
  // Try partial match (for multi-word countries)
  for (const [key, code] of Object.entries(countryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return code;
    }
  }
  
  // Fallback: return first 2 letters if it looks like a code, otherwise return empty
  return normalized.length >= 2 ? normalized.slice(0, 2) : '';
}

/**
 * Generate URL for a route in a specific locale
 */
function generateRouteUrl(route: StaticRoute, lang: string, country: string): string {
  const locale = getLocaleString(lang, country);
  let path = route.path;
  
  if (route.translated) {
    const slug = getTranslatedRouteSlug(route.translated, lang);
    // Replace the first segment with translated slug
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      segments[0] = slug;
      path = '/' + segments.join('/');
    }
  }
  
  return `${SITE_URL}/${locale}${path}`;
}

/**
 * Generate provider profile URL
 */
function generateProviderUrl(
  provider: admin.firestore.DocumentSnapshot,
  lang: string,
  country: string
): string {
  const data = provider.data();
  // Get translated route slug based on language
  const routeKey = data?.type === 'lawyer' ? 'lawyer' : 'expat';
  const type = getTranslatedRouteSlug(routeKey, lang) || (data?.type === 'lawyer' ? 'avocat' : 'expatrie');
  
  // Use translated slug if available, otherwise generate from name
  const nameSlug = data?.slug || (data?.fullName || data?.name || 'expert')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
  
  // Append ID only if slug doesn't already contain it
  const finalSlug = nameSlug.includes(provider.id) ? nameSlug : `${nameSlug}-${provider.id}`;
  
  const locale = getLocaleString(lang, country);
  // Simplified URL structure: /{locale}/{type}/{slug}
  return `${SITE_URL}/${locale}/${type}/${finalSlug}`;
}

/**
 * Generate XML for a sitemap
 */
function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls.map(url => {
    let xml = '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    
    if (url.alternates && url.alternates.length > 0) {
      url.alternates.forEach(alt => {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}" />\n`;
      });
    }
    
    xml += '  </url>\n';
    return xml;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}</urlset>`;
}

/**
 * Generate sitemap index XML
 */
function generateSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const sitemapEntries = sitemaps.map(sitemap => {
    let xml = '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sitemap.loc)}</loc>\n`;
    if (sitemap.lastmod) {
      xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';
    return xml;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}</sitemapindex>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get all public providers from Firestore (with pagination for large datasets)
 * Optimized to handle thousands of providers efficiently
 */
async function getPublicProviders(): Promise<admin.firestore.DocumentSnapshot[]> {
  const db = admin.firestore();
  const allProviders: admin.firestore.DocumentSnapshot[] = [];
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  const batchSize = 500;
  
  console.log('📖 Fetching public providers in batches...');
  
  while (true) {
    // Query without isVisible/isBanned filters, we'll filter in code
    let query = db.collection('sos_profiles')
      .limit(batchSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      break;
    }
    
    // Filter in code to handle missing fields
    const batch = snapshot.docs.filter(doc => {
      const data = doc.data();
      
      // Skip admins
      if (data.isAdmin === true) {
        return false;
      }
      
      // Check type
      if (!data.type || !['lawyer', 'expat'].includes(data.type)) {
        return false;
      }
      
      // isVisible: treat undefined/null as visible (default to visible)
      if (data.isVisible === false) {
        return false;
      }
      
      // isBanned: treat undefined/null as not banned (default to not banned)
      if (data.isBanned === true) {
        return false;
      }
      
      return true;
    });
    
    allProviders.push(...batch);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    console.log(`  ✓ Fetched ${batch.length} providers (total: ${allProviders.length})`);
    
    if (snapshot.docs.length < batchSize) {
      break;
    }
  }
  
  console.log(`✅ Total providers fetched: ${allProviders.length}`);
  return allProviders;
}

/**
 * Generate Level 1 sitemap (by language-country)
 */
async function generateLevel1Sitemap(
  lang: string,
  country: string,
  providers: admin.firestore.DocumentSnapshot[]
): Promise<string> {
  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Add static routes
  for (const route of STATIC_ROUTES) {
    const url = generateRouteUrl(route, lang, country);
    urls.push({
      loc: url,
      lastmod: now,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }
  
  // Add provider profiles
  for (const provider of providers) {
    const url = generateProviderUrl(provider, lang, country);
    const data = provider.data();
    const updatedAt = data?.updatedAt?.toDate?.() || new Date();
    
    urls.push({
      loc: url,
      lastmod: updatedAt.toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.7,
    });
  }
  
  return generateSitemapXml(urls);
}

/**
 * Generate Level 2 sitemap (by country, all languages)
 */
async function generateLevel2Sitemap(
  countryName: string,
  providers: admin.firestore.DocumentSnapshot[]
): Promise<string> {
  const urls: SitemapUrl[] = [];
  const now = new Date().toISOString().split('T')[0];
  
  // Add static routes for all languages
  for (const lang of LANGUAGES) {
    for (const route of STATIC_ROUTES) {
      const url = generateRouteUrl(route, lang.code, lang.country);
      urls.push({
        loc: url,
        lastmod: now,
        changefreq: route.changefreq,
        priority: route.priority,
      });
    }
  }
  
  // Add provider profiles for all languages
  const countryProviders = providers.filter(p => {
    const data = p.data();
    const providerCountryCode = countryNameToCode(data?.country || '');
    const targetCountryCode = countryNameToCode(countryName);
    return providerCountryCode && targetCountryCode && providerCountryCode === targetCountryCode;
  });
  
  for (const provider of countryProviders) {
    for (const lang of LANGUAGES) {
      const url = generateProviderUrl(provider, lang.code, lang.country);
      const data = provider.data();
      const updatedAt = data?.updatedAt?.toDate?.() || new Date();
      
      urls.push({
        loc: url,
        lastmod: updatedAt.toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7,
      });
    }
  }
  
  return generateSitemapXml(urls);
}

/**
 * Prepare sitemap file for download (returns file info with gzipped size)
 */
async function prepareSitemapFile(
  relativePath: string,
  filename: string,
  content: string
): Promise<SitemapFile> {
  const gzipped = await gzip(Buffer.from(content, 'utf-8'));
  console.log(`✅ Prepared: ${filename} (${(gzipped.length / 1024).toFixed(2)} KB gzipped)`);
  
  return {
    path: relativePath,
    filename,
    content, // Return uncompressed content - will be gzipped when saved locally
    size: gzipped.length,
  };
}

/**
 * Submit sitemap to search engines
 */
async function submitSitemapToSearchEngines(sitemapUrl: string): Promise<void> {
  const engines = [
    {
      name: 'Google',
      url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
    {
      name: 'Bing',
      url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
    {
      name: 'Yandex',
      url: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
  ];
  
  for (const engine of engines) {
    try {
      const response = await fetch(engine.url);
      if (response.ok) {
        console.log(`✅ Submitted to ${engine.name}`);
      } else {
        console.warn(`⚠️ ${engine.name} submission failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error submitting to ${engine.name}:`, error);
    }
  }
}

/**
 * Log generation results to Firestore for monitoring
 */
async function logSitemapGeneration(results: {
  level1Count: number;
  level2Count: number;
  totalFiles: number;
  totalSize: number;
  duration: number;
  errors?: string[];
}): Promise<void> {
  try {
    const db = admin.firestore();
    
    await db.collection('sitemap_logs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: results.errors && results.errors.length > 0 ? 'partial' : 'success',
      level1Count: results.level1Count,
      level2Count: results.level2Count,
      totalFiles: results.totalFiles,
      totalSize: results.totalSize, // in bytes
      duration: results.duration, // in milliseconds
      errors: results.errors || [],
      sitemapIndexUrl: `${SITE_URL}/sitemaps/sitemap-index.xml.gz`,
    });
    
    console.log('📊 Generation logged to Firestore (collection: sitemap_logs)');
  } catch (error) {
    console.warn('⚠️ Failed to log to Firestore:', error);
  }
}

/**
 * Main function to generate all sitemaps
 * Returns sitemap files instead of uploading to Storage
 */
export async function generateAllSitemaps(): Promise<{
  level1: SitemapFile[];
  level2: SitemapFile[];
  level3: SitemapFile | null;
  summary: {
    level1Count: number;
    level2Count: number;
    totalFiles: number;
    totalSize: number;
    duration: number;
    errors?: string[];
  };
}> {
  const startTime = Date.now();
  console.log('🚀 Starting sitemap generation...');
  
  const errors: string[] = [];
  let totalSize = 0;
  const level1Files: SitemapFile[] = [];
  const level2Files: SitemapFile[] = [];
  const sitemapIndexUrls: Array<{ loc: string; lastmod: string }> = [];
  const now = new Date().toISOString().split('T')[0];
  
  try {
    const providers = await getPublicProviders();
    
    console.log(`📊 Found ${providers.length} public providers`);
    
    // Get unique countries from providers (convert names to codes)
    const countries = new Set<string>();
    providers.forEach(p => {
      const country = p.data()?.country;
      if (country) {
        const countryCode = countryNameToCode(country);
        if (countryCode) {
          countries.add(countryCode.toUpperCase());
        }
      }
    });
    
    console.log(`🌍 Found ${countries.size} unique countries from providers`);
    
    // Generate Level 1 sitemaps (by language-country) - ALL combinations
    console.log('📝 Generating Level 1 sitemaps (by language-country)...');
    console.log(`   Creating ${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps (${LANGUAGES.length} languages × ${COUNTRIES.length} countries)`);
    for (const langCountry of LANGUAGE_COUNTRY_COMBINATIONS) {
      try {
        const sitemapContent = await generateLevel1Sitemap(langCountry.code, langCountry.country, providers);
        const filename = `sitemap-${langCountry.code}-${langCountry.country}.xml.gz`;
        const relativePath = `language-country/${filename}`;
        const file = await prepareSitemapFile(relativePath, filename, sitemapContent);
        totalSize += file.size;
        level1Files.push(file);
        
        sitemapIndexUrls.push({
          loc: `${SITE_URL}/sitemaps/${relativePath}`,
          lastmod: now,
        });
        
        // Log progress every 100 sitemaps
        if (level1Files.length % 100 === 0) {
          console.log(`  ✓ Progress: ${level1Files.length}/${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps`);
        }
      } catch (error) {
        const errorMsg = `Failed to generate Level 1 sitemap for ${langCountry.code}-${langCountry.country}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`✅ Level 1 complete: ${level1Files.length}/${LANGUAGE_COUNTRY_COMBINATIONS.length} sitemaps generated`);
    
    // Generate Level 2 sitemaps (by country)
    console.log('📝 Generating Level 2 sitemaps (by country)...');
    // Generate for ALL countries (not just those with providers)
    const countriesArray = COUNTRIES;
    for (let i = 0; i < countriesArray.length; i++) {
      const country = countriesArray[i];
      try {
        const countrySlug = countryToSlug(country);
        const sitemapContent = await generateLevel2Sitemap(country, providers);
        const filename = `sitemap-country-${countrySlug}.xml.gz`;
        const relativePath = `country/${filename}`;
        const file = await prepareSitemapFile(relativePath, filename, sitemapContent);
        totalSize += file.size;
        level2Files.push(file);
        
        sitemapIndexUrls.push({
          loc: `${SITE_URL}/sitemaps/${relativePath}`,
          lastmod: now,
        });
        
        // Log progress every 10 countries
        if ((i + 1) % 10 === 0 || i === countriesArray.length - 1) {
          console.log(`  ✓ Progress: ${i + 1}/${countriesArray.length} countries`);
        }
      } catch (error) {
        const errorMsg = `Failed to generate Level 2 sitemap for ${country}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`✅ Level 2 complete: ${level2Files.length}/${countriesArray.length} sitemaps generated`);
    
    // Generate Level 3 sitemap index
    console.log('📝 Generating Level 3 sitemap index...');
    let level3File: SitemapFile | null = null;
    try {
      const indexContent = generateSitemapIndexXml(sitemapIndexUrls);
      const filename = 'sitemap-index.xml.gz';
      const relativePath = `global/${filename}`;
      level3File = await prepareSitemapFile(relativePath, filename, indexContent);
      totalSize += level3File.size;
    } catch (error) {
      const errorMsg = `Failed to generate sitemap index: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
    
    // Submit to search engines
    console.log('📤 Submitting to search engines...');
    try {
      if (level3File) {
        await submitSitemapToSearchEngines(`${SITE_URL}/sitemaps/${level3File.path}`);
      }
    } catch (error) {
      const errorMsg = `Failed to submit to search engines: ${error}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      level1Count: level1Files.length,
      level2Count: level2Files.length,
      totalFiles: level1Files.length + level2Files.length + (level3File ? 1 : 0),
      totalSize,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    };
    
    // Log to Firestore for monitoring
    await logSitemapGeneration(summary);
    
    console.log('✅ Sitemap generation complete!');
    console.log(`📊 Summary: ${summary.totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB, ${(duration / 1000).toFixed(2)}s`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ Completed with ${errors.length} errors`);
    }
    
    return {
      level1: level1Files,
      level2: level2Files,
      level3: level3File,
      summary,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    await logSitemapGeneration({
      level1Count: 0,
      level2Count: 0,
      totalFiles: 0,
      totalSize: 0,
      duration,
      errors: [String(error)],
    });
    throw error;
  }
}
