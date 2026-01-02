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
  "AF", "BD", "BT", "IN", "KH", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "UZ", "VN",
  // Amérique Latine
  "BO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE",
  // Autres
  "IQ", "IR", "SY", "YE",
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

  const determineGateway = useCallback(async () => {
    console.log("[usePaymentGateway] Determining gateway for country:", providerCountryCode);

    if (!providerCountryCode) {
      console.log("[usePaymentGateway] No country code, defaulting to Stripe");
      setGateway("stripe");
      setIsLoading(false);
      setIsPayPalOnly(false);
      return;
    }

    const countryCode = providerCountryCode.toUpperCase();

    // Vérifier le cache d'abord
    if (gatewayCache.has(countryCode)) {
      const cachedGateway = gatewayCache.get(countryCode)!;
      console.log("[usePaymentGateway] Using cached gateway:", cachedGateway);
      setGateway(cachedGateway);
      setIsPayPalOnly(cachedGateway === "paypal");
      setIsLoading(false);
      return;
    }

    // Vérification locale rapide
    if (PAYPAL_ONLY_COUNTRIES.has(countryCode)) {
      console.log("[usePaymentGateway] PayPal-only country detected:", countryCode);
      setGateway("paypal");
      setIsPayPalOnly(true);
      setIsLoading(false);
      gatewayCache.set(countryCode, "paypal");
      return;
    }

    // Pour les pays non-PayPal, on utilise Stripe par défaut sans appel backend
    // Cela évite le blocage du formulaire en cas de timeout de Cloud Function
    console.log("[usePaymentGateway] Stripe-supported country, using Stripe:", countryCode);
    setGateway("stripe");
    setIsPayPalOnly(false);
    setIsLoading(false);
    gatewayCache.set(countryCode, "stripe");

    // Appel backend en arrière-plan pour mise à jour (non-bloquant)
    try {
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

      // Mettre à jour seulement si différent (rare)
      if (recommendedGateway !== "stripe") {
        console.log("[usePaymentGateway] Backend recommends different gateway:", recommendedGateway);
        setGateway(recommendedGateway);
        setIsPayPalOnly(paypalOnly);
        gatewayCache.set(countryCode, recommendedGateway);
      }
    } catch (err) {
      // Ignorer les erreurs - on a déjà un fallback Stripe actif
      console.warn("[usePaymentGateway] Backend call failed (using Stripe fallback):", err);
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
