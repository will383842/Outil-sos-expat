// ========================================
// src/utils/formatters.ts
// Utilitaires d'internationalisation
// ========================================

import { countriesData, type CountryData } from '../data/countries';
import { languagesData, getLanguageLabel as getLanguageLabelFromData, type SupportedLocale, type Language } from '../data/languages-spoken';
import { LanguageUtils } from '../locales/languageMap';

// ========================================
// TYPE DEFINITIONS
// ========================================

export type LanguageKey = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'zh' | 'ar' | 'ru' | 'it' | 'nl' | 'ch' | 'hi';

// ========================================
// FONCTIONS DE CONVERSION DES CODES PAYS
// ========================================

/**
 * Obtient le nom d'un pays dans la langue spécifiée
 * Support complet des 10 langues disponibles
 * 
 * @param countryCodeOrName - Code ISO du pays (ex: "FR", "GB", "PE") ou nom du pays
 * @param langCode - Code de langue (fr, en, es, de, pt, zh, ar, ru, it, nl, hi)
 * @returns Nom du pays traduit dans la langue demandée
 * 
 * @example
 * getCountryName('FR', 'fr') // "France"
 * getCountryName('FR', 'en') // "France"
 * getCountryName('FR', 'es') // "Francia"
 * getCountryName('FR', 'de') // "Frankreich"
 */
export const getCountryName = (
  countryCodeOrName: string | undefined,
  langCode: string = 'fr'
): string => {
  if (!countryCodeOrName || countryCodeOrName.trim() === '') {
    return '';
  }

  // Nettoyer l'entrée
  const cleanInput = countryCodeOrName.trim().toUpperCase();

  // 1️⃣ D'abord chercher par CODE ISO (2-3 lettres)
  let country = countriesData.find((c) => c.code === cleanInput);

  // 2️⃣ Si pas trouvé, chercher par NOM dans toutes les langues
  if (!country) {
    country = countriesData.find((c) => 
      c.nameFr?.toUpperCase() === cleanInput ||
      c.nameEn?.toUpperCase() === cleanInput ||
      c.nameEs?.toUpperCase() === cleanInput ||
      c.nameDe?.toUpperCase() === cleanInput ||
      c.namePt?.toUpperCase() === cleanInput ||
      c.nameZh?.toUpperCase() === cleanInput ||
      c.nameAr?.toUpperCase() === cleanInput ||
      c.nameRu?.toUpperCase() === cleanInput ||
      c.nameIt?.toUpperCase() === cleanInput ||
      c.nameNl?.toUpperCase() === cleanInput
    );
  }
  
  if (!country) {
    // Si toujours pas trouvé, retourner l'entrée originale
    console.warn(`⚠️ Pays introuvable: ${countryCodeOrName}`);
    return countryCodeOrName;
  }

  // 3️⃣ Mapping des codes de langue vers les propriétés du pays
  const langMap: Record<string, keyof Pick<CountryData, 'nameFr' | 'nameEn' | 'nameEs' | 'nameDe' | 'namePt' | 'nameZh' | 'nameAr' | 'nameRu' | 'nameIt' | 'nameNl' | 'nameHi'>> = {
    'fr': 'nameFr',
    'en': 'nameEn',
    'es': 'nameEs',
    'de': 'nameDe',
    'pt': 'namePt',
    'zh': 'nameZh',
    'ch': 'nameZh', // Alias chinois
    'ar': 'nameAr',
    'ru': 'nameRu',
    'it': 'nameIt',
    'nl': 'nameNl',
    'hi': 'nameHi' // Hindi
  };
  
  // Nettoyer le code de langue (enlever les variantes régionales)
  const cleanLangCode = langCode.toLowerCase().split('-')[0];
  const nameKey = langMap[cleanLangCode] || 'nameEn';
  
  return country[nameKey] || country.nameEn;
};

/**
 * Convertit plusieurs codes pays en noms lisibles
 * 
 * @param countryCodes - Tableau de codes ISO pays
 * @param langCode - Code de langue pour la traduction
 * @returns Tableau de noms de pays traduits
 */
export const getCountryNames = (
  countryCodes: string[] | undefined,
  langCode: string = 'fr'
): string[] => {
  if (!countryCodes || !Array.isArray(countryCodes)) {
    return [];
  }
  
  return countryCodes
    .map(code => getCountryName(code, langCode))
    .filter(name => name !== '');
};

/**
 * Obtenir le drapeau d'un pays à partir de son code ISO ou nom
 */
