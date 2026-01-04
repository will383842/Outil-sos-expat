/**
 * VIES (VAT Information Exchange System) Service
 *
 * Service pour valider les numeros de TVA europeens via l'API SOAP de la Commission Europeenne.
 * Documentation: https://ec.europa.eu/taxation_customs/vies/
 */

import axios, { AxiosError } from "axios";
import * as functions from "firebase-functions";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  requestDate: Date;
  name?: string;
  address?: string;
  errorCode?: ViesErrorCode;
  errorMessage?: string;
}

export type ViesErrorCode =
  | "INVALID_INPUT"
  | "GLOBAL_MAX_CONCURRENT_REQ"
  | "MS_MAX_CONCURRENT_REQ"
  | "SERVICE_UNAVAILABLE"
  | "MS_UNAVAILABLE"
  | "TIMEOUT"
  | "VAT_BLOCKED"
  | "IP_BLOCKED"
  | "INVALID_REQUESTER_INFO"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

export interface ViesServiceConfig {
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

const VIES_SOAP_ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

const DEFAULT_CONFIG: Required<ViesServiceConfig> = {
  timeout: 10000,
  maxRetries: 3,
  initialRetryDelay: 1000,
  backoffMultiplier: 2,
};

/** Codes pays EU valides pour VIES */
const EU_COUNTRY_CODES = new Set([
  "AT", // Autriche
  "BE", // Belgique
  "BG", // Bulgarie
  "CY", // Chypre
  "CZ", // Republique Tcheque
  "DE", // Allemagne
  "DK", // Danemark
  "EE", // Estonie
  "EL", // Grece (code VIES)
  "ES", // Espagne
  "FI", // Finlande
  "FR", // France
  "HR", // Croatie
  "HU", // Hongrie
  "IE", // Irlande
  "IT", // Italie
  "LT", // Lituanie
  "LU", // Luxembourg
  "LV", // Lettonie
  "MT", // Malte
  "NL", // Pays-Bas
  "PL", // Pologne
  "PT", // Portugal
  "RO", // Roumanie
  "SE", // Suede
  "SI", // Slovenie
  "SK", // Slovaquie
  "XI", // Irlande du Nord (post-Brexit)
]);

/** Erreurs VIES qui justifient un retry */
const RETRYABLE_ERRORS: Set<ViesErrorCode> = new Set([
  "SERVICE_UNAVAILABLE",
  "MS_UNAVAILABLE",
  "GLOBAL_MAX_CONCURRENT_REQ",
  "MS_MAX_CONCURRENT_REQ",
  "TIMEOUT",
  "NETWORK_ERROR",
]);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construit l'enveloppe SOAP pour la requete checkVat
 */
function buildSoapRequest(countryCode: string, vatNumber: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${escapeXml(countryCode)}</urn:countryCode>
      <urn:vatNumber>${escapeXml(vatNumber)}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Echappe les caracteres speciaux XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Extrait une valeur d'un tag XML
 */
function extractXmlValue(xml: string, tagName: string): string | undefined {
  // Supporte les namespaces (ex: ns2:valid ou valid)
  const regex = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagName}>([^<]*)<\\/(?:[a-zA-Z0-9]+:)?${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Extrait le code d'erreur VIES du message SOAP Fault
 */
function extractViesErrorCode(faultString: string): ViesErrorCode {
  const errorMappings: Record<string, ViesErrorCode> = {
    "INVALID_INPUT": "INVALID_INPUT",
    "GLOBAL_MAX_CONCURRENT_REQ": "GLOBAL_MAX_CONCURRENT_REQ",
    "MS_MAX_CONCURRENT_REQ": "MS_MAX_CONCURRENT_REQ",
    "SERVICE_UNAVAILABLE": "SERVICE_UNAVAILABLE",
    "MS_UNAVAILABLE": "MS_UNAVAILABLE",
    "TIMEOUT": "TIMEOUT",
    "VAT_BLOCKED": "VAT_BLOCKED",
    "IP_BLOCKED": "IP_BLOCKED",
    "INVALID_REQUESTER_INFO": "INVALID_REQUESTER_INFO",
  };

  for (const [key, code] of Object.entries(errorMappings)) {
    if (faultString.includes(key)) {
      return code;
    }
  }

  return "UNKNOWN_ERROR";
}

/**
 * Formate le numero de TVA (supprime espaces, tirets, etc.)
 */
export function formatVatNumber(vatNumber: string): string {
  return vatNumber.replace(/[\s\-._]/g, "").toUpperCase();
}

/**
 * Normalise le code pays (ex: GR -> EL pour la Grece)
 */
export function normalizeCountryCode(countryCode: string): string {
  const normalized = countryCode.toUpperCase().trim();
  // La Grece utilise "EL" dans VIES au lieu de "GR"
  if (normalized === "GR") {
    return "EL";
  }
  return normalized;
}

/**
 * Verifie si un code pays est valide pour VIES
 */
export function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRY_CODES.has(normalizeCountryCode(countryCode));
}

/**
 * Parse la reponse SOAP de VIES
 */
function parseViesResponse(
  xml: string,
  countryCode: string,
  vatNumber: string
): ViesValidationResult {
  // Verifier s'il y a une erreur SOAP Fault
  if (xml.includes("soap:Fault") || xml.includes("soapenv:Fault")) {
    const faultString = extractXmlValue(xml, "faultstring") || "Unknown SOAP Fault";
    const errorCode = extractViesErrorCode(faultString);

    return {
      valid: false,
      countryCode,
      vatNumber,
      requestDate: new Date(),
      errorCode,
      errorMessage: faultString,
    };
  }

  // Extraire les valeurs de la reponse
  const validStr = extractXmlValue(xml, "valid");
  const name = extractXmlValue(xml, "name");
  const address = extractXmlValue(xml, "address");
  const requestDateStr = extractXmlValue(xml, "requestDate");

  // Parser la validite
  const valid = validStr?.toLowerCase() === "true";

  // Parser la date de requete
  let requestDate = new Date();
  if (requestDateStr) {
    const parsed = new Date(requestDateStr);
    if (!isNaN(parsed.getTime())) {
      requestDate = parsed;
    }
  }

  return {
    valid,
    countryCode,
    vatNumber,
    requestDate,
    name: name && name !== "---" ? name : undefined,
    address: address && address !== "---" ? address : undefined,
  };
}

/**
 * Attend un delai specifie
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Valide un numero de TVA via l'API VIES
 *
 * @param countryCode - Code pays ISO 2 lettres (ex: "FR", "DE")
 * @param vatNumber - Numero de TVA sans le prefixe pays
 * @param config - Configuration optionnelle
 * @returns Resultat de la validation
 *
 * @example
 * ```typescript
 * const result = await validateVatNumberVIES("FR", "12345678901");
 * if (result.valid) {
 *   console.log(`Entreprise: ${result.name}`);
 * }
 * ```
 */
export async function validateVatNumberVIES(
  countryCode: string,
  vatNumber: string,
  config: ViesServiceConfig = {}
): Promise<ViesValidationResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Normaliser les inputs
  const normalizedCountry = normalizeCountryCode(countryCode);
  const formattedVat = formatVatNumber(vatNumber);

  // Validation basique
  if (!normalizedCountry || normalizedCountry.length !== 2) {
    return {
      valid: false,
      countryCode: normalizedCountry,
      vatNumber: formattedVat,
      requestDate: new Date(),
      errorCode: "INVALID_INPUT",
      errorMessage: "Code pays invalide (doit etre 2 caracteres)",
    };
  }

  if (!formattedVat || formattedVat.length < 2) {
    return {
      valid: false,
      countryCode: normalizedCountry,
      vatNumber: formattedVat,
      requestDate: new Date(),
      errorCode: "INVALID_INPUT",
      errorMessage: "Numero de TVA invalide",
    };
  }

  if (!isEUCountry(normalizedCountry)) {
    return {
      valid: false,
      countryCode: normalizedCountry,
      vatNumber: formattedVat,
      requestDate: new Date(),
      errorCode: "INVALID_INPUT",
      errorMessage: `Le code pays ${normalizedCountry} n'est pas un pays membre de l'UE. Utilisez le service HMRC pour le Royaume-Uni.`,
    };
  }

  // Construire la requete SOAP
  const soapRequest = buildSoapRequest(normalizedCountry, formattedVat);

  // Tentatives avec retry et backoff
  let lastError: ViesValidationResult | null = null;
  let currentDelay = mergedConfig.initialRetryDelay;

  for (let attempt = 1; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      functions.logger.info("[VIES] Validation attempt", {
        attempt,
        countryCode: normalizedCountry,
        vatNumber: formattedVat.substring(0, 4) + "***", // Masquer partiellement
      });

      const response = await axios.post(VIES_SOAP_ENDPOINT, soapRequest, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": "",
        },
        timeout: mergedConfig.timeout,
        validateStatus: () => true, // Accepter tous les codes HTTP
      });

