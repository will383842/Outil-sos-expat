// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';
import { logger as prodLogger } from './utils/productionLogger';
// P0-3 FIX: Use centralized Stripe secrets helper
import { getStripeSecretKey, getStripeSecretKeyLegacy, getStripeMode } from './lib/stripe';

/* ===================================================================
 * Utils
 * =================================================================== */

export const toCents = (amountInMainUnit: number): number =>
  Math.round(Number(amountInMainUnit) * 100);

const isProd = process.env.NODE_ENV === 'production';

function inferModeFromKey(secret: string | undefined): 'live' | 'test' | undefined {
  if (!secret) return undefined;
  if (secret.startsWith('sk_live_')) return 'live';
  if (secret.startsWith('sk_test_')) return 'test';
  return undefined;
}

function normalizeCurrency(cur?: StripePaymentData['currency']): SupportedCurrency {
  const c = (cur || 'eur').toString().toLowerCase();
  return c === 'usd' ? 'usd' : 'eur';
}

/** Valide que la clé est bien une clé secrète Stripe "sk_*" et pas une restricted "rk_*". */
function assertIsSecretStripeKey(secret: string): void {
  if (!/^sk_(live|test)_[A-Za-z0-9]+$/.test(secret)) {
    // On tolère des variantes Stripe mais on refuse explicitement les rk_ et autres
    if (secret.startsWith('rk_')) {
      throw new HttpsError(
        'failed-precondition',
        'La clé Stripe fournie est une "restricted key" (rk_*). Utilise une clé secrète (sk_*) pour les PaymentIntents.'
      );
    }
    throw new HttpsError(
      'failed-precondition',
      'Clé Stripe invalide. Fournis une clé secrète (sk_live_* ou sk_test_*).'
    );
  }
}

/* ===================================================================
 * Types
 * =================================================================== */

export type SupportedCurrency = 'eur' | 'usd';

export interface StripePaymentData {
  /** Montant total (ex: 49) en unité principale */
  amount: number;
  /** Devise (par défaut: 'eur') */
  currency?: SupportedCurrency | Uppercase<SupportedCurrency>;
  /** Références métier */
  clientId: string;
  providerId: string;
  /** Type du service */
  serviceType: 'lawyer_call' | 'expat_call';
  /** Type de prestataire */
  providerType: 'lawyer' | 'expat';

  /** Commission (legacy) */
  commissionAmount?: number;
  /** Nouveau nom: frais de connexion (si présent, prioritaire) */
  connectionFeeAmount?: number;

  /** Part prestataire en unité principale */
  providerAmount: number;

  /** Contexte */
  callSessionId?: string;
  metadata?: Record<string, string>;

  /* ===== Direct Charges (modèle de paiement actif) ===== */
  /**
   * Stripe Account ID du prestataire (acct_xxx) pour Direct Charges.
   * Avec Direct Charges:
   * - La charge est créée DIRECTEMENT sur le compte du provider
   * - L'argent va directement au provider
   * - Seule la commission (application_fee) revient à SOS-Expat
   * - Les remboursements sont faits depuis le compte du provider
   */
  providerStripeAccountId?: string;

  /** @deprecated Utiliser providerStripeAccountId - conservé pour compatibilité */
  destinationAccountId?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  /** Montant capture en cents (apres capture) */
  capturedAmount?: number;
  /** ID du transfert auto-cree par Stripe (Destination Charges) */
  transferId?: string;
  /** ID du remboursement (refund) */
  refundId?: string;
}

/** Shape minimale des docs "users" qu’on lit. */
interface UserDoc {
  email?: string;
  status?: 'active' | 'suspended' | string;
}

/** Shape des docs "payments" enregistrés par cette classe. */
interface PaymentDoc {
  stripePaymentIntentId: string;
  clientId: string;
  providerId: string;
  amount: number; // cents
  commissionAmount: number; // cents
  providerAmount: number; // cents
  /**
   * @deprecated Nom trompeur - contient le montant en unité principale (EUR ou USD), pas uniquement EUR.
   * À renommer en amountInMainUnit lors d'une future migration.
   * Voir currency pour la devise réelle.
   */
  amountInEuros: number;
  /** @deprecated Même problème que amountInEuros */
  commissionAmountEuros: number;
  /** @deprecated Même problème que amountInEuros */
  providerAmountEuros: number;
  currency: SupportedCurrency;
  serviceType: StripePaymentData['serviceType'];
  providerType: StripePaymentData['providerType'];
  status: string;
  clientSecret?: string | null;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  metadata?: Record<string, unknown>;
  environment?: string;
  mode?: 'live' | 'test';
  callSessionId?: string;
  /* ===== Direct Charges ===== */
  /** Stripe Account ID du provider (charge créée sur son compte) */
  providerStripeAccountId?: string;
  /** Commission SOS-Expat en centimes (application_fee_amount) */
  applicationFeeAmountCents?: number;
  /** Indique si le paiement utilise Direct Charges */
  useDirectCharges?: boolean;
  /* ===== KYC / Pending Transfer ===== */
  /** Indique si le provider avait complété son KYC au moment du paiement */
  providerKycComplete?: boolean;
  /** Indique si un transfert différé est nécessaire (KYC incomplet) */
  pendingTransferRequired?: boolean;
  /** @deprecated - conservé pour compatibilité avec anciens paiements */
  destinationAccountId?: string;
  /** @deprecated - conservé pour compatibilité avec anciens paiements */
  transferAmountCents?: number;
  /** @deprecated - conservé pour compatibilité avec anciens paiements */
  useDestinationCharges?: boolean;
}

/* ===================================================================
 * AAA Profile Payout Types (for internal test profiles)
 * =================================================================== */

/** Configuration d'un compte externe pour les profils AAA */
interface AaaExternalAccount {
  id: string;
  name: string;
  gateway: 'paypal' | 'stripe';
  accountId: string;
  email?: string;
  holderName: string;
  country: string;
  isActive: boolean;
}

/** Configuration globale des payouts AAA */
interface AaaPayoutConfig {
  externalAccounts: AaaExternalAccount[];
  defaultMode: string; // 'internal' ou ID de compte externe
}

/** Décision de payout pour un profil AAA */
interface AaaPayoutDecision {
  isAAA: boolean;
  mode: 'internal' | 'external';
  skipPayout: boolean;
  externalAccount?: AaaExternalAccount;
  reason: string;
}

/* ===================================================================
 * Helpers d'instanciation Stripe
 * =================================================================== */

export function makeStripeClient(secret: string): Stripe {
  assertIsSecretStripeKey(secret);
  return new Stripe(secret, { apiVersion: '2023-10-16' });
}

/* ===================================================================
 * StripeManager
 * =================================================================== */

export class StripeManager {
  private db: admin.firestore.Firestore = db;
  private stripe: Stripe | null = null;
  /** 'live' | 'test' pour tracer ce qui a été utilisé */
  private mode: 'live' | 'test' = isProd ? 'live' : 'test';

  /**
   * Initialise Stripe avec une clé donnée (TEST ou LIVE)
   */
  private initializeStripe(secretKey: string): void {
    if (this.stripe) return; // éviter les réinits
    const detected = inferModeFromKey(secretKey);
    if (detected) this.mode = detected;
    this.stripe = makeStripeClient(secretKey);
  }

  /**
   * Résolution de configuration :
   * 1) si une clé est fournie en paramètre → on l'utilise
   * 2) sinon on tente via Firebase Secrets (STRIPE_SECRET_KEY_LIVE/TEST),
   *    avec STRIPE_MODE (live|test) ou NODE_ENV pour choisir.
   * 3) fallback STRIPE_SECRET_KEY (ancien schéma)
   *
   * P0-3 FIX: Use centralized helper with defineSecret().value() + process.env fallback
   */
  private validateConfiguration(secretKey?: string): void {
    if (secretKey) {
      this.initializeStripe(secretKey);
      return;
    }

    // P0-3 FIX: Use helper that properly accesses Firebase v2 secrets
    const envMode = getStripeMode();
    const keyFromSecrets = getStripeSecretKey(envMode);

    if (keyFromSecrets) {
      this.initializeStripe(keyFromSecrets);
      return;
    }

    // Dernier fallback : ancien nom unique (déconseillé)
    const legacyKey = getStripeSecretKeyLegacy();
    if (legacyKey) {
      this.initializeStripe(legacyKey);
      return;
    }

    throw new HttpsError(
      'failed-precondition',
      'Aucune clé Stripe disponible. Passe une clé en argument ou définis STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST dans Secret Manager.'
    );
  }

