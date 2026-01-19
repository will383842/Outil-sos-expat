/**
 * Mapping des noms de langues en français vers leurs codes ISO 639-1
 * Optimisé pour la production avec support SEO et accessibility
 * @version 1.0.0
 * @author Generated for production use
 */

// Type pour une meilleure sécurité de type
export interface LanguageEntry {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean; // Right-to-left languages
}

// Mapping principal avec codes ISO 639-1 standards
export const LANGUAGE_MAP: Readonly<Record<string, string>> = Object.freeze({
  // Langues européennes principales
  français: 'fr',
  anglais: 'en',
  espagnol: 'es',
  portugais: 'pt',
  allemand: 'de',
  italien: 'it',
  néerlandais: 'nl',
  
  // Langues slaves
  russe: 'ru',
  polonais: 'pl',
  tchèque: 'cs',
  ukrainien: 'uk',
  bulgare: 'bg',
  croate: 'hr',
  serbe: 'sr',
  slovaque: 'sk',
  slovène: 'sl',
  
  // Langues nordiques
  suédois: 'sv',
  norvégien: 'no',
  danois: 'da',
  finnois: 'fi',
  islandais: 'is',
  
  // Langues baltiques et autres européennes
  letton: 'lv',
  lituanien: 'lt',
  estonien: 'et',
  hongrois: 'hu',
  roumain: 'ro',
  grec: 'el',
  irlandais: 'ga',
  gallois: 'cy',
  
  // Langues asiatiques principales
  chinois: 'ch',
  japonais: 'ja',
  coréen: 'ko',
  hindi: 'hi',
  arabe: 'ar',
  
  // Langues du sous-continent indien
  bengali: 'bn',
  ourdou: 'ur',
  pendjabi: 'pa',
  malayalam: 'ml',
  tamoul: 'ta',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  télougou: 'te',
  
  // Langues d'Asie du Sud-Est
  vietnamien: 'vi',
  thaï: 'th',
  indonésien: 'id',
  malais: 'ms',
  
  // Langues du Moyen-Orient
  persan: 'fa',
  turc: 'tr',
  hébreu: 'he',
  azéri: 'az',
  
  // Langues africaines
  swahili: 'sw',
  amharique: 'am',
  somali: 'so'
} as const);

// Mapping inverse pour retrouver le nom français depuis le code
export const CODE_TO_LANGUAGE: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(LANGUAGE_MAP).map(([name, code]) => [code, name])
  )
);

