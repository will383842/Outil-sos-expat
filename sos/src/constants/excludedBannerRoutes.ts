// src/constants/excludedBannerRoutes.ts

/**
 * Routes where Cookie Banner and PWA Install Banner should NOT be shown.
 * These are pages in the booking/reservation workflow where banners would
 * interrupt the user experience.
 *
 * Includes all translated versions of each route for full i18n support.
 */

/**
 * Route patterns to exclude from showing banners.
 * The patterns are checked against the pathname (without locale prefix).
 *
 * IMPORTANT: Each route includes ALL translations (fr, en, es, de, ru, pt, ch, hi, ar)
 */
export const EXCLUDED_BANNER_ROUTE_PATTERNS: string[] = [
  // === SOS CALL / EMERGENCY CALL PAGES (all translations) ===
  '/sos-appel',           // fr
  '/emergency-call',      // en
  '/llamada-emergencia',  // es
  '/notruf',              // de
  '/ekstrenniy-zvonok',   // ru
  '/chamada-emergencia',  // pt
  '/jinji-dianhua',       // ch
  '/aapatkaalin-call',    // hi
  '/مكالمة-طوارئ',        // ar

  // === EXPAT CALL PAGES (all translations) ===
  '/appel-expatrie',      // fr
  '/expat-call',          // en
  '/llamada-expatriado',  // es
  '/expatriate-anruf',    // de
  '/zvonok-expatriantu',  // ru
  '/chamada-expatriado',  // pt
  '/waipai-dianhua',      // ch
  '/pravasi-call',        // hi
  '/مكالمة-المغترب',      // ar

  // === PROVIDER PROFILES (all translations + wildcard patterns) ===
  // French
  '/provider/',
  '/avocat/',
  '/expatrie/',
  // English
  '/lawyers/',
  '/expats/',
  // Spanish
  '/abogados/',
  '/expatriados/',
  // German
  '/anwaelte/',
  '/expatriates/',
  // Russian
  '/advokaty/',
  '/expatrianty/',
  // Portuguese
  '/advogados/',
  // Chinese
  '/lushi/',
  '/waipai/',
  // Hindi
  '/vakil/',
  '/pravasi/',
  // Arabic
  '/محامون/',
  '/مغتربون/',

  // === PROVIDERS LIST (all translations) ===
  '/providers',           // en
  '/prestataires',        // fr
  '/nos-experts',         // fr alias
  '/proveedores',         // es
  '/anbieter',            // de
  '/postavshchiki',       // ru
  '/prestadores',         // pt
  '/fuwu-tigongzhe',      // ch
  '/seva-pradaata',       // hi
  '/مقدمي-الخدمات',       // ar

  // === CALL CHECKOUT / PAYMENT PAGES (all translations) ===
  '/call-checkout',       // en
  '/paiement-appel',      // fr
  '/pago-llamada',        // es
  '/anruf-kasse',         // de
  '/oplata-zvonka',       // ru
  '/pagamento-chamada',   // pt
  '/tonghua-jiesuan',     // ch
  '/call-bhugtaan',       // hi
  '/الدفع-المكالمة',      // ar

  // === BOOKING REQUEST PAGES (all translations) ===
  '/booking-request',         // en
  '/demande-reservation',     // fr
  '/solicitud-reserva',       // es
  '/buchungsanfrage',         // de
  '/zayavka-na-bronirovanie', // ru
  '/solicitacao-reserva',     // pt
  '/yuding-qingqiu',          // ch
  '/booking-anurodh',         // hi
  '/طلب-الحجز',               // ar

  // === PAYMENT SUCCESS PAGES (all translations) ===
  '/payment-success',     // en
  '/paiement-reussi',     // fr
  '/pago-exitoso',        // es
  '/zahlung-erfolgreich', // de
  '/oplata-uspeshna',     // ru
  '/pagamento-sucesso',   // pt
  '/zhifu-chenggong',     // ch
  '/bhugtaan-safal',      // hi
  '/الدفع-نجح',           // ar

  // === DASHBOARD MESSAGES (nested routes - all translations) ===
  '/dashboard/messages',
  '/tableau-de-bord/messages',
  '/panel/mensajes',
  '/dashboard/nachrichten',
  '/panel-upravleniya/soobshcheniya',
  '/painel/mensagens',
  '/kongzhi-mianban/xiaoxi',
  '/dashboard/sandesh',
  '/لوحة-التحكم/الرسائل',
];