export const getCountryFlag = (countryCodeOrName: string | undefined): string => {
  if (!countryCodeOrName) return '🌍';
  
  const cleanInput = countryCodeOrName.trim().toUpperCase();
  
  // Chercher par code
  let country = countriesData.find((c) => c.code === cleanInput);
  
  // Si pas trouvé, chercher par nom
  if (!country) {
    country = countriesData.find((c) => 
      c.nameFr?.toUpperCase() === cleanInput ||
      c.nameEn?.toUpperCase() === cleanInput ||
      c.nameEs?.toUpperCase() === cleanInput ||
      c.nameDe?.toUpperCase() === cleanInput ||
      c.namePt?.toUpperCase() === cleanInput ||
      c.nameZh?.toUpperCase() === cleanInput ||
      c.nameAr?.toUpperCase() === cleanInput ||
      c.nameRu?.toUpperCase() === cleanInput ||
      c.nameIt?.toUpperCase() === cleanInput ||
      c.nameNl?.toUpperCase() === cleanInput
    );
  }
  
  return country?.flag || '🌍';
};

// ========================================
// FONCTIONS DE CONVERSION DES LANGUES
// ========================================

/**
 * Normalise une clé de langue vers le format SupportedLocale
 */
export const normalizeLanguageKey = (lang: string | LanguageKey): SupportedLocale => {
  const normalized = lang.toLowerCase().split('-')[0]; // Enlever les variantes régionales
  
  // Mapping des variantes vers les locales supportées
  const mapping: Record<string, SupportedLocale> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
    'pt': 'pt',
    'zh': 'ch',  // Chinois → ch
    'ch': 'ch',
    'ar': 'ar',
    'ru': 'ru',
    'hi': 'hi',
    'it': 'en',  // Italien → fallback anglais (pas dans SupportedLocale)
    'nl': 'en'   // Néerlandais → fallback anglais (pas dans SupportedLocale)
  };
  
  return (mapping[normalized] as SupportedLocale) || 'fr';
};

/**
 * Convertit un code de langue ISO (ex: "fr", "en") en nom lisible
 * dans la langue spécifiée
 * 
 * @param languageCode - Code ISO de la langue (ex: "fr", "en", "es")
 * @param interfaceLanguage - Langue de l'interface
 * @returns Nom de la langue traduit
 */
export const getLanguageName = (
  languageCode: string | undefined,
  interfaceLanguage: LanguageKey | string = 'fr'
): string => {
  if (!languageCode || languageCode.trim() === '') {
    return '';
  }

  // Normaliser vers un code ISO (gère "Français" -> "fr", "fr" -> "fr")
  let cleanCode = LanguageUtils.normalizeToCode(languageCode.trim()).toLowerCase().split('-')[0];

  // Convertir 'ch' en 'zh' car languagesData utilise 'zh' pour le chinois
  if (cleanCode === 'ch') {
    cleanCode = 'zh';
  }

  // Trouver la langue dans languagesData
  const lang = languagesData.find((l) => l.code.toLowerCase() === cleanCode);
  
  if (!lang) {
    // Si le code n'est pas trouvé, essayer une correspondance partielle
    // ou retourner le code lui-même
    console.warn(`⚠️ Code langue inconnu: ${cleanCode}`);
    return languageCode;
  }

  // Utiliser getLanguageLabel avec la locale normalisée
  const locale = normalizeLanguageKey(interfaceLanguage as LanguageKey);
  return getLanguageLabelFromData(lang, locale);
};

/**
 * Convertit plusieurs codes de langues en noms lisibles
 */
export const getLanguageNames = (
  languageCodes: string[] | undefined,
  interfaceLanguage: LanguageKey | string = 'fr'
): string[] => {
  if (!languageCodes || !Array.isArray(languageCodes)) {
    return [];
  }
  
  return languageCodes
    .map(code => getLanguageName(code, interfaceLanguage))
    .filter(name => name !== '');
};

/**
 * Formate une liste de langues pour l'affichage
 * Exemple: ["fr", "en", "es"] -> "Français • Anglais • Espagnol"
 */
export const formatLanguages = (
  languageCodes: string[] | undefined,
  interfaceLanguage: LanguageKey | string = 'fr',
  maxDisplay: number = 3
): string => {
  const names = getLanguageNames(languageCodes, interfaceLanguage);
  
  if (names.length === 0) {
    return '';
  }
  
  if (names.length <= maxDisplay) {
    return names.join(' • ');
  }
  
  const displayed = names.slice(0, maxDisplay);
  const remaining = names.length - maxDisplay;
  
  return `${displayed.join(' • ')} +${remaining}`;
};

