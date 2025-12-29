/**
 * SOS-Expat Subscription Service (Frontend)
 * Service de gestion des abonnements pour le frontend
 *
 * Ce service encapsule toutes les operations liees aux abonnements:
 * - Recuperation des details d'abonnement
 * - Gestion des plans disponibles avec cache
 * - Creation de sessions de checkout Stripe
 * - Annulation et reactivation d'abonnements
 * - Acces au portail de facturation
 * - Verification et increment des quotas IA
 * - Ecoute en temps reel des changements
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  ProviderType,
  AiUsage,
  QuotaCheckResult,
  Invoice,
  BillingPeriod,
  DEFAULT_AI_CALLS_LIMIT
} from '../types/subscription';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Details complets de l'abonnement d'un provider
 */
export interface SubscriptionDetails {
  /** Abonnement actuel ou null si aucun */
  subscription: Subscription | null;
  /** Plan actuel ou null */
  plan: SubscriptionPlan | null;
  /** Usage IA actuel ou null */
  usage: AiUsage | null;
  /** Historique des factures */
  invoices: Invoice[];
  /** Indique si l'abonnement peut etre annule */
  canCancel: boolean;
  /** Indique si l'annulation est prevue en fin de periode */
  cancelAtPeriodEnd: boolean;
  /** Date de la prochaine facturation */
  nextBillingDate: Date | null;
  /** Indique si en periode d'essai */
  isInTrial: boolean;
  /** Nombre de jours restants dans l'essai */
  trialDaysRemaining: number;
}

/**
 * Resultat de la creation d'une session de checkout
 */
export interface CheckoutResult {
  /** ID de la session Stripe */
  sessionId: string;
  /** URL de redirection vers le checkout Stripe */
  url: string;
}

/**
 * Erreur du service d'abonnement avec code traduit
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly translationKey: string
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  SUBSCRIPTIONS: 'subscriptions',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  AI_USAGE: 'ai_usage',
  INVOICES: 'invoices',
  USERS: 'users'
} as const;

/** Duree du cache pour les plans (5 minutes) */
const PLANS_CACHE_DURATION_MS = 5 * 60 * 1000;

/** Codes d'erreur et leurs cles de traduction */
const ERROR_CODES: Record<string, string> = {
  'no_subscription': 'subscription.errors.noSubscription',
  'subscription_expired': 'subscription.errors.subscriptionExpired',
  'subscription_canceled': 'subscription.errors.subscriptionCanceled',
  'payment_failed': 'subscription.errors.paymentFailed',
  'quota_exhausted': 'subscription.errors.quotaExhausted',
  'trial_expired': 'subscription.errors.trialExpired',
  'trial_calls_exhausted': 'subscription.errors.trialCallsExhausted',
  'checkout_failed': 'subscription.errors.checkoutFailed',
  'cancel_failed': 'subscription.errors.cancelFailed',
  'reactivate_failed': 'subscription.errors.reactivateFailed',
  'portal_failed': 'subscription.errors.portalFailed',
  'increment_failed': 'subscription.errors.incrementFailed',
  'generic': 'subscription.errors.generic',
  'not_authenticated': 'error.notAuthenticated',
  'network_error': 'error.network'
};

// ============================================================================
// PLANS CACHE
// ============================================================================

interface PlansCacheEntry {
  plans: SubscriptionPlan[];
  timestamp: number;
}

const plansCache: Map<ProviderType, PlansCacheEntry> = new Map();

/**
 * Verifie si le cache des plans est valide
 */
function isPlansCacheValid(providerType: ProviderType): boolean {
  const entry = plansCache.get(providerType);
  if (!entry) return false;
  return Date.now() - entry.timestamp < PLANS_CACHE_DURATION_MS;
}

/**
 * Invalide le cache des plans pour un type de provider
 */
