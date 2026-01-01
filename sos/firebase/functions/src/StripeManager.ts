// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';

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
 * Helpers d’instanciation Stripe
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
   * 2) sinon on tente via variables d'env (STRIPE_SECRET_KEY_LIVE/TEST),
   *    avec STRIPE_MODE (live|test) ou NODE_ENV pour choisir.
   * 3) fallback STRIPE_SECRET_KEY (ancien schéma)
   */
  private validateConfiguration(secretKey?: string): void {
    if (secretKey) {
      this.initializeStripe(secretKey);
      return;
    }
       
    const envMode: 'live' | 'test' =
      process.env.STRIPE_MODE === 'live' || process.env.STRIPE_MODE === 'test'
        ? (process.env.STRIPE_MODE as 'live' | 'test')
        : isProd
        ? 'live'
        : 'test';

    const keyFromEnv =
      envMode === 'live'
        ? process.env.STRIPE_SECRET_KEY_LIVE
        : process.env.STRIPE_SECRET_KEY_TEST;

    if (keyFromEnv) {
      this.initializeStripe(keyFromEnv);
      return;
    }

    // Dernier fallback : ancien nom unique (déconseillé)
    if (process.env.STRIPE_SECRET_KEY) {
      this.initializeStripe(process.env.STRIPE_SECRET_KEY);
      return;
    }

    throw new HttpsError(
      'failed-precondition',
      'Aucune clé Stripe disponible. Passe une clé en argument ou définis STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST.'
    );
  }

  private validatePaymentData(data: StripePaymentData): void {
    const { amount, clientId, providerId } = data;

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Montant invalide');
    }
    if (amount < 5) throw new HttpsError('failed-precondition', 'Montant minimum de 5€ requis');
    if (amount > 2000) throw new HttpsError('failed-precondition', 'Montant maximum de 2000€ dépassé');

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
   * Public API
   * ------------------------------------------------------------------- */

  async createPaymentIntent(
    data: StripePaymentData,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
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

      // ===== P0 FIX: Idempotency key pour éviter les doubles charges =====
      // La clé est basée sur clientId + providerId + callSessionId + amount
      // IMPORTANT: NE PAS inclure Date.now() car cela rend la clé unique à chaque appel
      // et annule l'effet de l'idempotence (protection contre les doubles charges)
      const idempotencyKey = `pi_create_${data.clientId}_${data.providerId}_${data.callSessionId || 'no-session'}_${amountCents}`;

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

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
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

  async capturePayment(
    paymentIntentId: string,
    sessionId?: string,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'requires_capture') {
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
            const VALID_KYC_STATUSES = ['completed', 'verified'];

            if (!kycStatus || !VALID_KYC_STATUSES.includes(kycStatus)) {
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

              // En production, on peut choisir de bloquer ou juste alerter
              // Pour l'instant, on alerte mais on continue la capture
              // Pour bloquer, décommenter les lignes suivantes:
              // throw new HttpsError(
              //   'failed-precondition',
              //   'Impossible de capturer: KYC du prestataire non vérifié'
              // );
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

      // Verifier si ce paiement utilisait Destination Charges
      const paymentDoc = await this.db.collection('payments').doc(paymentIntentId).get();
      const paymentData = paymentDoc.data();
      const usedDestinationCharges = paymentData?.useDestinationCharges === true;
      const wasTransferred = !!paymentData?.transferId || !!paymentData?.destinationAccountId;

      console.log('[refundPayment] Verification Destination Charges:', {
        paymentIntentId,
        usedDestinationCharges,
        wasTransferred,
        destinationAccountId: paymentData?.destinationAccountId || null,
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
        },
      };

      // ===== DESTINATION CHARGES: Inverser aussi le transfert au prestataire =====
      // Avec Destination Charges, quand on rembourse apres capture, il faut aussi
      // recuperer l'argent qui a ete envoye au prestataire via transfer_data
      if (usedDestinationCharges || wasTransferred) {
        refundData.reverse_transfer = true;
        console.log('[refundPayment] reverse_transfer active - le transfert au prestataire sera inverse');
      }

      if (amount !== undefined) refundData.amount = toCents(amount);

      // ===== P0 FIX: Idempotency key pour le remboursement =====
      // IMPORTANT: NE PAS inclure Date.now() - un remboursement ne doit se faire qu'une seule fois
      const refundIdempotencyKey = `refund_${paymentIntentId}_${amount || 'full'}`;
      const refund = await this.stripe.refunds.create(
        refundData,
        { idempotencyKey: refundIdempotencyKey.substring(0, 255) }
      );

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
        transferReversed: usedDestinationCharges || wasTransferred,
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

      return { success: true, paymentIntentId };
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

      let query: admin.firestore.Query<admin.firestore.DocumentData> = this.db
        .collection('payments')
        .where('clientId', '==', clientId)
        .where('providerId', '==', providerId)
        .where('status', 'in', ['succeeded', 'requires_capture']);

      if (sessionId && sessionId.trim() !== '') {
        query = query.where('callSessionId', '==', sessionId);
      }

      const snapshot = await query.limit(5).get();
      return !snapshot.empty;
    } catch (error) {
      await logError('StripeManager:findExistingPayment', error);
      // En cas d’erreur, on préfère **ne pas** bloquer
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
