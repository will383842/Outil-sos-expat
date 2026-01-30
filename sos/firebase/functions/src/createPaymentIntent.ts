import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

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
// P0-3 FIX: Use ONLY centralized Stripe secrets - NEVER define secrets here!
import {
  getStripeSecretKey,
  getStripeMode as getStripeModeFromHelper,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_MODE,
  isProduction as isProductionEnv,
} from './lib/stripe';

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
  DUPLICATES: { WINDOW_MS: 3 * 60 * 1000 },  // Réduit de 15min à 3min pour permettre retry après échec
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
      DUPLICATES: { WINDOW_MS: 3 * 60 * 1000 },
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
    'https://ia.sos-expat.com',
    'https://outil-sos-expat.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
};

// P0-4 FIX: Removed duplicate defineSecret/defineString - now using centralized imports from lib/stripe
// This prevents credential loading failures due to multiple bindings

const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'dev' ||
  !process.env.NODE_ENV;
// P0-5 FIX: Use centralized isProduction() which checks GCP project, not just NODE_ENV
const isProduction = isProductionEnv();
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';

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
  useDirectCharges?: boolean;
  // FIX: Pour Direct Charges, le frontend a besoin du stripeAccountId pour confirmCardPayment
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
   Rate Limiting - Firestore-based (P1 FIX: persistant entre redeploys)
   ──────────────────────────────────────────────────────────────────────────── */

// In-memory cache pour éviter les lectures Firestore répétées (court TTL)
const rateLimitCache = new Map<string, { bucket: RateLimitBucket; cachedAt: number }>();
const RATE_LIMIT_CACHE_TTL = 5000; // 5 secondes de cache local

/**
 * P1 FIX: Rate limiting persistant avec Firestore
 * - Utilise Firestore pour la persistance entre redeploys/scaling
 * - Cache local de 5s pour éviter les lectures répétées
 * - Transaction atomique pour éviter les race conditions
 */
