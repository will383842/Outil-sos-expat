/**
 * SOS Expat - Cloudflare Worker for Bot Detection and SSR Redirect
 *
 * This worker intercepts requests and:
 * 1. Detects bot user-agents (search engines, social media crawlers, AI bots)
 * 2. For bots visiting provider profile URLs, redirects to Firebase Cloud Function for SSR
 * 3. For regular users, passes the request through to the origin (Digital Ocean)
 */

// Firebase Cloud Function URL for server-side rendering
const SSR_FUNCTION_URL = 'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2';

// Comprehensive list of bot user-agents to detect
const BOT_USER_AGENTS = [
  // Search Engine Crawlers
  'googlebot',
  'google-inspectiontool',
  'google-safety',
  'googleother',
  'google-extended',
  'bingbot',
  'bingpreview',
  'msnbot',
  'yandexbot',
  'yandex',
  'baiduspider',
  'duckduckbot',
  'slurp',           // Yahoo
  'sogou',
  'exabot',
  'ia_archiver',     // Alexa
  'archive.org_bot',
  'qwantify',
  'ecosia',
  'petalbot',        // Huawei/Aspiegel
  'seznam',
  'naver',
  'coccoc',
  'applebot',

  // Social Media Crawlers
  'facebookexternalhit',
  'facebookcatalog',
  'facebook',
  'twitterbot',
  'linkedinbot',
  'linkedin',
  'pinterest',
  'pinterestbot',
  'slackbot',
  'slack-imgproxy',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'viber',
  'line-poker',
  'snapchat',
  'redditbot',
  'tumblr',
  'skypeuripreview',

  // AI/LLM Crawlers
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'gemini',
  'bard',
  'meta-externalagent',
  'meta-externalfetcher',
  'bytespider',      // TikTok/ByteDance
  'amazonbot',
  'ccbot',           // Common Crawl (used for AI training)
  'diffbot',
  'omgili',
  'omgilibot',

  // SEO/Analytics Tools
  'ahrefs',
  'ahrefsbot',
  'semrush',
  'semrushbot',
  'mj12bot',         // Majestic
  'dotbot',          // Moz
  'rogerbot',        // Moz
  'screaming frog',
  'seokicks',
  'sistrix',
  'blexbot',
  'megaindex',
  'serpstatbot',
  'dataforseo',
  'zoominfobot',

  // Preview/Rendering Bots
  'prerender',
  'headlesschrome',
  'chrome-lighthouse',
  'lighthouse',
  'pagespeed',
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'site24x7',

  // RSS/Feed Readers
  'feedfetcher',
  'feedly',
  'newsblur',
  'inoreader',

  // Other Bots
  'bot',
  'crawler',
  'spider',
  'scraper',
  'wget',
  'curl',
  'python-requests',
  'python-urllib',
  'go-http-client',
  'java/',
  'apache-httpclient',
  'libwww-perl',
  'php/',
  'ruby',
  'node-fetch',
  'axios',
];

// URL patterns that need SSR/Prerendering for bots
// Includes: provider profiles, blog/help articles, landing pages, key static pages

