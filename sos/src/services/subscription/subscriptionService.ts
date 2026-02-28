/**
 * SOS-Expat Subscription Service
 * Service de gestion des abonnements et quotas IA
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionTier,
  SubscriptionStatus,
  ProviderType,
  Currency,
  AiUsage,
  AiCallLog,
  QuotaCheckResult,
  TrialConfig,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  GetUsageResponse,
  Invoice,
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_AI_CALLS_LIMIT,
  UNLIMITED_FAIR_USE_LIMIT
} from '../../types/subscription';
import { fetchWithCache } from '../../utils/firestoreCache';

// ============================================================================
// COST OPTIMIZATION: LISTENER DEDUPLICATION & CACHING
// Prevents multiple onSnapshot listeners for the same data
// Reduces Firestore reads by ~80% for repeated subscriptions
// ============================================================================

interface CachedListener<T> {
  data: T | null;
  callbacks: Set<(data: T | null) => void>;
  unsubscribe: (() => void) | null;
  lastUpdate: number;
}

// Cache for active listeners (shared across components)
const listenerCache: Record<string, CachedListener<any>> = {};

/**
 * Subscribe to data with deduplication
 * Multiple components subscribing to the same path will share ONE listener
 */
function subscribeWithDeduplication<T>(
  cacheKey: string,
  createListener: (callback: (data: T | null) => void) => () => void,
  callback: (data: T | null) => void
): () => void {
  // If no listener exists for this key, create one
  if (!listenerCache[cacheKey]) {
    listenerCache[cacheKey] = {
      data: null,
      callbacks: new Set(),
      unsubscribe: null,
      lastUpdate: 0
    };

    // Create the actual Firestore listener
    const unsubscribe = createListener((data) => {
      const cached = listenerCache[cacheKey];
      if (cached) {
        cached.data = data;
        cached.lastUpdate = Date.now();
        // Notify all subscribers
        cached.callbacks.forEach(cb => cb(data));
      }
    });

    listenerCache[cacheKey].unsubscribe = unsubscribe;
  }

  // Add this callback to the set
  const cached = listenerCache[cacheKey];
  cached.callbacks.add(callback);

  // If we already have data, send it immediately
  if (cached.data !== null || cached.lastUpdate > 0) {
    callback(cached.data);
  }

  // Return unsubscribe function
  return () => {
    cached.callbacks.delete(callback);

    // If no more subscribers, cleanup the listener
    if (cached.callbacks.size === 0) {
      if (cached.unsubscribe) {
        cached.unsubscribe();
      }
      delete listenerCache[cacheKey];
    }
  };
}

/**
 * Clear all cached listeners (useful for testing or logout)
 */
export function clearSubscriptionListenerCache(): void {
  Object.keys(listenerCache).forEach(key => {
    const cached = listenerCache[key];
    if (cached.unsubscribe) {
      cached.unsubscribe();
    }
  });
  Object.keys(listenerCache).forEach(key => delete listenerCache[key]);
  console.log('[SUBSCRIPTION_SERVICE] Listener cache cleared');
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

const COLLECTIONS = {
  SUBSCRIPTIONS: 'subscriptions',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  AI_USAGE: 'ai_usage',
  AI_CALL_LOGS: 'ai_call_logs',
  INVOICES: 'invoices',
  SETTINGS: 'settings'
} as const;

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

/**
 * Récupère tous les plans d'abonnement actifs pour un type de prestataire
 * COST OPTIMIZATION: Uses localStorage cache (24h TTL) - plans rarely change
 */
export async function getSubscriptionPlans(
  providerType: ProviderType
): Promise<SubscriptionPlan[]> {
  return fetchWithCache(
    'SUBSCRIPTION_PLANS',
    providerType,
    async () => {
      const plansRef = collection(db, COLLECTIONS.SUBSCRIPTION_PLANS);
      const q = query(
        plansRef,
        where('providerType', '==', providerType),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Note: Dates are serialized to ISO strings in cache
        createdAt: doc.data().createdAt?.toDate()?.toISOString(),
        updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
      })) as SubscriptionPlan[];
    }
  );
}

