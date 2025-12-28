// src/i18n/lang.ts
// Langues supportées: FR, EN, DE, RU, CH (Chinese), ES, PT, AR, HI
export type Lang = 'fr' | 'en' | 'de' | 'ru' | 'ch' | 'es' | 'pt' | 'ar' | 'hi';

export const SUPPORTED_LANGS: Lang[] = ['fr', 'en', 'de', 'ru', 'ch', 'es', 'pt', 'ar', 'hi'];
const STORAGE_KEY = 'app:lang';

function langFromNavigator(): Lang {
  if (typeof navigator === 'undefined') return 'fr';
  const langs = (navigator.languages ?? [navigator.language]).map(l => (l || '').toLowerCase());

  for (const l of langs) {
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('en')) return 'en';
    if (l.startsWith('de')) return 'de';
    if (l.startsWith('ru')) return 'ru';
    if (l.startsWith('zh') || l.startsWith('ch')) return 'ch';
    if (l.startsWith('es')) return 'es';
    if (l.startsWith('pt')) return 'pt';
    if (l.startsWith('ar')) return 'ar';
    if (l.startsWith('hi')) return 'hi';
  }
  return 'fr';
}

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved as Lang)) return saved as Lang;
  } catch {}
  return langFromNavigator();
}

export function setLang(lang: Lang): void {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
}
