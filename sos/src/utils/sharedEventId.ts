// src/utils/sharedEventId.ts
// Generateur d'EventID unifie pour la deduplication Pixel/CAPI
// Ce fichier centralise la generation des IDs pour assurer la coherence entre:
// - Meta Pixel (frontend)
// - Meta CAPI (backend/Firebase Functions)
// - Ad Attribution Service (Firestore)

const STORAGE_KEY = 'sos_last_event_ids';

/**
 * Genere un EventID unique au format unifie
 * Format: {prefix}_{timestamp}_{random}
 *
 * Le format est concu pour etre compatible avec:
 * - Meta Pixel (accepte tout format string)
 * - Meta CAPI (event_id field)
 * - Firestore (event_id field)
 *
 * @param prefix Prefixe optionnel pour identifier le type d'evenement
 * @returns EventID unique
 */
export const generateSharedEventId = (prefix: string = 'evt'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11); // 9 caracteres aleatoires
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Genere un EventID pour un type d'evenement specifique
 * Permet de tracer l'origine de l'evenement dans les logs
 */
export const generateEventIdForType = (
  eventType: 'purchase' | 'lead' | 'registration' | 'checkout' | 'contact' | 'view' | 'custom'
): string => {
  const prefixMap: Record<string, string> = {
    purchase: 'pur',
    lead: 'led',
    registration: 'reg',
    checkout: 'chk',
    contact: 'cnt',
    view: 'viw',
    custom: 'cst',
  };
  const prefix = prefixMap[eventType] || 'evt';
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
 * @param key Cle unique (ex: orderId, callId)
 * @param eventType Type d'evenement pour le prefixe
 * @returns L'EventID (existant ou nouveau)
 */
export const getOrCreateEventId = (
  key: string,
  eventType: 'purchase' | 'lead' | 'registration' | 'checkout' | 'contact' | 'view' | 'custom' = 'custom'
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

export default {
  generateSharedEventId,
  generateEventIdForType,
  storeEventId,
  getStoredEventId,
  getOrCreateEventId,
  clearStoredEventId,
  clearAllStoredEventIds,
};
