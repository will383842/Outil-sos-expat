/**
 * useSubscription Hook
 * Gestion complète de l'abonnement du prestataire avec pattern SWR-like
 *
 * @description Hook React pour gérer l'état de l'abonnement, avec:
 * - Écoute temps réel Firestore
 * - Cache automatique et refresh
 * - États dérivés calculés (isActive, isTrialing, etc.)
 * - Actions d'annulation et réactivation
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier
} from '../types/subscription';
import {
  getSubscription,
  subscribeToSubscription,
  getSubscriptionPlan,
  subscribeToPlans,
  cancelSubscription as cancelSubscriptionService,
  reactivateSubscription as reactivateSubscriptionService,
  openCustomerPortal,
  startTrial as startTrialService
} from '../services/subscription/subscriptionService';
import { ProviderType } from '../types/subscription';

// ============================================================================
// TYPES
// ============================================================================

interface UseSubscriptionReturn {
  // État
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[]; // All available plans for the user's provider type
  isLoading: boolean;
  loading: boolean; // Alias for isLoading (backward compatibility)
  error: Error | null;

  // Dérivés
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  cancelAtPeriodEnd: boolean;
  daysUntilRenewal: number;

  // Actions
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  openBillingPortal: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;

  // Plan initialization (for users without subscription)
  initializeTrial: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const planCache = new Map<string, CacheEntry<SubscriptionPlan>>();

function getCachedPlan(planId: string): SubscriptionPlan | null {
  const entry = planCache.get(planId);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    planCache.delete(planId);
    return null;
  }

  return entry.data;
}

function setCachedPlan(planId: string, plan: SubscriptionPlan): void {
  planCache.set(planId, {
    data: plan,
    timestamp: Date.now()
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcule le nombre de jours jusqu'au renouvellement
 */
