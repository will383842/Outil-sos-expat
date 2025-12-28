/**
 * LocaleRouter Component
 * Handles automatic locale prefix management and redirects
 */
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

const LocaleRouter: React.FC<LocaleRouterProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useApp();
  const params = useParams<{ locale?: string }>();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    setIsValidating(true);
    const { pathname } = location;

    // CRITICAL: Decode URL to handle Unicode characters (Hindi, Chinese, Arabic, Russian)
    let decodedPathname: string;
    try {
      decodedPathname = decodeURIComponent(pathname);
    } catch (e) {
      decodedPathname = pathname;
    }

    // Skip locale handling for admin routes, marketing routes, and payment-success
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/marketing") ||
      pathname.startsWith("/payment-success")
    ) {
      setIsValidating(false);
      return;
    }

    // Validate locale parameter if present
    // Now accepts any valid language-country combination (e.g., es-fr, de-be, fr-ca)
    if (params.locale) {
      if (!isValidLocale(params.locale)) {
        // Invalid locale - redirect to valid one
        const locale = getLocaleString(language);
        const { pathWithoutLocale } = parseLocaleFromPath(decodedPathname);
        navigate(`/${locale}${pathWithoutLocale}`, { replace: true });
        return;
      }
    }

    // If path doesn't have locale prefix and is not root, redirect to add it
    if (!hasLocalePrefix(decodedPathname) && decodedPathname !== "/") {
      const locale = getLocaleString(language);
      navigate(`/${locale}${decodedPathname}`, { replace: true });
      return;
    }

    // If path has locale prefix, extract and update language
    if (hasLocalePrefix(decodedPathname)) {
      const { lang, pathWithoutLocale } = parseLocaleFromPath(decodedPathname);

      // Sync URL locale with app language
      // CRITICAL FIX: Return early after setting language to prevent race condition
      // The next useEffect run will handle slug translation after language state updates
      if (lang && lang !== language) {
        setLanguage(lang as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar");
        // Don't set isValidating to false here - let the next render handle it
        return;
      }

      // Check if the path contains slugs that should be translated to current language
      if (pathWithoutLocale && pathWithoutLocale !== "/") {
        const pathSegments = pathWithoutLocale.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          let routeKey = null;
          let matchedSegments = 0;
          let matchedPath = "";

          // Try matching 3 segments first (e.g., "tableau-de-bord/abonnement/plans")
          if (pathSegments.length >= 3) {
            const threeSegmentPath = `${pathSegments[0]}/${pathSegments[1]}/${pathSegments[2]}`;
            routeKey = getRouteKeyFromSlug(threeSegmentPath);
            if (routeKey) {
              matchedSegments = 3;
              matchedPath = threeSegmentPath;
            }
          }

          // Try matching 2 segments (e.g., "register/client")
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

          // If route found, check if it matches current language and redirect if needed
          if (routeKey && lang) {
            const correctSlug = getTranslatedRouteSlug(routeKey, lang);
            let restOfPath = pathSegments.slice(matchedSegments).join("/");

            // If there's a remaining segment, try to translate it too
            if (restOfPath && matchedSegments < 3) {
              const childRouteKey = findChildRouteBySegment(routeKey, restOfPath);
              if (childRouteKey) {
                // Found a child route - use its full translation
                const correctChildSlug = getTranslatedRouteSlug(childRouteKey, lang);
                if (`${matchedPath}/${restOfPath}` !== correctChildSlug) {
                  const newPath = `/${getLocaleString(lang)}/${correctChildSlug}`;
                  navigate(newPath, { replace: true });
                  return;
                }
                restOfPath = ""; // Child route handled the rest
              }
            }

            // Redirect if slug doesn't match current language
            if (matchedPath !== correctSlug) {
              const newPath = `/${getLocaleString(lang)}/${correctSlug}${restOfPath ? `/${restOfPath}` : ""}`;
              navigate(newPath, { replace: true });
              return;
            }
          }
        }
      }
    } else if (decodedPathname === "/") {
      // Root path - redirect to default locale
      const locale = getLocaleString(language);
      navigate(`/${locale}`, { replace: true });
      return;
    }

    // Validation complete
    setIsValidating(false);
  }, [location.pathname, language, navigate, setLanguage, params.locale]);

  if (isValidating) {
    return <LoadingSpinner size="large" color="red" />;
  }

  return <>{children}</>;
};

export default LocaleRouter;
