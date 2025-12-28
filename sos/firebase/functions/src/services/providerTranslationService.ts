// firebase/functions/src/services/providerTranslationService.ts
import * as admin from 'firebase-admin';
import { db, FieldValue } from '../utils/firebase';

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'pt' | 'de' | 'ru' | 'ch' | 'hi' | 'ar';

export interface OriginalProfile {
  // Store ALL data from sos_profiles (with index signature for flexibility)
  [key: string]: any;
  // Common fields that might be accessed
  bio?: string | Record<string, string>;
  description?: string;
  motivation?: string | Record<string, string>;
  professionalDescription?: string;
  experienceDescription?: string;
  specialties?: string[];
  helpTypes?: string[];
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}

export interface TranslatedContent {
  // ✅ TRANSLATED FIELDS
  title: string; // Provider name (kept as-is, not translated)
  summary: string; // Translated summary
  description: string; // Translated description
  specialties: string[]; // Translated specialties
  cta: string; 
  slug: string; 
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    h1: string;
    h2?: string;
    h3?: string;
    imageAltTexts: string[];
    jsonLd: Record<string, unknown>;
  };
  faq?: {
    questions: string[];
    answers: string[];
    jsonLd: Record<string, unknown>;
  };
  
  // ❌ NON-TRANSLATABLE FIELDS (passed through from original, never translated)
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  barNumber?: string;
  yearsOfExperience?: number;
  yearsAsExpat?: number;
  lawSchool?: string;
  graduationYear?: number;
  certifications?: string[];
  education?: string | string[];
  responseTime?: string;
  rating?: number;
  reviewCount?: number;
  profilePhoto?: string;
  avatar?: string;
  photoURL?: string;
  languages?: string[];
  type?: 'lawyer' | 'expat';
  uid?: string;
}

export interface TranslationMetadata {
  status: 'missing' | 'created' | 'outdated' | 'frozen' | 'updated';
  createdAt?: admin.firestore.Timestamp | Date;
  updatedAt?: admin.firestore.Timestamp | Date;
  cost: number;
  userId?: string;
  version: number;
}

export interface ProviderTranslationDoc {
  original: OriginalProfile;
  translations: {
    [key in SupportedLanguage]?: TranslatedContent;
  };
  metadata: {
    availableLanguages: SupportedLanguage[];
    translationCosts: {
      [key in SupportedLanguage]?: {
        cost: number;
        date: admin.firestore.Timestamp | Date;
        userId?: string;
      };
    };
    totalCost: number;
    lastUpdated: admin.firestore.Timestamp | Date;
    createdAt: admin.firestore.Timestamp | Date;
    frozenLanguages: SupportedLanguage[];
    translations?: {
      [key in SupportedLanguage]?: TranslationMetadata;
    };
  };
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'];
const TRANSLATION_COST = 0.15; // €0.15 per translation

/**
 * Normalize language code to ISO 639-1 format
 **/

function normalizeLanguageCode(lang: string): string {
  const normalized = lang.toLowerCase().split('-')[0].trim();
  const langMap: Record<string, string> = {
    'de': 'de', 'german': 'de', 'deutsch': 'de',
    'fr': 'fr', 'french': 'fr', 'francais': 'fr', 'français': 'fr',
    'en': 'en', 'english': 'en', 'anglais': 'en',
    'es': 'es', 'spanish': 'es', 'espagnol': 'es', 'español': 'es',
    'pt': 'pt', 'portuguese': 'pt', 'portugais': 'pt', 'português': 'pt',
    'ru': 'ru', 'russian': 'ru', 'russe': 'ru', 'русский': 'ru',
    'ch': 'ch', 'chinese': 'ch', 'zh': 'ch', 'chinois': 'ch', '中文': 'ch',
    'hi': 'hi', 'hindi': 'hi', 'हिन्दी': 'hi',
    'ar': 'ar', 'arabic': 'ar', 'arabe': 'ar', 'العربية': 'ar',
  };
  return langMap[normalized] || normalized;
}


/**
 * Get language from country (fallback)
 */
function getLanguageFromCountry(country: string): string | null {
  const countryMap: Record<string, string> = {
    'germany': 'de', 'deutschland': 'de', 'allemagne': 'de',
    'france': 'fr', 'frankreich': 'fr',
    'spain': 'es', 'espagne': 'es', 'spanien': 'es',
    'portugal': 'pt',
    'russia': 'ru', 'russie': 'ru', 'russland': 'ru',
    'china': 'ch', 'chine': 'ch', 'chinesisch': 'ch',
    'india': 'hi', 'inde': 'hi',
    'saudi arabia': 'ar', 'arabie saoudite': 'ar',
  };
  const normalized = country.toLowerCase().trim();
  return countryMap[normalized] || null;
}

/**
 * Simple hash function for change detection
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect original language from provider data
 */
export function detectOriginalLanguage(profileData: any): string {
  // Priority 1: Explicit originalLanguage field
  if (profileData.originalLanguage) {
    return normalizeLanguageCode(profileData.originalLanguage);
  }
  
  // Priority 2: Preferred language
  if (profileData.preferredLanguage) {
    const lang = normalizeLanguageCode(profileData.preferredLanguage);
    if (lang) {
      return lang;
    }
  }
  
  // Priority 3: Main language (first in array)
  if (profileData.languages && Array.isArray(profileData.languages) && profileData.languages.length > 0) {
    const lang = normalizeLanguageCode(profileData.languages[0]);
    if (lang) {
      return lang;
    }
  }
  
  // Priority 4: Country-based inference
  if (profileData.country) {
    const countryLang = getLanguageFromCountry(profileData.country);
    if (countryLang) {
      return countryLang;
    }
  }
  
  // Fallback to English
  return 'en';
}

/**
 * Detect language from text content using heuristics
 * Analyzes common words and patterns to determine the language
 */
function detectLanguageFromText(text: string): SupportedLanguage | null {
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return null;
  }
  