function invalidatePlansCache(providerType?: ProviderType): void {
  if (providerType) {
    plansCache.delete(providerType);
  } else {
    plansCache.clear();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse un document Firestore en objet Subscription
 */
function parseSubscription(id: string, data: Record<string, unknown>): Subscription {
  return {
    id,
    providerId: data.providerId as string,
    providerType: data.providerType as ProviderType,
    planId: data.planId as string,
    tier: data.tier as Subscription['tier'],
    status: data.status as SubscriptionStatus,
    stripeCustomerId: data.stripeCustomerId as string,
    stripeSubscriptionId: (data.stripeSubscriptionId as string) || null,
    stripePriceId: (data.stripePriceId as string) || null,
    trialStartedAt: data.trialStartedAt
      ? (data.trialStartedAt as { toDate: () => Date }).toDate()
      : null,
    trialEndsAt: data.trialEndsAt
      ? (data.trialEndsAt as { toDate: () => Date }).toDate()
      : null,
    currentPeriodStart: (data.currentPeriodStart as { toDate: () => Date }).toDate(),
    currentPeriodEnd: (data.currentPeriodEnd as { toDate: () => Date }).toDate(),
    canceledAt: data.canceledAt
      ? (data.canceledAt as { toDate: () => Date }).toDate()
      : null,
    cancelAtPeriodEnd: (data.cancelAtPeriodEnd as boolean) ?? false,
    currency: data.currency as Subscription['currency'],
    billingPeriod: data.billingPeriod as BillingPeriod | undefined,
    currentPeriodAmount: data.currentPeriodAmount as number,
    createdAt: (data.createdAt as { toDate: () => Date }).toDate(),
    updatedAt: (data.updatedAt as { toDate: () => Date }).toDate()
  };
}

/**
 * Parse un document Firestore en objet AiUsage
 */
function parseAiUsage(data: Record<string, unknown>): AiUsage {
  return {
    providerId: data.providerId as string,
    subscriptionId: data.subscriptionId as string,
    currentPeriodCalls: data.currentPeriodCalls as number,
    currentPeriodStart: (data.currentPeriodStart as { toDate: () => Date }).toDate(),
    currentPeriodEnd: (data.currentPeriodEnd as { toDate: () => Date }).toDate(),
    trialCallsUsed: data.trialCallsUsed as number,
    totalCallsAllTime: data.totalCallsAllTime as number,
    lastCallAt: data.lastCallAt
      ? (data.lastCallAt as { toDate: () => Date }).toDate()
      : null,
    updatedAt: (data.updatedAt as { toDate: () => Date }).toDate()
  };
}

/**
 * Parse un document Firestore en objet Invoice
 */
function parseInvoice(id: string, data: Record<string, unknown>): Invoice {
  return {
    id,
    stripeInvoiceId: data.stripeInvoiceId as string,
    providerId: data.providerId as string,
    subscriptionId: data.subscriptionId as string,
    amountDue: data.amountDue as number,
    amountPaid: data.amountPaid as number,
    currency: data.currency as Invoice['currency'],
    status: data.status as Invoice['status'],
    periodStart: (data.periodStart as { toDate: () => Date }).toDate(),
    periodEnd: (data.periodEnd as { toDate: () => Date }).toDate(),
    dueDate: data.dueDate
      ? (data.dueDate as { toDate: () => Date }).toDate()
      : null,
    paidAt: data.paidAt
      ? (data.paidAt as { toDate: () => Date }).toDate()
      : null,
    invoicePdfUrl: (data.invoicePdfUrl as string) || null,
    hostedInvoiceUrl: (data.hostedInvoiceUrl as string) || null,
    createdAt: (data.createdAt as { toDate: () => Date }).toDate()
  };
}

/**
 * Parse un document Firestore en objet SubscriptionPlan
 */
function parseSubscriptionPlan(id: string, data: Record<string, unknown>): SubscriptionPlan {
  return {
    id,
    ...data,
    createdAt: data.createdAt
      ? (data.createdAt as { toDate: () => Date }).toDate()
      : new Date(),
    updatedAt: data.updatedAt
      ? (data.updatedAt as { toDate: () => Date }).toDate()
      : new Date()
  } as SubscriptionPlan;
}

/**
 * Cree une erreur de service avec code de traduction
 */
function createError(code: string, originalMessage?: string): SubscriptionError {
  const translationKey = ERROR_CODES[code] || ERROR_CODES['generic'];
  const message = originalMessage || code;
  return new SubscriptionError(message, code, translationKey);
}

// ============================================================================
// SUBSCRIPTION SERVICE CLASS
// ============================================================================

class SubscriptionService {
  private currentProviderId: string | null = null;

  /**
   * Definit l'ID du provider courant (appele par le contexte d'auth)
   */
  setCurrentProvider(providerId: string | null): void {
    this.currentProviderId = providerId;
  }

  /**
   * Recupere l'ID du provider courant ou lance une erreur
   */
  private getProviderId(): string {
    if (!this.currentProviderId) {
      throw createError('not_authenticated', 'User is not authenticated');
    }
    return this.currentProviderId;
  }

  // ==========================================================================
  // GET SUBSCRIPTION DETAILS
  // ==========================================================================

  /**
   * Recupere les details complets de l'abonnement du provider connecte
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails> {
    const providerId = this.getProviderId();

    try {
      // Recuperer toutes les donnees en parallele
      const [subscription, usage, invoices] = await Promise.all([
        this.getSubscriptionForProvider(providerId),
        this.getUsageForProvider(providerId),
        this.getInvoicesForProvider(providerId)
      ]);

      // Recuperer le plan si on a un abonnement
      let plan: SubscriptionPlan | null = null;
      if (subscription?.planId) {
        plan = await this.getPlanById(subscription.planId);
      }

      // Calculer les infos derivees
      const now = new Date();
      const isInTrial = subscription?.status === 'trialing';
      const trialDaysRemaining = isInTrial && subscription?.trialEndsAt
        ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : 0;

      const canCancel = subscription !== null &&
        ['active', 'trialing'].includes(subscription.status) &&
        !subscription.cancelAtPeriodEnd;

      const nextBillingDate = subscription?.currentPeriodEnd || null;

      return {
        subscription,
        plan,
        usage,
        invoices,
        canCancel,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
        nextBillingDate,
        isInTrial,
        trialDaysRemaining
      };
    } catch (error) {
      console.error('[SubscriptionService] Error getting subscription details:', error);
      throw createError('generic', (error as Error).message);
    }
  }

  /**
   * Recupere l'abonnement d'un provider specifique
   */
  private async getSubscriptionForProvider(providerId: string): Promise<Subscription | null> {
    // Essayer avec l'ID direct
    const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
    const snapshot = await getDoc(subRef);

    if (snapshot.exists()) {
      return parseSubscription(snapshot.id, snapshot.data() as Record<string, unknown>);
    }

    // Essayer avec le format sub_{providerId}
    const subRefAlt = doc(db, COLLECTIONS.SUBSCRIPTIONS, `sub_${providerId}`);
    const snapshotAlt = await getDoc(subRefAlt);

    if (snapshotAlt.exists()) {
      return parseSubscription(snapshotAlt.id, snapshotAlt.data() as Record<string, unknown>);
    }

    // Verifier les donnees utilisateur
    const userRef = doc(db, COLLECTIONS.USERS, providerId);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      if (userData?.subscriptionStatus) {
        return this.buildSubscriptionFromUserData(providerId, userData);
      }
    }

    return null;
  }

  /**
   * Construit un objet Subscription a partir des donnees utilisateur
   */
  private buildSubscriptionFromUserData(
    providerId: string,
    userData: Record<string, unknown>
  ): Subscription {
    const now = new Date();
    const expiresAt = userData.subscriptionExpiresAt
      ? (userData.subscriptionExpiresAt as { toDate: () => Date }).toDate()
      : userData.trialEndsAt
        ? (userData.trialEndsAt as { toDate: () => Date }).toDate()
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: providerId,
      providerId,
      providerType: (userData.providerType as ProviderType) || 'lawyer',
      planId: (userData.planId as string) || 'basic',
      tier: (userData.tier as Subscription['tier']) ||
            (userData.planName as Subscription['tier']) || 'basic',
      status: userData.subscriptionStatus as SubscriptionStatus,
      stripeCustomerId: (userData.stripeCustomerId as string) || '',
      stripeSubscriptionId: (userData.stripeSubscriptionId as string) || null,
      stripePriceId: (userData.stripePriceId as string) || null,
      trialStartedAt: userData.trialStartedAt
        ? (userData.trialStartedAt as { toDate: () => Date }).toDate()
        : null,
      trialEndsAt: userData.trialEndsAt
        ? (userData.trialEndsAt as { toDate: () => Date }).toDate()
        : null,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      canceledAt: userData.canceledAt
        ? (userData.canceledAt as { toDate: () => Date }).toDate()
        : null,
      cancelAtPeriodEnd: (userData.cancelAtPeriodEnd as boolean) || false,
      currency: (userData.currency as Subscription['currency']) || 'EUR',
      currentPeriodAmount: (userData.priceAmount as number) || 0,
      createdAt: userData.createdAt
        ? (userData.createdAt as { toDate: () => Date }).toDate()
        : now,
      updatedAt: userData.updatedAt
        ? (userData.updatedAt as { toDate: () => Date }).toDate()
        : now
    };
  }

  /**
   * Recupere l'usage IA d'un provider
   */
  private async getUsageForProvider(providerId: string): Promise<AiUsage | null> {
    const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
    const snapshot = await getDoc(usageRef);

    if (!snapshot.exists()) return null;
    return parseAiUsage(snapshot.data() as Record<string, unknown>);
  }

  /**
   * Recupere les factures d'un provider
   */
  private async getInvoicesForProvider(providerId: string): Promise<Invoice[]> {
    try {
      const invoicesRef = collection(db, COLLECTIONS.INVOICES);
      const q = query(
        invoicesRef,
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d =>
        parseInvoice(d.id, d.data() as Record<string, unknown>)
      );
    } catch (error) {
      // Index manquant ou autre erreur - retourner tableau vide
      console.warn('[SubscriptionService] Error fetching invoices:', error);
      return [];
    }
  }

  /**
   * Recupere un plan par son ID
   */
  private async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const planRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, planId);
    const snapshot = await getDoc(planRef);

    if (!snapshot.exists()) return null;
    return parseSubscriptionPlan(snapshot.id, snapshot.data() as Record<string, unknown>);
  }

  // ==========================================================================
  // GET AVAILABLE PLANS
  // ==========================================================================

  /**
   * Recupere tous les plans disponibles pour un type de provider
   * Utilise un cache memoire de 5 minutes
   */
  async getAvailablePlans(providerType: ProviderType): Promise<SubscriptionPlan[]> {
    // Verifier le cache
    if (isPlansCacheValid(providerType)) {
      const cached = plansCache.get(providerType);
      if (cached) {
        return cached.plans;
      }
    }

    try {
      const plansRef = collection(db, COLLECTIONS.SUBSCRIPTION_PLANS);
      const q = query(
        plansRef,
        where('providerType', '==', providerType),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      );

      const snapshot = await getDocs(q);
      const plans = snapshot.docs.map(d =>
        parseSubscriptionPlan(d.id, d.data() as Record<string, unknown>)
      );

      // Mettre en cache
      plansCache.set(providerType, {
        plans,
        timestamp: Date.now()
      });

      return plans;
    } catch (error) {
      console.error('[SubscriptionService] Error fetching plans:', error);
      throw createError('generic', (error as Error).message);
    }
  }

  /**
   * Invalide le cache des plans (utile apres une mise a jour admin)
   */
  invalidatePlansCache(providerType?: ProviderType): void {
    invalidatePlansCache(providerType);
  }

  // ==========================================================================
  // CHECKOUT
  // ==========================================================================

  /**
   * Cree une session de checkout Stripe
   */
  async createCheckout(
    planId: string,
    billingPeriod: BillingPeriod
  ): Promise<CheckoutResult> {
    this.getProviderId(); // Verifier l'authentification

    try {
      const createCheckoutFn = httpsCallable<
        { planId: string; billingPeriod: BillingPeriod },
        CheckoutResult
      >(functions, 'createSubscriptionCheckout');

      const result: HttpsCallableResult<CheckoutResult> = await createCheckoutFn({
        planId,
        billingPeriod
      });

      if (!result.data.sessionId || !result.data.url) {
        throw new Error('Invalid checkout response');
      }

      return result.data;
    } catch (error) {
      console.error('[SubscriptionService] Error creating checkout:', error);
      throw createError('checkout_failed', (error as Error).message);
    }
  }

  // ==========================================================================
  // CANCEL SUBSCRIPTION
  // ==========================================================================

  /**
   * Annule l'abonnement du provider connecte
   * L'annulation prend effet a la fin de la periode en cours
   */
  async cancelSubscription(reason?: string): Promise<void> {
    this.getProviderId(); // Verifier l'authentification

    try {
      const cancelFn = httpsCallable<
        { cancelAtPeriodEnd: boolean; reason?: string },
        { success: boolean; error?: string }
      >(functions, 'cancelSubscription');

      const result = await cancelFn({
        cancelAtPeriodEnd: true,
        reason
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Cancellation failed');
      }
    } catch (error) {
      console.error('[SubscriptionService] Error canceling subscription:', error);
      throw createError('cancel_failed', (error as Error).message);
    }
  }

  // ==========================================================================
  // REACTIVATE SUBSCRIPTION
  // ==========================================================================

  /**
   * Reactive un abonnement annule (avant la fin de periode)
   */
  async reactivateSubscription(): Promise<void> {
    this.getProviderId(); // Verifier l'authentification

    try {
      const reactivateFn = httpsCallable<
        void,
        { success: boolean; error?: string }
      >(functions, 'reactivateSubscription');

      const result = await reactivateFn();

      if (!result.data.success) {
        throw new Error(result.data.error || 'Reactivation failed');
      }
    } catch (error) {
      console.error('[SubscriptionService] Error reactivating subscription:', error);
      throw createError('reactivate_failed', (error as Error).message);
    }
  }

  // ==========================================================================
  // BILLING PORTAL
  // ==========================================================================

  /**
   * Obtient l'URL du portail de facturation Stripe
   */
  async getBillingPortalUrl(): Promise<string> {
    this.getProviderId(); // Verifier l'authentification

    try {
      const createPortalFn = httpsCallable<
        void,
        { url: string }
      >(functions, 'createStripePortalSession');

      const result = await createPortalFn();

      if (!result.data.url) {
        throw new Error('Invalid portal response');
      }

      return result.data.url;
    } catch (error) {
      console.error('[SubscriptionService] Error getting billing portal URL:', error);
      throw createError('portal_failed', (error as Error).message);
    }
  }

  // ==========================================================================
  // AI ACCESS CHECK
  // ==========================================================================

  /**
   * Verifie si le provider a acces a l'IA
   */
  async checkAiAccess(): Promise<QuotaCheckResult> {
    const providerId = this.getProviderId();

    try {
      // Verifier d'abord l'acces force ou essai manuel
      const { hasForcedAccess, freeTrialUntil } = await this.checkForcedOrTrialAccess(providerId);

      if (hasForcedAccess) {
        return {
          allowed: true,
          currentUsage: 0,
          limit: -1,
          remaining: -1,
          isInTrial: false
        };
      }

      if (freeTrialUntil) {
        const daysRemaining = Math.ceil(
          (freeTrialUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        return {
          allowed: true,
          currentUsage: 0,
          limit: 100,
          remaining: 100,
          isInTrial: true,
          trialDaysRemaining: daysRemaining,
          trialCallsRemaining: 100
        };
      }

      // Appeler la Cloud Function pour une verification complete
      const checkQuotaFn = httpsCallable<
        void,
        QuotaCheckResult
      >(functions, 'checkAiQuota');

      const result = await checkQuotaFn();
      return result.data;
    } catch (error) {
      console.error('[SubscriptionService] Error checking AI access:', error);

      // En cas d'erreur, faire une verification locale basique
      return this.checkAiAccessLocally(providerId);
    }
  }

  /**
   * Verifie l'acces force ou essai gratuit manuel
   */
  private async checkForcedOrTrialAccess(providerId: string): Promise<{
    hasForcedAccess: boolean;
    freeTrialUntil: Date | null;
  }> {
    const userRef = doc(db, COLLECTIONS.USERS, providerId);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return { hasForcedAccess: false, freeTrialUntil: null };
    }

    const userData = userSnapshot.data();

    // Verifier l'acces admin force (supporter les variantes de nommage)
    if (userData?.forcedAiAccess === true || userData?.forceAiAccess === true || userData?.forcedAIAccess === true) {
      return { hasForcedAccess: true, freeTrialUntil: null };
    }

    // Verifier l'essai gratuit manuel
    if (userData?.freeTrialUntil) {
      const trialDate = userData.freeTrialUntil.toDate
        ? userData.freeTrialUntil.toDate()
        : new Date(userData.freeTrialUntil);

      if (trialDate > new Date()) {
        return { hasForcedAccess: false, freeTrialUntil: trialDate };
      }
    }

    return { hasForcedAccess: false, freeTrialUntil: null };
  }

  /**
   * Verification locale de l'acces IA (fallback)
   */
  private async checkAiAccessLocally(providerId: string): Promise<QuotaCheckResult> {
    const [subscription, usage] = await Promise.all([
      this.getSubscriptionForProvider(providerId),
      this.getUsageForProvider(providerId)
    ]);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'no_subscription',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isInTrial: false,
        suggestedUpgrade: { tier: 'basic', planId: 'basic' }
      };
    }

    const now = new Date();
    const isInTrial = subscription.status === 'trialing';
    const limit = DEFAULT_AI_CALLS_LIMIT[subscription.tier] ?? 0;
    const currentUsage = isInTrial
      ? (usage?.trialCallsUsed ?? 0)
      : (usage?.currentPeriodCalls ?? 0);

    // Verifier le statut
    if (['expired', 'canceled'].includes(subscription.status)) {
      return {
        allowed: false,
        reason: subscription.status === 'expired' ? 'subscription_expired' : 'subscription_canceled',
        currentUsage,
        limit,
        remaining: 0,
        isInTrial
      };
    }

    if (subscription.status === 'past_due') {
      return {
        allowed: false,
        reason: 'payment_failed',
        currentUsage,
        limit,
        remaining: 0,
        isInTrial
      };
    }

    // Verifier le quota
    if (limit !== -1 && currentUsage >= limit) {
      return {
        allowed: false,
        reason: 'quota_exhausted',
        currentUsage,
        limit,
        remaining: 0,
        isInTrial
      };
    }

    return {
      allowed: true,
      currentUsage,
      limit,
      remaining: limit === -1 ? -1 : limit - currentUsage,
      isInTrial
    };
  }

  // ==========================================================================
  // INCREMENT USAGE
  // ==========================================================================

  /**
   * Incremente l'usage IA apres un appel
   * Doit etre appele apres chaque appel IA reussi
   */
  async incrementUsage(): Promise<{ currentUsage: number; limit: number }> {
    this.getProviderId(); // Verifier l'authentification

    try {
      const incrementFn = httpsCallable<
        void,
        { currentUsage: number; limit: number }
      >(functions, 'incrementAiUsage');

      const result = await incrementFn();
      return result.data;
    } catch (error) {
      console.error('[SubscriptionService] Error incrementing usage:', error);
      throw createError('increment_failed', (error as Error).message);
    }
  }

  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Ecoute les changements d'abonnement en temps reel
   * @param callback Fonction appelee a chaque changement
   * @returns Fonction pour arreter l'ecoute
   */
  subscribeToChanges(callback: (details: SubscriptionDetails) => void): () => void {
    const providerId = this.currentProviderId;
    if (!providerId) {
      console.warn('[SubscriptionService] Cannot subscribe without provider ID');
      return () => {};
    }

    const unsubscribers: Unsubscribe[] = [];
    let latestSubscription: Subscription | null = null;
    let latestUsage: AiUsage | null = null;
    let latestPlan: SubscriptionPlan | null = null;
    let latestInvoices: Invoice[] = [];

    // Fonction pour notifier le callback avec les dernieres donnees
    const notifyCallback = async () => {
      const now = new Date();
      const isInTrial = latestSubscription?.status === 'trialing';
      const trialDaysRemaining = isInTrial && latestSubscription?.trialEndsAt
        ? Math.max(0, Math.ceil((latestSubscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : 0;

      const canCancel = latestSubscription !== null &&
        ['active', 'trialing'].includes(latestSubscription.status) &&
        !latestSubscription.cancelAtPeriodEnd;

      callback({
        subscription: latestSubscription,
        plan: latestPlan,
        usage: latestUsage,
        invoices: latestInvoices,
        canCancel,
        cancelAtPeriodEnd: latestSubscription?.cancelAtPeriodEnd ?? false,
        nextBillingDate: latestSubscription?.currentPeriodEnd || null,
        isInTrial,
        trialDaysRemaining
      });
    };

    // Ecouter l'abonnement (format direct)
    const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
    unsubscribers.push(
      onSnapshot(subRef, async (snapshot) => {
        if (snapshot.exists()) {
          latestSubscription = parseSubscription(
            snapshot.id,
            snapshot.data() as Record<string, unknown>
          );

          // Charger le plan si necessaire
          if (latestSubscription.planId && (!latestPlan || latestPlan.id !== latestSubscription.planId)) {
            latestPlan = await this.getPlanById(latestSubscription.planId);
          }

          notifyCallback();
        }
      })
    );

    // Ecouter l'abonnement (format alternatif)
    const subRefAlt = doc(db, COLLECTIONS.SUBSCRIPTIONS, `sub_${providerId}`);
    unsubscribers.push(
      onSnapshot(subRefAlt, async (snapshot) => {
        if (snapshot.exists()) {
          latestSubscription = parseSubscription(
            snapshot.id,
            snapshot.data() as Record<string, unknown>
          );

          if (latestSubscription.planId && (!latestPlan || latestPlan.id !== latestSubscription.planId)) {
            latestPlan = await this.getPlanById(latestSubscription.planId);
          }

          notifyCallback();
        }
      })
    );

    // Ecouter l'usage
    const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
    unsubscribers.push(
      onSnapshot(usageRef, (snapshot) => {
        if (snapshot.exists()) {
          latestUsage = parseAiUsage(snapshot.data() as Record<string, unknown>);
          notifyCallback();
        } else {
          latestUsage = null;
          notifyCallback();
        }
      })
    );

    // Ecouter les factures
    try {
      const invoicesRef = collection(db, COLLECTIONS.INVOICES);
      const invoicesQuery = query(
        invoicesRef,
        where('providerId', '==', providerId),
        orderBy('createdAt', 'desc')
      );

      unsubscribers.push(
        onSnapshot(
          invoicesQuery,
          (snapshot) => {
            latestInvoices = snapshot.docs.map(d =>
              parseInvoice(d.id, d.data() as Record<string, unknown>)
            );
            notifyCallback();
          },
          (error) => {
            // Index manquant - ignorer silencieusement
            console.warn('[SubscriptionService] Invoice subscription error:', error.message);
            latestInvoices = [];
          }
        )
      );
    } catch (error) {
      console.warn('[SubscriptionService] Could not subscribe to invoices');
    }

    // Ecouter les donnees utilisateur (fallback)
    const userRef = doc(db, COLLECTIONS.USERS, providerId);
    unsubscribers.push(
      onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists() && !latestSubscription) {
          const userData = snapshot.data();
          if (userData?.subscriptionStatus) {
            latestSubscription = this.buildSubscriptionFromUserData(providerId, userData);

            if (latestSubscription.planId) {
              latestPlan = await this.getPlanById(latestSubscription.planId);
            }

            notifyCallback();
          }
        }
      })
    );

    // Retourner la fonction d'arret
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const subscriptionService = new SubscriptionService();

// Export par defaut
export default subscriptionService;