// ==========================================================================
// BLOG/HELP CENTER PATTERNS (all 9 languages + 197 countries)
// These patterns automatically catch ANY new article published
// Supports: FR, EN, ES, DE, RU, PT, ZH (Chinese), HI (Hindi), AR (Arabic)
// ==========================================================================
const BLOG_PATTERNS = [
  // Help Center articles - ALL 9 LANGUAGES with translated slugs
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+$/i,           // French
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+$/i,           // English
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/[^\/]+$/i,          // German
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/[^\/]+$/i,          // Spanish
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/[^\/]+$/i,          // Portuguese
  /^\/[a-z]{2}(-[a-z]{2})?\/tsentr-pomoshchi\/[^\/]+$/i,      // Russian
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/[^\/]+$/i,      // Chinese (pinyin)
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/[^\/]+$/i,       // Hindi (romanized)
  /^\/[a-z]{2}(-[a-z]{2})?\/مركز-المساعدة\/[^\/]+$/i,         // Arabic (native)
  /^\/[a-z]{2}(-[a-z]{2})?\/markaz-almusaeada\/[^\/]+$/i,     // Arabic (romanized)

  // Blog articles - ALL LANGUAGES
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+$/i,                  // Generic /blog/
  /^\/[a-z]{2}(-[a-z]{2})?\/articles\/[^\/]+$/i,              // /articles/
  /^\/[a-z]{2}(-[a-z]{2})?\/actualites\/[^\/]+$/i,            // French news
  /^\/[a-z]{2}(-[a-z]{2})?\/news\/[^\/]+$/i,                  // English news
  /^\/[a-z]{2}(-[a-z]{2})?\/noticias\/[^\/]+$/i,              // Spanish/Portuguese news
  /^\/[a-z]{2}(-[a-z]{2})?\/nachrichten\/[^\/]+$/i,           // German news
  /^\/[a-z]{2}(-[a-z]{2})?\/novosti\/[^\/]+$/i,               // Russian news
  /^\/[a-z]{2}(-[a-z]{2})?\/xinwen\/[^\/]+$/i,                // Chinese news (pinyin)
  /^\/[a-z]{2}(-[a-z]{2})?\/samachar\/[^\/]+$/i,              // Hindi news
  /^\/[a-z]{2}(-[a-z]{2})?\/akhbar\/[^\/]+$/i,                // Arabic news (romanized)

  // Guides and resources - ALL LANGUAGES
  /^\/[a-z]{2}(-[a-z]{2})?\/guides\/[^\/]+$/i,                // Guides
  /^\/[a-z]{2}(-[a-z]{2})?\/guide\/[^\/]+$/i,                 // Guide (singular)
  /^\/[a-z]{2}(-[a-z]{2})?\/ressources\/[^\/]+$/i,            // Resources FR
  /^\/[a-z]{2}(-[a-z]{2})?\/resources\/[^\/]+$/i,             // Resources EN
  /^\/[a-z]{2}(-[a-z]{2})?\/recursos\/[^\/]+$/i,              // Resources ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/ressourcen\/[^\/]+$/i,            // Resources DE
  /^\/[a-z]{2}(-[a-z]{2})?\/resursy\/[^\/]+$/i,               // Resources RU

  // FAQ articles (deep links)
  /^\/[a-z]{2}(-[a-z]{2})?\/faq\/[^\/]+$/i,                   // FAQ articles
  /^\/[a-z]{2}(-[a-z]{2})?\/preguntas-frecuentes\/[^\/]+$/i,  // FAQ ES
  /^\/[a-z]{2}(-[a-z]{2})?\/perguntas-frequentes\/[^\/]+$/i,  // FAQ PT
  /^\/[a-z]{2}(-[a-z]{2})?\/voprosy-otvety\/[^\/]+$/i,        // FAQ RU
  /^\/[a-z]{2}(-[a-z]{2})?\/changjian-wenti\/[^\/]+$/i,       // FAQ ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/aksar-puche-jaane-wale-sawal\/[^\/]+$/i, // FAQ HI

  // Nested blog categories (e.g., /blog/category/article)
  /^\/[a-z]{2}(-[a-z]{2})?\/blog\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/[^\/]+\/[^\/]+$/i,
  /^\/[a-z]{2}(-[a-z]{2})?\/guides\/[^\/]+\/[^\/]+$/i,

  // Catch-all for any /locale/category/slug pattern (flexible for future content)
  // EXCLUDES: admin, api, dashboard, inscription, register, connexion, login, tableau-de-bord, panel, assets, static
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(admin|api|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|assets|static|_next|favicon))[a-z-]+\/[a-zA-Z0-9\u0600-\u06FF\u0900-\u097F-]+$/i,
];

