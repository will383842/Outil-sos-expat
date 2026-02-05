/**
 * =============================================================================
 * Country Utilities - Utilitaires pour la conversion des codes pays
 * =============================================================================
 *
 * Utilise la même source de données que le frontend (countries.ts)
 * pour garantir la cohérence entre tous les systèmes.
 *
 * Utilisé pour:
 * - SMS aux prestataires (afficher le nom complet du pays)
 * - Sync vers l'outil IA (pays cohérent entre SMS et IA)
 * - Notifications (afficher les pays lisiblement)
 *
 * =============================================================================
 */

import { countriesData, type CountryData } from '../data/countries';

/**
 * Convertit un code ISO-2 ou nom de pays en nom complet dans la langue spécifiée.
 *
 * IMPORTANT: Cette fonction est la source de vérité pour l'affichage des pays
 * dans les SMS et notifications aux prestataires.
 *
 * @param countryCodeOrName - Code ISO-2 (ex: "TH", "FR") ou nom de pays
 * @param language - Code langue pour le nom de retour (défaut: 'fr')
 * @returns Nom complet du pays (ex: "Thaïlande", "France")
 *          ou la valeur d'origine si non trouvé
 *
 * @example
 * getCountryName("TH") // "Thaïlande"
 * getCountryName("FR") // "France"
 * getCountryName("thailand") // "Thaïlande"
 * getCountryName("France") // "France"
 * getCountryName("") // ""
 */
export function getCountryName(
  countryCodeOrName: string | undefined | null,
  language: 'fr' | 'en' | 'es' | 'de' | 'pt' | 'zh' | 'ar' | 'ru' | 'it' | 'nl' = 'fr'
): string {
  if (!countryCodeOrName || typeof countryCodeOrName !== 'string') return '';

  const trimmed = countryCodeOrName.trim();
  if (!trimmed) return '';

  // Récupérer les données du pays
  const countryData = getCountryData(trimmed);

  if (!countryData) {
    // Si pas trouvé, retourner la valeur d'origine (peut déjà être un nom complet)
    return trimmed;
  }

  // Mapper le code langue vers le champ correspondant
  const nameFieldMap: Record<string, keyof CountryData> = {
    fr: 'nameFr',
    en: 'nameEn',
    es: 'nameEs',
    de: 'nameDe',
    pt: 'namePt',
    zh: 'nameZh',
    ar: 'nameAr',
    ru: 'nameRu',
    it: 'nameIt',
    nl: 'nameNl',
  };

  const nameField = nameFieldMap[language] || 'nameFr';
  const countryName = countryData[nameField] as string;

  // Fallback vers le français si le nom dans la langue demandée est vide
  return countryName || countryData.nameFr || trimmed;
}

/**
 * Récupère les données complètes d'un pays par son code ou nom.
 *
 * @param countryCodeOrName - Code ISO-2 ou nom du pays
 * @returns Données complètes du pays ou undefined
 */
export function getCountryData(countryCodeOrName: string | undefined | null): CountryData | undefined {
  if (!countryCodeOrName || typeof countryCodeOrName !== 'string') return undefined;

  const trimmed = countryCodeOrName.trim();
  if (!trimmed) return undefined;

  const code = normalizeCountryToCode(trimmed);
  if (!code) return undefined;

  return countriesData.find((c: CountryData) => c.code === code);
}

/**
 * Normalise un code pays ou nom de pays vers le code ISO-2.
 *
 * @param countryCodeOrName - Code ISO-2 ou nom de pays
 * @returns Code ISO-2 (ex: "TH", "FR") ou undefined
 *
 * @example
 * normalizeCountryToCode("thailand") // "TH"
 * normalizeCountryToCode("TH") // "TH"
 * normalizeCountryToCode("Thaïlande") // "TH"
 */
export function normalizeCountryToCode(country: string | undefined | null): string | undefined {
  if (!country || typeof country !== 'string') return undefined;

  const trimmed = country.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  const normalized = trimmed.toLowerCase();

  // Si c'est déjà un code ISO-2 de 2 caractères et qu'il existe dans la liste
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    const exists = countriesData.some((c: CountryData) => c.code === upper && c.code !== 'SEPARATOR');
    if (exists) return upper;
  }

  // Chercher par nom dans toutes les langues
  const countryData = countriesData.find((c: CountryData) => {
    // Ignorer le séparateur visuel
    if (c.code === 'SEPARATOR') return false;

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

  return countryData?.code;
}

/**
 * Vérifie si un code pays est valide (existe dans la liste).
 *
 * @param countryCode - Code ISO-2 à vérifier
 * @returns true si le code est valide
 */
export function isValidCountryCode(countryCode: string | undefined | null): boolean {
  if (!countryCode || typeof countryCode !== 'string') return false;

  const upper = countryCode.trim().toUpperCase();
  if (upper.length !== 2) return false;

  return countriesData.some((c: CountryData) => c.code === upper && c.code !== 'SEPARATOR');
}
