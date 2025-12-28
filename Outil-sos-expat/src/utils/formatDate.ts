/**
 * =============================================================================
 * UTILS DE FORMATAGE DE DATES
 * Support pour Date, string, number et Firebase Timestamp
 * =============================================================================
 */

import { Timestamp } from "firebase/firestore";

export type DateInput = Date | string | number | Timestamp | null | undefined;

// =============================================================================
// CONVERSION
// =============================================================================

/**
 * Convertit n'importe quel type de date en objet Date
 */
export function toDate(date: DateInput): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === "string" || typeof date === "number") return new Date(date);
  return null;
}

// =============================================================================
// FORMATAGE
// =============================================================================

/**
 * Formate une date en format long (ex: "15 janvier 2025")
 */
export function formatDate(
  date: DateInput,
  locale: string = "fr-FR",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(date);
  if (!d) return "—";

  const fmt: Intl.DateTimeFormatOptions = options ?? {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Intl.DateTimeFormat(locale, fmt).format(d);
}

/**
 * Formate une date avec l'heure (ex: "15 janv. 2025, 14:30")
 */
export function formatDateTime(date: DateInput, locale: string = "fr-FR"): string {
  const d = toDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formate une date en format court (ex: "15 janv., 14:30")
 * Utilisé dans les cartes de dossiers
 */
export function formatDateShort(date: DateInput, locale: string = "fr-FR"): string {
  const d = toDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formate un Timestamp Firebase (alias pour formatDateShort)
 * Fonction de compatibilité pour les pages existantes
 */
export function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  return formatDateShort(timestamp);
}

/**
 * Formate une date relative (ex: "il y a 2 heures", "hier")
 */
export function timeAgo(
  date: DateInput,
  now: Date = new Date(),
  locale = "fr-FR"
): string {
  const d = toDate(date);
  if (!d) return "—";

  const diff = (now.getTime() - d.getTime()) / 1000; // seconds
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const map: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = diff;
  let unit: Intl.RelativeTimeFormatUnit = "second";

  let acc = 1;
  for (const [factor, u] of map) {
    if (abs < acc * factor) {
      unit = u;
      value = diff / acc;
      break;
    }
    acc *= factor;
  }

  return rtf.format(Math.round(value * -1), unit);
}

/**
 * Formate une date pour l'affichage dans les listes
 * Affiche "Aujourd'hui", "Hier" ou la date formatée
 */
export function formatRelativeDate(date: DateInput, locale: string = "fr-FR"): string {
  const d = toDate(date);
  if (!d) return "—";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  if (diffDays === 1) {
    return "Hier";
  }

  if (diffDays < 7) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
    }).format(d);
  }

  return formatDate(d, locale, {
    day: "numeric",
    month: "short",
  });
}
