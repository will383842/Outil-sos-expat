/**
 * VAT Validation Cloud Functions (Callables)
 *
 * Fonctions Cloud exposees pour la validation des numeros de TVA.
 * Ces fonctions peuvent etre appelees depuis le frontend.
 *
 * Utilise Firebase Functions v2 pour compatibilite avec le projet.
 */

import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import {
  validateVatNumber,
  validateFullVatNumber,
  isEligibleForReverseCharge,
  cleanupExpiredCache,
  VatValidationResult,
} from "./vatValidation";

// ============================================================================
// TYPES
// ============================================================================

interface ValidateVatRequest {
  /** Code pays ISO 2 lettres (ex: "FR", "DE", "GB") */
  countryCode?: string;
  /** Numero de TVA (sans ou avec prefixe pays) */
  vatNumber: string;
  /** Utiliser le cache (defaut: true) */
  useCache?: boolean;
  /** Forcer le rafraichissement du cache (defaut: false) */
  forceRefresh?: boolean;
}

interface ValidateVatResponse {
  success: boolean;
  data?: VatValidationResult;
  error?: {
    code: string;
    message: string;
  };
}

interface CheckReverseChargeRequest {
  /** Code pays de l'acheteur */
  buyerCountryCode: string;
  /** Numero de TVA de l'acheteur */
  buyerVatNumber: string;
  /** Code pays du vendeur */
  sellerCountryCode: string;
}

interface CheckReverseChargeResponse {
  success: boolean;
  data?: {
    eligible: boolean;
    reason: string;
    validationResult: VatValidationResult;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// CALLABLES
// ============================================================================

/**
 * Callable: Valide un numero de TVA
 *
 * @example Frontend call:
 * ```typescript
 * const validateVat = httpsCallable(functions, 'validateVat');
 * const result = await validateVat({ countryCode: 'FR', vatNumber: '12345678901' });
 * ```
 */
export const validateVat = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
  },
  async (request: CallableRequest<ValidateVatRequest>): Promise<ValidateVatResponse> => {
    try {
      const data = request.data;

      // Validation des inputs
      if (!data.vatNumber) {
        return {
          success: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "Le numero de TVA est requis",
          },
        };
      }

      let result: VatValidationResult;

      if (data.countryCode) {
        // Validation avec code pays separe
        result = await validateVatNumber(data.countryCode, data.vatNumber, {
          useCache: data.useCache !== false,
          forceRefresh: data.forceRefresh === true,
        });
      } else {
        // Validation avec numero complet (prefixe + numero)
        result = await validateFullVatNumber(data.vatNumber, {
          useCache: data.useCache !== false,
          forceRefresh: data.forceRefresh === true,
        });
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("[validateVat] Unexpected error", { error });

      return {
        success: false,
        error: {
          code: "INTERNAL",
          message: "Erreur interne lors de la validation",
        },
      };
    }
  }
);

/**
 * Callable: Verifie l'eligibilite a l'autoliquidation (reverse charge)
 *
 * @example Frontend call:
 * ```typescript
 * const checkReverseCharge = httpsCallable(functions, 'checkReverseCharge');
 * const result = await checkReverseCharge({
 *   buyerCountryCode: 'DE',
 *   buyerVatNumber: '123456789',
 *   sellerCountryCode: 'FR'
 * });
 * ```
 */
export const checkReverseCharge = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
  },
  async (request: CallableRequest<CheckReverseChargeRequest>): Promise<CheckReverseChargeResponse> => {
    try {
      const data = request.data;

      // Validation des inputs
      if (!data.buyerCountryCode || !data.buyerVatNumber || !data.sellerCountryCode) {
        return {
          success: false,
          error: {
            code: "INVALID_ARGUMENT",
            message: "Les codes pays acheteur/vendeur et le numero de TVA acheteur sont requis",
          },
        };
      }

      const result = await isEligibleForReverseCharge(
        data.buyerCountryCode,
        data.buyerVatNumber,
        data.sellerCountryCode
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("[checkReverseCharge] Unexpected error", { error });

      return {
        success: false,
        error: {
          code: "INTERNAL",
          message: "Erreur interne lors de la verification",
        },
      };
    }
  }
);

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Scheduled: Nettoie le cache des validations TVA expirees
 * Execute tous les jours a 3h du matin (Europe/Paris)
 */
export const cleanupVatCache = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    memory: "256MiB",
  },
  async (_event: ScheduledEvent): Promise<void> => {
    try {
      logger.info("[cleanupVatCache] Starting cache cleanup");

      let totalCleaned = 0;
      let batchCleaned: number;

      // Nettoyer par lots jusqu'a ce qu'il n'y ait plus rien
      do {
        batchCleaned = await cleanupExpiredCache();
        totalCleaned += batchCleaned;
      } while (batchCleaned > 0);

      logger.info("[cleanupVatCache] Cache cleanup completed", {
        totalCleaned,
      });
    } catch (error) {
      logger.error("[cleanupVatCache] Error during cleanup", { error });
      throw error;
    }
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ValidateVatRequest,
  ValidateVatResponse,
  CheckReverseChargeRequest,
  CheckReverseChargeResponse,
};
