// ts.ts — helpers de typage
export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'Unknown error');

export type OptionalDate = Date | null | undefined;

// Convertit tout (Firebase Timestamp, number ms, string ISO, Date) -> Date
export const toDate = (v: any): Date | null => {
  try {
    if (!v && v !== 0) return null;
    if (v?.toDate) return v.toDate(); // Firestore Timestamp
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') return new Date(v);
    return null;
  } catch {
    return null;
  }
};

// formatDate qui accepte Date | number | Firebase Timestamp | string
// Now uses locale-aware formatting (backward compatible)
export const formatAnyDate = (v: any, locale = 'fr-FR', language?: string, userCountry?: string): string => {
  const d = toDate(v);
  if (!d) return '—';
  
  // Use new locale formatters if language is provided
  if (language) {
    try {
      // Dynamic import to avoid circular dependencies
      const { formatDate: formatDateLocale } = require('./localeFormatters');
      return formatDateLocale(d, {
        language,
        userCountry,
        format: 'medium',
      });
    } catch {
      // Fallback to old behavior
    }
  }
  
  // Fallback to old behavior
  return d.toLocaleString(locale);
};