  const normalized = text.toLowerCase();
  // const words = normalized.split(/\s+/);
  
  // Language-specific patterns and common words
  const patterns: Record<SupportedLanguage, { words: string[]; patterns: RegExp[] }> = {
    fr: {
      words: ['le', 'la', 'les', 'de', 'des', 'du', 'et', 'est', 'dans', 'pour', 'avec', 'sur', 'par', 'une', 'un', 'être', 'avoir', 'faire', 'aller', 'venir', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'c\'est', 'qu\'il', 'qu\'elle', 'très', 'plus', 'tout', 'tous', 'toute', 'toutes'],
      patterns: [/[àâäéèêëïîôùûüÿç]/g, /\b(le|la|les|de|des|du|et|est|dans|pour|avec|sur|par|une|un)\b/g]
    },
    en: {
      words: ['the', 'and', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about', 'into', 'through', 'during', 'including', 'against', 'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'an', 'a'],
      patterns: [/\b(the|and|is|are|was|were|been|have|has|had|do|does|did|will|would|could|should|this|that|these|those|with|from|for|about|into|through|during|including|against|among|throughout|despite|towards|upon|concerning|to|of|in|on|at|by|as|an|a)\b/g]
    },
    es: {
      words: ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'es', 'son', 'está', 'están', 'ser', 'estar', 'tener', 'hacer', 'ir', 'venir', 'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'muy', 'más', 'todo', 'todos', 'toda', 'todas', 'con', 'por', 'para', 'sobre', 'entre', 'desde', 'hasta', 'durante', 'mediante', 'según', 'un', 'una', 'unos', 'unas'],
      patterns: [/[áéíóúñü¿¡]/g, /\b(el|la|los|las|de|del|y|es|son|está|están|ser|estar|tener|hacer|ir|venir|yo|tú|él|ella|nosotros|vosotros|ellos|ellas|muy|más|todo|todos|toda|todas|con|por|para|sobre|entre|desde|hasta|durante|mediante|según|un|una|unos|unas)\b/g]
    },
    pt: {
      words: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'é', 'são', 'está', 'estão', 'ser', 'estar', 'ter', 'fazer', 'ir', 'vir', 'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'muito', 'mais', 'todo', 'todos', 'toda', 'todas', 'com', 'por', 'para', 'sobre', 'entre', 'desde', 'até', 'durante', 'mediante', 'segundo', 'um', 'uma', 'uns', 'umas'],
      patterns: [/[áàâãéêíóôõúç]/g, /\b(o|a|os|as|de|do|da|dos|das|e|é|são|está|estão|ser|estar|ter|fazer|ir|vir|eu|tu|ele|ela|nós|vós|eles|elas|muito|mais|todo|todos|toda|todas|com|por|para|sobre|entre|desde|até|durante|mediante|segundo|um|uma|uns|umas)\b/g]
    },
    de: {
      words: ['der', 'die', 'das', 'den', 'dem', 'des', 'und', 'ist', 'sind', 'war', 'waren', 'sein', 'haben', 'machen', 'gehen', 'kommen', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'sehr', 'mehr', 'alle', 'mit', 'von', 'für', 'über', 'zwischen', 'seit', 'bis', 'während', 'durch', 'gegen', 'ohne', 'um', 'ein', 'eine', 'einen', 'einem', 'eines'],
      patterns: [/[äöüß]/g, /\b(der|die|das|den|dem|des|und|ist|sind|war|waren|sein|haben|machen|gehen|kommen|ich|du|er|sie|es|wir|ihr|sie|sehr|mehr|alle|mit|von|für|über|zwischen|seit|bis|während|durch|gegen|ohne|um|ein|eine|einen|einem|eines)\b/g]
    },
    ru: {
      words: ['и', 'в', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'её', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'быть', 'был', 'была', 'были', 'было'],
      patterns: [/[а-яё]/g, /\b(и|в|не|что|он|на|я|с|со|как|а|то|все|она|так|его|но|да|ты|к|у|же|вы|за|бы|по|только|её|мне|было|вот|от|меня|еще|нет|о|из|ему|теперь|когда|даже|ну|вдруг|ли|если|уже|или|быть|был|была|были|было)\b/g]
    },
    ch: {
      words: ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'],
      patterns: [/[\u4e00-\u9fff]/g]
    },
    hi: {
      words: ['और', 'है', 'के', 'में', 'की', 'को', 'से', 'पर', 'यह', 'या', 'नहीं', 'हो', 'था', 'था', 'थे', 'थी', 'होता', 'होती', 'होते', 'मैं', 'तुम', 'वह', 'वे', 'हम', 'आप', 'यह', 'वह', 'सब', 'सभी', 'बहुत', 'अधिक', 'कम', 'पहले', 'बाद', 'अब', 'तब', 'कब', 'कहाँ', 'कैसे', 'क्यों', 'क्या', 'कौन'],
      patterns: [/[\u0900-\u097F]/g]
    },
    ar: {
      words: ['و', 'في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'ذلك', 'تلك', 'هو', 'هي', 'هم', 'هن', 'أنا', 'أنت', 'أنتم', 'أنتن', 'نحن', 'كان', 'كانت', 'كانوا', 'كن', 'يكون', 'تكون', 'يكونون', 'يكون', 'كل', 'جميع', 'كثير', 'قليل', 'أكثر', 'أقل', 'مع', 'بدون', 'حول', 'بين', 'منذ', 'حتى', 'خلال', 'ضد', 'نحو', 'عبر', 'بسبب', 'بعد', 'قبل', 'الآن', 'ثم', 'متى', 'أين', 'كيف', 'لماذا', 'ماذا', 'من'],
      patterns: [/[\u0600-\u06FF]/g]
    },
  };
  
  // Score each language
  const scores: Record<SupportedLanguage, number> = {
    fr: 0, en: 0, es: 0, pt: 0, de: 0, ru: 0, ch: 0, hi: 0, ar: 0
  };
  
  // Check for language-specific characters/patterns
  for (const [lang, config] of Object.entries(patterns)) {
    // Check for language-specific characters
    for (const pattern of config.patterns) {
      const matches = normalized.match(pattern);
      if (matches) {
        scores[lang as SupportedLanguage] += matches.length * 2; // Character patterns are strong indicators
      }
    }
    
    // Check for common words
    for (const word of config.words) {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = normalized.match(wordRegex);
      if (matches) {
        scores[lang as SupportedLanguage] += matches.length;
      }
    }
  }
  
  // Find the language with the highest score
  let maxScore = 0;
  let detectedLang: SupportedLanguage | null = null;
  
  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as SupportedLanguage;
    }
  }
  
  // Only return if we have a reasonable confidence (at least 3 matches)
  if (detectedLang && maxScore >= 3) {
    console.log(`[detectLanguageFromText] Detected language: ${detectedLang} (score: ${maxScore})`);
    return detectedLang;
  }
  
  return null;
}