  private validatePaymentData(data: StripePaymentData): void {
    const { amount, clientId, providerId } = data;

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Montant invalide');
    }
    // P1 FIX: Afficher le symbole correct selon la devise
    const currencySymbol = (data.currency?.toString().toLowerCase() === 'usd') ? '$' : '€';
    if (amount < 0.50) throw new HttpsError('failed-precondition', `Montant minimum de 0.50${currencySymbol} requis`);
    if (amount > 500) throw new HttpsError('failed-precondition', `Montant maximum de 500${currencySymbol} dépassé`);

    const commission = data.connectionFeeAmount ?? data.commissionAmount ?? 0;
    if (typeof commission !== 'number' || commission < 0) {
      throw new HttpsError('invalid-argument', 'Commission/frais de connexion invalide');
    }

    if (typeof data.providerAmount !== 'number' || data.providerAmount < 0) {
      throw new HttpsError('invalid-argument', 'Montant prestataire invalide');
    }

    if (!clientId || !providerId) {
      throw new HttpsError('invalid-argument', 'IDs client et prestataire requis');
    }
    if (clientId === providerId) {
      throw new HttpsError(
        'failed-precondition',
        'Le client et le prestataire ne peuvent pas être identiques'
      );
    }

    const calculatedTotal = commission + data.providerAmount;
    // P0 SECURITY FIX: Réduire la tolérance de 1€ à 0.05€ pour éviter manipulation
    const tolerance = 0.05;
    const delta = Math.abs(calculatedTotal - amount);

