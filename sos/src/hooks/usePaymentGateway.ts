// src/hooks/usePaymentGateway.ts
import { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

type PaymentGateway = "stripe" | "paypal";

interface GatewayResult {
  gateway: PaymentGateway;
  isPayPalOnly: boolean;
  countryCode: string;
}

interface UsePaymentGatewayReturn {
  gateway: PaymentGateway;
  isLoading: boolean;
  error: string | null;
  isPayPalOnly: boolean;
  refresh: () => void;
}

// Liste des pays PayPal-only (cache local pour éviter les appels inutiles)
// P0-2 FIX: Synchronisée avec paymentCountries.ts du backend (2024-01-19)
// IMPORTANT: Si vous modifiez cette liste, mettez également à jour:
// - sos/firebase/functions/src/lib/paymentCountries.ts (backend)
const PAYPAL_ONLY_COUNTRIES = new Set([
  // AFRIQUE (54 pays)
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
  // ASIE (38 pays) - P0-2 FIX: Ajout CN, KZ, TR qui manquaient
  "AF", "BD", "BT", "CN", "IN", "KH", "KZ", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "TR", "UZ", "VN",
  "MN", "KP", "KG", "PS", "YE", "OM", "QA", "KW", "BH", "JO", "LB", "AM",
  "AZ", "GE", "MV", "BN", "TL", "PH", "ID", "TW", "KR",
  // AMERIQUE LATINE & CARAIBES (27 pays) - P0-2 FIX: Ajout AR, CO qui manquaient
  "AR", "BO", "CO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE", "HT", "DO", "JM",
  "TT", "BB", "BS", "BZ", "GY", "PA", "CR", "AG", "DM", "GD", "KN", "LC", "VC",
  // EUROPE DE L'EST & BALKANS (14 pays) - GI est dans Stripe
  "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU", "AD", "MC",
  "SM", "VA",
  // OCEANIE & PACIFIQUE (15 pays)
  "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW", "NR", "TV", "NC",
  "PF", "GU",
  // MOYEN-ORIENT (7 pays)
  "IQ", "IR", "SY", "SA",
]);

// Cache pour éviter les appels répétés
const gatewayCache = new Map<string, PaymentGateway>();

// Timeout pour éviter le blocage indéfini (5 secondes)
const GATEWAY_TIMEOUT_MS = 5000;

/**
 * Hook pour déterminer le gateway de paiement approprié pour un provider
 * basé sur son pays
 */
export function usePaymentGateway(providerCountryCode: string | undefined): UsePaymentGatewayReturn {
  const [gateway, setGateway] = useState<PaymentGateway>("stripe");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayPalOnly, setIsPayPalOnly] = useState(false);

  // ============= DEBUG LOGS =============
  console.log('%c🏦 [usePaymentGateway] Hook called', 'background: #9C27B0; color: white; padding: 2px 6px; border-radius: 3px;', {
    providerCountryCode,
    currentGateway: gateway,
    isLoading,
    isPayPalOnly,
  });

  const determineGateway = useCallback(async () => {
    console.log('%c🏦 [usePaymentGateway] determineGateway() STARTED', 'background: #673AB7; color: white; padding: 2px 6px; border-radius: 3px;', {
      providerCountryCode,
      timestamp: new Date().toISOString(),
    });

    if (!providerCountryCode) {
      console.log('🏦 [usePaymentGateway] No country code, defaulting to Stripe');
      setGateway("stripe");
      setIsLoading(false);
      setIsPayPalOnly(false);
      return;
    }

    const countryCode = providerCountryCode.toUpperCase();
    console.log('🏦 [usePaymentGateway] Country code normalized:', countryCode);

    // Vérifier le cache d'abord
    if (gatewayCache.has(countryCode)) {
      const cachedGateway = gatewayCache.get(countryCode)!;
      console.log('🏦 [usePaymentGateway] CACHE HIT:', { countryCode, cachedGateway });
      setGateway(cachedGateway);
      setIsPayPalOnly(cachedGateway === "paypal");
      setIsLoading(false);
      return;
    }

    // Vérification locale rapide
    if (PAYPAL_ONLY_COUNTRIES.has(countryCode)) {
      console.log('%c🏦 [usePaymentGateway] PayPal-only country detected', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', countryCode);
      setGateway("paypal");
      setIsPayPalOnly(true);
      setIsLoading(false);
      gatewayCache.set(countryCode, "paypal");
      return;
    }

    // Pour les pays non-PayPal, on utilise Stripe par défaut sans appel backend
    // Cela évite le blocage du formulaire en cas de timeout de Cloud Function
    console.log('🏦 [usePaymentGateway] Using Stripe (default for non-PayPal country)');
    setGateway("stripe");
    setIsPayPalOnly(false);
    setIsLoading(false);
    gatewayCache.set(countryCode, "stripe");

    // Appel backend en arrière-plan pour mise à jour (non-bloquant)
    try {
      console.log('🏦 [usePaymentGateway] Calling backend for gateway recommendation...');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gateway detection timeout")), GATEWAY_TIMEOUT_MS)
      );

      const getRecommendedPaymentGateway = httpsCallable<
        { countryCode: string },
        GatewayResult
      >(functions, "getRecommendedPaymentGateway");

      const result = await Promise.race([
        getRecommendedPaymentGateway({ countryCode }),
        timeoutPromise
      ]);

      const { gateway: recommendedGateway, isPayPalOnly: paypalOnly } = result.data;
      console.log('🏦 [usePaymentGateway] Backend response:', { recommendedGateway, paypalOnly });

      // Mettre à jour seulement si différent (rare)
      if (recommendedGateway !== "stripe") {
        console.log('🏦 [usePaymentGateway] Updating gateway from backend:', recommendedGateway);
        setGateway(recommendedGateway);
        setIsPayPalOnly(paypalOnly);
        gatewayCache.set(countryCode, recommendedGateway);
      }
    } catch (err) {
      // Ignorer les erreurs - on a déjà un fallback Stripe actif
      console.warn('🏦 [usePaymentGateway] Backend call failed (using fallback):', err);
    }
  }, [providerCountryCode]);

  useEffect(() => {
    determineGateway();
  }, [determineGateway]);

  const refresh = useCallback(() => {
    if (providerCountryCode) {
      gatewayCache.delete(providerCountryCode.toUpperCase());
    }
    determineGateway();
  }, [providerCountryCode, determineGateway]);

  return {
    gateway,
    isLoading,
    error,
    isPayPalOnly,
    refresh,
  };
}

export default usePaymentGateway;
