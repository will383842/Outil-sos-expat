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
import { defineSecret } from "firebase-functions/params";

// Secrets PayPal
export const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
export const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
export const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
export const PAYPAL_PARTNER_ID = defineSecret("PAYPAL_PARTNER_ID");
// Merchant ID de la plateforme SOS-Expat pour recevoir les frais de plateforme
export const PAYPAL_PLATFORM_MERCHANT_ID = defineSecret("PAYPAL_PLATFORM_MERCHANT_ID");

// Configuration
const PAYPAL_CONFIG = {
  // URLs selon l'environnement
  SANDBOX_URL: "https://api-m.sandbox.paypal.com",
  LIVE_URL: "https://api-m.paypal.com",

  // Mode (sandbox ou live)
  get MODE(): "sandbox" | "live" {
    return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
  },

  get BASE_URL(): string {
    return this.MODE === "live" ? this.LIVE_URL : this.SANDBOX_URL;
  },

  // URLs de retour
  RETURN_URL: "https://sos-expat.com/payment/success",
  CANCEL_URL: "https://sos-expat.com/payment/cancel",

  // Frais de plateforme (en pourcentage)
  PLATFORM_FEE_PERCENT: 20, // 20% = frais de service

  // Devise par défaut
  DEFAULT_CURRENCY: "EUR",

  // Pays supportés par PayPal Commerce mais pas par Stripe Connect
  // P0 FIX: Ajout de l'Inde (IN) - 1.4 milliard d'habitants
  PAYPAL_ONLY_COUNTRIES: [
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

    // Mettre à jour la session d'appel
    await this.db.collection("call_sessions").doc(data.callSessionId).update({
      "payment.paypalOrderId": response.id,
      "payment.paymentMethod": "paypal",
      "payment.status": "pending_approval",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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
   * FLUX DE CAPTURE POUR PAIEMENT DIRECT:
   * =====================================
   * Lorsque le client approuve le paiement et que nous appelons capture:
   * 1. PayPal preleve le montant total du compte du client
   * 2. PayPal envoie directement l'argent (moins platform_fees) au provider
   * 3. PayPal envoie les platform_fees au compte SOS-Expat
   * 4. Le provider recoit son paiement instantanement (disbursement_mode: INSTANT)
   *
   * Aucune action supplementaire requise - tout est automatique!
   */
  async captureOrder(orderId: string): Promise<{
    success: boolean;
    captureId: string;
    status: string;
    providerAmount?: number;
    platformFee?: number;
    grossAmount?: number;
  }> {
    console.log("💳 [PAYPAL] Capturing DIRECT payment order:", orderId);

    const response = await this.apiRequest<any>(
      "POST",
      `/v2/checkout/orders/${orderId}/capture`,
      {}
    );

    const capture = response.purchase_units?.[0]?.payments?.captures?.[0];
    const captureAmount = capture?.amount?.value ? parseFloat(capture.amount.value) : 0;
    const captureCurrency = capture?.amount?.currency_code || "EUR";

    // Extraire les informations de breakdown si disponibles
    const sellerReceivableBreakdown = capture?.seller_receivable_breakdown;
    const grossAmount = sellerReceivableBreakdown?.gross_amount?.value
      ? parseFloat(sellerReceivableBreakdown.gross_amount.value)
      : captureAmount;
    const platformFeeAmount = sellerReceivableBreakdown?.platform_fees?.[0]?.amount?.value
      ? parseFloat(sellerReceivableBreakdown.platform_fees[0].amount.value)
      : 0;
    const netAmount = sellerReceivableBreakdown?.net_amount?.value
      ? parseFloat(sellerReceivableBreakdown.net_amount.value)
      : grossAmount - platformFeeAmount;

    console.log(`💳 [PAYPAL] Capture completed - Gross: ${grossAmount} ${captureCurrency}, Platform fee: ${platformFeeAmount}, Provider receives: ${netAmount}`);

    // Recuperer d'abord les donnees de l'ordre pour avoir le callSessionId et providerId
    const orderDoc = await this.db.collection("paypal_orders").doc(orderId).get();
    const orderData = orderDoc.data();

    // Mettre a jour l'ordre avec les details de capture
    await this.db.collection("paypal_orders").doc(orderId).update({
      status: response.status,
      captureId: capture?.id,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Montants reels apres capture
      capturedGrossAmount: grossAmount,
      capturedPlatformFee: platformFeeAmount,
      capturedProviderAmount: netAmount,
      capturedCurrency: captureCurrency,
      // Flag pour indiquer que le provider a deja recu l'argent
      providerPaidDirectly: true,
      providerPaidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (orderData?.callSessionId) {
      await this.db.collection("call_sessions").doc(orderData.callSessionId).update({
        "payment.status": "captured",
        "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
        "payment.paypalCaptureId": capture?.id,
        // Indiquer que le paiement est direct au provider
        "payment.directPayment": true,
        "payment.providerPaidDirectly": true,
        "payment.providerAmount": netAmount,
        "payment.platformFee": platformFeeAmount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Mettre a jour les earnings du provider (pour suivi, l'argent est deja sur son compte PayPal)
    if (orderData?.providerId) {
      await this.db.collection("sos_profiles").doc(orderData.providerId).update({
        totalPayPalEarnings: admin.firestore.FieldValue.increment(netAmount),
        lastPayPalPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPayPalPaymentAmount: netAmount,
      });

      console.log(`✅ [PAYPAL] Provider ${orderData.providerId} received ${netAmount} ${captureCurrency} directly on their PayPal account`);
    }

    console.log("✅ [PAYPAL] Order captured successfully:", orderId);

    return {
      success: response.status === "COMPLETED",
      captureId: capture?.id || "",
      status: response.status,
      providerAmount: netAmount,
      platformFee: platformFeeAmount,
      grossAmount: grossAmount,
    };
  }

  /**
   * Rembourse un paiement PayPal
   */
  async refundPayment(
    captureId: string,
    amount?: number,
    currency?: string,
    reason?: string
  ): Promise<{
    success: boolean;
    refundId: string;
    status: string;
  }> {
    console.log("💸 [PAYPAL] Refunding capture:", captureId);

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
 * P0 SECURITY FIX: Les frais sont calculés côté serveur, pas par le client
 */
export const createPayPalOrder = onCall(
  {
    region: "europe-west1",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PARTNER_ID],
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

    // Vérifier que le provider a un compte PayPal
    const db = admin.firestore();
    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerData = providerDoc.data();

    if (!providerData?.paypalMerchantId) {
      throw new HttpsError("failed-precondition", "Provider has no PayPal account");
    }

    // ===== P0 SECURITY FIX: Calculer les frais côté serveur =====
    // Ne JAMAIS faire confiance aux valeurs envoyées par le client
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

    // Utiliser les valeurs calculées par le serveur, pas celles du client
    const serverProviderAmount = serverPricing.providerAmount;
    const serverPlatformFee = serverPricing.connectionFeeAmount;

    console.log(`[PAYPAL] Server-calculated fees: total=${serverPricing.totalAmount}, ` +
      `provider=${serverProviderAmount}, platform=${serverPlatformFee}`);

    const manager = new PayPalManager();

    try {
      const result = await manager.createOrder({
        callSessionId,
        amount: serverPricing.totalAmount, // Utiliser le montant serveur
        providerAmount: serverProviderAmount, // Calculé côté serveur
        platformFee: serverPlatformFee, // Calculé côté serveur
        currency: normalizedCurrency.toUpperCase(),
        providerId,
        providerPayPalMerchantId: providerData.paypalMerchantId,
        clientId: request.auth.uid,
        description: description || "SOS Expat - Consultation",
      });

      return { success: true, ...result };
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
