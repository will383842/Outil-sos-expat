// src/utils/googleAds.ts
// Utilitaire Google Ads complet pour SPA React
// Supporte Google Ads Conversion Tracking + Enhanced Conversions
// TRACKING AVEC CONSENTEMENT - Respecte le GDPR via Consent Mode v2

import { generateSharedEventId } from './sharedEventId';
import { detectUserCountry } from './trafficSource';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    __googleAdsMarketingGranted?: boolean;
  }
}

// Configuration Google Ads
// IMPORTANT: Remplacer par votre vrai Conversion ID dans .env
const GOOGLE_ADS_CONVERSION_ID = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_ID as string | undefined;

// Labels de conversion (a configurer dans Google Ads)
// Ces labels sont specifiques a chaque action de conversion
const CONVERSION_LABELS = {
  purchase: import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL as string | undefined,
  lead: import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined,
  signup: import.meta.env.VITE_GOOGLE_ADS_SIGNUP_LABEL as string | undefined,
  checkout: import.meta.env.VITE_GOOGLE_ADS_CHECKOUT_LABEL as string | undefined,
} as const;

// ============================================================================
// Utilitaires de validation et normalisation
// ============================================================================

/**
 * Valide un email avec regex
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Valide un numero de telephone (minimum 10 chiffres)
 */
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Normalise un numero de telephone au format E.164 pour Google
 * @param phone Le numero de telephone brut
 * @param defaultCountryCode Code pays par defaut (sans +), ex: '33' pour France
 * @returns Le numero normalise avec le + (format E.164) ou null si invalide
 */
const normalizePhoneForGoogle = (phone: string, defaultCountryCode: string = '33'): string | null => {
  if (!phone) return null;

  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (!cleanPhone) return null;

  if (cleanPhone.startsWith('+')) {
    // Deja au format international
    return cleanPhone;
  } else if (cleanPhone.startsWith('00')) {
    cleanPhone = '+' + cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('0')) {
    cleanPhone = '+' + defaultCountryCode + cleanPhone.substring(1);
  } else {
    cleanPhone = '+' + defaultCountryCode + cleanPhone;
  }

  // Valider la longueur finale
  const digits = cleanPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return cleanPhone;
};

/**
 * Normalise le texte: lowercase, trim
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim();
};

/**
 * Hash SHA256 pour Enhanced Conversions
 * Google accepte les donnees hashees en SHA256 (lowercase hex)
 */
