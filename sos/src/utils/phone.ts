// npm i libphonenumber-js
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

/**
 * Liste des pays supportés par l'application
 * Utilisée pour typer le paramètre defaultCountry
 */
export type SupportedCountry =
  | 'FR' | 'BE' | 'CH' | 'MA' | 'ES' | 'IT' | 'DE' | 'GB' | 'US' | 'CA'
  | 'PT' | 'NL' | 'AT' | 'PL' | 'RO' | 'GR' | 'CZ' | 'HU' | 'SE' | 'DK'
  | 'FI' | 'NO' | 'IE' | 'LU' | 'SK' | 'SI' | 'HR' | 'BG' | 'LT' | 'LV'
  | 'EE' | 'CY' | 'MT' | 'RU' | 'UA' | 'BY' | 'KZ' | 'TR' | 'IL' | 'SA'
  | 'AE' | 'QA' | 'KW' | 'BH' | 'OM' | 'JO' | 'LB' | 'EG' | 'TN' | 'DZ'
  | 'LY' | 'SD' | 'ET' | 'KE' | 'TZ' | 'UG' | 'RW' | 'NG' | 'GH' | 'SN'
  | 'CI' | 'CM' | 'CD' | 'ZA' | 'MU' | 'MG' | 'CN' | 'JP' | 'KR' | 'IN'
  | 'PK' | 'BD' | 'LK' | 'NP' | 'TH' | 'VN' | 'ID' | 'MY' | 'SG' | 'PH'
  | 'AU' | 'NZ' | 'BR' | 'AR' | 'CL' | 'CO' | 'PE' | 'VE' | 'MX' | 'HK'
  | 'MO' | 'TW';

/**
 * Résultat de la normalisation de numéro de téléphone
 */
export interface PhoneNormalizationResult {
  ok: boolean;
  e164: string | null;
  reason?: 'empty' | 'invalid' | 'length' | 'parse_failed';
  country?: CountryCode;
  nationalNumber?: string;
}

/**
 * Normalise intelligemment un numéro de téléphone vers le format E.164
 * Gère TOUS les formats d'entrée possibles pour TOUS les pays du monde :
 *
 * - Numéros nationaux avec trunk prefix : 0612345678 (FR), 07911123456 (UK), 89121234567 (RU)
 * - Numéros nationaux sans trunk prefix : 612345678 (ES), 2125551234 (US)
 * - Numéros internationaux avec + : +33612345678, +1 212 555 1234
 * - Numéros internationaux avec 00 : 0033612345678, 00447911123456
 * - Numéros avec espaces/tirets/points : 06 12 34 56 78, 06-12-34-56-78
 * - Numéros collés sans + : 33612345678
 *
 * La bibliothèque libphonenumber-js gère automatiquement :
 * - Les trunk prefixes de chaque pays (0 pour FR/UK/DE, 8 pour RU, aucun pour US/ES)
 * - Les cas spéciaux comme l'Italie (0 conservé), l'Argentine (0/15/9), le Mexique
 *
 * @param input - Le numéro de téléphone dans n'importe quel format
 * @param selectedCountry - Le pays sélectionné dans l'UI (utilisé si le numéro n'a pas d'indicatif)
 * @returns Objet avec le numéro E.164 normalisé et des métadonnées
 */
