import React from "react";
import { Helmet } from "react-helmet-async";
import { SUPPORTED_LANGUAGES, localeToPrefix } from "./HrefLangConstants";
import { getRouteKeyFromSlug, getTranslatedRouteSlug } from "../../core/routing";

interface Props {
  pathname: string;
}

const HreflangLinks: React.FC<Props> = ({ pathname }) => {
  // Use the pathname as provided (do not strip locale). Ensure it starts with '/'
  const normalizedPath = pathname && pathname.startsWith("/") ? pathname : `/${pathname || ""}`;

  // Prefer window.location.origin when available; fallback to canonical domain without trailing slash
  const windowBaseDomain = typeof window !== "undefined" && window.location ? window.location.origin : undefined;
  const baseDomain = windowBaseDomain || "https://sos-expat.com";

  // Split into segments to detect a leading locale segment like 'fr-fr' or 'fr'
  const segments = normalizedPath.split("/").filter(Boolean);
  const firstSeg = segments.length ? segments[0] : null;
  const localePattern = /^[a-z]{2}(?:-[a-z]{2})?$/i;
  const hasLocaleSegment = firstSeg ? localePattern.test(firstSeg) : false;
  const incomingCountry = hasLocaleSegment && firstSeg!.includes("-") ? firstSeg!.split("-")[1].toLowerCase() : undefined;

  // Determine the slice of segments that represent the 'route slug' (e.g., 'sos-appel' or 'tableau-de-bord/messages')
  const restSegments = hasLocaleSegment ? segments.slice(1) : segments;
  const restPath = restSegments.join("/");

  // Try to detect a route key by checking the full restPath first, then the first segment
  let matchedRouteKey = null as null | string;
  let matchedCount = 0;
  if (restPath) {
    const fullKey = getRouteKeyFromSlug(restPath);
    if (fullKey) {
      matchedRouteKey = fullKey as string;
      matchedCount = restSegments.length;
    }
  }
  if (!matchedRouteKey && restSegments.length) {
    const firstKey = getRouteKeyFromSlug(restSegments[0]);
    if (firstKey) {
      matchedRouteKey = firstKey as string;
      matchedCount = 1;
    }
  }

  return (
    <Helmet>
      {SUPPORTED_LANGUAGES.map((loc) => {
        const prefix = localeToPrefix[loc];

        // If the incoming path already has a locale segment, replace it with the target prefix.
        // Preserve the incoming country subtag when present: e.g. incoming 'fr-fr' and target 'es' => 'es-fr'
        const targetSeg = incomingCountry ? `${prefix}-${incomingCountry}` : prefix;

        // If we matched a known route key, replace the matched slug with the translated slug for this language
        let translatedSlugSegments: string[] = [];
        if (matchedRouteKey) {
          const translated = getTranslatedRouteSlug(matchedRouteKey as any, prefix as any) || "";
          translatedSlugSegments = translated.split("/").filter(Boolean);
        }

        const remainingSegments = restSegments.slice(matchedCount);

        const newPathSegments = [targetSeg, ...translatedSlugSegments, ...remainingSegments].filter(Boolean);
        const newPath = `/${newPathSegments.join("/")}`;

        const href = `${baseDomain}${newPath === "" ? "/" : newPath}`;

        // hrefLang should be the language tag (if country present, include it)
        const hrefLang = targetSeg.toLowerCase();

        return <link key={loc} rel="alternate" hrefLang={hrefLang} href={href} />;
      })}

      {/* x-default points to English */}
      {/* x-default points to en-US */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={(() => {
          const defaultLang = "en";
          const defaultSeg = `en-us`;

          // Build translated slug for english if we matched a route key
          let translatedSlugSegments: string[] = [];
          if (matchedRouteKey) {
            const translated = getTranslatedRouteSlug(matchedRouteKey as any, defaultLang as any) || "";
            translatedSlugSegments = translated.split("/").filter(Boolean);
          }

          const remainingSegments = restSegments.slice(matchedCount);
          const newPathSegments = [defaultSeg, ...translatedSlugSegments, ...remainingSegments].filter(Boolean);
          const newPath = `/${newPathSegments.join("/")}`;
          return `${baseDomain}${newPath === "" ? "/" : newPath}`;
        })()}
      />
    </Helmet>
  );
};

export default HreflangLinks;
