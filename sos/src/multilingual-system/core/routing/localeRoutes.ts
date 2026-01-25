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
 * Generate locale string (e.g., "en-us", "fr-fr")
 * Uses geolocation country when available, falls back to language default
 */
export function getLocaleString(lang: Language, country?: string): string {
  // If country is explicitly provided, use it
  if (country) {
    return `${lang}-${country.toLowerCase()}`;
  }

  // Try to get country from geolocation
  const geoCountry = getCountryFromGeolocation();
  if (geoCountry) {
    return `${lang}-${geoCountry}`;
  }

  // Fallback to language-to-country mapping
  const countryCode = LANGUAGE_TO_COUNTRY[lang];
  return `${lang}-${countryCode}`;
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
 * Check if a locale is valid (language code must be supported, country can be any)
 * Accepts: fr-fr, fr-be, fr-ca, es-es, es-fr, es-mx, etc.
 */
export function isValidLocale(locale: string): boolean {
  const match = locale.match(/^([a-z]{2})-([a-z]{2})$/);
  if (!match) return false;

  const lang = match[1] as Language;
  return getSupportedLanguages().includes(lang);
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
 * Converts /es/cookies -> /es-es/cookies, /zh/page -> /ch-cn/page
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
  | "register-lawyer"  // /register/lawyer -> /register/avocat, /register/anwalt, etc.
  | "register-expat"   // /register/expat -> /register/expatrie, etc.
  | "register-client"  // /register/client -> /register/client, /inscription/client, etc.
  | "terms-lawyers"    // /terms-lawyers -> /cgu-avocats, etc.
  | "terms-expats"     // /terms-expats -> /cgu-expatries, etc.
  | "terms-clients"    // /terms-clients -> /cgu-clients, etc.
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
  | "password-reset";     // /password-reset -> /reinitialisation-mot-de-passe, etc.

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