const sha256Hash = async (text: string): Promise<string> => {
  const normalized = normalizeText(text);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Recupere le pays de l'utilisateur
 */
const getCountryForTracking = (providedCountry?: string): string | undefined => {
  if (providedCountry) return providedCountry.toUpperCase();
  try {
    return detectUserCountry();
  } catch {
    return undefined;
  }
};

/**
 * Recupere le GCLID (Google Click ID) depuis l'URL ou les cookies
 */
export const getGoogleClickId = (): string | null => {
  try {
    // D'abord verifier l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const gclidFromUrl = urlParams.get('gclid');
    if (gclidFromUrl) {
      // Stocker pour utilisation ulterieure
      try {
        sessionStorage.setItem('gclid', gclidFromUrl);
        sessionStorage.setItem('gclid_timestamp', Date.now().toString());
      } catch {
        // Ignore
      }
      return gclidFromUrl;
    }

    // Fallback: verifier sessionStorage
    try {
      const storedGclid = sessionStorage.getItem('gclid');
      const storedTimestamp = sessionStorage.getItem('gclid_timestamp');
      if (storedGclid && storedTimestamp) {
        // Verifier que le GCLID n'est pas trop ancien (90 jours max)
        const timestamp = parseInt(storedTimestamp, 10);
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        if (timestamp > ninetyDaysAgo) {
          return storedGclid;
        }
      }
    } catch {
      // Ignore
    }

    // Fallback: verifier cookie _gcl_aw
    const gclMatch = document.cookie.match(/_gcl_aw=([^;]+)/);
    if (gclMatch) {
      // Format: GCL.{timestamp}.{gclid}
      const parts = gclMatch[1].split('.');
      if (parts.length >= 3) {
        return parts.slice(2).join('.');
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
};

/**
 * Genere un ID d'evenement unique pour la deduplication
 */
export const generateEventID = (): string => {
  return generateSharedEventId('gad');
};

// ============================================================================
// Verification et initialisation
// ============================================================================

/**
 * Verifie si Google Ads est configure
 */
export const isGoogleAdsEnabled = (): boolean => {
  return Boolean(GOOGLE_ADS_CONVERSION_ID && GOOGLE_ADS_CONVERSION_ID.startsWith('AW-'));
};

/**
 * Verifie si gtag est disponible
 */
export const isGtagAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

/**
 * Verifie le consentement marketing depuis localStorage
 */
export const hasMarketingConsent = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const savedPreferences = localStorage.getItem('cookie_preferences');
    if (savedPreferences) {
      const prefs = JSON.parse(savedPreferences) as { marketing?: boolean };
      return prefs.marketing === true;
    }
  } catch {
    // Invalid data
  }
  return false;
};

/**
 * Met a jour le consentement Google Ads via Consent Mode v2
 */
export const updateGoogleAdsConsent = (granted: boolean): void => {
  window.__googleAdsMarketingGranted = granted;

  if (!isGtagAvailable()) return;

  try {
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[GoogleAds] Consent ${granted ? 'GRANTED' : 'DENIED'}`, 'color: #4285F4; font-weight: bold');
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur consent:', error);
  }
};

/**
 * Initialise le script Google Ads Conversion Tracking
 * Note: gtag.js est deja charge via GA4, on configure juste la conversion
 */
export const initializeGoogleAds = (): void => {
  if (!isGoogleAdsEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GoogleAds] Not enabled - VITE_GOOGLE_ADS_CONVERSION_ID not set');
    }
    return;
  }

  if (!isGtagAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GoogleAds] gtag not available - GA4 must be initialized first');
    }
    return;
  }

  try {
    // Configurer Google Ads (gtag est deja charge via GA4)
    window.gtag('config', GOOGLE_ADS_CONVERSION_ID!, {
      // Ne pas envoyer de page_view automatique pour les conversions
      send_page_view: false,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Initialized:', 'color: #4285F4; font-weight: bold', GOOGLE_ADS_CONVERSION_ID);
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur initialization:', error);
  }
};

// ============================================================================
// Enhanced Conversions - Donnees utilisateur
// ============================================================================

// Stockage des donnees utilisateur hashees
let storedUserData: Record<string, string> = {};

/**
 * Stocke les donnees utilisateur pour Enhanced Conversions
 * Les donnees sont hashees en SHA256 avant d'etre envoyees a Google
 */
export const setGoogleAdsUserData = async (userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}): Promise<void> => {
  try {
    const enhancedData: Record<string, string> = {};

    // Email (hash SHA256)
    if (userData.email && isValidEmail(userData.email)) {
      enhancedData.sha256_email_address = await sha256Hash(userData.email);
    }

    // Telephone (hash SHA256 du format E.164)
    if (userData.phone && isValidPhone(userData.phone)) {
      const countryCode = userData.country?.toUpperCase() === 'US' ? '1' :
                          userData.country?.toUpperCase() === 'GB' ? '44' :
                          userData.country?.toUpperCase() === 'DE' ? '49' :
                          userData.country?.toUpperCase() === 'ES' ? '34' :
                          userData.country?.toUpperCase() === 'IT' ? '39' :
                          userData.country?.toUpperCase() === 'BE' ? '32' :
                          userData.country?.toUpperCase() === 'CH' ? '41' :
                          userData.country?.toUpperCase() === 'CA' ? '1' :
                          '33';
      const normalizedPhone = normalizePhoneForGoogle(userData.phone, countryCode);
      if (normalizedPhone) {
        enhancedData.sha256_phone_number = await sha256Hash(normalizedPhone);
      }
    }

    // Nom (non hashe pour Google Ads)
    if (userData.firstName) {
      enhancedData.address = enhancedData.address || '{}';
      const address = JSON.parse(enhancedData.address === '{}' ? '{}' : enhancedData.address);
      address.sha256_first_name = await sha256Hash(userData.firstName);
      enhancedData.address = JSON.stringify(address);
    }

    if (userData.lastName) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.sha256_last_name = await sha256Hash(userData.lastName);
      enhancedData.address = JSON.stringify(address);
    }

    // Adresse
    if (userData.streetAddress) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.sha256_street = await sha256Hash(userData.streetAddress);
      enhancedData.address = JSON.stringify(address);
    }

    if (userData.city) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.city = normalizeText(userData.city);
      enhancedData.address = JSON.stringify(address);
    }

    if (userData.region) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.region = normalizeText(userData.region);
      enhancedData.address = JSON.stringify(address);
    }

    if (userData.postalCode) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.postal_code = userData.postalCode.replace(/\s/g, '');
      enhancedData.address = JSON.stringify(address);
    }

    if (userData.country) {
      const address = JSON.parse(enhancedData.address || '{}');
      address.country = userData.country.toUpperCase().substring(0, 2);
      enhancedData.address = JSON.stringify(address);
    }

    // Parser l'adresse si elle existe
    if (enhancedData.address && enhancedData.address !== '{}') {
      const parsedAddress = JSON.parse(enhancedData.address);
      delete enhancedData.address;
      enhancedData.address = parsedAddress;
    } else {
      delete enhancedData.address;
    }

    storedUserData = enhancedData;

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Enhanced Conversions - User data stored:', 'color: #4285F4; font-weight: bold', {
        hasEmail: !!enhancedData.sha256_email_address,
        hasPhone: !!enhancedData.sha256_phone_number,
        hasAddress: !!enhancedData.address,
      });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur Enhanced Conversions:', error);
  }
};

/**
 * Recupere les donnees utilisateur stockees
 */
export const getStoredUserData = (): Record<string, string> => storedUserData;

/**
 * Efface les donnees utilisateur (deconnexion)
 */
export const clearGoogleAdsUserData = (): void => {
  storedUserData = {};
  if (process.env.NODE_ENV === 'development') {
    console.log('%c[GoogleAds] User data cleared', 'color: #4285F4; font-weight: bold');
  }
};

// ============================================================================
// Tracking des evenements de conversion
// ============================================================================

/**
 * Track une conversion Purchase (paiement reussi)
 */
export const trackGoogleAdsPurchase = (params: {
  value: number;
  currency: string;
  transaction_id?: string;
  order_id?: string;
  content_name?: string;
  content_type?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params.eventID || generateEventID();

  if (!isGtagAvailable() || !isGoogleAdsEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GoogleAds] Purchase non tracke - gtag ou config indisponible');
    }
    return eventID;
  }

  // Protection contre les doublons
  const purchaseKey = `gads_purchase_${params.order_id || params.transaction_id || params.value}`;
  if (sessionStorage.getItem(purchaseKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoogleAds] Purchase deja tracke, skip doublon');
    }
    return eventID;
  }

  try {
    // Event de conversion Google Ads
    if (CONVERSION_LABELS.purchase) {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_CONVERSION_ID}/${CONVERSION_LABELS.purchase}`,
        value: params.value,
        currency: params.currency.toUpperCase(),
        transaction_id: params.transaction_id || params.order_id || eventID,
        // Enhanced Conversions
        ...storedUserData,
      });
    }

    // Event GA4 purchase (pour le remarketing)
    window.gtag('event', 'purchase', {
      value: params.value,
      currency: params.currency.toUpperCase(),
      transaction_id: params.transaction_id || params.order_id || eventID,
      items: [{
        item_name: params.content_name || 'call_service',
        item_category: params.content_type || 'service',
        price: params.value,
        quantity: 1,
      }],
    });

    sessionStorage.setItem(purchaseKey, 'true');

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Purchase tracked', 'color: #4285F4; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur Purchase:', error);
  }

  return eventID;
};

