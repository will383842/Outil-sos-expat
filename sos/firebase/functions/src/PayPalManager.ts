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
import { defineSecret, defineString } from "firebase-functions/params";

// Secrets PayPal
export const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
export const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
export const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
export const PAYPAL_PARTNER_ID = defineSecret("PAYPAL_PARTNER_ID");
// Merchant ID de la plateforme SOS-Expat pour recevoir les frais de plateforme
export const PAYPAL_PLATFORM_MERCHANT_ID = defineSecret("PAYPAL_PLATFORM_MERCHANT_ID");

// Mode PayPal: "sandbox" pour les tests, "live" pour la production
export const PAYPAL_MODE = defineString("PAYPAL_MODE", { default: "sandbox" });

// Configuration
const PAYPAL_CONFIG = {
  // URLs selon l'environnement
  SANDBOX_URL: "https://api-m.sandbox.paypal.com",
  LIVE_URL: "https://api-m.paypal.com",

  // Mode (sandbox ou live)
  get MODE(): "sandbox" | "live" {
    const mode = PAYPAL_MODE.value();
    return mode === "live" ? "live" : "sandbox";
  },

  get BASE_URL(): string {
    return this.MODE === "live" ? this.LIVE_URL : this.SANDBOX_URL;
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

    // ===== EUROPE DE L'EST & BALKANS (15 pays non Stripe) =====
    "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU",
    "GI", "AD", "MC", "SM", "VA",

    // ===== OCEANIE & PACIFIQUE (15 pays) =====
    "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW",
    "NR", "TV", "NC", "PF", "GU",

    // ===== MOYEN-ORIENT (7 pays restants) =====
    "IQ", "IR", "SY", "SA", "LY", "TM", "AF",
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
   * Obtient un token d'accès PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Vérifier si le token est encore valide
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log("🔑 [PAYPAL] Getting new access token");

    const clientId = PAYPAL_CLIENT_ID.value();
    const clientSecret = PAYPAL_CLIENT_SECRET.value();

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
   * Effectue une requête à l'API PayPal
   */
  private async apiRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PAYPAL_CONFIG.BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Partner-Attribution-Id": PAYPAL_PARTNER_ID.value() || "SOS-Expat_SP",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ [PAYPAL] API error (${endpoint}):`, error);
      throw new Error(`PayPal API error: ${error}`);
    }

    return response.json() as Promise<T>;
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
      partnerId: PAYPAL_PARTNER_ID.value() || "",
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
      const partnerId = PAYPAL_PARTNER_ID.value();
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
    const platformMerchantId = PAYPAL_PLATFORM_MERCHANT_ID.value();
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

    // ===== FLUX SIMPLE: Déclencher le Payout automatiquement =====
    if (isSimpleFlow && orderData.providerPayPalEmail && providerAmount > 0) {
      console.log(`💰 [PAYPAL] Triggering automatic payout to ${orderData.providerPayPalEmail}`);

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
          // Ne pas bloquer - l'alerte admin a été créée, ils peuvent intervenir manuellement
        }
      }
    }

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
      await this.db.collection("call_sessions").doc(orderData.callSessionId).update({
        "payment.status": "captured",
        "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
        "payment.paypalCaptureId": capture?.id,
        "payment.paymentFlow": isSimpleFlow ? "simple_payout" : "direct_split",
        "payment.providerPaidDirectly": !isSimpleFlow,
        "payment.providerAmount": providerAmount,
        "payment.connectionFee": connectionFeeAmount,
        "payment.payoutTriggered": payoutTriggered,
        "payment.payoutId": payoutId || null,
        // Protection remboursement
        "payment.serviceDelivered": true,
        "payment.refundBlocked": true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ========================================
      // P0 FIX: PLANIFIER L'APPEL TWILIO APRÈS CAPTURE PAYPAL
      // ========================================
      // Importer et utiliser scheduleCallTaskWithIdempotence pour éviter les doublons
      try {
        const { scheduleCallTaskWithIdempotence } = await import("./lib/tasks");
        const CALL_DELAY_SECONDS = 240; // 4 minutes de délai

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
      // Créer un batch de payout (PayPal exige un batch même pour un seul paiement)
      const payoutData = {
        sender_batch_header: {
          sender_batch_id: `payout_${data.sessionId}_${Date.now()}`,
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

      return {
        success: true,
        ...result,
        flow: hasMerchantId ? "direct" : "simple",
      };

    } catch (error) {
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
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { orderId } = request.data;

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

    // Vérifier que le paiement n'a pas déjà été capturé
    if (paymentData.status === "captured" || paymentData.status === "succeeded") {
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
      return result;
    } catch (error) {
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

  // Obtenir un token d'accès
  const clientId = PAYPAL_CLIENT_ID.value();
  const clientSecret = PAYPAL_CLIENT_SECRET.value();
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
 * Webhook PayPal
 */
export const paypalWebhook = onRequest(
  {
    region: "europe-west1",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID],
  },
  async (req, res) => {
    console.log("🔔 [PAYPAL] Webhook received");

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // ===== VALIDATION SIGNATURE WEBHOOK (P0 SECURITY FIX) =====
    const webhookId = PAYPAL_WEBHOOK_ID.value();
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
      // En production, on rejette. En dev/test, on peut être plus permissif
      if (process.env.NODE_ENV === "production") {
        res.status(401).send("Signature verification failed");
        return;
      }
      console.warn("⚠️ [PAYPAL] Skipping signature verification in non-production environment");
    }

    try {
      const event = req.body;
      const eventType = event.event_type;

      console.log("📨 [PAYPAL] Event type:", eventType);

      const db = admin.firestore();

      // Logger l'événement
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

          if (orderId) {
            const orderDoc = await db.collection("paypal_orders").doc(orderId).get();
            const orderData = orderDoc.data();

            if (orderData?.callSessionId) {
              await db.collection("call_sessions").doc(orderData.callSessionId).update({
                "payment.status": "captured",
                "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
          break;

        case "PAYMENT.CAPTURE.REFUNDED":
          // Remboursement effectué
          console.log("💸 [PAYPAL] Refund processed:", event.resource?.id);
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
          }
          break;

        // ===== GESTION DES DISPUTES PAYPAL =====
        case "CUSTOMER.DISPUTE.CREATED":
          // Un litige a été ouvert
          const disputeCreated = event.resource;
          console.log("⚠️ [PAYPAL] Dispute created:", disputeCreated?.dispute_id);

          if (disputeCreated?.dispute_id) {
            // Extraire les informations du litige
            const disputeAmount = disputeCreated.dispute_amount?.value || 0;
            const disputeCurrency = disputeCreated.dispute_amount?.currency_code || "EUR";
            const disputeReason = disputeCreated.reason || "UNKNOWN";
            const transactionId = disputeCreated.disputed_transactions?.[0]?.seller_transaction_id;

            // ===== P0 FIX: RÉSERVE DE BALANCE PROVIDER =====
            // Trouver le provider associé à cette transaction pour réserver les fonds
            let providerId: string | null = null;
            let reserveCreated = false;

            if (transactionId) {
              // Chercher dans paypal_orders par orderId ou transactionId
              const ordersQuery = await db.collection("paypal_orders")
                .where("status", "==", "COMPLETED")
                .limit(100)
                .get();

              // Trouver l'ordre correspondant
              for (const orderDoc of ordersQuery.docs) {
                const orderData = orderDoc.data();
                // PayPal peut utiliser différents IDs, on vérifie plusieurs champs
                if (orderData.orderId === transactionId ||
                    orderData.captureId === transactionId) {
                  providerId = orderData.providerId;
                  break;
                }
              }

              // Si on a trouvé le provider, créer une réserve de balance
              if (providerId) {
                const reserveAmount = parseFloat(disputeAmount);

                // Créer un enregistrement de réserve de balance
                await db.collection("provider_balance_adjustments").add({
                  providerId,
                  type: "dispute_reserve",
                  amount: -reserveAmount, // Montant négatif = réserve/blocage
                  currency: disputeCurrency,
                  reason: `Litige PayPal #${disputeCreated.dispute_id}`,
                  disputeId: disputeCreated.dispute_id,
                  transactionId,
                  status: "pending",
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Mettre à jour le solde bloqué du provider
                await db.collection("sos_profiles").doc(providerId).update({
                  reservedBalance: admin.firestore.FieldValue.increment(reserveAmount),
                  lastDisputeAt: admin.firestore.FieldValue.serverTimestamp(),
                  hasActiveDispute: true,
                });

                reserveCreated = true;
                console.log(`💰 [PAYPAL] Balance reserve created for provider ${providerId}: ${reserveAmount} ${disputeCurrency}`);
              }
            }

            // Créer un record de dispute
            const disputeDocRef = await db.collection("disputes").add({
              type: "paypal",
              disputeId: disputeCreated.dispute_id,
              status: disputeCreated.status || "OPEN",
              reason: disputeReason,
              amount: parseFloat(disputeAmount),
              currency: disputeCurrency,
              transactionId: transactionId || null,
              providerId: providerId || null,
              balanceReserved: reserveCreated,
              paypalData: disputeCreated,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Créer une alerte admin
            await db.collection("admin_alerts").add({
              type: "paypal_dispute_created",
              priority: "critical", // Upgraded to critical
              title: "🚨 Nouveau litige PayPal",
              message: `Un litige de ${disputeAmount} ${disputeCurrency} a été ouvert. Raison: ${disputeReason}. ${reserveCreated ? 'Balance réservée.' : 'Aucune balance réservée (provider non identifié).'}`,
              disputeId: disputeCreated.dispute_id,
              disputeDocId: disputeDocRef.id,
              providerId: providerId || null,
              balanceReserved: reserveCreated,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log("✅ [PAYPAL] Dispute recorded:", disputeCreated.dispute_id, "Balance reserved:", reserveCreated);
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
          // Litige résolu
          const disputeResolved = event.resource;
          console.log("✅ [PAYPAL] Dispute resolved:", disputeResolved?.dispute_id);

          if (disputeResolved?.dispute_id) {
            const outcome = disputeResolved.dispute_outcome?.outcome_code || "UNKNOWN";
            const isWon = outcome === "RESOLVED_BUYER_FAVOUR" ? false : true;

            // Mettre à jour le record
            const resolvedQuery = await db.collection("disputes")
              .where("disputeId", "==", disputeResolved.dispute_id)
              .limit(1)
              .get();

            let resolvedProviderId: string | null = null;
            let resolvedAmount = 0;

            if (!resolvedQuery.empty) {
              const disputeDoc = resolvedQuery.docs[0];
              const disputeData = disputeDoc.data();
              resolvedProviderId = disputeData.providerId;
              resolvedAmount = disputeData.amount || 0;

              await disputeDoc.ref.update({
                status: "RESOLVED",
                outcome: outcome,
                isWon: isWon,
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                paypalData: disputeResolved,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // ===== P0 FIX: LIBÉRER LA RÉSERVE DE BALANCE =====
              if (resolvedProviderId && disputeData.balanceReserved) {
                // Créer un ajustement pour libérer la réserve
                await db.collection("provider_balance_adjustments").add({
                  providerId: resolvedProviderId,
                  type: isWon ? "dispute_reserve_released" : "dispute_deduction",
                  amount: isWon ? resolvedAmount : 0, // Si gagné, on libère; si perdu, c'est déjà déduit
                  currency: disputeData.currency || "EUR",
                  reason: isWon
                    ? `Litige PayPal #${disputeResolved.dispute_id} résolu en faveur du marchand`
                    : `Litige PayPal #${disputeResolved.dispute_id} résolu en faveur du client`,
                  disputeId: disputeResolved.dispute_id,
                  outcome,
                  status: "completed",
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Mettre à jour le solde bloqué du provider
                await db.collection("sos_profiles").doc(resolvedProviderId).update({
                  reservedBalance: admin.firestore.FieldValue.increment(-resolvedAmount),
                  hasActiveDispute: false,
                  lastDisputeResolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastDisputeOutcome: outcome,
                });

                console.log(`💰 [PAYPAL] Balance reserve ${isWon ? 'released' : 'deducted'} for provider ${resolvedProviderId}: ${resolvedAmount}`);
              }
            }

            // Alerte admin
            await db.collection("admin_alerts").add({
              type: "paypal_dispute_resolved",
              priority: isWon ? "medium" : "critical",
              title: isWon ? "✅ Litige PayPal gagné" : "❌ Litige PayPal perdu",
              message: `Le litige ${disputeResolved.dispute_id} a été ${isWon ? "gagné" : "perdu"}. Résultat: ${outcome}. ${resolvedProviderId ? `Provider: ${resolvedProviderId}` : ''}`,
              disputeId: disputeResolved.dispute_id,
              providerId: resolvedProviderId,
              outcome,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;

        default:
          console.log("📋 [PAYPAL] Unhandled event type:", eventType);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ [PAYPAL] Webhook error:", error);
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
  { region: "europe-west1" },
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
