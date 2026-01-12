import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineString, defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// -- App code existant --
import { stripeManager } from './StripeManager';
import { logError } from './utils/logs/logError';
// PHASE 2: Production Logger pour debug détaillé
import { logger as prodLogger } from './utils/productionLogger';
import {
  toCents,
  checkDailyLimit,
  logPaymentAudit,
  getPricingConfig,
} from './utils/paymentValidators';
// P2-10 FIX: Centralized currency utilities
import { roundAmount, calculateTotal, formatAmount } from './utils/currencyUtils';
// P0-3 FIX: Use centralized Stripe secrets helper
import { getStripeSecretKey, getStripeMode as getStripeModeFromHelper } from './lib/stripe';

/* ────────────────────────────────────────────────────────────────────────────
   (A) LIMITS — placé tout en haut, avant toute utilisation
   ──────────────────────────────────────────────────────────────────────────── */
const LIMITS = {
  RATE_LIMIT: { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 },
  AMOUNT_LIMITS: {
    MIN_EUR: 0.50,   // Stripe minimum (était 5€)
    MAX_EUR: 500,
    MAX_DAILY_EUR: 2000,
    MIN_USD: 0.50,   // Stripe minimum (était 6$)
    MAX_USD: 600,
    MAX_DAILY_USD: 2400,
  },
  VALIDATION: {
    AMOUNT_COHERENCE_TOLERANCE: 0.05,  // Aligné avec StripeManager.ts (était 0.5)
    MAX_DESCRIPTION_LENGTH: 240,
    ALLOWED_CURRENCIES: ['eur', 'usd'] as const,
    ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'] as const,
  },
  DUPLICATES: { WINDOW_MS: 15 * 60 * 1000 },
} as const;

/* (B) getLimits() — fallback si LIMITS était undefined (import circulaire, etc.) */
function getLimits() {
  return (
    LIMITS ?? {
      RATE_LIMIT: { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 },
      AMOUNT_LIMITS: {
        MIN_EUR: 0.50,
        MAX_EUR: 500,
        MAX_DAILY_EUR: 2000,
        MIN_USD: 0.50,
        MAX_USD: 600,
        MAX_DAILY_USD: 2400,
      },
      VALIDATION: {
        AMOUNT_COHERENCE_TOLERANCE: 0.05,
        MAX_DESCRIPTION_LENGTH: 240,
        ALLOWED_CURRENCIES: ['eur', 'usd'] as const,
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'] as const,
      },
      DUPLICATES: { WINDOW_MS: 15 * 60 * 1000 },
    }
  ) as typeof LIMITS;
}

/* ────────────────────────────────────────────────────────────────────────────
   Config & Params
   ──────────────────────────────────────────────────────────────────────────── */
