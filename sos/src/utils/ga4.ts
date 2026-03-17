// src/utils/ga4.ts
/**
 * Google Analytics 4 (GA4) — Lightweight wrapper
 *
 * GA4 script is loaded by index.html (inline).
 * Consent Mode V2 is configured by index.html (inline).
 * This file only provides:
 *  - trackEvent() — safe gtag wrapper
 *  - updateGA4Consent() — consent update from CookieBanner
 *  - setUserProperties() / setUserId() — user identification
 *  - ga4Diagnostic() — console diagnostic (window.ga4Diagnostic)
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
const isDev = import.meta.env.DEV;

/**
 * Check if GA4 is enabled and measurement ID is configured
 */
export const isGA4Enabled = (): boolean => {
  return Boolean(GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID.startsWith('G-'));
};

/**
 * Check if user has consented to analytics cookies
 */
export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const savedPreferences = localStorage.getItem('cookie_preferences');
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences) as { analytics?: boolean };
      return prefs.analytics === true;
    }
  } catch {
    // Invalid data, default to no consent
  }

  return false;
};

/**
 * Update GA4 consent mode — Consent Mode v2 compliant
 * Called by CookieBanner when user saves preferences.
 * Uses gtag('consent', 'update') only — no extra gtag('config').
 */
export const updateGA4Consent = (
  consentOrPrefs: boolean | { analytics: boolean; marketing: boolean; performance: boolean }
): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  let analytics: boolean;
  let marketing: boolean;
  let performance: boolean;

  if (typeof consentOrPrefs === 'boolean') {
    analytics = consentOrPrefs;
    marketing = consentOrPrefs;
    performance = consentOrPrefs;
  } else {
    analytics = consentOrPrefs.analytics;
    marketing = consentOrPrefs.marketing;
    performance = consentOrPrefs.performance;
  }

  // Consent Mode v2 — all required parameters
  window.gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
    functionality_storage: performance ? 'granted' : 'denied',
    personalization_storage: performance ? 'granted' : 'denied',
  });

  // Update Google Signals settings via gtag('set') — avoids extra config hit
  if (GA4_MEASUREMENT_ID && isGA4Enabled()) {
    window.gtag('set', {
      allow_google_signals: marketing,
      allow_ad_personalization_signals: marketing,
    });
  }

  if (isDev) {
    console.log('GA4: Consent updated', { analytics, marketing, performance });
  }
};

/**
 * Safe gtag wrapper — always pushes events.
 * Consent Mode V2 handles what data is actually collected/sent.
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  try {
    window.gtag('event', eventName, eventParams);
  } catch (error) {
    if (isDev) console.error('GA4 trackEvent error:', error);
  }
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, unknown>): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  try {
    window.gtag('set', 'user_properties', properties);
  } catch (error) {
    if (isDev) console.error('GA4 setUserProperties error:', error);
  }
};

/**
 * Set user ID — uses gtag('set') to avoid extra config hit
 */
export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  try {
    window.gtag('set', { user_id: userId });
  } catch (error) {
    if (isDev) console.error('GA4 setUserId error:', error);
  }
};

/**
 * Diagnostic function — call in browser console: window.ga4Diagnostic()
 */
export const ga4Diagnostic = (): void => {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return;
  }

  console.log('GA4 Diagnostic Report');
  console.log('=====================');
  console.log('Measurement ID:', GA4_MEASUREMENT_ID || 'NOT SET');
  console.log('Enabled:', isGA4Enabled());
  console.log('Analytics Consent:', hasAnalyticsConsent() ? 'Granted' : 'Not granted');
  console.log('dataLayer length:', window.dataLayer?.length || 0);
  console.log('gtag function:', typeof window.gtag === 'function' ? 'Exists' : 'Missing');

  // Check script in DOM
  const script = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  console.log('Script in DOM:', script ? 'Found' : 'Not found');

  // Check network requests
  const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const gaCollect = requests.filter(r => r.name.includes('google-analytics.com/g/collect'));
  console.log('GA Collect requests:', gaCollect.length);

  if (gaCollect.length > 0) {
    console.log('Events ARE being sent to GA4');
  } else {
    console.log('No events sent — check: ad blockers, consent mode, network');
  }

  // Geo-consent status
  const requiresConsent = (window as any).__requiresConsent;
  console.log('Geo-consent requires consent:', requiresConsent);

  // Cookie status
  const gaCookie = document.cookie.match(/_ga=([^;]+)/);
  console.log('_ga cookie:', gaCookie ? gaCookie[1] : 'ABSENT (analytics_storage denied or ad-blocker)');
};

// Expose diagnostic function globally
if (typeof window !== 'undefined') {
  (window as any).ga4Diagnostic = ga4Diagnostic;
}