/**
 * Récupère un plan spécifique par ID
 */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const planRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, planId);
  const snapshot = await getDoc(planRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
    createdAt: snapshot.data().createdAt?.toDate(),
    updatedAt: snapshot.data().updatedAt?.toDate()
  } as SubscriptionPlan;
}

/**
 * Écoute les changements de plans en temps réel
 * COST OPTIMIZATION: Uses listener deduplication - plans are shared data
 */
export function subscribeToPlans(
  providerType: ProviderType,
  callback: (plans: SubscriptionPlan[]) => void
): () => void {
  const cacheKey = `plans_${providerType}`;

  return subscribeWithDeduplication<SubscriptionPlan[]>(
    cacheKey,
    (sharedCallback) => {
      const plansRef = collection(db, COLLECTIONS.SUBSCRIPTION_PLANS);
      const q = query(
        plansRef,
        where('providerType', '==', providerType),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      );

      return onSnapshot(q, (snapshot) => {
        const plans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        })) as SubscriptionPlan[];
        sharedCallback(plans);
      }, (err) => {
        console.error('[subscriptionService] Plans subscription error:', err);
      });
    },
    (plans) => callback(plans || [])
  );
}

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

/**
 * Récupère la configuration de l'essai gratuit
 * COST OPTIMIZATION: Uses localStorage cache (1h TTL) - trial config rarely changes
 */
export async function getTrialConfig(): Promise<TrialConfig> {
  return fetchWithCache(
    'TRIAL_CONFIG',
    undefined,
    async () => {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'subscription');
      const snapshot = await getDoc(settingsRef);

      if (!snapshot.exists() || !snapshot.data().trial) {
        return DEFAULT_TRIAL_CONFIG;
      }

      const trial = snapshot.data().trial;
      return {
        ...trial,
        // Note: Date serialized to ISO string for cache
        updatedAt: trial.updatedAt?.toDate()?.toISOString()
      };
    }
  );
}

/**
 * Écoute les changements de configuration d'essai
 * COST OPTIMIZATION: Uses listener deduplication - trial config is global shared data
 */
export function subscribeToTrialConfig(
  callback: (config: TrialConfig) => void
): () => void {
  const cacheKey = 'trial_config';

  return subscribeWithDeduplication<TrialConfig>(
    cacheKey,
    (sharedCallback) => {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'subscription');

      return onSnapshot(
        settingsRef,
        (snapshot) => {
          if (!snapshot.exists() || !snapshot.data().trial) {
            sharedCallback(DEFAULT_TRIAL_CONFIG);
            return;
          }

          const trial = snapshot.data().trial;
          sharedCallback({
            ...trial,
            updatedAt: trial.updatedAt?.toDate()
          });
        },
        (error) => {
          console.warn('[subscribeToTrialConfig] Error (using default config):', error.message);
          sharedCallback(DEFAULT_TRIAL_CONFIG);
        }
      );
    },
    (config) => callback(config || DEFAULT_TRIAL_CONFIG)
  );
}

// ============================================================================
// USER SUBSCRIPTION
// ============================================================================

/**
 * Récupère l'abonnement actuel d'un prestataire
 * Vérifie les deux formats d'ID possibles: {providerId} et sub_{providerId}
 */
export async function getSubscription(providerId: string): Promise<Subscription | null> {
  // 1. Essayer avec l'ID directe
  const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
  const snapshot = await getDoc(subRef);

  if (snapshot.exists()) {
    return parseSubscription(snapshot.id, snapshot.data());
  }

  // 2. Essayer avec le format sub_{providerId}
  const subRefAlt = doc(db, COLLECTIONS.SUBSCRIPTIONS, `sub_${providerId}`);
  const snapshotAlt = await getDoc(subRefAlt);

  if (snapshotAlt.exists()) {
    return parseSubscription(snapshotAlt.id, snapshotAlt.data());
  }

  // 3. Vérifier le statut d'abonnement sur le document user
  const userRef = doc(db, "users", providerId);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    const userData = userSnapshot.data();
    if (userData?.subscriptionStatus) {
      // Créer un objet Subscription à partir des données user
      const now = new Date();
      const expiresAt = userData.subscriptionExpiresAt?.toDate() ||
                        userData.trialEndsAt?.toDate() ||
                        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        id: providerId,
        providerId,
        providerType: userData.providerType || "lawyer",
        planId: userData.planId || "basic",
        tier: userData.tier || userData.planName || "basic",
        status: userData.subscriptionStatus,
        stripeCustomerId: userData.stripeCustomerId || "",
        stripeSubscriptionId: userData.stripeSubscriptionId || null,
        stripePriceId: userData.stripePriceId || null,
        trialStartedAt: userData.trialStartedAt?.toDate() || null,
        trialEndsAt: userData.trialEndsAt?.toDate() || null,
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        canceledAt: userData.canceledAt?.toDate() || null,
        cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
        currency: userData.currency || "EUR",
        currentPeriodAmount: userData.priceAmount || 0,
        createdAt: userData.createdAt?.toDate() || now,
        updatedAt: userData.updatedAt?.toDate() || now
      };
    }
  }

  return null;
}