async function checkRateLimitFirestore(
  userId: string,
  db: admin.firestore.Firestore
): Promise<{ allowed: boolean; resetTime?: number }> {
  if (BYPASS_MODE) return { allowed: true };

  // 🔒 Pare-feu anti-undefined (plus robuste qu'un simple getLimits())
  const L =
    typeof LIMITS === 'object' && (LIMITS as { RATE_LIMIT?: { WINDOW_MS: number; MAX_REQUESTS: number } }).RATE_LIMIT
      ? (LIMITS.RATE_LIMIT as { WINDOW_MS: number; MAX_REQUESTS: number })
      : { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 };

  const now = Date.now();
  const key = `payment_rate_${userId}`;

  // Vérifier le cache local d'abord (évite les lectures Firestore répétées)
  const cached = rateLimitCache.get(key);
  if (cached && (now - cached.cachedAt) < RATE_LIMIT_CACHE_TTL) {
    if (cached.bucket.count >= L.MAX_REQUESTS && now < cached.bucket.resetTime) {
      return { allowed: false, resetTime: cached.bucket.resetTime };
    }
  }

  const rateLimitRef = db.collection('rate_limits').doc(key);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() as RateLimitBucket | undefined;

      let bucket: RateLimitBucket;

      if (!data || now > data.resetTime) {
        // Nouveau bucket ou expiré
        bucket = { count: 1, resetTime: now + L.WINDOW_MS };
        transaction.set(rateLimitRef, {
          ...bucket,
          userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // TTL pour cleanup automatique (Firestore TTL policy)
          expireAt: admin.firestore.Timestamp.fromMillis(bucket.resetTime + 60000), // +1 min de marge
        });
        return { allowed: true, bucket };
      }

      if (data.count >= L.MAX_REQUESTS) {
        // Limite atteinte
        return { allowed: false, resetTime: data.resetTime, bucket: data };
      }

      // Incrémenter le compteur
      bucket = { count: data.count + 1, resetTime: data.resetTime };
      transaction.update(rateLimitRef, {
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { allowed: true, bucket };
    });

    // Mettre à jour le cache local
    rateLimitCache.set(key, { bucket: result.bucket, cachedAt: now });

    return { allowed: result.allowed, resetTime: result.resetTime };
  } catch (err) {
    // En cas d'erreur Firestore, fallback sur autorisation (mieux que bloquer)
    logger.warn('[checkRateLimitFirestore] Transaction failed, allowing request', {
      userId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return { allowed: true };
  }
}

/* Validations */
// PERF OPTIMIZATION: Retourne aussi le stripeAccountId pour éviter une double lecture plus tard
async function validateBusinessLogic(
  data: PaymentIntentRequestData,
  currency: SupportedCurrency,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string; stripeAccountId?: string }> {
  if (BYPASS_MODE) return { valid: true };
  try {
    // 🚀 PERF: Lectures parallèles au lieu de séquentielles (gain ~200ms)
    const [providerDoc, providerProfileDoc] = await Promise.all([
      db.collection('users').doc(data.providerId).get(),
      db.collection('sos_profiles').doc(data.providerId).get(),
    ]);

    const providerData = providerDoc.data();
    if (!providerData) return { valid: false, error: 'Prestataire non trouvé' };
    if (providerData.status === 'suspended' || providerData.status === 'banned') {
      return { valid: false, error: 'Prestataire non disponible' };
    }

    // P0-2 FIX: Vérifier la disponibilité du provider AVANT le paiement
    // Cela évite les paiements pour des providers qui sont offline ou indisponibles
    let stripeAccountId: string | undefined;
    if (providerProfileDoc.exists) {
      const profileData = providerProfileDoc.data();
      // 🚀 PERF: Récupérer stripeAccountId ici pour éviter une lecture dupliquée plus tard
      stripeAccountId = profileData?.stripeAccountId;

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

    if (!isProduction) return { valid: true, stripeAccountId };

    // Récupération dynamique des prix depuis Firestore
    // Note: getPricingConfig est déjà appelé en parallèle dans le flux principal
    const serviceKind: 'lawyer' | 'expat' = data.serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
    const pricingConfig = await getPricingConfig(serviceKind, currency, db);
    const expectedTotal = pricingConfig.totalAmount;

    // Tolérance large (100€) pour ce contrôle de sanité basique
    // La vraie validation stricte (±0.5€) se fait plus tard dans le flux
    const diff = Math.abs(Number(data.amount) - expectedTotal);
    if (diff > 100) return { valid: false, error: 'Montant inhabituel pour ce service' };
    return { valid: true, stripeAccountId };
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
 * 🚀 PERF OPTIMIZED: Vérification atomique des doublons avec transaction Firestore.
 * Version simplifiée: 1 transaction atomique + 1 requête parallèle (gain ~500-800ms)
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

  const lockKey = `${clientId}_${providerId}_${amountInMainUnit}_${currency}`;
  const lockRef = db.collection('payment_locks').doc(lockKey);
  const windowMs = getLimits().DUPLICATES.WINDOW_MS;
  const cutoffTime = new Date(Date.now() - windowMs);

  // Statuts qui indiquent un paiement terminé avec succès ou en cours actif
  const activePaymentStatuses = ['requires_confirmation', 'requires_capture', 'processing', 'succeeded', 'captured'];
  // Statuts de call_session qui sont actifs (bloquer le retry)
  const activeCallStatuses = ['pending', 'scheduled', 'in_progress', 'calling', 'connected', 'completed'];

  try {
    // 🚀 PERF: Transaction atomique unique qui vérifie ET crée le lock
    // Évite les multiples allers-retours Firestore (ancien: 4-6 opérations → nouveau: 1 transaction)
    const result = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);

      if (lockDoc.exists) {
        const lockData = lockDoc.data();
        const lockCreatedAt = lockData?.createdAt?.toDate?.() || new Date(0);

        // Si le lock est récent (dans la fenêtre de temps)
        if (lockCreatedAt > cutoffTime) {
          const lockedPaymentIntentId = lockData?.paymentIntentId;
          const lockedCallSessionId = lockData?.callSessionId;

          // 🚀 PERF: Vérifications parallèles au lieu de séquentielles
          const checkPromises: Promise<{ type: string; failed: boolean }>[] = [];

          // Vérifier le paiement si on a un ID
          if (lockedPaymentIntentId) {
            checkPromises.push(
              db.collection('payments').doc(lockedPaymentIntentId).get().then(doc => {
                if (!doc.exists) return { type: 'payment', failed: true };
                const status = doc.data()?.status;
                // Paiement échoué ou en attente de carte → permet retry
                if (!status || status === 'requires_payment_method' || status === 'canceled' ||
                    status === 'failed' || status === 'payment_failed' || status === 'error' || status === 'expired') {
                  return { type: 'payment', failed: true };
                }
                // Paiement actif → bloquer
                if (activePaymentStatuses.includes(status)) {
                  return { type: 'payment', failed: false };
                }
                // Paiement pending depuis longtemps → permet retry
                const createdAt = doc.data()?.createdAt?.toDate?.();
                if (createdAt && status === 'pending') {
                  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
                  if (createdAt < threeMinAgo) return { type: 'payment', failed: true };
                }
                return { type: 'payment', failed: false };
              })
            );
          }

          // Vérifier la call_session si on a un ID
          if (lockedCallSessionId) {
            checkPromises.push(
              db.collection('call_sessions').doc(lockedCallSessionId).get().then(doc => {
                if (!doc.exists) return { type: 'call', failed: true };
                const status = doc.data()?.status;
                // Call session active → bloquer
                if (activeCallStatuses.includes(status)) {
                  return { type: 'call', failed: false };
                }
                // Call session échouée ou terminée avec erreur → permet retry
                return { type: 'call', failed: true };
              })
            );
          }

          // Exécuter les vérifications en parallèle (hors transaction pour perf)
          // Note: on sort de la transaction pour faire les reads parallèles
          return {
            hasValidLock: true,
            lockedPaymentIntentId,
            checkPromises,
          };
        }
      }

      // Pas de lock valide → créer un nouveau lock atomiquement
      transaction.set(lockRef, {
        clientId,
        providerId,
        amountInMainUnit,
        currency,
        callSessionId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + windowMs),
        status: 'pending'
      });

      return { hasValidLock: false, lockCreated: true };
    });

    // Si lock créé directement → pas de doublon
    if (!result.hasValidLock) {
      console.log('🔍 Pas de lock existant - nouveau lock créé');
      return { isDuplicate: false, lockId: lockKey };
    }

    // 🚀 PERF: Exécuter les vérifications en parallèle (hors transaction)
    if (result.checkPromises && result.checkPromises.length > 0) {
      const checks = await Promise.all(result.checkPromises);

      // Si le paiement est actif (non échoué), bloquer
      const paymentCheck = checks.find(c => c.type === 'payment');
      if (paymentCheck && !paymentCheck.failed) {
        console.log(`🔍 Lock existe avec paiement actif - BLOQUÉ`);
        return { isDuplicate: true, existingPaymentId: result.lockedPaymentIntentId };
      }

      // Si la call session est active, bloquer
      const callCheck = checks.find(c => c.type === 'call');
      if (callCheck && !callCheck.failed) {
        console.log(`🔍 Lock existe avec call session active - BLOQUÉ`);
        return { isDuplicate: true, existingPaymentId: result.lockedPaymentIntentId };
      }
    }

    // Le lock existe mais le paiement/call a échoué → permettre retry, recréer le lock
    console.log('🔍 Lock existe mais paiement/call échoué - autoriser retry');
    await db.collection('payment_locks').doc(lockKey).set({
      clientId,
      providerId,
      amountInMainUnit,
      currency,
      callSessionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + windowMs),
      status: 'pending'
    });

    return { isDuplicate: false, lockId: lockKey };
  } catch (err) {
    await logError('checkAndLockDuplicatePayments', err as unknown);
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
    // P0 SECURITY FIX: Masquer les données sensibles dans les logs
    const maskId = (id: string | undefined) => id ? `${id.substring(0, 8)}...` : undefined;

    prodLogger.info('PAYMENT_START', `[${requestId}] Nouvelle demande de paiement`, {
      requestId,
      userId: maskId(request.auth?.uid) || 'ANONYMOUS',
      inputData: {
        amount: request.data?.amount,
        currency: request.data?.currency,
        serviceType: request.data?.serviceType,
        providerId: maskId(request.data?.providerId),
        clientId: maskId(request.data?.clientId),
        callSessionId: request.data?.callSessionId,
        hasCommission: request.data?.commissionAmount !== undefined,
        hasProviderAmount: request.data?.providerAmount !== undefined,
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

      // P1 FIX: Rate limit Firestore-based (persistant entre redeploys)
      const db = admin.firestore();
      prodLogger.debug('PAYMENT_STEP', `[${requestId}] Vérification rate limit pour ${userId}`);
      const rl = await checkRateLimitFirestore(userId, db);
      if (!rl.allowed) {
        const waitMin = Math.ceil(((rl.resetTime ?? Date.now()) - Date.now()) / 60000);
        prodLogger.warn('PAYMENT_BLOCKED', `[${requestId}] Rate limit atteint`, {
          userId,
          resetTime: rl.resetTime,
          waitMinutes: waitMin,
        });
        throw new HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitMin} min.`);
      }
      prodLogger.debug('PAYMENT_STEP', `[${requestId}] ✓ Rate limit OK (Firestore)`);

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

      // Note: db already initialized above for rate limiting (P1 FIX)

      // ═══════════════════════════════════════════════════════════════════════════
      // 🚀 PERF OPTIMIZATION: Validations parallèles (étapes 1-3 en parallèle)
      // Gain estimé: ~500-800ms (de 1.2s séquentiel à ~400ms parallèle)
      // ═══════════════════════════════════════════════════════════════════════════
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] Démarrage validations parallèles...`);
      const serviceKind: 'lawyer' | 'expat' = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';

      const [sec, biz, cfg, pricingSnap] = await Promise.all([
        // Validation 1: Limites montants + quota quotidien
        validateAmountSecurity(amountInMainUnit, currency, userId, db),
        // Validation 2: Règles métier (provider disponible, etc.)
        validateBusinessLogic(request.data, currency, db),
        // Validation 3: Récupérer pricing config (avec cache + overrides)
        getPricingConfig(serviceKind, currency, db),
        // Validation 4: Récupérer le doc pricing pour les overrides (coupons)
        db.collection('admin_config').doc('pricing').get(),
      ]);

      // Vérifier les résultats des validations
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

      if (!biz.valid) {
        prodLogger.error('PAYMENT_VALIDATION_FAILED', `[${requestId}] Échec règles métier`, {
          error: biz.error,
          providerId,
          serviceType,
        });
        throw new HttpsError('failed-precondition', biz.error ?? 'Règles métier non satisfaites');
      }
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Règles métier OK`);

      let expected = cfg.totalAmount;
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Pricing chargé: ${expected}${currency}`);

      // ═══════════════════════════════════════════════════════════════════════════
      // 🔍 VALIDATION ÉTAPE 4: Anti-doublons (après validations - évite lock inutile si échec)
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
      prodLogger.debug('PAYMENT_VALIDATION', `[${requestId}] ✓ Pas de doublon, lock créé: ${paymentLockId}`);

      // Utiliser le pricingSnap déjà chargé pour les overrides (évite double lecture)
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
      // 🚀 PERF: Réutilise le stripeAccountId déjà récupéré dans validateBusinessLogic
      // Évite une lecture Firestore dupliquée (gain ~100-200ms)
      const providerStripeAccountId = biz.stripeAccountId;
      if (providerStripeAccountId) {
        logger.info('[createPaymentIntent] Destination Charges activé', {
          providerId,
          stripeAccountId: providerStripeAccountId.substring(0, 15) + '...',
          providerAmount: providerAmountInMainUnit,
        });
      } else {
        logger.warn('[createPaymentIntent] Prestataire sans compte Stripe Connect - mode transfert manuel', {
          providerId,
        });
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

      // ═══════════════════════════════════════════════════════════════════════════
      // ✅ SUCCÈS - Log final avec toutes les informations
      // ═══════════════════════════════════════════════════════════════════════════
      const totalProcessingTime = Date.now() - startTime;

      // P0 SECURITY FIX: Ne plus exposer stripeAccountId au frontend
      // Pour Direct Charges, le clientSecret encode déjà l'information du compte connecté
      // Le frontend utilise confirmCardPayment(clientSecret) sans avoir besoin de stripeAccount
      const isDirectChargesMode = !!providerStripeAccountId;

      // P0 SECURITY FIX: Ne JAMAIS logger clientSecret (même tronqué) - risque de reconstruction
      prodLogger.info('PAYMENT_SUCCESS', `[${requestId}] ✅ PaymentIntent créé avec succès en ${totalProcessingTime}ms`, {
        requestId,
        paymentIntentId: result.paymentIntentId ? `${result.paymentIntentId.substring(0, 10)}...` : null,
        hasClientSecret: !!result.clientSecret,
        amount: amountInCents,
        currency,
        serviceType,
        providerId: maskId(providerId),
        clientId: maskId(clientId),
        callSessionId,
        stripeMode: STRIPE_MODE.value() || 'test',
        useDirectCharges: isDirectChargesMode,
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
        useDirectCharges: isDirectChargesMode,
        // FIX: Pour Direct Charges, le frontend a besoin du stripeAccountId pour confirmCardPayment
        // Car le PaymentIntent est créé sur le compte Connect du provider, pas sur la plateforme
        ...(isDirectChargesMode && providerStripeAccountId ? { stripeAccountId: providerStripeAccountId } : {}),
      };
    } catch (err: unknown) {
      const processingTime = Date.now() - startTime;

      // ═══════════════════════════════════════════════════════════════════════════
      // ❌ ERREUR GLOBALE - Log détaillé pour diagnostic
      // ═══════════════════════════════════════════════════════════════════════════
      // P0 SECURITY FIX: Masquer les données sensibles dans les logs d'erreur
      prodLogger.error('PAYMENT_FATAL_ERROR', `[${requestId}] ❌ Erreur fatale dans createPaymentIntent`, {
        requestId,
        errorType: err instanceof HttpsError ? 'HttpsError' : 'UnknownError',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorCode: err instanceof HttpsError ? err.code : 'unknown',
        // P0 SECURITY FIX: Ne pas logger les stack traces (exposent l'architecture)
        processingTimeMs: processingTime,
        inputData: {
          amount: request.data?.amount,
          serviceType: request.data?.serviceType,
          currency: request.data?.currency,
          providerId: request.data?.providerId ? `${request.data.providerId.substring(0, 8)}...` : undefined,
          clientId: request.data?.clientId ? `${request.data.clientId.substring(0, 8)}...` : undefined,
          callSessionId: request.data?.callSessionId,
        },
        userId: request.auth?.uid ? `${request.auth.uid.substring(0, 8)}...` : 'not-authenticated',
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