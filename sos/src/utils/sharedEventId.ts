// src/utils/sharedEventId.ts
// Generateur d'EventID unifie pour la deduplication Pixel/CAPI
// Ce fichier centralise la generation des IDs pour assurer la coherence entre:
// - Meta Pixel (frontend)
// - Meta CAPI (backend/Firebase Functions)
// - Ad Attribution Service (Firestore)
//
// IMPORTANT: Toutes les generations d'event_id DOIVENT passer par ce fichier
// pour garantir la deduplication correcte entre Pixel et CAPI.
// Meta utilise event_id pour detecter les doublons et eviter le double-counting.

const STORAGE_KEY = 'sos_last_event_ids';

/**
 * Prefixes standardises pour chaque type d'evenement
 * Permet d'identifier rapidement l'origine et le type dans les logs Meta
 */
export const EVENT_PREFIXES = {
  // Evenements standards Meta
  pageview: 'pgv',
  lead: 'led',
  purchase: 'pur',
  checkout: 'chk',
  registration: 'reg',
  startRegistration: 'srg',
  contact: 'cnt',
  search: 'src',
  viewContent: 'viw',
  addToCart: 'atc',
  addPaymentInfo: 'api',
  // Custom events
  startTrial: 'trl',
  custom: 'cst',
  // Sources
  pixel: 'pxl',
  capi: 'cap',
  attribution: 'atr',
} as const;

export type EventPrefix = typeof EVENT_PREFIXES[keyof typeof EVENT_PREFIXES];

/**
 * Genere un EventID unique au format unifie
 * Format: {prefix}_{timestamp}_{random}
 *
 * Le format est concu pour etre compatible avec:
 * - Meta Pixel (accepte tout format string)
 * - Meta CAPI (event_id field)
 * - Firestore (event_id field)
 *
 * IMPORTANT: Ce format est unifie entre frontend (Pixel) et backend (CAPI)
 * pour permettre la deduplication correcte des evenements.
 * Meta utilise event_id pour detecter les doublons Pixel/CAPI.
 *
 * @param prefix Prefixe optionnel pour identifier le type d'evenement
 * @returns EventID unique
 */
export const generateSharedEventId = (prefix: string = 'evt'): string => {
  const timestamp = Date.now();
  // 13 caracteres aleatoires (compatible avec CAPI backend qui utilise substring(2,15))
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Types d'evenements supportes pour la generation d'IDs
 */
export type EventType =
  | 'pageview'
  | 'lead'
  | 'purchase'
  | 'checkout'
  | 'registration'
  | 'startRegistration'
  | 'contact'
  | 'search'
  | 'viewContent'
  | 'addToCart'
  | 'addPaymentInfo'
  | 'startTrial'
  | 'custom';

/**
 * Genere un EventID pour un type d'evenement specifique
 * Utilise les prefixes standardises pour tracer l'origine dans les logs Meta
 */
export const generateEventIdForType = (eventType: EventType): string => {
  const prefix = EVENT_PREFIXES[eventType] || EVENT_PREFIXES.custom;
  return generateSharedEventId(prefix);
};

/**
 * Interface pour stocker les EventIDs avec leur contexte
 */
export interface StoredEventId {
  eventId: string;
  eventType: string;
  createdAt: number;
  orderId?: string;
  sessionId?: string;
}

/**
 * Stocke un EventID en sessionStorage pour permettre le partage
 * entre Pixel (frontend) et les appels backend
 *
 * @param key Cle unique (ex: orderId, callId)
 * @param eventId L'EventID genere
 * @param eventType Type d'evenement
 */
export const storeEventId = (key: string, eventId: string, eventType: string): void => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const eventIds: Record<string, StoredEventId> = stored ? JSON.parse(stored) : {};

    eventIds[key] = {
      eventId,
      eventType,
      createdAt: Date.now(),
    };

    // Nettoyer les anciens (plus de 1 heure)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const k of Object.keys(eventIds)) {
      if (eventIds[k].createdAt < oneHourAgo) {
        delete eventIds[k];
      }
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(eventIds));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SharedEventId] Error storing event ID:', e);
    }
  }
};

/**
 * Recupere un EventID stocke par sa cle
 *
 * @param key Cle unique (ex: orderId, callId)
 * @returns L'EventID stocke ou null si non trouve
 */
export const getStoredEventId = (key: string): string | null => {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const eventIds: Record<string, StoredEventId> = JSON.parse(stored);
    const entry = eventIds[key];

    if (entry) {
      // Verifier que l'entree n'est pas trop ancienne (1 heure max)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (entry.createdAt >= oneHourAgo) {
        return entry.eventId;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Genere ou recupere un EventID pour une cle donnee
 * Si un EventID existe deja pour cette cle, le retourne
 * Sinon, en genere un nouveau et le stocke
 *
 * IMPORTANT: Cette fonction est la methode recommandee pour les evenements
 * de conversion critiques (Purchase, Lead, Checkout) car elle garantit
 * que le meme ID sera utilise pour Pixel ET CAPI.
 *
 * @param key Cle unique (ex: orderId, callId, sessionId)
 * @param eventType Type d'evenement pour le prefixe
 * @returns L'EventID (existant ou nouveau)
 */
export const getOrCreateEventId = (
  key: string,
  eventType: EventType = 'custom'
): string => {
  // Essayer de recuperer un ID existant
  const existingId = getStoredEventId(key);
  if (existingId) {
    if (process.env.NODE_ENV === 'development') {
      console.log('%c[SharedEventId] Reusing existing ID for', 'color: #9333EA', key, existingId);
    }
    return existingId;
  }

  // Generer un nouvel ID
  const newId = generateEventIdForType(eventType);
  storeEventId(key, newId, eventType);

  if (process.env.NODE_ENV === 'development') {
    console.log('%c[SharedEventId] Generated new ID for', 'color: #9333EA', key, newId);
  }

  return newId;
};

/**
 * Efface un EventID stocke
 *
 * @param key Cle unique
 */
export const clearStoredEventId = (key: string): void => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const eventIds: Record<string, StoredEventId> = JSON.parse(stored);
    delete eventIds[key];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(eventIds));
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Efface tous les EventIDs stockes
 */
export const clearAllStoredEventIds = (): void => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Utilitaire pour recuperer l'event_id depuis les metadonnees (pour le backend)
 * Permet de passer l'ID du frontend au backend via les metadonnees Stripe/Firestore
 */
export const extractEventIdFromMetadata = (
  metadata: Record<string, string | undefined> | null | undefined
): string | undefined => {
  if (!metadata) return undefined;
  return metadata.pixelEventId || metadata.eventId || metadata.event_id;
};

/**
 * Prepare les metadonnees avec l'event_id pour Stripe/Firestore
 * A utiliser lors de la creation d'un PaymentIntent ou document
 */
export const createEventIdMetadata = (
  key: string,
  eventType: EventType
): { pixelEventId: string } => {
  const eventId = getOrCreateEventId(key, eventType);
  return { pixelEventId: eventId };
};

export default {
  generateSharedEventId,
  generateEventIdForType,
  storeEventId,
  getStoredEventId,
  getOrCreateEventId,
  clearStoredEventId,
  clearAllStoredEventIds,
  extractEventIdFromMetadata,
  createEventIdMetadata,
  EVENT_PREFIXES,
};