      const result = parseViesResponse(
        response.data,
        normalizedCountry,
        formattedVat
      );

      // Si erreur retryable et pas dernier essai, continuer
      if (
        result.errorCode &&
        RETRYABLE_ERRORS.has(result.errorCode) &&
        attempt < mergedConfig.maxRetries
      ) {
        functions.logger.warn("[VIES] Retryable error, will retry", {
          errorCode: result.errorCode,
          attempt,
          nextDelay: currentDelay,
        });
        lastError = result;
        await sleep(currentDelay);
        currentDelay *= mergedConfig.backoffMultiplier;
        continue;
      }

      // Log le resultat
      if (result.valid) {
        functions.logger.info("[VIES] Validation successful", {
          countryCode: normalizedCountry,
          vatNumber: formattedVat.substring(0, 4) + "***",
          name: result.name,
        });
      } else if (result.errorCode) {
        functions.logger.warn("[VIES] Validation failed with error", {
          countryCode: normalizedCountry,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        });
      } else {
        functions.logger.info("[VIES] VAT number is invalid", {
          countryCode: normalizedCountry,
          vatNumber: formattedVat.substring(0, 4) + "***",
        });
      }

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;

      functions.logger.error("[VIES] Request failed", {
        attempt,
        error: axiosError.message,
        code: axiosError.code,
      });

