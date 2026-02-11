/**
 * Locale Routes Utility
 * Handles language-country locale prefixes in routes (e.g., /en-us/, /fr-fr/)
 ***/

import { getCachedGeoData, detectCountryFromTimezone } from "../country-manager/languageDetection";

type Language = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

// Map language to default country code (fallback only)
const LANGUAGE_TO_COUNTRY: Record<Language, string> = {
  fr: "fr",  // French -> France
  en: "us",  // English -> United States
  es: "es",  // Spanish -> Spain
  de: "de",  // German -> Germany
  ru: "ru",  // Russian -> Russia
  pt: "pt",  // Portuguese -> Portugal
  ch: "cn",  // Chinese -> China
  hi: "in",  // Hindi -> India
  ar: "sa",  // Arabic -> Saudi Arabia
};

/**
 * Get country code from geolocation (synchronous - uses cache and timezcone)
 * Returns lowercase country code or null if not available
 */
function getCountryFromGeolocation(): string | null {
  // Try cached geolocation data first (fastest, no API calls)
  const cachedCountry = getCachedGeoData();
  if (cachedCountry) {
    return cachedCountry.toLowerCase();
  }

  // Try timezone detection (no API, no rate limits)
  const timezoneCountry = detectCountryFromTimezone();
  if (timezoneCountry) {
    return timezoneCountry.toLowerCase();
  }

  return null;
}

/**
 * Generate locale string (e.g., "en-us", "fr-fr", "zh-cn")
 * Uses geolocation country when available, falls back to language default
 * Note: Chinese uses 'zh' in URLs (ISO standard) but 'ch' internally
 */
export function getLocaleString(lang: Language, country?: string): string {
  // Chinese: internal code is 'ch' but URL should use 'zh' (ISO 639-1 standard)
  const urlLang = lang === 'ch' ? 'zh' : lang;

  // If country is explicitly provided, use it
  if (country) {
    return `${urlLang}-${country.toLowerCase()}`;
  }

  // Try to get country from geolocation
  const geoCountry = getCountryFromGeolocation();
  if (geoCountry) {
    return `${urlLang}-${geoCountry}`;
  }

  // Fallback to language-to-country mapping
  const countryCode = LANGUAGE_TO_COUNTRY[lang];
  return `${urlLang}-${countryCode}`;
}

/**
 * Normalize language code from URL to internal code
 * Maps non-standard URL codes to internal Language type
 * Example: "zh" (URL standard) -> "ch" (internal code for Chinese)
 */
function normalizeLanguageCode(urlLang: string): Language | null {
  const langMap: Record<string, Language> = {
    fr: 'fr',
    en: 'en',
    es: 'es',
    de: 'de',
    ru: 'ru',
    pt: 'pt',
    ch: 'ch',
    zh: 'ch', // Map URL "zh" to internal "ch" for Chinese
    hi: 'hi',
    ar: 'ar',
  };
  return langMap[urlLang.toLowerCase()] || null;
}

/**
 * Parse locale from URL path
 * Example: "/en-us/dashboard" -> { locale: "en-us", lang: "en", country: "us", pathWithoutLocale: "/dashboard" }
 * Example: "/zh-cn/dashboard" -> { locale: "zh-cn", lang: "ch", country: "cn", pathWithoutLocale: "/dashboard" }
 **/
export function parseLocaleFromPath(pathname: string): {
  locale: string | null;
  lang: Language | null;
  country: string | null;
  pathWithoutLocale: string;
} {
  const localePattern = /^\/([a-z]{2})-([a-z]{2})(\/.*)?$/;
  const match = pathname.match(localePattern);

  if (match) {
    const urlLang = match[1];
    const normalizedLang = normalizeLanguageCode(urlLang);

    // Only return valid locale if language is supported
    if (normalizedLang) {
      return {
        locale: `${urlLang}-${match[2]}`, // Keep original URL format for display
        lang: normalizedLang, // Use normalized internal code
        country: match[2],
        pathWithoutLocale: match[3] || "/",
      };
    }
  }

  return {
    locale: null,
    lang: null,
    country: null,
    pathWithoutLocale: pathname,
  };
}

/**
 * Get all default locale strings (for backward compatibility)
 */