// Landing pages and key static pages that need prerendering
// These patterns automatically catch ANY new landing page or static page
// ========================================================================
// COMPLETE COVERAGE FOR ALL 9 LANGUAGES:
// FR (French), EN (English), ES (Spanish), DE (German), RU (Russian),
// PT (Portuguese), ZH/CH (Chinese), HI (Hindi), AR (Arabic)
// ========================================================================
const LANDING_PAGE_PATTERNS = [
  /^\/?$/i,                                              // Root homepage (/)
  /^\/[a-z]{2}(-[a-z]{2})?\/?$/i,                        // Homepage per locale (/fr-fr/, /en-us/, /zh-cn/, etc.)

  // ========== PRICING - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/tarifs\/?$/i,                // FR: tarifs
  /^\/[a-z]{2}(-[a-z]{2})?\/pricing\/?$/i,               // EN: pricing
  /^\/[a-z]{2}(-[a-z]{2})?\/precios\/?$/i,               // ES: precios
  /^\/[a-z]{2}(-[a-z]{2})?\/preise\/?$/i,                // DE: preise
  /^\/[a-z]{2}(-[a-z]{2})?\/tseny\/?$/i,                 // RU: tseny (цены)
  /^\/[a-z]{2}(-[a-z]{2})?\/precos\/?$/i,                // PT: precos
  /^\/[a-z]{2}(-[a-z]{2})?\/jiage\/?$/i,                 // ZH: jiage (价格)
  /^\/[a-z]{2}(-[a-z]{2})?\/mulya\/?$/i,                 // HI: mulya (मूल्य)
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسعار\/?$/i,               // AR: الأسعار (native)

  // ========== HOW IT WORKS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/comment-ca-marche\/?$/i,     // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/how-it-works\/?$/i,          // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/como-funciona\/?$/i,         // ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/wie-es-funktioniert\/?$/i,   // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/kak-eto-rabotaet\/?$/i,      // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/ruhe-yunzuo\/?$/i,           // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/kaise-kaam-karta-hai\/?$/i,  // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/كيف-يعمل\/?$/i,              // AR (native)

  // ========== FAQ - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/faq\/?$/i,                   // FR/EN/DE
  /^\/[a-z]{2}(-[a-z]{2})?\/preguntas-frecuentes\/?$/i,  // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/perguntas-frequentes\/?$/i,  // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/voprosy-otvety\/?$/i,        // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/changjian-wenti\/?$/i,       // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/aksar-puche-jaane-wale-sawal\/?$/i, // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/الأسئلة-الشائعة\/?$/i,       // AR (native)

  // ========== TESTIMONIALS - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/temoignages\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonials\/?$/i,          // EN/DE
  /^\/[a-z]{2}(-[a-z]{2})?\/testimonios\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/depoimentos\/?$/i,           // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/otzyvy\/?$/i,                // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/yonghu-pingjia\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/prashansapatra\/?$/i,        // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/الشهادات\/?$/i,              // AR (native)

  // ========== CONTACT - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/contact\/?$/i,               // FR/EN
  /^\/[a-z]{2}(-[a-z]{2})?\/contacto\/?$/i,              // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/kontakt\/?$/i,               // DE/RU
  /^\/[a-z]{2}(-[a-z]{2})?\/contato\/?$/i,               // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/lianxi\/?$/i,                // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/sampark\/?$/i,               // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/اتصل-بنا\/?$/i,              // AR (native)

  // ========== PROVIDERS LIST - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/prestataires\/?$/i,          // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/providers\/?$/i,             // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/proveedores\/?$/i,           // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/anbieter\/?$/i,              // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/postavshchiki\/?$/i,         // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/prestadores\/?$/i,           // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/fuwu-tigongzhe\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/seva-pradaata\/?$/i,         // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مقدمي-الخدمات\/?$/i,         // AR (native)

  // ========== SOS CALL / EMERGENCY - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/sos-appel\/?$/i,             // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/emergency-call\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/llamada-emergencia\/?$/i,    // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/notruf\/?$/i,                // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/ekstrenniy-zvonok\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/chamada-emergencia\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/jinji-dianhua\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/aapatkaalin-call\/?$/i,      // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مكالمة-طوارئ\/?$/i,          // AR (native)

  // ========== HELP CENTER - All 9 languages ==========
  /^\/[a-z]{2}(-[a-z]{2})?\/centre-aide\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/help-center\/?$/i,           // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ayuda\/?$/i,          // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/hilfezentrum\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/tsentr-pomoshchi\/?$/i,      // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/centro-ajuda\/?$/i,          // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/bangzhu-zhongxin\/?$/i,      // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/sahayata-kendra\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/مركز-المساعدة\/?$/i,         // AR (native)

  // ========== LEGAL PAGES - All 9 languages ==========
  // Terms clients
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-clients\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-clients\/?$/i,         // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-clientes\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-kunden\/?$/i,            // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-klienty\/?$/i,      // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-clientes\/?$/i,       // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-kehu\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-grahak\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-العملاء\/?$/i,          // AR (native)

  // Terms lawyers
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-avocats\/?$/i,           // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-lawyers\/?$/i,         // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-abogados\/?$/i,     // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-anwaelte\/?$/i,          // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-advokaty\/?$/i,     // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-advogados\/?$/i,      // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-lushi\/?$/i,        // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-vakil\/?$/i,        // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-المحامون\/?$/i,         // AR (native)

  // Terms expats
  /^\/[a-z]{2}(-[a-z]{2})?\/cgu-expatries\/?$/i,         // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/terms-expats\/?$/i,          // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/terminos-expatriados\/?$/i,  // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/agb-expatriates\/?$/i,       // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/usloviya-expatrianty\/?$/i,  // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/termos-expatriados\/?$/i,    // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/tiaokuan-waipai\/?$/i,       // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/shartein-pravasi\/?$/i,      // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/شروط-المغتربين\/?$/i,        // AR (native)

  // Privacy policy
  /^\/[a-z]{2}(-[a-z]{2})?\/politique-confidentialite\/?$/i, // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/privacy-policy\/?$/i,        // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/politica-privacidad\/?$/i,   // ES
  /^\/[a-z]{2}(-[a-z]{2})?\/datenschutzrichtlinie\/?$/i, // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/politika-konfidentsialnosti\/?$/i, // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/politica-privacidade\/?$/i,  // PT
  /^\/[a-z]{2}(-[a-z]{2})?\/yinsi-zhengce\/?$/i,         // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/gopaniyata-niti\/?$/i,       // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/سياسة-الخصوصية\/?$/i,        // AR (native)

  // Cookies
  /^\/[a-z]{2}(-[a-z]{2})?\/cookies\/?$/i,               // All latin langs
  /^\/[a-z]{2}(-[a-z]{2})?\/ملفات-التعريف\/?$/i,         // AR (native)

  // Consumers
  /^\/[a-z]{2}(-[a-z]{2})?\/consommateurs\/?$/i,         // FR
  /^\/[a-z]{2}(-[a-z]{2})?\/consumers\/?$/i,             // EN
  /^\/[a-z]{2}(-[a-z]{2})?\/consumidores\/?$/i,          // ES/PT
  /^\/[a-z]{2}(-[a-z]{2})?\/verbraucher\/?$/i,           // DE
  /^\/[a-z]{2}(-[a-z]{2})?\/potrebiteli\/?$/i,           // RU
  /^\/[a-z]{2}(-[a-z]{2})?\/xiaofeizhe\/?$/i,            // ZH
  /^\/[a-z]{2}(-[a-z]{2})?\/upbhokta\/?$/i,              // HI
  /^\/[a-z]{2}(-[a-z]{2})?\/المستهلكين\/?$/i,            // AR (native)

  // ==========================================================================
  // DYNAMIC PATTERNS FOR NEW PAGES (automatically prerendered)
  // Supports: Latin, Arabic (\u0600-\u06FF), Hindi/Devanagari (\u0900-\u097F),
  //           Chinese (via pinyin romanization)
  // ==========================================================================

  // New landing pages - any single-segment path under locale (LATIN ONLY)
  // Examples: /fr-fr/nouvelle-page, /en-us/new-campaign, /de-de/neue-seite
  // Note: Uses negative lookahead to exclude system paths
  /^\/[a-z]{2}(-[a-z]{2})?\/(?!(assets|api|admin|dashboard|inscription|register|connexion|login|tableau-de-bord|panel|panel-upravleniya|kongzhi-mianban|_next|static|favicon|profil|profile|perfil))[a-z][a-z0-9-]+\/?$/i,

  // New landing pages - ARABIC characters (native) - MUST start with Arabic char
  // Examples: /ar-sa/محامون, /ar-eg/الأسعار
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0600-\u06FF][\u0600-\u06FF\u0020-\u007F\-]+\/?$/i,

  // New landing pages - HINDI/DEVANAGARI characters (native) - MUST start with Devanagari char
  // Examples: /hi-in/वकील, /hi-in/मूल्य
  /^\/[a-z]{2}(-[a-z]{2})?\/[\u0900-\u097F][\u0900-\u097F\u0020-\u007F\-]+\/?$/i,

  // About/Company pages
  /^\/[a-z]{2}(-[a-z]{2})?\/a-propos\/?$/i,              // About FR
  /^\/[a-z]{2}(-[a-z]{2})?\/about\/?$/i,                 // About EN
  /^\/[a-z]{2}(-[a-z]{2})?\/uber-uns\/?$/i,              // About DE
  /^\/[a-z]{2}(-[a-z]{2})?\/sobre-nosotros\/?$/i,        // About ES
  /^\/[a-z]{2}(-[a-z]{2})?\/sobre-nos\/?$/i,             // About PT
  /^\/[a-z]{2}(-[a-z]{2})?\/equipe\/?$/i,                // Team FR
  /^\/[a-z]{2}(-[a-z]{2})?\/team\/?$/i,                  // Team EN
  /^\/[a-z]{2}(-[a-z]{2})?\/carrieres\/?$/i,             // Careers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/careers\/?$/i,               // Careers EN
  /^\/[a-z]{2}(-[a-z]{2})?\/partenaires\/?$/i,           // Partners FR
  /^\/[a-z]{2}(-[a-z]{2})?\/partners\/?$/i,              // Partners EN

  // Marketing/Campaign landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/promo\/[^\/]+\/?$/i,         // Promo pages
  /^\/[a-z]{2}(-[a-z]{2})?\/campagne\/[^\/]+\/?$/i,      // Campaign FR
  /^\/[a-z]{2}(-[a-z]{2})?\/campaign\/[^\/]+\/?$/i,      // Campaign EN
  /^\/[a-z]{2}(-[a-z]{2})?\/offre\/[^\/]+\/?$/i,         // Offer FR
  /^\/[a-z]{2}(-[a-z]{2})?\/offer\/[^\/]+\/?$/i,         // Offer EN
  /^\/[a-z]{2}(-[a-z]{2})?\/lp\/[^\/]+\/?$/i,            // Landing page shortcut

  // Service-specific landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/services\/[^\/]+\/?$/i,      // Services
  /^\/[a-z]{2}(-[a-z]{2})?\/solutions\/[^\/]+\/?$/i,     // Solutions
  /^\/[a-z]{2}(-[a-z]{2})?\/specialites\/[^\/]+\/?$/i,   // Specialties FR
  /^\/[a-z]{2}(-[a-z]{2})?\/specialties\/[^\/]+\/?$/i,   // Specialties EN

  // Location-based landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/pays\/[^\/]+\/?$/i,          // Country pages FR
  /^\/[a-z]{2}(-[a-z]{2})?\/country\/[^\/]+\/?$/i,       // Country pages EN
  /^\/[a-z]{2}(-[a-z]{2})?\/ville\/[^\/]+\/?$/i,         // City pages FR
  /^\/[a-z]{2}(-[a-z]{2})?\/city\/[^\/]+\/?$/i,          // City pages EN
  /^\/[a-z]{2}(-[a-z]{2})?\/region\/[^\/]+\/?$/i,        // Region pages

  // Use-case landing pages
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-expatries\/?$/i,    // For expats FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-expats\/?$/i,            // For expats EN
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-entreprises\/?$/i,  // For businesses FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-businesses\/?$/i,        // For businesses EN
  /^\/[a-z]{2}(-[a-z]{2})?\/pour-les-avocats\/?$/i,      // For lawyers FR
  /^\/[a-z]{2}(-[a-z]{2})?\/for-lawyers\/?$/i,           // For lawyers EN
];

