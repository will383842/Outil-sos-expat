/**
 * Service unifie de validation TVA
 *
 * Ce service centralise la validation des numeros de TVA pour tous les pays:
 * - Union Europeenne: via VIES (Commission Europeenne)
 * - Royaume-Uni: via HMRC (post-Brexit)
 *
 * Inclut un systeme de cache Firestore pour eviter les appels redondants.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  validateVatNumberVIES,
  isEUCountry,
  formatVatNumber as formatEuVatNumber,
  normalizeCountryCode,
  ViesValidationResult,
  ViesServiceConfig,
} from "./viesService";
import {
  validateVatNumberHMRC,
  isUkCountry,
  formatUkVatNumber,
  HmrcValidationResult,
  HmrcServiceConfig,
} from "./hmrcService";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VatValidationResult {
  /** Le numero est-il valide? */
  valid: boolean;
  /** Code pays (2 lettres) */
  countryCode: string;
  /** Numero de TVA (sans le prefixe pays) */
  vatNumber: string;
  /** Numero complet (prefixe + numero) */
  fullVatNumber: string;
  /** Date de la validation */
  validationDate: Date;
  /** Nom de l'entreprise (si disponible) */
  companyName?: string;
  /** Adresse de l'entreprise (si disponible) */
  companyAddress?: string;
  /** Source de la validation */
  source: "vies" | "hmrc" | "cache";
  /** Indique si le resultat vient du cache */
  fromCache: boolean;
  /** Date d'expiration du cache (si applicable) */
  cacheExpiresAt?: Date;
  /** Code d'erreur si la validation a echoue */
  errorCode?: string;
  /** Message d'erreur detaille */
  errorMessage?: string;
}

export interface VatValidationOptions {
  /** Utiliser le cache (defaut: true) */
  useCache?: boolean;
  /** Forcer le rafraichissement du cache (defaut: false) */
  forceRefresh?: boolean;
  /** Configuration du service VIES */
  viesConfig?: ViesServiceConfig;
  /** Configuration du service HMRC */
  hmrcConfig?: HmrcServiceConfig;
}

export interface CachedVatValidation {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  fullVatNumber: string;
  companyName?: string;
  companyAddress?: string;
  source: "vies" | "hmrc";
  validationDate: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Collection Firestore pour le cache */
const VAT_CACHE_COLLECTION = "vatValidationCache";

/** Duree de validite du cache en jours */
const CACHE_TTL_DAYS = 30;

/** Duree de validite du cache en millisecondes */
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Genere la cle de cache pour un numero de TVA
 */
function getCacheKey(countryCode: string, vatNumber: string): string {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedVat = formatEuVatNumber(vatNumber);
  return `${normalizedCountry}_${normalizedVat}`;
}

/**
 * Recupere une validation depuis le cache
 */
async function getFromCache(
  countryCode: string,
  vatNumber: string
): Promise<CachedVatValidation | null> {
  try {
    const db = admin.firestore();
    const cacheKey = getCacheKey(countryCode, vatNumber);
    const docRef = db.collection(VAT_CACHE_COLLECTION).doc(cacheKey);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as CachedVatValidation;

    // Verifier si le cache est expire
    const now = new Date();
    const expiresAt = data.expiresAt.toDate();

    if (now > expiresAt) {
      functions.logger.info("[VAT Cache] Cache expired", {
        cacheKey,
        expiredAt: expiresAt.toISOString(),
      });
      return null;
    }

    return data;
  } catch (error) {
    functions.logger.error("[VAT Cache] Error reading cache", { error });
    return null;
  }
}

/**
 * Sauvegarde une validation dans le cache
 */
async function saveToCache(
  countryCode: string,
  vatNumber: string,
  result: VatValidationResult
): Promise<void> {
  // Ne pas cacher les erreurs temporaires
  if (result.errorCode && isTemporaryError(result.errorCode)) {
    functions.logger.info("[VAT Cache] Skipping cache for temporary error", {
      errorCode: result.errorCode,
    });
    return;
  }

  try {
    const db = admin.firestore();
    const cacheKey = getCacheKey(countryCode, vatNumber);
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + CACHE_TTL_MS)
    );