/**
 * Detect the actual language of content in a LocalizedText object
 * Returns the language code of the version with the most content
 */
function detectContentLanguage(localizedText: any): string | null {
  if (!localizedText || typeof localizedText !== 'object' || Array.isArray(localizedText)) {
    return null;
  }
  
  let maxLength = 0;
  let detectedLang: string | null = null;
  const langLengths: Record<string, number> = {};
  
  // Find the language with the longest content (most likely the original)
  for (const key in localizedText) {
    if (typeof localizedText[key] === 'string') {
      const length = localizedText[key].trim().length;
      langLengths[key] = length;
      if (length > maxLength) {
        maxLength = length;
        detectedLang = key;
      }
    }
  }
  
  if (detectedLang) {
    console.log(`[detectContentLanguage] Detected language: ${detectedLang} (${maxLength} chars). Available languages:`, Object.keys(langLengths), 'Lengths:', langLengths);
  }
  
  return detectedLang;
}

/**
 * Safely extract string value from potentially complex data structure
 * Handles: string, LocalizedText object, array, null/undefined
 * Prioritizes the language with most content (likely the original) over preferredLang
 */
function extractStringValue(value: any, preferredLang?: string): string {
  if (!value) return '';
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value.trim();
  }
  
  // If it's an object (LocalizedText), try to get the best version
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Strategy 1: Detect which language has the most content (likely the original)
    // This takes priority because it's based on actual content, not metadata
    const detectedLang = detectContentLanguage(value);
    if (detectedLang && typeof value[detectedLang] === 'string' && value[detectedLang].trim()) {
      return value[detectedLang].trim();
    }
    
    // Strategy 2: If preferredLang is provided and exists with content, use it as fallback
    if (preferredLang && typeof value[preferredLang] === 'string' && value[preferredLang].trim()) {
      return value[preferredLang].trim();
    }
    
    // Strategy 3: Try common language codes in order
    const langOrder = ['en', 'fr', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'];
    for (const lang of langOrder) {
      if (typeof value[lang] === 'string' && value[lang].trim()) {
        return value[lang].trim();
      }
    }
    
    // Strategy 4: Get first string value from object (any language)
    for (const key in value) {
      if (typeof value[key] === 'string' && value[key].trim()) {
        return value[key].trim();
      }
    }
  }
  
  // If it's an array, join or get first string
  if (Array.isArray(value)) {
    const strings = value.filter(v => typeof v === 'string').map(v => v.trim());
    if (strings.length > 0) {
      return strings.join(' ');
    }
  }
  
  return '';
}

/**
 * Extract original profile from sos_profiles document
 * Returns data from sos_profiles excluding internal/system fields
 */
