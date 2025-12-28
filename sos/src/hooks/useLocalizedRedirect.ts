// src/hooks/useLocalizedRedirect.ts
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useCallback } from 'react';

export function useLocalizedRedirect() {
  const navigate = useNavigate();
  const intl = useIntl();
  const lang = intl.locale || 'fr';

  const redirect = useCallback((path: string) => {
    const localizedPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
    navigate(localizedPath);
  }, [navigate, lang]);

  const redirectToSosCall = useCallback((type: 'expat' | 'lawyer' | string) => {
    navigate(`/${lang}/sos-appel?type=${type}`);
  }, [navigate, lang]);

  return { redirect, redirectToSosCall, lang };
}