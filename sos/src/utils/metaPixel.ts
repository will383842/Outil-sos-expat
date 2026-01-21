// src/utils/metaPixel.ts
// Utilitaire Meta Pixel complet pour SPA React
// Pixel ID: 2204016713738311
// TRACKING SANS CONSENTEMENT - Pour maximiser les donnees de conversion

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
    fbq: ((...args: unknown[]) => void) | undefined;
    _fbq: unknown;
    __metaMarketingGranted?: boolean;
  }
}

export const PIXEL_ID = '2204016713738311';

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
 * Accepte les formats internationaux E.164 (+33612345678) ou locaux (0612345678)
 */
const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  // Minimum 10 chiffres (format local) ou 11+ avec indicatif
  // Maximum 15 chiffres (limite E.164)
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Normalise un numero de telephone au format E.164 pour Meta
 * @param phone Le numero de telephone brut
 * @param defaultCountryCode Code pays par defaut (sans +), ex: '33' pour France
 * @returns Le numero normalise sans le + (format Meta) ou null si invalide
 */
const normalizePhoneForMeta = (phone: string, defaultCountryCode: string = '33'): string | null => {
  if (!phone) return null;

  // Nettoyer: garder seulement chiffres et +
  let cleanPhone = phone.replace(/[^0-9+]/g, '');

  // Si vide apres nettoyage
  if (!cleanPhone) return null;

  // Gerer les formats courants
  if (cleanPhone.startsWith('+')) {
    // Format international +33612345678 -> 33612345678
    cleanPhone = cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('00')) {
    // Format 0033612345678 -> 33612345678
    cleanPhone = cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('0')) {
    // Format local 0612345678 -> 33612345678
    cleanPhone = defaultCountryCode + cleanPhone.substring(1);
  }

  // Valider la longueur finale (10-15 chiffres)
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return null;
  }

  return cleanPhone;
};

/**
 * Normalise le texte: lowercase, trim, supprime les accents
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Recupere les identifiants Facebook (fbp, fbc) depuis les cookies
 */