/**
 * Track une conversion Lead (demande de consultation)
 */
export const trackGoogleAdsLead = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isGtagAvailable() || !isGoogleAdsEnabled()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[GoogleAds] Lead non tracke - gtag ou config indisponible');
    }
    return eventID;
  }

  try {
    // Event de conversion Google Ads
    if (CONVERSION_LABELS.lead) {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_CONVERSION_ID}/${CONVERSION_LABELS.lead}`,
        value: params?.value || 0,
        currency: params?.currency || 'EUR',
        // Enhanced Conversions
        ...storedUserData,
      });
    }

    // Event GA4 generate_lead
    window.gtag('event', 'generate_lead', {
      value: params?.value || 0,
      currency: params?.currency || 'EUR',
      lead_source: params?.content_category || 'website',
      country: country,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Lead tracked', 'color: #4285F4; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur Lead:', error);
  }

  return eventID;
};

/**
 * Track un debut de checkout
 */
export const trackGoogleAdsBeginCheckout = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isGtagAvailable()) {
    return eventID;
  }

  try {
    // Event de conversion Google Ads (si configure)
    if (CONVERSION_LABELS.checkout && isGoogleAdsEnabled()) {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_CONVERSION_ID}/${CONVERSION_LABELS.checkout}`,
        value: params?.value || 0,
        currency: params?.currency || 'EUR',
      });
    }

    // Event GA4 begin_checkout
    window.gtag('event', 'begin_checkout', {
      value: params?.value || 0,
      currency: params?.currency || 'EUR',
      items: [{
        item_name: params?.content_name || 'call_service',
        item_category: params?.content_category || 'service',
        price: params?.value || 0,
        quantity: 1,
      }],
      country: country,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] BeginCheckout tracked', 'color: #4285F4; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur BeginCheckout:', error);
  }

  return eventID;
};

