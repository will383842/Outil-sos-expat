/**
 * Functional Analytics - Events pour le monitoring fonctionnel
 *
 * Ce module envoie des événements à Firestore pour alimenter le système
 * de monitoring fonctionnel qui détecte les problèmes avant les clients.
 *
 * IMPORTANT: Ces events sont différents de GA4/Meta Pixel.
 * Ils servent uniquement au monitoring interne.
 *
 * @version 1.0.0
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getCurrentCorrelationId } from './correlationId';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYTICS_COLLECTION = 'analytics_events';
const FORM_ERRORS_COLLECTION = 'form_errors';

// Rate limiting pour éviter le spam
const eventCache = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 event par seconde par type

// ============================================================================
// TYPES
// ============================================================================

export type FunctionalEventType =
  // Signup funnel
  | 'page_view_signup'
  | 'signup_form_start'
  | 'signup_form_submit'
  | 'signup_success'
  | 'signup_error'
  // Booking funnel
  | 'provider_search'
  | 'provider_view'
  | 'booking_start'
  | 'booking_complete'
  | 'booking_error'
  // Payment funnel
  | 'checkout_start'
  | 'payment_method_selected'
  | 'payment_attempt'
  | 'payment_success'
  | 'payment_error'
  // Form events
  | 'form_start'
  | 'form_submit'
  | 'form_error'
  // General
  | 'page_view';

export interface FunctionalEventData {
  eventType: FunctionalEventType;
  timestamp?: Date;
  sessionId?: string;
  userId?: string;
  userRole?: 'client' | 'provider' | 'admin' | 'anonymous';
  page?: string;
  formName?: string;
  providerId?: string;
  bookingId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface FormErrorData {
  formName: string;
  fieldName?: string;
  errorType: string;
  errorMessage: string;
  userInput?: string; // Ne jamais logger de données sensibles!
  userId?: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SESSION ID
// ============================================================================

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    // Essayer de récupérer depuis sessionStorage
    sessionId = sessionStorage.getItem('functional_session_id');

    if (!sessionId) {
      // Créer un nouveau session ID
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('functional_session_id', sessionId);
    }
  }

  return sessionId;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

function isRateLimited(eventType: string): boolean {
  const now = Date.now();
  const lastEvent = eventCache.get(eventType);

  if (lastEvent && now - lastEvent < RATE_LIMIT_MS) {
    return true;
  }

  eventCache.set(eventType, now);
  return false;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Envoie un événement d'analytics fonctionnel à Firestore
 */
export async function trackFunctionalEvent(data: FunctionalEventData): Promise<void> {
  // Rate limiting
  if (isRateLimited(data.eventType)) {
    return;
  }

  try {
    const eventDoc = {
      ...data,
      timestamp: serverTimestamp(),
      sessionId: data.sessionId || getSessionId(),
      correlationId: getCurrentCorrelationId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || null
    };

    // Supprimer les champs undefined
    Object.keys(eventDoc).forEach(key => {
      if ((eventDoc as Record<string, unknown>)[key] === undefined) {
        delete (eventDoc as Record<string, unknown>)[key];
      }
    });

    await addDoc(collection(db, ANALYTICS_COLLECTION), eventDoc);
  } catch (error) {
    // Silently fail - ne pas bloquer l'UX pour du monitoring
    console.warn('[FunctionalAnalytics] Failed to track event:', error);
  }
}

/**
 * Log une erreur de formulaire pour le monitoring
 */
