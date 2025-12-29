/**
 * =============================================================================
 * EXPORT DATA — Utilitaires d'export de données
 * Export CSV et JSON pour les dossiers, prestataires, etc.
 * =============================================================================
 */

import { auditLog } from "./auditLog";

// =============================================================================
// TYPES
// =============================================================================

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  transform?: (value: unknown, row: T) => string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formate une valeur pour CSV (échappe les guillemets et virgules)
 */
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const strValue = String(value);

  // Si contient des virgules, guillemets ou retours à la ligne, encadrer de guillemets
  if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }

  return strValue;
}

// Locale courante pour l'export (peut être modifiée via setExportLocale)
let currentExportLocale = "fr-FR";

/**
 * Définit la locale utilisée pour formater les dates dans les exports
 */
export function setExportLocale(locale: string): void {
  currentExportLocale = locale;
}

/**
 * Récupère la locale actuelle pour les exports
 */
export function getExportLocale(): string {
  return currentExportLocale;
}

/**
 * Formate une date Firestore Timestamp ou Date
 * Compatible avec ExportColumn.transform (le 2e param est ignoré, utilise currentExportLocale)
 */
function formatDate(value: unknown, _row?: unknown): string {
  if (!value) return "";
  const dateLocale = currentExportLocale;

  // Firestore Timestamp
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Date native
  if (value instanceof Date) {
    return value.toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(value);
}

/**
 * Accède à une valeur imbriquée via un chemin (ex: "client.name")
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// =============================================================================
// EXPORTS CSV
// =============================================================================

/**
 * Génère un fichier CSV à partir d'un tableau de données
 */
export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  // En-têtes
  const headers = columns.map((col) => formatCsvValue(col.header)).join(",");

  // Lignes
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = getNestedValue(row, col.key as string);
        const transformed = col.transform ? col.transform(value, row) : value;
        return formatCsvValue(transformed);
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Télécharge un fichier CSV
 */
export function downloadCsv(content: string, filename: string): void {
  const BOM = "\uFEFF"; // Pour support Excel avec caractères accentués
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// =============================================================================
// EXPORTS JSON
// =============================================================================

/**
 * Génère un fichier JSON
 */
export function generateJson<T>(data: T[]): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Télécharge un fichier JSON
 */
export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// =============================================================================
// EXPORTS SPÉCIALISÉS
// =============================================================================

/**
 * Colonnes pour export des dossiers (bookings)
 */
export const bookingExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: "id", header: "ID" },
  { key: "clientName", header: "Nom du client" },
  { key: "clientEmail", header: "Email" },
  { key: "clientPhone", header: "Téléphone" },
  { key: "status", header: "Statut", transform: (v) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      in_progress: "En cours",
      completed: "Terminé",
      cancelled: "Annulé",
    };
    return labels[v as string] || String(v);
  }},
  { key: "providerType", header: "Type", transform: (v) =>
    v === "lawyer" ? "Avocat" : "Expert expatrié"
  },
  { key: "country", header: "Pays" },
  { key: "category", header: "Catégorie" },
  { key: "price", header: "Prix (€)" },
  { key: "aiProcessed", header: "Traité IA", transform: (v) => v ? "Oui" : "Non" },
  { key: "createdAt", header: "Date création", transform: formatDate },
  { key: "updatedAt", header: "Date modification", transform: formatDate },
];

/**
 * Colonnes pour export des prestataires
 */
export const providerExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nom" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Téléphone" },
  { key: "type", header: "Type", transform: (v) =>
    v === "lawyer" ? "Avocat" : "Expert expatrié"
  },
  { key: "country", header: "Pays" },
  { key: "city", header: "Ville" },
  { key: "specialties", header: "Spécialités", transform: (v) =>
    Array.isArray(v) ? v.join(", ") : String(v || "")
  },
  { key: "active", header: "Actif", transform: (v) => v !== false ? "Oui" : "Non" },
  { key: "hasToolAccess", header: "Accès outil", transform: (v) => v ? "Oui" : "Non" },
  { key: "createdAt", header: "Date création", transform: formatDate },
];

/**
 * Export dossiers en CSV avec logging
 */
export async function exportBookingsToCsv(
  bookings: Record<string, unknown>[],
  filename = "dossiers"
): Promise<void> {
  const csv = generateCsv(bookings, bookingExportColumns);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csv, `${filename}_${timestamp}`);

  // Log l'action
  await auditLog.dataExport("bookings_csv", bookings.length);
}

/**
 * Export dossiers en JSON avec logging
 */
export async function exportBookingsToJson(
  bookings: Record<string, unknown>[],
  filename = "dossiers"
): Promise<void> {
  const json = generateJson(bookings);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadJson(json, `${filename}_${timestamp}`);

  // Log l'action
  await auditLog.dataExport("bookings_json", bookings.length);
}

/**
 * Export prestataires en CSV avec logging
 */
export async function exportProvidersToCsv(
  providers: Record<string, unknown>[],
  filename = "prestataires"
): Promise<void> {
  const csv = generateCsv(providers, providerExportColumns);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csv, `${filename}_${timestamp}`);

  // Log l'action
  await auditLog.dataExport("providers_csv", providers.length);
}

/**
 * Export prestataires en JSON avec logging
 */
export async function exportProvidersToJson(
  providers: Record<string, unknown>[],
  filename = "prestataires"
): Promise<void> {
  const json = generateJson(providers);
  const timestamp = new Date().toISOString().split("T")[0];
  downloadJson(json, `${filename}_${timestamp}`);

  // Log l'action
  await auditLog.dataExport("providers_json", providers.length);
}