export async function extractOriginalProfile(providerId: string): Promise<OriginalProfile | null> {
  try {
    const profileDoc = await db.collection('sos_profiles').doc(providerId).get();
    if (!profileDoc.exists) {
      return null;
    }

    const data = profileDoc.data()!;
    
    // Fields to exclude (internal/system fields)
    const excludeFields = [
      'isActive',
      'isApproved',
      'isCallable',
      'isEarlyProvider',
      'isOnline',
      'isSOS',
      'isTestProfile',
      'isVerified',
      'isVisible',
      'isVisibleOnMap',
      'graduationYear',
      'fullName',
      'earlyBadge',
      'email',
      'mapLocation',
      'needsVerification',
      'profileCompleted',
      'rating',
      'referralBy',
      'responseTime',
      'reviewCount',
      'slug',
      'totalCalls',
      'totalEarnings',
      'type',
      'verificationStatus',
      'yearsOfExperience',
      // Stripe/payment related fields
      'status',
      'stripeAccountId',
      'stripeOnboardingComplete',
      'payoutsEnabled',
      'kycStatus',
      'kycCompleted',
      'kycCompletedAt',
      'price',
      'duration',
      // Phone/contact fields (not translatable)
      'phone',
      'phoneCountryCode',
      'phoneNumber',
      // Activity/tracking fields
      'lastActivity',
      'lastActivityCheck',
      'lastStatusChange',
      'inactivityTimeoutMinutes',
      // System/status fields
      'approvalStatus',
      'autoOfflineEnabled',
      'availability',
      'preferredLanguage',
      // Language arrays (not translatable, system metadata)
      'languages',
      'languagesSpoken',
      // Photo URLs (not translatable)
      'profilePhoto',
      'photoURL',
      'avatar',
      // Additional system/user fields
      'affiliateCode',
      'averageRating',
      'createdAt',
      'createdByAdmin',
      'points',
      'previousCountries',
      'residenceCountry',
      'role',
    ];
    
    // Create filtered object excluding those fields
    const filtered: any = {};
    for (const key in data) {
      if (!excludeFields.includes(key)) {
        filtered[key] = data[key];
      }
    }
    
    return filtered as OriginalProfile;
  } catch (error) {
    console.error('Error extracting original profile:', error);
    return null;
  }
}

/**
 * Generate translated slug
 * Format: {translated-specialty}-{firstname}-{city-optional}
 * Max 70 chars, no accents, lowercase, hyphens
 */
export function generateTranslatedSlug(
  specialty: string,
  firstName: string,
  city?: string,
  existingSlugs: string[] = []
): string {
  const normalize = (text: string | any): string => {
    // Ensure text is a string
    if (typeof text !== 'string') {
      text = String(text || '');
    }
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Ensure inputs are strings
  const specialtyStr = typeof specialty === 'string' ? specialty : String(specialty || 'expert');
  const firstNameStr = typeof firstName === 'string' ? firstName : String(firstName || 'expert');
  const cityStr = city && typeof city === 'string' ? city : (city ? String(city) : '');

  const specialtySlug = normalize(specialtyStr);
  const firstNameSlug = normalize(firstNameStr);
  const citySlug = cityStr ? normalize(cityStr) : '';
  
  let baseSlug = `${specialtySlug}-${firstNameSlug}`;
  if (citySlug) {
    const withCity = `${baseSlug}-${citySlug}`;
    if (withCity.length <= 70) {
      baseSlug = withCity;
    }
  }
  
  // Truncate to 70 chars
  if (baseSlug.length > 70) {
    baseSlug = baseSlug.substring(0, 70).replace(/-+$/, '');
  }
  
  // Handle duplicates
  let finalSlug = baseSlug;
  let counter = 2;
  while (existingSlugs.includes(finalSlug)) {
    const suffix = `-${counter}`;
    finalSlug = baseSlug.substring(0, 70 - suffix.length) + suffix;
    counter++;
  }
  
  return finalSlug;
}

/**
 * Generate SEO metadata for translated content
 */
export function generateSEO(
  translated: TranslatedContent,
  providerData: any,
  language: SupportedLanguage
): TranslatedContent['seo'] {
  const isLawyer = providerData.type === 'lawyer';
  const typeLabel = isLawyer 
    ? (language === 'fr' ? 'Avocat' : language === 'de' ? 'Anwalt' : 'Lawyer')
    : (language === 'fr' ? 'Expatrié' : language === 'de' ? 'Expatriate' : 'Expat');
  
  // Safely extract country as string
  const countryStr = typeof providerData.country === 'string' 
    ? providerData.country 
    : extractStringValue(providerData.country || '', language);
  
  // Ensure translated fields are strings
  const titleStr = typeof translated.title === 'string' ? translated.title : String(translated.title || '');
  const descriptionStr = typeof translated.description === 'string' 
    ? translated.description 
    : String(translated.description || '');
  
  const metaTitle = truncate(`${titleStr} - ${typeLabel} ${countryStr}`, 60);
  const metaDescription = truncate(descriptionStr, 160);
  
  // Safely extract city as string
  const cityStr = typeof providerData.city === 'string' 
    ? providerData.city 
    : extractStringValue(providerData.city || '', language);
  
  // Ensure h2 is a string
  const h2Str = translated.specialties && translated.specialties.length > 0
    ? String(translated.specialties[0] || typeLabel)
    : typeLabel;

  return {
    metaTitle,
    metaDescription,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    h1: titleStr,
    h2: h2Str,
    h3: cityStr || countryStr || '',
    imageAltTexts: [
      `${titleStr} profile photo`,
      `${titleStr} - ${typeLabel}`,
    ],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': isLawyer ? 'Attorney' : 'Person',
      name: titleStr,
      description: metaDescription,
      jobTitle: typeLabel,
      address: {
        '@type': 'PostalAddress',
        ...(countryStr ? { addressCountry: countryStr } : {}),
        ...(cityStr ? { addressLocality: cityStr } : {}),
      },
    },
  };
}

/**
 * Translate text using free translation API
 * Uses MyMemory Translation API (free tier) as primary, with LibreTranslate as fallback
 */
