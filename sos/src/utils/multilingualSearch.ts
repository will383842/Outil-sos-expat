/**
 * Multilingual search keywords for lawyer and expat types
 * Supports all languages: fr, en, es, pt, de, ru, ch, hi, ar
 */

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'pt' | 'de' | 'ru' | 'ch' | 'hi' | 'ar';

/**
 * Multilingual keywords for lawyer type
 */
export const LAWYER_KEYWORDS: Record<SupportedLanguage, string[]> = {
  fr: ['avocat', 'juriste', 'juridique', 'droit', 'avocats', 'juristes', 'conseil juridique', 'cabinet', 'procédure'],
  en: ['lawyer', 'attorney', 'legal', 'law', 'counsel', 'barrister', 'solicitor', 'legal advice', 'law firm', 'litigation'],
  es: ['abogado', 'jurista', 'jurídico', 'derecho', 'abogados', 'juristas', 'asesoría legal', 'despacho', 'proceso'],
  pt: ['advogado', 'jurista', 'jurídico', 'direito', 'advogados', 'juristas', 'consultoria jurídica', 'escritório', 'processo'],
  de: ['anwalt', 'jurist', 'juristisch', 'recht', 'anwälte', 'juristen', 'rechtsberatung', 'kanzlei', 'verfahren'],
  ru: ['адвокат', 'юрист', 'юридический', 'право', 'адвокаты', 'юристы', 'юридическая консультация', 'офис', 'процесс'],
  ch: ['律师', '法学家', '法律', '权利', '律师们', '法学家们', '法律咨询', '律师事务所', '诉讼'],
  hi: ['वकील', 'न्यायविद', 'कानूनी', 'अधिकार', 'वकीलों', 'न्यायविदों', 'कानूनी सलाह', 'कानूनी फर्म', 'मुकदमा'],
  ar: ['محامي', 'قانوني', 'قانون', 'حق', 'محامون', 'قانونيون', 'استشارة قانونية', 'مكتب', 'قضية'],
};

/**
 * Multilingual keywords for expat type
 */
export const EXPAT_KEYWORDS: Record<SupportedLanguage, string[]> = {
  fr: ['expatrié', 'expat', 'immigration', 'visa', 'expatriés', 'expatriation', 'résidence', 'permis de séjour', 'installation'],
  en: ['expat', 'expatriate', 'immigration', 'visa', 'expats', 'expatriation', 'residence', 'residence permit', 'settlement'],
  es: ['expatriado', 'expat', 'inmigración', 'visa', 'expatriados', 'expatriación', 'residencia', 'permiso de residencia', 'instalación'],
  pt: ['expatriado', 'expat', 'imigração', 'visto', 'expatriados', 'expatriação', 'residência', 'autorização de residência', 'instalação'],
  de: ['auswanderer', 'expat', 'einwanderung', 'visum', 'auswanderer', 'auswanderung', 'aufenthalt', 'aufenthaltserlaubnis', 'ansiedlung'],
  ru: ['эмигрант', 'эмигранты', 'иммиграция', 'виза', 'эмиграция', 'проживание', 'разрешение на проживание', 'поселение'],
  ch: ['外籍人士', '外派', '移民', '签证', '外籍人士们', '外派', '居住', '居留许可', '定居'],
  hi: ['प्रवासी', 'प्रवासी', 'आप्रवासन', 'वीजा', 'प्रवासी', 'प्रवासन', 'निवास', 'निवास परमिट', 'बसावट'],
  ar: ['مغترب', 'مغتربون', 'هجرة', 'تأشيرة', 'اغتراب', 'إقامة', 'تصريح إقامة', 'استيطان'],
};

/**
 * Get all keywords for a provider type in a specific language
 */
export function getProviderTypeKeywords(
  type: 'lawyer' | 'expat',
  language: SupportedLanguage = 'fr'
): string[] {
  const keywords = type === 'lawyer' ? LAWYER_KEYWORDS : EXPAT_KEYWORDS;
  return keywords[language] || keywords['en'];
}

/**
 * Get all keywords for a provider type across all languages
 * Useful for multilingual search
 */
export function getAllProviderTypeKeywords(type: 'lawyer' | 'expat'): string {
  const allKeywords: string[] = [];
  const keywords = type === 'lawyer' ? LAWYER_KEYWORDS : EXPAT_KEYWORDS;
  
  Object.values(keywords).forEach(langKeywords => {
    allKeywords.push(...langKeywords);
  });
  
  return allKeywords.join(' ');
}

/**
 * Detect language from search query
 * Returns the most likely language code
 */
export function detectSearchLanguage(query: string): SupportedLanguage {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check each language's keywords
  for (const [lang, keywords] of Object.entries(LAWYER_KEYWORDS)) {
    if (keywords.some(keyword => normalizedQuery.includes(keyword.toLowerCase()))) {
      return lang as SupportedLanguage;
    }
  }
  
  for (const [lang, keywords] of Object.entries(EXPAT_KEYWORDS)) {
    if (keywords.some(keyword => normalizedQuery.includes(keyword.toLowerCase()))) {
      return lang as SupportedLanguage;
    }
  }
  
  // Default to French if no match
  return 'fr';
}

/**
 * Normalize language code to supported language
 */
export function normalizeLanguageCode(lang: string | undefined | null): SupportedLanguage {
  if (!lang) return 'fr';
  
  const normalized = lang.toLowerCase().trim();
  const supported: SupportedLanguage[] = ['fr', 'en', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'];
  
  if (supported.includes(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }
  
  // Map common variations
  const langMap: Record<string, SupportedLanguage> = {
    'french': 'fr',
    'français': 'fr',
    'francais': 'fr',
    'english': 'en',
    'anglais': 'en',
    'spanish': 'es',
    'español': 'es',
    'espanol': 'es',
    'portuguese': 'pt',
    'português': 'pt',
    'portugues': 'pt',
    'german': 'de',
    'deutsch': 'de',
    'allemand': 'de',
    'russian': 'ru',
    'русский': 'ru',
    'chinese': 'ch',
    '中文': 'ch',
    'hindi': 'hi',
    'हिन्दी': 'hi',
    'arabic': 'ar',
    'العربية': 'ar',
  };
  
  return langMap[normalized] || 'fr';
}

