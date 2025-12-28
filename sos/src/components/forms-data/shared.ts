export type Locale = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'ch' | 'hi' | 'ar';

export interface SharedOption {
  value: string;
  label: string;
  isShared?: boolean;
}

export const defaultPlaceholderByLocale: Record<Locale, string> = {
  fr: "Sélectionner...",
  en: "Select...",
  es: "Seleccionar...",
  de: "Auswählen...",
  pt: "Selecionar...",
  ru: "Выбрать...",
  ch: "选择...",
  hi: "चुनें...",
  ar: "اختر..."
};

export const noOptionsMessages: Record<Locale, { withInput: string; empty: string }> = {
  fr: { withInput: 'Aucun résultat pour "{input}"', empty: 'Aucun résultat disponible' },
  en: { withInput: 'No results for "{input}"', empty: 'No results available' },
  es: { withInput: 'Sin resultados para "{input}"', empty: 'Sin resultados disponibles' },
  de: { withInput: 'Keine Ergebnisse für "{input}"', empty: 'Keine Ergebnisse verfügbar' },
  pt: { withInput: 'Nenhum resultado para "{input}"', empty: 'Nenhum resultado disponível' },
  ru: { withInput: 'Нет результатов для "{input}"', empty: 'Нет доступных результатов' },
  ch: { withInput: '没有找到"{input}"的结果', empty: '没有可用结果' },
  hi: { withInput: '"{input}" के लिए कोई परिणाम नहीं', empty: 'कोई परिणाम उपलब्ध नहीं' },
  ar: { withInput: 'لا توجد نتائج لـ "{input}"', empty: 'لا توجد نتائج متاحة' }
};

export const getNoOptionsMessage = (locale: Locale, inputValue: string): string => {
  const messages = noOptionsMessages[locale] || noOptionsMessages.en;
  return inputValue ? messages.withInput.replace('{input}', inputValue) : messages.empty;
};

export const getDetectedBrowserLanguage = (): Locale => {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('ru')) return 'ru';
    if (lang.startsWith('zh')) return 'ch';
    if (lang.startsWith('hi')) return 'hi';
    if (lang.startsWith('ar')) return 'ar';
    return 'en';
  }
  return 'fr';
};

export const normalize = (text: string): string => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const getLocalizedLabel = (item: any, locale: Locale, fallback: string): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item[locale] || item.name || item.label || fallback;
  }
  return fallback;
};

export const makeAdaptiveStyles = <T extends SharedOption = SharedOption>(highlightShared = false) => {
  return {
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.data?.isShared && highlightShared ? '#f3f4f6' : provided.backgroundColor
    }),
    control: (provided: any) => ({
      ...provided,
      minHeight: '40px'
    })
  };
};