export function smartNormalizePhone(
  input: string,
  selectedCountry: SupportedCountry | CountryCode = 'FR'
): PhoneNormalizationResult {
  // 1. Nettoyer l'entrée
  let phone = (input || '').trim();

  if (!phone) {
    return { ok: false, e164: null, reason: 'empty' };
  }

  // 2. Supprimer tous les caractères de formatage (espaces, tirets, points, parenthèses)
  phone = phone.replace(/[\s\-.()/]/g, '');

  // 3. Gérer le préfixe international "00" → "+"
  // Ex: 0033612345678 → +33612345678
  if (phone.startsWith('00') && phone.length > 4) {
    phone = '+' + phone.slice(2);
  }

  // 4. Essayer de parser le numéro
  let parsed;

  // 4a. Si le numéro commence par +, parser directement (le pays sera auto-détecté)
  if (phone.startsWith('+')) {
    parsed = parsePhoneNumberFromString(phone);
  }
  // 4b. Sinon, utiliser le pays sélectionné comme contexte
  else {
    parsed = parsePhoneNumberFromString(phone, selectedCountry as CountryCode);

    // 4c. Si ça échoue et que le numéro est assez long, essayer avec un + devant
    // (pour les cas où l'utilisateur a tapé l'indicatif sans le +)
    // Ex: 33612345678 avec FR sélectionné → essayer +33612345678
    if (!parsed && phone.length > 10 && /^[1-9]\d+$/.test(phone)) {
      parsed = parsePhoneNumberFromString('+' + phone);
    }
  }

  // 5. Vérifier si le parsing a réussi
  if (!parsed) {
    return { ok: false, e164: null, reason: 'parse_failed' };
  }

  // 6. Vérifier si le numéro est valide
  if (!parsed.isValid()) {
    return { ok: false, e164: null, reason: 'invalid' };
  }

  // 7. Extraire le format E.164
  const e164 = parsed.number;

  // 8. Validation finale du format E.164 (longueur standard internationale)
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
    return { ok: false, e164: null, reason: 'length' };
  }

  return {
    ok: true,
    e164,
    country: parsed.country,
    nationalNumber: parsed.nationalNumber,
  };
}

/**
 * Fonction legacy pour compatibilité - utilise smartNormalizePhone en interne
 * @deprecated Utiliser smartNormalizePhone() à la place
 */
export function toE164(input: string, defaultCountry: SupportedCountry = 'FR') {
  const result = smartNormalizePhone(input, defaultCountry);
  return {
    ok: result.ok,
    e164: result.e164,
    reason: result.reason || (result.ok ? undefined : 'invalid'),
  };
}

/**
 * Normalise un numéro de téléphone pour l'affichage dans un champ de saisie
 * Utilisé par IntlPhoneInput pour nettoyer l'entrée utilisateur
 *
 * @param input - Le numéro brut saisi par l'utilisateur
 * @param selectedCountryCode - Le code pays sélectionné (ex: "fr", "us")
 * @returns Le numéro nettoyé en format E.164 ou la valeur originale si invalide
 */
export function normalizePhoneForInput(
  input: string,
  selectedCountryCode: string
): string {
  if (!input) return '';

  const countryUpper = (selectedCountryCode || 'fr').toUpperCase() as SupportedCountry;
  const result = smartNormalizePhone(input, countryUpper);

  // Si la normalisation réussit, retourner le E.164
  if (result.ok && result.e164) {
    return result.e164;
  }

  // Sinon, retourner l'entrée nettoyée des caractères de formatage
  // mais avec le + si présent
  let cleaned = input.replace(/[\s\-.()/]/g, '');
  if (cleaned.startsWith('00') && cleaned.length > 4) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    // Ajouter + si absent (le composant react-phone-input-2 s'attend à ça)
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Vérifie si un numéro de téléphone est valide pour un pays donné
 * Utile pour la validation de formulaires
 *
 * @param phone - Le numéro à valider
 * @param country - Le pays de référence (optionnel, auto-détecté si le numéro a un +)
 * @returns true si le numéro est valide
 */
export function isValidPhone(phone: string, country?: SupportedCountry): boolean {
  if (!phone) return false;
  const result = smartNormalizePhone(phone, country || 'FR');
  return result.ok;
}

/**
 * Extrait le numéro national d'un numéro E.164
 * Ex: +33612345678 → 612345678
 *
 * @param e164 - Le numéro en format E.164
 * @returns Le numéro national ou null si invalide
 */
export function getNationalNumber(e164: string): string | null {
  if (!e164) return null;
  const parsed = parsePhoneNumberFromString(e164);
  return parsed?.nationalNumber || null;
}

/**
 * Extrait le code pays d'un numéro E.164
 * Ex: +33612345678 → FR
 *
 * @param e164 - Le numéro en format E.164
 * @returns Le code pays ISO ou null si invalide
 */
export function getCountryFromPhone(e164: string): CountryCode | null {
  if (!e164) return null;
  const parsed = parsePhoneNumberFromString(e164);
  return parsed?.country || null;
}