async function translateText(
  text: string,
  from: string,
  to: SupportedLanguage
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // If same language, return as-is
  if (from === to) {
    return text;
  }

  // Language code mapping for APIs (map internal 'ch' to API 'zh')
  const languageMap: Record<string, string> = {
    'fr': 'fr', 'en': 'en', 'es': 'es', 'pt': 'pt', 'de': 'de',
    'ru': 'ru', 'ch': 'zh', 'hi': 'hi', 'ar': 'ar',
  };
  
  const targetLang = languageMap[to] || to;
  const sourceLang = languageMap[from] || from;

  // Try MyMemory Translation API (free tier - 10000 words/day)
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    console.log(`[translateText] Attempting MyMemory translation: ${sourceLang} → ${targetLang}`);
    
    const response = await fetch(myMemoryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as { responseData?: { translatedText?: string } };
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        console.log(`[translateText] ✓ MyMemory translation successful`);
        return translated;
      }
    }
  } catch (error) {
    console.warn(`[translateText] MyMemory API error:`, error);
  }

  // Fallback: Try LibreTranslate (free, public instance)
  try {
    console.log(`[translateText] Attempting LibreTranslate: ${sourceLang} → ${targetLang}`);
    const libreUrl = 'https://libretranslate.de/translate';
    
    const response = await fetch(libreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      }),
    });

    if (response.ok) {
      const data = await response.json() as { translatedText?: string };
      if (data.translatedText) {
        console.log(`[translateText] ✓ LibreTranslate translation successful`);
        return data.translatedText;
      }
    }
  } catch (error) {
    console.warn(`[translateText] LibreTranslate API error:`, error);
  }

  // Final fallback: Try Google Translate (free unofficial API)
  try {
    console.log(`[translateText] Attempting Google Translate (unofficial): ${sourceLang} → ${targetLang}`);
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(googleUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as any;
      if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((item: any[]) => item[0]).join('');
        if (translated) {
          console.log(`[translateText] ✓ Google Translate (unofficial) translation successful`);
          return translated;
        }
      }
    }
  } catch (error) {
    console.warn(`[translateText] Google Translate (unofficial) API error:`, error);
  }

  // If all APIs fail, return original text with warning
  console.error(`[translateText] ✗ All translation APIs failed, returning original text: ${from} → ${to}`);
  return text;
}

/**
 * Translate all translatable fields in the original profile
 */
export async function translateAllFields(
  original: OriginalProfile,
  targetLanguage: SupportedLanguage
): Promise<OriginalProfile> {
  // Detect source language - PRIORITIZE detecting from bio content itself
  let sourceLang = 'en';
  
  // Priority 1: Detect from bio content (if bio is a string, analyze the text)
  if (original.bio && typeof original.bio === 'string' && original.bio.trim().length > 10) {
    const detected = detectLanguageFromText(original.bio);
    if (detected) {
      sourceLang = detected;
      console.log(`[translateAllFields] ✓ Detected language from bio text content: ${sourceLang}`);
    }
  }
  
  // Priority 2: If bio is a LocalizedText object, find the language with most content
  if (!sourceLang || sourceLang === 'en') {
    if (original.bio && typeof original.bio === 'object' && !Array.isArray(original.bio)) {
      const detected = detectContentLanguage(original.bio);
      if (detected) {
        sourceLang = normalizeLanguageCode(detected) || 'en';
        console.log(`[translateAllFields] ✓ Detected language from bio object (most content): ${sourceLang}`);
      }
    }
  }
  
  // Priority 3: Try detecting from description if bio detection failed
  if (!sourceLang || sourceLang === 'en') {
    if (original.description && typeof original.description === 'string' && original.description.trim().length > 10) {
      const detected = detectLanguageFromText(original.description);
      if (detected) {
        sourceLang = detected;
        console.log(`[translateAllFields] ✓ Detected language from description text: ${sourceLang}`);
      }
    }
  }
  
  // Priority 4: Fall back to originalLanguage field (metadata)
  if (!sourceLang || sourceLang === 'en') {
    if (original.originalLanguage && typeof original.originalLanguage === 'string') {
      sourceLang = normalizeLanguageCode(original.originalLanguage) || 'en';
      console.log(`[translateAllFields] Using originalLanguage from profile metadata: ${sourceLang}`);
    }
  }
  
  // Priority 5: Final fallback to English
  if (!sourceLang || sourceLang === 'en') {
    sourceLang = 'en';
    console.log(`[translateAllFields] Using default language (en) - no detection possible`);
  }
  
  // Normalize the source language code
  sourceLang = normalizeLanguageCode(sourceLang) || 'en';
  console.log(`[translateAllFields] Final source language: ${sourceLang}, target: ${targetLanguage}`);

  const translated: any = { ...original };

  // ✅ TRANSLATE: firstName
  if (original.firstName && typeof original.firstName === 'string') {
    translated.firstName = await translateText(original.firstName, sourceLang, targetLanguage);
    console.log(`[translateAllFields] Translated firstName: ${original.firstName} → ${translated.firstName}`);
  }

  // ✅ TRANSLATE: bio (LocalizedText object)
  if (original.bio && typeof original.bio === 'object' && !Array.isArray(original.bio)) {
    const bioText = original.bio[sourceLang] || Object.values(original.bio)[0] || '';
    if (bioText) {
      translated.bio = await translateText(String(bioText), sourceLang, targetLanguage);
    }
  } else if (typeof original.bio === 'string') {
    translated.bio = await translateText(original.bio, sourceLang, targetLanguage);
  }

  // ✅ TRANSLATE: description
  if (original.description && typeof original.description === 'string') {
    translated.description = await translateText(original.description, sourceLang, targetLanguage);
  }

  // ✅ TRANSLATE: motivation
  if (original.motivation && typeof original.motivation === 'object' && !Array.isArray(original.motivation)) {
    const motivationText = original.motivation[sourceLang] || Object.values(original.motivation)[0] || '';
    if (motivationText) {
      translated.motivation = await translateText(String(motivationText), sourceLang, targetLanguage);
    }
  } else if (typeof original.motivation === 'string') {
    translated.motivation = await translateText(original.motivation, sourceLang, targetLanguage);
  }

  // ✅ TRANSLATE: professionalDescription
  if (original.professionalDescription && typeof original.professionalDescription === 'string') {
    translated.professionalDescription = await translateText(original.professionalDescription, sourceLang, targetLanguage);
  }

  // ✅ TRANSLATE: experienceDescription
  if (original.experienceDescription && typeof original.experienceDescription === 'string') {
    translated.experienceDescription = await translateText(original.experienceDescription, sourceLang, targetLanguage);
  }

  // ✅ TRANSLATE: specialties/helpTypes (array of strings)
  if (Array.isArray(original.specialties)) {
    translated.specialties = await Promise.all(
      original.specialties.map(s => translateText(String(s), sourceLang, targetLanguage))
    );
  }
  if (Array.isArray(original.helpTypes)) {
    translated.helpTypes = await Promise.all(
      original.helpTypes.map((h: string) => translateText(String(h), sourceLang, targetLanguage))
    );
  }

  // ❌ DO NOT TRANSLATE: lastName, city, country, phone, email, etc.
  // Keep them exactly as they are in the original (only if they exist)
  if (original.lastName !== undefined) translated.lastName = original.lastName;
  if (original.city !== undefined && original.city !== null) translated.city = original.city;
  if (original.country !== undefined && original.country !== null) translated.country = original.country;
  if (original.phone !== undefined && original.phone !== null) translated.phone = original.phone;
  if (original.email !== undefined && original.email !== null) translated.email = original.email;
  if (original.barNumber !== undefined && original.barNumber !== null) translated.barNumber = original.barNumber;
  if (original.phoneCountryCode !== undefined && original.phoneCountryCode !== null) translated.phoneCountryCode = original.phoneCountryCode;

  console.log(`[translateAllFields] ✓ Translation complete. Non-translatable fields preserved: lastName=${original.lastName}, city=${original.city}`);

  return translated;
}

