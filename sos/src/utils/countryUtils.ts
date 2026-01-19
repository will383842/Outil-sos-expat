// ========================================
// src/utils/countryUtils.ts - Utilitaires pour les codes pays
// ========================================

import { countriesData, type CountryData } from '../data/countries';

/**
 * Convertit un nom de pays (dans n'importe quelle langue supportée) vers son code ISO-2
 * @param countryName - Nom du pays (ex: "Algeria", "Algérie", "Algerien")
 * @returns Code ISO-2 (ex: "DZ") ou undefined si non trouvé
 */
export function getCountryCodeFromName(countryName: string | undefined | null): string | undefined {
  if (!countryName || typeof countryName !== 'string') return undefined;

  const normalized = countryName.trim().toLowerCase();
  if (!normalized) return undefined;

  // Chercher dans tous les noms de pays (toutes les langues)
  const country = countriesData.find((c: CountryData) => {
    // Ignorer le séparateur visuel
    if (c.code === 'SEPARATOR') return false;

    // Vérifier si c'est déjà un code ISO
    if (c.code.toLowerCase() === normalized) return true;

    // Vérifier tous les noms de pays (10 langues)
    return (
      c.nameFr?.toLowerCase() === normalized ||
      c.nameEn?.toLowerCase() === normalized ||
      c.nameEs?.toLowerCase() === normalized ||
      c.nameDe?.toLowerCase() === normalized ||
      c.namePt?.toLowerCase() === normalized ||
      c.nameZh?.toLowerCase() === normalized ||
      c.nameAr?.toLowerCase() === normalized ||
      c.nameRu?.toLowerCase() === normalized ||
      c.nameIt?.toLowerCase() === normalized ||
      c.nameNl?.toLowerCase() === normalized
    );
  });

  return country?.code;
}

/**
 * Normalise un code pays ou nom de pays pour obtenir le code ISO-2 valide
 * S'utilise dans CallCheckout.tsx pour fiabiliser l'extraction du code pays
 *
 * @param country - Code pays (FR, DZ) ou nom complet (France, Algeria)
 * @returns Code ISO-2 normalisé (ex: "DZ") ou undefined
 */
export function normalizeCountryToCode(country: string | undefined | null): string | undefined {
  if (!country || typeof country !== 'string') return undefined;

  const trimmed = country.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();

  // Si c'est déjà un code ISO-2 de 2 caractères et qu'il existe dans la liste
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    const exists = countriesData.some((c: CountryData) => c.code === upper && c.code !== 'SEPARATOR');
    if (exists) return upper;
  }

  // Sinon, chercher par nom dans toutes les langues
  return getCountryCodeFromName(country);
}

/**
 * Vérifie si un code pays est valide (existe dans la liste)
 * @param countryCode - Code ISO-2 (ex: "FR", "DZ")
 * @returns true si le code est valide
 */
export function isValidCountryCode(countryCode: string | undefined | null): boolean {
  if (!countryCode || typeof countryCode !== 'string') return false;

  const upper = countryCode.trim().toUpperCase();
  if (upper.length !== 2) return false;

  return countriesData.some((c: CountryData) => c.code === upper && c.code !== 'SEPARATOR');
}

/**
 * Récupère les données complètes d'un pays par son code ou nom
 * @param countryCodeOrName - Code ISO-2 ou nom du pays
 * @returns Données complètes du pays ou undefined
 */
export function getCountryData(countryCodeOrName: string | undefined | null): CountryData | undefined {
  if (!countryCodeOrName) return undefined;

  const code = normalizeCountryToCode(countryCodeOrName);
  if (!code) return undefined;

  return countriesData.find((c: CountryData) => c.code === code);
}
