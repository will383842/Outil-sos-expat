// src/hooks/useMetaTracking.ts
// Hook unifie pour le tracking Meta Pixel + CAPI
// Garantit la deduplication correcte entre frontend et backend

import { useCallback, useMemo } from 'react';
import {
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
  isFbqAvailable,
  getMetaIdentifiers,
  getStoredUserData,
} from '../utils/metaPixel';
import {
  getOrCreateEventId,
  generateEventIdForType,
  EventType,
} from '../utils/sharedEventId';
import { getSessionId, getCurrentTrafficSource } from '../utils/trafficSource';

// Types pour les reponses CAPI
interface CAPIResponse {
  success: boolean;
  eventId: string;
  eventType: string;
}

// Types pour les donnees de tracking
interface TrackingUserData {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
}

/**
 * Hook unifie pour le tracking Meta
 *
 * Ce hook combine le tracking Pixel (frontend) et CAPI (backend) avec:
 * - Generation d'event_id unifie pour la deduplication
 * - Envoi automatique au backend CAPI pour les evenements critiques
 * - Collecte des identifiants Meta (fbp, fbc) automatique
 *
 * @example
 * const { trackPurchase, trackLead, isPixelAvailable } = useMetaTracking();
 *
 * // Track un achat avec deduplication Pixel/CAPI
 * await trackPurchase({
 *   value: 49,
 *   currency: 'EUR',
 *   orderId: 'order_123',
 *   contentName: 'lawyer_call',
 * });
 */
// URL de l'endpoint CAPI (Cloud Function v2)
const CAPI_ENDPOINT = 'https://trackcapievent-5tfnuxa2hq-ew.a.run.app';

