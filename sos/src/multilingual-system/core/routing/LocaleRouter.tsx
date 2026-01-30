/**
 * LocaleRouter Component
 * Handles automatic locale prefix management and redirects
 *
 * P0 FIX: Uses synchronous validation to prevent 404 flash during navigation
 * The validation happens BEFORE rendering children, not in useEffect
 */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { useApp } from "../../../contexts/AppContext";
import {
  parseLocaleFromPath,
  getLocaleString,
  hasLocalePrefix,
  hasLegacyLocalePrefix,
  parseLegacyLocaleFromPath,
  isValidLocale,
  getRouteKeyFromSlug,
  getTranslatedRouteSlug,
  findChildRouteBySegment,
} from "./localeRoutes";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

interface LocaleRouterProps {
  children: React.ReactNode;
}

type Language = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

/**
 * P0 FIX: Synchronous validation function
 * Returns redirect path if needed, null if path is valid
 */
function computeRedirectPath(
  pathname: string,
  language: Language,
  localeParam?: string
): { redirectTo: string | null; newLang: Language | null } {
  // P0 DEBUG: Log all inputs for debugging routing issues
  console.log("🔷 [LocaleRouter] computeRedirectPath called:", {
    pathname,
    language,
    localeParam,
    timestamp: new Date().toISOString(),
  });

  // Decode URL to handle Unicode characters
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    decodedPathname = pathname;
  }

  // Skip locale handling for admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/marketing")) {
    console.log("🔷 [LocaleRouter] Skipping admin/marketing route");
    return { redirectTo: null, newLang: null };
  }

  // Root path - redirect to default locale
  if (decodedPathname === "/") {
    const locale = getLocaleString(language);
    return { redirectTo: `/${locale}`, newLang: null };
  }

  // LEGACY URL SUPPORT: Handle old URLs like /es/cookies, /zh/appel-expatrie
  // These were indexed by Google before the lang-country format was introduced
  if (hasLegacyLocalePrefix(decodedPathname)) {
    const legacyResult = parseLegacyLocaleFromPath(decodedPathname);
    if (legacyResult.shouldRedirect && legacyResult.newPath) {
      console.log("🔷 [LocaleRouter] Redirecting legacy URL:", {
        from: decodedPathname,
        to: legacyResult.newPath,
        detectedLang: legacyResult.detectedLang,
      });
      return { redirectTo: legacyResult.newPath, newLang: legacyResult.detectedLang };
    }
  }

  // Invalid locale parameter - redirect to valid one
  if (localeParam && !isValidLocale(localeParam)) {
    const locale = getLocaleString(language);
    const { pathWithoutLocale } = parseLocaleFromPath(decodedPathname);
    return { redirectTo: `/${locale}${pathWithoutLocale}`, newLang: null };
  }

  // FIX: Redirect invalid locale combinations (e.g., es-us -> es-es)
  // These can occur when geolocation produces unusual lang-country combos
  const invalidLocaleCombinations: Record<string, string> = {
    'es-us': 'es-es',  // Spanish should use Spain, not US
    'de-us': 'de-de',  // German should use Germany
    'ru-us': 'ru-ru',  // Russian should use Russia
    'pt-us': 'pt-pt',  // Portuguese should use Portugal
    'ar-us': 'ar-sa',  // Arabic should use Saudi Arabia
    'hi-us': 'hi-in',  // Hindi should use India
  };
  if (localeParam && invalidLocaleCombinations[localeParam]) {
    const correctLocale = invalidLocaleCombinations[localeParam];
    const { pathWithoutLocale } = parseLocaleFromPath(decodedPathname);
    console.log("🔷 [LocaleRouter] Redirecting invalid locale combo:", localeParam, "->", correctLocale);
    return { redirectTo: `/${correctLocale}${pathWithoutLocale}`, newLang: null };
  }

  // Path doesn't have locale prefix - add it
  if (!hasLocalePrefix(decodedPathname)) {
    const locale = getLocaleString(language);
    return { redirectTo: `/${locale}${decodedPathname}`, newLang: null };
  }

  // Path has locale prefix - check if language needs to sync or slug needs translation
  const { lang, pathWithoutLocale } = parseLocaleFromPath(decodedPathname);

  // MALFORMED URL FIX: Detect paths with DOUBLE locale prefixes like /ch-dj/en/lawyer-dj/...
  // These are malformed URLs where locale is followed by another language prefix
  if (pathWithoutLocale && pathWithoutLocale.length > 1) {
    const pathAfterLocale = pathWithoutLocale.startsWith('/') ? pathWithoutLocale.slice(1) : pathWithoutLocale;
    const firstSegment = pathAfterLocale.split('/')[0];

    // Check if first segment after locale is a legacy language prefix (2 lowercase letters)
    if (firstSegment && /^[a-z]{2}$/.test(firstSegment)) {
      // This looks like /xx-yy/zz/... where zz might be a language code
      const potentialLangCodes = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'zh', 'hi', 'ar'];
      if (potentialLangCodes.includes(firstSegment)) {
        console.log("🔷 [LocaleRouter] Detected MALFORMED double-locale URL:", {
          pathname: decodedPathname,
          firstLocale: localeParam,
          secondLang: firstSegment,
        });
        // Extract the rest of the path after the second language code
        const restOfPath = pathAfterLocale.split('/').slice(1).join('/');
        const correctLocale = getLocaleString(language);
        const redirectPath = `/${correctLocale}${restOfPath ? '/' + restOfPath : ''}`;
        return { redirectTo: redirectPath, newLang: null };
      }
    }
  }

  // Sync URL locale with app language
  if (lang && lang !== language) {
    return { redirectTo: null, newLang: lang as Language };
  }

  // Check if slug needs translation to current language
  if (pathWithoutLocale && pathWithoutLocale !== "/" && lang) {
    const pathSegments = pathWithoutLocale.split("/").filter(Boolean);
    if (pathSegments.length > 0) {
      let routeKey = null;
      let matchedSegments = 0;
      let matchedPath = "";

      // Try matching 3 segments first
      if (pathSegments.length >= 3) {
        const threeSegmentPath = `${pathSegments[0]}/${pathSegments[1]}/${pathSegments[2]}`;
        routeKey = getRouteKeyFromSlug(threeSegmentPath);
        if (routeKey) {
          matchedSegments = 3;
          matchedPath = threeSegmentPath;
        }
      }

      // Try matching 2 segments
      if (!routeKey && pathSegments.length >= 2) {
        const twoSegmentPath = `${pathSegments[0]}/${pathSegments[1]}`;
        routeKey = getRouteKeyFromSlug(twoSegmentPath);
        if (routeKey) {
          matchedSegments = 2;
          matchedPath = twoSegmentPath;
        }
      }

      // Try matching 1 segment
      if (!routeKey) {
        const firstSegment = pathSegments[0];
        routeKey = getRouteKeyFromSlug(firstSegment);
        if (routeKey) {
          matchedSegments = 1;
          matchedPath = firstSegment;
        }
      }

      // If route found, check if it needs translation
      if (routeKey) {
        const correctSlug = getTranslatedRouteSlug(routeKey, lang as Language);
        let restOfPath = pathSegments.slice(matchedSegments).join("/");

        // Try to translate remaining segment
        if (restOfPath && matchedSegments < 3) {
          const childRouteKey = findChildRouteBySegment(routeKey, restOfPath);
          if (childRouteKey) {
            const correctChildSlug = getTranslatedRouteSlug(childRouteKey, lang as Language);
            if (`${matchedPath}/${restOfPath}` !== correctChildSlug) {
              return { redirectTo: `/${getLocaleString(lang as Language)}/${correctChildSlug}`, newLang: null };
            }
            restOfPath = "";
          }
        }

        // Redirect if slug doesn't match current language
        if (matchedPath !== correctSlug) {
          const newPath = `/${getLocaleString(lang as Language)}/${correctSlug}${restOfPath ? `/${restOfPath}` : ""}`;
          return { redirectTo: newPath, newLang: null };
        }
      }
    }
  }

  // Path is valid, no redirect needed
  console.log("🔷 [LocaleRouter] Path is valid, no redirect needed:", decodedPathname);
  return { redirectTo: null, newLang: null };
}

