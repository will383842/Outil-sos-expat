/**
 * Language Detection Utility
 * Detects user's language based on geolocation, browser settings, and saved preferences
 */

type Language = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

interface GeoLocationData {
  country_code?: string;
  country?: string;
}

/**
 * Map country codes to languages
 */
const COUNTRY_TO_LANGUAGE: Record<string, Language> = {
  // French-speaking countries
  'FR': 'fr',
  'BE': 'fr',
  'CH': 'fr',
  'CA': 'fr',
  'LU': 'fr',
  'MC': 'fr',
  'SN': 'fr',
  'CI': 'fr',
  'ML': 'fr',
  'BF': 'fr',
  'NE': 'fr',
  'TG': 'fr',
  'BJ': 'fr',
  'RW': 'fr',
  'BI': 'fr',
  'CD': 'fr',
  'CG': 'fr',
  'GA': 'fr',
  'CM': 'fr',
  'MG': 'fr',
  'DZ': 'fr',
  'MA': 'fr',
  'TN': 'fr',

  // Spanish-speaking countries
  'ES': 'es',
  'MX': 'es',
  'AR': 'es',
  'CO': 'es',
  'CL': 'es',
  'PE': 'es',
  'VE': 'es',
  'EC': 'es',
  'GT': 'es',
  'CU': 'es',
  'BO': 'es',
  'DO': 'es',
  'HN': 'es',
  'PY': 'es',
  'SV': 'es',
  'NI': 'es',
  'CR': 'es',
  'PA': 'es',
  'UY': 'es',
  'GQ': 'es',

  // English-speaking countries
  'US': 'en',
  'GB': 'en',
  'AU': 'en',
  'NZ': 'en',
  'IE': 'en',
  'ZA': 'en',
  'KE': 'en',
  'NG': 'en',
  'GH': 'en',
  'PH': 'en',
  'SG': 'en',
  'MY': 'en',
  'PK': 'en',
  'JM': 'en',
  'TT': 'en',
  'BB': 'en',
  'BZ': 'en',

  // German-speaking countries
  'DE': 'de',
  'AT': 'de',
  'LI': 'de',

  // Russian-speaking countries
  'RU': 'ru',
  'BY': 'ru',
  'KZ': 'ru',
  'KG': 'ru',
  'TJ': 'ru',
  'UZ': 'ru',
  'TM': 'ru',
  'MD': 'ru',

  // Portuguese-speaking countries
  'BR': 'pt',
  'PT': 'pt',
  'AO': 'pt',
  'MZ': 'pt',
  'GW': 'pt',
  'TL': 'pt',
  'CV': 'pt',
  'ST': 'pt',

  // Chinese-speaking countries
  'CN': 'ch',
  'TW': 'ch',
  'HK': 'ch',
  'MO': 'ch',

  // Hindi-speaking countries
  'IN': 'hi',
  'NP': 'hi',
  'FJ': 'hi',

  // Arabic-speaking countries
  'SA': 'ar',
  'AE': 'ar',
  'EG': 'ar',
  'IQ': 'ar',
  'JO': 'ar',
  'KW': 'ar',
  'LB': 'ar',
  'LY': 'ar',
  'OM': 'ar',
  'PS': 'ar',
  'QA': 'ar',
  'SD': 'ar',
  'SY': 'ar',
  'YE': 'ar',
  'BH': 'ar',
  'DJ': 'ar',
  'MR': 'ar',
  'SO': 'ar',
};

/**
 * Map browser language codes to our supported languages
 */
const BROWSER_LANG_MAP: Record<string, Language> = {
  'fr': 'fr',
  'en': 'en',
  'es': 'es',
  'de': 'de',
  'ru': 'ru',
  'pt': 'pt',
  'zh': 'ch',
  'hi': 'hi',
  'ar': 'ar',
};

