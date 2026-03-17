// src/components/analytics/InternationalTracker.tsx
// Sets GA4 user properties (locale, language, continent) and content_group
// on every route change. Mounted in App.tsx alongside PageViewTracker.

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { setUserProperties } from '../../utils/ga4';

// Map country code → continent
const CONTINENT_MAP: Record<string, string> = {
  // Europe
  fr: 'EU', de: 'EU', es: 'EU', pt: 'EU', gb: 'EU', it: 'EU', nl: 'EU',
  be: 'EU', ch: 'EU', at: 'EU', se: 'EU', no: 'EU', dk: 'EU', fi: 'EU',
  ie: 'EU', pl: 'EU', cz: 'EU', ro: 'EU', hu: 'EU', gr: 'EU', bg: 'EU',
  hr: 'EU', sk: 'EU', si: 'EU', lt: 'EU', lv: 'EU', ee: 'EU', cy: 'EU',
  mt: 'EU', lu: 'EU', ru: 'EU', ua: 'EU', by: 'EU',
  // North America
  us: 'NA', ca: 'NA', mx: 'NA',
  // South America
  br: 'SA', ar: 'SA', co: 'SA', cl: 'SA', pe: 'SA', ve: 'SA', ec: 'SA',
  uy: 'SA', py: 'SA', bo: 'SA',
  // Asia
  cn: 'AS', jp: 'AS', kr: 'AS', in: 'AS', th: 'AS', vn: 'AS', ph: 'AS',
  id: 'AS', my: 'AS', sg: 'AS', tw: 'AS', hk: 'AS', sa: 'AS', ae: 'AS',
  il: 'AS', lb: 'AS', kz: 'AS', pk: 'AS', bd: 'AS',
  // Africa
  eg: 'AF', za: 'AF', ng: 'AF', ke: 'AF', ma: 'AF', dz: 'AF', tn: 'AF',
  sn: 'AF', ci: 'AF', gh: 'AF', cm: 'AF', et: 'AF', tz: 'AF',
  // Oceania
  au: 'OC', nz: 'OC',
};

/**
 * Extract locale from URL path: /fr-fr/... → { lang: 'fr', country: 'fr', locale: 'fr-fr' }
 */
function extractLocale(pathname: string): { lang: string; country: string; locale: string } | null {
  const match = pathname.match(/^\/([\w]{2})-([\w]{2})/);
  if (!match) return null;
  return { lang: match[1], country: match[2], locale: `${match[1]}-${match[2]}` };
}

/**
 * Detect content group from URL path for GA4 content grouping.
 */
function detectContentGroup(pathname: string): string {
  // Remove locale prefix for matching
  const path = pathname.replace(/^\/[\w]{2}-[\w]{2}/, '');

  if (!path || path === '/') return 'homepage';
  if (/\/(avocat-|lawyer-|expat-)/.test(path) || /\/profile\//.test(path)) return 'provider_profile';
  if (/\/(tarifs|pricing)/.test(path)) return 'pricing';
  if (/\/faq/.test(path)) return 'faq';
  if (/\/(centre-aide|help-center|help)/.test(path)) return 'help_center';
  if (/\/(inscription|register)/.test(path)) return 'registration';
  if (/\/contact/.test(path)) return 'contact';
  if (/\/(devenir-|become-)/.test(path)) return 'landing_affiliate';
  if (/\/blog/.test(path)) return 'blog';
  if (/\/(cgu|terms|privacy|cookies|mentions)/.test(path)) return 'legal';
  if (/\/(sos-call|booking|checkout)/.test(path)) return 'booking';
  if (/\/admin/.test(path)) return 'admin';
  if (/\/(chatter|influencer|blogger|group-admin)/.test(path)) return 'affiliate_dashboard';
  return 'other';
}

const InternationalTracker: React.FC = () => {
  const location = useLocation();
  const lastLocale = useRef<string>('');

  useEffect(() => {
    const parsed = extractLocale(location.pathname);
    if (!parsed) return;

    const { lang, country, locale } = parsed;
    const continent = CONTINENT_MAP[country] || 'OTHER';
    const contentGroup = detectContentGroup(location.pathname);

    // Only update user properties when locale changes (not on every page)
    if (locale !== lastLocale.current) {
      lastLocale.current = locale;
      setUserProperties({
        user_locale: locale,
        user_language: lang,
        user_country_site: country,
        user_continent: continent,
      });
    }

    // Set content_group as a global parameter for all subsequent events
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', { content_group: contentGroup });
    }
  }, [location.pathname]);

  return null;
};

export default InternationalTracker;
