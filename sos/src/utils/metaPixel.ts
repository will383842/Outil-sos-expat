// src/utils/metaPixel.ts
// Utilitaire Meta Pixel complet pour SPA React
// Pixel ID: 1887073748568784

declare global {
  interface Window {
    fbq: ((event: string, action: string, params?: Record<string, unknown>) => void) | undefined;
    _fbq: unknown;
    __metaMarketingGranted?: boolean;
  }
}

export const PIXEL_ID = '1887073748568784';

/**
 * Verifie si fbq est disponible (pixel charge + pas bloque par adblocker)
 */
export const isFbqAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
};

/**
 * Verifie si le marketing est autorise
 * Mode actuel: SANS GDPR (track direct)
 */
export const hasMarketingConsent = (): boolean => {
  // Mode SANS GDPR : toujours true si le flag est set
  if (window.__metaMarketingGranted === true) {
    return true;
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

  // Par defaut en mode sans GDPR: autorise
  return true;
};

/**
 * Track un PageView Meta (a appeler sur chaque changement de route)
 */
export const trackMetaPageView = (): void => {
  if (!isFbqAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] fbq non disponible (adblocker ou script non charge)');
    }
    return;
  }

  if (!hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaPixel] Marketing consent non accorde');
    }
    return;
  }

  try {
    window.fbq!('track', 'PageView');
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] PageView tracked', 'color: #1877F2; font-weight: bold', window.location.pathname);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur PageView:', error);
  }
};

/**
 * Track un evenement Lead (bouton "Request a call", "Book consultation")
 */
export const trackMetaLead = (params?: {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Lead non tracke - fbq indisponible ou pas de consent');
    }
    return;
  }

  try {
    window.fbq!('track', 'Lead', {
      content_name: params?.content_name || 'consultation_request',
      content_category: params?.content_category || 'service',
      value: params?.value,
      currency: params?.currency || 'EUR',
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Lead tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Lead:', error);
  }
};

/**
 * Track un evenement Purchase (succes paiement Stripe)
 */
export const trackMetaPurchase = (params: {
  value: number;
  currency: string;
  content_name?: string;
  content_type?: string;
  content_id?: string;
  order_id?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MetaPixel] Purchase non tracke - fbq indisponible ou pas de consent');
    }
    return;
  }

  // Eviter les doublons de Purchase (stocke en sessionStorage)
  const purchaseKey = `meta_purchase_${params.order_id || params.content_id || params.value}`;
  if (sessionStorage.getItem(purchaseKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaPixel] Purchase deja tracke, skip doublon');
    }
    return;
  }

  try {
    window.fbq!('track', 'Purchase', {
      value: params.value,
      currency: params.currency.toUpperCase(),
      content_name: params.content_name || 'call_service',
      content_type: params.content_type || 'service',
      content_ids: params.content_id ? [params.content_id] : undefined,
      num_items: 1,
    });

    // Marquer comme tracke pour eviter doublons
    sessionStorage.setItem(purchaseKey, 'true');

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] Purchase tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur Purchase:', error);
  }
};

/**
 * Track un evenement InitiateCheckout (debut du paiement)
 */
export const trackMetaInitiateCheckout = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) return;

  try {
    window.fbq!('track', 'InitiateCheckout', {
      value: params?.value,
      currency: params?.currency || 'EUR',
      content_name: params?.content_name,
      content_category: params?.content_category,
      num_items: params?.num_items || 1,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] InitiateCheckout tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur InitiateCheckout:', error);
  }
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
 */
export const trackMetaCompleteRegistration = (params?: {
  content_name?: string;
  status?: string;
  value?: number;
  currency?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) return;

  try {
    window.fbq!('track', 'CompleteRegistration', {
      content_name: params?.content_name || 'user_registration',
      status: params?.status || 'completed',
      value: params?.value,
      currency: params?.currency || 'EUR',
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] CompleteRegistration tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur CompleteRegistration:', error);
  }
};

/**
 * Track un evenement ViewContent (page importante vue)
 */
export const trackMetaViewContent = (params?: {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
}): void => {
  if (!isFbqAvailable() || !hasMarketingConsent()) return;

  try {
    window.fbq!('track', 'ViewContent', {
      content_name: params?.content_name,
      content_category: params?.content_category,
      content_type: params?.content_type || 'service',
      content_ids: params?.content_ids,
      value: params?.value,
      currency: params?.currency || 'EUR',
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[MetaPixel] ViewContent tracked', 'color: #1877F2; font-weight: bold', params);
    }
  } catch (error) {
    console.error('[MetaPixel] Erreur ViewContent:', error);
  }
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

// Export default pour faciliter l'import
export default {
  isFbqAvailable,
  hasMarketingConsent,
  trackMetaPageView,
  trackMetaLead,
  trackMetaPurchase,
  trackMetaInitiateCheckout,
  trackMetaContact,
  trackMetaCompleteRegistration,
  trackMetaViewContent,
  trackMetaCustomEvent,
  updateMetaPixelConsent,
  PIXEL_ID,
};
