/**
 * useLocaleNavigate Hook
 * Provides locale-aware navigation that automatically adds locale prefix to paths
 *
 * P0 FIX: Enhanced with better edge case handling and development warnings
 **/

import { useNavigate as useRouterNavigate, useLocation, NavigateOptions } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { getLocaleString, parseLocaleFromPath, hasLocalePrefix } from "../core/routing/localeRoutes";
import { useMemo, useCallback } from "react";

// Development mode detection
const isDev = import.meta.env.DEV;

/**
 * P0 FIX: Validate and sanitize navigation paths
 */
function sanitizePath(path: string): string {
  // Remove any double slashes
  let sanitized = path.replace(/\/+/g, '/');

  // Ensure starts with /
  if (!sanitized.startsWith('/') && !sanitized.startsWith('#')) {
    sanitized = '/' + sanitized;
  }

  return sanitized;
}

export function useLocaleNavigate() {
  const navigate = useRouterNavigate();
  const location = useLocation();
  const { language } = useApp();

  // Get current locale from URL
  const currentLocale = useMemo(() => {
    const parsed = parseLocaleFromPath(location.pathname);
    return parsed.locale || getLocaleString(language);
  }, [location.pathname, language]);

  const localeNavigate = useCallback((path: string | number, options?: NavigateOptions) => {
    // DEBUG LOG: Track all navigation calls
    console.log('🟤 [useLocaleNavigate] CALLED with:', {
      path,
      options,
      currentLocale,
      currentPathname: location.pathname,
      timestamp: new Date().toISOString(),
    });

    // Handle numeric paths (go back/forward)
    if (typeof path === 'number') {
      console.log('🟤 [useLocaleNavigate] Numeric path, navigating by delta:', path);
      navigate(path);
      return;
    }

    // Skip empty paths
    if (!path) {
      console.warn('🟤 [useLocaleNavigate] Empty path provided, ignoring navigation');
      return;
    }

    // Sanitize the path
    const sanitizedPath = sanitizePath(path);
    console.log('🟤 [useLocaleNavigate] Sanitized path:', sanitizedPath);

    // Skip locale for admin routes
    if (sanitizedPath.startsWith("/admin")) {
      console.log('🟤 [useLocaleNavigate] Admin route, navigating without locale:', sanitizedPath);
      navigate(sanitizedPath, options);
      return;
    }

    // Skip locale for marketing routes
    if (sanitizedPath.startsWith("/marketing")) {
      console.log('🟤 [useLocaleNavigate] Marketing route, navigating without locale:', sanitizedPath);
      navigate(sanitizedPath, options);
      return;
    }

    // Handle hash-only navigation (e.g., "#section")
    if (sanitizedPath.startsWith('#')) {
      console.log('🟤 [useLocaleNavigate] Hash-only navigation:', sanitizedPath);
      navigate(sanitizedPath, options);
      return;
    }

    // Extract path and query string separately
    const hashIndex = sanitizedPath.indexOf('#');
    const queryIndex = sanitizedPath.indexOf('?');

    let basePath = sanitizedPath;
    let query = '';
    let hash = '';

    if (hashIndex !== -1 && (queryIndex === -1 || hashIndex < queryIndex)) {
      // Hash before query or no query
      basePath = sanitizedPath.substring(0, hashIndex);
      const rest = sanitizedPath.substring(hashIndex);
      const restQueryIndex = rest.indexOf('?');
      if (restQueryIndex !== -1) {
        hash = rest.substring(0, restQueryIndex);
        query = rest.substring(restQueryIndex);
      } else {
        hash = rest;
      }
    } else if (queryIndex !== -1) {
      basePath = sanitizedPath.substring(0, queryIndex);
      const rest = sanitizedPath.substring(queryIndex);
      const restHashIndex = rest.indexOf('#');
      if (restHashIndex !== -1) {
        query = rest.substring(0, restHashIndex);
        hash = rest.substring(restHashIndex);
      } else {
        query = rest;
      }
    }

    // If path already has locale prefix, use as-is
    if (hasLocalePrefix(basePath)) {
      const finalPath = `${basePath}${query}${hash}`;
      console.log('🟤 [useLocaleNavigate] Path already has locale, navigating as-is:', finalPath);
      navigate(finalPath, options);
      return;
    }

    // P0 FIX: Development warning for paths that should have locale but don't
    if (isDev && basePath !== '/' && !basePath.startsWith('/admin') && !basePath.startsWith('/marketing')) {
      // This is fine - we're about to add the locale prefix
    }

    // Add locale prefix and preserve query params and hash
    const localePath = `/${currentLocale}${basePath.startsWith("/") ? basePath : `/${basePath}`}${query}${hash}`;
    console.log('🟤 [useLocaleNavigate] FINAL NAVIGATION:', {
      originalPath: path,
      localePath,
      locale: currentLocale,
      timestamp: new Date().toISOString(),
    });
    navigate(localePath, options);
    console.log('🟤 [useLocaleNavigate] navigate() called, new pathname should be:', localePath);
  }, [navigate, currentLocale, location.pathname]);

  return localeNavigate;
}

/**
 * P0 FIX: Hook to get current locale from URL
 * Useful for building localized links
 */
export function useCurrentLocale(): string {
  const location = useLocation();
  const { language } = useApp();

  return useMemo(() => {
    const parsed = parseLocaleFromPath(location.pathname);
    return parsed.locale || getLocaleString(language);
  }, [location.pathname, language]);
}

/**
 * P0 FIX: Helper to build localized paths without navigation
 * Useful for <a href> or <Link to>
 */
export function useLocalePath() {
  const currentLocale = useCurrentLocale();

  return useCallback((path: string): string => {
    if (!path) return `/${currentLocale}`;

    const sanitizedPath = sanitizePath(path);

    // Skip locale for admin/marketing routes
    if (sanitizedPath.startsWith("/admin") || sanitizedPath.startsWith("/marketing")) {
      return sanitizedPath;
    }

    // Already has locale
    if (hasLocalePrefix(sanitizedPath)) {
      return sanitizedPath;
    }

    return `/${currentLocale}${sanitizedPath.startsWith("/") ? sanitizedPath : `/${sanitizedPath}`}`;
  }, [currentLocale]);
}

