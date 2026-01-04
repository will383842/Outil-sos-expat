/**
 * Tax Module - Exports
 *
 * Ce module centralise les fonctionnalites liees a la fiscalite:
 * - Validation des numeros de TVA (VIES pour l'UE, HMRC pour le UK)
 * - Cache Firestore pour les validations
 * - Verification d'eligibilite a l'autoliquidation B2B
 */

// ============================================================================
// Service Unifie (recommande)
// ============================================================================

export {
  // Fonctions principales
  validateVatNumber,
  validateFullVatNumber,
  validateMultipleVatNumbers,
  isEligibleForReverseCharge,

  // Cache management
  invalidateCache,
  cleanupExpiredCache,

  // Helpers
  isEUCountry,
  isUkCountry,
  normalizeCountryCode,
  formatEuVatNumber,
  formatUkVatNumber,

  // Constants
  VAT_CACHE_COLLECTION,
  CACHE_TTL_DAYS,

  // Types
  type VatValidationResult,
  type VatValidationOptions,
  type CachedVatValidation,
} from "./vatValidation";

// ============================================================================
// Services Specifiques (pour usage avance)
// ============================================================================

export {
  // VIES Service (EU)
  validateVatNumberVIES,
  validateFullVatNumber as validateFullVatNumberVIES,
  formatVatNumber as formatEuVatNumberDirect,
  EU_COUNTRY_CODES,
  VIES_SOAP_ENDPOINT,
  type ViesValidationResult,
  type ViesServiceConfig,
  type ViesErrorCode,
} from "./viesService";

export {
  // HMRC Service (UK)
  validateVatNumberHMRC,
  isValidUkVatFormat,
  HMRC_VAT_ENDPOINT,
  type HmrcValidationResult,
  type HmrcServiceConfig,
  type HmrcErrorCode,
  type HmrcAddress,
} from "./hmrcService";
