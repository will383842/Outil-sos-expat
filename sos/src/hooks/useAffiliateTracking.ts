/**
 * useAffiliateTracking - Affiliate/Referral URL Persistence System
 *
 * Ensures affiliate tracking (?ref=XXX) stays VISIBLE in the URL across
 * the ENTIRE user session, regardless of how the user navigates.
 *
 * Strategy:
 * 1. On first visit: capture ?ref= from URL → sessionStorage
 * 2. On EVERY route change: if sessionStorage has a ref and URL doesn't, inject it
 * 3. Works with all navigation types: Link, navigate(), <a href>, window.location
 *
 * This complements the existing referralStorage.ts (localStorage, 30-day persistence)
 * by keeping the ?ref= param visible in the URL throughout the session.
 */

import { getStoredReferralCode } from "../utils/referralStorage";

const AFFILIATE_STORAGE_KEY = "sos_affiliate_ref";
const AFFILIATE_PARAM = "ref";

/**
 * Get the stored affiliate code from sessionStorage
 */
export function getAffiliateRef(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(AFFILIATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the affiliate code in sessionStorage
 */
function setAffiliateRef(ref: string): void {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(AFFILIATE_STORAGE_KEY, ref);
  } catch {
    // sessionStorage not available
  }
}

/**
 * Capture affiliate ref from the current URL and store it.
 * Falls back to localStorage (30-day persistence) if sessionStorage is empty.
 * This handles the case where user closes tab and comes back later.
 * Call this once at app init (synchronous, safe).
 */
export function captureAffiliateRef(): void {
  if (typeof window === "undefined") return;
  try {
    // Priority 1: URL param (fresh visit with ?ref=)
    const params = new URLSearchParams(window.location.search);
    const ref = params.get(AFFILIATE_PARAM);
    if (ref) {
      setAffiliateRef(ref);
      return;
    }

    // Priority 2: sessionStorage already has it (same tab session)
    if (sessionStorage.getItem(AFFILIATE_STORAGE_KEY)) return;

    // Priority 3: Restore from localStorage (user closed tab, came back within 30 days)
    const storedCode = getStoredReferralCode("client");
    if (storedCode) {
      setAffiliateRef(storedCode);
    }
  } catch {
    // Silently fail if URL parsing fails
  }
}

/**
 * Append the affiliate ref param to a path/URL string if one is stored.
 * Correctly handles paths with query params AND hash fragments.
 */
export function appendAffiliateRef(path: string): string {
  const ref = getAffiliateRef();
  if (!ref) return path;

  // Don't add to external URLs or mailto links
  if (path.startsWith("http") || path.startsWith("mailto:")) return path;

  // Don't add to admin routes
  if (path.includes("/admin")) return path;

  // Split hash fragment first, then query params
  const [pathWithoutHash, hashPart] = path.split("#");
  const hash = hashPart !== undefined ? `#${hashPart}` : "";

  const [pathPart, queryPart] = pathWithoutHash.split("?");

  if (queryPart) {
    const existing = new URLSearchParams(queryPart);
    if (existing.has(AFFILIATE_PARAM)) return path;
    existing.set(AFFILIATE_PARAM, ref);
    return `${pathPart}?${existing.toString()}${hash}`;
  }

  return `${pathPart}?${AFFILIATE_PARAM}=${encodeURIComponent(ref)}${hash}`;
}

/**
 * AffiliateRefSync - React component that watches route changes
 * and injects ?ref= into the URL if it's missing but stored in session.
 *
 * Place this once in App.tsx inside the Router.
 * This is the SAFETY NET that catches ALL navigation methods.
 */
/**
 * AffiliateRefSync - DISABLED (2026-03-10)
 *
 * Was causing infinite redirect loops with LocaleRouter.
 * Not needed: referral codes are already persisted in localStorage (30 days)
 * via ReferralCodeCapture + useReferralCapture + AffiliatePathCapture.
 * The ?ref= in URL was purely cosmetic.
 */
export function AffiliateRefSync(): null {
  return null;
}
