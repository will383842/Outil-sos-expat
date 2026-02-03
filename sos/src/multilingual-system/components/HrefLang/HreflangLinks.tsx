import React from "react";
import { Helmet } from "react-helmet-async";
import { SUPPORTED_LANGUAGES, localeToPrefix, getHreflangCode } from "./HrefLangConstants";
import { getRouteKeyFromSlug, getTranslatedRouteSlug } from "../../core/routing";

interface Props {
  pathname: string;
}

/**
 * SEO 2026 Best Practice: hreflang links should point to DEFAULT country per language
 * NOT preserve arbitrary country codes from the URL.
 *
 * Why? Because:
 * 1. /fr-fr/tarifs and /fr-be/tarifs have IDENTICAL content
 * 2. Creating hreflang links to /es-be/ when that URL doesn't exist in sitemap = broken links
 * 3. Google penalizes hreflang inconsistencies
 *
 * Correct approach: 9 hreflang variants (one per language with default country)
 */
const LANGUAGE_TO_DEFAULT_COUNTRY: Record<string, string> = {
  fr: "fr",  // French -> France
  en: "us",  // English -> United States
  es: "es",  // Spanish -> Spain
  de: "de",  // German -> Germany
  ru: "ru",  // Russian -> Russia
  pt: "pt",  // Portuguese -> Portugal
  ch: "cn",  // Chinese -> China
  hi: "in",  // Hindi -> India
  ar: "sa",  // Arabic -> Saudi Arabia
};

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

        // SEO 2026: Always use the DEFAULT country for each language
        // This ensures hreflang links match what's in the sitemap
        const defaultCountry = LANGUAGE_TO_DEFAULT_COUNTRY[prefix] || prefix;
        // Convert 'ch' to 'zh' for Chinese URLs (ISO 639-1 standard)
        const urlLang = prefix === 'ch' ? 'zh' : prefix;
        const targetSeg = `${urlLang}-${defaultCountry}`;

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

        // hrefLang should be the ISO language tag (converts 'ch' to 'zh-Hans' for SEO)
        // For SEO: use language code only (fr, en, es) - Google recommends this for language targeting
        // Country-specific hreflang (fr-FR) is only needed if content differs by country
        const hrefLang = getHreflangCode(prefix);

        return <link key={loc} rel="alternate" hrefLang={hrefLang} href={href} />;
      })}

      {/* x-default points to French (consistent with sitemaps) */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={(() => {
          const defaultLang = "fr";
          const defaultSeg = "fr-fr";

          // Build translated slug for french if we matched a route key
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
