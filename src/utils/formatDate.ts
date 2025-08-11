/**
 * Utils de formatage de dates
 * Remplacement d'un fichier corrompu qui contenait du JSON.
 */

export type DateInput = Date | string | number;

export function formatDate(date: DateInput, locale: string = 'fr-FR', options?: Intl.DateTimeFormatOptions): string {
  const d = (date instanceof Date) ? date : new Date(date);
  const fmt: Intl.DateTimeFormatOptions = options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return new Intl.DateTimeFormat(locale, fmt).format(d);
}

export function formatDateTime(date: DateInput, locale: string = 'fr-FR'): string {
  const d = (date instanceof Date) ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function timeAgo(date: DateInput, now: Date = new Date(), locale = 'fr-FR'): string {
  const d = (date instanceof Date) ? date : new Date(date);
  const diff = (now.getTime() - d.getTime()) / 1000; // seconds
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const map: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year']
  ];

  let value = diff;
  let unit: Intl.RelativeTimeFormatUnit = 'second';

  let acc = 1;
  for (const [factor, u] of map) {
    if (abs < acc * factor) {
      unit = u;
      value = diff / acc;
      break;
    }
    acc *= factor;
  }

  return rtf.format(Math.round(value * -1), unit); // passé => négatif
}
