// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';
import { logger as prodLogger } from './utils/productionLogger';
// P0-3 FIX: Use centralized Stripe secrets helper
import { getStripeSecretKey, getStripeSecretKeyLegacy, getStripeMode, validateStripeMode } from './lib/stripe';
// P0 FIX: Import PayPalManager for PayPal-only provider payouts
import { PayPalManager } from './PayPalManager';
// P0 FIX 2026-01-30: Circuit breaker for Stripe API resilience
import { stripeCircuitBreaker, CircuitBreakerError } from './lib/circuitBreaker';

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

// P0 SECURITY FIX: Helper pour masquer les IDs sensibles dans les logs
function maskId(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  return `${id.substring(0, 8)}...`;
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
  /** Client's country for analytics (resolved at payment time) */
  clientCountry?: string;
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
  /* ===== Destination Charges (modèle actif) ===== */
  /** Stripe Account ID du provider (pour transfer_data.destination) */
  providerStripeAccountId?: string;
  /** Commission SOS-Expat en centimes (application_fee_amount) */
  applicationFeeAmountCents?: number;
  /** Indique si le paiement utilise Destination Charges (KYC complet, transfert auto) */
  useDestinationCharges?: boolean;
  /** @deprecated - conservé pour compatibilité avec anciens paiements Direct Charges */
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
   * P0-1 FIX: Validate that production uses live mode
   */
  private validateConfiguration(secretKey?: string): void {
    if (secretKey) {
      this.initializeStripe(secretKey);
      return;
    }

    // P0-3 FIX: Use helper that properly accesses Firebase v2 secrets
    const envMode = getStripeMode();

    // P0-1 FIX: Validate Stripe mode is appropriate for environment
    // Throws error if test mode is used in production
    validateStripeMode(envMode);

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
    const isUSD = data.currency?.toString().toLowerCase() === 'usd';
    const maxAmount = isUSD ? 600 : 500; // USD: 600$, EUR: 500€
    if (amount < 0.50) throw new HttpsError('failed-precondition', `Montant minimum de 0.50${currencySymbol} requis`);
    if (amount > maxAmount) throw new HttpsError('failed-precondition', `Montant maximum de ${maxAmount}${currencySymbol} dépassé`);

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
   * Détermine comment gérer le payout pour un profil AAA ou multiprestataire
   * @param providerId - ID du provider
   * @returns Décision de payout AAA
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
      // Récupérer le document provider
      const providerDoc = await this.db.collection('sos_profiles').doc(providerId).get();
      const provider = providerDoc.data();

      if (!provider) {
        return {
          isAAA: false,
          mode: 'external',
          skipPayout: false,
          reason: 'Provider not found - normal payout flow',
        };
      }

      // Vérifier le mode de payout (AAA ou multiprestataire)
      // Priorité: aaaPayoutMode > payoutMode > 'internal' pour AAA / null pour normal
      const payoutMode = provider.aaaPayoutMode || provider.payoutMode;
      const isAAA = provider.isAAA === true;

      // Si pas de payoutMode configuré et pas AAA → payout normal
      if (!payoutMode && !isAAA) {
        return {
          isAAA: false,
          mode: 'external',
          skipPayout: false,
          reason: 'No special payout mode configured - normal payout flow',
        };
      }

      // Déterminer le mode effectif
      const effectivePayoutMode = payoutMode || 'internal';

      if (effectivePayoutMode === 'internal') {
        console.log(`💼 [PAYOUT] Provider ${providerId} has INTERNAL mode - skipping transfer (isAAA=${isAAA})`);
        return {
          isAAA,
          mode: 'internal',
          skipPayout: true,
          reason: isAAA
            ? 'AAA profile with internal mode - money stays on SOS-Expat'
            : 'Multiprestataire profile with internal mode - money stays on SOS-Expat',
        };
      }

      // Mode externe - récupérer la configuration des comptes externes
      const configDoc = await this.db.collection('admin_config').doc('aaa_payout').get();
      const config = configDoc.data() as AaaPayoutConfig | undefined;

      if (!config || !config.externalAccounts || config.externalAccounts.length === 0) {
        console.warn(`⚠️ [PAYOUT] No external accounts configured - falling back to internal`);
        return {
          isAAA,
          mode: 'internal',
          skipPayout: true,
          reason: 'No external accounts configured - fallback to internal',
        };
      }

      // Trouver le compte externe
      const externalAccount = config.externalAccounts.find(
        (acc) => acc.id === effectivePayoutMode && acc.isActive
      );

      if (!externalAccount) {
        console.warn(`⚠️ [PAYOUT] External account ${effectivePayoutMode} not found or inactive - falling back to internal`);
        return {
          isAAA,
          mode: 'internal',
          skipPayout: true,
          reason: `External account ${effectivePayoutMode} not found - fallback to internal`,
        };
      }

      console.log(`💼 [PAYOUT] Provider ${providerId} routing to EXTERNAL account → ${externalAccount.name} (isAAA=${isAAA})`);
      return {
        isAAA,
        mode: 'external',
        skipPayout: false,
        externalAccount,
        reason: `Routing to ${externalAccount.name} (${externalAccount.gateway})`,
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
      // P0 SECURITY FIX: Masquer les IDs sensibles dans les logs
      prodLogger.info('STRIPE_PAYMENT_START', `[${requestId}] Creating PaymentIntent`, {
        requestId,
        clientId: maskId(data.clientId),
        providerId: maskId(data.providerId),
        amount: data.amount,
        currency: data.currency,
        serviceType: data.serviceType,
        callSessionId: data.callSessionId,
      });

      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      // 🚀 PERF: Anti-doublons et validateUsers SUPPRIMÉS - déjà fait dans createPaymentIntent.ts
      // - checkAndLockDuplicatePayments() remplace findExistingPayment() (gain ~200-400ms)
      // - validateBusinessLogic() vérifie déjà les utilisateurs (gain ~100-200ms)

      this.validatePaymentData(data);

      const currency = normalizeCurrency(data.currency);
      const commissionEuros = data.connectionFeeAmount ?? data.commissionAmount ?? 0;

      const amountCents = toCents(data.amount);
      const commissionAmountCents = toCents(commissionEuros);
      const providerAmountCents = toCents(data.providerAmount);

      // ===== DESTINATION CHARGES vs PLATFORM ESCROW =====
      // Priorité: providerStripeAccountId > destinationAccountId (legacy)
      // FIX 2026-01-30: Utiliser DESTINATION CHARGES au lieu de DIRECT CHARGES
      // - Destination Charges: PaymentIntent créé sur la PLATEFORME, transfert auto au provider
      // - Direct Charges: PaymentIntent créé sur le COMPTE CONNECT (problème frontend)
      const providerStripeAccountId = data.providerStripeAccountId || data.destinationAccountId;
      let useDestinationCharges = false;
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
            // ===== KYC COMPLET: Destination Charges =====
            // PaymentIntent créé sur la plateforme, transfert automatique au provider après capture
            useDestinationCharges = true;
            providerKycComplete = true;
            console.log('[createPaymentIntent] KYC complet - Mode DESTINATION CHARGES actif:', {
              accountId: providerStripeAccountId,
              chargesEnabled: connectedAccount.charges_enabled,
              payoutsEnabled: connectedAccount.payouts_enabled,
              country: connectedAccount.country,
              note: 'PaymentIntent créé sur plateforme, transfert auto après capture',
            });
          } else {
            // ===== KYC INCOMPLET: Platform Escrow =====
            // L'argent va sur le compte plateforme, transfert différé quand KYC sera fait
            useDestinationCharges = false;
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
          useDestinationCharges = false;
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
        useDestinationCharges,
        providerKycComplete,
        pendingTransferRequired,
        providerStripeAccountId: providerStripeAccountId || 'N/A (platform mode)',
      });

      console.log("data in createPaymentIntent", data.callSessionId);

      // ===== DESTINATION CHARGES: Construction des paramètres =====
      // FIX 2026-01-30: Utiliser Destination Charges au lieu de Direct Charges
      // Avec Destination Charges:
      // - La charge est créée SUR LA PLATEFORME (pas sur le compte Connect)
      // - transfer_data.destination spécifie le compte Connect du provider
      // - application_fee_amount définit la commission SOS-Expat
      // - Stripe transfère automatiquement (amount - application_fee) au provider après capture
      // - capture_method: 'manual' permet l'escrow pendant l'appel
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency,
        capture_method: 'manual', // ESCROW: L'argent est bloqué jusqu'à capture après appel >= 2 min
        automatic_payment_methods: { enabled: true },
        // ===== DESTINATION CHARGES: transfer_data + application_fee_amount =====
        // - transfer_data.destination: le provider reçoit (amount - application_fee) après capture
        // - application_fee_amount: SOS-Expat garde cette commission
        ...(useDestinationCharges && providerStripeAccountId ? {
          transfer_data: {
            destination: providerStripeAccountId,
          },
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
          useDestinationCharges: String(useDestinationCharges),
          useDirectCharges: 'false', // Legacy: toujours false maintenant
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


      // ===== DESTINATION CHARGES: Création sur la plateforme =====
      // FIX 2026-01-30: Toujours créer sur la plateforme (pas de stripeAccount option)
      // - transfer_data.destination dans les params gère le transfert auto au provider
      // - L'argent va à la plateforme, Stripe transfère au provider après capture
      let paymentIntent: Stripe.PaymentIntent;

      // P0 FIX 2026-01-30: Wrap Stripe API calls with circuit breaker for resilience
      try {
        // Toujours créer sur le compte plateforme
        // Si useDestinationCharges=true, les params contiennent transfer_data.destination
        console.log('[createPaymentIntent] Création PaymentIntent sur le compte plateforme', {
          useDestinationCharges,
          hasTransferData: useDestinationCharges && !!providerStripeAccountId,
        });
        paymentIntent = await stripeCircuitBreaker.execute(() =>
          this.stripe!.paymentIntents.create(
            paymentIntentParams,
            {
              idempotencyKey: idempotencyKey.substring(0, 255),
              // PAS de stripeAccount ici - le PaymentIntent est créé sur la plateforme
            }
          )
        );
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          console.error('[createPaymentIntent] Circuit breaker OPEN - Stripe API unavailable');
          throw new HttpsError('unavailable', 'Service de paiement temporairement indisponible. Réessayez dans quelques instants.');
        }
        throw error;
      }
      console.log('paymentIntent created with idempotency key:', idempotencyKey.substring(0, 50) + '...');

      console.log('PaymentIntent Stripe cree (DESTINATION CHARGES):', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
        status: paymentIntent.status,
        mode: this.mode,
        useDestinationCharges,
        applicationFeeAmount: useDestinationCharges ? commissionAmountCents : 0,
        transferDestination: useDestinationCharges ? providerStripeAccountId : 'N/A (platform escrow)',
        createdOnAccount: 'plateforme (toujours)',
      });

      await this.savePaymentRecord(
        paymentIntent,
        { ...data, commissionAmount: commissionEuros },
        {
          amountCents,
          commissionAmountCents,
          providerAmountCents,
          currency,
          useDirectCharges: false, // Legacy: toujours false (on utilise Destination Charges)
          useDestinationCharges,
          providerStripeAccountId,
          applicationFeeAmountCents: useDestinationCharges ? commissionAmountCents : undefined,
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
        useDestinationCharges,
        pendingTransferRequired,
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      // P0 SECURITY FIX: Masquer les IDs sensibles et ne pas logger les stack traces
      prodLogger.error('STRIPE_PAYMENT_ERROR', `[${requestId}] PaymentIntent creation failed`, {
        requestId,
        clientId: maskId(data.clientId),
        providerId: maskId(data.providerId),
        error: error instanceof Error ? error.message : String(error),
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

      // ===== P0 FIX: Récupérer le providerStripeAccountId pour Direct Charges =====
      // Les PaymentIntents créés en Direct Charges sont sur le compte du provider,
      // pas sur le compte de la plateforme. Il faut donc utiliser stripeAccount
      // pour retrieve ET capture.
      let providerStripeAccountId: string | undefined;
      let useDirectCharges = false;
      let storedProviderAmountCents: number | undefined; // P1 FIX: Stocker le montant provider pour fallback précis

      try {
        const paymentDoc = await this.db.collection('payments').doc(paymentIntentId).get();
        if (paymentDoc.exists) {
          const paymentData = paymentDoc.data();
          providerStripeAccountId = paymentData?.providerStripeAccountId;
          useDirectCharges = paymentData?.useDirectCharges === true;
          // P1 FIX: Stocker providerAmount pour utilisation ultérieure (évite le fallback 80%)
          if (paymentData?.providerAmount) {
            // FIX: Detect format — providerAmountEuros exists = new format (providerAmount is in cents)
            if (paymentData.providerAmountEuros !== undefined) {
              storedProviderAmountCents = Math.round(Number(paymentData.providerAmount));
            } else {
              // Legacy format: providerAmount was in euros
              storedProviderAmountCents = Math.round(Number(paymentData.providerAmount) * 100);
            }
          }

          console.log('[capturePayment] Payment document retrieved:', {
            paymentIntentId,
            useDirectCharges,
            providerStripeAccountId: providerStripeAccountId || 'N/A (platform mode)',
            storedProviderAmountCents,
          });
        } else {
          console.warn('[capturePayment] Payment document not found in Firestore:', paymentIntentId);
        }
      } catch (firestoreError) {
        console.error('[capturePayment] Error retrieving payment document:', firestoreError);
        // Continue without stripeAccount - will work for platform mode payments
      }

      // Configurer les options Stripe pour Direct Charges
      const stripeAccountOptions: Stripe.RequestOptions | undefined =
        useDirectCharges && providerStripeAccountId
          ? { stripeAccount: providerStripeAccountId }
          : undefined;

      if (useDirectCharges && providerStripeAccountId) {
        console.log('[capturePayment] Direct Charges mode - using stripeAccount:', providerStripeAccountId);
      }

      // Retrieve avec stripeAccount si Direct Charges
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        {},
        stripeAccountOptions
      );

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
                    // P0 FIX 2026-01-30: FAIL-FAST - Récupérer le montant exact du provider
                    // NE JAMAIS utiliser de fallback qui pourrait sous-payer le provider
                    const providerAmountCents = paymentIntent.metadata?.providerAmountCents
                      ? parseInt(paymentIntent.metadata.providerAmountCents, 10)
                      : storedProviderAmountCents;

                    if (!providerAmountCents) {
                      // FAIL-FAST: Créer une alerte admin et ne pas procéder au payout
                      console.error(`[capturePayment] ❌ CRITICAL: No provider amount found for AAA transfer - payment ${paymentIntentId}`);
                      await this.db.collection('admin_alerts').add({
                        type: 'payment_amount_missing',
                        priority: 'critical',
                        title: '⚠️ Montant provider manquant pour transfert AAA',
                        message: `Le paiement ${paymentIntentId} n'a pas de montant provider enregistré. Transfert AAA suspendu.`,
                        paymentIntentId,
                        providerId,
                        sessionId: sessionId || null,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                      // Ne pas throw - le paiement est capturé, juste le transfert est suspendu
                      // Créer un pending_transfer pour traitement manuel
                      await this.db.collection('pending_transfers').add({
                        paymentIntentId,
                        providerId,
                        amount: null, // Montant inconnu - nécessite vérification manuelle
                        currency: paymentIntent.currency,
                        status: 'pending_review',
                        reason: 'Provider amount missing - requires manual verification',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                      // Skip transfer - providerAmountCents is missing
                    } else {
                      // Créer un transfert vers le compte Stripe externe consolidé
                      // P0 FIX 2026-01-30: Wrap transfer with circuit breaker
                      const transfer = await stripeCircuitBreaker.execute(() =>
                        this.stripe!.transfers.create({
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
                        })
                      );

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
                    }
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
      // ===== P0 FIX: Capture avec stripeAccount pour Direct Charges =====
      const captureOptions: Stripe.RequestOptions = {
        idempotencyKey: captureIdempotencyKey.substring(0, 255),
        // Ajouter stripeAccount si Direct Charges
        ...(useDirectCharges && providerStripeAccountId ? { stripeAccount: providerStripeAccountId } : {}),
      };

      console.log('[capturePayment] Capturing with options:', {
        paymentIntentId,
        useDirectCharges,
        stripeAccount: captureOptions.stripeAccount || 'platform (default)',
        idempotencyKey: captureIdempotencyKey.substring(0, 30) + '...',
      });

      // P0 FIX 2026-01-30: Wrap capture with circuit breaker
      let captured: Stripe.PaymentIntent;
      try {
        captured = await stripeCircuitBreaker.execute(() =>
          this.stripe!.paymentIntents.capture(
            paymentIntentId,
            {},
            captureOptions
          )
        );
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          console.error('[capturePayment] Circuit breaker OPEN - Stripe API unavailable');
          throw new HttpsError('unavailable', 'Service de paiement temporairement indisponible. La capture sera retentée automatiquement.');
        }
        throw error;
      }

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

          // P0 FIX: Utiliser stripeAccount pour Direct Charges
          const charge = await this.stripe.charges.retrieve(
            chargeId,
            { expand: ['transfer'] },
            stripeAccountOptions
          );

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

      // =========================================================================
      // P0 FIX: Payout vers provider PayPal-only si pas de transfert Stripe
      // Si le provider est dans un pays PayPal-only, créer un payout PayPal
      // =========================================================================
      if (!transferId && !useDirectCharges) {
        const providerId = captured.metadata?.providerId;
        if (providerId) {
          try {
            await this.handlePayPalProviderPayout(
              providerId,
              captured.amount_received || captured.amount,
              captured.currency.toUpperCase() as 'EUR' | 'USD',
              sessionId || captured.metadata?.callSessionId || paymentIntentId
            );
          } catch (payoutError) {
            // Log mais ne pas bloquer - le payout peut être retraité plus tard
            console.error('[capturePayment] PayPal payout error (non-blocking):', payoutError);
            // P0 SECURITY FIX: Masquer providerId dans les logs
            prodLogger.warn('PAYPAL_PAYOUT_DEFERRED', `PayPal payout deferred for provider`, {
              providerId: maskId(providerId),
              paymentIntentId: maskId(paymentIntentId),
              error: payoutError instanceof Error ? payoutError.message : 'Unknown error',
            });
          }
        }
      }

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

  /**
   * P0 FIX: Gère le payout vers un provider PayPal-only après capture Stripe
   *
   * Cette méthode est appelée après une capture Stripe réussie si:
   * - Aucun transfert Stripe n'a été créé (pas de Direct Charges)
   * - Le provider est dans un pays PayPal-only
   *
   * Le montant du provider (après commission SOS-Expat) est envoyé via PayPal Payout
   *
   * GESTION AAA PROFILES:
   * - Si provider.isAAA && aaaPayoutMode === 'internal' → Skip payout (argent reste sur plateforme)
   * - Si provider.isAAA && aaaPayoutMode === 'external' → Payout vers compte consolidé AAA
   * - Sinon → Payout normal vers email PayPal du provider
   */
  private async handlePayPalProviderPayout(
    providerId: string,
    capturedAmountCents: number,
    currency: 'EUR' | 'USD',
    sessionId: string
  ): Promise<void> {
    console.log(`[handlePayPalProviderPayout] Checking provider ${providerId} for PayPal payout...`);

    // 1. Récupérer le profil du provider
    const providerDoc = await this.db.collection('sos_profiles').doc(providerId).get();
    if (!providerDoc.exists) {
      console.log(`[handlePayPalProviderPayout] Provider ${providerId} not found - skipping`);
      return;
    }

    const provider = providerDoc.data();

    // =========================================================================
    // P0 FIX: Récupérer le montant EXACT du provider IMMÉDIATEMENT
    // NE JAMAIS utiliser capturedAmountCents (montant total) pour les payouts!
    // =========================================================================
    const paymentDoc = await this.db.collection('payments')
      .where('callSessionId', '==', sessionId)
      .limit(1)
      .get();

    let providerAmountCents: number;

    if (!paymentDoc.empty) {
      const paymentData = paymentDoc.docs[0].data();
      // FIX: Detect format — providerAmountEuros exists = new format (providerAmount is in cents)
      if (paymentData.providerAmountEuros !== undefined && paymentData.providerAmount) {
        // Post-P0 format: providerAmount is stored in cents by savePaymentRecord
        providerAmountCents = Math.round(Number(paymentData.providerAmount));
      } else if (paymentData.providerAmountCents) {
        providerAmountCents = Number(paymentData.providerAmountCents);
      } else if (paymentData.providerAmount) {
        // Legacy format: providerAmount was in euros
        providerAmountCents = Math.round(Number(paymentData.providerAmount) * 100);
      } else if (paymentData.metadata?.providerAmountCents) {
        providerAmountCents = Number(paymentData.metadata.providerAmountCents);
      } else if (paymentData.metadata?.providerAmount) {
        providerAmountCents = Math.round(Number(paymentData.metadata.providerAmount) * 100);
      } else {
        // P0 FIX 2026-01-30: FAIL-FAST - Ne jamais utiliser de fallback hardcodé
        // Créer une alerte admin et suspendre le payout
        console.error(`[handlePayPalProviderPayout] ❌ CRITICAL: No provider amount found in payment for session ${sessionId}`);
        await this.db.collection('admin_alerts').add({
          type: 'paypal_payout_amount_missing',
          priority: 'critical',
          title: '⚠️ Montant provider manquant pour payout PayPal',
          message: `Le paiement pour la session ${sessionId} n'a pas de montant provider. Payout PayPal suspendu pour éviter erreur de montant.`,
          sessionId,
          providerId,
          paymentId: paymentDoc.docs[0].id,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Créer un pending payout pour traitement manuel
        await this.db.collection('pending_paypal_payouts').add({
          providerId,
          sessionId,
          amountCents: null, // Montant inconnu
          currency,
          status: 'pending_review',
          reason: 'Provider amount missing in payment document - requires manual verification',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return; // FAIL-FAST: Ne pas procéder avec un montant potentiellement incorrect
      }
    } else {
      // P0 FIX 2026-01-30: FAIL-FAST - Payment document non trouvé
      console.error(`[handlePayPalProviderPayout] ❌ CRITICAL: Payment not found for session ${sessionId}`);
      await this.db.collection('admin_alerts').add({
        type: 'paypal_payout_payment_missing',
        priority: 'critical',
        title: '⚠️ Document paiement introuvable pour payout PayPal',
        message: `Aucun document de paiement trouvé pour la session ${sessionId}. Payout PayPal suspendu.`,
        sessionId,
        providerId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Créer un pending payout pour investigation
      await this.db.collection('pending_paypal_payouts').add({
        providerId,
        sessionId,
        amountCents: null,
        currency,
        status: 'pending_review',
        reason: 'Payment document not found - requires investigation',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return; // FAIL-FAST: Ne pas procéder sans données de paiement
    }

    console.log(`[handlePayPalProviderPayout] P0 FIX: Using correct provider amount: ${providerAmountCents} cents (NOT total: ${capturedAmountCents} cents)`);

    // 2. Vérifier si le provider utilise PayPal
    if (provider?.paymentGateway !== 'paypal') {
      console.log(`[handlePayPalProviderPayout] Provider ${providerId} uses ${provider?.paymentGateway || 'stripe'} - skipping PayPal payout`);
      return;
    }

    // 3. GESTION PROFILS AAA et MULTIPRESTATAIRES - Utiliser la logique centralisée
    const payoutDecision = await this.getAaaPayoutDecision(providerId);
    const hasSpecialPayoutMode = payoutDecision.mode === 'internal' || payoutDecision.externalAccount;

    if (hasSpecialPayoutMode && payoutDecision.skipPayout) {
      // Mode internal: l'argent reste sur la plateforme SOS-Expat
      console.log(`[handlePayPalProviderPayout] 💼 INTERNAL mode - skipping payout (${payoutDecision.reason})`);

      // Logger pour audit - P0 FIX: utiliser providerAmountCents, pas capturedAmountCents
      await this.db.collection('aaa_internal_payouts').add({
        providerId,
        sessionId,
        amountCents: providerAmountCents, // P0 FIX: montant provider, pas total
        currency,
        mode: 'internal',
        isAAA: payoutDecision.isAAA,
        reason: payoutDecision.reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // P0 SECURITY FIX: Masquer providerId dans les logs
      prodLogger.info('INTERNAL_PAYOUT', `Internal payout logged`, {
        providerId: maskId(providerId),
        sessionId,
        amountCents: providerAmountCents,
        currency,
        isAAA: payoutDecision.isAAA,
      });

        return;
    }

    // Mode external: utiliser le compte externe configuré dans payoutDecision
    let effectivePaypalEmail: string | undefined;

    if (payoutDecision.externalAccount && payoutDecision.externalAccount.gateway === 'paypal') {
      console.log(`[handlePayPalProviderPayout] 💼 EXTERNAL mode - using account: ${payoutDecision.externalAccount.name}`);
      // Utiliser l'email/accountId du compte externe configuré
      effectivePaypalEmail = payoutDecision.externalAccount.accountId;
    } else {
      // Payout normal vers le provider
      effectivePaypalEmail = provider?.paypalEmail || provider?.email;
    }

    // 4. Vérifier que nous avons un email PayPal
    if (!effectivePaypalEmail) {
      console.error(`[handlePayPalProviderPayout] No PayPal email available for ${providerId} - creating pending payout`);

      // Créer une entrée dans pending_paypal_payouts pour traitement ultérieur
      // P0 FIX: utiliser providerAmountCents, pas capturedAmountCents (montant total)
      await this.db.collection('pending_paypal_payouts').add({
        providerId,
        sessionId,
        amountCents: providerAmountCents, // P0 FIX: montant provider, pas total
        currency,
        status: 'pending_email',
        reason: 'No PayPal email configured',
        isAAA: payoutDecision.isAAA,
        hasExternalAccount: !!payoutDecision.externalAccount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Use the effective email for the payout
    const paypalEmail = effectivePaypalEmail;

    // 5. Convertir en unité principale pour PayPal (providerAmountCents déjà calculé au début)
    const providerAmount = providerAmountCents / 100;

    console.log(`[handlePayPalProviderPayout] Creating PayPal payout for provider ${providerId}:`, {
      paypalEmail,
      providerAmount,
      currency,
      sessionId,
      isAAA: payoutDecision.isAAA,
      hasExternalAccount: !!payoutDecision.externalAccount,
    });

    // 6. Créer le payout PayPal
    const paypalManager = new PayPalManager();
    const payoutResult = await paypalManager.createPayout({
      providerId,
      providerPayPalEmail: paypalEmail,
      amount: providerAmount,
      currency,
      sessionId,
      note: payoutDecision.externalAccount
        ? `Paiement consolidé SOS-Expat vers ${payoutDecision.externalAccount.name} - Session ${sessionId}`
        : `Paiement pour consultation SOS-Expat - Session ${sessionId}`,
    });

    if (payoutResult.success) {
      console.log(`[handlePayPalProviderPayout] ✅ PayPal payout created successfully:`, {
        payoutBatchId: payoutResult.payoutBatchId,
        status: payoutResult.status,
      });

      // P0 SECURITY FIX: Masquer providerId dans les logs
      prodLogger.info('PAYPAL_PAYOUT_SUCCESS', `PayPal payout created`, {
        providerId: maskId(providerId),
        sessionId,
        amount: providerAmount,
        currency,
        payoutBatchId: payoutResult.payoutBatchId,
        isAAA: payoutDecision.isAAA,
        hasExternalAccount: !!payoutDecision.externalAccount,
      });

      // Si payout externe (AAA ou multiprestataire), logger dans aaa_external_payouts
      if (payoutDecision.externalAccount) {
        await this.db.collection('aaa_external_payouts').add({
          providerId,
          sessionId,
          amount: providerAmount,
          currency,
          payoutBatchId: payoutResult.payoutBatchId,
          paypalEmail,
          externalAccountId: payoutDecision.externalAccount.id,
          externalAccountName: payoutDecision.externalAccount.name,
          isAAA: payoutDecision.isAAA,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      console.error(`[handlePayPalProviderPayout] ❌ PayPal payout failed:`, payoutResult.error);

      // Créer une entrée pour retry via Cloud Tasks
      await this.db.collection('pending_paypal_payouts').add({
        providerId,
        sessionId,
        amountCents: providerAmountCents,
        currency,
        paypalEmail,
        status: 'failed',
        error: payoutResult.error,
        retryCount: 0,
        isAAA: payoutDecision.isAAA,
        hasExternalAccount: !!payoutDecision.externalAccount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new Error(`PayPal payout failed: ${payoutResult.error}`);
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
      // P1 FIX: Vérifier que le document existe avant d'utiliser les données
      if (!paymentDoc.exists) {
        throw new HttpsError('not-found', `Payment document not found: ${paymentIntentId}`);
      }
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

      // P0 FIX 2026-01-30: Wrap refund with circuit breaker
      let refund: Stripe.Refund;
      try {
        refund = await stripeCircuitBreaker.execute(() =>
          this.stripe!.refunds.create(refundData, stripeOptions)
        );
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          console.error('[refundPayment] Circuit breaker OPEN - Stripe API unavailable');
          throw new HttpsError('unavailable', 'Service de paiement temporairement indisponible. Le remboursement sera retenté.');
        }
        throw error;
      }

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

      // P0 FIX: Also verify payouts_enabled to ensure transfers won't be blocked
      if (!account.payouts_enabled) {
        console.error(`❌ Provider ${providerId} payouts not enabled - transfer would be blocked`);
        throw new HttpsError(
          'failed-precondition',
          'Provider account payouts not enabled yet. Please complete identity verification.'
        );
      }

      // Create the transfer
      // FIX: Utilise la devise originale du paiement au lieu de hardcoder EUR
      // P0 FIX: Add idempotency key to prevent duplicate transfers on retry
      const transferIdempotencyKey = `transfer_${sessionId}_${stripeAccountId}_${Date.now().toString(36)}`;
      const transfer = await this.stripe.transfers.create(
        {
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
        },
        { idempotencyKey: transferIdempotencyKey }
      );

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
  // 🔍 DEBUG P0: Log avec stack trace pour identifier l'origine de l'annulation
  const cancelDebugId = `cancel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const stackTrace = new Error().stack?.split('\n').slice(1, 8).join('\n') || 'No stack';

  console.log(`\n${'🚨'.repeat(40)}`);
  console.log(`🚨 [${cancelDebugId}] ========== CANCEL PAYMENT CALLED ==========`);
  console.log(`🚨 [${cancelDebugId}] PaymentIntentId: ${paymentIntentId}`);
  console.log(`🚨 [${cancelDebugId}] Reason: ${reason}`);
  console.log(`🚨 [${cancelDebugId}] SessionId: ${sessionId || 'N/A'}`);
  console.log(`🚨 [${cancelDebugId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🚨 [${cancelDebugId}] STACK TRACE (qui a appelé cancelPayment?):`);
  console.log(stackTrace);
  console.log(`${'🚨'.repeat(40)}\n`);

  prodLogger.warn('STRIPE_CANCEL_PAYMENT_CALLED', `[${cancelDebugId}] cancelPayment invoked`, {
    cancelDebugId,
    paymentIntentId,
    reason,
    sessionId,
    stackTrace,
  });

  try {
    this.validateConfiguration(secretKey);
    if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

    // P0 FIX: Récupérer le document payment pour obtenir providerStripeAccountId (Direct Charges)
    let providerStripeAccountId: string | undefined;
    let useDirectCharges = false;
    try {
      const paymentDoc = await this.db.collection('payments').doc(paymentIntentId).get();
      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();
        providerStripeAccountId = paymentData?.providerStripeAccountId;
        useDirectCharges = paymentData?.useDirectCharges === true;
        console.log(`🚨 [${cancelDebugId}] Payment document found:`, {
          useDirectCharges,
          providerStripeAccountId: providerStripeAccountId || 'N/A (platform mode)',
        });
      } else {
        console.log(`🚨 [${cancelDebugId}] Payment document not found in Firestore`);
      }
    } catch (firestoreError) {
      console.warn(`🚨 [${cancelDebugId}] Could not fetch payment document:`, firestoreError);
    }

    // P0 FIX: Pour Direct Charges, le PaymentIntent est sur le compte du provider
    const stripeAccountOptions: Stripe.RequestOptions | undefined =
      useDirectCharges && providerStripeAccountId
        ? { stripeAccount: providerStripeAccountId }
        : undefined;

    // 🔍 DEBUG: Vérifier l'état actuel du PaymentIntent AVANT annulation
    console.log(`🚨 [${cancelDebugId}] Checking current PaymentIntent status...`);
    const currentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {}, stripeAccountOptions);
    console.log(`🚨 [${cancelDebugId}] Current status: ${currentIntent.status}`);
    console.log(`🚨 [${cancelDebugId}] Amount: ${currentIntent.amount} ${currentIntent.currency}`);
    console.log(`🚨 [${cancelDebugId}] Created: ${new Date(currentIntent.created * 1000).toISOString()}`);

    // 🔍 DEBUG: Si le paiement est déjà capturé ou annulé, log et skip
    if (currentIntent.status === 'succeeded') {
      console.log(`🚨 [${cancelDebugId}] ⚠️ PAYMENT ALREADY SUCCEEDED - Cannot cancel!`);
      prodLogger.error('STRIPE_CANCEL_ALREADY_SUCCEEDED', `[${cancelDebugId}] Tried to cancel already captured payment`, {
        cancelDebugId,
        paymentIntentId,
        status: currentIntent.status,
      });
      return { success: false, error: 'Payment already captured - cannot cancel' };
    }

    if (currentIntent.status === 'canceled') {
      console.log(`🚨 [${cancelDebugId}] ⚠️ PAYMENT ALREADY CANCELED - Skipping`);
      return { success: true, paymentIntentId };
    }

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

    console.log(`🚨 [${cancelDebugId}] 🛑 PROCEEDING WITH CANCELLATION...`);
    // P0 FIX: Merge stripeAccountOptions avec idempotencyKey pour Direct Charges
    const cancelOptions: Stripe.RequestOptions = {
      idempotencyKey: cancelIdempotencyKey,
      ...(stripeAccountOptions || {}),
    };

    // P0 FIX 2026-01-30: Wrap cancel with circuit breaker
    let canceled: Stripe.PaymentIntent;
    try {
      canceled = await stripeCircuitBreaker.execute(() =>
        this.stripe!.paymentIntents.cancel(
          paymentIntentId,
          {
            ...(normalized ? { cancellation_reason: normalized } : {}),
          },
          cancelOptions
        )
      );
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.error(`[${cancelDebugId}] Circuit breaker OPEN - Stripe API unavailable`);
        throw new HttpsError('unavailable', 'Service de paiement temporairement indisponible.');
      }
      throw error;
    }

    await this.db.collection('payments').doc(paymentIntentId).update({
      status: canceled.status,
      cancelReason: reason,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionId: sessionId || null,
      cancelDebugId, // 🔍 DEBUG: Tracker l'ID de debug
    });

    console.log(`🚨 [${cancelDebugId}] ✅ PAYMENT CANCELED SUCCESSFULLY`);
    console.log(`🚨 [${cancelDebugId}]   New status: ${canceled.status}`);
    console.log(`${'🚨'.repeat(40)}\n`);

    prodLogger.warn('STRIPE_CANCEL_PAYMENT_SUCCESS', `[${cancelDebugId}] Payment cancelled`, {
      cancelDebugId,
      paymentIntentId,
      reason,
      newStatus: canceled.status,
    });

    return { success: true, paymentIntentId: canceled.id };
  } catch (error) {
    console.error(`🚨 [${cancelDebugId}] ❌ CANCEL PAYMENT ERROR:`, error);
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

  // 🚀 PERF OPTIMIZATION: Les fonctions suivantes ont été supprimées car redondantes:
  // - findExistingPayment() → remplacée par checkAndLockDuplicatePayments() dans createPaymentIntent.ts
  // - validateUsers() → validation déjà faite dans validateBusinessLogic() de createPaymentIntent.ts
  // Gain estimé: ~300-500ms par paiement

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

  /**
   * Get client's country for payment analytics
   * Checks multiple fields in priority order: country, currentCountry, residenceCountry
   */
  private async getClientCountry(clientId: string): Promise<string | undefined> {
    try {
      // Check users collection first
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      if (clientDoc.exists) {
        const data = clientDoc.data();
        const country = data?.country || data?.currentCountry || data?.currentPresenceCountry || data?.residenceCountry;
        if (country && typeof country === 'string' && country.trim() !== '') {
          return country;
        }
      }

      // Fallback to sos_profiles (if client is also a provider)
      const sosDoc = await this.db.collection('sos_profiles').doc(clientId).get();
      if (sosDoc.exists) {
        const data = sosDoc.data();
        const country = data?.country || data?.currentCountry || data?.interventionCountry;
        if (country && typeof country === 'string' && country.trim() !== '') {
          return country;
        }
        // Try array fields
        const practiceCountries = data?.practiceCountries as string[] | undefined;
        if (Array.isArray(practiceCountries) && practiceCountries.length > 0) {
          return practiceCountries[0];
        }
      }

      return undefined;
    } catch (error) {
      console.warn("Impossible de récupérer le pays client:", error);
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
    // FIX: Get client country for analytics
    const clientCountry = await this.getClientCountry(dataEuros.clientId);

    const paymentRecord: PaymentDoc = {
      stripePaymentIntentId: paymentIntent.id,
      clientId: dataEuros.clientId,
      providerId: dataEuros.providerId,
      // Store client country for analytics (avoids lookup in AdminCountryStats)
      ...(clientCountry ? { clientCountry } : {}),

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
      clientCountry: clientCountry || 'Unknown',
      hasCallSessionId: Boolean(paymentRecord.callSessionId),
      useDirectCharges: cents.useDirectCharges || false,
      providerKycComplete: cents.providerKycComplete || false,
      pendingTransferRequired: cents.pendingTransferRequired || false,
      providerStripeAccountId: cents.providerStripeAccountId || null,
    });
  }

  /**
   * P0 FIX 2026-01-25: Get PaymentIntent status from Stripe
   * Used to sync payment status when webhooks might have been missed
   */
  async getPaymentIntentStatus(
    paymentIntentId: string,
    stripeAccountId?: string
  ): Promise<{ status: string; amountCapturable: number } | null> {
    try {
      this.validateConfiguration();
      if (!this.stripe) throw new Error('Stripe non initialisé');

      const stripeAccountOptions = stripeAccountId
        ? { stripeAccount: stripeAccountId }
        : undefined;

      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        {},
        stripeAccountOptions
      );

      return {
        status: paymentIntent.status,
        amountCapturable: paymentIntent.amount_capturable || 0,
      };
    } catch (error) {
      console.error('[StripeManager.getPaymentIntentStatus] Error:', error);
      return null;
    }
  }
}

/** Instance réutilisable */
export const stripeManager = new StripeManager();
