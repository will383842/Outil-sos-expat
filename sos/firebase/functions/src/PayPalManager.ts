/**
 * PayPalManager.ts
 *
 * Gestionnaire PayPal Commerce Platform pour SOS-Expat.
 *
 * Fonctionnalités:
 * - Onboarding des marchands (providers) via Partner Referrals API
 * - Création d'ordres avec split de paiement
 * - Capture et remboursement
 * - Gestion des webhooks PayPal
 *
 * Documentation:
 * - Partner Referrals: https://developer.paypal.com/docs/api/partner-referrals/v2/
 * - Orders API: https://developer.paypal.com/docs/api/orders/v2/
 * - Webhooks: https://developer.paypal.com/docs/api/webhooks/v1/
 */

import * as admin from "firebase-admin";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "./utils/paymentSync";
// P2-2: Unified payment status checks
import { isPaymentCompleted } from "./utils/paymentStatusUtils";
// Production logger
import { logger as prodLogger } from "./utils/productionLogger";
// Production test logger
import { logWebhookTest } from "./utils/productionTestLogger";
// Meta CAPI for server-side tracking
import { META_CAPI_TOKEN, trackCAPIPurchase, UserData } from "./metaConversionsApi";
// P0 FIX: Import sendPaymentNotifications for PayPal parity with Stripe
import { sendPaymentNotifications, ENCRYPTION_KEY, OUTIL_SYNC_API_KEY } from "./notifications/paymentNotifications";
// P0 FIX: Import encryptPhoneNumber for Twilio call compatibility (phones must be encrypted in call_sessions)
import { encryptPhoneNumber } from "./utils/encryption";
// P0 FIX 2026-02-12: Cancel ALL affiliate commissions on refund (5 systems)
import { cancelCommissionsForCallSession as cancelChatterCommissions } from "./chatter/services/chatterCommissionService";
import { cancelCommissionsForCallSession as cancelInfluencerCommissions } from "./influencer/services/influencerCommissionService";
import { cancelBloggerCommissionsForCallSession as cancelBloggerCommissions } from "./blogger/services/bloggerCommissionService";
import { cancelCommissionsForCallSession as cancelGroupAdminCommissions } from "./groupAdmin/services/groupAdminCommissionService";
import { cancelCommissionsForCallSession as cancelAffiliateCommissions } from "./affiliate/services/commissionService";
// FEE CALCULATION: Frais de traitement déduits du prestataire
import { calculateEstimatedFees } from "./services/feeCalculationService";
// P0 FIX: Import setProviderBusy to reserve provider immediately after payment authorization
import { setProviderBusy } from "./callables/providerStatusManager";
import { PAYMENT_FUNCTIONS_REGION } from "./configs/callRegion";
import { ALLOWED_ORIGINS } from "./lib/functionConfigs";

// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  PAYPAL_PLATFORM_MERCHANT_ID,
  PAYPAL_MODE,
  PAYPAL_SECRETS,
  TASKS_AUTH_SECRET,
  getPayPalMode,
  getPayPalClientId,
  getPayPalClientSecret,
  getPayPalWebhookId,
  getPayPalPartnerId,
  getPayPalPlatformMerchantId,
  getPayPalBaseUrl,
} from "./lib/secrets";

// Re-export secrets for backwards compatibility with index.ts
export {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  PAYPAL_PLATFORM_MERCHANT_ID,
  PAYPAL_MODE,
  PAYPAL_SECRETS,
};

// Configuration
const PAYPAL_CONFIG = {
  // URLs selon l'environnement
  SANDBOX_URL: "https://api-m.sandbox.paypal.com",
  LIVE_URL: "https://api-m.paypal.com",

  // Mode (sandbox ou live) - use centralized getter
  get MODE(): "sandbox" | "live" {
    return getPayPalMode();
  },

  // Base URL - use centralized getter
  get BASE_URL(): string {
    return getPayPalBaseUrl();
  },

  // URLs de retour
  RETURN_URL: "https://sos-expat.com/payment/success",
  CANCEL_URL: "https://sos-expat.com/payment/cancel",

  // REMOVED: PLATFORM_FEE_PERCENT hardcoded value
  // Commission amounts are now centralized in admin_config/pricing (Firestore)
  // The actual fee calculation is done via getServiceAmounts() from pricingService.ts

  // Devise par défaut
  DEFAULT_CURRENCY: "EUR",

  // Pays NON supportés par Stripe Connect → utiliser PayPal
  // Stripe Connect supporte ~46 pays (US, CA, UK, EU, AU, NZ, JP, SG, HK, BR, MX, etc.)
  // Tous les autres pays doivent passer par PayPal
  // Liste mise à jour: 151 pays (197 total - 46 Stripe = 151 PayPal-only)
  PAYPAL_ONLY_COUNTRIES: [
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

    // ===== EUROPE DE L'EST & BALKANS (14 pays non Stripe) =====
    // Note: GI (Gibraltar) est supporté par Stripe
    "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU",
    "AD", "MC", "SM", "VA",

    // ===== OCEANIE & PACIFIQUE (15 pays) =====
    "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW",
    "NR", "TV", "NC", "PF", "GU",

    // ===== MOYEN-ORIENT (4 pays restants - LY/TM/AF déjà dans listes régionales) =====
    "IQ", "IR", "SY", "SA",
  ],
};

// Types
interface PayPalToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: any[];
  links: any[];
}

interface MerchantOnboardingData {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  businessName?: string;
}

// ====== PARTNER REFERRAL TYPES ======
// Ces types sont reserves pour utilisation future avec l'API Partner Referrals

export interface PartnerReferralData {
  providerId: string;
  email: string;
  country: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

export interface PartnerReferralResult {
  actionUrl: string;
  referralId: string;
  partnerId: string;
  expiresAt: Date;
}

export interface PartnerReferralStatus {
  isComplete: boolean;
  merchantId: string | null;
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
  oauthIntegrations: boolean;
  status: "pending" | "in_progress" | "completed" | "failed";
  canReceivePayments: boolean;
}

// ====== AAA PAYOUT CONFIG TYPES ======
interface AaaExternalAccount {
  id: string;
  name: string;
  gateway: "paypal" | "stripe";
  accountId: string;
  email?: string;
  holderName: string;
  country: string;
  isActive: boolean;
}

interface AaaPayoutConfig {
  externalAccounts: AaaExternalAccount[];
  defaultMode: string; // 'internal' or external account ID
}

interface AaaPayoutDecision {
  isAAA: boolean;
  mode: "internal" | "external";
  skipPayout: boolean;
  externalAccount?: AaaExternalAccount;
  reason: string;
}

interface CreateOrderData {
  callSessionId: string;
  amount: number;
  providerAmount: number;
  platformFee: number;
  currency: string;
  providerId: string;
  providerPayPalMerchantId: string;
  clientId: string;
  description: string;
  // P0 FIX: Phone numbers required for Twilio call
  clientPhone: string;
  providerPhone: string;
  // Tracking metadata for Meta CAPI and UTM attribution
  trackingMetadata?: Record<string, string>;
}

// Données pour le flux simplifié (sans Partner status)
interface CreateSimpleOrderData {
  callSessionId: string;
  amount: number;
  providerAmount: number;
  platformFee: number;
  currency: string;
  providerId: string;
  providerPayPalEmail: string; // Email au lieu de Merchant ID
  clientId: string;
  description: string;
  // P1 FIX: Title for SMS notifications to provider
  title?: string;
  // P1 FIX: Client country for SMS notifications to provider
  clientCurrentCountry?: string;
  // P2 FIX: Provider country = intervention country for SMS notifications
  providerCountry?: string;
  // P0 FIX: Phone numbers required for Twilio call
  clientPhone: string;
  providerPhone: string;
  // P0 FIX: Languages for Twilio voice prompts
  clientLanguages?: string[];
  providerLanguages?: string[];
  // P0 FIX: Service type required for pricing calculation during capture
  serviceType?: "lawyer" | "expat";
  // Tracking metadata for Meta CAPI and UTM attribution
  trackingMetadata?: Record<string, string>;
}

/**
 * Classe principale PayPal Manager
 */
export class PayPalManager {
  private db: admin.firestore.Firestore;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Check if a provider has special payout mode (AAA or multiprestataire)
   *
   * GESTION DES MODES DE PAIEMENT:
   * - Profils AAA: Utilise aaaPayoutMode ou payoutMode
   * - Profils normaux multiprestataires: Utilise payoutMode
   * - Si payoutMode === 'internal' → L'argent reste sur SOS-Expat
   * - Si payoutMode === <external_account_id> → Route vers le compte externe
   * - Si pas de payoutMode configuré → Payout normal vers le provider
   */
  async getAaaPayoutDecision(providerId: string): Promise<AaaPayoutDecision> {
    try {
      // Get provider document
      const providerDoc = await this.db.collection("sos_profiles").doc(providerId).get();
      const provider = providerDoc.data();

      if (!provider) {
        return {
          isAAA: false,
          mode: "external",
          skipPayout: false,
          reason: "Provider not found - normal payout flow",
        };
      }

      // Check payout mode (AAA or multiprestataire)
      // Priority: aaaPayoutMode > payoutMode > 'internal' for AAA / null for normal
      const payoutMode = provider.aaaPayoutMode || provider.payoutMode;
      const isAAA = provider.isAAA === true;

      // If no payoutMode configured and not AAA → normal payout
      if (!payoutMode && !isAAA) {
        return {
          isAAA: false,
          mode: "external",
          skipPayout: false,
          reason: "No special payout mode configured - normal payout flow",
        };
      }

      // Determine effective mode
      const effectivePayoutMode = payoutMode || "internal";

      if (effectivePayoutMode === "internal") {
        console.log(`💼 [PAYOUT] Provider ${providerId} has INTERNAL mode - skipping payout (isAAA=${isAAA})`);
        return {
          isAAA,
          mode: "internal",
          skipPayout: true,
          reason: isAAA
            ? "AAA profile with internal mode - money stays on SOS-Expat"
            : "Multiprestataire profile with internal mode - money stays on SOS-Expat",
        };
      }

      // External mode - get the external accounts configuration
      const configDoc = await this.db.collection("admin_config").doc("aaa_payout").get();
      const config = configDoc.data() as AaaPayoutConfig | undefined;

      if (!config || !config.externalAccounts || config.externalAccounts.length === 0) {
        console.warn(`⚠️ [PAYOUT] No external accounts configured - falling back to internal`);
        return {
          isAAA,
          mode: "internal",
          skipPayout: true,
          reason: "No external accounts configured - fallback to internal",
        };
      }

      // Find the external account
      const externalAccount = config.externalAccounts.find(
        (acc) => acc.id === effectivePayoutMode && acc.isActive
      );

      if (!externalAccount) {
        console.warn(`⚠️ [PAYOUT] External account ${effectivePayoutMode} not found or inactive - falling back to internal`);
        return {
          isAAA,
          mode: "internal",
          skipPayout: true,
          reason: `External account ${effectivePayoutMode} not found - fallback to internal`,
        };
      }

      console.log(`💼 [PAYOUT] Provider ${providerId} routing to EXTERNAL account → ${externalAccount.name} (isAAA=${isAAA})`);
      return {
        isAAA,
        mode: "external",
        skipPayout: false,
        externalAccount,
        reason: `Routing to ${externalAccount.name} (${externalAccount.gateway})`,
      };
    } catch (error) {
      console.error(`❌ [AAA] Error checking AAA status for ${providerId}:`, error);
      // P0 FIX: On error, fallback to internal (safer) with skipPayout: true
      // to prevent unintended payouts when we can't verify AAA status
      return {
        isAAA: false,
        mode: "internal",
        skipPayout: true,
        reason: `Error checking AAA status: ${error}`,
      };
    }
  }

  /**
   * Obtient un token d'accès PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Vérifier si le token est encore valide
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      console.log(`🔑 [PAYPAL_DEBUG] Using cached token (expires in ${Math.round((this.tokenExpiry - Date.now()) / 1000)}s)`);
      return this.accessToken;
    }

    console.log(`🔑 [PAYPAL_DEBUG] Getting new access token from ${PAYPAL_CONFIG.BASE_URL}...`);

    // P0 FIX: Use centralized getters for secrets
    const clientId = getPayPalClientId();
    const clientSecret = getPayPalClientSecret();

    console.log(`🔑 [PAYPAL_DEBUG] Client ID length: ${clientId?.length || 0}, Secret length: ${clientSecret?.length || 0}`);

    if (!clientId || !clientSecret) {
      console.error(`❌ [PAYPAL_DEBUG] CREDENTIALS MISSING! clientId=${!!clientId}, secret=${!!clientSecret}`);
      throw new Error("PayPal credentials are not configured");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${PAYPAL_CONFIG.BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ [PAYPAL_DEBUG] Token request failed! Status: ${response.status}, Error: ${error}`);
      throw new Error(`PayPal authentication failed: ${error}`);
    }
    console.log(`✅ [PAYPAL_DEBUG] Token obtained successfully`);

    const data = await response.json() as PayPalToken;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60s de marge

    console.log("✅ [PAYPAL] Access token obtained");
    return this.accessToken;
  }

  /**
   * Effectue une requête à l'API PayPal avec timeout et retry
   * P1-12 FIX: Ajout d'un timeout pour éviter que les Cloud Functions bloquent 540s
   * P2-9 FIX: Ajout d'exponential backoff pour les erreurs transitoires
   */
  private async apiRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    timeoutMs: number = 15000, // 15 secondes par défaut
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await this.getAccessToken();

        // P1-12: Créer un AbortController pour le timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(`${PAYPAL_CONFIG.BASE_URL}${endpoint}`, {
            method,
            signal: controller.signal,
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "PayPal-Partner-Attribution-Id": getPayPalPartnerId(),
            },
            body: body ? JSON.stringify(body) : undefined,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            const statusCode = response.status;

            // P2-9: Retry only on transient errors (5xx, 429)
            if (statusCode >= 500 || statusCode === 429) {
              throw new Error(`PayPal API transient error (${statusCode}): ${errorText}`);
            }

