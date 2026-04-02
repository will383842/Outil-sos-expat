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
  | "terms-chatters"      // /terms-chatters -> /cgu-chatters, etc.
  | "terms-influencers"   // /terms-influencers -> /cgu-influenceurs, etc.
  | "terms-bloggers"      // /terms-bloggers -> /cgu-bloggeurs, etc.
  | "terms-group-admins"  // /terms-group-admins -> /cgu-admins-groupe, etc.
  | "terms-affiliate"     // /terms-affiliate -> /cgu-affiliation, etc.
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
  | "annuaire"           // /annuaire -> /annuaire, /directory, /directorio, etc.
  | "providers"          // /providers -> /prestataires, /proveedores, etc.
  | "provider"           // /provider/:id -> /prestataire/:id, /proveedor/:id, etc.
  | "lawyers-country"    // /lawyers-in/:country -> /avocats-en/:pays, etc.
  | "expats-country"     // /expats-in/:country -> /expatries-en/:pays, etc.
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
  | "affiliate-telegram" // /affiliate/telegram -> /parrainage/telegram, etc.
  // Chatter routes
  | "chatter-landing"      // /devenir-chatter -> /become-chatter, etc.
  | "chatter-register"     // /chatter/inscription -> /chatter/register, etc.
  | "chatter-telegram"     // /chatter/telegram -> /chatter/telegram, etc.
  | "chatter-dashboard"    // /chatter/tableau-de-bord -> /chatter/dashboard, etc.
  | "chatter-leaderboard"  // /chatter/classement -> /chatter/leaderboard, etc.
  | "chatter-payments"     // /chatter/paiements -> /chatter/payments, etc.
  | "chatter-suspended"    // /chatter/suspendu -> /chatter/suspended, etc.
  | "chatter-country-selection" // /chatter/pays -> /chatter/country-selection, etc.
  | "chatter-zoom"         // /chatter/zoom -> /chatter/zoom, etc.
  | "chatter-training"     // /chatter/formation -> /chatter/training, etc.
  | "chatter-referrals"    // /chatter/filleuls -> /chatter/referrals, etc.
  | "chatter-referral-earnings" // /chatter/gains-parrainage -> /chatter/referral-earnings, etc.
  | "chatter-refer"        // /chatter/parrainer -> /chatter/refer, etc.
  | "chatter-progression"  // /chatter/progression -> /chatter/progression, etc.
  | "chatter-how-to-earn"  // /chatter/comment-gagner -> /chatter/how-to-earn, etc.
  | "chatter-captain-team" // /chatter/mon-equipe -> /chatter/my-team, etc.
  | "chatter-resources"    // /chatter/ressources -> /chatter/resources, etc.
  | "chatter-profile"      // /chatter/profil -> /chatter/profile, etc.
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
  | "blogger-blogger-recruitment" // /blogger/parrainage-blogueurs -> /blogger/blogger-recruitment, etc.
  | "blogger-leaderboard"     // /blogger/classement -> /blogger/leaderboard, etc.
  | "blogger-payments"        // /blogger/paiements -> /blogger/payments, etc.
  | "blogger-resources"       // /blogger/ressources -> /blogger/resources, etc.
  | "blogger-guide"           // /blogger/guide -> /blogger/guide, etc.
  | "blogger-widgets"         // /blogger/widgets -> /blogger/widgets, etc.
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
  | "groupadmin-admin-recruitment" // /groupadmin/parrainage-admins -> /groupadmin/admin-recruitment, etc.
  | "groupadmin-leaderboard"  // /groupadmin/classement -> /groupadmin/leaderboard, etc.
  | "groupadmin-guide"        // /groupadmin/guide -> /groupadmin/guide, etc.
  | "groupadmin-suspended"    // /groupadmin/suspendu -> /groupadmin/suspended, etc.
  | "groupadmin-profile"      // /groupadmin/profil -> /groupadmin/profile, etc.
  | "influencer-telegram"     // /influencer/telegram -> /influencer/telegram, etc.
  | "blogger-telegram"        // /blogger/telegram -> /blogger/telegram, etc.
  | "groupadmin-telegram"     // /group-admin/telegram -> /group-admin/telegram, etc.
  | "group-community"         // /groupes-communaute -> /community-groups, etc.
  | "influencer-directory"   // /nos-influenceurs -> /our-influencers, etc.
  | "blogger-directory"   // /nos-blogueurs -> /our-bloggers, etc.
  | "chatter-directory"  // /nos-chatters -> /our-chatters, etc.
  | "captain-landing"    // /devenir-capitaine -> /become-captain, etc.
  | "partner-landing"    // /devenir-partenaire -> /become-partner, etc.
  | "partners-page"      // /partenaires -> /partners, etc.
  | "partner-dashboard"  // /partner/tableau-de-bord -> /partner/dashboard, etc.
  | "partner-earnings"   // /partner/gains -> /partner/earnings, etc.
  | "partner-clicks"     // /partner/statistiques -> /partner/statistics, etc.
  | "partner-widgets"    // /partner/widgets -> /partner/widgets, etc.
  | "partner-resources"  // /partner/ressources -> /partner/resources, etc.
  | "partner-profile"    // /partner/profil -> /partner/profile, etc.
  | "partner-payments"   // /partner/paiements -> /partner/payments, etc.
  | "partner-subscribers" // /partner/abonnes -> /partner/subscribers, etc.
  | "partner-agreement"   // /partner/accord -> /partner/agreement, etc.
  | "partner-suspended"  // /partner/suspendu -> /partner/suspended, etc.
  | "partner-telegram"   // /partner/telegram -> /partner/telegram, etc.
  | "press"              // /presse -> /press, /prensa, etc.
  // Public content pages (Redesign 2026)
  | "articles"           // /articles -> /articles, /articulos, etc.
  | "fiches-pays"        // /categories/fiches-pays -> /categories/country-guides, etc.
  | "fiches-thematiques" // /categories/fiches-thematiques -> /categories/thematic-guides, etc.
  | "programme-chatter"  // /categories/programme -> /categories/chatter-program, etc.
  | "programme-affiliation" // /categories/affiliation -> /categories/affiliate-program, etc.
  | "sondages-listing"   // /categories/sondages -> /categories/surveys, etc.
  | "sondages"           // /sondages -> /surveys, etc.
  | "resultats-sondages" // /resultats-sondages -> /surveys-results, etc.
  | "outils-listing"     // /categories/outils -> /categories/tools, etc.
  | "outils"             // /outils -> /tools, etc.
  | "galerie";           // /galerie -> /gallery, etc.

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
    ar: "muhamun",
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
    ar: "mughtaribun",
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
    ar: "ibhath-an-muhami",
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
    ar: "ibhath-an-mugtarib",
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
    ar: "tasjil/muhami",
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
    ar: "tasjil/mugtarib",
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
    ar: "tasjil/amil",
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
    ar: "shurut-al-muhamin",
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
    ar: "shurut-al-mugtaribin",
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
    ar: "shurut-al-murwajin",
  },
  "terms-influencers": {
    fr: "cgu-influenceurs",
    en: "terms-influencers",
    es: "terminos-influencers",
    de: "agb-influencer",
    ru: "usloviya-influensery",
    pt: "termos-influenciadores",
    ch: "tiaokuan-wanghong",
    hi: "shartein-influencers",
    ar: "shurut-al-muathirin",
  },
  "terms-bloggers": {
    fr: "cgu-bloggeurs",
    en: "terms-bloggers",
    es: "terminos-bloggers",
    de: "agb-blogger",
    ru: "usloviya-blogery",
    pt: "termos-bloggers",
    ch: "tiaokuan-boke",
    hi: "shartein-bloggers",
    ar: "shurut-al-mudawwinin",
  },
  "terms-group-admins": {
    fr: "cgu-admins-groupe",
    en: "terms-group-admins",
    es: "terminos-admins-grupo",
    de: "agb-gruppenadmins",
    ru: "usloviya-adminy-grupp",
    pt: "termos-admins-grupo",
    ch: "tiaokuan-qunguanli",
    hi: "shartein-group-admins",
    ar: "shurut-mushrifi-al-majmuaat",
  },
  "terms-affiliate": {
    fr: "cgu-affiliation",
    en: "terms-affiliate",
    es: "terminos-afiliacion",
    de: "agb-partnerprogramm",
    ru: "usloviya-partnerstva",
    pt: "termos-afiliacao",
    ch: "tiaokuan-lianmeng",
    hi: "shartein-affiliate",
    ar: "shurut-al-shiraka",
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
    ar: "mukalama-tawariy",
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
    ar: "mukalama-al-mugtarib",
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
    ar: "shurut-al-umala",
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
    ar: "al-asaar",
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
    ar: "ittasil-bina",
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
    ar: "kayfa-yamal",
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
    ar: "al-asila-al-shaiya",
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
    ar: "markaz-almosaada",
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
    ar: "al-shahdat",
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
    ar: "siyasat-al-khususiya",
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
    ar: "milafat-al-tarif",
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
    ar: "al-mustahlikin",
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
    ar: "halat-al-khidma",
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
    ar: "tahsin-muharrikat-al-bahth",
  },
  "annuaire": {
    fr: "annuaire",
    en: "expat-directory",
    es: "directorio-expat",
    de: "expat-verzeichnis",
    ru: "spravochnik-expat",
    pt: "diretorio-expat",
    ch: "zhinan-expat",
    hi: "nirdeshika-expat",
    ar: "dalil-expat",
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
    ar: "muqadimi-al-khidmat",
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
    ar: "muqadim-al-khidma",
  },
  "lawyers-country": {
    fr: "avocats",
    en: "lawyers",
    es: "abogados",
    de: "anwaelte",
    ru: "advokaty",
    pt: "advogados",
    ch: "lushi",
    hi: "vakil",
    ar: "muhamun",
  },
  "expats-country": {
    fr: "expatries",
    en: "expats",
    es: "expatriados",
    de: "expats",
    ru: "expaty",
    pt: "expatriados",
    ch: "haiwai",
    hi: "videshi",
    ar: "mughtaribun",
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
    ar: "lawhat-altahakkum",
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
    ar: "al-malaf-al-shakhsi",
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
    ar: "al-daf-al-mukalama",
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
    ar: "talab-al-hujiz",
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
    ar: "al-daf-najah",
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
    ar: "lawhat-altahakkum/al-rasail",
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
    ar: "lawhat-altahakkum/musaid-al-dhaka",
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
    ar: "lawhat-altahakkum/al-aishtirak",
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
    ar: "lawhat-altahakkum/al-aishtirak/al-khitat",
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
    ar: "lawhat-altahakkum/al-aishtirak/najah",
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
    ar: "lawhat-altahakkum/al-muhadathat",
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
    ar: "lawhat-altahakkum/al-tahaqquq",
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
    ar: "tasjil-al-dakhul",
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
    ar: "al-tasjil",
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
    ar: "iadat-tayin-kalimat-al-murur",
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
    ar: "barnamaj-al-ihala",
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
    ar: "barnamaj-al-ihala/al-arbah",
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
    ar: "barnamaj-al-ihala/al-ihalayt",
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
    ar: "barnamaj-al-ihala/al-sahb",
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
    ar: "barnamaj-al-ihala/al-bayanat-al-masrafiya",
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
    ar: "barnamaj-al-ihala/adawat",
  },
  "affiliate-telegram": {
    fr: "parrainage/telegram",
    en: "affiliate/telegram",
    es: "afiliado/telegram",
    de: "partnerprogramm/telegram",
    ru: "partnerskaya-programma/telegram",
    pt: "afiliado/telegram",
    ch: "tuiguang/telegram",
    hi: "sahbhagi/telegram",
    ar: "barnamaj-al-ihala/telegram",
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
    ar: "kun-musawwiqan",
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
    ar: "musawwiq/tasjil",
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
    ar: "musawwiq/telegram",
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
    ar: "musawwiq/lawhat-altahakkum",
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
    ar: "musawwiq/al-tartib",
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
    ar: "musawwiq/al-madfuat",
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
    ar: "musawwiq/muallaq",
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
    ar: "musawwiq/al-buldan",
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
    ar: "musawwiq/zoom",
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
    ar: "musawwiq/al-tadrib",
  },
  "chatter-resources": {
    fr: "chatter/ressources",
    en: "chatter/resources",
    es: "chatter/recursos",
    de: "chatter/ressourcen",
    ru: "chatter/resursy",
    pt: "chatter/recursos",
    ch: "chatter/ziyuan",
    hi: "chatter/sansaadhan",
    ar: "musawwiq/mawaarid",
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
    ar: "musawwiq/al-ihalayt",
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
    ar: "musawwiq/arbah-al-ihalayt",
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
    ar: "musawwiq/ihala",
  },
  "chatter-progression": {
    fr: "chatter/progression",
    en: "chatter/progression",
    es: "chatter/progresion",
    de: "chatter/fortschritt",
    ru: "chatter/progress",
    pt: "chatter/progressao",
    ch: "chatter/jindu",
    hi: "chatter/pragati",
    ar: "musawwiq/al-taqaddum",
  },
  "chatter-how-to-earn": {
    fr: "chatter/comment-gagner",
    en: "chatter/how-to-earn",
    es: "chatter/como-ganar",
    de: "chatter/wie-verdienen",
    ru: "chatter/kak-zarabotat",
    pt: "chatter/como-ganhar",
    ch: "chatter/ruhe-zhuanqian",
    hi: "chatter/kaise-kamaye",
    ar: "musawwiq/kayfa-taksab",
  },
  "chatter-captain-team": {
    fr: "chatter/mon-equipe",
    en: "chatter/my-team",
    es: "chatter/mi-equipo",
    de: "chatter/mein-team",
    ru: "chatter/moya-komanda",
    pt: "chatter/minha-equipe",
    ch: "chatter/wode-tuandui",
    hi: "chatter/meri-team",
    ar: "musawwiq/fariqii",
  },
  "chatter-profile": {
    fr: "chatter/profil",
    en: "chatter/profile",
    es: "chatter/perfil",
    de: "chatter/profil",
    ru: "chatter/profil",
    pt: "chatter/perfil",
    ch: "chatter/geren-ziliao",
    hi: "chatter/profile",
    ar: "musawwiq/al-malaf-al-shakhsi",
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
    ar: "al-ruwwad",
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
    ar: "kun-muathiran",
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
    ar: "muathir/tasjil",
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
    ar: "muathir/lawhat-altahakkum",
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
    ar: "muathir/al-arbah",
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
    ar: "muathir/al-ihalayt",
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
    ar: "muathir/al-tartib",
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
    ar: "muathir/al-madfuat",
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
    ar: "muathir/adawat",
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
    ar: "muathir/al-malaf-al-shakhsi",
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
    ar: "muathir/muallaq",
  },
  "influencer-training": {
    fr: "influencer/formation",
    en: "influencer/training",
    es: "influencer/formacion",
    de: "influencer/schulung",
    ru: "influencer/obuchenie",
    pt: "influencer/treinamento",
    ch: "influencer/peixun",
    hi: "influencer/prashikshan",
    ar: "muathir/tadrib",
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
    ar: "muathir/mawaarid",
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
    ar: "kun-mudawwinan",
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
    ar: "mudawwin/tasjil",
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
    ar: "mudawwin/lawhat-altahakkum",
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
    ar: "mudawwin/al-arbah",
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
    ar: "mudawwin/al-ihalayt",
  },
  "blogger-blogger-recruitment": {
    fr: "blogger/parrainage-blogueurs",
    en: "blogger/blogger-recruitment",
    es: "blogger/reclutamiento-bloggers",
    de: "blogger/blogger-rekrutierung",
    ru: "blogger/nabor-bloggerov",
    pt: "blogger/recrutamento-bloggers",
    ch: "blogger/boke-zhaom",
    hi: "blogger/blogger-bharti",
    ar: "mudawwin/tawzif-al-mudawwinin",
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
    ar: "mudawwin/al-tartib",
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
    ar: "mudawwin/al-madfuat",
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
    ar: "mudawwin/al-mawaarid",
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
    ar: "mudawwin/al-dalil",
  },
  "blogger-widgets": {
    fr: "blogger/widgets",
    en: "blogger/widgets",
    es: "blogger/widgets",
    de: "blogger/widgets",
    ru: "blogger/vidzhety",
    pt: "blogger/widgets",
    ch: "blogger/xiaogongju",
    hi: "blogger/widgets",
    ar: "mudawwin/al-widget",
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
    ar: "mudawwin/adawat-al-tarwij",
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
    ar: "mudawwin/al-malaf-al-shakhsi",
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
    ar: "mudawwin/muallaq",
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
    ar: "kun-masul-majmuaa",
  },
  "group-community": {
    fr: "groupes-communaute",
    en: "community-groups",
    es: "grupos-comunidad",
    de: "gemeinschaftsgruppen",
    ru: "soobshchestvo-gruppy",
    pt: "grupos-comunidade",
    ch: "shequ-qunzu",
    hi: "samudayik-samuh",
    ar: "majmuaat-al-mujtamaa",
  },
  "influencer-directory": {
    fr: "nos-influenceurs",
    en: "our-influencers",
    es: "nuestros-influencers",
    de: "unsere-influencer",
    ru: "nashi-influensery",
    pt: "nossos-influencers",
    ch: "women-influencers",
    hi: "hamare-influencer",
    ar: "muathiruna",
  },
  "blogger-directory": {
    fr: "nos-blogueurs",
    en: "our-bloggers",
    es: "nuestros-bloggers",
    de: "unsere-blogger",
    ru: "nashi-blogery",
    pt: "nossos-bloggers",
    ch: "women-de-boke",
    hi: "hamare-blogger",
    ar: "mudawwanatuna",
  },
  "chatter-directory": {
    fr: "nos-chatters",
    en: "our-chatters",
    es: "nuestros-chatters",
    de: "unsere-chatters",
    pt: "nossos-chatters",
    ar: "muhadithuna",
    ru: "nashi-chattery",
    hi: "hamare-chatters",
    ch: "women-de-chatters",
  },
  "captain-landing": {
    fr: "devenir-capitaine",
    en: "become-captain",
    es: "ser-capitan",
    de: "kapitaen-werden",
    ru: "stat-kapitanom",
    pt: "tornar-se-capitao",
    ch: "chengwei-duizhang",
    hi: "captain-bane",
    ar: "kun-qaidan",
  },
  "press": {
    fr: "presse",
    en: "press",
    es: "prensa",
    de: "presse",
    ru: "pressa",
    pt: "imprensa",
    ch: "xinwen",
    hi: "press",
    ar: "sahafa",
  },
  "partner-landing": {
    fr: "devenir-partenaire",
    en: "become-partner",
    es: "ser-socio",
    de: "partner-werden",
    ru: "stat-partnerom",
    pt: "tornar-se-parceiro",
    ch: "chengwei-hezuohuoban",
    hi: "partner-bane",
    ar: "ken-sharikan",
  },
  "partners-page": {
    fr: "partenaires",
    en: "partners",
    es: "socios",
    de: "partner",
    ru: "partnery",
    pt: "parceiros",
    ch: "hezuohuoban",
    hi: "saajhedar",
    ar: "al-shuraka",
  },
  "partner-dashboard": {
    fr: "partner/tableau-de-bord",
    en: "partner/dashboard",
    es: "partner/panel",
    de: "partner/dashboard",
    ru: "partner/panel",
    pt: "partner/painel",
    ch: "partner/yibiaopan",
    hi: "partner/dashboard",
    ar: "partner/lawhat-altahakkum",
  },
  "partner-earnings": {
    fr: "partner/gains",
    en: "partner/earnings",
    es: "partner/ganancias",
    de: "partner/einnahmen",
    ru: "partner/zarabotok",
    pt: "partner/ganhos",
    ch: "partner/shouyi",
    hi: "partner/kamai",
    ar: "partner/al-arbah",
  },
  "partner-clicks": {
    fr: "partner/statistiques",
    en: "partner/statistics",
    es: "partner/estadisticas",
    de: "partner/statistiken",
    ru: "partner/statistika",
    pt: "partner/estatisticas",
    ch: "partner/tongji",
    hi: "partner/sankhyiki",
    ar: "partner/ihsaiyat",
  },
  "partner-widgets": {
    fr: "partner/widgets",
    en: "partner/widgets",
    es: "partner/widgets",
    de: "partner/widgets",
    ru: "partner/vidzhety",
    pt: "partner/widgets",
    ch: "partner/xiaozujian",
    hi: "partner/widgets",
    ar: "partner/adawat",
  },
  "partner-resources": {
    fr: "partner/ressources",
    en: "partner/resources",
    es: "partner/recursos",
    de: "partner/ressourcen",
    ru: "partner/resursy",
    pt: "partner/recursos",
    ch: "partner/ziyuan",
    hi: "partner/sansadhan",
    ar: "partner/al-mawaarid",
  },
  "partner-profile": {
    fr: "partner/profil",
    en: "partner/profile",
    es: "partner/perfil",
    de: "partner/profil",
    ru: "partner/profil",
    pt: "partner/perfil",
    ch: "partner/ziliao",
    hi: "partner/profile",
    ar: "partner/al-malaf-al-shakhsi",
  },
  "partner-payments": {
    fr: "partner/paiements",
    en: "partner/payments",
    es: "partner/pagos",
    de: "partner/zahlungen",
    ru: "partner/platezhi",
    pt: "partner/pagamentos",
    ch: "partner/zhifu",
    hi: "partner/bhugtan",
    ar: "partner/al-madfuat",
  },
  "partner-subscribers": {
    fr: "partner/abonnes",
    en: "partner/subscribers",
    es: "partner/suscriptores",
    de: "partner/abonnenten",
    ru: "partner/podpischiki",
    pt: "partner/assinantes",
    ch: "partner/dingyuezhe",
    hi: "partner/subscribers",
    ar: "partner/al-mushtarikin",
  },
  "partner-agreement": {
    fr: "partner/accord",
    en: "partner/agreement",
    es: "partner/acuerdo",
    de: "partner/vereinbarung",
    ru: "partner/soglashenie",
    pt: "partner/acordo",
    ch: "partner/xieyi",
    hi: "partner/agreement",
    ar: "partner/al-ittifaqiya",
  },
  "partner-suspended": {
    fr: "partner/suspendu",
    en: "partner/suspended",
    es: "partner/suspendido",
    de: "partner/gesperrt",
    ru: "partner/priostanovlen",
    pt: "partner/suspenso",
    ch: "partner/tingzhi",
    hi: "partner/nilambit",
    ar: "partner/muallaq",
  },
  "partner-telegram": {
    fr: "partner/telegram",
    en: "partner/telegram",
    es: "partner/telegram",
    de: "partner/telegram",
    ru: "partner/telegram",
    pt: "partner/telegram",
    ch: "partner/telegram",
    hi: "partner/telegram",
    ar: "partner/telegram",
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
    ar: "masul-majmuaa/al-tasjil",
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
    ar: "masul-majmuaa/lawhat-altahakkum",
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
    ar: "masul-majmuaa/al-mawaarid",
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
    ar: "masul-majmuaa/al-manshurat",
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
    ar: "masul-majmuaa/al-madfuat",
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
    ar: "masul-majmuaa/al-ihalayt",
  },
  "groupadmin-admin-recruitment": {
    fr: "groupadmin/parrainage-admins",
    en: "groupadmin/admin-recruitment",
    es: "groupadmin/reclutamiento-admins",
    de: "groupadmin/admin-rekrutierung",
    ru: "groupadmin/rekrutirovaniye-adminov",
    pt: "groupadmin/recrutamento-admins",
    ch: "groupadmin/admin-zhaomu",
    hi: "groupadmin/admin-bharti",
    ar: "masul-majmuaa/tawzif-al-mushrifin",
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
    ar: "masul-majmuaa/al-tartib",
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
    ar: "masul-majmuaa/al-dalil",
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
    ar: "masul-majmuaa/muallaq",
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
    ar: "masul-majmuaa/malaf-shakhsi",
  },
  "influencer-telegram": {
    fr: "influencer/telegram",
    en: "influencer/telegram",
    es: "influencer/telegram",
    de: "influencer/telegram",
    ru: "influencer/telegram",
    pt: "influencer/telegram",
    ch: "influencer/telegram",
    hi: "influencer/telegram",
    ar: "influencer/telegram",
  },
  "blogger-telegram": {
    fr: "blogger/telegram",
    en: "blogger/telegram",
    es: "blogger/telegram",
    de: "blogger/telegram",
    ru: "blogger/telegram",
    pt: "blogger/telegram",
    ch: "blogger/telegram",
    hi: "blogger/telegram",
    ar: "blogger/telegram",
  },
  "groupadmin-telegram": {
    fr: "group-admin/telegram",
    en: "group-admin/telegram",
    es: "group-admin/telegram",
    de: "group-admin/telegram",
    ru: "group-admin/telegram",
    pt: "group-admin/telegram",
    ch: "group-admin/telegram",
    hi: "group-admin/telegram",
    ar: "group-admin/telegram",
  },
  // ── Public content pages (Redesign 2026) ──
  "articles": {
    fr: "articles",
    en: "articles",
    es: "articulos",
    de: "artikel",
    ru: "stati",
    pt: "artigos",
    ch: "wenzhang",
    hi: "lekh",
    ar: "maqalat",
  },
  "fiches-pays": {
    fr: "fiches-pays",
    en: "country-guides",
    es: "guias-paises",
    de: "laenderguides",
    ru: "stranovy-spravochnik",
    pt: "guias-paises",
    ch: "guojia-zhinan",
    hi: "desh-margdarshika",
    ar: "adillat-al-buldan",
  },
  "fiches-thematiques": {
    fr: "fiches-thematiques",
    en: "thematic-guides",
    es: "guias-tematicas",
    de: "themenguides",
    ru: "tematicheskie-spravochniki",
    pt: "guias-tematicos",
    ch: "zhuti-zhinan",
    hi: "vishayak-margdarshika",
    ar: "adillat-mawduiyya",
  },
  "programme-chatter": {
    fr: "programme-chatter",
    en: "chatter-program",
    es: "programa-chatter",
    de: "chatter-programm",
    ru: "programma-chatter",
    pt: "programa-chatter",
    ch: "chatter-jihua",
    hi: "chatter-karyakram",
    ar: "barnamaj-chatter",
  },
  "programme-affiliation": {
    fr: "programme-affiliation",
    en: "affiliate-program",
    es: "programa-afiliacion",
    de: "partnerprogramm",
    ru: "partnerskaya-programma",
    pt: "programa-afiliacao",
    ch: "lianmeng-jihua",
    hi: "sahbaddh-karyakram",
    ar: "barnamaj-al-intisab",
  },
  "sondages-listing": {
    fr: "nos-sondages",
    en: "our-surveys",
    es: "nuestras-encuestas",
    de: "unsere-umfragen",
    ru: "nashi-oprosy",
    pt: "nossos-pesquisas",
    ch: "women-diaocha",
    hi: "hamare-sarvekshan",
    ar: "istiftaatuna",
  },
  "sondages": {
    fr: "sondages",
    en: "surveys",
    es: "encuestas",
    de: "umfragen",
    ru: "oprosy",
    pt: "pesquisas",
    ch: "diaocha",
    hi: "sarvekshan",
    ar: "istiftaat",
  },
  "resultats-sondages": {
    fr: "resultats-sondages",
    en: "surveys-results",
    es: "resultados-encuestas",
    de: "umfragen-ergebnisse",
    ru: "rezultaty-oprosov",
    pt: "resultados-pesquisas",
    ch: "diaocha-jieguo",
    hi: "sarvekshan-parinam",
    ar: "natayij-istiftaat",
  },
  "outils-listing": {
    fr: "nos-outils",
    en: "our-tools",
    es: "nuestras-herramientas",
    de: "unsere-werkzeuge",
    ru: "nashi-instrumenty",
    pt: "nossas-ferramentas",
    ch: "women-gongju",
    hi: "hamare-upakaran",
    ar: "adawatuna",
  },
  "outils": {
    fr: "outils",
    en: "tools",
    es: "herramientas",
    de: "werkzeuge",
    ru: "instrumenty",
    pt: "ferramentas",
    ch: "gongju",
    hi: "upakaran",
    ar: "adawat",
  },
  "galerie": {
    fr: "galerie",
    en: "gallery",
    es: "galeria",
    de: "galerie",
    ru: "gallery",
    pt: "galeria",
    ch: "gallery",
    hi: "gallery",
    ar: "gallery",
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