/**
 * Écoute les changements d'abonnement en temps réel
 * OPTIMISÉ: Détermine d'abord quel document existe, puis n'écoute que celui-là
 * (Au lieu de 3 listeners simultanés, on n'en utilise qu'1)
 */
export function subscribeToSubscription(
  providerId: string,
  callback: (subscription: Subscription | null) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  // Fonction pour créer un subscription depuis les données user
  const createSubscriptionFromUser = (userData: any): Subscription => {
    const now = new Date();
    const expiresAt = userData.subscriptionExpiresAt?.toDate() ||
                      userData.trialEndsAt?.toDate() ||
                      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: providerId,
      providerId,
      providerType: userData.providerType || "lawyer",
      planId: userData.planId || "basic",
      tier: userData.tier || userData.planName || "basic",
      status: userData.subscriptionStatus,
      stripeCustomerId: userData.stripeCustomerId || "",
      stripeSubscriptionId: userData.stripeSubscriptionId || null,
      stripePriceId: userData.stripePriceId || null,
      trialStartedAt: userData.trialStartedAt?.toDate() || null,
      trialEndsAt: userData.trialEndsAt?.toDate() || null,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      canceledAt: userData.canceledAt?.toDate() || null,
      cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
      currency: userData.currency || "EUR",
      currentPeriodAmount: userData.priceAmount || 0,
      createdAt: userData.createdAt?.toDate() || now,
      updatedAt: userData.updatedAt?.toDate() || now
    };
  };

  // Déterminer quel document écouter (une seule fois au démarrage)
  const initListener = async () => {
    if (cancelled) return;

    try {
      // 1. Vérifier subscriptions/{providerId}
      const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
      const subSnap = await getDoc(subRef);

      if (cancelled) return;

      if (subSnap.exists()) {
        // Écouter seulement ce document
        unsubscribe = onSnapshot(subRef, (snapshot) => {
          if (snapshot.exists()) {
            callback(parseSubscription(snapshot.id, snapshot.data()));
          } else {
            callback(null);
          }
        }, (err) => {
          console.error('[subscriptionService] Subscription snapshot error:', err);
          callback(null);
        });
        return;
      }

      // 2. Vérifier subscriptions/sub_{providerId}
      const subRefAlt = doc(db, COLLECTIONS.SUBSCRIPTIONS, `sub_${providerId}`);
      const subSnapAlt = await getDoc(subRefAlt);

      if (cancelled) return;

      if (subSnapAlt.exists()) {
        // Écouter seulement ce document
        unsubscribe = onSnapshot(subRefAlt, (snapshot) => {
          if (snapshot.exists()) {
            callback(parseSubscription(snapshot.id, snapshot.data()));
          } else {
            callback(null);
          }
        }, (err) => {
          console.error('[subscriptionService] Subscription alt snapshot error:', err);
          callback(null);
        });
        return;
      }

      // 3. Fallback: écouter le document user
      const userRef = doc(db, "users", providerId);
      unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          if (userData?.subscriptionStatus) {
            callback(createSubscriptionFromUser(userData));
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }, (err) => {
        console.error('[subscriptionService] User subscription fallback error:', err);
        callback(null);
      });
    } catch (error) {
      console.error('[subscribeToSubscription] Error initializing listener:', error);
      callback(null);
    }
  };

  // Lancer l'initialisation
  initListener();

  // Retourner fonction de cleanup
  return () => {
    cancelled = true;
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

/**
 * Démarre la période d'essai pour un nouveau prestataire
 */
export async function startTrial(
  providerId: string,
  providerType: ProviderType
): Promise<Subscription> {
  const trialConfig = await getTrialConfig();

  if (!trialConfig.isEnabled) {
    throw new Error('Trial period is currently disabled');
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + trialConfig.durationDays * 24 * 60 * 60 * 1000);

  const subscription: Omit<Subscription, 'id'> = {
    providerId,
    providerType,
    planId: 'trial',
    tier: 'trial',
    status: 'trialing',
    stripeCustomerId: '',
    stripeSubscriptionId: null,
    stripePriceId: null,
    trialStartedAt: now,
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: trialEndsAt,
    canceledAt: null,
    cancelAtPeriodEnd: false,
    currency: 'EUR',
    currentPeriodAmount: 0,
    createdAt: now,
    updatedAt: now
  };

  // Create subscription document
  const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
  await setDoc(subRef, {
    ...subscription,
    trialStartedAt: Timestamp.fromDate(now),
    trialEndsAt: Timestamp.fromDate(trialEndsAt),
    currentPeriodStart: Timestamp.fromDate(now),
    currentPeriodEnd: Timestamp.fromDate(trialEndsAt),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Initialize usage tracking
  const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
  await setDoc(usageRef, {
    providerId,
    subscriptionId: providerId,
    currentPeriodCalls: 0,
    currentPeriodStart: Timestamp.fromDate(now),
    currentPeriodEnd: Timestamp.fromDate(trialEndsAt),
    trialCallsUsed: 0,
    totalCallsAllTime: 0,
    lastCallAt: null,
    updatedAt: serverTimestamp()
  });

  return { ...subscription, id: providerId };
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT (via Cloud Functions)
// ============================================================================

/**
 * Crée un nouvel abonnement payant
 */
export async function createSubscription(
  request: CreateSubscriptionRequest
): Promise<CreateSubscriptionResponse> {
  const createSubscriptionFn = httpsCallable<CreateSubscriptionRequest, CreateSubscriptionResponse>(
    functions,
    'subscriptionCreate'
  );

  const result = await createSubscriptionFn(request);
  return result.data;
}

/**
 * Met à jour l'abonnement (upgrade/downgrade)
 */
export async function updateSubscription(
  newPlanId: string
): Promise<{ success: boolean; error?: string }> {
  const updateSubscriptionFn = httpsCallable<{ newPlanId: string }, { success: boolean; error?: string }>(
    functions,
    'subscriptionUpdate'
  );

  const result = await updateSubscriptionFn({ newPlanId });
  return result.data;
}

/**
 * Annule l'abonnement
 */
export async function cancelSubscription(
  cancelAtPeriodEnd: boolean = true,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const cancelSubscriptionFn = httpsCallable<
    { cancelAtPeriodEnd: boolean; reason?: string },
    { success: boolean; error?: string }
  >(functions, 'cancelSubscription');

  const result = await cancelSubscriptionFn({ cancelAtPeriodEnd, reason });
  return result.data;
}

/**
 * Réactive un abonnement annulé (avant fin de période)
 */
export async function reactivateSubscription(): Promise<{ success: boolean; error?: string }> {
  const reactivateFn = httpsCallable<void, { success: boolean; error?: string }>(
    functions,
    'reactivateSubscription'
  );

  const result = await reactivateFn();
  return result.data;
}

/**
 * Ouvre le portail client Stripe
 */
export async function openCustomerPortal(): Promise<{ url: string }> {
  const createPortalSessionFn = httpsCallable<void, { url: string }>(
    functions,
    'subscriptionPortal'
  );

  const result = await createPortalSessionFn();
  return result.data;
}

// ============================================================================
// AI USAGE & QUOTA
// ============================================================================

/**
 * Récupère l'utilisation IA actuelle
 */
export async function getAiUsage(providerId: string): Promise<AiUsage | null> {
  const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
  const snapshot = await getDoc(usageRef);

  if (!snapshot.exists()) return null;

  return parseAiUsage(snapshot.data());
}

/**
 * Écoute les changements d'utilisation en temps réel
 * COST OPTIMIZATION: Uses listener deduplication to share listeners across components
 */
export function subscribeToAiUsage(
  providerId: string,
  callback: (usage: AiUsage | null) => void
): () => void {
  const cacheKey = `ai_usage_${providerId}`;

  return subscribeWithDeduplication<AiUsage>(
    cacheKey,
    (sharedCallback) => {
      const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
      return onSnapshot(
        usageRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            sharedCallback(null);
            return;
          }
          sharedCallback(parseAiUsage(snapshot.data()));
        },
        (error) => {
          console.warn('[subscribeToAiUsage] Error:', error.message);
          sharedCallback(null);
        }
      );
    },
    callback
  );
}

/**
 * Vérifie si l'utilisateur a un accès admin forcé ou un essai gratuit manuel
 * Vérifie dans users ET sos_profiles car l'admin peut définir forcedAIAccess sur l'un ou l'autre
 */
async function checkForcedOrTrialAccess(providerId: string): Promise<{
  hasForcedAccess: boolean;
  freeTrialUntil: Date | null;
}> {
  // 1. Vérifier dans users
  const userRef = doc(db, "users", providerId);
  const userSnapshot = await getDoc(userRef);
  const userData = userSnapshot.exists() ? userSnapshot.data() : null;

  // Vérifier l'accès admin forcé sur users
  if (userData?.forcedAIAccess === true) {
    return { hasForcedAccess: true, freeTrialUntil: null };
  }

  // 2. Vérifier dans sos_profiles (où l'admin console définit souvent forcedAIAccess)
  const profileRef = doc(db, "sos_profiles", providerId);
  const profileSnapshot = await getDoc(profileRef);
  const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null;

  if (profileData?.forcedAIAccess === true) {
    return { hasForcedAccess: true, freeTrialUntil: null };
  }

  // 3. Vérifier l'essai gratuit manuel (freeTrialUntil) - sur users ou sos_profiles
  const freeTrialUntilData = userData?.freeTrialUntil || profileData?.freeTrialUntil;
  if (freeTrialUntilData) {
    const trialDate = freeTrialUntilData.toDate
      ? freeTrialUntilData.toDate()
      : new Date(freeTrialUntilData);

    if (trialDate > new Date()) {
      return { hasForcedAccess: false, freeTrialUntil: trialDate };
    }
  }

  return { hasForcedAccess: false, freeTrialUntil: null };
}

/**
 * Vérifie si le prestataire peut effectuer un appel IA
 */
export async function checkAiQuota(providerId: string): Promise<QuotaCheckResult> {
  // Vérifier d'abord l'accès admin forcé ou essai gratuit manuel
  let { hasForcedAccess, freeTrialUntil } = await checkForcedOrTrialAccess(providerId);

  // Vérifier si c'est un compte multi-prestataire (linkedProviderIds)
  // Les comptes multi-prestataires ont automatiquement accès
  if (!hasForcedAccess) {
    const userRef = doc(db, "users", providerId);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      const linkedProviderIds: string[] = userData?.linkedProviderIds || [];
      if (linkedProviderIds.length > 0) {
        console.log('[checkAiQuota] Multi-provider account detected, granting automatic access');
        hasForcedAccess = true;
      }
    }
  }

  // Accès admin forcé ou multi-prestataire = accès illimité
  if (hasForcedAccess) {
    return {
      allowed: true,
      currentUsage: 0,
      limit: -1,
      remaining: -1,
      isInTrial: false
    };
  }

  // Essai gratuit manuel (freeTrialUntil)
  if (freeTrialUntil) {
    const daysRemaining = Math.ceil(
      (freeTrialUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return {
      allowed: true,
      currentUsage: 0,
      limit: 100, // Limite généreuse pour essai manuel
      remaining: 100,
      isInTrial: true,
      trialDaysRemaining: daysRemaining,
      trialCallsRemaining: 100
    };
  }

  const [subscription, usage, trialConfig] = await Promise.all([
    getSubscription(providerId),
    getAiUsage(providerId),
    getTrialConfig()
  ]);

  // Pas d'abonnement
  if (!subscription) {
    return {
      allowed: false,
      reason: 'no_subscription',
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      isInTrial: false,
      suggestedUpgrade: {
        tier: 'basic',
        planId: 'basic'
      }
    };
  }

  const now = new Date();

  // En période d'essai
  if (subscription.status === 'trialing') {
    const trialExpired = subscription.trialEndsAt && now > subscription.trialEndsAt;
    const trialCallsExhausted = (usage?.trialCallsUsed ?? 0) >= trialConfig.maxAiCalls;

    if (trialExpired) {
      return {
        allowed: false,
        reason: 'trial_expired',
        currentUsage: usage?.trialCallsUsed ?? 0,
        limit: trialConfig.maxAiCalls,
        remaining: 0,
        isInTrial: true,
        trialDaysRemaining: 0,
        trialCallsRemaining: 0,
        suggestedUpgrade: {
          tier: 'basic',
          planId: `${subscription.providerType}_basic`
        }
      };
    }

    if (trialCallsExhausted) {
      return {
        allowed: false,
        reason: 'trial_calls_exhausted',
        currentUsage: usage?.trialCallsUsed ?? 0,
        limit: trialConfig.maxAiCalls,
        remaining: 0,
        isInTrial: true,
        trialDaysRemaining: subscription.trialEndsAt
          ? Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : 0,
        trialCallsRemaining: 0,
        suggestedUpgrade: {
          tier: 'basic',
          planId: `${subscription.providerType}_basic`
        }
      };
    }

    // Essai valide
    return {
      allowed: true,
      currentUsage: usage?.trialCallsUsed ?? 0,
      limit: trialConfig.maxAiCalls,
      remaining: trialConfig.maxAiCalls - (usage?.trialCallsUsed ?? 0),
      isInTrial: true,
      trialDaysRemaining: subscription.trialEndsAt
        ? Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0,
      trialCallsRemaining: trialConfig.maxAiCalls - (usage?.trialCallsUsed ?? 0)
    };
  }

  // Vérifier le statut de l'abonnement
  if (subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'canceled') {
    return {
      allowed: false,
      reason: subscription.status === 'expired' ? 'subscription_expired' : 'subscription_cancelled',
      currentUsage: usage?.currentPeriodCalls ?? 0,
      limit: DEFAULT_AI_CALLS_LIMIT[subscription.tier] ?? 0,
      remaining: 0,
      isInTrial: false,
      suggestedUpgrade: {
        tier: 'basic',
        planId: `${subscription.providerType}_basic`
      }
    };
  }

  if (subscription.status === 'past_due') {
    return {
      allowed: false,
      reason: 'payment_failed',
      currentUsage: usage?.currentPeriodCalls ?? 0,
      limit: DEFAULT_AI_CALLS_LIMIT[subscription.tier] ?? 0,
      remaining: 0,
      isInTrial: false
    };
  }

  // Abonnement actif - vérifier le quota
  const limit = DEFAULT_AI_CALLS_LIMIT[subscription.tier];
  const currentUsage = usage?.currentPeriodCalls ?? 0;

  // Plan illimité (avec fair use)
  if (limit === -1) {
    return {
      allowed: currentUsage < UNLIMITED_FAIR_USE_LIMIT,
      currentUsage,
      limit: -1,
      remaining: -1,
      isInTrial: false
    };
  }

  // Plan avec limite
  if (currentUsage >= limit) {
    // Suggérer upgrade vers le tier supérieur
    const tiers: SubscriptionTier[] = ['basic', 'standard', 'pro', 'unlimited'];
    const currentIndex = tiers.indexOf(subscription.tier);
    const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

    return {
      allowed: false,
      reason: 'quota_exhausted',
      currentUsage,
      limit,
      remaining: 0,
      isInTrial: false,
      suggestedUpgrade: nextTier
        ? {
            tier: nextTier,
            planId: `${subscription.providerType}_${nextTier}`
          }
        : undefined
    };
  }

  return {
    allowed: true,
    currentUsage,
    limit,
    remaining: limit - currentUsage,
    isInTrial: false
  };
}

/**
 * Enregistre un appel IA (appelé par Cloud Function après validation)
 */
export async function recordAiCall(
  providerId: string,
  callLog: Omit<AiCallLog, 'id' | 'createdAt'>
): Promise<void> {
  const batch = writeBatch(db);

  // Add call log
  const logRef = doc(collection(db, COLLECTIONS.AI_CALL_LOGS));
  batch.set(logRef, {
    ...callLog,
    createdAt: serverTimestamp()
  });

  // Update usage counters
  const usageRef = doc(db, COLLECTIONS.AI_USAGE, providerId);
  const subscription = await getSubscription(providerId);

  if (subscription?.status === 'trialing') {
    batch.update(usageRef, {
      trialCallsUsed: increment(1),
      totalCallsAllTime: increment(1),
      lastCallAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    batch.update(usageRef, {
      currentPeriodCalls: increment(1),
      totalCallsAllTime: increment(1),
      lastCallAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
}

// ============================================================================
// INVOICES / BILLING HISTORY
// ============================================================================

/**
 * Récupère l'historique des factures
 */
export async function getInvoices(providerId: string): Promise<Invoice[]> {
  const invoicesRef = collection(db, COLLECTIONS.INVOICES);
  const q = query(
    invoicesRef,
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    periodStart: doc.data().periodStart?.toDate(),
    periodEnd: doc.data().periodEnd?.toDate(),
    dueDate: doc.data().dueDate?.toDate(),
    paidAt: doc.data().paidAt?.toDate(),
    createdAt: doc.data().createdAt?.toDate()
  })) as Invoice[];
}

/**
 * Écoute les factures en temps réel
 */
export function subscribeToInvoices(
  providerId: string,
  callback: (invoices: Invoice[]) => void
): () => void {
  const invoicesRef = collection(db, COLLECTIONS.INVOICES);
  const q = query(
    invoicesRef,
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        periodStart: doc.data().periodStart?.toDate(),
        periodEnd: doc.data().periodEnd?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
        paidAt: doc.data().paidAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Invoice[];
      callback(invoices);
    },
    (error) => {
      // Handle Firestore errors gracefully (e.g., missing index)
      console.error('[subscribeToInvoices] Error:', error.message);
      // Return empty array on error to prevent UI crashes
      callback([]);
    }
  );
}

// ============================================================================
// COMBINED DATA FETCH
// ============================================================================

/**
 * Récupère toutes les données d'abonnement/usage d'un coup
 */
export async function getFullSubscriptionData(
  providerId: string
): Promise<GetUsageResponse | null> {
  const [subscription, usage] = await Promise.all([
    getSubscription(providerId),
    getAiUsage(providerId)
  ]);

  if (!subscription || !usage) return null;

  const [plan, quotaCheck] = await Promise.all([
    getSubscriptionPlan(subscription.planId),
    checkAiQuota(providerId)
  ]);

  if (!plan) return null;

  return {
    subscription,
    usage,
    plan,
    quotaCheck
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseSubscription(id: string, data: any): Subscription {
  return {
    id,
    providerId: data.providerId,
    providerType: data.providerType,
    planId: data.planId,
    tier: data.tier,
    status: data.status,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripePriceId: data.stripePriceId,
    trialStartedAt: data.trialStartedAt?.toDate() ?? null,
    trialEndsAt: data.trialEndsAt?.toDate() ?? null,
    currentPeriodStart: data.currentPeriodStart?.toDate(),
    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
    canceledAt: data.canceledAt?.toDate() ?? null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    currency: data.currency,
    billingPeriod: data.billingPeriod || undefined,
    currentPeriodAmount: data.currentPeriodAmount,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate()
  };
}

function parseAiUsage(data: any): AiUsage {
  return {
    providerId: data.providerId,
    subscriptionId: data.subscriptionId,
    currentPeriodCalls: data.currentPeriodCalls,
    currentPeriodStart: data.currentPeriodStart?.toDate(),
    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
    trialCallsUsed: data.trialCallsUsed,
    totalCallsAllTime: data.totalCallsAllTime,
    lastCallAt: data.lastCallAt?.toDate() ?? null,
    updatedAt: data.updatedAt?.toDate()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Plans
  getSubscriptionPlans,
  getSubscriptionPlan,
  subscribeToPlans,

  // Trial
  getTrialConfig,
  subscribeToTrialConfig,
  startTrial,

  // Subscription
  getSubscription,
  subscribeToSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  openCustomerPortal,

  // Usage & Quota
  getAiUsage,
  subscribeToAiUsage,
  checkAiQuota,
  recordAiCall,

  // Invoices
  getInvoices,
  subscribeToInvoices,

  // Combined
  getFullSubscriptionData
};