/**
 * Translate profile to target language
 */
export async function translateProfile(
  original: OriginalProfile,
  targetLanguage: SupportedLanguage,
  providerData: any
): Promise<TranslatedContent> {
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    throw new Error(`Unsupported target language: ${targetLanguage}`);
  }

  const sourceLang = normalizeLanguageCode(original.originalLanguage);
  console.log(`[translateProfile] Translating from ${sourceLang} to ${targetLanguage}`);
  console.log(`[translateProfile] Original content:`, {
    title: original.title,
    summaryLength: original.summary?.length || 0,
    descriptionLength: original.description?.length || 0,
    specialtiesCount: original.specialties?.length || 0,
    cta: original.cta,
  });
  
  // ❌ DO NOT TRANSLATE: Provider Name (title) - keep original
  // Provider name, city, phone, etc. should NEVER be translated
  const titleStr = original.title; // Provider name should NEVER be translated
  console.log(`[translateProfile] Title (NOT translated): ${titleStr}`);
  
  // ✅ TRANSLATE: Summary, Description (from bio), Specialties, CTA
  console.log(`[translateProfile] Translating: summary, description, specialties, CTA...`);
  
  // Ensure specialties is an array
  const specialtiesToTranslate = Array.isArray(original.specialties) && original.specialties.length > 0
    ? original.specialties
    : [];
  
  const [summary, description, specialtiesArray, cta] = await Promise.all([
    translateText(original.summary || '', sourceLang, targetLanguage),
    translateText(original.description || '', sourceLang, targetLanguage),
    Promise.all(specialtiesToTranslate.map(s => translateText(String(s || ''), sourceLang, targetLanguage))),
    translateText(original.cta || '', sourceLang, targetLanguage),
  ]);
  
  console.log(`[translateProfile] Translation completed:`, {
    summaryLength: summary?.length || 0,
    descriptionLength: description?.length || 0,
    specialtiesCount: specialtiesArray?.length || 0,
  });

  // Ensure all translated values are strings
  const summaryStr = String(summary || original.summary || '');
  const descriptionStr = String(description || original.description || '');
  const specialties = specialtiesArray.map(s => String(s || '')).filter(s => s.length > 0);
  const ctaStr = String(cta || original.cta || '');

  // ❌ DO NOT TRANSLATE: First Name, City - extract as-is (these are proper nouns/locations)
  const firstNameStr = typeof providerData.firstName === 'string' 
    ? providerData.firstName 
    : extractStringValue(providerData.firstName || '') || 'expert';
  // City should NEVER be translated - it's a location name
  const cityStr = typeof providerData.city === 'string' 
    ? providerData.city 
    : extractStringValue(providerData.city || '');

  // Generate slug
  const existingSlugs: string[] = []; // TODO: Fetch existing slugs for this provider
  const slug = generateTranslatedSlug(
    specialties[0] || 'expert',
    firstNameStr,
    cityStr || undefined,
    existingSlugs
  );

  // Generate SEO
  const translated: TranslatedContent = {
    // ✅ Translated fields
    title: titleStr || '', // Provider name (NOT translated, kept as-is)
    summary: summaryStr || '',
    description: descriptionStr || '',
    specialties: specialties || [],
    cta: ctaStr || '',
    slug: slug || '',
    seo: {} as any, // Will be filled below
    // ❌ Non-translatable fields (passed through from original, only if they exist)
    ...(original.firstName !== undefined && { firstName: original.firstName }),
    ...(original.lastName !== undefined && { lastName: original.lastName }),
    ...(original.city !== undefined && original.city !== null && { city: original.city }),
    ...(original.country !== undefined && original.country !== null && { country: original.country }),
    ...(original.phone !== undefined && original.phone !== null && { phone: original.phone }),
    ...(original.email !== undefined && original.email !== null && { email: original.email }),
    ...(original.barNumber !== undefined && original.barNumber !== null && { barNumber: original.barNumber }),
    ...(original.yearsOfExperience !== undefined && { yearsOfExperience: original.yearsOfExperience }),
    ...(original.yearsAsExpat !== undefined && { yearsAsExpat: original.yearsAsExpat }),
    ...(original.lawSchool !== undefined && original.lawSchool !== null && { lawSchool: original.lawSchool }),
    ...(original.graduationYear !== undefined && { graduationYear: original.graduationYear }),
    ...(original.certifications !== undefined && original.certifications !== null && { certifications: original.certifications }),
    ...(original.education !== undefined && original.education !== null && { education: original.education }),
    ...(original.responseTime !== undefined && original.responseTime !== null && { responseTime: original.responseTime }),
    ...(original.rating !== undefined && { rating: original.rating }),
    ...(original.reviewCount !== undefined && { reviewCount: original.reviewCount }),
    ...(original.profilePhoto !== undefined && original.profilePhoto !== null && { profilePhoto: original.profilePhoto }),
    ...(original.avatar !== undefined && original.avatar !== null && { avatar: original.avatar }),
    ...(original.photoURL !== undefined && original.photoURL !== null && { photoURL: original.photoURL }),
    ...(original.languages !== undefined && original.languages !== null && { languages: original.languages }),
    ...(original.type !== undefined && original.type !== null && { type: original.type }),
    ...(original.uid !== undefined && original.uid !== null && { uid: original.uid }),
  };

  translated.seo = generateSEO(translated, providerData, targetLanguage);

  // TODO: Generate FAQ translations if FAQ exists
  // translated.faq = await generateFAQTranslation(original, sourceLang, targetLanguage);

  return translated;
}

