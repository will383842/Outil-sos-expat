/**
 * useSEOTranslations Hook
 *
 * Hook for accessing SEO translations (meta titles, descriptions)
 * based on the current language/locale.
 *
 * @example
 * ```tsx
 * const { title, description, locale } = useSEOTranslations('home');
 *
 * return (
 *   <SEOHead title={title} description={description} />
 * );
 * ```
 */

import { useApp } from '@/contexts/AppContext';

// Import all SEO translations
import frSeo from '@/locales/fr-fr/seo.json';
import enSeo from '@/locales/en/seo.json';
import esSeo from '@/locales/es-es/seo.json';
import deSeo from '@/locales/de-de/seo.json';
import ptSeo from '@/locales/pt-pt/seo.json';
import ruSeo from '@/locales/ru-ru/seo.json';
import zhSeo from '@/locales/zh-cn/seo.json';
import arSeo from '@/locales/ar-sa/seo.json';
import hiSeo from '@/locales/hi-in/seo.json';

type Language = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'ch' | 'ar' | 'hi';

type PageKey =
  | 'home'
  | 'pricing'
  | 'faq'
  | 'contact'
  | 'helpCenter'
  | 'howItWorks'
  | 'testimonials'
  | 'privacyPolicy'
  | 'termsClients'
  | 'termsLawyers'
  | 'termsExpats'
  | 'cookies'
  | 'login'
  | 'register';

interface SEOMeta {
  title: string;
  description: string;
}

interface SEOTranslations {
  meta: Record<PageKey, SEOMeta>;
}

// Map language codes to SEO translation files
const seoTranslations: Record<Language, SEOTranslations> = {
  fr: frSeo as SEOTranslations,
  en: enSeo as SEOTranslations,
  es: esSeo as SEOTranslations,
  de: deSeo as SEOTranslations,
  pt: ptSeo as SEOTranslations,
  ru: ruSeo as SEOTranslations,
  ch: zhSeo as SEOTranslations, // Note: 'ch' is used internally for Chinese
  ar: arSeo as SEOTranslations,
  hi: hiSeo as SEOTranslations,
};

// Default SEO values (fallback)
const defaultSEO: SEOMeta = {
  title: 'SOS Expat - Legal Assistance for Expats',
  description: 'Talk to a lawyer or local expert in under 5 minutes. 197 countries, all languages.',
};

/**
 * Hook to get SEO translations for a specific page
 *
 * @param page - The page key (e.g., 'home', 'pricing', 'faq')
 * @returns Object with title, description, and current locale
 */
export function useSEOTranslations(page: PageKey) {
  const { language } = useApp();

  // Get translations for the current language
  const translations = seoTranslations[language as Language] || seoTranslations.en;

  // Get the page-specific meta
  const meta = translations?.meta?.[page] || defaultSEO;

  return {
    title: meta.title,
    description: meta.description,
    locale: language,
  };
}

/**
 * Get SEO translations for a specific page and language
 * (Static version for SSR/SSG scenarios)
 *
 * @param page - The page key
 * @param language - The language code
 * @returns Object with title and description
 */
export function getSEOTranslations(page: PageKey, language: Language): SEOMeta {
  const translations = seoTranslations[language] || seoTranslations.en;
  return translations?.meta?.[page] || defaultSEO;
}

export default useSEOTranslations;