/**
 * Convertit des noms de langues (en n'importe quelle langue) en codes ISO
 * Utile pour normaliser les données Firebase qui peuvent contenir des noms au lieu de codes
 */
export const convertLanguageNamesToCodes = (
  languageNames: string[] | undefined
): string[] => {
  if (!languageNames || !Array.isArray(languageNames)) {
    return [];
  }
  
  return languageNames.map(name => {
    // Si c'est déjà un code (2-3 caractères), le retourner
    if (name.length <= 3) {
      return name.toLowerCase();
    }
    
    // Chercher dans toutes les traductions possibles
    const nameLower = name.toLowerCase();
    const found = languagesData.find(lang => {
      // Vérifier le nom en français
      if (lang.name.toLowerCase() === nameLower) return true;
      
      // Vérifier le nom natif
      if (lang.nativeName.toLowerCase() === nameLower) return true;
      
      // Vérifier toutes les traductions
      if (lang.labels) {
        return Object.values(lang.labels).some(
          label => label?.toLowerCase() === nameLower
        );
      }
      
      return false;
    });
    
    return found ? found.code : name;
  }).filter(code => code !== '');
};

/**
 * Formate une liste de pays pour l'affichage
 * Exemple: ["FR", "GB"] -> "France • Royaume-Uni"
 */
export const formatCountries = (
  countryCodes: string[] | undefined,
  interfaceLanguage: LanguageKey | string = 'fr',
  maxDisplay: number = 3
): string => {
  const names = getCountryNames(countryCodes, interfaceLanguage);
  
  if (names.length === 0) {
    return '';
  }
  
  if (names.length <= maxDisplay) {
    return names.join(' • ');
  }
  
  const displayed = names.slice(0, maxDisplay);
  const remaining = names.length - maxDisplay;
  
  return `${displayed.join(' • ')} +${remaining}`;
};

// ========================================
// UTILITAIRES GÉNÉRAUX
// ========================================

/**
 * Obtient le label d'un type de prestataire traduit
 */
export const getProviderTypeLabel = (
  type: string,
  language: LanguageKey | string = 'fr'
): string => {
  const labels: Record<string, Record<LanguageKey, string>> = {
    lawyer: {
      fr: 'Avocat',
      en: 'Lawyer',
      es: 'Abogado',
      de: 'Anwalt',
      pt: 'Advogado',
      zh: '律师',
      ar: 'محامي',
      ru: 'Адвокат',
      it: 'Avvocato',
      nl: 'Advocaat',
      ch: '律师',
      hi: 'वकील'
    },
    expat: {
      fr: 'Expert Expatrié',
      en: 'Expat Expert',
      es: 'Experto Expatriado',
      de: 'Expat-Experte',
      pt: 'Especialista Expatriado',
      zh: '外派专家',
      ar: 'خبير مغترب',
      ru: 'Эксперт-экспат',
      it: 'Esperto Espatriato',
      nl: 'Expat Expert',
      ch: '外派专家',
      hi: 'प्रवासी विशेषज्ञ'
    }
  };
  
  const cleanLang = language.toLowerCase().split('-')[0];
  const langKey = normalizeLanguageKey(cleanLang as LanguageKey);
  return labels[type]?.[langKey] || labels[type]?.en || type;
};

/**
 * Vérifie si une valeur est un code ISO (2-3 lettres majuscules)
 */
export const isISOCode = (value: string): boolean => {
  return /^[A-Z]{2,3}$/.test(value.trim());
};

/**
 * Obtient la locale Intl.DateTimeFormat à partir d'un code de langue
 * 
 * @param langCode - Code de langue (fr, en, es, etc.)
 * @returns Locale pour Intl.DateTimeFormat (ex: "fr-FR", "en-US")
 */
export const getDateLocale = (langCode: string): string => {
  const localeMap: Record<string, string> = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'es': 'es-ES',
    'de': 'de-DE',
    'pt': 'pt-PT',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'ch': 'zh-CN',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'it': 'it-IT',
    'nl': 'nl-NL'
  };
  
  const cleanCode = langCode.toLowerCase().split('-')[0];
  return localeMap[cleanCode] || 'en-US';
};

export default {
  getCountryName,
  getCountryNames,
  getCountryFlag,
  getLanguageName,
  getLanguageNames,
  formatLanguages,
  formatCountries,
  convertLanguageNamesToCodes,
  getProviderTypeLabel,
  normalizeLanguageKey,
  isISOCode,
  getDateLocale
};