function calculateDaysUntilRenewal(subscription: Subscription | null): number {
  if (!subscription?.currentPeriodEnd) return 0;

  const now = new Date();
  const endDate = subscription.currentPeriodEnd instanceof Date
    ? subscription.currentPeriodEnd
    : new Date(subscription.currentPeriodEnd);

  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Vérifie si le statut est actif
 */
function isStatusActive(status?: SubscriptionStatus): boolean {
  return status === 'active';
}

/**
 * Vérifie si le statut est en essai
 */
function isStatusTrialing(status?: SubscriptionStatus): boolean {
  return status === 'trialing';
}

/**
 * Vérifie si le paiement est en retard
 */
function isStatusPastDue(status?: SubscriptionStatus): boolean {
  return status === 'past_due';
}

/**
 * Vérifie si l'abonnement est annulé
 */
function isStatusCanceled(status?: SubscriptionStatus): boolean {
  return status === 'cancelled' || status === 'canceled' || status === 'expired';
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();

  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // DEBUG LOGS - Page Jump Investigation
  console.log('[useSubscription DEBUG] 📦 Hook state', {
    userId: user?.uid,
    isLoading,
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    subscriptionTier: subscription?.tier,
    hasPlan: !!plan,
    plansCount: plans.length,
    timestamp: new Date().toISOString()
  });

  // Refs pour éviter les race conditions
  const isMounted = useRef(true);
  const lastPlanId = useRef<string | null>(null);
  const lastProviderType = useRef<ProviderType | null>(null);

  // Determine provider type from user
  const providerType: ProviderType = useMemo(() => {
    const role = user?.role || user?.type || '';
    return role === 'lawyer' ? 'lawyer' : 'expat_aidant';
  }, [user?.role, user?.type]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Subscribe to real-time subscription updates
  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToSubscription(user.uid, (sub) => {
      if (!isMounted.current) return;

      setSubscription(sub);
      setIsLoading(false);

      // Load plan if subscription changed
      if (sub?.planId && sub.planId !== lastPlanId.current) {
        lastPlanId.current = sub.planId;
        loadPlan(sub.planId);
      } else if (!sub) {
        setPlan(null);
        lastPlanId.current = null;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // Subscribe to available plans based on provider type
  useEffect(() => {
    if (!user?.uid || !providerType) {
      setPlans([]);
      return;
    }

    // Avoid re-subscribing if provider type hasn't changed
    if (providerType === lastProviderType.current) {
      return;
    }
    lastProviderType.current = providerType;

    const unsubscribePlans = subscribeToPlans(providerType, (loadedPlans) => {
      if (!isMounted.current) return;

      // Filter out trial plans and sort by sortOrder
      const activePlans = loadedPlans
        .filter(p => p.isActive && p.tier !== 'trial')
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setPlans(activePlans);
    });

    return () => {
      unsubscribePlans();
    };
  }, [user?.uid, providerType]);

  // Load plan with caching
  const loadPlan = useCallback(async (planId: string) => {
    // Check cache first
    const cachedPlan = getCachedPlan(planId);
    if (cachedPlan) {
      setPlan(cachedPlan);
      return;
    }

    try {
      const fetchedPlan = await getSubscriptionPlan(planId);
      if (!isMounted.current) return;

      if (fetchedPlan) {
        setCachedPlan(planId, fetchedPlan);
        setPlan(fetchedPlan);
      }
    } catch (err) {
      console.error('[useSubscription] Failed to load plan:', err);
      // Ne pas propager l'erreur, le plan est secondaire
    }
  }, []);

  // ============================================================================
  // DERIVED VALUES (MEMOIZED)
  // ============================================================================

  const isActive = useMemo(() => {
    return isStatusActive(subscription?.status);
  }, [subscription?.status]);

  const isTrialing = useMemo(() => {
    return isStatusTrialing(subscription?.status);
  }, [subscription?.status]);

  const isPastDue = useMemo(() => {
    return isStatusPastDue(subscription?.status);
  }, [subscription?.status]);

  const isCanceled = useMemo(() => {
    return isStatusCanceled(subscription?.status);
  }, [subscription?.status]);

  const cancelAtPeriodEnd = useMemo(() => {
    return subscription?.cancelAtPeriodEnd ?? false;
  }, [subscription?.cancelAtPeriodEnd]);

  const daysUntilRenewal = useMemo(() => {
    return calculateDaysUntilRenewal(subscription);
  }, [subscription]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Annule l'abonnement (à la fin de la période)
   */
  const cancelSubscription = useCallback(async (reason?: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelSubscriptionService(true, reason);

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      // La mise à jour sera reçue via le listener Firestore
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel subscription');
      if (isMounted.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid]);

  /**
   * Réactive un abonnement annulé (avant la fin de période)
   */
  const reactivateSubscription = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    if (!cancelAtPeriodEnd) {
      throw new Error('Subscription is not pending cancellation');
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await reactivateSubscriptionService();

      if (!result.success) {
        throw new Error(result.error || 'Failed to reactivate subscription');
      }

      // La mise à jour sera reçue via le listener Firestore
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reactivate subscription');
      if (isMounted.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid, cancelAtPeriodEnd]);

  /**
   * Ouvre le portail de facturation Stripe
   */
  const openBillingPortal = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { url } = await openCustomerPortal();
      window.location.href = url;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to open billing portal');
      if (isMounted.current) {
        setError(error);
        setIsLoading(false);
      }
      throw error;
    }
  }, [user?.uid]);

  /**
   * Rafraîchit manuellement les données d'abonnement
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const sub = await getSubscription(user.uid);

      if (!isMounted.current) return;

      setSubscription(sub);

      if (sub?.planId) {
        // Force refresh du plan (bypass cache)
        const fetchedPlan = await getSubscriptionPlan(sub.planId);
        if (fetchedPlan && isMounted.current) {
          setCachedPlan(sub.planId, fetchedPlan);
          setPlan(fetchedPlan);
        }
      } else {
        setPlan(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh subscription');
      if (isMounted.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid]);

  /**
   * Initialize a trial subscription for users without subscription
   */
  const initializeTrial = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      await startTrialService(user.uid, providerType);
      // The subscription update will be received via Firestore listener
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize trial');
      if (isMounted.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid, providerType]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // État
    subscription,
    plan,
    plans,
    isLoading,
    loading: isLoading, // Alias for backward compatibility
    error,

    // Dérivés
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    cancelAtPeriodEnd,
    daysUntilRenewal,

    // Actions
    cancelSubscription,
    reactivateSubscription,
    openBillingPortal,
    initializeTrial,

    // Refresh
    refresh
  };
}

export default useSubscription;