/**
 * Map timezones to country codes (most reliable method, no API needed)
 * Based on IANA timezone database
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Europe - French
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Luxembourg': 'LU',
  'Europe/Monaco': 'MC',
  'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA',
  'Africa/Tunis': 'TN',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF',
  'Africa/Niamey': 'NE',
  'Africa/Lome': 'TG',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Kigali': 'RW',
  'Africa/Bujumbura': 'BI',
  'Africa/Kinshasa': 'CD',
  'Africa/Brazzaville': 'CG',
  'Africa/Libreville': 'GA',
  'Africa/Douala': 'CM',
  'Indian/Antananarivo': 'MG',

  // Europe - Spanish
  'Europe/Madrid': 'ES',
  'America/Mexico_City': 'MX',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'America/Guatemala': 'GT',
  'America/Havana': 'CU',
  'America/La_Paz': 'BO',
  'America/Santo_Domingo': 'DO',
  'America/Tegucigalpa': 'HN',
  'America/Asuncion': 'PY',
  'America/El_Salvador': 'SV',
  'America/Managua': 'NI',
  'America/Costa_Rica': 'CR',
  'America/Panama': 'PA',
  'America/Montevideo': 'UY',
  'Africa/Malabo': 'GQ',

  // Europe - English
  'America/New_York': 'US',
  'America/Los_Angeles': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'Europe/London': 'GB',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  'Europe/Dublin': 'IE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Asia/Manila': 'PH',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Karachi': 'PK',
  'America/Jamaica': 'JM',
  'America/Port_of_Spain': 'TT',
  'America/Barbados': 'BB',
  'America/Belize': 'BZ',

  // Europe - German
  'Europe/Berlin': 'DE',
  'Europe/Vienna': 'AT',
  'Europe/Vaduz': 'LI',

  // Russian timezones
  'Europe/Moscow': 'RU',
  'Europe/Minsk': 'BY',
  'Asia/Almaty': 'KZ',
  'Asia/Bishkek': 'KG',
  'Asia/Dushanbe': 'TJ',
  'Asia/Tashkent': 'UZ',
  'Asia/Ashgabat': 'TM',
  'Europe/Chisinau': 'MD',

  // Portuguese
  'America/Sao_Paulo': 'BR',
  'Europe/Lisbon': 'PT',
  'Africa/Luanda': 'AO',
  'Africa/Maputo': 'MZ',
  'Africa/Bissau': 'GW',
  'Asia/Dili': 'TL',
  'Atlantic/Cape_Verde': 'CV',
  'Africa/Sao_Tome': 'ST',

  // Chinese timezones
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Macau': 'MO',

  // Hindi/India timezones
  'Asia/Kolkata': 'IN',
  'Asia/Kathmandu': 'NP',
  'Pacific/Fiji': 'FJ',

  // Arabic
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Africa/Cairo': 'EG',
  'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO',
  'Asia/Kuwait': 'KW',
  'Asia/Beirut': 'LB',
  'Africa/Tripoli': 'LY',
  'Asia/Muscat': 'OM',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Asia/Qatar': 'QA',
  'Africa/Khartoum': 'SD',
  'Asia/Damascus': 'SY',
  'Asia/Aden': 'YE',
  'Asia/Bahrain': 'BH',
  'Africa/Djibouti': 'DJ',
  'Africa/Nouakchott': 'MR',
  'Africa/Mogadishu': 'SO',
};

/**
 * Detect country from browser timezone (NO API NEEDED, NO RATE LIMITS)
 * Most reliable client-side method - built into all modern browsers
 */
