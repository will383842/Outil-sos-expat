// src/i18n/constants/locales.ts
// Langues supportées: FR, EN, DE, RU, CH (Chinese), ES, PT, AR, HI
// Note: 'ch' est utilisé dans SOS (convention interne), 'zh' dans Outil-sos-expat (ISO standard)
export const SUPPORTED_LOCALES = ['fr', 'en', 'de', 'ru', 'ch', 'es', 'pt', 'ar', 'hi'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: SupportedLocale = 'fr';