// URL patterns for provider profile pages
// Matches patterns like:
// - /fr-fr/avocat-thailande/julien-abc123
// - /en-us/lawyer-thailand/john-xyz789
// - /de-de/anwalt-frankreich/hans-def456
// Structure: /{locale}/{role}-{country}/{name-id}
const PROVIDER_PROFILE_PATTERNS = [
  // French patterns (supports: /fr-fr/avocat-thailande/nom-id)
  /^\/[a-z]{2}-[a-z]{2}\/avocat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notaire-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expert-comptable-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/medecin-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologue-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/conseiller-fiscal-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/agent-immobilier-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/traducteur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/assureur-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatrie-[a-z]+\/[^\/]+$/i,

  // English patterns
  /^\/[a-z]{2}-[a-z]{2}\/lawyer-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/notary-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/accountant-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/doctor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/psychologist-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tax-advisor-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/real-estate-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/translator-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/insurance-agent-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expat-[a-z]+\/[^\/]+$/i,

  // Spanish patterns
  /^\/[a-z]{2}-[a-z]{2}\/abogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/contador-[a-z]+\/[^\/]+$/i,

  // German patterns
  /^\/[a-z]{2}-[a-z]{2}\/anwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/rechtsanwalt-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/steuerberater-[a-z]+\/[^\/]+$/i,

  // Portuguese patterns
  /^\/[a-z]{2}-[a-z]{2}\/advogado-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/expatriado-[a-z]+\/[^\/]+$/i,

  // Russian patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/advokat-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yurist-[a-z]+\/[^\/]+$/i,

  // Chinese patterns (romanized pinyin)
  /^\/[a-z]{2}-[a-z]{2}\/lushi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/haiwai-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/kuaiji-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/yisheng-[a-z]+\/[^\/]+$/i,

  // Arabic patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/muhami-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/wafid-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/muhasib-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/tabib-[a-z]+\/[^\/]+$/i,

  // Hindi patterns (romanized)
  /^\/[a-z]{2}-[a-z]{2}\/vakil-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/videshi-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/lekhaakar-[a-z]+\/[^\/]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/chikitsak-[a-z]+\/[^\/]+$/i,

  // ==========================================================================
  // NATIVE SCRIPT PATTERNS (Arabic, Hindi characters in URLs)
  // ==========================================================================

  // Arabic patterns (native script)
  // Examples: /ar-sa/محامي-السعودية/اسم-abc123
  /^\/[a-z]{2}-[a-z]{2}\/محامي-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // محامي (lawyer)
  /^\/[a-z]{2}-[a-z]{2}\/مغترب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // مغترب (expat)
  /^\/[a-z]{2}-[a-z]{2}\/محاسب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,     // محاسب (accountant)
  /^\/[a-z]{2}-[a-z]{2}\/طبيب-[\u0600-\u06FFa-z]+\/[^\/]+$/i,      // طبيب (doctor)

  // Hindi patterns (native Devanagari script)
  // Examples: /hi-in/वकील-भारत/नाम-abc123
  /^\/[a-z]{2}-[a-z]{2}\/वकील-[\u0900-\u097Fa-z]+\/[^\/]+$/i,      // वकील (lawyer)
  /^\/[a-z]{2}-[a-z]{2}\/प्रवासी-[\u0900-\u097Fa-z]+\/[^\/]+$/i,   // प्रवासी (expat)
  /^\/[a-z]{2}-[a-z]{2}\/लेखाकार-[\u0900-\u097Fa-z]+\/[^\/]+$/i,   // लेखाकार (accountant)
  /^\/[a-z]{2}-[a-z]{2}\/चिकित्सक-[\u0900-\u097Fa-z]+\/[^\/]+$/i,  // चिकित्सक (doctor)

  // ==========================================================================
  // GENERIC/FALLBACK PATTERNS
  // ==========================================================================

  // Generic pattern for provider profiles with ID
  /^\/[a-z]{2}-[a-z]{2}\/provider\/[a-zA-Z0-9_-]+$/i,
  /^\/[a-z]{2}-[a-z]{2}\/prestataire\/[a-zA-Z0-9_-]+$/i,

  // Fallback: catch any profile URL with 3-segment structure (locale/role-country/name)
  // Latin scripts
  /^\/[a-z]{2}-[a-z]{2}\/[a-z]+-[a-z]+\/[^\/]+$/i,

  // Fallback: catch any profile URL with Unicode characters (Arabic, Hindi)
  // Examples: /ar-sa/محامي-السعودية/name, /hi-in/वकील-भारत/name
  /^\/[a-z]{2}-[a-z]{2}\/[\u0600-\u06FF]+-[\u0600-\u06FFa-z]+\/[^\/]+$/i,    // Arabic
  /^\/[a-z]{2}-[a-z]{2}\/[\u0900-\u097F]+-[\u0900-\u097Fa-z]+\/[^\/]+$/i,    // Hindi
];