/**
 * Remove undefined values from an object recursively
 * Firestore doesn't accept undefined values
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefinedValues(value);
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Save translation to Firestore
 * @param isManualEdit - If true, automatically freezes the translation to prevent auto-updates
 */
export async function saveTranslation(
  providerId: string,
  language: SupportedLanguage,
  translation: TranslatedContent,
  userId?: string,
  isManualEdit: boolean = false
): Promise<void> {
  const translationRef = db.collection('providers_translations').doc(providerId);
  const doc = await translationRef.get();

  // Check if translation is frozen (only allow manual edits to overwrite frozen translations)
  if (doc.exists) {
    const existing = doc.data() as ProviderTranslationDoc;
    const isFrozen = existing.metadata.frozenLanguages?.includes(language);
    
    if (isFrozen && !isManualEdit) {
      throw new Error(`Translation for language ${language} is frozen. Only manual edits are allowed.`);
    }
  }

  // Remove undefined values before saving (Firestore doesn't accept undefined)
  const cleanedTranslation = removeUndefinedValues(translation);
  
  const updateData: any = {
    [`translations.${language}`]: cleanedTranslation,
    [`metadata.availableLanguages`]: FieldValue.arrayUnion(language),
    [`metadata.translationCosts.${language}`]: {
      cost: TRANSLATION_COST,
      date: FieldValue.serverTimestamp(),
      userId: userId || null,
    },
    [`metadata.totalCost`]: FieldValue.increment(TRANSLATION_COST),
    [`metadata.lastUpdated`]: FieldValue.serverTimestamp(),
    [`metadata.translations.${language}.status`]: isManualEdit ? 'frozen' : 'created',
    [`metadata.translations.${language}.createdAt`]: FieldValue.serverTimestamp(),
    [`metadata.translations.${language}.updatedAt`]: FieldValue.serverTimestamp(),
    [`metadata.translations.${language}.version`]: 1,
  };

  // If manual edit, freeze the translation
  if (isManualEdit) {
    updateData[`metadata.frozenLanguages`] = FieldValue.arrayUnion(language);
  }

  if (!doc.exists) {
    // First time: save original profile (remove undefined values)
    const original = await extractOriginalProfile(providerId);
    if (!original) {
      throw new Error('Provider not found');
    }
    
    updateData.original = removeUndefinedValues(original);
    updateData.metadata = {
      availableLanguages: [language],
      translationCosts: {
        [language]: {
          cost: TRANSLATION_COST,
          date: FieldValue.serverTimestamp(),
          userId: userId || null,
        },
      },
      totalCost: TRANSLATION_COST,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      frozenLanguages: isManualEdit ? [language] : [],
      translations: {
        [language]: {
          status: isManualEdit ? 'frozen' : 'created',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          cost: TRANSLATION_COST,
          userId: userId || null,
          version: 1,
        },
      },
    };
  } else {
    // Update existing
    const existing = doc.data() as ProviderTranslationDoc;
    const existingVersion = existing.metadata.translations?.[language]?.version || 0;
    updateData[`metadata.translations.${language}.version`] = existingVersion + 1;
  }

  await translationRef.set(updateData, { merge: true });
}

