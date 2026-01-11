// src/utils/trafficSource.ts
// Service de capture et stockage des sources de trafic (UTM, referrer, etc.)
// Préparé pour: Facebook Ads, Instagram, TikTok, YouTube, Google Ads

import { getMetaIdentifiers, captureAndStoreMetaIdentifiers } from './fbpCookie';

export interface TrafficSource {
  // UTM Parameters
  utm_source?: string;      // facebook, instagram, tiktok, youtube, google
  utm_medium?: string;      // cpc, cpm, social, email, organic
  utm_campaign?: string;    // nom_campagne
  utm_content?: string;     // variante_pub
  utm_term?: string;        // mot_cle

  // Meta/Facebook specific
  fbclid?: string;          // Facebook Click ID
  fbp?: string;             // Facebook Browser ID (cookie _fbp)
  fbc?: string;             // Facebook Click ID encoded for CAPI

  // Google specific
  gclid?: string;           // Google Click ID
  gad_source?: string;      // Google Ads source

  // TikTok specific
  ttclid?: string;          // TikTok Click ID

  // General
  referrer?: string;        // Document referrer
  landing_page?: string;    // Page d'atterrissage
  timestamp?: string;       // Moment de capture
  session_id?: string;      // ID de session unique

  // User Geolocation & Locale
  user_country?: string;    // Pays de l'utilisateur (ISO 3166-1 alpha-2)
  user_timezone?: string;   // Timezone de l'utilisateur (ex: Europe/Paris)
  user_language?: string;   // Langue préférée du navigateur (ex: fr-FR)
}

const STORAGE_KEY = 'sos_traffic_source';
const SESSION_KEY = 'sos_session_id';

/**
 * Mapping des timezones vers les codes pays ISO 3166-1 alpha-2
 * Couvre les principales timezones pour les marchés cibles
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Europe
  'Europe/Paris': 'FR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Lisbon': 'PT',
  'Europe/Dublin': 'IE',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Kiev': 'UA',
  'Europe/Luxembourg': 'LU',
  'Europe/Monaco': 'MC',

  // Amérique du Nord
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Tijuana': 'MX',

  // Amérique du Sud
  'America/Sao_Paulo': 'BR',
  'America/Rio_Branco': 'BR',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  'America/Bogota': 'CO',
  'America/Caracas': 'VE',

  // Asie
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Taipei': 'TW',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Jerusalem': 'IL',
  'Asia/Kolkata': 'IN',
  'Asia/Mumbai': 'IN',

  // Océanie
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',

  // Afrique
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE',
  'Africa/Abidjan': 'CI',
  'Africa/Dakar': 'SN',

  // Caraïbes / DOM-TOM
  'America/Guadeloupe': 'GP',
  'America/Martinique': 'MQ',
  'America/Cayenne': 'GF',
  'Indian/Reunion': 'RE',
  'Indian/Mauritius': 'MU',
  'Pacific/Tahiti': 'PF',
  'Pacific/Noumea': 'NC',
};

/**
 * Détecte le pays de l'utilisateur à partir de la timezone ou de la langue du navigateur
 * @returns Code pays ISO 3166-1 alpha-2 ou undefined si non détectable
 */
export const detectUserCountry = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  try {
    // 1. Essayer d'abord avec la timezone (plus précis)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && TIMEZONE_TO_COUNTRY[timezone]) {
      return TIMEZONE_TO_COUNTRY[timezone];
    }

    // 2. Fallback: extraire le pays depuis navigator.language (ex: 'fr-FR' -> 'FR')
    const language = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage;
    if (language) {
      // Format peut être 'fr', 'fr-FR', 'en-US', etc.
      const parts = language.split('-');
      if (parts.length >= 2) {
        // Prendre la partie pays (après le tiret) et la mettre en majuscules
        return parts[1].toUpperCase();
      }
      // Si pas de partie pays, mapper les langues communes aux pays principaux
      const languageToCountry: Record<string, string> = {
        'fr': 'FR',
        'en': 'US',
        'de': 'DE',
        'es': 'ES',
        'it': 'IT',
        'pt': 'PT',
        'nl': 'NL',
        'pl': 'PL',
        'ru': 'RU',
        'ja': 'JP',
        'ko': 'KR',
        'zh': 'CN',
        'ar': 'SA',
      };
      return languageToCountry[parts[0].toLowerCase()];
    }
  } catch (e) {
    console.warn('[TrafficSource] Country detection error:', e);
  }

  return undefined;
};