    const cacheData: CachedVatValidation = {
      valid: result.valid,
      countryCode: result.countryCode,
      vatNumber: result.vatNumber,
      fullVatNumber: result.fullVatNumber,
      companyName: result.companyName,
      companyAddress: result.companyAddress,
      source: result.source as "vies" | "hmrc",
      validationDate: admin.firestore.Timestamp.fromDate(result.validationDate),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(VAT_CACHE_COLLECTION).doc(cacheKey).set(cacheData, { merge: true });

    functions.logger.info("[VAT Cache] Saved to cache", {
      cacheKey,
      valid: result.valid,
      expiresAt: expiresAt.toDate().toISOString(),
    });
  } catch (error) {
    // Ne pas faire echouer la validation si le cache echoue
    functions.logger.error("[VAT Cache] Error saving to cache", { error });
  }
}

/**
 * Supprime une entree du cache
 */
export async function invalidateCache(
  countryCode: string,
  vatNumber: string
): Promise<void> {
  try {
    const db = admin.firestore();
    const cacheKey = getCacheKey(countryCode, vatNumber);
    await db.collection(VAT_CACHE_COLLECTION).doc(cacheKey).delete();
    functions.logger.info("[VAT Cache] Cache invalidated", { cacheKey });
  } catch (error) {
    functions.logger.error("[VAT Cache] Error invalidating cache", { error });
  }
}

/**
 * Nettoie les entrees de cache expirees
 * A appeler periodiquement via une fonction scheduled
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const expiredDocs = await db
      .collection(VAT_CACHE_COLLECTION)
      .where("expiresAt", "<", now)
      .limit(500) // Traiter par lots
      .get();

    if (expiredDocs.empty) {
      functions.logger.info("[VAT Cache] No expired entries to clean");
      return 0;
    }

    const batch = db.batch();
    expiredDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    functions.logger.info("[VAT Cache] Cleaned expired entries", {
      count: expiredDocs.size,
    });

    return expiredDocs.size;
  } catch (error) {
    functions.logger.error("[VAT Cache] Error cleaning cache", { error });
    throw error;
  }
}

/**
 * Verifie si une erreur est temporaire (justifie un retry ulterieur)
 */
