// src/utils/metaPixel.ts
// Utilitaire Meta Pixel complet pour SPA React
// Pixel ID: 2204016713738311

import { generateSharedEventId } from './sharedEventId';
import { detectUserCountry } from './trafficSource';

/**
 * Recupere le pays de l'utilisateur (auto-detection ou valeur fournie)
 */
const getCountryForTracking = (providedCountry?: string): string | undefined => {
  if (providedCountry) return providedCountry.toUpperCase();
  try {
    return detectUserCountry();
  } catch {
    return undefined;
  }
};

declare global {
  interface Window {
    fbq: ((event: string, action: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void) | undefined;
    _fbq: unknown;
    __metaMarketingGranted?: boolean;
  }
}

export const PIXEL_ID = '2204016713738311';

/**
 * Genere un ID d'evenement unique pour la deduplication Pixel/CAPI
 * Format unifie: {prefix}_{timestamp}_{random9chars}
 * Utilise le generateur centralise pour coherence avec CAPI backend
 */
export const generateEventID = (): string => {
  return generateSharedEventId('pxl');
};

/**
 * Verifie si fbq est disponible (pixel charge + pas bloque par adblocker)
 */
export const isFbqAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Verifie si le marketing est autorise
 * Mode GDPR strict: consent requis par defaut
 */
export const hasMarketingConsent = (): boolean => {
  // Check explicit window flag (set by consent manager)
  if (typeof window.__metaMarketingGranted === 'boolean') {
    return window.__metaMarketingGranted;
  }

  // Fallback: verifier localStorage pour GDPR
  try {
    const saved = localStorage.getItem('cookie_preferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      return prefs.marketing === true;
    }
  } catch (e) {
    // Ignore errors
  }

  // GDPR strict: par defaut PAS de tracking sans consentement explicite
  return false;
};

/**
 * Met a jour le consentement Meta Pixel via l'API native fbq
 */
export const updateMetaPixelNativeConsent = (granted: boolean): void => {
  window.__metaMarketingGranted = granted;

  if (!isFbqAvailable()) return;

  try {
    if (granted) {
      window.fbq!('consent', 'grant');
      // Track PageView apres consentement
      trackMetaPageView();
    } else {
      window.fbq!('consent', 'revoke');
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[MetaPixel] Consent ${granted ? 'GRANTED' : 'REVOKED'}`, 'color: #1877F2; font-weight: bold');
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur consent:', error);
  }
};

/**
 * Track un PageView Meta (a appeler sur chaque changement de route)
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaPageView = (params?: { eventID?: string }): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isFbqAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] fbq non disponible (adblocker ou script non charge)');
    }
    return eventID;
  }

  if (!hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaPixel] Marketing consent non accorde');
    }
    return eventID;
  }

  try {
    window.fbq!('track', 'PageView', {}, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] PageView tracked', 'color: #1877F2; font-weight: bold', { path: window.location.pathname, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur PageView:', error);
  }

  return eventID;
};

/**
 * Track un evenement Lead (bouton "Request a call", "Book consultation")
 * @param country Code pays ISO (ex: 'FR', 'US') - auto-detecte si non fourni
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaLead = (params?: {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Lead non tracke - fbq indisponible ou pas de consent');
    }
    return eventID;
  }

  try {
    window.fbq!('track', 'Lead', {
      content_name: params?.content_name || 'consultation_request',
      content_category: params?.content_category || 'service',
      value: params?.value,
      currency: params?.currency || 'EUR',
      // Country in contents for segmentation
      contents: country ? [{ id: country, quantity: 1 }] : undefined,
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Lead tracked', 'color: #1877F2; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Lead:', error);
  }

  return eventID;
};

/**
 * Track un evenement Purchase (succes paiement Stripe)
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaPurchase = (params: {
  value: number;
  currency: string;
  content_name?: string;
  content_type?: string;
  content_id?: string;
  order_id?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params.eventID || generateEventID();

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Purchase non tracke - fbq indisponible ou pas de consent');
    }
    return eventID;
  }

  // Eviter les doublons de Purchase (stocke en sessionStorage)
  const purchaseKey = `meta_purchase_${params.order_id || params.content_id || params.value}`;
  if (sessionStorage.getItem(purchaseKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaPixel] Purchase deja tracke, skip doublon');
    }
    return eventID;
  }

  try {
    window.fbq!('track', 'Purchase', {
      value: params.value,
      currency: params.currency.toUpperCase(),
      content_name: params.content_name || 'call_service',
      content_type: params.content_type || 'service',
      content_ids: params.content_id ? [params.content_id] : undefined,
      num_items: 1,
    }, { eventID });

    // Marquer comme tracke pour eviter doublons
    sessionStorage.setItem(purchaseKey, 'true');

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Purchase tracked', 'color: #1877F2; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Purchase:', error);
  }

  return eventID;
};

/**
 * Track un evenement InitiateCheckout (debut du paiement)
 * @param country Code pays ISO (ex: 'FR', 'US') - auto-detecte si non fourni
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaInitiateCheckout = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'InitiateCheckout', {
      value: params?.value,
      currency: params?.currency || 'EUR',
      content_name: params?.content_name,
      content_category: params?.content_category,
      num_items: params?.num_items || 1,
      // Country in contents for segmentation
      contents: country ? [{ id: country, quantity: 1 }] : undefined,
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] InitiateCheckout tracked', 'color: #1877F2; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur InitiateCheckout:', error);
  }

  return eventID;
};

/**
 * Track un evenement Contact (formulaire de contact)
 */
export const trackMetaContact = (params?: {
  content_name?: string;
  content_category?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) return;

  try {
    window.fbq!('track', 'Contact', {
      content_name: params?.content_name || 'contact_form',
      content_category: params?.content_category || 'support',
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Contact tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Contact:', error);
  }
};

/**
 * Track un evenement CompleteRegistration (inscription terminee)
 * @param country Code pays ISO (ex: 'FR', 'US') - auto-detecte si non fourni
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaCompleteRegistration = (params?: {
  content_name?: string;
  status?: string;
  value?: number;
  currency?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'CompleteRegistration', {
      content_name: params?.content_name || 'user_registration',
      content_category: country,
      status: params?.status || 'completed',
      value: params?.value,
      currency: params?.currency || 'EUR',
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] CompleteRegistration tracked', 'color: #1877F2; font-weight: bold', { ...params, country, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur CompleteRegistration:', error);
  }

  return eventID;
};

/**
 * Track un evenement StartRegistration (debut d'inscription)
 * Evenement custom pour tracker quand l'utilisateur commence le processus d'inscription
 * @param content_name Type d'inscription: 'client_registration', 'expat_registration', 'lawyer_registration'
 * @param country Code pays ISO (ex: 'FR', 'US') - auto-detecte si non fourni
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaStartRegistration = (params?: {
  content_name?: string;
  country?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();
  const country = getCountryForTracking(params?.country);

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('trackCustom', 'StartRegistration', {
      content_name: params?.content_name || 'user_registration',
      content_category: country,
      status: 'started',
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] StartRegistration tracked', 'color: #1877F2; font-weight: bold', {
        content_name: params?.content_name,
        country,
        eventID
      });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur StartRegistration:', error);
  }

  return eventID;
};

/**
 * Track un evenement Search (recherche utilisateur)
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaSearch = (params?: {
  search_string?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'Search', {
      search_string: params?.search_string,
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Search tracked', 'color: #1877F2; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Search:', error);
  }

  return eventID;
};

/**
 * Track un evenement ViewContent (page importante vue)
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaViewContent = (params?: {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'ViewContent', {
      content_name: params?.content_name,
      content_category: params?.content_category,
      content_type: params?.content_type || 'service',
      content_ids: params?.content_ids,
      value: params?.value,
      currency: params?.currency || 'EUR',
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] ViewContent tracked', 'color: #1877F2; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur ViewContent:', error);
  }

  return eventID;
};

/**
 * Track un evenement AddToCart
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaAddToCart = (params?: {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'AddToCart', {
      content_name: params?.content_name,
      content_category: params?.content_category,
      content_type: params?.content_type || 'service',
      content_ids: params?.content_ids,
      value: params?.value,
      currency: params?.currency || 'EUR',
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] AddToCart tracked', 'color: #1877F2; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur AddToCart:', error);
  }

  return eventID;
};

/**
 * Track un evenement AddPaymentInfo
 * @returns eventID utilise pour la deduplication CAPI
 */
export const trackMetaAddPaymentInfo = (params?: {
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  eventID?: string;
}): string | undefined => {
  const eventID = params?.eventID || generateEventID();

  if (!isFbqAvailable() || !hasMarketingConsent()) {
    return eventID;
  }

  try {
    window.fbq!('track', 'AddPaymentInfo', {
      content_category: params?.content_category,
      content_ids: params?.content_ids,
      value: params?.value,
      currency: params?.currency || 'EUR',
    }, { eventID });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] AddPaymentInfo tracked', 'color: #1877F2; font-weight: bold', { ...params, eventID });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur AddPaymentInfo:', error);
  }

  return eventID;
};

/**
 * Track un evenement custom (pour les cas speciaux)
 */
export const trackMetaCustomEvent = (
  eventName: string,
  params?: Record<string, unknown>
): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) return;

  try {
    window.fbq!('trackCustom', eventName, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Custom event tracked:', 'color: #1877F2; font-weight: bold', eventName, params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur custom event:', error);
  }
};

/**
 * Met a jour le consentement Meta Pixel (appele depuis CookieBanner)
 */
export const updateMetaPixelConsent = (granted: boolean): void => {
  window.__metaMarketingGranted = granted;

  if (granted && isFbqAvailable()) {
    // Si consentement accorde, envoyer un PageView
    trackMetaPageView();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('%c[MetaPixel] Consent updated:', 'color: #1877F2; font-weight: bold', granted);
  }
};

/**
 * Advanced Matching - Envoie les donnees utilisateur a Meta pour meilleur matching
 * Appeler cette fonction quand l'utilisateur se connecte ou met a jour son profil
 *
 * IMPORTANT: Cette fonction utilise fbq('init') avec les donnees utilisateur
 * pour ameliorer le matching d'audience et le retargeting
 */
export const setMetaPixelUserData = (userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] UserData non envoye - fbq indisponible ou pas de consent');
    }
    return;
  }

  try {
    // Preparer les donnees en format Meta (tous en minuscules, sans espaces)
    const advancedMatchingData: Record<string, string> = {};

    if (userData.email) {
      // Email en minuscules, sans espaces
      advancedMatchingData.em = userData.email.toLowerCase().trim();
    }

    if (userData.phone) {
      // Telephone: que des chiffres, avec indicatif pays
      const cleanPhone = userData.phone.replace(/[^0-9+]/g, '');
      advancedMatchingData.ph = cleanPhone;
    }

    if (userData.firstName) {
      // Prenom en minuscules, sans espaces au debut/fin
      advancedMatchingData.fn = userData.firstName.toLowerCase().trim();
    }

    if (userData.lastName) {
      // Nom en minuscules, sans espaces au debut/fin
      advancedMatchingData.ln = userData.lastName.toLowerCase().trim();
    }

    if (userData.city) {
      // Ville en minuscules, sans espaces au debut/fin, sans accents
      advancedMatchingData.ct = userData.city
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    if (userData.country) {
      // Code pays ISO 2 lettres en minuscules
      advancedMatchingData.country = userData.country.toLowerCase().substring(0, 2);
    }

    if (userData.zipCode) {
      // Code postal sans espaces
      advancedMatchingData.zp = userData.zipCode.replace(/\s/g, '');
    }

    // Ne rien faire si pas de donnees
    if (Object.keys(advancedMatchingData).length === 0) {
      return;
    }

    // Utiliser fbq('init') avec les donnees utilisateur pour Advanced Matching
    // Note: Ceci re-initialise le pixel avec les nouvelles donnees
    window.fbq!('init', PIXEL_ID, advancedMatchingData);

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Advanced Matching - User data set:', 'color: #1877F2; font-weight: bold', {
        hasEmail: !!advancedMatchingData.em,
        hasPhone: !!advancedMatchingData.ph,
        hasFirstName: !!advancedMatchingData.fn,
        hasLastName: !!advancedMatchingData.ln,
        hasCity: !!advancedMatchingData.ct,
        hasCountry: !!advancedMatchingData.country,
        hasZipCode: !!advancedMatchingData.zp,
      });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Advanced Matching:', error);
  }
};

/**
 * Efface les donnees utilisateur du pixel (a appeler lors de la deconnexion)
 */
export const clearMetaPixelUserData = (): void => {
  if (!isFbqAvailable()) return;

  try {
    // Re-initialiser le pixel sans donnees utilisateur
    window.fbq!('init', PIXEL_ID);

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] User data cleared', 'color: #1877F2; font-weight: bold');
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur clear user data:', error);
  }
};

// Export default pour faciliter l'import
export default {
  generateEventID,
  isFbqAvailable,
  hasMarketingConsent,
  trackMetaPageView,
  trackMetaLead,
  trackMetaPurchase,
  trackMetaInitiateCheckout,
  trackMetaContact,
  trackMetaCompleteRegistration,
  trackMetaStartRegistration,
  trackMetaSearch,
  trackMetaViewContent,
  trackMetaAddToCart,
  trackMetaAddPaymentInfo,
  trackMetaCustomEvent,
  updateMetaPixelConsent,
  updateMetaPixelNativeConsent,
  setMetaPixelUserData,
  clearMetaPixelUserData,
  PIXEL_ID,
};