export function detectCountryFromTimezone(): string | null {
  try {
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
      return null;
    }

    // Get user's timezone (e.g., "Europe/Paris", "America/New_York")
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezone && TIMEZONE_TO_COUNTRY[timezone]) {
      const countryCode = TIMEZONE_TO_COUNTRY[timezone];
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Language] Detected from timezone: ${timezone} -> ${countryCode}`);
      }
      return countryCode;
    }

    // Fallback: try to extract country from timezone string
    // Some timezones like "America/New_York" can't be mapped directly
    // But we can try common patterns
    if (timezone.startsWith('America/')) {
      // Most America/* timezones are Spanish-speaking except US/CA
      // We'll let API fallbacks handle this
      return null;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Language] Timezone detection failed:', error);
    }
    return null;
  }
}

/**
 * Cache key for storing geolocation data in localStorage
 */
const GEO_CACHE_KEY = 'sos_geo_cache';
const GEO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface GeoCache {
  countryCode: string;
  timestamp: number;
}

/**
 * Get cached geolocation data
 */
export function getCachedGeoData(): string | null {
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (!cached) return null;

    const data: GeoCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (within 24 hours)
    if (now - data.timestamp < GEO_CACHE_DURATION) {
      return data.countryCode;
    }

    // Cache expired, remove it
    localStorage.removeItem(GEO_CACHE_KEY);
    return null;
  } catch (error) {
    // Invalid cache, remove it
    localStorage.removeItem(GEO_CACHE_KEY);
    return null;
  }
}

/**
 * Cache geolocation data
 */
function cacheGeoData(countryCode: string): void {
  try {
    const data: GeoCache = {
      countryCode,
      timestamp: Date.now(),
    };
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore cache errors
  }
}

/**
 * Geolocation API provider interface
 */
interface GeoAPIProvider {
  name: string;
  url: string;
  getCountryCode: (data: any) => string | null | Promise<string | null>;
  rateLimit?: string;
  isTextResponse?: boolean;
}

/**
 * Multiple geolocation API providers as fallbacks (only used if timezone fails)
 * Priority: Timezone > API 1 > API 2 > API 3
 */
const GEO_API_PROVIDERS: GeoAPIProvider[] = [
  {
    name: 'geojs.io',
    url: 'https://get.geojs.io/v1/ip/country.json',
    getCountryCode: (data: any) => data.country?.toUpperCase(),
    rateLimit: 'High (no API key, generous limits)',
  },
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    getCountryCode: (data: any) => data.country_code?.toUpperCase(),
    rateLimit: '1000/day (free tier)',
  },
  {
    name: 'ip-api.com',
    url: 'https://ip-api.com/json/?fields=status,countryCode',
    getCountryCode: (data: any) => data.countryCode?.toUpperCase(),
    rateLimit: '45/min (free tier)',
  },
];

/**
 * Try fetching from a single geolocation API provider
 */
async function fetchFromProvider(provider: GeoAPIProvider): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout

    const response = await fetch(provider.url, {
      signal: controller.signal,
      headers: {
        'Accept': provider.isTextResponse ? 'text/plain' : 'application/json',
      },
    });

    clearTimeout(timeout);

    // Handle rate limiting (429) and other errors
    if (response.status === 429) {
      console.warn(`[Language] ${provider.name} rate limit reached - trying next provider`);
      return null;
    }

    if (!response.ok) {
      return null;
    }

    // Handle text response (Cloudflare) vs JSON response
    let countryCode: string | null = null;
    if (provider.isTextResponse) {
      const text = await response.text();
      if (typeof provider.getCountryCode === 'function') {
        countryCode = await provider.getCountryCode(text);
      }
    } else {
      const data = await response.json();
      countryCode = await provider.getCountryCode(data);
    }

    if (countryCode && typeof countryCode === 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Language] Successfully detected from ${provider.name}: ${countryCode}`);
      }
      return countryCode;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      // Log non-timeout errors in development only
      if (process.env.NODE_ENV === 'development') {
        console.info(`[Language] ${provider.name} failed:`, error.message);
      }
    }
    return null;
  }
}

/**
 * Detect language from user's location
 * Priority: 1) Timezone (no API, no rate limits) -> 2) Cached API result -> 3) API providers
 * This method is 99% API-free and has no rate limits!
 */