/**
 * Récupère la timezone de l'utilisateur
 */
export const getUserTimezone = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

/**
 * Récupère la langue préférée du navigateur
 */
export const getUserLanguage = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    return navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Génère un ID de session unique
 */
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Récupère ou crée l'ID de session
 */
export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Capture les paramètres UTM et autres identifiants publicitaires depuis l'URL
 */
export const captureTrafficSource = (): TrafficSource | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);

  const trafficSource: TrafficSource = {
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    landing_page: window.location.pathname,
    referrer: document.referrer || undefined,
    // User geolocation & locale detection
    user_country: detectUserCountry(),
    user_timezone: getUserTimezone(),
    user_language: getUserLanguage(),
  };

  // UTM Parameters
  const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  utmParams.forEach(param => {
    const value = urlParams.get(param);
    if (value) {
      (trafficSource as Record<string, string>)[param] = value;
    }
  });

  // Platform-specific Click IDs
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    trafficSource.fbclid = fbclid;
    // Auto-detect source if not specified
    if (!trafficSource.utm_source) {
      trafficSource.utm_source = 'facebook';
      trafficSource.utm_medium = 'cpc';
    }
  }

  // Capture Meta identifiers (fbp/fbc) for CAPI attribution
  // fbp comes from _fbp cookie (created by Meta Pixel)
  // fbc is generated from fbclid in Meta's required format
  const metaIds = captureAndStoreMetaIdentifiers(fbclid);
  if (metaIds.fbp) {
    trafficSource.fbp = metaIds.fbp;
  }
  if (metaIds.fbc) {
    trafficSource.fbc = metaIds.fbc;
  }

  const gclid = urlParams.get('gclid');
  if (gclid) {
    trafficSource.gclid = gclid;
    if (!trafficSource.utm_source) {
      trafficSource.utm_source = 'google';
      trafficSource.utm_medium = 'cpc';
    }
  }

  const gad_source = urlParams.get('gad_source');
  if (gad_source) {
    trafficSource.gad_source = gad_source;
  }

  const ttclid = urlParams.get('ttclid');
  if (ttclid) {
    trafficSource.ttclid = ttclid;
    if (!trafficSource.utm_source) {
      trafficSource.utm_source = 'tiktok';
      trafficSource.utm_medium = 'cpc';
    }
  }

  // Detect source from referrer if no UTM
  if (!trafficSource.utm_source && trafficSource.referrer) {
    const referrerSource = detectSourceFromReferrer(trafficSource.referrer);
    if (referrerSource) {
      trafficSource.utm_source = referrerSource;
      trafficSource.utm_medium = 'organic';
    }
  }

  // Ne stocker que si on a des infos utiles (pas juste session_id)
  const hasTrackingData = trafficSource.utm_source ||
                          trafficSource.fbclid ||
                          trafficSource.fbp ||
                          trafficSource.fbc ||
                          trafficSource.gclid ||
                          trafficSource.ttclid ||
                          trafficSource.referrer;

  if (hasTrackingData) {
    storeTrafficSource(trafficSource);

    if (process.env.NODE_ENV === 'development') {
      console.log('%c[TrafficSource] Captured:', 'color: #4CAF50; font-weight: bold', trafficSource);
    }

    return trafficSource;
  }

  return null;
};

/**
 * Détecte la source depuis le referrer
 */