/**
 * Check if the user-agent belongs to a bot
 * @param {string} userAgent - The User-Agent header value
 * @returns {boolean} - True if the request is from a bot
 */
function isBot(userAgent) {
  if (!userAgent) return false;

  const lowerUA = userAgent.toLowerCase();

  return BOT_USER_AGENTS.some(bot => lowerUA.includes(bot.toLowerCase()));
}

/**
 * Check if the URL path matches a provider profile pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a provider profile pattern
 */
function isProviderProfilePath(pathname) {
  return PROVIDER_PROFILE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a blog/help article pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a blog pattern
 */
function isBlogPath(pathname) {
  return BLOG_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path matches a landing page pattern
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path matches a landing page pattern
 */
function isLandingPagePath(pathname) {
  return LANDING_PAGE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if the URL path needs SSR/Prerendering
 * @param {string} pathname - The URL pathname
 * @returns {boolean} - True if the path needs prerendering for bots
 */
function needsPrerendering(pathname) {
  return isProviderProfilePath(pathname) || isBlogPath(pathname) || isLandingPagePath(pathname);
}

/**
 * Extract bot name from user-agent for logging
 * @param {string} userAgent - The User-Agent header value
 * @returns {string} - The detected bot name or 'unknown'
 */
function getBotName(userAgent) {
  if (!userAgent) return 'unknown';

  const lowerUA = userAgent.toLowerCase();

  for (const bot of BOT_USER_AGENTS) {
    if (lowerUA.includes(bot.toLowerCase())) {
      return bot;
    }
  }

  return 'unknown';
}

/**
 * Main request handler
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>} - The response
 */
async function handleRequest(request, env, ctx) {
  // Force log to confirm Worker is running
  console.log(`[WORKER ENTRY] Request received: ${request.url}`);

  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const pathname = url.pathname;

  console.log(`[WORKER DEBUG] UA: ${userAgent.substring(0, 50)}, Path: ${pathname}`);

  // Check if this is a bot AND visiting a page that needs prerendering
  const botDetected = isBot(userAgent);
  const needsSSR = needsPrerendering(pathname);

  if (botDetected && needsSSR) {
    const botName = getBotName(userAgent);

    console.log(`[SOS Expat Bot Detection] Bot: ${botName}, Path: ${pathname}`);

    try {
      // Build the SSR URL with the original path
      const ssrUrl = new URL(SSR_FUNCTION_URL);
      ssrUrl.searchParams.set('path', pathname);
      ssrUrl.searchParams.set('url', request.url);
      ssrUrl.searchParams.set('bot', botName);

      // Fetch from the Cloud Function
      const ssrResponse = await fetch(ssrUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'X-Original-URL': request.url,
          'X-Bot-Name': botName,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
          'X-Forwarded-Proto': url.protocol.replace(':', ''),
          'X-Forwarded-Host': url.host,
          'Accept': 'text/html',
          'Accept-Language': request.headers.get('Accept-Language') || 'en',
        },
      });

      // Clone the response and add custom headers
      const newHeaders = new Headers(ssrResponse.headers);
      newHeaders.set('X-Rendered-By', 'sos-expat-ssr');
      newHeaders.set('X-Bot-Detected', botName);

      // Ensure proper caching headers for bots
      if (!newHeaders.has('Cache-Control')) {
        newHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      }

      return new Response(ssrResponse.body, {
        status: ssrResponse.status,
        statusText: ssrResponse.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      console.error(`[SOS Expat Bot Detection] Error fetching SSR: ${error.message}`);

      // On error, fall back to origin
      return fetch(request);
    }
  }

  // For non-bots or non-SSR pages, pass through to origin
  const originResponse = await fetch(request);
  const newHeaders = new Headers(originResponse.headers);
  newHeaders.set('X-Worker-Active', 'true');
  newHeaders.set('X-Worker-Bot-Detected', botDetected ? 'true' : 'false');
  newHeaders.set('X-Worker-SSR-Match', needsSSR ? 'true' : 'false');
  newHeaders.set('X-Worker-Path', pathname);

  // Ajouter des headers de cache agressifs pour les assets statiques (icônes, fonts, images)
  const isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|eot|css|js)$/i.test(pathname);
  if (isStaticAsset && originResponse.status === 200) {
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // COOP headers required for Firebase Auth popup (Google login)
  // Without these, the popup cannot communicate with the parent window
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  newHeaders.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: newHeaders,
  });
}

// Export for Cloudflare Workers
export default {
  fetch: handleRequest,
};

// Also export for module workers format
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, {}, {}));
});