/**
 * Get translation or return null if doesn't exist
 */
export async function getTranslation(
  providerId: string,
  language: SupportedLanguage
): Promise<TranslatedContent | null> {
  try {
    console.log(`[getTranslation] Fetching translation for providerId: ${providerId}, language: ${language}`);
    const doc = await db.collection('providers_translations').doc(providerId).get();
    
    if (!doc.exists) {
      console.log(`[getTranslation] Document does not exist for providerId: ${providerId}`);
      return null;
    }

    const data = doc.data();
    if (!data) {
      console.log(`[getTranslation] Document exists but has no data for providerId: ${providerId}`);
      return null;
    }

    console.log(`[getTranslation] Document data keys:`, Object.keys(data));
    console.log(`[getTranslation] Has translations property:`, 'translations' in data);
    console.log(`[getTranslation] Translations value:`, data.translations);
    console.log(`[getTranslation] Translations type:`, typeof data.translations);
    console.log(`[getTranslation] Translations is array:`, Array.isArray(data.translations));

    // Safely access translations with null checks
    const translations = data.translations;
    if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
      console.log(`[getTranslation] Translations is invalid or missing`);
      return null;
    }

    const translation = translations[language];
    if (!translation) {
      console.log(`[getTranslation] Translation not found for language: ${language}`);
      console.log(`[getTranslation] Available translation languages:`, Object.keys(translations));
      return null;
    }

    console.log(`[getTranslation] ✓ Translation found for language: ${language}`);
    return translation as TranslatedContent;
  } catch (error) {
    console.error('[getTranslation] Error getting translation:', error);
    console.error('[getTranslation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      providerId,
      language,
    });
    return null;
  }
}

/**
 * Get original profile
 */
export async function getOriginalProfile(providerId: string): Promise<OriginalProfile | null> {
  try {
    const doc = await db.collection('providers_translations').doc(providerId).get();
    if (!doc.exists) {
      // Try to extract from sos_profiles
      return await extractOriginalProfile(providerId);
    }
    return doc.data()?.original || null;
  } catch (error) {
    console.error('Error getting original profile:', error);
    return null;
  }
}

/**
 * Get translation status for all languages
 */
export async function getTranslationStatus(providerId: string): Promise<{
  [key in SupportedLanguage]?: TranslationMetadata;
}> {
  try {
    const doc = await db.collection('providers_translations').doc(providerId).get();
    if (!doc.exists) {
      return {};
    }

    const data = doc.data();
    if (!data || !data.metadata) {
      return {};
    }

    // Safely access metadata.translations
    const metadata = data.metadata as ProviderTranslationDoc['metadata'];
    return metadata.translations || {};
  } catch (error) {
    console.error('Error getting translation status:', error);
    return {};
  }
}

/**
 * Check if translation is outdated
 */
export async function checkTranslationOutdated(
  providerId: string,
  language: SupportedLanguage
): Promise<boolean> {
  const original = await getOriginalProfile(providerId);
  if (!original) {
    return false;
  }

  const doc = await db.collection('providers_translations').doc(providerId).get();
  if (!doc.exists) {
    return false;
  }

  const data = doc.data() as ProviderTranslationDoc;
  const translation = data.translations[language];
  if (!translation) {
    return false;
  }

  // Compare hashes to detect changes
  const currentTitleHash = simpleHash(original.title || '');
  const currentSummaryHash = simpleHash(original.summary || '');
  const currentDescriptionHash = simpleHash(original.description || '');
  const currentSpecialtiesHash = simpleHash(Array.isArray(original.specialties) ? original.specialties.join(',') : '');

  // If any hash changed, translation is outdated
  return (
    original.titleHash !== currentTitleHash ||
    original.summaryHash !== currentSummaryHash ||
    original.descriptionHash !== currentDescriptionHash ||
    original.specialtiesHash !== currentSpecialtiesHash
  );
}

/**
 * Truncate text to max length
 * Safely handles any input type and ensures string output
 **/
function truncate(text: string | any, maxLength: number): string {
  // Ensure text is a string - handle all edge cases
  let textStr: string;
  if (typeof text === 'string') {
    textStr = text;
  } else if (text === null || text === undefined) {
    textStr = '';
  } else if (typeof text === 'number' || typeof text === 'boolean') {
    textStr = String(text);
  } else if (typeof text === 'object') {
    // If it's an object, try to extract string value
    console.warn('truncate called with object:', typeof text, text);
    textStr = extractStringValue(text) || '';
  } else {
    textStr = String(text || '');
  }
  
  // Ensure maxLength is valid
  if (typeof maxLength !== 'number' || maxLength < 0 || !isFinite(maxLength)) {
    maxLength = 100; // Default fallback
  }
  
  if (textStr.length <= maxLength) {
    return textStr;
  }
  return textStr.substring(0, maxLength - 3) + '...';
}

export { SUPPORTED_LANGUAGES, TRANSLATION_COST };