const LocaleRouter: React.FC<LocaleRouterProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useApp();
  const params = useParams<{ locale?: string }>();

  // Track if initial render has completed
  const [hasInitialized, setHasInitialized] = useState(false);
  const pendingLanguageSync = useRef<Language | null>(null);

  // P0 FIX: Compute redirect SYNCHRONOUSLY during render
  // This prevents the 404 flash because we redirect BEFORE rendering children
  const { redirectTo, newLang } = useMemo(() => {
    return computeRedirectPath(location.pathname, language, params.locale);
  }, [location.pathname, language, params.locale]);

  // Handle language sync in useEffect (can't call setState during render)
  useEffect(() => {
    if (newLang && newLang !== language) {
      pendingLanguageSync.current = newLang;
      setLanguage(newLang);
    }
  }, [newLang, language, setLanguage]);

  // Mark as initialized after first successful render
  useEffect(() => {
    if (!hasInitialized && !redirectTo) {
      setHasInitialized(true);
    }
  }, [hasInitialized, redirectTo]);

  // P0 FIX: If redirect is needed, render Navigate component INSTEAD of children
  // This is SYNCHRONOUS - no flash of 404
  if (redirectTo) {
    console.log("🔷 [LocaleRouter] REDIRECTING to:", redirectTo, "from:", location.pathname);
    // Use Navigate component for synchronous redirect
    return <Navigate to={redirectTo} replace />;
  }

  // During language sync, show loading briefly to prevent flash
  if (newLang && newLang !== language) {
    return <LoadingSpinner size="large" color="red" />;
  }

  return <>{children}</>;
};

export default LocaleRouter;