            // Client errors (4xx except 429) - don't retry
            console.error(`❌ [PAYPAL] API error (${endpoint}):`, errorText);
            throw new Error(`PayPal API error: ${errorText}`);
          }

          return response.json() as Promise<T>;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // P1-12: Handle timeout specifically
        if (lastError.name === 'AbortError') {
          console.error(`❌ [PAYPAL] API timeout after ${timeoutMs}ms for ${endpoint}`);
          lastError = new Error(`PayPal API timeout: Request exceeded ${timeoutMs}ms`);
        }

        // P2-9: Check if we should retry (transient errors only)
        const isTransientError = lastError.message.includes('transient error') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('network');

        if (isTransientError && attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️ [PAYPAL] Retry ${attempt + 1}/${maxRetries} for ${endpoint} in ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Non-retryable error or max retries reached
        throw lastError;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error');
  }

  // ====== ONBOARDING MARCHAND ======

  /**
   * Crée un lien d'onboarding pour un provider
   * Utilise Partner Referrals API
   */
  async createMerchantOnboardingLink(data: MerchantOnboardingData): Promise<{
    actionUrl: string;
    partnerId: string;
    referralId: string;
  }> {
    console.log("🔗 [PAYPAL] Creating merchant onboarding link for:", data.providerId);

    const referralData = {
      tracking_id: data.providerId,
      partner_config_override: {
        partner_logo_url: "https://sos-expat.com/logo.png",
        return_url: `https://sos-expat.com/dashboard/paypal-onboarding?providerId=${data.providerId}`,
        action_renewal_url: `https://sos-expat.com/dashboard/paypal-onboarding?providerId=${data.providerId}&renew=true`,
      },
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: {
                features: ["PAYMENT", "REFUND", "PARTNER_FEE"],
              },
            },
          },
        },
      ],
      products: ["EXPRESS_CHECKOUT"],
      legal_consents: [
        {
          type: "SHARE_DATA_CONSENT",
          granted: true,
        },
      ],
      individual_owner: {
        name: {
          given_name: data.firstName,
          surname: data.lastName,
        },
        email_address: data.email,
        address: {
          country_code: data.country,
        },
      },
    };

    const response = await this.apiRequest<any>(
      "POST",
      "/v2/customer/partner-referrals",
      referralData
    );

    // Trouver le lien d'action
    const actionUrl = response.links?.find((l: any) => l.rel === "action_url")?.href;

    if (!actionUrl) {
      throw new Error("No action URL in PayPal response");
    }

    // Sauvegarder le referral en base
    await this.db.collection("paypal_referrals").doc(data.providerId).set({
      providerId: data.providerId,
      referralId: response.links?.find((l: any) => l.rel === "self")?.href?.split("/").pop(),
      status: "pending",
      actionUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ [PAYPAL] Onboarding link created");

    return {
      actionUrl,
      partnerId: getPayPalPartnerId(),
      referralId: response.links?.find((l: any) => l.rel === "self")?.href?.split("/").pop() || "",
    };
  }

  /**
   * Vérifie le statut d'onboarding d'un marchand
   */
  async checkMerchantStatus(providerId: string): Promise<{
    isOnboarded: boolean;
    merchantId: string | null;
    paymentsReceivable: boolean;
    primaryEmail: string | null;
  }> {
    console.log("🔍 [PAYPAL] Checking merchant status for:", providerId);

    // Récupérer les infos du provider
    const providerDoc = await this.db.collection("users").doc(providerId).get();
    const providerData = providerDoc.data();
    const merchantId = providerData?.paypalMerchantId;

    if (!merchantId) {
      return {
        isOnboarded: false,
        merchantId: null,
        paymentsReceivable: false,
        primaryEmail: null,
      };
    }

    try {
      const partnerId = getPayPalPartnerId();
      const response = await this.apiRequest<any>(
        "GET",
        `/v1/customer/partners/${partnerId}/merchant-integrations/${merchantId}`
      );

      const isOnboarded = response.payments_receivable === true;

      // Mettre à jour le statut en base
      await this.db.collection("users").doc(providerId).update({
        paypalOnboardingComplete: isOnboarded,
        paypalPaymentsReceivable: response.payments_receivable,
        paypalPrimaryEmail: response.primary_email,
        paypalLastCheck: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        isOnboarded,
        merchantId,
        paymentsReceivable: response.payments_receivable || false,
        primaryEmail: response.primary_email || null,
      };
    } catch (error) {
      console.error("❌ [PAYPAL] Error checking merchant status:", error);
      return {
        isOnboarded: false,
        merchantId,
        paymentsReceivable: false,
        primaryEmail: null,
      };
    }
  }

  // ====== ORDERS / PAIEMENTS ======

  /**
   * Cree un ordre PayPal SIMPLIFIE (flux Payouts)
   *
   * FLUX SIMPLIFIE (sans Partner status):
   * =====================================
   * 1. Le client paie le montant total (ex: 100 EUR)
   * 2. L'argent va sur le compte PayPal SOS-Expat
   * 3. Apres capture, SOS-Expat envoie la part du provider via Payouts API
   * 4. SOS-Expat garde sa commission (ex: 20 EUR)
   *
   * Avantages:
   * - Pas besoin de Partner status PayPal
   * - Le provider doit juste fournir son email PayPal
   * - Simple a mettre en place
   *
   * Inconvenients:
   * - Transit par la plateforme (SOS-Expat recoit puis redistribue)
   * - Le provider recoit apres capture (pas instantane)
   */
  async createSimpleOrder(data: CreateSimpleOrderData): Promise<{
    orderId: string;
    approvalUrl: string;
    status: string;
  }> {
    console.log(`🔶 [PAYPAL_DEBUG] createSimpleOrder START`);
    console.log(`🔶 [PAYPAL_DEBUG] Session: ${data.callSessionId}`);
    console.log(`🔶 [PAYPAL_DEBUG] Amount: ${data.amount} ${data.currency}`);
    console.log(`🔶 [PAYPAL_DEBUG] Provider: ${data.providerId}, Email: ${data.providerPayPalEmail || 'UNDEFINED'}`);

    const totalAmount = data.amount.toFixed(2);
    console.log(`🔶 [PAYPAL_DEBUG] Formatted amount: ${totalAmount}`);

    // ===== CALCUL DES FRAIS DE TRAITEMENT (déduits du prestataire) =====
    const estimatedFees = await calculateEstimatedFees(
      'paypal',
      data.amount,
      data.providerAmount,
      data.currency,
    );
    const providerNetAmount = estimatedFees.providerNetAmount;

    console.log(`🔶 [PAYPAL_DEBUG] Fee calculation:`, {
      processingFee: estimatedFees.processingFee,
      payoutFee: estimatedFees.payoutFee,
      totalFees: estimatedFees.totalFees,
      providerGross: data.providerAmount,
      providerNet: providerNetAmount,
    });

    // Ordre simple: l'argent va à SOS-Expat, pas de split automatique
    // AUTHORIZE flow: comme Stripe, on prend seulement une autorisation
    // La capture se fait après 2 minutes d'appel, sinon on void l'autorisation
    const orderData = {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: data.callSessionId,
          description: data.description,
          amount: {
            currency_code: data.currency,
            value: totalAmount,
          },
          custom_id: data.callSessionId,
          soft_descriptor: "SOS-EXPAT",
        },
      ],
      application_context: {
        brand_name: "SOS Expat",
        landing_page: "LOGIN",
        user_action: "CONTINUE", // AUTHORIZE flow: "CONTINUE" au lieu de "PAY_NOW"
        return_url: `${PAYPAL_CONFIG.RETURN_URL}?sessionId=${data.callSessionId}`,
        cancel_url: `${PAYPAL_CONFIG.CANCEL_URL}?sessionId=${data.callSessionId}`,
      },
    };

    console.log(`🔶 [PAYPAL_DEBUG] Calling PayPal API to create order (AUTHORIZE intent)...`);
    const response = await this.apiRequest<PayPalOrder>(
      "POST",
      "/v2/checkout/orders",
      orderData
    );
    console.log(`🔶 [PAYPAL_DEBUG] PayPal API response - orderId: ${response.id}, status: ${response.status}`);

    const approvalUrl = response.links?.find((l: any) => l.rel === "approve")?.href;
    console.log(`🔶 [PAYPAL_DEBUG] Approval URL: ${approvalUrl ? 'FOUND' : 'NOT FOUND'}`);

    if (!approvalUrl) {
      console.error(`❌ [PAYPAL_DEBUG] No approval URL in response! Links: ${JSON.stringify(response.links)}`);
      throw new Error("No approval URL in PayPal response");
    }

    // Sauvegarder l'ordre avec le flag "simpleFlow" pour déclencher le payout après capture
    console.log(`🔶 [PAYPAL_DEBUG] Saving order to Firestore...`);
    await this.db.collection("paypal_orders").doc(response.id).set({
      orderId: response.id,
      callSessionId: data.callSessionId,
      clientId: data.clientId,
      providerId: data.providerId,
      providerPayPalEmail: data.providerPayPalEmail || null, // Email pour le payout (null si non défini)
      amount: data.amount,
      providerAmount: data.providerAmount,
      providerNetAmount,
      platformFee: data.platformFee,
      currency: data.currency,
      status: response.status,
      approvalUrl,
      simpleFlow: true, // Flag pour déclencher le payout après capture
      feeBreakdown: {
        gateway: 'paypal',
        currency: data.currency,
        processingFee: estimatedFees.processingFee,
        payoutFee: estimatedFees.payoutFee,
        totalFees: estimatedFees.totalFees,
        providerGrossAmount: data.providerAmount,
        providerNetAmount,
      },
      intent: "AUTHORIZE", // AUTHORIZE flow: comme Stripe, capture après 2 min
      payoutStatus: "pending", // En attente du payout
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`🔶 [PAYPAL_DEBUG] paypal_orders document saved for ${response.id}`);

    // P0 FIX: Créer ou mettre à jour la session d'appel (utiliser set avec merge au lieu de update)
    console.log(`🔶 [PAYPAL_DEBUG] Saving call_sessions for ${data.callSessionId}...`);

    // P0 FIX CRITICAL: Encrypt phone numbers for Twilio compatibility
    // TwilioCallManager.startConference expects encrypted phones and calls decryptPhoneNumber()
    // Without encryption, decryption fails and Twilio calls never trigger!
    const encryptedClientPhone = data.clientPhone ? encryptPhoneNumber(data.clientPhone) : "";
    const encryptedProviderPhone = data.providerPhone ? encryptPhoneNumber(data.providerPhone) : "";
    console.log(`🔐 [PAYPAL_DEBUG] Phone encryption: client=${!!encryptedClientPhone}, provider=${!!encryptedProviderPhone}`);

    // P0 FIX CRITICAL: Generate conference name for Twilio (required by TwilioCallManager.executeCallSequence)
    const conferenceName = `conf_${data.callSessionId}_${Date.now()}`;
    console.log(`🔶 [PAYPAL_DEBUG] Generated conference name: ${conferenceName}`);

    await this.db.collection("call_sessions").doc(data.callSessionId).set({
      id: data.callSessionId,
      status: "pending",
      // P1-13 FIX: FK vers paypal_orders collection (source of truth unique)
      paymentId: response.id,
      clientId: data.clientId,
      providerId: data.providerId,
      payment: {
        paypalOrderId: response.id,
        // P0 FIX: Add gateway field for TwilioCallManager to detect PayPal payments
        gateway: "paypal",
        // P0 FIX: intentId is required by capturePaymentForSession - use paypalOrderId as fallback
        intentId: response.id,
        paymentMethod: "paypal",
        paymentFlow: "simple_payout",
        status: "pending_approval",
        amount: data.amount,
        providerAmount: data.providerAmount,
        providerNetAmount,
        currency: data.currency,
      },
      participants: {
        provider: {
          id: data.providerId,
          type: "provider",
          // P0 FIX: Store ENCRYPTED phone for Twilio compatibility
          phone: encryptedProviderPhone,
          status: "pending",
          attemptCount: 0,
        },
        client: {
          id: data.clientId,
          type: "client",
          // P0 FIX: Store ENCRYPTED phone for Twilio compatibility
          phone: encryptedClientPhone,
          status: "pending",
          attemptCount: 0,
        },
      },
      // P0 FIX CRITICAL: Add conference object for Twilio (required by TwilioCallManager)
      conference: { name: conferenceName },
      // P1 FIX: Add title, description and country for SMS notifications to provider
      title: data.title || data.description || "Consultation",
      description: data.description || "Consultation",
      clientCurrentCountry: data.clientCurrentCountry || "",
      // P2 FIX: Provider country = intervention country for SMS notifications
      providerCountry: data.providerCountry || "",
      metadata: {
        providerId: data.providerId,
        clientId: data.clientId,
        // P0 FIX CRITICAL: serviceType and providerType required for pricing calculation during capture
        serviceType: data.serviceType === "lawyer" ? "lawyer_call" : "expat_call",
        providerType: data.serviceType || "expat",
        // P0 FIX: Add maxDuration for Twilio call (32 min for expat, 20 min for lawyer)
        maxDuration: data.serviceType === "lawyer" ? 1200 : 1920,
        // P0 FIX: Languages for Twilio voice prompts (critical for correct TTS language)
        clientLanguages: data.clientLanguages || ["fr"],
        providerLanguages: data.providerLanguages || ["fr"],
        // P1 FIX: Title, description and country for SMS notifications (read by paymentNotifications.ts)
        title: data.title || data.description || "Consultation",
        description: data.description || "Consultation",
        clientCountry: data.clientCurrentCountry || "",
        // P1 FIX: Add audit fields for consistency with Stripe (environment, requestId)
        environment: process.env.NODE_ENV || "production",
        requestId: `paypal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        // Include tracking metadata for attribution (UTM, Meta identifiers)
        ...(data.trackingMetadata || {}),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`🔶 [PAYPAL_DEBUG] call_sessions document saved with conference name and encrypted phones`);

    console.log(`✅ [PAYPAL_DEBUG] createSimpleOrder COMPLETE - orderId: ${response.id}`);

    return {
      orderId: response.id,
      approvalUrl,
      status: response.status,
    };
  }

  /**
   * @deprecated Cette fonction n'est plus utilisée en production.
   * Utilisez createSimpleOrder() à la place.
   *
   * Le flux Direct (merchantId) n'est jamais utilisé car:
   * - Les prestataires sont majoritairement des particuliers sans compte PayPal Business
   * - L'onboarding PayPal Commerce Platform est trop complexe
   * - Le flux Simple (payout vers email) fonctionne pour tous les cas
   *
   * ANCIEN FLUX DE PAIEMENT DIRECT (PayPal Commerce Platform):
   * ====================================================
   * 1. Le client paie le montant total (ex: 100 EUR)
   * 2. L'argent va DIRECTEMENT sur le compte PayPal du provider (payee.merchant_id)
   * 3. SOS-Expat recoit uniquement sa commission via platform_fees (ex: 20 EUR)
   * 4. Le provider recoit le reste (ex: 80 EUR) instantanement
   */
  async createOrder(data: CreateOrderData): Promise<{
    orderId: string;
    approvalUrl: string;
    status: string;
  }> {
    console.log("📦 [PAYPAL] Creating DIRECT payment order for session:", data.callSessionId);
    console.log(`📦 [PAYPAL] Total: ${data.amount} ${data.currency} | Platform fee: ${data.platformFee} | Provider receives: ${data.providerAmount}`);

    // Calculer les montants en string formate (PayPal exige des strings)
    const totalAmount = data.amount.toFixed(2);
    const platformFee = data.platformFee.toFixed(2);

    // Recuperer le Merchant ID de la plateforme SOS-Expat pour recevoir les fees
    const platformMerchantId = getPayPalPlatformMerchantId();
    if (!platformMerchantId) {
      console.error("❌ [PAYPAL] PAYPAL_PLATFORM_MERCHANT_ID secret is not configured");
      throw new Error("PAYPAL_PLATFORM_MERCHANT_ID secret is not configured. Please set this secret in Firebase.");
    }

    console.log(`📦 [PAYPAL] Provider Merchant ID: ${data.providerPayPalMerchantId}`);
    console.log(`📦 [PAYPAL] Platform Merchant ID: ${platformMerchantId}`);

    // AUTHORIZE flow: comme Stripe, on prend seulement une autorisation
    // La capture se fait après 2 minutes d'appel, sinon on void l'autorisation
    const orderData = {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: data.callSessionId,
          description: data.description,
          amount: {
            currency_code: data.currency,
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: data.currency,
                value: totalAmount,
              },
            },
          },
          // ========== PAYEE: PAIEMENT DIRECT AU PROVIDER ==========
          // L'argent va directement sur le compte PayPal du provider
          payee: {
            merchant_id: data.providerPayPalMerchantId,
          },
          payment_instruction: {
            // INSTANT: Le provider recoit l'argent immediatement apres capture
            disbursement_mode: "INSTANT",
            // ========== PLATFORM_FEES: COMMISSION SOS-EXPAT ==========
            // Les frais de plateforme sont preleves et envoyes au compte SOS-Expat
            platform_fees: [
              {
                amount: {
                  currency_code: data.currency,
                  value: platformFee,
                },
                // Le destinataire des platform_fees est la plateforme SOS-Expat
                payee: {
                  merchant_id: platformMerchantId,
                },
              },
            ],
          },
          custom_id: data.callSessionId,
          soft_descriptor: "SOS-EXPAT",
        },
      ],
      application_context: {
        brand_name: "SOS Expat",
        landing_page: "LOGIN",
        user_action: "CONTINUE", // AUTHORIZE flow: "CONTINUE" au lieu de "PAY_NOW"
        return_url: `${PAYPAL_CONFIG.RETURN_URL}?sessionId=${data.callSessionId}`,
        cancel_url: `${PAYPAL_CONFIG.CANCEL_URL}?sessionId=${data.callSessionId}`,
      },
    };

    const response = await this.apiRequest<PayPalOrder>(
      "POST",
      "/v2/checkout/orders",
      orderData
    );

    // Trouver l'URL d'approbation
    const approvalUrl = response.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL in PayPal response");
    }

    // Sauvegarder l'ordre en base
    await this.db.collection("paypal_orders").doc(response.id).set({
      orderId: response.id,
      callSessionId: data.callSessionId,
      clientId: data.clientId,
      providerId: data.providerId,
      amount: data.amount,
      providerAmount: data.providerAmount,
      platformFee: data.platformFee,
      currency: data.currency,
      status: response.status,
      approvalUrl,
      intent: "AUTHORIZE", // AUTHORIZE flow: comme Stripe, capture après 2 min
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // P0 FIX: Créer ou mettre à jour la session d'appel (utiliser set avec merge au lieu de update)
    // P0 FIX CRITICAL: Encrypt phone numbers for Twilio compatibility
    // TwilioCallManager.startConference expects encrypted phones and calls decryptPhoneNumber()
    // Without encryption, decryption fails and Twilio calls never trigger!
    const encryptedClientPhone = data.clientPhone ? encryptPhoneNumber(data.clientPhone) : "";
    const encryptedProviderPhone = data.providerPhone ? encryptPhoneNumber(data.providerPhone) : "";
    console.log(`🔐 [PAYPAL] Phone encryption (DIRECT): client=${!!encryptedClientPhone}, provider=${!!encryptedProviderPhone}`);

    // P0 FIX CRITICAL: Generate conference name for Twilio (required by TwilioCallManager.executeCallSequence)
    const conferenceNameDirect = `conf_${data.callSessionId}_${Date.now()}`;
    console.log(`🔶 [PAYPAL] Generated conference name (DIRECT): ${conferenceNameDirect}`);

    await this.db.collection("call_sessions").doc(data.callSessionId).set({
      id: data.callSessionId,
      status: "pending",
      // P1-13 FIX: FK vers paypal_orders collection (source of truth unique)
      paymentId: response.id,
      clientId: data.clientId,
      providerId: data.providerId,
      payment: {
        paypalOrderId: response.id,
        paymentMethod: "paypal",
        paymentFlow: "direct_split",
        status: "pending_approval",
        amount: data.amount,
        providerAmount: data.providerAmount,
        currency: data.currency,
      },
      participants: {
        provider: {
          id: data.providerId,
          type: "provider",
          // P0 FIX: Store ENCRYPTED phone for Twilio compatibility
          phone: encryptedProviderPhone,
          status: "pending",
          attemptCount: 0,
        },
        client: {
          id: data.clientId,
          type: "client",
          // P0 FIX: Store ENCRYPTED phone for Twilio compatibility
          phone: encryptedClientPhone,
          status: "pending",
          attemptCount: 0,
        },
      },
      // P0 FIX CRITICAL: Add conference object for Twilio (required by TwilioCallManager)
      conference: { name: conferenceNameDirect },
      metadata: {
        providerId: data.providerId,
        clientId: data.clientId,
        // P0 FIX: Add maxDuration for Twilio call (32 min default for non-lawyers)
        maxDuration: 1920,
        // Include tracking metadata for attribution (UTM, Meta identifiers)
        ...(data.trackingMetadata || {}),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("✅ [PAYPAL] Order created with conference name and encrypted phones:", response.id);

    return {
      orderId: response.id,
      approvalUrl,
      status: response.status,
    };
  }

  /**
   * Autorise un ordre PayPal après approbation du client
   *
   * FLOW AUTHORIZE (comme Stripe):
   * ==============================
   * 1. Ordre créé avec intent="AUTHORIZE"
   * 2. Client approuve sur PayPal
   * 3. Cette méthode est appelée pour créer l'autorisation
   * 4. L'autorisation peut être:
   *    - Capturée (après 2 min d'appel) via captureOrder()
   *    - Annulée (appel < 2 min) via voidAuthorization()
   *
   * L'autorisation est valide 29 jours.
   *
   * @param orderId - L'ID de l'ordre PayPal approuvé
   * @returns L'ID de l'autorisation créée
   */
  async authorizeOrder(orderId: string): Promise<{
    success: boolean;
    authorizationId: string;
    status: string;
    amount?: number;
    currency?: string;
  }> {
    console.log(`🔐 [PAYPAL] Authorizing order: ${orderId}`);

    // Récupérer les données de l'ordre
    const orderDoc = await this.db.collection("paypal_orders").doc(orderId).get();
    const orderData = orderDoc.data();

    if (!orderData) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Vérifier que l'ordre est bien en mode AUTHORIZE
    if (orderData.intent !== "AUTHORIZE") {
      console.warn(`⚠️ [PAYPAL] Order ${orderId} was not created with AUTHORIZE intent`);
    }

    // Appeler l'API PayPal pour autoriser l'ordre
    const response = await this.apiRequest<any>(
      "POST",
      `/v2/checkout/orders/${orderId}/authorize`,
      {}
    );

    console.log(`🔐 [PAYPAL] Authorization response status: ${response.status}`);

    // Extraire l'autorisation créée
    const authorization = response.purchase_units?.[0]?.payments?.authorizations?.[0];

    if (!authorization) {
      throw new Error("No authorization returned from PayPal");
    }

    const authorizationId = authorization.id;
    const authorizationStatus = authorization.status;
    const authAmount = authorization.amount?.value ? parseFloat(authorization.amount.value) : orderData.amount;
    const authCurrency = authorization.amount?.currency_code || orderData.currency;

    console.log(`🔐 [PAYPAL] Authorization created: ${authorizationId}, status: ${authorizationStatus}`);

    // ========================================
    // P0 CRITICAL FIX: Vérifier que l'autorisation a réellement réussi
    // PayPal peut retourner HTTP 200 avec status DENIED, PENDING, VOIDED, etc.
    // Seul le statut "CREATED" signifie que l'autorisation est valide
    // ========================================
    if (authorizationStatus !== "CREATED") {
      console.error(`❌ [PAYPAL] Authorization NOT successful! Status: ${authorizationStatus}`);
      console.error(`❌ [PAYPAL] Expected: CREATED, Got: ${authorizationStatus}`);
      console.error(`❌ [PAYPAL] Order ${orderId} will NOT be marked as authorized`);

      // Mettre à jour l'ordre avec le statut d'échec
      await this.db.collection("paypal_orders").doc(orderId).update({
        status: "AUTHORIZATION_FAILED",
        authorizationId,
        authorizationStatus,
        authorizationFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mettre à jour la call_session avec le statut d'échec
      if (orderData.callSessionId) {
        await this.db.collection("call_sessions").doc(orderData.callSessionId).update({
          "payment.status": "authorization_failed",
          "payment.failureReason": `PayPal authorization status: ${authorizationStatus}`,
          "payment.failedAt": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      throw new Error(`PayPal authorization failed: status=${authorizationStatus} (expected CREATED)`);
    }

    console.log(`✅ [PAYPAL] Authorization status verified: CREATED`);

    // Mettre à jour l'ordre dans Firestore avec l'ID d'autorisation
    await this.db.collection("paypal_orders").doc(orderId).update({
      status: "AUTHORIZED",
      authorizationId,
      authorizationStatus,
      authorizationCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mettre à jour la call_session
    if (orderData.callSessionId) {
      await this.db.collection("call_sessions").doc(orderData.callSessionId).update({
        "payment.status": "authorized",
        "payment.authorizationId": authorizationId,
        "payment.authorizedAt": admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // ========================================
    // P0 FIX: RÉSERVER LE PROVIDER IMMÉDIATEMENT APRÈS AUTORISATION
    // ========================================
    // Mettre le provider en busy dès maintenant pour éviter le double-booking
    // pendant les 1-4 minutes avant qu'il réponde au téléphone
    if (orderData.callSessionId && orderData.providerId) {
      try {
        console.log(`🔶 [PAYPAL] Setting provider ${orderData.providerId} to BUSY (pending_call)...`);
        const busyResult = await setProviderBusy(orderData.providerId, orderData.callSessionId, 'pending_call');

        if (busyResult.success) {
          console.log(`✅ [PAYPAL] Provider ${orderData.providerId} marked as BUSY (pending_call)`);
        } else {
          console.warn(`⚠️ [PAYPAL] Failed to set provider busy: ${busyResult.error}`);
        }
      } catch (busyError) {
        console.error(`⚠️ [PAYPAL] Error setting provider busy (non-blocking):`, busyError);
        // Non-blocking: on continue même si le provider n'est pas marqué busy
      }
    }

    // ========================================
    // P0 FIX: PLANIFIER L'APPEL TWILIO APRÈS AUTORISATION PAYPAL
    // Comme Stripe avec capture_method: 'manual', l'appel démarre après autorisation
    // La capture se fait après 2 minutes d'appel
    // ========================================
    if (orderData.callSessionId) {
      try {
        const { scheduleCallTaskWithIdempotence } = await import("./lib/tasks");
        const CALL_DELAY_SECONDS = 240; // 4 minutes de délai comme pour Stripe

        console.log(`📞 [PAYPAL] Scheduling call for session: ${orderData.callSessionId}`);

        const schedulingResult = await scheduleCallTaskWithIdempotence(
          orderData.callSessionId,
          CALL_DELAY_SECONDS,
          this.db
        );

        if (schedulingResult.skipped) {
          console.log(`⚠️ [PAYPAL] Call scheduling skipped: ${schedulingResult.reason}`);
        } else {
          console.log(`✅ [PAYPAL] Call scheduled with taskId: ${schedulingResult.taskId}`);
        }
      } catch (scheduleError) {
        // Ne pas faire échouer l'autorisation si le scheduling échoue
        console.error(`❌ [PAYPAL] Call scheduling failed:`, scheduleError);
      }
    }

    console.log(`✅ [PAYPAL] Order ${orderId} authorized successfully - authorizationId: ${authorizationId}`);

    return {
      success: true,
      authorizationId,
      status: authorizationStatus,
      amount: authAmount,
      currency: authCurrency,
    };
  }

  /**
   * Capture un ordre PayPal apres approbation du client
   *
   * GÈRE 2 FLUX:
   * =============
   * 1. FLUX DIRECT (Partner status): Split automatique via platform_fees
   * 2. FLUX SIMPLE (sans Partner): Payout automatique après capture
   *
   * RÈGLE MÉTIER CRITIQUE:
   * ======================
   * Une fois la prestation effectuée, AUCUN REMBOURSEMENT n'est possible,
   * même si le prestataire n'a pas fait son KYC. Le paiement reste en attente
   * jusqu'à ce que le prestataire configure son compte PayPal.
   */
  async captureOrder(orderId: string): Promise<{
    success: boolean;
    captureId: string;
    status: string;
    providerAmount?: number;
    connectionFee?: number; // Frais de mise en relation (pas "commission")
    grossAmount?: number;
    payoutTriggered?: boolean;
    payoutId?: string;
  }> {
    console.log("💳 [PAYPAL] Capturing order:", orderId);

    // Récupérer les données de l'ordre AVANT capture
    const orderDoc = await this.db.collection("paypal_orders").doc(orderId).get();
    const orderData = orderDoc.data();

    if (!orderData) {
      throw new Error(`Order ${orderId} not found`);
    }

    const isSimpleFlow = orderData.simpleFlow === true;
    const isAuthorizeFlow = orderData.intent === "AUTHORIZE";
    console.log(`💳 [PAYPAL] Flow type: ${isSimpleFlow ? "SIMPLE (Payout)" : "DIRECT (Split)"}`);
    console.log(`💳 [PAYPAL] Intent: ${isAuthorizeFlow ? "AUTHORIZE" : "CAPTURE"}`);

    let capture: any;
    let response: any;

    // ========== AUTHORIZE FLOW (comme Stripe) ==========
    if (isAuthorizeFlow) {
      // Vérifier si l'ordre a déjà été autorisé
      let authorizationId = orderData.authorizationId;

      if (!authorizationId) {
        // L'ordre n'a pas encore été autorisé, le faire maintenant
        console.log(`🔐 [PAYPAL] Order not yet authorized, authorizing now...`);
        const authResult = await this.authorizeOrder(orderId);
        authorizationId = authResult.authorizationId;
      }

      console.log(`💳 [PAYPAL] Capturing authorization: ${authorizationId}`);

      // Capturer l'autorisation
      response = await this.apiRequest<any>(
        "POST",
        `/v2/payments/authorizations/${authorizationId}/capture`,
        {
          final_capture: true, // Indique que c'est la capture finale
        }
      );

      // La réponse de capture d'autorisation est directement l'objet capture
      capture = response;
      console.log(`💳 [PAYPAL] Authorization capture response:`, JSON.stringify(response, null, 2));
    }
    // ========== CAPTURE FLOW (legacy) ==========
    else {
      // Effectuer la capture directe de l'ordre
      response = await this.apiRequest<any>(
        "POST",
        `/v2/checkout/orders/${orderId}/capture`,
        {}
      );

      capture = response.purchase_units?.[0]?.payments?.captures?.[0];
    }

    if (!capture) {
      throw new Error("No capture data in PayPal response");
    }

    // ========================================
    // P0 CRITICAL FIX 2026-02-02: Verify capture status
    // Just like authorizeOrder(), we must verify the capture was successful
    // PayPal can return HTTP 200 with status DECLINED, PENDING, FAILED, etc.
    // Only "COMPLETED" means the funds were actually captured
    // ========================================
    const captureStatus = capture.status;
    console.log(`💳 [PAYPAL] Capture status: ${captureStatus}`);

    if (captureStatus !== "COMPLETED") {
      console.error(`❌ [PAYPAL] Capture NOT successful! Status: ${captureStatus}`);
      console.error(`❌ [PAYPAL] Expected: COMPLETED, Got: ${captureStatus}`);
      console.error(`❌ [PAYPAL] Order ${orderId} capture FAILED`);

      // Update order with failure status
      await this.db.collection("paypal_orders").doc(orderId).update({
        status: "CAPTURE_FAILED",
        captureStatus,
        captureFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        captureFailureReason: `Capture status: ${captureStatus}`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update call_session with failure status
      if (orderData.callSessionId) {
        await this.db.collection("call_sessions").doc(orderData.callSessionId).update({
          "payment.status": "capture_failed",
          "payment.captureStatus": captureStatus,
          "payment.failureReason": `PayPal capture status: ${captureStatus}`,
          "payment.failedAt": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        success: false,
        captureId: capture.id || "",
        status: captureStatus,
        providerAmount: 0,
        connectionFee: 0,
        grossAmount: 0,
        payoutTriggered: false,
      };
    }

    console.log(`✅ [PAYPAL] Capture VERIFIED - Status: COMPLETED`);

    const captureAmount = capture?.amount?.value ? parseFloat(capture.amount.value) : 0;
    const captureCurrency = capture?.amount?.currency_code || "EUR";

    // Extraire les informations de breakdown
    const sellerReceivableBreakdown = capture?.seller_receivable_breakdown;
    const grossAmount = sellerReceivableBreakdown?.gross_amount?.value
      ? parseFloat(sellerReceivableBreakdown.gross_amount.value)
      : captureAmount;

    // Pour le flux simple, les frais sont stockés dans orderData
    const connectionFeeAmount = isSimpleFlow
      ? (orderData.platformFee || orderData.connectionFee || 0)
      : (sellerReceivableBreakdown?.platform_fees?.[0]?.amount?.value
        ? parseFloat(sellerReceivableBreakdown.platform_fees[0].amount.value)
        : 0);

    // Montant brut du prestataire (avant frais de traitement)
    const providerGrossAmount = isSimpleFlow
      ? (orderData.providerAmount || grossAmount - connectionFeeAmount)
      : (sellerReceivableBreakdown?.net_amount?.value
        ? parseFloat(sellerReceivableBreakdown.net_amount.value)
        : grossAmount - connectionFeeAmount);

    // FEE FIX: Utiliser providerNetAmount (après déduction frais) pour le payout
    // Fallback chaîné pour rétro-compatibilité avec les anciennes commandes
    const providerAmount = isSimpleFlow
      ? (orderData.providerNetAmount ?? orderData.providerAmount ?? providerGrossAmount)
      : providerGrossAmount;

    console.log(`💳 [PAYPAL] Capture completed - Total: ${grossAmount} ${captureCurrency}, Frais: ${connectionFeeAmount}, Provider gross: ${providerGrossAmount}, Provider net (payout): ${providerAmount}`);

    let payoutTriggered = false;
    let payoutId: string | undefined;
    let aaaDecision: AaaPayoutDecision | null = null;

    // ===== CHECK FOR AAA PROFILE =====
    if (orderData.providerId) {
      aaaDecision = await this.getAaaPayoutDecision(orderData.providerId);
      console.log(`💼 [AAA] Decision for ${orderData.providerId}: ${aaaDecision.reason}`);
    }

    // ===== FLUX SIMPLE: Déclencher le Payout automatiquement =====
    if (isSimpleFlow && providerAmount > 0) {
      // P1-3 AUDIT FIX: Atomic lock to prevent double payout from parallel captureOrder() calls.
      // Two instances could pass createPayout()'s dedup check simultaneously before either writes.
      // This transaction claims exclusive payout rights on the order document.
      let payoutAlreadyClaimed = false;
      try {
        await this.db.runTransaction(async (transaction) => {
          const orderSnap = await transaction.get(this.db.collection("paypal_orders").doc(orderId));
          const snapData = orderSnap.data();
          if (snapData?.payoutClaimed === true) {
            payoutAlreadyClaimed = true;
            return; // Another instance already claimed payout
          }
          transaction.update(orderSnap.ref, {
            payoutClaimed: true,
            payoutClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (txError) {
        console.error(`❌ [PAYPAL] Payout claim transaction failed for ${orderId}:`, txError);
        // On transaction failure, skip payout to be safe (will be retried by recovery cron)
        payoutAlreadyClaimed = true;
      }

      if (payoutAlreadyClaimed) {
        console.log(`⚠️ [PAYPAL] Payout already claimed for order ${orderId} — skipping to prevent double payout`);
      }
      // AAA Internal Mode: Skip payout - money stays on platform
      else if (aaaDecision?.skipPayout) {
        console.log(`💼 [AAA] SKIPPING payout for AAA profile ${orderData.providerId} (internal mode)`);
        payoutTriggered = true; // Mark as "handled" even though no actual payout
        payoutId = `AAA_INTERNAL_${orderData.callSessionId}`;

        // Log the internal AAA payout
        await this.db.collection("aaa_internal_payouts").add({
          callSessionId: orderData.callSessionId,
          orderId,
          providerId: orderData.providerId,
          providerAmount,
          currency: captureCurrency,
          mode: "internal",
          reason: aaaDecision.reason,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      // AAA External Mode: Use consolidated AAA account
      else if (aaaDecision?.isAAA && aaaDecision.externalAccount) {
        const aaaAccount = aaaDecision.externalAccount;
        console.log(`💰 [AAA] Triggering payout to AAA consolidated account: ${aaaAccount.name}`);

        if (aaaAccount.gateway === "paypal" && aaaAccount.email) {
          try {
            const payoutResult = await this.createPayout({
              providerId: orderData.providerId,
              providerPayPalEmail: aaaAccount.email,
              amount: providerAmount,
              currency: captureCurrency as "EUR" | "USD",
              sessionId: orderData.callSessionId,
              note: `[AAA] Paiement consolidé - Session ${orderData.callSessionId} - Profile ${orderData.providerId}`,
            });

            payoutTriggered = payoutResult.success;
            payoutId = payoutResult.payoutBatchId;

            // Log the AAA external payout
            await this.db.collection("aaa_external_payouts").add({
              callSessionId: orderData.callSessionId,
              orderId,
              providerId: orderData.providerId,
              providerAmount,
              currency: captureCurrency,
              mode: "external",
              externalAccountId: aaaAccount.id,
              externalAccountName: aaaAccount.name,
              payoutId,
              success: payoutTriggered,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`💰 [AAA] Payout to ${aaaAccount.name} ${payoutTriggered ? "SUCCESS" : "FAILED"}: ${payoutId}`);
          } catch (payoutError) {
            console.error(`❌ [AAA] Payout to consolidated account failed:`, payoutError);
            // Fall through to error handling below
          }
        } else {
          console.warn(`⚠️ [AAA] External account ${aaaAccount.name} is not PayPal or missing email`);
        }
      }
      // Normal flow: Payout to provider's own PayPal account
      else if (orderData.providerPayPalEmail) {
        // P0 SECURITY FIX: Vérifier que l'email PayPal a été vérifié avant payout
        const providerProfile = await this.db.collection("sos_profiles").doc(orderData.providerId).get();
        const profileData = providerProfile.data();

        if (!profileData?.paypalEmailVerified) {
          console.warn(`⚠️ [PAYPAL] Provider ${orderData.providerId} email NOT VERIFIED - skipping payout`);
          console.warn(`⚠️ [PAYPAL] Email in order: ${orderData.providerPayPalEmail}, verified: ${profileData?.paypalEmailVerified}`);

          // Créer une alerte pour que l'admin sache que le payout est en attente de vérification
          await this.db.collection("admin_alerts").add({
            type: "paypal_payout_pending_verification",
            priority: "high",
            title: "Payout en attente - Email non vérifié",
            message: `Le payout de ${providerAmount} ${captureCurrency} vers ${orderData.providerPayPalEmail} ` +
              `est en attente. Le provider ${orderData.providerId} n'a pas vérifié son email PayPal.`,
            orderId,
            callSessionId: orderData.callSessionId,
            providerId: orderData.providerId,
            providerEmail: orderData.providerPayPalEmail,
            amount: providerAmount,
            currency: captureCurrency,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Marquer dans paypal_orders que le payout attend la vérification
          await this.db.collection("paypal_orders").doc(orderId).update({
            payoutPendingVerification: true,
            payoutPendingReason: "Email PayPal non vérifié",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Ne PAS déclencher le payout - l'argent reste sur SOS-Expat jusqu'à vérification
          // Le webhook MERCHANT.ONBOARDING.COMPLETED ou la vérification email relancera
        } else {
          console.log(`💰 [PAYPAL] Triggering automatic payout to ${orderData.providerPayPalEmail} (verified: ✅)`);

        try {
          const payoutResult = await this.createPayout({
            providerId: orderData.providerId,
            providerPayPalEmail: orderData.providerPayPalEmail,
            amount: providerAmount,
            currency: captureCurrency as "EUR" | "USD",
            sessionId: orderData.callSessionId,
            note: `Paiement pour consultation SOS-Expat - Session ${orderData.callSessionId}`,
          });

          payoutTriggered = payoutResult.success;
          payoutId = payoutResult.payoutBatchId;

          console.log(`💰 [PAYPAL] Payout ${payoutTriggered ? "SUCCESS" : "FAILED"}: ${payoutId}`);

          // M4 AUDIT FIX: Notify provider about PayPal payout (async, unlike Stripe instant)
          if (payoutTriggered && orderData.providerId) {
            try {
              let providerLocale = "fr";
              try {
                const provDoc = await this.db.collection("users").doc(orderData.providerId).get();
                providerLocale = provDoc.data()?.preferredLanguage || provDoc.data()?.language || "fr";
              } catch { /* fallback */ }

              await this.db.collection("message_events").add({
                eventId: "provider.payout.received",
                locale: providerLocale,
                to: { uid: orderData.providerId },
                context: { user: { uid: orderData.providerId } },
                vars: {
                  payoutAmount: providerAmount.toFixed(2),
                  currency: captureCurrency === "EUR" ? "€" : "$",
                  gateway: "PayPal",
                  sessionDate: new Date().toLocaleDateString("fr-FR"),
                  estimatedArrival: "quelques minutes",
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`✅ [PAYPAL] Provider payout notification sent to ${orderData.providerId}`);
            } catch (notifErr) {
              console.error("⚠️ [PAYPAL] Failed to send provider payout notification:", notifErr);
            }
          }
        } catch (payoutError) {
          console.error("❌ [PAYPAL] Payout failed, will retry later:", payoutError);
        // Le payout a échoué, mais le paiement est capturé
        // L'argent reste sur le compte SOS-Expat jusqu'à ce qu'on puisse payer le provider

        // ===== P0-2 FIX: Amélioration de la gestion des échecs de payout =====
        const payoutErrorMessage = payoutError instanceof Error ? payoutError.message : String(payoutError);

        // 1. Logger l'erreur dans la collection failed_payouts_alerts
        const failedPayoutAlert = {
          orderId,
          callSessionId: orderData.callSessionId,
          providerId: orderData.providerId,
          providerPayPalEmail: orderData.providerPayPalEmail,
          amount: providerAmount,
          currency: captureCurrency,
          error: payoutErrorMessage,
          errorStack: payoutError instanceof Error ? payoutError.stack : null,
          retryCount: 0,
          retryScheduled: false,
          status: "failed",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const failedPayoutRef = await this.db.collection("failed_payouts_alerts").add(failedPayoutAlert);
        console.log(`📝 [PAYPAL] Failed payout logged: ${failedPayoutRef.id}`);

        // 2. Créer une alerte admin
        await this.db.collection("admin_alerts").add({
          type: "paypal_payout_failed",
          priority: "critical",
          title: "Paiement prestataire PayPal echoue",
          message: `Le payout de ${providerAmount} ${captureCurrency} vers ${orderData.providerPayPalEmail} a echoue. ` +
            `Session: ${orderData.callSessionId}. Erreur: ${payoutErrorMessage}`,
          orderId,
          callSessionId: orderData.callSessionId,
          providerId: orderData.providerId,
          providerEmail: orderData.providerPayPalEmail,
          amount: providerAmount,
          currency: captureCurrency,
          failedPayoutAlertId: failedPayoutRef.id,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`🚨 [PAYPAL] Admin alert created for failed payout`);

        // 3. Programmer un retry automatique via Cloud Tasks (5 minutes)
        try {
          const { schedulePayoutRetryTask } = await import("./lib/payoutRetryTasks");
          const retryResult = await schedulePayoutRetryTask({
            failedPayoutAlertId: failedPayoutRef.id,
            orderId,
            callSessionId: orderData.callSessionId,
            providerId: orderData.providerId,
            providerPayPalEmail: orderData.providerPayPalEmail,
            amount: providerAmount,
            currency: captureCurrency,
            retryCount: 0,
          });

          if (retryResult.scheduled) {
            // Mettre à jour le document avec l'info du retry
            await failedPayoutRef.update({
              retryScheduled: true,
              retryTaskId: retryResult.taskId,
              retryScheduledAt: admin.firestore.FieldValue.serverTimestamp(),
              nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            });
            console.log(`⏰ [PAYPAL] Payout retry scheduled: ${retryResult.taskId}`);
          }
        } catch (retrySchedulingError) {
          console.error("❌ [PAYPAL] Failed to schedule payout retry:", retrySchedulingError);
          // P2-5 FIX: Log scheduling failure to failed_payouts_alerts for admin visibility
          const scheduleError = retrySchedulingError instanceof Error
            ? retrySchedulingError.message
            : "Unknown scheduling error";
          await failedPayoutRef.update({
            retryScheduled: false,
            retrySchedulingFailed: true,
            retrySchedulingError: scheduleError,
            requiresManualIntervention: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        } // Fin du try/catch payout
        } // Fin du else (email vérifié)
      } // Fin du else if (orderData.providerPayPalEmail)
      // C3 AUDIT FIX: Handle missing providerPayPalEmail — alert admin instead of silent skip
      else if (!aaaDecision?.skipPayout && !aaaDecision?.isAAA) {
        console.error(`❌ [PAYPAL] CRITICAL: Provider ${orderData.providerId} has NO PayPal email — cannot create payout!`);

        // 1. Create critical admin alert
        await this.db.collection("admin_alerts").add({
          type: "paypal_payout_missing_email",
          priority: "critical",
          title: "Payout impossible — Email PayPal manquant",
          message: `Le payout de ${providerAmount} ${captureCurrency} pour le provider ${orderData.providerId} ` +
            `est impossible car aucun email PayPal n'est configure. ` +
            `Session: ${orderData.callSessionId}. Action admin requise.`,
          orderId,
          callSessionId: orderData.callSessionId,
          providerId: orderData.providerId,
          amount: providerAmount,
          currency: captureCurrency,
          read: false,
          requiresManualIntervention: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Create pending payout record for tracking and retry
        await this.db.collection("pending_paypal_payouts").add({
          orderId,
          callSessionId: orderData.callSessionId,
          providerId: orderData.providerId,
          amount: providerAmount,
          currency: captureCurrency,
          reason: "missing_provider_paypal_email",
          status: "pending_email_configuration",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Mark in paypal_orders that payout is blocked
        await this.db.collection("paypal_orders").doc(orderId).update({
          payoutPendingVerification: true,
          payoutPendingReason: "Email PayPal manquant — provider n'a pas configure son email",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.warn(`⚠️ [PAYPAL] Payout deferred — admin alert created for missing email`);
      }
    } // Fin du bloc if (isSimpleFlow && providerAmount > 0)

    // Mettre à jour l'ordre avec les détails de capture
    await this.db.collection("paypal_orders").doc(orderId).update({
      status: response.status,
      captureId: capture?.id,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      capturedGrossAmount: grossAmount,
      capturedConnectionFee: connectionFeeAmount, // Renommé de platformFee
      capturedProviderAmount: providerAmount,
      capturedCurrency: captureCurrency,
      // Pour le flux direct
      providerPaidDirectly: !isSimpleFlow,
      providerPaidAt: !isSimpleFlow ? admin.firestore.FieldValue.serverTimestamp() : null,
      // Pour le flux simple
      payoutTriggered,
      payoutId: payoutId || null,
      payoutStatus: payoutTriggered ? "pending" : (isSimpleFlow ? "awaiting_payout" : "not_applicable"),
      // IMPORTANT: Marquer que la prestation est livrée = pas de remboursement possible
      serviceDelivered: true,
      refundBlocked: true, // Protection contre les remboursements
      refundBlockReason: "Service has been delivered",
    });

    if (orderData?.callSessionId) {
      // P1-13 FIX: Sync atomique paypal_orders <-> call_sessions
      await syncPaymentStatus(this.db, orderId, orderData.callSessionId, {
        status: "captured",
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        paypalCaptureId: capture?.id,
        paymentFlow: isSimpleFlow ? "simple_payout" : "direct_split",
        providerPaidDirectly: !isSimpleFlow,
        providerAmount: providerAmount,
        connectionFee: connectionFeeAmount,
        payoutTriggered: payoutTriggered,
        payoutId: payoutId || undefined,
        serviceDelivered: true,
        refundBlocked: true,
      });

      // ========================================
      // PLANIFICATION D'APPEL POUR LE FLUX LEGACY (intent=CAPTURE)
      // ========================================
      // Pour le flux AUTHORIZE, l'appel est déjà planifié dans authorizeOrder()
      // La fonction scheduleCallTaskWithIdempotence vérifie les doublons
      if (!isAuthorizeFlow) {
        // LEGACY: Ancien flux CAPTURE - réserver le provider et planifier l'appel après capture

        // P0 FIX: Réserver le provider immédiatement
        if (orderData.providerId) {
          try {
            console.log(`🔶 [PAYPAL] LEGACY CAPTURE - Setting provider ${orderData.providerId} to BUSY (pending_call)...`);
            const busyResult = await setProviderBusy(orderData.providerId, orderData.callSessionId, 'pending_call');

            if (busyResult.success) {
              console.log(`✅ [PAYPAL] LEGACY CAPTURE - Provider ${orderData.providerId} marked as BUSY`);
            } else {
              console.warn(`⚠️ [PAYPAL] LEGACY CAPTURE - Failed to set provider busy: ${busyResult.error}`);
            }
          } catch (busyError) {
            console.error(`⚠️ [PAYPAL] LEGACY CAPTURE - Error setting provider busy (non-blocking):`, busyError);
          }
        }

        try {
          const { scheduleCallTaskWithIdempotence } = await import("./lib/tasks");
          const CALL_DELAY_SECONDS = 240; // 4 minutes de délai

          console.log(`📞 [PAYPAL] LEGACY CAPTURE flow - Scheduling call for session: ${orderData.callSessionId}`);

          const schedulingResult = await scheduleCallTaskWithIdempotence(
            orderData.callSessionId,
            CALL_DELAY_SECONDS,
            this.db
          );

          if (schedulingResult.skipped) {
            console.log(`⚠️ [PAYPAL] Call scheduling skipped: ${schedulingResult.reason}`);
          } else {
            console.log(`✅ [PAYPAL] Call scheduled with taskId: ${schedulingResult.taskId}`);
          }
        } catch (schedulingError) {
          // Log l'erreur mais ne pas échouer la capture - le paiement est déjà effectué
          console.error(`❌ [PAYPAL] Error scheduling call (non-blocking):`, schedulingError);
          // Logger dans Firestore pour suivi
          await this.db.collection("scheduling_errors").add({
            callSessionId: orderData.callSessionId,
            orderId,
            paymentMethod: "paypal",
            error: schedulingError instanceof Error ? schedulingError.message : String(schedulingError),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        console.log(`📞 [PAYPAL] AUTHORIZE flow - Call already scheduled during authorization, skipping`);
      }
    }

    // Mettre à jour les earnings du provider
    if (orderData?.providerId) {
      const updateData: any = {
        lastPayPalPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPayPalPaymentAmount: providerAmount,
      };

      if (isSimpleFlow) {
        // Flux simple: le provider a un paiement en attente
        if (payoutTriggered) {
          updateData.pendingPayPalEarnings = admin.firestore.FieldValue.increment(providerAmount);
        } else {
          // Payout échoué: marquer comme en attente de payout
          updateData.awaitingPayout = admin.firestore.FieldValue.increment(providerAmount);
        }
      } else {
        // Flux direct: le provider a déjà reçu l'argent
        updateData.totalPayPalEarnings = admin.firestore.FieldValue.increment(providerAmount);
      }

      await this.db.collection("sos_profiles").doc(orderData.providerId).update(updateData);

      console.log(`✅ [PAYPAL] Provider ${orderData.providerId} - Amount: ${providerAmount} ${captureCurrency} (${isSimpleFlow ? "via payout" : "direct"})`);
    }

    console.log("✅ [PAYPAL] Order captured successfully:", orderId);

    return {
      success: response.status === "COMPLETED",
      captureId: capture?.id || "",
      status: response.status,
      providerAmount,
      connectionFee: connectionFeeAmount,
      grossAmount,
      payoutTriggered,
      payoutId,
    };
  }

  /**
   * Rembourse un paiement PayPal
   *
   * RÈGLE MÉTIER CRITIQUE:
   * ======================
   * Le remboursement est BLOQUÉ si la prestation a eu lieu.
   * Même si le prestataire n'a pas fait son KYC, le client ne peut pas
   * être remboursé une fois le service délivré.
   *
   * @param captureId - ID de la capture PayPal
   * @param amount - Montant à rembourser (optionnel, remboursement total si non spécifié)
   * @param currency - Devise
   * @param reason - Raison du remboursement
   * @param forceRefund - Admin only: force le remboursement même si bloqué
   */
  async refundPayment(
    captureId: string,
    amount?: number,
    currency?: string,
    reason?: string,
    forceRefund: boolean = false
  ): Promise<{
    success: boolean;
    refundId: string;
    status: string;
    blocked?: boolean;
    blockReason?: string;
  }> {
    console.log("💸 [PAYPAL] Refund request for capture:", captureId);

    // ===== VÉRIFICATION CRITIQUE: Service délivré = pas de remboursement =====
    // Chercher l'ordre associé à cette capture
    const ordersQuery = await this.db.collection("paypal_orders")
      .where("captureId", "==", captureId)
      .limit(1)
      .get();

    if (ordersQuery.empty) {
      console.error(`❌ [PAYPAL] Order not found for capture: ${captureId}`);
      return {
        success: false,
        refundId: "",
        status: "NOT_FOUND",
        blocked: true,
        blockReason: "Ordre PayPal introuvable",
      };
    }

    // P0 FIX 2026-02-12: Atomic check to prevent double refund race condition
    const orderRef = ordersQuery.docs[0].ref;
    let orderData: FirebaseFirestore.DocumentData;

    try {
      await this.db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        orderData = orderDoc.data()!;

        // CRITICAL: Prevent double refund - check if already refunded
        if (orderData.status === "REFUNDED" || orderData.refunded === true) {
          throw new Error(`Order ${orderRef.id} is already refunded (refundId: ${orderData.refundId || 'unknown'})`);
        }

        // Vérifier si le remboursement est bloqué (INSIDE transaction to prevent race)
        if (orderData.refundBlocked && !forceRefund) {
          throw new Error(`Refund blocked: ${orderData.refundBlockReason || "Service has been delivered"}`);
        }

        // Mark as refunding to prevent concurrent refunds
        transaction.update(orderRef, {
          status: "REFUNDING",
          refundingAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`🚫 [PAYPAL] Cannot refund: ${errorMessage}`);

      // Log blocked refund attempt if it was blocked
      if (errorMessage.includes("Refund blocked")) {
        await this.db.collection("refund_attempts_blocked").add({
          captureId,
          orderId: orderRef.id,
          reason,
          blockReason: errorMessage,
          attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        success: false,
        refundId: "",
        status: errorMessage.includes("already refunded") ? "ALREADY_REFUNDED" : "BLOCKED",
        blocked: true,
        blockReason: errorMessage,
      };
    }

    // Récupérer orderData après la transaction réussie
    const orderDoc = await orderRef.get();
    orderData = orderDoc.data()!;

    // Vérifier si le service a été délivré via la session d'appel
    if (orderData.callSessionId && !forceRefund) {
      const sessionDoc = await this.db.collection("call_sessions").doc(orderData.callSessionId).get();
      const sessionData = sessionDoc.data();

      if (sessionData?.status === "completed" || sessionData?.payment?.serviceDelivered) {
        // Revert status
        await orderRef.update({
          status: orderData.status || "CAPTURED",
          refundingAt: null,
        });

        console.warn(`🚫 [PAYPAL] Refund BLOCKED: Call session ${orderData.callSessionId} is completed`);

        await this.db.collection("refund_attempts_blocked").add({
          captureId,
          orderId: orderRef.id,
          callSessionId: orderData.callSessionId,
          reason: "Call session completed",
          attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: false,
          refundId: "",
          status: "BLOCKED",
          blocked: true,
          blockReason: "Le remboursement est impossible car la consultation a eu lieu.",
        };
      }
    }

    // Si on arrive ici, le remboursement est autorisé
    console.log("💸 [PAYPAL] Refund authorized, processing...");

    // P1-4 SECURITY FIX: Valider que le montant de remboursement <= montant capturé
    // Empêche les remboursements supérieurs au paiement original
    if (amount !== undefined) {
      const capturedAmount = orderData!.capturedGrossAmount || orderData!.amount || 0;

      if (amount > capturedAmount) {
        // Revert status
        await orderRef.update({
          status: orderData!.status || "CAPTURED",
          refundingAt: null,
        });

        console.error(`🚫 [PAYPAL] Refund amount ${amount} exceeds captured amount ${capturedAmount}`);
        return {
          success: false,
          refundId: "",
          status: "REJECTED",
          blocked: true,
          blockReason: `Le montant de remboursement (${amount}) dépasse le montant capturé (${capturedAmount})`,
        };
      }
    }

    const refundData: any = {};

    if (amount && currency) {
      refundData.amount = {
        value: amount.toFixed(2),
        currency_code: currency,
      };
    }

    if (reason) {
      refundData.note_to_payer = reason;
    }

    // P0 FIX 2026-02-12: Wrap refund with try-catch to revert status on failure
    let response: any;
    try {
      response = await this.apiRequest<any>(
        "POST",
        `/v2/payments/captures/${captureId}/refund`,
        Object.keys(refundData).length > 0 ? refundData : {}
      );

      console.log("✅ [PAYPAL] Refund processed:", response.id);

      // Update order status to REFUNDED on success
      await orderRef.update({
        status: "REFUNDED",
        refunded: true,
        refundId: response.id,
        refundStatus: response.status,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ===== P0 FIX 2026-02-12: Cancel ALL affiliate commissions on refund (5 systems) =====
      // Prevent all affiliates from keeping commissions when payment is refunded
      const callSessionId = orderData!.callSessionId;
      if (callSessionId) {
        try {
          const cancelReason = `PayPal payment refunded${reason ? `: ${reason}` : ""}`;
          // Using Promise.allSettled to ensure ALL cancellations run independently
          // (Promise.all would abort remaining on first failure = money leak)
          const results = await Promise.allSettled([
            cancelChatterCommissions(callSessionId, cancelReason, "system_refund"),
            cancelInfluencerCommissions(callSessionId, cancelReason, "system_refund"),
            cancelBloggerCommissions(callSessionId, cancelReason, "system_refund"),
            cancelGroupAdminCommissions(callSessionId, cancelReason),
            cancelAffiliateCommissions(callSessionId, cancelReason, "system_refund"),
          ]);

          const labels = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'affiliate'] as const;
          let totalCancelled = 0;
          const summary: Record<string, number | string> = { callSessionId };

          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            if (r.status === 'fulfilled') {
              totalCancelled += r.value.cancelledCount;
              summary[labels[i]] = r.value.cancelledCount;
            } else {
              summary[labels[i]] = `ERROR: ${r.reason?.message || r.reason}`;
              console.error(`[PAYPAL refundPayment] Failed to cancel ${labels[i]} commissions:`, r.reason);
            }
          }

          summary.total = totalCancelled;
          console.log("✅ [PAYPAL] Commission cancellation results:", summary);
        } catch (commissionError) {
          // Log but don't fail the refund - commission cancellation is best-effort
          console.error("❌ [PAYPAL] Failed to cancel commissions:", commissionError);
        }

        // M1 AUDIT FIX: Generate credit note (facture d'avoir) for EU compliance
        try {
          const invoicesQuery = await this.db.collection("invoice_records")
            .where("callId", "==", callSessionId)
            .get();

          if (!invoicesQuery.empty) {
            // Step 1: Update invoice status to 'refunded' FIRST
            const batch = this.db.batch();
            invoicesQuery.docs.forEach((doc) => {
              batch.update(doc.ref, {
                status: "refunded",
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                refundReason: reason,
                refundId: response.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            await batch.commit();

            // Step 2: Generate credit note AFTER invoice update
            const refundAmount = amount || orderData!.capturedGrossAmount || orderData!.amount || 0;
            if (refundAmount > 0) {
              const { generateCreditNote } = await import("./utils/generateInvoice");
              const originalInvoice = invoicesQuery.docs[0].data();
              await generateCreditNote({
                originalInvoiceNumber: originalInvoice.invoiceNumber || invoicesQuery.docs[0].id,
                refundId: response.id,
                amount: refundAmount,
                currency: currency || orderData!.currency || "EUR",
                reason: reason || "PayPal refund",
                callId: callSessionId,
                clientId: orderData!.clientId || "unknown",
                providerId: orderData!.providerId || "unknown",
                clientName: originalInvoice.clientName,
                clientEmail: originalInvoice.clientEmail,
                providerName: originalInvoice.providerName,
                locale: originalInvoice.locale || "en",
                gateway: "paypal",
              });
              console.log(`✅ [PAYPAL] Credit note generated for session ${callSessionId}`);
            }
          }
        } catch (creditNoteError) {
          console.error("⚠️ [PAYPAL] Error generating credit note:", creditNoteError);
        }

        // M2 AUDIT FIX: Send refund notification to client (was missing for PayPal)
        try {
          const refundAmountFormatted = (amount || orderData!.capturedGrossAmount || orderData!.amount || 0).toFixed(2);
          const currencySymbol = (currency || orderData!.currency || "EUR").toUpperCase() === "EUR" ? "€" : "$";

          // Detect user locale
          const userDoc = await this.db.collection("users").doc(orderData!.clientId).get();
          const userLocale = userDoc.data()?.preferredLanguage || userDoc.data()?.language || "fr";

          await this.db.collection("inapp_notifications").add({
            uid: orderData!.clientId,
            type: "refund_completed",
            title: "Remboursement effectue",
            body: `Votre remboursement de ${refundAmountFormatted}${currencySymbol} a ete initie. Il sera credite sur votre compte PayPal dans 3-5 jours ouvres.`,
            data: { refundId: response.id, amount: refundAmountFormatted, currency: currencySymbol, reason },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await this.db.collection("message_events").add({
            eventId: "payment_refunded",
            locale: userLocale,
            to: { uid: orderData!.clientId },
            context: { user: { uid: orderData!.clientId } },
            vars: {
              refundAmount: refundAmountFormatted,
              currency: currencySymbol,
              refundReason: reason || "Remboursement",
              estimatedArrival: "3-5 jours ouvres",
              gateway: "PayPal",
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log("✅ [PAYPAL] Client refund notification sent");
        } catch (notifError) {
          console.error("⚠️ [PAYPAL] Failed to send refund notification:", notifError);
        }
      }

      return {
        success: response.status === "COMPLETED",
        refundId: response.id,
        status: response.status,
      };
    } catch (error) {
      // Revert status on failure
      await orderRef.update({
        status: orderData!.status || "CAPTURED",
        refundingAt: null,
        refundError: error instanceof Error ? error.message : String(error),
        refundFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.error(`❌ [PAYPAL] Refund failed:`, error);
      throw error;
    }
  }

  /**
   * P0 FIX: Annule (void) un ordre PayPal autorisé mais non capturé
   *
   * IMPORTANT: Cette méthode libère immédiatement les fonds bloqués sur le compte
   * du client au lieu d'attendre l'expiration automatique (3 jours).
   *
   * Cas d'usage:
   * - Appel échoué avant capture
   * - Client annule avant le début de l'appel
   * - Erreur système avant capture
   *
   * @param orderId - ID de l'ordre PayPal à annuler
   * @param reason - Raison de l'annulation (pour les logs)
   * @returns Résultat de l'annulation
   */
  async voidAuthorization(
    orderId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    status: string;
    message?: string;
  }> {
    console.log(`🚫 [PAYPAL] Voiding authorization for order: ${orderId}, reason: ${reason || 'not specified'}`);

    try {
      // Récupérer les données de l'ordre
      const orderDoc = await this.db.collection("paypal_orders").doc(orderId).get();
      const orderData = orderDoc.data();

      if (!orderData) {
        console.warn(`⚠️ [PAYPAL] Order ${orderId} not found in database`);
        return {
          success: false,
          status: "NOT_FOUND",
          message: `Ordre ${orderId} introuvable`,
        };
      }

      // Vérifier que l'ordre n'est pas déjà capturé ou annulé
      const currentStatus = orderData.status?.toUpperCase();
      if (currentStatus === "COMPLETED" || currentStatus === "CAPTURED") {
        console.warn(`⚠️ [PAYPAL] Order ${orderId} already captured - cannot void`);
        return {
          success: false,
          status: "ALREADY_CAPTURED",
          message: "L'ordre a déjà été capturé et ne peut pas être annulé",
        };
      }

      if (currentStatus === "VOIDED" || currentStatus === "CANCELLED") {
        console.log(`✅ [PAYPAL] Order ${orderId} already voided/cancelled`);
        return {
          success: true,
          status: "ALREADY_VOIDED",
          message: "L'ordre était déjà annulé",
        };
      }

      // Appeler l'API PayPal pour récupérer le statut actuel
      // et vérifier s'il y a des autorisations à annuler
      // P0 FIX: Ne pas passer de body pour les requêtes GET (cause "Request with GET/HEAD method cannot have body")
      const orderDetails = await this.apiRequest<any>(
        "GET",
        `/v2/checkout/orders/${orderId}`
      );

      const paypalStatus = orderDetails.status;
      console.log(`📋 [PAYPAL] Current order status: ${paypalStatus}`);

      // P0 FIX 2026-02-02: Corriger la logique de void PayPal
      // Le statut "COMPLETED" pour l'ordre PayPal signifie que l'autorisation a été CRÉÉE,
      // pas que les fonds ont été capturés ! Il faut distinguer:
      // - Order status: COMPLETED = autorisation créée avec succès
      // - Authorization status: CREATED = fonds autorisés mais pas capturés
      // - Authorization status: CAPTURED = fonds capturés (là on ne peut pas void)
      //
      // Donc on peut void quand: APPROVED, CREATED, ou COMPLETED (avec auth non capturée)
      if (paypalStatus === "APPROVED" || paypalStatus === "CREATED" || paypalStatus === "COMPLETED") {
        // Vérifier s'il y a une autorisation à annuler
        // D'abord essayer depuis Firestore (stocké lors de authorizeOrder)
        // puis fallback sur l'API PayPal
        let authorizationId = orderData.authorizationId;
        let authorizationStatus = orderData.authorizationStatus;

        if (!authorizationId) {
          // Fallback: récupérer depuis l'API PayPal
          const purchaseUnit = orderDetails.purchase_units?.[0];
          const apiAuth = purchaseUnit?.payments?.authorizations?.[0];
          authorizationId = apiAuth?.id;
          authorizationStatus = apiAuth?.status;
        }

        console.log(`📋 [PAYPAL] Authorization lookup: id=${authorizationId}, status=${authorizationStatus}`);

        if (authorizationId) {
          // Vérifier que l'autorisation n'est pas déjà capturée
          if (authorizationStatus === "CAPTURED") {
            console.warn(`⚠️ [PAYPAL] Authorization ${authorizationId} already captured - cannot void`);
            return {
              success: false,
              status: "ALREADY_CAPTURED",
              message: "L'autorisation a déjà été capturée",
            };
          }

          if (authorizationStatus === "VOIDED") {
            console.log(`✅ [PAYPAL] Authorization ${authorizationId} already voided`);
            return {
              success: true,
              status: "ALREADY_VOIDED",
              message: "L'autorisation était déjà annulée",
            };
          }
          // Annuler l'autorisation explicitement
          console.log(`🚫 [PAYPAL] Voiding authorization: ${authorizationId}`);
          await this.apiRequest<any>(
            "POST",
            `/v2/payments/authorizations/${authorizationId}/void`,
            {}
          );

          // Mettre à jour le statut dans Firestore
          await this.db.collection("paypal_orders").doc(orderId).update({
            status: "VOIDED",
            voidedAt: admin.firestore.FieldValue.serverTimestamp(),
            voidReason: reason || "Call failed or cancelled",
            authorizationVoided: authorizationId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Mettre à jour la call_session si elle existe
          if (orderData.callSessionId) {
            await syncPaymentStatus(this.db, orderId, orderData.callSessionId, {
              status: "voided",
              voidedAt: admin.firestore.FieldValue.serverTimestamp(),
              refundReason: reason || "PayPal authorization voided",
            });
          }

          console.log(`✅ [PAYPAL] Authorization ${authorizationId} voided successfully`);
          return {
            success: true,
            status: "VOIDED",
            message: `Autorisation ${authorizationId} annulée avec succès`,
          };
        } else {
          // Pas d'autorisation explicite - marquer comme cancelled dans notre DB
          // L'ordre expirera automatiquement côté PayPal
          console.log(`⚠️ [PAYPAL] No explicit authorization found - marking as cancelled locally`);

          await this.db.collection("paypal_orders").doc(orderId).update({
            status: "CANCELLED",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: reason || "Call failed or cancelled",
            note: "No explicit authorization to void - order will expire automatically",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (orderData.callSessionId) {
            await syncPaymentStatus(this.db, orderId, orderData.callSessionId, {
              status: "cancelled",
              voidedAt: admin.firestore.FieldValue.serverTimestamp(),
              refundReason: reason || "Order cancelled - will expire automatically",
            });
          }

          return {
            success: true,
            status: "CANCELLED",
            message: "Ordre marqué comme annulé - expirera automatiquement",
          };
        }
      } else {
        // Statut inconnu ou déjà terminé (ex: VOIDED, EXPIRED)
        console.log(`⚠️ [PAYPAL] Order ${orderId} in unexpected/final state: ${paypalStatus}`);

        // Si déjà voided ou expiré, considérer comme succès
        if (paypalStatus === "VOIDED" || paypalStatus === "EXPIRED") {
          return {
            success: true,
            status: paypalStatus,
            message: `Ordre déjà dans un état final: ${paypalStatus}`,
          };
        }

        return {
          success: false,
          status: paypalStatus,
          message: `Ordre dans un état inattendu: ${paypalStatus}`,
        };
      }
    } catch (error) {
      console.error(`❌ [PAYPAL] Error voiding order ${orderId}:`, error);

      // En cas d'erreur, marquer l'ordre comme "void_failed" dans notre DB
      try {
        await this.db.collection("paypal_orders").doc(orderId).update({
          voidFailed: true,
          voidError: error instanceof Error ? error.message : String(error),
          voidAttemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        console.error(`❌ [PAYPAL] Failed to update order status:`, updateError);
      }

      return {
        success: false,
        status: "ERROR",
        message: error instanceof Error ? error.message : "Erreur lors de l'annulation",
      };
    }
  }

  // ====== PAYOUTS API - PAIEMENT PRESTATAIRES ======

  /**
   * Effectue un paiement (payout) vers un prestataire via PayPal
   * Utilisé pour les pays non supportés par Stripe Connect
   *
   * @param providerId - ID du prestataire
   * @param providerPayPalEmail - Email PayPal du prestataire
   * @param amount - Montant en unité principale (EUR/USD)
   * @param currency - Devise (EUR ou USD)
   * @param sessionId - ID de la session d'appel
   * @param note - Note optionnelle pour le prestataire
   */
  async createPayout(data: {
    providerId: string;
    providerPayPalEmail: string;
    amount: number;
    currency: "EUR" | "USD";
    sessionId: string;
    note?: string;
  }): Promise<{
    success: boolean;
    payoutBatchId: string;
    payoutItemId: string;
    status: string;
    error?: string;
  }> {
    console.log("💸 [PAYPAL] Creating payout for provider:", data.providerId);

    try {
      // P2-15 FIX: Check for existing payout to prevent duplicates
      const existingPayout = await this.db.collection("paypal_payouts")
        .where("sessionId", "==", data.sessionId)
        .where("providerId", "==", data.providerId)
        .limit(1)
        .get();

      if (!existingPayout.empty) {
        const existing = existingPayout.docs[0].data();
        console.log(`⚠️ [PAYPAL] Payout already exists for session ${data.sessionId}: ${existing.payoutBatchId}`);
        return {
          success: true, // Already paid = success
          payoutBatchId: existing.payoutBatchId,
          payoutItemId: existing.payoutItemId || "",
          status: existing.status || "ALREADY_PAID",
        };
      }

      // Créer un batch de payout (PayPal exige un batch même pour un seul paiement)
      const payoutData = {
        sender_batch_header: {
          sender_batch_id: `payout_${data.sessionId}`, // P2-11 FIX: Removed Date.now() - sessionId is already unique
          email_subject: "Vous avez reçu un paiement de SOS Expat",
          email_message: data.note || "Paiement pour consultation effectuée via SOS Expat",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: data.amount.toFixed(2),
              currency: data.currency,
            },
            note: data.note || `Paiement pour consultation - Session ${data.sessionId}`,
            sender_item_id: `item_${data.providerId}_${data.sessionId}`,
            receiver: data.providerPayPalEmail,
          },
        ],
      };

      const response = await this.apiRequest<{
        batch_header: {
          payout_batch_id: string;
          batch_status: string;
        };
        items?: Array<{
          payout_item_id: string;
          transaction_status: string;
        }>;
      }>("POST", "/v1/payments/payouts", payoutData);

      const payoutBatchId = response.batch_header?.payout_batch_id;
      const payoutItemId = response.items?.[0]?.payout_item_id || "";
      const status = response.batch_header?.batch_status;

      // Enregistrer le payout dans Firestore
      await this.db.collection("paypal_payouts").doc(payoutBatchId).set({
        payoutBatchId,
        payoutItemId,
        providerId: data.providerId,
        providerPayPalEmail: data.providerPayPalEmail,
        amount: data.amount,
        currency: data.currency,
        sessionId: data.sessionId,
        status,
        note: data.note || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mettre à jour le profil du prestataire avec le dernier payout
      await this.db.collection("sos_profiles").doc(data.providerId).update({
        lastPayoutAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPayoutAmount: data.amount,
        lastPayoutCurrency: data.currency,
        lastPayoutId: payoutBatchId,
      });

      console.log("✅ [PAYPAL] Payout created:", payoutBatchId, "Status:", status);

      return {
        success: status === "PENDING" || status === "SUCCESS",
        payoutBatchId,
        payoutItemId,
        status,
      };
    } catch (error) {
      console.error("❌ [PAYPAL] Payout creation failed:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Logger l'échec
      await this.db.collection("paypal_payouts_failed").add({
        providerId: data.providerId,
        providerPayPalEmail: data.providerPayPalEmail,
        amount: data.amount,
        currency: data.currency,
        sessionId: data.sessionId,
        error: errorMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: false,
        payoutBatchId: "",
        payoutItemId: "",
        status: "FAILED",
        error: errorMessage,
      };
    }
  }

  /**
   * Vérifie le statut d'un payout
   */
  async getPayoutStatus(payoutBatchId: string): Promise<{
    status: string;
    items: Array<{
      payoutItemId: string;
      transactionStatus: string;
      payoutItemFee?: string;
    }>;
  }> {
    console.log("🔍 [PAYPAL] Checking payout status:", payoutBatchId);

    const response = await this.apiRequest<{
      batch_header: {
        batch_status: string;
      };
      items?: Array<{
        payout_item_id: string;
        transaction_status: string;
        payout_item_fee?: { value: string };
      }>;
    }>("GET", `/v1/payments/payouts/${payoutBatchId}`);

    // Mettre à jour le statut dans Firestore
    await this.db.collection("paypal_payouts").doc(payoutBatchId).update({
      status: response.batch_header?.batch_status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      status: response.batch_header?.batch_status || "UNKNOWN",
      items:
        response.items?.map((item) => ({
          payoutItemId: item.payout_item_id,
          transactionStatus: item.transaction_status,
          payoutItemFee: item.payout_item_fee?.value,
        })) || [],
    };
  }

  // ====== UTILITAIRES ======

  /**
   * Vérifie si un pays est supporté uniquement par PayPal
   */
  static isPayPalOnlyCountry(countryCode: string): boolean {
    return PAYPAL_CONFIG.PAYPAL_ONLY_COUNTRIES.includes(countryCode.toUpperCase());
  }

  /**
   * Détermine le meilleur gateway pour un pays
   */
  static getRecommendedGateway(countryCode: string): "stripe" | "paypal" {
    if (this.isPayPalOnlyCountry(countryCode)) {
      return "paypal";
    }
    return "stripe"; // Stripe par défaut si disponible
  }
}

// ====== CLOUD FUNCTIONS ======

/**
 * Crée un lien d'onboarding PayPal pour un provider
 */
export const createPayPalOnboardingLink = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const { country } = request.data || {};

    // Récupérer les infos du provider
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(providerId).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new HttpsError("not-found", "User not found");
    }

    const manager = new PayPalManager();

    try {
      const result = await manager.createMerchantOnboardingLink({
        providerId,
        email: userData.email,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        country: country || userData.country || "FR",
        businessName: userData.businessName,
      });

      return { success: true, ...result };
    } catch (error) {
      console.error("Error creating PayPal onboarding:", error);
      throw new HttpsError("internal", "Failed to create onboarding link");
    }
  }
);

/**
 * Vérifie le statut d'onboarding PayPal
 */
export const checkPayPalMerchantStatus = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const manager = new PayPalManager();

    try {
      const status = await manager.checkMerchantStatus(providerId);
      return { success: true, ...status };
    } catch (error) {
      console.error("Error checking PayPal status:", error);
      throw new HttpsError("internal", "Failed to check merchant status");
    }
  }
);

// ============================================================================
// FONCTIONS HTTP (onRequest) AVEC CORS MANUEL
// Ces fonctions remplacent les versions onCall qui ont des problèmes CORS
// ============================================================================

/**
 * Helper pour vérifier le token Firebase Auth dans les requêtes HTTP
 * @returns L'UID de l'utilisateur ou null si non authentifié
 */
async function verifyAuthToken(req: { headers: { authorization?: string } }): Promise<{ uid: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.substring(7);
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return { uid: decodedToken.uid };
  } catch (error) {
    console.error("[PayPal] Token verification failed:", error);
    return null;
  }
}

/**
 * VERSION HTTP de createPayPalOrder - avec CORS manuel
 * Utilisée à la place de la version onCall qui a des problèmes CORS
 */
export const createPayPalOrderHttp = onRequest(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    // P0 FIX: Keep instance warm to avoid CORS errors on cold start
    minInstances: 1,
    // P0 FIX: Increased maxInstances and memory to prevent rate limiting
    maxInstances: 15,
    memory: "256MiB",  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
    // P0 FIX: Added ENCRYPTION_KEY for phone number encryption (Twilio compatibility)
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID, PAYPAL_PLATFORM_MERCHANT_ID, ENCRYPTION_KEY],
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    // CORS preflight: OPTIONS requests are handled automatically by cors: ALLOWED_ORIGINS
    // but we need to allow them through before checking for POST
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Seulement POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const requestId = `pp_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Vérifier l'authentification
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ error: "User must be authenticated" });
      return;
    }

    const {
      callSessionId,
      amount,
      currency,
      providerId,
      serviceType,
      description,
      // P1 FIX: Title for SMS notifications to provider
      title,
      // P1 FIX: Client country for SMS notifications to provider
      clientCurrentCountry,
      // P0 FIX: Phone numbers required for Twilio call
      clientPhone,
      providerPhone,
      // P0 FIX: Languages for Twilio voice prompts
      clientLanguages,
      providerLanguages,
      metadata: trackingMetadata,
    } = req.body;

    // DEBUG: Log tous les paramètres reçus
    console.log(`[PAYPAL DEBUG] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`[PAYPAL DEBUG] Auth UID: ${auth.uid}`);

    prodLogger.info('PAYPAL_ORDER_HTTP_START', `[${requestId}] Creating PayPal order (HTTP)`, {
      requestId,
      callSessionId,
      amount,
      currency,
      providerId,
      serviceType,
      clientId: auth.uid,
    });

    if (!callSessionId || !amount || !providerId) {
      console.error(`[PAYPAL DEBUG] Missing required fields: callSessionId=${callSessionId}, amount=${amount}, providerId=${providerId}`);
      res.status(400).json({ error: `Missing required fields: callSessionId=${!!callSessionId}, amount=${!!amount}, providerId=${!!providerId}` });
      return;
    }

    // ========== RATE LIMITING (Firestore-based, same as Stripe: 6 req/10min) ==========
    const db = admin.firestore();
    try {
      const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
      const RATE_LIMIT_MAX_REQUESTS = 6;
      const rateLimitRef = db.collection("payment_rate_limits").doc(auth.uid);
      const rlResult = await db.runTransaction(async (tx) => {
        const doc = await tx.get(rateLimitRef);
        const now = Date.now();
        const data = doc.data();
        if (data && data.windowStart && (now - data.windowStart) < RATE_LIMIT_WINDOW_MS) {
          if (data.count >= RATE_LIMIT_MAX_REQUESTS) {
            return { allowed: false, resetTime: data.windowStart + RATE_LIMIT_WINDOW_MS };
          }
          tx.update(rateLimitRef, { count: admin.firestore.FieldValue.increment(1) });
          return { allowed: true };
        }
        tx.set(rateLimitRef, { windowStart: now, count: 1 });
        return { allowed: true };
      });

      if (!rlResult.allowed) {
        const waitMin = Math.ceil(((rlResult.resetTime ?? Date.now()) - Date.now()) / 60000);
        console.warn(`[PAYPAL] Rate limit exceeded for ${auth.uid}`);
        res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${waitMin} min.` });
        return;
      }
    } catch (rlError) {
      // On failure, allow the request (better than blocking)
      console.warn("[PAYPAL] Rate limit check failed, allowing request:", rlError);
    }

    // ========== DUPLICATE DETECTION (payment_locks, 3-min window) ==========
    const lockKey = `paypal_${auth.uid}_${providerId}_${amount}_${callSessionId}`;
    const lockRef = db.collection("payment_locks").doc(lockKey);
    try {
      const LOCK_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
      const lockResult = await db.runTransaction(async (tx) => {
        const lockDoc = await tx.get(lockRef);
        const now = Date.now();
        if (lockDoc.exists) {
          const lockData = lockDoc.data();
          if (lockData && (now - lockData.createdAt) < LOCK_WINDOW_MS) {
            return { isDuplicate: true, existingOrderId: lockData.orderId };
          }
        }
        tx.set(lockRef, { createdAt: now, userId: auth.uid, providerId, amount, callSessionId });
        return { isDuplicate: false };
      });

      if (lockResult.isDuplicate) {
        console.warn(`[PAYPAL] Duplicate payment detected for ${auth.uid}, session ${callSessionId}`);
        res.status(409).json({ error: "Un paiement similaire est déjà en cours de traitement." });
        return;
      }
    } catch (lockError) {
      // On failure, block for safety (duplicate payments are worse than a retry)
      console.error("[PAYPAL] Duplicate check failed, blocking:", lockError);
      res.status(500).json({ error: "Vérification de doublon impossible. Réessayez dans quelques secondes." });
      return;
    }

    try {
      // ========== STEP 1: Import pricing service ==========
      console.log(`🔷 [PAYPAL_DEBUG] STEP 1: Importing pricing service...`);
      const { getServiceAmounts } = await import("./services/pricingService");
      console.log(`✅ [PAYPAL_DEBUG] STEP 1: OK - Pricing service imported`);

      // ========== STEP 2: Fetch provider data ==========
      console.log(`🔷 [PAYPAL_DEBUG] STEP 2: Fetching provider ${providerId}...`);

      // Try sos_profiles first (where all provider profiles are), then users as fallback
      let providerDoc = await db.collection("sos_profiles").doc(providerId).get();
      let providerData = providerDoc.data();

      if (!providerData) {
        console.log(`⚠️ [PAYPAL_DEBUG] STEP 2: Not in sos_profiles, trying users...`);
        providerDoc = await db.collection("users").doc(providerId).get();
        providerData = providerDoc.data();
      }

      console.log(`✅ [PAYPAL_DEBUG] STEP 2: OK - Provider exists=${providerDoc.exists}, hasData=${!!providerData}`);

      if (!providerData) {
        console.error(`❌ [PAYPAL_DEBUG] STEP 2 FAILED: Provider ${providerId} not found in sos_profiles or users`);
        res.status(404).json({ error: "Provider not found" });
        return;
      }

      // ========== STEP 3: Check PayPal config ==========
      // SIMPLIFICATION: On utilise UNIQUEMENT le flux Simple (payout vers email)
      // Le flux Direct (merchantId) n'est jamais utilisé en production
      const hasPayPalEmail = !!providerData.paypalEmail;
      console.log(`🔷 [PAYPAL_DEBUG] STEP 3: Provider PayPal email: ${hasPayPalEmail ? providerData.paypalEmail : 'NONE'}`);

      if (!hasPayPalEmail) {
        console.log(`⚠️ [PAYPAL_DEBUG] Provider ${providerId} has no PayPal email - payment will go to platform (payout later when email configured)`);
      }

      // ========== STEP 4: Get server pricing ==========
      const normalizedCurrency = (currency || "EUR").toLowerCase() as "eur" | "usd";
      const normalizedServiceType = (serviceType || providerData.type || "expat") as "lawyer" | "expat";
      console.log(`🔷 [PAYPAL_DEBUG] STEP 4: Getting pricing for ${normalizedServiceType}/${normalizedCurrency}...`);

      const serverPricing = await getServiceAmounts(normalizedServiceType, normalizedCurrency);
      console.log(`✅ [PAYPAL_DEBUG] STEP 4: OK - Server pricing: total=${serverPricing.totalAmount}, provider=${serverPricing.providerAmount}, fee=${serverPricing.connectionFeeAmount}`);

      // ========== STEP 5: Validate amount ==========
      const clientAmount = typeof amount === "number" ? amount : parseFloat(amount);
      console.log(`🔷 [PAYPAL_DEBUG] STEP 5: Validating amount - client=${clientAmount}, server=${serverPricing.totalAmount}`);

      if (Math.abs(clientAmount - serverPricing.totalAmount) > 0.05) {
        console.error(`❌ [PAYPAL_DEBUG] STEP 5 FAILED: Amount mismatch! client=${clientAmount}, server=${serverPricing.totalAmount}`);
        res.status(400).json({
          error: `Invalid amount. Expected ${serverPricing.totalAmount} ${normalizedCurrency.toUpperCase()}`,
          code: "INVALID_AMOUNT"
        });
        return;
      }
      console.log(`✅ [PAYPAL_DEBUG] STEP 5: OK - Amount validated`);

      // Utiliser les valeurs calculées par le serveur
      const serverProviderAmount = serverPricing.providerAmount;
      const serverConnectionFee = serverPricing.connectionFeeAmount;

      // ========== STEP 6: Create PayPal order ==========
      // SIMPLIFICATION: Toujours utiliser le flux Simple (payout vers email)
      console.log(`🔷 [PAYPAL_DEBUG] STEP 6: Creating PayPal order - flow=SIMPLE`);
      console.log(`🔷 [PAYPAL_DEBUG] STEP 6: Order params - total=${serverPricing.totalAmount}, provider=${serverProviderAmount}, fee=${serverConnectionFee}`);

      const manager = new PayPalManager();
      console.log(`🔷 [PAYPAL_DEBUG] STEP 6: Using SIMPLE flow with email: ${providerData.paypalEmail || 'UNDEFINED'}`);

      const result = await manager.createSimpleOrder({
        callSessionId,
        amount: serverPricing.totalAmount,
        providerAmount: serverProviderAmount,
        platformFee: serverConnectionFee,
        currency: normalizedCurrency.toUpperCase(),
        providerId,
        providerPayPalEmail: providerData.paypalEmail,
        clientId: auth.uid,
        description: description || "SOS Expat - Consultation",
        // P1 FIX: Title for SMS notifications to provider (read by paymentNotifications.ts)
        title: title || description || "Consultation",
        // P1 FIX: Client country for SMS notifications to provider
        clientCurrentCountry: clientCurrentCountry || "",
        // P2 FIX: Provider country = intervention country for SMS notifications
        providerCountry: providerData.country || "",
        // P0 FIX: Phone numbers required for Twilio call
        clientPhone: clientPhone || "",
        providerPhone: providerPhone || providerData.phone || providerData.encryptedPhone || "",
        // P0 FIX: Languages for Twilio voice prompts (defaults to French if not provided)
        clientLanguages: clientLanguages || ["fr"],
        providerLanguages: providerLanguages || providerData.languagesSpoken || providerData.languages || ["fr"],
        // P0 FIX CRITICAL: serviceType required for pricing calculation during capture
        serviceType: normalizedServiceType,
        trackingMetadata: trackingMetadata as Record<string, string> | undefined,
      });
      console.log(`✅ [PAYPAL_DEBUG] STEP 6: OK - SIMPLE order created, orderId=${result?.orderId}`);

      prodLogger.info('PAYPAL_ORDER_HTTP_SUCCESS', `[${requestId}] PayPal order created successfully (HTTP)`, {
        requestId,
        orderId: result.orderId,
        callSessionId,
        flow: "simple",
        amount: serverPricing.totalAmount,
        currency: normalizedCurrency,
      });

      res.status(200).json({
        success: true,
        ...result,
        flow: "simple",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'Unknown';

      // ========== ERROR LOGGING ==========
      console.error(`❌ [PAYPAL_DEBUG] ============ ERROR ============`);
      console.error(`❌ [PAYPAL_DEBUG] Request ID: ${requestId}`);
      console.error(`❌ [PAYPAL_DEBUG] Call Session: ${callSessionId}`);
      console.error(`❌ [PAYPAL_DEBUG] Provider ID: ${providerId}`);
      console.error(`❌ [PAYPAL_DEBUG] Error Name: ${errorName}`);
      console.error(`❌ [PAYPAL_DEBUG] Error Message: ${errorMessage}`);
      console.error(`❌ [PAYPAL_DEBUG] Error Stack: ${errorStack}`);
      console.error(`❌ [PAYPAL_DEBUG] ==============================`);

      prodLogger.error('PAYPAL_ORDER_HTTP_ERROR', `[${requestId}] PayPal order creation failed (HTTP)`, {
        requestId,
        callSessionId,
        providerId,
        error: errorMessage,
        errorStack,
      });

      res.status(500).json({ error: "Failed to create order" });
    }
  }
);

/**
 * VERSION HTTP de capturePayPalOrder - avec CORS manuel
 * Utilisée à la place de la version onCall qui a des problèmes CORS
 */
export const capturePayPalOrderHttp = onRequest(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    // minInstances set to 0 to stay within west3 CPU quota
    // CORS works fine on cold start (cors: ALLOWED_ORIGINS handles it)
    minInstances: 0,
    maxInstances: 15,
    memory: "256MiB",  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    // CORS preflight: OPTIONS requests are handled automatically by cors: ALLOWED_ORIGINS
    // but we need to allow them through before checking for POST
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Seulement POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const captureRequestId = `pp_cap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Vérifier l'authentification
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ error: "User must be authenticated" });
      return;
    }

    const { orderId } = req.body;

    prodLogger.info('PAYPAL_CAPTURE_HTTP_START', `[${captureRequestId}] Starting PayPal order capture (HTTP)`, {
      captureRequestId,
      orderId,
      clientId: auth.uid,
    });

    if (!orderId) {
      res.status(400).json({ error: "orderId is required" });
      return;
    }

    try {
      // ===== P0 SECURITY FIX: Vérifier que l'utilisateur est le propriétaire de l'ordre =====
      const db = admin.firestore();
      const orderDoc = await db.collection("paypal_orders").doc(orderId).get();

      if (!orderDoc.exists) {
        console.error(`[PAYPAL HTTP] No order found in paypal_orders for ${orderId}`);
        res.status(404).json({ error: "PayPal order not found" });
        return;
      }

      const orderData = orderDoc.data()!;

      // Vérifier que l'utilisateur actuel est le client qui a créé le paiement
      if (orderData.clientId !== auth.uid) {
        console.error(`[PAYPAL HTTP] Ownership check failed: order=${orderId}, ` +
          `owner=${orderData.clientId}, requester=${auth.uid}`);
        res.status(403).json({ error: "You are not authorized to capture this order" });
        return;
      }

      // P2-2 FIX: Vérifier que le paiement n'a pas déjà été capturé
      if (isPaymentCompleted(orderData.status)) {
        console.warn(`[PAYPAL HTTP] Order ${orderId} already captured`);
        res.status(200).json({
          success: true,
          alreadyCaptured: true,
          message: "Order was already captured",
        });
        return;
      }

      const manager = new PayPalManager();
      const result = await manager.captureOrder(orderId);

      prodLogger.info('PAYPAL_CAPTURE_HTTP_SUCCESS', `[${captureRequestId}] PayPal order captured successfully (HTTP)`, {
        captureRequestId,
        orderId,
        captureId: result.captureId,
        status: result.status,
      });

      res.status(200).json(result);

    } catch (error) {
      prodLogger.error('PAYPAL_CAPTURE_HTTP_ERROR', `[${captureRequestId}] PayPal order capture failed (HTTP)`, {
        captureRequestId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      console.error("🔴 [PAYPAL CAPTURE HTTP ERROR] Full error:", error);
      res.status(500).json({ error: "Failed to capture order" });
    }
  }
);

/**
 * VERSION HTTP de authorizePayPalOrder - AUTHORIZE FLOW
 *
 * FLOW AUTHORIZE (comme Stripe capture_method: 'manual'):
 * =======================================================
 * 1. Le client crée un ordre avec intent="AUTHORIZE"
 * 2. Le client approuve sur PayPal
 * 3. Le client appelle cette fonction pour créer l'autorisation (bloquer les fonds)
 * 4. L'appel commence - les fonds sont réservés mais pas encore capturés
 * 5. Après 2 minutes d'appel: le serveur capture les fonds
 * 6. Si appel < 2 min: le serveur void l'autorisation (fonds libérés)
 *
 * C'est exactement le même comportement que Stripe avec capture_method: 'manual'
 */
export const authorizePayPalOrderHttp = onRequest(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    // P0 FIX: Keep instance warm to avoid CORS errors on cold start
    minInstances: 1,
    // P0 FIX: Increased maxInstances and memory to prevent rate limiting
    maxInstances: 15,
    memory: "256MiB",  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
    // P0 FIX: Added ENCRYPTION_KEY and OUTIL_SYNC_API_KEY for sendPaymentNotifications
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, TASKS_AUTH_SECRET, ENCRYPTION_KEY, OUTIL_SYNC_API_KEY],
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    // CORS preflight: OPTIONS requests are handled automatically by cors: ALLOWED_ORIGINS
    // but we need to allow them through before checking for POST
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Seulement POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const authRequestId = `pp_auth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Vérifier l'authentification
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ error: "User must be authenticated" });
      return;
    }

    const { orderId } = req.body;

    prodLogger.info('PAYPAL_AUTHORIZE_HTTP_START', `[${authRequestId}] Starting PayPal order authorization (HTTP)`, {
      authRequestId,
      orderId,
      clientId: auth.uid,
    });

    if (!orderId) {
      res.status(400).json({ error: "orderId is required" });
      return;
    }

    try {
      // ===== P0 SECURITY FIX: Vérifier que l'utilisateur est le propriétaire de l'ordre =====
      const db = admin.firestore();
      const orderDoc = await db.collection("paypal_orders").doc(orderId).get();

      if (!orderDoc.exists) {
        console.error(`[PAYPAL HTTP] No order found in paypal_orders for ${orderId}`);
        res.status(404).json({ error: "PayPal order not found" });
        return;
      }

      const orderData = orderDoc.data()!;

      // Vérifier que l'utilisateur actuel est le client qui a créé le paiement
      if (orderData.clientId !== auth.uid) {
        console.error(`[PAYPAL HTTP] Ownership check failed: order=${orderId}, ` +
          `owner=${orderData.clientId}, requester=${auth.uid}`);
        res.status(403).json({ error: "You are not authorized to authorize this order" });
        return;
      }

      // Vérifier que l'ordre est bien en mode AUTHORIZE
      if (orderData.intent !== "AUTHORIZE") {
        console.error(`[PAYPAL HTTP] Order ${orderId} is not AUTHORIZE intent`);
        res.status(400).json({ error: "Order was not created with AUTHORIZE intent" });
        return;
      }

      // Vérifier que l'ordre n'a pas déjà été autorisé
      if (orderData.authorizationId) {
        console.warn(`[PAYPAL HTTP] Order ${orderId} already authorized`);
        res.status(200).json({
          success: true,
          alreadyAuthorized: true,
          authorizationId: orderData.authorizationId,
          message: "Order was already authorized",
        });
        return;
      }

      // Vérifier que le paiement n'a pas déjà été capturé
      if (isPaymentCompleted(orderData.status)) {
        console.warn(`[PAYPAL HTTP] Order ${orderId} already captured`);
        res.status(200).json({
          success: true,
          alreadyCaptured: true,
          message: "Order was already captured",
        });
        return;
      }

      const manager = new PayPalManager();
      const result = await manager.authorizeOrder(orderId);

      prodLogger.info('PAYPAL_AUTHORIZE_HTTP_SUCCESS', `[${authRequestId}] PayPal order authorized successfully (HTTP)`, {
        authRequestId,
        orderId,
        authorizationId: result.authorizationId,
        status: result.status,
      });

      // =====================================================================
      // P0 FIX: Call sendPaymentNotifications for PayPal parity with Stripe
      // This triggers:
      // 1. SMS/email notifications to client and provider
      // 2. Sync to Outil IA for AI response generation
      // =====================================================================
      const callSessionId = orderData.callSessionId;
      if (callSessionId) {
        console.log(`📨 [${authRequestId}] Sending payment notifications for PayPal order...`);
        try {
          await sendPaymentNotifications(callSessionId, db);
          console.log(`✅ [${authRequestId}] Payment notifications sent successfully`);
        } catch (notifError) {
          // Non-blocking: log error but don't fail the authorization
          console.error(`⚠️ [${authRequestId}] Failed to send payment notifications:`, notifError);
          prodLogger.warn('PAYPAL_NOTIFICATIONS_ERROR', `[${authRequestId}] Failed to send notifications (non-blocking)`, {
            authRequestId,
            callSessionId,
            error: notifError instanceof Error ? notifError.message : String(notifError),
          });
        }
      } else {
        console.warn(`⚠️ [${authRequestId}] No callSessionId found - skipping notifications`);
      }

      res.status(200).json(result);

    } catch (error) {
      prodLogger.error('PAYPAL_AUTHORIZE_HTTP_ERROR', `[${authRequestId}] PayPal order authorization failed (HTTP)`, {
        authRequestId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      console.error("🔴 [PAYPAL AUTHORIZE HTTP ERROR] Full error:", error);
      res.status(500).json({ error: "Failed to authorize order" });
    }
  }
);

// ============================================================================
// FONCTIONS CALLABLE (onCall) - GARDÉES POUR COMPATIBILITÉ
// Note: Les versions HTTP ci-dessus sont préférées car elles n'ont pas de problèmes CORS
// ============================================================================

/**
 * Crée un ordre PayPal (appelé depuis le frontend)
 *
 * GÈRE 2 FLUX AUTOMATIQUEMENT:
 * ============================
 * 1. FLUX DIRECT (si provider a merchantId): Split automatique via platform_fees
 * 2. FLUX SIMPLE (si provider a seulement paypalEmail): Payout après capture
 *
 * Le système choisit automatiquement le bon flux selon la configuration du provider.
 *
 * P0 SECURITY FIX: Les frais sont calculés côté serveur, pas par le client
 */
export const createPayPalOrder = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID, PAYPAL_PLATFORM_MERCHANT_ID],
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    const requestId = `pp_order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {
      callSessionId,
      amount,
      currency,
      providerId,
      serviceType, // 'lawyer' ou 'expat'
      description,
      metadata: trackingMetadata, // Meta CAPI and UTM params from frontend
    } = request.data;

    prodLogger.info('PAYPAL_ORDER_START', `[${requestId}] Creating PayPal order`, {
      requestId,
      callSessionId,
      amount,
      currency,
      providerId,
      serviceType,
      clientId: request.auth.uid,
    });

    if (!callSessionId || !amount || !providerId) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    // Import du pricing service pour calculer les frais côté serveur
    const { getServiceAmounts } = await import("./services/pricingService");

    // Vérifier les données du provider
    const db = admin.firestore();
    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerData = providerDoc.data();

    if (!providerData) {
      throw new HttpsError("not-found", "Provider not found");
    }

    // SIMPLIFICATION: On utilise UNIQUEMENT le flux Simple (payout vers email)
    // Le flux Direct (merchantId) n'est jamais utilisé en production
    const hasPayPalEmail = !!providerData.paypalEmail;

    // Note: Si pas d'email PayPal, on continue quand même (payout sera fait plus tard quand l'email sera configuré)
    if (!hasPayPalEmail) {
      console.log(`⚠️ [PAYPAL] Provider ${providerId} has no PayPal email - payout will be pending until email configured`);
    }

    // ===== P0 SECURITY FIX: Calculer les frais côté serveur =====
    const normalizedCurrency = (currency || "EUR").toLowerCase() as "eur" | "usd";
    const normalizedServiceType = (serviceType || providerData.type || "expat") as "lawyer" | "expat";

    // Récupérer la configuration de prix du serveur
    const serverPricing = await getServiceAmounts(normalizedServiceType, normalizedCurrency);

    // Valider que le montant correspond à la configuration serveur
    const clientAmount = typeof amount === "number" ? amount : parseFloat(amount);

    if (Math.abs(clientAmount - serverPricing.totalAmount) > 0.05) {
      console.error(`[PAYPAL] Amount mismatch: client=${clientAmount}, server=${serverPricing.totalAmount}`);
      throw new HttpsError(
        "invalid-argument",
        `Invalid amount. Expected ${serverPricing.totalAmount} ${normalizedCurrency.toUpperCase()}`
      );
    }

    // Utiliser les valeurs calculées par le serveur (frais de mise en relation, pas "commission")
    const serverProviderAmount = serverPricing.providerAmount;
    const serverConnectionFee = serverPricing.connectionFeeAmount; // Frais de mise en relation

    console.log(`[PAYPAL] Server-calculated: total=${serverPricing.totalAmount}, ` +
      `provider=${serverProviderAmount}, frais mise en relation=${serverConnectionFee}`);
    console.log(`[PAYPAL] Flow: SIMPLE (payout vers email)`);

    const manager = new PayPalManager();

    try {
      // SIMPLIFICATION: Toujours utiliser le flux Simple (payout vers email)
      console.log(`[PAYPAL] Using SIMPLE flow with email: ${providerData.paypalEmail || 'UNDEFINED'}`);

      const result = await manager.createSimpleOrder({
        callSessionId,
        amount: serverPricing.totalAmount,
        providerAmount: serverProviderAmount,
        platformFee: serverConnectionFee,
        currency: normalizedCurrency.toUpperCase(),
        providerId,
        providerPayPalEmail: providerData.paypalEmail,
        clientId: request.auth.uid,
        description: description || "SOS Expat - Consultation",
        // Legacy onCall: phone numbers will be empty (use HTTP function instead)
        clientPhone: "",
        providerPhone: providerData.phone || providerData.encryptedPhone || "",
        // P2 FIX: Provider country = intervention country for SMS notifications
        providerCountry: providerData.country || "",
        // Pass tracking metadata for attribution (UTM, Meta identifiers)
        trackingMetadata: trackingMetadata as Record<string, string> | undefined,
      });

      // Log de succès
      prodLogger.info('PAYPAL_ORDER_SUCCESS', `[${requestId}] PayPal order created successfully`, {
        requestId,
        orderId: result.orderId,
        callSessionId,
        flow: "simple",
        amount: serverPricing.totalAmount,
        currency: normalizedCurrency,
      });

      return {
        success: true,
        ...result,
        flow: "simple",
      };

    } catch (error) {
      prodLogger.error('PAYPAL_ORDER_ERROR', `[${requestId}] PayPal order creation failed`, {
        requestId,
        callSessionId,
        providerId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      // DEBUG: Log complet de l'erreur pour diagnostic
      console.error("🔴 [PAYPAL ORDER ERROR] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("🔴 [PAYPAL ORDER ERROR] Request context:", {
        callSessionId,
        amount: serverPricing.totalAmount,
        currency: normalizedCurrency,
        providerId,
        serviceType: normalizedServiceType,
        hasPayPalEmail,
        flow: "simple",
      });
      throw new HttpsError("internal", "Failed to create order");
    }
  }
);

/**
 * Capture un ordre PayPal après approbation
 *
 * P0 SECURITY FIX: Valide que l'utilisateur est bien le propriétaire de l'ordre
 */
export const capturePayPalOrder = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    const captureRequestId = `pp_cap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { orderId } = request.data;

    prodLogger.info('PAYPAL_CAPTURE_START', `[${captureRequestId}] Starting PayPal order capture`, {
      captureRequestId,
      orderId,
      clientId: request.auth.uid,
    });

    if (!orderId) {
      throw new HttpsError("invalid-argument", "orderId is required");
    }

    // ===== P0 SECURITY FIX: Vérifier que l'utilisateur est le propriétaire de l'ordre =====
    const db = admin.firestore();

    // P0 FIX: Chercher dans paypal_orders (créé par createPayPalOrder) au lieu de payments
    // Le document payments est créé APRÈS la capture sur le frontend, donc il n'existe pas encore
    const orderDoc = await db.collection("paypal_orders").doc(orderId).get();

    if (!orderDoc.exists) {
      console.error(`[PAYPAL] No order found in paypal_orders for ${orderId}`);
      throw new HttpsError("not-found", "PayPal order not found");
    }

    const orderData = orderDoc.data()!;

    // Vérifier que l'utilisateur actuel est le client qui a créé le paiement
    if (orderData.clientId !== request.auth.uid) {
      console.error(`[PAYPAL] Ownership check failed: order=${orderId}, ` +
        `owner=${orderData.clientId}, requester=${request.auth.uid}`);
      throw new HttpsError(
        "permission-denied",
        "You are not authorized to capture this order"
      );
    }

    // P2-2 FIX: Vérifier que le paiement n'a pas déjà été capturé
    if (isPaymentCompleted(orderData.status)) {
      console.warn(`[PAYPAL] Order ${orderId} already captured`);
      return {
        success: true,
        alreadyCaptured: true,
        message: "Order was already captured",
      };
    }

    const manager = new PayPalManager();

    try {
      const result = await manager.captureOrder(orderId);

      prodLogger.info('PAYPAL_CAPTURE_SUCCESS', `[${captureRequestId}] PayPal order captured successfully`, {
        captureRequestId,
        orderId,
        captureId: result.captureId,
        status: result.status,
      });

      return result;
    } catch (error) {
      prodLogger.error('PAYPAL_CAPTURE_ERROR', `[${captureRequestId}] PayPal order capture failed`, {
        captureRequestId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      // DEBUG: Log complet de l'erreur pour diagnostic
      console.error("🔴 [PAYPAL CAPTURE ERROR] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("🔴 [PAYPAL CAPTURE ERROR] Context:", {
        orderId,
        requesterId: request.auth.uid,
        orderDocExists: orderDoc.exists,
      });
      throw new HttpsError("internal", "Failed to capture order");
    }
  }
);

/**
 * Vérifie la signature du webhook PayPal
 * https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */
async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  body: string,
  webhookId: string
): Promise<boolean> {
  const transmissionId = headers["paypal-transmission-id"];
  const transmissionTime = headers["paypal-transmission-time"];
  const certUrl = headers["paypal-cert-url"];
  const authAlgo = headers["paypal-auth-algo"];
  const transmissionSig = headers["paypal-transmission-sig"];

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("❌ [PAYPAL] Missing webhook signature headers");
    return false;
  }

  // Obtenir un token d'accès - P0 FIX: Use centralized getters
  const clientId = getPayPalClientId();
  const clientSecret = getPayPalClientSecret();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch(`${PAYPAL_CONFIG.BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenResponse.ok) {
    console.error("❌ [PAYPAL] Failed to get token for signature verification");
    return false;
  }

  const tokenData = await tokenResponse.json() as { access_token: string };

  // Vérifier la signature via l'API PayPal
  const verifyResponse = await fetch(`${PAYPAL_CONFIG.BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!verifyResponse.ok) {
    console.error("❌ [PAYPAL] Signature verification API call failed");
    return false;
  }

  const verifyResult = await verifyResponse.json() as { verification_status: string };

  if (verifyResult.verification_status !== "SUCCESS") {
    console.error("❌ [PAYPAL] Webhook signature verification failed:", verifyResult.verification_status);
    return false;
  }

  console.log("✅ [PAYPAL] Webhook signature verified successfully");
  return true;
}

/**
 * P0-4 FIX: Helper pour gérer les échecs de payout
 * Utilisé par les handlers PAYOUT.ITEM.* du webhook
 */
async function handlePayoutFailure(
  db: admin.firestore.Firestore,
  payoutItem: any,
  status: string,
  errorMessage: string
): Promise<void> {
  const payoutBatchId = payoutItem?.payout_batch_id;
  if (!payoutBatchId) return;

  // Mettre à jour le payout dans Firestore
  const payoutQuery = await db.collection("paypal_payouts")
    .where("payoutBatchId", "==", payoutBatchId)
    .limit(1)
    .get();

  let providerId: string | null = null;
  let amount: number | null = null;
  let currency: string = "EUR";

  if (!payoutQuery.empty) {
    const payoutDoc = payoutQuery.docs[0];
    const payoutData = payoutDoc.data();
    providerId = payoutData?.providerId || null;
    amount = payoutData?.amount || null;
    currency = payoutData?.currency || "EUR";

    await payoutDoc.ref.update({
      status,
      errorMessage,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Créer une alerte pour intervention
  await db.collection("admin_alerts").add({
    type: `paypal_payout_${status.toLowerCase()}`,
    priority: "critical",
    title: `Payout PayPal ${status}`,
    message: `Un payout de ${amount || 'N/A'} ${currency} a échoué: ${errorMessage}`,
    payoutBatchId,
    payoutItemId: payoutItem?.payout_item_id,
    providerId,
    errorMessage,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Programmer un retry automatique si applicable
  if (["FAILED", "BLOCKED", "RETURNED"].includes(status) && providerId) {
    try {
      const { schedulePayoutRetryTask } = await import("./lib/payoutRetryTasks");

      // Créer une entrée dans failed_payouts_alerts
      const alertRef = await db.collection("failed_payouts_alerts").add({
        providerId,
        payoutBatchId,
        amount,
        currency,
        status: "pending",
        error: errorMessage,
        retryCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Récupérer les infos nécessaires pour le retry
      const payoutData = payoutQuery.docs[0]?.data();
      if (payoutData?.callSessionId && payoutData?.providerPayPalEmail) {
        await schedulePayoutRetryTask({
          failedPayoutAlertId: alertRef.id,
          orderId: payoutData.orderId || "",
          callSessionId: payoutData.callSessionId,
          providerId,
          providerPayPalEmail: payoutData.providerPayPalEmail,
          amount: amount || 0,
          currency,
          retryCount: 0,
        });

        console.log(`📋 [PAYPAL] P0-4 FIX: Retry scheduled for failed payout ${payoutBatchId}`);
      }
    } catch (retryError) {
      console.error(`❌ [PAYPAL] P0-4 FIX: Error scheduling retry:`, retryError);
    }
  }
}

/**
 * Webhook PayPal
 */
export const paypalWebhook = onRequest(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    // P0 CRITICAL FIX: Allow unauthenticated access for PayPal webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, META_CAPI_TOKEN],
  },
  async (req, res) => {
    console.log("🔔 [PAYPAL] Webhook received");

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // ===== VALIDATION SIGNATURE WEBHOOK (P0 SECURITY FIX) =====
    // P0 FIX: Use centralized getter
    const webhookId = getPayPalWebhookId();
    if (!webhookId) {
      console.error("❌ [PAYPAL] PAYPAL_WEBHOOK_ID secret not configured");
      res.status(500).send("Webhook ID not configured");
      return;
    }

    // Récupérer le body brut pour la vérification de signature
    const rawBody = JSON.stringify(req.body);

    try {
      const isValid = await verifyPayPalWebhookSignature(
        req.headers as Record<string, string | string[] | undefined>,
        rawBody,
        webhookId
      );

      if (!isValid) {
        console.error("❌ [PAYPAL] Invalid webhook signature - rejecting request");
        res.status(401).send("Invalid webhook signature");
        return;
      }
    } catch (sigError) {
      console.error("❌ [PAYPAL] Error verifying webhook signature:", sigError);
      // P1-3 SECURITY FIX: TOUJOURS rejeter les signatures invalides
      // Anciennement: Skip en non-production (vulnérable aux webhooks forgés en staging)
      // Maintenant: Rejet systématique pour éviter les attaques sur tous environnements
      res.status(401).send("Signature verification failed");
      return;
    }

    try {
      const event = req.body;
      const eventType = event.event_type;

      console.log("📨 [PAYPAL] Event type:", eventType);

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.paypal.incoming(event);

      const db = admin.firestore();

      // ========== P0 FIX: IDEMPOTENCE - Prevent duplicate processing ==========
      // PayPal may send the same webhook multiple times. We must ensure we only
      // process each event once to prevent duplicate transactions/updates.
      const webhookKey = `paypal_${event.id}`;
      const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);

      const existingEvent = await webhookEventRef.get();
      if (existingEvent.exists) {
        const existingStatus = existingEvent.data()?.status;
        if (existingStatus === "completed") {
          // Already successfully processed - skip
          console.log(`⚠️ [PAYPAL] IDEMPOTENCY: Event ${event.id} already completed, skipping`);
          res.status(200).json({ received: true, duplicate: true, eventId: event.id });
          return;
        }
        // Status is "processing" or "failed" - allow re-processing
        console.log(`🔄 [PAYPAL] IDEMPOTENCY: Event ${event.id} status="${existingStatus}" - allowing re-processing`);
      }

      // Mark event as being processed BEFORE processing (prevents race conditions)
      await webhookEventRef.set({
        eventKey: webhookKey,
        eventId: event.id,
        eventType,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
        source: "paypal_webhook",
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      // ========== END P0 FIX ==========

      // Logger l'événement (kept for audit trail)
      await db.collection("paypal_webhook_events").add({
        eventId: event.id,
        eventType,
        resource: event.resource,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Traiter selon le type d'événement
      switch (eventType) {
        // ===== P0 FIX 2026-02-12: Handle PAYMENT.AUTHORIZATION.* events =====
        // Without these handlers, if PayPal voids/expires an authorization unilaterally,
        // SOS-Expat is never notified and Firestore gets out of sync.
        case "PAYMENT.AUTHORIZATION.CREATED": {
          const authResource = event.resource;
          const authOrderId = authResource?.supplementary_data?.related_ids?.order_id;
          console.log(`✅ [PAYPAL] Authorization created: ${authResource?.id} for order ${authOrderId}`);
          if (authOrderId && authResource?.id) {
            await db.collection("paypal_orders").doc(authOrderId).update({
              authorizationId: authResource.id,
              authorizationStatus: "CREATED",
              authorizationCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;
        }

        case "PAYMENT.AUTHORIZATION.VOIDED":
        case "PAYMENT.AUTHORIZATION.EXPIRED": {
          const voidedAuthResource = event.resource;
          const voidedAuthId = voidedAuthResource?.id;
          const voidedOrderId = voidedAuthResource?.supplementary_data?.related_ids?.order_id;
          const voidReason = eventType === "PAYMENT.AUTHORIZATION.EXPIRED" ? "EXPIRED" : "VOIDED";
          console.log(`🚫 [PAYPAL] Authorization ${voidReason}: ${voidedAuthId} for order ${voidedOrderId}`);

          if (voidedOrderId) {
            // Update PayPal order
            await db.collection("paypal_orders").doc(voidedOrderId).update({
              status: voidReason,
              [`${voidReason.toLowerCase()}At`]: admin.firestore.FieldValue.serverTimestamp(),
              [`${voidReason.toLowerCase()}By`]: "paypal_webhook",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update call_session if exists
            const orderDoc = await db.collection("paypal_orders").doc(voidedOrderId).get();
            const orderData = orderDoc.data();
            if (orderData?.callSessionId) {
              await db.collection("call_sessions").doc(orderData.callSessionId).update({
                "payment.status": "voided",
                "payment.voidedAt": admin.firestore.FieldValue.serverTimestamp(),
                "payment.voidedBy": `paypal_${voidReason.toLowerCase()}`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Alert admin for unexpected voids
            await db.collection("admin_alerts").add({
              type: `paypal_authorization_${voidReason.toLowerCase()}`,
              priority: "high",
              title: `Autorisation PayPal ${voidReason}`,
              message: `L'autorisation ${voidedAuthId} pour l'ordre ${voidedOrderId} a été ${voidReason === "EXPIRED" ? "expirée" : "annulée"} par PayPal.`,
              orderId: voidedOrderId,
              authorizationId: voidedAuthId,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;
        }
        // ===== END P0 FIX 2026-02-12 =====

        case "CHECKOUT.ORDER.APPROVED":
          // L'utilisateur a approuvé le paiement
          const approvedOrderId = event.resource?.id;
          if (approvedOrderId) {
            await db.collection("paypal_orders").doc(approvedOrderId).update({
              status: "APPROVED",
              approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;

        case "PAYMENT.CAPTURE.COMPLETED":
          // Paiement capturé avec succès
          const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
          const captureAmount = event.resource?.amount?.value;
          const captureCurrency = event.resource?.amount?.currency_code || "EUR";

          if (orderId) {
            const orderDoc = await db.collection("paypal_orders").doc(orderId).get();
            const orderData = orderDoc.data();

            if (orderData?.callSessionId) {
              // Update call session
              // CHATTER FIX: Set isPaid: true at root level to trigger chatterOnCallCompleted
              await db.collection("call_sessions").doc(orderData.callSessionId).update({
                "payment.status": "captured",
                "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
                "isPaid": true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // ========== META CAPI TRACKING ==========
              // Track Purchase event server-side for Facebook Ads attribution
              try {
                // Get call session for user data
                const sessionDoc = await db.collection("call_sessions").doc(orderData.callSessionId).get();
                const sessionData = sessionDoc.data();

                const userData: UserData = {};
                if (sessionData?.clientEmail) {
                  userData.em = sessionData.clientEmail.toLowerCase().trim();
                }
                if (sessionData?.clientPhone) {
                  userData.ph = sessionData.clientPhone.replace(/[^0-9+]/g, "");
                }
                if (sessionData?.clientName) {
                  const nameParts = sessionData.clientName.split(" ");
                  if (nameParts.length > 0) userData.fn = nameParts[0].toLowerCase().trim();
                  if (nameParts.length > 1) userData.ln = nameParts.slice(1).join(" ").toLowerCase().trim();
                }
                // Facebook identifiers from session (if captured during checkout)
                if (sessionData?.fbp) userData.fbp = sessionData.fbp;
                if (sessionData?.fbc) userData.fbc = sessionData.fbc;
                if (sessionData?.client_ip_address) userData.client_ip_address = sessionData.client_ip_address;
                if (sessionData?.client_user_agent) userData.client_user_agent = sessionData.client_user_agent;

                const capiResult = await trackCAPIPurchase({
                  userData,
                  value: parseFloat(captureAmount) || sessionData?.payment?.amount || 0,
                  currency: captureCurrency,
                  orderId: orderId,
                  contentName: `${sessionData?.providerType || "service"}_call_paypal`,
                  contentCategory: sessionData?.providerType || "service",
                  contentIds: sessionData?.providerId ? [sessionData.providerId] : undefined,
                  serviceType: sessionData?.serviceType,
                  providerType: sessionData?.providerType,
                  eventSourceUrl: "https://sos-expat.com",
                });

                if (capiResult.success) {
                  console.log(`✅ [PAYPAL CAPI] Purchase tracked for order ${orderId}`, {
                    eventId: capiResult.eventId,
                    amount: captureAmount,
                    currency: captureCurrency,
                  });

                  // Store CAPI tracking info
                  await db.collection("call_sessions").doc(orderData.callSessionId).update({
                    "capiTracking.paypalPurchaseEventId": capiResult.eventId,
                    "capiTracking.paypalPurchaseTrackedAt": admin.firestore.FieldValue.serverTimestamp(),
                  });
                } else {
                  console.warn(`⚠️ [PAYPAL CAPI] Failed to track purchase for order ${orderId}:`, capiResult.error);
                }
              } catch (capiError) {
                // Don't fail the webhook if CAPI tracking fails
                console.error(`❌ [PAYPAL CAPI] Error tracking purchase for order ${orderId}:`, capiError);
              }
              // ========== END META CAPI TRACKING ==========
            }
          }
          break;

        case "PAYMENT.CAPTURE.DENIED": {
          // ========== Webhook fix: Handle denied captures ==========
          // CAPTURE.DENIED = payment failed to capture (funds not collected)
          // No provider debit needed since payment was never captured
          const deniedResource = event.resource;
          const deniedCaptureId = deniedResource?.id;
          const deniedOrderId = deniedResource?.supplementary_data?.related_ids?.order_id;
          const deniedAmount = parseFloat(deniedResource?.amount?.value || "0");
          const deniedCurrency = deniedResource?.amount?.currency_code || "EUR";

          console.log("🚫 [PAYPAL] Capture DENIED:", deniedCaptureId, `${deniedAmount} ${deniedCurrency}`);

          try {
            // Find the paypal_orders doc
            if (deniedOrderId) {
              const orderDoc = await db.collection("paypal_orders").doc(deniedOrderId).get();
              if (orderDoc.exists) {
                const orderData = orderDoc.data();
                const deniedCallSessionId = orderData?.callSessionId;

                // Update paypal_orders status
                await orderDoc.ref.update({
                  status: "denied",
                  deniedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update call_sessions payment status
                if (deniedCallSessionId) {
                  await db.collection("call_sessions").doc(deniedCallSessionId).update({
                    "payment.status": "denied",
                    "payment.deniedAt": admin.firestore.FieldValue.serverTimestamp(),
                    "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
                  });
                }

                // Update payments doc
                const deniedPaymentQuery = await db.collection("payments")
                  .where("paypalOrderId", "==", deniedOrderId)
                  .limit(1)
                  .get();
                if (!deniedPaymentQuery.empty) {
                  await deniedPaymentQuery.docs[0].ref.update({
                    status: "denied",
                    deniedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              }
            }

            // Alert admin
            await db.collection("admin_notifications").add({
              type: "paypal_capture_denied",
              severity: "high",
              title: "PayPal Capture DENIED",
              message: `Capture ${deniedCaptureId} denied for order ${deniedOrderId} (${deniedAmount} ${deniedCurrency})`,
              data: {
                captureId: deniedCaptureId,
                orderId: deniedOrderId,
                amount: deniedAmount,
                currency: deniedCurrency,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (deniedError) {
            console.error("❌ [PAYPAL] Error handling CAPTURE.DENIED:", deniedError);
            await db.collection("admin_alerts").add({
              type: "paypal_capture_denied_error",
              severity: "critical",
              title: "Erreur traitement PayPal CAPTURE.DENIED",
              message: `Erreur lors du traitement de CAPTURE.DENIED pour ${deniedCaptureId}`,
              data: {
                captureId: deniedCaptureId,
                orderId: deniedOrderId,
                error: deniedError instanceof Error ? deniedError.message : "Unknown",
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;
        }

        case "PAYMENT.CAPTURE.REVERSED": {
          // ========== Webhook fix: Handle reversed captures ==========
          // CAPTURE.REVERSED = post-capture reversal (chargeback, bank reversal)
          // Must debit provider + cancel commissions (similar to REFUNDED)
          const reversedResource = event.resource;
          const reversedCaptureId = reversedResource?.id;
          const reversedAmount = parseFloat(reversedResource?.amount?.value || "0");
          const reversedCurrency = reversedResource?.amount?.currency_code || "EUR";

          console.log("⚠️ [PAYPAL] Capture REVERSED:", reversedCaptureId, `${reversedAmount} ${reversedCurrency}`);

          if (reversedCaptureId && reversedAmount > 0) {
            try {
              // Find original payment by captureId or orderId
              let reversedPaymentDoc;
              const reversedPaymentQuery = await db.collection("payments")
                .where("paypalCaptureId", "==", reversedCaptureId)
                .limit(1)
                .get();
              reversedPaymentDoc = reversedPaymentQuery.docs[0];

              if (!reversedPaymentDoc) {
                const reversedOrderId = reversedResource?.supplementary_data?.related_ids?.order_id;
                if (reversedOrderId) {
                  const orderPaymentQuery = await db.collection("payments")
                    .where("paypalOrderId", "==", reversedOrderId)
                    .limit(1)
                    .get();
                  reversedPaymentDoc = orderPaymentQuery.docs[0];
                }
              }

              if (reversedPaymentDoc) {
                const reversedPaymentData = reversedPaymentDoc.data();
                const reversedProviderId = reversedPaymentData.providerId;
                const reversedCallSessionId = reversedPaymentData.callSessionId;

                if (reversedProviderId) {
                  // Debit provider balance
                  const { ProviderEarningsService } = await import("./ProviderEarningsService");
                  const earningsService = new ProviderEarningsService(db);

                  // Compute provider refund amount using stored ratio
                  let providerReversalAmount: number;
                  const storedProviderAmt = reversedPaymentData.providerAmountEuros || reversedPaymentData.providerAmount;
                  const storedTotalAmt = reversedPaymentData.amountInEuros || reversedPaymentData.amount;
                  if (storedProviderAmt && storedTotalAmt && storedTotalAmt > 0) {
                    const providerRatio = storedProviderAmt / storedTotalAmt;
                    providerReversalAmount = reversedAmount * providerRatio;
                  } else {
                    providerReversalAmount = reversedAmount * 0.61;
                    console.warn(`⚠️ [PAYPAL] REVERSED: Using legacy 61% ratio`);
                  }

                  await earningsService.deductProviderBalance({
                    providerId: reversedProviderId,
                    amount: providerReversalAmount,
                    currency: reversedCurrency,
                    reason: `Reversal PayPal - Capture ${reversedCaptureId}`,
                    callSessionId: reversedCallSessionId || undefined,
                    metadata: {
                      paypalCaptureId: reversedCaptureId,
                      totalReversalAmount: reversedAmount,
                      source: "paypal_webhook_reversal",
                    },
                  });

                  console.log(`✅ [PAYPAL] Provider ${reversedProviderId} debited ${providerReversalAmount} ${reversedCurrency} (reversal)`);

                  // Update payment status
                  await reversedPaymentDoc.ref.update({
                    status: "reversed",
                    reversedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reversalAmount: reversedAmount,
                    providerReversalAmount: providerReversalAmount,
                  });

                  // Update call_sessions
                  if (reversedCallSessionId) {
                    await db.collection("call_sessions").doc(reversedCallSessionId).update({
                      "payment.status": "reversed",
                      "payment.reversedAt": admin.firestore.FieldValue.serverTimestamp(),
                      "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }

                  // Cancel ALL affiliate commissions (same as REFUNDED)
                  if (reversedCallSessionId) {
                    try {
                      const cancelReason = `PayPal reversal: capture ${reversedCaptureId}`;
                      const commissionResults = await Promise.allSettled([
                        cancelChatterCommissions(reversedCallSessionId, cancelReason, "system_refund"),
                        cancelInfluencerCommissions(reversedCallSessionId, cancelReason, "system_refund"),
                        cancelBloggerCommissions(reversedCallSessionId, cancelReason, "system_refund"),
                        cancelGroupAdminCommissions(reversedCallSessionId, cancelReason),
                        cancelAffiliateCommissions(reversedCallSessionId, cancelReason, "system_refund"),
                      ]);

                      const commLabels = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'affiliate'] as const;
                      let commTotalCancelled = 0;
                      for (let i = 0; i < commissionResults.length; i++) {
                        const r = commissionResults[i];
                        if (r.status === 'fulfilled') {
                          commTotalCancelled += r.value.cancelledCount;
                        } else {
                          console.error(`[PAYPAL webhook] Failed to cancel ${commLabels[i]} commissions (reversal):`, r.reason);
                        }
                      }
                      console.log(`✅ [PAYPAL webhook] Cancelled ${commTotalCancelled} commissions for reversed session ${reversedCallSessionId}`);
                    } catch (commError) {
                      console.error("❌ [PAYPAL webhook] Failed to cancel commissions (reversal):", commError);
                    }
                  }
                } else {
                  console.warn("⚠️ [PAYPAL] Reversal: No providerId found in payment document");
                }
              } else {
                console.warn(`⚠️ [PAYPAL] Reversal: Could not find payment for capture ${reversedCaptureId}`);
                await db.collection("paypal_refund_orphans").add({
                  type: "reversal",
                  captureId: reversedCaptureId,
                  amount: reversedAmount,
                  currency: reversedCurrency,
                  rawResource: reversedResource,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            } catch (reversalError) {
              console.error("❌ [PAYPAL] Error handling CAPTURE.REVERSED:", reversalError);
              await db.collection("admin_alerts").add({
                type: "paypal_reversal_handling_failed",
                severity: "critical",
                title: "Échec traitement reversal PayPal",
                message: `Impossible de traiter le reversal PayPal ${reversedCaptureId}`,
                data: {
                  captureId: reversedCaptureId,
                  amount: reversedAmount,
                  currency: reversedCurrency,
                  error: reversalError instanceof Error ? reversalError.message : "Unknown",
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          break;
        }

        case "PAYMENT.CAPTURE.REFUNDED":
          // ========== P0-1 FIX: Débiter le provider lors d'un remboursement PayPal ==========
          // Alignement avec Stripe qui débite le provider via deductProviderBalance()
          const refundResource = event.resource;
          const refundCaptureId = refundResource?.id;
          const refundAmount = parseFloat(refundResource?.amount?.value || "0");
          const refundCurrency = refundResource?.amount?.currency_code || "EUR";

          console.log("💸 [PAYPAL] Refund processed:", refundCaptureId, `${refundAmount} ${refundCurrency}`);

          if (refundCaptureId && refundAmount > 0) {
            try {
              // Chercher le paiement original pour trouver le providerId
              const refundPaymentQuery = await db.collection("payments")
                .where("paypalCaptureId", "==", refundCaptureId)
                .limit(1)
                .get();

              // Si pas trouvé par captureId, chercher par orderId dans les custom_id
              let paymentDoc = refundPaymentQuery.docs[0];
              if (!paymentDoc) {
                const orderId = refundResource?.supplementary_data?.related_ids?.order_id;
                if (orderId) {
                  const orderPaymentQuery = await db.collection("payments")
                    .where("paypalOrderId", "==", orderId)
                    .limit(1)
                    .get();
                  paymentDoc = orderPaymentQuery.docs[0];
                }
              }

              if (paymentDoc) {
                const paymentData = paymentDoc.data();
                const providerId = paymentData.providerId;
                const callSessionId = paymentData.callSessionId;

                if (providerId) {
                  // Importer le service de déduction
                  const { ProviderEarningsService } = await import("./ProviderEarningsService");
                  const earningsService = new ProviderEarningsService(db);

                  // P0 FIX 2026-02-12: Use stored provider amount ratio instead of hardcoded 61%
                  // If the payment doc has providerAmount and amount, compute the actual ratio
                  // Fallback to 61% only for legacy payments without stored amounts
                  let providerRefundAmount: number;
                  const storedProviderAmount = paymentData.providerAmountEuros || paymentData.providerAmount;
                  const storedTotalAmount = paymentData.amountInEuros || paymentData.amount;
                  if (storedProviderAmount && storedTotalAmount && storedTotalAmount > 0) {
                    // Use the actual ratio from the original payment
                    const providerRatio = storedProviderAmount / storedTotalAmount;
                    providerRefundAmount = refundAmount * providerRatio;
                    console.log(`💰 [PAYPAL] Using stored ratio: ${(providerRatio * 100).toFixed(1)}% (provider: ${storedProviderAmount}, total: ${storedTotalAmount})`);
                  } else {
                    // Legacy fallback - 61% matches historical commission structure
                    providerRefundAmount = refundAmount * 0.61;
                    console.warn(`⚠️ [PAYPAL] Using legacy 61% ratio - no stored amounts found in payment doc`);
                  }

                  await earningsService.deductProviderBalance({
                    providerId,
                    amount: providerRefundAmount,
                    currency: refundCurrency,
                    reason: `Remboursement PayPal - Capture ${refundCaptureId}`,
                    callSessionId: callSessionId || undefined,
                    metadata: {
                      paypalCaptureId: refundCaptureId,
                      totalRefundAmount: refundAmount,
                      source: "paypal_webhook",
                    },
                  });

                  console.log(`✅ [PAYPAL] P0-1 FIX: Provider ${providerId} debited ${providerRefundAmount} ${refundCurrency}`);

                  // Mettre à jour le statut du paiement
                  await paymentDoc.ref.update({
                    status: "refunded",
                    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                    refundAmount: refundAmount,
                    providerRefundAmount: providerRefundAmount,
                  });

                  // Cancel ALL affiliate commissions (5 systems)
                  // Without this, refunds via PayPal Dashboard leave commissions intact
                  if (callSessionId) {
                    try {
                      const cancelReason = `PayPal Dashboard refund: capture ${refundCaptureId}`;
                      const commissionResults = await Promise.allSettled([
                        cancelChatterCommissions(callSessionId, cancelReason, "system_refund"),
                        cancelInfluencerCommissions(callSessionId, cancelReason, "system_refund"),
                        cancelBloggerCommissions(callSessionId, cancelReason, "system_refund"),
                        cancelGroupAdminCommissions(callSessionId, cancelReason),
                        cancelAffiliateCommissions(callSessionId, cancelReason, "system_refund"),
                      ]);

                      const commLabels = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'affiliate'] as const;
                      let commTotalCancelled = 0;
                      for (let i = 0; i < commissionResults.length; i++) {
                        const r = commissionResults[i];
                        if (r.status === 'fulfilled') {
                          commTotalCancelled += r.value.cancelledCount;
                        } else {
                          console.error(`[PAYPAL webhook] Failed to cancel ${commLabels[i]} commissions:`, r.reason);
                        }
                      }
                      console.log(`✅ [PAYPAL webhook] Cancelled ${commTotalCancelled} commissions for session ${callSessionId}`);
                    } catch (commError) {
                      console.error("❌ [PAYPAL webhook] Failed to cancel commissions:", commError);
                    }
                  }
                } else {
                  console.warn("⚠️ [PAYPAL] Refund: No providerId found in payment document");
                }
              } else {
                console.warn(`⚠️ [PAYPAL] Refund: Could not find payment for capture ${refundCaptureId}`);
                // Logger pour investigation manuelle
                await db.collection("paypal_refund_orphans").add({
                  captureId: refundCaptureId,
                  amount: refundAmount,
                  currency: refundCurrency,
                  rawResource: refundResource,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            } catch (refundError) {
              // Ne pas faire échouer le webhook, mais alerter l'admin
              console.error("❌ [PAYPAL] P0-1 FIX: Error deducting provider balance:", refundError);
              await db.collection("admin_alerts").add({
                type: "paypal_provider_deduction_failed",
                severity: "critical",
                title: "Échec déduction provider - Remboursement PayPal",
                message: `Impossible de débiter le provider pour le remboursement PayPal ${refundCaptureId}`,
                data: {
                  captureId: refundCaptureId,
                  amount: refundAmount,
                  currency: refundCurrency,
                  error: refundError instanceof Error ? refundError.message : "Unknown",
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          // ========== FIN P0-1 FIX ==========
          break;

        case "MERCHANT.ONBOARDING.COMPLETED":
          // Onboarding marchand terminé
          const merchantId = event.resource?.merchant_id;
          const trackingId = event.resource?.tracking_id; // = providerId

          if (trackingId && merchantId) {
            await db.collection("users").doc(trackingId).update({
              paypalMerchantId: merchantId,
              paypalOnboardingComplete: true,
              paypalOnboardingCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Aussi dans sos_profiles
            await db.collection("sos_profiles").doc(trackingId).set({
              paypalMerchantId: merchantId,
              paypalOnboardingComplete: true,
            }, { merge: true });

            console.log("✅ [PAYPAL] Merchant onboarding complete:", trackingId);

            // ========== GARDE-FOU B: Relancer les payouts échoués ==========
            // Quand un provider fait son KYC PayPal, on relance automatiquement
            // tous les payouts qui avaient échoué précédemment
            try {
              const failedPayoutsSnapshot = await db.collection("failed_payouts_alerts")
                .where("providerId", "==", trackingId)
                .where("status", "in", ["pending", "failed", "max_retries_reached"])
                .get();

              if (!failedPayoutsSnapshot.empty) {
                console.log(`🔄 [PAYPAL] Found ${failedPayoutsSnapshot.size} failed payouts to retry for ${trackingId}`);

                const { schedulePayoutRetryTask } = await import("./lib/payoutRetryTasks");

                for (const doc of failedPayoutsSnapshot.docs) {
                  const payout = doc.data();

                  // Reset le statut et programmer un retry
                  await doc.ref.update({
                    status: "pending_retry_after_kyc",
                    kycCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    retryCount: 0, // Reset le compteur
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  // Programmer le retry via Cloud Tasks
                  await schedulePayoutRetryTask({
                    failedPayoutAlertId: doc.id,
                    orderId: payout.orderId,
                    callSessionId: payout.callSessionId,
                    providerId: trackingId,
                    providerPayPalEmail: payout.providerPayPalEmail,
                    amount: payout.amount,
                    currency: payout.currency,
                    retryCount: 0, // Reset pour avoir 3 nouvelles tentatives
                  });

                  console.log(`📋 [PAYPAL] Scheduled retry for payout ${doc.id}`);
                }

                // Alerte admin
                await db.collection("admin_alerts").add({
                  type: "paypal_kyc_retry_triggered",
                  priority: "medium",
                  title: "KYC PayPal complété - Payouts relancés",
                  message: `Le provider ${trackingId} a complété son KYC PayPal. ${failedPayoutsSnapshot.size} payout(s) échoué(s) ont été reprogrammés.`,
                  providerId: trackingId,
                  merchantId: merchantId,
                  payoutsRetried: failedPayoutsSnapshot.size,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            } catch (retryError) {
              console.error("❌ [PAYPAL] Error retrying failed payouts after KYC:", retryError);
              // Ne pas faire échouer le webhook pour autant
              await db.collection("admin_alerts").add({
                type: "paypal_kyc_retry_error",
                priority: "high",
                title: "Erreur retry payouts après KYC",
                message: `Erreur lors de la relance des payouts pour ${trackingId}: ${retryError instanceof Error ? retryError.message : "Unknown"}`,
                providerId: trackingId,
                error: retryError instanceof Error ? retryError.message : "Unknown",
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          break;

        // ===== GESTION DES DISPUTES PAYPAL =====
        // Note: Les providers sont payés via Stripe Connect, pas PayPal.
        // Donc les disputes PayPal sont entre client et SOS-Expat uniquement.
        // Pas besoin de bloquer la balance du provider.
        case "CUSTOMER.DISPUTE.CREATED":
          // Un litige a été ouvert - juste logger et alerter l'admin
          const disputeCreated = event.resource;
          console.log("⚠️ [PAYPAL] Dispute created:", disputeCreated?.dispute_id);

          if (disputeCreated?.dispute_id) {
            const disputeAmount = disputeCreated.dispute_amount?.value || 0;
            const disputeCurrency = disputeCreated.dispute_amount?.currency_code || "EUR";
            const disputeReason = disputeCreated.reason || "UNKNOWN";
            const transactionId = disputeCreated.disputed_transactions?.[0]?.seller_transaction_id;

            // Créer un record de dispute (pour suivi)
            const disputeDocRef = await db.collection("disputes").add({
              type: "paypal",
              disputeId: disputeCreated.dispute_id,
              status: disputeCreated.status || "OPEN",
              reason: disputeReason,
              amount: parseFloat(disputeAmount),
              currency: disputeCurrency,
              transactionId: transactionId || null,
              paypalData: disputeCreated,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Créer une alerte admin critique
            await db.collection("admin_alerts").add({
              type: "paypal_dispute_created",
              priority: "critical",
              title: "🚨 Nouveau litige PayPal",
              message: `Un litige de ${disputeAmount} ${disputeCurrency} a été ouvert. Raison: ${disputeReason}. Transaction: ${transactionId || 'N/A'}`,
              disputeId: disputeCreated.dispute_id,
              disputeDocId: disputeDocRef.id,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log("✅ [PAYPAL] Dispute recorded:", disputeCreated.dispute_id);
          }
          break;

        case "CUSTOMER.DISPUTE.UPDATED":
          // Mise à jour du litige
          const disputeUpdated = event.resource;
          console.log("📋 [PAYPAL] Dispute updated:", disputeUpdated?.dispute_id);

          if (disputeUpdated?.dispute_id) {
            // Mettre à jour le record existant
            const disputesQuery = await db.collection("disputes")
              .where("disputeId", "==", disputeUpdated.dispute_id)
              .limit(1)
              .get();

            if (!disputesQuery.empty) {
              const disputeDoc = disputesQuery.docs[0];
              await disputeDoc.ref.update({
                status: disputeUpdated.status,
                paypalData: disputeUpdated,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          break;

        case "CUSTOMER.DISPUTE.RESOLVED":
          // Litige résolu - juste mettre à jour le record et alerter l'admin
          const disputeResolved = event.resource;
          console.log("✅ [PAYPAL] Dispute resolved:", disputeResolved?.dispute_id);

          if (disputeResolved?.dispute_id) {
            const outcome = disputeResolved.dispute_outcome?.outcome_code || "UNKNOWN";
            const isWon = outcome !== "RESOLVED_BUYER_FAVOUR";

            // Mettre à jour le record de dispute
            const resolvedQuery = await db.collection("disputes")
              .where("disputeId", "==", disputeResolved.dispute_id)
              .limit(1)
              .get();

            if (!resolvedQuery.empty) {
              await resolvedQuery.docs[0].ref.update({
                status: "RESOLVED",
                outcome: outcome,
                isWon: isWon,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                paypalData: disputeResolved,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Alerte admin
            await db.collection("admin_alerts").add({
              type: "paypal_dispute_resolved",
              priority: isWon ? "medium" : "critical",
              title: isWon ? "✅ Litige PayPal gagné" : "❌ Litige PayPal perdu",
              message: `Le litige ${disputeResolved.dispute_id} a été ${isWon ? "gagné" : "perdu"}. Résultat: ${outcome}.`,
              disputeId: disputeResolved.dispute_id,
              outcome,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;

        // ========== P0-4 FIX: HANDLERS PAYOUT.ITEM.* ==========
        // Ces événements sont critiques pour le suivi des payouts vers les providers

        case "PAYOUT.ITEM.SUCCEEDED":
        case "PAYOUTS.ITEM.SUCCESS":
          // Payout réussi
          const successItem = event.resource;
          console.log("✅ [PAYPAL] Payout succeeded:", successItem?.payout_item_id);

          if (successItem?.payout_batch_id) {
            // Mettre à jour le payout dans Firestore
            const successQuery = await db.collection("paypal_payouts")
              .where("payoutBatchId", "==", successItem.payout_batch_id)
              .limit(1)
              .get();

            if (!successQuery.empty) {
              const payoutDoc = successQuery.docs[0];
              await payoutDoc.ref.update({
                status: "SUCCESS",
                transactionStatus: successItem.transaction_status || "SUCCESS",
                transactionId: successItem.transaction_id,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Récupérer les infos du provider pour notification
              const payoutData = payoutDoc.data();
              if (payoutData?.providerId) {
                // Notification au provider
                await db.collection("notifications").add({
                  userId: payoutData.providerId,
                  type: "payout_success",
                  title: "Paiement reçu",
                  message: `Vous avez reçu ${payoutData.amount} ${payoutData.currency} sur votre compte PayPal.`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
          }
          break;

        case "PAYOUT.ITEM.BLOCKED":
          // Payout bloqué - nécessite une vérification
          const blockedItem = event.resource;
          console.log("🚫 [PAYPAL] Payout BLOCKED:", blockedItem?.payout_item_id);

          if (blockedItem?.payout_batch_id) {
            await handlePayoutFailure(db, blockedItem, "BLOCKED", "Payout blocked by PayPal for review");
          }
          break;

        case "PAYOUT.ITEM.CANCELED":
          // Payout annulé
          const canceledItem = event.resource;
          console.log("❌ [PAYPAL] Payout CANCELED:", canceledItem?.payout_item_id);

          if (canceledItem?.payout_batch_id) {
            await handlePayoutFailure(db, canceledItem, "CANCELED", "Payout was canceled");
          }
          break;

        case "PAYOUT.ITEM.DENIED":
          // Payout refusé
          const deniedItem = event.resource;
          console.log("🚨 [PAYPAL] Payout DENIED:", deniedItem?.payout_item_id);

          if (deniedItem?.payout_batch_id) {
            await handlePayoutFailure(db, deniedItem, "DENIED", deniedItem?.errors?.[0]?.message || "Payout denied by PayPal");
          }
          break;

        case "PAYOUT.ITEM.FAILED":
          // Payout échoué
          const failedItem = event.resource;
          console.log("💥 [PAYPAL] Payout FAILED:", failedItem?.payout_item_id);

          if (failedItem?.payout_batch_id) {
            await handlePayoutFailure(db, failedItem, "FAILED", failedItem?.errors?.[0]?.message || "Payout failed");
          }
          break;

        case "PAYOUT.ITEM.HELD":
          // Payout en attente de vérification
          const heldItem = event.resource;
          console.log("⏸️ [PAYPAL] Payout HELD:", heldItem?.payout_item_id);

          if (heldItem?.payout_batch_id) {
            const heldQuery = await db.collection("paypal_payouts")
              .where("payoutBatchId", "==", heldItem.payout_batch_id)
              .limit(1)
              .get();

            if (!heldQuery.empty) {
              await heldQuery.docs[0].ref.update({
                status: "HELD",
                heldReason: heldItem.errors?.[0]?.message || "Under review",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Alerte admin
            await db.collection("admin_alerts").add({
              type: "paypal_payout_held",
              priority: "high",
              title: "Payout PayPal en attente",
              message: `Un payout de ${heldItem.payout_item?.amount?.value || 'N/A'} est en attente de vérification PayPal.`,
              payoutBatchId: heldItem.payout_batch_id,
              payoutItemId: heldItem.payout_item_id,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;

        case "PAYOUT.ITEM.REFUNDED":
          // Payout remboursé (rare)
          const refundedItem = event.resource;
          console.log("💸 [PAYPAL] Payout REFUNDED:", refundedItem?.payout_item_id);

          if (refundedItem?.payout_batch_id) {
            const refundQuery = await db.collection("paypal_payouts")
              .where("payoutBatchId", "==", refundedItem.payout_batch_id)
              .limit(1)
              .get();

            if (!refundQuery.empty) {
              await refundQuery.docs[0].ref.update({
                status: "REFUNDED",
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Alerte critique - rare mais important
            await db.collection("admin_alerts").add({
              type: "paypal_payout_refunded",
              priority: "critical",
              title: "🚨 Payout PayPal remboursé",
              message: `Un payout a été remboursé. Vérification requise.`,
              payoutBatchId: refundedItem.payout_batch_id,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;

        case "PAYOUT.ITEM.RETURNED":
          // Payout retourné (email invalide, compte fermé, etc.)
          const returnedItem = event.resource;
          console.log("🔄 [PAYPAL] Payout RETURNED:", returnedItem?.payout_item_id);

          if (returnedItem?.payout_batch_id) {
            await handlePayoutFailure(db, returnedItem, "RETURNED", "Payout returned - recipient may have rejected or email is invalid");
          }
          break;

        case "PAYOUT.ITEM.UNCLAIMED":
          // Payout non réclamé (email non associé à un compte PayPal)
          const unclaimedItem = event.resource;
          console.log("📬 [PAYPAL] Payout UNCLAIMED:", unclaimedItem?.payout_item_id);

          if (unclaimedItem?.payout_batch_id) {
            const unclaimedQuery = await db.collection("paypal_payouts")
              .where("payoutBatchId", "==", unclaimedItem.payout_batch_id)
              .limit(1)
              .get();

            if (!unclaimedQuery.empty) {
              const payoutDoc = unclaimedQuery.docs[0];
              const payoutData = payoutDoc.data();

              await payoutDoc.ref.update({
                status: "UNCLAIMED",
                unclaimedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Notifier le provider qu'il doit créer/vérifier son compte PayPal
              if (payoutData?.providerId) {
                await db.collection("notifications").add({
                  userId: payoutData.providerId,
                  type: "payout_unclaimed",
                  title: "Paiement en attente",
                  message: `Un paiement de ${payoutData.amount} ${payoutData.currency} attend d'être réclamé. Vérifiez que votre email PayPal est correct et que votre compte est actif.`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }

              // Alerte admin
              await db.collection("admin_alerts").add({
                type: "paypal_payout_unclaimed",
                priority: "medium",
                title: "Payout PayPal non réclamé",
                message: `Un payout de ${payoutData?.amount || 'N/A'} ${payoutData?.currency || 'EUR'} n'a pas été réclamé. L'email PayPal est peut-être invalide.`,
                payoutBatchId: unclaimedItem.payout_batch_id,
                providerId: payoutData?.providerId,
                providerEmail: payoutData?.providerPayPalEmail,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          break;

        // ========== FIN P0-4 FIX ==========

        default:
          console.log("📋 [PAYPAL] Unhandled event type:", eventType);
      }

      // P0 FIX 2026-02-12: Mark webhook event as completed for proper idempotence
      // Without this, retried events are rejected as duplicates even if previous processing failed
      await webhookEventRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.paypal.success(eventType, event.id, {
        resourceId: event.resource?.id,
        resourceType: event.resource_type,
      });

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ [PAYPAL] Webhook error:", error);

      // P0 FIX 2026-02-12: Mark as failed so retries can re-process
      try {
        const failedWebhookKey = `paypal_${(error as any)?.eventId || req.body?.id || 'unknown'}`;
        const failedRef = admin.firestore().collection("processed_webhook_events").doc(failedWebhookKey);
        await failedRef.update({
          status: "failed",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (updateErr) {
        // Ignore update error - don't mask the original error
      }

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.paypal.error(req.body?.event_type || 'unknown', error as Error, {
        eventId: req.body?.id,
        resourceId: req.body?.resource?.id,
      });

      res.status(500).send("Webhook processing failed");
    }
  }
);

/**
 * Effectue un payout vers un prestataire (admin only)
 */
export const createPayPalPayout = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can create payouts");
    }

    const { providerId, amount, currency, sessionId, note } = request.data;

    if (!providerId || !amount || !sessionId) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    // Récupérer l'email PayPal du prestataire
    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerData = providerDoc.data();

    if (!providerData?.paypalEmail && !providerData?.email) {
      throw new HttpsError(
        "failed-precondition",
        "Provider has no PayPal email configured"
      );
    }

    const manager = new PayPalManager();

    try {
      const result = await manager.createPayout({
        providerId,
        providerPayPalEmail: providerData.paypalEmail || providerData.email,
        amount,
        currency: currency || "EUR",
        sessionId,
        note,
      });

      return result;
    } catch (error) {
      console.error("Error creating PayPal payout:", error);
      throw new HttpsError("internal", "Failed to create payout");
    }
  }
);

/**
 * Vérifie le statut d'un payout (admin only)
 */
export const checkPayPalPayoutStatus = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { payoutBatchId } = request.data;

    if (!payoutBatchId) {
      throw new HttpsError("invalid-argument", "payoutBatchId is required");
    }

    const manager = new PayPalManager();

    try {
      const result = await manager.getPayoutStatus(payoutBatchId);
      return { success: true, ...result };
    } catch (error) {
      console.error("Error checking payout status:", error);
      throw new HttpsError("internal", "Failed to check payout status");
    }
  }
);

/**
 * Utilitaire: Détermine le gateway recommandé pour un pays
 */
export const getRecommendedPaymentGateway = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    const { countryCode } = request.data || {};

    if (!countryCode) {
      throw new HttpsError("invalid-argument", "countryCode is required");
    }

    const gateway = PayPalManager.getRecommendedGateway(countryCode);
    const isPayPalOnly = PayPalManager.isPayPalOnlyCountry(countryCode);

    return {
      gateway,
      isPayPalOnly,
      countryCode: countryCode.toUpperCase(),
    };
  }
);

// Export de la config
export { PAYPAL_CONFIG };
