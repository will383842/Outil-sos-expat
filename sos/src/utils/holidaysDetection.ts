/**
 * Detects if the current domain is sos-holidays.com
 * Used to serve a vacation/traveler-focused home page on the same app.
 *
 * Two detection methods:
 * 1. Real domain check — when served on sos-holidays.com (browser)
 * 2. Query param `_holidays=1` — when pre-rendered by Puppeteer via pages.dev (SSR)
 */
export const isHolidaysDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  // SSR: Puppeteer renders via pages.dev with ?_holidays=1
  const params = new URLSearchParams(window.location.search);
  if (params.get("_holidays") === "1") return true;
  // Browser: real domain check
  return window.location.hostname.includes("sos-holidays");
};

/** Base URL for the main SOS Expat app — used for CTA links on holidays domain */
export const SOS_EXPAT_BASE_URL = "https://sos-expat.com";