export async function trackFormError(data: FormErrorData): Promise<void> {
  // Rate limiting plus strict pour les erreurs (éviter spam)
  if (isRateLimited(`form_error_${data.formName}_${data.errorType}`)) {
    return;
  }

  try {
    // Ne JAMAIS logger de données sensibles
    const sanitizedData = {
      ...data,
      // Masquer les données potentiellement sensibles
      userInput: data.userInput ? '[REDACTED]' : undefined
    };

    const errorDoc = {
      ...sanitizedData,
      timestamp: serverTimestamp(),
      sessionId: getSessionId(),
      correlationId: getCurrentCorrelationId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    await addDoc(collection(db, FORM_ERRORS_COLLECTION), errorDoc);
  } catch (error) {
    console.warn('[FunctionalAnalytics] Failed to track form error:', error);
  }
}

// ============================================================================
// SIGNUP FUNNEL TRACKING
// ============================================================================

/**
 * Track quand un user voit la page d'inscription
 */
export function trackSignupPageView(userRole: 'client' | 'provider' = 'client'): void {
  trackFunctionalEvent({
    eventType: 'page_view_signup',
    userRole,
    page: window.location.pathname
  });
}

/**
 * Track quand un user commence à remplir le formulaire
 */
export function trackSignupFormStart(userRole: 'client' | 'provider' = 'client'): void {
  trackFunctionalEvent({
    eventType: 'signup_form_start',
    userRole,
    formName: `signup_${userRole}`,
    page: window.location.pathname
  });
}

/**
 * Track quand un user soumet le formulaire d'inscription
 */
export function trackSignupFormSubmit(userRole: 'client' | 'provider' = 'client'): void {
  trackFunctionalEvent({
    eventType: 'signup_form_submit',
    userRole,
    formName: `signup_${userRole}`,
    page: window.location.pathname
  });
}

/**
 * Track inscription réussie
 */
export function trackSignupSuccess(userId: string, userRole: 'client' | 'provider' = 'client'): void {
  trackFunctionalEvent({
    eventType: 'signup_success',
    userId,
    userRole,
    formName: `signup_${userRole}`,
    page: window.location.pathname
  });
}

/**
 * Track erreur d'inscription
 */
export function trackSignupError(
  errorCode: string,
  errorMessage: string,
  userRole: 'client' | 'provider' = 'client'
): void {
  trackFunctionalEvent({
    eventType: 'signup_error',
    userRole,
    formName: `signup_${userRole}`,
    errorCode,
    errorMessage,
    page: window.location.pathname
  });

  trackFormError({
    formName: `signup_${userRole}`,
    errorType: errorCode,
    errorMessage,
    page: window.location.pathname
  });
}

// ============================================================================
// BOOKING FUNNEL TRACKING
// ============================================================================

/**
 * Track recherche de prestataire
 */
export function trackProviderSearch(filters?: Record<string, unknown>): void {
  trackFunctionalEvent({
    eventType: 'provider_search',
    page: window.location.pathname,
    metadata: filters
  });
}

/**
 * Track vue d'un profil prestataire
 */
export function trackProviderView(providerId: string): void {
  trackFunctionalEvent({
    eventType: 'provider_view',
    providerId,
    page: window.location.pathname
  });
}

/**
 * Track début de réservation
 */
export function trackBookingStart(providerId: string, amount?: number, currency?: string): void {
  trackFunctionalEvent({
    eventType: 'booking_start',
    providerId,
    amount,
    currency,
    page: window.location.pathname
  });
}

/**
 * Track réservation complétée
 */
export function trackBookingComplete(
  bookingId: string,
  providerId: string,
  amount: number,
  currency: string
): void {
  trackFunctionalEvent({
    eventType: 'booking_complete',
    bookingId,
    providerId,
    amount,
    currency,
    page: window.location.pathname
  });
}

/**
 * Track erreur de réservation
 */
export function trackBookingError(
  providerId: string,
  errorCode: string,
  errorMessage: string
): void {
  trackFunctionalEvent({
    eventType: 'booking_error',
    providerId,
    errorCode,
    errorMessage,
    page: window.location.pathname
  });

  trackFormError({
    formName: 'booking',
    errorType: errorCode,
    errorMessage,
    page: window.location.pathname,
    metadata: { providerId }
  });
}

// ============================================================================
// PAYMENT FUNNEL TRACKING
// ============================================================================

/**
 * Track début du checkout
 */
export function trackCheckoutStart(amount: number, currency: string): void {
  trackFunctionalEvent({
    eventType: 'checkout_start',
    amount,
    currency,
    page: window.location.pathname
  });
}

/**
 * Track sélection de méthode de paiement
 */
export function trackPaymentMethodSelected(method: 'stripe' | 'paypal'): void {
  trackFunctionalEvent({
    eventType: 'payment_method_selected',
    page: window.location.pathname,
    metadata: { method }
  });
}

/**
 * Track tentative de paiement
 */
export function trackPaymentAttempt(
  paymentId: string,
  amount: number,
  currency: string,
  method: 'stripe' | 'paypal'
): void {
  trackFunctionalEvent({
    eventType: 'payment_attempt',
    paymentId,
    amount,
    currency,
    page: window.location.pathname,
    metadata: { method }
  });
}

/**
 * Track paiement réussi
 */
export function trackPaymentSuccess(
  paymentId: string,
  amount: number,
  currency: string,
  method: 'stripe' | 'paypal'
): void {
  trackFunctionalEvent({
    eventType: 'payment_success',
    paymentId,
    amount,
    currency,
    page: window.location.pathname,
    metadata: { method }
  });
}

/**
 * Track erreur de paiement
 */
export function trackPaymentError(
  errorCode: string,
  errorMessage: string,
  method: 'stripe' | 'paypal',
  amount?: number,
  currency?: string
): void {
  trackFunctionalEvent({
    eventType: 'payment_error',
    errorCode,
    errorMessage,
    amount,
    currency,
    page: window.location.pathname,
    metadata: { method }
  });

  trackFormError({
    formName: `payment_${method}`,
    errorType: errorCode,
    errorMessage,
    page: window.location.pathname
  });
}

// ============================================================================
// GENERIC FORM TRACKING
// ============================================================================

/**
 * Track début de remplissage d'un formulaire
 */
export function trackFormStart(formName: string): void {
  trackFunctionalEvent({
    eventType: 'form_start',
    formName,
    page: window.location.pathname
  });
}

/**
 * Track soumission d'un formulaire
 */
export function trackFormSubmit(formName: string, success: boolean = true): void {
  trackFunctionalEvent({
    eventType: 'form_submit',
    formName,
    page: window.location.pathname,
    metadata: { success }
  });
}

/**
 * Track erreur sur un formulaire (générique)
 */
export function trackGenericFormError(
  formName: string,
  fieldName: string,
  errorType: string,
  errorMessage: string
): void {
  trackFormError({
    formName,
    fieldName,
    errorType,
    errorMessage,
    page: window.location.pathname
  });

  trackFunctionalEvent({
    eventType: 'form_error',
    formName,
    errorCode: errorType,
    errorMessage,
    page: window.location.pathname,
    metadata: { fieldName }
  });
}

// ============================================================================
// HOOK FOR REACT
// ============================================================================

/**
 * Hook pour tracker les erreurs de formulaire avec React Hook Form
 */
export function createFormErrorHandler(formName: string) {
  return function handleFormError(errors: Record<string, { type?: string; message?: string }>) {
    Object.entries(errors).forEach(([fieldName, error]) => {
      if (error && error.message) {
        trackGenericFormError(
          formName,
          fieldName,
          error.type || 'validation',
          error.message
        );
      }
    });
  };
}

// ============================================================================
// EXPORT BATCH FOR COMPONENTS
// ============================================================================

export const signupFunnelTracking = {
  pageView: trackSignupPageView,
  formStart: trackSignupFormStart,
  formSubmit: trackSignupFormSubmit,
  success: trackSignupSuccess,
  error: trackSignupError
};

export const bookingFunnelTracking = {
  search: trackProviderSearch,
  providerView: trackProviderView,
  start: trackBookingStart,
  complete: trackBookingComplete,
  error: trackBookingError
};

export const paymentFunnelTracking = {
  checkoutStart: trackCheckoutStart,
  methodSelected: trackPaymentMethodSelected,
  attempt: trackPaymentAttempt,
  success: trackPaymentSuccess,
  error: trackPaymentError
};