export const getMetaIdentifiers = (): { fbp?: string; fbc?: string } => {
  const result: { fbp?: string; fbc?: string } = {};

  try {
    // fbp cookie (_fbp)
    const fbpMatch = document.cookie.match(/_fbp=([^;]+)/);
    if (fbpMatch) {
      result.fbp = fbpMatch[1];
    }

    // fbc cookie (_fbc) ou parametre URL fbclid
    const fbcMatch = document.cookie.match(/_fbc=([^;]+)/);
    if (fbcMatch) {
      result.fbc = fbcMatch[1];
    } else {
      // Fallback: fbclid dans l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get('fbclid');
      if (fbclid) {
        // Format fbc: fb.1.{timestamp}.{fbclid}
        result.fbc = `fb.1.${Date.now()}.${fbclid}`;
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return result;
};

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
 * Fonction legacy - TOUJOURS retourne true (tracking sans consentement)
 * Conservee pour compatibilite avec le code existant
 */
export const hasMarketingConsent = (): boolean => {
  // TRACKING SANS CONSENTEMENT - Toujours autoriser
  return true;
};

/**
 * Met a jour le consentement Meta Pixel via l'API native fbq
 * Note: Le tracking se fait meme sans consentement
 */
export const updateMetaPixelNativeConsent = (granted: boolean): void => {
  window.__metaMarketingGranted = granted;

  if (!isFbqAvailable()) return;

  try {
    if (granted) {
      window.fbq!('consent', 'grant');
    } else {
      window.fbq!('consent', 'revoke');
    }
    // Toujours tracker le PageView
    trackMetaPageView();

    if (process.env.NODE_ENV === 'development') {
      console.log(`%c[MetaPixel] Consent ${granted ? 'GRANTED' : 'REVOKED'} - tracking continues`, 'color: #1877F2; font-weight: bold');
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

  if (!isFbqAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Lead non tracke - fbq indisponible');
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

  if (!isFbqAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Purchase non tracke - fbq indisponible');
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

  if (!isFbqAvailable()) {
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
  if (!isFbqAvailable()) return;

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

  if (!isFbqAvailable()) {
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

  if (!isFbqAvailable()) {
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

  if (!isFbqAvailable()) {
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

  if (!isFbqAvailable()) {
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

  if (!isFbqAvailable()) {
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

  if (!isFbqAvailable()) {
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
  if (!isFbqAvailable()) return;

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
 * Note: Le tracking se fait meme sans consentement
 */
export const updateMetaPixelConsent = (granted: boolean): void => {
  window.__metaMarketingGranted = granted;

  // Toujours tracker le PageView
  if (isFbqAvailable()) {
    trackMetaPageView();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('%c[MetaPixel] Consent updated (tracking continues):', 'color: #1877F2; font-weight: bold', granted);
  }
};

// Stockage des donnees utilisateur pour Advanced Matching (evite re-init du pixel)
let storedUserData: Record<string, string> = {};

/**
 * Advanced Matching - Stocke les donnees utilisateur pour les evenements Meta
 * Appeler cette fonction quand l'utilisateur se connecte ou met a jour son profil
 *
 * NOTE: On ne re-initialise PAS le pixel pour eviter l'erreur "Duplicate Pixel ID".
 * Les donnees sont stockees et envoyees avec les prochains evenements.
 *
 * IMPORTANT: Apres avoir appele cette fonction, appelez applyMetaPixelUserData()
 * pour envoyer les donnees a Meta via fbq('setUserData', ...).
 *
 * TRACKING SANS CONSENTEMENT - Les donnees sont toujours collectees
 */
export const setMetaPixelUserData = (userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  userId?: string; // external_id pour Meta - votre ID utilisateur unique
}): void => {
  try {
    // Preparer les donnees en format Meta (tous en minuscules, sans espaces)
    const advancedMatchingData: Record<string, string> = {};

    // Email avec validation
    if (userData.email && isValidEmail(userData.email)) {
      advancedMatchingData.em = userData.email.toLowerCase().trim();
    }

    // Telephone avec validation et normalisation E.164
    if (userData.phone && isValidPhone(userData.phone)) {
      // Utiliser le code pays de l'utilisateur si disponible, sinon France par defaut
      const countryCode = userData.country?.toUpperCase() === 'US' ? '1' :
                          userData.country?.toUpperCase() === 'GB' ? '44' :
                          userData.country?.toUpperCase() === 'DE' ? '49' :
                          userData.country?.toUpperCase() === 'ES' ? '34' :
                          userData.country?.toUpperCase() === 'IT' ? '39' :
                          userData.country?.toUpperCase() === 'BE' ? '32' :
                          userData.country?.toUpperCase() === 'CH' ? '41' :
                          userData.country?.toUpperCase() === 'CA' ? '1' :
                          userData.country?.toUpperCase() === 'MA' ? '212' :
                          userData.country?.toUpperCase() === 'PT' ? '351' :
                          '33'; // France par defaut

      const normalizedPhone = normalizePhoneForMeta(userData.phone, countryCode);
      if (normalizedPhone) {
        advancedMatchingData.ph = normalizedPhone;
      }
    }

    // Prenom normalise (sans accents)
    if (userData.firstName) {
      advancedMatchingData.fn = normalizeText(userData.firstName);
    }

    // Nom normalise (sans accents)
    if (userData.lastName) {
      advancedMatchingData.ln = normalizeText(userData.lastName);
    }

    // Ville normalisee (sans accents)
    if (userData.city) {
      advancedMatchingData.ct = normalizeText(userData.city);
    }

    // Etat/Province normalise (sans accents)
    if (userData.state) {
      advancedMatchingData.st = normalizeText(userData.state);
    }

    // Code pays ISO 2 lettres en minuscules
    if (userData.country) {
      advancedMatchingData.country = userData.country.toLowerCase().substring(0, 2);
    }

    // Code postal sans espaces
    if (userData.zipCode) {
      advancedMatchingData.zp = userData.zipCode.replace(/\s/g, '');
    }

    // external_id - votre ID utilisateur unique (Firebase UID)
    if (userData.userId) {
      advancedMatchingData.external_id = userData.userId;
    }

    // Ajouter fbp et fbc pour ameliorer l'attribution
    const metaIds = getMetaIdentifiers();
    if (metaIds.fbp) {
      advancedMatchingData.fbp = metaIds.fbp;
    }
    if (metaIds.fbc) {
      advancedMatchingData.fbc = metaIds.fbc;
    }

    // Ne rien faire si pas de donnees
    if (Object.keys(advancedMatchingData).length === 0) {
      return;
    }

    // Stocker les donnees pour utilisation ulterieure (pas de re-init du pixel)
    storedUserData = advancedMatchingData;

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Advanced Matching - User data stored:', 'color: #1877F2; font-weight: bold', {
        hasEmail: !!advancedMatchingData.em,
        hasPhone: !!advancedMatchingData.ph,
        hasFirstName: !!advancedMatchingData.fn,
        hasLastName: !!advancedMatchingData.ln,
        hasCity: !!advancedMatchingData.ct,
        hasState: !!advancedMatchingData.st,
        hasCountry: !!advancedMatchingData.country,
        hasZipCode: !!advancedMatchingData.zp,
        hasExternalId: !!advancedMatchingData.external_id,
        hasFbp: !!advancedMatchingData.fbp,
        hasFbc: !!advancedMatchingData.fbc,
      });
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Advanced Matching:', error);
  }
};

/**
 * Envoie les donnees utilisateur stockees a Meta
 *
 * NOTE: La commande fbq('setUserData', ...) n'est plus supportee par le Meta Pixel SDK 2.0.
 * L'Advanced Matching est gere via CAPI (Conversions API) cote serveur.
 * Cette fonction est conservee pour compatibilite mais ne fait plus d'appel fbq.
 *
 * TRACKING SANS CONSENTEMENT - Les donnees sont stockees localement pour CAPI
 */
export const applyMetaPixelUserData = (): void => {
  if (Object.keys(storedUserData).length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaPixel] Pas de donnees utilisateur stockees');
    }
    return;
  }

  // Note: fbq('setUserData', ...) n'est pas une commande valide du SDK 2.0
  // L'Advanced Matching est gere via CAPI (metaConversionsApi.ts)
  if (process.env.NODE_ENV === 'development') {
    console.log('%c[MetaPixel] User data stored for CAPI:', 'color: #1877F2; font-weight: bold;', {
      fieldsCount: Object.keys(storedUserData).length,
      fields: Object.keys(storedUserData),
    });
  }
};

/**
 * Recupere les donnees utilisateur stockees pour Advanced Matching
 */
export const getStoredUserData = (): Record<string, string> => storedUserData;

/**
 * Genere un rapport de validation des donnees Advanced Matching
 * Utile pour le diagnostic et le monitoring de la qualite des donnees
 *
 * @returns Rapport avec le nombre de champs valides et le match rate estime
 */
export const getAdvancedMatchingReport = (): {
  fieldsProvided: number;
  fieldsValid: number;
  matchRateEstimate: 'excellent' | 'good' | 'fair' | 'poor';
  details: Record<string, boolean>;
  recommendations: string[];
} => {
  const data = storedUserData;
  const details: Record<string, boolean> = {
    email: !!data.em,
    phone: !!data.ph,
    firstName: !!data.fn,
    lastName: !!data.ln,
    city: !!data.ct,
    country: !!data.country,
    externalId: !!data.external_id,
    fbp: !!data.fbp,
    fbc: !!data.fbc,
  };

  const fieldsValid = Object.values(details).filter(Boolean).length;
  const recommendations: string[] = [];

  // Calculer le match rate estime basé sur les champs les plus importants
  let matchScore = 0;
  if (data.em) matchScore += 40; // Email est le plus important
  if (data.ph) matchScore += 30; // Phone est tres important
  if (data.fn && data.ln) matchScore += 15; // Nom complet aide
  if (data.external_id) matchScore += 10; // External ID pour cross-device
  if (data.fbp || data.fbc) matchScore += 5; // Identifiants Meta

  // Determiner le match rate
  let matchRateEstimate: 'excellent' | 'good' | 'fair' | 'poor';
  if (matchScore >= 80) {
    matchRateEstimate = 'excellent';
  } else if (matchScore >= 55) {
    matchRateEstimate = 'good';
  } else if (matchScore >= 30) {
    matchRateEstimate = 'fair';
  } else {
    matchRateEstimate = 'poor';
  }

  // Recommandations
  if (!data.em) {
    recommendations.push('Email manquant - champ le plus important pour le matching');
  }
  if (!data.ph) {
    recommendations.push('Telephone manquant - ameliore significativement le match rate');
  }
  if (!data.fn || !data.ln) {
    recommendations.push('Nom/Prenom manquant - aide au matching cross-platform');
  }
  if (!data.external_id) {
    recommendations.push('External ID manquant - necessaire pour le cross-device tracking');
  }
  if (!data.fbp && !data.fbc) {
    recommendations.push('Identifiants Meta manquants - verifier que le Pixel est charge');
  }

  return {
    fieldsProvided: Object.keys(data).length,
    fieldsValid,
    matchRateEstimate,
    details,
    recommendations,
  };
};

/**
 * Efface les donnees utilisateur stockees (a appeler lors de la deconnexion)
 *
 * NOTE: La commande fbq('setUserData', ...) n'est plus supportee par le Meta Pixel SDK 2.0.
 * On efface uniquement les donnees stockees localement.
 */
export const clearMetaPixelUserData = (): void => {
  // Effacer les donnees stockees localement
  storedUserData = {};

  if (process.env.NODE_ENV === 'development') {
    console.log('%c[MetaPixel] User data cleared', 'color: #1877F2; font-weight: bold');
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
  applyMetaPixelUserData,
  clearMetaPixelUserData,
  getStoredUserData,
  getMetaIdentifiers,
  getAdvancedMatchingReport,
  PIXEL_ID,
};