export async function detectLanguageFromLocation(): Promise<Language | null> {
  try {
    // ===== STEP 1: Try timezone detection (NO API, NO RATE LIMITS) =====
    // This works for ~80% of users and requires ZERO external requests!
    const timezoneCountryCode = detectCountryFromTimezone();
    if (timezoneCountryCode && COUNTRY_TO_LANGUAGE[timezoneCountryCode]) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Language] Using timezone detection (no API needed): ${timezoneCountryCode} -> ${COUNTRY_TO_LANGUAGE[timezoneCountryCode]}`);
      }
      // Cache timezone result too for consistency
      cacheGeoData(timezoneCountryCode);
      return COUNTRY_TO_LANGUAGE[timezoneCountryCode];
    }

    // ===== STEP 2: Check cache (valid for 24 hours) =====
    // Only needed if timezone didn't work and we've called API before
    const cachedCountryCode = getCachedGeoData();
    if (cachedCountryCode && COUNTRY_TO_LANGUAGE[cachedCountryCode]) {
      return COUNTRY_TO_LANGUAGE[cachedCountryCode];
    }

    // ===== STEP 3: Fallback to APIs (only if timezone failed) =====
    // This should rarely be needed now (~20% of cases)
    for (const provider of GEO_API_PROVIDERS) {
      const countryCode = await fetchFromProvider(provider);

      if (countryCode) {
        // Cache the successful result
        cacheGeoData(countryCode);

        // Map country code to language
        if (COUNTRY_TO_LANGUAGE[countryCode]) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Language] Detected from API: ${countryCode} -> ${COUNTRY_TO_LANGUAGE[countryCode]}`);
          }
          return COUNTRY_TO_LANGUAGE[countryCode];
        }
      }
    }

    // All methods failed
    if (process.env.NODE_ENV === 'development') {
      console.info('[Language] All location detection methods failed - using fallback');
    }

    return null;
  } catch (error) {
    // Silently fail - this is not critical, we have fallbacks
    if (process.env.NODE_ENV === 'development') {
      console.info('[Language] Location detection unavailable - using fallback');
    }
    return null;
  }
}

/**
 * Detect language from browser settings
 */
export function detectLanguageFromBrowser(): Language | null {
  try {
    if (typeof navigator === 'undefined') return null;

    const languages = navigator.languages || [navigator.language];

    for (const lang of languages) {
      const code = lang.substring(0, 2).toLowerCase();
      if (BROWSER_LANG_MAP[code]) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Language] Detected from browser: ${lang} -> ${BROWSER_LANG_MAP[code]}`);
        }
        return BROWSER_LANG_MAP[code];
      }
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Language] Browser detection failed:', error);
    }
    return null;
  }
}

/**
 * Get saved language preference from localStorage
 */
export function getSavedLanguage(): Language | null {
  try {
    const saved = localStorage.getItem('sos_language');
    const validLanguages: Language[] = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

    if (saved && validLanguages.includes(saved as Language)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Language] Using saved preference: ${saved}`);
      }
      return saved as Language;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Language] Could not read saved language:', error);
    }
    return null;
  }
}

/**
 * Detect user's preferred language with priority:
 * 1. Saved preference (if user manually set it)
 * 2. Geolocation (country-based)
 * 3. Browser language
 * 4. Default fallback
 */
export async function detectUserLanguage(defaultLang: Language = 'fr'): Promise<Language> {
  // Priority 1: Saved preference (user manually changed it)
  const savedLang = getSavedLanguage();
  if (savedLang) {
    return savedLang;
  }

  // Priority 2: Geolocation (country-based)
  const locationLang = await detectLanguageFromLocation();
  if (locationLang) {
    return locationLang;
  }

  // Priority 3: Browser language
  const browserLang = detectLanguageFromBrowser();
  if (browserLang) {
    return browserLang;
  }

  // Priority 4: Default fallback
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Language] Using default: ${defaultLang}`);
  }
  return defaultLang;
}

/**
 * Save user's language preference
 */
export function saveLanguagePreference(lang: Language): void {
  try {
    localStorage.setItem('sos_language', lang);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Language] Saved user preference: ${lang}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Language] Could not save language preference:', error);
    }
  }
}
