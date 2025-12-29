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
const PAYPAL_ONLY_COUNTRIES = new Set([
  // Afrique
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
  // Asie (non couverts par Stripe)
  "AF", "BD", "BT", "KH", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "UZ", "VN",
  // Amérique Latine
  "BO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE",
  // Autres
  "IQ", "IR", "SY", "YE",
]);

// Cache pour éviter les appels répétés
const gatewayCache = new Map<string, PaymentGateway>();

/**
 * Hook pour déterminer le gateway de paiement approprié pour un provider
 * basé sur son pays
 */
export function usePaymentGateway(providerCountryCode: string | undefined): UsePaymentGatewayReturn {
  const [gateway, setGateway] = useState<PaymentGateway>("stripe");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPayPalOnly, setIsPayPalOnly] = useState(false);

  const determineGateway = useCallback(async () => {
    if (!providerCountryCode) {
      setGateway("stripe");
      setIsLoading(false);
      setIsPayPalOnly(false);
      return;
    }

    const countryCode = providerCountryCode.toUpperCase();

    // Vérifier le cache d'abord
    if (gatewayCache.has(countryCode)) {
      const cachedGateway = gatewayCache.get(countryCode)!;
      setGateway(cachedGateway);
      setIsPayPalOnly(cachedGateway === "paypal");
      setIsLoading(false);
      return;
    }

    // Vérification locale rapide
    if (PAYPAL_ONLY_COUNTRIES.has(countryCode)) {
      setGateway("paypal");
      setIsPayPalOnly(true);
      setIsLoading(false);
      gatewayCache.set(countryCode, "paypal");
      return;
    }

    // Sinon, appel au backend pour confirmation
    try {
      setIsLoading(true);
      setError(null);

      const getRecommendedPaymentGateway = httpsCallable<
        { countryCode: string },
        GatewayResult
      >(functions, "getRecommendedPaymentGateway");

      const result = await getRecommendedPaymentGateway({ countryCode });
      const { gateway: recommendedGateway, isPayPalOnly: paypalOnly } = result.data;

      setGateway(recommendedGateway);
      setIsPayPalOnly(paypalOnly);
      gatewayCache.set(countryCode, recommendedGateway);
    } catch (err) {
      console.error("Erreur lors de la détermination du gateway:", err);
      // Fallback sur Stripe en cas d'erreur
      setGateway("stripe");
      setIsPayPalOnly(false);
      setError("Impossible de déterminer le mode de paiement");
    } finally {
      setIsLoading(false);
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