/**
 * Locale prefixes used in the application.
 * Routes can be prefixed with these patterns: /fr-fr/, /en-us/, etc.
 */
const LOCALE_PREFIX_PATTERN = /^\/[a-z]{2}(-[a-z]{2})?\//i;

/**
 * Pattern for provider profile routes with lang-locale prefix.
 * Matches: /fr-fr/avocat-thailande/julien-visa-k7m2p9
 *          /en-us/lawyer-thailand/john-visa-abc123
 *          /es-es/abogados-espana/juan-visa-xyz789
 *
 * Supports all provider type translations with optional country suffix
 */
const PROVIDER_PROFILE_LANG_LOCALE_PATTERN = /^\/[a-z]{2}-[a-z]{2}\/(avocat|lawyer|lawyers|expatrie|expat|expats|abogados?|expatriados?|anwaelte?|expatriates?|advokaty?|expatrianty?|advogados?|lushi|waipai|vakil|pravasi|محام|مغترب)([-_][a-z]+)?\//i;

/**
 * Check if a pathname should have banners hidden.
 *
 * @param pathname - The current pathname (e.g., '/fr-fr/sos-appel' or '/provider/123')
 * @returns true if banners should be hidden on this route
 */
export function shouldHideBannersOnRoute(pathname: string): boolean {
  if (!pathname) return false;

  // Normalize pathname (remove trailing slash except for root)
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  // Check for provider profile routes with lang-locale prefix
  // e.g., /fr-fr/avocat-thailande/julien-visa-k7m2p9
  if (PROVIDER_PROFILE_LANG_LOCALE_PATTERN.test(normalizedPath)) {
    return true;
  }

  // Remove locale prefix if present to check against patterns
  // e.g., /fr-fr/sos-appel -> /sos-appel
  const pathWithoutLocale = normalizedPath.replace(LOCALE_PREFIX_PATTERN, '/');

  // Check against excluded patterns
  for (const pattern of EXCLUDED_BANNER_ROUTE_PATTERNS) {
    // For URL-encoded Arabic patterns, try both encoded and decoded versions
    let normalizedPattern = pattern;

    // Exact match
    if (pathWithoutLocale === normalizedPattern) {
      return true;
    }

    // Prefix match for patterns ending with / (e.g., '/provider/')
    if (normalizedPattern.endsWith('/') && pathWithoutLocale.startsWith(normalizedPattern)) {
      return true;
    }

    // Prefix match for patterns that match the start of path
    if (!normalizedPattern.endsWith('/') && pathWithoutLocale.startsWith(normalizedPattern + '/')) {
      return true;
    }

    // Also check the original path (with locale) against the pattern
    if (normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern + '/')) {
      return true;
    }

    // Check if path without locale matches pattern without leading slash
    const patternWithoutSlash = normalizedPattern.slice(1);
    if (pathWithoutLocale === '/' + patternWithoutSlash) {
      return true;
    }
  }

  // Additional check for any 3-segment provider profile URL
  // Format: /:langLocale/:roleCountry/:nameSlug
  // e.g., /fr-fr/avocat-thailande/julien-visa-k7m2p9
  const threeSegmentPattern = /^\/[a-z]{2}-[a-z]{2}\/[^/]+\/[^/]+$/i;
  if (threeSegmentPattern.test(normalizedPath)) {
    // Check if the second segment looks like a provider type
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const roleCountry = segments[1].toLowerCase();
      const providerTypes = [
        'avocat', 'lawyer', 'lawyers', 'expatrie', 'expat', 'expats',
        'abogado', 'abogados', 'expatriado', 'expatriados',
        'anwalt', 'anwaelte', 'expatriate', 'expatriates',
        'advokat', 'advokaty', 'expatriant', 'expatrianty',
        'advogado', 'advogados',
        'lushi', 'waipai', 'vakil', 'pravasi'
      ];

      for (const type of providerTypes) {
        if (roleCountry.startsWith(type + '-') || roleCountry === type) {
          return true;
        }
      }
    }
  }

  return false;
}
