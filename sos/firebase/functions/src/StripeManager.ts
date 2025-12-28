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

  /* ===== Destination Charges (nouveau modèle de paiement) ===== */
  /**
   * Stripe Account ID du prestataire (acct_xxx) pour Destination Charges.
   * Si fourni, le paiement sera splitté automatiquement à la capture.
   */
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
  amountInEuros: number; // lecture facilité
  commissionAmountEuros: number;
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
  /* ===== Destination Charges ===== */
  /** Stripe Account ID de destination (si Destination Charges utilisé) */
  destinationAccountId?: string;
  /** Montant transféré au prestataire en centimes (via transfer_data.amount) */
  transferAmountCents?: number;
  /** Indique si le paiement utilise Destination Charges */
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
    const tolerance = 0.02;
    const delta = Math.abs(calculatedTotal - amount);

    if (delta > tolerance) {
      // tolérance pour arrondis; si > 1€, on bloque
      if (delta > 1) {
        throw new HttpsError(
          'failed-precondition',
          `Incohérence montants: ${amount}€ != ${calculatedTotal}€`
        );
      }
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

      // ===== Destination Charges: verification du compte prestataire =====
      const useDestinationCharges = Boolean(data.destinationAccountId);

      if (useDestinationCharges) {
        console.log('[createPaymentIntent] Mode Destination Charges active:', {
          destinationAccountId: data.destinationAccountId,
          transferAmountCents: providerAmountCents,
          platformFeeCents: commissionAmountCents,
        });

        // Validation du format du Stripe Account ID
        if (!data.destinationAccountId!.startsWith('acct_')) {
          throw new HttpsError(
            'invalid-argument',
            `destinationAccountId invalide: doit commencer par "acct_" (recu: ${data.destinationAccountId})`
          );
        }

        // Verifier que le compte Connect est valide et peut recevoir des paiements
        try {
          const connectedAccount = await this.stripe.accounts.retrieve(data.destinationAccountId!);

          if (!connectedAccount.charges_enabled) {
            console.error('[createPaymentIntent] Le compte Connect ne peut pas recevoir de paiements:', {
              accountId: data.destinationAccountId,
              chargesEnabled: connectedAccount.charges_enabled,
              payoutsEnabled: connectedAccount.payouts_enabled,
            });
            throw new HttpsError(
              'failed-precondition',
              'Le compte Stripe du prestataire ne peut pas encore recevoir de paiements. Verifiez que l\'onboarding est termine.'
            );
          }

          console.log('[createPaymentIntent] Compte Connect verifie:', {
            accountId: data.destinationAccountId,
            chargesEnabled: connectedAccount.charges_enabled,
            payoutsEnabled: connectedAccount.payouts_enabled,
          });
        } catch (stripeError) {
          if (stripeError instanceof HttpsError) throw stripeError;

          console.error('[createPaymentIntent] Erreur lors de la verification du compte Connect:', stripeError);
          throw new HttpsError(
            'failed-precondition',
            `Compte Stripe Connect introuvable ou invalide: ${data.destinationAccountId}`
          );
        }
      }

      console.log('Creation PaymentIntent Stripe:', {
        amountEuros: data.amount,
        amountCents,
        currency,
        serviceType: data.serviceType,
        commissionEuros,
        commissionAmountCents,
        providerEuros: data.providerAmount,
        providerAmountCents,
        mode: this.mode,
        useDestinationCharges,
        ...(useDestinationCharges && {
          destinationAccountId: data.destinationAccountId,
          transferAmountCents: providerAmountCents,
        }),
      });

      console.log("data in createPaymentIntent", data.callSessionId);

      // Construction des parametres du PaymentIntent
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency,
        capture_method: 'manual', // L'argent est bloque mais pas preleve jusqu'a capture apres appel >= 2 min
        automatic_payment_methods: { enabled: true },
        metadata: {
          clientId: data.clientId,
          providerId: data.providerId,
          serviceType: data.serviceType,
          providerType: data.providerType,
          commissionAmountCents: String(commissionAmountCents),
          providerAmountCents: String(providerAmountCents),
          commissionAmountEuros: commissionEuros.toFixed(2),
          providerAmountEuros: data.providerAmount.toFixed(2),
          environment: process.env.NODE_ENV || 'development',
          mode: this.mode,
          useDestinationCharges: String(useDestinationCharges),
          ...(data.destinationAccountId ? { destinationAccountId: data.destinationAccountId } : {}),
          ...(data.callSessionId ? { callSessionId: data.callSessionId } : {}),
          ...(data.metadata || {}),
        },
        description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
        statement_descriptor_suffix: 'SOS EXPAT',
        receipt_email: await this.getClientEmail(data.clientId),
      };

      // ===== Ajout de transfer_data pour Destination Charges =====
      // Le paiement sera automatiquement splitte a la capture:
      // - transfer_data.amount (providerAmountCents) va au prestataire
      // - Le reste (commissionAmountCents) reste sur le compte plateforme
      if (useDestinationCharges && data.destinationAccountId) {
        paymentIntentParams.transfer_data = {
          destination: data.destinationAccountId,
          amount: providerAmountCents, // Montant en centimes pour le prestataire
        };
        // on_behalf_of fait apparaitre le paiement sur le dashboard du prestataire
        paymentIntentParams.on_behalf_of = data.destinationAccountId;

        console.log('[createPaymentIntent] transfer_data configure:', {
          destination: data.destinationAccountId,
          transferAmountCents: providerAmountCents,
          platformFeeCents: amountCents - providerAmountCents,
        });
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
      console.log('paymentIntent', paymentIntent);

      console.log('PaymentIntent Stripe cree:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
        status: paymentIntent.status,
        mode: this.mode,
        useDestinationCharges,
        hasTransferData: !!paymentIntent.transfer_data,
      });

      await this.savePaymentRecord(
        paymentIntent,
        { ...data, commissionAmount: commissionEuros },
        {
          amountCents,
          commissionAmountCents,
          providerAmountCents,
          currency,
          useDestinationCharges,
          destinationAccountId: data.destinationAccountId,
          transferAmountCents: useDestinationCharges ? providerAmountCents : undefined,
        }
      );

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

      // Capture le paiement - avec Destination Charges, le transfert est cree automatiquement
      const captured = await this.stripe.paymentIntents.capture(paymentIntentId);

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

      const refund = await this.stripe.refunds.create(refundData);

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
    secretKey?: string
  ): Promise<PaymentResult & { transferId?: string }> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      console.log(`💸 Initiating transfer to provider ${providerId}: ${providerAmount} EUR`);

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
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(providerAmount * 100), // Convert to cents
        currency: 'eur',
        destination: stripeAccountId,
        transfer_group: sessionId,
        description: `Payment for call ${sessionId}`,
        metadata: {
          sessionId: sessionId,
          providerId: providerId,
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

    const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId, {
      ...(normalized ? { cancellation_reason: normalized } : {}),
    });

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
      // Destination Charges
      useDestinationCharges?: boolean;
      destinationAccountId?: string;
      transferAmountCents?: number;
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

      // ===== Destination Charges =====
      useDestinationCharges: cents.useDestinationCharges || false,
      ...(cents.destinationAccountId ? { destinationAccountId: cents.destinationAccountId } : {}),
      ...(cents.transferAmountCents !== undefined ? { transferAmountCents: cents.transferAmountCents } : {}),
    };

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord as unknown as admin.firestore.DocumentData);

    console.log('Enregistrement paiement sauvegarde en DB:', {
      id: paymentIntent.id,
      amountCents: cents.amountCents,
      amountEuros: dataEuros.amount,
      mode: this.mode,
      hasCallSessionId: Boolean(paymentRecord.callSessionId),
      useDestinationCharges: cents.useDestinationCharges || false,
      destinationAccountId: cents.destinationAccountId || null,
    });
  }
}

/** Instance réutilisable */
export const stripeManager = new StripeManager();