/**
 * Track un ajout d'info de paiement
 */
export const trackGoogleAdsAddPaymentInfo = (params?: {
  value?: number;
  currency?: string;
  payment_type?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isGtagAvailable()) {
    return eventID;
  }

  try {
    // Event GA4 add_payment_info
    window.gtag('event', 'add_payment_info', {
      value: params?.value || 0,
      currency: params?.currency || 'EUR',
      payment_type: params?.payment_type || 'card',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] AddPaymentInfo tracked', 'color: #4285F4; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur AddPaymentInfo:', error);
  }

  return eventID;
};

/**
 * Track une inscription complete
 */
export const trackGoogleAdsSignUp = (params?: {
  method?: string;
  content_name?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isGtagAvailable()) {
    return eventID;
  }

  try {
    // Event de conversion Google Ads (si configure)
    if (CONVERSION_LABELS.signup && isGoogleAdsEnabled()) {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_CONVERSION_ID}/${CONVERSION_LABELS.signup}`,
        // Enhanced Conversions
        ...storedUserData,
      });
    }

    // Event GA4 sign_up
    window.gtag('event', 'sign_up', {
      method: params?.method || 'email',
      content_name: params?.content_name,
      country: country,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] SignUp tracked', 'color: #4285F4; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur SignUp:', error);
  }

  return eventID;
};

/**
 * Track un evenement de recherche
 */
export const trackGoogleAdsSearch = (params?: {
  search_term?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isGtagAvailable()) {
    return eventID;
  }

  try {
    window.gtag('event', 'search', {
      search_term: params?.search_term || '',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Search tracked', 'color: #4285F4; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur Search:', error);
  }

  return eventID;
};

/**
 * Track un view content
 */
export const trackGoogleAdsViewContent = (params?: {
  content_name?: string;
  content_category?: string;
  content_id?: string;
  value?: number;
  currency?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isGtagAvailable()) {
    return eventID;
  }

  try {
    window.gtag('event', 'view_item', {
      items: [{
        item_id: params?.content_id,
        item_name: params?.content_name,
        item_category: params?.content_category,
        price: params?.value,
      }],
      value: params?.value,
      currency: params?.currency || 'EUR',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] ViewContent tracked', 'color: #4285F4; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur ViewContent:', error);
  }

  return eventID;
};

/**
 * Track un evenement custom
 */
export const trackGoogleAdsCustomEvent = (
  eventName: string,
  params?: Record<string, unknown>
): void => {
  if (!isGtagAvailable()) return;

  try {
    window.gtag('event', eventName, params);

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[GoogleAds] Custom event tracked:', 'color: #4285F4; font-weight: bold', eventName, params);
    }
  } catch (error) {
    console.error('[GoogleAds] Erreur custom event:', error);
  }
};

// ============================================================================
// Diagnostic
// ============================================================================

/**
 * Fonction de diagnostic pour verifier l'etat de Google Ads
 * Appelez window.googleAdsDiagnostic() dans la console
 */
export const googleAdsDiagnostic = (): void => {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return;
  }

  console.log('%c Google Ads Diagnostic Report ', 'background: #4285F4; color: white; font-weight: bold; padding: 4px 8px;');
  console.log('================================');

  // Configuration
  console.log('\n%c Configuration:', 'font-weight: bold');
  console.log('  Conversion ID:', GOOGLE_ADS_CONVERSION_ID || 'NOT SET');
  console.log('  Enabled:', isGoogleAdsEnabled());
  console.log('  Purchase Label:', CONVERSION_LABELS.purchase || 'NOT SET');
  console.log('  Lead Label:', CONVERSION_LABELS.lead || 'NOT SET');
  console.log('  Signup Label:', CONVERSION_LABELS.signup || 'NOT SET');
  console.log('  Checkout Label:', CONVERSION_LABELS.checkout || 'NOT SET');

  // Consent
  console.log('\n%c Consentement:', 'font-weight: bold');
  console.log('  Marketing Consent:', hasMarketingConsent() ? 'GRANTED' : 'DENIED');
  console.log('  Internal Flag:', window.__googleAdsMarketingGranted);

  // gtag
  console.log('\n%c gtag:', 'font-weight: bold');
  console.log('  gtag Available:', isGtagAvailable());
  console.log('  dataLayer:', window.dataLayer);
  console.log('  dataLayer Length:', window.dataLayer?.length || 0);

  // GCLID
  console.log('\n%c GCLID (Click ID):', 'font-weight: bold');
  const gclid = getGoogleClickId();
  console.log('  GCLID:', gclid || 'Not found');

  // Enhanced Conversions
  console.log('\n%c Enhanced Conversions:', 'font-weight: bold');
  console.log('  User Data Stored:', Object.keys(storedUserData).length > 0);
  console.log('  Fields:', Object.keys(storedUserData));

  // Network requests
  console.log('\n%c Network Requests:', 'font-weight: bold');
  const requests = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const googleRequests = requests.filter(r =>
    r.name.includes('googleadservices.com') ||
    r.name.includes('google.com/pagead') ||
    r.name.includes('googlesyndication.com')
  );
  console.log('  Google Ads Requests:', googleRequests.length);
  googleRequests.slice(-3).forEach((req, i) => {
    console.log(`    ${i + 1}. ${req.name.substring(0, 80)}...`);
  });

  // Recommendations
  console.log('\n%c Recommendations:', 'font-weight: bold');
  if (!GOOGLE_ADS_CONVERSION_ID) {
    console.log('  1. Set VITE_GOOGLE_ADS_CONVERSION_ID in .env');
  }
  if (!CONVERSION_LABELS.purchase) {
    console.log('  2. Set VITE_GOOGLE_ADS_PURCHASE_LABEL for purchase tracking');
  }
  if (!CONVERSION_LABELS.lead) {
    console.log('  3. Set VITE_GOOGLE_ADS_LEAD_LABEL for lead tracking');
  }
  if (!hasMarketingConsent()) {
    console.log('  4. User has not accepted marketing cookies');
  }
  if (Object.keys(storedUserData).length === 0) {
    console.log('  5. No user data for Enhanced Conversions - call setGoogleAdsUserData()');
  }

  console.log('\n================================');
};

// Exposer la fonction de diagnostic globalement
if (typeof window !== 'undefined') {
  (window as any).googleAdsDiagnostic = googleAdsDiagnostic;
}

// Export default
export default {
  // Configuration
  isGoogleAdsEnabled,
  isGtagAvailable,
  hasMarketingConsent,
  initializeGoogleAds,
  updateGoogleAdsConsent,

  // User Data
  setGoogleAdsUserData,
  getStoredUserData,
  clearGoogleAdsUserData,

  // Tracking
  trackGoogleAdsPurchase,
  trackGoogleAdsLead,
  trackGoogleAdsBeginCheckout,
  trackGoogleAdsAddPaymentInfo,
  trackGoogleAdsSignUp,
  trackGoogleAdsSearch,
  trackGoogleAdsViewContent,
  trackGoogleAdsCustomEvent,

  // Utils
  generateEventID,
  getGoogleClickId,
  googleAdsDiagnostic,
};
