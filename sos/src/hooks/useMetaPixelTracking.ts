// src/hooks/useMetaPixelTracking.ts
// Hook pour faciliter le tracking Meta Pixel dans les composants React

import { useCallback } from 'react';
import {
  trackMetaLead,
  trackMetaInitiateCheckout,
  trackMetaViewContent,
  trackMetaContact,
  trackMetaCompleteRegistration,
  trackMetaCustomEvent,
  isFbqAvailable,
} from '@/utils/metaPixel';

type ProviderType = 'lawyer' | 'expat' | 'general';

interface UseMetaPixelTrackingReturn {
  /** Track un evenement Lead (clic sur "Request a call", "Book consultation", etc.) */
  trackLead: (providerType?: ProviderType, contentName?: string) => void;
  /** Track un evenement InitiateCheckout (debut du processus de paiement) */
  trackCheckoutStart: (value?: number, currency?: string, providerType?: ProviderType) => void;
  /** Track un evenement ViewContent (page importante vue) */
  trackViewContent: (contentName: string, contentCategory?: string, value?: number) => void;
  /** Track un evenement Contact (formulaire de contact soumis) */
  trackContact: (contentName?: string) => void;
  /** Track un evenement CompleteRegistration (inscription terminee) */
  trackRegistration: (userType?: string, value?: number) => void;
  /** Track un evenement custom */
  trackCustom: (eventName: string, params?: Record<string, unknown>) => void;
  /** Verifie si le pixel est disponible */
  isPixelAvailable: boolean;
}

/**
 * Hook pour tracker les evenements Meta Pixel
 *
 * @example
 * ```tsx
 * const { trackLead, trackCheckoutStart } = useMetaPixelTracking();
 *
 * // Sur clic bouton "Book Consultation"
 * <button onClick={() => {
 *   trackLead('lawyer', 'book_consultation');
 *   navigate('/sos-appel');
 * }}>
 *   Book Consultation
 * </button>
 * ```
 */
export const useMetaPixelTracking = (): UseMetaPixelTrackingReturn => {
  const trackLead = useCallback((
    providerType: ProviderType = 'general',
    contentName = 'consultation_request'
  ) => {
    trackMetaLead({
      content_name: contentName,
      content_category: providerType,
    });
  }, []);

  const trackCheckoutStart = useCallback((
    value?: number,
    currency = 'EUR',
    providerType: ProviderType = 'general'
  ) => {
    trackMetaInitiateCheckout({
      value,
      currency,
      content_name: `${providerType}_call`,
      content_category: providerType,
      num_items: 1,
    });
  }, []);

  const trackViewContent = useCallback((
    contentName: string,
    contentCategory?: string,
    value?: number
  ) => {
    trackMetaViewContent({
      content_name: contentName,
      content_category: contentCategory,
      value,
      currency: 'EUR',
    });
  }, []);

  const trackContact = useCallback((contentName = 'contact_form') => {
    trackMetaContact({
      content_name: contentName,
      content_category: 'support',
    });
  }, []);

  const trackRegistration = useCallback((
    userType = 'user',
    value?: number
  ) => {
    trackMetaCompleteRegistration({
      content_name: `${userType}_registration`,
      status: 'completed',
      value,
      currency: 'EUR',
    });
  }, []);

  const trackCustom = useCallback((
    eventName: string,
    params?: Record<string, unknown>
  ) => {
    trackMetaCustomEvent(eventName, params);
  }, []);

  return {
    trackLead,
    trackCheckoutStart,
    trackViewContent,
    trackContact,
    trackRegistration,
    trackCustom,
    isPixelAvailable: isFbqAvailable(),
  };
};

export default useMetaPixelTracking;
