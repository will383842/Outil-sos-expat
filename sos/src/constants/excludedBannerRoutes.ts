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
  // ⚠️ 2026-03-18: REMOVED homepage, SOS call, expat call, provider profiles, providers list
  // The Cookie Banner MUST appear on ALL public pages for GDPR consent + GA4 tracking.
  // Without it, analytics_storage stays 'denied' and GA4 collects ZERO data.
  // Only hide on checkout/payment/booking workflow pages (user is mid-transaction).

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

  // 2026-03-18: Homepage and provider profiles NO LONGER excluded.
  // Cookie banner must appear everywhere for GDPR consent + GA4 tracking.

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

  // 2026-03-18: Removed 3-segment provider profile check.
  // Banner must appear on provider profiles for consent.

  return false;
}