function isTemporaryError(errorCode: string): boolean {
  const temporaryErrors = new Set([
    "SERVICE_UNAVAILABLE",
    "MS_UNAVAILABLE",
    "TIMEOUT",
    "NETWORK_ERROR",
    "GLOBAL_MAX_CONCURRENT_REQ",
    "MS_MAX_CONCURRENT_REQ",
    "INTERNAL_SERVER_ERROR",
    "RATE_LIMITED",
  ]);
  return temporaryErrors.has(errorCode);
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convertit un resultat VIES en format unifie
 */
function convertViesResult(result: ViesValidationResult): VatValidationResult {
  return {
    valid: result.valid,
    countryCode: result.countryCode,
    vatNumber: result.vatNumber,
    fullVatNumber: `${result.countryCode}${result.vatNumber}`,
    validationDate: result.requestDate,
    companyName: result.name,
    companyAddress: result.address,
    source: "vies",
    fromCache: false,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
}

/**
 * Convertit un resultat HMRC en format unifie
 */
function convertHmrcResult(result: HmrcValidationResult): VatValidationResult {
  let address: string | undefined;
  if (result.address) {
    const parts = [
      result.address.line1,
      result.address.line2,
      result.address.line3,
      result.address.line4,
      result.address.line5,
      result.address.postcode,
    ].filter(Boolean);
    address = parts.join(", ");
  }

  return {
    valid: result.valid,
    countryCode: result.countryCode,
    vatNumber: result.vatNumber,
    fullVatNumber: `GB${result.vatNumber}`,
    validationDate: result.requestDate,
    companyName: result.name,
    companyAddress: address,
    source: "hmrc",
    fromCache: false,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
}

/**
 * Convertit une entree cache en format unifie
 */
function convertCacheResult(cached: CachedVatValidation): VatValidationResult {
  return {
    valid: cached.valid,
    countryCode: cached.countryCode,
    vatNumber: cached.vatNumber,
    fullVatNumber: cached.fullVatNumber,
    validationDate: cached.validationDate.toDate(),
    companyName: cached.companyName,
    companyAddress: cached.companyAddress,
    source: "cache",
    fromCache: true,
    cacheExpiresAt: cached.expiresAt.toDate(),
  };
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Valide un numero de TVA (EU ou UK)
 *
 * @param countryCode - Code pays ISO 2 lettres (ex: "FR", "DE", "GB")
 * @param vatNumber - Numero de TVA (sans le prefixe pays)
 * @param options - Options de validation
 * @returns Resultat de la validation
 *
 * @example
 * ```typescript
 * // Validation simple
 * const result = await validateVatNumber("FR", "12345678901");
 *
 * // Sans cache
 * const result = await validateVatNumber("DE", "123456789", { useCache: false });
 *
 * // Force refresh
 * const result = await validateVatNumber("GB", "123456789", { forceRefresh: true });
 * ```
 */
export async function validateVatNumber(
  countryCode: string,
  vatNumber: string,
  options: VatValidationOptions = {}
): Promise<VatValidationResult> {
  const { useCache = true, forceRefresh = false } = options;

  // Normaliser les inputs
  const normalizedCountry = normalizeCountryCode(countryCode);

  functions.logger.info("[VAT Validation] Starting validation", {
    countryCode: normalizedCountry,
    vatNumber: vatNumber.substring(0, 4) + "***",
    useCache,
    forceRefresh,
  });

  // Verifier le cache (sauf si desactive ou force refresh)
  if (useCache && !forceRefresh) {
    const cached = await getFromCache(normalizedCountry, vatNumber);
    if (cached) {
      functions.logger.info("[VAT Validation] Returning cached result", {
        countryCode: normalizedCountry,
        valid: cached.valid,
        cacheExpiresAt: cached.expiresAt.toDate().toISOString(),
      });
      return convertCacheResult(cached);
    }
  }

  let result: VatValidationResult;

  // Router vers le bon service
  if (isUkCountry(normalizedCountry)) {
    // UK -> HMRC
    const hmrcResult = await validateVatNumberHMRC(vatNumber, options.hmrcConfig);
    result = convertHmrcResult(hmrcResult);
  } else if (isEUCountry(normalizedCountry)) {
    // EU -> VIES
    const viesResult = await validateVatNumberVIES(
      normalizedCountry,
      vatNumber,
      options.viesConfig
    );
    result = convertViesResult(viesResult);
  } else {
    // Pays non supporte
    result = {
      valid: false,
      countryCode: normalizedCountry,
      vatNumber: formatEuVatNumber(vatNumber),
      fullVatNumber: `${normalizedCountry}${formatEuVatNumber(vatNumber)}`,
      validationDate: new Date(),
      source: "vies",
      fromCache: false,
      errorCode: "UNSUPPORTED_COUNTRY",
      errorMessage: `Le pays ${normalizedCountry} n'est pas supporte. Seuls les pays de l'UE et le Royaume-Uni sont pris en charge.`,
    };
  }

  // Sauvegarder dans le cache si active
  if (useCache) {
    await saveToCache(normalizedCountry, vatNumber, result);
  }

  return result;
}

/**
 * Valide un numero de TVA complet (avec prefixe pays)
 *
 * @param fullVatNumber - Numero de TVA complet (ex: "FR12345678901", "GB123456789")
 * @param options - Options de validation
 * @returns Resultat de la validation
 */
export async function validateFullVatNumber(
  fullVatNumber: string,
  options: VatValidationOptions = {}
): Promise<VatValidationResult> {
  // Nettoyer le numero
  const cleaned = fullVatNumber.replace(/[\s\-._]/g, "").toUpperCase();

  if (cleaned.length < 4) {
    return {
      valid: false,
      countryCode: "",
      vatNumber: cleaned,
      fullVatNumber: cleaned,
      validationDate: new Date(),
      source: "vies",
      fromCache: false,
      errorCode: "INVALID_INPUT",
      errorMessage: "Numero de TVA trop court",
    };
  }

  // Extraire le code pays
  const countryCode = cleaned.substring(0, 2);
  const vatNumber = cleaned.substring(2);

  return validateVatNumber(countryCode, vatNumber, options);
}

/**
 * Valide plusieurs numeros de TVA en parallele
 *
 * @param vatNumbers - Liste de numeros a valider [{countryCode, vatNumber}]
 * @param options - Options de validation
 * @returns Map des resultats
 */
export async function validateMultipleVatNumbers(
  vatNumbers: Array<{ countryCode: string; vatNumber: string }>,
  options: VatValidationOptions = {}
): Promise<Map<string, VatValidationResult>> {
  const results = new Map<string, VatValidationResult>();

  // Valider en parallele (avec limite de concurrence)
  const CONCURRENCY_LIMIT = 5;

  for (let i = 0; i < vatNumbers.length; i += CONCURRENCY_LIMIT) {
    const batch = vatNumbers.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async ({ countryCode, vatNumber }) => {
        const result = await validateVatNumber(countryCode, vatNumber, options);
        return { key: `${countryCode}${vatNumber}`, result };
      })
    );

    batchResults.forEach(({ key, result }) => {
      results.set(key, result);
    });
  }

  return results;
}

/**
 * Verifie si un numero de TVA est eligible pour l'autoliquidation B2B
 * (reverse charge / VAT exemption pour transactions intra-UE)
 *
 * @param buyerCountryCode - Code pays de l'acheteur
 * @param buyerVatNumber - Numero de TVA de l'acheteur
 * @param sellerCountryCode - Code pays du vendeur
 * @returns true si l'autoliquidation est applicable
 */
export async function isEligibleForReverseCharge(
  buyerCountryCode: string,
  buyerVatNumber: string,
  sellerCountryCode: string
): Promise<{ eligible: boolean; reason: string; validationResult: VatValidationResult }> {
  // Valider le numero de TVA de l'acheteur
  const validationResult = await validateVatNumber(buyerCountryCode, buyerVatNumber);

  // Si le numero n'est pas valide, pas d'autoliquidation
  if (!validationResult.valid) {
    return {
      eligible: false,
      reason: validationResult.errorMessage || "Numero de TVA invalide",
      validationResult,
    };
  }

  const normalizedBuyer = normalizeCountryCode(buyerCountryCode);
  const normalizedSeller = normalizeCountryCode(sellerCountryCode);

  // Meme pays = pas d'autoliquidation (vente domestique)
  if (normalizedBuyer === normalizedSeller) {
    return {
      eligible: false,
      reason: "Transaction domestique - TVA normale applicable",
      validationResult,
    };
  }

  // Transaction intra-UE
  if (isEUCountry(normalizedBuyer) && isEUCountry(normalizedSeller)) {
    return {
      eligible: true,
      reason: "Transaction intra-UE avec TVA validee - Autoliquidation applicable",
      validationResult,
    };
  }

  // UK vers EU ou EU vers UK (post-Brexit - pas d'autoliquidation automatique)
  if (
    (isUkCountry(normalizedBuyer) && isEUCountry(normalizedSeller)) ||
    (isEUCountry(normalizedBuyer) && isUkCountry(normalizedSeller))
  ) {
    return {
      eligible: false,
      reason: "Transaction UK/UE post-Brexit - Regles d'exportation applicables",
      validationResult,
    };
  }

  return {
    eligible: false,
    reason: "Configuration de pays non prise en charge pour l'autoliquidation",
    validationResult,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VAT_CACHE_COLLECTION,
  CACHE_TTL_DAYS,
  isEUCountry,
  isUkCountry,
  normalizeCountryCode,
  formatEuVatNumber,
  formatUkVatNumber,
};

// Re-export des types des services sous-jacents
export type { ViesValidationResult, ViesServiceConfig } from "./viesService";
export type { HmrcValidationResult, HmrcServiceConfig } from "./hmrcService";
