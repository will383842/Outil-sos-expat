/**
 * HMRC VAT Service
 *
 * Service pour valider les numeros de TVA britanniques (UK) via l'API HMRC.
 * Utilise apres le Brexit car le UK n'est plus dans le systeme VIES.
 *
 * Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-registered-companies-api
 */

import axios, { AxiosError } from "axios";
import * as functions from "firebase-functions";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HmrcValidationResult {
  valid: boolean;
  countryCode: "GB";
  vatNumber: string;
  requestDate: Date;
  name?: string;
  address?: HmrcAddress;
  errorCode?: HmrcErrorCode;
  errorMessage?: string;
}

export interface HmrcAddress {
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  line5?: string;
  postcode?: string;
  countryCode?: string;
}

export type HmrcErrorCode =
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

export interface HmrcServiceConfig {
  /** Timeout en millisecondes (defaut: 10000) */
  timeout?: number;
  /** Nombre de tentatives en cas d'erreur (defaut: 3) */
  maxRetries?: number;
  /** Delai initial entre les tentatives en ms (defaut: 1000) */
  initialRetryDelay?: number;
  /** Multiplicateur pour le backoff exponentiel (defaut: 2) */
  backoffMultiplier?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HMRC_VAT_ENDPOINT = "https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup";

const DEFAULT_CONFIG: Required<HmrcServiceConfig> = {
  timeout: 10000,
  maxRetries: 3,
  initialRetryDelay: 1000,
  backoffMultiplier: 2,
};

/** Erreurs HMRC qui justifient un retry */
const RETRYABLE_ERRORS: Set<HmrcErrorCode> = new Set([
  "SERVICE_UNAVAILABLE",
  "INTERNAL_SERVER_ERROR",
  "TIMEOUT",
  "NETWORK_ERROR",
  "RATE_LIMITED",
]);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate le numero de TVA UK
 * Formats acceptes: GB123456789, 123456789, 123 4567 89
 */
export function formatUkVatNumber(vatNumber: string): string {
  // Supprimer tous les caracteres non alphanumeriques
  let formatted = vatNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  // Supprimer le prefixe GB s'il existe
  if (formatted.startsWith("GB")) {
    formatted = formatted.substring(2);
  }

  return formatted;
}

/**
 * Valide le format du numero de TVA UK
 * Le numero doit avoir 9 ou 12 chiffres
 */
export function isValidUkVatFormat(vatNumber: string): boolean {
  const formatted = formatUkVatNumber(vatNumber);
  // 9 chiffres standard ou 12 chiffres pour les groupes TVA
  return /^[0-9]{9}$/.test(formatted) || /^[0-9]{12}$/.test(formatted);
}

/**
 * Convertit l'adresse HMRC en string
 * Note: Utilisee dans vatValidation.ts via result.address
 */
export function formatHmrcAddress(address: HmrcAddress): string {
  const parts = [
    address.line1,
    address.line2,
    address.line3,
    address.line4,
    address.line5,
    address.postcode,
    address.countryCode,
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Attend un delai specifie
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mappe les codes d'erreur HTTP HMRC vers nos codes
 */
function mapHttpErrorCode(status: number, code?: string): HmrcErrorCode {
  if (status === 404) return "NOT_FOUND";
  if (status === 400) return "INVALID_REQUEST";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") return "TIMEOUT";
  return "UNKNOWN_ERROR";
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

interface HmrcApiResponse {
  target: {
    name: string;
    vatNumber: string;
    address?: HmrcAddress;
  };
  processingDate: string;
}

interface HmrcApiError {
  code?: string;
  message?: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Valide un numero de TVA britannique via l'API HMRC
 *
 * @param vatNumber - Numero de TVA UK (avec ou sans prefixe GB)
 * @param config - Configuration optionnelle
 * @returns Resultat de la validation
 *
 * @example
 * ```typescript
 * const result = await validateVatNumberHMRC("123456789");
 * if (result.valid) {
 *   console.log(`Entreprise: ${result.name}`);
 * }
 * ```
 */
export async function validateVatNumberHMRC(
  vatNumber: string,
  config: HmrcServiceConfig = {}
): Promise<HmrcValidationResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Formater le numero
  const formattedVat = formatUkVatNumber(vatNumber);

  // Validation du format
  if (!isValidUkVatFormat(formattedVat)) {
    return {
      valid: false,
      countryCode: "GB",
      vatNumber: formattedVat,
      requestDate: new Date(),
      errorCode: "INVALID_REQUEST",
      errorMessage: "Format de numero de TVA UK invalide. Attendu: 9 ou 12 chiffres.",
    };
  }

  // URL de l'API
  const url = `${HMRC_VAT_ENDPOINT}/${formattedVat}`;

  // Tentatives avec retry et backoff
  let lastError: HmrcValidationResult | null = null;
  let currentDelay = mergedConfig.initialRetryDelay;

  for (let attempt = 1; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      functions.logger.info("[HMRC] Validation attempt", {
        attempt,
        vatNumber: formattedVat.substring(0, 3) + "***", // Masquer partiellement
      });

      const response = await axios.get<HmrcApiResponse>(url, {
        headers: {
          "Accept": "application/vnd.hmrc.1.0+json",
        },
        timeout: mergedConfig.timeout,
        validateStatus: () => true, // Accepter tous les codes HTTP
      });

      // Traiter la reponse selon le code HTTP
      if (response.status === 200) {
        const data = response.data;

        const result: HmrcValidationResult = {
          valid: true,
          countryCode: "GB",
          vatNumber: formattedVat,
          requestDate: new Date(data.processingDate || new Date()),
          name: data.target?.name,
          address: data.target?.address,
        };

        functions.logger.info("[HMRC] Validation successful", {
          vatNumber: formattedVat.substring(0, 3) + "***",
          name: result.name,
        });

        return result;
      }

      // Gerer les erreurs HTTP
      const errorCode = mapHttpErrorCode(response.status);
      const errorData = response.data as unknown as HmrcApiError;

      // Si erreur retryable et pas dernier essai
      if (RETRYABLE_ERRORS.has(errorCode) && attempt < mergedConfig.maxRetries) {
        functions.logger.warn("[HMRC] Retryable error, will retry", {
          errorCode,
          status: response.status,
          attempt,
          nextDelay: currentDelay,
        });

        lastError = {
          valid: false,
          countryCode: "GB",
          vatNumber: formattedVat,
          requestDate: new Date(),
          errorCode,
          errorMessage: errorData?.message || `HTTP ${response.status}`,
        };

        await sleep(currentDelay);
        currentDelay *= mergedConfig.backoffMultiplier;
        continue;
      }

      // Erreur non retryable ou dernier essai
      if (errorCode === "NOT_FOUND") {
        functions.logger.info("[HMRC] VAT number not found (invalid)", {
          vatNumber: formattedVat.substring(0, 3) + "***",
        });

        return {
          valid: false,
          countryCode: "GB",
          vatNumber: formattedVat,
          requestDate: new Date(),
          // Pas d'errorCode car c'est une validation "normale" (numero invalide)
        };
      }

      functions.logger.error("[HMRC] Validation failed with error", {
        errorCode,
        status: response.status,
        message: errorData?.message,
      });

      return {
        valid: false,
        countryCode: "GB",
        vatNumber: formattedVat,
        requestDate: new Date(),
        errorCode,
        errorMessage: errorData?.message || `HTTP ${response.status}`,
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      functions.logger.error("[HMRC] Request failed", {
        attempt,
        error: axiosError.message,
        code: axiosError.code,
      });

      const errorCode = mapHttpErrorCode(0, axiosError.code);
      let errorMessage = "Erreur reseau lors de la connexion a HMRC";

      if (errorCode === "TIMEOUT") {
        errorMessage = "Timeout lors de la connexion a HMRC";
      }

      lastError = {
        valid: false,
        countryCode: "GB",
        vatNumber: formattedVat,
        requestDate: new Date(),
        errorCode,
        errorMessage,
      };

      if (attempt < mergedConfig.maxRetries) {
        await sleep(currentDelay);
        currentDelay *= mergedConfig.backoffMultiplier;
      }
    }
  }

  // Retourner la derniere erreur apres tous les essais
  functions.logger.error("[HMRC] All retry attempts failed", {
    vatNumber: formattedVat.substring(0, 3) + "***",
    lastError: lastError?.errorCode,
  });

  return lastError || {
    valid: false,
    countryCode: "GB",
    vatNumber: formattedVat,
    requestDate: new Date(),
    errorCode: "UNKNOWN_ERROR",
    errorMessage: "Erreur inconnue apres plusieurs tentatives",
  };
}

/**
 * Verifie si un code pays est UK
 */
export function isUkCountry(countryCode: string): boolean {
  const normalized = countryCode.toUpperCase().trim();
  return normalized === "GB" || normalized === "UK";
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  HMRC_VAT_ENDPOINT,
  RETRYABLE_ERRORS as HMRC_RETRYABLE_ERRORS,
};
