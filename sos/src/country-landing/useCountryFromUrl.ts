/**
 * Hook: useCountryFromUrl
 *
 * Parses the country code from the URL locale prefix.
 * Example: /fr-sn/devenir-chatter → { countryCode: "SN", lang: "fr" }
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { parseLocaleFromPath } from '@/utils/localeRoutes';

interface CountryFromUrl {
  countryCode: string | null;  // Uppercase, e.g. "SN"
  lang: string | null;         // Lowercase, e.g. "fr"
}

export function useCountryFromUrl(): CountryFromUrl {
  const location = useLocation();

  return useMemo(() => {
    const parsed = parseLocaleFromPath(location.pathname);
    return {
      countryCode: parsed.country ? parsed.country.toUpperCase() : null,
      lang: parsed.lang,
    };
  }, [location.pathname]);
}