const FUNCTION_OPTIONS = {
  region: 'europe-west1',
  memory: '256MiB' as const,
  concurrency: 1,
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 3,
  cors: [
    'https://sos-expat.com',
    'https://www.sos-expat.com',
    'https://outils-sos-expat.web.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
};

const STRIPE_SECRET_KEY_TEST = defineSecret('STRIPE_SECRET_KEY_TEST');
const STRIPE_SECRET_KEY_LIVE = defineSecret('STRIPE_SECRET_KEY_LIVE');
const STRIPE_MODE = defineString('STRIPE_MODE');

const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'dev' ||
  !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';

// Log moved inside function to avoid STRIPE_MODE.value() call during deployment
// Will be logged on first function invocation instead

// P0-2 SECURITY FIX: Bloquer BYPASS_SECURITY en production
// Cette variable ne doit JAMAIS être activée en production car elle bypasse:
// - Rate limiting (checkRateLimit)
// - Validation métier (validateBusinessLogic)
// - Détection des doublons (checkAndLockDuplicatePayments)
if (isProduction && BYPASS_MODE) {
  logger.error('🚨 [SECURITY] BYPASS_SECURITY=true detected in production! This is forbidden.');
  throw new Error('BYPASS_SECURITY is forbidden in production environment');
}

/* Secrets Stripe — P0-3 FIX: Use centralized helper with defineSecret().value() + fallback */
function getStripeSecretKeySafe(): string {
  const mode = getStripeModeFromHelper();
  const key = getStripeSecretKey(mode);
  if (!key) {
    throw new HttpsError(
      'failed-precondition',
      `Clé Stripe manquante pour le mode "${mode}". Ajoutez le secret ${mode === 'live' ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST'} dans Secret Manager et redéployez.`
    );
  }
  return key;
}

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */
type SupportedCurrency = 'eur' | 'usd';
type SupportedServiceType = 'lawyer_call' | 'expat_call';

interface PaymentIntentRequestData {
  amount: number;
  currency?: SupportedCurrency;
  serviceType: SupportedServiceType;
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount: number;
  providerAmount: number;
  callSessionId: string; // P2-15 FIX: Made required for traceability
  metadata?: Record<string, string>;
  coupon?: {
    code: string;
    couponId?: string;
    discountAmount: number;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

interface SuccessResponse {
  success: true;
  clientSecret: string;
  paymentIntentId: string;
  amount: number; // cents
  currency: SupportedCurrency;
  serviceType: string;
  status: string;
  expiresAt: string;
  stripeMode?: string;
  stripeAccountId?: string;
}

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

interface StripeCreatePIPayload {
  amount: number;
  currency: SupportedCurrency;
  clientId: string;
  providerId: string;
  serviceType: SupportedServiceType;
  providerType: 'lawyer' | 'expat';
  commissionAmount: number;
  providerAmount: number;
  callSessionId: string; // P2-15 FIX: Made required
  metadata: Record<string, string>;
  /** Stripe Account ID du prestataire pour Destination Charges (split automatique) */
  destinationAccountId?: string;
}

interface StripeCreatePIResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: unknown;
}

interface CouponDoc {
  code: string;
  type: 'fixed' | 'percentage';
  amount: number;
  active?: boolean;
  services?: string[];
  min_order_amount?: number;
  valid_from?: admin.firestore.Timestamp;
  valid_until?: admin.firestore.Timestamp;
  maxDiscount?: number;
}

interface PricingOverrideNode {
  enabled?: boolean;
  startsAt?: admin.firestore.Timestamp;
  endsAt?: admin.firestore.Timestamp;
  connectionFeeAmount?: number;
  providerAmount?: number;
  totalAmount?: number;
  stackableWithCoupons?: boolean;
  label?: string;
  strikeTargets?: string;
}
type OverrideMap = { eur?: PricingOverrideNode; usd?: PricingOverrideNode };
interface PricingDoc {
  overrides?: {
    settings?: { stackableDefault?: boolean; [k: string]: unknown };
    expat?: OverrideMap;
    lawyer?: OverrideMap;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

/* ────────────────────────────────────────────────────────────────────────────
   Mémoire rate limit
   ──────────────────────────────────────────────────────────────────────────── */
const rateLimitStore = new Map<string, RateLimitBucket>();

/* (D) checkRateLimit — **patch pare-balle** : n’utilise pas getLimits() ici */
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  if (BYPASS_MODE) return { allowed: true };

  // 🔒 Pare-feu anti-undefined (plus robuste qu'un simple getLimits())
  const L =
    typeof LIMITS === 'object' && (LIMITS as { RATE_LIMIT?: { WINDOW_MS: number; MAX_REQUESTS: number } }).RATE_LIMIT
      ? (LIMITS.RATE_LIMIT as { WINDOW_MS: number; MAX_REQUESTS: number })
      : { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 };

  const now = Date.now();
  const key = `payment_${userId}`;

  let bucket = rateLimitStore.get(key);
  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 0, resetTime: now + L.WINDOW_MS };
    rateLimitStore.set(key, bucket);
  }
  if (bucket.count >= L.MAX_REQUESTS) {
    return { allowed: false, resetTime: bucket.resetTime };
  }
  bucket.count += 1;
  return { allowed: true };
}

/* Validations */
async function validateBusinessLogic(
  data: PaymentIntentRequestData,
  currency: SupportedCurrency,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  if (BYPASS_MODE) return { valid: true };
  try {
    const providerDoc = await db.collection('users').doc(data.providerId).get();
    const providerData = providerDoc.data();
    if (!providerData) return { valid: false, error: 'Prestataire non trouvé' };
    if (providerData.status === 'suspended' || providerData.status === 'banned') {
      return { valid: false, error: 'Prestataire non disponible' };
    }

    // P0-2 FIX: Vérifier la disponibilité du provider AVANT le paiement
    // Cela évite les paiements pour des providers qui sont offline ou indisponibles
    const providerProfileDoc = await db.collection('sos_profiles').doc(data.providerId).get();
    if (providerProfileDoc.exists) {
      const profileData = providerProfileDoc.data();
      // Vérifier si le provider est en ligne et disponible
      if (profileData?.isOnline === false) {
        logger.warn('[validateBusinessLogic] Provider is offline', { providerId: data.providerId });
        return { valid: false, error: 'Le prestataire n\'est pas disponible actuellement. Veuillez réessayer plus tard.' };
      }
      if (profileData?.availability === 'offline' || profileData?.availability === 'busy') {
        logger.warn('[validateBusinessLogic] Provider is not available', {
          providerId: data.providerId,
          availability: profileData?.availability,
        });
        return { valid: false, error: 'Le prestataire est actuellement occupé ou hors ligne.' };
      }
    }

    if (!isProduction) return { valid: true };

    // Récupération dynamique des prix depuis Firestore
    const serviceKind: 'lawyer' | 'expat' = data.serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
    const pricingConfig = await getPricingConfig(serviceKind, currency, db);
    const expectedTotal = pricingConfig.totalAmount;

    // Tolérance large (100€) pour ce contrôle de sanité basique
    // La vraie validation stricte (±0.5€) se fait plus tard dans le flux
    const diff = Math.abs(Number(data.amount) - expectedTotal);
    if (diff > 100) return { valid: false, error: 'Montant inhabituel pour ce service' };
    return { valid: true };
  } catch (err) {
    await logError('validateBusinessLogic', err as unknown);
    return { valid: false, error: 'Erreur lors de la validation métier' };
  }
}

async function validateAmountSecurity(
  amount: number,
  currency: SupportedCurrency,
  userId: string,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  const A = getLimits().AMOUNT_LIMITS;
  const limits =
    currency === 'eur'
      ? { min: A.MIN_EUR, max: A.MAX_EUR, daily: A.MAX_DAILY_EUR }
      : { min: A.MIN_USD, max: A.MAX_USD, daily: A.MAX_DAILY_USD };

  if (amount < limits.min) return { valid: false, error: `Montant minimum ${limits.min}` };
  if (amount > limits.max) return { valid: false, error: `Montant maximum ${limits.max}` };

  if (!isDevelopment) {
    try {
      const daily = await checkDailyLimit(userId, amount, currency, db);
      if (!daily.allowed) return { valid: false, error: daily.error };
    } catch (err) {
      await logError('validateAmountSecurity:dailyLimit', err as unknown);
    }
  }
  return { valid: true };
}

/**
 * P1-3 FIX: Vérification atomique des doublons avec transaction Firestore.
 * Utilise un document de lock pour éviter les race conditions.
 *
 * Retourne { isDuplicate: boolean, lockId?: string }
 * - Si isDuplicate = true: un paiement similaire existe déjà
 * - Si isDuplicate = false: un lock a été créé, lockId à utiliser pour le libérer si erreur
 */
async function checkAndLockDuplicatePayments(
  clientId: string,
  providerId: string,
  amountInMainUnit: number,
  currency: SupportedCurrency,
  callSessionId: string,
  db: admin.firestore.Firestore
): Promise<{ isDuplicate: boolean; lockId?: string; existingPaymentId?: string }> {
  if (BYPASS_MODE) return { isDuplicate: false };

  // Créer une clé unique pour ce type de paiement
  const lockKey = `${clientId}_${providerId}_${amountInMainUnit}_${currency}`;
  const lockRef = db.collection('payment_locks').doc(lockKey);
  const windowMs = getLimits().DUPLICATES.WINDOW_MS;
  const cutoffTime = new Date(Date.now() - windowMs);

  // P0 FIX: Statuts de call_session qui permettent de réessayer un paiement
  const failedCallStatuses = ['failed', 'cancelled', 'refunded', 'no_answer'];

  /**
   * Vérifie si un call_session est en échec (permet retry)
   */
  async function isCallSessionFailed(callSessionId: string): Promise<boolean> {
    const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
    if (!callSessionDoc.exists) {
      // Call session n'existe plus → considérer comme échoué (orphelin)
      return true;
    }
    const callStatus = callSessionDoc.data()?.status;
    return failedCallStatuses.includes(callStatus);
  }

  try {
    // ÉTAPE 1: Vérifier le lock dans une transaction
    const lockCheckResult = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);

      if (lockDoc.exists) {
        const lockData = lockDoc.data();
        const lockCreatedAt = lockData?.createdAt?.toDate?.() || new Date(0);

        // Si le lock est encore valide (dans la fenêtre de temps)
        if (lockCreatedAt > cutoffTime) {
          return {
            hasValidLock: true,
            lockData,
          };
        }
      }
      return { hasValidLock: false };
    });

    // ÉTAPE 2: Si un lock valide existe, vérifier si l'appel a échoué
    if (lockCheckResult.hasValidLock && lockCheckResult.lockData) {
      const callSessionId = lockCheckResult.lockData.callSessionId;

      // Si le lock a un callSessionId, vérifier le statut
      if (callSessionId) {
        const isFailed = await isCallSessionFailed(callSessionId);
        if (isFailed) {
          console.log(`🔍 Lock ${lockKey} existe mais appel en échec - autoriser retry`);
          // L'appel a échoué → permettre de réessayer (ne pas retourner isDuplicate)
        } else {
          // L'appel est actif → bloquer
          return {
            isDuplicate: true,
            existingPaymentId: lockCheckResult.lockData.paymentIntentId
          };
        }
      } else {
        // Pas de callSessionId sur le lock → bloquer par sécurité
        return {
          isDuplicate: true,
          existingPaymentId: lockCheckResult.lockData.paymentIntentId
        };
      }
    }

    // ÉTAPE 3: Vérifier aussi dans la collection payments (double sécurité)
    const paymentsSnap = await db
      .collection('payments')
      .where('clientId', '==', clientId)
      .where('providerId', '==', providerId)
      .where('currency', '==', currency)
      .where('amountInMainUnit', '==', amountInMainUnit)
      .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
      .where('createdAt', '>', admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(5)
      .get();

    // P0 FIX: Vérifier le statut de chaque call_session associée
    for (const paymentDoc of paymentsSnap.docs) {
      const paymentData = paymentDoc.data();
      const callSessionId = paymentData.callSessionId;

      if (!callSessionId) {
        // Paiement sans call_session → potentiellement actif, bloquer
        console.log(`🔍 Paiement ${paymentDoc.id} sans callSessionId - BLOQUÉ`);
        return { isDuplicate: true, existingPaymentId: paymentDoc.id };
      }

      const isFailed = await isCallSessionFailed(callSessionId);
      if (isFailed) {
        console.log(`🔍 Call session ${callSessionId} en échec - OK pour retry`);
        continue;
      }

      // Appel actif ou réussi → bloquer
      const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
      const callStatus = callSessionDoc.data()?.status || 'unknown';
      console.log(`🔍 Paiement ${paymentDoc.id} avec appel actif (${callStatus}) - BLOQUÉ`);
      return { isDuplicate: true, existingPaymentId: paymentDoc.id };
    }

    // ÉTAPE 4: Aucun doublon trouvé → créer le lock
    console.log('🔍 Pas de doublon actif trouvé - création du lock');
    await db.collection('payment_locks').doc(lockKey).set({
      clientId,
      providerId,
      amountInMainUnit,
      currency,
      callSessionId,  // P0 FIX: Include callSessionId to enable retry after failed calls
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + windowMs),
      status: 'pending'
    });

    return { isDuplicate: false, lockId: lockKey };
  } catch (err) {
    await logError('checkAndLockDuplicatePayments', err as unknown);
    // P0-3 SECURITY FIX: En cas d'erreur de transaction, on REFUSE le paiement
    // Anciennement on retournait { isDuplicate: false } ce qui permettait des doublons
    // lors de race conditions (plusieurs requêtes simultanées pendant l'échec)
    logger.error('[checkAndLockDuplicatePayments] Transaction failed - BLOCKING payment for safety', {
      error: err instanceof Error ? err.message : 'unknown',
      clientId,
      providerId,
    });
    throw new HttpsError(
      'aborted',
      'Vérification de doublon impossible. Veuillez réessayer dans quelques secondes.'
    );
  }
}

