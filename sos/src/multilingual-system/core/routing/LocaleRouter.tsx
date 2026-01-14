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

  // Invalid locale parameter - redirect to valid one
  if (localeParam && !isValidLocale(localeParam)) {
    const locale = getLocaleString(language);
    const { pathWithoutLocale } = parseLocaleFromPath(decodedPathname);
    return { redirectTo: `/${locale}${pathWithoutLocale}`, newLang: null };
  }

  // Path doesn't have locale prefix - add it
  if (!hasLocalePrefix(decodedPathname)) {
    const locale = getLocaleString(language);
    return { redirectTo: `/${locale}${decodedPathname}`, newLang: null };
  }

  // Path has locale prefix - check if language needs to sync or slug needs translation
  const { lang, pathWithoutLocale } = parseLocaleFromPath(decodedPathname);

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
