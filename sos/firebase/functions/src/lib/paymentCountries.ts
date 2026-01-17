/**
 * =============================================================================
 * PAYMENT COUNTRIES CONFIGURATION
 * =============================================================================
 *
 * Ce fichier centralise les listes de pays pour Stripe et PayPal.
 * Utilisé par :
 * - createStripeAccount.ts
 * - onProviderCreated.ts
 * - PayPalManager.ts
 * - Frontend: usePaymentGateway.ts (doit être synchronisé manuellement)
 *
 * IMPORTANT: Si vous modifiez ces listes, mettez également à jour :
 * - sos/src/hooks/usePaymentGateway.ts (frontend)
 */

// =============================================================================
// STRIPE SUPPORTED COUNTRIES (46 pays)
// =============================================================================
// Ces pays peuvent avoir un compte Stripe Express créé automatiquement
// Source: https://stripe.com/global

export const STRIPE_SUPPORTED_COUNTRIES = new Set([
  "AU", // Australia
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "BR", // Brazil
  "CA", // Canada
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GI", // Gibraltar
  "GR", // Greece
  "HK", // Hong Kong
  "HU", // Hungary
  "IE", // Ireland
  "IT", // Italy
  "JP", // Japan
  "LV", // Latvia
  "LI", // Liechtenstein
  "LT", // Lithuania
  "LU", // Luxembourg
  "MY", // Malaysia
  "MT", // Malta
  "MX", // Mexico
  "NL", // Netherlands
  "NZ", // New Zealand
  "NO", // Norway
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "SG", // Singapore
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
  "CH", // Switzerland
  "TH", // Thailand
  "AE", // United Arab Emirates
  "GB", // United Kingdom
  "US", // United States
]);

// =============================================================================
// PAYPAL-ONLY COUNTRIES (151+ pays)
// =============================================================================
// Ces pays NE supportent PAS Stripe Connect et doivent utiliser PayPal
// Les providers dans ces pays ne sont PAS visibles jusqu'à connexion PayPal

export const PAYPAL_ONLY_COUNTRIES = new Set([
  // ===== AFRIQUE (54 pays) =====
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",

  // ===== ASIE (35 pays - non couverts par Stripe) =====
  "AF", "BD", "BT", "IN", "KH", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "UZ", "VN",
  "MN", "KP", "KG", "PS", "YE", "OM", "QA", "KW", "BH", "JO", "LB", "AM", "AZ", "GE",
  "MV", "BN", "TL", "PH", "ID", "TW", "KR",

  // ===== AMERIQUE LATINE & CARAIBES (25 pays) =====
  "BO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE",
  "HT", "DO", "JM", "TT", "BB", "BS", "BZ", "GY", "PA", "CR",
  "AG", "DM", "GD", "KN", "LC", "VC",

  // ===== EUROPE DE L'EST & BALKANS (15 pays non Stripe) =====
  // Note: BY et RU sont inclus mais pourraient être sanctionnés
  "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU",
  "GI", "AD", "MC", "SM", "VA",

  // ===== OCEANIE & PACIFIQUE (15 pays) =====
  "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW",
  "NR", "TV", "NC", "PF", "GU",

  // ===== MOYEN-ORIENT (7 pays restants) =====
  "IQ", "IR", "SY", "SA",
]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Détermine le gateway de paiement recommandé pour un pays
 */
export type PaymentGateway = "stripe" | "paypal";

export function getRecommendedPaymentGateway(countryCode: string): PaymentGateway {
  const normalized = countryCode.toUpperCase();

  if (STRIPE_SUPPORTED_COUNTRIES.has(normalized)) {
    return "stripe";
  }

  // Par défaut, utiliser PayPal pour tous les autres pays
  return "paypal";
}

/**
 * Vérifie si un pays supporte Stripe Connect
 */
export function isStripeSupported(countryCode: string): boolean {
  return STRIPE_SUPPORTED_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Vérifie si un pays est PayPal-only
 */
export function isPayPalOnly(countryCode: string): boolean {
  const normalized = countryCode.toUpperCase();
  return PAYPAL_ONLY_COUNTRIES.has(normalized) || !STRIPE_SUPPORTED_COUNTRIES.has(normalized);
}

/**
 * Retourne un message d'erreur approprié pour un pays non supporté par Stripe
 */
export function getStripeUnsupportedMessage(countryCode: string, locale: string = "en"): string {
  const messages: Record<string, Record<string, string>> = {
    en: {
      title: "Stripe not available",
      message: `Stripe is not available in your country (${countryCode}). Please use PayPal instead.`,
    },
    fr: {
      title: "Stripe non disponible",
      message: `Stripe n'est pas disponible dans votre pays (${countryCode}). Veuillez utiliser PayPal à la place.`,
    },
    es: {
      title: "Stripe no disponible",
      message: `Stripe no está disponible en tu país (${countryCode}). Por favor usa PayPal en su lugar.`,
    },
  };

  return messages[locale]?.message || messages.en.message;
}