export function getSupportedLocales(): string[] {
  return Object.keys(LANGUAGE_TO_COUNTRY).map((lang) =>
    getLocaleString(lang as Language)
  );
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguages(): Language[] {
  return Object.keys(LANGUAGE_TO_COUNTRY) as Language[];
}

/**
 * Check if a locale is valid (language code must be supported, country must be lowercase)
 * Accepts: fr-fr, fr-be, fr-ca, es-es, es-fr, es-mx, zh-cn, etc.
 * Rejects: ch-DJ (uppercase country), fr-FR (uppercase), invalid language codes
 * Note: 'zh' is the URL code for Chinese, 'ch' is internal only
 */
export function isValidLocale(locale: string): boolean {
  // Must be lowercase format xx-yy
  const match = locale.match(/^([a-z]{2})-([a-z]{2})$/);
  if (!match) return false;

  const urlLang = match[1];
  // Map URL language code to internal code (zh -> ch for Chinese)
  const internalLang = urlLang === 'zh' ? 'ch' : urlLang;

  // Check if language is supported
  return getSupportedLanguages().includes(internalLang as Language);
}

/**
 * Check if a path starts with a locale prefix (new format: /xx-xx/)
 */
export function hasLocalePrefix(pathname: string): boolean {
  return /^\/[a-z]{2}-[a-z]{2}(\/|$)/.test(pathname);
}

/**
 * Check if a path starts with a legacy locale prefix (old format: /xx/ without country)
 * This handles old URLs like /es/cookies, /zh/appel-expatrie that Google may have indexed
 */
export function hasLegacyLocalePrefix(pathname: string): boolean {
  return /^\/[a-z]{2}(\/|$)/.test(pathname) && !hasLocalePrefix(pathname);
}

/**
 * Parse legacy locale from path and return redirect info
 * Converts /es/cookies -> /es-es/cookies, /zh/page -> /zh-cn/page
 */
export function parseLegacyLocaleFromPath(pathname: string): {
  shouldRedirect: boolean;
  newPath: string | null;
  detectedLang: Language | null;
} {
  // Match paths like /es/... or /zh/... (language code only, no country)
  const legacyPattern = /^\/([a-z]{2})(\/.*)?$/;
  const match = pathname.match(legacyPattern);

  if (!match) {
    return { shouldRedirect: false, newPath: null, detectedLang: null };
  }

  const urlLang = match[1];
  const restOfPath = match[2] || '';

  // Map URL language codes to internal codes
  // 'zh' (ISO standard for Chinese) -> 'ch' (internal code)
  const langMap: Record<string, Language> = {
    fr: 'fr',
    en: 'en',
    es: 'es',
    de: 'de',
    ru: 'ru',
    pt: 'pt',
    ch: 'ch',
    zh: 'ch', // Standard Chinese code -> internal 'ch'
    hi: 'hi',
    ar: 'ar',
  };

  const internalLang = langMap[urlLang];

  if (!internalLang) {
    // Unknown language code, don't redirect
    return { shouldRedirect: false, newPath: null, detectedLang: null };
  }

  // Build the new path with proper locale format
  const newLocale = getLocaleString(internalLang);
  const newPath = `/${newLocale}${restOfPath}`;

  return {
    shouldRedirect: true,
    newPath,
    detectedLang: internalLang,
  };
}

/**
 * Extract locale from pathname or return default
 */
export function getLocaleFromPath(pathname: string, defaultLang: Language): string {
  const parsed = parseLocaleFromPath(pathname);
  return parsed.locale || getLocaleString(defaultLang);
}

/**
 * Route slug translations
 * Maps route keys to their translated slugs for each language
 **/


export type RouteKey =
  | "lawyer"           // /avocat -> /lawyers, /anwaelte, etc.
  | "expat"            // /expatrie -> /expats, /expatriates, etc.
  | "find-lawyer"      // /trouver-avocat -> /find-lawyer, etc. (search/directory)
  | "find-expat"       // /trouver-expatrie -> /find-expat, etc. (search/directory)
  | "register-lawyer"  // /register/lawyer -> /register/avocat, /register/anwalt, etc.
  | "register-expat"   // /register/expat -> /register/expatrie, etc.
  | "register-client"  // /register/client -> /register/client, /inscription/client, etc.
  | "terms-lawyers"    // /terms-lawyers -> /cgu-avocats, etc.
  | "terms-expats"     // /terms-expats -> /cgu-expatries, etc.
  | "terms-clients"    // /terms-clients -> /cgu-clients, etc.
  | "terms-chatters"   // /terms-chatters -> /cgu-chatters, etc.
  | "sos-call"         // /sos-appel -> /emergency-call, /notruf, etc.
  | "expat-call"       // /appel-expatrie -> /expat-call, etc.
  | "pricing"          // /tarifs -> /pricing, /preise, etc.
  | "contact"           // /contact -> /contacto, /kontakt, etc.
  | "how-it-works"      // /how-it-works -> /comment-ca-marche, /como-funciona, etc.
  | "faq"               // /faq -> /faq, /preguntas-frecuentes, etc.
  | "help-center"       // /centre-aide -> /help-center, /centro-ayuda, etc.
  | "testimonials"      // /testimonials -> /temoignages, /testimonios, etc.
  | "privacy-policy"    // /privacy-policy -> /politique-confidentialite, etc.
  | "cookies"            // /cookies -> /cookies, /cookies-politique, etc.
  | "consumers"          // /consumers -> /consommateurs, /consumidores, etc.
  | "service-status"    // /statut-service -> /service-status, /estado-servicio, etc.
  | "seo"               // /seo -> /referencement, /seo, etc.
  | "providers"          // /providers -> /prestataires, /proveedores, etc.
  | "provider"           // /provider/:id -> /prestataire/:id, /proveedor/:id, etc.
  | "dashboard"         // /dashboard -> /tableau-de-bord, /panel, etc.
  | "profile-edit"       // /profile/edit -> /profil/modifier, /perfil/editar, etc.
  | "call-checkout"      // /call-checkout -> /paiement-appel, /pago-llamada, etc.
  | "booking-request"    // /booking-request -> /demande-reservation, /solicitud-reserva, etc.
  | "payment-success"    // /payment-success -> /paiement-reussi, /pago-exitoso, etc.
  | "dashboard-messages" // /dashboard/messages -> /tableau-de-bord/messages, etc.
  | "dashboard-ai-assistant" // /dashboard/ai-assistant -> /tableau-de-bord/assistant-ia, etc.
  | "dashboard-subscription" // /dashboard/subscription -> /tableau-de-bord/abonnement, etc.
  | "dashboard-subscription-plans" // /dashboard/subscription/plans -> /tableau-de-bord/abonnement/plans, etc.
  | "dashboard-subscription-success" // /dashboard/subscription/success -> /tableau-de-bord/abonnement/succes, etc.
  | "dashboard-conversations" // /dashboard/conversations -> /tableau-de-bord/conversations, etc.
  | "dashboard-kyc"      // /dashboard/kyc -> /tableau-de-bord/verification, etc.
  | "login"              // /login -> /connexion, /iniciar-sesion, etc.
  | "register"           // /register -> /inscription, /registro, etc.
  | "password-reset"     // /password-reset -> /reinitialisation-mot-de-passe, etc.
  | "affiliate-dashboard"  // /affiliate -> /parrainage, /afiliado, etc.
  | "affiliate-earnings"   // /affiliate/earnings -> /parrainage/gains, etc.
  | "affiliate-referrals"  // /affiliate/referrals -> /parrainage/filleuls, etc.
  | "affiliate-withdraw"   // /affiliate/withdraw -> /parrainage/retrait, etc.
  | "affiliate-bank-details" // /affiliate/bank-details -> /parrainage/coordonnees-bancaires, etc.
  | "affiliate-tools" // /affiliate/tools -> /parrainage/outils, etc.
  // Chatter routes
  | "chatter-landing"      // /devenir-chatter -> /become-chatter, etc.
  | "chatter-register"     // /chatter/inscription -> /chatter/register, etc.
  | "chatter-telegram"     // /chatter/telegram -> /chatter/telegram, etc.
  | "chatter-presentation" // /chatter/presentation -> /chatter/presentation, etc.
  | "chatter-quiz"         // /chatter/quiz -> /chatter/quiz, etc.
  | "chatter-dashboard"    // /chatter/tableau-de-bord -> /chatter/dashboard, etc.
  | "chatter-leaderboard"  // /chatter/classement -> /chatter/leaderboard, etc.
  | "chatter-payments"     // /chatter/paiements -> /chatter/payments, etc.
  | "chatter-suspended"    // /chatter/suspendu -> /chatter/suspended, etc.
  | "chatter-country-selection" // /chatter/pays -> /chatter/country-selection, etc.
  | "chatter-posts"        // /chatter/posts -> /chatter/posts, etc.
  | "chatter-zoom"         // /chatter/zoom -> /chatter/zoom, etc.
  | "chatter-training"     // /chatter/formation -> /chatter/training, etc.
  | "chatter-referrals"    // /chatter/filleuls -> /chatter/referrals, etc.
  | "chatter-referral-earnings" // /chatter/gains-parrainage -> /chatter/referral-earnings, etc.
  | "chatter-refer"        // /chatter/parrainer -> /chatter/refer, etc.
  | "pioneers"             // /pioneers -> /pioneers, etc.
  // Influencer routes
  | "influencer-landing"      // /devenir-influenceur -> /become-influencer, etc.
  | "influencer-register"     // /influencer/inscription -> /influencer/register, etc.
  | "influencer-dashboard"    // /influencer/tableau-de-bord -> /influencer/dashboard, etc.
  | "influencer-earnings"     // /influencer/gains -> /influencer/earnings, etc.
  | "influencer-referrals"    // /influencer/filleuls -> /influencer/referrals, etc.
  | "influencer-leaderboard"  // /influencer/classement -> /influencer/leaderboard, etc.
  | "influencer-payments"     // /influencer/paiements -> /influencer/payments, etc.
  | "influencer-promo-tools"  // /influencer/outils -> /influencer/promo-tools, etc.
  | "influencer-profile"      // /influencer/profil -> /influencer/profile, etc.
  | "influencer-suspended"    // /influencer/suspendu -> /influencer/suspended, etc.
  | "influencer-training"     // /influencer/formation -> /influencer/training, etc.
  | "influencer-resources"    // /influencer/ressources -> /influencer/resources, etc.
  // Blogger routes
  | "blogger-landing"         // /devenir-blogger -> /become-blogger, etc.
  | "blogger-register"        // /blogger/inscription -> /blogger/register, etc.
  | "blogger-dashboard"       // /blogger/tableau-de-bord -> /blogger/dashboard, etc.
  | "blogger-earnings"        // /blogger/gains -> /blogger/earnings, etc.
  | "blogger-referrals"       // /blogger/filleuls -> /blogger/referrals, etc.
  | "blogger-leaderboard"     // /blogger/classement -> /blogger/leaderboard, etc.
  | "blogger-payments"        // /blogger/paiements -> /blogger/payments, etc.
  | "blogger-resources"       // /blogger/ressources -> /blogger/resources, etc.
  | "blogger-guide"           // /blogger/guide -> /blogger/guide, etc.
  | "blogger-promo-tools"     // /blogger/outils -> /blogger/promo-tools, etc.
  | "blogger-profile"         // /blogger/profil -> /blogger/profile, etc.
  | "blogger-suspended"       // /blogger/suspendu -> /blogger/suspended, etc.
  // GroupAdmin routes
  | "groupadmin-landing"      // /devenir-admin-groupe -> /become-group-admin, etc.
  | "groupadmin-register"     // /groupadmin/inscription -> /groupadmin/register, etc.
  | "groupadmin-dashboard"    // /groupadmin/tableau-de-bord -> /groupadmin/dashboard, etc.
  | "groupadmin-resources"    // /groupadmin/ressources -> /groupadmin/resources, etc.
  | "groupadmin-posts"        // /groupadmin/posts -> /groupadmin/posts, etc.
  | "groupadmin-payments"     // /groupadmin/paiements -> /groupadmin/payments, etc.
  | "groupadmin-referrals"    // /groupadmin/filleuls -> /groupadmin/referrals, etc.
  | "groupadmin-leaderboard"  // /groupadmin/classement -> /groupadmin/leaderboard, etc.
  | "groupadmin-guide"        // /groupadmin/guide -> /groupadmin/guide, etc.
  | "groupadmin-suspended"    // /groupadmin/suspendu -> /groupadmin/suspended, etc.
  | "groupadmin-profile";     // /groupadmin/profil -> /groupadmin/profile, etc.

const ROUTE_TRANSLATIONS: Record<RouteKey, Record<Language, string>> = {
  "lawyer": {
    fr: "avocat",
    en: "lawyers",
    es: "abogados",
    de: "anwaelte",
    ru: "advokaty",
    pt: "advogados",
    ch: "lushi",
    hi: "vakil",
    ar: "محامون",
  },
  "expat": {
    fr: "expatrie",
    en: "expats",
    es: "expatriados",
    de: "expatriates",
    ru: "expatrianty",
    pt: "expatriados",
    ch: "waipai",
    hi: "pravasi",
    ar: "مغتربون",
  },
  "find-lawyer": {
    fr: "trouver-avocat",
    en: "find-lawyer",
    es: "buscar-abogado",
    de: "anwalt-finden",
    ru: "nayti-advokata",
    pt: "encontrar-advogado",
    ch: "zhaodao-lushi",
    hi: "vakil-khoje",
    ar: "ابحث-عن-محامي",
  },
  "find-expat": {
    fr: "trouver-expatrie",
    en: "find-expat",
    es: "buscar-expatriado",
    de: "expatriate-finden",
    ru: "nayti-expatrianta",
    pt: "encontrar-expatriado",
    ch: "zhaodao-waipai",
    hi: "pravasi-khoje",
    ar: "ابحث-عن-مغترب",
  },
  "register-lawyer": {
    fr: "inscription/avocat",
    en: "register/lawyer",
    es: "registro/abogado",
    de: "registrierung/anwalt",
    ru: "registratsiya/advokat",
    pt: "registro/advogado",
    ch: "zhuce/lushi",
    hi: "panjikaran/vakil",
    ar: "تسجيل/محام",
  },
  "register-expat": {
    fr: "inscription/expatrie",
    en: "register/expat",
    es: "registro/expatriado",
    de: "registrierung/expatriate",
    ru: "registratsiya/expatriant",
    pt: "registro/expatriado",
    ch: "zhuce/waipai",
    hi: "panjikaran/pravasi",
    ar: "تسجيل/مغترب",
  },
  "register-client": {
    fr: "inscription/client",
    en: "register/client",
    es: "registro/cliente",
    de: "registrierung/kunde",
    ru: "registratsiya/klient",
    pt: "registro/cliente",
    ch: "zhuce/kehu",
    hi: "panjikaran/grahak",
    ar: "تسجيل/عميل",
  },
  "terms-lawyers": {
    fr: "cgu-avocats",
    en: "terms-lawyers",
    es: "terminos-abogados",
    de: "agb-anwaelte",
    ru: "usloviya-advokaty",
    pt: "termos-advogados",
    ch: "tiaokuan-lushi",
    hi: "shartein-vakil",
    ar: "شروط-المحامون",
  },
  "terms-expats": {
    fr: "cgu-expatries",
    en: "terms-expats",
    es: "terminos-expatriados",
    de: "agb-expatriates",
    ru: "usloviya-expatrianty",
    pt: "termos-expatriados",
    ch: "tiaokuan-waipai",
    hi: "shartein-pravasi",
    ar: "شروط-المغتربين",
  },
  "terms-chatters": {
    fr: "cgu-chatters",
    en: "terms-chatters",
    es: "terminos-chatters",
    de: "agb-chatters",
    ru: "usloviya-chattery",
    pt: "termos-chatters",
    ch: "tiaokuan-chatters",
    hi: "shartein-chatters",
    ar: "شروط-المروجين",
  },
  "sos-call": {
    fr: "sos-appel",
    en: "emergency-call",
    es: "llamada-emergencia",
    de: "notruf",
    ru: "ekstrenniy-zvonok",
    pt: "chamada-emergencia",
    ch: "jinji-dianhua",
    hi: "aapatkaalin-call",
    ar: "مكالمة-طوارئ",
  },
  "expat-call": {
    fr: "appel-expatrie",
    en: "expat-call",
    es: "llamada-expatriado",
    de: "expatriate-anruf",
    ru: "zvonok-expatriantu",
    pt: "chamada-expatriado",
    ch: "waipai-dianhua",
    hi: "pravasi-call",
    ar: "مكالمة-المغترب",
  },
  "terms-clients": {
    fr: "cgu-clients",
    en: "terms-clients",
    es: "terminos-clientes",
    de: "agb-kunden",
    ru: "usloviya-klienty",
    pt: "termos-clientes",
    ch: "tiaokuan-kehu",
    hi: "shartein-grahak",
    ar: "شروط-العملاء",
  },
  "pricing": {
    fr: "tarifs",
    en: "pricing",
    es: "precios",
    de: "preise",
    ru: "tseny",
    pt: "precos",
    ch: "jiage",
    hi: "mulya",
    ar: "الأسعار",
  },
  "contact": {
    fr: "contact",
    en: "contact",
    es: "contacto",
    de: "kontakt",
    ru: "kontakt",
    pt: "contato",
    ch: "lianxi",
    hi: "sampark",
    ar: "اتصل-بنا",
  },
  "how-it-works": {
    fr: "comment-ca-marche",
    en: "how-it-works",
    es: "como-funciona",
    de: "wie-es-funktioniert",
    ru: "kak-eto-rabotaet",
    pt: "como-funciona",
    ch: "ruhe-yunzuo",
    hi: "kaise-kaam-karta-hai",
    ar: "كيف-يعمل",
  },
  "faq": {
    fr: "faq",
    en: "faq",
    es: "preguntas-frecuentes",
    de: "faq",
    ru: "voprosy-otvety",
    pt: "perguntas-frequentes",
    ch: "changjian-wenti",
    hi: "aksar-puche-jaane-wale-sawal",
    ar: "الأسئلة-الشائعة",
  },
  "help-center": {
    fr: "centre-aide",
    en: "help-center",
    es: "centro-ayuda",
    de: "hilfezentrum",
    ru: "tsentr-pomoshchi",
    pt: "centro-ajuda",
    ch: "bangzhu-zhongxin",
    hi: "sahayata-kendra",
    ar: "مركز-المساعدة",
  },
  "testimonials": {
    fr: "temoignages",
    en: "testimonials",
    es: "testimonios",
    de: "testimonials",
    ru: "otzyvy",
    pt: "depoimentos",
    ch: "yonghu-pingjia",
    hi: "prashansapatra",
    ar: "الشهادات",
  },
  "privacy-policy": {
    fr: "politique-confidentialite",
    en: "privacy-policy",
    es: "politica-privacidad",
    de: "datenschutzrichtlinie",
    ru: "politika-konfidentsialnosti",
    pt: "politica-privacidade",
    ch: "yinsi-zhengce",
    hi: "gopaniyata-niti",
    ar: "سياسة-الخصوصية",
  },
  "cookies": {
    fr: "cookies",
    en: "cookies",
    es: "cookies",
    de: "cookies",
    ru: "cookies",
    pt: "cookies",
    ch: "cookies",
    hi: "cookies",
    ar: "ملفات-التعريف",
  },
  "consumers": {
    fr: "consommateurs",
    en: "consumers",
    es: "consumidores",
    de: "verbraucher",
    ru: "potrebiteli",
    pt: "consumidores",
    ch: "xiaofeizhe",
    hi: "upbhokta",
    ar: "المستهلكين",
  },
  "service-status": {
    fr: "statut-service",
    en: "service-status",
    es: "estado-servicio",
    de: "dienststatus",
    ru: "status-servisa",
    pt: "status-servico",
    ch: "fuwu-zhuangtai",
    hi: "seva-sthiti",
    ar: "حالة-الخدمة",
  },
  "seo": {
    fr: "referencement",
    en: "seo",
    es: "seo",
    de: "seo",
    ru: "seo",
    pt: "seo",
    ch: "seo",
    hi: "seo",
    ar: "تحسين-محركات-البحث",
  },
  "providers": {
    fr: "prestataires",
    en: "providers",
    es: "proveedores",
    de: "anbieter",
    ru: "postavshchiki",
    pt: "prestadores",
    ch: "fuwu-tigongzhe",
    hi: "seva-pradaata",
    ar: "مقدمي-الخدمات",
  },
  "provider": {
    fr: "prestataire",
    en: "provider",
    es: "proveedor",
    de: "anbieter",
    ru: "postavshchik",
    pt: "prestador",
    ch: "fuwu-tigongzhe",
    hi: "seva-pradaata",
    ar: "مقدم-الخدمة",
  },
  "dashboard": {
    fr: "tableau-de-bord",
    en: "dashboard",
    es: "panel",
    de: "dashboard",
    ru: "panel-upravleniya",
    pt: "painel",
    ch: "kongzhi-mianban",
    hi: "dashboard",
    ar: "لوحة-التحكم",
  },
  "profile-edit": {
    fr: "profil",
    en: "profile",
    es: "perfil",
    de: "profil",
    ru: "profil",
    pt: "perfil",
    ch: "geren-ziliao",
    hi: "profile",
    ar: "الملف-الشخصي",
  },
  "call-checkout": {
    fr: "paiement-appel",
    en: "call-checkout",
    es: "pago-llamada",
    de: "anruf-kasse",
    ru: "oplata-zvonka",
    pt: "pagamento-chamada",
    ch: "tonghua-jiesuan",
    hi: "call-bhugtaan",
    ar: "الدفع-المكالمة",
  },
  "booking-request": {
    fr: "demande-reservation",
    en: "booking-request",
    es: "solicitud-reserva",
    de: "buchungsanfrage",
    ru: "zayavka-na-bronirovanie",
    pt: "solicitacao-reserva",
    ch: "yuding-qingqiu",
    hi: "booking-anurodh",
    ar: "طلب-الحجز",
  },
  "payment-success": {
    fr: "paiement-reussi",
    en: "payment-success",
    es: "pago-exitoso",
    de: "zahlung-erfolgreich",
    ru: "oplata-uspeshna",
    pt: "pagamento-sucesso",
    ch: "zhifu-chenggong",
    hi: "bhugtaan-safal",
    ar: "الدفع-نجح",
  },
  "dashboard-messages": {
    fr: "tableau-de-bord/messages",
    en: "dashboard/messages",
    es: "panel/mensajes",
    de: "dashboard/nachrichten",
    ru: "panel-upravleniya/soobshcheniya",
    pt: "painel/mensagens",
    ch: "kongzhi-mianban/xiaoxi",
    hi: "dashboard/sandesh",
    ar: "لوحة-التحكم/الرسائل",
  },
  "dashboard-ai-assistant": {
    fr: "tableau-de-bord/assistant-ia",
    en: "dashboard/ai-assistant",
    es: "panel/asistente-ia",
    de: "dashboard/ki-assistent",
    ru: "panel-upravleniya/ii-assistent",
    pt: "painel/assistente-ia",
    ch: "kongzhi-mianban/ai-zhushou",
    hi: "dashboard/ai-sahayak",
    ar: "لوحة-التحكم/مساعد-الذكاء",
  },
  "dashboard-subscription": {
    fr: "tableau-de-bord/abonnement",
    en: "dashboard/subscription",
    es: "panel/suscripcion",
    de: "dashboard/abonnement",
    ru: "panel-upravleniya/podpiska",
    pt: "painel/assinatura",
    ch: "kongzhi-mianban/dingyue",
    hi: "dashboard/sadasyata",
    ar: "لوحة-التحكم/الاشتراك",
  },
  "dashboard-subscription-plans": {
    fr: "tableau-de-bord/abonnement/plans",
    en: "dashboard/subscription/plans",
    es: "panel/suscripcion/planes",
    de: "dashboard/abonnement/plaene",
    ru: "panel-upravleniya/podpiska/plany",
    pt: "painel/assinatura/planos",
    ch: "kongzhi-mianban/dingyue/jihua",
    hi: "dashboard/sadasyata/yojana",
    ar: "لوحة-التحكم/الاشتراك/الخطط",
  },
  "dashboard-subscription-success": {
    fr: "tableau-de-bord/abonnement/succes",
    en: "dashboard/subscription/success",
    es: "panel/suscripcion/exito",
    de: "dashboard/abonnement/erfolg",
    ru: "panel-upravleniya/podpiska/uspekh",
    pt: "painel/assinatura/sucesso",
    ch: "kongzhi-mianban/dingyue/chenggong",
    hi: "dashboard/sadasyata/safal",
    ar: "لوحة-التحكم/الاشتراك/نجاح",
  },
  "dashboard-conversations": {
    fr: "tableau-de-bord/conversations",
    en: "dashboard/conversations",
    es: "panel/conversaciones",
    de: "dashboard/konversationen",
    ru: "panel-upravleniya/razgovory",
    pt: "painel/conversas",
    ch: "kongzhi-mianban/duihua",
    hi: "dashboard/baatcheet",
    ar: "لوحة-التحكم/المحادثات",
  },
  "dashboard-kyc": {
    fr: "tableau-de-bord/verification",
    en: "dashboard/kyc",
    es: "panel/verificacion",
    de: "dashboard/verifizierung",
    ru: "panel-upravleniya/verifikatsiya",
    pt: "painel/verificacao",
    ch: "kongzhi-mianban/yanzheng",
    hi: "dashboard/satya",
    ar: "لوحة-التحكم/التحقق",
  },
  "login": {
    fr: "connexion",
    en: "login",
    es: "iniciar-sesion",
    de: "anmeldung",
    ru: "vkhod",
    pt: "entrar",
    ch: "denglu",
    hi: "login",
    ar: "تسجيل-الدخول",
  },
  "register": {
    fr: "inscription",
    en: "register",
    es: "registro",
    de: "registrierung",
    ru: "registratsiya",
    pt: "cadastro",
    ch: "zhuce",
    hi: "panjikaran",
    ar: "التسجيل",
  },
  "password-reset": {
    fr: "reinitialisation-mot-de-passe",
    en: "password-reset",
    es: "restablecer-contrasena",
    de: "passwort-zurucksetzen",
    ru: "sbros-parolya",
    pt: "redefinir-senha",
    ch: "chongzhi-mima",
    hi: "password-reset",
    ar: "إعادة-تعيين-كلمة-المرور",
  },
  "affiliate-dashboard": {
    fr: "parrainage",
    en: "affiliate",
    es: "afiliado",
    de: "partnerprogramm",
    ru: "partnerskaya-programma",
    pt: "afiliado",
    ch: "tuiguang",
    hi: "sahbhagi",
    ar: "برنامج-الإحالة",
  },
  "affiliate-earnings": {
    fr: "parrainage/gains",
    en: "affiliate/earnings",
    es: "afiliado/ganancias",
    de: "partnerprogramm/einnahmen",
    ru: "partnerskaya-programma/zarabotok",
    pt: "afiliado/ganhos",
    ch: "tuiguang/shouyi",
    hi: "sahbhagi/kamaai",
    ar: "برنامج-الإحالة/الأرباح",
  },
  "affiliate-referrals": {
    fr: "parrainage/filleuls",
    en: "affiliate/referrals",
    es: "afiliado/referidos",
    de: "partnerprogramm/empfehlungen",
    ru: "partnerskaya-programma/referal",
    pt: "afiliado/indicacoes",
    ch: "tuiguang/tuijianren",
    hi: "sahbhagi/sandarbh",
    ar: "برنامج-الإحالة/الإحالات",
  },
  "affiliate-withdraw": {
    fr: "parrainage/retrait",
    en: "affiliate/withdraw",
    es: "afiliado/retiro",
    de: "partnerprogramm/auszahlung",
    ru: "partnerskaya-programma/vyvod",
    pt: "afiliado/saque",
    ch: "tuiguang/tixian",
    hi: "sahbhagi/nikasi",
    ar: "برنامج-الإحالة/السحب",
  },
  "affiliate-bank-details": {
    fr: "parrainage/coordonnees-bancaires",
    en: "affiliate/bank-details",
    es: "afiliado/datos-bancarios",
    de: "partnerprogramm/bankdaten",
    ru: "partnerskaya-programma/bankovskie-rekvizity",
    pt: "afiliado/dados-bancarios",
    ch: "tuiguang/yinhang-xinxi",
    hi: "sahbhagi/bank-vivaran",
    ar: "برنامج-الإحالة/البيانات-المصرفية",
  },
  "affiliate-tools": {
    fr: "parrainage/outils",
    en: "affiliate/tools",
    es: "afiliado/herramientas",
    de: "partnerprogramm/werkzeuge",
    ru: "partnerskaya-programma/instrumenty",
    pt: "afiliado/ferramentas",
    ch: "tuiguang/gongju",
    hi: "sahbhagi/upkaran",
    ar: "برنامج-الإحالة/أدوات",
  },
  // Chatter routes
  "chatter-landing": {
    fr: "devenir-chatter",
    en: "become-chatter",
    es: "ser-chatter",
    de: "chatter-werden",
    ru: "stat-chatterom",
    pt: "tornar-se-chatter",
    ch: "chengwei-chatter",
    hi: "chatter-bane",
    ar: "كن-مسوقا",
  },
  "chatter-register": {
    fr: "chatter/inscription",
    en: "chatter/register",
    es: "chatter/registro",
    de: "chatter/registrierung",
    ru: "chatter/registratsiya",
    pt: "chatter/cadastro",
    ch: "chatter/zhuce",
    hi: "chatter/panjikaran",
    ar: "مسوق/تسجيل",
  },
  "chatter-telegram": {
    fr: "chatter/telegram",
    en: "chatter/telegram",
    es: "chatter/telegram",
    de: "chatter/telegram",
    ru: "chatter/telegram",
    pt: "chatter/telegram",
    ch: "chatter/telegram",
    hi: "chatter/telegram",
    ar: "مسوق/تيليجرام",
  },
  "chatter-presentation": {
    fr: "chatter/presentation",
    en: "chatter/presentation",
    es: "chatter/presentacion",
    de: "chatter/praesentation",
    ru: "chatter/prezentatsiya",
    pt: "chatter/apresentacao",
    ch: "chatter/jieshao",
    hi: "chatter/parichay",
    ar: "مسوق/عرض",
  },
  "chatter-quiz": {
    fr: "chatter/quiz",
    en: "chatter/quiz",
    es: "chatter/cuestionario",
    de: "chatter/quiz",
    ru: "chatter/viktorina",
    pt: "chatter/questionario",
    ch: "chatter/ceshi",
    hi: "chatter/prashnottari",
    ar: "مسوق/اختبار",
  },
  "chatter-dashboard": {
    fr: "chatter/tableau-de-bord",
    en: "chatter/dashboard",
    es: "chatter/panel",
    de: "chatter/dashboard",
    ru: "chatter/panel-upravleniya",
    pt: "chatter/painel",
    ch: "chatter/kongzhi-mianban",
    hi: "chatter/dashboard",
    ar: "مسوق/لوحة-التحكم",
  },
  "chatter-leaderboard": {
    fr: "chatter/classement",
    en: "chatter/leaderboard",
    es: "chatter/clasificacion",
    de: "chatter/rangliste",
    ru: "chatter/reiting",
    pt: "chatter/classificacao",
    ch: "chatter/paihangbang",
    hi: "chatter/ranking",
    ar: "مسوق/الترتيب",
  },
  "chatter-payments": {
    fr: "chatter/paiements",
    en: "chatter/payments",
    es: "chatter/pagos",
    de: "chatter/zahlungen",
    ru: "chatter/platezhi",
    pt: "chatter/pagamentos",
    ch: "chatter/fukuan",
    hi: "chatter/bhugtaan",
    ar: "مسوق/المدفوعات",
  },
  "chatter-suspended": {
    fr: "chatter/suspendu",
    en: "chatter/suspended",
    es: "chatter/suspendido",
    de: "chatter/gesperrt",
    ru: "chatter/priostanovlen",
    pt: "chatter/suspenso",
    ch: "chatter/zanting",
    hi: "chatter/nilambit",
    ar: "مسوق/معلق",
  },
  "chatter-country-selection": {
    fr: "chatter/pays",
    en: "chatter/country-selection",
    es: "chatter/paises",
    de: "chatter/laenderauswahl",
    ru: "chatter/strany",
    pt: "chatter/paises",
    ch: "chatter/guojia",
    hi: "chatter/desh",
    ar: "مسوق/البلدان",
  },
  "chatter-posts": {
    fr: "chatter/posts",
    en: "chatter/posts",
    es: "chatter/publicaciones",
    de: "chatter/beitraege",
    ru: "chatter/posty",
    pt: "chatter/publicacoes",
    ch: "chatter/tiezi",
    hi: "chatter/post",
    ar: "مسوق/المنشورات",
  },
  "chatter-zoom": {
    fr: "chatter/zoom",
    en: "chatter/zoom",
    es: "chatter/zoom",
    de: "chatter/zoom",
    ru: "chatter/zoom",
    pt: "chatter/zoom",
    ch: "chatter/zoom",
    hi: "chatter/zoom",
    ar: "مسوق/زووم",
  },
  "chatter-training": {
    fr: "chatter/formation",
    en: "chatter/training",
    es: "chatter/formacion",
    de: "chatter/schulung",
    ru: "chatter/obuchenie",
    pt: "chatter/formacao",
    ch: "chatter/peixun",
    hi: "chatter/prashikshan",
    ar: "مسوق/التدريب",
  },
  "chatter-referrals": {
    fr: "chatter/filleuls",
    en: "chatter/referrals",
    es: "chatter/referidos",
    de: "chatter/empfehlungen",
    ru: "chatter/referaly",
    pt: "chatter/indicacoes",
    ch: "chatter/tuijian",
    hi: "chatter/sandarbh",
    ar: "مسوق/الإحالات",
  },
  "chatter-referral-earnings": {
    fr: "chatter/gains-parrainage",
    en: "chatter/referral-earnings",
    es: "chatter/ganancias-referidos",
    de: "chatter/empfehlungs-einnahmen",
    ru: "chatter/dokhody-referaly",
    pt: "chatter/ganhos-indicacoes",
    ch: "chatter/tuijian-shouyi",
    hi: "chatter/sandarbh-kamayi",
    ar: "مسوق/أرباح-الإحالات",
  },
  "chatter-refer": {
    fr: "chatter/parrainer",
    en: "chatter/refer",
    es: "chatter/referir",
    de: "chatter/empfehlen",
    ru: "chatter/priglasit",
    pt: "chatter/indicar",
    ch: "chatter/tuijian-pengyou",
    hi: "chatter/refer-kare",
    ar: "مسوق/إحالة",
  },
  "pioneers": {
    fr: "pioneers",
    en: "pioneers",
    es: "pioneros",
    de: "pioniere",
    ru: "pionery",
    pt: "pioneiros",
    ch: "xianquzhe",
    hi: "agranee",
    ar: "الرواد",
  },
  // Influencer routes
  "influencer-landing": {
    fr: "devenir-influenceur",
    en: "become-influencer",
    es: "ser-influencer",
    de: "influencer-werden",
    ru: "stat-influentserom",
    pt: "tornar-se-influenciador",
    ch: "chengwei-yingxiangli",
    hi: "influencer-bane",
    ar: "كن-مؤثرا",
  },
  "influencer-register": {
    fr: "influencer/inscription",
    en: "influencer/register",
    es: "influencer/registro",
    de: "influencer/registrierung",
    ru: "influencer/registratsiya",
    pt: "influencer/cadastro",
    ch: "influencer/zhuce",
    hi: "influencer/panjikaran",
    ar: "مؤثر/تسجيل",
  },
  "influencer-dashboard": {
    fr: "influencer/tableau-de-bord",
    en: "influencer/dashboard",
    es: "influencer/panel",
    de: "influencer/dashboard",
    ru: "influencer/panel-upravleniya",
    pt: "influencer/painel",
    ch: "influencer/kongzhi-mianban",
    hi: "influencer/dashboard",
    ar: "مؤثر/لوحة-التحكم",
  },
  "influencer-earnings": {
    fr: "influencer/gains",
    en: "influencer/earnings",
    es: "influencer/ganancias",
    de: "influencer/einnahmen",
    ru: "influencer/zarabotok",
    pt: "influencer/ganhos",
    ch: "influencer/shouyi",
    hi: "influencer/kamaai",
    ar: "مؤثر/الأرباح",
  },
  "influencer-referrals": {
    fr: "influencer/filleuls",
    en: "influencer/referrals",
    es: "influencer/referidos",
    de: "influencer/empfehlungen",
    ru: "influencer/referal",
    pt: "influencer/indicacoes",
    ch: "influencer/tuijianren",
    hi: "influencer/sandarbh",
    ar: "مؤثر/الإحالات",
  },
  "influencer-leaderboard": {
    fr: "influencer/classement",
    en: "influencer/leaderboard",
    es: "influencer/clasificacion",
    de: "influencer/rangliste",
    ru: "influencer/reiting",
    pt: "influencer/classificacao",
    ch: "influencer/paihangbang",
    hi: "influencer/ranking",
    ar: "مؤثر/الترتيب",
  },
  "influencer-payments": {
    fr: "influencer/paiements",
    en: "influencer/payments",
    es: "influencer/pagos",
    de: "influencer/zahlungen",
    ru: "influencer/platezhi",
    pt: "influencer/pagamentos",
    ch: "influencer/fukuan",
    hi: "influencer/bhugtaan",
    ar: "مؤثر/المدفوعات",
  },
  "influencer-promo-tools": {
    fr: "influencer/outils",
    en: "influencer/promo-tools",
    es: "influencer/herramientas",
    de: "influencer/werkzeuge",
    ru: "influencer/instrumenty",
    pt: "influencer/ferramentas",
    ch: "influencer/gongju",
    hi: "influencer/upkaran",
    ar: "مؤثر/أدوات",
  },
  "influencer-profile": {
    fr: "influencer/profil",
    en: "influencer/profile",
    es: "influencer/perfil",
    de: "influencer/profil",
    ru: "influencer/profil",
    pt: "influencer/perfil",
    ch: "influencer/geren-ziliao",
    hi: "influencer/profile",
    ar: "مؤثر/الملف-الشخصي",
  },
  "influencer-suspended": {
    fr: "influencer/suspendu",
    en: "influencer/suspended",
    es: "influencer/suspendido",
    de: "influencer/gesperrt",
    ru: "influencer/priostanovlen",
    pt: "influencer/suspenso",
    ch: "influencer/zanting",
    hi: "influencer/nilambit",
    ar: "مؤثر/معلق",
  },
  "influencer-training": {
    fr: "influencer/formation",
    en: "influencer/training",
    es: "influencer/formacion",
    de: "influencer/schulung",
    ru: "influencer/obuchenie",
    pt: "influencer/formacao",
    ch: "influencer/peixun",
    hi: "influencer/prashikshan",
    ar: "مؤثر/تدريب",
  },
  "influencer-resources": {
    fr: "influencer/ressources",
    en: "influencer/resources",
    es: "influencer/recursos",
    de: "influencer/ressourcen",
    ru: "influencer/resursy",
    pt: "influencer/recursos",
    ch: "influencer/ziyuan",
    hi: "influencer/sansaadhan",
    ar: "مؤثر/موارد",
  },
  // Blogger routes
  "blogger-landing": {
    fr: "devenir-blogger",
    en: "become-blogger",
    es: "ser-blogger",
    de: "blogger-werden",
    ru: "stat-bloggerom",
    pt: "tornar-se-blogger",
    ch: "chengwei-boke",
    hi: "blogger-banen",
    ar: "كن-مدون",
  },
  "blogger-register": {
    fr: "blogger/inscription",
    en: "blogger/register",
    es: "blogger/registro",
    de: "blogger/registrieren",
    ru: "blogger/registratsiya",
    pt: "blogger/registro",
    ch: "blogger/zhuce",
    hi: "blogger/panjikaran",
    ar: "مدون/تسجيل",
  },
  "blogger-dashboard": {
    fr: "blogger/tableau-de-bord",
    en: "blogger/dashboard",
    es: "blogger/panel",
    de: "blogger/dashboard",
    ru: "blogger/panel",
    pt: "blogger/painel",
    ch: "blogger/yibiaopan",
    hi: "blogger/dashboard",
    ar: "مدون/لوحة-التحكم",
  },
  "blogger-earnings": {
    fr: "blogger/gains",
    en: "blogger/earnings",
    es: "blogger/ganancias",
    de: "blogger/einnahmen",
    ru: "blogger/zarabotok",
    pt: "blogger/ganhos",
    ch: "blogger/shouyi",
    hi: "blogger/kamayi",
    ar: "مدون/الأرباح",
  },
  "blogger-referrals": {
    fr: "blogger/filleuls",
    en: "blogger/referrals",
    es: "blogger/referidos",
    de: "blogger/empfehlungen",
    ru: "blogger/referaly",
    pt: "blogger/indicacoes",
    ch: "blogger/tuijian",
    hi: "blogger/sandarbh",
    ar: "مدون/الإحالات",
  },
  "blogger-leaderboard": {
    fr: "blogger/classement",
    en: "blogger/leaderboard",
    es: "blogger/clasificacion",
    de: "blogger/rangliste",
    ru: "blogger/liderboard",
    pt: "blogger/classificacao",
    ch: "blogger/paihangbang",
    hi: "blogger/leaderboard",
    ar: "مدون/الترتيب",
  },
  "blogger-payments": {
    fr: "blogger/paiements",
    en: "blogger/payments",
    es: "blogger/pagos",
    de: "blogger/zahlungen",
    ru: "blogger/platezhi",
    pt: "blogger/pagamentos",
    ch: "blogger/zhifu",
    hi: "blogger/bhugtan",
    ar: "مدون/المدفوعات",
  },
  "blogger-resources": {
    fr: "blogger/ressources",
    en: "blogger/resources",
    es: "blogger/recursos",
    de: "blogger/ressourcen",
    ru: "blogger/resursy",
    pt: "blogger/recursos",
    ch: "blogger/ziyuan",
    hi: "blogger/sansadhan",
    ar: "مدون/الموارد",
  },
  "blogger-guide": {
    fr: "blogger/guide",
    en: "blogger/guide",
    es: "blogger/guia",
    de: "blogger/anleitung",
    ru: "blogger/rukovodstvo",
    pt: "blogger/guia",
    ch: "blogger/zhinan",
    hi: "blogger/margdarshak",
    ar: "مدون/الدليل",
  },
  "blogger-promo-tools": {
    fr: "blogger/outils",
    en: "blogger/promo-tools",
    es: "blogger/herramientas",
    de: "blogger/werkzeuge",
    ru: "blogger/instrumenty",
    pt: "blogger/ferramentas",
    ch: "blogger/gongju",
    hi: "blogger/upkaran",
    ar: "مدون/أدوات-الترويج",
  },
  "blogger-profile": {
    fr: "blogger/profil",
    en: "blogger/profile",
    es: "blogger/perfil",
    de: "blogger/profil",
    ru: "blogger/profil",
    pt: "blogger/perfil",
    ch: "blogger/geren-ziliao",
    hi: "blogger/profile",
    ar: "مدون/الملف-الشخصي",
  },
  "blogger-suspended": {
    fr: "blogger/suspendu",
    en: "blogger/suspended",
    es: "blogger/suspendido",
    de: "blogger/gesperrt",
    ru: "blogger/priostanovlen",
    pt: "blogger/suspenso",
    ch: "blogger/zanting",
    hi: "blogger/nilambit",
    ar: "مدون/معلق",
  },
  // GroupAdmin routes
  "groupadmin-landing": {
    fr: "devenir-admin-groupe",
    en: "become-group-admin",
    es: "convertirse-admin-grupo",
    de: "gruppenadmin-werden",
    ru: "stat-admin-gruppy",
    pt: "tornar-se-admin-grupo",
    ch: "chengwei-qunzhu",
    hi: "group-admin-bane",
    ar: "كن-مسؤول-مجموعة",
  },
  "groupadmin-register": {
    fr: "groupadmin/inscription",
    en: "groupadmin/register",
    es: "groupadmin/registro",
    de: "groupadmin/registrieren",
    ru: "groupadmin/registratsiya",
    pt: "groupadmin/registro",
    ch: "groupadmin/zhuce",
    hi: "groupadmin/panjikaran",
    ar: "مسؤول-مجموعة/التسجيل",
  },
  "groupadmin-dashboard": {
    fr: "groupadmin/tableau-de-bord",
    en: "groupadmin/dashboard",
    es: "groupadmin/panel",
    de: "groupadmin/dashboard",
    ru: "groupadmin/panel",
    pt: "groupadmin/painel",
    ch: "groupadmin/yibiaopan",
    hi: "groupadmin/dashboard",
    ar: "مسؤول-مجموعة/لوحة-التحكم",
  },
  "groupadmin-resources": {
    fr: "groupadmin/ressources",
    en: "groupadmin/resources",
    es: "groupadmin/recursos",
    de: "groupadmin/ressourcen",
    ru: "groupadmin/resursy",
    pt: "groupadmin/recursos",
    ch: "groupadmin/ziyuan",
    hi: "groupadmin/sansadhan",
    ar: "مسؤول-مجموعة/الموارد",
  },
  "groupadmin-posts": {
    fr: "groupadmin/publications",
    en: "groupadmin/posts",
    es: "groupadmin/publicaciones",
    de: "groupadmin/beitraege",
    ru: "groupadmin/publikatsii",
    pt: "groupadmin/publicacoes",
    ch: "groupadmin/fabu",
    hi: "groupadmin/post",
    ar: "مسؤول-مجموعة/المنشورات",
  },
  "groupadmin-payments": {
    fr: "groupadmin/paiements",
    en: "groupadmin/payments",
    es: "groupadmin/pagos",
    de: "groupadmin/zahlungen",
    ru: "groupadmin/platezhi",
    pt: "groupadmin/pagamentos",
    ch: "groupadmin/zhifu",
    hi: "groupadmin/bhugtan",
    ar: "مسؤول-مجموعة/المدفوعات",
  },
  "groupadmin-referrals": {
    fr: "groupadmin/filleuls",
    en: "groupadmin/referrals",
    es: "groupadmin/referidos",
    de: "groupadmin/empfehlungen",
    ru: "groupadmin/referal",
    pt: "groupadmin/indicacoes",
    ch: "groupadmin/tuijian",
    hi: "groupadmin/referral",
    ar: "مسؤول-مجموعة/الإحالات",
  },
  "groupadmin-leaderboard": {
    fr: "groupadmin/classement",
    en: "groupadmin/leaderboard",
    es: "groupadmin/clasificacion",
    de: "groupadmin/rangliste",
    ru: "groupadmin/liderboard",
    pt: "groupadmin/classificacao",
    ch: "groupadmin/paihangbang",
    hi: "groupadmin/leaderboard",
    ar: "مسؤول-مجموعة/الترتيب",
  },
  "groupadmin-guide": {
    fr: "groupadmin/guide",
    en: "groupadmin/guide",
    es: "groupadmin/guia",
    de: "groupadmin/anleitung",
    ru: "groupadmin/rukovodstvo",
    pt: "groupadmin/guia",
    ch: "groupadmin/zhinan",
    hi: "groupadmin/guide",
    ar: "مسؤول-مجموعة/الدليل",
  },
  "groupadmin-suspended": {
    fr: "groupadmin/suspendu",
    en: "groupadmin/suspended",
    es: "groupadmin/suspendido",
    de: "groupadmin/gesperrt",
    ru: "groupadmin/priostanovlen",
    pt: "groupadmin/suspenso",
    ch: "groupadmin/zanting",
    hi: "groupadmin/nilambit",
    ar: "مسؤول-مجموعة/معلق",
  },
  "groupadmin-profile": {
    fr: "group-admin/profil",
    en: "group-admin/profile",
    es: "group-admin/perfil",
    de: "group-admin/profil",
    ru: "group-admin/profil",
    pt: "group-admin/perfil",
    ch: "group-admin/ziliao",
    hi: "group-admin/profail",
    ar: "مسؤول-مجموعة/ملف-شخصي",
  },
};

/**
 * Get translated route slug for a given route key and language
 * @param routeKey - The route key (e.g., "lawyer", "expat")
 * @param lang - The language code
 * @returns The translated slug
 */
export function getTranslatedRouteSlug(routeKey: RouteKey, lang: Language): string {
  return ROUTE_TRANSLATIONS[routeKey]?.[lang] || ROUTE_TRANSLATIONS[routeKey]?.["en"] || routeKey;
}

/**
 * Get all translated slugs for a route key (for route registration)
 * @param routeKey - The route key
 * @returns Array of all translated slugs
 */
export function getAllTranslatedSlugs(routeKey: RouteKey): string[] {
  return Object.values(ROUTE_TRANSLATIONS[routeKey] || {});
}

/**
 * Find a child route key that extends a parent route and matches a segment in any language
 * @param parentRouteKey - The parent route key (e.g., "dashboard-subscription")
 * @param childSegment - The child segment to match (e.g., "plany", "plans", "jihua")
 * @returns The child route key if found, null otherwise
 */
export function findChildRouteBySegment(parentRouteKey: RouteKey, childSegment: string): RouteKey | null {
  // Look for routes that start with parentRouteKey-
  const childPrefix = `${parentRouteKey}-`;

  for (const [key, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
    if (key.startsWith(childPrefix)) {
      // Check if childSegment matches the last segment of any translation
      for (const translation of Object.values(translations)) {
        const segments = translation.split("/");
        const lastSegment = segments[segments.length - 1];
        if (lastSegment === childSegment) {
          return key as RouteKey;
        }
      }
    }
  }

  return null;
}

/**
 * Find route key from a slug (reverse lookup)
 * @param slug - The slug to look up
 * @returns The route key if found, null otherwise
 */
export function getRouteKeyFromSlug(slug: string): RouteKey | null {
  // Normalize the slug - try decoding if it's URL-encoded
  let normalizedSlug = slug;

  try {
    const decoded = decodeURIComponent(slug);
    if (decoded !== slug) normalizedSlug = decoded;
  } catch {
    normalizedSlug = slug;
  }

  // First pass: exact match against any translation value
  for (const [key, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
    const translationValues = Object.values(translations);
    if (translationValues.includes(slug) || translationValues.includes(normalizedSlug)) {
      return key as RouteKey;
    }
  }

  // Fallback: if slug is compound (contains '/'), try matching by last segment
  // Example: incoming "register/lawyer" should match a translation value "lawyer" (or "avocat")
  if (normalizedSlug.includes("/")) {
    const segments = normalizedSlug.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    try {
      const decodedLast = decodeURIComponent(last);
      // try both last and decodedLast
      for (const [key, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
        const translationValues = Object.values(translations);
        if (translationValues.includes(last) || translationValues.includes(decodedLast)) {
          return key as RouteKey;
        }
      }
    } catch {
      for (const [key, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
        const translationValues = Object.values(translations);
        if (translationValues.includes(last)) {
          return key as RouteKey;
        }
      }
    }
  }

  return null;
}

/**
 * Check if a slug is a translated route slug
 * @param slug - The slug to check
 * @returns True if it's a known translated slug
 */
export function isTranslatedRouteSlug(slug: string): boolean {
  return getRouteKeyFromSlug(slug) !== null;
}

/**
 * Get translated route path for navigation
 * @param routeKey - The route key (e.g., "lawyer", "expat")
 * @param lang - The language code
 * @param params - Additional path parameters (e.g., { country: "france", language: "en", nameId: "..." })
 * @returns The full translated route path
 */
export function getTranslatedRoutePath(
  routeKey: RouteKey,
  lang: Language,
  params?: Record<string, string>
): string {
  const slug = getTranslatedRouteSlug(routeKey, lang);

  if (params) {
    // For dynamic routes like /lawyers/:country/:language/:nameId
    if (routeKey === "lawyer" || routeKey === "expat") {
      const { country, language, nameId } = params;
      if (country && language && nameId) {
        return `/${slug}/${country}/${language}/${nameId}`;
      }
    }
    // For register routes like /register/lawyer
    if (routeKey === "register-lawyer" || routeKey === "register-expat") {
      return `/register/${slug}`;
    }
  }

  // For simple routes
  return `/${slug}`;
}