/**
 * Met à jour le lock avec l'ID du PaymentIntent créé
 */
async function updatePaymentLock(
  lockId: string,
  paymentIntentId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    await db.collection('payment_locks').doc(lockId).update({
      paymentIntentId,
      status: 'created',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    // Non critique - juste un warning
    logger.warn('[updatePaymentLock] Failed to update lock', { lockId, paymentIntentId });
  }
}

/**
 * Libère le lock en cas d'erreur (permet de réessayer)
 */
async function releasePaymentLock(
  lockId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    await db.collection('payment_locks').doc(lockId).delete();
  } catch (err) {
    logger.warn('[releasePaymentLock] Failed to release lock', { lockId });
  }
}

// P2-10 FIX: Using centralized currency utilities for consistent rounding
function validateAmountCoherence(
  totalAmount: number,
  commissionAmount: number,
  providerAmount: number
): { valid: boolean; error?: string; difference: number } {
  const totalCalculated = calculateTotal(commissionAmount, providerAmount);
  const amountRounded = roundAmount(totalAmount);
  const difference = Math.abs(totalCalculated - amountRounded);
  const tolerance = getLimits().VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Incohérence montants: ${formatAmount(difference)} (tolérance ${formatAmount(tolerance)})`,
      difference,
    };
  }
  return { valid: true, difference };
}

function sanitizeAndConvertInput(data: PaymentIntentRequestData) {
  const V = getLimits().VALIDATION;
  const maxNameLen = isDevelopment ? 500 : 200;
  const maxDescLen = V.MAX_DESCRIPTION_LENGTH;
  const maxMetaKeyLen = isDevelopment ? 100 : 50;
  const maxMetaValueLen = isDevelopment ? 500 : 200;

  const currency = (data.currency || 'eur').toLowerCase().trim() as SupportedCurrency;

  const amountInMainUnit = Number(data.amount);
  const commissionAmountInMainUnit = Number(data.commissionAmount);
  const providerAmountInMainUnit = Number(data.providerAmount);
  

  return {
    amountInMainUnit,
    amountInCents: toCents(amountInMainUnit, currency),
    commissionAmountInMainUnit,
    commissionAmountInCents: toCents(commissionAmountInMainUnit, currency),
    providerAmountInMainUnit,
    providerAmountInCents: toCents(providerAmountInMainUnit, currency),
    currency,
    serviceType: data.serviceType,
    providerId: data.providerId.trim(),
    clientId: data.clientId.trim(),
    clientEmail: data.clientEmail?.trim().toLowerCase(),
    providerName: data.providerName?.trim().slice(0, maxNameLen),
    description: data.description?.trim().slice(0, maxDescLen),
    callSessionId: data.callSessionId?.trim(),
    metadata: data.metadata
      ? Object.fromEntries(
          Object.entries(data.metadata)
            .filter(([k, v]) => k.length <= maxMetaKeyLen && String(v).length <= maxMetaValueLen)
            .slice(0, isDevelopment ? 20 : 10)
        )
      : ({} as Record<string, string>),
    coupon: data.coupon
      ? {
          code: data.coupon.code,
          couponId: data.coupon.couponId,
          discountAmount: Number(data.coupon.discountAmount),
          discountType: data.coupon.discountType,
          discountValue: Number(data.coupon.discountValue),
        }
      : undefined,
  };
}

/* (E) LIMITS check removed from module level to avoid deployment timeouts */

/* ────────────────────────────────────────────────────────────────────────────
   Signature de build (constante de fichier)
   ──────────────────────────────────────────────────────────────────────────── */
const BUILD_SIG = 'CPI-2025-09-03-v2-fallback-guard';

/* ────────────────────────────────────────────────────────────────────────────
   Callable
   ──────────────────────────────────────────────────────────────────────────── */
export const createPaymentIntent = onCall(
  {
    ...FUNCTION_OPTIONS,
    // Important: déclarer les secrets pour injection des env vars
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
  },
  async (request: CallableRequest<PaymentIntentRequestData>): Promise<SuccessResponse> => {
    // ── SIGNATURE DE BUILD — doit apparaître dans les logs Cloud Run après déploiement
    logger.info('[createPaymentIntent] BUILD_SIG', { BUILD_SIG });

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔍 DEBUG ENTRY POINT - Capture toutes les données entrantes
    // ═══════════════════════════════════════════════════════════════════════════
    prodLogger.info('PAYMENT_START', `[${requestId}] Nouvelle demande de paiement`, {
      requestId,
      userId: request.auth?.uid || 'ANONYMOUS',
      inputData: {
        amount: request.data?.amount,
        currency: request.data?.currency,
        serviceType: request.data?.serviceType,
        providerId: request.data?.providerId,
        clientId: request.data?.clientId,
        callSessionId: request.data?.callSessionId,
        commissionAmount: request.data?.commissionAmount,
        providerAmount: request.data?.providerAmount,
        hasCoupon: !!request.data?.coupon?.code,
      },
      timestamp: new Date().toISOString(),
    });

    /* 🔒 Garde-fou fail-fast sur les limites */
    {
      const L = getLimits();
      if (!L?.RATE_LIMIT) {
        logger.error('[FATAL] Limits missing', { L });
        throw new HttpsError('internal', 'Payment service misconfigured');
      }
    }

    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
      }
      const userId = request.auth.uid;

      // Entrées minimales
      if (typeof request.data.amount !== 'number' || !Number.isFinite(request.data.amount) || request.data.amount <= 0) {
        throw new HttpsError('invalid-argument', `Montant invalide: ${request.data.amount}`);
      }
      if (typeof request.data.commissionAmount !== 'number' || request.data.commissionAmount < 0) {
        throw new HttpsError('invalid-argument', 'Commission invalide');
      }
      if (typeof request.data.providerAmount !== 'number' || request.data.providerAmount < 0) {
        throw new HttpsError('invalid-argument', 'Montant prestataire invalide');
      }

      // Rate limit robuste (patch)
      prodLogger.debug('PAYMENT_STEP', `[${requestId}] Vérification rate limit pour ${userId}`);
      const rl = checkRateLimit(userId);
      if (!rl.allowed) {
        const waitMin = Math.ceil(((rl.resetTime ?? Date.now()) - Date.now()) / 60000);
        prodLogger.warn('PAYMENT_BLOCKED', `[${requestId}] Rate limit atteint`, {
          userId,
          resetTime: rl.resetTime,
          waitMinutes: waitMin,
        });
        throw new HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitMin} min.`);
      }
      prodLogger.debug('PAYMENT_STEP', `[${requestId}] ✓ Rate limit OK`);

      // Normalisation
      prodLogger.debug('PAYMENT_STEP', `[${requestId}] Normalisation des données...`);
      const s = sanitizeAndConvertInput(request.data);
      const {
        amountInMainUnit,
        amountInCents,
        commissionAmountInMainUnit,
        providerAmountInMainUnit,
        currency,
        serviceType,
        providerId,
        clientId,
        clientEmail,
      providerName,
        description,
        callSessionId,
        metadata,
        coupon,
      } = s;
      // 🔍 DEBUG: Données normalisées avec tous les détails
      prodLogger.info('PAYMENT_NORMALIZED', `[${requestId}] Données normalisées`, {
        requestId,
        amountInMainUnit,
        amountInCents,
        commissionAmountInMainUnit,
        providerAmountInMainUnit,
        currency,
        serviceType,
        providerId: providerId?.substring(0, 10) + '...',
        clientId: clientId?.substring(0, 10) + '...',
        callSessionId,
        hasCoupon: !!coupon?.code,
        couponCode: coupon?.code || null,
      });

      const V = getLimits().VALIDATION;
      if (!V.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
        throw new HttpsError('invalid-argument', 'Type de service invalide');
      }
      if (!providerId || providerId.length < 5) throw new HttpsError('invalid-argument', 'ID prestataire invalide');
      if (!clientId || clientId.length < 5) throw new HttpsError('invalid-argument', 'ID client invalide');
      // P2-15 FIX: callSessionId is now required for payment traceability
      if (!callSessionId || callSessionId.length < 10) throw new HttpsError('invalid-argument', 'ID session invalide');
      if (!V.ALLOWED_CURRENCIES.includes(currency)) {
        throw new HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
      }

      const db = admin.firestore();

      // ═══════════════════════════════════════════════════════════════════════════
      // 🔍 VALIDATION ÉTAPE 1: Limites montants + quota quotidien
      // ═══════════════════════════════════════════════════════════════════════════
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] Validation sécurité montant...`, {
        amountInMainUnit,
        currency,
        userId,
      });
      const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
      if (!sec.valid) {
        prodLogger.error('PAYMENT_VALIDATION_FAILED', `[${requestId}] Échec validation sécurité`, {
          error: sec.error,
          amountInMainUnit,
          currency,
          userId,
        });
        throw new HttpsError('invalid-argument', sec.error ?? 'Montant non valide');
      }
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Validation sécurité OK`);

      // ═══════════════════════════════════════════════════════════════════════════
      // 🔍 VALIDATION ÉTAPE 2: Règles métier (provider disponible, etc.)
      // ═══════════════════════════════════════════════════════════════════════════
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] Validation règles métier...`);
      const biz = await validateBusinessLogic(request.data, currency, db);
      if (!biz.valid) {
        prodLogger.error('PAYMENT_VALIDATION_FAILED', `[${requestId}] Échec règles métier`, {
          error: biz.error,
          providerId,
          serviceType,
        });
        throw new HttpsError('failed-precondition', biz.error ?? 'Règles métier non satisfaites');
      }
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Règles métier OK`);

      // ═══════════════════════════════════════════════════════════════════════════
      // 🔍 VALIDATION ÉTAPE 3: Anti-doublons (transaction atomique)
      // ═══════════════════════════════════════════════════════════════════════════
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] Vérification doublons...`, {
        clientId: clientId?.substring(0, 10),
        providerId: providerId?.substring(0, 10),
        amountInMainUnit,
        callSessionId,
      });
      const duplicateCheck = await checkAndLockDuplicatePayments(clientId, providerId, amountInMainUnit, currency, callSessionId, db);
      if (duplicateCheck.isDuplicate) {
        prodLogger.warn('PAYMENT_DUPLICATE', `[${requestId}] Paiement doublon détecté!`, {
          clientId: clientId?.substring(0, 10),
          providerId: providerId?.substring(0, 10),
          amountInMainUnit,
          existingPaymentId: duplicateCheck.existingPaymentId,
        });
        throw new HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
      }
      const paymentLockId = duplicateCheck.lockId;
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Pas de doublon, lock créé: ${paymentLockId}`)

      // Prix attendu (admin_config/pricing + override + coupons empilables)
      const serviceKind: 'lawyer' | 'expat' = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
      const cfg = await getPricingConfig(serviceKind, currency, db); // { totalAmount: number, ... }
      let expected = cfg.totalAmount;

      const pricingSnap = await db.collection('admin_config').doc('pricing').get();
      const pricingDoc: PricingDoc = pricingSnap.exists ? (pricingSnap.data() as PricingDoc) : {};
      const overrideMap: OverrideMap | undefined =
        serviceKind === 'lawyer' ? pricingDoc?.overrides?.lawyer : pricingDoc?.overrides?.expat;
      const overrideNode: PricingOverrideNode | undefined = currency === 'eur' ? overrideMap?.eur : overrideMap?.usd;

      const now = new Date();
      const startsAt = overrideNode?.startsAt?.toDate?.() ?? null;
      const endsAt = overrideNode?.endsAt?.toDate?.() ?? null;
      const overrideActive =
        overrideNode?.enabled === true && (startsAt ? now >= startsAt : true) && (endsAt ? now <= endsAt : true);

      const stackableDefault = pricingDoc?.overrides?.settings?.stackableDefault;
      const stackable =
        typeof overrideNode?.stackableWithCoupons === 'boolean'
          ? overrideNode.stackableWithCoupons
          : (typeof stackableDefault === 'boolean' ? stackableDefault : false);

      if (!overrideActive || stackable) {
        if (coupon?.code) {
          const code = String(coupon.code).trim().toUpperCase();
          if (code) {
            const snap = await db.collection('coupons').where('code', '==', code).limit(1).get();
            if (!snap.empty) {
              const cpn = snap.docs[0].data() as CouponDoc;
              const now2 = new Date();
              const validFrom = cpn.valid_from?.toDate?.();
              const validUntil = cpn.valid_until?.toDate?.();
              const active = cpn.active !== false;
              const inWindow = (validFrom ? now2 >= validFrom : true) && (validUntil ? now2 <= validUntil : true);
              const serviceOk = Array.isArray(cpn.services) ? cpn.services.includes(serviceType) : true;
              const minOk = typeof cpn.min_order_amount === 'number' ? expected >= cpn.min_order_amount : true;

              if (active && inWindow && serviceOk && minOk) {
                let discount = 0;
                if (cpn.type === 'fixed') discount = Number(cpn.amount) || 0;
                if (cpn.type === 'percentage') {
                  const pct = Number(cpn.amount) || 0;
                  discount = Math.max(0, Math.round((expected * pct) / 100 * 100) / 100);
                }
                if (typeof cpn.maxDiscount === 'number') discount = Math.min(discount, cpn.maxDiscount);
                discount = Math.min(discount, expected);
                expected = Math.max(0, Math.round((expected - discount) * 100) / 100);
              }
            }
          }
        }
      }

      // ===== VALIDATION MONTANT (P1-14 SECURITY FIX - STRICT TOUS ENVIRONNEMENTS) =====
      // Cette validation empêche la manipulation des prix côté client
      // P1-14 FIX: Validation stricte en TOUS environnements (pas seulement production)
      // Anciennement: En dev, on log un warning mais on continue (vulnérable)
      // Maintenant: Rejet systématique pour détecter les bugs en dev
      const diff = Math.abs(Number(amountInMainUnit) - Number(expected));
      // Tolérance de 0.5€ pour les arrondis de coupons/promotions
      if (diff > 0.5) {
        logger.error('[createPaymentIntent] Amount mismatch detected - REJECTING', {
          received: amountInMainUnit,
          expected,
          difference: diff,
          userId: request.auth?.uid,
          environment: process.env.NODE_ENV || 'unknown',
        });
        throw new HttpsError('invalid-argument', `Montant inattendu (reçu ${amountInMainUnit}, attendu ${expected})`);
      }

      const coherence = validateAmountCoherence(
        amountInMainUnit,
        commissionAmountInMainUnit,
        providerAmountInMainUnit
      );
      if (!coherence.valid && (isProduction || coherence.difference > 1)) {
        throw new HttpsError('invalid-argument', coherence.error ?? 'Incohérence montants');
      }

      // Clé Stripe (safe)
      const stripeSecretKey = getStripeSecretKeySafe();

      // ===== DESTINATION CHARGES: Récupérer le Stripe Account ID du prestataire =====
      // Le prestataire doit avoir complété son onboarding Stripe Connect pour recevoir
      // des paiements via le modèle Destination Charges (split automatique à la capture)
      let providerStripeAccountId: string | undefined;
      try {
        const providerProfileSnap = await db.collection('sos_profiles').doc(providerId).get();
        if (providerProfileSnap.exists) {
          const providerProfile = providerProfileSnap.data();
          providerStripeAccountId = providerProfile?.stripeAccountId;

          if (providerStripeAccountId) {
            logger.info('[createPaymentIntent] Destination Charges activé', {
              providerId,
              stripeAccountId: providerStripeAccountId.substring(0, 15) + '...',
              providerAmount: providerAmountInMainUnit,
            });
          } else {
            logger.warn('[createPaymentIntent] Prestataire sans compte Stripe Connect - mode transfert manuel', {
              providerId,
              hasProfile: true,
            });
          }
        } else {
          logger.warn('[createPaymentIntent] Profil prestataire introuvable - mode transfert manuel', {
            providerId,
          });
        }
      } catch (profileError) {
        logger.error('[createPaymentIntent] Erreur récupération profil prestataire', {
          providerId,
          error: profileError instanceof Error ? profileError.message : 'unknown',
        });
        // On continue sans Destination Charges - le transfert sera fait manuellement après
      }

      const providerType: 'lawyer' | 'expat' = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
      // ═══════════════════════════════════════════════════════════════════════════
      // 🔍 STRIPE API CALL - Création du PaymentIntent
      // ═══════════════════════════════════════════════════════════════════════════
      const stripePayload: StripeCreatePIPayload = {
        amount: amountInMainUnit,
        currency,
        clientId,
        providerId,
        serviceType,
        providerType,
        commissionAmount: commissionAmountInMainUnit,
        providerAmount: providerAmountInMainUnit,
        callSessionId,
        // Destination Charges: si le prestataire a un compte Stripe Connect, le paiement
        // sera automatiquement splitté à la capture (providerAmount → prestataire, reste → plateforme)
        destinationAccountId: providerStripeAccountId,
        metadata: {
          // User identifiers for CAPI attribution
          client_id: clientId, // External ID for Meta CAPI matching
          user_id: userId, // Firebase Auth UID
          clientEmail: clientEmail || '',
          providerName: providerName || '',
          providerId: providerId,
          description: description || `Service ${serviceType}`,
          requestId,
          environment: process.env.NODE_ENV || 'development',
          originalTotal: amountInMainUnit.toString(),
          originalCommission: commissionAmountInMainUnit.toString(),
          originalProviderAmount: providerAmountInMainUnit.toString(),
          originalCurrency: currency,
          stripeMode: STRIPE_MODE.value() || 'test',
          coupon_code: coupon?.code || '',
          override: String(expected !== cfg.totalAmount),
          promo_active: String(overrideActive),
          promo_stackable: String(stackable),
          callSessionId : String(callSessionId),
          useDestinationCharges: String(!!providerStripeAccountId),
          // Meta CAPI identifiers (passed from frontend)
          ...metadata,
        },
      };

      prodLogger.info('STRIPE_API_CALL', `[${requestId}] Appel Stripe createPaymentIntent...`, {
        requestId,
        amount: amountInMainUnit,
        amountCents: amountInCents,
        currency,
        serviceType,
        hasDestinationAccount: !!providerStripeAccountId,
        destinationAccount: providerStripeAccountId?.substring(0, 12) || null,
        callSessionId,
        stripeMode: STRIPE_MODE.value() || 'test',
      });

      const stripeCallStart = Date.now();
      const result: StripeCreatePIResult = await stripeManager.createPaymentIntent(
        stripePayload,
        stripeSecretKey
      );
      const stripeCallDuration = Date.now() - stripeCallStart;

      prodLogger.info('STRIPE_API_RESPONSE', `[${requestId}] Réponse Stripe reçue en ${stripeCallDuration}ms`, {
        requestId,
        success: result?.success,
        hasClientSecret: !!result?.clientSecret,
        paymentIntentId: result?.paymentIntentId?.substring(0, 15) || null,
        error: result?.error || null,
        durationMs: stripeCallDuration,
      });

      if (!result?.success || !result.clientSecret || !result.paymentIntentId) {
        // P1-3 FIX: Libérer le lock en cas d'échec
        if (paymentLockId) await releasePaymentLock(paymentLockId, db);

        prodLogger.error('STRIPE_API_ERROR', `[${requestId}] ❌ ÉCHEC création PaymentIntent`, {
          requestId,
          userId,
          serviceType,
          amountInMainUnit,
          amountInCents,
          currency,
          providerId: providerId?.substring(0, 10),
          stripeError: result?.error ?? 'unknown',
          hasClientSecret: !!result?.clientSecret,
          hasPaymentIntentId: !!result?.paymentIntentId,
          callSessionId,
        });

        await logError('createPaymentIntent:stripe_error', {
          requestId,
          userId,
          serviceType,
          amountInMainUnit,
          amountInCents,
          error: result?.error ?? 'unknown',
        });
        throw new HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
      }

      // P1-3 FIX: Mettre à jour le lock avec l'ID du PaymentIntent
      if (paymentLockId) await updatePaymentLock(paymentLockId, result.paymentIntentId, db);

      if (isProduction) {
        try {
          await logPaymentAudit(
            {
              paymentId: result.paymentIntentId,
              userId: clientId,
              amount: amountInMainUnit,
              currency,
              type: providerType,
              action: 'create',
              metadata: {
                amountInCents,
                commissionAmountInMainUnit,
                providerAmountInMainUnit,
                requestId,
              },
            },
            admin.firestore()
          );
        } catch (auditErr) {
          logger.warn('Audit logging failed', auditErr as unknown);
        }
      }

      let accountId: string | undefined;
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
        const account = await stripe.accounts.retrieve();
        accountId = account.id;
      } catch (err) {
        logger.warn("Impossible de récupérer l'account Stripe", err as unknown);
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // ✅ SUCCÈS - Log final avec toutes les informations
      // ═══════════════════════════════════════════════════════════════════════════
      const totalProcessingTime = Date.now() - startTime;
      prodLogger.info('PAYMENT_SUCCESS', `[${requestId}] ✅ PaymentIntent créé avec succès en ${totalProcessingTime}ms`, {
        requestId,
        paymentIntentId: result.paymentIntentId,
        clientSecretPrefix: result.clientSecret?.substring(0, 20) + '...',
        amount: amountInCents,
        currency,
        serviceType,
        providerId: providerId?.substring(0, 10) + '...',
        clientId: clientId?.substring(0, 10) + '...',
        callSessionId,
        stripeMode: STRIPE_MODE.value() || 'test',
        stripeAccountId: accountId?.substring(0, 12) || null,
        totalProcessingTimeMs: totalProcessingTime,
        status: 'requires_payment_method',
      });

      return {
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: amountInCents,
        currency,
        serviceType,
        status: 'requires_payment_method',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        stripeMode: STRIPE_MODE.value() || 'test',
        stripeAccountId: accountId,
      };
    } catch (err: unknown) {
      const processingTime = Date.now() - startTime;

      // ═══════════════════════════════════════════════════════════════════════════
      // ❌ ERREUR GLOBALE - Log détaillé pour diagnostic
      // ═══════════════════════════════════════════════════════════════════════════
      prodLogger.error('PAYMENT_FATAL_ERROR', `[${requestId}] ❌ Erreur fatale dans createPaymentIntent`, {
        requestId,
        errorType: err instanceof HttpsError ? 'HttpsError' : 'UnknownError',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorCode: err instanceof HttpsError ? err.code : 'unknown',
        errorStack: err instanceof Error ? err.stack?.substring(0, 500) : null,
        processingTimeMs: processingTime,
        inputData: {
          amount: request.data?.amount,
          serviceType: request.data?.serviceType,
          currency: request.data?.currency,
          providerId: request.data?.providerId?.substring(0, 10),
          clientId: request.data?.clientId?.substring(0, 10),
          callSessionId: request.data?.callSessionId,
        },
        userId: request.auth?.uid || 'not-authenticated',
        environment: process.env.NODE_ENV,
        stripeMode: STRIPE_MODE.value() || 'test',
      });

      // P1-3 FIX: Libérer le lock en cas d'erreur générale
      // Note: paymentLockId peut ne pas être défini si l'erreur survient avant
      try {
        const lockId = (err as any)?.paymentLockId;
        if (lockId) await releasePaymentLock(lockId, admin.firestore());
      } catch {
        // Ignorer les erreurs de libération de lock
      }

      await logError('createPaymentIntent:error', {
        requestId,
        error: err instanceof HttpsError ? err.message : (err as Error | undefined)?.message ?? 'unknown',
        processingTime,
        requestData: {
          amount: request.data?.amount,
          serviceType: request.data?.serviceType,
          currency: request.data?.currency || 'eur',
          hasAuth: !!request.auth,
          hasCommission: request.data?.commissionAmount !== undefined,
        },
        userAuth: request.auth?.uid || 'not-authenticated',
        environment: process.env.NODE_ENV,
        stripeMode: STRIPE_MODE.value() || 'test',
      });

      if (err instanceof HttpsError) throw err;

      const errorResponse: ErrorResponse = {
        success: false,
        error: "Une erreur inattendue s'est produite. Veuillez réessayer.",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId,
      };
      throw new HttpsError('internal', errorResponse.error, errorResponse);
    }
  }
);

/*
Checklist de config:

1) Secrets:
   firebase functions:secrets:set STRIPE_SECRET_KEY_TEST
   firebase functions:secrets:set STRIPE_SECRET_KEY_LIVE

2) Param:
   firebase functions:params:set STRIPE_MODE="test"   # ou "live"

3) Build & Déploiement:
   npm --prefix firebase/functions ci
   npm --prefix firebase/functions run build   # attendu: 0 error
   firebase deploy --only functions:createPaymentIntent

4) Front ↔ Back:
   STRIPE_MODE=test  ↔ VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_MODE=live  ↔ VITE_STRIPE_PUBLIC_KEY=pk_live_...
*/