      // Determiner le type d'erreur
      let errorCode: ViesErrorCode = "NETWORK_ERROR";
      let errorMessage = "Erreur reseau lors de la connexion a VIES";

      if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
        errorCode = "TIMEOUT";
        errorMessage = "Timeout lors de la connexion a VIES";
      }

      lastError = {
        valid: false,
        countryCode: normalizedCountry,
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
  functions.logger.error("[VIES] All retry attempts failed", {
    countryCode: normalizedCountry,
    vatNumber: formattedVat.substring(0, 4) + "***",
    lastError: lastError?.errorCode,
  });

  return lastError || {
    valid: false,
    countryCode: normalizedCountry,
    vatNumber: formattedVat,
    requestDate: new Date(),
    errorCode: "UNKNOWN_ERROR",
    errorMessage: "Erreur inconnue apres plusieurs tentatives",
  };
}

/**
 * Valide un numero de TVA complet (avec prefixe pays)
 *
 * @param fullVatNumber - Numero de TVA complet (ex: "FR12345678901")
 * @returns Resultat de la validation
 */
export async function validateFullVatNumber(
  fullVatNumber: string,
  config: ViesServiceConfig = {}
): Promise<ViesValidationResult> {
  const formatted = formatVatNumber(fullVatNumber);

  if (formatted.length < 4) {
    return {
      valid: false,
      countryCode: "",
      vatNumber: formatted,
      requestDate: new Date(),
      errorCode: "INVALID_INPUT",
      errorMessage: "Numero de TVA trop court",
    };
  }

  const countryCode = formatted.substring(0, 2);
  const vatNumber = formatted.substring(2);

  return validateVatNumberVIES(countryCode, vatNumber, config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EU_COUNTRY_CODES,
  RETRYABLE_ERRORS,
  VIES_SOAP_ENDPOINT,
};
