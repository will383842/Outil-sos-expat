// src/utils/gtm.ts
/**
 * Google Tag Manager (GTM) Initialization and Management
 *
 * Features:
 * - Dynamic script loading with error handling
 * - Respects cookie consent (Consent Mode v2)
 * - Shares dataLayer with GA4
 * - Fallback to direct GA4 if GTM fails
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

export interface ConsentState {
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
  functionality_storage: 'granted' | 'denied';
  personalization_storage: 'granted' | 'denied';
}

/**
 * Check if GTM is enabled and ID is configured
 */
export const isGTMEnabled = (): boolean => {
  return Boolean(GTM_ID && GTM_ID.startsWith('GTM-'));
};

/**
 * Check if GA4 is enabled (for fallback)
 */
export const isGA4Enabled = (): boolean => {
  return Boolean(GA4_ID && GA4_ID.startsWith('G-'));
};

/**
 * Initialize GTM with error handling
 * Returns a promise that resolves when GTM is loaded
 */
export const initializeGTM = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.warn('⚠️ GTM: Window not available (SSR)');
      resolve(false);
      return;
    }

    // Initialize dataLayer if not exists
    window.dataLayer = window.dataLayer || [];

    // If GTM is not configured, fall back to GA4
    if (!isGTMEnabled()) {
      console.warn('⚠️ GTM: Not enabled - check VITE_GTM_ID in .env');
      if (isGA4Enabled()) {
        console.log('📊 GTM: Falling back to direct GA4 initialization');
        initializeFallbackGA4();
      }
      resolve(false);
      return;
    }

    // Check if already loaded
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`);
    if (existingScript) {
      console.log('✅ GTM: Already loaded');
      resolve(true);
      return;
    }

    console.log('🔍 GTM: Initialization started', GTM_ID);

    // Push GTM start event
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    // Create and load GTM script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

    script.onload = () => {
      console.log('✅ GTM: Script loaded successfully');
      resolve(true);
    };

    script.onerror = (error) => {
      console.error('❌ GTM: Failed to load script', error);
      console.warn('⚠️ GTM: This may be caused by ad blockers or privacy extensions');

      // Fallback to direct GA4 if GTM fails
      if (isGA4Enabled()) {
        console.log('📊 GTM: Attempting fallback to direct GA4');
        initializeFallbackGA4();
      }
      resolve(false);
    };

    // Insert script - standard GTM placement
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  });
};

/**
 * Fallback to direct GA4 if GTM fails to load
 */
const initializeFallbackGA4 = (): void => {
  if (!GA4_ID || typeof window === 'undefined') return;

  // Check if GA4 script already exists
  const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA4_ID}"]`);
  if (existingScript) {
    console.log('📊 GA4: Fallback script already exists');
    return;
  }

  console.log('📊 GA4: Loading fallback script...');

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;

  script.onload = () => {
    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      send_page_view: false, // We'll send manually
      anonymize_ip: true,
    });
    console.log('✅ GA4: Fallback initialized');
  };

  script.onerror = () => {
    console.error('❌ GA4: Fallback also failed - analytics blocked');
  };

  document.head.appendChild(script);
};

/**
 * Update consent for Consent Mode v2
 * Call this when user updates their cookie preferences
 */
export const updateConsent = (consent: Partial<ConsentState>): void => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('⚠️ GTM: Cannot update consent - gtag not available');
    return;
  }

  const consentUpdate = {
    ad_storage: consent.ad_storage ?? 'denied',
    ad_user_data: consent.ad_user_data ?? 'denied',
    ad_personalization: consent.ad_personalization ?? 'denied',
    analytics_storage: consent.analytics_storage ?? 'denied',
    functionality_storage: consent.functionality_storage ?? 'denied',
    personalization_storage: consent.personalization_storage ?? 'denied',
  };

  window.gtag('consent', 'update', consentUpdate);

  // Push consent update event to dataLayer for GTM triggers
  window.dataLayer.push({
    event: 'consent_update',
    consent_analytics: consent.analytics_storage === 'granted',
    consent_marketing: consent.ad_storage === 'granted',
    consent_performance: consent.functionality_storage === 'granted',
  });

  console.log('✅ GTM: Consent updated', consentUpdate);
};

/**
 * Update consent from cookie preferences object
 * Convenience wrapper for CookieBanner integration
 */
export const updateConsentFromPreferences = (prefs: {
  analytics: boolean;
  marketing: boolean;
  performance: boolean;
}): void => {
  updateConsent({
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    ad_storage: prefs.marketing ? 'granted' : 'denied',
    ad_user_data: prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
    functionality_storage: prefs.performance ? 'granted' : 'denied',
    personalization_storage: prefs.performance ? 'granted' : 'denied',
  });
};

/**
 * Push custom event to dataLayer
 */
export const pushEvent = (eventName: string, params?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
};

/**
 * Push page view event to dataLayer
 */
export const pushPageView = (pagePath?: string, pageTitle?: string): void => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'page_view',
    page_path: pagePath || window.location.pathname,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
  });
};

/**
 * Diagnostic function to check GTM status
 * Call this in browser console: window.gtmDiagnostic()
 */
export const gtmDiagnostic = (): void => {
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    return;
  }

  console.log('🔍 GTM Diagnostic Report');
  console.log('========================');
  console.log('📊 GTM ID:', GTM_ID || '❌ NOT SET');
  console.log('📊 GA4 ID:', GA4_ID || '❌ NOT SET');
  console.log('📊 GTM Enabled:', isGTMEnabled());
  console.log('📊 GA4 Enabled:', isGA4Enabled());
  console.log('📦 dataLayer:', window.dataLayer);
  console.log('📦 dataLayer length:', window.dataLayer?.length || 0);
  console.log('🔧 gtag function:', typeof window.gtag === 'function' ? '✅ Exists' : '❌ Missing');

  // Check scripts
  const gtmScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js"]`);
  const ga4Script = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
  console.log('📜 GTM Script in DOM:', gtmScript ? '✅ Found' : '❌ Not found');
  console.log('📜 GA4 Script in DOM:', ga4Script ? '✅ Found' : '❌ Not found');

  // Check network requests
  const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const gtmRequests = requests.filter(r => r.name.includes('googletagmanager.com'));
  const gaCollectRequests = requests.filter(r => r.name.includes('google-analytics.com/g/collect'));

  console.log('🌐 GTM/GA requests:', gtmRequests.length);
  console.log('🌐 GA Collect requests:', gaCollectRequests.length);

  if (gaCollectRequests.length > 0) {
    console.log('✅ Events are being sent to GA4!');
  } else {
    console.log('⚠️ No events sent - check ad blockers or consent');
  }
};

// Expose diagnostic function globally
if (typeof window !== 'undefined') {
  (window as unknown as { gtmDiagnostic: typeof gtmDiagnostic }).gtmDiagnostic = gtmDiagnostic;
}