    if (delta > tolerance) {
      // Tolérance stricte de 5 centimes maximum pour les arrondis
      throw new HttpsError(
        'failed-precondition',
        `Incohérence montants: ${amount}€ != ${calculatedTotal}€ (delta: ${delta.toFixed(2)}€)`
      );
    }
  }

  /* -------------------------------------------------------------------
   * AAA Payout Decision
   * Determines how to handle payouts for AAA profiles (internal test profiles)
   * - Internal mode: Money stays on SOS-Expat platform
   * - External mode: Money goes to a consolidated external account
   * ------------------------------------------------------------------- */

  /**
   * Détermine comment gérer le payout pour un profil AAA
   * @param providerId - ID du provider
   * @returns Décision de payout AAA
   */
  async getAaaPayoutDecision(providerId: string): Promise<AaaPayoutDecision> {
    try {
      // Récupérer le document provider
      const providerDoc = await this.db.collection('sos_profiles').doc(providerId).get();
      const provider = providerDoc.data();

      if (!provider || !provider.isAAA) {
        return {
          isAAA: false,
          mode: 'external',
          skipPayout: false,
          reason: 'Not an AAA profile - normal payout flow',
        };
      }

      // Provider est AAA - vérifier le mode de payout
      const aaaPayoutMode = provider.aaaPayoutMode || 'internal';

      if (aaaPayoutMode === 'internal') {
        console.log(`💼 [AAA-STRIPE] Provider ${providerId} is AAA with INTERNAL mode - skipping transfer`);
        return {
          isAAA: true,
          mode: 'internal',
          skipPayout: true,
          reason: 'AAA profile with internal mode - money stays on SOS-Expat',
        };
      }

      // Mode externe - récupérer le compte consolidé AAA
      const configDoc = await this.db.collection('admin_config').doc('aaa_payout').get();
      const config = configDoc.data() as AaaPayoutConfig | undefined;

      if (!config || !config.externalAccounts || config.externalAccounts.length === 0) {
        console.warn(`⚠️ [AAA-STRIPE] No external accounts configured - falling back to internal`);
        return {
          isAAA: true,
          mode: 'internal',
          skipPayout: true,
          reason: 'AAA profile but no external accounts configured - fallback to internal',
        };
      }

      // Trouver le compte externe
      const externalAccount = config.externalAccounts.find(
        (acc) => acc.id === aaaPayoutMode && acc.isActive
      );

      if (!externalAccount) {
        console.warn(`⚠️ [AAA-STRIPE] External account ${aaaPayoutMode} not found or inactive - falling back to internal`);
        return {
          isAAA: true,
          mode: 'internal',
          skipPayout: true,
          reason: `External account ${aaaPayoutMode} not found - fallback to internal`,
        };
      }

      console.log(`💼 [AAA-STRIPE] Provider ${providerId} is AAA with EXTERNAL mode → ${externalAccount.name}`);
      return {
        isAAA: true,
        mode: 'external',
        skipPayout: false,
        externalAccount,
        reason: `AAA profile routing to ${externalAccount.name} (${externalAccount.gateway})`,
      };
    } catch (error) {
      console.error(`❌ [AAA-STRIPE] Error checking AAA status for ${providerId}:`, error);
      // En cas d'erreur, fallback vers internal (plus sûr)
      return {
        isAAA: false,
        mode: 'internal',
        skipPayout: false,
        reason: `Error checking AAA status: ${error}`,
      };
    }
  }

  /* -------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------- */

  async createPaymentIntent(
    data: StripePaymentData,
    secretKey?: string
  ): Promise<PaymentResult> {
    const requestId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      prodLogger.info('STRIPE_PAYMENT_START', `[${requestId}] Creating PaymentIntent`, {
        requestId,
        clientId: data.clientId,
        providerId: data.providerId,
        amount: data.amount,
        currency: data.currency,
        serviceType: data.serviceType,
        callSessionId: data.callSessionId,
      });

      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      // Anti-doublons (seulement si un paiement a déjà été accepté)
      const existingPayment = await this.findExistingPayment(
        data.clientId,
        data.providerId,
        data.callSessionId
      );
      if (existingPayment) {
        throw new HttpsError(
          'failed-precondition',
          'Un paiement a déjà été accepté pour cette demande de consultation.'
        );
      }

      this.validatePaymentData(data);
      await this.validateUsers(data.clientId, data.providerId);

      const currency = normalizeCurrency(data.currency);
      const commissionEuros = data.connectionFeeAmount ?? data.commissionAmount ?? 0;

      const amountCents = toCents(data.amount);
      const commissionAmountCents = toCents(commissionEuros);
      const providerAmountCents = toCents(data.providerAmount);

      // ===== DIRECT CHARGES vs PLATFORM ESCROW =====
      // Priorité: providerStripeAccountId > destinationAccountId (legacy)
      const providerStripeAccountId = data.providerStripeAccountId || data.destinationAccountId;
      let useDirectCharges = false;
      let providerKycComplete = false;
      let pendingTransferRequired = false;

      if (providerStripeAccountId) {
        console.log('[createPaymentIntent] Vérification du compte Stripe du provider:', {
          providerStripeAccountId,
        });

        // Validation du format du Stripe Account ID
        if (!providerStripeAccountId.startsWith('acct_')) {
          throw new HttpsError(
            'invalid-argument',
            `providerStripeAccountId invalide: doit commencer par "acct_" (recu: ${providerStripeAccountId})`
          );
        }

        // Verifier que le compte Connect est valide et peut recevoir des paiements
        try {
          const connectedAccount = await this.stripe.accounts.retrieve(providerStripeAccountId);

          if (connectedAccount.charges_enabled) {
            // ===== KYC COMPLET: Direct Charges =====
            // L'argent va directement au provider
            useDirectCharges = true;
            providerKycComplete = true;
            console.log('[createPaymentIntent] KYC complet - Mode DIRECT CHARGES actif:', {
              accountId: providerStripeAccountId,
              chargesEnabled: connectedAccount.charges_enabled,
              payoutsEnabled: connectedAccount.payouts_enabled,
              country: connectedAccount.country,
            });
          } else {
            // ===== KYC INCOMPLET: Platform Escrow =====
            // L'argent va sur le compte plateforme, transfert différé quand KYC sera fait
            useDirectCharges = false;
            providerKycComplete = false;
            pendingTransferRequired = true;
            console.log('[createPaymentIntent] KYC incomplet - Mode PLATFORM ESCROW actif:', {
              accountId: providerStripeAccountId,
              chargesEnabled: connectedAccount.charges_enabled,
              payoutsEnabled: connectedAccount.payouts_enabled,
              reason: 'Le paiement sera conservé sur la plateforme et transféré automatiquement quand le provider aura complété son KYC',
            });
          }
        } catch (stripeError) {
          // Compte inexistant ou erreur - utiliser mode plateforme
          console.warn('[createPaymentIntent] Erreur verification compte Connect, utilisation mode plateforme:', stripeError);
          useDirectCharges = false;
          providerKycComplete = false;
          pendingTransferRequired = true;

          // P2-10 FIX: Alert admin when Stripe Connect verification fails
          const errorMsg = stripeError instanceof Error ? stripeError.message : 'Unknown error';
          await this.db.collection('admin_alerts').add({
            type: 'stripe_connect_verification_failed',
            priority: 'medium',
            title: 'Échec vérification compte Stripe Connect',
            message: `Impossible de vérifier le compte Connect ${providerStripeAccountId} du provider ${data.providerId}. Fallback vers mode plateforme.`,
            providerId: data.providerId,
            stripeAccountId: providerStripeAccountId,
            error: errorMsg,
            callSessionId: data.callSessionId || null,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        // Pas de compte Stripe - mode plateforme avec transfert différé
        console.log('[createPaymentIntent] Pas de compte Stripe provider - Mode PLATFORM ESCROW');
        pendingTransferRequired = true;
      }

      console.log('[createPaymentIntent] Configuration finale:', {
        amountEuros: data.amount,
        amountCents,
        currency,
        serviceType: data.serviceType,
        commissionEuros,
        applicationFeeCents: commissionAmountCents,
        providerEuros: data.providerAmount,
        providerReceivesCents: amountCents - commissionAmountCents,
        mode: this.mode,
        useDirectCharges,
        providerKycComplete,
        pendingTransferRequired,
        providerStripeAccountId: providerStripeAccountId || 'N/A (platform mode)',
      });

      console.log("data in createPaymentIntent", data.callSessionId);

      // ===== DIRECT CHARGES: Construction des paramètres =====
      // Avec Direct Charges:
      // - La charge est créée SUR LE COMPTE DU PROVIDER (stripeAccount option)
      // - Le montant total va au provider
      // - application_fee_amount définit la commission SOS-Expat qui est prélevée
      // - capture_method: 'manual' permet l'escrow pendant l'appel
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency,
        capture_method: 'manual', // ESCROW: L'argent est bloqué jusqu'à capture après appel >= 2 min
        automatic_payment_methods: { enabled: true },
        // ===== DIRECT CHARGES: application_fee_amount =====
        // Cette commission va DIRECTEMENT à SOS-Expat (compte plateforme)
        // Le reste (amountCents - commissionAmountCents) reste sur le compte du provider
        ...(useDirectCharges && commissionAmountCents > 0 ? {
          application_fee_amount: commissionAmountCents,
        } : {}),
        metadata: {
          clientId: data.clientId,
          providerId: data.providerId,
          serviceType: data.serviceType,
          providerType: data.providerType,
          commissionAmountCents: String(commissionAmountCents),
          providerAmountCents: String(providerAmountCents),
          applicationFeeCents: String(commissionAmountCents),
          commissionAmountEuros: commissionEuros.toFixed(2),
          providerAmountEuros: data.providerAmount.toFixed(2),
          environment: process.env.NODE_ENV || 'development',
          mode: this.mode,
          useDirectCharges: String(useDirectCharges),
          providerKycComplete: String(providerKycComplete),
          pendingTransferRequired: String(pendingTransferRequired),
          ...(providerStripeAccountId ? { providerStripeAccountId } : {}),
          ...(data.callSessionId ? { callSessionId: data.callSessionId } : {}),
          ...(data.metadata || {}),
        },
        description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
        statement_descriptor_suffix: 'SOS EXPAT',
        receipt_email: await this.getClientEmail(data.clientId),
      };

      // ===== P1-2 SECURITY FIX: callSessionId OBLIGATOIRE pour idempotence =====
      // Sans callSessionId, chaque retry crée un nouveau PaymentIntent (doublons possibles)
      // En production: rejeter. En dev: warning + fallback pour compatibilité tests
      if (!data.callSessionId) {
        if (isProd) {
          console.error('[createPaymentIntent] ❌ callSessionId MANQUANT - rejet obligatoire en production');
          throw new HttpsError(
            'invalid-argument',
            'callSessionId requis pour créer un paiement. Assurez-vous que le frontend envoie ce paramètre.'
          );
        }
        console.warn('[createPaymentIntent] ⚠️ callSessionId absent - fallback timestamp (UNIQUEMENT EN DEV)');
      }
      const sessionIdForKey = data.callSessionId || `ts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const idempotencyKey = `pi_create_${data.clientId}_${data.providerId}_${sessionIdForKey}_${amountCents}`;
      console.log(`[createPaymentIntent] Idempotency key: callSessionId=${data.callSessionId ? 'present' : 'MISSING (DEV fallback)'}`);


      // ===== DIRECT CHARGES: Création sur le compte du provider =====
      // La différence clé avec Destination Charges:
      // - stripeAccount dans les options fait créer la charge SUR le compte du provider
      // - L'argent va directement au provider, pas à la plateforme puis transfert
      let paymentIntent: Stripe.PaymentIntent;

      if (useDirectCharges && providerStripeAccountId) {
        console.log('[createPaymentIntent] Création PaymentIntent sur le compte du provider (Direct Charges)');
        paymentIntent = await this.stripe.paymentIntents.create(
          paymentIntentParams,
          {
            idempotencyKey: idempotencyKey.substring(0, 255),
            stripeAccount: providerStripeAccountId, // DIRECT CHARGES: Charge créée sur le compte du provider
          }
        );
      } else {
        console.log('[createPaymentIntent] Création PaymentIntent sur le compte plateforme (fallback mode)');
        paymentIntent = await this.stripe.paymentIntents.create(
          paymentIntentParams,
          {
            idempotencyKey: idempotencyKey.substring(0, 255),
          }
        );
      }
      console.log('paymentIntent created with idempotency key:', idempotencyKey.substring(0, 50) + '...');

      console.log('PaymentIntent Stripe cree (DIRECT CHARGES):', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
        status: paymentIntent.status,
        mode: this.mode,
        useDirectCharges,
        applicationFeeAmount: useDirectCharges ? commissionAmountCents : 0,
        createdOnAccount: useDirectCharges ? providerStripeAccountId : 'plateforme',
      });

      await this.savePaymentRecord(
        paymentIntent,
        { ...data, commissionAmount: commissionEuros },
        {
          amountCents,
          commissionAmountCents,
          providerAmountCents,
          currency,
          useDirectCharges,
          providerStripeAccountId,
          applicationFeeAmountCents: useDirectCharges ? commissionAmountCents : undefined,
          pendingTransferRequired,
          providerKycComplete,
        }
      );

      // ===== TRANSFERT DIFFÉRÉ: Créer un enregistrement pending_transfers si KYC incomplet =====
      // Ce transfert sera traité automatiquement quand le provider complètera son KYC
      if (pendingTransferRequired) {
        try {
          await this.db.collection('pending_transfers').add({
            paymentIntentId: paymentIntent.id,
            providerId: data.providerId,
            providerStripeAccountId: providerStripeAccountId || null,
            clientId: data.clientId,
            callSessionId: data.callSessionId || null,
            amount: amountCents,
            providerAmount: providerAmountCents,
            commissionAmount: commissionAmountCents,
            currency,
            status: 'pending_kyc', // Statut: en attente de KYC
            reason: 'Provider KYC not completed at payment time',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development',
            mode: this.mode,
          });
          console.log('[createPaymentIntent] Pending transfer créé - sera traité après KYC du provider:', {
            paymentIntentId: paymentIntent.id,
            providerId: data.providerId,
            providerAmount: providerAmountCents / 100,
          });
        } catch (pendingError) {
          console.error('[createPaymentIntent] Erreur création pending_transfer:', pendingError);
          // Ne pas bloquer le paiement si l'enregistrement échoue
          // Créer une alerte admin
          await this.db.collection('admin_alerts').add({
            type: 'pending_transfer_creation_failed',
            severity: 'high',
            paymentIntentId: paymentIntent.id,
            providerId: data.providerId,
            error: pendingError instanceof Error ? pendingError.message : 'Unknown error',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            resolved: false,
          });
        }
      }

      // Log de succès final
      prodLogger.info('STRIPE_PAYMENT_SUCCESS', `[${requestId}] PaymentIntent created successfully`, {
        requestId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        useDirectCharges,
        pendingTransferRequired,
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      // Log d'erreur
      prodLogger.error('STRIPE_PAYMENT_ERROR', `[${requestId}] PaymentIntent creation failed`, {
        requestId,
        clientId: data.clientId,
        providerId: data.providerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // ===== GESTION IDEMPOTENCY ERROR =====
      // Si on reçoit une erreur d'idempotence, cela signifie qu'un PaymentIntent
      // a DÉJÀ été créé avec la même clé. On doit le récupérer et le retourner.
      if (error instanceof Error && error.message.includes('idempotent requests')) {
        console.log('[createPaymentIntent] IdempotencyError détectée - Récupération du PaymentIntent existant...');

        // Essayer de récupérer le PaymentIntent existant depuis notre base
        if (data.callSessionId) {
          const existingPaymentDoc = await this.getExistingPaymentBySession(data.callSessionId);
          if (existingPaymentDoc) {
            console.log('[createPaymentIntent] PaymentIntent existant trouvé:', {
              paymentIntentId: existingPaymentDoc.stripePaymentIntentId,
              status: existingPaymentDoc.status,
            });

            // Si le paiement a un clientSecret, on le retourne
            if (existingPaymentDoc.clientSecret) {
              return {
                success: true,
                paymentIntentId: existingPaymentDoc.stripePaymentIntentId,
                clientSecret: existingPaymentDoc.clientSecret,
              };
            }

            // Si on a le paymentIntentId mais pas de clientSecret, essayer de le récupérer de Stripe
            if (existingPaymentDoc.stripePaymentIntentId && this.stripe) {
              try {
                const pi = await this.stripe.paymentIntents.retrieve(
                  existingPaymentDoc.stripePaymentIntentId,
                  existingPaymentDoc.providerStripeAccountId ? { stripeAccount: existingPaymentDoc.providerStripeAccountId } : undefined
                );
                if (pi.client_secret) {
                  // Mettre à jour le document avec le clientSecret
                  await this.db.collection('payments').doc(existingPaymentDoc.id).update({
                    clientSecret: pi.client_secret,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  return {
                    success: true,
                    paymentIntentId: pi.id,
                    clientSecret: pi.client_secret,
                  };
                }
              } catch (retrieveError) {
                console.error('[createPaymentIntent] Erreur récupération PaymentIntent Stripe:', retrieveError);
              }
            }
          }
        }

        // Si on n'a pas pu récupérer le PaymentIntent existant, on retourne une erreur plus claire
        console.warn('[createPaymentIntent] Impossible de récupérer le PaymentIntent existant');
        return {
          success: false,
          error: 'Un paiement est déjà en cours pour cette session. Veuillez rafraîchir la page et réessayer.',
        };
      }

      await logError('StripeManager:createPaymentIntent', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur inconnue';
      return { success: false, error: msg };
    }
  }

  /**
   * Récupère un paiement existant par callSessionId
   */
  private async getExistingPaymentBySession(
    callSessionId: string
  ): Promise<(PaymentDoc & { id: string }) | null> {
    try {
      const snapshot = await this.db
        .collection('payments')
        .where('callSessionId', '==', callSessionId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...(doc.data() as PaymentDoc) };
    } catch (error) {
      console.error('[getExistingPaymentBySession] Erreur:', error);
      return null;
    }
  }

  async capturePayment(
    paymentIntentId: string,
    sessionId?: string,
    secretKey?: string
  ): Promise<PaymentResult> {
    const captureRequestId = `cap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      prodLogger.info('STRIPE_CAPTURE_START', `[${captureRequestId}] Starting payment capture`, {
        captureRequestId,
        paymentIntentId,
        sessionId,
      });

      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      prodLogger.debug('STRIPE_CAPTURE_STATUS', `[${captureRequestId}] PaymentIntent status check`, {
        captureRequestId,
        paymentIntentId,
        currentStatus: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });

      if (paymentIntent.status !== 'requires_capture') {
        prodLogger.warn('STRIPE_CAPTURE_SKIP', `[${captureRequestId}] Cannot capture - wrong status`, {
          captureRequestId,
          paymentIntentId,
          status: paymentIntent.status,
        });
        throw new HttpsError(
          'failed-precondition',
          `Impossible de capturer un paiement au statut: ${paymentIntent.status}`
        );
      }

      console.log('[capturePayment] Capture du paiement en cours...', {
        paymentIntentId,
        hasTransferData: !!paymentIntent.transfer_data,
        mode: this.mode,
      });

      // ===== P1 FIX: Vérification KYC du provider AVANT capture =====
      const providerId = paymentIntent.metadata?.providerId;
      if (providerId) {
        try {
          const providerDoc = await this.db.collection('users').doc(providerId).get();
          if (providerDoc.exists) {
            const providerData = providerDoc.data();
            const kycStatus = providerData?.kycStatus;
            const isAaaProfile = providerData?.isAAA === true ||
                                 providerData?.kycDelegated === true ||
                                 providerData?.isTestProfile === true ||
                                 providerId.startsWith('aaa_');
            const VALID_KYC_STATUSES = ['completed', 'verified', 'not_required'];

            // Profils AAA: KYC délégué, pas de vérification nécessaire
            if (isAaaProfile) {
              // Utiliser getAaaPayoutDecision pour déterminer le mode de payout
              const aaaDecision = await this.getAaaPayoutDecision(providerId);

              console.log('[capturePayment] Profil AAA détecté - KYC délégué:', {
                providerId,
                isAAA: providerData?.isAAA,
                kycDelegated: providerData?.kycDelegated,
                aaaPayoutMode: aaaDecision.mode,
                decision: aaaDecision.reason,
              });

              if (aaaDecision.mode === 'internal') {
                // Mode INTERNAL: L'argent reste sur SOS-Expat
                await this.db.collection('aaa_internal_payouts').add({
                  paymentIntentId: paymentIntentId,
                  providerId: providerId,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  mode: 'internal',
                  reason: aaaDecision.reason,
                  sessionId: sessionId || null,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log('[capturePayment] AAA Internal payout logged');
              } else if (aaaDecision.mode === 'external' && aaaDecision.externalAccount) {
                // Mode EXTERNAL: Transfer vers le compte Stripe consolidé
                const aaaAccount = aaaDecision.externalAccount;

                if (aaaAccount.gateway === 'stripe' && aaaAccount.accountId) {
                  try {
                    // Calculer le montant du provider (excluant la commission SOS)
                    const providerAmountCents = paymentIntent.metadata?.providerAmountCents
                      ? parseInt(paymentIntent.metadata.providerAmountCents, 10)
                      : Math.round(paymentIntent.amount * 0.8); // 80% par défaut si non spécifié

                    // Créer un transfert vers le compte Stripe externe consolidé
                    const transfer = await this.stripe!.transfers.create({
                      amount: providerAmountCents,
                      currency: paymentIntent.currency,
                      destination: aaaAccount.accountId,
                      transfer_group: `aaa_${sessionId || paymentIntentId}`,
                      metadata: {
                        type: 'aaa_external_payout',
                        originalProviderId: providerId,
                        externalAccountId: aaaAccount.id,
                        externalAccountName: aaaAccount.name,
                        paymentIntentId: paymentIntentId,
                        sessionId: sessionId || '',
                      },
                    }, {
                      idempotencyKey: `aaa_transfer_${paymentIntentId}_${aaaAccount.id}`.substring(0, 255),
                    });

                    // Log le payout externe
                    await this.db.collection('aaa_external_payouts').add({
                      paymentIntentId: paymentIntentId,
                      providerId: providerId,
                      amount: providerAmountCents,
                      currency: paymentIntent.currency,
                      mode: 'external',
                      externalAccountId: aaaAccount.id,
                      externalAccountName: aaaAccount.name,
                      transferId: transfer.id,
                      sessionId: sessionId || null,
                      success: true,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    console.log(`[capturePayment] AAA External payout SUCCESS to ${aaaAccount.name}: ${transfer.id}`);
                  } catch (transferError) {
                    console.error('[capturePayment] AAA External transfer failed:', transferError);
                    // Log l'échec
                    await this.db.collection('aaa_external_payouts').add({
                      paymentIntentId: paymentIntentId,
                      providerId: providerId,
                      amount: paymentIntent.amount,
                      currency: paymentIntent.currency,
                      mode: 'external',
                      externalAccountId: aaaAccount.id,
                      externalAccountName: aaaAccount.name,
                      error: String(transferError),
                      sessionId: sessionId || null,
                      success: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                  }
                } else {
                  console.warn(`[capturePayment] AAA External account ${aaaAccount.name} is not Stripe - skipping transfer`);
                  // Si le compte externe est PayPal, logguer pour traitement manuel
                  await this.db.collection('aaa_external_payouts').add({
                    paymentIntentId: paymentIntentId,
                    providerId: providerId,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    mode: 'external',
                    externalAccountId: aaaAccount.id,
                    externalAccountName: aaaAccount.name,
                    gateway: aaaAccount.gateway,
                    note: 'Stripe payment but PayPal external account - requires manual processing',
                    sessionId: sessionId || null,
                    success: false,
                    requiresManualProcessing: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              }
            } else if (!kycStatus || !VALID_KYC_STATUSES.includes(kycStatus)) {
              console.warn('[capturePayment] KYC provider non vérifié', {
                providerId,
                kycStatus: kycStatus || 'undefined',
                paymentIntentId,
              });

              // Créer une alerte admin pour suivi
              await this.db.collection('admin_alerts').add({
                type: 'kyc_not_verified_at_capture',
                severity: 'high',
                providerId: providerId,
                paymentIntentId: paymentIntentId,
                kycStatus: kycStatus || 'undefined',
                message: `Tentative de capture pour provider avec KYC non vérifié: ${kycStatus || 'undefined'}`,
                sessionId: sessionId || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                resolved: false,
              });
            } else {
              console.log('[capturePayment] KYC provider vérifié:', kycStatus);
            }
          } else {
            console.warn('[capturePayment] Provider non trouvé:', providerId);
          }
        } catch (kycError) {
          console.error('[capturePayment] Erreur vérification KYC:', kycError);
          // On continue la capture même en cas d'erreur de vérification
        }
      }
      // ===== FIN P1 FIX =====

      // Capture le paiement - avec Destination Charges, le transfert est cree automatiquement
      // ===== P0 FIX: Idempotency key pour la capture =====
      // IMPORTANT: NE PAS inclure Date.now() - une capture ne doit se faire qu'une seule fois
      const captureIdempotencyKey = `capture_${paymentIntentId}`;
      const captured = await this.stripe.paymentIntents.capture(
        paymentIntentId,
        {},
        { idempotencyKey: captureIdempotencyKey.substring(0, 255) }
      );

      // Recuperer l'ID du transfert auto-cree par Stripe (Destination Charges)
      // Le transfert est disponible directement sur le PaymentIntent apres capture
      let transferId: string | undefined;

      // Cast pour acceder aux proprietes etendues du PaymentIntent (Destination Charges)
      // La propriete 'transfer' existe sur les PaymentIntents avec transfer_data mais
      // n'est pas toujours typee dans le SDK Stripe
      const capturedAny = captured as Stripe.PaymentIntent & { transfer?: string | Stripe.Transfer };

      // Methode 1: Le transfert est directement sur le PaymentIntent (si Destination Charges)
      if (capturedAny.transfer) {
        transferId = typeof capturedAny.transfer === 'string'
          ? capturedAny.transfer
          : capturedAny.transfer.id;
        console.log('[capturePayment] Transfert trouve sur PaymentIntent:', transferId);
      }

      // Methode 2: Si pas de transfert direct, verifier via latest_charge
      if (!transferId && captured.latest_charge) {
        try {
          const chargeId = typeof captured.latest_charge === 'string'
            ? captured.latest_charge
            : captured.latest_charge.id;

          const charge = await this.stripe.charges.retrieve(chargeId, {
            expand: ['transfer'],
          });

          if (charge.transfer) {
            transferId = typeof charge.transfer === 'string'
              ? charge.transfer
              : charge.transfer.id;
            console.log('[capturePayment] Transfert trouve via charge:', transferId);
          }
        } catch (chargeError) {
          console.warn('[capturePayment] Impossible de recuperer le transfert via charge:', chargeError);
        }
      }

      // Mettre a jour le document payment dans Firestore
      const updateData: Record<string, unknown> = {
        status: captured.status,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        capturedAmount: captured.amount_received || captured.amount,
        sessionId: sessionId || null,
      };

      // Ajouter les infos du transfert si disponibles
      if (transferId) {
        updateData.transferId = transferId;
        updateData.transferCreatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Enregistrer egalement dans la collection transfers pour tracabilite
        try {
          await this.db.collection('transfers').add({
            transferId: transferId,
            paymentIntentId: paymentIntentId,
            providerId: captured.metadata?.providerId || null,
            amount: captured.amount_received || captured.amount,
            currency: captured.currency,
            sessionId: sessionId || captured.metadata?.callSessionId || null,
            type: 'destination_charge_auto',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development',
            mode: this.mode,
          });
          console.log('[capturePayment] Transfert enregistre dans collection transfers');
        } catch (transferRecordError) {
          console.warn('[capturePayment] Erreur lors de l\'enregistrement du transfert:', transferRecordError);
          // Ne pas bloquer la capture si l'enregistrement echoue
        }
      }

      await this.db.collection('payments').doc(paymentIntentId).update(updateData);

      // Log de succès avec prodLogger
      prodLogger.info('STRIPE_CAPTURE_SUCCESS', `[${captureRequestId}] Payment captured successfully`, {
        captureRequestId,
        paymentIntentId,
        capturedAmount: captured.amount_received || captured.amount,
        currency: captured.currency,
        status: captured.status,
        transferId: transferId || null,
        sessionId,
      });

      console.log('[capturePayment] Paiement capture avec succes:', {
        id: paymentIntentId,
        capturedAmount: captured.amount_received || captured.amount,
        status: captured.status,
        transferId: transferId || 'aucun (pas de Destination Charges)',
        mode: this.mode,
      });

      return {
        success: true,
        paymentIntentId: captured.id,
        capturedAmount: captured.amount_received || captured.amount,
        transferId: transferId,
      };
    } catch (error) {
      await logError('StripeManager:capturePayment', error);
      console.error('[capturePayment] Erreur lors de la capture:', {
        paymentIntentId,
        error: error instanceof Error ? error.message : error,
      });
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur lors de la capture';
      return { success: false, error: msg };
    }
  }

  async refundPayment(
    paymentIntentId: string,
    reason: string,
    sessionId?: string,
    amount?: number,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      // Verifier si ce paiement utilisait Destination Charges ou Direct Charges
      const paymentDoc = await this.db.collection('payments').doc(paymentIntentId).get();
      const paymentData = paymentDoc.data();
      // P0-5 FIX: Vérifier AUSSI useDirectCharges (nouveau modèle)
      // - useDestinationCharges: ancien modèle (transfer_data vers provider)
      // - useDirectCharges: nouveau modèle (charge sur compte provider avec application_fee)
      const usedDestinationCharges = paymentData?.useDestinationCharges === true;
      const usedDirectCharges = paymentData?.useDirectCharges === true;
      const wasTransferred = !!paymentData?.transferId || !!paymentData?.destinationAccountId;

      console.log('[refundPayment] Verification Charges type:', {
        paymentIntentId,
        usedDestinationCharges,
        usedDirectCharges,
        wasTransferred,
        destinationAccountId: paymentData?.destinationAccountId || null,
        providerStripeAccountId: paymentData?.providerStripeAccountId || null,
      });

      type RefundReason = Stripe.RefundCreateParams.Reason;
      const allowedReasons: RefundReason[] = [
        'duplicate',
        'fraudulent',
        'requested_by_customer',
      ];
      const normalizedReason = (allowedReasons.includes(reason as RefundReason)
        ? (reason as RefundReason)
        : undefined) as RefundReason | undefined;

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        ...(normalizedReason ? { reason: normalizedReason } : {}),
        metadata: {
          sessionId: sessionId || '',
          refundReason: reason,
          mode: this.mode,
          usedDestinationCharges: String(usedDestinationCharges),
          usedDirectCharges: String(usedDirectCharges),
        },
      };

      // ===== DESTINATION CHARGES: Inverser aussi le transfert au prestataire =====
      // Avec Destination Charges, quand on rembourse apres capture, il faut aussi
      // recuperer l'argent qui a ete envoye au prestataire via transfer_data
      if (usedDestinationCharges || wasTransferred) {
        refundData.reverse_transfer = true;
        console.log('[refundPayment] reverse_transfer active - le transfert au prestataire sera inverse');
      }

      // ===== P0-5 FIX: DIRECT CHARGES - Remboursement sur le compte du provider =====
      // Avec Direct Charges:
      // - La charge a été créée DIRECTEMENT sur le compte du provider (providerStripeAccountId)
      // - Le remboursement doit aussi être fait sur ce compte connecté
      // - On peut optionnellement rembourser l'application_fee (commission SOS-Expat)
      let stripeOptions: Stripe.RequestOptions = { idempotencyKey: '' };
      if (usedDirectCharges && paymentData?.providerStripeAccountId) {
        stripeOptions.stripeAccount = paymentData.providerStripeAccountId;
        // Rembourser aussi la commission SOS-Expat au client
        refundData.refund_application_fee = true;
        console.log('[refundPayment] Direct Charges - remboursement sur compte provider:', paymentData.providerStripeAccountId);
      }

      if (amount !== undefined) refundData.amount = toCents(amount);

      // ===== P0 FIX: Idempotency key pour le remboursement =====
      // IMPORTANT: NE PAS inclure Date.now() - un remboursement ne doit se faire qu'une seule fois
      const refundIdempotencyKey = `refund_${paymentIntentId}_${amount || 'full'}`;
      stripeOptions.idempotencyKey = refundIdempotencyKey.substring(0, 255);
      const refund = await this.stripe.refunds.create(refundData, stripeOptions);

      // Mise a jour du document payment avec les infos de remboursement
      const refundUpdate: Record<string, unknown> = {
        status: 'refunded',
        refundId: refund.id,
        refundReason: reason,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      };

      // Ajouter les infos de reverse transfer si applicable
      if (usedDestinationCharges || wasTransferred) {
        refundUpdate.transferReversed = true;
        refundUpdate.transferReversedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await this.db.collection('payments').doc(paymentIntentId).update(refundUpdate);

      // ===== P0 FIX: Écrire dans la collection refunds pour l'historique =====
      const refundRecord = {
        refundId: refund.id,
        paymentIntentId: paymentIntentId,
        stripeRefundId: refund.id,
        amount: refund.amount,
        amountInMainUnit: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: reason,
        clientId: paymentData?.clientId || null,
        providerId: paymentData?.providerId || null,
        sessionId: sessionId || paymentData?.callSessionId || null,
        usedDestinationCharges: usedDestinationCharges,
        usedDirectCharges: usedDirectCharges,
        transferReversed: usedDestinationCharges || wasTransferred,
        applicationFeeRefunded: usedDirectCharges,
        metadata: {
          paymentAmount: paymentData?.amount || null,
          paymentCurrency: paymentData?.currency || null,
          serviceType: paymentData?.serviceType || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || 'development',
        mode: this.mode,
      };

      await this.db.collection('refunds').doc(refund.id).set(refundRecord);
      console.log('[refundPayment] Refund record saved to refunds collection:', refund.id);

      // ===== P0 FIX: Notification de remboursement au client =====
      if (paymentData?.clientId) {
        try {
          const refundAmountFormatted = (refund.amount / 100).toFixed(2);
          const currencySymbol = refund.currency?.toUpperCase() === 'EUR' ? '€' : '$';

          // Créer une notification in-app pour le client
          await this.db.collection('inapp_notifications').add({
            uid: paymentData.clientId,
            type: 'refund_completed',
            title: 'Remboursement effectué',
            body: `Votre remboursement de ${refundAmountFormatted}${currencySymbol} a été initié. Il sera crédité sur votre compte dans 3-5 jours ouvrés.`,
            data: {
              refundId: refund.id,
              paymentIntentId: paymentIntentId,
              amount: refund.amount,
              currency: refund.currency,
              reason: reason,
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Enqueue email notification via message_events pipeline
          await this.db.collection('message_events').add({
            eventId: 'payment_refunded',
            locale: 'fr', // Default, should detect from user preferences
            to: { uid: paymentData.clientId },
            context: {
              user: { uid: paymentData.clientId },
            },
            vars: {
              refundAmount: refundAmountFormatted,
              currency: currencySymbol,
              refundReason: reason || 'Remboursement demandé',
              estimatedArrival: '3-5 jours ouvrés',
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log('[refundPayment] ✅ Client notification sent for refund:', refund.id);
        } catch (notifError) {
          console.error('[refundPayment] ⚠️ Failed to send refund notification:', notifError);
          // Don't fail the refund if notification fails
        }
      }

      // Update related invoices to refunded status
      if (sessionId) {
        try {
          // Find invoices linked to this call session
          const invoicesQuery = await this.db.collection('invoice_records')
            .where('callId', '==', sessionId)
            .get();

          if (!invoicesQuery.empty) {
            const invoiceUpdateBatch = this.db.batch();
            invoicesQuery.docs.forEach((invoiceDoc) => {
              invoiceUpdateBatch.update(invoiceDoc.ref, {
                status: 'refunded',
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                refundReason: reason,
                refundId: refund.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            await invoiceUpdateBatch.commit();
            console.log(`✅ Updated ${invoicesQuery.docs.length} invoice(s) to refunded status for session ${sessionId}`);
          }
        } catch (invoiceError) {
          console.error('⚠️ Error updating invoices to refunded status:', invoiceError);
          // Don't fail the refund if invoice update fails
        }
      }

      console.log('[refundPayment] Paiement rembourse:', {
        paymentIntentId,
        refundId: refund.id,
        amount: refund.amount,
        reason,
        mode: this.mode,
        usedDestinationCharges,
        transferReversed: usedDestinationCharges || wasTransferred,
      });

      return { success: true, paymentIntentId, refundId: refund.id };
    } catch (error) {
      await logError('StripeManager:refundPayment', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur lors du remboursement';
      return { success: false, error: msg };
    }
  }

  async transferToProvider(
    providerId: string,
    providerAmount: number,
    sessionId: string,
    metadata?: Record<string, string>,
    secretKey?: string,
    currency: SupportedCurrency = 'eur' // FIX: Ajout du paramètre currency au lieu de hardcoder EUR
  ): Promise<PaymentResult & { transferId?: string }> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      console.log(`💸 Initiating transfer to provider ${providerId}: ${providerAmount} ${currency.toUpperCase()}`);

      // Get provider's Stripe account ID from sos_profiles
      const providerDoc = await this.db
        .collection('sos_profiles')
        .doc(providerId)
        .get();

      if (!providerDoc.exists) {
        throw new HttpsError('not-found', `Provider profile not found: ${providerId}`);
      }

      const providerData = providerDoc.data();
      const stripeAccountId = providerData?.stripeAccountId;

      if (!stripeAccountId) {
        console.error(`❌ Provider ${providerId} has no Stripe account - cannot transfer`);
        throw new HttpsError(
          'failed-precondition',
          'Provider has not completed Stripe onboarding'
        );
      }

      // Verify provider's account is capable of receiving payments
      const account = await this.stripe.accounts.retrieve(stripeAccountId);
      
      if (!account.charges_enabled) {
        console.error(`❌ Provider ${providerId} charges not enabled`);
        throw new HttpsError(
          'failed-precondition',
          'Provider account cannot receive payments yet'
        );
      }

      // Create the transfer
      // FIX: Utilise la devise originale du paiement au lieu de hardcoder EUR
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(providerAmount * 100), // Convert to cents
        currency: currency, // FIX: Devise dynamique
        destination: stripeAccountId,
        transfer_group: sessionId,
        description: `Payment for call ${sessionId}`,
        metadata: {
          sessionId: sessionId,
          providerId: providerId,
          // FIX: Nom générique car peut être EUR ou USD
          providerAmountMainUnit: providerAmount.toFixed(2),
          providerAmountCurrency: currency.toUpperCase(),
          // LEGACY: Garder pour compatibilité arrière
          providerAmountEuros: providerAmount.toFixed(2),
          environment: process.env.NODE_ENV || 'development',
          mode: this.mode,
          ...metadata,
        },
      });

      console.log(`✅ Transfer created: ${transfer.id}`, {
        amount: transfer.amount,
        destination: stripeAccountId,
        created: transfer.created,
      });

      // Record transfer in payments collection
      await this.db.collection('transfers').add({
        transferId: transfer.id,
        providerId: providerId,
        stripeAccountId: stripeAccountId,
        amount: providerAmount,
        amountCents: transfer.amount,
        currency: transfer.currency,
        sessionId: sessionId,
        stripeTransferObject: transfer.object,
        reversed: transfer.reversed || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata || {},
        environment: process.env.NODE_ENV || 'development',
      });

      return {
        success: true,
        transferId: transfer.id,
        paymentIntentId: sessionId,
      };
    } catch (error) {
      await logError('StripeManager:transferToProvider', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur lors du transfert';
      return { success: false, error: msg };
    }
  }

async cancelPayment(
  paymentIntentId: string,
  reason: string,
  sessionId?: string,
  secretKey?: string
): Promise<PaymentResult> {
  try {
    this.validateConfiguration(secretKey);
    if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

    type CancelReason = Stripe.PaymentIntentCancelParams.CancellationReason;
    // ✅ Liste valide pour PaymentIntents
    const allowedReasons: CancelReason[] = [
      'duplicate',
      'fraudulent',
      'requested_by_customer',
      'abandoned',
    ];
    const normalized: CancelReason | undefined = allowedReasons.includes(
      reason as CancelReason
    )
      ? (reason as CancelReason)
      : undefined;

    // ===== P0 FIX: Idempotency key pour l'annulation =====
    // IMPORTANT: Une annulation ne doit se faire qu'une seule fois par PaymentIntent
    const cancelIdempotencyKey = `cancel_${paymentIntentId}`;
    const canceled = await this.stripe.paymentIntents.cancel(
      paymentIntentId,
      {
        ...(normalized ? { cancellation_reason: normalized } : {}),
      },
      { idempotencyKey: cancelIdempotencyKey }
    );

    await this.db.collection('payments').doc(paymentIntentId).update({
      status: canceled.status,
      cancelReason: reason,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionId: sessionId || null,
    });

    console.log('Paiement annulé:', {
      id: paymentIntentId,
      status: canceled.status,
      reason,
      mode: this.mode,
    });

    return { success: true, paymentIntentId: canceled.id };
  } catch (error) {
    await logError('StripeManager:cancelPayment', error);
    const msg =
      error instanceof HttpsError
        ? error.message
        : error instanceof Error
        ? error.message
        : "Erreur lors de l'annulation";
    return { success: false, error: msg };
  }
}


  async getPaymentStatistics(options: {
    startDate?: Date;
    endDate?: Date;
    serviceType?: StripePaymentData['serviceType'];
    providerType?: StripePaymentData['providerType'];
  } = {}): Promise<{
    totalAmount: number;
    totalCommission: number;
    totalProvider: number;
    count: number;
    byStatus: Record<string, number>;
  }> {
    try {
      let query: admin.firestore.Query<admin.firestore.DocumentData> =
        this.db.collection('payments');

      if (options.startDate) query = query.where('createdAt', '>=', options.startDate);
      if (options.endDate) query = query.where('createdAt', '<=', options.endDate);
      if (options.serviceType) query = query.where('serviceType', '==', options.serviceType);
      if (options.providerType) query = query.where('providerType', '==', options.providerType);

      const snapshot = await query.get();

      const stats = {
        totalAmount: 0,
        totalCommission: 0,
        totalProvider: 0,
        count: 0,
        byStatus: {} as Record<string, number>,
      };

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<PaymentDoc> | undefined;
        if (!data) return;
        stats.count++;
        stats.totalAmount += typeof data.amount === 'number' ? data.amount : 0;
        stats.totalCommission +=
          typeof data.commissionAmount === 'number' ? data.commissionAmount : 0;
        stats.totalProvider +=
          typeof data.providerAmount === 'number' ? data.providerAmount : 0;

        const status = (data.status ?? 'unknown') as string;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      // Conversion en unités principales pour le retour
      return {
        totalAmount: stats.totalAmount / 100,
        totalCommission: stats.totalCommission / 100,
        totalProvider: stats.totalProvider / 100,
        count: stats.count,
        byStatus: stats.byStatus,
      };
    } catch (error) {
      await logError('StripeManager:getPaymentStatistics', error);
      return {
        totalAmount: 0,
        totalCommission: 0,
        totalProvider: 0,
        count: 0,
        byStatus: {},
      };
    }
  }

  async getPayment(paymentIntentId: string): Promise<Record<string, unknown> | null> {
    try {
      const docSnap = await this.db.collection('payments').doc(paymentIntentId).get();
      if (!docSnap.exists) return null;

      const data = docSnap.data() as PaymentDoc | undefined;
      if (!data) return null;

      return {
        ...data,
        amountInEuros: (data.amount || 0) / 100,
        commissionAmountEuros: (data.commissionAmount || 0) / 100,
        providerAmountEuros: (data.providerAmount || 0) / 100,
      };
    } catch (error) {
      await logError('StripeManager:getPayment', error);
      return null;
    }
  }

  /* -------------------------------------------------------------------
   * Privées
   * ------------------------------------------------------------------- */

  private async findExistingPayment(
    clientId: string,
    providerId: string,
    sessionId?: string
  ): Promise<boolean> {
    try {
      console.log('🔍 Vérification anti-doublons:', {
        clientId: clientId.substring(0, 8) + '...',
        providerId: providerId.substring(0, 8) + '...',
        sessionId: sessionId ? sessionId.substring(0, 8) + '...' : '—',
      });

      // P0 FIX: Anti-doublons - vérifier TOUS les statuts de paiement valides
      // MAIS autoriser un nouveau paiement si l'appel précédent a échoué
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      let query: admin.firestore.Query<admin.firestore.DocumentData> = this.db
        .collection('payments')
        .where('clientId', '==', clientId)
        .where('providerId', '==', providerId)
        .where('status', 'in', ['succeeded', 'captured', 'requires_capture', 'authorized', 'processing'])
        .where('createdAt', '>=', twentyFourHoursAgo);

      if (sessionId && sessionId.trim() !== '') {
        query = query.where('callSessionId', '==', sessionId);
      }

      const snapshot = await query.limit(5).get();

      if (snapshot.empty) {
        console.log('🔍 Aucun paiement existant trouvé - OK pour créer');
        return false;
      }

      // P0 FIX: Si des paiements sont trouvés, vérifier le statut de leurs call_sessions
      // Si TOUTES les call_sessions associées sont en échec, autoriser un nouveau paiement
      console.log(`🔍 ${snapshot.size} paiement(s) existant(s) trouvé(s) - vérification des call_sessions...`);

      for (const paymentDoc of snapshot.docs) {
        const paymentData = paymentDoc.data();
        const callSessionId = paymentData.callSessionId;

        if (!callSessionId) {
          // Paiement sans call_session → potentiellement encore en cours, bloquer
          console.log(`🔍 Paiement ${paymentDoc.id} sans callSessionId - BLOQUÉ`);
          return true;
        }

        // Récupérer la call_session associée
        const callSessionDoc = await this.db.collection('call_sessions').doc(callSessionId).get();

        if (!callSessionDoc.exists) {
          // Call session n'existe plus, paiement orphelin - autoriser nouveau paiement
          console.log(`🔍 Call session ${callSessionId} n'existe plus - OK pour continuer`);
          continue;
        }

        const callSessionData = callSessionDoc.data();
        const callStatus = callSessionData?.status;

        // Statuts terminaux d'échec → autoriser nouveau paiement
        const failedStatuses = ['failed', 'cancelled', 'refunded', 'no_answer'];

        if (failedStatuses.includes(callStatus)) {
          console.log(`🔍 Call session ${callSessionId} en statut "${callStatus}" - OK pour réessayer`);
          continue;
        }

        // Statut completed avec paiement capturé → bloquer (appel réussi)
        if (callStatus === 'completed' && ['succeeded', 'captured'].includes(paymentData.status)) {
          console.log(`🔍 Paiement ${paymentDoc.id} pour appel réussi (${callStatus}/${paymentData.status}) - BLOQUÉ`);
          return true;
        }

        // Paiement en cours pour appel actif → bloquer
        const activeStatuses = ['pending', 'scheduled', 'client_connecting', 'provider_connecting', 'both_connecting', 'in_progress'];
        if (activeStatuses.includes(callStatus)) {
          console.log(`🔍 Paiement ${paymentDoc.id} pour appel actif (${callStatus}) - BLOQUÉ`);
          return true;
        }

        console.log(`🔍 Call session ${callSessionId} en statut "${callStatus}" - statut non-bloquant`);
      }

      // Tous les paiements trouvés sont pour des appels échoués → autoriser
      console.log('🔍 Tous les paiements existants sont pour des appels échoués - OK pour nouveau paiement');
      return false;
    } catch (error) {
      await logError('StripeManager:findExistingPayment', error);
      // En cas d'erreur, on préfère **ne pas** bloquer
      return false;
    }
  }

  private async validateUsers(clientId: string, providerId: string): Promise<void> {
    const [clientDoc, providerDoc] = await Promise.all([
      this.db.collection('users').doc(clientId).get(),
      this.db.collection('users').doc(providerId).get(),
    ]);

    if (!clientDoc.exists) throw new HttpsError('failed-precondition', 'Client non trouvé');
    if (!providerDoc.exists) throw new HttpsError('failed-precondition', 'Prestataire non trouvé');

    const clientData = clientDoc.data() as UserDoc | undefined;
    const providerData = providerDoc.data() as UserDoc | undefined;

    if (clientData?.status === 'suspended')
      throw new HttpsError('failed-precondition', 'Compte client suspendu');
    if (providerData?.status === 'suspended')
      throw new HttpsError('failed-precondition', 'Compte prestataire suspendu');
  }

  private async getClientEmail(clientId: string): Promise<string | undefined> {
    try {
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      const data = clientDoc.data() as UserDoc | undefined;
      return data?.email;
    } catch (error) {
      console.warn("Impossible de récupérer l'email client:", error);
      return undefined;
    }
  }

  private async savePaymentRecord(
    paymentIntent: Stripe.PaymentIntent,
    dataEuros: StripePaymentData & { commissionAmount: number },
    cents: {
      amountCents: number;
      commissionAmountCents: number;
      providerAmountCents: number;
      currency: SupportedCurrency;
      // Destination Charges (legacy)
      useDestinationCharges?: boolean;
      destinationAccountId?: string;
      transferAmountCents?: number;
      // Direct Charges (nouveau modele)
      useDirectCharges?: boolean;
      providerStripeAccountId?: string;
      applicationFeeAmountCents?: number;
      // KYC / Pending Transfer
      pendingTransferRequired?: boolean;
      providerKycComplete?: boolean;
    }
  ): Promise<void> {
    const paymentRecord: PaymentDoc = {
      stripePaymentIntentId: paymentIntent.id,
      clientId: dataEuros.clientId,
      providerId: dataEuros.providerId,

      // Montants en cents (source de verite chiffree)
      amount: cents.amountCents,
      commissionAmount: cents.commissionAmountCents,
      providerAmount: cents.providerAmountCents,

      // Redondance lisible (euros) pour analytics
      amountInEuros: dataEuros.amount,
      commissionAmountEuros: dataEuros.commissionAmount,
      providerAmountEuros: dataEuros.providerAmount,

      currency: cents.currency,
      serviceType: dataEuros.serviceType,
      providerType: dataEuros.providerType,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret ?? null,

      createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as admin.firestore.Timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as admin.firestore.Timestamp,

      metadata: (dataEuros.metadata || {}) as Record<string, unknown>,
      environment: process.env.NODE_ENV || 'development',
      mode: this.mode,
      ...(dataEuros.callSessionId && dataEuros.callSessionId.trim() !== ''
        ? { callSessionId: dataEuros.callSessionId }
        : {}),

      // ===== Direct Charges =====
      useDirectCharges: cents.useDirectCharges || false,
      ...(cents.providerStripeAccountId ? { providerStripeAccountId: cents.providerStripeAccountId } : {}),
      ...(cents.applicationFeeAmountCents !== undefined ? { applicationFeeAmountCents: cents.applicationFeeAmountCents } : {}),

      // ===== KYC / Pending Transfer =====
      providerKycComplete: cents.providerKycComplete || false,
      pendingTransferRequired: cents.pendingTransferRequired || false,

      // ===== Destination Charges (legacy) =====
      useDestinationCharges: cents.useDestinationCharges || false,
      ...(cents.destinationAccountId ? { destinationAccountId: cents.destinationAccountId } : {}),
      ...(cents.transferAmountCents !== undefined ? { transferAmountCents: cents.transferAmountCents } : {}),
    };

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord as unknown as admin.firestore.DocumentData);

    console.log('[savePaymentRecord] Paiement sauvegardé:', {
      id: paymentIntent.id,
      amountCents: cents.amountCents,
      amountEuros: dataEuros.amount,
      mode: this.mode,
      hasCallSessionId: Boolean(paymentRecord.callSessionId),
      useDirectCharges: cents.useDirectCharges || false,
      providerKycComplete: cents.providerKycComplete || false,
      pendingTransferRequired: cents.pendingTransferRequired || false,
      providerStripeAccountId: cents.providerStripeAccountId || null,
    });
  }
}

/** Instance réutilisable */
export const stripeManager = new StripeManager();