const detectSourceFromReferrer = (referrer: string): string | null => {
  const referrerLower = referrer.toLowerCase();

  const sourceMap: Record<string, string[]> = {
    'facebook': ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'],
    'instagram': ['instagram.com', 'l.instagram.com'],
    'tiktok': ['tiktok.com', 'vm.tiktok.com'],
    'youtube': ['youtube.com', 'youtu.be', 'm.youtube.com'],
    'google': ['google.com', 'google.fr', 'google.de', 'google.es', 'google.it'],
    'twitter': ['twitter.com', 't.co', 'x.com'],
    'linkedin': ['linkedin.com', 'lnkd.in'],
    'reddit': ['reddit.com'],
    'pinterest': ['pinterest.com', 'pin.it'],
  };

  for (const [source, domains] of Object.entries(sourceMap)) {
    if (domains.some(domain => referrerLower.includes(domain))) {
      return source;
    }
  }

  return null;
};

/**
 * Stocke la source de trafic dans localStorage (persiste entre sessions)
 * et sessionStorage (pour la session courante)
 */
const storeTrafficSource = (source: TrafficSource): void => {
  try {
    // Session storage - pour cette session uniquement
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source));

    // Local storage - première touche (first-touch attribution)
    // Ne pas écraser si déjà présent
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(source));
    }

    // Stocker aussi la dernière source (last-touch attribution)
    localStorage.setItem(`${STORAGE_KEY}_last`, JSON.stringify(source));

  } catch (e) {
    console.warn('[TrafficSource] Storage error:', e);
  }
};

/**
 * Récupère la source de trafic de la session courante
 */
export const getCurrentTrafficSource = (): TrafficSource | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Récupère la première source de trafic (first-touch)
 */
export const getFirstTouchSource = (): TrafficSource | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Récupère la dernière source de trafic (last-touch)
 */
export const getLastTouchSource = (): TrafficSource | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_last`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Prépare les données de source pour stockage en Firestore avec une conversion
 */
export const getTrafficSourceForConversion = (): {
  firstTouch: TrafficSource | null;
  lastTouch: TrafficSource | null;
  currentSession: TrafficSource | null;
} => {
  return {
    firstTouch: getFirstTouchSource(),
    lastTouch: getLastTouchSource(),
    currentSession: getCurrentTrafficSource(),
  };
};

/**
 * Normalise le nom de la source pour l'affichage
 */
export const normalizeSourceName = (source: string | undefined): string => {
  if (!source) return 'Direct';

  const sourceMap: Record<string, string> = {
    'facebook': 'Facebook',
    'fb': 'Facebook',
    'instagram': 'Instagram',
    'ig': 'Instagram',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'yt': 'YouTube',
    'google': 'Google',
    'twitter': 'Twitter/X',
    'x': 'Twitter/X',
    'linkedin': 'LinkedIn',
    'email': 'Email',
    'newsletter': 'Newsletter',
  };

  return sourceMap[source.toLowerCase()] || source;
};

/**
 * Retourne la couleur associée à une source
 */
export const getSourceColor = (source: string | undefined): string => {
  if (!source) return '#9CA3AF'; // Gray

  const colorMap: Record<string, string> = {
    'facebook': '#1877F2',
    'instagram': '#E4405F',
    'tiktok': '#000000',
    'youtube': '#FF0000',
    'google': '#4285F4',
    'twitter': '#1DA1F2',
    'linkedin': '#0A66C2',
    'email': '#10B981',
    'direct': '#9CA3AF',
  };

  return colorMap[source.toLowerCase()] || '#6B7280';
};

/**
 * Efface toutes les données de source de trafic
 */
export const clearTrafficSourceData = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_last`);
  } catch (e) {
    console.warn('[TrafficSource] Clear error:', e);
  }
};

export default {
  captureTrafficSource,
  getCurrentTrafficSource,
  getFirstTouchSource,
  getLastTouchSource,
  getTrafficSourceForConversion,
  normalizeSourceName,
  getSourceColor,
  getSessionId,
  clearTrafficSourceData,
  // User geolocation & locale utilities
  detectUserCountry,
  getUserTimezone,
  getUserLanguage,
};