export const useMetaTracking = () => {
  const isDev = import.meta.env.DEV;

  // Fonction helper pour appeler le backend CAPI via HTTP POST
  const callCAPIEndpoint = useCallback(async (
    eventType: string,
    eventData: Record<string, unknown>,
    eventId: string
  ): Promise<CAPIResponse | null> => {
    try {
      // Collecter les donnees utilisateur et Meta
      const metaIds = getMetaIdentifiers();
      const storedUserData = getStoredUserData();
      const trafficSource = getCurrentTrafficSource();

      const requestBody = {
        eventType,
        eventId,
        ...eventData,
        // Ajouter les identifiants Meta
        fbp: metaIds.fbp,
        fbc: metaIds.fbc,
        // Ajouter les donnees utilisateur stockees
        email: storedUserData.em,
        phone: storedUserData.ph,
        firstName: storedUserData.fn,
        lastName: storedUserData.ln,
        country: storedUserData.country,
        userId: storedUserData.external_id,
        // URL source
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        // UTM params
        utm_source: trafficSource?.utm_source,
        utm_medium: trafficSource?.utm_medium,
        utm_campaign: trafficSource?.utm_campaign,
      };

      const response = await fetch(CAPI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`CAPI request failed: ${response.status}`);
      }

      const data: CAPIResponse = await response.json();

      if (isDev) {
        console.log('%c[MetaTracking] CAPI response:', 'color: #9333EA', data);
      }

      return data;
    } catch (error) {
      if (isDev) {
        console.warn('[MetaTracking] CAPI call failed:', error);
      }
      // Ne pas bloquer l'UX si CAPI echoue - le Pixel est deja envoye
      return null;
    }
  }, [isDev]);

  /**
   * Track un PageView (Pixel uniquement)
   */
  const trackPageView = useCallback(() => {
    const eventId = generateEventIdForType('pageview');
    trackMetaPageView({ eventID: eventId });
    return eventId;
  }, []);

  /**
   * Track un Lead avec deduplication Pixel/CAPI
   */
  const trackLead = useCallback(async (params: {
    contentName?: string;
    contentCategory?: string;
    value?: number;
    currency?: string;
    providerId?: string;
    providerType?: 'lawyer' | 'expat';
    key?: string; // Cle unique pour deduplication (ex: bookingRequestId)
  }) => {
    const key = params.key || `lead_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'lead');

    // Track Pixel
    trackMetaLead({
      content_name: params.contentName,
      content_category: params.contentCategory,
      value: params.value,
      currency: params.currency,
      eventID: eventId,
    });

    // Track CAPI pour meilleure attribution
    await callCAPIEndpoint('Lead', {
      contentName: params.contentName || 'lead',
      contentCategory: params.contentCategory || params.providerType || 'service',
      value: params.value,
      currency: params.currency || 'EUR',
      serviceType: params.providerType ? `${params.providerType}_consultation` : 'consultation',
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  /**
   * Track un Purchase avec deduplication Pixel/CAPI
   * IMPORTANT: L'evenement CAPI est envoye via le webhook Stripe
   * Ce hook envoie uniquement l'evenement Pixel
   */
  const trackPurchase = useCallback((params: {
    value: number;
    currency: string;
    orderId?: string;
    contentName?: string;
    contentId?: string;
    contentType?: string;
  }) => {
    const key = params.orderId || `purchase_${params.value}_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'purchase');

    // Track Pixel uniquement - CAPI est envoye par le webhook Stripe
    trackMetaPurchase({
      value: params.value,
      currency: params.currency,
      order_id: params.orderId,
      content_name: params.contentName,
      content_id: params.contentId,
      content_type: params.contentType,
      eventID: eventId,
    });

    return eventId;
  }, []);

  /**
   * Track un InitiateCheckout avec deduplication Pixel/CAPI
   */
  const trackInitiateCheckout = useCallback(async (params: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentCategory?: string;
    numItems?: number;
    key?: string; // Cle unique (ex: callSessionId)
  }) => {
    const key = params.key || `checkout_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'checkout');

    // Track Pixel
    trackMetaInitiateCheckout({
      value: params.value,
      currency: params.currency,
      content_name: params.contentName,
      content_category: params.contentCategory,
      num_items: params.numItems,
      eventID: eventId,
    });

    return eventId;
  }, []);

  /**
   * Track un Contact avec deduplication Pixel/CAPI
   */
  const trackContact = useCallback(async (params?: {
    contentName?: string;
    contentCategory?: string;
    key?: string;
  }) => {
    const key = params?.key || `contact_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'contact');

    // Track Pixel
    trackMetaContact({
      content_name: params?.contentName,
      content_category: params?.contentCategory,
    });

    // Track CAPI
    await callCAPIEndpoint('Contact', {
      contentName: params?.contentName || 'contact_form',
      contentCategory: params?.contentCategory || 'support',
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  /**
   * Track une inscription complete avec deduplication Pixel/CAPI
   */
  const trackRegistration = useCallback((params?: {
    contentName?: string;
    status?: string;
    value?: number;
    currency?: string;
    userId?: string;
  }) => {
    const key = params?.userId || `registration_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'registration');

    // Track Pixel uniquement - CAPI est envoye par le trigger Firestore
    trackMetaCompleteRegistration({
      content_name: params?.contentName,
      status: params?.status,
      value: params?.value,
      currency: params?.currency,
      eventID: eventId,
    });

    return eventId;
  }, []);

  /**
   * Track un debut d'inscription
   */
  const trackStartRegistration = useCallback((params?: {
    contentName?: string;
    country?: string;
  }) => {
    const eventId = generateEventIdForType('startRegistration');

    trackMetaStartRegistration({
      content_name: params?.contentName,
      country: params?.country,
      eventID: eventId,
    });

    return eventId;
  }, []);

  /**
   * Track une recherche avec CAPI
   */
  const trackSearch = useCallback(async (params?: {
    searchString?: string;
    contentCategory?: string;
    contentIds?: string[];
  }) => {
    const eventId = generateEventIdForType('search');

    // Track Pixel
    trackMetaSearch({
      search_string: params?.searchString,
      eventID: eventId,
    });

    // Track CAPI
    await callCAPIEndpoint('Search', {
      searchString: params?.searchString,
      contentCategory: params?.contentCategory || 'provider',
      contentIds: params?.contentIds,
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  /**
   * Track une vue de contenu avec CAPI
   */
  const trackViewContent = useCallback(async (params: {
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    contentType?: string;
    value?: number;
    currency?: string;
  }) => {
    const eventId = generateEventIdForType('viewContent');

    // Track Pixel
    trackMetaViewContent({
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: params.contentType,
      value: params.value,
      currency: params.currency,
      eventID: eventId,
    });

    // Track CAPI
    await callCAPIEndpoint('ViewContent', {
      contentName: params.contentName,
      contentCategory: params.contentCategory,
      contentIds: params.contentIds,
      contentType: params.contentType,
      value: params.value,
      currency: params.currency,
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  /**
   * Track un ajout au panier avec CAPI
   */
  const trackAddToCart = useCallback(async (params: {
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    value?: number;
    currency?: string;
    numItems?: number;
  }) => {
    const eventId = generateEventIdForType('addToCart');

    // Track Pixel
    trackMetaAddToCart({
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      value: params.value,
      currency: params.currency,
      eventID: eventId,
    });

    // Track CAPI
    await callCAPIEndpoint('AddToCart', {
      contentName: params.contentName,
      contentCategory: params.contentCategory,
      contentIds: params.contentIds,
      value: params.value,
      currency: params.currency,
      numItems: params.numItems || 1,
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  /**
   * Track un ajout d'info de paiement avec CAPI
   */
  const trackAddPaymentInfo = useCallback(async (params: {
    contentCategory?: string;
    contentIds?: string[];
    value?: number;
    currency?: string;
    key?: string; // Cle unique (ex: callSessionId)
  }) => {
    const key = params.key || `payment_info_${Date.now()}`;
    const eventId = getOrCreateEventId(key, 'addPaymentInfo');

    // Track Pixel
    trackMetaAddPaymentInfo({
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      value: params.value,
      currency: params.currency,
      eventID: eventId,
    });

    // Track CAPI
    await callCAPIEndpoint('AddPaymentInfo', {
      contentCategory: params.contentCategory,
      contentIds: params.contentIds,
      value: params.value,
      currency: params.currency,
    }, eventId);

    return eventId;
  }, [callCAPIEndpoint]);

  // Retourner l'etat et les fonctions
  return useMemo(() => ({
    // Etat
    isPixelAvailable: isFbqAvailable(),

    // Fonctions de tracking
    trackPageView,
    trackLead,
    trackPurchase,
    trackInitiateCheckout,
    trackContact,
    trackRegistration,
    trackStartRegistration,
    trackSearch,
    trackViewContent,
    trackAddToCart,
    trackAddPaymentInfo,

    // Utilitaires
    getMetaIdentifiers,
    getSessionId,
  }), [
    trackPageView,
    trackLead,
    trackPurchase,
    trackInitiateCheckout,
    trackContact,
    trackRegistration,
    trackStartRegistration,
    trackSearch,
    trackViewContent,
    trackAddToCart,
    trackAddPaymentInfo,
  ]);
};

export default useMetaTracking;
