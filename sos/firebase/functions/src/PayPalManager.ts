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

// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  PAYPAL_PLATFORM_MERCHANT_ID,
  PAYPAL_MODE,
  PAYPAL_SECRETS,
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
   * Check if a provider is AAA and determine payout behavior
   * - AAA + internal mode → Skip payout (money stays on platform)
   * - AAA + external mode → Use consolidated AAA account
   * - Non-AAA → Normal payout flow
   */
  async getAaaPayoutDecision(providerId: string): Promise<AaaPayoutDecision> {
    try {
      // Get provider document
      const providerDoc = await this.db.collection("sos_profiles").doc(providerId).get();
      const provider = providerDoc.data();

      if (!provider || !provider.isAAA) {
        return {
          isAAA: false,
          mode: "external",
          skipPayout: false,
          reason: "Not an AAA profile - normal payout flow",
        };
      }

      // Provider is AAA - check payout mode
      const aaaPayoutMode = provider.aaaPayoutMode || "internal";

      if (aaaPayoutMode === "internal") {
        console.log(`💼 [AAA] Provider ${providerId} is AAA with INTERNAL mode - skipping payout`);
        return {
          isAAA: true,
          mode: "internal",
          skipPayout: true,
          reason: "AAA profile with internal mode - money stays on SOS-Expat",
        };
      }

      // External mode - get the consolidated AAA account
      const configDoc = await this.db.collection("admin_config").doc("aaa_payout").get();
      const config = configDoc.data() as AaaPayoutConfig | undefined;

      if (!config || !config.externalAccounts || config.externalAccounts.length === 0) {
        console.warn(`⚠️ [AAA] No external accounts configured - falling back to internal`);
        return {
          isAAA: true,
          mode: "internal",
          skipPayout: true,
          reason: "AAA profile but no external accounts configured - fallback to internal",
        };
      }

      // Find the external account
      const externalAccount = config.externalAccounts.find(
        (acc) => acc.id === aaaPayoutMode && acc.isActive
      );

      if (!externalAccount) {
        console.warn(`⚠️ [AAA] External account ${aaaPayoutMode} not found or inactive - falling back to internal`);
        return {
          isAAA: true,
          mode: "internal",
          skipPayout: true,
          reason: `External account ${aaaPayoutMode} not found - fallback to internal`,
        };
      }

      console.log(`💼 [AAA] Provider ${providerId} is AAA with EXTERNAL mode → ${externalAccount.name}`);
      return {
        isAAA: true,
        mode: "external",
        skipPayout: false,
        externalAccount,
        reason: `AAA profile routing to ${externalAccount.name} (${externalAccount.gateway})`,
      };
    } catch (error) {
      console.error(`❌ [AAA] Error checking AAA status for ${providerId}:`, error);
      // On error, fallback to internal (safer)
      return {
        isAAA: false,
        mode: "internal",
        skipPayout: false,
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
      return this.accessToken;
    }

    console.log("🔑 [PAYPAL] Getting new access token");

    // P0 FIX: Use centralized getters for secrets
    const clientId = getPayPalClientId();
    const clientSecret = getPayPalClientSecret();

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
      console.error("❌ [PAYPAL] Token error:", error);
      throw new Error(`PayPal authentication failed: ${error}`);
    }

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
    console.log("📦 [PAYPAL] Creating SIMPLE order (Payouts flow) for session:", data.callSessionId);
    console.log(`📦 [PAYPAL] Total: ${data.amount} ${data.currency} | Platform keeps: ${data.platformFee} | Provider will receive via Payout: ${data.providerAmount}`);

    const totalAmount = data.amount.toFixed(2);

    // Ordre simple: l'argent va à SOS-Expat, pas de split automatique
    const orderData = {
      intent: "CAPTURE",
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
        user_action: "PAY_NOW",
        return_url: `${PAYPAL_CONFIG.RETURN_URL}?sessionId=${data.callSessionId}`,
        cancel_url: `${PAYPAL_CONFIG.CANCEL_URL}?sessionId=${data.callSessionId}`,
      },
    };

    const response = await this.apiRequest<PayPalOrder>(
      "POST",
      "/v2/checkout/orders",
      orderData
    );

    const approvalUrl = response.links?.find((l: any) => l.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL in PayPal response");
    }

    // Sauvegarder l'ordre avec le flag "simpleFlow" pour déclencher le payout après capture
    await this.db.collection("paypal_orders").doc(response.id).set({
      orderId: response.id,
      callSessionId: data.callSessionId,
      clientId: data.clientId,
      providerId: data.providerId,
      providerPayPalEmail: data.providerPayPalEmail, // Email pour le payout
      amount: data.amount,
      providerAmount: data.providerAmount,
      platformFee: data.platformFee,
      currency: data.currency,
      status: response.status,
      approvalUrl,
      simpleFlow: true, // Flag pour déclencher le payout après capture
      payoutStatus: "pending", // En attente du payout
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // P0 FIX: Créer ou mettre à jour la session d'appel (utiliser set avec merge au lieu de update)
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
        paymentFlow: "simple_payout",
        status: "pending_approval",
        amount: data.amount,
        currency: data.currency,
      },
      participants: {
        provider: {
          id: data.providerId,
          type: "provider",
        },
        client: {
          id: data.clientId,
          type: "client",
        },
      },
      metadata: {
        providerId: data.providerId,
        clientId: data.clientId,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("✅ [PAYPAL] Simple order created:", response.id);

    return {
      orderId: response.id,
      approvalUrl,
      status: response.status,
    };
  }

  /**
   * Cree un ordre PayPal avec PAIEMENT DIRECT au provider
   *
   * FLUX DE PAIEMENT DIRECT (PayPal Commerce Platform):
   * ====================================================
   * 1. Le client paie le montant total (ex: 100 EUR)
   * 2. L'argent va DIRECTEMENT sur le compte PayPal du provider (payee.merchant_id)
   * 3. SOS-Expat recoit uniquement sa commission via platform_fees (ex: 20 EUR)
   * 4. Le provider recoit le reste (ex: 80 EUR) instantanement
   *
   * Avantages:
   * - Pas de transit par la plateforme SOS-Expat
   * - Provider recoit son argent immediatement apres capture
   * - Conforme aux regulations (pas de retention de fonds par la plateforme)
   * - Split automatique gere par PayPal
   *
   * Configuration requise:
   * - PAYPAL_PLATFORM_MERCHANT_ID: Merchant ID du compte SOS-Expat
   * - Le provider doit avoir complete l'onboarding PayPal Commerce Platform
   *
   * NOTE: Ce flux nécessite le statut Partner PayPal. Si vous n'avez pas
   * ce statut, utilisez createSimpleOrder() à la place.
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

    const orderData = {
      intent: "CAPTURE",
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
        user_action: "PAY_NOW",
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // P0 FIX: Créer ou mettre à jour la session d'appel (utiliser set avec merge au lieu de update)
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
        currency: data.currency,
      },
      participants: {
        provider: {
          id: data.providerId,
          type: "provider",
        },
        client: {
          id: data.clientId,
          type: "client",
        },
      },
      metadata: {
        providerId: data.providerId,
        clientId: data.clientId,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("✅ [PAYPAL] Order created:", response.id);

    return {
      orderId: response.id,
      approvalUrl,
      status: response.status,
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
    console.log(`💳 [PAYPAL] Flow type: ${isSimpleFlow ? "SIMPLE (Payout)" : "DIRECT (Split)"}`);

    // Effectuer la capture
    const response = await this.apiRequest<any>(
      "POST",
      `/v2/checkout/orders/${orderId}/capture`,
      {}
    );

    const capture = response.purchase_units?.[0]?.payments?.captures?.[0];
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

    const providerAmount = isSimpleFlow
      ? (orderData.providerAmount || grossAmount - connectionFeeAmount)
      : (sellerReceivableBreakdown?.net_amount?.value
        ? parseFloat(sellerReceivableBreakdown.net_amount.value)
        : grossAmount - connectionFeeAmount);

    console.log(`💳 [PAYPAL] Capture completed - Total: ${grossAmount} ${captureCurrency}, Frais de mise en relation: ${connectionFeeAmount}, Provider: ${providerAmount}`);

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
      // AAA Internal Mode: Skip payout - money stays on platform
      if (aaaDecision?.skipPayout) {
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
      // P0 FIX: PLANIFIER L'APPEL TWILIO APRÈS CAPTURE PAYPAL
      // ========================================
      // Importer et utiliser scheduleCallTaskWithIdempotence pour éviter les doublons
      try {
        const { scheduleCallTaskWithIdempotence } = await import("./lib/tasks");
        const CALL_DELAY_SECONDS = 60; // 1 minute de délai

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

    if (!ordersQuery.empty) {
      const orderData = ordersQuery.docs[0].data();

      // Vérifier si le remboursement est bloqué
      if (orderData.refundBlocked && !forceRefund) {
        console.warn(`🚫 [PAYPAL] Refund BLOCKED for capture ${captureId}: ${orderData.refundBlockReason}`);

        // Logger la tentative de remboursement bloquée
        await this.db.collection("refund_attempts_blocked").add({
          captureId,
          orderId: orderData.orderId,
          callSessionId: orderData.callSessionId,
          providerId: orderData.providerId,
          clientId: orderData.clientId,
          amount: amount || orderData.capturedGrossAmount,
          reason,
          blockReason: orderData.refundBlockReason || "Service has been delivered",
          attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: false,
          refundId: "",
          status: "BLOCKED",
          blocked: true,
          blockReason: orderData.refundBlockReason || "Le remboursement est impossible car la prestation a été effectuée.",
        };
      }

      // Vérifier si le service a été délivré via la session d'appel
      if (orderData.callSessionId) {
        const sessionDoc = await this.db.collection("call_sessions").doc(orderData.callSessionId).get();
        const sessionData = sessionDoc.data();

        if (sessionData?.status === "completed" || sessionData?.payment?.serviceDelivered) {
          if (!forceRefund) {
            console.warn(`🚫 [PAYPAL] Refund BLOCKED: Call session ${orderData.callSessionId} is completed`);

            await this.db.collection("refund_attempts_blocked").add({
              captureId,
              orderId: orderData.orderId,
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
      }
    }

    // Si on arrive ici, le remboursement est autorisé
    console.log("💸 [PAYPAL] Refund authorized, processing...");

    // P1-4 SECURITY FIX: Valider que le montant de remboursement <= montant capturé
    // Empêche les remboursements supérieurs au paiement original
    if (amount !== undefined && !ordersQuery.empty) {
      const orderData = ordersQuery.docs[0].data();
      const capturedAmount = orderData.capturedGrossAmount || orderData.amount || 0;

      if (amount > capturedAmount) {
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

    const response = await this.apiRequest<any>(
      "POST",
      `/v2/payments/captures/${captureId}/refund`,
      Object.keys(refundData).length > 0 ? refundData : {}
    );

    console.log("✅ [PAYPAL] Refund processed:", response.id);

    return {
      success: response.status === "COMPLETED",
      refundId: response.id,
      status: response.status,
    };
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
      const orderDetails = await this.apiRequest<any>(
        "GET",
        `/v2/checkout/orders/${orderId}`,
        {}
      );

      const paypalStatus = orderDetails.status;
      console.log(`📋 [PAYPAL] Current order status: ${paypalStatus}`);

      // Si l'ordre est APPROVED (autorisé mais non capturé), on peut l'annuler
      if (paypalStatus === "APPROVED" || paypalStatus === "CREATED") {
        // PayPal Orders API: Pour annuler un ordre non capturé, on utilise
        // l'endpoint /v2/checkout/orders/{id} avec la méthode POST et action=void
        // Mais en réalité, PayPal n'a pas de "void" direct pour les ordres.
        // La méthode correcte est de ne PAS capturer et laisser expirer,
        // OU d'utiliser l'API authorizations si on avait fait une autorisation explicite.

        // Pour les ordres PAY_NOW (capture immédiate après approval), ils sont auto-capturés.
        // Pour les ordres AUTHORIZE (capture différée), on peut void l'autorisation.

        // Vérifier s'il y a une autorisation à annuler
        const purchaseUnit = orderDetails.purchase_units?.[0];
        const authorizationId = purchaseUnit?.payments?.authorizations?.[0]?.id;

        if (authorizationId) {
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
              refundedAt: admin.firestore.FieldValue.serverTimestamp(),
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
              refundedAt: admin.firestore.FieldValue.serverTimestamp(),
              refundReason: reason || "Order cancelled - will expire automatically",
            });
          }

          return {
            success: true,
            status: "CANCELLED",
            message: "Ordre marqué comme annulé - expirera automatiquement",
          };
        }
      } else if (paypalStatus === "COMPLETED") {
        // L'ordre a été capturé entre-temps
        console.warn(`⚠️ [PAYPAL] Order ${orderId} was captured in the meantime`);
        return {
          success: false,
          status: "ALREADY_CAPTURED",
          message: "L'ordre a été capturé entre-temps",
        };
      } else {
        // Statut inconnu ou déjà terminé
        console.log(`⚠️ [PAYPAL] Order ${orderId} in unexpected state: ${paypalStatus}`);
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
    region: "europe-west1",
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
    region: "europe-west1",
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
    region: "europe-west1",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID, PAYPAL_PLATFORM_MERCHANT_ID],
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

    // Déterminer le flux à utiliser
    const hasMerchantId = !!providerData.paypalMerchantId;
    const hasPayPalEmail = !!providerData.paypalEmail;

    if (!hasMerchantId && !hasPayPalEmail) {
      throw new HttpsError(
        "failed-precondition",
        "Le prestataire n'a pas configuré son compte PayPal. Il doit d'abord entrer son email PayPal dans son profil."
      );
    }

    // ===== P0 SECURITY FIX: Calculer les frais côté serveur =====
    const normalizedCurrency = (currency || "EUR").toLowerCase() as "eur" | "usd";
    const normalizedServiceType = (serviceType || providerData.type || "expat") as "lawyer" | "expat";

    // Récupérer la configuration de prix du serveur
    const serverPricing = await getServiceAmounts(normalizedServiceType, normalizedCurrency);

    // Valider que le montant correspond à la configuration serveur
    const clientAmount = typeof amount === "number" ? amount : parseFloat(amount);

    if (Math.abs(clientAmount - serverPricing.totalAmount) > 0.01) {
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
    console.log(`[PAYPAL] Flow: ${hasMerchantId ? "DIRECT (split)" : "SIMPLE (payout)"}`);

    const manager = new PayPalManager();

    try {
      let result;

      if (hasMerchantId) {
        // ===== FLUX DIRECT: Split automatique via PayPal Commerce Platform =====
        console.log(`[PAYPAL] Using DIRECT flow with merchantId: ${providerData.paypalMerchantId}`);

        result = await manager.createOrder({
          callSessionId,
          amount: serverPricing.totalAmount,
          providerAmount: serverProviderAmount,
          platformFee: serverConnectionFee, // Sera renommé en connectionFee plus tard
          currency: normalizedCurrency.toUpperCase(),
          providerId,
          providerPayPalMerchantId: providerData.paypalMerchantId,
          clientId: request.auth.uid,
          description: description || "SOS Expat - Consultation",
        });

      } else {
        // ===== FLUX SIMPLE: Payout après capture =====
        console.log(`[PAYPAL] Using SIMPLE flow with email: ${providerData.paypalEmail}`);

        result = await manager.createSimpleOrder({
          callSessionId,
          amount: serverPricing.totalAmount,
          providerAmount: serverProviderAmount,
          platformFee: serverConnectionFee,
          currency: normalizedCurrency.toUpperCase(),
          providerId,
          providerPayPalEmail: providerData.paypalEmail,
          clientId: request.auth.uid,
          description: description || "SOS Expat - Consultation",
        });
      }

      // Log de succès
      prodLogger.info('PAYPAL_ORDER_SUCCESS', `[${requestId}] PayPal order created successfully`, {
        requestId,
        orderId: result.orderId,
        callSessionId,
        flow: hasMerchantId ? "direct" : "simple",
        amount: serverPricing.totalAmount,
        currency: normalizedCurrency,
      });

      return {
        success: true,
        ...result,
        flow: hasMerchantId ? "direct" : "simple",
      };

    } catch (error) {
      prodLogger.error('PAYPAL_ORDER_ERROR', `[${requestId}] PayPal order creation failed`, {
        requestId,
        callSessionId,
        providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("Error creating PayPal order:", error);
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
    region: "europe-west1",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
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

    // Chercher le paiement associé à cet orderId
    const paymentQuery = await db
      .collection("payments")
      .where("paypalOrderId", "==", orderId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      console.error(`[PAYPAL] No payment found for order ${orderId}`);
      throw new HttpsError("not-found", "Payment not found for this order");
    }

    const paymentDoc = paymentQuery.docs[0];
    const paymentData = paymentDoc.data();

    // Vérifier que l'utilisateur actuel est le client qui a créé le paiement
    if (paymentData.clientId !== request.auth.uid) {
      console.error(`[PAYPAL] Ownership check failed: order=${orderId}, ` +
        `owner=${paymentData.clientId}, requester=${request.auth.uid}`);
      throw new HttpsError(
        "permission-denied",
        "You are not authorized to capture this order"
      );
    }

    // P2-2 FIX: Vérifier que le paiement n'a pas déjà été capturé
    if (isPaymentCompleted(paymentData.status)) {
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
      });
      console.error("Error capturing PayPal order:", error);
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
    region: "europe-west1",
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
        console.log(`⚠️ [PAYPAL] IDEMPOTENCY: Event ${event.id} already processed, skipping`);
        res.status(200).json({ received: true, duplicate: true, eventId: event.id });
        return;
      }

      // Mark event as being processed BEFORE processing (prevents race conditions)
      await webhookEventRef.set({
        eventKey: webhookKey,
        eventId: event.id,
        eventType,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
        source: "paypal_webhook",
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
              await db.collection("call_sessions").doc(orderData.callSessionId).update({
                "payment.status": "captured",
                "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
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

                  // Calculer le montant provider (61% comme Stripe)
                  const providerRefundAmount = refundAmount * 0.61;

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

      // ===== PRODUCTION TEST LOG =====
      logWebhookTest.paypal.success(eventType, event.id, {
        resourceId: event.resource?.id,
        resourceType: event.resource_type,
      });

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ [PAYPAL] Webhook error:", error);

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
    region: "europe-west1",
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

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
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
    region: "europe-west1",
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
    region: "europe-west1",
    cors: ["https://sos-expat.com", "https://www.sos-expat.com", "https://ia.sos-expat.com", "https://outil-sos-expat.pages.dev", "http://localhost:5173"]
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