// Métadonnées enrichies pour chaque langue (SEO et UX)
export const LANGUAGE_METADATA: Readonly<Record<string, LanguageEntry>> = Object.freeze({
  fr: { code: 'fr', name: 'français', nativeName: 'Français' },
  en: { code: 'en', name: 'anglais', nativeName: 'English' },
  es: { code: 'es', name: 'espagnol', nativeName: 'Español' },
  pt: { code: 'pt', name: 'portugais', nativeName: 'Português' },
  ar: { code: 'ar', name: 'arabe', nativeName: 'العربية', rtl: true },
  ch: { code: 'ch', name: 'chinois', nativeName: '中文' },
  hi: { code: 'hi', name: 'hindi', nativeName: 'हिन्दी' },
  ru: { code: 'ru', name: 'russe', nativeName: 'Русский' },
  ja: { code: 'ja', name: 'japonais', nativeName: '日本語' },
  de: { code: 'de', name: 'allemand', nativeName: 'Deutsch' },
  ko: { code: 'ko', name: 'coréen', nativeName: '한국어' },
  vi: { code: 'vi', name: 'vietnamien', nativeName: 'Tiếng Việt' },
  tr: { code: 'tr', name: 'turc', nativeName: 'Türkçe' },
  it: { code: 'it', name: 'italien', nativeName: 'Italiano' },
  pl: { code: 'pl', name: 'polonais', nativeName: 'Polski' },
  nl: { code: 'nl', name: 'néerlandais', nativeName: 'Nederlands' },
  ro: { code: 'ro', name: 'roumain', nativeName: 'Română' },
  el: { code: 'el', name: 'grec', nativeName: 'Ελληνικά' },
  sv: { code: 'sv', name: 'suédois', nativeName: 'Svenska' },
  fi: { code: 'fi', name: 'finnois', nativeName: 'Suomi' },
  no: { code: 'no', name: 'norvégien', nativeName: 'Norsk' },
  da: { code: 'da', name: 'danois', nativeName: 'Dansk' },
  cs: { code: 'cs', name: 'tchèque', nativeName: 'Čeština' },
  hu: { code: 'hu', name: 'hongrois', nativeName: 'Magyar' },
  he: { code: 'he', name: 'hébreu', nativeName: 'עברית', rtl: true },
  uk: { code: 'uk', name: 'ukrainien', nativeName: 'Українська' },
  bg: { code: 'bg', name: 'bulgare', nativeName: 'Български' },
  hr: { code: 'hr', name: 'croate', nativeName: 'Hrvatski' },
  sr: { code: 'sr', name: 'serbe', nativeName: 'Српски' },
  sk: { code: 'sk', name: 'slovaque', nativeName: 'Slovenčina' },
  sl: { code: 'sl', name: 'slovène', nativeName: 'Slovenščina' },
  lv: { code: 'lv', name: 'letton', nativeName: 'Latviešu' },
  lt: { code: 'lt', name: 'lituanien', nativeName: 'Lietuvių' },
  et: { code: 'et', name: 'estonien', nativeName: 'Eesti' },
  ga: { code: 'ga', name: 'irlandais', nativeName: 'Gaeilge' },
  cy: { code: 'cy', name: 'gallois', nativeName: 'Cymraeg' },
  is: { code: 'is', name: 'islandais', nativeName: 'Íslenska' },
  ms: { code: 'ms', name: 'malais', nativeName: 'Bahasa Melayu' },
  th: { code: 'th', name: 'thaï', nativeName: 'ไทย' },
  id: { code: 'id', name: 'indonésien', nativeName: 'Bahasa Indonesia' },
  fa: { code: 'fa', name: 'persan', nativeName: 'فارسی', rtl: true },
  ur: { code: 'ur', name: 'ourdou', nativeName: 'اردو', rtl: true },
  bn: { code: 'bn', name: 'bengali', nativeName: 'বাংলা' },
  pa: { code: 'pa', name: 'pendjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ml: { code: 'ml', name: 'malayalam', nativeName: 'മലയാളം' },
  ta: { code: 'ta', name: 'tamoul', nativeName: 'தமிழ்' },
  mr: { code: 'mr', name: 'marathi', nativeName: 'मराठी' },
  gu: { code: 'gu', name: 'gujarati', nativeName: 'ગુજરાતી' },
  kn: { code: 'kn', name: 'kannada', nativeName: 'ಕನ್ನಡ' },
  te: { code: 'te', name: 'télougou', nativeName: 'తెలుగు' },
  so: { code: 'so', name: 'somali', nativeName: 'Soomaali' },
  sw: { code: 'sw', name: 'swahili', nativeName: 'Kiswahili' },
  am: { code: 'am', name: 'amharique', nativeName: 'አማርኛ' },
  az: { code: 'az', name: 'azéri', nativeName: 'Azərbaycan' }
});

// Langues RTL pour le support CSS directionnel
export const RTL_LANGUAGES: Readonly<Set<string>> = Object.freeze(
  new Set(['ar', 'he', 'fa', 'ur'])
);

// Langues les plus populaires (pour les suggestions prioritaires - UX)
export const POPULAR_LANGUAGES: Readonly<string[]> = Object.freeze([
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'ch', 'ja', 'ar', 'hi'
]);

// Utilitaires pour la production
export const LanguageUtils = {
  /**
   * Obtient le code de langue depuis le nom français
   * @param languageName - Nom de la langue en français
   * @returns Code ISO 639-1 ou null si non trouvé
   */
  getLanguageCode: (languageName: string): string | null => {
    const normalizedName = languageName.toLowerCase().trim();
    return LANGUAGE_MAP[normalizedName] || null;
  },

  /**
   * Obtient le nom français depuis le code de langue
   * @param languageCode - Code ISO 639-1
   * @returns Nom de la langue en français ou null si non trouvé
   */
  getLanguageName: (languageCode: string): string | null => {
    return CODE_TO_LANGUAGE[languageCode.toLowerCase()] || null;
  },

  /**
   * Vérifie si une langue utilise l'écriture RTL
   * @param languageCode - Code ISO 639-1
   * @returns true si la langue est RTL
   */
  isRTL: (languageCode: string): boolean => {
    return RTL_LANGUAGES.has(languageCode.toLowerCase());
  },

  /**
   * Obtient les métadonnées complètes d'une langue
   * @param languageCode - Code ISO 639-1
   * @returns Métadonnées de la langue ou null si non trouvé
   */
  getLanguageMetadata: (languageCode: string): LanguageEntry | null => {
    return LANGUAGE_METADATA[languageCode.toLowerCase()] || null;
  },

  /**
   * Obtient toutes les langues disponibles triées par popularité
   * @returns Array des codes de langue triés
   */
  getAllLanguagesSorted: (): string[] => {
    const popular = new Set(POPULAR_LANGUAGES);
    const others = Object.keys(LANGUAGE_METADATA)
      .filter(code => !popular.has(code))
      .sort();
    
    return [...POPULAR_LANGUAGES, ...others];
  },

  /**
   * Recherche de langues avec support de la recherche partielle
   * @param query - Terme de recherche
   * @returns Array des langues matchant la recherche
   */
  searchLanguages: (query: string): LanguageEntry[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    return Object.values(LANGUAGE_METADATA).filter(lang =>
      lang.name.toLowerCase().includes(normalizedQuery) ||
      lang.nativeName.toLowerCase().includes(normalizedQuery) ||
      lang.code.toLowerCase().includes(normalizedQuery)
    );
  },

  /**
   * Normalise une langue (nom complet ou code) vers son code ISO 639-1
   * Gère les deux formats : "Français" -> "fr" et "fr" -> "fr"
   * @param langOrCode - Nom de langue ou code ISO
   * @returns Code ISO 639-1 normalisé
   */
  normalizeToCode: (langOrCode: string): string => {
    if (!langOrCode) return langOrCode;

    const normalized = langOrCode.toLowerCase().trim();

    // Si c'est déjà un code ISO court (2-3 caractères), le retourner tel quel
    if (normalized.length <= 3) {
      // Gérer le cas spécial zh/ch pour le chinois
      if (normalized === 'zh') return 'ch';
      return normalized;
    }

    // Mapping étendu nom → code (inclut les variantes avec/sans accents et en anglais)
    const NAME_TO_CODE: Record<string, string> = {
      // Français
      'français': 'fr', 'francais': 'fr', 'french': 'fr',
      // Anglais
      'anglais': 'en', 'english': 'en',
      // Espagnol
      'espagnol': 'es', 'spanish': 'es', 'español': 'es',
      // Allemand
      'allemand': 'de', 'german': 'de', 'deutsch': 'de',
      // Portugais
      'portugais': 'pt', 'portuguese': 'pt', 'português': 'pt',
      // Italien
      'italien': 'it', 'italian': 'it', 'italiano': 'it',
      // Russe
      'russe': 'ru', 'russian': 'ru', 'русский': 'ru',
      // Chinois
      'chinois': 'ch', 'chinese': 'ch', '中文': 'ch',
      // Arabe
      'arabe': 'ar', 'arabic': 'ar', 'العربية': 'ar',
      // Hindi
      'hindi': 'hi', 'हिन्दी': 'hi',
      // Japonais
      'japonais': 'ja', 'japanese': 'ja', '日本語': 'ja',
      // Coréen
      'coréen': 'ko', 'coreen': 'ko', 'korean': 'ko', '한국어': 'ko',
      // Néerlandais
      'néerlandais': 'nl', 'neerlandais': 'nl', 'dutch': 'nl', 'nederlands': 'nl',
      // Polonais
      'polonais': 'pl', 'polish': 'pl', 'polski': 'pl',
      // Turc
      'turc': 'tr', 'turkish': 'tr', 'türkçe': 'tr',
      // Vietnamien
      'vietnamien': 'vi', 'vietnamese': 'vi',
      // Thaï
      'thaï': 'th', 'thai': 'th', 'ไทย': 'th',
      // Indonésien
      'indonésien': 'id', 'indonesien': 'id', 'indonesian': 'id',
      // Malais
      'malais': 'ms', 'malay': 'ms',
      // Suédois
      'suédois': 'sv', 'suedois': 'sv', 'swedish': 'sv', 'svenska': 'sv',
      // Norvégien
      'norvégien': 'no', 'norvegien': 'no', 'norwegian': 'no', 'norsk': 'no',
      // Danois
      'danois': 'da', 'danish': 'da', 'dansk': 'da',
      // Finnois
      'finnois': 'fi', 'finnish': 'fi', 'suomi': 'fi',
      // Grec
      'grec': 'el', 'greek': 'el', 'ελληνικά': 'el',
      // Tchèque
      'tchèque': 'cs', 'tcheque': 'cs', 'czech': 'cs', 'čeština': 'cs',
      // Hongrois
      'hongrois': 'hu', 'hungarian': 'hu', 'magyar': 'hu',
      // Roumain
      'roumain': 'ro', 'romanian': 'ro', 'română': 'ro',
      // Ukrainien
      'ukrainien': 'uk', 'ukrainian': 'uk', 'українська': 'uk',
      // Bulgare
      'bulgare': 'bg', 'bulgarian': 'bg', 'български': 'bg',
      // Croate
      'croate': 'hr', 'croatian': 'hr', 'hrvatski': 'hr',
      // Serbe
      'serbe': 'sr', 'serbian': 'sr', 'српски': 'sr',
      // Slovaque
      'slovaque': 'sk', 'slovak': 'sk', 'slovenčina': 'sk',
      // Slovène
      'slovène': 'sl', 'slovene': 'sl', 'slovenščina': 'sl',
      // Hébreu
      'hébreu': 'he', 'hebreu': 'he', 'hebrew': 'he', 'עברית': 'he',
      // Persan
      'persan': 'fa', 'persian': 'fa', 'farsi': 'fa', 'فارسی': 'fa',
      // Bengali
      'bengali': 'bn', 'বাংলা': 'bn',
      // Ourdou
      'ourdou': 'ur', 'urdu': 'ur', 'اردو': 'ur',
      // Pendjabi
      'pendjabi': 'pa', 'punjabi': 'pa', 'ਪੰਜਾਬੀ': 'pa',
      // Tamoul
      'tamoul': 'ta', 'tamil': 'ta', 'தமிழ்': 'ta',
      // Télougou
      'télougou': 'te', 'telougou': 'te', 'telugu': 'te', 'తెలుగు': 'te',
      // Marathi
      'marathi': 'mr', 'मराठी': 'mr',
      // Gujarati
      'gujarati': 'gu', 'ગુજરાતી': 'gu',
      // Kannada
      'kannada': 'kn', 'ಕನ್ನಡ': 'kn',
      // Malayalam
      'malayalam': 'ml', 'മലയാളം': 'ml',
      // Swahili
      'swahili': 'sw', 'kiswahili': 'sw',
      // Amharique
      'amharique': 'am', 'amharic': 'am', 'አማርኛ': 'am',
      // Somali
      'somali': 'so', 'soomaali': 'so',
      // Azéri
      'azéri': 'az', 'azeri': 'az', 'azerbaijani': 'az',
      // Letton
      'letton': 'lv', 'latvian': 'lv', 'latviešu': 'lv',
      // Lituanien
      'lituanien': 'lt', 'lithuanian': 'lt', 'lietuvių': 'lt',
      // Estonien
      'estonien': 'et', 'estonian': 'et', 'eesti': 'et',
      // Irlandais
      'irlandais': 'ga', 'irish': 'ga', 'gaeilge': 'ga',
      // Gallois
      'gallois': 'cy', 'welsh': 'cy', 'cymraeg': 'cy',
      // Islandais
      'islandais': 'is', 'icelandic': 'is', 'íslenska': 'is',
      // Javanais
      'javanais': 'jv', 'javanese': 'jv', 'basa jawa': 'jv',
      // Catalan
      'catalan': 'ca', 'català': 'ca',
      // Basque
      'basque': 'eu', 'euskara': 'eu', 'vasco': 'eu',
      // Albanais
      'albanais': 'sq', 'albanian': 'sq', 'shqip': 'sq',
      // Macédonien
      'macédonien': 'mk', 'macedonien': 'mk', 'macedonian': 'mk', 'македонски': 'mk',
      // Maltais
      'maltais': 'mt', 'maltese': 'mt', 'malti': 'mt',
      // Cinghalais
      'cinghalais': 'si', 'sinhala': 'si', 'sinhalese': 'si', 'සිංහල': 'si',
      // Népalais
      'népalais': 'ne', 'nepalais': 'ne', 'nepali': 'ne', 'नेपाली': 'ne',
      // Tagalog
      'tagalog': 'tl', 'filipino': 'tl',
      // Birman
      'birman': 'my', 'burmese': 'my', 'မြန်မာ': 'my',
      // Khmer
      'khmer': 'km', 'cambodgien': 'km', 'cambodian': 'km', 'ខ្មែរ': 'km',
      // Laotien
      'laotien': 'lo', 'lao': 'lo', 'ລາວ': 'lo',
      // Mongol
      'mongol': 'mn', 'mongolian': 'mn', 'монгол': 'mn',
      // Géorgien
      'géorgien': 'ka', 'georgien': 'ka', 'georgian': 'ka', 'ქართული': 'ka',
      // Arménien
      'arménien': 'hy', 'armenien': 'hy', 'armenian': 'hy', 'հdelays': 'hy',
      // Kazakh
      'kazakh': 'kk', 'қазақ': 'kk',
      // Ouzbek
      'ouzbek': 'uz', 'uzbek': 'uz', 'oʻzbek': 'uz',
      // Tadjik
      'tadjik': 'tg', 'tajik': 'tg', 'тоҷикӣ': 'tg',
      // Kirghize
      'kirghize': 'ky', 'kyrgyz': 'ky', 'кыргызча': 'ky',
      // Turkmène
      'turkmène': 'tk', 'turkmene': 'tk', 'turkmen': 'tk', 'türkmen': 'tk',
      // Pachto
      'pachto': 'ps', 'pashto': 'ps', 'پښتو': 'ps',
      // Haoussa
      'haoussa': 'ha', 'hausa': 'ha',
      // Yoruba
      'yoruba': 'yo', 'yorùbá': 'yo',
      // Igbo
      'igbo': 'ig',
      // Zoulou
      'zoulou': 'zu', 'zulu': 'zu', 'isizulu': 'zu',
      // Xhosa
      'xhosa': 'xh', 'isixhosa': 'xh',
      // Afrikaans
      'afrikaans': 'af',
      // Kinyarwanda
      'kinyarwanda': 'rw', 'ikinyarwanda': 'rw',
      // Espéranto
      'espéranto': 'eo', 'esperanto': 'eo',
    };

    // Chercher dans le mapping étendu
    if (NAME_TO_CODE[normalized]) {
      return NAME_TO_CODE[normalized];
    }

    // Fallback sur le mapping principal
    if (LANGUAGE_MAP[normalized]) {
      return LANGUAGE_MAP[normalized];
    }

    // Si rien trouvé, retourner tel quel (peut-être déjà un code inconnu)
    return langOrCode;
  },

  /**
   * Normalise un tableau de langues vers des codes ISO
   * @param languages - Tableau de noms ou codes de langues
   * @returns Tableau de codes ISO normalisés
   */
  normalizeLanguagesArray: (languages: string[]): string[] => {
    if (!languages || !Array.isArray(languages)) return [];
    return languages.map(lang => LanguageUtils.normalizeToCode(lang));
  }
} as const;

// Export par défaut pour la compatibilité
export default LANGUAGE_MAP;