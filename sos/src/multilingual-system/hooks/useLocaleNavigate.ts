/**
 * useLocaleNavigate Hook
 * Provides locale-aware navigation that automatically adds locale prefix to paths
 **/

import { useNavigate as useRouterNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { getLocaleString, parseLocaleFromPath } from "../core/routing/localeRoutes";
import { useMemo } from "react";

export function useLocaleNavigate() {
  const navigate = useRouterNavigate();
  const location = useLocation();
  const { language } = useApp();
  
  // Get current locale from URL
  const currentLocale = useMemo(() => {

    const parsed = parseLocaleFromPath(location.pathname);
    return parsed.locale || getLocaleString(language);
  }, [location.pathname, language]);

  const localeNavigate = (path: string, options?: any) => {
    // Skip locale for admin routes
    if (path.startsWith("/admin")) {
      navigate(path, options);
      return;
    }

    // Extract path and query string separately
    const [pathWithoutQuery, queryString] = path.split('?');
    const query = queryString ? `?${queryString}` : '';

    // If path already has locale, use as-is (with query params)
    if (/^\/[a-z]{2}-[a-z]{2}\//.test(pathWithoutQuery)) {
      navigate(`${pathWithoutQuery}${query}`, options);
      return;
    }

    // Add locale prefix and preserve query params
    const localePath = `/${currentLocale}${pathWithoutQuery.startsWith("/") ? pathWithoutQuery : `/${pathWithoutQuery}`}${query}`;
    navigate(localePath, options);
  };

  return localeNavigate;
}

